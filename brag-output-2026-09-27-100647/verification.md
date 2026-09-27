# Verification

Checked on 2026-09-27.

- Product: 43 Python tests pass. Chrome checks pass for cross-project publishing, refresh, per-thread state, sidebar search/filter, inline details, mobile focus handling, exports, themes, and clipboard fallback. No unexpected product network requests or runtime errors.
- Video composition: Hyperframes 0.8.79 check passes with zero lint, runtime, layout, or contrast errors; all 25 sampled caption contrast checks pass. Seven advisory lint warnings concern nested timeline authoring and reuse of the logo, not playback failures.
- Visual review: actual product screenshots and exported frames reviewed at the summary, thread switch, decisions, plan, focused dark view, and end card.
- Export: H.264 video, AAC audio, 1920 × 1080, 30 fps, 480 frames, 16.000 seconds. Approximately 2.05 MB.
- Full FFmpeg decode succeeds. Measured audio peak −6.7 dBFS; no clipping.
- Poster: settled opening product frame at 0.7 seconds, extracted as brag.jpg and baked into frame zero. All subsequent timing and audio are retained.

The data is fictional and the browser interactions are scripted. This is a demonstration of the actual interface, not evidence of a live agent performing the sample tasks.
