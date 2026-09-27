#!/usr/bin/env python3
"""Preview or install Task Lantern's local skills and optional agent. Never overwrite."""
import argparse
from pathlib import Path
import shutil
import sys

ROOT = Path(__file__).resolve().parent.parent


def plan(host, scope, project, with_agent):
    base = Path.home() if scope == "user" else Path(project).resolve()
    skill_root = base / (".agents/skills" if host == "codex" else ".claude/skills")
    entries = [(ROOT / "skills" / name, skill_root / name) for name in ("task-lantern", "dashboard-design")]
    if with_agent:
        source = ROOT / ("adapters/codex/dashboard-builder.toml" if host == "codex" else "agents/dashboard-builder.md")
        target = base / (".codex/agents/dashboard-builder.toml" if host == "codex" else ".claude/agents/dashboard-builder.md")
        entries.append((source, target))
    return entries


def install(entries):
    # Check the whole plan first. Existing installs need an intentional manual update.
    for source, target in entries:
        if target.exists() or target.is_symlink():
            raise ValueError(f"Already exists: {target}. Back it up or choose another scope; nothing was overwritten.")
        if not source.exists():
            raise ValueError(f"Missing package file: {source}")
    for source, target in entries:
        target.parent.mkdir(parents=True, exist_ok=True)
        if source.is_dir():
            shutil.copytree(source, target, ignore=shutil.ignore_patterns("__pycache__", "*.pyc"))
        elif source.suffix == ".md":
            # A native agent refers to the native skill, not a plugin namespace.
            with target.open("x", encoding="utf-8") as stream:
                stream.write(source.read_text(encoding="utf-8").replace("task-lantern:dashboard-design", "dashboard-design"))
        else:
            with target.open("xb") as stream:
                stream.write(source.read_bytes())


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--host", choices=["codex", "claude"], required=True)
    parser.add_argument("--scope", choices=["project", "user"], default="project")
    parser.add_argument("--project", default=".")
    parser.add_argument("--with-agent", action="store_true")
    parser.add_argument("--apply", action="store_true", help="Write files; otherwise print the plan only")
    args = parser.parse_args()
    entries = plan(args.host, args.scope, args.project, args.with_agent)
    for source, target in entries:
        print(f"{source.relative_to(ROOT)} -> {target}")
    if not args.apply:
        print("Preview only. Add --apply to install. Global rules and permissions are never changed.")
        return
    try:
        install(entries)
    except (OSError, ValueError) as error:
        parser.exit(2, f"task-lantern: {error}\n")
    print("Installed. Start a new agent session if these skills or agents do not appear.")


if __name__ == "__main__":
    main()
