# Test it yourself

Use three checks: explore the UI, exercise the publisher, and try your coding
agent. The first two do not make model calls.

## 1. Explore the demo

From a local clone, generate and open a demo:

```sh
python3 scripts/demo.py --open
```

On other systems, use your file manager's “Open with” browser action.

- In **Plan**, search for a task and filter by status. Try `/` to focus search.
- In **Decisions**, check that required answers appear before optional choices.
- Switch to dark mode and try a narrow browser window.
- In **Developer**, inspect the JSON and revision, then copy a command.
- Export Markdown and JSON. These are local downloads with fictional demo data.

Demo commands contain example paths. Do not run them unchanged.
To generate a fresh demo without editing tracked examples:

```sh
python3 scripts/demo.py --output /absolute/path/to/scratch/demo.html
```

## 2. Verify real local publishing

Run these from the Task Lantern repository. They create an isolated project in
`.dashboard/smoke-project`, which this repository already ignores:

```sh
python3 -c "from pathlib import Path; Path('.dashboard/smoke-project').mkdir(parents=True, exist_ok=True)"
python3 skills/task-lantern/scripts/dashboard.py --project .dashboard/smoke-project init --title "My first dashboard"
```

Copy the returned run ID in place of `RUN_ID`:

```sh
python3 skills/task-lantern/scripts/dashboard.py --project .dashboard/smoke-project publish RUN_ID --input examples/snapshot.json --expected-revision 0
python3 skills/task-lantern/scripts/dashboard.py --project .dashboard/smoke-project status RUN_ID
```

Expected: revision **1**, the fictional search-redesign snapshot, and a real
publication timestamp. Open the HTML path returned by `init` or `publish`.
This uses sample data; it does not perform the search redesign.

Save the following as `.dashboard/smoke-patch.json`:

```json
{"summary": "Manual smoke test: this update came from my terminal."}
```

Publish the change:

```sh
python3 skills/task-lantern/scripts/dashboard.py --project .dashboard/smoke-project patch RUN_ID --input .dashboard/smoke-patch.json --expected-revision 1
```

Expected: revision **2**, the new summary, and a new activity event. The open
page should pick up the change within 10 seconds while refresh is active and
no input/dialog has focus. Repeating that same revision-1 command should fail
with a revision conflict and preserve revision 2.

Remove only `.dashboard/smoke-project` and `.dashboard/smoke-patch.json` when done.

## 3. Try an agent session

[Install Task Lantern](installation.md), start a new host session in a disposable
project, and use its invocation name with this prompt:

```text
Use Task Lantern for this test. Build a small Python CLI that counts lines in
text files, with tests and a short README. Plan the work in the dashboard first,
then publish progress after meaningful steps. Use light mode, dense layout,
and terracotta for this project only. Ask one optional naming preference with
a reversible default. Before any GitHub publication, ask for my approval and
keep that required decision pending; continue local work. Share the HTML path.
```

For Codex, prefix the prompt with `$task-lantern`; for Claude's plugin, use
`/task-lantern:task-lantern`; native Claude uses `/task-lantern`.

Check that the dashboard reflects actual work, the optional question has a
specific default, the publication decision stays pending, and no publishing
happens without your approval. Answer in the chat. To finish without publishing,
say “Keep this local; skip GitHub publication and finish the run.” The final
page should match that outcome and stop refreshing.

For the optional designer, repeat with “Have dashboard-builder customize the
presentation in the background while you continue.” If the host cannot delegate,
the main agent should continue with the built-in dashboard. To test remembered
style, begin another run in the same project.

This is a manual host integration check. Record your host/version and any
unexpected behavior when [reporting an issue](https://github.com/paranjaymundra/task-lantern/issues).

## Automated checks

From the source clone:

```sh
python3 -m unittest discover -s tests -v
```

For browser interactions, use Node 22+ and Chrome:

```sh
node tests/browser.mjs
```

The browser suite launches an isolated Chrome profile and regenerates screenshots
and PNG exports of the editable SVG brand assets. Set `CHROME_PATH` when Chrome isn't at its default macOS path or available
as `google-chrome`. No npm install is needed. See [Contributing](../CONTRIBUTING.md).
