// Text is authored against the independent script, not inferred from rendered pixels.
export const ease=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x)};
export function splitPhrases(text){return text.match(/[^，。！？；,.!?;]+[，。！？；,.!?;]?|[，。！？；,.!?;]/gu)||[text]}
export function defaultCues(scene,fps){
 const cues=[];
 for(const source of scene.captions||[]){const parts=splitPhrases(source.text),total=Array.from(source.text).length;let consumed=0,previous=Math.round(source.start*fps);
  parts.forEach((text,i)=>{consumed+=Array.from(text).length;const end=i===parts.length-1?Math.round(source.end*fps):Math.round(source.start*fps+(source.end-source.start)*fps*consumed/total);const span=(end-previous)/fps;
   cues.push({id:`${source.id}-part-${i+1}`,sourceId:source.id,text,start:previous/fps,end:end/fps,role:'main',placement:i%2?'right':'left',effect:i%2?'path':'mask',enterSeconds:Math.min(.25,span*.18),exitSeconds:Math.min(.18,span*.15),eventId:source.eventId,emphasis:source.emphasis});previous=end;
  });
 }
 return cues;
}
export const cuesFor=(scene,fps)=>scene.textCues??[...defaultCues(scene,fps),...(scene.annotations||[]).map(q=>({...q,annotation:true}))];
export function cueWindow(cue,fps){const span=cue.end-cue.start;return {readStart:cue.start+(cue.enterSeconds??Math.min(.25,span*.18)),readEnd:cue.end-(cue.exitSeconds??Math.min(.18,span*.15))}}
export function cuePhase(cue,time,fps){const {readStart,readEnd}=cueWindow(cue,fps);const enter=ease((time-cue.start)/Math.max(1e-9,readStart-cue.start)),exit=ease((time-readEnd)/Math.max(1e-9,cue.end-readEnd));return {phase:time<readStart?'enter':time<readEnd?'read':'exit',enter,exit,opacity:enter*(1-exit),readStart,readEnd}}
export function textLayout(cue,ctx,state,anchorState=state){
 const portrait=ctx.height>ctx.width,role=cue.role||'main',placement=cue.placement||'left';let x,y,width,align;
 if(placement==='anchor'){const target=anchorState.objects.find(o=>o.id===cue.anchor?.id);if(!target)throw Error(`Missing text anchor ${cue.anchor?.id}`);width=cue.width??.30;x=Math.max(.04,Math.min(.96-width,target.x+(cue.anchor.offset?.x??.04)));y=Math.max(.04,Math.min(.90,target.y+(cue.anchor.offset?.y??-.12)));align='left'}
 else{const positions={left:[.08,portrait?.12:.15,.62,'left'],right:[.40,portrait?.20:.15,.52,'right'],center:[.12,.14,.76,'center'],bottom:[.10,.83,.80,'center']};[x,y,width,align]=positions[placement]||positions.left;if(portrait&&placement==='right'){x=.16;width=.76}if(portrait&&placement==='left')width=.78;}
 x=cue.x??x;y=cue.y??y;width=cue.width??width;
 const phase=cuePhase(cue,ctx.time,ctx.fps),style=cue.effect||'mask';let dx=0,dy=0,scale=1,clip=0;
 if(style==='mask')clip=(1-phase.enter)*100;
 if(style==='relay'){dy=(1-phase.enter)*.025-phase.exit*.015;scale=1-.035*(1-phase.enter)}
 if(style==='path'){const path=cue.path??[{x:-.05,y:.035},{x:0,y:0}];const a=path[0],b=path[path.length-1];dx=a.x+(b.x-a.x)*phase.enter;dy=a.y+(b.y-a.y)*phase.enter;}
 if(style==='emphasis')scale=1+.07*(1-phase.enter);
 const base=role==='main'?Math.min(ctx.width*(portrait?.074:.048),ctx.height*.060):role==='formula'?Math.min(ctx.width*.065,ctx.height*.065):Math.min(ctx.width*.035,ctx.height*.029);
 return {x:(x+dx)*ctx.width,y:(y+dy)*ctx.height,width:width*ctx.width,fontSize:base*(cue.fontScale??1),align,scale,clip,...phase};
}
export function inspectTextPlan(scene,fps){const errors=[],warnings=[],cues=cuesFor(scene,fps),sources=scene.captions||[];
 const ids=new Set();for(const q of cues){if(!q.id||ids.has(q.id))errors.push(`${scene.id}: duplicate/missing text cue ID`);ids.add(q.id);
  if(typeof q.text!=='string'||!q.text.length||!Number.isFinite(q.start)||!Number.isFinite(q.end)||q.start<scene.start||q.end>scene.end||q.end<=q.start)errors.push(`${q.id}: invalid text window`);
  if(!['main','label','formula'].includes(q.role||'main'))errors.push(`${q.id}: invalid text role`);
  if(!['left','right','center','bottom','anchor'].includes(q.placement||'left'))errors.push(`${q.id}: invalid text placement`);
  if(!['mask','relay','path','follow','emphasis','none'].includes(q.effect||'mask'))errors.push(`${q.id}: unknown text effect`);
  for(const k of ['start','end'])if(!Number.isFinite(q[k]*fps)||Math.abs(q[k]*fps-Math.round(q[k]*fps))>1e-6)errors.push(`${q.id}: text not frame aligned`);
  for(const key of ['enterSeconds','exitSeconds'])if(q[key]!==undefined&&(!Number.isFinite(q[key])||q[key]<0))errors.push(`${q.id}: invalid animation duration`);
  for(const key of ['x','y','width','fontScale'])if(q[key]!==undefined&&!Number.isFinite(q[key]))errors.push(`${q.id}: invalid ${key}`);
  if(q.width!==undefined&&q.width<=0||q.fontScale!==undefined&&q.fontScale<=0)errors.push(`${q.id}: nonpositive text dimensions`);
  const win=cueWindow(q,fps);if(!Number.isFinite(win.readEnd-win.readStart)||win.readEnd-win.readStart<1/fps)errors.push(`${q.id}: no stable reading window`);
  if(q.placement==='anchor'&&(!q.anchor?.id||!/^walker-\d+$/.test(q.anchor.id)))errors.push(`${q.id}: missing/unknown anchor`);
  if(q.effect==='follow'&&q.placement!=='anchor')errors.push(`${q.id}: follow effect requires an object anchor`);
  if(q.sourceId&&!sources.some(c=>c.id===q.sourceId))errors.push(`${q.id}: unknown sourceId`);
  if(!q.sourceId&&!q.annotation)errors.push(`${q.id}: untraced text; reference script source or mark annotation`);
  if(q.path&&(!Array.isArray(q.path)||q.path.length!==2||q.path.some(v=>!Number.isFinite(v.x)||!Number.isFinite(v.y))))errors.push(`${q.id}: path requires finite start/end offsets`);
 }
 for(const source of sources){const parts=cues.filter(q=>q.sourceId===source.id).sort((a,b)=>a.start-b.start);if(parts.map(q=>q.text).join('')!==source.text)errors.push(`${source.id}: dynamic fragments omit, duplicate or change confirmed text`);if(parts.some(q=>q.start<source.start||q.end>source.end))errors.push(`${source.id}: fragments exceed source window`);}
 for(let i=0;i<cues.length;i++)for(let j=i+1;j<cues.length;j++){const a=cues[i],b=cues[j];if(a.start<b.end&&b.start<a.end){const aw=cueWindow(a,fps),bw=cueWindow(b,fps),bothRead=aw.readStart<bw.readEnd&&bw.readStart<aw.readEnd;const intentional=a.overlapGroup&&a.overlapGroup===b.overlapGroup&&!bothRead;if((a.role||'main')!=='label'&&(b.role||'main')!=='label'&&!intentional)errors.push(`${a.id}/${b.id}: concurrent main text`);}}
 if(cues.some(q=>q.annotation&&q.text===scene.title))warnings.push(`${scene.id}: separate title repeats scene metadata; review redundancy`);
 return {errors,warnings};
}
