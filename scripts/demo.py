#!/usr/bin/env python3
"""Generate a self-contained, explicitly fictional multi-project workspace."""
import argparse
import copy
import importlib.util
import os
from pathlib import Path
import tempfile
import webbrowser
from unittest.mock import patch

ROOT = Path(__file__).resolve().parent.parent
spec = importlib.util.spec_from_file_location("dashboard", ROOT / "skills/task-lantern/scripts/dashboard.py")
dashboard = importlib.util.module_from_spec(spec)
spec.loader.exec_module(dashboard)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", default=str(ROOT / "examples/demo.html"))
    parser.add_argument("--theme", choices=["dark", "light"], default="light")
    parser.add_argument("--open", action="store_true")
    args = parser.parse_args()
    with tempfile.TemporaryDirectory() as temp, patch.dict(os.environ):
        # All registrations stay inside this temporary fixture, never in the user's workspace.
        os.environ["XDG_DATA_HOME"] = str(Path(temp) / "data")
        os.environ["XDG_CONFIG_HOME"] = str(Path(temp) / "config")
        items = []
        base = dashboard.read_json(ROOT / "examples/snapshot.json")
        fixtures = [
            ("Storefront", "claude", "Redesign product search", base),
            ("Billing", "codex", "Migrate the billing API", {
                "summary": "The new endpoints are in place. Checking webhook retries before the final handoff.", "phase": "active",
                "tasks": [{"id": str(i), "title": title, "status": "done" if i < 4 else "doing" if i == 4 else "todo", "detail": detail} for i, (title, detail) in enumerate([
                    ("Map existing endpoints", "Routes and consumers are documented."), ("Add typed request models", "Validated payloads cover every endpoint."),
                    ("Migrate subscription routes", "Existing behavior is preserved."), ("Update webhook handlers", "Events use the new interface."),
                    ("Check webhook retries", "Verifying idempotency when the same event arrives twice."), ("Write the migration guide", "Document changes for SDK consumers.")])],
                "questions": [], "blockers": [], "deliverables": [{"id": "api", "title": "API migration", "path": "src/billing/routes.ts", "detail": "Updated subscription routes."}]}),
            ("Workspace", "claude", "Polish account settings", {
                "summary": "Profile settings are ready. Email verification is waiting for test credentials.", "phase": "blocked",
                "tasks": [{"id": "profile", "title": "Build profile settings", "status": "done", "detail": "Name and avatar changes are covered."}, {"id": "email", "title": "Verify email changes", "status": "blocked", "detail": "The email provider's sandbox key is missing."}, {"id": "tests", "title": "Check all settings flows", "status": "todo", "detail": "Run through save and error states."}],
                "questions": [], "blockers": [{"id": "key", "title": "Email sandbox key needed", "status": "open", "detail": "Add a sandbox credential in your agent session. Local UI checks can continue."}], "deliverables": []}),
            ("Developer docs", "codex", "Add SDK examples", {
                "summary": "The quickstart is ready. Adding examples for pagination and error handling.", "phase": "active",
                "tasks": [{"id": "quickstart", "title": "Write the quickstart", "status": "done", "detail": "Setup and the first request are covered."}, {"id": "examples", "title": "Add pagination examples", "status": "doing", "detail": "Showing how to retrieve each page of results."}, {"id": "review", "title": "Verify example snippets", "status": "todo", "detail": "Execute each example before handing off."}],
                "questions": [], "blockers": [], "deliverables": []}),
            ("Storefront", "codex", "Fix the sign-in redirect", {
                "summary": "The redirect keeps the intended destination. The regression check and handoff are complete.", "phase": "complete",
                "tasks": [{"id": str(i), "title": title, "status": "done", "detail": "Verified in this fictional example."} for i, title in enumerate(["Reproduce the redirect", "Preserve the return path", "Add a regression check", "Write the handoff"])],
                "questions": [], "blockers": [], "deliverables": [{"id": "fix", "title": "Redirect fix", "path": "src/auth/redirect.ts", "detail": "Preserves the requested destination."}]})
        ]
        for name, host, title, snapshot in fixtures:
            project = Path(temp) / name
            project.mkdir(exist_ok=True)
            root = dashboard.dashboard_root(project)
            dashboard.write_json(root / "preferences.json", {"theme": args.theme, "density": "dense", "accent": "#ae5630"})
            state, path = dashboard.init(project, title, host=host)
            snapshot = copy.deepcopy(snapshot)
            snapshot["title"] = title
            first = copy.deepcopy(snapshot)
            first.update(summary="Preparing the implementation plan.", phase="active", questions=[], blockers=[], deliverables=[])
            for task in first["tasks"]:
                task.update(status="todo", detail="Planned work.")
            state, path = dashboard.publish(project, state["run"], first, 0)
            state, path = dashboard.publish(project, state["run"], snapshot, 1)
            state.update(demo=True, project_name=name)
            items.append(dashboard.thread_payload(path, state))
        output = Path(args.output).resolve()
        output.parent.mkdir(parents=True, exist_ok=True)
        dashboard.atomic_write(output, dashboard.render_workspace(items, selected=items[0]["key"], demo=True))
        print(output)
        if args.open and not webbrowser.open(output.as_uri()):
            print("Open the path above manually.")


if __name__ == "__main__":
    main()
