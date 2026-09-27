# Working with Task Lantern

The CLI is dependency-free Python. Commands below assume you have set a shell
variable to the installed publisher. In POSIX shells:

```sh
LANTERN_SCRIPT='/absolute/path/to/skills/task-lantern/scripts/dashboard.py'
python3 "$LANTERN_SCRIPT" --project . init --title 'Refactor authentication'
```

The result includes the run ID, current revision, and HTML path. All commands
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

## Multiple runs

```sh
python3 "$LANTERN_SCRIPT" --project . list
python3 "$LANTERN_SCRIPT" --project . index
```

Open `.dashboard/index.html` to browse runs. Each run has its own state and lock.
The overview is rebuilt after publications. If it is temporarily locked or
unwritable, the run still saves and a warning tells you to retry `index`.
Unreadable runs are reported rather than breaking the whole inventory.

## In the browser

- **Overview:** progress, required attention, plan, decisions, artifacts, recent changes.
- **Plan:** searchable tasks with status filtering. Press `/` to search and Escape to clear.
- **Decisions:** required answers first, then optional preferences, plus blockers.
- **Activity:** up to 100 publication events, newest first. Changes use the OS clock.
- **Developer:** raw snapshot, schema/revision details, patch example, copyable commands.

Copying an example does not publish it. Change the example to match verified
facts before running it. Copyable commands use POSIX shell quoting; Git Bash or
WSL can run them on Windows. You can use the Python CLI directly in PowerShell
with PowerShell's normal argument quoting.

The Export menu downloads Markdown or JSON, or copies a short status update.
The JSON export is a state envelope, **not** a snapshot input: extract its
`snapshot` field if you want to publish it elsewhere. Exports can contain private
task details, local paths, and historical labels; inspect before sharing.

Theme/density choices are browser-local overrides. They do not modify the
agent's saved preferences. View, filter, pause, and scroll state use session
storage when available. Clipboard failures show selectable text. The page
defers refreshing while an input is focused or a dialog is open.

## Updating an older installation

For a Claude marketplace installation, update the plugin through Claude Code.
For a native installation, back up your installed `task-lantern` and
`dashboard-design` skill directories and optional dashboard-builder file, remove
those installed copies, then run the installer again. The installer intentionally
refuses to overwrite existing files; do not delete your backup until you have
checked any customizations. The source repository and `.dashboard/` task data
are separate and should be retained.

Existing version 1 state files work with the new renderer. The next publication
upgrades the envelope to version 2 and begins recording history. Older events
cannot be reconstructed and are never invented. Existing custom CSS may need
adjustments for the new workbench structure; rename `theme.css` to keep a backup
and run `render RUN_ID` to return to the built-in design.
