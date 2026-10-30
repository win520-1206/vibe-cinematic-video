"""Check ffprobe metadata against a project contract; does not fully decode media."""
import argparse,json,subprocess
from pathlib import Path
from fractions import Fraction

def inspect(ffprobe,path,contract):
    r=subprocess.run([str(ffprobe),'-v','error','-show_streams','-show_format','-of','json',str(path)],capture_output=True,text=True,encoding='utf8')
    if r.returncode:raise RuntimeError(r.stderr.strip() or f'ffprobe exit {r.returncode}')
    meta=json.loads(r.stdout);streams=meta.get('streams',[]);video=next((v for v in streams if v.get('codec_type')=='video'),None);audio=[v for v in streams if v.get('codec_type')=='audio'];checks=[]
    def check(name,ok,actual,expected):checks.append({'name':name,'passed':bool(ok),'actual':actual,'expected':expected})
    check('video_present',video is not None,video is not None,True)
    cfg=contract.get('video',{});fps=Fraction(str(cfg.get('fps',30)));duration=cfg.get('durationSeconds');cuts=[]
    if fps<=0:raise ValueError('fps must be positive')
    if video:
        for key in ['width','height']:
            if key in cfg:check(key,int(video.get(key,0))==cfg[key],video.get(key),cfg[key])
        actual_fps=Fraction(video.get('avg_frame_rate','0/1'))
        if 'fps' in cfg:check('fps',abs(float(actual_fps-fps))<1e-5,str(actual_fps),str(fps))
        d=float(video.get('duration',meta.get('format',{}).get('duration',0)))
        if duration is not None:check('video_duration',abs(d-float(duration))<=1/float(fps)+.002,d,duration)
        frames=video.get('nb_frames')
        if duration is not None:
            expected=Fraction(str(duration))*fps
            if expected.denominator!=1:raise ValueError('durationSeconds * fps must be an integer for exact-frame checks')
            if frames and str(frames).isdigit():check('metadata_frame_count',int(frames)==int(expected),int(frames),int(expected))
    sound=contract.get('audio',{})
    if sound.get('required',True):check('audio_present',len(audio)>0,len(audio),'>=1')
    if audio:
        for key in ['sample_rate','channels']:
            if key in sound:check('audio_'+key,int(audio[0].get(key,0))==sound[key],audio[0].get(key),sound[key])
        ad=audio[0].get('duration')
        if ad is not None and duration is not None:check('audio_duration',abs(float(ad)-float(duration))<=.15,float(ad),duration)
    for event in contract.get('keyEvents',[]):
        instant=Fraction(str(event['atSeconds']))*fps;exact=instant.denominator==1;check('event_frame_alignment:'+event['id'],exact,str(instant),'integer frame')
        if exact:cuts.append({'id':event['id'],'atSeconds':event['atSeconds'],'lastPreviousFrame':int(instant)-1,'firstNextFrame':int(instant)})
    return {'schemaVersion':1,'input':str(Path(path).resolve()),'passed':all(c['passed'] for c in checks),'scope':'Metadata and contract only. Full decoding, visual evidence, scientific correctness and listening are separate.','checks':checks,'eventFrames':cuts,'metadata':meta}

def main():
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--ffprobe',required=True);p.add_argument('--input',required=True,type=Path);p.add_argument('--contract',type=Path);p.add_argument('--output',required=True,type=Path);a=p.parse_args()
    try:result=inspect(a.ffprobe,a.input,json.loads(a.contract.read_text(encoding='utf8')) if a.contract else {})
    except (ValueError,OSError,RuntimeError,ZeroDivisionError) as e:p.exit(2,f'Media inspection failed: {e}\n')
    a.output.parent.mkdir(parents=True,exist_ok=True);a.output.write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf8');print(json.dumps({'passed':result['passed'],'checks':len(result['checks']),'output':str(a.output)}));raise SystemExit(0 if result['passed'] else 1)
if __name__=='__main__':main()
