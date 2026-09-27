# Task Lantern — a clear view of long tasks

A **35.6-second narrated walkthrough** focused on helping a new viewer understand Task Lantern. Made with the [Brag workflow](https://github.com/latent-spaces/brag) and [Hyperframes](https://github.com/heygen-com/hyperframes).

- **[brag.mp4](brag.mp4)** — 1920 × 1080, 30 fps, H.264/AAC.
- **[brag.jpg](brag.jpg)** — settled opening poster, also baked into frame zero.
- **[watch.html](watch.html)** — local video player.
- **[source/voiceover.txt](source/voiceover.txt)** — complete narration.
- **[source/captions.json](source/captions.json)** — reviewed word timings and phrase boundaries.
- **[timeline.json](timeline.json)** — measured scene timings.
- **[share-copy.txt](share-copy.txt)** — suggested announcement.

The walkthrough explains the audience and purpose, choosing tracked threads across projects, progress and blockers, questions and where to answer them, expandable details, and how the coding agent publishes updates. The final scene gives the repository URL.

The opening describes uncertainty about progress, blockers, and waiting decisions. A quiet Task Lantern mark sits at the top left, with the full title card at the end. The top caption uses the actual spoken phrases, with each word fading in at its aligned speech time. The whole page fades through warm paper between scenes; framing changes happen while it is invisible. Narration leads, with a quiet original instrumental underneath. Thin highlights follow the narration and stay attached to actual UI elements. There are no numbered callout strips, pulsing logos, progress decorations, or bouncing text.

Footage comes from the actual shipped demo with its left sidebar. Task data is fictional, interactions are scripted, and no live agent work is claimed. Demo labels and the in-app brand are hidden only in the isolated recording; the shipped interactive demo remains unchanged. Narration uses the synthetic Kokoro `af_heart` voice, generated locally through Hyperframes. It is not a cloned voice.

## Rebuild

Use Node 22+, Python 3.12, Chrome, FFmpeg, and FFprobe. These are optional video build tools, not Task Lantern runtime dependencies.

```sh
bash brag-output-2026-09-27-141031/source/render.sh
```

The script creates a temporary speech environment, generates six voice clips, aligns their words locally with whisper.cpp small.en, measures their lengths, builds the timeline, captures the browser, validates the composition, renders, and bakes the poster into frame zero. Set `VOICE_PYTHON`, `CHROME_PATH`, `FFMPEG`, or `FFPROBE` for custom binary paths. Word alignment uses whisper.cpp and the small.en model (downloaded on first use by Hyperframes). Set `HYPERFRAMES_WHISPER_PATH` and `WHISPER_MODEL` for custom alignment paths. Temporary files stay in ignored `work/`. Rebuilding replaces this output. Run the rebuild once before previewing the editable composition to download GSAP.

## Rights and checks

Original visuals, composition, captions, and synthesized instrumental follow the repository’s MIT license. GSAP is an optional build dependency with its own [Standard License](https://gsap.com/standard-license/); its binary is excluded from Git. No sampled or stock music is included. Brag, Hyperframes, and Kokoro are production tools, not dashboard runtime dependencies.

See [verification.md](verification.md) for final media and visual checks.
