# Kimi full brief — F4-WP4 layer and rig review UX

## Immutable assignment identity

- Inbox version: `86`
- Task: `F4-WP4-LAYER-RIG-REVIEW-UX`
- Issue: `#113`
- Exact accepted base: `3a98dfff7b543821c02ead9499a9ec0efd93913b`
- Required branch: `agent/kimi-f4-wp4-layer-rig-review-ux`
- Owner: Kimi, frontend/UI/UX only
- Milestone/package: `F4 / F4-WP4`

Start from the exact accepted base on the exact required branch. Publish one
immutable implementation/evidence commit, one truthful handback commit, and a
draft PR to `product/v1`. Stop before F4-WP5.

## Sources and predecessor truth

Read `AGENTS.md`, `CODEX_START_HERE.md`, `docs/PRODUCT_PLAN.md`,
`docs/PRODUCT_ROADMAP.md`, `docs/ROADMAP_STATUS.md`,
`docs/plans/milestone-F4.md`, this brief, issue #113, and the accepted F4-WP1
through F4-WP3 Product v1 modules/tests before writing.

Preserve these accepted boundaries:

- the scene/episode requirement model remains the scope and readiness authority;
- request packs remain planning text only;
- F4-WP3 candidates remain session-local descriptive records only;
- no file, decoded image, layer, rig, approval, capability, or production-ready
  artifact exists anywhere in this frontend milestone; and
- opening a review surface must not mutate requirement counts/readiness or the
  selected Studio scene/beat.

## Objective and primary invariant

Extend the accepted Assets & Rigs workspace with a professional, deterministic
layer-and-rig review prototype. Incomplete preparation must remain visibly
review-required, and no candidate may be labelled production-ready without the
required evidence.

This is a review-state UX, not a preparation engine. The creator should be able
to understand what a future prepared character, rig, or layered set must
contain, see why a declared example is incomplete or contradictory, and
distinguish `Incomplete`, `Needs correction`, and `Review-ready` without being
misled into believing files or usable production assets exist.

## Required model and truth behavior

Add one small deterministic review model beside the accepted Product v1 asset
modules. Keep it concrete and package-local; do not invent a generic asset
framework.

1. Bind every review record to exact requirement, scene, category, and declared
   candidate identity. Unknown or mismatched identities fail closed as
   unavailable and never enter counts or a review-ready result.
2. Provide explicitly labelled local demo review fixtures for all three states:
   `Incomplete`, `Needs correction`, and `Review-ready`. They are descriptive
   fixture evidence only—not claims that a candidate file or derived artifact
   exists.
3. Derive the displayed state mechanically from the displayed review facts.
   Invalid/conflicting facts outrank completeness. `Review-ready` requires every
   category-required declaration and zero contradiction; it still means only
   ready for a later human/artifact review, never approved or production-ready.
4. Preserve visible source/rights truth from the local descriptive candidate or
   fixture. Creator-entered source/rights text is not independent proof.
5. Do not change F4-WP2 readiness labels/counts when a review panel opens,
   switches fixture state, or closes.

Fail closed for at least: unknown requirement/candidate/category, stale scene
association, duplicate required identity, unknown turnaround view, missing or
invalid padded bounds, out-of-bounds/non-finite pivot declaration, missing mask
declaration, unsupported profile, unknown expression/viseme, contradictory
checklist state, unknown layered-set plane, duplicate plane order, and invalid
foreground-occluder association. Error copy must identify the blocker without
claiming byte/pixel/media inspection.

## Required review surfaces

### Character and rig review

For eligible character/rig requirements, expose an understandable review panel
that shows:

- required turnaround views and which are declared/missing;
- part inventory with stable local IDs;
- declared padded bounds;
- declared pivots/attachment intent;
- required mask declarations;
- supported profile coverage;
- expression and viseme inventory; and
- a motion-readiness checklist with visible pass/block reasons.

Use readable tables/lists or compact sections. Never draw fake image pixels,
pretend a skeleton exists, or call declared metadata measured/calculated.

### Layered-set review

For eligible layered-set requirements, expose:

