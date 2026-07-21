---
statusSchemaVersion: 1
productBranch: product/v1
lastAcceptedProductHead: ddddcf1e9281da808c925a06bf25fd52ee43fa66
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
  package: E1-WP1
  owner: Codex
  exactBase: 4ec99ebb33f274625e8e1fe0f1b401d9c0169fad
  branch: agent/codex-e1-wp1-runtime-preflight
  issue: 53
  pr: null
  candidateContentHead: 4ec99ebb33f274625e8e1fe0f1b401d9c0169fad
  candidateRef: product/v1
checks:
  local: roadmap-consistency+root-verify-pass
  hostedSource: github-pr-checks
  hostedTarget: live-pr-head
verdicts:
  codex: issued-e1-wp1-only-at-exact-base-4ec99ebb33f274625e8e1fe0f1b401d9c0169fad
  pro: accept-exact-2e1fbb0791a9e205d71f7bfaf00d55894dab5475
  preston: accept-g0-authorize-e1-wp1-only-2026-07-20
blockers:
  - E1-WP2, E1-WP3, E1-WP4, F3, backend, and Kimi implementation remain unauthorized
nextAuthorizedAction:
  type: IMPLEMENT_E1_WP1_ONLY
  text: Execute only issue 53 from the exact base and stop before E1-WP2.
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

- Accepted product implementation state still ends at F2 on exact
  `87c01f9b...`; G0 is the accepted planning/governance milestone integrated at
  `ddddcf1...` and does not itself implement product capability.
- On 2026-07-20 Preston explicitly accepted G0 and authorized only the
  dependency-ordered E1-WP1 feasibility package. Issue #53 now bounds that
  package at exact base `4ec99eb...`; `START_NOW` authorizes Codex to implement
  only the isolated runtime/protocol/auth preflight. E1-WP2, F3, backend product
  work, and Kimi implementation remain unauthorized.
- ChatGPT Pro advised the amendment: Codex App Server + official ChatGPT sign-in
  + read-only StoryStage MCP feasibility before F3, then a native AI Director
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
