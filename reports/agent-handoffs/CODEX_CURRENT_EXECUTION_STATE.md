# StoryStage — current Codex execution state

Updated: 2026-07-20 03:05 America/Vancouver

This file is a restart pointer, not a product specification. GitHub branches,
pull requests, issues, hosted checks, and exact remote SHAs remain authoritative.

## Governing product state

- Repository: `truthunknown2-art/StoryStage`
- Governing branch: `product/v1`
- Governing SHA: `81a0e64dedad5bab9e4f2f285c40341e1343412f`
- Binding plan: `docs/PRODUCT_PLAN.md`
- Plan PR: `https://github.com/truthunknown2-art/StoryStage/pull/32`
- Active product phase: **F1 — Projects + Create**
- F2 and backend B1+ are not authorized to start

## F1 frontend gate

- Owner: Kimi CLI
- Required branch: `agent/kimi-ui-v2`
- Audited Kimi handback: `1a90a0b2dee5f18fd36e51a1bab6424cffd6382a`
- Exact combined gate head: `7517d8e93af12938b3095da915614e15f3bece9c`
- Draft PR: `https://github.com/truthunknown2-art/StoryStage/pull/33`
- Task/claim issue: `https://github.com/truthunknown2-art/StoryStage/issues/34`
- Canonical inbox version: `37` (`WAIT`)
- Gate-wait brief:
  `reports/agent-handoffs/2026-07-20-codex-kimi-f1-preston-gate-wait-v37.md`

Kimi's bounded v33 correction is complete. Codex independently verified all 58
Studio tests, root `pnpm verify`, screenshot hashes, five captures, contrast,
and exact 1024×800 responsive behavior. The unchanged hosted rerun passed. Codex
then merged the current accepted `product/v1` lineage into the candidate. Root
`pnpm verify` and hosted run `29731549778` passed at exact head `7517d8e9`.
Pro accepted F1 with no blocking defects. Do not advance F2 until Preston
explicitly accepts F1.

## Pro audit

ChatGPT Pro accepted the governing roadmap at exact SHA
`9f6cef48a031fb09f1a0539652fbed4274f5ff9b`, with F1 active under Kimi and
B1/B2 unauthorized. Pro subsequently audited E0 exact head `b8507504` and
recorded **E0 PASS** with no blocking defects. Pro accepted F1 and authorized
presenting it to Preston; Pro's verdict does not authorize F2.

## E0 engine feasibility proof

- Authorized by the governing plan as an isolated, nonshipping experiment
- Accepted evidence head: `b85075048e5890e52f37a0b56ffb94e9be8faf3f`
- Merged PR: `https://github.com/truthunknown2-art/StoryStage/pull/35`
- Product integration merge: `81a0e64dedad5bab9e4f2f285c40341e1343412f`
- Status: **E0 PASS** — real transparent `SubViewport`, two matching 120-frame
  RGBA runs, exact Remotion consumption, MP4/stills, local and hosted checks
- This proof does not authorize B1/B2, accept Ollo assets, or accept final
  animation quality

## Restart procedure

1. Read `C:\Projects\AGENTS.md` and the repository `AGENTS.md`.
2. Fetch relevant branches without rewriting worktrees.
3. Read canonical `KIMI_INBOX.md`, its full brief, issue #34, and PR #33.
4. Inspect exact remote heads and hosted checks; never review local-only work.
5. Inspect Pro's latest StoryStage response and record each exact-SHA verdict on
   GitHub.
6. Continue only the first unblocked gate. Do not start F2 or backend work while
   F1 is unaccepted.
