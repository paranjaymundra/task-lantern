# Releasing Task Lantern

The public repository is [paranjaymundra/task-lantern](https://github.com/paranjaymundra/task-lantern).
Work from this standalone repository; it has no dependency on another project.

## Prepare a release

1. Run the checks in [Contributing](../CONTRIBUTING.md), inspect both themes,
   and run the [manual host checks](testing.md#3-try-an-agent-session). Record
   host versions and any known limitations.
2. Update `.claude-plugin/plugin.json` and `.codex-plugin/plugin.json` to the same
   version. Move the relevant Unreleased changelog entries into a versioned section.
   Update version-specific README claims when needed.
3. Check fresh installs and updates through the documented routes. Claude plugins
   need a version bump for changed release contents; keep docs-only edits distinct
   from claims of a new runtime release.
4. Review the diff and screenshots. Never include private `.dashboard/` runs,
   personal preferences, credentials, or real private task data.
5. Commit and push the release changes. Confirm all GitHub Actions jobs pass.
6. Create a tag matching the manifest version, such as `v0.2.2`, and publish a
   GitHub release describing behavior changes, migration notes, validation, and
   limits. Do not tag a version that already exists.

The README uses `docs/assets/hero.svg`; `hero.png` is its portable raster export.
Use `docs/assets/social-preview.png` (1280 × 640) for GitHub social sharing.
Keep screenshot assets current when UI changes, and retain their provenance
in [the asset notes](assets/README.md). Review repository security settings and
enable private vulnerability reporting when available.

## Distribution

Claude users add `paranjaymundra/task-lantern` as a marketplace, then install
`task-lantern@task-lantern-marketplace`. Its relative plugin source also works
from a clone. Codex's documented installation path uses the native skill
installer. The Codex manifest is included for plugin packaging; this repository
does not claim listing or approval in a host's public plugin directory.

Configuration references:

- [Claude subagents](https://code.claude.com/docs/en/sub-agents)
- [Claude plugin manifest](https://code.claude.com/docs/en/plugins-reference)
- [Codex skill discovery](https://learn.chatgpt.com/docs/build-skills)
- [Codex custom agents](https://learn.chatgpt.com/docs/agent-configuration/subagents)
- [OpenAI plugin packaging](https://developers.openai.com/plugins/build/plugins)
