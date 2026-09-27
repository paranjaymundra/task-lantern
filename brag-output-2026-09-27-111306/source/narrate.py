"""Generate the scene voices locally through Hyperframes/Kokoro."""
import json
import os
from pathlib import Path
import subprocess

base = Path(__file__).resolve().parent.parent
work = base / 'work'
work.mkdir(exist_ok=True)
assets = base / 'composition/assets'
assets.mkdir(parents=True, exist_ok=True)
for scene in json.loads((base / 'source/narration.json').read_text()):
    name = f"voice-{scene['id']}"
    script = work / f'{name}.txt'
    script.write_text(scene['text'])
    subprocess.run(['npx', '--yes', 'hyperframes@0.8.79', 'tts', str(script), '--voice', 'af_heart', '--output', str(work / f'{name}.wav')], check=True)
    subprocess.run([os.environ.get('FFMPEG', 'ffmpeg'), '-hide_banner', '-loglevel', 'error', '-y', '-i', str(work / f'{name}.wav'), '-af', 'loudnorm=I=-18:TP=-2:LRA=7', '-ar', '24000', str(assets / f'{name}.wav')], check=True)
