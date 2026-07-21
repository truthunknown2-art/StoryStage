# Kimi F3-WP2 handback — Direct edits and scoped history (inbox v66)

Task: `F3-WP2-DIRECT-EDITS-SCOPED-HISTORY`
Brief: `reports/agent-handoffs/2026-07-21-codex-kimi-f3-wp2-direct-edits-scoped-history-v66.md`
Branch: `agent/kimi-f3-wp2-direct-edits-scoped-history`
Draft PR target: `product/v1`
Tracking issue: https://github.com/truthunknown2-art/StoryStage/issues/81 (v66 claim posted)

## SHAs

- Exact base: `product/v1@d7b46d891a981a13431b6272be39809142e727f6`
  (verified as the checkout HEAD before branching; required branch absent
  locally and remotely before creation)
- Kimi implementation head (code + tests + evidence):
  `51d04cd410c58defbf06691f4d9cf29c7dd4926a`.
- Handback tip: this commit, named separately in the PR body.

## What was built

Direct edits commit only to the selected beat, and that beat's history can
be undone or redone without changing any other beat or scene.

1. **Three bounded session-local drafts** — the Direct tab of the selected
   beat now shows exactly **Beat purpose**, **Performance direction**, and
   **Continuity note** (textarea, `maxLength` 500, plain placeholders).
2. **Deterministic UI-local beat identity** — the demo model has no durable
   beat ID, so all Direct state is keyed by `sceneId::beat-<index>` derived
   from the authoritative scene ID and beat index
   (`apps/studio/src/product-v1/direct-history.ts`). No production schema
   added or implied. Switching beats or scenes never shows another beat's
   draft or committed values; leaving and returning preserves each beat's
   independent draft, committed snapshot, and undo/redo availability.
3. **Atomic Apply** — commits the complete three-field draft as one
   immutable history step; empty fields are valid snapshot content.
   Applying a snapshot identical to the current committed snapshot returns
   the identical state, so no phantom undo step can exist.
4. **Per-beat Undo/Redo with redo invalidation** — Undo restores the prior
   committed snapshot, Redo restores the exact undone snapshot, and both
   synchronize the visible draft to the restored snapshot. Disabled states
   honestly mirror availability. A distinct Apply after Undo truncates only
   that beat's redo branch.
5. **Honest draft-vs-committed status** — an `aria-live` line reads
   "Unapplied draft changes — Apply commits them as one step in this
   beat's session history." while editing and "Draft matches this beat's
   committed session direction." otherwise.
6. **Session-local boundary wording** — a visible note: "Session-local
   only — this direction and its undo history stay in this Studio session.
   They are not saved to the project, are not interpreted by AI, and are
   not used for animation, rendering, or export."
7. **Preserved F1/F2/F3-WP1 behavior** — navigation, shared beat scope,
   first-beat-on-scene-change, tab semantics and keyboard contract,
   playhead, collapse/reveal, and truth labels unchanged. Visual and
   Motion stay truthful, non-editable later-package surfaces. Preview copy
   updated to the truthful F3-WP2 reason; Preview/Export remain disabled.
8. **Hidden-panel robustness fix** — current Chromium no longer treats the
   UA `[hidden]` rule as `!important`, so `.pv1-director-panel`'s
   `display: grid` was visually revealing the inactive Visual/Motion
   panels (caught by this package's browser capture; the accepted F3-WP1
   screenshots predate the engine change). One explicit
   `.pv1-director-panel[hidden] { display: none; }` rule restores the
   accepted tab semantics.

## Changed files (exact paths, allowed scope only)

- `apps/studio/src/product-v1/direct-history.ts` — new pure immutable
  per-beat history module (draft/history/cursor, apply/undo/redo, guards).
- `apps/studio/src/product-v1/StudioShell.tsx` — Direct panel form
  (three drafts, Apply/Undo/Redo, status, boundary note), per-beat state
  map keyed by UI-local identity, F3-WP2 Preview reason, header comment.
- `apps/studio/src/styles.css` — Direct form styles plus the
  `[hidden]` panel guard.
- `apps/studio/src/App.test.tsx` — new F3-WP2 suite (6 tests, below); the
  two obsolete F3-WP1 "no Direct controls" expectations replaced with
  positive Direct-control coverage while retaining Visual/Motion
  no-editing assertions; Preview reason string updated. No accepted F1/F2
  navigation, scope, or tab assertion weakened.
