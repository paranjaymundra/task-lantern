# Optional long-task rule

Add the following paragraph to the relevant project's `AGENTS.md` (Codex) or
`CLAUDE.md` (Claude Code). Use your user-level instruction file only if you want
this across projects. Installation never edits these files automatically.

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
