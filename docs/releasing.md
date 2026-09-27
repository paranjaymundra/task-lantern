# Publishing Task Lantern

This directory is a standalone repository. It contains no dependency on the
project in which it was originally created.

1. Run the checks in CONTRIBUTING.md and inspect both demos.
2. Review staged files. Never include `.dashboard/`, user preferences, or secrets.
3. Create a GitHub repository named `task-lantern` and push this directory's Git
   history. A public repository is a deliberate publishing action.
4. Set the repository description to “Offline progress dashboards for long-running
   Claude Code and Codex tasks.” Suggested topics: `agent-skills`, `claude-code`,
   `codex`, `developer-tools`, `dashboard`.
5. Use `docs/assets/hero.png` for the README. GitHub social previews may crop it;
   the README banner is designed for a wide layout.
6. Enable private vulnerability reporting and review GitHub Actions results.
7. Keep `.claude-plugin/plugin.json` and `.codex-plugin/plugin.json` versions in
   sync, then create a `v0.1.0` tag/release when ready.

The Claude marketplace uses a relative source, so it works from a clone without
hard-coded account names. Once hosted, users can add `OWNER/task-lantern` with
`claude plugin marketplace add`, then install
`task-lantern@task-lantern-marketplace`.

The Codex compatibility manifest is included for plugin packaging. The README's
native skill installer is the tested local installation route. Submitting to a
host's public plugin directory is a separate process; the repo does not claim
to be listed or approved there.

Configuration references checked while preparing this release:

- [Claude subagents](https://code.claude.com/docs/en/sub-agents)
- [Claude plugin manifest](https://code.claude.com/docs/en/plugins-reference)
- [Codex skill discovery](https://learn.chatgpt.com/docs/build-skills)
- [Codex custom agents](https://learn.chatgpt.com/docs/agent-configuration/subagents)
- [OpenAI plugin packaging](https://developers.openai.com/plugins/build/plugins)
