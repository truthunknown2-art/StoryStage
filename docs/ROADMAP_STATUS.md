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
  state: PRO_GATE
  milestone: G0
  package: G0-WP7
  owner: Pro
  exactBase: b648ff0c6224d25461aea648fd6337bec96334d2
  branch: agent/codex-g0-ai-native-bridge
  issue: null
  pr: 50
  candidateContentHead: 79e108831887daeae319b779276e4bbcafee250e
  candidateRef: agent/codex-g0-ai-native-bridge
checks:
  local: roadmap-consistency+root-verify-pass
  hostedSource: github-pr-checks
  hostedTarget: live-pr-head
verdicts:
  codex: final-pro-corrections-complete-at-79e108831887daeae319b779276e4bbcafee250e
  pro: corrections-required-on-ce839780-successor-awaiting-exact-head-reaudit
  preston: null
blockers:
  - AI-native, one-template launch-scope, and complete-shot engine amendments require hosted verification, Pro exact-SHA audit, and Preston acceptance
nextAuthorizedAction:
  type: PRO_AUDIT_ONLY
  text: After hosted verification passes, Pro audits exact PR 50 head; do not start E1, F3, or backend implementation.
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
  later `product/v1` commits through `b648ff0c...` contain only the accepted G0
  roadmap/status lineage.
- G0 is planning/documentation only. The user requested an AI-native amendment
  before accepting the gate. No E1, F3, or backend product work is authorized.
- ChatGPT Pro advised the amendment: Codex App Server + official ChatGPT sign-in
  + read-only StoryStage MCP feasibility before F3, then a native AI Director
  and deterministic proposal/application path. Pro also required complete visual
  Godot shots plus Remotion episode assembly and a retained UI reference packet.
  Preston further fixed the private-launch UI to one **Ollo & Friends — Kids
  Story** template with **Paste a script** and **What's your idea?** entry paths.
  Pro's audit of `ce839780...` found four bounded cross-document contradictions.
  Their docs-only correction candidate is `79e1088...` in draft PR #50;
  exact-head verification and re-audit are pending.
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
