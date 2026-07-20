# StoryStage — current Codex execution state

Updated: 2026-07-20 10:52 America/Vancouver

This file is a restart pointer, not a product specification. GitHub branches,
pull requests, issues, hosted checks, and exact remote SHAs remain authoritative.

## Governing product state

- Repository: `truthunknown2-art/StoryStage`
- Governing branch: `product/v1`
- Governing SHA: `1982407c201d68ce78c98a5f530cda348a15c8ed`
- Binding plan: `docs/PRODUCT_PLAN.md`
- F2 package plan: `docs/plans/milestone-2.md`
- F2 plan PRs: `#36`, `#37`
- Active product phase: **F2 — Long-form Studio shell**
- Backend B1+ is not authorized to start

## Completed F1 frontend gate

- Owner: Kimi CLI
- Required branch: `agent/kimi-ui-v2`
- Audited Kimi handback: `1a90a0b2dee5f18fd36e51a1bab6424cffd6382a`
- Exact combined gate head: `7517d8e93af12938b3095da915614e15f3bece9c`
- Merged PR: `https://github.com/truthunknown2-art/StoryStage/pull/33`
- Closed issue: `https://github.com/truthunknown2-art/StoryStage/issues/34`
- Product merge: `7a468673c0a33a37b96b94d965b5d2a857150fac`

Kimi's bounded v33 correction is complete. Codex independently verified all 58
Studio tests, root `pnpm verify`, screenshot hashes, five captures, contrast,
and exact 1024×800 responsive behavior. The unchanged hosted rerun passed. Codex
then merged the current accepted `product/v1` lineage into the candidate. Root
`pnpm verify` and hosted run `29731549778` passed at exact head `7517d8e9`.
Pro accepted F1 with no blocking defects. Preston resumed the project and
accepted continuation from the F1 gate. Exact reviewed F1 head `7517d8e9`
merged into `product/v1` as `7a468673`.

## Completed F2-WP1 package

- Accepted head: `220d7f5d6c39c62309e449d8a7c57dd86c3f36b0`
- Merged PR: `https://github.com/truthunknown2-art/StoryStage/pull/39`
- Product merge: `1ab5f4338e7fc8cd4d8674429e67bd16582b23c4`
- Director-plan merge after WP1: `1982407c201d68ce78c98a5f530cda348a15c8ed`
- Local root `pnpm verify`: passed at exact combined product head
- Hosted integration run: `29761209150` passed at exact combined product head

## Accepted F2-WP2 package — integration pending

- Package: **F2-WP2 — Long-form navigation and bounded rendering**
- Owner: Kimi CLI
- Required branch: `agent/kimi-f2-longform-navigation-wp2`
- Exact base: `1982407c201d68ce78c98a5f530cda348a15c8ed`
- Issue: `https://github.com/truthunknown2-art/StoryStage/issues/41`
- Rejected predecessor: `5eb684ebcbf62886a5371311cf8226a48220df0a`
- Accepted correction: `420b4bd6c180e17c6e4c9bd371528e6792eb3ffd`
- Accepted exact head: `ee900201d40aca2e38e559e19b40e9ec2b6282f0`
- Draft PR: `https://github.com/truthunknown2-art/StoryStage/pull/42`
- Canonical inbox: version `43` (`WAIT`)
- Full brief:
  `reports/agent-handoffs/2026-07-20-codex-kimi-f2-wp2-accepted-v43.md`

Codex accepted the hierarchy collapse/reveal, scene/playhead synchronization,
truthful controls, scope, recaptured screenshots, 69/69 Studio tests,
typecheck, build, and hosted run `29764722843`. The v42 blocker is resolved:
each two-beat scene now renders exactly two beat rows, only in the hierarchy
rail, and every row belongs to the selected scene. PR #42 remains draft and
unmerged. Kimi is on `WAIT`; WP3, F3, and backend work remain blocked.

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
3. Read canonical `KIMI_INBOX.md`, its full brief, issue #41, and the active
   F2-WP2 PR if Kimi has opened it.
4. Inspect exact remote heads and hosted checks; never review local-only work.
5. Inspect Pro's latest StoryStage response and record each exact-SHA verdict on
   GitHub.
6. Continue only F2-WP2 assignment/review/integration. Do not start WP3, F3, or
   backend work until their explicit gates advance.
