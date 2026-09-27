#!/usr/bin/env python3
"""Publish offline progress dashboards. Python 3.10+, no dependencies."""
import argparse
from contextlib import contextmanager
from datetime import datetime, timezone
import html
import json
import os
from pathlib import Path
import re
import shlex
import sys
import tempfile
import uuid

ASSETS = Path(__file__).resolve().parent.parent / "assets"
PANELS = ["tasks", "questions", "blockers", "deliverables"]
DEFAULT_STYLE = {"theme": "light", "density": "dense", "accent": "#ae5630"}


def now():
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def read_json(path):
    path = Path(path)
    if path.is_symlink():
        raise ValueError(f"Refusing symlink: {path}")
    return json.loads(path.read_text(encoding="utf-8"))


def atomic_write(path, value):
    path = Path(path)
    if path.is_symlink():
        raise ValueError(f"Refusing symlink: {path}")
    fd, tmp = tempfile.mkstemp(prefix=".lantern-", dir=path.parent)
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as stream:
            stream.write(value)
            stream.flush()
            os.fsync(stream.fileno())
        os.replace(tmp, path)
    finally:
        if os.path.exists(tmp):
            os.unlink(tmp)


def write_json(path, data):
    atomic_write(path, json.dumps(data, ensure_ascii=False, indent=2) + "\n")


def dashboard_root(project):
    root = Path(project).resolve() / ".dashboard"
    if root.is_symlink():
        raise ValueError(".dashboard must not be a symlink")
    root.mkdir(exist_ok=True)
    return root


def run_dir(project, run):
    if not re.fullmatch(r"[a-zA-Z0-9][a-zA-Z0-9_-]{0,79}", run):
        raise ValueError("Invalid run ID")
    path = dashboard_root(project) / run
    if path.is_symlink() or not path.is_dir():
        raise ValueError("Run does not exist or is a symlink; use init first")
    return path


@contextmanager
def lock(path):
    marker = path / ".publish-lock"
    try:
        marker.mkdir()
    except FileExistsError:
        raise ValueError("Another publisher is active. Retry after it exits. If it crashed, remove .publish-lock only after verifying no publisher is running.") from None
    try:
        yield
    finally:
        marker.rmdir()


def text(value, label, allow_empty=False):
    if not isinstance(value, str) or (not allow_empty and not value.strip()):
        raise ValueError(f"{label} must be a {'possibly empty ' if allow_empty else 'nonempty '}string")


def style_valid(style):
    if not isinstance(style, dict) or set(style) != set(DEFAULT_STYLE):
        raise ValueError("Style needs theme, density, and accent")
    if style["theme"] not in ("dark", "light") or style["density"] not in ("airy", "dense"):
        raise ValueError("Invalid theme or density")
    if not isinstance(style["accent"], str) or not re.fullmatch(r"#[0-9a-fA-F]{6}", style["accent"]):
        raise ValueError("Accent must be a six-digit hex color")
    return style


def validate(snapshot):
    fields = {"title", "summary", "phase", *PANELS}
    if not isinstance(snapshot, dict) or set(snapshot) != fields:
        raise ValueError("Snapshot must contain exactly title, summary, phase, tasks, questions, blockers, deliverables")
    text(snapshot["title"], "title")
    text(snapshot["summary"], "summary", True)
    if snapshot["phase"] not in ("active", "blocked", "paused", "complete"):
        raise ValueError("Invalid phase")
    schemas = {
        "tasks": ({"id", "title", "status", "detail"}, {"todo", "doing", "done", "blocked", "skipped"}),
        "questions": ({"id", "question", "status", "default", "requires_answer", "answer"}, {"pending", "answered", "defaulted"}),
        "blockers": ({"id", "title", "detail", "status"}, {"open", "resolved"}),
        "deliverables": ({"id", "title", "path", "detail"}, None),
    }
    for panel, (keys, statuses) in schemas.items():
        rows = snapshot[panel]
        if not isinstance(rows, list):
            raise ValueError(f"{panel} must be an array")
        seen = set()
        for row in rows:
            if not isinstance(row, dict) or set(row) != keys:
                raise ValueError(f"Each {panel} item needs exactly: {', '.join(sorted(keys))}")
            for key, value in row.items():
                if key == "requires_answer":
                    if type(value) is not bool:
                        raise ValueError("requires_answer must be boolean")
                else:
                    text(value, f"{panel}.{key}", key in ("detail", "answer"))
            if row["id"] in seen:
                raise ValueError(f"Duplicate ID in {panel}: {row['id']}")
            seen.add(row["id"])
            if statuses and row["status"] not in statuses:
                raise ValueError(f"Invalid {panel} status")
            if panel == "questions":
                if row["requires_answer"] and row["status"] == "defaulted":
                    raise ValueError("Required decisions cannot be defaulted")
                if row["status"] == "answered" and not row["answer"].strip():
                    raise ValueError("Answered questions need an answer")
                if row["status"] != "answered" and row["answer"].strip():
                    raise ValueError("Only answered questions may have an answer")
    if snapshot["phase"] == "complete":
        if any(t["status"] not in ("done", "skipped") for t in snapshot["tasks"]):
            raise ValueError("Cannot complete with unfinished tasks")
        if any(b["status"] == "open" for b in snapshot["blockers"]):
            raise ValueError("Cannot complete with open blockers")
        if any(q["status"] == "pending" for q in snapshot["questions"]):
            raise ValueError("Resolve pending questions before completing")
    return snapshot


