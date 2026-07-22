# F4-WP4 immutable handback

Task: `F4-WP4-LAYER-RIG-REVIEW-UX`

Issue: [#113](https://github.com/truthunknown2-art/StoryStage/issues/113)

Pull request:
[#115 (draft)](https://github.com/truthunknown2-art/StoryStage/pull/115)

Required branch: `agent/kimi-f4-wp4-layer-rig-review-ux`

Inbox: version `86` on `origin/agent/kimi-frontend`

## Exact identity

- Exact authorized implementation base:
  `3a98dfff7b543821c02ead9499a9ec0efd93913b`.
- Accepted F4-WP4 start transition incorporated before final verification:
  `085d868fd0258aa7b09ca3a6a86e5c1d2832d704` (merge commit
  `8fb079d1f44a7a57fa3f7dabd13baa8bec330742`). The start transition changes
  only `docs/ROADMAP_STATUS.md` and `docs/plans/milestone-F4.md`; it is the
  Codex-published authorization the roadmap consistency guard requires.
- Exact implementation and evidence SHA:
  `f8c4a4b7e2047a10ccec00a46a43659cce80aee1`.
- Handback tip: the commit containing this file; GitHub issue #113 and pull
  request #115 record its exact pushed SHA because a commit cannot embed its
  own identity.

## Delivered result

The accepted Product v1 **Assets & Rigs** workspace now provides a bounded,
deterministic layer-and-rig review prototype:

- One small package-local review model
  (`apps/studio/src/product-v1/asset-review.ts`) binds every review record to
  an exact F4-WP2 requirement, scene, category, and declared candidate
  identity. Unknown or mismatched identities fail closed as unavailable and
  never enter counts or a review-ready result.
- Explicitly labelled local demo review fixtures cover all three states —
  `Incomplete`, `Needs correction`, and `Review-ready` — for a character
  (Scene 1 Ollo), a rig (Scene 1 Ollo performance rig), and a layered set
  (Scene 1 Home Nook set), plus the Scene 3 Dot needs-correction example and
  the Scene 5 Lantern Bridge incomplete example. They are descriptive fixture
  evidence only, never claims that a candidate file or derived artifact
  exists.
- The displayed state derives mechanically from the displayed facts:
  invalid/conflicting facts outrank completeness, and `Review-ready` requires
  every category-required declaration plus zero contradictions. Every
  `Review-ready` label carries adjacent copy that the declared local
  checklist is internally complete for review, but no files were inspected,
  no layer or rig exists, and this is not approval, capability, or production
  readiness.
- Character/rig review shows required turnaround views with declared/missing,
  part inventory with stable local IDs, declared padded bounds, declared
  pivots/attachment intent, required mask declarations, supported profile
  coverage, expression/viseme inventory, and a motion-readiness checklist
  with visible pass/block reasons. Layered-set review shows
  background/midground/foreground planes in explicit order, foreground
  occluders with intended subject relationship, and
  missing/duplicate/invalid-plane correction reasons.
- Source/rights truth is preserved: fixture-declared text is labelled as
  fixture text, and when a confirmed F4-WP3 session-local candidate record
  carries the declared identity, its creator-entered source/rights text is
  shown with the accepted not-proof disclaimers.
- Fail closed for unknown requirement/candidate/category, stale scene
  association, duplicate required identity, unknown turnaround view, missing
  or invalid padded bounds, out-of-bounds/non-finite pivot declaration,
  missing mask declaration, unsupported profile, unknown expression/viseme,
  contradictory checklist state, unknown layered-set plane, duplicate plane
  order, and invalid foreground-occluder association. Error copy identifies
  the blocker and never claims byte, pixel, or media inspection.
- One open review identity at a time: opening request/import closes review
  and opening review closes request/import. Scene, episode, category,
  requirement, and selected-record scope changes clear transient review
  state. Opening moves focus into the labelled review heading (or, for a
  fail-closed review, to its readable alert); Close and Escape restore focus
  to the exact surviving invoker; the expanded invoker toggles.
- F4-WP2 readiness labels and counts never mutate when a review panel opens,
  switches fixture state, or closes. Other categories omit the review action;
  eligible requirements without a declared example show a disabled control
  with the exact reason.

The implementation/evidence commit adds 18 files or file changes with 4,199
insertions and 1 deletion. `App.test.tsx` changes only by importing the new
focused regression suite.

## Visible-control truth inventory

Every visible control in the review surface is one of:

- a real deterministic local UI action with observable state — the per-row
  review invokers (5 enabled across the demo scope: Scene 1 Ollo, Scene 1
  Ollo performance rig, Scene 1 Home Nook set, Scene 3 Dot, Scene 5 Lantern
  Bridge set), the declared-example switcher, and the Close control;
- intentionally disabled with an adjacent reason — the review action on the
  19 eligible requirements without a declared example, and the in-panel later
  workflow row (Slice, Generate mask, Calculate pivot, Build rig, Approve)
  explaining that no artifact or service exists; or
- omitted — locations and props rows carry no review action.

No enabled control claims or performs slicing, mask generation, pivot/socket
calculation, rig building, motion preview, approval, capability promotion,
production readiness, Godot opening, rendering, export, file access, or
provider access. The browser evidence scan confirms zero enabled forbidden
controls, zero file/password inputs, and zero approval/production/render/
export success strings in the workspace.

## Verification

- Focused F4-WP4 suite (`src/product-v1/asset-review.test.tsx`): PASS, 21/21
  tests.
- `pnpm --filter @storystage/studio test`: PASS, 215/215 tests.
- `pnpm --filter @storystage/studio typecheck`: PASS.
- `pnpm --filter @storystage/studio build`: PASS; only the pre-existing Vite
  large-chunk warning remains.
- Touched-file ESLint: PASS with zero errors; `styles.css` is ignored because
  ESLint has no matching configuration.
- `git diff --check`: PASS.
- Serialized repository-root
  `VITEST_MAX_WORKERS=4 pnpm --workspace-concurrency=1 verify`: PASS
  (exit 0). Roadmap consistency, generated artifacts, E1 security evidence,
  privacy, repository lint, all-package typecheck, and all tests passed,
  including Story Engine 353/353, asset-pipeline 126/126, and Studio
  215/215. Two earlier attempts hit the documented unchanged CPU/resource
  contention flakes in untouched packages (story-engine loop-test timeouts;
  an asset-pipeline temp-dir cleanup race); each failing suite passed in
  isolation, and the serialized worker-capped run passed end to end on the
  exact committed tree.
- `node apps/studio/scripts/f4-wp4-evidence.mjs` against the actual local
  Studio dev server: PASS, 18/18 browser checks, zero console warnings or
  errors, zero page errors, no horizontal document overflow, and 10 captured
  1440x900 states.

## Evidence

Machine-readable report:
`screenshots/clickthrough-report.json`

Report SHA-256:
`d78b3fe725cc178c880da2b149c7b80a2f5bf3f2c9dcbdc81a8f3622b882aa6c`

The report records the viewport, every per-state check, all console
warnings/errors (none), page errors (none), document-overflow measurements,
focus evidence, visible truth strings, and the forbidden-claims scan, plus
the SHA-256 of each screenshot:

- `31559a791f675f7ef11b1d38b868c10173f266ca9542568e3b21ff774d902b3e`
  `screenshots/wp4-1440x900-review-button-focus.png` — keyboard focus on the
  review control with a visible outline.
- `a6c540fbfae4f5d1be41e5e5410a338a0aec2f7081cc56f98bf664f6845ed256`
  `screenshots/wp4-1440x900-character-incomplete.png` — character Incomplete
  with the exact missing-declaration list.
- `2f619069955a91360cacf8f2f8b26d5cd9aa4b0f65a8caece97d251149be16cf`
  `screenshots/wp4-1440x900-character-review-ready.png` — character
  Review-ready with the adjacent non-production truth.
- `aede0718d3ae2e2de5110e312361dd6a8f43929c3337e527904a0a647e8f0c30`
  `screenshots/wp4-1440x900-rig-turnaround-parts-pivots-masks-profiles.png` —
  rig turnaround poses, part inventory, declared pivots, viseme mask,
  supported profiles.
- `0f92df1148e409889394105d2d1396df232c1f475cbb7612ae6a33290b8085c6`
  `screenshots/wp4-1440x900-rig-expressions-visemes-motion-checklist.png` —
  expressions/visemes inventory and the passing motion-readiness checklist.
- `02c385d012dbffe31de095111e7c146611159da27535c182476438c788d82c7a`
  `screenshots/wp4-1440x900-layered-set-plane-order.png` — layered-set planes
  in explicit order with coverage.
- `35028f7db96df826d515a382d47dcb00fbd55afcd8b7586b0f11950b4e11b563`
  `screenshots/wp4-1440x900-foreground-occluder-review.png` — foreground
  occluder with intended subject relationship and set checklist.
- `c531d1e335c719788f210480d906d7fce86c36291ca1fd3b11afeff09eda0660`
  `screenshots/wp4-1440x900-escape-focus-restored.png` — Escape recovery with
  focus restored to the exact surviving invoker.
- `2c722dd5902debe0039296fe29e2a7f9c810a7f3cd2aa4d608b0b01fd6b07338`
  `screenshots/wp4-1440x900-character-needs-correction-blocker.png` — the Dot
  needs-correction example with the exact readable contradiction.
- `6745810153d883b4dbcaf68f178339c6749f4f930e0de997520c86cce257ecfa`
  `screenshots/wp4-1440x900-unavailable-fail-closed-disabled-reason.png` —
  the unavailable fail-closed state: disabled review control with the exact
  reason.

Note: the evidence was captured against a dev server on port 5174 because
port 5173 is held by a stale v84-workspace server outside this workspace; the
script defaults to 5173 and the used base URL is recorded in the report.
Screenshot SHA-256 values above reproduce from the committed files.

## Limitations and stop

This is F4-WP4 only. It does not accept F4, start F4-WP5, read or write real
files, decode media, slice artwork, generate masks, calculate pivots or
sockets, build rigs, preview motion, approve anything, promote capability,
claim production readiness, integrate the Player, persist projects, connect
providers or workers, animate in Godot, assemble in Remotion, render, export,
package Windows, or launch privately. Merge only after the exact pushed
handback tip passes hosted checks and independent exact-head review.
