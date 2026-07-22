# Kimi full brief - F4-WP2 scene asset requirements and readiness

## Assignment identity

- Inbox-Version: `81`
- Issue: `#103`
- Exact accepted base: `f99ff77890355e1e6003d48e683b3153ce59c64b`
- Required branch:
  `agent/kimi-f4-wp2-scene-asset-requirements-readiness`
- Owner: Kimi, frontend/UI only
- Review and integration: Codex
- Milestone audit: ChatGPT Pro after all F4 packages are review-clean
- Product authority: Preston's standing dependency-ordered continuation
  direction

Claim issue #103 before writing. The watcher supplies a fresh clean detached
workspace at the exact accepted base. Create only the required work branch and
confirm it was absent locally and remotely. If any identity, scope, base,
branch, status, issue, or evidence instruction conflicts, stop fail closed and
report the conflict instead of guessing.

## Primary invariant

The creator can distinguish required, optional, reusable, missing, candidate,
needs-preparation, needs-review, and ready asset truth per selected scene
without an aggregate hiding scene scope or any blocker.

## Required Product v1 experience

Extend only the accepted Product v1 Assets & Rigs workspace from F4-WP1:

1. Preserve Projects -> Create -> shared proposal review -> Studio -> Assets &
   Rigs and the accepted Scene board / Assets & Rigs switch.
2. Preserve the authoritative selected Studio scene and beat, board state,
   per-beat direction history, AI Director panel session state, existing
   category/filter/detail synchronization, and truthful local-demo-record
   boundary.
3. Add scene-scoped asset requirement truth that distinguishes `Required`,
   `Optional`, and `Reusable` without presenting any classification as
   automatic script analysis.
4. Add one bounded readiness vocabulary: `Missing`, `Candidate`,
   `Needs preparation`, `Needs review`, and `Ready`.
5. Explain the exact blocker for every non-ready record. A badge or count may
   summarize; it may never replace the readable reason.
6. Add episode-level counts for the bounded Ollo demo plan while keeping the
   selected scene name/scope visible beside every aggregate and preserving a
   direct path back to the contributing records.
7. Provide honest empty, partial, blocked, and ready local-fixture states. A
   fixture labelled `Ready` means only that the deterministic planning record
   satisfies this package's local checklist; it does not mean that a file,
   image, layer, rig, approval, capability, or production artifact exists.
8. Keep every non-implemented preparation action disabled with its accepted
   reason. No control may report an import, generation, preparation, review,
   approval, or production success.

The scene filter remains the scope authority for scene requirements. `All
scenes` may show an episode summary, but the summary must disclose its episode
scope and must not silently masquerade as a selected-scene result.

## Requirement and readiness truth model

- Use deterministic session-local fixtures only. Do not derive classifications
  from pasted text, AI, MCP, the story engine, files, providers, or services.
- Every visible requirement must identify its asset record, category,
  requirement class, scene/episode scope, readiness state, blocker or ready
  explanation, source truth, and next honest preparation action.
- `Required` means the bounded fixture says the selected scene cannot meet its
  local planning intent without the record. It is not a production dependency
  calculation.
- `Optional` means the fixture can enrich the selected scene but is not needed
  for the bounded planning intent.
- `Reusable` means the same local planning record is referenced by more than
  one bounded demo scene. It does not claim one real file or rig exists.
- `Missing` means the fixture has no candidate/reference record sufficient for
  the next local planning step.
- `Candidate` means a labelled local candidate record exists but remains
  unreviewed and has no artifact.
- `Needs preparation` means the local record identifies preparation work such
  as layers or rig markers; no preparation service or output exists.
- `Needs review` means the local fixture checklist has enough descriptive
  information for a later review, but no review or approval has occurred.
- `Ready` is allowed only with a persistent adjacent disclaimer that it is
  local planning-record readiness, not artifact, review, approval, rig,
  capability, or production readiness.
- Counts must be mechanically derived from the same visible fixture model.
  They must update with episode/scene scope and never contradict the list or
  detail surface.
- Unknown, invalid, or stale fixture references must fail closed into an
  explicit unavailable/empty state rather than be silently counted as ready.

## Keyboard, state, and accessibility requirements

- New requirement/readiness controls must be keyboard reachable in logical DOM
  order with visible focus and selected/current semantics beyond color.
- Do not introduce nested interactive controls, pointer-only disclosure, or a
  badge that is the sole carrier of status meaning.
- Requirement, aggregate, category/list selection, and detail must remain
  synchronized after scene, episode, category, or asset selection changes.
- When scope excludes the selected record, deterministically select a valid
  visible record or show the honest empty state; never retain stale hidden
  detail.
