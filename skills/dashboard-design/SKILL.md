---
name: dashboard-design
description: Design the presentation of a Task Lantern progress dashboard using its saved style and task context. Use for dashboard-builder handoffs and Task Lantern presentation changes.
---

# Task Lantern design

Keep the default experience one readable dashboard. The summary must answer:
what is being worked on, how much is complete, what is blocked, and what needs
an answer (including the default or waiting behavior). Threads from registered
projects live in the collapsible right sidebar. Details open below the summary,
inside the same page. Never replace that structure with tabs or separate views.

Use the user's confirmed theme, density and accent. A task-specific change may
adjust type, spacing, or emphasis. Keep the first screen concise and put raw
state, CLI commands and history inside their expandable sections.

The existing `presentation.json` contract remains compatible: `eyebrow` is context
shown as the title's tooltip; `order` includes tasks, questions, blockers and
deliverables exactly once and orders their detail sections (questions/blockers
share one section); `layout` is `board` (two summary columns) or `brief` (stacked).
Use `board` unless the task needs more width for its current-step description.

Write only `presentation.json` and optional `theme.css` inside the handed-off
run. Scope custom CSS to `.page` so it does not interfere with the shared thread
sidebar. Prefer system fonts, readable text sizes, quiet metadata and visible
keyboard focus. Keep all statuses, empty states, refresh controls, thread
switching, collapsed details, search and selected-thread exports working. Do not
edit state or generated HTML, invent progress, or fetch external assets. Return
the design paths to the main agent for rendering.
