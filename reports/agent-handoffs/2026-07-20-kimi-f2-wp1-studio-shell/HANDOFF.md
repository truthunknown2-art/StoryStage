# Kimi F2-WP1 handback — Studio shell foundation (inbox v38)

Task: `F2-WP1-STUDIO-SHELL-FOUNDATION`
Brief: `reports/agent-handoffs/2026-07-20-codex-kimi-f2-wp1-studio-shell-v38.md`
Branch: `agent/kimi-f2-studio-shell-wp1`
Draft PR target: `product/v1`
Task issue: https://github.com/truthunknown2-art/StoryStage/issues/38 (claimed)

## SHAs

- Exact product base: `fb3033f8cc5ce536476066708aebb472704de936`
- Implementation head: `9a4d4e5fa047b87ab98c0c5087f4af7f92bc96c6`
- Handback/evidence tip: named separately in the PR body.

## What was built

One coherent frontend-only Studio shell for the bounded 20-minute Ollo
demo, replacing both F1 local-detail destinations. **One selected scene ID
drives every surface** — the hierarchy rail, center scene-board, scene
transport, and episode overview; selection state lives only in
`StudioShell`.

1. Product-v1 top bar: project title, Kids Adventure and Storybook Cutout
   badges, the permanent
   `Local UI demo — production services are not connected.` banner, and
   working Back to Projects.
2. Grouped two-act / four-sequence / eight-scene rail with real scene
   selection (`aria-current` on the selected card). Act/sequence collapse
   is explicitly WP2 and not present.
3. Center scene-board using the existing cast reference art, visibly
   labelled `Reference board — not animation`, with an honest note that no
   imagery, animation, audio, or render exists, and per-scene beat metadata
   (titles + seconds from the local demo data).
4. Working previous/next scene controls with correct disabled boundaries
   and an honest readout: `Scene N of 8 · NNNs · episode M:SS–M:SS of 20:00`.
5. Right inspector: `Director controls arrive in F3.` explanation. No shot,
   action, camera fields and no Apply button anywhere.
6. Compact eight-scene episode overview strip with real selection.
7. Both entries land in this same shell: Projects → seeded demo, and
   Create → valid script → Create first cut (the create path shows the
   script-derived project name in the top bar).

Preview and Export exist only as disabled controls with adjacent
plain-language reasons (`A real preview arrives with the WP2 Studio
playhead.` / `Export unlocks when production services connect.`). No dead
controls, fake success, fake frames, or engineering hashes.

## Changed files (exact paths)

- `apps/studio/src/product-v1/StudioShell.tsx` (new) — the shell: top bar,
  rail, board, transport, inspector, overview, single selection state.
- `apps/studio/src/product-v1/demo-project.ts` — bounded hierarchy data:
  two acts, four sequences, eight scenes, concise beat metadata (~20 min).
- `apps/studio/src/product-v1/ProductV1App.tsx` — `demo` and `studio`
  screens route to `StudioShell`; the created project's name derives from
  the script.
- `apps/studio/src/product-v1/LongFormDemo.tsx` (deleted) — replaced by the
  shell.
- `apps/studio/src/product-v1/LocalStudioHandoff.tsx` (deleted) — replaced
  by the shell.
- `apps/studio/src/App.test.tsx` — two F1 destination tests updated to the
  shell; four new F2-WP1 invariant tests.
- `apps/studio/src/styles.css` — F2 section: studio layout, rail, board,
  transport, inspector, overview, ≤1024px stacking (all in the
  product-v1/F2 section).
- `reports/agent-handoffs/2026-07-20-kimi-f2-wp1-studio-shell/**` — this
  handback + screenshots + click-through report.

No other files touched: no manifests, dependencies, schemas, engine,
runtime, packages, or legacy surfaces.

## Tests

`apps/studio/src/App.test.tsx` — 12/12 pass, including the four new F2-WP1
tests:

1. Rail selection drives board, transport readout, overview, and per-scene
   beats to the same exact scene (Scene 3).
2. Overview selection drives the same invariant (Scene 5).
3. Previous/next boundaries: Previous disabled on scene 1, Next disabled on
   scene 8, both work in between.
4. Honest controls only: F3 Director explanation, disabled Preview/Export
   with reasons, no Apply button, no shot/action/camera fields, no
   play/pause/scrub controls.

## Commands and results

1. `pnpm --filter @storystage/studio test` — **62/62 pass**.
2. `pnpm --filter @storystage/studio typecheck` — clean.
3. `pnpm --filter @storystage/studio build` — clean.
4. `pnpm verify` — **exit 0**.

## Browser click-through (headless Chromium, 1440×900, `http://127.0.0.1:5174/`)

All checks passed with zero console errors, zero warnings, zero page
errors (machine-readable: `screenshots/clickthrough-report.json`):

- Projects → seeded demo → Studio opens on the initial scene (Scene 1,
  readout `0:00–2:30 of 20:00`, Previous disabled).
- Rail selection of Scene 3 → rail, board heading, transport readout
  (`5:10–7:30`), and overview all agree.
- Overview selection of Scene 5 → all four surfaces agree (`10:00–12:50`).
- Previous/next boundaries proven at both ends (Next disabled on scene 8,
  Previous disabled on scene 1 after stepping back).
