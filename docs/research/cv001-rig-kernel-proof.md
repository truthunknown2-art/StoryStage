# CV-001-A deterministic rig-kernel proof

Status: accepted by Pro at `0654ce2` and strengthened at `0f53fd8`; not final character art or a finished creator workflow.

## What now exists

- A strict `DirectedBeatProgram` schema with bone, root, face, camera, and attachment tracks.
- Ordered anticipation, action, overshoot, settle, and hold phases.
- A pure `evaluateMotionProgram(program, frame)` path with no timer or wall-clock state.
- A validator that rejects primary motion with fewer than three changing bones, rejects root translation without articulation, and requires facial motion, camera motion, and bounded prop attachment for CV-001.
- An explicit `cv001-paper-cut-rig-v1` contract. Validation rejects unknown bones, unsupported properties/channels/attachments, and duplicate track targets rather than counting motion the renderer will ignore.
- No full-body pose-swap track exists in the new motion-program schema.
- A 120-frame, 30 fps Remotion proof composition with one character, a two-layer forest, foreground occlusion, camera/parallax motion, gaze, blink, mouth, torso/head/arm/forearm/hand motion, and a lantern that becomes a child of the hand hierarchy.
- A shot-bound `directedMotions` path inside `ProductionComposition`. Every strict binding must identify an existing unique shot, match the plan frame rate, exactly match the shot duration, and fit inside the rendered slice without truncation.
- A repeatable render command: `pnpm --filter @storystage/render-worker render:cv001-rig-proof`.

The local proof render now goes through `StoryStageProduction`, not the standalone proof composition. It produces an H.264 MP4, seven exact-frame PNGs, and a JSON report under ignored `artifacts/CV-001/rig-kernel-proof/`. The report proves plan, program, and rendered duration are all 120 frames. It also records the lantern's full free and attached world transform at frame 48 and requires position, rotation, and scale deltas below 0.001; all three current deltas are zero. The committed [contact sheet](../design/creator-first-reset/cv001-rig-kernel-proof-contact-sheet.png) includes adjacent frames 47 and 48 so the pickup boundary is directly inspectable.

## What this does not claim

- The vector test character is not an approved StoryStage art style.
- The CV-001-B compiler now handles the three fixed proof intents; arbitrary script beats remain outside this slice.
- The main Studio does not yet expose the proof as the default Kids workflow.
- The Director prompt, undo history, beat navigation, phoneme alignment, and production asset-rig format remain future CV-001 slices.
- The legacy three-image `CharacterPerformance` path still exists for saved productions and must not be described as the new kernel.

## Next slices

1. CV-001-C: replace the default workspace with the preview-first Studio shell and make one selected-beat direction update recompile and replay immediately.
2. Replace the engineering vector character with a project-owned, style-approved rig kit generated or authored as separate parts.
