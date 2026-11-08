# EffectCraft / editable FilmCraft delivery

## Objective and acceptance
Preserve the normal Remotion MP4 pipeline and add an editable `.fcproj` package.
EffectCraft is a third visualizer, rendered by its official local MCP/CLI into a
transparent clip of exactly the block size, rate and length. Keep `.ecproj` sources.
FilmCraft exports separate scene clips, independently removable Remotion layers,
native text clips (including captions), and separate voice/music/SFX stems.
Text and layer declarations are shared by Remotion and the exporter: no duplicate
burned-in text. Existing opaque React scenes remain editable as clips, not as
arbitrary vector objects; report that limitation by block. No claim of lossless
React-to-FilmCraft conversion. Preserve a preview MP4 as the visual reference.
Never overwrite a user's edited FilmCraft delivery: create a fresh export folder.

## Assumptions / boundaries
- Use the installed apps and locally downloaded official CLI releases; no service keys.
- Existing main checkout edits and format preferences are not changed.
- Frame timing comes from reel.tsx, not a potentially stale blocks.json.
- Editable layers are explicit full-frame components or positioned text descriptors.
- Native text typography can differ between Chromium and FilmCraft; preview QA required.
- Baked custom transitions/animations remain baked in their rendered layer.
- Always validate dimensions, integer frames, unique layer IDs and output media.
- Ask first for publication or destructive replacement; neither is part of this work.
- Never edit vendor code, commit binaries/secrets, or overwrite source compositions.

## Structure and style
`core/editable.tsx`: typed shared layer rendering; `core/CraftExport.tsx`: export compositions.
`scripts/lib/craft-*.mjs`: local tool sessions, validation and export orchestration.
`scripts/effectcraft.mjs`, `scripts/filmcraft.mjs`: project commands.
`tests/`: Node test runner with real CLI integration and deterministic fixtures.
Use ES modules, explicit arguments, no shell interpolation. Example:
`await client.command('file.saveAs', { path: output });`

## Commands
- `npm run effectcraft -- --project ID --block B01`
- `npm run filmcraft -- --project ID`
- `npm run render -- --project ID` (FilmCraft export when configured)
- `npm test`
- `npx tsc --noEmit`

## Plan / checks
1. Validate official CLI contracts against real binaries; test error handling and timing.
2. Add shared editable-layer contract and export compositions; normal-render regression check.
3. Add EffectCraft scaffold/render integration; verify alpha, frame count and saved source.
4. Build FilmCraft through official commands, save and reopen; edit native text and render preview.
5. Add documentation, doctor checks and an executable small demo; verify package relocation.
