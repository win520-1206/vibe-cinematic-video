import fs from 'node:fs';
import {assetErrors,json,publicPath,hash,tool,run} from './common.mjs';
import {cuesFor,cueWindow,inspectTextPlan} from '../shared/presentation.mjs';
export function inspectBlenderSources(p){const errors=[];for(const e of p.episodes)for(const s of e.scenes)if(s.kind==='blender'){
 try{const m=s.media,files=m.type==='video'?[m.file]:[m.pattern.replace('{frame}',String(m.sourceStartFrame).padStart(m.padding??6,'0')),m.pattern.replace('{frame}',String(m.sourceStartFrame+Math.round((s.end-s.start)*p.video.fps)-1).padStart(m.padding??6,'0'))];
  for(const file of files){const data=JSON.parse(run(tool('ffprobe'),['-v','error','-count_frames','-show_streams','-of','json',publicPath(file)]));const v=data.streams.find(x=>x.codec_type==='video');if(!v||v.width!==p.video.width||v.height!==p.video.height)errors.push(`${s.id}: actual media size differs from contract`);
   if(v&&m.type==='video'){const [a,b]=v.avg_frame_rate.split('/').map(Number);if(Math.abs(a/b-m.fps)>1e-6||Number(v.nb_read_frames)!==m.frames)errors.push(`${s.id}: actual source fps/frame count differs from media declaration`)}
   if(v&&m.type==='sequence'&&!/rgba|yuva|argb|bgra|abgr|gbrap/.test(v.pix_fmt))errors.push(`${s.id}: transparent sequence lacks alpha channel`);
  }
 }catch(err){errors.push(`${s.id}: ${err.message}`)}}return errors}
export function inspectProject(p,{generated=true}={}){
 const errors=assetErrors(p),warnings=[];
 const expected=json('script-manifest.json');
 for(const e of p.episodes){
  const actual=e.scenes.flatMap(s=>s.captions||[]),wanted=expected[e.id];
  if(!Array.isArray(wanted))errors.push(`${e.id}: independent script-manifest missing`);
  else{for(const q of wanted){const match=actual.find(x=>x.id===q.id);if(!match||match.text!==q.text)errors.push(`${e.id}: missing/changed caption ${q.id}`)}for(const q of actual)if(!wanted.some(x=>x.id===q.id))errors.push(`${e.id}: caption not in confirmed manifest ${q.id}`)}
  if(p.presentation.mode==='full-dynamic'){
   for(const s of e.scenes){const plan=inspectTextPlan(s,p.video.fps);errors.push(...plan.errors);warnings.push(...plan.warnings);for(const q of cuesFor(s,p.video.fps)){const win=cueWindow(q,p.video.fps),rate=Array.from(q.text).length/(win.readEnd-win.readStart);if(rate>(p.qa?.maxCharactersPerSecond??12))warnings.push(`${q.id}: reading rate ${rate.toFixed(1)} chars/s in stable window; review`)}}
  }else{
   for(const q of actual){const rate=Array.from(q.text).length/(q.end-q.start);if(rate>(p.qa?.maxCharactersPerSecond??12))warnings.push(`${q.id}: reading rate ${rate.toFixed(1)} chars/s; review`)}
   for(let i=0;i<actual.length;i++)for(let j=i+1;j<actual.length;j++)if(actual[i].start<actual[j].end&&actual[j].start<actual[i].end)errors.push(`${e.id}: overlapping captions ${actual[i].id}/${actual[j].id}`);
  }
  for(const ev of e.events)if(ev.sound&&ev.atSeconds+ev.sound.durationSeconds>e.durationSeconds)errors.push(`${ev.id}: SFX past ending`);
  const points=e.events.filter(ev=>ev.sound).flatMap(ev=>[[ev.atSeconds,1],[ev.atSeconds+ev.sound.durationSeconds,-1]]).sort((a,b)=>a[0]-b[0]||a[1]-b[1]);let n=0;for(const [,d]of points){n+=d;if(n>(p.qa?.maxConcurrentSounds??3))errors.push(`${e.id}: too many concurrent effects`)}
  if(generated){try{const prefix=`generated/${e.id}`,f=json(publicPath(prefix+'-features.json')),cache=json(publicPath(prefix+'-audio-cache.json'));
   if(f.fps!==p.video.fps||f.frames!==e.durationInFrames)errors.push(`${e.id}: feature size/fps mismatch`);
   const audio=e.audio,source=audio.required===false?null:hash(publicPath(audio.file));
   if(cache.spec.sourceHash!==source||cache.spec.fps!==p.video.fps||cache.spec.duration!==e.durationSeconds||JSON.stringify(cache.spec.events)!==JSON.stringify(e.events)||JSON.stringify(cache.spec.audio)!==JSON.stringify(audio))errors.push(`${e.id}: stale music/event cache, run analyze:music`);
   for(const [name,value]of Object.entries(cache.hashes))if(hash(publicPath('generated/'+name))!==value)errors.push(`${name}: generated asset changed`);
   for(const ev of e.events)if(ev.sound?.file&&cache.spec.eventHashes[ev.id]!==hash(publicPath(ev.sound.file)))errors.push(`${ev.id}: stale SFX cache`);
  }catch(err){errors.push(`${e.id}: generated audio missing/invalid: ${err.message}`)}}
 }
 return {errors:[...new Set(errors)],warnings:[...new Set(warnings)]};
}
export function inspectBoxes(row,p){const errors=[];const boxes=row.boxes;
 for(const b of boxes)if(b.overflow||b.x<0||b.y<0||b.x+b.w>p.video.width+1||b.y+b.h>p.video.height+1)errors.push(`${row.episode}/${row.frame}/${b.id}: text outside canvas or overflowing`);
 for(let i=0;i<boxes.length;i++)for(let j=i+1;j<boxes.length;j++){const a=boxes[i],b=boxes[j],intentional=a.overlapGroup&&a.overlapGroup===b.overlapGroup&&(a.phase!=='read'||b.phase!=='read');if(!intentional&&Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x)>2&&Math.min(a.y+a.h,b.y+b.h)-Math.max(a.y,b.y)>2)errors.push(`${row.episode}/${row.frame}: text overlap ${a.id}/${b.id}`)}
 for(const b of boxes)if(b.phase==='read')for(const region of row.protectedRegions||[]){if(b.anchor===region.id)continue;const r={x:region.x*p.video.width,y:region.y*p.video.height,w:region.w*p.video.width,h:region.h*p.video.height};if(Math.min(b.x+b.w,r.x+r.w)-Math.max(b.x,r.x)>2&&Math.min(b.y+b.h,r.y+r.h)-Math.max(b.y,r.y)>2)errors.push(`${row.episode}/${row.frame}: text ${b.id} obscures subject ${region.id}`)}
 return errors;
}
export function inspectTextDensity(rows){const warnings=[];for(const row of rows){const read=row.boxes.filter(b=>b.phase==='read');if(read.filter(b=>b.role==='main'||b.role==='formula').length>1)warnings.push(`${row.episode}/${row.frame}: concurrent primary text`);if(read.length>=3)warnings.push(`${row.episode}/${row.frame}: stacked text layers; review necessity`);const texts=read.map(b=>b.text?.replace(/\s/g,''));if(new Set(texts).size<texts.length)warnings.push(`${row.episode}/${row.frame}: repeated on-screen text`)}return [...new Set(warnings)]}
