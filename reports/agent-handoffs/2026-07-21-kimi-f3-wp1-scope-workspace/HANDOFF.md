# Kimi F3-WP1 handback — scope and workspace foundation (inbox v62)

Task: `F3-WP1-SCOPE-WORKSPACE-FOUNDATION`
Brief: `reports/agent-handoffs/2026-07-21-codex-kimi-f3-wp1-scope-workspace-foundation-v62.md`
Branch: `agent/kimi-f3-wp1-scope-workspace-foundation`
Draft PR target: `product/v1`
Tracking issue: https://github.com/truthunknown2-art/StoryStage/issues/72 (v62 claim posted; v61 claim acknowledged)

## SHAs

- Exact base: `product/v1@38969c4400e2a9c84a59346c28f7a72d5f9492bf`
  (verified as an ancestor of `origin/product/v1` before branching)
- Implementation head: `b0948577c04a1289e5921eb75c53f57dbef11d04`.
- Handback/evidence tip: named separately in the PR body.

## What was built

The selected beat is now one real, shared Studio scope. Scene rail, beat
board, permanent scope header, and the Director Direct/Visual/Motion tabs
all read the same state, and every scene change deterministically selects
the new scene's first beat exactly once.

1. **Shared selected-beat state** — `selectedBeatIndex` lives in
   `StudioShell` next to `selectedSceneId`, not in any panel. It resets to
   `0` in the same render-time adjustment that already resets the
   scene-relative playhead, so a stale beat can never leak across scenes
   (no effect races).
2. **Rail beat buttons** — the previously inert rail beat rows are real
   buttons with `aria-current` on the selected beat and accessible names
   (`Beat N <title> — N seconds`). Beats still render only for the selected
   scene (`data-beat-for` contract retained).
3. **Board beat card** — the scene board now carries a `Selected beat`
   region: `Beat N of M · Ns`, the beat title, and the honest note that
   this is planning metadata only (no imagery, animation, or audio).
4. **Permanent scope header** — an always-visible breadcrumb
   (`navigation` landmark "Current scope") under the topbar:
   episode / sequence / scene / beat, with the beat marked
   `aria-current="true"`.
5. **Director Direct/Visual/Motion tabs** — real local tab state with
   `tablist`/`tab`/`tabpanel` semantics, `aria-selected`, and Arrow/Home/End
   keyboard support with focus follow. Each tab's panel repeats the shared
   scope (`Scope: Scene N · Beat M — <title>`) plus truthful per-tab copy.
   No editable fields, no Apply/Undo/Redo, no AI, no fake controls.
6. **Stale F2/WP2 copy replaced** — the "Director controls arrive in F3"
   paragraph is gone (the F3-WP1 Director workspace is here); the Preview
   reason now truthfully reads "Preview stays disabled in F3-WP1 — this
   package is scope and workspace foundation only; there is no media to
   preview." Preview/Export remain disabled with plain-language reasons.
7. **Preserved F2 behavior** — Projects → Create → Studio routing, rail
   collapse/reveal, hidden-selection summaries, keyboard rail contract,
   playhead reset, responsive compact layout, reduced-motion guard, and
   every truth label are unchanged.

## Changed files (exact paths)

- `apps/studio/src/product-v1/StudioShell.tsx` — shared selected-beat
  state, rail beat buttons, board beat card, permanent scope header,
  Director tabs with keyboard contract, truthful F3 copy.
- `apps/studio/src/styles.css` — F3-WP1 section: scope header, rail beat
  button states, beat card, Director tabs/panel; beat buttons and tabs
  added to the transition and reduced-motion lists.
- `apps/studio/src/App.test.tsx` — four new F3-WP1 tests (see below); two
  stale-copy assertions updated (`Director controls arrive in F3` →
  Director tablist presence; WP2 Preview reason → F3-WP1 Preview reason).
  No accepted F2 assertion weakened; line endings normalized to the file's
  existing CRLF.
