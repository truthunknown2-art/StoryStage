# Control-to-state map — KIMI-UI-SLICE-B-STUDIO-SHELL

Scope: the post-create Studio shell (`DirectorAnimaticPreview` in `apps/studio/src/director/DirectorPreview.tsx`, reached via Create first cut → Review direction draft) for both Kids Adventure and Weird History drafts. Every visible element below is accounted for as **real**, **disabled with reason**, or **omitted**.

## Left — Scenes and beats rail (`CreatorSceneRail`)

| Control | State | Behavior |
| --- | --- | --- |
| Scene group headers | real (display) | Scene ordinal + beat count from the sealed `Cv002Project` graph |
| Beat cards (image-led) | real | `DirectorFrameThumbnail` renders the canonical frame for that beat from the sealed episode plan; click selects the beat (`selectDirectorWorkspaceBeat`) and seeks the Player to the beat's exact resolved start frame |
| `aria-pressed` selection state | real | Tracks `workspace.selectedBeatId`; playback can move it via frame-sync |

## Center — stage

| Control | State | Behavior |
| --- | --- | --- |
| `DirectorProductionComposition` Player | real | Dominant canvas; plays the sealed episode plan (`inputProps={{ episodePlan: episode }}`), native Remotion controls (play, volume, scrub, fullscreen), `loop` |
| Stage heading (Scene · Beat, beat title) | real (display) | Derived from selection |
| `Draft animatic` badge | real (honest label) | States exactly what the media is |
| "Now directing Beat N · N shots · Ns" caption | real (display) | Counts from `directorPlan` + episode format |

## Right — Director controls

| Control | State | Behavior |
| --- | --- | --- |
| Undo / Redo direction | real | `undoDirectorWorkspace` / `redoDirectorWorkspace`; restore exact canonical cut hashes, retain selected beat, replay the beat; disabled only when no history exists in that direction |
| Canonical cut hash chip | real (display) | First 12 chars of `director.contentHash`, full hash in tooltip |
| Selected beat text | real (display) | Exact source text |
| "Direct this beat" input + Preview change (`DirectorCommandPanel`) | real | `proposeDirectorPatch` against the current director project; errors shown verbatim; success opens `DirectorChangePreview` |
| Visual / Motion department tabs | real | Switch between `DirectorVisualPanel` and `DirectorMotionPanel` |
| Visual panel controls (shot select, shot size, camera movement, per-shot actions) | real (patch-backed) | Each produces a sealed `DirectorPatch` preview via `onPreview`; copy states "These controls create a sealed Director patch and fully recompile the canonical cut" |
| Motion panel facts (requested performance, first-cut status, reaction event/delay) | real (display) | Read-only facts from the beat's resolved motion program |
| `DirectorChangePreview` (Proposed change → Apply and replay / Cancel) | real | `applyDirectorPatch` recompiles the episode; thumbnails + timeline rebuild (new `data-episode-hash`); replay-on-next-plan auto-plays the affected beat |
| Capability card (`Proxy performance` / `Render-ready performance`, `Final character rig unavailable`) | real (honest label) | Derived per selected beat from `capabilityReport.items` |
| Metrics footer (scenes/beats/shots) | real (display) | Counts from the director plan |
| `Advanced / Preflight` details | real, **closed by default** | Episode plan hash, revision base, capability tally |

## Bottom — timeline

| Control | State | Behavior |
| --- | --- | --- |
| Beat strip (`CreatorBeatStrip`) | real | Thumbnail cards from the sealed episode; click selects beat + seeks to exact start |
| `Selected-beat timeline` drawer (`DirectorTimelineDrawer`) | real, **collapsed by default** | Expands to real Shots, Events, and Camera lanes only (`createDirectorTimelineViewModel`); event markers seek to their resolved event frame; playhead tracks live playback frame |

## Header (Cv002DraftReview chrome, unchanged by this slice)

| Control | State | Behavior |
| --- | --- | --- |
| Projects back button | real | Returns to the Create screen |
| Undo/redo (top bar) | real | Same workspace history |
| "Saved locally" | real (display) | Draft persisted to localStorage |
| Step tabs (Script / Scenes & beats / Direction draft) | real | Navigate the draft steps |

## Intentionally omitted (with reason)

- **Audio, Assets, Export buttons/panels** — no real behavior exists for them in this build; the brief forbids pretending.
- **Waveforms, trim handles, keyframe editors** — fabricated-media controls; forbidden.
- **Production confidence matrices, capability hashes in default view** — kept behind the closed `Advanced / Preflight` details only.

## Known pre-existing finding (not introduced by this slice)

Kids route: one axe `critical:image-alt` and one console warning (`EncodingError: The source image cannot be decoded.`), both from a single 2098×750 blob `<img>` rendered **inside `.__remotion-player`** by `DirectorProductionComposition` (`packages/remotion-runtime` — outside the allowed scope, byte-identical to base `21e8d4c`, finding pre-exists on the untouched base). Weird History route reports zero critical/serious axe findings and zero console warnings/errors. Remediation needs a remotion-runtime change (alt text / decodable source for that composition image), flagged for Codex/Pro.
