import path from 'node:path';
import os from 'node:os';
import net from 'node:net';
import { randomBytes } from 'node:crypto';
import { spawn } from 'node:child_process';
import { chmodSync, copyFileSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { startCraft } from './craft-client.mjs';
import { readSession, saveSession } from './edit-session.mjs';
import { relativizeFilmcraft } from './craft-filmcraft.mjs';

export async function saveLiveProject(client, state) {
  await client.command('file.save');
  relativizeFilmcraft(state.project);
}

export async function connectEdit(dir, config) {
  const state = readSession(dir);
  if (!state?.project || !state.bridge) throw new Error('Сначала подготовьте и откройте проект: npm run edit -- open --project ID');
  const client = await startCraft('filmcraft', config, {
    bridge: state.bridge.address, token: readFileSync(state.bridge.tokenFile, 'utf8'),
  });
  try {
    const doc = await client.tool('project_inspect');
    if (!doc.path || realpathSync(doc.path) !== realpathSync(state.project) || doc.activeSequence !== state.sequence) {
      throw new Error('В FilmCraft открыт другой проект или секвенция; вернитесь к согласованному монтажу.');
    }
    return client;
  } catch (error) { client.close(); throw error; }
}

export async function openEdit(dir, config, { restart = false } = {}) {
  const state = readSession(dir);
  if (!state?.project) throw new Error('Сначала npm run edit -- prepare --project ID');
  if (state.bridge && !restart) {
    const existing = await connectEdit(dir, config);
    existing.close(); return;
  }
  const executable = config.filmcraft?.executable || process.env.FILMCRAFT_APP ||
    (process.platform === 'darwin' ? '/Applications/FilmCraft.app/Contents/MacOS/FilmCraft' : 'filmcraft');
  const port = await new Promise((resolve, reject) => {
    const server = net.createServer(); server.on('error', reject);
    server.listen(0, '127.0.0.1', () => { const n = server.address().port; server.close(() => resolve(n)); });
  });
  const privateDir = mkdtempSync(path.join(os.tmpdir(), 'reels-filmcraft-'));
  chmodSync(privateDir, 0o700);
  const token = randomBytes(32).toString('hex');
  const tokenFile = path.join(privateDir, 'token');
  writeFileSync(tokenFile, token, { mode: 0o600 });
  const child = spawn(executable, ['--control', String(port)], {
    detached: true, stdio: 'ignore', env: { ...process.env, FILMCRAFT_CONTROL_TOKEN: token },
  });
  let launchError;
  child.on('error', (error) => { launchError = error; });
  child.unref();
  const bridge = { address: `127.0.0.1:${port}`, tokenFile, pid: child.pid };
  let last;
  try {
    for (let i = 0; i < 60; i++) {
      if (launchError) throw new Error(`Не удалось запустить FilmCraft: ${launchError.message}`);
      const client = await startCraft('filmcraft', config, { bridge: bridge.address, token });
      let ready = false;
      try {
        await client.tool('project_inspect'); // Only read-only readiness probes are retried.
        ready = true;
        await client.command('file.open', { path: state.project });
        saveSession(dir, { ...state, bridge });
        return;
      } catch (error) {
        last = error;
        // Once the app responds, opening a project is never automatically retried.
        if (ready || !/connect|refused|timed out|still starting/i.test(error.message)) throw error;
      } finally { client.close(); }
      await new Promise((resolve) => setTimeout(resolve, 150));
    }
    throw new Error(`FilmCraft не ответил: ${last?.message}`);
  } catch (error) {
    child.kill();
    rmSync(privateDir, { recursive: true, force: true });
    throw error;
  }
}

export async function saveEditCheckpoint(client, state) {
  await saveLiveProject(client, state);
  const folder = path.join(path.dirname(state.project), 'history');
  mkdirSync(folder, { recursive: true });
  copyFileSync(state.project, path.join(folder, `${Date.now()}-${randomBytes(3).toString('hex')}.fcproj`));
}
