import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { assembleFilmcraft, replaceGeneratedMedia } from '../scripts/lib/craft-filmcraft.mjs';
import { startCraft } from '../scripts/lib/craft-client.mjs';

test('updating generated media preserves manual text, timing, clip IDs and unrelated scenes', async () => {
  const root = mkdtempSync(path.join(os.tmpdir(), 'edit-craft-'));
  let client;
  try {
    const make = (name, color) => {
      const file = path.join(root, name + '.mp4');
      execFileSync('ffmpeg', ['-v','error','-f','lavfi','-i',`color=c=${color}:s=320x180:r=30`,'-t','1','-pix_fmt','yuv420p',file]);
      return file;
    };
    const first = make('first', 'red'), second = make('second', 'blue'), next = make('replacement', 'green');
    const layer = {id:'title',kind:'text',text:'Original',x:10,y:10,width:250,fontSize:20,fontFamily:'Inter',color:'#245CFF'};
    const manifest = {title:'Test',width:320,height:180,fps:30,totalFrames:60,captions:[],blocks:[
      {id:'b01',start:0,frames:30,layers:[layer]}, {id:'b02',start:30,frames:30,layers:[]},
    ]};
    const project = path.join(root, 'test.fcproj');
    const result = await assembleFilmcraft(manifest, [
      {name:'scene-0-b01',file:first,start:0,frames:30,track:'V1'},
      {name:'scene-1-b02',file:second,start:30,frames:30,track:'V1'},
    ], project);
    client = await startCraft('filmcraft', {}, {project});
    const text = result.objects.find((o) => o.kind === 'text');
    await client.command('graphics.setText', {clip:text.clip,layer:0,text:'Manual edit'});
    const initial = await client.tool('sequence_inspect');
    const target = initial.video[0].items[0].clip;
    await client.command('timeline.trim', {clip:target,edge:'in',mode:'regular',deltaFrames:3});
    await client.command('effects.setParam', {clip:target,effect:'opacity',param:'opacity',value:65});
    const before = await client.tool('sequence_inspect');
    await replaceGeneratedMedia(client, result.objects, [{name:'scene-0-b01',file:next}]);
    const after = await client.tool('sequence_inspect');
    assert.equal(after.durationFrames, before.durationFrames);
    assert.deepEqual(after.video[0].items.map(({clip,start,end}) => ({clip,start,end})), before.video[0].items.map(({clip,start,end}) => ({clip,start,end})));
    assert.equal(after.video[0].items[1].item, before.video[0].items[1].item);
    assert.notEqual(after.video[0].items[0].item, before.video[0].items[0].item);
    assert.equal(after.video[0].items[0].sourceIn, before.video[0].items[0].sourceIn);
    assert.deepEqual(after.video[0].items[0].effects, before.video[0].items[0].effects);
    assert.match(JSON.stringify(await client.command('graphics.list', {clip:text.clip})), /Manual edit/);
    await assert.rejects(() => replaceGeneratedMedia(client,result.objects,[{name:'missing',file:next}]), /missing/);
  } finally {client?.close();rmSync(root,{recursive:true,force:true});}
});
