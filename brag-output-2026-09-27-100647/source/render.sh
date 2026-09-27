#!/usr/bin/env bash
set -euo pipefail
# Optional video build tooling; no changes to the Task Lantern runtime.
cd "$(dirname "$0")/.."
FFMPEG="${FFMPEG:-ffmpeg}"
FFPROBE="${FFPROBE:-ffprobe}"
export HYPERFRAMES_FFMPEG_PATH="$(command -v "$FFMPEG")"
export HYPERFRAMES_FFPROBE_PATH="$(command -v "$FFPROBE")"
export HYPERFRAMES_NO_TELEMETRY=1
mkdir -p work/deps
npm install --prefix work/deps --ignore-scripts --no-package-lock gsap@3.15.0
node source/capture.mjs
python3 source/build.py
"$FFMPEG" -hide_banner -loglevel error -y -f concat -safe 0 -i work/frames/frames.txt -t 13 -vf fps=30 -c:v libx264 -preset fast -crf 18 -pix_fmt yuv420p -movflags +faststart composition/assets/screen-recording.mp4
(
 cd composition
 npx --yes hyperframes@0.8.79 check --at 0.7,3,6.2,9,12,14.5
 npx --yes hyperframes@0.8.79 render --quality high --low-memory-mode --workers 1 --fps 30 --output ../work/render.mp4
)
"$FFMPEG" -hide_banner -loglevel error -y -ss 0.7 -i work/render.mp4 -frames:v 1 -q:v 2 brag.jpg
"$FFMPEG" -hide_banner -loglevel error -y -i work/render.mp4 -i brag.jpg -filter_complex "[0:v][1:v]overlay=0:0:enable='eq(n,0)'[v]" -map '[v]' -map '0:a?' -c:v libx264 -crf 18 -preset slow -pix_fmt yuv420p -c:a copy -movflags +faststart brag.mp4
"$FFPROBE" -v error -show_entries stream=codec_name,width,height,r_frame_rate:format=duration,size -of json brag.mp4
printf '\nReady: brag.mp4\n'
