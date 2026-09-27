<p align="center">
  <img src="docs/assets/hero.svg" alt="Task Lantern — Keep the work in view. Local progress dashboards for Claude Code and Codex." width="100%">
</p>

<p align="center">
  <a href="https://github.com/paranjaymundra/task-lantern/actions/workflows/ci.yml"><img src="https://github.com/paranjaymundra/task-lantern/actions/workflows/ci.yml/badge.svg" alt="Tests"></a>
  &nbsp; <a href="LICENSE">MIT license</a> &nbsp; · &nbsp; Python 3.10+ &nbsp; · &nbsp; No runtime packages
</p>

<p align="center">
  <a href="#install-once-use-across-projects">Install</a> ·
  <a href="#try-the-demo">Try the demo</a> ·
  <a href="#inside-the-workbench">Features</a> ·
  <a href="docs/installation.md">Setup help</a> ·
  <a href="CONTRIBUTING.md">Contribute</a>
</p>

**Know what your coding agent finished, what’s stuck, and what needs you.** Task Lantern turns agent-published updates into a local HTML dashboard you can keep beside your editor. Open the file, scan the plan, and get back to work.

Useful for a refactor spanning several modules, a migration with blocked steps, or a debugging session you need to hand off. Your agent publishes the facts; the page keeps them readable. No server, extra account, or telemetry.

![Task Lantern's actual workbench: plan progress on the left, decisions and blockers on the right](docs/assets/dashboard-overview.png)

*Real browser capture. The demo task and deliverables are fictional.*

## Install once, use across projects

You need **Python 3.10+**, a browser with JavaScript, and **Codex or Claude Code**. Global means your user on this machine; each project keeps its own `.dashboard/`. Your coding agent’s normal usage costs apply. No `sudo` or `pip install` needed.

### Codex

```sh
git clone https://github.com/paranjaymundra/task-lantern.git
cd task-lantern
python3 scripts/install.py --host codex --scope user --with-agent --apply
```

Start a new Codex session **in your own project**, then prompt:

```text
Use $task-lantern to track this task: [describe your task].
Use dashboard-builder in the background if available. Share the dashboard path.
```

Skills go in `~/.agents/skills/`; the optional designer goes in `~/.codex/agents/`. Omit `--apply` to preview paths, or replace it with `--check` to compare installed files with this checkout. The installer never overwrites existing files.

### Claude Code

```sh
claude plugin marketplace add paranjaymundra/task-lantern
claude plugin install task-lantern@task-lantern-marketplace --scope user
```

Start a new Claude Code session in your project, then prompt:

```text
/task-lantern:task-lantern Track this task: [describe your task].
Use dashboard-builder in the background if available. Share the dashboard path.
```

The plugin includes the skills and designer. The Claude designer uses Opus at medium effort; the main session keeps its own model settings. See [installation options](docs/installation.md) for native Claude skills, project-only installs, or the simpler main-agent workflow.

**Next:** open the `.dashboard/<run-id>/index.html` path the agent shares. Answer questions in your agent chat. For automatic selection on tasks with more than five steps or an expected duration over 30 minutes, add the [optional long-task rule](docs/long-task-rule.md). Installing globally does not add that rule automatically.

## Try the demo

From a clone, generate and open it with one command:

```sh
python3 scripts/demo.py --open
```

Or double-click [`examples/demo.html`](examples/demo.html) after downloading the repository. GitHub's source viewer will not run the HTML. The demo requires no agent session or installation; it is clearly labeled sample data.

Try **Plan → search and filter**, **Decisions → required vs. optional**, and **Developer → inspect the JSON**. Switch themes or export a Markdown handoff. Follow [Test it yourself](docs/testing.md) to publish a real local update and watch the page refresh.

## Inside the workbench

| View | What it helps you do |
| --- | --- |
| **Overview** | See completed work, active steps, blockers, and deliverables together. |
| **Plan** | Search tasks, filter statuses, and find unfinished work. Press `/` to search. |
| **Decisions** | See required answers first and the default for each optional preference. |
| **Activity** | Follow the last 100 publication events with real timestamps. |
| **Developer** | Inspect raw state and revision; copy CLI commands and patch examples. |

Active runs refresh every **10 seconds** and flag stale publications. Refresh waits while you type or use a dialog, and stops for completed or paused runs. Theme, density, view, and filters stay within reach without leaving the page.

Export Markdown or JSON for a handoff. Copy artifact paths, open validated HTTP(S) links, or browse all runs in `.dashboard/index.html`. Partial updates preserve omitted rows, and revision checks reject stale writers.

<details>
<summary><strong>See the Developer view, dark theme, and mobile layout</strong></summary>

![Developer view: current state, CLI commands, and a patch example](docs/assets/dashboard-developer.png)

![Dark theme](docs/assets/dashboard-dark.png)

<img src="docs/assets/dashboard-mobile.png" alt="Responsive mobile dashboard" width="320">

</details>

On first use, the agent asks for your theme, density, and accent color. Save confirmed choices for one project or across projects. The optional designer adjusts panel order and CSS to the task; the built-in view works without it.

## How it works

![The main agent publishes facts; the optional designer supplies presentation; a local publisher generates one offline HTML file](docs/assets/workflow.svg)

Task Lantern bundles **two skills**, an **optional designer subagent**, and a **Python publisher**. The main agent creates a plan, publishes after meaningful steps, and records the actual outcome when finished. The designer handles presentation in the background where supported. Task state stays in the project:

```text
.dashboard/
├── index.html             # Browse this project's runs
├── preferences.json       # Optional project style
└── <run-id>/
    ├── state.json         # Facts, revision, timestamps, history
    ├── presentation.json  # Optional composition
    ├── theme.css          # Optional styling
    └── index.html         # Your standalone dashboard
```

The browser is read-only. Optional choices can have reversible defaults; required decisions remain pending until answered. The agent can continue independent work while it waits. Silence does not authorize an action.

## Before you rely on it

- **Updates come from the agent.** This is a snapshot publisher. It does not
  monitor processes, infer test results, restart agents, or estimate completion
  time. A stale indicator means no recent publication.
- **Local HTML, normal host rules.** The generated page makes no network
  requests. Your agent host’s normal model usage, permissions, and data handling
  still apply. Designer file boundaries are instructions, not an OS sandbox.
- **Keep private work private.** Add `.dashboard/` to your project's `.gitignore`
  when appropriate. Review exports and screenshots before sharing. Installation
  does not change your Git rules or host permissions.
- **Early software, explicit coverage.** Python behavior is tested on Linux,
  macOS, and Windows; Chrome checks exercise the UI. Full autonomous host
  sessions remain a manual check. Background delegation depends on your host.

## Guides and contributing

| I want to… | Start here |
| --- | --- |
| Install, verify, update, or remove it | [Installation guide](docs/installation.md) |
| Test it myself | [Demo, publisher, and agent-session checks](docs/testing.md) |
| Use patches, exports, or existing run data | [Developer guide](docs/developer-guide.md) |
| Integrate the publisher with another workflow | [Snapshot protocol](skills/task-lantern/references/protocol.md) |
| Report a problem or suggest an improvement | [Issues](https://github.com/paranjaymundra/task-lantern/issues) |
| Work on the code | [Contributing](CONTRIBUTING.md) · [Changelog](CHANGELOG.md) |

Feedback from real tasks is especially useful: include your host/version, the expected behavior, and a minimal redacted example. See [Security](SECURITY.md) for sensitive reports.

[MIT](LICENSE). An independent project for Claude Code and Codex. [Editable brand assets and screenshot provenance](docs/assets/README.md).