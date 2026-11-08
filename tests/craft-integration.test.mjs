import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, renameSync, readFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { assembleFilmcraft } from '../scripts/lib/craft-filmcraft.mjs';
import { craftBinary, startCraft } from '../scripts/lib/craft-client.mjs';

test('native FilmCraft package reopens after relocation and its Cyrillic text can be edited', async () => {
  const root = mkdtempSync(path.join(os.tmpdir(), 'craft-test-'));
  let client;
  try {
    const wav = path.join(root, 'voice.wav');
    execFileSync('ffmpeg', ['-v','error','-f','lavfi','-i','anullsrc=r=48000:cl=stereo','-t','1',wav]);
    const manifest = {title:'Test',width:320,height:180,fps:30,totalFrames:30,captions:[],blocks:[{id:'B01',start:0,frames:30,layers:[
      {id:'title',kind:'text',text:'Старый текст',x:10,y:20,width:280,fontSize:30,fontFamily:'Inter',color:'#245CFF'},
    ]}]};
    const project = path.join(root,'test.fcproj');
    const result = await assembleFilmcraft(manifest,[{name:'voice',file:wav,start:0,frames:30,track:'A1',audio:true}],project);
    const nativeText = result.objects.find((o)=>o.kind==='text');
    assert.ok(nativeText.clip);
    const moved = `${root}-moved`; renameSync(root,moved);
    try {
      client=await startCraft('filmcraft');
      await client.command('file.open',{path:path.join(moved,'test.fcproj')});
      await client.command('graphics.setText',{clip:nativeText.clip,layer:0,text:'Исправленный текст'});
      await client.command('file.saveAs',{path:path.join(moved,'edited.fcproj')});
      const inspected=await client.command('graphics.list',{clip:nativeText.clip});
      assert.match(JSON.stringify(inspected),/Исправленный текст/);
      assert.equal(inspected.layers[0].overflow, false);
      assert.ok(inspected.layers[0].localBounds[3] > 20, 'paragraph text must not be clipped to a one-pixel box');
      // Export refuses offline media by default; proves relative media paths actually resolve.
      execFileSync(craftBinary('filmcraft'),['--project',path.join(moved,'edited.fcproj'),'export',path.join(moved,'edited.mp4')],{timeout:60000,stdio:'pipe'});
      assert.ok(readFileSync(path.join(moved,'edited.mp4')).length>1000);
    } finally {rmSync(moved,{recursive:true,force:true});}
  } finally {client?.close();rmSync(root,{recursive:true,force:true});}
});
