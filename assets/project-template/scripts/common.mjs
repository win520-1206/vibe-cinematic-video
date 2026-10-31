import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {normalize} from '../shared/project.mjs';
export const root=process.cwd();
export const arg=(name,def=null)=>{const i=process.argv.indexOf('--'+name);return i<0?def:process.argv[i+1]};
export const json=p=>JSON.parse(fs.readFileSync(p,'utf8'));
export const write=(p,v)=>{fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,JSON.stringify(v,null,2)+'\n')};
export const hash=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
export function sourceHash(){const result=[];const walk=dir=>{for(const e of fs.readdirSync(dir,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))){const file=path.join(dir,e.name);if(e.isDirectory())walk(file);else result.push([file.replaceAll('\\','/'),hash(file)])}};for(const dir of ['src','shared','public'])walk(dir);for(const file of ['package-lock.json','remotion.config.ts'])result.push([file,hash(file)]);return createHash('sha256').update(JSON.stringify(result)).digest('hex')}
export function copyTree(src,dest){if(fs.statSync(src).isDirectory()){fs.mkdirSync(dest,{recursive:true});for(const entry of fs.readdirSync(src,{withFileTypes:true})){if(entry.name==='__pycache__'||entry.name.endsWith('.pyc'))continue;if(entry.isSymbolicLink())throw Error('Delivery cannot include symlinks');copyTree(path.join(src,entry.name),path.join(dest,entry.name))}}else{fs.mkdirSync(path.dirname(dest),{recursive:true});fs.copyFileSync(src,dest)}}
export function publicPath(p){if(typeof p!=='string'||!p||path.isAbsolute(p))throw Error(`Expected a public-relative asset: ${p}`);const out=path.resolve(root,'public',p);const rel=path.relative(path.resolve(root,'public'),out);if(rel.startsWith('..')||path.isAbsolute(rel))throw Error('Asset escapes public directory');return out}
export function run(exe,args,opts={}){const r=spawnSync(exe,args,{encoding:'utf8',stdio:'pipe',...opts});if(r.error||r.status!==0)throw Error(`${exe}: ${r.error?.message||r.stderr||r.stdout||'exit '+r.status}`);return r.stdout}
export function tool(name,optional=false){const env=process.env[name.toUpperCase()+(name==='blender'?'_EXECUTABLE':'')];if(env&&fs.existsSync(env))return env;
 const r=spawnSync(process.platform==='win32'?'where.exe':'which',[name],{encoding:'utf8'});if(r.status===0){const p=r.stdout.trim().split(/\r?\n/)[0];if(fs.existsSync(p))return p}
 if(name==='ffmpeg'||name==='ffprobe'){try{const require=createRequire(import.meta.url);const suffix=process.platform==='win32'?'.exe':'';const packageName=`@remotion/compositor-${process.platform==='win32'?'win32':process.platform}-${process.arch}${process.platform==='win32'?'-msvc':process.platform==='linux'?'-gnu':''}`;const dir=path.dirname(require.resolve(packageName+'/package.json'));const p=path.join(dir,name+suffix);if(fs.existsSync(p))return p}catch{}}
 if(optional)return null;throw Error(`Cannot locate ${name}; configure ${name.toUpperCase()+(name==='blender'?'_EXECUTABLE':'')} or PATH`);
}
export function browser(){if(process.env.BROWSER_EXECUTABLE){if(!fs.existsSync(process.env.BROWSER_EXECUTABLE))throw Error('BROWSER_EXECUTABLE does not exist');return process.env.BROWSER_EXECUTABLE}
 const paths=process.platform==='win32'?[process.env['PROGRAMFILES(X86)'],process.env.PROGRAMFILES,process.env.LOCALAPPDATA].filter(Boolean).flatMap(x=>[path.join(x,'Microsoft/Edge/Application/msedge.exe'),path.join(x,'Google/Chrome/Application/chrome.exe')]):['/usr/bin/chromium','/usr/bin/google-chrome','/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'];
 const found=paths.find(fs.existsSync);if(!found)throw Error('Set BROWSER_EXECUTABLE to an installed Chrome/Edge/Chromium; no implicit download');return found;
}
export const project=()=>normalize(json('project-contract.json'));
export function episodes(p){const id=arg('episode');const result=p.episodes.filter(e=>!id||e.id===id);if(!result.length)throw Error(`Unknown episode ${id}`);return result}
export function assetErrors(p){const out=[];const test=(file,label)=>{try{if(!fs.existsSync(publicPath(file)))out.push(`${label}: missing ${file}`)}catch(e){out.push(e.message)}};
 if(p.fontFile)test(p.fontFile,'font');
 for(const e of p.episodes){if(e.audio.required!==false){if(!e.audio.file)out.push(`${e.id}: choose audio.file in public (or explicitly audio.required=false)`);else test(e.audio.file,e.id)}for(const ev of e.events)if(ev.sound?.file)test(ev.sound.file,ev.id);
 for(const s of e.scenes)if(s.kind==='blender'){if(s.media.type==='video')test(s.media.file,s.id);else for(let k=s.media.sourceStartFrame;k<s.media.sourceStartFrame+Math.round((s.end-s.start)*p.video.fps);k++)test(s.media.pattern.replace('{frame}',String(k).padStart(s.media.padding??6,'0')),s.id);}}
 return out;
}
