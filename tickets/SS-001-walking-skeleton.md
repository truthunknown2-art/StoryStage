# SS-001 — StoryStage walking skeleton

## Objective

Prove the browser studio, sandboxed Electron boundary, separate render worker, deterministic Remotion preview, local MP4 render, and recoverable job lifecycle.

## Acceptance criteria

- `pnpm dev` launches Vite and Electron; `pnpm dev:web` launches the same browser studio.
- Productions opens the sample episode, and scenes, visible shots, timeline items, and inspector stay in sync.
- The validated fixture is 1280×720, 30 FPS, and exactly 360 frames, with two scenes and four shots.
- The composition includes two cutout characters, layered depth, hard cut, camera push, gesture, reaction pose, timed mock dialogue, caption, and local SFX.
- Desktop rendering reports typed job progress, opens a completed file, and exposes Retry after failure.
- Electron is isolated and sandboxed; both process boundaries validate specific messages.
- `pnpm verify`, `pnpm build`, a real render, two-pass determinism, and visual inspection pass.
- Evidence is saved under gitignored `artifacts/SS-001/` and summarized in `reports/SS-001-report.md`.

## Out of scope

AI, voice/image generation, After Effects, Blender, cloud rendering, auth, payments, final branding, sophisticated rigs, persistence, and general timeline editing.
