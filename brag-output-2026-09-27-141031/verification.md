# Verification

- Final media: 1920 × 1080, 30 fps, 1,069 video frames, 35.634 seconds, H.264/AAC, 3,020,031 bytes. Full file decoded successfully.
- Hyperframes 0.8.79 check: zero errors in lint, runtime, layout, and contrast. Two advisory warnings remain: the corner and closing marks reuse one logo asset, and the closing card contains nested layout elements. Rendered output verified.
- Reviewed early, middle, and final rendered frames, including partial-word reveals, completed phrases, the subtle corner brand, product highlights, and the unchanged closing card. All caption phrases fit in the existing heading area.
- Aligned all 84 narration words against individual voice clips using local whisper.cpp small.en with DTW and flash attention disabled. Word boundaries are estimated between aligned token centers. Transcript words match the approved script; punctuation and capitalization come from that script.
- The first five scenes use 12 progressive caption phrases. Each word uses a 90 ms opacity fade with no movement or text reflow. All words finish appearing before their phrase ends, and final words finish before the scene fade starts.
- Footage, all six voice files, and music match the previous approved version byte for byte. No product runtime files changed.
- All five full-page transitions retain a uniform warm-paper frame at the cut (encoded luma range 216–218). The subtle corner mark fades with the page and disappears for the closing title card.
- The settled 5.2-second problem/question frame is exported as `brag.jpg` and baked into frame zero.
- Final audio: −15.3 LUFS integrated, 2.9 LU range, −1.8 dBFS true peak. This is a signal-level check, not a subjective listening review.
- Python and shell source syntax, phrase timing bounds, script/transcript matches, unchanged media hashes, and Git whitespace checked.

Footage uses fictional tasks and scripted interactions in the actual demo. Recording-only presentation changes do not modify the shipped demo.
