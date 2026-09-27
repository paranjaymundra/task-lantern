# Optional long-task rule

Choose where the rule should apply, then add the paragraph below to that file:

| Scope | Codex | Claude Code |
| --- | --- | --- |
| Every project for your user | `~/.codex/AGENTS.md` | `~/.claude/CLAUDE.md` |
| One project | `AGENTS.md` in that project | `CLAUDE.md` in that project |

Append to existing instructions; preserve their other content. Installation
never edits these files automatically. Install the skills at user scope before
adding a user-wide rule so they are available in each project.

Codex's global path follows `CODEX_HOME` when configured; `AGENTS.override.md`
takes precedence over `AGENTS.md`. Use the instruction file your host loads,
and start a new session after editing it.

> For tasks with more than five meaningful steps or an expected duration over
> 30 minutes, use the task-lantern skill to create a local progress dashboard
> before substantial work starts. Publish progress after each meaningful step.
> When background delegation is available, have dashboard-builder customize its
> presentation while the main session keeps working. Ask style preferences once
> and remember confirmed choices. Record pending questions in both chat and the
> dashboard, with a specific reversible default for optional choices. Required
> decisions remain pending until answered; continue independent work. Share the
> HTML path, and finish by publishing the true final state.

In Claude plugin mode, the fully qualified names are
`task-lantern:task-lantern` and `task-lantern:dashboard-builder`.
In native skill/agent installations, they are `task-lantern` and
`dashboard-builder`.

This is an instruction-based trigger, not a deterministic hook. The agent
estimates task size. Explicitly request the skill when you want to be certain
it is selected. No hook reads your prompts or starts model calls behind your back.

Host references: [Codex global instructions](https://learn.chatgpt.com/docs/agent-configuration/agents-md)
and [Claude instruction scopes](https://code.claude.com/docs/en/memory).
