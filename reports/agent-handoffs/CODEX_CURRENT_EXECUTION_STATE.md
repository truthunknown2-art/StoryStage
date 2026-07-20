# StoryStage — current Codex execution state

Updated: 2026-07-20 01:35 America/Vancouver

This file is a restart pointer, not a product specification. GitHub branches,
pull requests, issues, hosted checks, and exact remote SHAs remain authoritative.

## Governing product state

- Repository: `truthunknown2-art/StoryStage`
- Governing branch: `product/v1`
- Governing SHA: `9f6cef48a031fb09f1a0539652fbed4274f5ff9b`
- Binding plan: `docs/PRODUCT_PLAN.md`
- Plan PR: `https://github.com/truthunknown2-art/StoryStage/pull/32`
- Plan verification: hosted `verify` passed at the governing SHA
- Active product phase: **F1 — Projects + Create**
- F2 and backend B1+ are not authorized to start

## F1 frontend gate

- Owner: Kimi CLI
- Required branch: `agent/kimi-ui-v2`
- Rejected candidate: `00299eb351f24a1cf1be5b34cb08f6c77c039af5`
- Draft PR: `https://github.com/truthunknown2-art/StoryStage/pull/33`
- Task/claim issue: `https://github.com/truthunknown2-art/StoryStage/issues/34`
- Canonical inbox version: `33`
- Correction brief:
  `reports/agent-handoffs/2026-07-20-codex-kimi-f1-acceptance-corrections-v33.md`

The exact rejected candidate reused stale screenshots, left the 1440×900
Language control covered by the sticky footer, retained required small-text
contrast near 2.90:1, removed the preserved `LegacyApp` implementation, and
reported 39 deterministic legacy-suite failures. Inbox v33 authorizes only the
bounded F1 corrections. Do not advance F2 until the immutable successor is
green and accepted.

Kimi claimed issue #34 after the 01:04 scheduler wake. At the 01:34 scheduled
check, no successor had been pushed; the remote work branch remained at the
rejected `00299eb` candidate. Do not inspect or interfere with Kimi's live local
worktree. The next scheduled remote check is approximately 01:49.

## Pro audit

ChatGPT Pro rejected the former roadmap SHA `e759c54` for three narrow E0
governance defects. Codex corrected only those defects and pushed successor
`9f6cef48a031fb09f1a0539652fbed4274f5ff9b`. Repository-root `pnpm verify` and
hosted `verify` passed. Pro then **ACCEPTED** that exact successor, confirmed
all three blockers resolved with no scope expansion, and kept F1 active under
Kimi while B1/B2 remain unauthorized. The exact verdict is recorded on PR #32.

## E0 engine feasibility proof

- Authorized by the governing plan as an isolated, nonshipping experiment
- Branch/worktree: `agent/godot-remotion-spike-v1` /
  `C:\Projects\StoryStage-godot-spike`
- Scope: pinned stable Godot Skeleton2D/Bone2D four-second transparent sequence,
  repeated determinism proof, then isolated Remotion composite/render/evidence
- Draft PR: `https://github.com/truthunknown2-art/StoryStage/pull/35`
- Current exact head: `b85075048e5890e52f37a0b56ffb94e9be8faf3f`
- Status: two fresh 120-frame renders use a real transparent `SubViewport` and
  match with zero raw-byte mismatches; every frame decodes as 1920×1080 RGBA8;
  the exact Remotion MP4/still verifier and full repository `pnpm verify` pass
- The corrected evidence branch now includes accepted roadmap parent
  `9f6cef48`; repository-root and hosted `verify` pass at the exact integrated
  head. Final E0 closure still waits for Pro's separate exact-head evidence
  audit
- This proof cannot advance or satisfy B1/B2 and must not alter product code

## Restart procedure

1. Read `C:\Projects\AGENTS.md` and the repository `AGENTS.md`.
2. Fetch all relevant branches without rewriting worktrees.
3. Read canonical `KIMI_INBOX.md`, its full brief, issue #34, and PR #33.
4. Inspect Kimi's exact remote successor and hosted checks; never review only
   local work.
5. Inspect Pro's latest StoryStage response and record an exact-SHA verdict on
   GitHub.
6. Inspect the E0 branch/PR and evidence when it appears.
7. Continue only the first unblocked gate. Do not start F2 or backend work while
   F1 is unaccepted.
