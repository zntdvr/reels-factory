import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';
import { existsSync } from 'node:fs';
import { p } from './util.mjs';

export function craftBinary(app, config = {}) {
  const executable = `${app}-cli${process.platform === 'win32' ? '.exe' : ''}`;
  return process.env[`${app.toUpperCase()}_CLI`] || config[app]?.cli ||
    (existsSync(p('tools', 'craft', 'bin', executable)) ? p('tools', 'craft', 'bin', executable) : executable);
}

/** One local headless engine session. No shell, no UI state, no automatic mutation retry. */
export async function startCraft(app, config = {}, { bridge, token, project } = {}) {
  const child = spawn(craftBinary(app, config), ['mcp', ...(bridge ? ['--bridge', bridge] : project ? ['--project', project] : [])], {
    stdio: ['pipe', 'pipe', 'pipe'],
    env: { ...process.env, ...(token ? { FILMCRAFT_CONTROL_TOKEN: token } : {}) },
  });
  const pending = new Map();
  let serial = 0, stderr = '', dead = null;
  const fail = (error) => {
    dead = error;
    for (const { reject, timer } of pending.values()) { clearTimeout(timer); reject(error); }
    pending.clear();
  };
  child.stderr.on('data', (b) => { stderr = (stderr + b).slice(-4000); });
  child.on('error', (e) => fail(new Error(`${app}: ${e.message}. Set ${app.toUpperCase()}_CLI or install tools/craft/bin/${app}-cli.`)));
  child.on('exit', (code) => fail(new Error(`${app} exited (${code}): ${stderr}`)));
  child.stdin.on('error', fail);
  const lines = createInterface({ input: child.stdout });
  lines.on('line', (line) => {
    let reply;
    try { reply = JSON.parse(line); } catch { return; }
    const request = pending.get(reply.id);
    if (!request) return;
    pending.delete(reply.id); clearTimeout(request.timer);
    if (reply.error) request.reject(new Error(`${app}: ${JSON.stringify(reply.error)}`));
    else request.resolve(reply.result);
  });
  const request = (method, params) => new Promise((resolve, reject) => {
    if (dead) return reject(dead);
    const id = ++serial;
    const timer = setTimeout(() => {
      pending.delete(id); reject(new Error(`${app}: timeout in ${method}; operation outcome unknown`));
      child.kill();
    }, 15 * 60 * 1000);
    pending.set(id, { resolve, reject, timer });
    child.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n');
  });
  const close = () => { child.stdin.end(); child.kill(); lines.close(); };
  try {
    await request('initialize', { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'reels-factory', version: '1' } });
    child.stdin.write(JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }) + '\n');
  } catch (error) { close(); throw error; }
  const tool = async (name, args = {}) => {
    const reply = await request('tools/call', { name, arguments: args });
    if (reply.isError) throw new Error(`${app}/${name}: ${JSON.stringify(reply.content)}`);
    if (reply.structuredContent) return reply.structuredContent;
    const text = reply.content?.filter((c) => c.type === 'text').map((c) => c.text).join('\n');
    try { return JSON.parse(text); } catch { return text ?? reply; }
  };
  return { tool, command: (id, params = {}) => tool('command_run', { id, params }), close };
}
