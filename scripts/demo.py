#!/usr/bin/env python3
"""Generate a clearly labeled fictional demo using the real system clock."""
import argparse
import copy
import importlib.util
from pathlib import Path
import tempfile
import webbrowser

ROOT = Path(__file__).resolve().parent.parent
spec = importlib.util.spec_from_file_location("dashboard", ROOT / "skills/task-lantern/scripts/dashboard.py")
dashboard = importlib.util.module_from_spec(spec)
spec.loader.exec_module(dashboard)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", default=str(ROOT / "examples/demo.html"))
    parser.add_argument("--theme", choices=["dark", "light"], default="light")
    parser.add_argument("--open", action="store_true", help="Open the generated demo in your default browser")
    args = parser.parse_args()
    with tempfile.TemporaryDirectory() as project:
        root = dashboard.dashboard_root(project)
        dashboard.write_json(root / "preferences.json", {"theme": args.theme, "density": "dense", "accent": "#ae5630"})
        state, path = dashboard.init(project, "Task Lantern demo")
        dashboard.write_json(path / "presentation.json", {"eyebrow": "SEARCH REDESIGN / DEMO PROJECT", "order": ["tasks", "questions", "blockers", "deliverables"], "layout": "board"})
        snapshot = dashboard.read_json(ROOT / "examples/snapshot.json")
        first = copy.deepcopy(snapshot)
        first.update(summary="Mapping the search flow and planning the implementation.", questions=[], blockers=[], deliverables=[])
        for task in first["tasks"]:
            task.update(status="todo", detail="Planned work.")
        state, path = dashboard.publish(project, state["run"], first, 0)
        state, path = dashboard.publish(project, state["run"], snapshot, 1)
        state["home_href"] = ""
        state["demo"] = True
        output = Path(args.output).resolve()
        output.parent.mkdir(parents=True, exist_ok=True)
        dashboard.atomic_write(output, dashboard.render_html(path, state))
        print(output)
        if args.open and not webbrowser.open(output.as_uri()):
            print("Could not open a browser automatically. Open the path above manually.")


if __name__ == "__main__":
    main()
