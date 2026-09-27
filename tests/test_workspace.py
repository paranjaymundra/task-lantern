"""The single-file workspace must contain only opted-in, current, isolated threads."""
import copy
import importlib.util
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("workspace_dashboard", ROOT / "skills/task-lantern/scripts/dashboard.py")
d = importlib.util.module_from_spec(spec)
spec.loader.exec_module(d)


def payload(path):
    return json.loads(re.search(r'<script id="state" type="application/json">(.*?)</script>', path.read_text(), re.S)[1])


class WorkspaceTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.base = Path(self.tmp.name)
        env = patch.dict(os.environ, {"XDG_DATA_HOME": str(self.base / "data"), "XDG_CONFIG_HOME": str(self.base / "config")})
        env.start()
        self.addCleanup(env.stop)
        self.a = self.base / "project a"
        self.b = self.base / "project b"
        self.a.mkdir()
        self.b.mkdir()
        self.hub = d.workspace_root() / "index.html"

    def test_cross_project_switching_has_embedded_current_state(self):
        a, _ = d.init(self.a, "API", "codex")
        b, _ = d.init(self.b, "Search", "claude")
        self.assertEqual({x["project"] for x in payload(self.hub)["threads"]}, {"project a", "project b"})
        changed = copy.deepcopy(a["snapshot"])
        changed["summary"] = "Verified the migration."
        d.publish(self.a, a["run"], changed, 0)
        threads = payload(self.hub)["threads"]
        saved = next(x for x in threads if x["run"] == a["run"])
        self.assertEqual(saved["revision"], 1)
        self.assertEqual(saved["snapshot"]["summary"], changed["summary"])
        self.assertEqual(next(x for x in threads if x["run"] == b["run"])["revision"], 0)
        self.assertEqual(len(payload(self.a / ".dashboard/index.html")["threads"]), 1)

    def test_real_host_thread_id_reuses_run_without_overwriting_facts(self):
        a, path = d.init(self.a, "Original", "codex", "actual-session-id")
        d.publish(self.a, a["run"], {**a["snapshot"], "summary": "Preserved work"}, 0)
        resumed, resumed_path = d.init(self.a, "New title should not replace work", "codex", "actual-session-id")
        self.assertEqual(path, resumed_path)
        self.assertEqual(resumed["revision"], 1)
        self.assertEqual(resumed["snapshot"]["summary"], "Preserved work")
        other_host, _ = d.init(self.a, "Different host", "claude", "actual-session-id")
        self.assertNotEqual(other_host["run"], a["run"])
        self.assertEqual(len(payload(self.hub)["threads"]), 2)

    def test_concurrent_projects_do_not_lose_registrations(self):
        processes = [subprocess.Popen([sys.executable, str(d.__file__), "--project", str(project), "init", "--title", title], stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True) for project, title in [(self.a, "A"), (self.b, "B")]]
        for process in processes:
            out, err = process.communicate(timeout=10)
            self.assertEqual(process.returncode, 0, err)
            self.assertEqual(Path(json.loads(out)["dashboard"]), self.hub)
        self.assertEqual(len(payload(self.hub)["threads"]), 2)

    def test_concurrent_same_host_thread_only_initializes_once(self):
        args = [sys.executable, str(d.__file__), "--project", str(self.a), "init", "--title", "Task", "--host", "codex", "--thread-id", "real-thread"]
        processes = [subprocess.Popen(args, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True) for _ in range(2)]
        runs = []
        for process in processes:
            out, err = process.communicate(timeout=10)
            self.assertEqual(process.returncode, 0, err)
            runs.append(json.loads(out)["run"])
        self.assertEqual(len(set(runs)), 1)
        self.assertEqual(len(payload(self.hub)["threads"]), 1)

    def test_does_not_scan_unregistered_projects(self):
        d.init(self.a, "Tracked")
        root = self.b / ".dashboard/untracked"
        root.mkdir(parents=True)
        (root / "state.json").write_text('{"private":"never read"}')
        d.refresh_workspace(strict=True)
        text = self.hub.read_text()
        self.assertNotIn("never read", text)
        self.assertEqual(len(payload(self.hub)["threads"]), 1)

    def test_missing_or_corrupt_thread_is_reported_without_losing_others(self):
        _, path = d.init(self.a, "A")
        d.init(self.b, "B")
        (path / "state.json").write_text("bad json")
        d.refresh_workspace(strict=True)
        data = payload(self.hub)
        self.assertEqual(len(data["threads"]), 1)
        self.assertEqual(data["threads"][0]["snapshot"]["title"], "B")
        self.assertEqual(len(data["unreadable"]), 1)
        self.assertEqual(len(d.registry_entries(d.workspace_root())), 2)

    def test_registry_corruption_does_not_undo_thread_publication(self):
        state, path = d.init(self.a, "A")
        (d.workspace_root() / "threads.json").write_text("bad json")
        next_state, _ = d.publish(self.a, state["run"], {**state["snapshot"], "summary": "New facts"}, 0)
        self.assertEqual(next_state["revision"], 1)
        self.assertEqual(d.preferred_dashboard(path, next_state), path / "index.html")
        self.assertEqual(d.read_json(path / "state.json")["snapshot"]["summary"], "New facts")
        with self.assertRaises(ValueError):
            d.refresh_workspace(strict=True)

    def test_unavailable_workspace_keeps_portable_dashboard_usable(self):
        state, path = d.init(self.a, "A")
        with patch.object(d, "workspace_root", side_effect=OSError("Unavailable")):
            self.assertEqual(d.preferred_dashboard(path, state), path / "index.html")

    def test_workspace_script_injection_is_inert(self):
        state, _ = d.init(self.a, "A")
        attack = '</script><script>alert("x")</script>'
        d.publish(self.a, state["run"], {**state["snapshot"], "title": attack}, 0)
        self.assertNotIn('<script>alert', self.hub.read_text())
        self.assertEqual(payload(self.hub)["threads"][0]["snapshot"]["title"], attack)

    def test_render_refreshes_workspace_without_changing_progress_timestamp(self):
        state, path = d.init(self.a, "A")
        before = (path / "state.json").read_bytes()
        d.write_json(self.a / ".dashboard/preferences.json", {**d.DEFAULT_STYLE, "theme": "dark", "accent": "#123456"})
        d.write_json(path / "presentation.json", {"eyebrow": "Review", "layout": "brief", "order": d.PANELS})
        result = subprocess.run([sys.executable, str(d.__file__), "--project", str(self.a), "render", state["run"]], capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(before, (path / "state.json").read_bytes())
        self.assertEqual(payload(self.hub)["threads"][0]["presentation"]["layout"], "brief")
        for output in [self.hub, path / "index.html", self.a / ".dashboard/index.html"]:
            self.assertEqual(payload(output)["threads"][0]["style"]["accent"], "#123456")


if __name__ == "__main__":
    unittest.main()