- The complete responsive, reduced-motion, and accessibility gate remains
  F4-WP5. This package must still avoid obvious overflow, clipped blocker text,
  or unreachable content at the required desktop capture.

## Allowed files

- Existing Product v1 modules under `apps/studio/src/product-v1/**`, only as
  needed for this package.
- Narrow new Product v1 requirement/readiness fixture, model, or component
  modules under `apps/studio/src/product-v1/**`.
- Focused Product v1 tests under `apps/studio/src/product-v1/**`.
- `apps/studio/src/App.test.tsx` only to keep new regressions connected to the
  standard Studio suite without changing the package manifest.
- `apps/studio/src/styles.css` only for this bounded Product v1 surface.
- One narrowly named F4-WP2 browser-evidence script under
  `apps/studio/scripts/**`, or a surgical extension to the F4-WP1 script if and
  only if that preserves the accepted F4-WP1 evidence artifact.
- Package evidence and one exact handback under
  `reports/agent-handoffs/2026-07-22-kimi-f4-wp2-scene-asset-requirements-readiness/**`.

Do not modify the legacy production `AssetExchange` or Assets screen in
`apps/studio/src/App.tsx`. Do not change package manifests/lockfiles,
roadmap/status, the coordination inbox, production contracts, story engine,
desktop host, Codex/App Server/MCP runtime, workers, Godot, Remotion, assets,
audio, persistence, rendering, export, or backend code. Avoid whole-file
formatting and unrelated cleanup.

## Non-goals and truth boundary

No automatic script analysis, AI interpretation, real asset/reference file,
file picker/drop/import, image request/generation, duplicate or format
handling, source download, capability count, slicing, pivots, masks, sockets,
expressions, visemes, rigging, production review/approval, rights/license
workflow, persistence, filesystem/host call, provider/worker integration,
production schema, Godot scene, Remotion composition, animation, render,
export, packaging, F4-WP3, or private-launch claim.

Every new surface remains deterministic labelled local-fixture planning truth.
Existing AI Director surfaces remain explicitly no-service local fixtures.
Preview and Export remain unavailable for the accepted reasons.

## Required tests and checks

- Add pure/model tests for `Required`, `Optional`, and `Reusable` across at
  least three scenes and multiple categories.
- Add tests for all five readiness states and their exact blocker/ready
  explanations.
- Add tests proving episode aggregates are derived from the same records and
  never hide or contradict the selected scene scope.
- Add invalid/stale reference, honest empty, partial, blocked, and ready-state
  tests.
- Add integration tests proving category/list/detail and requirement/readiness
  remain synchronized across episode and scene changes.
- Add truth tests proving `Ready` never loses its local-record disclaimer and
  disabled preparation actions never report a real success or artifact.
- Keep every new regression connected to
  `pnpm --filter @storystage/studio test`; a focused file that only passes via
  an explicit one-off command is insufficient.
- Preserve all accepted F1-F4-WP1 Product v1 journey, scope,
  direction/history, AI fixture, and asset-workspace tests.
- Run `pnpm --filter @storystage/studio test`.
- Run `pnpm --filter @storystage/studio typecheck`.
- Run `pnpm --filter @storystage/studio build`.
- Run repository-root `pnpm verify`.
- If a documented unchanged asset-pipeline CPU test times out under full
  parallelism, preserve the exact failure and prove the implicated file plus
  the complete package with bounded workers. Do not normalize, conceal, or
  relabel any product-code failure as that flake.

## Required browser evidence

- Attach console-warning/error and `pageerror` listeners before navigation or
  interaction.
- Exercise the real Product v1 Projects -> Create -> Studio -> Assets & Rigs
  path at 1440x900.
- Capture at minimum: one selected-scene partial state, one selected-scene
  blocked/missing state with readable reasons, one honest ready-local-record
  state with its adjacent disclaimer, one all-scenes episode aggregate with
  visible episode scope, and one empty or invalid-scope state.
- Capture a visible keyboard-focus state for any materially new interactive
  control introduced by this package.
- Record zero console warnings, zero console errors, zero page errors, and
  document/client width evidence proving no horizontal document overflow.
- Hash every screenshot and the machine-readable click-through report with
  SHA-256.

## Handback and stop condition

Commit and push the exact required branch. Open one draft PR to `product/v1`.
Publish one immutable handback containing exact base, implementation SHA,
handback tip SHA, changed files, diff stat, commands/results, evidence paths
and hashes, truth boundaries, limitations, every visible control's real or
unavailable state, and every preserved failure/retry. Post the issue handback,
then exit without polling.

Stop before F4-WP3, import/generation UX, file work, layer/rig review,
production approval, persistence, providers, backend, Godot, Remotion,
rendering, export, packaging, or private launch. Completion of this package
does not accept F4.
