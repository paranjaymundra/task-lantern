# Installation and maintenance

For most people, use the [global install in the README](../README.md#install-once-use-across-projects).
“Global” means available to your user across local projects, not to every user on
the machine or automatically on remote hosts. Install in the environment where
your agent runs, including a container or remote machine if applicable.

Task Lantern is installed into your agent. It does not add a `task-lantern`
terminal command or a system service. Python 3.10+ must be available to the agent.
The publisher needs no third-party Python packages.

## Native installation: either host

From your clone of this repository, preview before writing:

```sh
python3 scripts/install.py --host codex --scope user --with-agent
```

Add `--apply` to install. Replace `codex` with `claude` for native Claude skills.
Omit `--with-agent` if you only want the main-agent workflow. The installer copies
files, refuses to overwrite any existing target, and does not edit instructions,
permissions, Git ignore rules, or persistent style preferences.

| User install | Skills | Optional designer |
| --- | --- | --- |
| Codex | `~/.agents/skills/task-lantern/` and `~/.agents/skills/dashboard-design/` | `~/.codex/agents/dashboard-builder.toml` |
| Claude Code | `~/.claude/skills/task-lantern/` and `~/.claude/skills/dashboard-design/` | `~/.claude/agents/dashboard-builder.md` |

These are the installer's fixed default paths. If you use a custom host
configuration directory, preview the plan and place the files in the locations
that your host actually reads. Do not assume the installer follows `CODEX_HOME`
or other host directory overrides.

The copied files work independently of this clone. Keep the clone for updates,
demos, and contribution, or clone it again later when needed. Invocation names:

| Method | Invoke in the agent chat |
| --- | --- |
| Codex native skills | `$task-lantern` |
| Claude native skills | `/task-lantern` |
| Claude plugin | `/task-lantern:task-lantern` |

### Project-only installation

Use an absolute project path, especially if running the installer from its clone:

```sh
python3 scripts/install.py --host codex --scope project --project /absolute/path/to/your-project --with-agent --apply
```

Replace `codex` with `claude` as needed. Skills and agents go under that project's
`.agents/` + `.codex/` (Codex), or `.claude/` (Claude). Without `--scope`, the
installer defaults to **project**; without `--project`, it uses the current folder.
Avoid installing the same skill at both user and project scope unless intentional.

## Claude plugin options

The persistent user install is:

```sh
claude plugin marketplace add paranjaymundra/task-lantern
claude plugin install task-lantern@task-lantern-marketplace --scope user
```

For a shared project configuration, run the install command in that project with
`--scope project`. Claude manages plugin settings and caches; the native Python
installer does not manage these. Choose plugin **or** native installation for
Claude to avoid duplicate skills. Codex and Claude can each have their own install.

To try a clone without permanently installing the plugin:

```sh
claude --plugin-dir /absolute/path/to/task-lantern
```

The plugin command remains `/task-lantern:task-lantern`. The bundled Claude
agent uses Opus at medium effort with user memory. In a native installation,
edit the installed agent file to choose another supported model; preserve your
customizations when updating.

## Verify the installation

For native installs, compare installed files with your source checkout:

```sh
python3 scripts/install.py --host codex --scope user --with-agent --check
```

Use `--host claude` for native Claude skills, or your original project scope.
Exit code 0 means expected files match; 1 means missing or different files;
2 means an argument or filesystem error. Intentional customizations also count
as differences. This command never writes files, ignores extra installed files,
and cannot prove that the host loaded the skills. Plugin installations use
Claude's own plugin management instead.

Start a fresh host session in a disposable project. Invoke the appropriate
command above with this prompt:

```text
Create a Task Lantern dashboard for a small sample task. Use the main-agent
workflow for this check. Publish two planned steps and share the HTML path.
Do not change application files.
```

Open the returned `dashboard` path (normally `~/.local/share/task-lantern/index.html`).
You should see the thread summary and its entry in the right sidebar. Expand Plan
or Developer details without leaving the page. `.dashboard/index.html` is a
project-only workspace; `.dashboard/<run-id>/index.html` remains a portable thread. A missing designer does not prevent this check.
[Continue with the full manual test](testing.md).

## Update

### Claude plugin

```sh
claude plugin marketplace update task-lantern-marketplace
claude plugin update task-lantern@task-lantern-marketplace --scope user
```

Use the scope you originally installed into, then restart Claude Code.

### Native install

The installer deliberately has no overwrite or upgrade mode.

1. In your source clone, run `git pull --ff-only`. If you have local changes,
   resolve or preserve them before updating.
2. Move the two installed skill directories and optional designer file from the
   table above to a backup folder **outside the host's skill/agent directories**.
   Renaming them inside discovery directories can leave duplicate skills active.
   At project scope, use the corresponding project paths.
3. Run your original install command with `--apply`.
4. Start a new host session, verify the dashboard, and reapply any intentional
   customizations from the backup. Retain the backup until satisfied.

Updating the clone alone does not update installed native copies. Existing
`.dashboard/` runs and style preferences are separate; keep them.
See [state migration](developer-guide.md#updating-an-older-installation) for old runs.

## Uninstall

For the Claude plugin:

```sh
claude plugin uninstall task-lantern@task-lantern-marketplace --scope user
```

For native installation, move or remove only the two skill directories and the
optional designer file listed above, at the scope you installed. Do not remove
parent `.agents`, `.codex`, or `.claude` directories; they may contain other tools.
If you added the long-task rule, remove that paragraph from your instructions.
Restart the host afterward.

Uninstalling native files does not delete dashboards or style preferences.
The shared HTML and registry stay in `$XDG_DATA_HOME/task-lantern/` or
`~/.local/share/task-lantern/`; that directory contains private published task
data and can be kept for reinstalling. Project `.dashboard/` files are separate.
Project styles live in `.dashboard/preferences.json`; user styles live in
`$XDG_CONFIG_HOME/task-lantern/preferences.json` or
`~/.config/task-lantern/preferences.json`. Keep them for reinstalling, or remove
those specific files if you no longer want them. Claude-managed designer memory
is separate from these publisher preferences.

## Troubleshooting

| Symptom | What to check |
| --- | --- |
| `Already exists` during install | An installed target already occupies that path. Follow the backup/update procedure; the installer will not overwrite it. |
| Skill does not appear | Start a new host session; check the preview paths and invocation name. Remote hosts need their own install. |
| Duplicate skills | Check user/project scopes and native/plugin installs. Keep the one you intend to use. |
| No dashboard after installation | Invoke the skill on a task. Installation alone does not create runs. For automatic selection, add the [optional rule](long-task-rule.md). |
| Designer is unavailable | Omit background delegation and use the main-agent workflow. Check your host's custom-agent support separately. |
| HTML opens as source | Open the local downloaded file in a browser, not GitHub's source viewer or a text editor. |
| Progress is stale | Ask the main agent to publish its actual current state. Refresh does not inspect running work. |
| Refresh appears paused | Check the pause control, focused input, open dialog, or background tab. Portable complete/paused threads stop refreshing; shared workspaces keep checking. |
| Decision cannot be answered on the page | Answer in the host chat; the agent publishes the answer. The dashboard is read-only. |
| Command not found: `python3` | Install Python 3.10+ in the agent's environment; on Windows try `py -3`. |

Host behavior references: [Codex skill discovery](https://learn.chatgpt.com/docs/build-skills)
and [Claude plugin installation scopes](https://code.claude.com/docs/en/plugins-reference).
