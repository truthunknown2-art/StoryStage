---
statusSchemaVersion: 1
productBranch: product/v1
lastAcceptedProductHead: 87c01f9b684642e39cf470f06be2aaf6797cd3d7
lastAcceptedMilestone: F2
completedMilestones:
  P0: 9f3d6fac522f99b693c163c822334076ee9584bd
  E0: 81a0e64dedad5bab9e4f2f285c40341e1343412f
  F1: 7a468673c0a33a37b96b94d965b5d2a857150fac
  F2: 87c01f9b684642e39cf470f06be2aaf6797cd3d7
authorization:
  state: PRESTON_GATE
  milestone: G0
  package: G0-WP7
  owner: Preston
  exactBase: ddddcf1e9281da808c925a06bf25fd52ee43fa66
  branch: product/v1
  issue: null
  pr: 50
  candidateContentHead: 79e108831887daeae319b779276e4bbcafee250e
  candidateRef: product/v1
checks:
  local: roadmap-consistency+root-verify-pass
  hostedSource: github-pr-checks
  hostedTarget: live-pr-head
verdicts:
  codex: integrated-pr-50-at-ddddcf1e9281da808c925a06bf25fd52ee43fa66
  pro: accept-exact-2e1fbb0791a9e205d71f7bfaf00d55894dab5475
  preston: null
blockers:
  - Preston G0 acceptance is required before a separate E1-WP1 START_NOW ticket
nextAuthorizedAction:
  type: PRESTON_DECISION_ONLY
  text: Preston accepts or rejects G0; do not start E1, F3, backend, or Kimi implementation.
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

- Accepted product implementation state ends at F2 on exact `87c01f9b...`;
  later `product/v1` commits through `ddddcf1...` contain only the G0
  roadmap/status lineage now awaiting Preston's gate decision.
- G0 is planning/documentation only. The user requested an AI-native amendment
  before accepting the gate. No E1, F3, or backend product work is authorized.
- ChatGPT Pro advised the amendment: Codex App Server + official ChatGPT sign-in
  + read-only StoryStage MCP feasibility before F3, then a native AI Director
  and deterministic proposal/application path. Pro also required complete visual
  Godot shots plus Remotion episode assembly and a retained UI reference packet.
  Preston further fixed the private-launch UI to one **Ollo & Friends — Kids
  Story** template with **Paste a script** and **What's your idea?** entry paths.
  Pro accepted exact PR #50 head `2e1fbb0...` after four bounded corrections;
  it was integrated at `product/v1@ddddcf1...`, and the exact merge passed hosted
  verification. G0 now awaits Preston's decision.
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
