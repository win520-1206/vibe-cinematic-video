import React,{useLayoutEffect,useRef} from 'react';
import {walk,distribution} from '../shared/model.mjs';
export function ScienceLayer({ctx}:any){const ref=useRef<HTMLCanvasElement>(null);
 useLayoutEffect(()=>{const c=ref.current!.getContext('2d')!,{width:w,height:h,scene:s}=ctx;c.clearRect(0,0,w,h);
  const steps=s.model?.steps??24,count=s.model?.samples??160;
  const ev=ctx.event(s.eventIds?.[0]);const p=Math.max(0,Math.min(1,(ctx.time-(ev?.atSeconds??s.start))/Math.max(1,s.end-(ev?.atSeconds??s.start)-1)));
  const left=w*.12,right=w*.88,top=h*.30,bottom=h*.69;
  const baseline=s.kind==='walk'?(top+bottom)/2:bottom;
  c.strokeStyle='#7892a2';c.lineWidth=1;c.beginPath();c.moveTo(left,baseline);c.lineTo(right,baseline);c.stroke();
  c.fillStyle='#a7bbc7';c.font=`${Math.round(Math.min(h*.025,w*.03))}px sans-serif`;c.textAlign='right';c.fillText(s.kind==='walk'?'横向：步数 · 纵向：位移':'柱高：该终点的样本数',right,top-h*.025);c.textAlign='center';
  if(s.kind==='distribution'){for(const v of [-steps,-steps/2,0,steps/2,steps])c.fillText(String(v),w/2+v/steps*(right-left)/2,bottom+h*.035);c.fillText('终点位置（步）',w/2,bottom+h*.075)}c.textAlign='left';
  if(s.kind==='walk'){const a=walk(ctx.seed,0,steps),pos=p*steps,k=Math.floor(pos);c.strokeStyle=ctx.style.warm;c.lineWidth=Math.max(2,w/500);c.beginPath();for(let i=0;i<=k;i++){const x=left+(right-left)*i/steps,y=(top+bottom)/2-a[i]*(bottom-top)/(steps*.7);i?c.lineTo(x,y):c.moveTo(x,y)}if(k<steps)c.lineTo(left+(right-left)*pos/steps,(top+bottom)/2-(a[k]+(a[k+1]-a[k])*(pos-k))*(bottom-top)/(steps*.7));c.stroke();
  }else if(s.kind==='distribution'){const n=Math.max(1,Math.floor(count*p)),bins=distribution(ctx.seed,n,steps);c.strokeStyle=ctx.style.cool;c.lineWidth=Math.max(2,(right-left)/(steps+1)*.65);for(const [x,v]of bins){const px=w/2+x/steps*(right-left)/2;c.beginPath();c.moveTo(px,bottom);c.lineTo(px,bottom-v/count*(bottom-top)*4);c.stroke()}c.fillStyle=ctx.style.text;c.font=`${Math.round(h*.027)}px sans-serif`;c.fillText(`N = ${n} / ${count}`,left,top-.02*h);}
 },[ctx]);return <canvas ref={ref} width={ctx.width} height={ctx.height} style={{position:'absolute',inset:0,width:'100%',height:'100%'}}/>;}
