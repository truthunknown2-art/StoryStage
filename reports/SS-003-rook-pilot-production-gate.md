# SS-003 Rook pilot production gate

Date: 2026-07-17
Status: engineering-complete; waiting on Rook visual approval and final voice/editorial approval

## Product decision

After auditing `442cc9f`, Pro recommended a fixed 25-40 second Frankly Weird History pilot with the public Rook candidate review embedded as its first gate. This milestone follows that recommendation. It deliberately does not broaden the asset library, add Blender, automate stock acquisition, or fake a completed episode before the first real character and voice are approved.

## Implemented slice

- `Rook Pilot 001: The Dancing Plague Had a Payroll` is a deterministic 26.33-second, 790-frame, 11-shot, 1920x1080, 30 fps pilot fixture.
- The cut uses environment, character-performance, reaction, and kinetic-type treatments. Narrated shots now include full-duration talk actions and deterministic mouth cues.
- History shots render on a dedicated tactile editorial stage. The stage alternates composition and framing, reaction poses are visible, and kinetic cards display the actual action text instead of a placeholder title.
- The production readiness gate rejects a full history render when a character binding lacks approved private playback pixels or a shot would fall through to a silent generic visual.
- The public Rook candidate now has a complete canonical manifest binding original source images, normalized pose files, prompts, contact sheet, rig manifest, validation, diagnostic report, and diagnostic video.
- Desktop review is main-process controlled. The packaged release is allowlisted and fully hash-verified before it is shown. Approval requires eight unchecked-by-default acknowledgements, privately promotes the exact pixels into an immutable version, rebinds the rig to the production presenter requirement, and creates the next production revision. Rejection persists without binding. Both decisions replay durably.
- Browser mode may inspect the public candidate but cannot approve or promote it.
- The visual QA runner renders four representative frames with an unavoidable `Unapproved Rook candidate - visual QA only` watermark. Its preview-only binding cannot satisfy full-production readiness.

## Automated evidence

- `pnpm verify`: privacy verification, ESLint, all package typechecks, and 113 tests passed.
- `pnpm build`: render worker, asset worker, Electron main/preload, and Studio production bundle passed.
- `pnpm render:rook-preview`: four representative watermarked frames rendered from the fixed pilot.
- Promotion tests use the actual packaged Rook release, prove exact immutable replay, and reject tampered evidence.
- Pilot tests enforce 25-40 seconds, 10-16 shots, at least three allowed treatment families, and talk/mouth-cue coverage for narration.

Private visual QA output is under `artifacts/SS-003/rook-pilot-visual-preview/` and remains ignored by Git.

## Human gates that remain honestly open

1. The user must watch the four-second rig diagnostic and visually approve or reject Rook through the desktop review flow.
2. The user must supply and listen through a real final voice master, then approve the script and timing.
3. Once those gates are satisfied, StoryStage can freeze the new approved revision and render the full 26.33-second pilot. No publishable pilot render is claimed before then.

## Deliberately deferred

Kids Show Pack art, a broad reusable history library, a second character, licensed archive/stock acquisition, subscription-driven ChatGPT image automation, TTS, skeletal or Blender rigs, and marketplace work remain later slices. The correct next move is to finish one real pilot through its human gates, learn from it, and then widen the library.
