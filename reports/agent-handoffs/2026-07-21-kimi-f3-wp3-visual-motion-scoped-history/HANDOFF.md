# Kimi F3-WP3 handback — Visual and Motion scoped history (inbox v69)

Task: `F3-WP3-VISUAL-MOTION-SCOPED-HISTORY`
Brief: `reports/agent-handoffs/2026-07-21-codex-kimi-f3-wp3-visual-motion-scoped-history-v68.md`
Branch: `agent/kimi-f3-wp3-visual-motion-scoped-history`
Draft PR target: `product/v1`
Tracking issue: https://github.com/truthunknown2-art/StoryStage/issues/85 (v69 claim posted)

## SHAs

- Exact base: `product/v1@fe004232e4650dfceaa4360d98f9627595c0cc8c`
  (verified as the checkout HEAD before branching; required branch absent
  locally and remotely before creation)
- Kimi implementation head (code + tests + evidence):
  `b9fe761fb031015631db737202d6fea5eb75d3a3`.
- Handback tip: this commit, named separately in the PR body.

## What was built

Every Visual or Motion control now produces observable session-local state
for only the selected beat through the same accepted atomic per-beat
history as Direct, without claiming runtime animation, camera execution,
rendering, or persistence.

1. **One complete eight-field draft per beat** — the accepted F3-WP2
   per-beat snapshot was evolved, not duplicated: Beat purpose,
   Performance direction, Continuity note (Direct, unchanged); Framing
   (`Unspecified`/`Wide`/`Medium`/`Close-up`) and Composition focus
   (plain text, `maxLength` 240) on the Visual tab; Camera intent
   (`Unspecified`/`Locked-off`/`Gentle push`/`Gentle pull`/
   `Follow action`), Performance pace (`Unspecified`/`Gentle`/`Measured`/
   `Energetic`), and End hold (`Unspecified`/`No hold`/`Brief hold`/
   `Full hold`) on the Motion tab. No second history exists.
2. **Shared atomic Apply/Undo/Redo from every tab** — the same Apply /
   Undo / Redo row and `aria-live` draft-vs-committed status line render
   inside Direct, Visual, and Motion. Apply from any tab commits the
   complete eight-field draft as one history step; an identical Apply
   returns the identical state (no phantom step); Undo/Redo from any tab
   restores the exact complete committed snapshot and synchronizes every
   draft; a distinct Apply after Undo truncates only that beat's redo
   branch. Tab switches never commit, and the status line keeps unapplied
   drafts visibly distinguishable on every tab.
3. **Committed-only Selected direction summary on the reference board** —
   an accessible region (`aria-label="Selected direction summary"`) inside
   the scene-board surface lists only the selected beat's committed five
   Visual/Motion values, or the honest empty state `No Visual or Motion
   direction committed for this beat`. It always carries `Planning
   overlay — not animation or rendered output.` It never shows unapplied
   draft values and never alters, filters, or effects the reference image.
4. **Scoped independence preserved** — drafts, committed snapshots,
   cursors, redo branches, and the board summary stay independent across
   two beats in one scene and across first beats in two scenes, including
   leave-and-return; a scene change still selects that scene's first beat
   with no state leak. Beat identity remains the deterministic UI-local
   key (`sceneId::beat-<index>`); no production schema added.
5. **Preserved accepted behavior** — F1/F2 navigation, F3-WP1 shared
   scope/tab semantics (roving tabindex, Arrow/Home/End, hidden inactive
   panels), and F3-WP2 Direct behavior are unchanged; the history core
   (`apply`/`undo`/`redo`/cursor) is byte-identical logic widened to the
   eight-field snapshot. Preview/Export stay disabled; the Preview reason
   now truthfully reads F3-WP3 session-local planning with no media.
6. **Planning intent only** — none of the values create keyframes,
   execute a camera, retime a beat, animate a rig, modify imagery, or
   render media; the session-local boundary note is visible on every tab.

## Changed files (exact paths, allowed scope only)

