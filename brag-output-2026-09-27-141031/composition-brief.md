# Subtle branding and spoken captions

Retain the approved problem-first narration, footage, highlights, full-page fades, music, scene timings, and final title card. Add a small logo and muted Task Lantern name in the upper-left margin. It fades with the whole page and gives way to the final brand card.

Replace the summary headlines with short phrases from the actual narration. Words appear progressively using local speech alignment, with 90 ms opacity fades and no positional motion. Reserve each phrase's full layout width so words do not cause reflow. Keep completed words visible until the next phrase. Validate the exact text against the approved script and check that words finish appearing before their phrase ends.

Use whisper.cpp small.en on each individual voice clip with DTW and flash attention disabled; this exposes usable token timing. Word boundaries are estimated between neighboring aligned token centers. The final title card remains static. No added sound effects or changes to product behavior.
