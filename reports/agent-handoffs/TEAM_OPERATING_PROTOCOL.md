# StoryStage team operating protocol

This file is the durable coordination contract for Codex, ChatGPT Pro, and Kimi.
Chat history is context, not task state. GitHub is the source of truth.

## Canonical coordination locations

- Repository: `truthunknown2-art/StoryStage`
- Kimi scheduler inbox:
  `origin/agent/kimi-frontend:reports/agent-handoffs/KIMI_INBOX.md`
- Kimi task discussion and claim: the GitHub issue named by the current full brief
- Codex implementation status: the active branch, its pull request, and exact
  remote commit SHA
- Pro review status: the active pull-request discussion plus the exact remote SHA
  sent to Pro in the signed-in ChatGPT conversation

No agent may treat an uncommitted worktree, an unpushed commit, a remembered chat
message, or a local-only artifact as shared team state.

## Mandatory handoff loop

1. **Assign** — Record owner, task, exact base SHA, required branch, allowed scope,
   acceptance commands, and evidence in Git.
2. **Wake** — Increment the Kimi inbox version for a new task or material status
   change. Send Pro a browser message only after an exact remote candidate SHA
   exists.
3. **Claim** — The assigned implementation agent posts a claim on the referenced
   GitHub issue before writing.
4. **Implement** — Work only on the declared branch and scope. Never overwrite
   another agent's branch or force-push.
5. **Verify** — Run the brief's tests, typecheck, lint/build, responsive/browser,
   and evidence gates as applicable.
6. **Publish** — Commit and push; report the exact SHA, changed files, tests,
   screenshots/evidence, limitations, and integration instructions.
7. **Review** — Codex checks authority and integration. Pro receives the exact
   pushed SHA and GitHub link. Review findings and verdict are copied back to the
   pull request.
8. **Resolve** — Update the inbox/status to `ACCEPTED`, `BLOCKED`, `DONE`, or the
   next `START-NOW` task. Never leave a completed task labeled `START-NOW`.

## Codex restart checklist

At the start of every resumed StoryStage work turn, Codex must:

1. fetch the repository and inspect the current branch, dirty state, and remote
   head;
2. read `KIMI_INBOX.md`, its full brief, and the referenced GitHub issue;
3. check whether Kimi claimed, pushed, or opened a pull request;
4. inspect the active Codex pull request and hosted checks;
5. inspect Pro's latest response before requesting another review;
6. continue the first unblocked lane and publish shared state before switching
   lanes.

## Pro review rule

Pro is a reviewer and product/architecture collaborator, not a scheduled daemon.
Codex must explicitly send every review candidate. A valid Pro request includes:

- repository and pull-request link;
- exact remote commit SHA;
- concise delta from the previously reviewed SHA;
- verification/evidence results;
- explicit questions or acceptance gate.

Codex must not say Pro has reviewed local work. Only a response tied to an exact
pushed SHA counts, and the verdict must be recorded on GitHub.

## Kimi polling rule

Kimi's recurring poll reads only the canonical scheduler inbox above. Creating or
editing a GitHub issue alone does not wake Kimi. Every new task or material status
change therefore requires a higher `Inbox-Version` and a pushed inbox commit.

## Standing package-integration authority

On 2026-07-20, Preston authorized Codex to integrate review-clean StoryStage
package pull requests without requesting approval for each merge. Codex may use
that standing authority only when the exact remote head was reviewed, the
package acceptance criteria pass, hosted checks are green, the integration base
has not moved incompatibly, and the merge does not cross a product phase or
Preston acceptance gate. After every merge, Codex verifies the exact resulting
product head before issuing the next bounded ticket.

This standing authority removes repetitive merge prompts. It does not let Codex
waive a failed check, self-accept a Preston product gate, merge unreviewed work,
or start an unauthorized phase.

## Completion rule

The StoryStage product goal remains active until the user accepts a genuinely
functional automated animation studio. Passing one evidence gate, rendering one
clip, or completing one UI slice closes only that lane; it does not complete the
product goal.
