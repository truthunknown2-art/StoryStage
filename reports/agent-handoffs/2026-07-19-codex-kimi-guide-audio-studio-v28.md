# Kimi handoff — Director Studio guide-audio review UX

Implement the product-facing guide-audio review strip in the real StoryStage
Director Studio. This is implementation work, not a mockup or design memo.

## Immutable base and branch

- Required base branch: `agent/guide-audio-director-pilot`
- Exact base commit: `4e4cff3ba88427c90f7db0cfec016b42945eee2e`
- Required work branch: `agent/kimi-guide-audio-studio-review`
- Draft PR target: `agent/guide-audio-director-pilot`

Create the work branch from the exact base without rebasing, resetting, or
rewriting another agent's branch.

## Accepted runtime interface

Reuse these exact exports; do not duplicate their validation or invent a
second audio model:

- `DirectorGuideAudioPlayback`
- `DirectorGuideAudioLayer`
- `DirectorProductionCompositionProps.guideAudio`

Both browser Player and worker Director mode already route through the same
Remotion composition at the base commit.

## Required implementation

1. Add a focused `GuideAudioReviewStrip` under
   `apps/studio/src/director/` and integrate it into the real Director preview
   workspace, not the legacy hidden audio screen.
2. Thread an optional `DirectorGuideAudioPlayback` through the real
   `Cv002DraftReview` → `DirectorPreview` path and into the Remotion Player's
   `inputProps`.
3. When a guide artifact exists, show:
   - `Guide read · private timing/scoring only`;
   - `Not final voice · not production-bindable`;
   - exact clock, timing-basis, and WAV content hashes with accessible full
     values;
   - FPS and duration;
   - a real mute/unmute control that changes the Player input props without
     changing the episode plan or picture timing.
4. When no guide artifact exists, show a compact honest silent state. Do not
   add an import/generate/approve button: no real Studio authoring bridge exists
   yet.
5. Preserve the approved mockup-quality Director layout, responsive behavior,
   keyboard use, 44px targets, focus visibility, and reduced motion.
6. Add focused tests proving present/absent states, exact hashes, authority
   labels, mute/unmute Player props, and that toggling does not change the
   episode-plan object/hash.

## Product truth and exclusions

- This is guide timing audio only, never final character voice.
- Do not add music, SFX, recording, provider/API, persistence, approval,
  export, render progress, or fake media state in this slice.
- Do not touch canonical Director/Guide schemas, Ollo rig authority, or asset
  evidence.
- Do not use hardcoded showcase audio or browser-generated fake WAV data in the
  production path. Tests may use an explicit fixture.

## Verification and handback

Run the focused Studio suite, Studio typecheck/build, Director Alpha boundary,
and root `pnpm verify`. Capture desktop and narrow screenshots of the actual
Director Studio with the present and absent guide states. Commit, push, open a
draft stacked PR, and report exact SHA, changed files, tests, screenshots, and
known limitations. Then wait.
