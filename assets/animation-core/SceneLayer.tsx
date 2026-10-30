import React,{useLayoutEffect,useRef}from'react';
import{useCurrentFrame,useVideoConfig}from'remotion';
import{pointAt,project,Transition}from'./deterministic-motion';

// A geometric mechanism example. The project supplies timing and composition.
export const SceneLayer:React.FC<{transition:Transition;count?:number;colors?:{background:string;warm:string;cool:string}}>=({transition,count=1600,colors={background:'#050b12',warm:'#dfbf83',cool:'#9bc9e3'}})=>{
 const frame=useCurrentFrame(),{fps,width,height}=useVideoConfig(),ref=useRef<HTMLCanvasElement>(null),time=frame/fps;
 useLayoutEffect(()=>{
  const c=ref.current?.getContext('2d');if(!c)return;
  c.fillStyle=colors.background;c.fillRect(0,0,width,height);
  const radius=Math.min(width,height)*.32,yaw=time*.08;
  const points=Array.from({length:count},(_,i)=>({...project(pointAt(i,count,time,transition),yaw),i})).sort((a,b)=>a.z-b.z);
  c.globalCompositeOperation='lighter';
  for(const p of points){
   c.globalAlpha=.12+.5*Math.max(0,(p.z+1)/2);c.fillStyle=p.i%7?colors.cool:colors.warm;
   c.beginPath();c.arc(width/2+p.x*radius,height/2+p.y*radius,Math.max(.6,p.scale*1.3),0,Math.PI*2);c.fill();
  }
  c.globalAlpha=1;c.globalCompositeOperation='source-over';
 },[frame,time,width,height,count,transition,colors]);
 return <canvas ref={ref} width={width} height={height} style={{position:'absolute',inset:0,width:'100%',height:'100%'}}/>;
};
