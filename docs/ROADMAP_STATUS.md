---
statusSchemaVersion: 1
productBranch: product/v1
lastAcceptedProductHead: d5207bd7410d1388b3e1797fb0a98f04e680f6d1
lastAcceptedMilestone: E1
completedMilestones:
  P0: 9f3d6fac522f99b693c163c822334076ee9584bd
  E0: 81a0e64dedad5bab9e4f2f285c40341e1343412f
  F1: 7a468673c0a33a37b96b94d965b5d2a857150fac
  F2: 87c01f9b684642e39cf470f06be2aaf6797cd3d7
  G0: ddddcf1e9281da808c925a06bf25fd52ee43fa66
  E1: 38969c4400e2a9c84a59346c28f7a72d5f9492bf
authorization:
  state: START_NOW
  milestone: F3
  package: F3-WP5
  owner: Kimi
  exactBase: 272812f25fa0f4f794edfb69426028349900382e
  branch: agent/kimi-f3-wp5-responsive-accessibility-evidence
  issue: 95
  pr: null
  candidateContentHead: 272812f25fa0f4f794edfb69426028349900382e
  candidateRef: product/v1
checks:
  local: roadmap-consistency+format-check
  hostedSource: github-pr-checks
  hostedTarget: live-pr-head
verdicts:
  codex: accept-f3-wp4-exact-837e00402f665e7a1caa5c92d05991c205fea736-hosted-29888901074-pass
  pro: accept-complete-e1-wp4-exact-357737d2c695098ac47db3efdab4470e1cb0a202-no-blockers
  preston: pass-e1-exact-357737d2c695098ac47db3efdab4470e1cb0a202-and-continue-dependency-ordered-roadmap-2026-07-21
blockers:
  - F4 remains blocked until the complete F3 milestone passes exact-head review and Preston acceptance
  - backend product work remains blocked until Preston accepts the complete F6 Frontend Gate
nextAuthorizedAction:
  type: IMPLEMENT_F3_WP5_ONLY
  text: Implement only issue #95 from exact base 272812f25fa0f4f794edfb69426028349900382e on agent/kimi-f3-wp5-responsive-accessibility-evidence, publish the exact handback, and stop before F4.
superseded:
  - pr: 47
    reason: superseded by the full implementation-to-private-launch roadmap
---

# StoryStage roadmap status

This is the only live execution ledger in the product branch. It selects one
package from [`PRODUCT_ROADMAP.md`](PRODUCT_ROADMAP.md); it cannot expand or
reorder that roadmap. [`PRODUCT_PLAN.md`](PRODUCT_PLAN.md) remains the stable
product and architecture charter.

`lastAcceptedProductHead` is the last accepted product-content/evidence merge,
not a status-only bookkeeping commit. A status update never becomes an
implementation base merely because it is newer.

`candidateContentHead` identifies the immutable commit containing the roadmap
content under review. It is intentionally not the SHA of this status file's own
commit. Resolve the exact audit head from the current remote `candidateRef` and
PR, verify that `candidateContentHead` is its ancestor, and resolve hosted
verification from the live PR checks.

## Current state

- E1 is accepted. PR #71 exact head `357737d...`, hosted run `29854783518`,
  three independent audits, and ChatGPT Pro passed. Preston recorded `PASS`
  against that exact head, and PR #71 merged into `product/v1` at
  `38969c4...`. E1 proves only the bounded local Codex App Server, official
  ChatGPT sign-in, least-privilege StoryStage MCP, structured proposal, and
  fail-closed/no-mutation feasibility boundary; it is not production Studio
  integration.
- F3-WP1 is accepted and integrated at exact `product/v1@a4486ce...`. Kimi
  completed issue #72; Codex applied only the bounded review corrections for
  tab semantics and evidence truth, then exact PR #78 head `208ceca...`
  passed Studio 76/76, typecheck, build, repository-root verification,
  screenshots/hashes, independent exact-head and delta audits, and hosted run
  `29866064607` attempt 2. The package provides one shared beat scope across
  the rail, board, permanent scope header, and accessible Direct/Visual/Motion
  workspace tabs. It does not provide direction editing, AI proposals,
  persistence, media, rendering, or export.
- F3-WP2 is accepted and integrated at exact `product/v1@dcf9b7e...`. Kimi
  completed issue #81; Codex applied only the bounded review correction that
  removed contradictory Motion-tab copy, then exact PR #83 successor head
  `53d0d6a...` passed Studio 90/90, typecheck, production build, the clean
  synthetic merge and roadmap check, independent exact-head code and visual
  audits, three hash-matched 1440x900 screenshots with 18/18 browser checks,
  and hosted Verify run `29872261103`. The package provides session-local
  Direct drafts with atomic per-beat Apply and isolated Undo/Redo history. It
  does not provide AI interpretation, persistence, Visual/Motion editing,
  production schemas, media, rendering, or export.
