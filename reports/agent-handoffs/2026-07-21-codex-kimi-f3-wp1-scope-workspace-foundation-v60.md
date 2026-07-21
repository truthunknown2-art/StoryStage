# Kimi task brief v60 - F3-WP1 scope and workspace foundation

## Assignment identity

- Inbox-Version: `60`
- Status: `START_NOW`
- Current-Task: `F3-WP1-SCOPE-WORKSPACE-FOUNDATION`
- Exact accepted base: `38969c4400e2a9c84a59346c28f7a72d5f9492bf`
- Required work branch: `agent/kimi-f3-wp1-scope-workspace-foundation`
- GitHub issue: `#72`
- Target branch: `product/v1`
- Owner: Kimi frontend
- Dispatcher/reviewer: Codex

Before writing, fetch GitHub truth, verify that exact base is in
`origin/product/v1`, create or switch only to the required work branch from that
exact base, and post a claim on issue #72. Do not merge, rebase, reset,
force-push, or write another agent's branch.

## Primary invariant

The selected beat is one real shared workspace scope. The scene rail, beat
board, permanent scope header, and Director tabs must agree, and changing scenes
must deterministically select the first beat in the newly selected scene.

## Required visible result

In the ordinary Product v1 Studio, a creator can select scenes and beats and see
the same episode/sequence/scene/beat scope reflected in the rail, beat board,
permanent Director scope header, and selected Direct/Visual/Motion tab. Two
different selected beats must be visibly and truthfully distinguishable at
1440x900. The UI must not claim that editing, AI, persistence, animation, or
rendering works in this package.

## Tasks

1. Read the current `apps/studio` exports, immediate callers, selection state,
   accepted F2 navigation tests, and shared frontend utilities before editing.
2. Make selected beat a real shared Studio state rather than a panel-local or
   copied placeholder.
3. Synchronize scene rail, beat board, permanent scope header, and Director
   workspace selection.
4. When the selected scene changes, select that scene's first beat exactly once
   and prevent stale beat state from leaking across scenes.
5. Add the visible Director tabs `Direct`, `Visual`, and `Motion`. Tab selection
   is real local UI state; do not add fields or actions belonging to later
   packages.
6. Replace stale F2/WP2 `Preview` wording with truthful F3 scope-foundation copy.
7. Preserve the accepted Projects -> Create -> Studio route, F2 navigation,
   responsive behavior, keyboard basics, and current truth labels.

## Allowed files

- `apps/studio/**`
- package-scoped screenshots/evidence in the existing accepted evidence paths
- one exact handback under `reports/agent-handoffs/**`

If a required change falls outside those paths, stop and report the exact
blocker on issue #72. Do not change contracts, story/director engine, desktop
host, render worker, Godot, Remotion, project persistence, product roadmap, or
coordination files.

## Explicit non-goals

- no editable Direct/Visual/Motion fields;
- no Apply, Undo, Redo, or committed direction history;
- no AI Director, Codex/App Server, MCP, auth, or proposal fixtures;
- no durable project state, runtime contract, asset, media, audio, animation,
  timeline, rendering, or export work;
- no fake controls, generated output, or production-capability claims; and
- no F3-WP2 or later package work.

## Required verification

- focused scene/beat selection and Director-tab tests;
- regression proving scene change selects the first beat and removes stale beat
  ownership;
- retained F2 navigation tests;
- Studio typecheck and build;
- repository-root `pnpm verify`;
- actual browser audit at 1440x900 with zero page/console errors; and
- two actual 1440x900 screenshots showing two different selected beat scopes,
  with rail, board, permanent scope header, and selected tab synchronized.

Use the existing repository browser/evidence conventions. Do not substitute a
mock page or a new demo app for the ordinary Product v1 Studio.

## Completion and handback

Commit and push the exact required branch. Open a draft PR to `product/v1`.
Publish one dated handback containing:

- exact pushed SHA and PR;
- changed files and why;
- commands and exact results;
- screenshot paths, viewport, hashes, and what each proves;
- console/page-error result;
- whether every visible control is real, intentionally unavailable with a
  reason, or omitted; and
- known limitations and explicit confirmation that F3-WP2 was not started.

Then exit. Do not remain open to poll for review.
