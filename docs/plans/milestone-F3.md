# F3 - Director workspace

## Authority

- Governing roadmap: `docs/PRODUCT_ROADMAP.md`, milestone F3
- Required predecessor: accepted E1 feasibility milestone
- Owner: Kimi for `apps/studio` frontend implementation
- Dispatcher and reviewer: Codex
- Milestone auditor: ChatGPT Pro
- Product acceptance: Preston
- Decomposition approval: the dependency-ordered F3-WP1 through F3-WP5
  decomposition was accepted in G0. On 2026-07-21 Preston recorded E1 `PASS`
  at exact head `357737d2c695098ac47db3efdab4470e1cb0a202` and directed the team to
  continue through the approved product roadmap without repetitive prompts.
- Completed packages: F3-WP1 through F3-WP4 are accepted. F3-WP4 correction
  PR #93 exact head `837e00402f665e7a1caa5c92d05991c205fea736` is integrated
  at `product/v1@d5207bd7410d1388b3e1797fb0a98f04e680f6d1`.
- Current authorization: only F3-WP5 through issue #95 after the matching
  status transition and higher Kimi inbox version are published.
- Exact implementation base: `272812f25fa0f4f794edfb69426028349900382e`
- Required F3-WP5 branch:
  `agent/kimi-f3-wp5-responsive-accessibility-evidence`
- F4 remains blocked until the complete F3 milestone passes exact-head review,
  ChatGPT Pro audit, and Preston acceptance.
- Backend product work remains blocked until the complete F6 Frontend Gate is
  accepted.

## Objective and milestone invariant

Provide understandable scoped manual direction plus the truthful
creator-facing AI Director shell that later consumes the proven E1 event and
proposal model.

Direct, Visual, Motion, and AI proposal interactions must have explicit
episode, sequence, scene, beat, or range scope. Every visible action must be
real local state or clearly labelled demo/unavailable state. Committed edits
must be undoable without leaking into unrelated work.

## Dependency-ordered work packages

### F3-WP1 - Scope and workspace foundation

**Primary invariant:** the selected beat is one real shared workspace scope;
the rail, board, permanent scope header, and Director tabs all agree.

**Tasks**

- make selected beat real and synchronize rail, board, and Director;
- add Direct, Visual, and Motion tabs plus a permanent scope header;
- select the first beat whenever the selected scene changes; and
- replace stale F2/WP2 Preview wording while retaining accepted navigation.

**Non-goals:** edit fields, undo, AI, persistence, media, assets, audio,
rendering, runtime contracts, or backend work.

**Targeted verification and completion:** selection/tab tests, retained F2
navigation tests, Studio typecheck/build, root verification, two actual
1440x900 beat-scope screenshots, zero console/page errors, and an exact pushed
handback. Stop before F3-WP2.

### F3-WP2 - Direct edits and scoped history

**Primary invariant:** Direct edits commit to only the selected beat and are
reversibly isolated from every other beat and scene.

**Tasks**

- add bounded beat-purpose, performance-direction, and continuity-note drafts;
- add real Apply plus per-beat committed state; and
- add Undo/Redo, redo invalidation, and honest session-local boundary wording.

**Non-goals:** AI interpretation, global undo, saved projects, timing,
Visual/Motion fields, or production schemas.

**Targeted verification and completion:** draft/apply/undo/redo tests,
independent histories across two beats and scenes, before/apply/undo
screenshots, root verification, and exact pushed handback. Stop before F3-WP3.

### F3-WP3 - Visual and Motion edits

**Primary invariant:** every Visual or Motion control produces observable,
scoped local state through the same accepted history without claiming runtime
animation.

**Tasks**

- add framing, composition focus, camera intent, performance pace, and end-hold
  controls;
- commit them through the same scoped history; and
- show an honest selected-direction overlay or summary on the reference board.

**Non-goals:** generated imagery, canvas effects, keyframes, real camera moves,
playback, timeline, assets, or audio.

**Targeted verification and completion:** observable-state tests for every
control, cross-panel history/scope tests, Direct/Visual/Motion screenshots,
truthful no-render wording, root verification, and exact pushed handback. Stop
before F3-WP4.

### F3-WP4 - AI Director conversation and proposal shell

**Primary invariant:** the creator can understand and reverse a clearly scoped
AI proposal through truthful E1-derived fixture states, with no live AI or
production mutation claim.

**Tasks**

- present exactly **Paste a script** and **What's your idea?** in New Project;
- route both paths to the same editable proposal review before project creation;
- add the normal AI Director panel, compact connection sheet, status chip, and
  Settings entry using explicit E1-derived connection/auth/usage fixtures;
- show persistent thread, explicit scope/context, streamed progress/tool
  activity, structured hierarchy/direction proposals, affected range/assets,
  time anchors, Preview, Apply, Revise, Reject, and Undo as bounded local demo
  behavior; and
- follow `design/ai-copilot-studio/README.md` and its accepted concept board.

**Non-goals:** live Codex connection, API keys, terminal-first UI, real project
mutation, image generation, rendering, or background autonomy.

**Targeted verification and completion:** labelled connected, signed-out,
offline, limited, error, and cancelled fixtures; bounded proposal-action tests;
one understandable reversible proposed change; responsive screenshots; root
verification; and exact pushed handback. Stop before F3-WP5.

**Accepted evidence:** correction PR #93 exact head `837e004...`, hosted Verify
run `29888901074`, Studio 123/123, complete workspace checks, independent Sol
code/governance and Terra visual/evidence audits, and product merge
`d5207bd...`. F3-WP5 remains separately blocked.

### F3-WP5 - Responsive, accessibility, and evidence gate

**Primary invariant:** the complete F3 creator journey is usable by keyboard and
at supported viewport sizes, and its evidence truthfully matches the accepted
Product v1 references.

**Tasks**

- complete keyboard/focus flow, compact layout, live-region semantics, and
  reduced-motion behavior;
- capture exact screenshots and click-through evidence at 1920x1080, 1440x900,
  and 1024x800; and
- compare the real Product v1 surfaces against the accepted Create, Studio, and
  AI-copilot references.

**Non-goals:** F4 assets, live AI, persistence, media, or backend work.

**Targeted verification and completion:** Studio tests, typecheck/build, root
verification, responsive browser audit, zero console/page errors, exact pushed
handback, ChatGPT Pro milestone audit, and Preston acceptance.

## Milestone gate

Preston can manually edit and undo scoped direction, review a clearly scoped AI
proposal through the truthful local demo, and understand what would change
without state leakage or false production claims. Passing F3 does not authorize
F4 until its separate ticket/status transition, and no backend product work may
start before the accepted F6 Frontend Gate.
