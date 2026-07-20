# Kimi handback — Director Studio guide-audio review UX (inbox v28)

Task: `KIMI-GUIDE-AUDIO-STUDIO-REVIEW`
Brief: `reports/agent-handoffs/2026-07-19-codex-kimi-guide-audio-studio-v28.md`
Branch: `agent/kimi-guide-audio-studio-review`
Draft PR target: `agent/guide-audio-director-pilot`

## SHAs

- Required base branch: `agent/guide-audio-director-pilot`
- Exact base commit: `4e4cff3ba88427c90f7db0cfec016b42945eee2e`
- Implementation head: `d1c637b3c0587da203b3b57ac240202b4bc4bac1`
- Branch tip (this handback + screenshots): named separately in the PR body.

## What was built

The product-facing guide-audio review strip in the real Director Studio
workspace, on top of the accepted runtime interface
(`DirectorGuideAudioPlayback`, `DirectorGuideAudioLayer`,
`DirectorProductionCompositionProps.guideAudio`) — no duplicated validation,
no second audio model.

- `apps/studio/src/director/GuideAudioReviewStrip.tsx` (new) — the review
  strip rendered directly under the Director Player in
  `DirectorAnimaticPreview`. Present state: `Guide read · private
  timing/scoring only`, `Not final voice · not production-bindable`, the exact
  full clock, timing-basis, and guide-WAV content hashes (visible in full,
  wrapped, with tooltips), FPS and duration, and a real 44px mute/unmute
  button. Absent state: a compact honest silent note (`No guide read
  attached.`) with no import/generate/approve affordance.
- `apps/studio/src/director/DirectorPreview.tsx` — accepts an optional
  `guideAudio?: DirectorGuideAudioPlayback | null`, holds the review-only
  `guideMuted` state, threads `{ ...guideAudio, muted: guideMuted }` into the
  Player `inputProps` alongside the untouched `episodePlan`, and mounts the
  strip between the Player and the stage caption.
- `apps/studio/src/Cv002DraftReview.tsx` — accepts the optional `guideAudio`
  prop and passes it through the real `Cv002DraftReview → DirectorPreview`
  path. Also hosts the explicit development fixture gate (below).
- `apps/studio/src/director/guide-audio-dev-fixture.ts` (new) — explicit
  development/test fixture: seals a silent PCM WAV, clock, and timing basis
  against the exact compiled episode format. Never invoked in production;
  only reached when the dev server runs with `?guide-audio-fixture=1`, or
  from tests.
- `apps/studio/src/director/guide-fixture-wav.ts` (new) — shared silent-WAV
  byte writer so the sealed fixture bytes and the dev endpoint agree
  byte-for-byte.
- `apps/studio/vite.config.ts` — development-only middleware serving
  `/__guide-audio-fixture.wav?samples=N` (with HTTP range support) so the
  fixture binds an exact same-origin URL whose bytes hash to the sealed clock
  hash. Not part of the production build or runtime.
- `apps/studio/src/cv002-draft-review.css` — strip styles (44px mute target,
  wrapped full hashes, silent-state layout).
- `apps/studio/package.json` — the studio test script now includes
  `src/director/GuideAudioReviewStrip.test.tsx` so hosted verification runs
  the new suite.
- `apps/studio/src/director/GuideAudioReviewStrip.test.tsx` (new) — 4 focused
  tests (below).

## Tests

New suite `src/director/GuideAudioReviewStrip.test.tsx` (4 tests, all pass):

1. Present state shows the exact guide bindings and authority labels — full
   clock/basis/WAV hashes visible, fps/frames shown, playback reaches Player
   input props unmuted with matching hashes.
2. Mute/unmute changes only the Player props — `muted` flips in
   `inputProps.guideAudio` while `inputProps.episodePlan` stays the identical
   object with the identical content hash.
3. Absent state shows the honest silent note with no mute, import, generate,
   or approve control, and `inputProps.guideAudio` is undefined.
4. The sealed episode plan hash is unchanged by attaching and muting the
   guide playback.

## Commands and results

- `corepack pnpm --filter @storystage/studio exec vitest run src/director/GuideAudioReviewStrip.test.tsx`
  — 4/4 pass.
- `corepack pnpm --filter @storystage/studio test` (full studio suite
  including the new file) — 93 tests: 92 pass; the one failure is the known
  pre-existing load flake (`previews a structured beat patch…`, hardcoded
  5000 ms budget, observed 5115 ms under load; passes isolated in 3.9 s;
  unmodified by this branch).