- F3-WP3 is accepted and integrated at exact `product/v1@24c7a95...`. Kimi
  completed issue #85 from exact base `fe00423...`; exact PR #87 handback tip
  `1579ee1...` passed Studio 100/100, typecheck, production build, the complete
  recursive workspace suite, the clean synthetic merge, independent Sol
  code/history and Terra visual/evidence audits, three hash-matched 1440x900
  screenshots with 30/30 browser checks and zero console/page errors, and
  hosted Verify run `29877591185`. The package adds bounded session-local
  Visual and Motion intent controls to the same atomic per-beat history as
  Direct and exposes only committed direction through an honest planning
  summary. It does not provide AI interpretation, persistence, production
  schemas, media, animation, executable camera moves, Godot, Remotion,
  rendering, or export.
- F3-WP4 is accepted and integrated at exact `product/v1@d5207bd...`. Codex
  rejected predecessor PR #91, then correction PR #93 exact successor
  `837e004...` passed Studio 123/123, typecheck, production build, the complete
  recursive workspace suite, Sol code/history and governance audits, Terra
  visual/evidence audit, four hash-matched 1440x900 correction screenshots,
  explicit zero console/page-error evidence, and hosted Verify run
  `29888901074`. The package provides the exact two-path New Project entry,
  shared editable local proposal review, and labelled local-fixture AI Director
  conversation/proposal shell with fail-closed Apply/Undo state. It does not
  connect live AI, persist review edits, create script-specific production
  plans or media, animate, render, or export.
- On 2026-07-21 the separate issue #95 and this `START_NOW` transition
  authorize only F3-WP5 from exact base
  `product/v1@272812f25fa0f4f794edfb69426028349900382e` on required branch
  `agent/kimi-f3-wp5-responsive-accessibility-evidence`. The package closes
  keyboard/focus, accessibility, reduced-motion, three-viewport responsive,
  reference-comparison, and exact evidence requirements for the complete F3
  milestone candidate. It does not accept F3, start F4, connect live AI,
  persist projects, or authorize backend, Godot, Remotion, rendering, export,
  packaging, or private-launch work.

- Accepted creator-facing product implementation now reaches F3-WP4 on exact
  `d5207bd...`; the complete F3 milestone is not yet accepted. G0 is the
  accepted planning/governance milestone integrated at `ddddcf1...` and does
  not itself implement product capability.
- E1-WP1 is accepted and integrated at exact `product/v1@ed457ea...`. ChatGPT
  Pro accepted exact PR #55 head `8b74d64...`, hosted Verify StoryStage run
  `29798603209` passed, and the immutable runtime/evidence content is
  `dcd75cf...`. The real Windows receipt confirms the pinned App Server can
  observe the signed-in ChatGPT account/model/rate/usage state, run an isolated
  read-only ephemeral turn, verify matching interrupted completion, preserve
  the workspace, redact private state, and shut down cleanly. This accepts only
  E1-WP1, not the complete E1 milestone.
- E1-WP2 is accepted and integrated at exact `product/v1@ec050cc...`. ChatGPT
  Pro accepted exact PR #59 head `e8fcaa7...`, hosted Verify StoryStage run
  `29803474883` passed, and independent exact-head scope and security audits
  accepted the package. The fixed synthetic Ollo scene is raw-byte hash-pinned,
  path-contained, and read only; the MCP surface exposes one immutable resource
  plus exactly two bounded read-only tools, and every proposal receipt remains
  explicitly unapplied, unpersisted, and non-canonical. The fail-closed JSONL
  transport, strict schemas, cancellation/deadline behavior, and 40 focused
  tests accept only E1-WP2, not the complete E1 milestone.
- On 2026-07-20 Preston explicitly authorized only E1-WP3 at exact base
  `product/v1@4319967eac13dd628eb863dfb29f7bff3c83ffeb`. Issue #62 and this
  `START_NOW` transition authorize the streamed structured-proposal round trip
  and isolated read-only review surface.
- On 2026-07-21 Preston amended E1-WP3 to permit one tested internal
  compatibility adapter over the redacted human `codex mcp list` name table,
  with fail-closed verification and no credential access. The exception does
  not permit JSON inventory, credential-bearing fields, arbitrary terminal
  interpretation, or terminal UI. Preston also granted standing authority to
  continue through dependency-ordered bounded packages while away, but no
  package may start before its predecessors and exact-SHA gates pass.
- The authorized table adapter failed its own no-credential-access condition
  before implementation. Pinned 0.144.1 masks environment/header values but
  prints stdio Command and Args plus HTTP URL/query values verbatim. Synthetic
  sentinels proved those columns can contain credential material, and the CLI
  exposes no names/status-only projection. StoryStage therefore cannot capture,
  stream, proxy, or parse that table without becoming credential-bearing.
