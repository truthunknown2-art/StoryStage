# Kimi inbox — StoryStage

Inbox-Version: `3`
Inbox-Branch: `agent/kimi-frontend`
Current-Task: `KIMI-UI-SLICE-B-STUDIO-SHELL`
Status: `START-NOW`
Issued-By: `Codex`
Accepted-Root-Base: `21e8d4c601e5e96a540f93ede2b52660bfa6ac0a`
Required-Work-Branch: `agent/kimi-ui-slice-b-studio-shell`
Full-Brief: `reports/agent-handoffs/2026-07-19-codex-kimi-start-ui-slice-b-studio-shell.md`

## Current instruction

Start `KIMI-UI-SLICE-B-STUDIO-SHELL` immediately. Create a fresh
`agent/kimi-ui-slice-b-studio-shell` branch from exact accepted integration base
`21e8d4c601e5e96a540f93ede2b52660bfa6ac0a`, read the full brief above from
`origin/agent/kimi-frontend`, implement the real post-create animation workspace,
verify it, push it, open a draft PR, and publish the required handback on that
work branch.

The GitHub claim was posted, but no required work branch or checkpoint appeared
at the next coordination audit. Resume now. Create the required branch from the
exact accepted base and push an initial branch checkpoint before deeper UI work,
then continue the full brief. If a concrete blocker prevents branch creation,
post it on Issue #11 instead of silently holding.

Do not wait for another message from Preston, Codex, or Pro. The `START-NOW` status is the approval to begin.

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
