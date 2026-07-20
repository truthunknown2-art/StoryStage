# StoryStage cold start

GitHub is the source of truth. A chat, Codex goal, compacted summary, local
worktree note, or roadmap dashboard is not implementation authority.

## 1. Read before any mutation

From any StoryStage checkout, run only these read-only commands first:

```powershell
git fetch origin --prune

git status --short --branch
git rev-parse origin/product/v1

git show origin/product/v1:docs/PRODUCT_PLAN.md
git show origin/product/v1:docs/PRODUCT_ROADMAP.md
git show origin/product/v1:docs/ROADMAP_STATUS.md
git show origin/product/v1:AGENTS.md
git show origin/product/v1:CODEX_START_HERE.md
```

Read the five sources in that order:

1. `PRODUCT_PLAN` - product meaning and architecture.
2. `PRODUCT_ROADMAP` - phase/package sequence and gates.
3. `ROADMAP_STATUS` - the one live authorization and exact Git state.
4. `AGENTS` - operating, ownership, evidence, and stop rules.
5. `CODEX_START_HERE` - bootstrap and conflict handling.

When `ROADMAP_STATUS` names Kimi as owner, also read:

```powershell
git show origin/agent/kimi-frontend:reports/agent-handoffs/KIMI_INBOX.md
```

Then read the exact issue, approved brief, branch, PR, handback, and hosted
checks named by `ROADMAP_STATUS` or the Kimi inbox. Do not search chat history to
guess missing assignment details.

## 2. Verify the implementation base

Before creating or changing an implementation branch:

```powershell
git cat-file -e <exactBase>^{commit}
git merge-base --is-ancestor <exactBase> origin/product/v1
git status --porcelain
```

If the checkout is dirty, preserve the user's work and use the declared clean
worktree/branch. Do not reset, rebase, cherry-pick, force-push, or switch merely
to make the state convenient.

## 3. Interpret authorization literally

- `WAIT` or `ACCEPTED_WAIT`: do not implement.
- `START_NOW`: restate that one package and its exit before coding.
- `IMPLEMENTING`: resume only the named owner/package/branch.
- `REVIEW`, `PRO_GATE`, or `PRESTON_GATE`: review only; do not begin the next
  package.
- A failed gate returns to `IMPLEMENTING` on the same package.
- A merged PR does not start another package by itself.

`KIMI_INBOX` may narrow Kimi's current package but cannot broaden or reorder the
roadmap. Kimi's scheduler wakes only on a higher inbox version.

## 4. Conflict protocol

If sources disagree:

1. stop before changing files;
2. fetch again;
3. list the conflicting fields and exact SHAs;
4. apply precedence only within each source's domain;
5. publish a planning/status correction to Git;
6. resume only when one coherent instruction exists.

Examples that require stopping:

- the product plan blocks backend work but a ticket requests B1;
- the roadmap says F3-WP1 is next while status says `WAIT`;
- status and Kimi inbox name different branches or bases;
- a PR claims acceptance while status remains review-pending;
- a chat asks for a later package during an active earlier package.

## 5. Handoff and fresh-task prompt

Every handoff reports exact base, exact remote candidate SHA, changed files,
commands/results, required visible/audio/render evidence, hashes, limitations,
deviations, verdict, and an explicit stop.

For a fresh Codex task, the user only needs to say:

> Continue StoryStage from Git. Follow `AGENTS.md` and
> `CODEX_START_HERE.md`; report the exact live status before acting.