- `apps/studio/src/product-v1/direct-history.test.ts` — new pure history
  unit tests (8 tests).
- `apps/studio/package.json` — registers the new test file in the studio
  `test` script's explicit file list.
- `reports/agent-handoffs/2026-07-21-kimi-f3-wp2-direct-edits-scoped-history/**`
  — this handback, three 1440×900 screenshots, and the machine-readable
  click-through report.

No other files touched: no roadmap/status, coordination inbox, contracts,
story engine, desktop host, workers, Godot, Remotion, persistence, or
backend code. (`pnpm-lock.yaml` was briefly modified by a scratch evidence
tool install and was fully reverted before committing; the final diff
contains only the files above.)

## Tests

`apps/studio` — **90/90 pass** (76 retained + 14 new).

New F3-WP2 UI tests (`App.test.tsx`):

1. **Atomic Apply with honest states** — boundary wording visible;
   Undo/Redo disabled initially; drafting flags "Unapplied" without
   creating history; one Apply commits all three fields and enables Undo.
2. **No phantom step** — two identical Applies yield exactly one undo
   step (single Undo empties the fields and disables Undo).
3. **Undo/Redo fidelity** — commit A, commit B, Undo restores A into the
   visible draft, Redo restores the exact B snapshot.
4. **Redo invalidation** — Undo then a distinct Apply discards only that
   beat's redo branch; the discarded snapshot can never reappear.
5. **Two beats in one scene** — independent drafts, commits, and
   histories; an unapplied Beat 2 draft survives leave-and-return and
   never leaks into Beat 1.
6. **Two scenes** — a scene change still selects the new scene's first
   beat with a clean draft/history (no leak); both scenes keep
   independent committed histories across leave-and-return.

New pure history tests (`direct-history.test.ts`): initial state, atomic
commit with empty fields, identical-Apply no-op returning the same state
object, undo/redo fidelity, redo truncation, boundary no-ops, immutability
of prior state objects, deterministic key derivation.

## Commands and results

1. `pnpm --filter @storystage/studio test` — **90/90 pass** (9 files).
2. `pnpm --filter @storystage/studio typecheck` — clean.
3. `pnpm --filter @storystage/studio build` — clean (pre-existing >500 kB
   chunk warning only).
4. Repository-root `pnpm verify` — every step **PASS** except the
   documented `verify:roadmap` conflict below:
   - `verify:director-capability-assets` — PASS (19 assets).
   - `verify:candidate-rig-review-implementation-receipt` — PASS.
   - `verify:e1-app-server-schema` — PASS.
   - `verify:e1-wp4-failure-matrix` — PASS.
   - `verify:privacy` — PASS (978 files).
   - `pnpm lint` — 0 errors (2 pre-existing warnings in
     `apps/render-worker/src/kvp001-proof.ts`, untouched here).
   - `pnpm -r --if-present typecheck` — clean across all packages.
   - `pnpm -r --if-present test` — **all suites pass**: studio 90/90,
     story-engine 353/353, asset-pipeline 126/126, codex-lab 104/104,
     remotion-runtime 29/29, render-worker 24/24, registration-review
     21/21, contracts 11/11, desktop 11/11, asset-worker 5/5,
     orchestration 4/4, e1-director-lab 4/4, fixtures 2/2.

## verify:roadmap conflict (base-inherent, same class as F3-WP1)

`pnpm verify:roadmap` fails with
`Codex owns the active package but Kimi is not waiting: START-NOW`.
Root cause: the mandated exact base `d7b46d8` predates the F3-WP2 status
transition `d361205 docs(roadmap): start bounded F3-WP2` (PR #82, merged
on `origin/product/v1` at `3937013`). The base's `docs/ROADMAP_STATUS.md`
still records F3-WP1 / owner Codex / ACCEPTED_WAIT, while
`scripts/check-roadmap-consistency.ps1` cross-checks the **live**
`origin/agent/kimi-frontend` inbox (v66: START-NOW, this branch named).
The guard compares only the base status file and the live inbox — this
diff touches neither, and `d361205` already names F3-WP2 / owner Kimi /
this exact base, branch, and issue, so the same checkout passes on
`product/v1` tip. Editing `docs/ROADMAP_STATUS.md` is forbidden by this
brief; reported here exactly, not worked around. This is the same
documented conflict class as the F3-WP1 package (see its handback).

