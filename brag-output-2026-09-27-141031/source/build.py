"""Build a calm, narrated walkthrough; narration determines the scene timing."""
from pathlib import Path
import html
import json
import math
import os
import random
import shutil
import struct
import wave

BASE = Path(__file__).resolve().parent.parent
ASSETS = BASE / 'composition/assets'
ASSETS.mkdir(parents=True, exist_ok=True)
scenes = json.loads((BASE / 'source/narration.json').read_text())
clock = 0
for scene, minimum in zip(scenes, [5, 7, 7, 5, 5, 4]):
    with wave.open(str(ASSETS / f"voice-{scene['id']}.wav")) as voice:
        seconds = voice.getnframes() / voice.getframerate()
    duration = math.ceil(max(minimum, seconds + 1.0) * 30) / 30
    scene.update(start=round(clock, 6), duration=duration, voice_seconds=seconds)
    clock += duration
TOTAL = round(clock, 6)
FOOTAGE = scenes[-1]['start']
(BASE / 'timeline.json').write_text(json.dumps({'duration': TOTAL, 'footage_duration': FOOTAGE, 'scenes': scenes}, indent=2))

# Quiet original instrumental bed. No click accents, percussion hits, or logo pulse.
sr, rng, samples = 44100, random.Random(42), []
for n in range(round(sr * TOTAL)):
    t = n / sr
    bass = [65.406, 82.407, 55, 73.416][int(t / 4) % 4]
    v = .075 * math.sin(2 * math.pi * bass * t)
    notes = [261.626, 391.995, 329.628, 493.883, 391.995, 329.628, 293.665, 391.995]
    for k in range(max(0, int(t) - 2), int(t) + 1):
        age = t - k
        envelope = (1 - math.exp(-age * 16)) * math.exp(-age * 3)
        v += .045 * envelope * math.sin(2 * math.pi * notes[k % 8] * age)
    v *= min(1, t / .8, max(0, (TOTAL - t) / 1.2))
    samples.append(v)
with wave.open(str(ASSETS / 'soundtrack.wav'), 'wb') as target:
    target.setparams((2, 2, sr, 0, 'NONE', 'not compressed'))
    target.writeframes(b''.join(struct.pack('<hh', round(v * 32767), round(v * 32767)) for v in samples))
