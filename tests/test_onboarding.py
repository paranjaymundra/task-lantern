"""Exercise first-use paths with actual CLI processes and isolated installs."""
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
spec = importlib.util.spec_from_file_location("onboarding_installer", ROOT / "scripts/install.py")
installer = importlib.util.module_from_spec(spec)
spec.loader.exec_module(installer)


class OnboardingTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory(prefix="lantern onboarding ")
        self.addCleanup(self.tmp.cleanup)
        self.base = Path(self.tmp.name)
        self.env = {**os.environ, "XDG_CONFIG_HOME": str(self.base / "config"), "XDG_DATA_HOME": str(self.base / "data")}

    def cli(self, script, *args, expected=0):
        result = subprocess.run([sys.executable, str(script), *map(str, args)],
                                capture_output=True, text=True, env=self.env)
        self.assertEqual(result.returncode, expected, result.stdout + result.stderr)
        return result

    def test_check_is_read_only_and_reports_missing(self):
        target = self.base / "absent"
        result = self.cli(ROOT / "scripts/install.py", "--host", "codex", "--project", target,
                          "--with-agent", "--check", expected=1)
        self.assertIn("not installed", result.stdout)
        self.assertFalse(target.exists())

    def test_both_native_user_installs_and_drift_detection(self):
        with patch.object(Path, "home", return_value=self.base):
            for host in ("codex", "claude"):
                with self.subTest(host=host):
                    entries = installer.plan(host, "user", ".", True)
                    installer.install(entries)
                    self.assertTrue(all(not issues for _, issues in installer.check(entries)))
                    publisher = entries[0][1] / "scripts/dashboard.py"
                    publisher.write_text(publisher.read_text(encoding="utf-8") + "\n# local customization\n", encoding="utf-8")
                    reports = installer.check(entries)
                    self.assertTrue(any("differs" in issue for _, issues in reports for issue in issues))
                    publisher.unlink()
                    self.assertTrue(any("missing" in issue for _, issues in installer.check(entries) for issue in issues))
                    if host == "claude":
                        self.assertNotIn("task-lantern:dashboard-design", entries[-1][1].read_text(encoding="utf-8"))

    def test_installed_publisher_works_in_separate_project(self):
        installed = self.base / "installed files"
        entries = installer.plan("codex", "project", installed, True)
        installer.install(entries)
        self.cli(ROOT / "scripts/install.py", "--host", "codex", "--project", installed,
                 "--with-agent", "--check")
        project = self.base / "sample project"
        project.mkdir()
        publisher = entries[0][1] / "scripts/dashboard.py"
        def run(*args, expected=0):
            return self.cli(publisher, "--project", project, *args, expected=expected)
        state = json.loads(run("init", "--title", "My first dashboard").stdout)
        rid = state["run"]
        result = run("publish", rid, "--input", ROOT / "examples/snapshot.json", "--expected-revision", "0")
        self.assertEqual(json.loads(result.stdout)["revision"], 1)
        patchfile = self.base / "patch.json"
        patchfile.write_text(json.dumps({"summary": "Manual smoke test."}), encoding="utf-8")
        args = ("patch", rid, "--input", patchfile, "--expected-revision", "1")
        self.assertEqual(json.loads(run(*args).stdout)["revision"], 2)
        run(*args, expected=2)
        final = json.loads(run("status", rid).stdout)
        self.assertEqual(final["revision"], 2)
        self.assertEqual(final["snapshot"]["summary"], "Manual smoke test.")
        self.assertTrue(Path(state["dashboard"]).is_file())
        self.assertTrue((project / ".dashboard/index.html").is_file())

    def test_missing_project_has_actionable_error(self):
        target = self.base / "not-created"
        result = self.cli(ROOT / "skills/task-lantern/scripts/dashboard.py", "--project", target,
                          "init", "--title", "Test", expected=2)
        self.assertIn("Create it first", result.stderr)
        self.assertNotIn("Traceback", result.stderr)
        self.assertFalse(target.exists())

    def test_apply_and_check_are_mutually_exclusive(self):
        target = self.base / "not-created"
        self.cli(ROOT / "scripts/install.py", "--host", "codex", "--project", target,
                 "--apply", "--check", expected=2)
        self.assertFalse(target.exists())


if __name__ == "__main__":
    unittest.main()
