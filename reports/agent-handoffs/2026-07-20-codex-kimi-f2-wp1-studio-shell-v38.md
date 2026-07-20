# Kimi F2-WP1 — Studio shell foundation (inbox v38)

## Authority

- Product base: `fb3033f8cc5ce536476066708aebb472704de936`
- Binding package: `docs/plans/milestone-2.md` → `F2-WP1`
- Task issue: `https://github.com/truthunknown2-art/StoryStage/issues/38`
- Owner: Kimi CLI
- Reviewer/integrator: Codex
- Required branch: `agent/kimi-f2-studio-shell-wp1`
- PR target: `product/v1`

F1 is accepted and merged. Create the required branch directly from the exact
product base above. Do not cherry-pick or rebuild F1; it is already in the base.
Claim issue #38 before implementation.

## One visible deliverable

Replace both F1 local-detail destinations with one coherent frontend-only
Studio shell for the bounded 20-minute Ollo demo. One selected scene ID must
drive the grouped hierarchy rail, center scene-board, scene transport readout,
and compact episode overview.

The shell includes:

1. Product-v1 top bar with project, Kids Adventure, Storybook Cutout, the
   permanent local-demo disclosure, and working Back to Projects.
2. Grouped two-act / four-sequence / eight-scene rail with real scene
   selection. Act/sequence collapse and expansion belong to WP2.
3. Center scene-board using existing local reference art and the visible label
   `Reference board — not animation`.
4. Working previous/next scene controls with correct disabled boundaries and
   an honest selected-scene time/duration readout.
5. A right inspector explanation that Director controls arrive in F3. Do not
   render pretend shot/action/camera fields or an Apply button.
6. A compact scene-level episode overview with real selection.
7. Projects → seeded demo and Create → Create first cut both entering this same
   shell.

Match the approved visual hierarchy in
`docs/design/creator-first-reset/story-stage-studio-v1.png` without copying
unsupported capabilities from the mockup. Use only existing assets already in
`apps/studio/src/assets/`; add no generated art in this package.

## Primary invariant

Changing the selected scene from any WP1 surface updates every other surface
to that exact scene. No component may own competing selection state.

## Allowed files

- `apps/studio/src/product-v1/**`
- the Product-v1/F2 section only in `apps/studio/src/styles.css`
- focused Product v1 tests in `apps/studio/src/App.test.tsx` or a new test next
  to the Product v1 components
- `reports/agent-handoffs/2026-07-20-kimi-f2-wp1-studio-shell/**`
- one exact WP1 handback under `reports/agent-handoffs/`

## Explicit non-goals

No act/sequence collapse, play/pause, scrubbing, real Remotion preview, media
generation, persistence, Director editing, undo, assets/rigs, audio, waveform,
timeline tracks, export, backend contracts, shared schemas, packages, legacy
surface edits, or F2-WP2 work.

Preview and Export may be present only as disabled controls with adjacent
plain-language reasons. Do not show dead controls, fake success, fake generated
frames, or engineering hashes in creator UI.

## Required verification

Run exactly:

1. `pnpm --filter @storystage/studio test`
2. `pnpm --filter @storystage/studio typecheck`
3. `pnpm --filter @storystage/studio build`
4. `pnpm verify`

Perform an actual-browser click-through at 1440×900:

- Projects → seeded demo → Studio initial scene;
- select a noninitial scene from the rail and prove rail, center, transport,
  and overview agree;
- select a different scene from the overview and prove the same invariant;
- prove previous/next scene boundary states;
- Create → valid script → Create first cut → the same Studio shell;
- Back to Projects;
- zero page or console errors throughout.

Capture actual-app 1440×900 screenshots of the initial scene and one
noninitial selected scene. Record exact SHA-256 hashes.

## Completion and stop

Commit and push an immutable head on the required branch, open a draft PR to
`product/v1`, and leave an exact handback containing:

- commit SHA and changed files;
- every command and result;
- screenshot paths and hashes;
- browser click-through results;
- a truth table for every visible control;
- known limitations and integration instructions.

Then stop. WP2, F3, and backend work are not authorized by this assignment.
