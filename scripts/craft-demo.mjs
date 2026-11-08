#!/usr/bin/env node
import { p, readConfig, writeJSON, ensureDir, runLoud } from './lib/util.mjs';
const config = readConfig();
ensureDir(p('projects/craft-demo/work/public'));
writeJSON(p('projects/craft-demo/work/blocks.json'), { blocks: [
  { id: 'B01', frames: 60, visualizer: 'remotion' },
  { id: 'B02', frames: 60, visualizer: 'effectcraft' },
] });
runLoud('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'lavfi', '-i', 'sine=frequency=440:sample_rate=48000', '-af', 'volume=0.05', '-t', String(120 / config.format.fps), p('projects/craft-demo/work/public/voice.wav')]);
runLoud('node', [p('scripts/effectcraft.mjs'), '--project', 'craft-demo', '--block', 'B02']);
runLoud('node', [p('scripts/filmcraft.mjs'), '--project', 'craft-demo', '--out', p('projects/craft-demo/out')]);
