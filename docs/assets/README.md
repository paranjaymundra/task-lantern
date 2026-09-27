# Brand assets and screenshots

The visual system matches the dashboard: warm paper (`#f7f6f2`), charcoal
(`#282b26`), and terracotta (`#ae5630`). SVG files are editable source artwork,
with no external fonts or images. Prefer SVG in documentation and PNG where
an upload form requires it.

| Asset | Use |
| --- | --- |
| [task-lantern-demo.mp4](task-lantern-demo.mp4) | Final narrated launch video, 1920 × 1080, 35.6 seconds, approximately 3 MB. |
| [task-lantern-demo.jpg](task-lantern-demo.jpg) | Poster for the launch video. |
| [hero.svg](hero.svg) / [hero.png](hero.png) | README banner, 1600 × 560. |
| [logo.svg](logo.svg) | Standalone lantern mark, 128 × 128. |
| [social-preview.svg](social-preview.svg) / [social-preview.png](social-preview.png) | Repository social preview or announcement, 1280 × 640. |
| [workflow.svg](workflow.svg) | Explains agent facts → publisher → local HTML. |
| [dashboard-overview.png](dashboard-overview.png) | Compact viewport capture for the README. |
| `dashboard-decisions.png`, `dashboard-focus.png`, `dashboard-mobile-threads.png` | Inline decisions, focused workspace, and mobile thread drawer. |
| `dashboard-light.png`, `dashboard-dark.png`, `dashboard-mobile.png`, `dashboard-developer.png`, `dashboard-workspace.png` | Full product reference captures. |

The brand artwork is original, code-authored vector work created for this
repository. PNG brand images are browser renderings of the SVG sources. Product
images are real Chrome screenshots of the generated fictional demo, not mockups.
The demo's timestamps come from the system clock at generation time.

## Launch video

The final video uses the actual dashboard with fictional tasks, scripted interactions,
locally synthesized Kokoro narration, and an original instrumental. The approved
render and poster are the only video production artifacts kept in the current tree.
Editable production source and rebuild instructions remain available in
[commit 25ba79d](https://github.com/paranjaymundra/task-lantern/tree/25ba79d9d63eeac4a22b64967c0b54ed13304513/brag-output-2026-09-27-141031).
Keep temporary renders, recordings, and audio outside the repository.

## Regenerate

From the repository root, with Python 3.10+, Node 22+, and Chrome:

```sh
python3 scripts/demo.py
python3 scripts/demo.py --theme light --output examples/demo-light.html
python3 scripts/demo.py --theme dark --output examples/demo-dark.html
node tests/browser.mjs
```

Set `CHROME_PATH` when needed. Inspect the results before committing; browser
font rendering can differ by platform. Keep screenshots labeled as fictional
sample work and never replace them with captures of private task data.

All assets are distributed under the repository's MIT license to the extent
rights can be granted. No stock art or third-party product logos are included.
The earlier green lantern banner in Git history was AI-generated; the current
banner, logo, workflow, and social preview are editable vector graphics.
