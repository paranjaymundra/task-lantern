# Verification

- Final MP4: 1920 × 1080, 30 fps, 1,069 video frames, 35.634 seconds, H.264 video and AAC audio. Size: 2,994,136 bytes.
- Hyperframes 0.8.79 composition check: zero errors across lint, runtime, layout, and contrast. One advisory remains about grouping the static closing card as a sub-composition; it does not affect playback.
- Reviewed rendered frames showing current progress, the waiting question, selected thread, default waiting action, agent-chat reply location, collapsed detail sections, expanded plan/current step, local-file indicator, and closing card. Corrected the details-scene scroll position before the final render.
- Thin highlights use the actual element bounds on each captured frame. Only one is visible at a time. The recording adds bottom scroll room so the detail sections can sit inside the camera frame.
- No on-screen demo/sample labels or opening product branding. The opening narration describes the problem; the Task Lantern name and logo appear on the closing card. The shipped interactive demo remains unchanged.
- All five full-page transitions were inspected around the cut. At each cut, the encoded frame is uniformly warm paper (luma range 216–218), confirming that the entire composition fades away before the new scene appears.
- The settled 2.5-second problem/progress frame is exported as `brag.jpg` and baked into frame zero.
- Complete final media decoded successfully. Audio measured −15.3 LUFS integrated, 2.9 LU range, and −1.8 dBFS true peak. Every narration clip ends inside its scene.
- Source JavaScript, Python, and shell syntax checked. No dashboard runtime files were changed by this video revision.

Footage uses fictional tasks and scripted interactions in the actual demo. Audio measurements and visual checks do not constitute a subjective listening review.