- `reports/agent-handoffs/2026-07-21-kimi-f3-wp1-scope-workspace/**` — this
  handback, two 1440×900 screenshots, and the machine-readable
  click-through report.

No other files touched: no contracts, story/director engine, desktop host,
render worker, Godot, Remotion, persistence, roadmap, or coordination
files.

## Tests

`apps/studio/src/App.test.tsx` — 26/26 pass; the four new F3-WP1 tests:

1. **One selected beat drives every surface** — initial Scene 1 · Beat 1
   agreement across scope header, beat card, rail `aria-current`, Direct
   tab, and tab panel; rail Beat 2 selection re-synchronizes all of them
   and drops Beat 1 ownership everywhere.
2. **First-beat regression** — own Beat 2 in Scene 1, change scenes from
   the rail: Scene 2 · Beat 1 is selected on every surface, all rendered
   beat rows belong to `scene-2`, and the old scene's beats are absent
   from the DOM; repeat via the overview surface and return to Scene 1 to
   prove the earlier Beat 2 selection does not resurrect.
3. **Director tabs are real local state** — click and Arrow/Home keyboard
   selection with focus follow, truthful per-tab scope copy, and proof
   there are no textboxes, comboboxes, or Apply/Undo/Redo controls.
4. **Permanent scope header updates** — across scene change, beat change,
   and tab change (tabs never alter the shared scope).

## Commands and results

1. `pnpm --filter @storystage/studio test` — **76/76 pass** (8 files;
   `App.test.tsx` 26/26 including all retained F1/F2 tests).
2. `pnpm --filter @storystage/studio typecheck` — clean.
3. `pnpm --filter @storystage/studio build` — clean (pre-existing >500 kB
   chunk warning only).
4. `pnpm verify` — **fails only at `verify:roadmap`**; see the conflict
   disclosure below. Every other component passes:
   - `verify:director-capability-assets` — PASS (19 assets).
   - `verify:candidate-rig-review-implementation-receipt` — PASS.
   - `verify:e1-app-server-schema` — PASS.
   - `verify:e1-wp4-failure-matrix` — PASS.
   - `verify:privacy` — PASS (967 files).
   - `pnpm lint` — 0 errors (2 pre-existing warnings in
     `apps/render-worker/src/kvp001-proof.ts`, untouched here).
   - `pnpm -r --if-present typecheck` — clean across all packages.
   - `pnpm -r --if-present test` — **all suites pass**: studio 76/76,
     story-engine 353/353, asset-pipeline 126/126, codex-lab 104/104,
     remotion-runtime 29/29, render-worker 24/24, registration-review
     21/21, contracts 11/11, desktop 11/11, asset-worker 5/5,
     orchestration 4/4, e1-director-lab 4/4, fixtures 2/2. (First
     full-suite pass flaked: one story-engine and three asset-pipeline
     tests hit their 5 s timeouts while a recursive typecheck ran
     concurrently; each suite is green in isolation and serially.)

## verify:roadmap conflict disclosure (pre-existing, out of scope)