- Under Preston's standing continuation authority, Codex selected the narrowest
  clean successor for Pro review: a dedicated Codex-owned state root containing
  no inherited user `config.toml`; only `storystage_e1` is supplied on the App
  Server command line. The App Server's official `account/login/start` ChatGPT
  browser flow owns authentication and persistence inside that dedicated state
  root. StoryStage may observe typed auth state and open the returned URL, but
  must never read, copy, link, log, back up, or migrate Codex credential files.
- ChatGPT Pro accepted that architecture at exact
  `07d2ccf735edc11b6a8de129bd478a986551aa9a`, subject to removing the obsolete
  human-table exception from the milestone and obtaining hosted PASS on the
  corrected exact head. Pro requires a fixed non-roaming local state root,
  inherited `CODEX_HOME` removal, typed ChatGPT login only, zero credential-file
  reads, exact auth URL/correlation checks, double exact-one MCP verification,
  and an absolute no-prompt-before-proof rule.
- The required milestone correction is exact
  `1c43708f15afb8bb237352e47d6c418d5293378e`; hosted Verify StoryStage run
  `29811567145` passed that exact head. Pro's prerequisites are therefore met
  and E1-WP3 may return to implementation. This does not accept the package or
  start E1-WP4.
- E1-WP3 previously blocked on PR #64. Final Sol-high audit and ChatGPT Pro found that
  pinned Codex 0.144.1 `mcp list --json` returns raw configured MCP environment
  and header values. StoryStage used that structured output only to discover
  inherited server names, but receiving the full payload still crossed E1's
  credential boundary. Empty-table/profile overrides merge instead of replace;
  an isolated `CODEX_HOME` loses ChatGPT auth; credential copying/linking and
  redacted terminal-table parsing was outside the then-accepted constraints. Content
  `b134cc62bda0055a857cf82b5a48ba57dd2ebc14` removes the unsafe path, fails
  before App Server launch, invalidates the prior isolation claim, and replaces
  the lab capture with the truthful blocked state. E1-WP3 remains unaccepted
  while Pro reviews the dedicated-state-root successor and until that successor
  passes official login, live isolation, and exact-SHA review.
- E1-WP3 is accepted and integrated at exact `product/v1@ac2357d...`.
  ChatGPT Pro accepted exact PR #64 head `681eeb4...`, hosted Verify StoryStage
  run `29839630770` passed, and independent security and protocol audits found
  no P1/P2 blocker. The official authenticated round trip proved exactly one
  fixed StoryStage MCP globally and thread-scoped before prompting, exactly one
  `get_scene_context` call followed by exactly one
  `submit_direction_proposal` call, one validated ephemeral proposal, no
  inherited server, and no project/render/saved-state mutation. The 1440x900
  review surface truthfully keeps Apply disabled. This accepts only E1-WP3;
  the complete E1 milestone remains incomplete, E1-WP4 requires its own
  `START_NOW` transition, and Kimi remains `WAIT`.
- On 2026-07-21 the separate issue #69 and this `START_NOW` transition
  authorize only E1-WP4 from exact base
  `product/v1@8d9a47a4898df81db7630e2f0b7d4eecc88f7157`. The package closes the
  negative-state, security-boundary, feasibility, distribution-question, and
  productization-delta evidence gate. It does not accept E1, start F3 or
  backend product work, or wake Kimi.
- ChatGPT Pro advised the amendment: Codex App Server + official ChatGPT sign-in
  - read-only StoryStage MCP feasibility before F3, then a native AI Director
    and deterministic proposal/application path. Pro also required complete visual
    Godot shots plus Remotion episode assembly and a retained UI reference packet.
    Preston further fixed the private-launch UI to one **Ollo & Friends — Kids
    Story** template with **Paste a script** and **What's your idea?** entry paths.
    Pro accepted exact PR #50 head `2e1fbb0...` after four bounded corrections;
    it was integrated at `product/v1@ddddcf1...`, the exact merge passed hosted
    verification, and Preston has now accepted the G0 gate.
- Kimi must remain `WAIT`; resolve its exact live inbox version and coordination
  head from `origin/agent/kimi-frontend` on every cold start and consistency run.
- PR #47 is closed, unmerged, and superseded; it grants no F3 authority.

## Allowed transitions

```text
WAIT -> START_NOW -> IMPLEMENTING -> REVIEW -> PRO_GATE -> PRESTON_GATE
     -> ACCEPTED_WAIT

failed gate -> IMPLEMENTING on the same package
```

The next package requires a deliberate status update. Acceptance of one package
does not silently start another.