def presentation(path, snapshot):
    custom = path / "presentation.json"
    if custom.exists():
        data = read_json(custom)
        if not isinstance(data, dict) or set(data) != {"eyebrow", "order", "layout"}:
            raise ValueError("Presentation needs eyebrow, order, layout")
        text(data["eyebrow"], "eyebrow")
        if not isinstance(data["order"], list) or sorted(data["order"]) != sorted(PANELS):
            raise ValueError("Presentation order must include each panel exactly once")
        if data["layout"] not in ("board", "brief"):
            raise ValueError("Layout must be board or brief")
        return data
    order = list(PANELS)
    return {"eyebrow": "WORKSPACE / CURRENT RUN", "order": order, "layout": "board"}


def render_html(path, state):
    design = presentation(path, state["snapshot"])
    css_path = path / "theme.css"
    css = ""
    if css_path.exists():
        if css_path.is_symlink():
            raise ValueError("theme.css must not be a symlink")
        css = css_path.read_text(encoding="utf-8")
        if "<" in css or ">" in css:
            raise ValueError("Custom CSS must not contain angle brackets")
    command = " ".join(shlex.quote(str(part)) for part in ["python3", Path(__file__).resolve(), "--project", path.parent.parent])
    if state.get("demo"):
        command = "python3 /path/to/dashboard.py --project /path/to/project"
    commands = {
        "status": f"{command} status {shlex.quote(state['run'])}",
        "patch": f"{command} patch {shlex.quote(state['run'])} --input patch.json --expected-revision {state['revision']}",
        "render": f"{command} render {shlex.quote(state['run'])}",
    }
    payload = json.dumps({**state, "presentation": design, "commands": commands, "home_href": state.get("home_href", "../index.html")}, ensure_ascii=True).replace("<", "\\u003c").replace(">", "\\u003e").replace("&", "\\u0026")
    template = (ASSETS / "dashboard.html").read_text(encoding="utf-8")
    template = re.sub(r"^[ \t]*@@CUSTOM_CSS@@[ \t]*$", "@@CUSTOM_CSS@@", template, flags=re.MULTILINE)
    replacements = {"TITLE": html.escape(state["snapshot"]["title"]), "PAYLOAD": payload, "CUSTOM_CSS": css,
                    "CSS": (ASSETS / "dashboard.css").read_text(encoding="utf-8"),
                    "JS": (ASSETS / "dashboard.js").read_text(encoding="utf-8")}
    return re.sub(r"@@(TITLE|PAYLOAD|CUSTOM_CSS|CSS|JS)@@", lambda m: replacements[m[1]], template)


def user_style_path():
    return Path(os.environ.get("XDG_CONFIG_HOME", str(Path.home() / ".config"))) / "task-lantern" / "preferences.json"


def load_style(project):
    for path in (dashboard_root(project) / "preferences.json", user_style_path()):
        if path.exists():
            return style_valid(read_json(path))
    return dict(DEFAULT_STYLE)


