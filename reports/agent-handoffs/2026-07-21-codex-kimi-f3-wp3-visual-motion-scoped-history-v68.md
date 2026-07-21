# Kimi assignment v68 — F3-WP3 Visual and Motion scoped history

## Identity

- Repository: `https://github.com/truthunknown2-art/StoryStage`
- Product base: `product/v1@fe004232e4650dfceaa4360d98f9627595c0cc8c`
- Required branch: `agent/kimi-f3-wp3-visual-motion-scoped-history`
- Tracking issue: `#85`
- PR target: `product/v1`
- Owner: Kimi frontend only; Codex dispatches, reviews, and integrates.

Before writing, fetch without rebasing/resetting/force-pushing, verify this exact
base and that the required branch is absent locally and remotely, read issue
#85 in full, create only the required branch from the exact base, and post the
required claim on issue #85.

## Primary invariant

Every Visual or Motion control produces observable session-local state for only
the selected beat through the same accepted atomic history as Direct, without
claiming runtime animation, camera execution, rendering, or persistence.

## Binding implementation shape

Evolve the accepted F3-WP2 per-beat snapshot rather than adding a parallel
history. One selected beat owns one complete eight-field draft, immutable
history, and cursor:

- Direct stays exactly: Beat purpose, Performance direction, Continuity note.
- Visual adds Framing (`Unspecified`, `Wide`, `Medium`, `Close-up`) and
  Composition focus (plain text, maximum 240 characters).
- Motion adds Camera intent (`Unspecified`, `Locked-off`, `Gentle push`,
  `Gentle pull`, `Follow action`), Performance pace (`Unspecified`, `Gentle`,
  `Measured`, `Energetic`), and End hold (`Unspecified`, `No hold`, `Brief
  hold`, `Full hold`).

Apply from any tab commits the complete eight-field draft as one history step.
Undo/Redo from any tab restores the exact complete committed snapshot and
synchronizes every draft. Identical Apply stays a no-op. A distinct Apply after
Undo truncates only that beat's redo branch. Tab changes never commit.

Add one accessible `Selected direction summary` inside the reference-board
surface. It shows only the selected beat's committed five Visual/Motion values,
or `No Visual or Motion direction committed for this beat`, and always says
`Planning overlay — not animation or rendered output.` It never shows an
unapplied draft and never changes or effects the reference image.

All values are direction intent only. They do not create keyframes, execute a
camera, retime a beat, animate a rig, modify imagery, or render media. Preserve
the accepted Direct behavior, shared selected-beat scope, accessible tabs,
hidden inactive panels, F1/F2 navigation, session-local boundary, and disabled
Preview/Export truth.

## Allowed files

- `apps/studio/src/product-v1/direct-history.ts`
- `apps/studio/src/product-v1/direct-history.test.ts`
- `apps/studio/src/product-v1/StudioShell.tsx`
- `apps/studio/src/App.test.tsx`
- `apps/studio/src/styles.css`
- package evidence under
  `reports/agent-handoffs/2026-07-21-kimi-f3-wp3-visual-motion-scoped-history/**`
- one exact handback in that package evidence directory

Do not change package manifests/lockfiles, demo-project fixtures, roadmap/status,
the coordination inbox, contracts, story engine, desktop host, workers, Godot,
Remotion, assets, audio, timeline, persistence, or backend code.

## Required verification and evidence

- pure-history coverage for the complete eight-field atomic snapshot,
  immutability, identical-Apply no-op, exact Undo/Redo, and redo invalidation;
- UI coverage for every new control, committed-only board summary, one cross-tab
  Apply, Undo/Redo from a different tab, and independent state/history/summary
  across two beats in one scene and first beats in two scenes;
- retained F2, F3-WP1, and F3-WP2 tests;
- Studio test, typecheck, production build, and repository-root `pnpm verify`;
- three actual 1440x900 screenshots of the same committed selected beat on
  Direct, Visual, and Motion with scope, shared history state, planning-only
  boundary, and board summary visible;
- machine-readable click-through with zero console warnings/errors and zero page
  errors;
- SHA-256 for every screenshot;
- exact pushed handback listing SHA, changed files, commands/results, evidence,
  control truth, limitations, and integration instructions.

The branch must contain only allowed files. Temporary capture tooling and any
lockfile changes must be removed before commit.

## Non-goals and stop

No generated imagery, canvas/image effects, keyframes, executable camera moves,
animation, playback, timing edits, timeline, assets, rigs, audio, AI behavior,
persistence, production schemas, rendering, export, F3-WP4, or backend work.

Commit and push the exact required branch, open/update one draft PR to
`product/v1`, publish one immutable handback on issue #85, and exit. Do not poll
and do not begin another package.
