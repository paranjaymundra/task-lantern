# Dashboard design

Make the summary readable at a glance: current step, completed/total steps,
next step, urgent decision with waiting/default behavior, blockers, and recent
files. Threads stay in the collapsible left sidebar. Deeper plan, decisions,
files, activity and developer information opens in place below the summary.
Keep details closed by default. Preserve separate per-thread state.

Use confirmed light/dark, density and accent preferences. Prefer system fonts,
clear headings, quiet metadata, visible focus outlines, and words alongside
status colors. Do not hide blockers to make the page look cleaner. Keep the
summary useful at laptop widths and stack it naturally on phones. The mobile
thread drawer must be closable with both its button and Escape.

The compatible presentation contract has `order`, `eyebrow` and `layout`.
Order controls detail sections; questions/blockers share one. Eyebrow provides
title context via its tooltip. Board gives two summary columns; brief stacks
them. Scope optional theme CSS to `.page`, leaving workspace controls intact.
Preserve search, selected-thread exports, real publication times and stale
notices. The default uses warm paper, clear sans-serif content, a serif brand,
restrained terracotta and compact rows. Avoid oversized metric tiles.
