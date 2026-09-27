#!/usr/bin/env python3
"""Preview, install, or check Task Lantern's native skills. Never overwrite."""
import argparse
from pathlib import Path
import shutil

ROOT = Path(__file__).resolve().parent.parent
IGNORED = {"__pycache__", ".DS_Store"}


def plan(host, scope, project, with_agent):
    base = Path.home() if scope == "user" else Path(project).resolve()
    skill_root = base / (".agents/skills" if host == "codex" else ".claude/skills")
    entries = [(ROOT / "skills" / name, skill_root / name) for name in ("task-lantern", "dashboard-design")]
    if with_agent:
        source = ROOT / ("adapters/codex/dashboard-builder.toml" if host == "codex" else "agents/dashboard-builder.md")
        target = base / (".codex/agents/dashboard-builder.toml" if host == "codex" else ".claude/agents/dashboard-builder.md")
        entries.append((source, target))
    return entries


def native_bytes(source):
    if source.suffix == ".md":
        return source.read_text(encoding="utf-8").replace("task-lantern:dashboard-design", "dashboard-design").encode("utf-8")
    return source.read_bytes()


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
            shutil.copytree(source, target, ignore=shutil.ignore_patterns(*IGNORED, "*.pyc"))
        else:
            with target.open("xb") as stream:
                stream.write(native_bytes(source))


def check(entries):
    """Compare expected native files to this checkout, without writing anything."""
    results = []
    for source, target in entries:
        issues = []
        if target.is_symlink():
            issues.append("target is a symlink; inspect manually")
        elif not target.exists():
            issues.append("not installed")
        elif source.is_dir():
            if not target.is_dir():
                issues.append("expected a directory")
            else:
                for original in sorted(source.rglob("*")):
                    relative = original.relative_to(source)
                    if any(part in IGNORED for part in relative.parts) or original.suffix == ".pyc":
                        continue
                    installed = target / relative
                    if installed.is_symlink():
                        issues.append(f"{relative}: symlink; inspect manually")
                    elif original.is_file():
                        if not installed.is_file():
                            issues.append(f"{relative}: missing")
                        elif installed.read_bytes() != original.read_bytes():
                            issues.append(f"{relative}: differs from this checkout")
        elif not target.is_file() or target.read_bytes() != native_bytes(source):
            issues.append("differs from this checkout")
        results.append((target, issues))
    return results


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--host", choices=["codex", "claude"], required=True)
    parser.add_argument("--scope", choices=["project", "user"], default="project")
    parser.add_argument("--project", default=".")
    parser.add_argument("--with-agent", action="store_true")
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument("--apply", action="store_true", help="Write files; otherwise preview only")
    mode.add_argument("--check", action="store_true", help="Check expected installed files against this checkout; never write")
    args = parser.parse_args()
    entries = plan(args.host, args.scope, args.project, args.with_agent)
    try:
        if args.check:
            results = check(entries)
            for target, issues in results:
                print(f"{'CHECK' if issues else 'OK'} {target}")
                for issue in issues:
                    print(f"  {issue}")
            print("Compared expected files only. Extra files and host discovery are not checked.")
            if any(issues for _, issues in results):
                print("Missing or different files found. Customizations may be intentional; see docs/installation.md before reinstalling.")
                parser.exit(1)
            print("Installed files match this checkout. Start a new host session and invoke the skill to verify discovery.")
            return
        for source, target in entries:
            print(f"{source.relative_to(ROOT)} -> {target}")
        if not args.apply:
            print("Preview only. Add --apply to install. Global rules and permissions are never changed.")
            return
        install(entries)
    except (OSError, ValueError) as error:
        parser.exit(2, f"task-lantern: {error}\n")
    invocation = "$task-lantern" if args.host == "codex" else "/task-lantern"
    print(f"Installed. Start a new {args.host} session in your project and invoke {invocation}.")
    print("The agent will share a .dashboard/<run-id>/index.html path. Open it in your browser.")


if __name__ == "__main__":
    main()