- `apps/studio/src/product-v1/direct-history.ts` — the accepted immutable
  per-beat history module widened to the eight-field draft: typed intent
  option lists, `COMPOSITION_FOCUS_MAX_LENGTH` (240), eight-field
  equality, and the `hasCommittedVisualMotionDirection` summary guard.
  Apply/undo/redo/cursor logic unchanged.
- `apps/studio/src/product-v1/direct-history.test.ts` — pure history
  tests (8 retained + 4 new = 12).
- `apps/studio/src/product-v1/StudioShell.tsx` — shared per-tab direction
  form (boundary note, tab fields, one Apply/Undo/Redo, status), the four
  bounded intent selects + Composition focus draft, the committed-only
  board summary, F3-WP3 Preview reason, header comments.
- `apps/studio/src/App.test.tsx` — new F3-WP3 suite (6 tests, below);
  F2-WP1 honest-controls test and F3-WP1 tab test updated for the
  authorized Visual/Motion controls (obsolete "non-editable surfaces"
  expectations replaced with positive bounded coverage; navigation,
  keyboard, and scope assertions retained verbatim); the F1
  no-generation-claim regex now excludes only the mandated planning
  disclaimer line (see below); F3-WP2 suite retained unchanged.
- `apps/studio/src/styles.css` — intent select styling matching the
  accepted Direct fields, plus the board summary block styles.
- `reports/agent-handoffs/2026-07-21-kimi-f3-wp3-visual-motion-scoped-history/**`
  — this handback, three 1440×900 screenshots, and the machine-readable
  click-through report.

No other files touched: no package manifests/lockfiles, demo-project
fixtures, roadmap/status, coordination inbox, contracts, story engine,
desktop host, workers, Godot, Remotion, assets, audio, timeline,
persistence, or backend code. Temporary capture tooling
(`playwright-core` scratch install) was fully removed before committing;
the final diff contains only the files above.

## Tests

`apps/studio` — **100/100 pass** (9 files; 90 retained → 4 existing pure
tests extended, +4 pure, +6 UI).

New pure history tests (`direct-history.test.ts`, now 12):

1. Complete eight-field atomic commit from mixed Direct/Visual/Motion
   edits: edits alone create no history; one Apply commits all eight
   fields; identical re-Apply returns the same state object.
2. A Visual- or Motion-only edit is a real change; Undo/Redo restore all
   eight fields exactly.
3. A distinct eight-field Apply after Undo invalidates only that beat's
   redo branch; the discarded snapshot can never reappear.
4. `hasCommittedVisualMotionDirection` is false for Direct-only commits
   and drafts, true for any committed Visual/Motion value.

New F3-WP3 UI tests (`App.test.tsx`):

1. Each of the five new controls changes only the selected beat's draft
   and never the committed board summary until Apply; drafts are scoped
   per beat across leave-and-return; one cross-tab Apply commits.
2. Edits across Direct, Visual, and Motion commit as exactly one history
   step (one Undo returns every field on every tab to the initial empty
   snapshot; one Redo restores the exact complete snapshot).
3. Undo from the Direct tab and Redo from the Motion tab restore every
   field and the committed board summary exactly across two complete
   committed snapshots.
4. Independent drafts/commits/histories/summaries across two beats in one
   scene, including leave-and-return and cross-beat Undo isolation.
5. Independent first beats in two scenes: scene change selects the first
   beat with clean draft/history/summary; both scenes keep independent
   commits across leave-and-return.
6. The board summary shows only committed values, always carries the
   planning-only note, and the reference image `src` is byte-identical
   before drafting, after drafting, and after Apply.

