<p align="center">
  <img src="docs/assets/hero.png" alt="Task Lantern — Long tasks. Clear progress." width="100%">
</p>

<p align="center">
  <strong>A little light on your agent’s long-running work.</strong><br>
  Offline progress dashboards for Claude Code and Codex.
</p>

<p align="center">
  <a href="#quick-start">Quick start</a> ·
  <a href="#what-you-see">What you see</a> ·
  <a href="#make-it-yours">Make it yours</a> ·
  <a href="#how-it-works">How it works</a> ·
  <a href="CONTRIBUTING.md">Contribute</a>
</p>

---

You give your coding agent a big task. It gets to work. Twenty minutes later,
you want to know: **What’s done? What’s stuck? Does it need me?**

Task Lantern gives that work a small, readable home. A portable skill keeps the
facts current, an optional dashboard-builder agent handles presentation, and
one HTML file shows you where things stand.

**No server. No account. No runtime dependencies beyond Python.**
Your existing coding agent does the work; Task Lantern adds the view.

![A real Task Lantern dashboard showing a fictional search redesign with progress, questions, blockers, and deliverables](docs/assets/dashboard-dark.png)

*Actual generated dashboard. Demo project and deliverables are fictional.*

## What you see

| At a glance | What it tells you |
| --- | --- |
| **The plan** | Completed steps, active work, upcoming steps, and deliberately skipped work. |
| **Your input** | Questions waiting on you and the exact default for each optional choice. |
| **What’s stuck** | Blockers, why they matter, and what can continue. |
| **Ready to inspect** | Deliverables and their local paths or URLs, displayed as text. |

The page refreshes every **10 seconds** while work is active. It displays the
last real progress timestamp and calls out stale updates. Pause refresh whenever
you want. Completed and paused runs stop refreshing automatically.

## Quick start

You need **Python 3.10+**, a browser with JavaScript, and Claude Code or Codex.
Clone or download this repository, then run the commands below from its root.
The Python publisher uses only the standard library. Your agent's normal usage
costs still apply; a designer subagent is optional.

### Just show me the dashboard

Double-click [`examples/demo.html`](examples/demo.html) after downloading the
repository. GitHub's file viewer displays HTML source, so open your local copy.
To regenerate the demo with a fresh timestamp:

```sh
python3 scripts/demo.py
```

### Codex

Preview the installation, then apply it:

```sh
python3 scripts/install.py --host codex --scope user --with-agent
python3 scripts/install.py --host codex --scope user --with-agent --apply
```

This installs the two skills under `~/.agents/skills/` and the optional designer
under `~/.codex/agents/`. It never changes your global rules or permissions.
Start a new session if the skills or agent do not appear, then say:

```text
Use $task-lantern for this task. Have dashboard-builder customize the dashboard
in the background while you keep working.
```

For a project-only install, replace `--scope user` with
`--scope project --project /path/to/project`. Omit `--with-agent` for the simpler
single-agent workflow. Hosts without custom-agent support use the same skill
and renderer in the main session.

### Claude Code

Try the plugin without a permanent installation:

```sh
claude --plugin-dir /absolute/path/to/task-lantern
```

Then invoke:

```text
/task-lantern:task-lantern Track this task and use dashboard-builder in the background.
```

For a persistent plugin installation, run from the cloned repository root:

```sh
claude plugin marketplace add .
claude plugin install task-lantern@task-lantern-marketplace
```

Alternatively, install native skills and the agent without a marketplace:

```sh
python3 scripts/install.py --host claude --scope user --with-agent --apply
```

Native installation uses `/task-lantern`. Choose one installation method to
avoid duplicate skills. The Claude designer uses `model: opus`, `effort: medium`,
user memory, and the bundled dashboard-design skill. You can change the model
in its agent file to suit your budget. The main session keeps its own settings.

### Enable it for long tasks

For automatic selection on tasks with **more than five steps or an expected
duration over 30 minutes**, add the [optional rule](docs/long-task-rule.md) to
your project's `AGENTS.md` or `CLAUDE.md`.

This is an instruction-based trigger. It is not a hook or a background daemon.
Installing the package does not rewrite your instructions or guarantee selection
on every task; explicitly invoke it when you want a dashboard.

## Make it yours

On first use, the main agent asks about **dark or light**, **dense or airy**, and
**an accent color**. It can remember your answer for the project or, if you choose,
across projects. While you decide, it uses temporary dark/airy/lime defaults.

