# Interactive FilmCraft editing

## Objective and approved scope
Implement the user's approved flow: written scene plan → explicit approval → editable
FilmCraft draft → chat-driven edits in the running editor → export on request.
Keep existing exported packages and manual timeline edits. No new dependencies.

## Commands and structure
`npm run edit -- plan|approve|prepare|open|inspect|command --project ID`.
Approval requires `--revision HASH` from the plan shown to the user.
`npm run edit -- update --project ID --block b01` updates a scene and its seams;
`--block all` updates all generated media after a shared source/style change.
`npm run render -- --project ID` exports the current FilmCraft edit once prepared.
The existing standalone Remotion flow remains for old projects without an edit session.

State and readable plan: `projects/ID/work/edit-session.json`, `work/plan.md`.
Owning code: `scripts/lib/edit-session.mjs`, `scripts/edit.mjs`, existing Craft client,
exporter and render command. Tests: Node's `node:test` in `tests/`.
Code follows existing ESM style: `await client.command('file.save', {})`.

## Acceptance and testing strategy
- New block breakdowns enter planning; scaffold and media production reject missing/stale approval.
- Plans show stable scene IDs, clean-track times, narration, visual action, tool, transition and SFX.
- Approval pins the displayed revision; changed plan/blocks invalidate it.
- Draft creation renders required scene media, never a final or reference MP4 by default.
- Open launches a dedicated controllable FilmCraft instance; commands inspect the project
  path and active sequence before mutation. Token stays in a private OS-temp file.
- Scene update imports versioned media and replaces mapped clips in place; no file reopen.
  Clip IDs, trims, timing, effects, other scenes and manually edited native text survive.
  Layer topology and generated timing changes require a fresh draft, never destructive overwrite.
- Changed source files outside the requested block/seams stop partial updates; use all.
- Export saves the live project and exports that sequence, includes manual edits, refuses
  offline media, normalizes loudness and runs existing checks before publishing the file.
- Failures do not publish a partial MP4 or silently fall back to stale Remotion output.

Use small filesystem tests for approval/staleness and source ownership, real CLI integration
for in-place media replacement/manual-edit preservation/export, and desktop bridge smoke
for no-reopen edits. Run `npm test`, `npx tsc --noEmit`, `npm run doctor`.

## Plan / tasks
1. Add plan/approval/session contract and failing tests; wire production gates.
2. Reuse Craft media rendering for initial drafts and partial updates; add replacement tests.
3. Add desktop bridge commands and final FilmCraft export; run native smoke checks.
4. Update agent entrypoints and user docs; review scoped diff and verification evidence.

## Boundaries
Always preserve user media and manual timeline edits; use native FilmCraft commands.
Ask first for new external services, credentials or dependency changes (none needed here).
Never regenerate over the live project or export a different timeline than reviewed.
Preview still needs scene rendering. Caption highlighting and internal baked-scene
editability retain the limitations documented in CRAFT.md.

Selected solution: reuse local exporter/client plus FilmCraft's native bridge and stdlib.
Configuration alone cannot add approval or incremental updates; a new editing engine,
file watcher or third-party dependency would duplicate FilmCraft capabilities.