Retained: all F1, F2-WP1/WP2/WP3, F3-WP1, and F3-WP2 tests pass. Two
accepted expectations were updated only where the authorized F3-WP3
capability contradicted them (same class as the accepted F3-WP2 update):
the F3-WP1 "Visual/Motion are non-editable" assertions are now positive
bounded-control coverage, and the F2-WP1 "no camera combobox" assertion
now pins the four bounded intent selects as the only Director comboboxes.
The F1 `not.toHaveTextContent(/rendered|exported/i)` assertion became
`/rendered(?! output)|exported/i`: the binding brief mandates the exact
disclaimer `Planning overlay — not animation or rendered output.`, and
the suite's intent (no generation claims) is preserved — every
rendered/exported claim other than the mandated negation stays forbidden.

## Commands and results

1. `pnpm --filter @storystage/studio test` — **100/100 pass** (9 files).
2. `pnpm --filter @storystage/studio typecheck` — clean.
3. `pnpm --filter @storystage/studio build` — clean (pre-existing >500 kB
   chunk warning only).
4. Repository-root verify chain — every step **PASS** except the
   documented `verify:roadmap` conflict below:
   - `verify:director-capability-assets` — PASS (19 assets).
   - `verify:candidate-rig-review-implementation-receipt` — PASS.
   - `verify:e1-app-server-schema` — PASS.
   - `verify:e1-wp4-failure-matrix` — PASS.
   - `verify:privacy` — PASS (979 files).
   - `pnpm lint` — 0 errors (2 pre-existing warnings in
     `apps/render-worker/src/kvp001-proof.ts`, untouched here); eslint
     clean on every file this package changed.
   - `pnpm -r --if-present typecheck` — clean across all packages.
   - `pnpm -r --if-present test` — **all suites pass** (exit 0): studio
     100/100, story-engine 353/353, asset-pipeline 126/126, codex-lab
     104/104, remotion-runtime 29/29, render-worker 24/24,
     registration-review 21/21, contracts 11/11, desktop 11/11,
     asset-worker 5/5, orchestration 4/4, e1-director-lab 4/4,
     fixtures 2/2.

## verify:roadmap conflict (base-inherent, same class as F3-WP1/F3-WP2)

`pnpm verify:roadmap` fails with
`Codex owns the active package but Kimi is not waiting: START-NOW`.
Root cause: the mandated exact base `fe00423` predates the F3-WP3 status
transition `962df71 chore(roadmap): start bounded F3-WP3` (PR #86, on
`origin/product/v1` at `b0fa1b2`). The base's `docs/ROADMAP_STATUS.md`
still records F3-WP2 / Kimi WAIT, while
`scripts/check-roadmap-consistency.ps1` cross-checks the **live**
`origin/agent/kimi-frontend` inbox (v69: START-NOW, this branch named).
The guard compares only the base status file and the live inbox — this
diff touches neither, and `962df71` already names F3-WP3 / owner Kimi /
this exact base, branch, and issue, so the same checkout passes on
`product/v1` tip. Editing `docs/ROADMAP_STATUS.md` is forbidden by this
brief; reported here exactly, not worked around.

## Browser click-through (headless Chromium, 1440×900, dev server)

All **30 checks passed** with **zero console warnings/errors and zero
page errors** (machine-readable: `screenshots/clickthrough-report.json`):
initial Scene 1 · Beat 1 scope agreement; Direct tab selected; boundary
wording visible; summary empty state plus planning-only note visible;
Undo/Redo honestly disabled; drafting on Direct flags unapplied changes;
the unapplied status follows tab switches to Visual and Motion while the
committed summary stays on its empty state; one cross-tab Apply from the
Motion tab commits the complete direction; Undo enabled / Redo disabled;
the committed summary shows all five values; the same committed beat
verified and captured on Motion, Visual, and Direct.

## Screenshots (actual app, 1440×900)