The designer chooses the panel order and composition for your task. A build can
lead with the plan; a stuck integration can lead with blockers; a review can
lead with deliverables. The renderer supplies a reliable base, and the designer
can customize its CSS without rewriting the publishing logic.

| Light | Mobile |
| --- | --- |
| ![Light theme dashboard](docs/assets/dashboard-light.png) | ![Mobile dashboard](docs/assets/dashboard-mobile.png) |

Project preferences take precedence over user preferences. Only confirmed style
choices belong in persistent memory. Task details stay in the run directory.
You can supply your own installed design skill, but none is required: a small
dashboard-design skill is included.

## How it works

![The main agent publishes facts while dashboard-builder designs the presentation, producing one offline HTML dashboard](docs/assets/workflow.svg)

1. **Start the work.** The main agent creates a run and publishes the real plan.
2. **Make it readable.** The optional designer customizes presentation in the
   background. The main agent keeps working.
3. **Keep it honest.** After each meaningful step, the main agent publishes a
   full snapshot. The publisher stamps it using the system clock.
4. **Stay in the loop.** Open the HTML file. Reply to questions in your agent
   chat; the page is a read-only view.
5. **Finish cleanly.** The final snapshot records the actual outcome and stops
   automatic refresh.

Think of the main agent as someone building a treehouse. The designer makes the
noticeboard. The noticeboard tells you which pieces are built, what tools are
missing, and what color the builder will choose if you don't pick one. It never
gives the builder permission to spend your money or knock down your house.

```text
your-project/
└── .dashboard/
    ├── preferences.json       # Optional project style
    └── <unique-run-id>/
        ├── state.json         # Authoritative facts, revision, timestamps
        ├── next.json          # Main agent's next snapshot
        ├── presentation.json  # Optional designer composition
        ├── theme.css          # Optional designer styling
        └── index.html         # Double-click this
```

Each run is separate. Revision checks reject stale writers, and file replacement
keeps readers from seeing partially written HTML. The main agent publishes;
the designer never edits the state. See the [protocol](skills/task-lantern/references/protocol.md)
for the schema, commands, and recovery behavior.

## Defaults are not approvals

An optional preference can have a reversible default: “Keep the current spacing.”
A required decision stays pending: “Keep the preview local until publication is
approved.” The agent continues independent work where possible.

The publisher rejects a required question marked `defaulted`, and refuses a
completed run that still has unfinished tasks, open blockers, or pending questions.
Those checks help catch mistakes; the main agent still owns the truth of what it
reports and whether an action is authorized.

## Privacy and practical limits

- The generated page makes **no network requests** and has no analytics, remote
  fonts, CDN dependencies, or server. It uses a restrictive content security policy.
- Task text is rendered as text, not executable HTML. Deliverable paths are
  shown without turning arbitrary input into clickable links.
- Add `.dashboard/` to your project's `.gitignore` if you want to keep task data
  out of Git. Task Lantern doesn't change your ignore rules automatically.
- Agent file boundaries are **instructions, not a filesystem sandbox**. The host's
  permissions remain the enforcement boundary. See [SECURITY.md](SECURITY.md).
- This is a snapshot publisher, not a process monitor. If the agent stops updating,
  the page shows stale progress; refreshing does not restart the agent.
- Background execution, model availability, and custom-agent discovery depend
  on your host/version. The main-agent workflow remains available.
- Python CLI and browser behavior are tested. Full autonomous Claude/Codex sessions
  are not covered by the automated suite, so treat this as an early `0.1.0` release.

## Develop and contribute

```sh
python3 -m unittest discover -s tests -v
python3 scripts/demo.py
python3 scripts/demo.py --theme light --output examples/demo-light.html
```

Optional real-browser checks and screenshots require Node 22+ and Chrome:

```sh
node tests/browser.mjs
```

Set `CHROME_PATH` if Chrome is not in its default macOS location or named
`google-chrome` on your PATH. No npm install is needed.

The suite covers state validation, required decisions, safe completion, stale
writes, lock contention, HTML escaping, style precedence, and install behavior.
GitHub Actions runs the Python tests on Linux, macOS, and Windows.

Read [CONTRIBUTING.md](CONTRIBUTING.md) for the small number of invariants that
keep this tool dependable, and [the release guide](docs/releasing.md) for publishing.

## License and credits

[MIT](LICENSE). Built around the idea that long agent tasks should be easy to
follow. Claude Code and Codex are products of their respective owners; this is
an independent project. The hero is AI-generated artwork; the dashboard images
are real browser captures. [Graphics provenance and prompt](docs/assets/README.md).
