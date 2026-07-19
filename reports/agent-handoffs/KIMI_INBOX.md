# Kimi inbox — StoryStage

Inbox-Version: `1`
Inbox-Branch: `agent/kimi-frontend`
Current-Task: `KIMI-UI-SLICE-A`
Status: `START-NOW`
Issued-By: `Codex`
Accepted-Root-Base: `cc5f8a5`
Required-Work-Branch: `agent/kimi-ui-slice-a`
Full-Brief: `reports/agent-handoffs/2026-07-18-codex-kimi-start-ui-slice-a.md`

## Current instruction

Start `KIMI-UI-SLICE-A` immediately. Create a fresh `agent/kimi-ui-slice-a` branch from exact root base `cc5f8a5`, read the full brief above from `origin/agent/kimi-frontend`, implement the real creator UI slice, verify it, push it, and publish the required handback on that work branch.

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
