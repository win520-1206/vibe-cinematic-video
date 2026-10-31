"""Prepare exact-length mixes and features from the current contract. No implicit looping."""
from pathlib import Path
import argparse,json,hashlib,subprocess,wave,math
import numpy as np
from audio_features import analyze
from music_structure import analyze as structure

def digest(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def asset(root,relative):
 p=(root/'public'/relative).resolve();p.relative_to((root/'public').resolve());return p
def decode(ffmpeg,p):
 r=subprocess.run([ffmpeg,'-v','error','-i',str(p),'-vn','-ac','1','-ar','48000','-c:a','pcm_s16le','-f','wav','pipe:1'],capture_output=True)
 if r.returncode:raise ValueError(r.stderr.decode('utf8',errors='replace'))
 import io
 with wave.open(io.BytesIO(r.stdout)) as w:return np.frombuffer(w.readframes(w.getnframes()),'<i2').astype(float)/32768
def wav(p,x):
 with wave.open(str(p),'wb') as w:w.setparams((1,2,48000,0,'NONE','not compressed'));w.writeframes((np.clip(x,-1,1)*32767).astype('<i2').tobytes())
def prepare(root,raw,ffmpeg):
 dest=root/'public/generated';dest.mkdir(parents=True,exist_ok=True)
 for e in raw['episodes']:
  fps=raw['video']['fps'];duration=e.get('durationSeconds',raw['video'].get('durationSeconds'));audio={**raw.get('audio',{}),**e.get('audio',{})};events=e.get('events',[])
  source=asset(root,audio['file']) if audio.get('required',True) else None
  source_hash=digest(source) if source else None
  event_hashes={x['id']:digest(asset(root,x['sound']['file'])) for x in events if x.get('sound',{}).get('file')}
  spec={'sourceHash':source_hash,'eventHashes':event_hashes,'audio':audio,'fps':fps,'duration':duration,'events':events,'implementation':[digest(Path(__file__)),digest(Path(__file__).with_name('audio_features.py')),digest(Path(__file__).with_name('music_structure.py'))]}
  key=hashlib.sha256(json.dumps(spec,sort_keys=True).encode()).hexdigest();prefix=dest/e['id'];cache=dest/(e['id']+'-audio-cache.json')
  outputs=[dest/(e['id']+s) for s in ['-music.wav','-mix.wav','-features.json','-music-analysis.json']]
  if cache.exists():
   old=json.loads(cache.read_text())
   if old.get('key')==key and all(p.exists() and old.get('hashes',{}).get(p.name)==digest(p) for p in outputs):print(e['id']+': verified audio cache');continue
  n=round(duration*48000);music=np.zeros(n)
  if source:
   full=decode(ffmpeg,source);start=float(audio.get('cropStartSeconds') or 0);end=audio.get('cropEndSeconds');end=start+duration if end is None else float(end)
   if start<0 or end-start+1/48000<duration or round(end*48000)>len(full)+1:raise ValueError(e['id']+': selected music cannot cover duration; choose crop/restructure/music/duration explicitly')
   if audio.get('playbackRate',1)!=1:raise ValueError('Prepare a new source for deliberate speed changes; automatic speed changes are not implemented')
   sample=full[round(start*48000):round(start*48000)+n]
   if len(sample)!=n:raise ValueError('Music source too short')
   music[:]=sample*10**(audio.get('gainDb',-6)/20)
  mix=music.copy()
  for ev in events:
   s=ev.get('sound')
   if not s:continue
   count=round(s['durationSeconds']*48000);offset=round(ev['atSeconds']*48000)
   if offset+count>n:raise ValueError(ev['id']+': sound extends past episode')
   if s.get('file'):
    x=decode(ffmpeg,asset(root,s['file']))
    if len(x)<count:raise ValueError('SFX shorter than declared duration')
    x=x[:count]
   else:
    t=np.arange(count)/48000;freq=s.get('frequency',220);x=np.sin(2*np.pi*freq*t)*np.exp(-t/max(.02,s['durationSeconds']/5))*np.minimum(1,t/.008)
   mix[offset:offset+count]+=x*10**(s['gainDb']/20)
  peak=float(abs(mix).max())
  if peak>=1:raise ValueError(f'{e["id"]}: mix clips ({peak}); adjust gains explicitly')
  wav(outputs[0],music);wav(outputs[1],mix)
  features=analyze(outputs[0],fps);features['source']='music selection';features['duration']=duration
  features['frames']=round(duration*fps)
  for k in features['bands']:features['bands'][k]=features['bands'][k][:features['frames']]
  features['rms']=features['rms'][:features['frames']]
  outputs[2].write_text(json.dumps(features),encoding='utf8');analysis=structure(features)
  analysis['mapping']={'sourceStartSeconds':audio.get('cropStartSeconds') or 0,'timelineStartSeconds':0,'playbackRate':1}
  outputs[3].write_text(json.dumps(analysis,indent=2),encoding='utf8')
  cache.write_text(json.dumps({'key':key,'spec':spec,'peak':peak,'listeningStatus':'not_reviewed','hashes':{p.name:digest(p) for p in outputs}},indent=2),encoding='utf8');print(e['id']+': prepared exact-length audio')
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('--project',required=True,type=Path);p.add_argument('--ffmpeg',required=True);a=p.parse_args()
 prepare(a.project.parent,json.loads(a.project.read_text(encoding='utf8')),a.ffmpeg)
