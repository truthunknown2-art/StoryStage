# F5-WP1 immutable handback

Task: `F5-WP1-AUDIO-WORKSPACE-TRACK-HIERARCHY`
Issue: [#124](https://github.com/truthunknown2-art/StoryStage/issues/124)
Draft PR: [#126](https://github.com/truthunknown2-art/StoryStage/pull/126)
Required branch: `agent/kimi-f5-wp1-audio-workspace-track-hierarchy`
Inbox: version `92` on `origin/agent/kimi-frontend`

## Exact identity

- Exact accepted base: `eb9890d75126381e61849a5994f28474d133bfb7`
  (the watcher-supplied workspace was detached at exactly this commit, clean
  tree, verified an ancestor of `origin/product/v1` before writing).
- Implementation SHA: `d12116a602b463900ebffda8952a5c79fa062ee6`
- Kimi handback tip: the commit containing this file, reported as an exact
  remote SHA in PR #126 and issue #124 because a Git commit cannot embed its
  own SHA.
- Required branch was confirmed absent locally and remotely before creation.

## Delivered result

One bounded Product v1 **Audio workspace**, reachable from the accepted
Studio shell through the Scene board / Assets & Rigs / Audio workspace
switch, that preserves the accepted Projects → Create → shared proposal
review → Studio journey and every accepted F1–F4 surface exactly:

- Four understandable track views — Narration, Dialogue, SFX, and Music —
  with programmatic selected state (`role="tab"`, `aria-selected`, roving
  tab index, and the same ArrowLeft/ArrowRight/Home/End keyboard contract
  as the accepted Director tabs). Heading, count/state summary, cards, and
  inspector always agree on the selected track.
- One explicit shared scene/beat scope: the workspace reads the shell's
  authoritative selected scene/beat and drives changes through the same
  selection callbacks, so the rail, scope header, board, and audio surface
  can never disagree. A scene or beat change deterministically re-resolves
  the visible cards (render-time adjustment, no effect races) and can never
  leak a stale card selection from the previous scope or another track.
- Truthful local-demo fixtures only: five narration planning takes, three
  dialogue planning takes, five SFX planning cues, and three music planning
  cues, each grounded in the accepted Ollo demo hierarchy with its guide
  placement inside the demo beat's planning seconds. Every card is labelled
  **Local demo planning card — no audio exists** with a planning status
  (**Planned take — nothing recorded** / **Planned cue — no audio placed**).
- An understandable empty state per track and scope that explains what
  later accepted work enables (F5-WP2 recording states, F5-WP3 placement
  states) without any fake success action.
- One selected-track inspector exposing only this slice's planning
  metadata: track type, scene/beat scope, selected take/cue identity,
  status/truth label, and the guide-versus-final timing basis.
- Exact timing truth: **Guide timing — provisional planning only, not final
  timing** appears wherever a guide placement is shown, and **Final timing —
  unavailable until later accepted audio work** keeps the boundary explicit.
- Record take, Audition take/cue, Import audio, and Play cue orientation
  actions are visibly disabled, each with its specific unavailable reason.
  No device, file, playback, waveform, lip-sync, mixing, persistence,
  provider, worker, backend, Godot, Remotion, rendering, export, packaging,
  or success path exists in this package.
- The board surfaces (rail, board, inspector, AI Director panel, episode
  overview) stay mounted behind `hidden` while the workspace is open, so
  the selected scene/beat, playhead, per-beat direction history, and AI
  Director panel session state are preserved exactly.

## Changed files (implementation `d12116a`)

```
 apps/studio/scripts/f5-wp1-evidence.mjs              | 487 ++++++
 apps/studio/src/App.test.tsx                         |   1 +
 apps/studio/src/product-v1/AudioWorkspace.tsx        | 312 ++++
 apps/studio/src/product-v1/StudioShell.tsx           |  33 +-
 apps/studio/src/product-v1/asset-accessibility.test.tsx |   9 +-
 apps/studio/src/product-v1/audio-workspace.test.tsx  | 546 ++++++
 apps/studio/src/product-v1/audio-workspace.ts        | 398 ++++
 apps/studio/src/styles.css                           | 274 ++++
 8 files changed, 2052 insertions(+), 8 deletions(-)
```

The handback commit adds only this package's evidence directory
(`reports/agent-handoffs/2026-07-22-kimi-f5-wp1-audio-workspace-track-hierarchy/`)
containing this file, the machine-readable report, and nine hashed
screenshots. No manifest, lockfile, roadmap/status/plan document, Kimi
inbox, contract, story engine, desktop, worker, Godot, Remotion, asset,
audio-engine, persistence, renderer, export, packaging, or legacy file was
changed.

One accepted-test expectation was updated for the new interface:
`asset-accessibility.test.tsx` encoded the two-workspace Tab walk, so its
forward walk now asserts the new Audio workspace tab stop (proving the new
control is keyboard reachable in the same logical order) before reaching
the first asset category. Every other accepted F1–F4 test runs unchanged.

## Verification

- `pnpm --filter @storystage/studio exec vitest run src/product-v1/audio-workspace.test.tsx`
  — PASS, 17/17 focused tests: fixture grounding in the accepted demo
  hierarchy; per-track/per-beat scope isolation; deterministic selection
  with no stale retention; exact scope/count/timing labels; Narration
  agreement across tab state, heading, count, cards, and inspector; track
  switching synchronization; observable inspector change on card selection;
  deterministic re-resolution on shared scene and beat changes; exact
  Dialogue empty state and later-work copy; honest empty states on every
  track of an empty scope; guide-versus-final timing truth; no
  device/file/playback/waveform/lip-sync/mixing success path; roving
  tab-index keyboard contract; Studio navigation reachability; two-way
  shared scope with the board; and preserved board state across switching.
- `pnpm --filter @storystage/studio test` — PASS, 246/246 tests (the
  standard command; the focused file is wired into the already-enumerated
  `App.test.tsx` entrypoint, so all 17 new regressions run there).
- `pnpm --filter @storystage/studio typecheck` — PASS.
- `pnpm --filter @storystage/studio build` — PASS; only the pre-existing
  Vite large-chunk warning remains.
- Touched-file lint (`npx eslint` on every changed source/script file) —
  PASS with zero errors; `git diff --check` — PASS.
- `node apps/studio/scripts/f5-wp1-evidence.mjs` against the local Studio
  dev server (`vite --host 127.0.0.1 --port 5195`) — PASS, 15/15 checks,
  zero console warnings, zero console errors, zero page errors, no
  horizontal document overflow in any captured state (document/client width
  evidence recorded per state in the report).
- Hosted verification: GitHub Verify run `29963915210` — PASS on exact
  implementation `d12116a602b463900ebffda8952a5c79fa062ee6`. The hosted run
  for the exact handback tip is reported in PR #126 and issue #124 once the
  pushed tip's check completes.
- Repository-root verification:
  - `verify:roadmap` — FAILS ONLY with the brief-anticipated pre-transition
    conflict: the branch is rooted at the mandated base whose
    `docs/ROADMAP_STATUS.md` still records `ACCEPTED_WAIT` / owner Codex /
    F4-WP5, while the live inbox is `START-NOW` for F5-WP1, so the guard
    reports `Codex owns the active package but Kimi is not waiting:
    START-NOW`. No status/roadmap file may be edited by this package.
  - Synthetic merge proof: a clean git worktree of exact implementation
    `d12116a` with only the authorization block of `docs/ROADMAP_STATUS.md`
    set to the live START_NOW state (`F5 / F5-WP1 / owner Kimi / exactBase
    eb9890d… / issue 124 / pr 126 / candidateContentHead d12116a… /
    candidateRef agent/kimi-f5-wp1-audio-workspace-track-hierarchy`)
    passes the same guard against the live inbox:
    `Roadmap consistency PASS: F5 / F5-WP1 / START_NOW /
    eb9890d75126381e61849a5994f28474d133bfb7 /
    d12116a602b463900ebffda8952a5c79fa062ee6`. The synthetic tree was
    discarded after the check; nothing was normalized or concealed.
  - `verify:director-capability-assets` — PASS (19 assets).
  - `verify:candidate-rig-review-implementation-receipt` — PASS.
  - `verify:e1-app-server-schema` — PASS (`0.144.1`).
  - `verify:e1-wp4-failure-matrix` — PASS.
  - `verify:privacy` — PASS (1126 tracked and publishable files, measured
    after this package's evidence and handback were added).
  - `pnpm lint` — PASS with zero errors; only the two pre-existing Remotion
    purity warnings in `apps/render-worker/src/kvp001-proof.ts` remain.
  - `pnpm typecheck` (all packages) — PASS.
  - `pnpm test` (recursive, all packages) — every workspace package with a
    test script passes in full; the apps/studio suite passes 246/246 and
    `@storystage/story-engine` passes 353/353. `packages/asset-pipeline`
    (outside this package's allowed files, byte-identical to the base)
    shows the documented pre-existing timing-sensitive timeouts in heavy
    CPU image tests on this shared machine
    (`character-rig-staging.test.ts`, `character-rig-preparation.test.ts`,
    and the `candidate-rig-authored-decoration-mask-input.test.ts`
    `beforeAll` timing race recorded in `docs/ROADMAP_STATUS.md` for hosted
    run `29958094934` attempt 1); story-engine's
    `candidate-rig-review.test.ts` shows the same 5 s timeout behavior
    under load. Each implicated file passes in isolation and each suite
    passes with bounded workers. `packages/asset-pipeline` and
    `packages/story-engine` neither import nor execute any studio code and
    are byte-identical to the accepted base in this branch's diff, so the
    flake cannot be caused by this package's change; no failure was
    normalized or concealed. See the exact-run ledger below.

### Exact-run ledger for the out-of-scope flake

1. Root `pnpm --workspace-concurrency=1 -r --if-present test` (serialized):
   story-engine 353/353 PASS; asset-pipeline 1 timeout
   (`character-rig-staging.test.ts`).
2. `pnpm --filter @storystage/story-engine test` standalone: 352/353, one
   5 s CPU timeout (`candidate-rig-review.test.ts`); same single timeout on
   an immediate retry.
3. `candidate-rig-review.test.ts` alone: PASS 9/9 in 1.2 s.
4. story-engine full suite with `--maxWorkers=2`: PASS 353/353.
5. asset-pipeline full suite with `--maxWorkers=2`: PASS 126/126.
6. Root `pnpm --workspace-concurrency=1 -r --if-present test` retry
   (serialized): contracts 4/4, orchestration 2/2, codex-lab 104/104,
   fixtures 11/11, registration-review 21/21, remotion-runtime 4/4, and
   story-engine 353/353 all PASS; asset-pipeline 2 timeouts plus the
   documented `beforeAll` timing race; pnpm bailed before the remaining
   apps.
7. Remaining apps directly: `@storystage/studio` 246/246,
   `@storystage/render-worker` 24/24, `@storystage/asset-worker` 5/5,
   `@storystage/desktop` 11/11, `@storystage/e1-director-lab` 4/4 — all
   PASS, confirming worker-parallelism resource contention on this machine
   as the cause; every implicated test and suite is green whenever
   parallelism is bounded or the file runs alone.

## Evidence

Machine-readable report: `screenshots/clickthrough-report.json`
Report SHA-256: `3528c149fc9745daaef94b5918855d72b5c87bf57511b074bd40194623205d4b`

Listeners (`console` warning/error and `pageerror`) were attached before any
navigation. The real Projects → Create → shared proposal review → Studio →
Audio workspace path was exercised at 1440×900. Captured states, each
SHA-256-hashed, dimension-verified (1440×900), and recorded in the report
with a uniqueness check across all nine hashes:

- `wp1-1440x900-projects.png` —
  `16b8dc3f03862e5d18bfc3a18277e9fdcc9f5d7b8203af3a0ff3e7ea4917eebf`
- `wp1-1440x900-proposal-review.png` —
  `be6794751d825f67e7cb596732e35ab1e17f9190fc69ed9e0c8392ac9a8aa675`
- `wp1-1440x900-studio-board.png` —
  `c2864e10ff5674dd2e636494b0ddd9511e6655ff7375dba3a2499620f3a4b7df`
- `wp1-1440x900-audio-narration-take.png` (**required:** Narration with the
  selected local-demo Take B and the synchronized inspector) —
  `9c684525fe986a549d55c0d3ccb9f21ca27ab5489bde5c497b7e0b22b68cb132`
- `wp1-1440x900-audio-dialogue-empty.png` (**required:** Dialogue honest
  empty state at the default scope, with what later work enables) —
  `6e5b4fdfc7e7788ab23ae0ac8e1f877562aad841a3170cc07f5dc51317cc773d`
- `wp1-1440x900-audio-sfx-cue.png` (**required:** SFX with the selected
  local-demo cue and its truth labels) —
  `94563712d3131ae29c528498d69f9301158960f7e774c9035510a51150a5a782`
- `wp1-1440x900-audio-music-timing.png` (**required:** Music showing the
  guide-versus-final timing boundary on card and inspector) —
  `9e39643f284326a91e95e930a46734cfe53738c13d384ba66b459420e2769ba2`
- `wp1-1440x900-audio-scope-change.png` (deterministic shared-scope change:
  Narration at Beat 2 with no stale card leak and the scope header updated)
  —
  `8231c50aa8b603e72986664312457cd830bb2c59db9197633de36e0c6c0773ed`
- `wp1-1440x900-audio-track-tab-focus.png` (visible keyboard focus on the
  Narration track tab) —
  `9b7568d5bae35c6a9d752f498a04f12db9e23ec98a355013fe4543a11a621a5f`

The report also records: workspace-switch `aria-current` semantics and the
hidden-but-mounted board; audio/scope-header agreement; track tab
`aria-selected` state; heading/count/cards/inspector synchronization;
observable inspector change on take selection; exact empty-state copy;
guide/final timing truth with no final-timing claim; the truth sweep (every
orientation action disabled with its reason, zero success claims); keyboard
reachability with a visible ≥2 px focus outline and the arrow-key contract;
and per-state horizontal-overflow measurements.

## Visible-control truth state

- Workspace switch, track tabs, shared scene/beat scope selects, and card
  selection work as labelled local UI behavior over deterministic
  session-local fixtures.
- Every take/cue card is labelled **Local demo planning card — no audio
  exists**; guide timing is always paired with its provisional label and
  final timing is always labelled unavailable.
- Record take, Audition take, Import audio, and Play cue are disabled with
  their specific unavailable reasons. No control records, imports, decodes,
  plays, mixes, saves, or reports success.
- Preview and Export remain disabled for the accepted F3 reasons; the AI
  Director surfaces remain explicitly no-service local fixtures; the
  accepted scene/beat scope header stays authoritative in all three
  workspaces.

## Limitations and stop

This is F5-WP1 track hierarchy and planning-card information architecture
only. It does not accept F5, start F5-WP2, record or import audio, manage
real takes, place real cues, analyze timing, perform lip sync, mix, persist
projects, connect devices, providers, workers, or backend contracts, or
authorize Godot, Remotion, rendering, export, packaging, QA, or
private-launch work. The complete responsive, compact, reduced-motion, and
milestone evidence gate remains F5-WP5; this package captures a coherent
1440×900 desktop layout only and claims no responsive or milestone-complete
evidence.

Merge only after the exact handback tip has a green hosted check and Codex
review. Do not treat this handback as F5 acceptance.
