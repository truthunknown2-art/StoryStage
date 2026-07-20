# Kimi handback — Director Studio guide-audio review UX (inbox v28)

Task: `KIMI-GUIDE-AUDIO-STUDIO-REVIEW`
Brief: `reports/agent-handoffs/2026-07-19-codex-kimi-guide-audio-studio-v28.md`
Branch: `agent/kimi-guide-audio-studio-review`
Draft PR target: `agent/guide-audio-director-pilot`

v29 receipt note: this handback was updated for the v29 corrections
(`reports/agent-handoffs/2026-07-19-codex-kimi-guide-audio-studio-corrections-v29.md`);
see the "v29 corrections" section for the exact successor state.

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

---

## v29 corrections (successor)

Brief: `reports/agent-handoffs/2026-07-19-codex-kimi-guide-audio-studio-corrections-v29.md`
Immutable base: `f712e41914715e46434684f257ca48eeaeb4e5e8`

### Corrections applied

1. **Stale-guide guard.** `DirectorAnimaticPreview` now derives the Player
   guide from the current compiled episode: if the supplied playback's timing
   basis no longer matches the episode's exact fps/frame count (e.g. after a
   retiming Director patch), the guide is omitted from Player `inputProps`
   and the strip renders an honest stale state (`Guide read detached — stale
   for the revised cut`, with the hashes kept as evidence and an explicit
   "not retimed, stretched, regenerated, or resealed" note). No crash, no
   silent retime.
2. **Host mute truth.** Local review mute is seeded from the supplied
   playback's `muted` value and resynchronizes whenever the guide identity
   (`expectedGuideVoiceClockContentHash`) changes; a user toggle affects only
   the local Player prop for the current identity and never mutates or
   reseals artifacts. Implemented with the render-time identity-adjustment
   pattern (no effect reset races).
3. **Exact fixture gate.** The dev fixture now activates only for the exact
   query value `guide-audio-fixture=1`; `=0`, empty, `=true`, and other
   values render the honest absent state, as do production builds. The
   fixture also seals once against the compiled source cut and is never
   resealed after Director revisions, so the stale state is genuinely
   demonstrable in the dev server.

### v29 regressions (all pass, suite now 9 tests)

- Real reaction-delay patch with a guide attached: Player receives the
  revised plan, does not throw, the stale guide is omitted from input props,
  and the stale label renders.
- Host guide with `muted: true` reaches the Player initially muted.
- Replacing guide A with guide B reseeds mute from B's supplied value; A's
  user toggle does not leak.
- An unchanged compatible guide stays attached across rerenders and the user
  toggle persists; mute still changes only `inputProps.guideAudio.muted`.
- The dev fixture activates for exactly `?guide-audio-fixture=1`, not `=0`,
  empty, `=true`, or absent.

### v29 verification

- `corepack pnpm --filter @storystage/studio exec vitest run src/director/GuideAudioReviewStrip.test.tsx`
  — 9/9 pass.
- `corepack pnpm --filter @storystage/studio test` — 98/98 pass (full suite
  including the guide suite).
- `corepack pnpm --filter @storystage/story-engine exec vitest run src/director/director-alpha-boundary.test.ts`
  — pass.
- `corepack pnpm --filter @storystage/studio typecheck` / `build` — clean.
- Root `pnpm verify` — three attempts (two parallel, one serialized):
  privacy checks, lint, and typecheck pass; the test phase stops in
  `packages/asset-pipeline`, where 1–2 upstream heavyweight tests exceed
  their hardcoded 5000 ms budgets by ~60–200 ms under current machine load
  (observed 5058–5215 ms; they pass in ~3.7 s isolated and on hosted CI).
  Unmodified by this branch; no timeouts or upstream tests were changed.

### v29 screenshot (stale state — new visible state)

| File | Viewport | State | SHA-256 |
| --- | --- | --- | --- |
| `screenshots/desktop-1536x960-guide-stale.png` | 1536×960 | dev fixture guide detached after the real 6-frame reaction-delay patch; revised cut 0:28 plays, stale strip shows hashes + honest note | `103730cbea99c658dffe76546fdf546512d4a90229c6a8505018e2c3336ea0ff` |

Console status for this capture: no console errors, no warnings, no page
errors. The v28 present/absent captures remain valid — those states are
visually unchanged by v29.

### v29 changed files

- `apps/studio/src/director/DirectorPreview.tsx` — stale-guide guard, mute
  seeding + identity resync.
- `apps/studio/src/director/GuideAudioReviewStrip.tsx` — stale state UI.
- `apps/studio/src/Cv002DraftReview.tsx` — exact `=1` gate; fixture seals
  once, never reseals after revisions.
- `apps/studio/src/director/guide-audio-dev-fixture.ts` — optional script
  parameter (test identity variants).
- `apps/studio/src/cv002-draft-review.css` — stale state styles.
- `apps/studio/src/director/GuideAudioReviewStrip.test.tsx` — five new
  regressions.
- `reports/agent-handoffs/2026-07-19-kimi-guide-audio-studio-review/**` —
  this handback update + the stale capture.

### v29 limitations

- Root verify remains red on this machine only for the documented upstream
  asset-pipeline timeout-margin tests; hosted verification is the deciding
  gate.
- After a retiming patch, the guide stays detached until a host supplies a
  fresh guide for the revised cut — there is no re-guide authoring path yet
  (by design, per scope).
