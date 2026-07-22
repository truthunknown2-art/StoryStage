# Kimi full brief — F4-WP5 responsive, accessibility, and evidence gate

## Immutable assignment identity

- Inbox version: `88`
- Task: `F4-WP5-RESPONSIVE-ACCESSIBILITY-EVIDENCE`
- Issue: `#117`
- Exact accepted base: `0b8d03940e65114d6cd7edba4ae4fa2028be2c19`
- Required branch: `agent/kimi-f4-wp5-responsive-accessibility-evidence`
- Owner: Kimi, frontend/UI/UX only
- Milestone/package: `F4 / F4-WP5`

Start from the exact accepted base on the exact required branch. Publish one
immutable implementation/evidence commit, one truthful handback commit, and a
draft PR to `product/v1`. Stop before F5.

## Sources and predecessor truth

Read `AGENTS.md`, `CODEX_START_HERE.md`, `docs/PRODUCT_PLAN.md`,
`docs/PRODUCT_ROADMAP.md`, `docs/ROADMAP_STATUS.md`,
`docs/plans/milestone-F4.md`, this brief, issue #117, and the accepted F4-WP1
through F4-WP4 Product v1 modules, tests, and evidence before writing.

Preserve every accepted F4 boundary:

- the requirement model remains scene/episode scope and readiness authority;
- request packs remain planning text only;
- candidates remain session-local descriptive records only;
- layer/rig review evaluates declared fixture metadata only; and
- no file, decoded image, prepared layer, rig, approval, capability, or
  production-ready artifact exists in this frontend milestone.

## Objective and primary invariant

Complete the integrated Assets & Rigs responsive, accessibility,
reduced-motion, and exact evidence gate.

The complete workspace must be keyboard-usable, focus-safe, understandable to
assistive technology, deliberately composed at 1920x1080, 1440x900, and
1024x800, and evidenced from one exact immutable candidate without weakening
any accepted truth boundary.

## Required keyboard and focus behavior

Exercise the ordinary Product v1 Projects → Paste a script → shared review →
Studio → Assets & Rigs path without a pointer.

- Keep a logical Tab/Shift+Tab order through the workspace switch, categories,
  episode/scene filters, requirements, asset records, request/import controls,
  and review controls. Do not intercept native select-arrow behavior.
- Category and record activation must synchronize selection/detail without
  moving focus unexpectedly. If a roving model is added, use one tab stop plus
  Arrow/Home/End with accurate selected state and focused regressions.
- Every focused control needs a visible focus indicator of at least 2px and a
  unique accessible name.
- Expanded request/review invokers must expose `aria-expanded` and stable
  `aria-controls` relationships.
- Opening request/review moves focus to its labelled heading or fail-closed
  alert. Escape and Close restore focus to the exact surviving invoker.
- If scope/category/record changes remove an invoker, move focus to a stable
  surviving control instead of `body` or removed content.
- Switching request ↔ review leaves at most one transient panel open and never
  strands focus in removed content.
- Missing source/license, wrong format, duplicate, unavailable, cancelled,
  confirmed, validation, and review-example failure states must move or retain
  focus deliberately and announce concise outcomes once.
- Give review tables an accessible name or caption. No state may rely on color
  alone.
- Keep request/review panels inline. Do not add a modal or focus trap unless the
  complete modal interaction contract is genuinely required and implemented.

## Responsive and reduced-motion behavior

- At 1920x1080 and 1440x900, retain clear categories, filters, requirements,
  asset list/detail, and inline request/review context.
- At 1024x800, use this intentional order: workspace truth/header → categories
  → filters → requirements → asset list → selected detail. Request/review stays
  inside its requirement row.
- Headers, controls, action groups, metadata, source/license fields,
  future-action reasons, examples, and disclosures must wrap without clipping.
- A wide part/review table must reflow or use a labelled, keyboard-reachable
  contained horizontal scroller; it must never widen the document.
- Permit vertical scrolling, but keep the final requirement, selected detail,
  panel Close, validation error, and terminal action keyboard-reachable and
  scrolled into view.
