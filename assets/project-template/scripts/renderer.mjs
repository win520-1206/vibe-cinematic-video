import fs from 'node:fs';
import path from 'node:path';
import {bundle} from '@remotion/bundler';
import {openBrowser,selectComposition,renderStill,renderMedia} from '@remotion/renderer';
import {browser,write,hash,sourceHash} from './common.mjs';
export async function session(p){
 const serveUrl=await bundle({entryPoint:path.resolve('src/index.ts'),publicDir:path.resolve('public'),enableCaching:false});
 const chromiumOptions={gl:'angle',disableWebSecurity:false};
 const instance=await openBrowser('chrome',{browserExecutable:browser(),chromiumOptions,logLevel:'error'});
 const rows=[],logs=[];const onBrowserLog=log=>{if(log.text.startsWith('VIBE_QA:')){try{rows.push(JSON.parse(log.text.slice(8)))}catch{}}else if(log.type==='error')logs.push(log.text)};
 const base={serveUrl,puppeteerInstance:instance,chromiumOptions,logLevel:'error',onBrowserLog};
 return {rows,logs,close:()=>instance.close({silent:true}),
  async still(e,frame,out){const c=await selectComposition({...base,id:e.id});await renderStill({...base,composition:c,frame,imageFormat:'png',output:out,overwrite:true})},
  async render(e,range,out){const c=await selectComposition({...base,id:e.id});let last=0;await renderMedia({...base,composition:c,codec:'h264',outputLocation:out,frameRange:range,concurrency:Math.max(1,Number(process.env.RENDER_CONCURRENCY||2)),pixelFormat:'yuv420p',imageFormat:'png',audioCodec:'aac',sampleRate:48000,crf:18,overwrite:true,onProgress:r=>{if(Date.now()-last>15000||r.progress===1){console.log(`${e.id}: ${r.renderedFrames} frames; ${(r.progress*100).toFixed(1)}%`);last=Date.now()}}});
   write(out+'.render.json',{episode:e.id,startFrame:range?.[0]??0,endFrame:range?.[1]??e.durationInFrames-1,contractHash:hash('project-contract.json'),sourceHash:sourceHash(),audioHash:hash(`public/generated/${e.id}-mix.wav`),videoHash:hash(out),fps:p.video.fps,width:p.video.width,height:p.video.height});
  }
 };
}
