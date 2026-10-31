import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {normalize,atFrame,criticalFrames} from '../shared/project.mjs';
import {walk,distribution} from '../shared/model.mjs';
// Isolated inputs independent of the user's current script or original production.
const work=fs.mkdtempSync(path.join(os.tmpdir(),'vibe-tests-'));process.chdir(work);fs.mkdirSync('public');
const {inspectProject,inspectBoxes}=await import('../scripts/validate.mjs');
function fixture(){return {project:{episodeCount:1},video:{width:640,height:360,fps:24},audio:{required:false},episodes:[{id:'E1',durationSeconds:4,events:[{id:'go',atSeconds:1}],scenes:[{id:'one',kind:'walk',start:0,end:4,title:'Test',object:'walker',action:'step',before:'origin',after:'endpoint',understanding:'random path',science:'simulation',model:{steps:24,samples:100},eventIds:['go'],captions:[{id:'c1',text:'A random step',start:1,end:3}]}]}]}}
const manifest=()=>fs.writeFileSync('script-manifest.json',JSON.stringify({E1:[{id:'c1',text:'A random step'}]}));
test('missing parameters never inherit demo values',()=>{assert.throws(()=>normalize({project:{},video:{},episodes:[]}),/missing|provide/)});
test('different episodes, orientations, durations and fps',()=>{for(const [w,h,fps]of [[640,360,24],[360,640,30],[640,360,60]]){const c=fixture();c.video={width:w,height:h,fps};c.project.episodeCount=2;c.episodes.push(structuredClone(c.episodes[0]));c.episodes[1].id='E2';c.episodes[1].durationSeconds=5;c.episodes[1].scenes[0].end=5;const p=normalize(c);assert.equal(p.episodes[1].durationInFrames,5*fps);assert.equal(p.video.width,w)}});
test('gaps, overlaps, off-frame events and missing IDs fail',()=>{for(const change of [c=>c.episodes[0].scenes[0].start=.5,c=>c.episodes[0].events[0].atSeconds=.01,c=>c.episodes[0].scenes[0].eventIds=['absent'],c=>c.episodes[0].events[0].atSeconds=8]){const c=fixture();change(c);assert.throws(()=>normalize(c))}});
test('arbitrary frame reconstruction and event boundaries',()=>{const p=normalize(fixture()),e=p.episodes[0];const a=atFrame(p,e,48,null);atFrame(p,e,0,null);const b=atFrame(p,e,48,null);assert.equal(a.time,b.time);assert.equal(a.event('go').atSeconds,1);assert.ok(criticalFrames(p,e).includes(23));assert.ok(criticalFrames(p,e).includes(24))});
test('model preserves sample counts, parity and bounds',()=>{const values=walk(73,2,48);assert.deepEqual(values,walk(73,2,48));assert.equal(values.length,49);assert.ok(values.every((v,i)=>Math.abs(v)<=i&&Math.abs(v%2)===i%2));assert.equal(distribution(73,250,48).reduce((a,[,n])=>a+n,0),250)});
test('independent caption manifest catches dropped/changed captions',()=>{manifest();const p=normalize(fixture());assert.equal(inspectProject(p,{generated:false}).errors.length,0);p.episodes[0].scenes[0].captions=[];assert.ok(inspectProject(p,{generated:false}).errors.some(e=>e.includes('caption')))});
test('overlapping captions and excessive reading rate are visible',()=>{manifest();const p=normalize(fixture());p.episodes[0].scenes[0].captions.push({id:'c2',text:'second',start:1,end:2});p.qa={maxCharactersPerSecond:1};const r=inspectProject(p,{generated:false});assert.ok(r.errors.some(x=>x.includes('overlapping')));assert.ok(r.warnings.some(x=>x.includes('reading rate')))});
test('missing assets, stale generated features and text overflow fail',()=>{manifest();const p=normalize(fixture());p.episodes[0].audio={required:true,file:'absent.wav'};assert.ok(inspectProject(p).errors.length>=2);assert.ok(inspectBoxes({episode:'E1',frame:0,boxes:[{id:'bad',x:630,y:20,w:50,h:20}]},p).length);assert.ok(inspectBoxes({episode:'E1',frame:0,boxes:[{id:'a',x:20,y:20,w:50,h:20},{id:'b',x:30,y:20,w:50,h:20}]},p).length)});
test('Blender remains optional but selected media must be explicit',()=>{const c=fixture();assert.doesNotThrow(()=>normalize(c));c.episodes[0].scenes[0].kind='blender';assert.throws(()=>normalize(c),/Blender/);Object.assign(c.episodes[0].scenes[0],{blender:{benefit:'section',cost:'offline'},media:{type:'video',file:'section.mp4',fps:24,frames:96,sourceStartFrame:0}});assert.doesNotThrow(()=>normalize(c))});
