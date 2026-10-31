import React from 'react';
import {cuesFor,cueWindow,textLayout} from '../shared/presentation.mjs';
import {motionAt} from '../shared/motion.mjs';
function Emphasis({text,words,color}:any){if(!words?.length)return <>{text}</>;const tokens=[...words].filter((x:any)=>typeof x==='string'&&x.length).sort((a:string,b:string)=>b.length-a.length);const result=[];let i=0;while(i<text.length){const match=tokens.find((word:string)=>text.startsWith(word,i));if(match){result.push(<span key={i} style={{color,fontWeight:600}}>{match}</span>);i+=match.length}else{const begin=i++;while(i<text.length&&!tokens.some((word:string)=>text.startsWith(word,i)))i++;result.push(<span key={begin}>{text.slice(begin,i)}</span>)}}return <>{result}</>}
export function KineticText({ctx,state}:any){return <>{cuesFor(ctx.scene,ctx.fps).filter((q:any)=>ctx.time>=q.start&&ctx.time<q.end).map((q:any)=>{
 const win=cueWindow(q,ctx.fps),anchor=q.role==='label'?state:motionAt(ctx,Math.max(q.start,Math.min(ctx.time,win.readStart))),layout=textLayout(q,ctx,state,anchor);if(layout.opacity<.001)return null;
 return <div key={q.id} style={{position:'absolute',left:layout.x,top:layout.y,width:layout.width,textAlign:layout.align as any,fontSize:layout.fontSize,lineHeight:1.35,opacity:layout.opacity,transform:`scale(${layout.scale})`,transformOrigin:layout.align==='right'?'right top':'left top',clipPath:layout.clip?`inset(0 ${layout.clip}% 0 0)`:undefined,pointerEvents:'none'}}>
  <span data-label={q.id} data-role={q.role||'main'} data-phase={layout.phase} data-overlap={q.overlapGroup||''} data-anchor={q.anchor?.id||''} style={{display:'inline-block',maxWidth:'100%',whiteSpace:'pre-wrap',overflowWrap:'normal',textShadow:'0 2px 14px #0008',color:q.role==='formula'?ctx.style.warm:ctx.style.text}}><Emphasis text={q.text} words={q.emphasis} color={q.eventId&&ctx.time<(ctx.event(q.eventId)?.atSeconds??q.start)?ctx.style.text:ctx.style.warm}/></span>
 </div>;
 })}</>}
