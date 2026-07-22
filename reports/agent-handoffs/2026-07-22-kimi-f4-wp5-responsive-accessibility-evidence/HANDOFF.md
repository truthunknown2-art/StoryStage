# F4-WP5 immutable handback

Task: `F4-WP5-RESPONSIVE-ACCESSIBILITY-EVIDENCE-RECOVERY`

Issue:
[#117](https://github.com/truthunknown2-art/StoryStage/issues/117)

Pull request: recorded on the issue and in the PR itself; this file is
committed before the PR exists, so the PR/issue comments carry the exact
link and tip SHA.

Required branch: `agent/kimi-f4-wp5-responsive-accessibility-evidence-v2`

Inbox: version `89` on `origin/agent/kimi-frontend`

## Exact identity

- Exact authorized implementation base:
  `0b8d03940e65114d6cd7edba4ae4fa2028be2c19` (verified an ancestor of
  `origin/product/v1`; required branch verified absent locally and remotely
  before creation).
- Preserved unaccepted v88 WIP incorporated unchanged by cherry-pick:
  `51ff4741f246b86244f13d11a2ad3b373f99d75f`, landing as
  `65c283d2beb3f377d49450ba5af4cdd082ece5f1`. Its diff touches only the six
  Version 88 allowed source files.
- Codex start and recovery status transition incorporated before final
  verification: merge commit `122431af39ed2d036d4f232ab30639be357b2fdc`
  bringing `product/v1@9873819739396cf8314affa9893be0fa3e106f21`. It changes
  only `docs/ROADMAP_STATUS.md` and `docs/plans/milestone-F4.md`; it is the
  Codex-published authorization the roadmap consistency guard requires
  (owner Kimi, START_NOW, exact base, v2 branch, issue #117).
- Exact implementation and evidence SHA:
  `b838c6d13db9ff6027a8e534602a14a204dd2fb9`. Its ancestry contains the
  cherry-picked WIP, the status-transition merge, the portable F4-WP5
  evidence script and fresh captured matrix
  (`45c8f501f42196ae728e25badfd09fd92299d3cd`), and the bounded compact
  stacked-order correction described below.
- Handback tip: the commit containing this file; GitHub issue #117 and the
  draft PR record its exact pushed SHA because a commit cannot embed its own
  identity.

## Recovery note

Version 88's Kimi process exited after its focused suite passed and before
the complete suite, evidence, handback, or PR existed. This recovery
continues the same package from the exact same base and preserved WIP. One
bounded implementation correction was needed beyond the preserved WIP: the
first evidence run proved the compact control row placed the filters 10px
above the categories, violating the brief's intentional 1024x800 order, so
`apps/studio/src/styles.css` (an allowed file) now stacks the control row
categories-above-filters at `max-width: 1024px`. The new evidence script
itself took two selector/direction corrections before its first green run
(header Close name; Shift+Tab toward the header Close). No fixture/model
semantics changed; no accepted F4-WP1–F4-WP4 truth was weakened.

## Delivered result

The accepted Product v1 **Assets & Rigs** workspace now completes the
responsive, accessibility, reduced-motion, and exact evidence gate:

- Keyboard and focus: logical Tab/Shift+Tab order through the workspace
  switch, categories, episode/scene filters, requirements, asset records,
  request/import controls, and review controls; native select-arrow behavior
  untouched. Category and record activation synchronize selection/detail
  without moving focus unexpectedly. Every focused control keeps a visible
  >=2px indicator and a unique accessible name. Request/review invokers
  expose stable `aria-expanded`/`aria-controls` relationships; opening moves
  focus to the labelled heading (or the fail-closed alert); Escape and Close
  restore focus to the exact surviving invoker; scope removal of an open
  panel moves focus to the stable surviving Scene filter via the new
  backstop — never `body` or removed content. At most one transient panel is
  open at any time.
- Responsive and reduced motion: deliberate composition at 1920x1080,
  1440x900, and 1024x800; the intentional 1024 order truth/header →
  categories → filters → requirements → asset list → selected detail;
  headers, controls, action groups, metadata, source/license fields, and
  disclosures wrap without clipping; the wide declared part table lives in a
  labelled, keyboard-reachable contained horizontal scroller and never
  widens the document; no document-level horizontal overflow at any captured
  state. The `.pv1-page` reduced-motion blanket is preserved and proven
  computed: under `prefers-reduced-motion: reduce` the query matches,
  animation/transition durations clamp to 0.01ms, scroll behavior is `auto`,
  and focus restoration/validation remain immediate.
- Truth preservation: counts, readiness, source/rights, session-local
  candidate, and declared layer/rig review truth are byte-identical through
  every transient panel; the `Review-ready` label keeps its adjacent truth
  that no files were inspected, no layer or rig exists, and this is not
  approval, capability, or production readiness.

`apps/studio/src/App.test.tsx` changes only by importing the new focused
regression suite (`asset-accessibility.test.tsx`, 12 tests).

## Changed files

Implementation (cherry-picked preserved WIP, unchanged content):
`apps/studio/src/App.test.tsx`,
`apps/studio/src/product-v1/AssetRequestImport.tsx`,
`apps/studio/src/product-v1/AssetReview.tsx`,
`apps/studio/src/product-v1/AssetWorkspace.tsx`,
`apps/studio/src/product-v1/asset-accessibility.test.tsx`,
`apps/studio/src/styles.css` (plus the one bounded stacked-order rule
described above).

Evidence: `apps/studio/scripts/f4-wp5-evidence.mjs` and this directory's
`screenshots/` (14 PNGs + `clickthrough-report.json`).

Incorporated Codex status transition (not authored here):
`docs/ROADMAP_STATUS.md`, `docs/plans/milestone-F4.md`.

Handback: this file. Total product diff vs the exact base: 6 source files,
745 insertions, 42 deletions, plus the evidence script/evidence and the two
documentation files from the status merge.

## Visible-control truth inventory

Every visible control in the Assets & Rigs workspace remains one of:

- a real deterministic local UI action with observable state — workspace
  switch, category navigation, episode/scene filters, Open record, the
  per-row request/review invokers, the declared-example switcher, the
  request-panel source/license/confirm/cancel/start-over controls, and the
  panel Close controls;
- intentionally disabled with an adjacent reason — the preparation actions
  ("Attach reference art", "Slice artwork into layers", and peers), the
  review action on eligible requirements without a declared example, and the
  in-panel later-workflow row; or
- omitted — ineligible rows carry no request/review action.

No enabled control claims or performs generation, import, file access,
provider access, slicing, mask generation, pivot calculation, rig building,
motion preview, approval, capability promotion, production readiness, Godot,
rendering, or export. The browser forbidden-claim scan at all three
viewports found zero enabled forbidden controls, zero file/password inputs,
and zero approval/production/render/export success strings.

## Verification

Every command below ran on this exact branch in this workspace.

- `pnpm install --frozen-lockfile`: PASS (29.7s; lockfile untouched).
- Focused F4-WP5 suite
  (`cd apps/studio && pnpm exec vitest run src/product-v1/asset-accessibility.test.tsx`):
  PASS, 12/12, 17.88s on the final tree.
- Complete Studio suite
  (`VITEST_MAX_WORKERS=2 pnpm --filter @storystage/studio test`):
  PASS, 229/229, 1m57.959s wall (vitest duration 116.94s) on the final
  tree. Resource-pressure history, matching the v89 known-verification
  state: a 4-worker run finished 228/229 and a 1-worker run 227/229, each
  with only the unchanged pre-existing 5000ms-timeout flakes
  (`Cv002DraftReview.test.tsx` structured-beat/history; one run also the
  accepted App Undo/Redo test). Each flaked test passes in isolation
  (`Cv002DraftReview.test.tsx` 21/21 in 32.66s; the Undo/Redo test in
  4.31s). No accepted test or timeout was edited; the bounded-worker run
  above passed end to end on the final committed tree.
- `pnpm --filter @storystage/studio typecheck`: PASS.
- `pnpm --filter @storystage/studio build`: PASS (15.1s; only the
  pre-existing Vite large-chunk warning).
- Touched-file ESLint (the five touched TS/TSX files plus the evidence
  script): PASS, zero errors. `styles.css` has no matching ESLint
  configuration, as in prior packages.
- `git diff --check`: PASS (committed diff vs base and working tree).
- Serialized repository-root verification
  (`VITEST_MAX_WORKERS=4 pnpm --workspace-concurrency=1 verify`):
  PASS, exit 0, 7m2.299s. Roadmap consistency, generated-artifact checks,
  E1 security evidence, privacy, repository lint (0 errors; 2 pre-existing
  warnings), all-package typecheck, and all tests passed: contracts 11/11,
  fixtures 2/2, orchestration 4/4, codex-lab 104/104, e1-director-lab 4/4,
  registration-review 21/21, story-engine 353/353, remotion-runtime 29/29,
  asset-pipeline 126/126, asset-worker 5/5, render-worker 24/24, desktop
  11/11, Studio 229/229.
- Browser evidence
  (`STUDIO_BASE_URL=http://127.0.0.1:5195/ node apps/studio/scripts/f4-wp5-evidence.mjs`):
  PASS, 44/44 checks (11 at 1920x1080, 15 at 1440x900, 17 at 1024x800, 1
  cross-viewport integrity), zero console warnings/errors, zero page errors,
  no horizontal document overflow in any captured state.

Note: the evidence was captured against a dev server on port 5195 because
port 5173 is held by a stale v84-workspace server outside this workspace
(the same condition the F4-WP4 handback recorded); the script defaults to
5173 and the used base URL is recorded in the report.

## Evidence

Machine-readable report: `screenshots/clickthrough-report.json`

Report SHA-256:
`fe464bb81714cf9742cc6918eb290169db6736cd0c79ff2e007573fef5b09cf6`

The report records exact viewport and URL, every per-state check, document
width measurements, named critical-region bounds, keyboard focus identity
and reachability, panel/state truth, reduced-motion query and computed
styles, console warnings/errors (none), page errors (none), visible truth
strings, the forbidden enabled-claim scan, counts/readiness preservation,
and the SHA-256 and exact dimensions of every screenshot. All 14 hashes are
unique. Two 1440x900 captures are byte-identical to the accepted F4-WP4
captures of the same deterministic states (same machine, renderer, fixtures,
and scroll contract) — fresh captures proving those accepted states did not
regress, not reused files.

- `5384ca2b54c72a2c20c1f34ea077af65acdf91b19a2201d68bb1465910f7edfc`
  `screenshots/wp5-1920x1080-workspace-overview.png` (1920x1080) — complete
  workspace overview.
- `2f0983d0c29fbe2ca4188cbb1d0182c5b9976ef3e257c97fc972e406029b9f54`
  `screenshots/wp5-1920x1080-request-source-rights.png` (1920x1080) —
  request/import source-and-rights state with declared-metadata honesty.
- `83cbeb6e0f1b42ad9d0a0c1f12e9ec98bf765f075dd50bf1a13cafc91bf282d3`
  `screenshots/wp5-1920x1080-review-ready-nonproduction-truth.png`
  (1920x1080) — Review-ready layer/rig state with the adjacent
  non-production truth.
- `8898e26bd9869b4e50eb56d8d2a70c72a0cbce0cef2250608be85fbbdf711aa8`
  `screenshots/wp5-1440x900-multi-scene-readiness-aggregate.png` (1440x900)
  — multi-scene readiness with the honest episode aggregate scope note.
- `67a0cf20e90845a8ca80c9750cbb3c8a4db2f6bd63f754d87ff86cfe1f701d94`
  `screenshots/wp5-1440x900-wrong-format-failure.png` (1440x900) —
  wrong-format failure: declared metadata, not media sniffing, no candidate
  created.
- `0b576a8fe1c06beae6571df6374d432f09fdc16749b45d03514c30fe5fa208cc`
  `screenshots/wp5-1440x900-needs-correction-blocker.png` (1440x900) — Dot
  Needs correction with the exact readable contradiction.
- `02c385d012dbffe31de095111e7c146611159da27535c182476438c788d82c7a`
  `screenshots/wp5-1440x900-layered-set-plane-order.png` (1440x900) —
  layered-set planes in explicit order.
- `35028f7db96df826d515a382d47dcb00fbd55afcd8b7586b0f11950b4e11b563`
  `screenshots/wp5-1440x900-foreground-occluder-review.png` (1440x900) —
  foreground occluder with intended subject relationship.
- `15eaa67d0550c6982848dd4b6a2da163192d6d0e9698f1772098ce9d27b24fd9`
  `screenshots/wp5-1024x800-stacked-overview.png` (1024x800) — intentional
  stacked order at compact width.
- `770d9db37ac9bfc0249fd581e35acd3ae2f5e9f8c27300d09b9a2b1feaf489f9`
  `screenshots/wp5-1024x800-keyboard-focus-category.png` (1024x800) —
  visible keyboard focus on category navigation.
- `fdd3ad590455182b0ed9106893907e60a949d6e9860d3d90db2b1fba0e2f1cac`
  `screenshots/wp5-1024x800-request-validation-focus.png` (1024x800) —
  focused request validation: readable alert, aria-invalid, focus on the
  source field.
- `2e4e175fea92c32d4ffdfba9378513bc31f343aa267c6f4a4c76d394f5f3d582`
  `screenshots/wp5-1024x800-review-table-close-reachable.png` (1024x800) —
  review-table Close keyboard-reachable beside the contained scroller.
- `614ac22a00776bec6939108c916db3aec989bba65e4f2053ffc1d750402ee0c0`
  `screenshots/wp5-1024x800-escape-return-focus.png` (1024x800) — Escape
  return-focus on the exact surviving invoker.
- `dce1d306cb07b4b4360955d6ebe052f384a46fe19325d7159626a1747878f5e4`
  `screenshots/wp5-1024x800-reduced-motion.png` (1024x800) — reduced-motion
  state with the open review panel.

## Limitations and stop

This is F4-WP5 only. It does not accept F4, start F5/F6, read or write real
files, decode media, generate or import images, touch providers or
preparation services, approve anything, promote capability, claim production
readiness, persist projects, connect workers or backend, animate in Godot,
assemble in Remotion, render, export, package, or launch privately. The
evidence covers the bounded Ollo demo fixtures only. Merge only after the
exact pushed handback tip passes hosted checks and independent exact-head
review; the complete F4 milestone then requires Codex audit, hosted PASS,
ChatGPT Pro's milestone audit, and Preston's durable F4 acceptance.
