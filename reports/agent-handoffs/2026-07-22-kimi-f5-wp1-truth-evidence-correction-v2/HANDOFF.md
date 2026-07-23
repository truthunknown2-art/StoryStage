# F5-WP1 v2 correction immutable handback — empty-inspector truth and exact-nine evidence gate

Task: `F5-WP1-TRUTH-EVIDENCE-CORRECTION-V2`
Issue: [#124](https://github.com/truthunknown2-art/StoryStage/issues/124)
Rejected draft PR (retained unchanged for traceability):
[#126](https://github.com/truthunknown2-art/StoryStage/pull/126)
Required branch: `agent/kimi-f5-wp1-audio-workspace-track-hierarchy-v2`
Inbox: version `93` on `origin/agent/kimi-frontend`
Full brief:
`reports/agent-handoffs/2026-07-22-codex-kimi-f5-wp1-truth-evidence-correction-v93.md`

## Exact identity

- Exact accepted product base: `11f6f049d306efb9808559a24e2bd532be4cdc87`
  (verified before writing: detached `HEAD` equalled this exact commit with a
  clean tree, and it is the live `origin/product/v1` head; it differs from
  the v1 base `eb9890d75126381e61849a5994f28474d133bfb7` only by the
  canonical F5-WP1 start-status merge PR #125).
- Rejected exact head incorporated: `311c115487db63814d9ea1bde62f3ea047ba05eb`
  with its implementation commit `d12116a602b463900ebffda8952a5c79fa062ee6`,
  cherry-picked in that order onto the fresh v2 branch as `0bab567` and
  `cd336db`. Neither history was reset, rebased, force-pushed, overwritten,
  or rewritten; the rejected branch and draft PR #126 remain unchanged. The
  brief's expected canonical-status base difference produced no cherry-pick
  conflict because neither rejected commit touches canonical documents.
- Required branch was confirmed absent locally and remotely before creation.
- Correction implementation/evidence head:
  `dfedb1dc3a81665833f0e7a335e1b595ad722b33`
- Kimi handback tip: the commit containing this file, reported as an exact
  remote SHA in the successor draft PR and issue #124 because a Git commit
  cannot embed its own SHA.

## What the correction changes

Only the two rejected review findings, nothing else:

1. **Empty inspector no longer manufactures card/status/timing truth.**
   Whenever a track's current scope has zero planning cards
   (`selectedCard === null`), the inspector now renders:
   - badge **No planning card selected — no audio exists** instead of the
     fixture label `Local demo planning card — no audio exists`;
   - Status **No planned take/cue exists in the current scene/beat scope.**
     with no card fixture label, instead of `Planned take — nothing recorded`
     / `Planned cue — no audio placed`;
   - Timing basis **No guide or final timing exists — guide timing appears
     only when a planning card exists in this scope, and final timing is
     supplied only by later accepted audio work.** instead of a generic
     guide/final timing basis;
   - the retained no-selection identity row (`No take/cue selected — this
     scope has no … planning takes/cues.`) and the truthful disabled
     orientation actions with their specific reasons, exactly as before.
   The heading, count, empty list, and every inspector row now agree for
   empty scopes. No empty placeholder card was invented, no stale selection
   is retained, and no empty truth is hidden.
2. **The screenshot evidence gate fails closed on the exact capture set.**
   `apps/studio/scripts/f5-wp1-evidence.mjs` now defines the exact nine
   expected capture names and requires the report to contain exactly that
   set once each — a missing, duplicate, or extra name fails the gate —
   in addition to the existing 1440×900 dimension and unique SHA-256
   requirements. The Dialogue browser assertion now rejects any empty
   inspector that claims a local demo planning card, a planned status, a
   guide placement, or any available timing label. A deterministic pure
   negative regression (`f5-wp1-evidence-gate.test.ts`) proves the set gate
   fails for a missing capture, an empty report, a duplicate, and an extra
   capture without launching a browser.

Preserved exactly as accepted: the Audio workspace information architecture,
the four track views, the shared scene/beat scope, deterministic card
selection with no stale retention, the disabled orientation actions, the
keyboard tab contract, the desktop layout, and the truthful non-empty
planning-card states (badge, planned status, guide-versus-final timing) —
the unchanged SFX and Music captures are byte-identical to the rejected run,
and the unchanged Projects / proposal-review / Studio-board captures are
byte-identical as well.

## Changed files

Correction implementation/evidence head `dfedb1d` (11 files, +347/−62):

```
 apps/studio/scripts/f5-wp1-evidence.mjs            | 181 ++++++----
 apps/studio/src/App.test.tsx                       |   1 +
 apps/studio/src/product-v1/AudioWorkspace.tsx      |  25 +-
 apps/studio/src/product-v1/audio-workspace.test.tsx | 103 ++++++
 apps/studio/src/product-v1/audio-workspace.ts      |  15 +
 apps/studio/src/product-v1/f5-wp1-evidence-gate.test.ts | 63 ++++
 .../screenshots/clickthrough-report.json           |  21 +-
 .../wp1-1440x900-audio-dialogue-empty.png          | Bin 144073 -> 146118 bytes
 .../wp1-1440x900-audio-narration-take.png          | Bin 153638 -> 153640 bytes
 .../wp1-1440x900-audio-scope-change.png            | Bin 139285 -> 139287 bytes
 .../wp1-1440x900-audio-track-tab-focus.png         | Bin 152695 -> 152698 bytes
```

The handback commit adds only this file under
`reports/agent-handoffs/2026-07-22-kimi-f5-wp1-truth-evidence-correction-v2/`.
The five captures not listed above are byte-identical recaptures of the
unchanged accepted surfaces. The rejected v1 `HANDOFF.md` in the copied
evidence directory is retained untouched as the rejected record; its
screenshot hashes describe the superseded v1 captures preserved on PR #126,
while the screenshots and report beside it are this v2 recapture. No
manifest, lockfile, roadmap/status/plan document, Kimi inbox, contract,
story engine, desktop, worker, Godot, Remotion, asset, audio-engine,
persistence, renderer, export, packaging, or legacy file was changed, and
no F5-WP2+ surface was touched.

## Verification (exact commands/results)

- `pnpm --filter @storystage/studio exec vitest run src/product-v1/audio-workspace.test.tsx src/product-v1/f5-wp1-evidence-gate.test.ts`
  — PASS, 23/23 focused tests: the accepted 17 plus new regressions for the
  exact empty-scope truth vocabulary, every inspector row of the empty
  Dialogue voice scope (badge/track/scope/identity/status/timing, no intent
  row, disabled actions), every inspector row of an empty SFX cue scope,
  and the pure exact-nine set gate (accepts exactly the nine in any order;
  fails closed on a missing capture, an empty report, a duplicate, and an
  extra capture).
- `pnpm --filter @storystage/studio test` — PASS, 252/252 tests (the
  standard command; both focused files are wired into the
  already-enumerated `App.test.tsx` entrypoint).
- `pnpm --filter @storystage/studio typecheck` — PASS.
- `pnpm --filter @storystage/studio build` — PASS; only the pre-existing
  Vite large-chunk warning remains.
- Touched-file lint (`npx eslint` on every changed source/script file) —
  PASS with zero errors; `git diff --check` — PASS.
- `node apps/studio/scripts/f5-wp1-evidence.mjs` against the local Studio
  dev server (`vite --host 127.0.0.1 --port 5195`, verified serving this
  workspace after a stale v92-workspace server occupying the port was
  stopped) — PASS, 15/15 checks, zero console warnings, zero console
  errors, zero page errors, no horizontal document overflow in any captured
  state.
- Repository-root verification — full PASS with zero failures and no flake
  ledger required on this run:
  - `verify:roadmap` — PASS:
    `Roadmap consistency PASS: F5 / F5-WP1 / START_NOW /
    eb9890d75126381e61849a5994f28474d133bfb7 /
    11f6f049d306efb9808559a24e2bd532be4cdc87`.
  - `verify:director-capability-assets` — PASS (19 assets).
  - `verify:candidate-rig-review-implementation-receipt` — PASS.
  - `verify:e1-app-server-schema` — PASS (`0.144.1`).
  - `verify:e1-wp4-failure-matrix` — PASS.
  - `verify:privacy` — PASS (1129 tracked and publishable files).
  - `pnpm lint` — PASS with zero errors; only the two pre-existing Remotion
    purity warnings in `apps/render-worker/src/kvp001-proof.ts` remain.
  - `pnpm typecheck` (all packages) — PASS.
  - `pnpm test` (recursive, all packages) — PASS, exit code 0, which fails
    the chain on the first package failure. Per-package counts captured in
    the retained log tail: studio 252/252, story-engine 353/353,
    asset-pipeline 126/126, remotion-runtime 29/29, registration-review
    21/21, desktop 11/11, render-worker 24/24, asset-worker 5/5,
    e1-director-lab 4/4; the remaining packages (contracts, orchestration,
    codex-lab, fixtures) passed earlier in the same zero-exit run. The
    documented timing-sensitive asset-pipeline / story-engine host flake
    did not occur on this run; no failure was normalized or concealed.
- Hosted verification: the GitHub Verify run for the exact handback tip is
  reported in the successor draft PR and issue #124 once the pushed tip's
  check completes.

## Evidence (all 1440×900, dimension-verified, unique SHA-256, exactly the nine expected captures)

Machine-readable report:
`reports/agent-handoffs/2026-07-22-kimi-f5-wp1-audio-workspace-track-hierarchy/screenshots/clickthrough-report.json`
Report SHA-256:
`ae72671338bf3fc764ec521797cb3396062f2190d044b9b8acb5f9d95602c89d`

Listeners (`console` warning/error and `pageerror`) were attached before any
navigation. The real Projects → Create → shared proposal review → Studio →
Audio workspace path was exercised at 1440×900:

- `wp1-1440x900-projects.png` —
  `16b8dc3f03862e5d18bfc3a18277e9fdcc9f5d7b8203af3a0ff3e7ea4917eebf`
- `wp1-1440x900-proposal-review.png` —
  `be6794751d825f67e7cb596732e35ab1e17f9190fc69ed9e0c8392ac9a8aa675`
- `wp1-1440x900-studio-board.png` —
  `c2864e10ff5674dd2e636494b0ddd9511e6655ff7375dba3a2499620f3a4b7df`
- `wp1-1440x900-audio-narration-take.png` (**required:** Narration with the
  selected local-demo Take B and the synchronized inspector) —
  `b487d7783a7a1691c9497fe24e0fa71ef62fa7c71bde13370aee15fd37484e19`
- `wp1-1440x900-audio-dialogue-empty.png` (**required:** Dialogue empty
  scope now visibly showing the no-card badge, the no-planned-take Status,
  and the no-guide-or-final-timing Timing basis, with the count, empty
  list, identity row, and disabled actions in agreement) —
  `b4467af6fecdf986fa8520b63fbd86d344b084a72842fe63767ba4899b283ab6`
- `wp1-1440x900-audio-sfx-cue.png` (**required:** SFX with the selected
  local-demo cue and its truth labels; byte-identical to the accepted
  rejected-run capture) —
  `94563712d3131ae29c528498d69f9301158960f7e774c9035510a51150a5a782`
- `wp1-1440x900-audio-music-timing.png` (**required:** Music showing the
  guide-versus-final timing boundary; byte-identical to the accepted
  rejected-run capture) —
  `9e39643f284326a91e95e930a46734cfe53738c13d384ba66b459420e2769ba2`
- `wp1-1440x900-audio-scope-change.png` (deterministic shared-scope change:
  Narration at Beat 2 with no stale card leak and the scope header
  updated) —
  `248ff546ec363fa44285a1683dec5b10a93dedfe33aa9c1164c293c5fe5536fd`
- `wp1-1440x900-audio-track-tab-focus.png` (visible keyboard focus on the
  Narration track tab) —
  `e8d76bc23e751a07c2abe3a1fc7279dd5fa15e9d6de88ac6b59f22cbe7d99b3a`

The report also records: workspace-switch `aria-current` semantics and the
hidden-but-mounted board; audio/scope-header agreement; track tab
`aria-selected` state; heading/count/cards/inspector synchronization;
observable inspector change on take selection; the exact empty-state copy
plus the strengthened Dialogue assertion (no fixture label, no planned
status, no guide placement, no timing labels in the empty inspector);
guide/final timing truth with no final-timing claim; the truth sweep (every
orientation action disabled with its reason, zero success claims); keyboard
reachability with a visible ≥2 px focus outline and the arrow-key contract;
the fail-closed exact-nine capture-set gate result; and per-state
horizontal-overflow measurements.

## Visible-control truth state

- Workspace switch, track tabs, shared scene/beat scope selects, and card
  selection work as labelled local UI behavior over deterministic
  session-local fixtures.
- Non-empty scopes keep the accepted truth: every take/cue card is labelled
  **Local demo planning card — no audio exists**, guide timing is always
  paired with its provisional label, and final timing is always labelled
  unavailable.
- Empty scopes now state explicit no-card/no-status/no-timing truth in
  every inspector row; nothing describes a nonexistent planning card.
- Record take, Audition take, Import audio, and Play cue remain disabled
  with their specific unavailable reasons. No control records, imports,
  decodes, plays, mixes, saves, or reports success.
- Preview and Export remain disabled for the accepted F3 reasons; the AI
  Director surfaces remain explicitly no-service local fixtures; the
  accepted scene/beat scope header stays authoritative in all three
  workspaces.

## Limitations and stop

This is the bounded F5-WP1 empty-inspector truth and evidence-gate
correction only. It does not accept F5-WP1 or F5, start F5-WP2, record or
import audio, manage real takes, place real cues, analyze timing, perform
lip sync, mix, persist projects, connect devices, providers, workers, or
backend contracts, or authorize Godot, Remotion, rendering, export,
packaging, QA, or private-launch work. The complete responsive, compact,
reduced-motion, and milestone evidence gate remains F5-WP5; this package
captures a coherent 1440×900 desktop layout only and claims no responsive
or milestone-complete evidence.

Merge only after the exact handback tip has a green hosted check and Codex
review. Do not treat this handback as F5-WP1 acceptance. Kimi stops here
and exits; no F5-WP2 or later work begun.
