#!/usr/bin/env python3
"""Generate a clearly labeled fictional demo using the real system clock."""
import argparse
import importlib.util
from pathlib import Path
import tempfile

ROOT = Path(__file__).resolve().parent.parent
spec = importlib.util.spec_from_file_location("dashboard", ROOT / "skills/task-lantern/scripts/dashboard.py")
dashboard = importlib.util.module_from_spec(spec)
spec.loader.exec_module(dashboard)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", default=str(ROOT / "examples/demo.html"))
    parser.add_argument("--theme", choices=["dark", "light"], default="dark")
    args = parser.parse_args()
    with tempfile.TemporaryDirectory() as project:
        root = dashboard.dashboard_root(project)
        dashboard.write_json(root / "preferences.json", {"theme": args.theme, "density": "airy", "accent": "#c7ed84"})
        state, path = dashboard.init(project, "Task Lantern demo")
        dashboard.write_json(path / "presentation.json", {"eyebrow": "DEMO / FICTIONAL PROJECT", "order": ["tasks", "questions", "blockers", "deliverables"], "layout": "board"})
        snapshot = dashboard.read_json(ROOT / "examples/snapshot.json")
        state, path = dashboard.publish(project, state["run"], snapshot, 0)
        output = Path(args.output).resolve()
        output.parent.mkdir(parents=True, exist_ok=True)
        dashboard.atomic_write(output, (path / "index.html").read_text(encoding="utf-8"))
        print(output)


if __name__ == "__main__":
    main()
