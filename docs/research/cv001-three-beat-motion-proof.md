# CV-001-B deterministic three-beat motion proof

Status: integrated engineering proof submitted for Pro audit. This proves beat compilation and rendering behavior, not final art direction or the finished StoryStage workflow.

## What now exists

- `compileCv001ThreeBeatScene({input, renderPlan})` is a pure compiler with no file, model, clock, UUID, or randomness dependency.
- Its strict input is exactly three ordered intents: `notice-prop`, `reach-and-pick-up`, and `react-and-present`.
- Every input beat is bound to one exact verified-plan shot, scene, duration, 30 fps clock, character, prop, camera intent, and `cv001-paper-cut-rig-v1` contract.
- Every output program has local frame zero, exact duration, contiguous named performance phases, perceptible bone/face/camera motion floors, and only targets rendered by the rig contract.
- Beat one leads torso motion with gaze and head, keeps the lantern free, and settles into a readable hold.
- Beat two uses anticipation, reach, a single ground-to-hand attachment, overshoot, settle, and hold.
- Beat three begins with the lantern attached, reacts toward the audience, presents it, and ends with a hold of at least twelve frames.
- Canonical SHA-256 hashes bind each beat, program, binding, plan, and compiled scene. Editing only beat two changes only its program/binding hashes plus the scene hash.
- `ProductionComposition` consumes the complete `Cv001CompiledSceneMotion` envelope. It validates the scene hash, requires the compiled `planContentHash` to equal the active render-plan hash, requires all three unique bindings, and rejects duplicate targets, stale binding/program hashes, unknown or wrong-scene shots, duration or fps mismatch, and slice truncation.
- The scene renderer shares the pickup transform across beats so the free lantern and its attached hand transform meet without a position, rotation, or scale jump.

## Executable proof

Run:

```text
pnpm --filter @storystage/render-worker render:cv001-three-beat-proof
```

The command writes an ignored evidence packet under `artifacts/CV-001/three-beat-proof/`:

- two ten-second, 300-frame, 30 fps H.264 renders through `StoryStageProduction`;
- FFprobe verification of codec, 1920×1080 dimensions, frame rate, and exact frame count for both MP4s;
- thirteen fixed-frame PNGs spanning all three beats;
- the same thirteen frames decoded from both MP4s with exact matching SHA-256 hashes and at least three visibly distinct decoded frames inside every beat;
- a JSON report with plan, scene, beat, program, binding, and video hashes;
- measured pickup continuity with position, rotation, and scale deltas below `0.001` (currently all zero).

The committed [three-beat contact sheet](../design/creator-first-reset/cv001-three-beat-proof-contact-sheet.png) shows four moments per beat side by side.

## Verification

- `pnpm verify` passes across all workspaces.
- `pnpm build` passes for the render worker, asset worker, Electron host, and Studio.
- Story engine: 56 passing tests, including compiler schema, every supported 24–180-frame beat duration, determinism, serialization, edit isolation, phase/attachment lifecycle, malformed identity/order/intent, stale-plan rejection, duplicate plan targets, duration mismatch, and hash tampering.
- Remotion runtime: four passing contract tests, including the complete scene envelope, exact multi-shot binding, missing-entry rejection, valid-old-scene versus valid-new-plan rejection, unbound fourth-shot behavior, and duplicate, unknown, stale, fps-drift, duration-drift, and truncation rejection.

## Still outside this slice

- The vector character and forest are engineering visuals, not approved Kids assets.
- Script parsing into arbitrary natural beats is not yet wired to this narrow compiler.
- Guide voice, phoneme-level mouth timing, captions, and SFX are not part of this proof.
- The creator-first Studio mock has not yet replaced the current engineering workspace.
- CV-001-C must make the preview dominant and let a plain-language selected-beat direction recompile and replay immediately.
