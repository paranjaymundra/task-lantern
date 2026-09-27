"""Generate an original score and a deterministic, tightly framed product film."""
from pathlib import Path
import math
import random
import struct
import wave
import json
import shutil
import os

base = Path(__file__).resolve().parent.parent
assets = base / 'composition/assets'
assets.mkdir(parents=True, exist_ok=True)
with wave.open(str(assets / 'voiceover.wav')) as voice:
    voice_seconds = voice.getnframes() / voice.getframerate()
total_duration = max(16, math.ceil(voice_seconds + 0.5))
if total_duration > 20:
    raise ValueError('Shorten narration to retain the brisk product demo.')
sr = 44100
rng = random.Random(42)
samples = []
# Original electronic pulse: no samples, voice, or third-party music.
for n in range(sr * total_duration):
    t = n / sr
    beat = t * 2
    beat_index = int(beat)
    within = (beat - beat_index) / 2
    kick = .20 * math.exp(-within * 25) * math.sin(2 * math.pi * (51 * within + 30 * (1 - math.exp(-within * 30)) / 30))
    hat_age = (t % .25)
    noise = rng.uniform(-1, 1)
    hat = .028 * noise * math.exp(-hat_age * 90)
    snare = .085 * noise * math.exp(-within * 35) if beat_index % 2 else 0
    chord = [65.406, 82.407, 55, 73.416][int(t / 4) % 4]
    bass = .11 * math.sin(2 * math.pi * chord * t) * (1 - math.exp(-within * 65)) * math.exp(-within * 8)
    tone = 0
    notes = [261.626, 391.995, 329.628, 493.883, 391.995, 329.628, 293.665, 391.995]
    for k in range(max(0, int(t / .5) - 2), int(t / .5) + 1):
        age = t - k * .5
        f = notes[k % 8]
        env = (1 - math.exp(-age * 100)) * math.exp(-age * 5)
        tone += .055 * env * (math.sin(2 * math.pi * f * age) + .22 * math.sin(2 * math.pi * f * 2 * age))
    v = kick + hat + snare + bass + tone
    if t >= 13:
        v *= .55
    for cue in [2, 5, 8, 10.5, 13]:
        age = t - cue
        if 0 <= age < .12:
            v += .045 * math.exp(-age * 40) * math.sin(2 * math.pi * 920 * age)
    v *= min(1, t / .04, max(0, (total_duration - t) / .5))
    samples.append(v)