- No document-level horizontal overflow, clipped text/control, overlap,
  inaccessible off-screen action, hover-only state, or hidden source/rights,
  blocker, error, unavailable, or non-production disclosure.
- Wherever `Review-ready` appears, keep adjacent truth that no files were
  inspected, no layer/rig exists, and this is not approval, capability, or
  production readiness.
- Preserve the existing `.pv1-page` reduced-motion blanket. Under
  `prefers-reduced-motion: reduce`, computed animation/transition duration must
  be effectively removed and scroll behavior must be `auto`; focus restoration
  and validation changes remain immediate and understandable.

## Required tests

Add focused regressions for:

- keyboard entry into and exit from Assets & Rigs;
- category, filter, requirement-action, record-selection, and detail agreement;
- request/review open, switch, Escape, Close, scope removal, and exact focus
  recovery;
- validation and terminal import-state focus;
- unavailable review alert focus, table naming, and non-color state meaning;
- the at-most-one transient-panel invariant;
- retained counts, readiness, source/rights, and session-local truth; and
- reduced-motion source and computed behavior.

Import any new focused suite into the standard Studio entry. Preserve all 217
accepted Studio tests, then run the complete Studio test, typecheck, production
build, touched-file lint, `git diff --check`, and serialized repository-root
verification.

## Required browser evidence

Capture fresh integrated evidence; do not reuse F4-WP1 through F4-WP4 PNGs.
Attach console warning/error and page-error listeners before navigation.

- 1920x1080: complete workspace overview; request/import source-and-rights
  state; Review-ready layer/rig state with adjacent non-production truth.
- 1440x900: multi-scene readiness/aggregate truth; wrong-format or duplicate
  failure; Needs correction plus layered-set/foreground-occluder review.
- 1024x800: intentional stacked overview; visible keyboard focus on category or
  record navigation; focused request validation; reachable review table Close;
  Escape return-focus state; reduced-motion state.

The machine-readable report must record exact viewport, URL, per-state checks,
document width, named critical-region bounds, keyboard focus identity and
reachability, panel/state truth, reduced-motion query/computed styles, console
warnings/errors, page errors, visible truth strings, and SHA-256 for every
fresh screenshot. All screenshots must have exact dimensions and unique hashes.
Retain the forbidden enabled-claim scan and prove accepted counts/readiness do
not change through transient panels.

## Allowed files

- `apps/studio/src/product-v1/StudioShell.tsx`
- `apps/studio/src/product-v1/AssetWorkspace.tsx`
- `apps/studio/src/product-v1/AssetRequestImport.tsx`
- `apps/studio/src/product-v1/AssetReview.tsx`
- focused existing asset tests under `apps/studio/src/product-v1/`
- optional `apps/studio/src/product-v1/asset-accessibility.test.tsx`
- the single standard `apps/studio/src/App.test.tsx` test-entry import
- bounded additions to `apps/studio/src/styles.css`
- one portable `apps/studio/scripts/f4-wp5-evidence.mjs`
- the dated handback/evidence directory under
  `reports/agent-handoffs/2026-07-22-kimi-f4-wp5-responsive-accessibility-evidence/`

Do not change fixture/model semantics, manifests, lockfiles, roadmap/status,
Kimi inbox, contracts, story engine, desktop, workers, persistence, providers,
Godot, Remotion, rendering, export, packaging, or legacy asset screens.

## Non-goals and stop

No F5 audio, F6 timeline/export, real files, image generation, providers,
preparation services, approval, capability promotion, persistence, workers,
backend, Godot, Remotion, rendering, export, packaging, or private launch.

Publish an immutable handback with exact base, implementation SHA, handback
tip, changed files/stat, every command/result, report and screenshot hashes,
visible-control truth inventory, limitations, and PR/issue links. Then exit.

Completion creates only the complete F4 milestone candidate. Codex must audit
the exact pushed head, hosted checks must pass, ChatGPT Pro must audit the
complete milestone, and the durable F4 gate must pass before F5 can start.