shutil.copy(Path(os.environ.get('GSAP_PATH', str(BASE / 'work/deps/node_modules/gsap/dist/gsap.min.js'))), ASSETS / 'gsap.min.js')
shutil.copy(BASE.parent / 'docs/assets/logo.svg', ASSETS / 'logo.svg')
captions = json.loads((BASE / 'source/captions.json').read_text())
headlines = ''.join(
    f'<section id="caption-{i}" class="caption clip" data-start="{c["start"]}" data-duration="{c["end"]-c["start"]}" data-track-index="1">'
    + ' '.join(f'<span class="spoken-word" id="word-{i}-{j}">{html.escape(w["text"])}</span>' for j,w in enumerate(c['words']))
    + '</section>' for i,c in enumerate(captions)
)
voices = ''.join(f'<audio id="voice-{s["id"]}" src="assets/voice-{s["id"]}.wav" data-start="{s["start"] + .45:.6f}" data-duration="{s["voice_seconds"]}" data-track-index="11" data-volume="1"></audio>' for s in scenes)
page = '''<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=1920,height=1080"><title>Task Lantern · A clear view of long tasks</title><script src="assets/gsap.min.js"></script><style>
*{box-sizing:border-box}body{margin:0;background:#eeeae2;color:#282b26;font-family:sans-serif}#root{position:relative;width:100%;height:100%;overflow:hidden;background:#eeeae2}#stage{position:absolute;inset:0}.brand{position:absolute;left:76px;top:34px;display:flex;gap:9px;align-items:center;font-size:20px;font-weight:500;height:30px;color:#5c6056}.brand img{width:28px;height:28px}.spoken-word{opacity:0}.sample{position:absolute;right:76px;top:44px;font-size:18px;letter-spacing:1.2px;color:#5c6056}.caption{position:absolute;left:76px;top:96px;width:1768px;height:78px;font-size:60px;line-height:1.15;font-weight:650;letter-spacing:-1.7px}.film{position:absolute;left:72px;top:204px;width:1776px;height:806px;overflow:hidden;border:1px solid #c5c7bb;border-radius:12px;background:#f7f6f2;box-shadow:0 14px 30px #282b2614}.camera{position:absolute;left:0;top:0;width:1776px;height:1110px;transform-origin:0 0}.camera video{width:1776px;height:1110px;display:block}.footer{position:absolute;left:76px;top:1032px;font-size:19px;color:#5c6056}.closing{position:absolute;inset:0;background:#eeeae2}.close-inner{position:absolute;left:130px;top:218px;width:1660px}.close-mark{width:74px;height:74px;margin-bottom:30px}.close-title{font:110px/1.12 Georgia,serif;letter-spacing:-4px;margin:0}.close-tag{font-size:42px;margin-top:28px;line-height:1.35}.close-rule{height:1px;background:#c5c7bb;margin-top:70px}.close-url{font-size:35px;margin-top:30px}.close-note{font-size:23px;color:#5c6056;margin-top:26px}
</style></head><body><div id="root" data-composition-id="lantern-clean" data-width="1920" data-height="1080" data-duration="@@TOTAL@@"><div id="stage">
<div id="brand" class="brand"><img src="assets/logo.svg" alt=""><span>Task Lantern</span></div>
@@HEADLINES@@
<div id="film" class="film"><div id="camera" class="camera" data-layout-allow-overflow><video id="recording" class="clip" src="assets/screen-recording.mp4" data-start="0" data-duration="@@FOOTAGE@@" data-track-index="0" muted playsinline></video></div></div>
<div id="footer" class="footer">Claude Code + Codex · Only threads you choose to track</div>
<section id="closing" class="closing clip" data-start="@@FOOTAGE@@" data-duration="@@OUTRO@@" data-track-index="2"><div class="close-inner"><img class="close-mark" src="assets/logo.svg" alt=""><h1 class="close-title">Task Lantern</h1><div class="close-tag">A clear view of your next long task.</div><div class="close-rule"></div><div class="close-url">github.com/paranjaymundra/task-lantern</div><div class="close-note">Open source · Local HTML · Claude Code + Codex</div></div></section>
</div><audio id="music" src="assets/soundtrack.wav" data-start="0" data-duration="@@TOTAL@@" data-track-index="10" data-volume=".32"></audio>@@VOICES@@
</div><script>window.__timelines=window.__timelines||{};const tl=gsap.timeline({paused:true});
@@MOTION@@
window.__timelines['lantern-clean']=tl;</script></body></html>'''
# Reframe only while the whole page is invisible. Spoken words fade in without moving the layout.
cameras = [(1, 0, 0), (1.08, 0, -65), (1.10, -177.6, -4), (1.05, -88.8, 0), (1, 0, 0)]
motion = "tl.fromTo('#stage',{opacity:0},{opacity:1,duration:.4,ease:'sine.inOut'},0);\n"
for scene, (scale, x, y) in zip(scenes[:-1], cameras):
    motion += f"tl.set('#camera',{{scale:{scale},x:{x},y:{y}}},{scene['start']});\n"
for scene in scenes[1:]:
    cut = scene['start']
    motion += f"tl.to('#stage',{{opacity:0,duration:.3,ease:'sine.inOut'}},{cut - .35:.6f});\n"
    motion += f"tl.to('#stage',{{opacity:1,duration:.4,ease:'sine.inOut'}},{cut + .10:.6f});\n"
motion += f"tl.set('#film,#footer,#brand',{{opacity:0}},{FOOTAGE});\n"
for i, caption in enumerate(captions):
    for j, word in enumerate(caption['words']):
        motion += f"tl.fromTo('#word-{i}-{j}',{{opacity:0}},{{opacity:1,duration:.09,ease:'none'}},{word['start']});\n"
for key, value in {'TOTAL':TOTAL,'FOOTAGE':FOOTAGE,'OUTRO':scenes[-1]['duration'],'HEADLINES':headlines,'VOICES':voices,'MOTION':motion}.items():
    page = page.replace('@@'+key+'@@', str(value))
(BASE / 'composition/index.html').write_text(page)
(BASE / 'media-info.json').write_text(json.dumps({'duration':TOTAL,'footage_duration':FOOTAGE,'voice':'af_heart','engine':'Kokoro via Hyperframes 0.8.79','transitions':'full-page fade through warm paper'},indent=2))
print(f'Built {TOTAL:.2f}s explanation; {FOOTAGE:.2f}s real product footage.')