def init(project, title):
    text(title, "title")
    root = dashboard_root(project)
    run = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S-") + uuid.uuid4().hex[:8]
    path = root / run
    path.mkdir()
    stamp = now()
    state = {"version": 2, "run": run, "revision": 0, "started_at": stamp, "updated_at": stamp, "history": [],
             "style": load_style(project), "snapshot": {"title": title, "summary": "Preparing the plan.", "phase": "active", **{p: [] for p in PANELS}}}
    output = render_html(path, state)
    write_json(path / "state.json", state)
    atomic_write(path / "index.html", output)
    refresh_index(project)
    return state, path


def publish(project, run, snapshot, expected_revision):
    validate(snapshot)
    path = run_dir(project, run)
    with lock(path):
        state = read_json(path / "state.json")
        if state["revision"] != expected_revision:
            raise ValueError(f"Stale snapshot: expected revision {expected_revision}, current {state['revision']}. Read state.json and merge before retrying.")
        stamp, revision = now(), state["revision"] + 1
        events = changes(state["snapshot"], snapshot, revision, stamp)
        state.update(version=2, snapshot=snapshot, revision=revision, updated_at=stamp, style=load_style(project),
                     history=(state.get("history", []) + events)[-100:])
        output = render_html(path, state)
        # State is authoritative. If interrupted between files, `render` repairs HTML.
        write_json(path / "state.json", state)
        atomic_write(path / "index.html", output)
    refresh_index(project)
    return state, path


def changes(previous, current, revision, stamp):
    """Derive a bounded, factual change journal at publish time."""
    events = []
    def record(panel, label, before, after, kind):
        events.append({"revision": revision, "at": stamp, "panel": panel, "label": label,
                       "before": before, "after": after, "kind": kind})
    for key in ("title", "summary", "phase"):
        if previous[key] != current[key]:
            record("run", key, previous[key], current[key], "updated")
    for panel in PANELS:
        old = {row["id"]: row for row in previous[panel]}
        new = {row["id"]: row for row in current[panel]}
        for row in current[panel]:
            before = old.get(row["id"])
            label = row.get("title", row.get("question", row["id"]))
            if before is None:
                record(panel, label, "", row.get("status", row.get("path", "")), "added")
            elif before != row:
                if before.get("status") != row.get("status"):
                    record(panel, label, before.get("status", ""), row.get("status", ""), "status")
                else:
                    record(panel, label, "", "Details changed", "updated")
        for row in previous[panel]:
            if row["id"] not in new:
                record(panel, row.get("title", row.get("question", row["id"])), row.get("status", ""), "", "removed")
    if not events:
        record("run", "Progress confirmed", "", "No snapshot changes", "confirmed")
    return events


def patch_snapshot(project, run, patch, expected_revision):
    """Merge top-level fields and upsert complete rows by stable ID."""
    if not isinstance(patch, dict) or not patch or set(patch) - {"title", "summary", "phase", *PANELS}:
        raise ValueError("Patch must contain snapshot fields only and cannot be empty")
    state = read_json(run_dir(project, run) / "state.json")
    if state["revision"] != expected_revision:
        raise ValueError("Stale patch: read the current revision before retrying")
    snapshot = state["snapshot"]
    for key, value in patch.items():
        if key not in PANELS:
            snapshot[key] = value
            continue
        if not isinstance(value, list) or any(not isinstance(row, dict) or not isinstance(row.get("id"), str) for row in value):
            raise ValueError(f"Patch {key} must be an array of complete rows with IDs")
        if len({row["id"] for row in value}) != len(value):
            raise ValueError(f"Duplicate IDs in patch {key}")
        rows = {row["id"]: row for row in snapshot[key]}
        rows.update({row["id"]: row for row in value})
        snapshot[key] = list(rows.values())
    return publish(project, run, snapshot, expected_revision)


def list_runs(project):
    runs, skipped = [], []
    for path in dashboard_root(project).iterdir():
        if not path.is_dir() or path.is_symlink() or path.name.startswith("."):
            continue
        try:
            run_dir(project, path.name)
            state = read_json(path / "state.json")
            snapshot = validate(state["snapshot"])
            stamp = state["updated_at"]
            datetime.fromisoformat(stamp)
            runs.append({"run": path.name, "title": snapshot["title"], "phase": snapshot["phase"],
                         "updated_at": stamp, "revision": state["revision"],
                         "done": sum(t["status"] == "done" for t in snapshot["tasks"]), "total": len(snapshot["tasks"]),
                         "questions": sum(q["status"] == "pending" for q in snapshot["questions"]),
                         "blockers": sum(b["status"] == "open" for b in snapshot["blockers"])})
        except (ValueError, OSError, TypeError, KeyError):
            skipped.append(path.name)
    return {"runs": sorted(runs, key=lambda r: r["updated_at"], reverse=True), "unreadable": skipped}


