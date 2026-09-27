# Publisher protocol

The main session is the only publisher. Run the script using its absolute path:

```sh
python3 /path/to/task-lantern/skills/task-lantern/scripts/dashboard.py --project /path/to/project init --title 'Ship the search redesign'
```

The JSON result contains `run`, `revision`, and `dashboard`. Open `dashboard` in
a browser or double-click it. No web server, fetch requests, or external assets
are needed. The browser reloads the whole HTML every 10 seconds while active.

Write a **complete snapshot** to `.dashboard/<run>/next.json`, read `state.json`
for its revision, and publish. Use structured file tools or quoted heredocs;
never interpolate task text into a shell command.

```sh
python3 /path/to/task-lantern/skills/task-lantern/scripts/dashboard.py --project /path/to/project publish RUN_ID --input /path/to/project/.dashboard/RUN_ID/next.json --expected-revision 0
```

Snapshot fields (all required; no additional keys):

```json
{
  "title": "Ship the search redesign",
  "summary": "Search works locally. Keyboard checks are next.",
  "phase": "active",
  "tasks": [
    {"id": "search", "title": "Implement search", "status": "done", "detail": "Local implementation ready."},
    {"id": "keyboard", "title": "Check keyboard navigation", "status": "doing", "detail": "Testing focus order."}
  ],
  "questions": [
    {"id": "density", "question": "Use compact result rows?", "status": "pending", "default": "Keep the current roomy spacing.", "requires_answer": false, "answer": ""}
  ],
  "blockers": [],
  "deliverables": [
    {"id": "preview", "title": "Search preview", "path": "preview/search.html", "detail": "Local preview; not deployed."}
  ]
}
```

| Field | Allowed values / shape |
| --- | --- |
| `phase` | `active`, `blocked`, `paused`, `complete` |
| Task status | `todo`, `doing`, `done`, `blocked`, `skipped` |
| Question status | `pending`, `answered`, `defaulted` |
| Blocker | `id`, `title`, `detail`, `status` (`open` or `resolved`) |
| Deliverable | `id`, `title`, `path`, `detail`; paths are displayed as text |

All row fields are strings except the boolean `requires_answer`. IDs must be
unique within a panel. `detail` and `answer` may be empty. An answered question
needs an answer; all other question statuses require an empty answer. Required
questions cannot be defaulted. Complete runs cannot contain unfinished tasks,
open blockers, or pending questions. The publisher enforces these structural
checks; the agent remains responsible for factual correctness and authorization.

The output envelope in `state.json` adds version, run, revision, UTC timestamps,
and style. Do not publish this envelope as a snapshot; use its `snapshot` field.
Publishing replaces state and HTML atomically **per file**, under a run lock.
It does not provide a transaction across the two files. After interruption,
`render RUN_ID` regenerates HTML from the authoritative state. A stale revision
fails without writing. Never run two publishers for the same run intentionally.

## Preferences

```sh
python3 /path/to/dashboard.py --project /path/to/project style --theme dark --density airy --accent '#c7ed84'
```

Default scope saves to `.dashboard/preferences.json`. Add `--scope user` only
when the user wants cross-project memory. That writes
`${XDG_CONFIG_HOME:-~/.config}/task-lantern/preferences.json` (when XDG_CONFIG_HOME
is unset, use `~/.config`). Project preferences take precedence. Stored preferences
affect the next init/publish/render; use `render RUN_ID` to apply them immediately.

## Designer handoff

Give the designer the exact run directory, the brief, style choices, and this
contract. It can read the run's state and its own style memory. It may write:

```json
{
  "eyebrow": "SEARCH REDESIGN / BUILD JOURNAL",
  "order": ["tasks", "questions", "blockers", "deliverables"],
  "layout": "board"
}
```

Save as `presentation.json`. Include each panel once. Layout is `board` (two
columns, responsive) or `brief` (one column). Without this file, open blockers
and pending questions automatically move to the front. A custom order persists
until the designer changes it; recheck its usefulness as the task evolves.

Optional `theme.css` is inlined. Use it for typography, spacing, borders, and
composition; no angle brackets, external resources, or hidden status panels.
CSS is trusted local customization, not untrusted input. All dashboard data is
rendered as text and the page's CSP denies network requests. The script refuses
symlinked run roots and managed files; it is not an OS security boundary.

After the designer returns, the main agent runs:

```sh
python3 /path/to/dashboard.py --project /path/to/project render RUN_ID
```

Do not edit the generated `index.html`; the next publication replaces it.
