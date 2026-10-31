import React,{useLayoutEffect,useRef} from 'react';
import {random} from '../shared/model.mjs';
import {Bloom} from './Bloom';
// Semantic camera/morph parameters replace any fixed cinematic timestamp.
const vertex=`attribute vec3 position;uniform float yaw;uniform float pitch;uniform float aspect;uniform float energy;varying float depth;void main(){vec3 p=position;float x=p.x*cos(yaw)+p.z*sin(yaw);float z=-p.x*sin(yaw)+p.z*cos(yaw);float y=p.y*cos(pitch)-z*sin(pitch);z=p.y*sin(pitch)+z*cos(pitch);float d=4.2-z;gl_Position=vec4(x/aspect,y,0.,d);gl_PointSize=(2.5+energy*2.)*3./d;depth=clamp((z+2.)/4.,.12,1.);}`;
const fragment=`precision mediump float;varying float depth;uniform vec3 tint;void main(){float r=length(gl_PointCoord-.5)*2.;if(r>1.)discard;float a=exp(-r*r*4.)*depth;gl_FragColor=vec4(tint,a*.7);}`;
export function SpatialLayer({ctx}:any){
 const ref=useRef<HTMLCanvasElement>(null),state=useRef<any>(null);
 useLayoutEffect(()=>{const gl=ref.current!.getContext('webgl',{preserveDrawingBuffer:true,alpha:true});if(!gl)throw Error('WebGL unavailable: select an explicit alternative, do not silently downgrade');
  const compile=(type:number,source:string)=>{const s=gl.createShader(type)!;gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s)||'shader error');return s};
  const vs=compile(gl.VERTEX_SHADER,vertex),fs=compile(gl.FRAGMENT_SHADER,fragment),p=gl.createProgram()!;gl.attachShader(p,vs);gl.attachShader(p,fs);gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(p)||'link error');const buffer=gl.createBuffer()!,bloom=new Bloom(gl,ctx.width,ctx.height);state.current={gl,p,buffer,bloom};
  return()=>{bloom.dispose();gl.deleteBuffer(buffer);gl.deleteProgram(p);gl.deleteShader(vs);gl.deleteShader(fs);state.current=null};
 },[]);
 useLayoutEffect(()=>{const {gl,p,buffer,bloom}=state.current;bloom.begin();gl.useProgram(p);
  const reveal=ctx.scene.eventIds?.[0],ev=ctx.event(reveal);const morph=ev?Math.max(0,Math.min(1,(ctx.time-ev.atSeconds)/1.5)):0;
  const count=700,data=new Float32Array(count*3);
  for(let i=0;i<count;i++){const y=1-2*(i+.5)/count,a=i*2.399963,r=Math.sqrt(1-y*y),target=[Math.cos(a)*r,y,Math.sin(a)*r];for(let k=0;k<3;k++)data[i*3+k]=(random(ctx.seed,i*3+k)*4-2)*(1-morph)+target[k]*1.5*morph;}
  gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,data,gl.DYNAMIC_DRAW);const pos=gl.getAttribLocation(p,'position');gl.enableVertexAttribArray(pos);gl.vertexAttribPointer(pos,3,gl.FLOAT,false,0,0);
  const uni=(name:string)=>gl.getUniformLocation(p,name);gl.uniform1f(uni('yaw'),ctx.time*.1);gl.uniform1f(uni('pitch'),.14);gl.uniform1f(uni('aspect'),ctx.width/ctx.height);gl.uniform1f(uni('energy'),ctx.signal('bass'));gl.uniform3f(uni('tint'),.55,.72,.9);
  gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE);gl.drawArrays(gl.POINTS,0,count);bloom.finish(.32+.12*ctx.signal('air'));gl.finish();
 },[ctx]);
 return <canvas ref={ref} width={ctx.width} height={ctx.height} style={{position:'absolute',inset:0,width:'100%',height:'100%',opacity:.4,filter:'drop-shadow(0 0 6px #799db2)'}}/>;
}
