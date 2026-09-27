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
"${VOICE_PYTHON:-python3.12}" -m venv work/voice-env
work/voice-env/bin/python -m pip install kokoro-onnx==0.6.1 soundfile==0.14.0
export HYPERFRAMES_PYTHON="$PWD/work/voice-env/bin/python"
python3 source/narrate.py
python3 source/build.py
node source/capture.mjs
FOOTAGE_SECONDS="$(python3 -c 'import json; print(json.load(open("timeline.json"))["footage_duration"])')"
"$FFMPEG" -hide_banner -loglevel error -y -f concat -safe 0 -i work/frames/frames.txt -t "$FOOTAGE_SECONDS" -vf fps=30 -c:v libx264 -preset fast -crf 18 -pix_fmt yuv420p -movflags +faststart composition/assets/screen-recording.mp4
(
 cd composition
 npx --yes hyperframes@0.8.79 check --at 2.5,8,16.7,23.8,33
 npx --yes hyperframes@0.8.79 render --quality high --low-memory-mode --workers 1 --fps 30 --output ../work/render.mp4
)
"$FFMPEG" -hide_banner -loglevel error -y -ss 2.5 -i work/render.mp4 -frames:v 1 -q:v 2 brag.jpg
"$FFMPEG" -hide_banner -loglevel error -y -i work/render.mp4 -i brag.jpg -filter_complex "[0:v][1:v]overlay=0:0:enable='eq(n,0)'[v]" -map '[v]' -map '0:a?' -c:v libx264 -crf 18 -preset slow -pix_fmt yuv420p -c:a copy -movflags +faststart brag.mp4
"$FFPROBE" -v error -show_entries stream=codec_name,width,height,r_frame_rate:format=duration,size -of json brag.mp4
printf '\nReady: brag.mp4\n'
