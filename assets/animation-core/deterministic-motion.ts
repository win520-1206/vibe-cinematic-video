export type Vec3={x:number;y:number;z:number};
export type Transition={startSeconds:number;endSeconds:number};
export function progress(time:number,range:Transition){
 if(range.endSeconds<=range.startSeconds)throw Error('Transition end must follow start');
 const p=Math.max(0,Math.min(1,(time-range.startSeconds)/(range.endSeconds-range.startSeconds)));
 return p*p*(3-2*p);
}
export function random(seed:number){let x=(seed+1)|0;x^=x<<13;x^=x>>>17;x^=x<<5;return (x>>>0)/4294967296;}
export function pointAt(index:number,count:number,time:number,transition:Transition):Vec3{
 const start={x:(random(index*3+1)-.5)*3,y:(random(index*3+2)-.5)*2,z:(random(index*3+3)-.5)*3};
 const y=1-2*(index+.5)/count,r=Math.sqrt(Math.max(0,1-y*y)),az=index*2.399963;
 const target={x:r*Math.cos(az),y,z:r*Math.sin(az)},p=progress(time,transition);
 return {x:start.x+(target.x-start.x)*p,y:start.y+(target.y-start.y)*p,z:start.z+(target.z-start.z)*p};
}
export function project(v:Vec3,yaw:number,distance=4.5){
 const x=v.x*Math.cos(yaw)+v.z*Math.sin(yaw),z=-v.x*Math.sin(yaw)+v.z*Math.cos(yaw);
 const scale=distance/(distance-z);return {x:x*scale,y:v.y*scale,z,scale};
}
