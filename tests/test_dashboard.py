import copy
import importlib.util
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]


def module(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    value = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(value)
    return value


d = module("dashboard", ROOT / "skills/task-lantern/scripts/dashboard.py")
installer = module("installer", ROOT / "scripts/install.py")


class DashboardTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.project = Path(self.tmp.name)
        self.env = patch.dict(os.environ, {"XDG_CONFIG_HOME": str(self.project / "config")})
        self.env.start()
        self.addCleanup(self.env.stop)
        self.state, self.path = d.init(self.project, "Example")
        self.snapshot = d.read_json(ROOT / "examples/snapshot.json")

    def test_init_creates_independent_runs_with_real_timestamps(self):
        second, _ = d.init(self.project, "Other task")
        self.assertNotEqual(self.state["run"], second["run"])
        self.assertEqual(self.state["updated_at"][-6:], "+00:00")
        self.assertTrue((self.path / "index.html").is_file())
        self.assertEqual(self.state["revision"], 0)

    def test_publish_advances_revision_and_snapshot(self):
        state, _ = d.publish(self.project, self.state["run"], self.snapshot, 0)
        self.assertEqual(state["revision"], 1)
        self.assertEqual(d.read_json(self.path / "state.json")["snapshot"], self.snapshot)
        self.assertIn(self.snapshot["title"], (self.path / "index.html").read_text())

    def test_stale_writer_preserves_newer_state(self):
        d.publish(self.project, self.state["run"], self.snapshot, 0)
        before = (self.path / "state.json").read_bytes()
        with self.assertRaisesRegex(ValueError, "Stale"):
            d.publish(self.project, self.state["run"], self.snapshot, 0)
        self.assertEqual(before, (self.path / "state.json").read_bytes())

    def test_required_question_cannot_be_defaulted(self):
        self.snapshot["questions"][1]["status"] = "defaulted"
        with self.assertRaisesRegex(ValueError, "cannot be defaulted"):
            d.validate(self.snapshot)

    def test_completion_rejects_unfinished_work(self):
        self.snapshot["phase"] = "complete"
        with self.assertRaisesRegex(ValueError, "unfinished tasks"):
            d.validate(self.snapshot)
        for task in self.snapshot["tasks"]:
            task["status"] = "done"
        with self.assertRaisesRegex(ValueError, "open blockers"):
            d.validate(self.snapshot)
        self.snapshot["blockers"][0]["status"] = "resolved"
        with self.assertRaisesRegex(ValueError, "pending questions"):
            d.validate(self.snapshot)
        for question in self.snapshot["questions"]:
            question.update(status="answered", answer="Keep it local.")
        self.assertIs(d.validate(self.snapshot), self.snapshot)

    def test_skipped_work_is_allowed_but_not_converted_to_done(self):
        snapshot = copy.deepcopy(self.state["snapshot"])
        snapshot.update(phase="complete", tasks=[{"id": "one", "title": "Optional", "status": "skipped", "detail": "User removed this scope."}])
        d.validate(snapshot)
        self.assertEqual(snapshot["tasks"][0]["status"], "skipped")

    def test_answer_and_schema_validation(self):
        for key, value in [("status", "answered"), ("requires_answer", "false"), ("answer", "Unrecorded answer")]:
            snapshot = copy.deepcopy(self.snapshot)
            snapshot["questions"][0][key] = value
            with self.assertRaises(ValueError):
                d.validate(snapshot)
        self.snapshot["tasks"].append(self.snapshot["tasks"][0])
        with self.assertRaisesRegex(ValueError, "Duplicate"):
            d.validate(self.snapshot)

    def test_invalid_publish_leaves_valid_page_untouched(self):
        before = (self.path / "index.html").read_bytes()
        self.snapshot["phase"] = "complete"
        with self.assertRaises(ValueError):
            d.publish(self.project, self.state["run"], self.snapshot, 0)
        self.assertEqual(before, (self.path / "index.html").read_bytes())

    def test_html_injection_is_inert_and_data_round_trips(self):
        attack = '</script><script>alert("x")</script><img src=x onerror=alert(1)> & @@CUSTOM_CSS@@'
        self.state["snapshot"]["title"] = attack
        rendered = d.render_html(self.path, self.state)
        self.assertNotIn('<script>alert', rendered)
        payload = rendered.split('<script id="state" type="application/json">')[1].split('</script>')[0]
        self.assertEqual(json.loads(payload)["snapshot"]["title"], attack)

    def test_render_does_not_fake_fresh_progress(self):
        before = (self.path / "state.json").read_bytes()
        result = subprocess.run([sys.executable, str(d.__file__), "--project", str(self.project), "render", self.state["run"]], capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(before, (self.path / "state.json").read_bytes())

    def test_project_style_overrides_user_style(self):
        user = d.user_style_path()
        user.parent.mkdir(parents=True)
        d.write_json(user, {"theme": "light", "density": "dense", "accent": "#123456"})
        self.assertEqual(d.load_style(self.project)["theme"], "light")
        d.write_json(self.project / ".dashboard/preferences.json", d.DEFAULT_STYLE)
        self.assertEqual(d.load_style(self.project)["theme"], "dark")

    def test_style_rejects_css_injection(self):
        with self.assertRaises(ValueError):
            d.style_valid({**d.DEFAULT_STYLE, "accent": "red;display:none"})

    def test_presentation_requires_all_panels(self):
        d.write_json(self.path / "presentation.json", {"eyebrow": "Example", "order": ["tasks"], "layout": "board"})
        with self.assertRaisesRegex(ValueError, "each panel"):
            d.render_html(self.path, self.state)

    def test_custom_css_cannot_break_out_of_style(self):
        (self.path / "theme.css").write_text('</style><script>alert(1)</script>')
        with self.assertRaisesRegex(ValueError, "angle brackets"):
            d.render_html(self.path, self.state)

    def test_path_traversal_is_rejected(self):
        with self.assertRaisesRegex(ValueError, "Invalid run"):
            d.run_dir(self.project, "../../elsewhere")

    def test_symlink_output_is_rejected(self):
        target = self.project / "untouched.txt"
        target.write_text("untouched")
        link = self.path / "index.html"
        link.unlink()
        try:
            link.symlink_to(target)
        except OSError:
            self.skipTest("Symlinks unavailable")
        with self.assertRaisesRegex(ValueError, "symlink"):
            d.atomic_write(link, "replacement")
        self.assertEqual(target.read_text(), "untouched")

    def test_concurrent_publisher_lock(self):
        with d.lock(self.path):
            with self.assertRaisesRegex(ValueError, "publisher"):
                d.publish(self.project, self.state["run"], self.snapshot, 0)
        self.assertFalse((self.path / ".publish-lock").exists())

    def test_installer_preview_does_not_write(self):
        result = subprocess.run([sys.executable, str(installer.__file__), "--host", "codex", "--project", str(self.project), "--with-agent"], capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertFalse((self.project / ".agents").exists())

    def test_installer_both_hosts_and_refuses_overwrite(self):
        for host in ("codex", "claude"):
            target = self.project / host
            entries = installer.plan(host, "project", target, True)
            installer.install(entries)
            self.assertTrue((entries[0][1] / "SKILL.md").exists())
            if host == "claude":
                self.assertNotIn("task-lantern:dashboard-design", entries[-1][1].read_text())
            with self.assertRaisesRegex(ValueError, "Already exists"):
                installer.install(entries)

    def test_cli_invalid_input_exits_cleanly(self):
        result = subprocess.run([sys.executable, str(d.__file__), "--project", str(self.project), "publish", self.state["run"], "--input", "-", "--expected-revision", "0"], input="not json", capture_output=True, text=True)
        self.assertEqual(result.returncode, 2)
        self.assertNotIn("Traceback", result.stderr)


if __name__ == "__main__":
    unittest.main()