`pnpm verify:roadmap` fails with
`Codex owns the active package but Kimi is not waiting: START-NOW`.
Root cause: the mandated exact base `38969c4` predates the status
transition `431284c docs(roadmap): accept E1 and start F3-WP1` (PR #73),
so the base's `docs/ROADMAP_STATUS.md` still says `owner: Codex` /
`E1-WP4`, while `scripts/check-roadmap-consistency.ps1` cross-checks the
**live** `origin/agent/kimi-frontend` inbox (v62: `START-NOW`, branch
named). The failure was reproduced on the **pristine base** with all of
this package's changes stashed — it is independent of this diff. Fixing it
would require editing `docs/ROADMAP_STATUS.md`, which this brief forbids
(roadmap/coordination file) and which Codex already updated on
`product/v1` tip. Reported on issue #72; not worked around.

## Browser click-through (headless Chromium, 1440×900, dev server)

All 12 checks passed with **zero console errors, zero warnings, zero page
errors** (machine-readable: `screenshots/clickthrough-report.json`):

- Studio opens at Scene 1 · Beat 1: scope header breadcrumb
  (episode/sequence/scene/beat), beat card, rail `aria-current`, Direct
  tab, and tab panel all agree.
- Rail Beat 2 selection re-synchronizes header, board, rail, and panel.
- Scene 1 → Scene 3 selects `Beat 1 · Dot finds a trail of dropped
  berries` exactly once; every rendered beat row belongs to `scene-3`;
  the stale Scene 1 beat text is gone from the DOM.
- Visual tab selects for real, keeps the shared scope, and shows truthful
  not-editable copy.
- Second beat scope (Scene 3 · Beat 2 · Visual) fully synchronized.
- Preview/Export remain disabled with the truthful F3-WP1 reason.

## Screenshots (actual app, 1440×900)

| File | State | SHA-256 |
| --- | --- | --- |
| `screenshots/wp1-scene1-beat1-direct-1440x900.png` | Scene 1 · Beat 1 · Direct tab: rail Beat 1 highlighted, beat card `Beat 1 of 2 · 70s`, scope header `… Scene 1 · The Home Nook / Beat 1 · Morning light through the round window`, Direct tab selected | `24dd768f0190c38c572ae1b32301c745983bc9c1b23f16202dafe49af65a7a7c` |
| `screenshots/wp1-scene3-beat2-visual-1440x900.png` | Scene 3 · Beat 2 · Visual tab: rail Beat 2 highlighted under Scene 3, beat card `Beat 2 of 2 · 75s`, scope header `… Scene 3 · Berry Patch / Beat 2 · The glow flickers twice, inviting`, Visual tab selected | `7d0f39abfde839347ffd12cbb72a4a8be341a2457f480fdbdeff7c1e1a66fa9b` |

The two screenshots are visibly and truthfully distinguishable at
1440×900: different scene, different beat, different selected tab, with
rail, board, scope header, and tab panel synchronized in each.

## Control truth table

| Control | Truth |
| --- | --- |
| Act/sequence headers | real expand/collapse, `aria-expanded` (F2, unchanged) |
| Rail scene cards | real selection, `aria-current` (F2, unchanged) |
| Rail beat buttons | real shared beat selection, `aria-current` — new in F3-WP1 |
| Board beat card | real readout of the same selected beat — new in F3-WP1 |
| Permanent scope header | real readout of the same episode/sequence/scene/beat scope — new in F3-WP1 |
| Direct/Visual/Motion tabs | real local UI tab state only; panels show the shared scope and truthful not-editable copy — new in F3-WP1 |
| Overview scene cards | real selection, same single scene state (F2, unchanged) |
| Previous / Next scene | real; disabled at boundaries (F2, unchanged) |
| Scene playhead slider | real local UI timing state; labelled not-media-playback; resets to 0 on scene change (F2, unchanged) |
| Preview / Export | disabled with adjacent plain-language F3-WP1 reasons |
| Editable direction fields, Apply/Undo/Redo, AI Director, persistence, animation, rendering | omitted — later packages/non-goals |

## Known limitations

- Beat selection, tab selection, collapse state, and playhead are
  session-local (no persistence, per scope).
- Beat metadata remains concise local demo data (2 beats per scene).
- The board shows one shared reference image for all scenes, labelled as
  reference art; the beat card is planning metadata only.
- Tab panels are read-only scope mirrors; no direction editing exists in
  this package.
- `pnpm verify` cannot fully pass on the mandated exact base for the
  pre-existing roadmap-consistency reason disclosed above and on
  issue #72.

## Integration instructions

Fast-forward or squash-merge the draft PR into `product/v1`. The branch is
built on the exact base `38969c4400e2a9c84a59346c28f7a72d5f9492bf` and
touches only the files listed above.

F3-WP2 was not started; no backend or later-package work was begun.
Exiting after this handback; not polling.
