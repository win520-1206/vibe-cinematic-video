import {walk,distribution,random} from './model.mjs';
import {ease} from './presentation.mjs';
const clamp=x=>Math.max(0,Math.min(1,x));
export function phases(scene,episode){const ev=episode.events.find(e=>e.id===scene.eventIds?.[0]);const m=scene.motion||{};const begin=m.developStart??Math.max(scene.start,ev?.atSeconds??scene.start);const end=m.developEnd??scene.end-(scene.end-scene.start)*.14;return {begin,end:Math.max(begin+.001,end)}}
function area(ctx){const range=samples(ctx.seed,ctx.scene.model?.samples??160,ctx.scene.model?.steps??24).maxTravel;return ctx.height>ctx.width?{left:.12,right:.88,base:.62,amplitude:.15,range,bottom:.81,top:.43}:{left:.10,right:.90,base:.59,amplitude:.17,range,bottom:.79,top:.40}}
function pose(scene,t,portrait){const p=ease((t-scene.start)/Math.max(.001,(scene.end-scene.start)*.75)),c=scene.motion?.camera||{};const zoom=(c.fromZoom??1.03)+((c.toZoom??.98)-(c.fromZoom??1.03))*p;return {zoom,panX:(c.panX??.015)*(1-p),panY:(c.panY??-.012)*(1-p),yaw:(c.yaw??.05)*Math.sin(p*Math.PI),portrait}}
export function projectPoint(p,camera){const z=p.z??0;return {...p,worldX:p.x,worldY:p.y,x:.5+(p.x-.5)*camera.zoom+camera.panX+z*Math.sin(camera.yaw)*.025,y:.5+(p.y-.5)*camera.zoom+camera.panY}}
function routePoint(seed,index,steps,u,a){const points=walk(seed,index,steps),pos=clamp(u)*steps,k=Math.min(steps-1,Math.floor(pos)),value=points[k]+(points[k+1]-points[k])*(pos-k);return {x:a.left+(a.right-a.left)*pos/steps,y:a.base-value/a.range*a.amplitude,z:(random(seed,index+300)-.5)*.4,value}}
const cache=new Map();
function samples(seed,count,steps){const key=`${seed}/${count}/${steps}`;if(cache.has(key))return cache.get(key);const ranks=new Map();let maxTravel=1;const data=Array.from({length:count},(_,i)=>{const p=walk(seed,i,steps),endpoint=p[p.length-1],rank=ranks.get(endpoint)||0;for(const value of p)maxTravel=Math.max(maxTravel,Math.abs(value));ranks.set(endpoint,rank+1);return {endpoint,rank}});const value={data,max:Math.max(...ranks.values()),maxTravel};if(cache.size>16)cache.clear();cache.set(key,value);return value}
export function motionAt(ctx,time=ctx.time){const s=ctx.scene,a=area(ctx),steps=s.model?.steps??24,count=s.model?.samples??160,range=phases(s,ctx.episode),development=clamp((time-range.begin)/(range.end-range.begin));
 let camera=pose(s,time,ctx.height>ctx.width),trailOpacity=1;const index=ctx.episode.scenes.findIndex(x=>x.id===s.id),previous=ctx.episode.scenes[index-1];
 if(previous){const before=pose(previous,previous.end,ctx.height>ctx.width),blend=ease((time-s.start)/Math.max(.001,(s.end-s.start)*.18));for(const k of ['zoom','panX','panY','yaw'])camera[k]=before[k]+(camera[k]-before[k])*blend;}
 const objects=[],bins=new Map();let arrived=0;let trail=[];
 if(s.kind==='walk'){
  const u=ease(development),point=routePoint(ctx.seed,0,steps,u,a);objects.push({id:'walker-0',...point,arrived:false});const points=walk(ctx.seed,0,steps);trail=points.slice(0,Math.floor(u*steps)+1).map((v,i)=>({x:a.left+(a.right-a.left)*i/steps,y:a.base-v/a.range*a.amplitude,z:point.z}));trail.push(point);
 }else if(s.kind==='distribution'){
  if(previous?.kind==='walk'){const points=walk(ctx.seed,0,previous.model.steps);trail=points.map((v,i)=>({x:a.left+(a.right-a.left)*i/previous.model.steps,y:a.base-v/a.range*a.amplitude,z:(random(ctx.seed,300)-.5)*.4}));trailOpacity=1-ease((time-s.start)/Math.max(.001,(s.end-s.start)*.18));}
  const source=samples(ctx.seed,count,steps),span=range.end-range.begin,travel=span*.5;
  for(let i=0;i<count;i++){
   const launch=range.begin+span*.5*i/Math.max(1,count-1),u=clamp((time-launch)/travel),sample=source.data[i],target={x:.5+sample.endpoint/steps*(a.right-a.left)/2,y:a.bottom-(sample.rank+.5)/(source.max+1)*(a.bottom-a.top),z:0};
   if(time<launch&&i!==0)continue;
   let point;if(i===0&&previous?.kind==='walk'){const start=routePoint(ctx.seed,0,previous.model.steps,1,a),f=ease(u);point={x:start.x+(target.x-start.x)*f,y:start.y+(target.y-start.y)*f,z:start.z*(1-f)}}else if(u<.6)point=routePoint(ctx.seed,i,steps,u/.6,a);else{const start=routePoint(ctx.seed,i,steps,1,a),f=ease((u-.6)/.4);point={x:start.x+(target.x-start.x)*f,y:start.y+(target.y-start.y)*f,z:start.z*(1-f)}}
   const done=time>=launch+travel;objects.push({id:`walker-${i}`,...point,arrived:done,endpoint:sample.endpoint});if(done){arrived++;bins.set(sample.endpoint,(bins.get(sample.endpoint)||0)+1)}
  }
 }
 const plotted=objects.map(o=>projectPoint(o,camera));return {camera,objects:plotted,trail:trail.map(p=>projectPoint(p,camera)),trailOpacity,bins:[...bins].sort((x,y)=>x[0]-y[0]),arrived,total:count,steps,area:a,phase:time<range.begin?'prepare':time<range.end?'develop':'hold',expected:s.kind==='blender'?'media':s.motion?.expect??'subject',development,protectedRegions:plotted.filter(o=>!o.arrived).slice(0,16).map(o=>({id:o.id,x:o.x-.012,y:o.y-.018,w:.024,h:.036}))};
}
export function motionProbe(state){return {phase:state.phase,expected:state.expected,subject:state.objects.slice(0,16).map(o=>({id:o.id,x:o.worldX,y:o.worldY})),arrived:state.arrived,camera:state.camera,decorationOnly:false}}
export function inspectMotion(rows){const warnings=[];const groups=new Map();for(const r of rows)if(r.motion?.phase==='develop'){const key=r.episode+'/'+r.scene;if(!groups.has(key))groups.set(key,[]);groups.get(key).push(r)}for(const [key,a]of groups){if(a.length<2)continue;const first=a[0],last=a[a.length-1];if(last.frame===first.frame||first.motion.expected==='hold')continue;const base=new Map(first.motion.subject.map(o=>[o.id,o]));let displacement=0;for(const row of a)for(const o of row.motion.subject){const start=base.get(o.id);if(start)displacement=Math.max(displacement,Math.hypot(o.x-start.x,o.y-start.y))}const counts=new Set(a.map(r=>r.motion.arrived));if(displacement<.001&&counts.size===1&&first.motion.expected==='subject')warnings.push(`${key}: subject static during declared development; background/camera alone is insufficient`)}return warnings}
