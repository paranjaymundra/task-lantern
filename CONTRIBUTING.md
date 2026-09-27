# Contributing

Small, focused improvements are welcome. Open an issue describing the workflow
you want to improve, or send a pull request with the behavior change and evidence.

## Local checks

Python 3.10+ is enough for the core:

```sh
python3 -m unittest discover -s tests -v
python3 scripts/demo.py
python3 scripts/demo.py --theme light --output examples/demo-light.html
python3 scripts/demo.py --theme dark --output examples/demo-dark.html
```

For UI changes, open both demos, check a phone width and keyboard focus, and run
`node tests/browser.mjs` with Node 22+ and Chrome. It captures README screenshots, exports the SVG brand assets to PNG,
and verifies that a file opened directly from disk picks up changes on refresh.
Keep demo projects clearly labeled as fictional. Do not add credentials or
personal `.dashboard/` data to commits.

## Preserve these behaviors

- The main agent owns facts; the designer owns presentation.
- The page works as a single offline HTML file, without a local server.
- Required decisions cannot silently become defaults.
- Publishing cannot erase a newer revision or fabricate timestamps.
- No hidden installation, global rule edits, telemetry, or permission changes.
- A failing dashboard must not prevent unrelated work from continuing.

The Python publisher is shared by both hosts. Keep host-specific configuration
in `agents/` and `adapters/`. Update both plugin manifest versions together.
Prefer standard-library dependencies; explain the benefit before adding a new
runtime requirement.

## Trying the skills

Follow [Test it yourself](docs/testing.md) for copyable smoke-test commands and
a sample agent task. See [installation maintenance](docs/installation.md) when
testing changes against installed copies.

Use a disposable project and a realistic multi-step task. Check a first run with
no saved style, a second run with saved preferences, a blocker, an optional
question, a required decision, and a final state. Also try the main-agent-only
fallback. Record the host version and any deviations from the instructions.

Contributions are licensed under the repository's MIT license.

The browser suite now checks the Developer view, keyboard search, filters,
decision order, export downloads, clipboard fallback, safe external links,
UI persistence, file refresh, stale/terminal states, and the multi-run overview.
Source CSS and JavaScript are under the skill’s `assets/`; the renderer embeds
them in the standalone HTML. Never add network dependencies to generated pages.

## Repository map

- `skills/task-lantern/scripts/dashboard.py`: validation, revisions, publishing, and CLI.
- `skills/task-lantern/assets/`: the HTML, CSS, and JavaScript embedded in each run.
- `scripts/install.py`: preview, native installation, and read-only installation checks.
- `tests/`: standard-library Python tests and isolated Chrome interaction checks.
- `docs/assets/`: editable SVG artwork and actual product captures. Change vector
  sources first; `node tests/browser.mjs` regenerates their PNG exports.

New contributors can start with a reproducible host-integration report, a
platform-specific installation check, or a small accessibility improvement.
Keep proposed features tied to an actual long-task workflow. Do not add
fabricated activity or progress to make a dashboard look busy.
