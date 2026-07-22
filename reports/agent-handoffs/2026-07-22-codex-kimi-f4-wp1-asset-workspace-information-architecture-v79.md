# Kimi full brief - F4-WP1 asset workspace information architecture

## Assignment identity

- Inbox-Version: `79`
- Issue: `#99`
- Exact accepted base: `d6fe17ca7507cfd37f61a954b5f5034982c3554d`
- Required branch:
  `agent/kimi-f4-wp1-asset-workspace-information-architecture`
- Owner: Kimi, frontend/UI only
- Review and integration: Codex
- Milestone audit: ChatGPT Pro after all F4 packages are review-clean
- Product authority: Preston's standing dependency-ordered continuation
  direction

Claim issue #99 before writing. The watcher supplies a fresh clean detached
workspace at the exact accepted base. Create only the required work branch and
confirm it was absent locally and remotely. If any identity, scope, base,
branch, status, issue, or evidence instruction conflicts, stop fail closed and
report the conflict instead of guessing.

## Primary invariant

Every asset category, scene/episode filter, selection, and detail view agrees
on one understandable scope and readiness vocabulary without claiming that an
image, file, layer, rig, approval, provider, or production capability exists.

## Required Product v1 experience

Extend only the accepted Product v1 journey and Studio shell:

1. Preserve Projects -> Create -> shared proposal review -> Studio.
2. Add one understandable Assets & Rigs workspace reachable from Studio while
   preserving the existing selected scene and beat.
3. Provide Characters, Locations, Layered Sets, Props, and Rigs category
   views.
4. Provide episode and scene filters grounded in the existing deterministic
   Ollo demo hierarchy.
5. Keep one selected asset identity synchronized between category/list and
   selected-asset detail.
6. Use deterministic session-local fixtures only. Every fixture must expose
   what is known, its source/approval/readiness truth, and the next honest
   preparation action.
7. Establish a small consistent readiness vocabulary suitable for later F4
   packages without implementing F4-WP2 scene-requirement aggregation.
8. Keep every non-implemented preparation action visibly unavailable or
   plainly explanatory. No dead success control may imply a completed action.

The accepted scene/beat scope remains authoritative. Asset filters may narrow
the visible fixture list but must not silently change the selected Studio
scene or leak selection across an incompatible category/scope.

## Information architecture and fixture truth

- Use clear category navigation and selected/current semantics. A category is
  not an approval state.
- The episode filter and scene filter must remain understandable together;
  scene options must belong to the selected episode fixture.
- When a filter or category excludes the selected asset, choose one
  deterministic valid item or show an honest empty scope. Never retain hidden
  stale detail.
- A selected detail must identify category, episode/scene scope, source truth,
  approval truth, readiness truth, and one next preparation action.
- Fixtures may include Ollo, a supporting character, a story location, a
  layered set, a prop, and a rig placeholder. They remain labelled local demo
  records; no corresponding artifact exists.
- Avoid `generated`, `imported`, `approved`, `ready`, `rigged`,
  `production-ready`, or `available` unless the same detail explicitly says it
  is only fixture vocabulary and no artifact/capability exists.
- Do not make episode counts, readiness aggregates, required/optional/reusable
  classifications, or blocker rollups. Those belong to F4-WP2.

## Keyboard and state requirements

- New category and filter controls must be keyboard reachable in logical DOM
  order with visible focus.
- Expose selected/current state without color alone and retain an
  understandable heading/landmark structure.
- Selection changes must be observable in the detail surface and covered by
  focused tests.
- The complete responsive, drawer/stacking, reduced-motion, and accessibility
  evidence gate remains F4-WP5. This package must still avoid introducing an
  obvious unreachable or pointer-only path at the required desktop capture.

## Allowed files

- Existing Product v1 modules under `apps/studio/src/product-v1/**`, only as
  needed for this package.
- Narrow new Product v1 asset-workspace fixture/component modules under
  `apps/studio/src/product-v1/**`.
- Focused Product v1 tests under `apps/studio/src/product-v1/**`.
- `apps/studio/src/App.test.tsx` only for retained Product v1 integration tests.
- `apps/studio/src/styles.css` only for the new Product v1 workspace surface.
- One narrowly named browser-evidence script under `apps/studio/scripts/**`
  only if the existing F3 evidence runner cannot be adapted without changing
  its accepted artifact.
- Package evidence and one exact handback under
  `reports/agent-handoffs/2026-07-22-kimi-f4-wp1-asset-workspace-information-architecture/**`.

Do not modify the legacy production `AssetExchange` or Assets screen in
`apps/studio/src/App.tsx`; it contains later production behavior and is not the
Product v1 source of truth. Do not change package manifests/lockfiles,
roadmap/status, the coordination inbox, production contracts, story engine,
desktop host, Codex/App Server/MCP runtime, workers, Godot, Remotion, assets,
audio, persistence, rendering, export, or backend code. Avoid whole-file
formatting and unrelated cleanup.

## Non-goals and truth boundary

No file import or drop, image request/generation, reference attachment,
duplicate/wrong-format handling, slicing, pivots, masks, sockets, expressions,
visemes, rigging, approval workflow, rights/license workflow, provider or
worker integration, persistence, filesystem or host call, production schema,
Godot scene, Remotion composition, animation, render, export, packaging, or
private-launch claim. No F4-WP2 or later milestone work.

Every new surface is deterministic labelled local fixture information
architecture. Existing AI Director surfaces remain explicitly no-service local
fixtures. Preview and Export remain unavailable for the accepted reasons.

## Required tests and checks

- Add focused regressions for category navigation and selected state.
- Add episode/scene filter synchronization and invalid combination tests.
- Add deterministic selection/detail synchronization across at least three
  categories and two scene scopes.
- Add empty-scope and stale-selection clearing tests.
- Add truth tests proving unavailable actions do not report success or create
  an artifact/approval/readiness claim.
- Preserve all accepted F1-F3 Product v1 journey, scope, direction/history,
  and AI fixture tests.
- Run `pnpm --filter @storystage/studio test`.
- Run `pnpm --filter @storystage/studio typecheck`.
- Run `pnpm --filter @storystage/studio build`.
- Run repository-root `pnpm verify`.
- If the package branch can fail only the live roadmap-consistency stage
  because it is rooted at the mandated pre-transition base, document that
  exact conflict and prove a clean synthetic merge with the live START_NOW
  product/inbox state. Do not normalize or conceal any other failure.

## Required browser evidence

- Attach console-warning/error and `pageerror` listeners before navigation or
  interaction.
- Exercise the real Product v1 Projects -> Create -> Studio -> Assets & Rigs
  path at 1440x900.
- Capture the workspace overview plus at least three meaningfully distinct
  category/detail/filter states, including one scene-filter change and one
  honest empty or unavailable-preparation state.
- Record zero console warnings, zero console errors, zero page errors, and
  document/client width evidence proving no horizontal document overflow.
- Hash every screenshot and the machine-readable click-through report with
  SHA-256.

## Handback and stop condition

Commit and push the exact required branch. Open one draft PR to `product/v1`.
Publish one immutable handback containing exact base, implementation SHA,
handback tip SHA, changed files, diff stat, commands/results, evidence paths
and hashes, truth boundaries, limitations, and every visible control's real or
unavailable state. Post the issue handback, then exit without polling.

Stop before F4-WP2, file import, image generation, layer/rig preparation,
approval, persistence, providers, backend, Godot, Remotion, rendering, export,
packaging, or private launch. Completion of this package does not accept F4.