| File | State | SHA-256 |
| --- | --- | --- |
| `screenshots/wp3-scene1-beat1-motion-committed-1440x900.png` | Same committed Scene 1 · Beat 1 on Motion: Camera intent Gentle push, Performance pace Measured, End hold Brief hold committed; Undo enabled, Redo disabled; scope header, session-local boundary note, and committed board summary with planning-only note visible | `4096f7cad1b5712ef3b01124158c2084689744a0c451256ffa30da90e77d6408` |
| `screenshots/wp3-scene1-beat1-visual-committed-1440x900.png` | Same beat on Visual: Framing Wide and Composition focus "The round window behind Ollo" committed; shared Undo enabled / Redo disabled; scope header, boundary note, and committed board summary visible | `a06940004e23d0faa4a68e320419f7abe0481d78a5ed88516b5cf20e2bd6d5b7` |
| `screenshots/wp3-scene1-beat1-direct-committed-1440x900.png` | Same beat on Direct: the three accepted drafts committed in the same snapshot; Undo enabled / Redo disabled; scope header, boundary note, and committed board summary visible | `b95ee110ab4bbd4c88c6dab83c8f7f101a555524fb787fd89d5be38ce7e58a09` |

All three captures are the same selected beat in one browser session
after one committed complete direction, and are visibly distinguishable
only by the active tab's fields — the shared history state and committed
summary agree across tabs.

## Control truth table

| Control | Truth |
| --- | --- |
| Beat purpose / Performance direction / Continuity note | real session-local draft fields for the selected beat only (F3-WP2, unchanged) |
| Framing / Camera intent / Performance pace / End hold | real session-local bounded intent selects for the selected beat's shared draft — new in F3-WP3; planning intent only |
| Composition focus | real session-local plain-text draft (max 240 chars) for the selected beat — new in F3-WP3; planning intent only |
| Apply (on Direct, Visual, and Motion) | real; commits the complete eight-field draft as one atomic history step; unchanged Apply is a truthful no-op |
| Undo / Redo (on Direct, Visual, and Motion) | real per-beat committed-history navigation with honest disabled states and redo invalidation; synchronizes every draft |
| Draft status line (on every tab) | real readout distinguishing unapplied draft vs committed snapshot (`aria-live`) |
| Selected direction summary | real committed-only readout of the selected beat's five Visual/Motion values or the honest empty state; always carries the planning-only note; never shows drafts; never alters the reference image — new in F3-WP3 |
| Direct/Visual/Motion tabs | real local tab state with roving tabindex + Arrow/Home/End (F3-WP1, unchanged) |
| Rail beat buttons, beat card, scope header | real shared selected-beat scope (F3-WP1, unchanged) |
| Rail/overview/transport/playhead/collapse | real accepted F2 behavior, unchanged |
| Preview / Export | disabled with adjacent plain-language F3-WP3 reasons |
| AI interpretation, saved projects, localStorage/persistence, global undo, timing edits, keyframes, executable camera moves, media, animation, rendering, export | omitted — explicit non-goals / later packages |

## Known limitations

- Direction drafts and histories are session-local React state; they are
  not persisted anywhere and do not survive a reload (by design this
  package).
- Beat identity is a deterministic UI-local key (`sceneId::beat-<index>`)
  over the bounded Ollo demo plan; reordering demo beats would re-key
  state. No production schema exists yet.
- Intent values are vocabulary only: they execute nothing and gate
  nothing downstream; there is no runtime consumer in this package.
- The board still shows one shared reference image for all scenes,
  labelled as reference art; the beat card remains planning metadata only.
- During the ad-hoc stepwise verify run, the CPU-heavy
  `asset-pipeline` rig-preparation test flaked once under parallel load;
  it passed 126/126 standalone and again in the canonical full recursive
  `pnpm -r --if-present test` run (exit 0) reported above. Unrelated to
  this diff (untouched package); recorded for transparency.

## Integration instructions

Fast-forward or squash-merge the draft PR into `product/v1`. The branch is
built on the exact base `fe004232e4650dfceaa4360d98f9627595c0cc8c` and
touches only the files listed above. The base-inherent `verify:roadmap`
conflict resolves on `product/v1` tip (status transition `962df71`).

F3-WP4, AI behavior, persistence, backend work, Godot, Remotion,
rendering, and export were not started. Exiting after this handback; not
polling.
