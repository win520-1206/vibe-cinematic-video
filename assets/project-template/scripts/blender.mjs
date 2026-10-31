import fs from 'node:fs';
import path from 'node:path';
import {project,arg,tool,run,write,publicPath} from './common.mjs';
import {frameAt} from '../shared/project.mjs';
try{const p=project(),e=p.episodes.find(x=>x.id===arg('episode')),s=e?.scenes.find(x=>x.id===arg('scene'));
 if(!s||s.kind!=='blender')throw Error('Select a planned Blender scene with --episode ID --scene ID');
 const executable=tool('blender');console.log(run(executable,['--version']).split('\n')[0]);const dir=publicPath(`blender/${e.id}-${s.id}`);fs.mkdirSync(dir,{recursive:true});const frames=frameAt(s.end-s.start,p.video.fps),ev=e.events.find(x=>x.id===s.eventIds?.[0]);
 if(s.media.sourceStartFrame!==(s.media.type==='sequence'?1:0))throw Error('Test builder uses PNG frame 1 / video frame 0; set sourceStartFrame accordingly');
 const job={engine:s.blender.engine||'CYCLES',width:p.video.width,height:p.video.height,fps:p.video.fps,frames,eventFrame:ev?frameAt(ev.atSeconds-s.start,p.video.fps)+1:1,transparent:s.media.type==='sequence',pattern:path.join(dir,'frame-'),blendFile:path.join(dir,'source.blend')};write(path.join(dir,'job.json'),job);
 if(ev&&(ev.atSeconds<s.start||ev.atSeconds>=s.end))throw Error('Blender event must fall inside selected scene');
 run(executable,['--background','--python','blender/build_scene.py','--',path.join(dir,'job.json')],{stdio:'inherit'});
 // Blender appends 4-digit frame numbers to the frame- prefix.
 if(s.media.type==='sequence'){for(let i=1;i<=frames;i++){const dest=publicPath(s.media.pattern.replace('{frame}',String(i).padStart(s.media.padding??6,'0')));fs.mkdirSync(path.dirname(dest),{recursive:true});fs.copyFileSync(path.join(dir,`frame-${String(i).padStart(4,'0')}.png`),dest)}}
 else{const dest=publicPath(s.media.file);fs.mkdirSync(path.dirname(dest),{recursive:true});run(tool('ffmpeg'),['-y','-v','error','-framerate',String(p.video.fps),'-start_number','1','-i',path.join(dir,'frame-%04d.png'),'-frames:v',String(frames),'-an','-c:v','libx264','-pix_fmt','yuv420p',dest],{stdio:'inherit'})}
 write(path.join(dir,'manifest.json'),{...job,media:s.media,scope:'Simple original interface test, not an automatically generated scientific model',frameMapping:'Blender 1 -> scene local 0 -> Remotion scene start',eventId:ev?.id,version:run(executable,['--version']).split('\n')[0]});console.log('Blender scene rendered; inspect scientific content and run check');
}catch(e){console.error(`${arg('episode','unknown-episode')}/${arg('scene','unknown-scene')}: ${e.message}`);process.exitCode=1}
