Checklist: 41/41 complete
Incomplete: None

# Surgical Change Delivery

**Verdict:** DELIVERED — KEEP

## Change contract
User-approved scope: replace automatic final rendering with plan approval, editable
FilmCraft draft, live chat edits, incremental scene replacement and explicit final export.
Protected: original media, existing packages, manual trims/effects/text and prior ready MP4.
Non-goals: a new editor, React-to-native conversion, caption-highlighting parity.

## Solution decision
| Candidate rung | Evidence / tradeoff | Decision |
|---|---|---|
| No change / configure | Existing exporter always starts a separate headless session and rebuilds packages | Rejected |
| Reuse local | Reuse media renderer, layer contract, timeline assembler, loudness and checks | Selected |
| Platform / installed | Node filesystem/process/crypto/net; installed FilmCraft 0.18.0 bridge and commands | Selected |
| Dependency | No additional package is needed | Rejected |
| Minimal custom | Approval revision and source ownership are repository-specific policy | Selected |

## Acceptance and implementation
| Requirement | Owning change | Observable evidence | Result |
|---|---|---|---|
| Readable plan and explicit version approval | edit-session, edit CLI, production gates | Missing/stale approval unit tests and CLI smoke rejects scaffold/prepare/render | PASS |
| Scene tools match approved plan | CraftExport manifest and exporter comparison | Real draft prepares with planned camera/Remotion sources | PASS |
| Draft without final/reference MP4 | filmcraft draft path | Desktop smoke asserts both files absent before export | PASS |
| Live edits without reopen | Craft bridge, desktop launcher and edit commands | Native text edit; repeat open retains same bridge; incremental update retains clip ID | PASS |
| Preserve other scenes/manual changes | native replaceFromBin | Integration retains trims/sourceIn/effects/text; smoke leaves b04 item unchanged | PASS |
| Stale sources cannot be exported | source snapshot and render routing | Smoke rejects render before scene update | PASS |
| Actual reviewed timeline exported | FilmCraft exportMedia; shared normalization/checks | 1080×1920 H.264/AAC/yuv420p native export, four seconds, measured −13 LUFS | PASS |
| Failure preserves prior ready video | candidate validation before publication | Offline-media export rejected; previous MP4 hash unchanged | PASS |
| Wrong document cannot be edited | project path and active-sequence check | Smoke opens another .fcproj and rejects edit command | PASS |
| Structural changes preserve old project | snapshot/adopt | Smoke rejects in-place structure change, builds separate snapshot, adopts and opens it | PASS |
| Package media stay portable | shared relative-path normalization after native saves | Relocation integration and desktop smoke path assertions | PASS |

## Additions, removals, and residual risks
- Added edit command/session, live bridge launcher, native final-export helper and desktop smoke.
- Extended existing exporter with draft/update/snapshot modes; reused its rendering and native assembly.
- New blocks enter planning; scaffold and visualizer commands enforce approval for enrolled projects.
- Render routes enrolled projects to FilmCraft. Old projects without sessions keep their verified
  Remotion command path until explicitly enrolled, preserving existing consumers.
- Full reference.mp4 rendering is opt-in with --reference. No dependencies changed.
- Updated METHOD, PIPELINE, CRAFT, AGENT-RULES, reel skill, README and config docs;
  complete operator instructions are in docs/EDITING.md.
- Existing feedback line from the preceding conversation was preserved.
- Native batch commands are sequential rather than transactional. History snapshots precede edits;
  on error inspect/Undo/recover, without automatically replaying mutations.
- Layer topology, caption-page structure and timing changes require a separate draft and review.
- Complex animation still needs scene rendering. Native captions retain documented lack of per-word
  highlighting; baked scene internals remain editable only in their source tools.
- Manual external media references remain absolute and must accompany a moved package.
- Verified locally on macOS with FilmCraft 0.18.0; other desktop platforms are documented but untested.
- Temporary smoke projects and their task-owned desktop instances are cleaned after the checks.
  No source media, other user's projects, commits, pushes or remote services were changed.

## Test portfolio decisions
- KEEP existing Craft contracts, relocation, EffectCraft CLI and footage tests.
- UPDATE EffectCraft fixture to include the new approval helper dependency.
- ADD filesystem unit coverage for approval revisions/source ownership: deterministic policy checks.
- ADD native integration for replacement preserving manual trims/effects/text.
- ADD explicit `npm run test:editing`: real desktop acceptance; kept outside default tests
  because it launches windows and renders media. No skipped tests or mock engines.
- `npm test`: 16/16 passed.
- `npm run test:editing`: passed with native desktop, including structure snapshot/adoption.
- `npx tsc --noEmit`: passed.
- `npm run doctor`: required local tools available; optional ElevenLabs/avatar unconfigured.
- `git diff --check`: passed.
- Five-axis self-review covered correctness/error paths, readability, ownership, token secrecy,
  bounded source scanning and native media preservation; no unresolved blocking finding.
