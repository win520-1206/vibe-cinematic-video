"""PCM WAV -> frame-aligned energy; not ASR, stems or verified beat detection."""
import argparse,json,math,wave
from pathlib import Path
import numpy as np

def analyze(path,fps):
    if not math.isfinite(fps) or fps<=0:raise ValueError('fps must be finite and positive')
    with wave.open(str(path),'rb') as w:
        sr=w.getframerate();channels=w.getnchannels();width=w.getsampwidth();raw=w.readframes(w.getnframes())
    if width==1:x=(np.frombuffer(raw,np.uint8).astype(float)-128)/128
    elif width==2:x=np.frombuffer(raw,'<i2').astype(float)/32768
    elif width==3:
        b=np.frombuffer(raw,np.uint8).reshape(-1,3).astype(np.int32)
        v=b[:,0]|(b[:,1]<<8)|(b[:,2]<<16);x=np.where(v&0x800000,v-0x1000000,v).astype(float)/8388608
    elif width==4:x=np.frombuffer(raw,'<i4').astype(float)/2147483648
    else:raise ValueError('Input must be integer PCM WAV, 8/16/24/32 bit')
    if not x.size:raise ValueError('Empty WAV')
    mono=x.reshape(-1,channels).mean(axis=1);duration=len(mono)/sr;count=math.ceil(len(mono)*fps/sr)
    nfft=2**max(8,int(math.ceil(math.log2(sr*.045))));freq=np.fft.rfftfreq(nfft,1/sr);window=np.hanning(nfft)
    limits={'bass':(35,180),'body':(180,1800),'air':(2500,min(10000,sr/2))}
    masks={k:(freq>=lo)&(freq<hi) for k,(lo,hi) in limits.items()};bands={k:[] for k in limits};rms=[]
    for f in range(count):
        lo=int(f*sr/fps);hi=min(len(mono),int((f+1)*sr/fps));sample=mono[lo:hi]
        rms.append(float(np.sqrt(np.mean(sample**2))) if len(sample) else 0.)
        start=max(0,lo-nfft//2);segment=np.zeros(nfft);src=mono[start:start+nfft];segment[:len(src)]=src;spectrum=abs(np.fft.rfft(segment*window))
        for k,mask in masks.items():bands[k].append(float(np.sqrt(np.mean(spectrum[mask]**2))) if mask.any() else 0.)
    for k,values in bands.items():
        arr=np.array(values);scale=float(np.percentile(arr,96));v=0.;smooth=[]
        for z in arr:
            goal=min(float(z)/scale,1.6) if scale>1e-10 else 0.
            v+=(goal-v)*(.65 if goal>v else .16);smooth.append(round(v,6))
        bands[k]=smooth
    flux=np.maximum(0,np.diff(bands['air'],prepend=0))+.6*np.maximum(0,np.diff(bands['bass'],prepend=0))
    candidates=[i for i in range(1,count-1) if flux[i]>.1 and flux[i]>flux[i-1] and flux[i]>=flux[i+1]];chosen=[];gap=max(1,round(fps*.3))
    for i in sorted(candidates,key=lambda i:float(flux[i]),reverse=True):
        if all(abs(i-j)>=gap for j in chosen):chosen.append(i)
    return {'schemaVersion':1,'source':str(Path(path).resolve()),'fps':fps,'sampleRate':sr,'channels':channels,'duration':duration,'frames':count,'bands':bands,'rms':[round(v,7) for v in rms],'onsets':[{'frame':i,'time':round(i/fps,6),'strength':round(float(flux[i]),6)} for i in sorted(chosen)],'limitations':'Energy/onset candidates only; no speech recognition, source separation or verified musical beat labels.'}

def main():
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--input',required=True,type=Path);p.add_argument('--fps',type=float,default=30);p.add_argument('--output',required=True,type=Path);a=p.parse_args()
    try:result=analyze(a.input,a.fps)
    except (ValueError,wave.Error,OSError) as e:p.exit(2,f'Audio analysis failed: {e}\n')
    a.output.parent.mkdir(parents=True,exist_ok=True);a.output.write_text(json.dumps(result,ensure_ascii=False,allow_nan=False),encoding='utf8');print(json.dumps({k:result[k] for k in ['duration','fps','frames','sampleRate','channels']}))
if __name__=='__main__':main()
