---
name: dashboard-design
description: Design the presentation of a Task Lantern progress dashboard using its saved style and task context. Use for dashboard-builder handoffs and Task Lantern presentation changes.
---

# Task Lantern design

Pick a useful visual hierarchy for the current work: plan first for a build,
blockers first for a stuck integration, decisions first when input matters,
deliverables first for review. Keep all four panels visible with clear empty
states. Use the user's light/dark, density, and accent preferences.

Write the handed-off run's `presentation.json`: `eyebrow` (short contextual text),
`order` (tasks, questions, blockers, deliverables, each exactly once), and `layout`
(`board` or `brief`). Add `theme.css` only if task-specific composition benefits
from it. Prefer system fonts, readable contrast, generous title hierarchy,
quiet metadata, visible keyboard focus, and phone-width stacking.

Preserve navigation, search, exports, Developer view, status labels, facts, timestamps, refresh controls, and stale-update
notices. Don't hide problems, fabricate progress, fetch external assets, or edit
state.json/index.html. Return the design paths to the main agent for rendering.
