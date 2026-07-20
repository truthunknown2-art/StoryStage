# EDI-001B private editorial guide-audio proof

Status: **PASS**, private evidence only, `productionBindable: false`.

## Delivered scope

- Added a private render-worker CLI accepting one exact UTF-8 script file, one
  exact 48 kHz integer-PCM WAV, and clause timing JSON.
- Sealed and re-verified `GuideVoiceClock` and `GuideVoiceTimingBasis`, including
  exact script, WAV, clause, FPS, and duration lineage.
- Recompiled the Director project with the sealed clock hash as its
  `guide-audio` timing basis.
- Created guide-bound editorial request, timing binding, clause registry, and
  frame-grid artifacts.
- Reopened the source WAV immediately before render and rejected any content
  hash change.
- Rendered audio-on and muted MP4s through `StoryStageProduction` with
  `mode: director-episode` and the same picture/episode props.
- Verified the audio-on file has 48 kHz stereo AAC and the renderer-muted file
  has no audio stream.
- Kept the raw script, WAV, clause input, and MP4 output outside Git.

## Exact evidence

- Guide WAV SHA-256:
  `95a47a37e6f5d2dabf392a058f654bfcba906f0cf680eba44a94260d3ee1bff0`
- Guide clock:
  `8fd04b0b0dd2a18a601b65288d467eb1ac653c4f74ccaeca1e6528bcfae12b99`
- Guide timing basis:
  `b5c299f8079a5c9bb28e8d717a535da8d0a156e226f721277d78dedc678e7f13`
- Executable episode plan:
  `b7b276566c014349222c963d45904b006c4847566e1c945198d84f7cff96fe0f`
- Picture/episode props:
  `933aa5bda4d8f1e1c9b8ed3866fcbc4036775ac2535cae9e014d77a794a5bb20`
- Audio-on MP4 SHA-256:
  `ff9fe58bc714b896b13a7f00a0039b8f7c1da23581c618d4db0342bfc4a26793`
- Muted MP4 SHA-256:
  `84038c01de2716e8edaf1e3643df2630f16e00acd7bd70312b94a3559b8007aa`

Output files:

- `C:\Projects\StoryStage-editorial-guide-pilot\artifacts\EDI-001B\editorial-guide-audio-proof\8fd04b0b0dd2a18a601b\audio-on.mp4`
- `C:\Projects\StoryStage-editorial-guide-pilot\artifacts\EDI-001B\editorial-guide-audio-proof\8fd04b0b0dd2a18a601b\muted.mp4`
- `C:\Projects\StoryStage-editorial-guide-pilot\artifacts\EDI-001B\editorial-guide-audio-proof\8fd04b0b0dd2a18a601b\proof-report.json`

The committed machine-readable report is
`reports/agent-handoffs/2026-07-19-codex-editorial-guide-audio-proof.json`.

## Verification

Executed from `C:\Projects\StoryStage-editorial-guide-pilot`:

```text
.\node_modules\.bin\vitest.cmd run apps/render-worker/src/worker-protocol.test.ts apps/render-worker/src/rook-pilot-motion-review-lineage.test.ts apps/render-worker/src/director-capability-assets.test.ts apps/render-worker/src/candidate-rig-private-registration-diagnostic.test.ts apps/render-worker/src/editorial-guide-audio-proof.test.ts
PASS: 5 files, 23 tests

.\node_modules\.bin\tsc.cmd -p apps/render-worker/tsconfig.json --noEmit
PASS

.\node_modules\.bin\eslint.cmd apps/render-worker/src/editorial-guide-audio-proof.ts apps/render-worker/src/editorial-guide-audio-proof-cli.ts apps/render-worker/src/editorial-guide-audio-proof.test.ts
PASS

.\node_modules\.bin\prettier.cmd --check apps/render-worker/src/editorial-guide-audio-proof.ts apps/render-worker/src/editorial-guide-audio-proof-cli.ts apps/render-worker/src/editorial-guide-audio-proof.test.ts apps/render-worker/package.json reports/agent-handoffs/2026-07-19-codex-editorial-guide-audio-proof.json reports/agent-handoffs/2026-07-19-codex-editorial-guide-audio-proof.md
PASS

.\node_modules\.bin\tsx.cmd apps/render-worker/src/editorial-guide-audio-proof-cli.ts --script C:\Projects\StoryStage-guide-inputs\ollo-guide-v1\script.txt --wav C:\Projects\StoryStage-guide-inputs\ollo-guide-v1\guide.wav --clauses C:\Projects\StoryStage-guide-inputs\ollo-guide-v1\clauses.json
PASS
```

## Truthful limitations

- The actual proof is 760 frames / 25.333333 seconds, not an exact 30-second
  episode. No exact 30-second Director episode was available for this commit.
- Visual capability is `0 supported / 10 proxy-only / 0 blocked`; no approved
  Ollo rig or final character performance is bound.
- The guide clock is bound to editorial artifacts and the total episode
  duration. Individual picture cuts still come from the existing deterministic
  Director plan; no accepted editorial proposal retimed them in this commit.
- The latest output hashes are exact evidence for this execution. This proof
  does not claim byte-identical AAC/MP4 output across separate encodes.
- The Ollo environment PNGs concurrently present under
  `packages/remotion-runtime/public/show-packs/kids/ollo-friends/` are unrelated
  image-lane work and are intentionally excluded from this commit.
