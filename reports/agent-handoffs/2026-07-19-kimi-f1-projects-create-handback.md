# Kimi F1 handback — Projects + Create (inbox v31)

Task: `F1-PROJECTS-CREATE`
Brief: `reports/agent-handoffs/2026-07-19-codex-kimi-f1-projects-create-v31.md`
Branch: `agent/kimi-ui-v2`
Draft PR target: `product/v1`

## SHAs

- Exact product-plan base: `9f3d6fac522f99b693c163c822334076ee9584bd`
- Implementation head: `ac245e29f785b8bccc0142bca2480195625ac67b`
- Branch tip (this handback + screenshots): named separately in the PR body.

## What was built

The first understandable slice of the real creator journey — **Projects →
Create → honest local Studio handoff** — as the default route of
`apps/studio`. Frontend-only, bounded local UI state, production services
disconnected and labelled honestly throughout.

- **Projects (default entry).** Calm product header, page title, real
  **New project** action, and the labelled local Ollo demo card (`The
  Storylight in the Little Wood` — cast reference art, Kids Adventure ·
  Storybook Cutout · ~20 min episode · `Local UI demo` badge). The
  `Local UI demo — production services are not connected.` banner is always
  visible. An understandable empty state renders when the demo project is
  removed (test fixture via the `showDemoProject` prop).
- **Create.** Follows the approved mock hierarchy: paste/edit script area
  with live word count and honest duration estimate (~150 wpm), working
  `.txt` import through the browser file picker with a visible error state
  (wrong file type, unreadable file), Kids Adventure / Weird History grammar
  cards, art-style cards using the existing reference assets, narration /
  16:9 / language controls (future options disabled with visible reasons),
  and a deterministic natural-beats preview (paragraphs in source order,
  sentences for single-paragraph scripts, capped at four visible cards with
  an honest "and N more"). **Create first cut** validates the script (empty
  script blocks navigation with a useful error); **Back to projects** always
  works. The action footer is sticky so it stays visible at 900px.
- **Honest local Studio handoff.** Shows the derived project name, every
  selected choice, the detected beat summary, the permanent
  `Local UI demo — production services are not connected.` banner, and the
  explicit copy `No imagery, animation, audio, or render was generated`.
  Back/Edit actions work. F2 will replace this with the long-form Studio
  shell (not built here).
- **Long-form Ollo demo.** The demo card opens a bounded local project: 8
  sample scenes with concise metadata (titles + planned seconds ≈ 20 min,
  all labelled `not produced`), the demo banner, and explicit copy that no
  imagery/animation/audio/render exists. No thousands of words, no
  thousands of cards.

Legacy engineering/proof surfaces remain in the repository but are no
longer the default route, per the ticket's explicit allowance.

## Changed files (exact paths)

- `apps/studio/src/App.tsx` — default route now renders `ProductV1App`.
- `apps/studio/src/App.test.tsx` — rewritten to the 8 focused F1 tests.
- `apps/studio/src/styles.css` — appended the `.pv1-*` product-v1 styles
  (near-black surfaces, mint actions, quiet borders, 44px targets,
  1024px responsive rule, reduced-motion guard).
- `apps/studio/src/product-v1/ProductV1App.tsx` (new) — screen state machine.
- `apps/studio/src/product-v1/ProjectsHome.tsx` (new).
- `apps/studio/src/product-v1/CreateProject.tsx` (new).
- `apps/studio/src/product-v1/LocalStudioHandoff.tsx` (new).
- `apps/studio/src/product-v1/LongFormDemo.tsx` (new).
- `apps/studio/src/product-v1/beat-preview.ts` (new) — deterministic local
  beat/word/duration helpers (preview only, no shared contract).
- `apps/studio/src/product-v1/demo-project.ts` (new) — bounded Ollo demo
  metadata.
- `reports/agent-handoffs/2026-07-19-kimi-f1-projects-create-handback.md`
  (this file).
- `reports/agent-handoffs/2026-07-19-kimi-f1-projects-create/screenshots/**`.

No dependencies, manifests, schemas, engine, runtime, or asset files were
touched. Existing assets under `apps/studio/src/assets/**` were reused
read-only.

## Tests

New `apps/studio/src/App.test.tsx` — 8/8 pass:

1. Projects is the default creator entry, with the labelled local demo.
2. New project → Create and Back to projects navigation.
3. Script edits and `.txt` import update word count, duration, and beat
   preview (incl. import error state and "and N more" capping).
4. Grammar, art style, narration, format, and language choices update state
   (future options visibly disabled with reasons).
5. Empty script blocks first-cut navigation with a useful error.
6. A valid script opens the honest local Studio handoff that never claims
   media was generated or rendered.
7. The long-form Ollo demo opens visibly labelled `Local UI demo`.
8. Empty Projects state stays understandable when the demo is absent.

