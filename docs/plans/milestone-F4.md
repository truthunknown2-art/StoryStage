# F4 - Assets and rigs workspace

## Authority

- Governing roadmap: `docs/PRODUCT_ROADMAP.md`, milestone F4
- Required predecessor: accepted F3 Director workspace at
  `product/v1@fd0bd16c531e1742c14b21fc79cf8c47eb82d200`
- Owner: Kimi for `apps/studio` frontend implementation
- Dispatcher and feasibility/terminology reviewer: Codex
- Milestone auditor: ChatGPT Pro
- Product authority: Preston's standing dependency-ordered continuation
  direction recorded on 2026-07-21
- Decomposition approval: the dependency-ordered F4-WP1 through F4-WP5
  decomposition was accepted in G0
- Current authorization: F4 is accepted at exact product merge
  `5c7107f3b201780865c30f11a59716e4a82d16d4`; Kimi is `WAIT`
- Accepted F4-WP5 implementation/evidence correction:
  `a5f642fdc3df9a86241669c855a27ad3b8b67244`
- Accepted exact handback head:
  `44f521860c89eb883da4b56495cc1dad67d1c73a`
- F5-WP1 remains unauthorized until its separate complete milestone plan,
  issue, exact-base status transition, and higher validated Kimi inbox exist
- Backend product work remains blocked until the complete F6 Frontend Gate is
  accepted

## Objective and milestone invariant

Make every selected scene's character, set, prop, layer, and rig needs
understandable and reviewable before real asset services exist.

Every selected scene must expose understandable asset needs,
source/approval/readiness truth, and the next real preparation action without
claiming that an image or rig exists.

## Dependency-ordered work packages

### F4-WP1 - Asset workspace information architecture

**Primary invariant:** every asset category, filter, selection, and detail view
agrees on one understandable scene/episode scope without claiming unavailable
asset work.

**Tasks**

- add Characters, Locations, Layered Sets, Props, and Rigs views;
- add scene and episode filters plus selected-asset detail;
- provide truthful local demo fixtures; and
- establish the milestone's readiness vocabulary.

**Non-goals:** file import, image generation, slicing, rigging, approval,
backend contracts, filesystem writes, Godot, or Remotion.

**Targeted verification and completion:** navigation and selection tests, no
dead success control, Studio typecheck/build, desktop workspace screenshots,
root verification, and an exact pushed handback. Stop before F4-WP2.

### F4-WP2 - Scene asset requirements and readiness

**Primary invariant:** the creator can distinguish required, optional,
reusable, missing, candidate, needs-preparation, needs-review, and ready asset
truth per scene without an aggregate hiding scope or blockers.

**Tasks**

- show required, optional, and reusable assets per scene;
- expose missing, candidate, needs-preparation, needs-review, and ready states;
- explain every blocking reason; and
- aggregate episode counts without hiding scene scope.

**Non-goals:** automatic script analysis, asset creation, capability counts,
production approval, or backend contracts.

**Targeted verification and completion:** multi-scene readiness tests, honest
empty/partial/ready screenshots, root verification, and exact handback. Stop
before F4-WP3.

### F4-WP3 - Image request and import UX

**Primary invariant:** request and candidate-import states remain inspectable,
cancelable, source-attributed, and explicitly unapproved until the user
confirms them.

**Tasks**

- preview prompt/request packs, references, expected views, and layers;
- show download, import, and drop states;
- cover duplicate, wrong-format, error, and cancel paths;
- expose source and license fields; and
- require user confirmation before candidate acceptance.

**Non-goals:** ChatGPT website control, API credentials, background generation,
automatic approval, real filesystem writes, or provider integration.

**Targeted verification and completion:** full request-to-candidate-import
prototype tests, error/cancel tests, no credential fields, actual screenshots,
root verification, and exact handback. Stop before F4-WP4.

### F4-WP4 - Layer and rig review UX

**Primary invariant:** incomplete layer and rig preparation remains visibly
review-required, and no candidate is labelled production-ready without the
required evidence.

**Tasks**

- show view turnaround, part list, padded bounds, pivots, masks, profiles,
  expressions/visemes, and a motion-readiness checklist;
- show layered-set planes and foreground occluders; and
- expose incomplete, needs-correction, and review-ready states.

**Non-goals:** actual slicing, socket calculation, Godot scenes, motion render,
capability promotion, or ordinary Player integration.

**Targeted verification and completion:** truthful incomplete,
needs-correction, and review-ready state tests/screenshots; no false
production-ready label; root verification; and exact handback. Stop before
F4-WP5.

### F4-WP5 - Responsive, accessibility, and evidence gate

**Primary invariant:** the complete assets workspace is keyboard-usable and
reachable at supported viewport sizes, and its evidence matches its exact
accepted state.

**Tasks**

- complete keyboard asset navigation, filters, drawers/stacking, and focus;
- honor reduced motion; and
- capture the screenshot/hash package and complete click-through.

**Non-goals:** F5 audio, persistence, providers, workers, backend, Godot,
Remotion, rendering, export, or packaging.

**Targeted verification and completion:** required viewports, no overflow or
unreachable region, root verification, exact handback, Codex/Pro audit, and
Preston's standing-authority milestone acceptance.

## Milestone gate

The asset workspace must truthfully expose scene-scoped needs, readiness,
sources/rights, request/import states, layer and rig review, and the next real
preparation action without claiming that asset services, files, images, rigs,
or production capabilities exist. Passing F4 does not authorize F5 until its
separate exact-base ticket/status transition.

## Acceptance receipt

F4-WP1 through F4-WP5 and the complete F4 milestone are accepted and
integrated at `product/v1@5c7107f3b201780865c30f11a59716e4a82d16d4`.
PR #121 exact head `44f521860c89eb883da4b56495cc1dad67d1c73a`
passed the focused, Studio, typecheck, build, lint, serialized root, 52/52
browser, 16-screenshot/hash, three-reviewer, hosted-run `29952061999`, and
ChatGPT Pro exact-head gates. The merge tree is byte-identical to the accepted
candidate; postmerge run `29953736441` passed on retry after an unchanged MCP
stdio timing race, and a clean detached checkout passed roadmap consistency,
focused F4-WP5 12/12, and the exact MCP transport file 5/5.

This acceptance closes only the frontend Assets & Rigs milestone. It grants no
real file/media access, generation/import, persistence, asset approval,
capability promotion, worker/backend, Godot, Remotion, render/export, Windows
packaging, QA, or private-launch authority. Kimi inbox v90 records `WAIT`.
