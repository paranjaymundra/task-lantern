# Publisher protocol

The main session is the only publisher. Run the script using its absolute path:

```sh
python3 /path/to/task-lantern/skills/task-lantern/scripts/dashboard.py --project /path/to/project init --title 'Ship the search redesign'
```

The JSON result contains `run`, `revision`, `dashboard`, `thread_dashboard`, and
`project_dashboard`. Open `dashboard`: this is the shared cross-project workspace,
`${XDG_DATA_HOME:-~/.local/share}/task-lantern/index.html`. The registry next to it
stores only opted-in project/run references; embedded snapshots are regenerated
from their authoritative state files. No host chat directories are scanned.
No web server, fetch requests, or external assets are needed.

Pass `--host codex` or `--host claude` at init. When the real host thread ID is
available, also pass `--thread-id ID`; repeated init in the same host/project
resumes its existing run without replacing its facts. Without it, retain and
reuse the returned run ID in the session. Identical titles do not merge threads.

The right sidebar selects a tracked thread without navigating away. The summary
stays concise; Plan, Decisions & blockers, Files & links, Activity, and Developer
details expand in place. All start closed. The shared workspace reloads every
10 seconds even when the selected thread is complete, so other threads can
update or appear. A portable single-thread file stops automatic reloads when
its phase is complete or paused.

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
| Deliverable | `id`, `title`, `path`, `detail`; local paths are copyable; safe HTTP(S) URLs can be opened |

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
summary columns) or `brief` (stacked). `order` orders expandable sections;
questions and blockers share one section. `eyebrow` supplies the title tooltip.
Current work and urgent decisions stay in the summary regardless of detail order.
Scope custom CSS to `.page`; preserve the right thread sidebar and progressive
disclosure. The publisher rebuilds the shared workspace after rendering.

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


## Partial updates and inspection (v0.2)

`patch RUN_ID --input patch.json --expected-revision N` accepts any subset of
snapshot fields. Scalar fields replace their prior value. Panel arrays upsert
**complete rows** by stable ID and preserve omitted rows; an empty array does
not clear a panel. Duplicate IDs are rejected. To remove rows, publish a full
snapshot with the desired rows. Required decisions and completion checks run on
the merged result. Read and merge after a revision conflict.

`status RUN_ID` prints the full envelope as JSON. `list` prints the project run
inventory plus unreadable run IDs. `index` regenerates `.dashboard/index.html`.
The project workspace and shared workspace refresh after init/publish/patch/render.
`workspace` rebuilds the global HTML from its registered threads. If a derived
workspace cannot refresh, the run publication remains valid and a warning explains
recovery. Registry updates are serialized; each thread retains its own revision
lock. Unreadable or moved threads are reported instead of silently forgotten.

Envelope version 2 includes `history`: the latest 100 derived change events.
Each event has revision, at (UTC), panel, label, before, after, and kind. Kinds are
added, removed, status, updated, or confirmed. This is a change journal, not full
historical snapshots. Version 1 runs are readable and gain history on their next
publication; earlier events are not invented.

The expandable Developer details provide read-only inspection. The page has search, status filters,
Markdown/JSON exports, and local appearance controls. It never writes state or
applies an answer. Copyable commands are POSIX shell commands. The page suspends
refresh while an input has focus, a dialog is open, or the page is backgrounded.
It restores the selected thread, each thread’s expanded sections, filters and
scroll position across reloads when browser storage is available. JSON and
Markdown export only the selected thread, never the entire shared workspace.