- `corepack pnpm --filter @storystage/story-engine exec vitest run src/director/director-alpha-boundary.test.ts`
  — Director Alpha boundary passes with the new strip in scope.
- `corepack pnpm --filter @storystage/studio typecheck` — clean.
- `corepack pnpm --filter @storystage/studio build` — clean.
- Root `pnpm verify` — two attempts on this machine: privacy checks, lint,
  and typecheck all pass; the recursive test phase stops in
  `packages/asset-pipeline`, where 2–3 upstream tests with hardcoded 5000 ms
  budgets exceed them under machine load (observed 5.07–5.22 s). These are
  the same timeout-margin flakes documented in the v26 handback — they pass
  in isolated runs and on hosted CI (run 29713583046), and this branch does
  not touch asset-pipeline.

## Screenshots (actual Director Studio, present + absent guide states)

Present-state captures use the explicit development fixture
(`?guide-audio-fixture=1`, dev server only); the absent state is the real
production default. Screenshots demonstrate UI behavior; the guide audio is a
silent engineering fixture, never a production voice.

| File | Viewport | State | SHA-256 |
| --- | --- | --- | --- |
| `screenshots/desktop-1536x960-guide-present.png` | 1536×960 | guide present (dev fixture), mute control, full hashes | `7b65a9edb42b5c04aa010768bcaf3ace9e89643d960849bedce970cfced2b033` |
| `screenshots/narrow-1100x760-guide-present.png` | 1100×760 | guide present (dev fixture), hash grid wraps | `eb79bfb0da6cdbbd9647dbc40da3abc695466225d30a6c9bb1afc8a1b88ef831` |
| `screenshots/desktop-1536x960-guide-absent.png` | 1536×960 | no guide artifact — honest silent state | `6936545b09e21a89dfa099bc16fb29b0ca5f8aab9e28302175ee1c99390a7b27` |

Captured with headless Chromium (Playwright 1.62.0-alpha) against the real
Studio dev server. Machine-readable copy: `screenshots/capture-report.json`.

### Browser console status

All three captures: no console errors, no console warnings, no page errors.
(The dev fixture endpoint answers HTTP range requests, so the media pipeline
is quiet.)

## Accessibility

- Mute/unmute is a real 44×44+ button with an explicit accessible name
  (`Mute guide read` / `Unmute guide read`) and `aria-pressed` state.
- Full hash values are visible text (wrapped, no silent truncation) with
  `title` tooltips; the strip is plain flow content, keyboard-reachable.
- Existing Studio focus-visible outlines and the reduced-motion rule are
  untouched; no new animation was introduced.
- Existing Studio responsive behavior preserved — the hash facts grid wraps
  to two columns at 1100px (see narrow capture).

## Control truth

- Mute/unmute: read-write-real — flips only the Player `guideAudio.muted`
  input prop; the episode plan object/hash never changes (test-proven).
- Guide hashes/FPS/duration: read-only-real — rendered from the supplied
  `DirectorGuideAudioPlayback`.
- Import/generate/approve guide audio: omitted — no real Studio authoring
  bridge exists yet; the absent state says so.
- Music, SFX, recording, provider/API, persistence, export, render progress:
  omitted from this slice.

## Known limitations

- No real guide-audio authoring bridge exists in Studio yet; the present
  state is reachable in production only when a host supplies
  `DirectorGuideAudioPlayback` through the `Cv002DraftReview` prop. The dev
  fixture (`?guide-audio-fixture=1`) exists for review/screenshots only and
  is gated to development builds.
- The strip does not show playback position or a waveform; the Player's own
  transport already scrubs the combined timeline.
- Guide mute state is session-local (not persisted) by design for this
  slice.
- The studio suite's pre-existing 5000 ms test (`previews a structured beat
  patch…`) remains a machine-load flake, unchanged by this branch.

## Merge instructions

Draft PR from `agent/kimi-guide-audio-studio-review` into
`agent/guide-audio-director-pilot`. The branch is built on exact base
`4e4cff3ba88427c90f7db0cfec016b42945eee2e` and touches only the Studio app
plus this handback directory; no runtime packages, contracts, or schemas
were modified.

Stopping here per the brief: no music, SFX, recording, provider/API,
persistence, approval, export, render progress, or production authority
added.
