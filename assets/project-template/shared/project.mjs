// Shared by Node tools and the browser. Times are absolute episode seconds.
import {cuesFor,cueWindow,inspectTextPlan,textLayout} from './presentation.mjs';
import {motionAt} from './motion.mjs';
export const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
export const progress = (t, a, b) => clamp((t-a)/Math.max(1e-9,b-a));
export function frameAt(seconds, fps) {
  const f = seconds * fps;
  if (!Number.isFinite(f) || Math.abs(f-Math.round(f)) > 1e-6) throw Error(`Time ${seconds} is not aligned to fps ${fps}`);
  return Math.round(f);
}
export function normalize(raw) {
  const errors=[];
  const need=(ok,msg)=>{if(!ok)errors.push(msg)};
  const v=raw.video||{};
  for(const k of ['width','height'])need(Number.isInteger(v[k])&&v[k]>=64&&v[k]%2===0,`video.${k}: provide an even integer >=64`);
  need(Number.isFinite(v.fps)&&v.fps>0, 'video.fps: missing or invalid');
  need(Number.isInteger(raw.project?.episodeCount)&&raw.project.episodeCount>0,'project.episodeCount: missing or invalid');
  need(Array.isArray(raw.episodes)&&raw.episodes.length===raw.project?.episodeCount,'episodes must match episodeCount');
  need(!raw.presentation?.mode||['legacy','full-dynamic'].includes(raw.presentation.mode),'Unknown presentation mode');
  if(errors.length)throw Error(errors.join('\n'));
  const ids=new Set();
  const episodes=raw.episodes.map((e)=>{
    const duration=e.durationSeconds??v.durationSeconds;
    need(typeof e.id==='string'&&/^[A-Za-z][A-Za-z0-9-]*$/.test(e.id)&&!ids.has(e.id),'Episode IDs must be unique ASCII composition IDs');ids.add(e.id);
    need(Number.isFinite(duration)&&duration>0,`${e.id}: duration missing`);
    let frames=0;try{frames=frameAt(duration,v.fps)}catch(x){errors.push(x.message)}
    const events=(e.events||[]).map(x=>({...x}));const eventIds=new Set();
    for(const x of events){need(x.id&&!eventIds.has(x.id),`${e.id}: duplicate/missing event ID`);eventIds.add(x.id);
      need(Number.isFinite(x.atSeconds)&&x.atSeconds>=0&&x.atSeconds<duration,`${e.id}/${x.id}: event outside episode`);
      try{frameAt(x.atSeconds,v.fps)}catch(err){errors.push(err.message)}
      if(x.sound)need(Number.isFinite(x.sound.gainDb)&&x.sound.gainDb<=0&&x.sound.durationSeconds>0,`${x.id}: invalid sound`);
    }
    const scenes=(e.scenes||[]).map(s=>({...s}));need(scenes.length>0,`${e.id}: no scenes`);
    let cursor=0;const sceneIds=new Set();const captionIds=new Set();
    for(const s of scenes){
      need(s.id&&!sceneIds.has(s.id),`${e.id}: duplicate/missing scene ID`);sceneIds.add(s.id);
      need(Math.abs(s.start-cursor)<1e-7&&s.end>s.start,`${e.id}/${s.id}: gap, overlap or reversed scene`);cursor=s.end;
      need(['walk','distribution','blender'].includes(s.kind),`${s.id}: implement/register scene kind ${s.kind}`);
      if(s.kind!=='blender'){
        need(Number.isInteger(s.model?.steps)&&s.model.steps>0&&s.model.steps<=10000,`${s.id}: model.steps must be 1..10000`);
        need(Number.isInteger(s.model?.samples)&&s.model.samples>0&&s.model.samples<=100000,`${s.id}: model.samples must be 1..100000`);
      }
      for(const k of ['start','end'])try{frameAt(s[k],v.fps)}catch(x){errors.push(x.message)}
      for(const k of ['object','action','before','after','understanding','science'])need(typeof s[k]==='string'&&s[k].trim(),`${s.id}: missing storyboard ${k}`);
      if(s.kind==='blender'){
        const m=s.media||{};need(m.type==='video'||m.type==='sequence',`${s.id}: Blender media type required`);
        need(m.fps===v.fps&&Number.isInteger(m.frames)&&m.frames>=frameAt(s.end-s.start,v.fps),`${s.id}: Blender fps/frame count mismatch`);
        need(m.sourceStartFrame>=0&&Number.isInteger(m.sourceStartFrame),`${s.id}: sourceStartFrame required`);
        if(m.type==='video')need(m.sourceStartFrame+Math.round((s.end-s.start)*v.fps)<=m.frames,`${s.id}: video trim exceeds source frames`);
        need(m.type==='video'?!!m.file:!!m.pattern?.includes('{frame}'),`${s.id}: Blender media path required`);
        need(!!s.blender?.benefit&&!!s.blender?.cost,`${s.id}: document Blender benefit and cost`);
      }
      for(const q of s.captions||[]){need(q.id&&!captionIds.has(q.id),`${e.id}: duplicate caption ID`);captionIds.add(q.id);
        need(typeof q.text==='string'&&q.text.trim()&&q.start>=s.start&&q.end<=s.end&&q.end>q.start,`${s.id}/${q.id}: invalid caption`);
        for(const k of ['start','end'])try{frameAt(q[k],v.fps)}catch(x){errors.push(x.message)}
        if(q.eventId)need(eventIds.has(q.eventId),`${q.id}: missing event ${q.eventId}`);
      }
      for(const id of s.eventIds||[])need(eventIds.has(id),`${s.id}: missing event ${id}`);
      if(raw.presentation?.mode==='full-dynamic'){
        errors.push(...inspectTextPlan(s,v.fps).errors);
        for(const q of cuesFor(s,v.fps)){
          if(q.eventId)need(eventIds.has(q.eventId),`${q.id}: unknown cue event`);
          if(q.anchor?.id){const index=Number(q.anchor.id.split('-')[1]);need(index>=0&&index<(s.kind==='walk'?1:s.model?.samples??0),`${q.id}: anchor does not belong to subject`);}
        }
        if(s.motion?.developStart!==undefined||s.motion?.developEnd!==undefined){need(s.motion.developStart>=s.start&&s.motion.developEnd<=s.end&&s.motion.developEnd>s.motion.developStart,`${s.id}: invalid motion stages`)}
      }
    }
    need(Math.abs(cursor-duration)<1e-7,`${e.id}: scenes do not end at duration`);
    const audio={...raw.audio,...e.audio};
    return {...e,durationSeconds:duration,durationInFrames:frames,scenes,events,audio};
  });
  if(errors.length)throw Error(errors.join('\n'));
  return {...raw,video:v,episodes,presentation:{mode:'legacy',...raw.presentation},style:{background:'#050b12',warm:'#dfbf83',cool:'#9bc9e3',text:'#f1eee8',fontFamily:'sans-serif',...(raw.style?.tokens||{})},seed:raw.seed??137};
}
export function atFrame(project,episode,frame,features){
  const time=frame/project.video.fps;const scene=episode.scenes.find(s=>time>=s.start&&time<s.end);
  if(!scene)throw Error(`No scene at ${frame}`);
  const event=(id)=>episode.events.find(e=>e.id===id);
  const signal=(name)=>features?.bands?.[name]?.[frame]??0;
  return {frame,fps:project.video.fps,width:project.video.width,height:project.video.height,time,localTime:time-scene.start,
    scene,episode,seed:project.seed,style:project.style,signal,event};
}
export function criticalFrames(project,e){
  const out=new Set([0,e.durationInFrames-1]);
  const add=t=>{const f=Math.round(t*project.video.fps);for(const n of [f-1,f,f+1])if(n>=0&&n<e.durationInFrames)out.add(n)};
  for(const s of e.scenes){add(s.start);add(s.end);out.add(Math.floor((s.start+s.end)/2*project.video.fps));for(const q of s.captions||[])out.add(Math.floor((q.start+q.end)/2*project.video.fps));}
  if(project.presentation?.mode==='full-dynamic')for(const s of e.scenes){
    for(const q of cuesFor(s,project.video.fps)){const win=cueWindow(q,project.video.fps);for(const t of [q.start,win.readStart,win.readEnd,q.end,(win.readStart+win.readEnd)/2,q.start+(win.readStart-q.start)*.25,q.start+(win.readStart-q.start)*.75])add(t);
      if(q.placement==='anchor'){
        const extrema={minX:[Infinity,0],maxX:[-Infinity,0],minY:[Infinity,0],maxY:[-Infinity,0]};
        for(let f=Math.ceil(q.start*project.video.fps);f<Math.min(e.durationInFrames,q.end*project.video.fps);f++){
          const ctx=atFrame(project,e,f,null),state=motionAt(ctx),anchor=q.role==='label'?state:motionAt(ctx,Math.max(q.start,Math.min(ctx.time,win.readStart)));if(!anchor.objects.some(o=>o.id===q.anchor?.id))continue;const box=textLayout(q,ctx,state,anchor);
          for(const [key,value,less]of [['minX',box.x,true],['maxX',box.x,false],['minY',box.y,true],['maxY',box.y,false]])if(less?value<extrema[key][0]:value>extrema[key][0])extrema[key]=[value,f];
        }
        for(const pair of Object.values(extrema))if(Number.isFinite(pair[0]))out.add(pair[1]);
      }
    }
    const motion=s.motion||{};for(const fraction of [.12,.3,.5,.7,.9])add(s.start+(s.end-s.start)*fraction);for(const t of [motion.developStart,motion.developEnd])if(Number.isFinite(t))add(t);
  }
  for(const ev of e.events)add(ev.atSeconds);
  return [...out].sort((a,b)=>a-b);
}
