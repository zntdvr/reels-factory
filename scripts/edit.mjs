#!/usr/bin/env node
import path from 'node:path';
import { args, p, readConfig, readJSON, runLoud } from './lib/util.mjs';
import { approvePlan, readSession, requireApproval, writePlan, saveSession, sourceSnapshot } from './lib/edit-session.mjs';
import { connectEdit, openEdit, saveEditCheckpoint, saveLiveProject } from './lib/filmcraft-live.mjs';

const options = args();
try {
  if (typeof options.project !== 'string' || !/^[a-z0-9-]+$/i.test(options.project)) throw new Error('Укажите --project ID');
  const dir = p('projects', options.project), config = readConfig();
  const action = options._[0];
  if (action === 'plan') {
    const plan = writePlan(dir);
    console.log(`${plan.text}\nВерсия для утверждения: ${plan.revision}`);
  } else if (action === 'approve') {
    approvePlan(dir, options.revision);
    console.log('План утверждён. Можно создавать сцены и готовить проект.');
  } else {
    requireApproval(dir);
    if (action === 'prepare' || action === 'update') {
      if (!readSession(dir)) throw new Error('Сначала создайте и утвердите монтажный план.');
      runLoud('node', [p('scripts/filmcraft.mjs'), '--project', options.project,
        ...(action === 'prepare' ? ['--draft'] : ['--update', String(options.block ?? '')])]);
    } else if (action === 'adopt') {
      if (!readSession(dir)?.approval) throw new Error('Сначала согласуйте монтажный план.');
      if (typeof options.file !== 'string') throw new Error('Укажите --file путь-к-новому.fcproj');
      const project = path.resolve(options.file), output = path.dirname(project);
      const build = readJSON(path.join(output, 'edit-build.json'));
      const manifest = readJSON(path.join(output, 'manifest.json'));
      if (project !== path.join(output, `${options.project}.fcproj`) || manifest.id !== options.project || build.approval !== readSession(dir)?.approval ||
        JSON.stringify(build.sources) !== JSON.stringify(sourceSnapshot(dir))) throw new Error('Новый черновик не соответствует текущему утверждённому плану/исходникам.');
      saveSession(dir, { ...readSession(dir), project, output, sequence: build.sequence, sources: build.sources, bridge: null });
      console.log('Новый черновик выбран; прежний проект сохранён. Откройте edit open для просмотра.');
    } else if (action === 'open') {
      await openEdit(dir, config, { restart: options.restart === true });
      console.log('FilmCraft подключён. Изменения из чата появятся в этом окне.');
    } else if (action === 'inspect' || action === 'command') {
      const client = await connectEdit(dir, config);
      try {
        if (action === 'inspect') {
          console.log(JSON.stringify({ document: await client.tool('doc_inspect'),
            objects: readJSON(path.join(path.dirname(readSession(dir).project), 'objects.json')) }, null, 2));
        } else {
          if (typeof options.file !== 'string') throw new Error('Укажите --file commands.json: массив {id, params}.');
          const steps = readJSON(path.resolve(options.file));
          if (!Array.isArray(steps) || !steps.length || steps.some((s) => typeof s.id !== 'string' ||
            /^(file\.|export\.|app\.|project\.new|sequence\.new)/.test(s.id))) {
            throw new Error('Нужны команды редактирования; открытие, экспорт и замена проекта выполняются отдельными шагами.');
          }
          await saveEditCheckpoint(client, readSession(dir));
          for (const step of steps) console.log(JSON.stringify(await client.command(step.id, step.params ?? {})));
          await saveLiveProject(client, readSession(dir));
        }
      } finally { client.close(); }
    } else throw new Error('Команда: plan, approve, prepare, open, inspect, command, update или adopt. См. docs/EDITING.md.');
  }
} catch (error) { console.error(error.message); process.exitCode = 1; }
