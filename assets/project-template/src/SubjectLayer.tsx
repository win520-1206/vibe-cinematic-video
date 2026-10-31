import React,{useLayoutEffect,useRef} from 'react';
import {Bloom} from './Bloom';
import {random} from '../shared/model.mjs';
const vs='attribute vec3 p;attribute float gold;uniform float energy;uniform float size;varying float warm;void main(){gl_Position=vec4(p.x*2.-1.,1.-p.y*2.,0.,1.);gl_PointSize=size*(1.+energy*.08)*(gold>.5?1.35:1.);warm=gold;}';
const fs='precision mediump float;varying float warm;uniform float dim;void main(){float r=length(gl_PointCoord-.5)*2.;if(r>1.)discard;vec3 color=mix(vec3(.48,.76,.92),vec3(.98,.75,.35),warm);gl_FragColor=vec4(color,exp(-r*r*3.)*dim);}';
export function SubjectLayer({ctx,state}:any){const ref=useRef<HTMLCanvasElement>(null),gpu=useRef<any>(null);
 useLayoutEffect(()=>{const gl=ref.current!.getContext('webgl',{preserveDrawingBuffer:true,alpha:true});if(!gl)throw Error('WebGL unavailable; select an explicit alternative');const program=gl.createProgram()!,shaders:WebGLShader[]=[];
  for(const [kind,text]of [[gl.VERTEX_SHADER,vs],[gl.FRAGMENT_SHADER,fs]] as const){const s=gl.createShader(kind)!;gl.shaderSource(s,text);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s)||'shader failed');gl.attachShader(program,s);shaders.push(s)}gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error('subject shader link failed');const points=gl.createBuffer()!,colors=gl.createBuffer()!,bloom=new Bloom(gl,ctx.width,ctx.height);gpu.current={gl,program,points,colors,bloom};return()=>{bloom.dispose();gl.deleteBuffer(points);gl.deleteBuffer(colors);gl.deleteProgram(program);for(const shader of shaders)gl.deleteShader(shader)};
 },[]);
 useLayoutEffect(()=>{const {gl,program,points,colors,bloom}=gpu.current;bloom.begin();gl.useProgram(program);const p=new Float32Array(state.objects.length*3),gold=new Float32Array(state.objects.length);state.objects.forEach((o:any,i:number)=>{p.set([o.x,o.y,o.z??0],i*3);gold[i]=o.id==='walker-0'?1:0});
  for(const [name,buffer,data,size]of [['p',points,p,3],['gold',colors,gold,1]] as any){gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,data,gl.DYNAMIC_DRAW);const loc=gl.getAttribLocation(program,name);if(loc>=0){gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,size,gl.FLOAT,false,0,0)}}
  gl.uniform1f(gl.getUniformLocation(program,'energy'),ctx.signal('bass'));gl.uniform1f(gl.getUniformLocation(program,'size'),Math.max(5,Math.min(ctx.width,ctx.height)*.018));gl.uniform1f(gl.getUniformLocation(program,'dim'),1);gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE);gl.drawArrays(gl.POINTS,0,state.objects.length);bloom.finish(.45+ctx.signal('air')*.08);gl.finish();
 },[ctx,state]);
 return <canvas ref={ref} width={ctx.width} height={ctx.height} style={{position:'absolute',inset:0,width:'100%',height:'100%'}}/>;
}
export function ProcessLayer({ctx,state}:any){const ref=useRef<HTMLCanvasElement>(null);
 useLayoutEffect(()=>{const c=ref.current!.getContext('2d')!,w=ctx.width,h=ctx.height;c.clearRect(0,0,w,h);
  // Sparse decoration has no scientific role and is excluded from subject-motion checks.
  for(let i=0;i<65;i++){const x=(random(ctx.seed,i)*w+ctx.time*(i%3+1)*.8)%w,y=random(ctx.seed,i+80)*h;c.fillStyle=`rgba(130,160,180,${.04+random(ctx.seed,i+160)*.06})`;c.fillRect(x,y,1,1)}
  if(state.trail.length){c.globalAlpha=state.trailOpacity;c.strokeStyle=ctx.style.warm;c.lineWidth=Math.max(1.5,w*.002);c.beginPath();state.trail.forEach((p:any,i:number)=>{i?c.lineTo(p.x*w,p.y*h):c.moveTo(p.x*w,p.y*h)});c.stroke();c.globalAlpha=1;}
  const a=state.area;c.strokeStyle='#7590a34d';c.lineWidth=1;c.beginPath();c.moveTo(a.left*w,a.bottom*h);c.lineTo(a.right*w,a.bottom*h);c.stroke();
  if(ctx.scene.kind==='distribution'){c.fillStyle=ctx.style.cool;c.font=`${Math.round(Math.min(w*.035,h*.03))}px sans-serif`;c.fillText(`N = ${state.arrived} / ${state.total}`,a.left*w,(a.bottom+.07)*h)}
 },[ctx,state]);return <canvas ref={ref} width={ctx.width} height={ctx.height} style={{position:'absolute',inset:0,width:'100%',height:'100%'}}/>;
}