- Create → valid script → Create first cut → the same Studio shell with
  the script-derived project title.
- Back to Projects works.

## Screenshots (actual app)

| File | State | SHA-256 |
| --- | --- | --- |
| `screenshots/studio-initial-scene-1440x900.png` | Studio, initial scene (The Home Nook), 1440×900 | `4cd6d5510bb1f6e5343b03cb61edfc96c69bd0359d471309c82eb08961b4e022` |
| `screenshots/studio-selected-scene-3-1440x900.png` | Studio, Scene 3 (Berry Patch) selected from the rail, 1440×900 | `28e1e9d3df5def07a5beb7ad1a071c5117b9baeb2561d88543aae342a4a2c89d` |

## Control truth table

| Control | Truth |
| --- | --- |
| New project / Back to projects | real navigation |
| Ollo demo card | real — opens the Studio shell |
| Rail scene cards (8) | real selection, `aria-current`, keyboard-operable |
| Overview scene cards (8) | real selection, same single state |
| Previous / Next scene | real; correctly disabled at scene 1 / scene 8 |
| Reference board image | honest reference art, labelled `not animation` |
| Preview | disabled with adjacent reason (`arrives with the WP2 Studio playhead`) |
| Export | disabled with adjacent reason (`unlocks when production services connect`) |
| Director fields / Apply | omitted — Director controls arrive in F3 |
| Play / pause / scrub / timeline tracks | omitted — WP2+ |
| Act/sequence collapse | omitted — WP2 |

## Known limitations

- The shell renders the bounded local demo hierarchy for both entry paths;
  a created project does not yet map its own script to scenes (WP2+).
- The board shows one shared reference image for all scenes, labelled as
  reference art; there is no per-scene artwork in this package.
- Selection resets when leaving and re-entering the shell (no persistence,
  per scope).
- Scene beats are concise local metadata (2 per scene), not production
  timing data.

## Integration instructions

Fast-forward or squash-merge the draft PR into `product/v1`. The branch is
built on the exact product base `fb3033f8cc5ce536476066708aebb472704de936`
and touches only `apps/studio/src/product-v1/**`, the product-v1/F2 section
of `apps/studio/src/styles.css`, `apps/studio/src/App.test.tsx`, and this
handback directory — no merge conflicts expected.

Stopping here: no WP2, F3, or backend work. Continuing the 15-minute
read-only inbox poll.

---

## v39 correction — created-project truth (inbox v39)

Brief: `reports/agent-handoffs/2026-07-20-codex-kimi-f2-wp1-created-project-truth-v39.md`
Rejected head: `c6defdb6370ec84c9f6af42f0ad87d0a6fb6145a`

### Correction applied

`StudioShell` now receives the visible grammar/art-style labels as props.
The seeded Ollo route passes `OLLO_DEMO_PROJECT.grammar`/`.artStyle`; the
created-project route passes the creator's actual choices via the existing
`GRAMMAR_LABELS`/`ART_STYLE_LABELS` maps. On the created-project path only,
a visible disclosure strip states: the eight scenes are the bounded Ollo
layout demo, not scenes from the creator's script, and script-specific
scenes have not been planned or generated yet.

### v39 changed files

- `apps/studio/src/product-v1/StudioShell.tsx` — label props +
  created-project disclosure strip.
- `apps/studio/src/product-v1/ProductV1App.tsx` — routes pass the real
  labels; created route sets the disclosure.
- `apps/studio/src/styles.css` — `.pv1-layout-demo-note` (F2 section).
- `apps/studio/src/App.test.tsx` — two regressions.
- `reports/agent-handoffs/2026-07-20-kimi-f2-wp1-studio-shell/**` — this
  note + new screenshot + updated click-through report.

### v39 regressions (suite now 14 tests, all pass)

- Choose Weird History + Paper Collage, create first cut: the top bar shows
  exactly those badges, the Kids Adventure / Storybook Cutout badges are
  absent, and the layout-demo disclosure is visible.
- Seeded demo path: Ollo badges remain and no disclosure appears.

### v39 verification

1. `pnpm --filter @storystage/studio test` — **64/64 pass**.
2. `pnpm --filter @storystage/studio typecheck` — clean.
3. `pnpm --filter @storystage/studio build` — clean.
4. `pnpm verify` — **exit 0**.

### v39 screenshot (actual app, 1440×900)

| File | State | SHA-256 |
| --- | --- | --- |
| `screenshots/studio-created-project-weird-history-1440x900.png` | created project with Weird History + Paper Collage badges and the layout-demo disclosure | `8d5a7ce42756a17eb9b0c03bbd1b644097b63f2f5459b1fbf4547abe5d4f345a` |

Console status for this capture: no console errors, no warnings, no page
errors. The screenshot is also recorded in
`screenshots/clickthrough-report.json`.

### v39 control/state truth

- Grammar/art-style badges: read-only-real — the seeded route shows the
  Ollo demo labels; the created route shows the creator's actual Create
  choices.
- Layout-demo disclosure: visible only on the created-project route —
  honest continuity between a pasted script and the borrowed demo plan.
