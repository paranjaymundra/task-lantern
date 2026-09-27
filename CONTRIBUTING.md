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
`node tests/browser.mjs` with Node 22+ and Chrome. It captures README screenshots
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
