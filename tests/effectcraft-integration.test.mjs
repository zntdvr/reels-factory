import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import os from 'node:os';
import { mkdtempSync, cpSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { p } from '../scripts/lib/util.mjs';
import { craftBinary } from '../scripts/lib/craft-client.mjs';
import { verifyCraftVideo } from '../scripts/lib/craft-media.mjs';

test('EffectCraft command produces exact alpha frames and rerender preserves edited source', () => {
  const root = mkdtempSync(path.join(os.tmpdir(), 'effectcraft-test-'));
  try {
    mkdirSync(path.join(root,'scripts/lib'),{recursive:true});
    cpSync(p('scripts/effectcraft.mjs'),path.join(root,'scripts/effectcraft.mjs'));
    for(const file of ['util.mjs','craft-client.mjs','craft-media.mjs']) cpSync(p('scripts/lib',file),path.join(root,'scripts/lib',file));
    const json=(file,data)=>{mkdirSync(path.dirname(path.join(root,file)),{recursive:true});writeFileSync(path.join(root,file),JSON.stringify(data));};
    const format={width:128,height:72,fps:30};
    json('config/project.json',{format,effectcraft:{cli:craftBinary('effectcraft')}});
    json('projects/test/work/blocks.json',{blocks:[{id:'B01',frames:6,visualizer:'effectcraft'}]});
    json('projects/test/effectcraft/B01.json',{steps:[{command:'layer.newSolid',params:{width:20,height:20,color:'#245CFF'}}]});
    const run=()=>execFileSync(process.execPath,[path.join(root,'scripts/effectcraft.mjs'),'--project','test','--block','B01'],{timeout:60000,stdio:'pipe'});
    run();
    const source=path.join(root,'projects/test/effectcraft/B01.ecproj');
    const saved=readFileSync(source,'utf8');
    run();
    assert.equal(readFileSync(source,'utf8'),saved);
    const output=path.join(root,'projects/test/work/public/effectcraft/B01.webm');
    assert.doesNotThrow(()=>verifyCraftVideo(output,{...format,frames:6,alpha:true}));
    assert.throws(()=>verifyCraftVideo(output,{...format,frames:7,alpha:true}),/Перерендерите/);
  } finally {rmSync(root,{recursive:true,force:true});}
});
