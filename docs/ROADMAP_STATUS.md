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
  package: G0-WP5
  owner: Preston
  exactBase: 87c01f9b684642e39cf470f06be2aaf6797cd3d7
  branch: agent/codex-full-product-roadmap
  issue: null
  pr: 48
  candidateContentHead: febc42ad94d716abf3893c59ce31389685ef87ae
  candidateRef: agent/codex-full-product-roadmap
checks:
  local: roadmap-consistency+root-verify-pass
  hostedSource: github-pr-checks
  hostedTarget: live-pr-head
verdicts:
  codex: review-complete-at-febc42ad94d716abf3893c59ce31389685ef87ae
  pro: accepted-at-febc42ad94d716abf3893c59ce31389685ef87ae
  preston: null
blockers:
  - G0 awaits Preston's phase decision before any F3 or backend package is assigned
nextAuthorizedAction:
  type: PHASE_DECISION_ONLY
  text: Preston decides G0; do not start F3 or backend implementation without a separate START_NOW assignment.
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

- Accepted product state ends at F2 on exact `87c01f9b...`.
- G0 is planning/documentation only. No F3 or backend product work is authorized.
- ChatGPT Pro accepted the corrected full launch roadmap, cold-start contract,
  and multi-shot governance at exact audit head `febc42ad...`; corrections
  remaining: none. PR #48 is merged into `product/v1` at `ebbbcbb3...`.
- Kimi must remain `WAIT`; resolve its exact live inbox version and coordination
  head from `origin/agent/kimi-frontend` on every cold start and consistency run.
- Kimi inbox v56 records the merged Pro acceptance and waits for Preston's G0
  decision; it does not authorize an implementation branch.
- PR #47 is closed, unmerged, and superseded; it grants no F3 authority.

## Allowed transitions

```text
WAIT -> START_NOW -> IMPLEMENTING -> REVIEW -> PRO_GATE -> PRESTON_GATE
     -> ACCEPTED_WAIT

failed gate -> IMPLEMENTING on the same package
```

The next package requires a deliberate status update. Acceptance of one package
does not silently start another.
