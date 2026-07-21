# Kimi assignment — F3-WP2 Direct edits and scoped history

## Assignment identity

- Inbox version: `66`
- Issue: `#81`
- Exact accepted base: `d7b46d891a981a13431b6272be39809142e727f6`
- Required branch: `agent/kimi-f3-wp2-direct-edits-scoped-history`
- Target PR base: `product/v1`
- Owner: Kimi, frontend/UI only

GitHub is authoritative. Before editing, fetch origin without resetting,
rebasing, force-pushing, or modifying another branch. Read the canonical inbox,
this complete brief, issue #81, `docs/plans/milestone-F3.md`, and the current
Product v1 Studio implementation. Verify that the working checkout is the exact
accepted base and that the required branch is absent locally and remotely. Post
the issue claim, create the required branch from the exact base, and execute
only this package.

## Primary invariant

Direct edits commit only to the selected beat, and that beat's history can be
undone or redone without changing any other beat or scene.

## Required product behavior

1. In the selected beat's **Direct** panel, add exactly three bounded text
   drafts: **Beat purpose**, **Performance direction**, and **Continuity note**.
2. Drafts belong to the selected beat. Switching beats or scenes must never
   show another beat's draft or committed values.
3. **Apply** commits the selected beat's complete three-field draft as one
   atomic history step. Empty fields are valid parts of the snapshot. Applying
   a snapshot identical to the current committed snapshot must not create a
   phantom undo step.
4. **Undo** and **Redo** operate only on the selected beat's committed history.
   Their disabled states must honestly reflect whether a step is available.
5. Undo restores the prior committed snapshot. Redo restores the exact undone
   snapshot. Both synchronize that beat's visible draft to the restored
   committed snapshot so the visible fields match the current state.
6. Applying a different snapshot after Undo invalidates only the selected
   beat's redo branch.
7. Leaving a beat or scene and returning preserves that beat's independent
   session-local draft, committed snapshot, and undo/redo availability.
8. Show plain-language wording that this direction and history are
   **session-local** and are not saved to the project, interpreted by AI,
   animated, rendered, or exported.
9. Preserve all accepted F1/F2 navigation and F3-WP1 shared beat scope and tab
   semantics. Visual and Motion remain truthful, non-editable later-package
   surfaces.

The demo model has no durable beat ID. Use a deterministic UI-local key derived
from the authoritative scene ID and beat index. Do not add or imply a
production schema. Keep the implementation surgical in the existing Product
v1 Studio surface. A small adjacent helper is allowed only if it materially
improves immutable-history correctness or focused tests; do not create a broad
state framework.

## Allowed paths

- `apps/studio/**`
- package evidence under
  `reports/agent-handoffs/2026-07-21-kimi-f3-wp2-direct-edits-scoped-history/**`
- the exact handback in that same directory

Do not edit roadmap/status files, the canonical inbox, product contracts, story
engine, desktop host, workers, Godot, Remotion, persistence, or backend code.

## Explicit non-goals

- no AI interpretation, conversation, streaming, or proposal behavior;
- no global undo;
- no saved projects, localStorage, or persistence;
- no timing edits;
- no Visual or Motion fields;
- no production schemas;
- no media, animation, rendering, export, Godot, or Remotion work;
- no F3-WP3 or later package.

## Required verification

- focused draft, Apply, Undo, and Redo tests;
- unchanged Apply creates no phantom history;
- Undo followed by a distinct Apply invalidates redo;
- independent drafts, commits, and histories across two beats in one scene;
- independent histories across two scenes, including leave-and-return;
- a scene change still selects its first beat without leaking prior state;
- retained F2 navigation and F3-WP1 shared-scope/tab tests;
- Studio test, typecheck, and production build;
- repository-root `pnpm verify`;
- real 1440x900 browser screenshots of the same selected beat before Apply,
  after Apply, and after Undo, with the shared scope and session-local boundary
  visible;
- evidence report with zero console warnings/errors and zero page errors;
- SHA-256 hashes for every screenshot.

The existing F3-WP1 test that correctly asserted there were no Direct controls
in WP1 is now obsolete. Replace that expectation with positive Direct-control
coverage while retaining assertions that Visual and Motion do not expose
editing or false capability. Do not weaken accepted navigation, tab, or scope
coverage.

## Handback and stop condition

Commit and push the required branch, open a draft PR to `product/v1`, and post
one exact handback containing:

- exact base, implementation commit, and evidence/handback tip;
- changed files and exact scope audit;
- every command and result;
- evidence paths, viewport, SHA-256 hashes, and what each screenshot proves;
- visible-control truth and known limitations;
- explicit confirmation that F3-WP3 and backend work did not start.

Then exit. Do not poll, begin another package, or modify the completed handback
unless Codex publishes a later higher inbox version with an exact correction.
