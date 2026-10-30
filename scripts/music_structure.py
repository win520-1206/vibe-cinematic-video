"""Estimate editing beats and climax candidates from frame-level audio features."""
import argparse,json,math
from pathlib import Path
import numpy as np

def analyze(data):
    fps=float(data['fps']);duration=float(data['duration']);bands=data['bands'];n=len(bands['bass'])
    if fps<=0 or n<2:raise ValueError('Not enough frame-level audio data')
    bass=np.asarray(bands['bass'],float);air=np.asarray(bands['air'],float);body=np.asarray(bands['body'],float);rms=np.asarray(data['rms'],float)
    if any(len(v)!=n for v in [air,body,rms]):raise ValueError('Audio feature lengths differ')
    flux=np.maximum(0,np.diff(bass,prepend=bass[0]))+.65*np.maximum(0,np.diff(air,prepend=air[0]))+.2*np.maximum(0,np.diff(body,prepend=body[0]))
    active=float(np.max(rms))>1e-7 and float(np.max(flux))>1e-7
    candidates=[]
    if active:
        for lag in range(max(2,round(fps*60/180)),min(n//2,round(fps*60/60))+1):
            a,b=flux[:-lag],flux[lag:];den=np.linalg.norm(a)*np.linalg.norm(b);corr=float(np.dot(a,b)/den) if den>1e-12 else 0.
            bpm=60*fps/lag;candidates.append({'bpm':round(bpm,3),'periodFrames':lag,'periodicityScore':round(corr,5)})
        candidates.sort(key=lambda x:(x['periodicityScore'], -abs(x['bpm']-110)),reverse=True)
    selected=candidates[0] if candidates else None;beats=[]
    peaks=[i for i in range(1,n-1) if flux[i]>max(.03,float(np.percentile(flux,75))) and flux[i]>flux[i-1] and flux[i]>=flux[i+1]]
    if selected:
        period=selected['periodFrames'];phase=max(range(period),key=lambda phase:float(sum(flux[phase::period])));radius=max(1,round(period*.16))
        for i in range(phase,n,period):
            lo=max(0,i-radius);hi=min(n,i+radius+1);j=lo+int(np.argmax(flux[lo:hi]));matched=j in peaks
            beats.append({'atSeconds':round((j if matched else i)/fps,6),'strength':round(float(flux[j]),5),'source':'transient_aligned' if matched else 'estimated_grid'})
    def norm(v):
        q=float(np.percentile(v,95));return np.clip(v/q,0,1.5) if q>1e-10 else np.zeros_like(v)
    # Continuous sustained energy, high-frequency activity and density; never a semantic guarantee.
    width=min(n,max(1,round(fps*2)));kernel=np.ones(width)/width
    envelope=np.convolve(norm(rms),kernel,'same');density=np.convolve(norm(flux),kernel,'same');high=np.convolve(norm(air),kernel,'same')
    score=.65*envelope+.2*density+.15*high
    span=min(duration,max(3,min(12,duration*.12)));length=max(1,round(span*fps));windows=[]
    for start in range(0,max(1,n-length+1),max(1,round(fps))):
        windows.append({'startSeconds':round(start/fps,6),'endSeconds':round(min(duration,(start+length)/fps),6),'score':round(float(np.mean(score[start:start+length])),5)})
    climaxes=[]
    if active:
        for w in sorted(windows,key=lambda w:w['score'],reverse=True):
            if all(w['endSeconds']<=old['startSeconds'] or w['startSeconds']>=old['endSeconds'] for old in climaxes):climaxes.append(w)
            if len(climaxes)==3:break
    step=max(1,round(fps*4));sections=[]
    for i in range(step,n-step,step):
        novelty=abs(float(envelope[i:i+step].mean()-envelope[i-step:i].mean()))+abs(float(high[i:i+step].mean()-high[i-step:i].mean()))*.3
        sections.append({'atSeconds':round(i/fps,6),'changeScore':round(novelty,5)})
    changes=sorted(sections,key=lambda s:s['changeScore'],reverse=True)[:6]
    distinct=[]
    for c in candidates:
        if all(abs(c['bpm']-v['bpm'])>6 for v in distinct):distinct.append(c)
        if len(distinct)==3:break
    return {'schemaVersion':1,'source':data.get('source'),'fps':fps,'duration':duration,'tempo':{'estimatedBpm':selected['bpm'] if selected else None,'candidates':distinct,'confidence':'candidate_only','caveat':'Half/double tempo ambiguity and tempo changes require review.'},'beatGrid':beats,'transientCandidates':[{'atSeconds':round(i/fps,6),'strength':round(float(flux[i]),5)} for i in peaks],'sectionChangeCandidates':sorted(changes,key=lambda x:x['atSeconds']),'climaxCandidates':climaxes,'listeningStatus':'not_reviewed','limitations':['Signal-derived suggestions, not instrument or semantic recognition.','Beat grid may include non-percussive accents; verify drums by listening.','Climax candidates are sustained-energy suggestions; review musical structure.','Recompute after changing song, crop, timing or playback speed.']}

def main():
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--features',required=True,type=Path);p.add_argument('--output',required=True,type=Path);a=p.parse_args()
    try:r=analyze(json.loads(a.features.read_text(encoding='utf8')))
    except (OSError,ValueError,KeyError) as e:p.exit(2,f'Music structure analysis failed: {e}\n')
    a.output.parent.mkdir(parents=True,exist_ok=True);a.output.write_text(json.dumps(r,ensure_ascii=False,indent=2,allow_nan=False),encoding='utf8');print(json.dumps({'duration':r['duration'],'bpmCandidate':r['tempo']['estimatedBpm'],'beats':len(r['beatGrid']),'climaxCandidates':r['climaxCandidates']}))
if __name__=='__main__':main()
