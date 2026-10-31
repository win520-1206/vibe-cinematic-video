import React,{useLayoutEffect,useState,useRef} from 'react';
import {AbsoluteFill,Audio,OffthreadVideo,Img,Sequence,staticFile,useCurrentFrame,delayRender,continueRender,cancelRender} from 'remotion';
import {atFrame} from '../shared/project.mjs';
import {SpatialLayer} from './SpatialLayer';
import {ScienceLayer} from './ScienceLayer';
export function Film({project,episode}:any){
 const frame=useCurrentFrame(),[ready]=useState(()=>delayRender('Load music features and fonts')),[features,setFeatures]=useState<any>(null),root=useRef<HTMLDivElement>(null);
 useLayoutEffect(()=>{let live=true;(async()=>{try{if(project.fontFile){const face=new FontFace('ProjectFont',`url(${staticFile(project.fontFile)})`);await face.load();document.fonts.add(face)}await document.fonts.ready;const r=await fetch(staticFile(`generated/${episode.id}-features.json`));if(!r.ok)throw Error('Run npm run analyze:music before rendering');const data=await r.json();if(data.fps!==project.video.fps||data.frames!==episode.durationInFrames)throw Error('Music features do not match composition');if(live){setFeatures(data);continueRender(ready)}}catch(e){cancelRender(e as Error)}})();return()=>{live=false}},[project,episode,ready]);
 const ctx=atFrame(project,episode,frame,features),s=ctx.scene;
 useLayoutEffect(()=>{if(!features)return;const rect=root.current!.getBoundingClientRect();const boxes=Array.from(root.current!.querySelectorAll<HTMLElement>('[data-label]')).map(el=>{const r=el.getBoundingClientRect();const scale=project.video.width/rect.width;return {id:el.dataset.label,text:el.textContent,x:(r.x-rect.x)*scale,y:(r.y-rect.y)*scale,w:r.width*scale,h:r.height*scale,overflow:el.scrollWidth>el.clientWidth+1}});
  console.log('VIBE_QA:'+JSON.stringify({episode:episode.id,frame,scene:s.id,boxes,model:{seed:ctx.seed,steps:s.model?.steps,samples:s.model?.samples},webgl:s.kind!=='blender'}));
 },[frame,features,project,episode,s,ctx.seed]);
 const caps=(s.captions||[]).filter((q:any)=>ctx.time>=q.start&&ctx.time<q.end);
 const m=s.media,mediaFrame=m?m.sourceStartFrame+frame-Math.round(s.start*ctx.fps):0;
 return <AbsoluteFill ref={root} style={{background:project.style.background,color:project.style.text,fontFamily:project.fontFile?'ProjectFont':project.style.fontFamily}}>
  {s.kind==='blender'?m.type==='video'?<Sequence from={Math.round(s.start*ctx.fps)} durationInFrames={Math.round((s.end-s.start)*ctx.fps)}><OffthreadVideo src={staticFile(m.file)} startFrom={m.sourceStartFrame} muted style={{width:'100%',height:'100%',objectFit:'contain'}}/></Sequence>:<Img src={staticFile(m.pattern.replace('{frame}',String(mediaFrame).padStart(m.padding??6,'0')))} style={{width:'100%',height:'100%',objectFit:'contain'}}/>:<><SpatialLayer ctx={ctx}/><ScienceLayer ctx={ctx}/></>}
  <div data-label="title" style={{position:'absolute',left:'8%',top:'10%',width:'84%',fontSize:Math.min(ctx.width*.054,ctx.height*.06),color:project.style.warm}}>{s.title}</div>
  {caps.map((q:any)=><div key={q.id} data-label={q.id} style={{position:'absolute',left:'9%',bottom:'12%',width:'82%',fontSize:Math.min(ctx.width*.04,ctx.height*.038),lineHeight:1.5,textAlign:'center',color:q.eventId&&ctx.time>=ctx.event(q.eventId).atSeconds?project.style.warm:project.style.text}}>{q.text}</div>)}
  <div data-label="science" style={{position:'absolute',left:'8%',bottom:'5%',width:'84%',fontSize:Math.min(ctx.width*.023,ctx.height*.021),color:'#9aaebe'}}>{s.science}</div>
  {episode.audio.required!==false&&<Audio src={staticFile(`generated/${episode.id}-mix.wav`)}/>}
 </AbsoluteFill>;
}
