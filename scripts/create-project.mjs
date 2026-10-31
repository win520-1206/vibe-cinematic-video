#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
const skill=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const argv=process.argv.slice(2);const target=argv[0];const option=n=>{const i=argv.indexOf('--'+n);return i<0?null:argv[i+1]};
function copyTree(src,dest){fs.mkdirSync(dest,{recursive:true});for(const item of fs.readdirSync(src,{withFileTypes:true})){const from=path.join(src,item.name),to=path.join(dest,item.name);if(item.isSymbolicLink())throw Error('Template symlinks are not supported');if(item.isDirectory())copyTree(from,to);else fs.copyFileSync(from,to)}}
try{
 if(!target||target.startsWith('--'))throw Error('Usage: node create-project.mjs <new-directory> [--demo | --contract file.json] [--music file]');
 const dest=path.resolve(target);if(fs.existsSync(dest)&&(!fs.statSync(dest).isDirectory()||fs.readdirSync(dest).length))throw Error('Target must be absent or an empty directory');
 const template=path.join(skill,'assets/project-template');let config;
 if(argv.includes('--demo')&&option('contract'))throw Error('Choose either --demo or --contract');
 if(argv.includes('--demo'))config=JSON.parse(fs.readFileSync(path.join(skill,'assets/examples/random-walk.json'),'utf8'));
 else config=JSON.parse(fs.readFileSync(option('contract')||path.join(skill,'assets/project-contract.example.json'),'utf8'));
 if(option('contract')){const {normalize}=await import(pathToFileURL(path.join(template,'shared/project.mjs')).href);normalize(config)}
 const music=option('music');if(music&&!fs.statSync(path.resolve(music)).isFile())throw Error('Music file missing');
 fs.mkdirSync(dest,{recursive:true});copyTree(template,dest);fs.mkdirSync(path.join(dest,'tools'),{recursive:true});
 for(const name of ['audio_features.py','music_structure.py','inspect_media.py'])fs.copyFileSync(path.join(skill,'scripts',name),path.join(dest,'tools',name));
 fs.copyFileSync(path.join(skill,'requirements.txt'),path.join(dest,'requirements.txt'));
 fs.mkdirSync(path.join(dest,'public'),{recursive:true});fs.mkdirSync(path.join(dest,'docs'),{recursive:true});
 if(music){const file='music'+path.extname(music).toLowerCase();fs.copyFileSync(path.resolve(music),path.join(dest,'public',file));config.audio={...config.audio,file,required:true};for(const e of config.episodes||[])delete e.audio?.file}
 else if(argv.includes('--demo')){
  // Original synthesized test soundtrack (not the user's default music).
  const sr=48000,seconds=Math.max(...config.episodes.map(e=>e.durationSeconds)),n=Math.round(seconds*sr),buf=Buffer.alloc(44+n*2);buf.write('RIFF');buf.writeUInt32LE(36+n*2,4);buf.write('WAVEfmt ',8);buf.writeUInt32LE(16,16);buf.writeUInt16LE(1,20);buf.writeUInt16LE(1,22);buf.writeUInt32LE(sr,24);buf.writeUInt32LE(sr*2,28);buf.writeUInt16LE(2,32);buf.writeUInt16LE(16,34);buf.write('data',36);buf.writeUInt32LE(n*2,40);
  for(let i=0;i<n;i++){const t=i/sr,phase=t%.5,envelope=Math.min(1,t/.1)*Math.min(1,(seconds-t)/.3);const v=(.1*Math.sin(2*Math.PI*110*t)+.18*Math.sin(2*Math.PI*70*phase)*Math.exp(-phase*24))*envelope;buf.writeInt16LE(Math.round(v*32767),44+i*2)}fs.writeFileSync(path.join(dest,'public','demo-music.wav'),buf);
 }else if(!config.audio?.file){const defaults=JSON.parse(fs.readFileSync(path.join(skill,'assets/defaults.json'),'utf8'));const src=path.join(skill,'assets',defaults.music.asset);if(fs.existsSync(src)){const file='music'+path.extname(src);fs.copyFileSync(src,path.join(dest,'public',file));config.audio={...config.audio,file,required:true}}}
 fs.writeFileSync(path.join(dest,'project-contract.json'),JSON.stringify(config,null,2)+'\n');
 const manifest=Object.fromEntries((config.episodes||[]).map(e=>[e.id,e.scenes.flatMap(s=>(s.captions||[]).map(q=>({id:q.id,text:q.text})))]));
 fs.writeFileSync(path.join(dest,'script-manifest.json'),JSON.stringify(manifest,null,2)+'\n');
 fs.writeFileSync(path.join(dest,'docs','sources.md'),'# Sources and model boundaries\n\n'+(argv.includes('--demo')?'Original pedagogical Bernoulli random walk. Each step is independently left/right with equal probability. Fixed seed, finite samples, no measured data. Spatial sphere is decorative, not a probability trajectory. Demo music is synthesized locally.\n':'Record approved claims, primary sources, dates, model assumptions and asset permissions here.\n'));
 console.log(`Created ${dest}\nInstall: npm ci; python -m pip install -r requirements.txt\nFill project-contract.json; approve script-manifest.json independently; run npm run analyze:music, npm run doctor.`);
}catch(e){console.error(e.message);process.exitCode=1}
