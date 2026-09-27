# Brand assets and screenshots

The visual system matches the dashboard: warm paper (`#f6f5f1`), charcoal
(`#272923`), and terracotta (`#ae5630`). SVG files are editable source artwork,
with no external fonts or images. Prefer SVG in documentation and PNG where
an upload form requires it.

| Asset | Use |
| --- | --- |
| [hero.svg](hero.svg) / [hero.png](hero.png) | README banner, 1600 × 560. |
| [logo.svg](logo.svg) | Standalone lantern mark, 128 × 128. |
| [social-preview.svg](social-preview.svg) / [social-preview.png](social-preview.png) | Repository social preview or announcement, 1280 × 640. |
| [workflow.svg](workflow.svg) | Explains agent facts → publisher → local HTML. |
| [dashboard-overview.png](dashboard-overview.png) | Compact viewport capture for the README. |
| `dashboard-light.png`, `dashboard-dark.png`, `dashboard-mobile.png`, `dashboard-developer.png`, `dashboard-workspace.png` | Full product reference captures. |

The brand artwork is original, code-authored vector work created for this
repository. PNG brand images are browser renderings of the SVG sources. Product
images are real Chrome screenshots of the generated fictional demo, not mockups.
The demo's timestamps come from the system clock at generation time.

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