## Commands and results

- `corepack pnpm --filter @storystage/studio exec vitest run src/App.test.tsx`
  — 8/8 pass.
- `corepack pnpm --filter @storystage/studio typecheck` — clean.
- `corepack pnpm --filter @storystage/studio build` — clean.
- `corepack pnpm --filter @storystage/studio test` — 19 passed / 39 failed
  across 58 tests in 8 files. All 39 failures are in the two unchanged
  legacy proof suites (`src/Cv001CreatorStudio.test.tsx` 19,
  `src/Cv002DraftReview.test.tsx` 20), which render `<App />` and drive the
  decommissioned pre-F1 default journey (CV-001 Create → CV-002 draft
  review). The ticket explicitly authorizes `App.tsx` to stop using those
  legacy surfaces as the default route, and the allowed-files list does not
  permit editing those suites; they fail because the product entry changed
  exactly as instructed, not because of a defect in F1 code. Every suite
  that does not depend on the removed default route passes: `App.test.tsx`
  8/8, `KidsShowcaseStudio` 3/3, `Kvp001PlayerEvidence` 2/2,
  `AppErrorBoundary` 1/1, `host` 2/2, `candidate-source-review-boundary`
  1/1.
- Root `pnpm verify` — privacy checks, lint, and typecheck pass. The
  recursive test phase stops in `packages/asset-pipeline`, where the
  upstream `character-rig-preparation` test exceeded its hardcoded 5000 ms
  budget under machine load (5212 ms; passes in ~3.7 s isolated and on
  hosted CI) — unchanged upstream work, documented per the ticket's escape
  clause, and not modified. The two legacy studio suites documented above
  fail for the authorized default-route change. No backend packages were
  touched.

## Screenshots (actual running application)

Captured with headless Chromium (Playwright 1.62.0-alpha) against the real
Vite dev server at `http://127.0.0.1:5174/` serving this branch, on the
implementation commit. Capture command: `node capture-f1.cjs` (script not
committed; machine-readable results in `screenshots/capture-report.json`).

| File | URL/state | Viewport | SHA-256 |
| --- | --- | --- | --- |
| `screenshots/projects-1440x900.png` | `/` Projects | 1440×900 | `f6a12a097f621537c201c4b61ad9ed775e40fedefa2f774a22c0e5ea4a2a162d` |
| `screenshots/projects-1920x1080.png` | `/` Projects | 1920×1080 | `5ed1a115f0191b4772e9014604ac1617e63ce560300662550035b23be99f9c16` |
| `screenshots/create-1440x900.png` | `/` → New project, populated script + beat preview | 1440×900 | `5ca17f48bfb06cbc6fab242b83ac7a315c531e37390c9bceccd1503f129636cf` |
| `screenshots/create-1920x1080.png` | `/` → New project, populated script + beat preview | 1920×1080 | `dc91ba22802e2dabdf3ef394065edf19c277f5fe9ae400c6ff70f9d61723fe76` |
| `screenshots/handoff-1440x900.png` | `/` → Create first cut | 1440×900 | `84b4638726c8f8a4286cf805504c450876ad72999404bdd0e1dcecd99fd1985a` |

Browser console status: all five captures — no console errors, no warnings,
no page errors.

## Responsive and accessibility notes

- 1440×900 fits without page sprawl; 1920×1080 is composed around a 1220px
  content column rather than stretched. The Create action footer is sticky,
  so `Create first cut` is always reachable at 900px.
- A 1024px breakpoint stacks the Create layout and the demo hero; the grid
  cards reflow. Interactive targets are ≥44px (buttons, selects, beat
  cards).
- Semantic labels throughout (script textarea, selects, pressed states on
  choice cards), visible focus via the existing global focus-visible rule,
  keyboard-operable controls, truthful button text, and a reduced-motion
  guard. Error states use `role="alert"`.
- Error-boundary behavior is untouched (`AppErrorBoundary` suite passes).

## Known limitations

- The two legacy studio suites fail as documented above — the authorized
  consequence of changing the default route; retiring or porting them is an
  integration decision outside the F1 allowed files.
- The Studio handoff is intentionally minimal for F1; F2 replaces it with
  the long-form Studio shell. The Ollo demo holds metadata only.
- `.txt` is the only accepted import type; other text formats show the
  visible error by design.
- Duration estimate is an honest ~150 wpm approximation, labelled "about".
- Project name on the handoff derives from the first words of the script;
  there is no separate title field in this slice (the approved mock has
  none).

## PR

Draft PR: named in the PR body with the exact final SHAs. Target:
`product/v1`.

Stopping here per the brief: no F2 Studio shell, no backend work, no
generation/provider/persistence claims. Continuing the 15-minute read-only
inbox poll.
