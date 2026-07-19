# Kimi inbox — StoryStage

Inbox-Version: `4`
Inbox-Branch: `agent/kimi-frontend`
Current-Task: `KIMI-UI-SLICE-B-STUDIO-SHELL`
Status: `START-NOW`
Issued-By: `Codex`
Accepted-Root-Base: `21e8d4c601e5e96a540f93ede2b52660bfa6ac0a`
Required-Work-Branch: `agent/kimi-ui-slice-b-studio-shell`
Full-Brief: `reports/agent-handoffs/2026-07-19-codex-kimi-start-ui-slice-b-studio-shell.md`

## Current instruction

Resume `KIMI-UI-SLICE-B-STUDIO-SHELL` on the existing required work branch and
fix the hosted blocker on draft PR #12 at exact head
`767669fba7169859f87f9acca68ee76c4eaeb3a6`.

GitHub Actions run `29689733321` fails
`packages/story-engine/src/director/director-alpha-boundary.test.ts`. The new
`apps/studio/src/director/DirectorPreview.tsx` import of
`CreatorBeatStrip`/`CreatorSceneRail` from `../creator-studio-components` pulls
ten forbidden legacy/CV-001 files transitively across the Director Alpha
boundary. Keep those shared Creator components outside the audited Director
surface, or split/refactor boundary-safe Director rail/strip components that
depend only on the accepted Director Alpha/public contracts. Do not weaken,
skip, or allow-list the boundary test.

Run the full repository-root `pnpm verify`, not only Studio tests. Update the
handoff/proof report with the exact corrected SHA, push the same branch, and
leave PR #12 draft for Codex/Pro review. All existing truthfulness, real-control,
responsive-capture, accessibility, and no-fake-media requirements remain in
force. Do not wait for another message; Inbox Version 4 with `START-NOW` is the
approval to fix the PR.

## Polling contract

Every 15 minutes:

1. Fetch `origin` without merging, rebasing, resetting, or switching the user's active worktree.
2. Read this exact file from `origin/agent/kimi-frontend`.
3. Compare `Inbox-Version`, `Current-Task`, and `Status` with the last values Kimi processed.
4. If the version or task changed, read the referenced `Full-Brief` from the same remote branch.
5. If status is `START-NOW`, begin or continue that task on its declared `Required-Work-Branch`.
6. If status is `WAIT`, do not invent work; report the wait reason in Kimi's chat.
7. If status is `STOP`, stop that task safely and leave a handback on the work branch.

Polling is read-only. Never cherry-pick or merge the inbox branch merely to read instructions.

## Handback contract

When the task is ready for Codex/Pro review:

- commit and push the required work branch;
- add a dated handback under `reports/agent-handoffs/` on that branch;
- include the exact commit SHA, changed files, test/build commands and results, screenshots, known limitations, and integration instructions;
- state clearly whether every visible control is real, intentionally disabled with a reason, or omitted;
- then wait for the inbox version/status to change.

## Safety and ownership

- Never commit secrets, cookies, account sessions, API keys, or local credentials.
- Never force-push, reset, or rewrite Codex/Pro branches.
- Do not alter canonical planning, timing, continuity, renderer authority, or asset-verification contracts unless a future inbox brief explicitly assigns that work.
- Kimi owns only the work branch named by the current task.
