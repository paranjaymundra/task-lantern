# Task Lantern — one clear view

A 16-second, 1920 × 1080, 30 fps product video made with the [Brag workflow](https://github.com/latent-spaces/brag) and [Hyperframes](https://github.com/heygen-com/hyperframes).

- **[brag.mp4](brag.mp4)** — shareable H.264/AAC video with captions and original music.
- **[brag.jpg](brag.jpg)** — poster, also baked into frame zero.
- **[watch.html](watch.html)** — double-click for a local player.
- **[share-copy.txt](share-copy.txt)** — suggested announcement.
- **composition/** — editable HTML timeline and source media.
- **source/** — browser capture, soundtrack/composition generator, and rebuild script.

The footage is the actual shipped interface, recorded in an isolated Chrome profile. Data is fictional and interactions are scripted. It shows switching between tracked threads across projects, opening decisions and the plan inline, collapsing the sidebar, and dark mode. No live agent work is simulated as real progress.

The first 13 seconds show the product; the last three seconds hold the repository link. Short captions carry the story without audio. The music is an original synthesized pulse at 120 BPM, with no samples or stock tracks.

## Rebuild

Use Node 22+, Python 3.10+, Chrome, FFmpeg, and FFprobe. These are optional video tools; Task Lantern itself does not need Node or FFmpeg.

```sh
bash brag-output-2026-09-27-100647/source/render.sh
```

The script downloads pinned GSAP/Hyperframes dependencies, captures the demo, synthesizes the soundtrack, validates the composition, renders, and replaces the first frame with the selected poster. Set `CHROME_PATH`, `FFMPEG`, or `FFPROBE` for custom binary locations. Rebuilding replaces this output. Temporary files stay in ignored `work/`. Run the rebuild once before previewing the editable composition to download its GSAP dependency.

## Rights and verification

Original composition, captions, synthesized music, and product visuals use the repository’s MIT license. GSAP is an optional downloaded build dependency with its own [Standard License](https://gsap.com/standard-license/); its binary is excluded from Git. Brag and Hyperframes are production tools, not runtime dependencies.

See [verification.md](verification.md) for the browser and final media checks.
