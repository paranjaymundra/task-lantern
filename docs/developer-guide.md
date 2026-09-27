# Working with Task Lantern

The CLI is dependency-free Python. Commands below assume you have set a shell
variable to the installed publisher. In POSIX shells:

```sh
LANTERN_SCRIPT='/absolute/path/to/skills/task-lantern/scripts/dashboard.py'
python3 "$LANTERN_SCRIPT" --project . init --title 'Refactor authentication'
```

The result includes the run ID, current revision, shared `dashboard` path,
`thread_dashboard` path, and `project_dashboard` path. All commands
accept `--project` **before** the subcommand. Copy the returned run ID into the
examples below. No task text is ever executed as a command.

## Start with a complete snapshot

Use the [snapshot schema](../skills/task-lantern/references/protocol.md) and write
your plan to a JSON file. The publisher consumes data; it does not inspect your
repo, run tests, or infer progress from process activity.

```sh
python3 "$LANTERN_SCRIPT" --project . publish RUN_ID --input snapshot.json --expected-revision 0
```

## Update one thing

Save a patch containing a complete row to `patch.json`:

```json
{
  "tasks": [
    {
      "id": "tests",
      "title": "Verify the authentication flow",
      "status": "done",
      "detail": "The targeted integration checks passed."
    }
  ]
}
```

Then use the latest revision:

```sh
python3 "$LANTERN_SCRIPT" --project . status RUN_ID
python3 "$LANTERN_SCRIPT" --project . patch RUN_ID --input patch.json --expected-revision 1
```

Rows with matching IDs are replaced; new IDs are appended; omitted rows remain.
Each included row must contain every field required by its panel. Empty arrays
do not delete rows. Use a complete `publish` snapshot for removals.

Scalar fields such as `summary` and `phase` can also be patched. The final merged
snapshot is validated, including required-decision and completion checks.

If another publisher has moved the revision forward, your update fails without
overwriting it. Read the current state and merge your intended change. Never
simply increase the expected revision to bypass the conflict.

## One workspace, multiple projects

```sh
python3 "$LANTERN_SCRIPT" --project . list
python3 "$LANTERN_SCRIPT" --project . index
python3 "$LANTERN_SCRIPT" workspace
```

Open the returned `dashboard` path to switch between tracked threads across
projects in one self-contained HTML. `index` rebuilds the same interface for the
current project only; `workspace` rebuilds the shared file. Only initialized runs
are registered; Task Lantern does not read host chat logs. Each thread retains
its own state and revision lock. Missing or corrupt state is reported on the
workspace without blocking other threads.

For a real host session ID, use `init --title ... --host codex --thread-id ID`.
Repeating this in the same project and host resumes the same run. Otherwise
retain the returned run ID and reuse it within your session. No ID is inferred
from a title. Publish or render an older run to register it in the new workspace.

## In the browser

- **Summary:** current work, progress, next step, required attention, blockers, and recent files.
- **Plan (expand):** searchable tasks with status filtering. Press `/` to search and Escape to clear.
- **Decisions & blockers (expand):** required answers first, then optional preferences, plus blockers.
- **Activity (expand):** up to 100 publication events, newest first. Changes use the OS clock.
- **Developer details (expand):** raw snapshot, schema/revision details, patch example, copyable commands.

Copying an example does not publish it. Change the example to match verified
facts before running it. Copyable commands use POSIX shell quoting; Git Bash or
WSL can run them on Windows. You can use the Python CLI directly in PowerShell
with PowerShell's normal argument quoting.

The Export menu downloads Markdown or JSON for only the selected thread, or copies a short status update.
The JSON export is a state envelope, **not** a snapshot input: extract its
`snapshot` field if you want to publish it elsewhere. Exports can contain private
task details, local paths, and historical labels; inspect before sharing.

Theme/density choices are browser-local overrides. They do not modify the
agent's saved preferences. Selected thread, expanded sections, filters, pause, and scroll state use session
storage when available. Clipboard failures show selectable text. The page
defers refreshing while an input is focused or a dialog is open.

## Updating an older installation

Follow the [installation maintenance guide](installation.md#update) for exact
plugin commands or the native backup-and-reinstall procedure. Updating the source
clone alone does not update installed native copies. Keep existing run data.

Existing version 1 state files work with the new renderer. The next publication
upgrades the envelope to version 2 and begins recording history. Older events
cannot be reconstructed and are never invented. Existing custom CSS may need
adjustments for the new workbench structure; rename `theme.css` to keep a backup
and run `render RUN_ID` to return to the built-in design.
