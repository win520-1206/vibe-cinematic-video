"""Decode exported pixels/audio; metadata alone is insufficient. No subjective/science claims."""
from pathlib import Path
import argparse,json,subprocess,hashlib,io,wave
import numpy as np

def verify(video,ffmpeg,ffprobe,expected,evidence):
 def run(args):
  r=subprocess.run(args,capture_output=True)
  if r.returncode:raise ValueError(r.stderr.decode('utf8',errors='replace'))
  return r.stdout
 meta=json.loads(run([ffprobe,'-v','error','-show_streams','-show_format','-of','json',str(video)]));vs=next(s for s in meta['streams'] if s['codec_type']=='video');sound=next((s for s in meta['streams'] if s['codec_type']=='audio'),None)
 errors=[];warnings=[];fps=expected['fps'];width=expected['width'];height=expected['height'];count=expected['frames']
 from fractions import Fraction
 if (vs['width'],vs['height'])!=(width,height):errors.append('Wrong dimensions')
 if abs(float(Fraction(vs['avg_frame_rate']))-fps)>1e-6:errors.append('Wrong fps')
 # image2pipe + rawvideo works even when a minimal FFmpeg lacks the rawvideo muxer.
 size=width*height*3;decoder=subprocess.Popen([ffmpeg,'-v','error','-i',str(video),'-map','0:v:0','-pix_fmt','rgb24','-c:v','rawvideo','-f','image2pipe','pipe:1'],stdout=subprocess.PIPE,stderr=subprocess.PIPE)
 n=0;previous=None;identical=0;black=[];frames={};evidence.mkdir(parents=True,exist_ok=True);selected=set(expected.get('criticalFrames',[]))
 while True:
  data=decoder.stdout.read(size)
  if not data:break
  while len(data)<size:
   more=decoder.stdout.read(size-len(data))
   if not more:break
   data+=more
  if len(data)!=size:errors.append('Incomplete decoded frame');break
  pixels=np.frombuffer(data,np.uint8).reshape(height,width,3);h=hashlib.sha256(data).hexdigest()
  if h==previous:identical+=1
  previous=h
  if float(pixels.mean())<1:black.append(n)
  if n in selected:
   p=evidence/(str(n).zfill(6)+'.ppm');p.write_bytes(f'P6\n{width} {height}\n255\n'.encode()+data);frames[str(n)]=p.name
  n+=1
 err=decoder.stderr.read();ret=decoder.wait()
 if ret:errors.append('Video decode failure: '+err.decode('utf8',errors='replace'))
 if n!=count:errors.append(f'Decoded {n} frames, expected {count}')
 if black:warnings.append(f'{len(black)} near-black frames: review intended fades')
 audio=None
 if expected.get('audioRequired',True) and sound is None:errors.append('Missing audio')
 if sound:
  data=run([ffmpeg,'-v','error','-i',str(video),'-map','0:a:0','-ac','1','-ar','48000','-c:a','pcm_s16le','-f','wav','pipe:1'])
  with wave.open(io.BytesIO(data)) as w:x=np.frombuffer(w.readframes(w.getnframes()),'<i2').astype(float)/32768
  audio={'duration':len(x)/48000,'peak':float(abs(x).max()) if len(x) else 0,'rms':float(np.sqrt(np.mean(x*x))) if len(x) else 0,'pcmSha256':hashlib.sha256(x.tobytes()).hexdigest(),'listeningStatus':'not_reviewed'}
  if abs(audio['duration']-count/fps)>.15:errors.append('Audio duration mismatch')
  if audio['peak']>=.999:errors.append('Decoded audio reaches clipping threshold')
  if audio['rms']<1e-7:warnings.append('Audio is silent; confirm intentional silence')
 return {'passed':not errors,'errors':errors,'warnings':warnings,'decodedFrames':n,'identicalAdjacentFrames':identical,'nearBlackFrames':black,'audio':audio,'criticalFrames':frames,'scope':'Decoded media and selected pixel evidence; no semantic, scientific, subjective listening or full visual approval.'}
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('--video',type=Path,required=True);p.add_argument('--ffmpeg',required=True);p.add_argument('--ffprobe',required=True);p.add_argument('--expected',type=Path,required=True);p.add_argument('--output',type=Path,required=True);a=p.parse_args()
 result=verify(a.video,a.ffmpeg,a.ffprobe,json.loads(a.expected.read_text()),a.output.parent/(a.output.stem+'-frames'));a.output.parent.mkdir(parents=True,exist_ok=True);a.output.write_text(json.dumps(result,indent=2),encoding='utf8');print(json.dumps({'passed':result['passed'],'decodedFrames':result['decodedFrames']}));raise SystemExit(0 if result['passed'] else 1)
