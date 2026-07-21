---
statusSchemaVersion: 1
productBranch: product/v1
lastAcceptedProductHead: ac2357d2e1419124d832fe26b67e26875f3821e8
lastAcceptedMilestone: G0
completedMilestones:
  P0: 9f3d6fac522f99b693c163c822334076ee9584bd
  E0: 81a0e64dedad5bab9e4f2f285c40341e1343412f
  F1: 7a468673c0a33a37b96b94d965b5d2a857150fac
  F2: 87c01f9b684642e39cf470f06be2aaf6797cd3d7
  G0: ddddcf1e9281da808c925a06bf25fd52ee43fa66
authorization:
  state: START_NOW
  milestone: E1
  package: E1-WP4
  owner: Codex
  exactBase: 8d9a47a4898df81db7630e2f0b7d4eecc88f7157
  branch: agent/codex-e1-wp4-failure-security-gate
  issue: 69
  pr: null
  candidateContentHead: 8d9a47a4898df81db7630e2f0b7d4eecc88f7157
  candidateRef: product/v1
checks:
  local: roadmap-consistency+codex-lab-wp3-baseline-pass
  hostedSource: github-pr-checks
  hostedTarget: live-pr-head
verdicts:
  codex: issued-e1-wp4-only-at-exact-base-8d9a47a4898df81db7630e2f0b7d4eecc88f7157-through-issue-69
  pro: accept-complete-e1-wp3-exact-681eeb4d7c28405ead53cb8afc16a048c749c53d-no-blockers-safe-to-integrate
  preston: standing-dependency-ordered-continuation-after-e1-wp3-acceptance-2026-07-21
blockers:
  - Codex CLI labels app-server experimental; production packaging remains blocked pending the E1 milestone gate
  - F3, backend product work, and Kimi implementation remain blocked by their roadmap dependencies and the E1 milestone gate
nextAuthorizedAction:
  type: IMPLEMENT_E1_WP4_ONLY
  text: After this status transition is integrated, execute only issue 69 from the exact base and stop before F3 or any backend or Kimi implementation.
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

- Accepted creator-facing product implementation still ends at F2 on exact
  `87c01f9b...`; G0 is the accepted planning/governance milestone integrated at
  `ddddcf1...` and does not itself implement product capability.
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