gain = .5 / max(abs(v) for v in samples)
energy = []
with wave.open(str(assets / 'soundtrack.wav'), 'wb') as w:
    w.setparams((2, 2, sr, 0, 'NONE', 'not compressed'))
    buf = bytearray()
    for i in range(0, len(samples), sr // 30):
        chunk = [v * gain for v in samples[i:i + sr // 30]]
        energy.append(round(math.sqrt(sum(v * v for v in chunk) / len(chunk)), 5))
        for v in chunk:
            sample = max(-32767, min(32767, round(v * 32767)))
            buf.extend(struct.pack('<hh', sample, sample))
    w.writeframes(buf)
(assets / 'audio-energy.json').write_text(json.dumps(energy))
gsap = Path(os.environ.get('GSAP_PATH', str(base / 'work/deps/node_modules/gsap/dist/gsap.min.js')))
shutil.copy(gsap, assets / 'gsap.min.js')
shutil.copy(base.parent / 'docs/assets/logo.svg', assets / 'logo.svg')
beats = [(0, 2, 'Your threads. One clear view.'), (2, 3, 'Switch projects. Keep context.'), (5, 3, 'Know what needs you.'), (8, 2.5, 'Go deeper. Stay here.'), (10.5, 2.5, 'Make room to focus.')]
def words(text):
    return ''.join(f'<span class="word">{word}</span>' for word in text.split())

caption_html = ''.join(f'<section id="caption-{i}" class="caption clip" data-start="{start}" data-duration="{duration}" data-track-index="2"><div id="line-{i}">{words(text)}</div></section>' for i, (start, duration, text) in enumerate(beats))
html = '''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=1920,height=1080"><title>Task Lantern — one clear view</title><script src="assets/gsap.min.js"></script><style>
*{box-sizing:border-box}body{margin:0;background:#eeeae2;color:#282b26;font-family:sans-serif}#root{position:relative;width:100%;height:100%;overflow:hidden;background:#eeeae2}.brand{position:absolute;left:76px;top:32px;display:flex;gap:13px;align-items:center;font-size:23px;font-weight:600;height:38px}.brand img{width:34px;height:34px}.sample{position:absolute;right:76px;top:43px;font-size:18px;letter-spacing:1.2px;color:#5c6056}.caption{position:absolute;left:76px;top:92px;width:1768px;height:78px;font-size:62px;line-height:1.1;font-weight:650;letter-spacing:-2px}.film-window{position:absolute;left:72px;top:199px;width:1776px;height:748px;overflow:hidden;border:1px solid #c5c7bb;border-radius:12px;background:#f7f6f2;box-shadow:0 18px 36px #282b2620}.camera{position:absolute;left:0;top:0;width:1776px;height:1110px;transform-origin:0 0}.camera video{width:1776px;height:1110px;display:block}.footer{position:absolute;left:76px;top:1032px;font-size:19px;color:#5c6056}.footer-right{position:absolute;right:76px;top:1032px;font-size:19px;color:#5c6056}.progress{position:absolute;left:0;bottom:0;width:1920px;height:4px;background:#ae5630;transform-origin:left center}.end{position:absolute;inset:0;background:#282b26;color:#f7f6f2}.endinner{position:absolute;left:130px;top:214px;width:1660px}.endlogo{position:absolute;right:136px;top:114px;width:90px;height:90px;background:#f7f6f2;border-radius:15px}.kicker{color:#e2ad8b;font-size:25px;letter-spacing:3px;margin-bottom:35px}.endtitle{font:118px/1.1 serif;letter-spacing:-4px;margin:0}.endtag{font-size:44px;line-height:1.35;margin-top:30px;color:#e8e8df}.endrule{height:1px;background:#5e6457;margin-top:77px;width:1660px;transform-origin:left center}.endurl{font-size:36px;margin-top:34px}.endnote{font-size:24px;color:#bcc3b1;margin-top:24px}
.word{display:inline-block;margin-right:.22em}.word:last-child{margin-right:0}.annotation{position:absolute;left:76px;top:965px;width:1768px;height:76px}.annotation-inner{height:76px;display:flex;align-items:center;gap:25px;border:1px solid #c5c7bb;border-radius:10px;background:#fffefa;padding:0 22px;overflow:hidden;position:relative}.annotation-number{display:grid;place-items:center;width:42px;height:42px;flex-shrink:0;border-radius:6px;background:#282b26;color:#fffefa;font:22px monospace}.annotation-label{font-size:23px;font-weight:650;white-space:nowrap}.annotation-divider{height:25px;width:1px;background:#c5c7bb}.annotation-copy{font-size:23px;color:#5c6056}.annotation-rule{position:absolute;bottom:0;left:0;width:100%;height:3px;background:#ae5630;transform-origin:left center}.focus-ring{position:absolute;pointer-events:none;border:3px solid #ae5630;border-radius:12px;box-shadow:0 0 0 5px #fffefa99}.feature-pills{display:flex;gap:14px;margin-top:30px}.feature-pill{border:1px solid #78806e;border-radius:7px;padding:12px 20px;color:#e8e8df;font-size:23px}
</style></head><body><div id="root" data-composition-id="lantern-workspace" data-width="1920" data-height="1080" data-duration="16">
<div class="brand" id="brand"><img id="mark" src="assets/logo.svg" alt=""><span>Task Lantern</span></div><div class="sample" id="sample">SCRIPTED DEMO · SAMPLE DATA</div>
''' + caption_html + '''
<div class="film-window" id="film"><div class="camera" id="camera" data-layout-allow-overflow><video id="recording" class="clip" src="assets/screen-recording.mp4" data-start="0" data-duration="13" data-track-index="0" muted playsinline></video></div></div>
@@ANNOTATIONS@@
<section id="closing" class="end clip" data-start="13" data-duration="3" data-track-index="3"><div class="endinner"><div id="kicker" class="kicker">OPEN SOURCE · LOCAL FIRST</div><h1 id="endtitle" class="endtitle">Task Lantern</h1><div id="endtag" class="endtag">One workspace. Just HTML.</div><div id="endrule" class="endrule"></div><div id="endurl" class="endurl">github.com/paranjaymundra/task-lantern</div><div id="endnote" class="feature-pills"><span class="feature-pill">Offline HTML</span><span class="feature-pill">Claude Code + Codex</span><span class="feature-pill">Open source · MIT</span></div></div><img class="endlogo" src="assets/logo.svg" alt=""></section>
<div id="progress" class="progress" aria-hidden="true"></div><audio id="score" src="assets/soundtrack.wav" data-start="0" data-duration="16" data-track-index="10" data-volume=".14"></audio>
</div><script>window.__timelines=window.__timelines||{};const tl=gsap.timeline({paused:true});
tl.fromTo('#progress',{scaleX:0},{scaleX:1,duration:16,ease:'none'},0);
// The fixed viewport crops actual footage; all camera motion is on a non-timed wrapper.
tl.fromTo('#camera',{scale:1.035,x:-28,y:-10},{scale:1,x:0,y:0,duration:.42,ease:'power3.out'},0);
tl.set('#camera',{scale:1.40,x:0,y:-150},2);
tl.to('#camera',{scale:1.35,x:0,y:-140,duration:.32,ease:'power3.out'},2);
tl.set('#camera',{scale:1.22,x:-390.7,y:-20},5);
tl.to('#camera',{scale:1.17,x:-301.9,y:-10,duration:.32,ease:'power3.out'},5);
tl.set('#camera',{scale:1.2,x:-355.2,y:-130},8);
tl.to('#camera',{scale:1.15,x:-266.4,y:-112,duration:.3,ease:'power2.out'},8);
tl.set('#camera',{scale:1.025,x:-20,y:0},10.5);
tl.to('#camera',{scale:1,x:0,y:0,duration:.3,ease:'power2.out'},10.5);
'''
for i, (start, duration, _) in enumerate(beats):
    html += f"tl.fromTo('#line-{i} .word',{{y:22,opacity:0}},{{y:0,opacity:1,duration:.3,stagger:.035,ease:'power3.out'}},{start + .05});\n"
for i in range(0, 390, 3):
    html += f"tl.to('#mark',{{scale:{1 + .025 * energy[i] / max(energy):.4f},duration:.099,ease:'none'}},{i / 30:.1f});\n"
html += """
tl.set('#brand,#sample,#film',{opacity:0},13);
tl.fromTo('#endtitle',{x:-30,opacity:0},{x:0,opacity:1,duration:.3,ease:'power3.out'},13);
tl.fromTo('#endtag',{y:15,opacity:0},{y:0,opacity:1,duration:.28,ease:'power2.out'},13.12);
tl.fromTo('#endrule',{scaleX:0},{scaleX:1,duration:.38,ease:'power3.out'},13.12);
tl.fromTo('#endurl',{y:12,opacity:0},{y:0,opacity:1,duration:.3,ease:'power3.out'},13.25);
tl.fromTo('.feature-pill',{y:15,opacity:0},{y:0,opacity:1,duration:.28,stagger:.1,ease:'power3.out'},13.45);
tl.fromTo('.endlogo',{scale:.88,rotation:-8,opacity:0},{scale:1,rotation:0,opacity:1,duration:.4,ease:'power3.out'},13.1);
window.__timelines['lantern-workspace']=tl;</script></body></html>"""
notes = [
    ('YOUR WORK, TOGETHER', 'Only the threads you choose to track.'),
    ('SWITCH PROJECTS', 'Claude Code and Codex. One workspace.'),
    ('KNOW WHAT NEEDS YOU', 'Questions, defaults, and blockers.'),
    ('OPEN THE DETAILS', 'Plan, files, activity, and developer tools.'),
    ('MAKE ROOM TO FOCUS', 'Collapse the sidebar. Switch to dark.')
]
annotations, motion = '', ''
for i, ((start, length, _), (label, copy)) in enumerate(zip(beats, notes)):
    annotations += f'<section class="annotation clip" data-start="{start}" data-duration="{length}" data-track-index="4"><div class="annotation-inner" id="annotation-{i}"><span class="annotation-number">0{i + 1}</span><span class="annotation-label">{label}</span><span class="annotation-divider"></span><span class="annotation-copy">{copy}</span><div class="annotation-rule" id="annotation-rule-{i}"></div></div></section>'
    motion += f"tl.fromTo('#annotation-{i}',{{y:12,opacity:0}},{{y:0,opacity:1,duration:.28,ease:'power3.out'}},{start + .12});\n"
    motion += f"tl.fromTo('#annotation-rule-{i}',{{scaleX:0}},{{scaleX:1,duration:{length - .2},ease:'none'}},{start + .2});\n"
# These overlays annotate the recorded interface; they never invent a UI state.
for i, (start, length, x, y, width, height) in enumerate([(2.5, 1.0, 94, 702, 455, 178), (5.65, 1.8, 272, 462, 1509, 255)]):
    annotations += f'<div class="clip" data-start="{start}" data-duration="{length}" data-track-index="5"><div id="focus-{i}" class="focus-ring" style="left:{x}px;top:{y}px;width:{width}px;height:{height}px"></div></div>'
    motion += f"tl.fromTo('#focus-{i}',{{scale:.987,opacity:0}},{{scale:1,opacity:1,duration:.25,ease:'power3.out'}},{start});\n"
    motion += f"tl.to('#focus-{i}',{{opacity:0,duration:.2}},{start + length - .2});\n"
html = html.replace('@@ANNOTATIONS@@', annotations)
html = html.replace("window.__timelines['lantern-workspace']=tl;", motion + "window.__timelines['lantern-workspace']=tl;")
html = html.replace('data-duration="16"', f'data-duration="{total_duration}"').replace('duration:16,', f'duration:{total_duration},')
html = html.replace('data-start="13" data-duration="3"', f'data-start="13" data-duration="{total_duration - 13}"')
html = html.replace('</audio>\n</div><script>', f'</audio><audio id="voiceover" src="assets/voiceover.wav" data-start="0.15" data-duration="{voice_seconds:.4f}" data-track-index="11" data-volume="1"></audio>\n</div><script>')
assert 'id="voiceover"' in html
(base / 'composition/index.html').write_text(html)
(base / 'media-info.json').write_text(json.dumps({'duration': total_duration, 'voice_seconds': voice_seconds, 'voice': 'af_heart', 'engine': 'Kokoro via Hyperframes 0.8.79'}, indent=2))
(base / 'share-copy.txt').write_text("Task Lantern now puts your tracked coding-agent threads in one local workspace. Switch projects on the left, see progress and decisions at a glance, and expand the details without leaving the page. Open source for Claude Code and Codex: https://github.com/paranjaymundra/task-lantern\n")
print(f'Built {total_duration}-second composition, {voice_seconds:.2f}s narration, and original score.')