- background, midground, and foreground plane declarations in explicit order;
- foreground occluder declarations and intended subject relationship;
- missing/duplicate/invalid-plane correction reasons; and
- the same `Incomplete`, `Needs correction`, `Review-ready` vocabulary and
  non-production truth.

Other categories must either omit the review action or show a truthful disabled
reason. No enabled control may lead nowhere.

## Interaction and accessibility contract

- Use one open review identity at a time. Opening request/import closes review;
  opening review closes request/import. Scene, episode, category, requirement,
  or selected-record scope changes clear transient review state.
- Provide working controls to open/close the review, inspect each required
  section, and switch between the three declared demo review examples if that
  is how the state matrix is exposed.
- An expanded invoker must toggle or have another clear observable action; no
  dead control is allowed.
- Opening moves focus into a labelled review heading. Close and Escape restore
  focus to the exact surviving invoker. Invalid/stale scope moves focus to a
  readable alert or closes fail-closed.
- Keep focus indication visible, avoid color-only state, use semantic headings,
  lists/tables/descriptions, and preserve current 1440x900 readability with no
  horizontal document overflow.
- Do not redesign the wider Studio, start the F4-WP5 responsive pass, or change
  unrelated F3/F4 visual language.

## Visible-control truth inventory

Every visible control must be one of:

- a real deterministic local UI action with observable state;
- intentionally disabled with an adjacent reason; or
- omitted.

Forbidden enabled or success claims include: Slice, Generate mask, Calculate
pivot/socket, Build rig, Preview motion, Approve, Promote capability,
Production ready, Open in Godot, Render, Export, or any equivalent. If shown as
future workflow context, keep it disabled and explain that no artifact/service
exists.

`Review-ready` must always have adjacent copy equivalent to: the declared local
checklist is internally complete for review, but no files were inspected, no
layer or rig exists, and this is not approval, capability, or production
readiness.

## Allowed files

- bounded Product v1 asset/review modules and tests under
  `apps/studio/src/product-v1/`;
- the single standard Studio test-entry import if required;
- bounded additions to `apps/studio/src/styles.css`;
- one portable `apps/studio/scripts/f4-wp4-evidence.mjs`; and
- the dated F4-WP4 handback/evidence directory under
  `reports/agent-handoffs/`.

Do not change manifests, lockfiles, roadmap/status, Kimi inbox, contracts,
story engine, desktop, workers, persistence, providers, Godot, Remotion,
rendering, export, packaging, or legacy production asset screens.

## Required verification

At minimum:

1. focused pure-model tests pin the three mechanically derived states and every
   listed fail-closed identity/contradiction class;
2. focused UI tests pin character/rig and layered-set review, source/rights
   truth, no count/readiness mutation, no false production label, working
   controls, scope clearing, Escape, and focus restoration;
3. import the focused suite into the standard Studio test entry so
   `pnpm --filter @storystage/studio test` executes it;
4. Studio full test, typecheck, and production build pass;
5. touched-file lint and `git diff --check` pass;
6. repository-root verification passes; serialize workspace concurrency if
   needed to avoid the documented image-test resource contention; and
7. run the browser evidence script against the actual local Studio.

## Required evidence

Capture actual 1440x900 application states through the ordinary Projects →
Create → shared review → Studio → Assets & Rigs path. Include at least:

- character Incomplete;
- character Needs correction with a readable exact blocker;
- character Review-ready with adjacent non-production truth;
- rig turnaround/parts/pivots/masks/profiles;
- expressions/visemes and motion checklist;
- layered-set plane order;
- foreground occluder review;
- invalid/stale or unavailable fail-closed state;
- keyboard focus; and
- close/cancel or scope-change recovery.

The machine-readable report must include viewport, per-state checks, screenshot
SHA-256 values, console warnings/errors, page errors, document overflow, focus
evidence, visible truth strings, and a scan proving zero enabled approval,
promotion, production, file, provider, Godot, render, or export claim.

## Handback and stop

Publish an immutable handback with exact base, implementation SHA, handback
tip, changed files/stat, every command/result, report and screenshot hashes,
visible-control truth inventory, limitations, and PR/issue links. Then exit.

Do not start F4-WP5, F5, F6, backend, persistence, real file/import/provider
work, Godot, Remotion, rendering, export, packaging, or private launch.
