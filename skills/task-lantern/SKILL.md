---
name: task-lantern
description: Keep an offline HTML progress dashboard for a long agent task, showing tasks, blockers, deliverables, and unanswered decisions with explicit defaults. Use when the user requests Task Lantern or a progress dashboard, or a project rule enables dashboards for long tasks.
---

# Task Lantern

Make the ongoing work inspectable without delaying it. The main agent owns facts;
dashboard-builder owns presentation. Read [the protocol](references/protocol.md)
for the snapshot schema and exact commands. Resolve scripts relative to this
SKILL.md, not the user's working directory. Python 3.10+ is required.

## Start

1. Use an explicitly requested dashboard, or the user's enabled long-task rule
   (default threshold: more than five steps OR expected duration over 30 minutes).
   Installing the skill alone does not impose that rule on unrelated work.
2. Read `.dashboard/preferences.json`, then the user preference file described in
   the protocol. If neither exists, ask once: “Dark or light, dense or airy, and
   which accent color? Remember this across projects?” Ask in the main chat;
   background agents must not wait for a user answer. Continue with temporary
   light/dense/terracotta defaults. Do not save temporary choices as a user's preference.
   Save an actual answer locally, or at user scope if they chose to remember it.
3. Run `init --title ...`, retain the returned run ID, then publish the real plan.
   Each separate task/session gets its own run. Share the resulting HTML path.
   `.dashboard/index.html` is the automatically generated overview of project runs.
4. If the host allows background delegation, launch dashboard-builder with the
   run directory, current task brief, and confirmed style. The main session
   continues immediately. Use medium effort where supported; leave the main
   session's model and effort unchanged. If delegation is unavailable or denied,
   keep the working default dashboard and proceed in the main session.

## Maintain

- Publish after each meaningful step, new blocker, question, deliverable, or
  change of plan. Read the latest state revision first. For a small change, use
  `patch` with complete rows by ID; omitted rows are preserved. Use `status` and
  `list` for machine-readable inspection. Full `publish` replaces the snapshot. Preserve historical rows
  and stable IDs within a run; mark blockers resolved and questions answered.
- Only the main agent publishes state and HTML. The designer writes only
  `presentation.json` and optional `theme.css` inside this run. After it finishes,
  run `render`; rendering does not advance the progress timestamp. Every publication records
  derived changes in a bounded 100-event history; do not fabricate past events.
- Record facts from the session. Do not infer completion from elapsed time,
  invent tests or links, or make up event timestamps. The publisher uses the OS
  clock. Step counts are not estimates of remaining time.
- Questions belong both in chat and the dashboard. An optional question needs a
  specific reversible default and a reasonable opportunity to answer before the
  default is used. A required decision has `requires_answer: true`; its default
  describes waiting or independent work. Never equate silence with approval for
  deployment, publishing, deleting data, spending money, sending messages, or
  other actions that still need authorization. Continue independent work.
- Questions are read-only on the page. Answers arrive through the agent chat,
  then the main agent updates the snapshot. Do not imply a reply button exists.
- If publishing fails, keep the last valid page, report the dashboard failure
  briefly, and continue the actual task where possible. For a revision conflict,
  reread and merge; do not force-overwrite a newer snapshot.
- Mark the phase complete only when the actual work is complete and all pending
  questions/blockers are resolved. Record deliberately skipped steps honestly.
  Use paused when the user pauses. A terminal page stops auto-refreshing.

## Design and boundaries

Use the bundled dashboard-design skill when available; otherwise read
[design guidance](references/design.md). Prefer the user's chosen installed
design skill if they specify one; do not install dependencies on their behalf.
Choose information order and CSS to suit the work while keeping all four panels.
Preserve readable contrast, mobile layouts, text status labels, refresh controls, navigation, search, exports, the Developer view,
and the truthful timestamps and counts.

Keep task data under `.dashboard/<run>/`. Save only style choices in persistent
memory; never store task text or secrets there. Do not modify application files,
global instructions, host permissions, or Git ignore rules merely to enable a
dashboard. Offer the optional rule snippet when requested. File-scope instructions
are behavioral limits, not a security sandbox; respect the host's real controls.
