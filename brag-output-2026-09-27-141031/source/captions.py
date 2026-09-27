"""Align the approved script to local narration with whisper.cpp token timing."""
import argparse
import json
import math
import os
from pathlib import Path
import re
import shutil
import subprocess
import wave

BASE = Path(__file__).resolve().parent.parent
parser = argparse.ArgumentParser()
parser.add_argument('--reuse-alignment', action='store_true')
args = parser.parse_args()
work = BASE / 'work'
work.mkdir(exist_ok=True)
scenes = json.loads((BASE / 'source/narration.json').read_text())
phrases = json.loads((BASE / 'source/caption-phrases.json').read_text())
model = Path(os.environ.get('WHISPER_MODEL', str(Path.home() / '.cache/hyperframes/whisper/models/ggml-small.en.bin')))
binary = os.environ.get('HYPERFRAMES_WHISPER_PATH') or shutil.which('whisper-cli')
if not args.reuse_alignment and (not binary or not model.exists()):
    subprocess.run(['npx', '--yes', 'hyperframes@0.8.79', 'transcribe', str(BASE / 'composition/assets/voice-0.wav'), '--engine', 'whisper', '--model', 'small.en', '--dir', str(work / 'bootstrap')], check=True)
    binary = os.environ.get('HYPERFRAMES_WHISPER_PATH') or shutil.which('whisper-cli')
    if not binary:
        candidate = Path.home() / '.cache/hyperframes/whisper/whisper.cpp/build/bin/whisper-cli'
        if candidate.exists(): binary = str(candidate)
    if not binary or not model.exists():
        raise SystemExit('Set HYPERFRAMES_WHISPER_PATH and WHISPER_MODEL to your whisper.cpp binary and small.en model.')

captions, transcript, clock = [], [], 0.0
normalize = lambda text: re.sub(r'[^a-z0-9]', '', text.lower())
for scene, minimum in zip(scenes, [5, 7, 7, 5, 5, 4]):
    voice = BASE / f"composition/assets/voice-{scene['id']}.wav"
    with wave.open(str(voice)) as w: seconds = w.getnframes() / w.getframerate()
    duration = math.ceil(max(minimum, seconds + 1) * 30) / 30
    start, voice_start = round(clock, 6), round(clock + .45, 6)
    target = work / f"voice-{scene['id']}-aligned"
    if not args.reuse_alignment:
        with (work / f"align-{scene['id']}.log").open('w') as log:
            subprocess.run([binary, '--model', str(model), '--dtw', 'small.en', '--no-flash-attn', '--output-json-full', '--output-file', str(target), '--suppress-nst', str(voice)], stdout=log, stderr=log, check=True)
    raw = json.loads(target.with_suffix('.json').read_text())
    words, previous_center = [], None
    for segment in raw['transcription']:
        for token in segment['tokens']:
            text = token['text']
            if text.startswith('[_') or not text.strip(): continue
            center = token.get('t_dtw', -1) / 100
            if center < 0: raise ValueError('Missing DTW alignment: use --no-flash-attn with whisper.cpp.')
            onset = max(0, (previous_center + center) / 2 if previous_center is not None else center - .12)
            if re.search(r'\w', text) and (text[0].isspace() or not words):
                words.append({'text': text.strip(), 'start': round(voice_start + onset, 6)})
            elif words:
                words[-1]['text'] += text.strip()
            previous_center = center
    expected = scene['text'].split()
    assert [normalize(w['text']) for w in words] == [normalize(w) for w in expected], f"Transcript differs from approved script in scene {scene['id']}; review before rendering."
    for i, (word, approved) in enumerate(zip(words, expected)):
        word['text'] = approved
        word['end'] = words[i+1]['start'] if i+1 < len(words) else round(voice_start + seconds, 6)
        assert voice_start <= word['start'] < word['end'] <= voice_start + seconds + .001
    transcript.extend(words)
    if scene['id'] < len(phrases):
        groups = phrases[scene['id']]
        assert ' '.join(groups) == scene['text']
        offset, scene_captions = 0, []
        for phrase in groups:
            n = len(phrase.split())
            group_words = words[offset:offset+n]
            scene_captions.append({'scene':scene['id'], 'start':start if not offset else group_words[0]['start'], 'words':group_words})
            offset += n
        for i, caption in enumerate(scene_captions):
            caption['end'] = scene_captions[i+1]['start'] if i+1 < len(scene_captions) else round(clock+duration, 6)
            assert caption['words'][-1]['start'] + .09 < caption['end']
        captions.extend(scene_captions)
    clock += duration
(BASE / 'source/captions.json').write_text(json.dumps(captions, indent=2)+'\n')
(BASE / 'composition/transcript.json').write_text(json.dumps(transcript, indent=2)+'\n')
print(f'Aligned {len(transcript)} words; {len(captions)} progressive caption phrases.')
