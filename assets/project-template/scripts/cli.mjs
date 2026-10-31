import fs from 'node:fs';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {arg,project,episodes,tool,run,json,write,hash,browser,assetErrors,publicPath,copyTree,sourceHash} from './common.mjs';
import {criticalFrames} from '../shared/project.mjs';
import {inspectProject,inspectBoxes,inspectBlenderSources} from './validate.mjs';
const mode=process.argv[2];
async function main(){const p=project();fs.mkdirSync('qa',{recursive:true});
 if(mode==='dev'){const binary=path.resolve('node_modules/@remotion/cli/remotion-cli.js');if(!fs.existsSync(binary))throw Error('Run npm ci');const proc=spawn(process.execPath,[binary,'studio','src/index.ts','--no-open'],{stdio:'inherit',env:{...process.env,BROWSER_EXECUTABLE:browser()}});proc.on('exit',code=>process.exit(code??1));return}
 if(mode==='doctor'){const checks={node:process.version,browser:browser(),ffmpeg:tool('ffmpeg'),ffprobe:tool('ffprobe'),python:process.env.PYTHON||'python'};run(checks.ffmpeg,['-version']);run(checks.ffprobe,['-version']);run(checks.python,['-c','import numpy']);
  const blenderScenes=p.episodes.flatMap(e=>e.scenes.filter(s=>s.kind==='blender').map(s=>`${e.id}/${s.id}`));if(blenderScenes.length){checks.blender=tool('blender');checks.blenderVersion=run(checks.blender,['--version']).split('\n')[0]}
  const errors=assetErrors(p);if(errors.length)throw Error(errors.join('\n'));const {session}=await import('./renderer.mjs');const r=await session(p);try{await r.still(p.episodes[0],0,path.resolve('qa/doctor.png'));if(r.logs.length)throw Error(r.logs.join('\n'));write('qa/doctor.json',{passed:true,checks,blenderScenes,frameRendered:true})}finally{await r.close()}console.log('Environment and real frame passed');return;
 }
 const check=inspectProject(p);check.errors.push(...inspectBlenderSources(p));if(check.errors.length)throw Error(check.errors.join('\n'));
 if(mode==='render'||mode==='stills'){
  const {session}=await import('./renderer.mjs'),r=await session(p);fs.mkdirSync('renders',{recursive:true});
  try{for(const e of episodes(p)){if(mode==='stills'){const frames=arg('frames')?arg('frames').split(',').map(Number):criticalFrames(p,e);for(const f of frames){if(!Number.isInteger(f)||f<0||f>=e.durationInFrames)throw Error('Still frame out of range');await r.still(e,f,path.resolve(`qa/${e.id}-${f}.png`))}}
   else{const range=arg('from')!==null||arg('to')!==null?[Number(arg('from',0)),Number(arg('to',e.durationInFrames-1))]:null;if(range&&(!range.every(Number.isInteger)||range[0]<0||range[1]>=e.durationInFrames||range[0]>range[1]))throw Error('Range must be inclusive absolute episode frame indices');const suffix=range?`-${range[0]}-${range[1]}`:'';await r.render(e,range,path.resolve(`renders/${e.id}${suffix}.mp4`))}}
   if(r.logs.length)throw Error(r.logs.join('\n'));write(`qa/${mode}-layout.json`,{rows:r.rows,errors:r.rows.flatMap(row=>inspectBoxes(row,p))});
  }finally{await r.close()}return;
 }
 if(mode==='check'){
  const report={passed:false,contractHash:hash('project-contract.json'),errors:[],warnings:check.warnings,episodes:[],manualReview:{science:'not_reviewed',continuousViewing:'not_reviewed',listening:'not_reviewed'}};
  if(arg('static')!==null||process.argv.includes('--static')){write('qa/static.json',{...report,passed:true,scope:'configuration and generated assets only'});console.log('Static checks passed');return}
  const {session}=await import('./renderer.mjs'),r=await session(p);
  try{for(const e of episodes(p)){for(const f of criticalFrames(p,e))await r.still(e,f,path.resolve(`qa/${e.id}-${f}.png`));const rows=r.rows.filter(x=>x.episode===e.id);report.errors.push(...rows.flatMap(row=>inspectBoxes(row,p)));for(const q of e.scenes.flatMap(s=>s.captions||[]))if(!rows.some(x=>x.boxes.some(b=>b.id===q.id)))report.errors.push(`${q.id}: never measured in rendered frames`);
    const video=path.resolve(`renders/${e.id}.mp4`);if(!fs.existsSync(video)){report.errors.push(`${e.id}: final video missing`);continue}const rec=json(video+'.render.json');if(rec.contractHash!==report.contractHash||rec.sourceHash!==sourceHash()||rec.audioHash!==hash(`public/generated/${e.id}-mix.wav`)||rec.videoHash!==hash(video)||rec.startFrame!==0||rec.endFrame!==e.durationInFrames-1)report.errors.push(`${e.id}: stale or partial final render`);
    const expectation={...p.video,frames:e.durationInFrames,audioRequired:e.audio.required!==false,criticalFrames:criticalFrames(p,e)};write(`qa/${e.id}-expected.json`,expectation);
    try{run(process.env.PYTHON||'python',['-X','utf8','tools/verify_media.py','--video',video,'--ffmpeg',tool('ffmpeg'),'--ffprobe',tool('ffprobe'),'--expected',`qa/${e.id}-expected.json`,'--output',`qa/${e.id}-media.json`],{stdio:'inherit'})}catch(err){report.errors.push(err.message)}
    if(fs.existsSync(`qa/${e.id}-media.json`)){const media=json(`qa/${e.id}-media.json`);report.episodes.push({id:e.id,...media});report.errors.push(...media.errors);report.warnings.push(...media.warnings)}
   }report.errors.push(...r.logs);report.passed=report.errors.length===0;write('qa/layout.json',r.rows);write('qa/report.json',report);
  }finally{await r.close()}if(!report.passed)throw Error(report.errors.join('\n'));console.log('Technical checks passed; manual review remains explicit');return;
 }
 if(mode==='package'){
  const report=json('qa/report.json');if(!report.passed||report.contractHash!==hash('project-contract.json')||report.episodes.length!==p.episodes.length)throw Error('Run full check on all episodes before packaging');for(const e of p.episodes){const rec=json(`renders/${e.id}.mp4.render.json`);if(rec.sourceHash!==sourceHash()||rec.videoHash!==hash(`renders/${e.id}.mp4`))throw Error('Final video/source changed after check')}
  const destination=path.resolve('deliveries',new Date().toISOString().replace(/[:.]/g,'-'));fs.mkdirSync(destination,{recursive:true});
  for(const name of ['src','shared','scripts','tools','blender','public','docs','project-contract.json','script-manifest.json','package.json','package-lock.json','tsconfig.json','remotion.config.ts','README.md','qa','renders','requirements.txt','tests']){if(fs.existsSync(name))copyTree(name,path.join(destination,name))}
  for(const e of p.episodes){const stamp=t=>{const ms=Math.round(t*1000);return `${String(Math.floor(ms/3600000)).padStart(2,'0')}:${String(Math.floor(ms/60000)%60).padStart(2,'0')}:${String(Math.floor(ms/1000)%60).padStart(2,'0')},${String(ms%1000).padStart(3,'0')}`};const text=e.scenes.flatMap(s=>s.captions||[]).map((q,i)=>`${i+1}\n${stamp(q.start)} --> ${stamp(q.end)}\n${q.text}\n`).join('\n');fs.writeFileSync(path.join(destination,e.id+'.srt'),text)}
  write(path.join(destination,'DELIVERY.json'),{technicalPassed:true,manualReview:report.manualReview,notice:'Contains this project media; public Skill archives use a separate allowlist.'});console.log(destination);return;
 }throw Error('Unknown command '+mode);
}
main().catch(err=>{console.error(err.message);process.exitCode=1});
