# F4-WP5 audited successor handback

Task: `F4-WP5-RESPONSIVE-ACCESSIBILITY-EVIDENCE-RECOVERY`

Issue:
[#117](https://github.com/truthunknown2-art/StoryStage/issues/117)

Pull request: recorded on the issue and in the PR itself; this file is
committed before the PR exists, so the PR/issue comments carry the exact
link and tip SHA.

Original Kimi branch: `agent/kimi-f4-wp5-responsive-accessibility-evidence-v2`

Audited successor branch: `agent/codex-f4-wp5-review-correction`

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
  verification: merge commit `122431a88b3480ccf00375158576486d4db4c55c`
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

## Independent exact-head correction

Codex independently audited the original pushed Kimi handback tip
`ec4fb78c4ee2cd1d48261bcfa79cd16bdcaf59b6`. Hosted verification passed, but
the exact head was rejected before milestone review because the audit found
four evidence/accessibility defects: programmatically focused request status
targets had no visible focus treatment; an active request required two Escape
presses to restore its invoker; the evidence used pointer activation for the
Projects-to-Assets route; and the table scroller's keyboard reachability was
inferred rather than exercised. The handoff also named the status-lineage
merge incorrectly; the resolvable identity is now recorded above.

The successor branch contains only the bounded corrections for those findings:
visible 2px focus treatment for the alert and terminal note, single-Escape
close-and-restore behavior, focused regression coverage, and fail-closed
browser evidence that performs the complete entry route with keyboard input,
tabs to the review-table scroller, issues ArrowRight, and requires movement
only when overflow exists. It also captures the two new focus states. No fixture/model
semantics or accepted F4-WP1 through F4-WP4
truth changed. The successor PR and issue #117 record its exact pushed tip.

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
`screenshots/` (16 PNGs + `clickthrough-report.json`).

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

Every command below ran in this workspace. The focused, complete Studio,
typecheck, build, lint, diff, root, and browser results were rerun on the
audited successor tree after the correction above.

- `pnpm install --frozen-lockfile`: PASS (29.7s; lockfile untouched).
- Focused F4-WP5 suite
  (`cd apps/studio && pnpm exec vitest run src/product-v1/asset-accessibility.test.tsx`):
  PASS, 12/12 on the final tree. The combined request/import and accessibility
  regression files also pass 30/30, including the prior F4-WP3 contract updated
  to assert single-Escape recovery.
- Complete Studio suite
  (`VITEST_MAX_WORKERS=2 pnpm --filter @storystage/studio test`):
  PASS, 229/229 (vitest duration 95.24s) on the final
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
- Touched-file ESLint (the touched TS/TSX files plus the evidence
  script): PASS, zero errors. `styles.css` has no matching ESLint
  configuration, as in prior packages.
- `git diff --check`: PASS (committed diff vs base and working tree).
- Serialized repository-root verification
  (`VITEST_MAX_WORKERS=4 pnpm --workspace-concurrency=1 verify`):
  PASS, exit 0, 4m47s. Roadmap consistency, generated-artifact checks,
  E1 security evidence, privacy, repository lint (0 errors; 2 pre-existing
  warnings), all-package typecheck, and all tests passed: contracts 11/11,
  fixtures 2/2, orchestration 4/4, codex-lab 104/104, e1-director-lab 4/4,
  registration-review 21/21, story-engine 353/353, remotion-runtime 29/29,
  asset-pipeline 126/126, asset-worker 5/5, render-worker 24/24, desktop
  11/11, Studio 229/229.
- Audited-successor browser evidence
  (`STUDIO_BASE_URL=http://127.0.0.1:5196/ node apps/studio/scripts/f4-wp5-evidence.mjs`):
  PASS, 52/52 checks (12 at 1920x1080, 20 at 1440x900, 19 at 1024x800, 1
  cross-viewport integrity), zero console warnings/errors, zero page errors,
  no horizontal document overflow in any captured state. Each viewport proves
  the complete Projects-to-Assets entry route with keyboard input and exact
  focus identities. The run also proves visible programmatic status focus,
  single-Escape invoker restoration, and Tab reachability plus conditional
  ArrowRight behavior for the scroller. The captured table reflows to its
  886px container, so this exact state has no horizontal distance to scroll.

Note: the audited-successor evidence was captured against a dev server on port 5196 because
port 5173 is held by a stale v84-workspace server outside this workspace
(the same condition the F4-WP4 handback recorded); the script defaults to
5173 and the used base URL is recorded in the report.

## Evidence

Machine-readable report: `screenshots/clickthrough-report.json`

Report SHA-256:
`506308d1c76f256013e9120a9f26be4d0d8555ef693dcca06666decc57e73820`

The report records exact viewport and URL, every per-state check, document
width measurements, named critical-region bounds, keyboard focus identity
and reachability, panel/state truth, reduced-motion query and computed
styles, console warnings/errors (none), page errors (none), visible truth
strings, the forbidden enabled-claim scan, counts/readiness preservation,
and the SHA-256 and exact dimensions of every screenshot. All 16 hashes are
unique. Two 1440x900 captures are byte-identical to the accepted F4-WP4
captures of the same deterministic states (same machine, renderer, fixtures,
and scroll contract) — fresh captures proving those accepted states did not
regress, not reused files.

- `5e0821d41d757406eec4c8b639b43c9b43558a626ea39d34543ea02e702ef031`
  `screenshots/wp5-1920x1080-workspace-overview.png` (1920x1080) — complete
  workspace overview.
- `2f0983d0c29fbe2ca4188cbb1d0182c5b9976ef3e257c97fc972e406029b9f54`
  `screenshots/wp5-1920x1080-request-source-rights.png` (1920x1080) —
  request/import source-and-rights state with declared-metadata honesty.
- `83cbeb6e0f1b42ad9d0a0c1f12e9ec98bf765f075dd50bf1a13cafc91bf282d3`
  `screenshots/wp5-1920x1080-review-ready-nonproduction-truth.png`
  (1920x1080) — Review-ready layer/rig state with the adjacent
  non-production truth.
- `c6d54e676aa3eb90082c7e8afb2572bf7d9edce57534d7f406c90ecf988211d8`
  `screenshots/wp5-1440x900-multi-scene-readiness-aggregate.png` (1440x900)
  — multi-scene readiness with the honest episode aggregate scope note.
- `2a3afe3466efa8bad76bf6797d686b8668b8acfd55aa3aea861dfff2e9babfc0`
  `screenshots/wp5-1440x900-wrong-format-failure.png` (1440x900) —
  wrong-format failure: declared metadata, not media sniffing, no candidate
  created.
- `4d2d0db178b54c6bf90fcc210cd345e555981fd6b2ea571a58c722cb338e2342`
  `screenshots/wp5-1440x900-confirmed-terminal-focus.png` (1440x900) -
  confirmed terminal request status with visible programmatic focus.
- `960b060a272c5a52f65272ee7f6c2edfd1c56ccb60621a4be992ba8318f41147`
  `screenshots/wp5-1440x900-needs-correction-blocker.png` (1440x900) — Dot
  Needs correction with the exact readable contradiction.
- `02c385d012dbffe31de095111e7c146611159da27535c182476438c788d82c7a`
  `screenshots/wp5-1440x900-layered-set-plane-order.png` (1440x900) —
  layered-set planes in explicit order.
- `35028f7db96df826d515a382d47dcb00fbd55afcd8b7586b0f11950b4e11b563`
  `screenshots/wp5-1440x900-foreground-occluder-review.png` (1440x900) —
  foreground occluder with intended subject relationship.
- `78431486a3405c09cb7c6ea41b1349f0b38672587fd632e040136a04ce20e559`
  `screenshots/wp5-1024x800-stacked-overview.png` (1024x800) — intentional
  stacked order at compact width.
- `770d9db37ac9bfc0249fd581e35acd3ae2f5e9f8c27300d09b9a2b1feaf489f9`
  `screenshots/wp5-1024x800-keyboard-focus-category.png` (1024x800) —
  visible keyboard focus on category navigation.
- `fdd3ad590455182b0ed9106893907e60a949d6e9860d3d90db2b1fba0e2f1cac`
  `screenshots/wp5-1024x800-request-validation-focus.png` (1024x800) —
  focused request validation: readable alert, aria-invalid, focus on the
  source field.
- `3229307c55f56e00b6c7f2bbe071a6d99d46a45f33016401280e987a13816af2`
  `screenshots/wp5-1024x800-review-table-scroller-focus.png` (1024x800) -
  review-table scroller reached by Tab and visibly focused; ArrowRight was
  issued, but the captured table and container are both 886px wide, so no
  horizontal movement is claimed or required. The document does not widen.
- `fd579e265de6fbce34616baf73073eafc7250dc5259b58fd626e3e96a7d0e453`
  `screenshots/wp5-1024x800-review-table-close-reachable.png` (1024x800) —
  review-table Close keyboard-reachable beside the contained scroller.
- `68e741f81822345c4ff850fe7a5d1d634f7174ea8ca069b2a575bf1cc5e4be7a`
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