def refresh_index(project, strict=False):
    """The project overview is derived. A failed refresh must not undo a publication."""
    root = dashboard_root(project)
    try:
        with lock(root):
            inventory = list_runs(project)
            template = (ASSETS / "runs.html").read_text(encoding="utf-8")
            payload = json.dumps(inventory, ensure_ascii=True).replace("<", "\\u003c").replace(">", "\\u003e").replace("&", "\\u0026")
            atomic_write(root / "index.html", template.replace("@@RUNS@@", payload))
    except (ValueError, OSError) as error:
        if strict:
            raise
        print(f"task-lantern: run saved; overview refresh skipped: {error}. Use the index command to retry.", file=sys.stderr)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--project", default=".", help="Existing project directory (default: cwd)")
    commands = parser.add_subparsers(dest="command", required=True)
    start = commands.add_parser("init", help="Create a separate run and offline HTML")
    start.add_argument("--title", required=True)
    update = commands.add_parser("publish", help="Validate and publish a complete snapshot")
    update.add_argument("run")
    update.add_argument("--input", required=True, help="JSON snapshot path, or - for stdin")
    update.add_argument("--expected-revision", required=True, type=int)
    patch_cmd = commands.add_parser("patch", help="Upsert complete rows by ID without rewriting the whole snapshot")
    patch_cmd.add_argument("run")
    patch_cmd.add_argument("--input", required=True)
    patch_cmd.add_argument("--expected-revision", required=True, type=int)
    status = commands.add_parser("status", help="Print a run's full state as JSON")
    status.add_argument("run")
    commands.add_parser("list", help="List project runs as JSON")
    commands.add_parser("index", help="Rebuild the offline overview of all project runs")
    rerender = commands.add_parser("render", help="Apply design changes without claiming fresh progress")
    rerender.add_argument("run")
    prefs = commands.add_parser("style", help="Save style; used by the next init/publish/render")
    prefs.add_argument("--theme", choices=["dark", "light"], required=True)
    prefs.add_argument("--density", choices=["airy", "dense"], required=True)
    prefs.add_argument("--accent", required=True)
    prefs.add_argument("--scope", choices=["project", "user"], default="project")
    args = parser.parse_args()
    try:
        if args.command == "init":
            state, path = init(args.project, args.title)
        elif args.command in ("publish", "patch"):
            snapshot = json.load(sys.stdin) if args.input == "-" else read_json(args.input)
            writer = publish if args.command == "publish" else patch_snapshot
            state, path = writer(args.project, args.run, snapshot, args.expected_revision)
        elif args.command == "status":
            print(json.dumps(read_json(run_dir(args.project, args.run) / "state.json"), indent=2))
            return
        elif args.command == "list":
            print(json.dumps(list_runs(args.project), indent=2))
            return
        elif args.command == "index":
            refresh_index(args.project, strict=True)
            print(json.dumps({"dashboard": str(dashboard_root(args.project) / "index.html")}))
            return
        elif args.command == "render":
            path = run_dir(args.project, args.run)
            with lock(path):
                state = read_json(path / "state.json")
                state["style"] = load_style(args.project)
                atomic_write(path / "index.html", render_html(path, state))
        else:
            style = style_valid({"theme": args.theme, "density": args.density, "accent": args.accent})
            path = dashboard_root(args.project) / "preferences.json" if args.scope == "project" else user_style_path()
            path.parent.mkdir(parents=True, exist_ok=True)
            write_json(path, style)
            print(json.dumps({"preferences": str(path), "style": style}))
            return
        print(json.dumps({"run": state["run"], "revision": state["revision"], "dashboard": str(path / "index.html")}))
    except (ValueError, OSError, TypeError, KeyError) as error:
        parser.exit(2, f"task-lantern: {error}\n")


if __name__ == "__main__":
    main()
