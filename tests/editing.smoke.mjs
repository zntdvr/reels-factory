// Explicit desktop acceptance check: npm run test:editing. Uses only its own project/window.
import assert from 'node:assert/strict';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { p, readConfig, readJSON, writeJSON } from '../scripts/lib/util.mjs';
import { readSession, writePlan, approvePlan } from '../scripts/lib/edit-session.mjs';
import { connectEdit } from '../scripts/lib/filmcraft-live.mjs';

const dir = mkdtempSync(p('projects/editing-smoke-')), id = path.basename(dir);
let client;
const bridges = [];
const run = (script, ...args) => execFileSync(process.execPath, [p('scripts', script + '.mjs'), ...args, '--project', id], { stdio:'pipe', timeout:180000 }).toString();
const fail = (script, ...args) => {
  const result = spawnSync(process.execPath, [p('scripts', script + '.mjs'), ...args, '--project', id], { encoding:'utf8',timeout:180000 });
  assert.equal(result.status, 1, result.stdout + result.stderr);
  return result.stdout + result.stderr;
};
const digest = (file) => createHash('sha256').update(readFileSync(file)).digest('hex');
try {
  mkdirSync(path.join(dir,'scenes')); mkdirSync(path.join(dir,'work/public'),{recursive:true});
  writeJSON(path.join(dir,'meta.json'),{id,title:'Technical editing acceptance',fps:30,clean:{durationSeconds:4}});
  writeJSON(path.join(dir,'work/blocks.json'),{fps:30,duration:4,totalFrames:120,blocks:Array.from({length:4},(_,i)=>({
    id:`b0${i+1}`,frames:30,text:'Technical check',camera:i>0,visualizer:'remotion',metaphor:'Проверка обновления сцены',transition:'cut',sfx:false,
  }))});
  const scene = path.join(dir,'scenes/B01.tsx');
  writeFileSync(scene,`import React from 'react';import {useCurrentFrame} from 'remotion';import {Scene,color} from '../../../core';export const B01=()=>{const f=useCurrentFrame();return <Scene><div style={{width:200,height:200,marginLeft:f*5,marginTop:300,background:color.accent}}/></Scene>};`);
  writeFileSync(path.join(dir,'reel.tsx'),`import {defineReel,type,color,PAGE_PAD} from '../../core';import {B01} from './scenes/B01';export default defineReel({id:'${id}',title:'Technical editing acceptance',source:{video:'${id}/source.mp4',music:false},audioSeconds:4,transition:'cut',sfx:false,blocks:[{id:'b01',text:'Check',frames:30,scene:B01,layers:[{id:'title',kind:'text',text:'Initial',x:PAGE_PAD,y:400,width:700,fontSize:type.title.size,fontFamily:type.title.family,color:color.text}]},...['b02','b03','b04'].map(id=>({id,text:'Check',frames:30,camera:true as const}))]});`);
  execFileSync('ffmpeg',['-v','error','-f','lavfi','-i','testsrc2=size=1080x1920:rate=30','-f','lavfi','-i','sine=frequency=440:sample_rate=48000','-t','4','-c:v','libx264','-preset','ultrafast','-c:a','aac',path.join(dir,'work/public/source.mp4')]);
  const plan=writePlan(dir);
  assert.match(fail('scaffold'), /утвер/);
  assert.match(fail('filmcraft','--draft'), /утвер/);
  assert.match(fail('render'), /утвер/);
  approvePlan(dir,plan.revision);
  console.log('Approval gates passed; preparing native draft…');
  run('edit','prepare');
  let state=readSession(dir);
  assert.ok(existsSync(state.project));
  assert.ok(!existsSync(path.join(state.output,'reference.mp4')));
  const ready=path.join(dir,id+'.mp4');
  assert.ok(!existsSync(ready));
  assert.match(fail('edit','prepare'),/уже существует/);
  run('edit','open'); state=readSession(dir);
  bridges.push(state.bridge);
  run('edit','open'); assert.deepEqual(readSession(dir).bridge,state.bridge);
  client=await connectEdit(dir,readConfig());
  const objects=readJSON(path.join(state.output,'objects.json'));
  const title=objects.find(o=>o.kind==='text');
  const initial=await client.tool('sequence_inspect');
  writeJSON(path.join(dir,'work/change.json'),[{id:'graphics.setText',params:{clip:title.clip,layer:0,text:'Manual bridge edit'}}]);
  run('edit','command','--file',path.join(dir,'work/change.json'));
  writeFileSync(scene,readFileSync(scene,'utf8').replace('f*5','f*8'));
  assert.match(fail('render'), /Исходники изменились/);
  console.log('Live text edit passed; updating selected scene…');
  run('edit','update','--block','b01');
  const after=await client.tool('sequence_inspect');
  assert.equal(after.video[0].items[3].item,initial.video[0].items[3].item);
  assert.equal(after.video[0].items[0].clip,initial.video[0].items[0].clip);
  assert.match(JSON.stringify(await client.command('graphics.list',{clip:title.clip})),/Manual bridge edit/);
  const updates=readdirSync(path.join(state.output,'media')).filter(n=>n.startsWith('update-'));
  assert.deepEqual(readdirSync(path.join(state.output,'media',updates[0])).sort(),['scene-0-b01.mp4','scene-1-b02.mp4']);
  assert.ok(!existsSync(ready));
  run('render'); assert.ok(existsSync(ready)); const finalHash=digest(ready);
  const saved=readJSON(state.project);
  for(const item of Object.values(saved.project.items)) {
    const media=item.kind?.Media?.media?.File;
    if(media) assert.ok(!path.isAbsolute(media.path),'generated package media must remain portable after live saves');
  }
  console.log('Live export passed; checking offline media and wrong-project guards…');
  await client.command('media.makeOffline',{items:[after.video[0].items[3].item]});
  assert.match(fail('render'),/недоступные медиа|offline/i);
  assert.equal(digest(ready),finalHash);
  await client.command('edit.undo'); await client.command('file.save');
  const other=path.join(state.output,'other.fcproj'); copyFileSync(state.project,other);
  await client.command('file.open',{path:other});
  assert.match(fail('edit','command','--file',path.join(dir,'work/change.json')),/другой проект/);
  await client.command('file.open',{path:state.project});
  console.log('Checking structural-change snapshot and adoption…');
  const reel=path.join(dir,'reel.tsx');
  writeFileSync(reel,readFileSync(reel,'utf8').replace("id:'title'","id:'renamed-title'"));
  const previous=digest(state.project);
  assert.match(fail('edit','update','--block','all'),/структура/);
  assert.equal(digest(state.project),previous);
  run('filmcraft','--snapshot');
  const snapshot=readJSON(path.join(dir,'work/filmcraft-export.json'));
  assert.notEqual(snapshot.project,state.project);
  assert.equal(readSession(dir).project,state.project);
  run('edit','adopt','--file',snapshot.project);
  assert.equal(readSession(dir).project,snapshot.project);
  assert.ok(existsSync(state.project));
  run('edit','open'); bridges.push(readSession(dir).bridge);
  console.log('PASS: approval → draft → live edits → incremental update → export; failure guards preserve previous output.');
} finally {
  client?.close();
  for(const bridge of bridges) {
    if(bridge?.pid) {try {process.kill(bridge.pid);} catch { /* already closed */ }}
    if(bridge?.tokenFile) rmSync(path.dirname(bridge.tokenFile),{recursive:true,force:true});
  }
  rmSync(dir,{recursive:true,force:true});
}