## Browser click-through (headless Chromium, 1440×900, dev server)

All **18 checks passed** with **zero console errors, zero warnings, zero
page errors** (machine-readable: `screenshots/clickthrough-report.json`):
initial Scene 1 · Beat 1 scope agreement; Direct tab selected; boundary
wording visible; Undo/Redo honestly disabled; drafting flags unapplied
changes; Apply commits and enables Undo only; Undo restores the empty
prior snapshot and disables Undo; Redo restores the exact undone
snapshot.

## Screenshots (actual app, 1440×900)

| File | State | SHA-256 |
| --- | --- | --- |
| `screenshots/wp2-scene1-beat1-direct-before-apply-1440x900.png` | Same selected beat before Apply: Scene 1 · Beat 1 scope header, rail Beat 1 highlighted, Direct tab selected, three drafts filled, status "Unapplied draft changes…", Undo/Redo disabled, session-local boundary note visible | `08b66a852a482c1baf8fac82d2eeffe5779555446a155a6a4c3afce2bbc31a4c` |
| `screenshots/wp2-scene1-beat1-direct-after-apply-1440x900.png` | Same beat after Apply: identical field values now committed, status "Draft matches this beat's committed session direction.", Undo enabled, Redo disabled | `dd4b5abac53e461ad9d0344c4b93038d357378465416558cf525c2d79f79d756` |
| `screenshots/wp2-scene1-beat1-direct-after-undo-1440x900.png` | Same beat after Undo: fields restored to the prior committed (empty) snapshot, placeholders visible, Undo disabled, Redo enabled | `d71e44834db3583b9680a869105e794f9520a62353d4a2e74210845af9cc5979` |

The three captures are the same selected beat in one session and are
visibly distinguishable: filled-vs-committed-vs-restored-empty fields,
status line, and Undo/Redo disabled states change truthfully.

## Control truth table

| Control | Truth |
| --- | --- |
| Beat purpose / Performance direction / Continuity note | real session-local draft fields for the selected beat only — new in F3-WP2 |
| Apply | real; commits the selected beat's complete three-field draft as one atomic history step; unchanged Apply is a truthful no-op — new in F3-WP2 |
| Undo / Redo | real per-beat committed-history navigation with honest disabled states and redo invalidation; syncs the visible draft — new in F3-WP2 |
| Draft status line | real readout distinguishing unapplied draft vs committed snapshot (`aria-live`) — new in F3-WP2 |
| Direct/Visual/Motion tabs | real local tab state with roving tabindex + Arrow/Home/End (F3-WP1, unchanged) |
| Visual / Motion panels | truthful non-editable later-package surfaces; no controls (F3-WP1, unchanged) |
| Rail beat buttons, beat card, scope header | real shared selected-beat scope (F3-WP1, unchanged) |
| Rail/overview/transport/playhead/collapse | real accepted F2 behavior, unchanged |
| Preview / Export | disabled with adjacent plain-language F3-WP2 reasons |
| AI interpretation, saved projects, localStorage/persistence, global undo, timing edits, Visual/Motion fields, media, animation, rendering, export | omitted — explicit non-goals / later packages |

## Known limitations

- Direct drafts and histories are session-local React state; they are not
  persisted anywhere and do not survive a reload (by design this package).
- Beat identity is a deterministic UI-local key (`sceneId::beat-<index>`)
  over the bounded Ollo demo plan; reordering demo beats would re-key
  state. No production schema exists yet.
- The board still shows one shared reference image for all scenes,
  labelled as reference art; the beat card remains planning metadata only.

## Integration instructions

Fast-forward or squash-merge the draft PR into `product/v1`. The branch is
built on the exact base `d7b46d891a981a13431b6272be39809142e727f6` and
touches only the files listed above. The base-inherent `verify:roadmap`
conflict resolves on `product/v1` tip (status transition `d361205`).

F3-WP3, AI behavior, persistence, and backend work were not started.
Exiting after this handback; not polling.
