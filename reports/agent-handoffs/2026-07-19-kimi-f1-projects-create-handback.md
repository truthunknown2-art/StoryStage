# Kimi F1 handback — Projects + Create (inbox v33 acceptance successor)

Task: `F1-PROJECTS-CREATE-ACCEPTANCE-CORRECTIONS`
Brief: `reports/agent-handoffs/2026-07-20-codex-kimi-f1-acceptance-corrections-v33.md`
Branch: `agent/kimi-ui-v2`
Draft PR: https://github.com/truthunknown2-art/StoryStage/pull/33
Task issue: https://github.com/truthunknown2-art/StoryStage/issues/34 (claimed)

## SHAs

- Product-plan base: `9f3d6fac522f99b693c163c822334076ee9584bd`
- Plan revision cited by the brief: `product/v1@e759c54d513b628ff04b4d7782cb1522b7beec85`
- Rejected candidate: `00299eb351f24a1cf1be5b34cb08f6c77c039af5`
- Implementation successor (this handback cycle): `5c478fcdb106909c460ef26f21899761f7bbf7b1`
- Evidence/handback commit: named separately in the PR body (two-commit
  protocol, no self-referential branch-tip claim).

## v33 corrections applied

1. **Legacy implementation preserved, Product v1 stays default.**
   `apps/studio/src/App.tsx` is restored to the accepted base version — all
   imports, helpers, and the exported `LegacyApp` are byte-identical to
   `9f3d6fa` — with two additive changes only: the `ProductV1App` import, and
   the final exported `App` now rendering `ProductV1App` as the default
   route. The complete pre-F1 journey (creator app + engineering app, with
   their original bridge) is preserved as the exported `LegacyCreatorApp`
   wrapper. The two legacy proof harnesses changed exactly one import line
   each to `import { LegacyCreatorApp as App } from "./App";`; no assertion,
   fixture, or product logic was touched. **Deviation note (flagged
   explicitly):** the brief suggested `LegacyApp as App`; that component
   renders the engineering home, while the suites assert the creator journey
   that the old default route rendered (`Cv001CreatorApp`). `LegacyCreatorApp`
   preserves that exact journey byte-for-byte; with it the suites pass 41/41.
   The v31 `App.test.tsx` continues to exercise the Product v1 default
   unchanged.
2. **1440×900 Create controls fully usable.** The Voice & format selects now
   lay out three-up at desktop (stacking at ≤1024px), so the Language control
   and its value are never covered by the sticky action footer. Verified by
   the recaptured screenshots and by the 1024px browser inspection below.
3. **Normal-text contrast gate.** Required-information text in the pv1
   surfaces no longer uses `--faint` (#58635f, ≈2.90:1 on `--panel`). A
   scoped `--pv1-faint: #8a9792` token now covers the word/duration count,
   choice descriptions, select labels, handoff facts, beat/muted/scene
   metadata, and the WH placeholder monogram. Documented pairs (computed):
   `#8a9792` on `--panel #121718` ≈ 5.9:1; `#8a9792` on body `#0c1011` ≈
   6.2:1 — both above the 4.5:1 floor. Hierarchy preserved: pv1-faint
   (#8a9792) < muted (#8d9995) < ink (#e9efec). Legacy surfaces keep their
   original tokens untouched.
4. **Evidence replaced; handback truthful.** All five screenshots and
   `capture-report.json` were recaptured against the committed successor.
   This handback is labelled v33 and no longer records failing deterministic
   tests as a limitation: the full studio suite is green (58/58) and root
   `pnpm verify` exits 0.

## What was built (F1, accepted scope — unchanged from v31 except as noted)

The first understandable slice of the real creator journey — **Projects →
Create → honest local Studio handoff** — as the default route of
`apps/studio`. Frontend-only, bounded local UI state, production services
disconnected and labelled honestly throughout.

- **Projects (default entry).** Product header, real **New project** action,
  labelled local Ollo demo card (`The Storylight in the Little Wood` — cast
  reference art, Kids Adventure · Storybook Cutout · ~20 min · `Local UI
  demo`), understandable empty state, permanent local-demo banner.
- **Create.** Mock hierarchy: script area with live word count and honest
  duration, working `.txt` import with visible error state, Kids Adventure /
  Weird History grammar cards, art-style cards using the existing reference
  assets, narration / 16:9 / language controls (future options disabled with
  reasons), deterministic natural-beats preview with honest "and N more",
  validated **Create first cut**, **Back to projects**, sticky action
  footer.
- **Honest local Studio handoff.** Name, choices, detected beats, permanent
  banner, explicit `No imagery, animation, audio, or render was generated`,
  working Back/Edit. F2 replaces it later.
- **Long-form Ollo demo.** Bounded 8-scene metadata view (~20 min, all
  `not produced`), demo banner visible.
- Legacy engineering/proof surfaces remain in the repository, preserved and
  routed off the default (see correction 1).

## Changed files (exact paths, this successor)

- `apps/studio/src/App.tsx` — restored from base; `ProductV1App` import;
  default route renders `ProductV1App`; `LegacyCreatorApp` export preserves
  the old journey.
- `apps/studio/src/Cv001CreatorStudio.test.tsx` — import line only.
- `apps/studio/src/Cv002DraftReview.test.tsx` — import line only.
- `apps/studio/src/styles.css` — three-up `.pv1-selects` layout with ≤1024px
  stacking; scoped `--pv1-faint` token and its seven required-text uses.
- `reports/agent-handoffs/2026-07-19-kimi-f1-projects-create-handback.md` —
  this file.
- `reports/agent-handoffs/2026-07-19-kimi-f1-projects-create/screenshots/**`
  — recaptured evidence.

(v31 implementation files under `apps/studio/src/product-v1/**` are
unchanged by this successor except where already landed.)

## Commands and results

- `pnpm --filter @storystage/studio test` — **58/58 pass** (8 F1 + 20
  CV-001 + 21 CV-002 + 3 KidsShowcase + 2 Kvp001 + 1 AppErrorBoundary +
  2 host + 1 boundary).
- `pnpm --filter @storystage/studio typecheck` — clean.
- `pnpm --filter @storystage/studio build` — clean.
- `pnpm verify` — **exit 0** (privacy checks, lint, typecheck, and all
  workspace test suites, including the studio 58/58).

## Screenshots (actual running application, recaptured post-successor)

Captured with headless Chromium (Playwright 1.62.0-alpha) against the real
Vite dev server at `http://127.0.0.1:5174/` serving committed successor
`5c478fcdb106909c460ef26f21899761f7bbf7b1`. Machine-readable results:
`screenshots/capture-report.json`.

| File | URL/state | Viewport | SHA-256 |
| --- | --- | --- | --- |
| `screenshots/projects-1440x900.png` | `/` Projects | 1440×900 | `f6a12a097f621537c201c4b61ad9ed775e40fedefa2f774a22c0e5ea4a2a162d` |
| `screenshots/projects-1920x1080.png` | `/` Projects | 1920×1080 | `5ed1a115f0191b4772e9014604ac1617e63ce560300662550035b23be99f9c16` |
| `screenshots/create-1440x900.png` | `/` → New project, populated script + beat preview; Language and action footer unobscured | 1440×900 | `e6124398b75bdec409b9e10a6068bba7297acf5a2fc25d51e5bd6c1db3c8b42e` |
| `screenshots/create-1920x1080.png` | `/` → New project, populated script + beat preview | 1920×1080 | `a609d26a500f8c600aa60f177bc7ea5ede7a781d42481573a2d4206f6fea9367` |
| `screenshots/handoff-1440x900.png` | `/` → Create first cut | 1440×900 | `5f7d73c3d32c614066f0291c5e002a7f42c80aeb277c5141a679e17b0b930960` |

Browser console status: all five captures — no console errors, no warnings,
no page errors.

**1024px responsive inspection (noncommitted, per the brief):** headless
Chromium at 1024×800 against the same URL — Projects entry and New project
visible; Create layout stacks to one column; Language select visible; the
action footer does not cover Language (`footerCoversLanguage: false`); no
horizontal overflow; no page errors.

## Accessibility and responsive notes

- 1440×900 fits with the Language row fully clear of the sticky footer;
  1920×1080 composed around the content column; ≤1024px stacks.
- Interactive targets ≥44px (buttons, selects, beat cards); choice cards use
  `aria-pressed`; selects carry explicit labels; disabled future options
  state their reason; script errors use `role="alert"`.
- Required text meets the 4.5:1 gate (documented pairs above); visible
  focus and the reduced-motion guard are unchanged.

## Known limitations

- The Studio handoff is intentionally minimal for F1; F2 replaces it with
  the long-form Studio shell. The Ollo demo holds metadata only.
- `.txt` is the only accepted import type by design; other types show the
  visible error.
- Duration estimate is an honest ~150 wpm approximation, labelled "about".
- Project name on the handoff derives from the script's first words (the
  approved mock has no separate title field).
- Root verify's earlier asset-pipeline timeout-margin flakes (documented in
  prior lanes) did not recur in this successor's run (exit 0).

## PR and issue

- Draft PR #33: https://github.com/truthunknown2-art/StoryStage/pull/33
  (body updated for this successor).
- Issue #34: https://github.com/truthunknown2-art/StoryStage/issues/34
  (claimed by Kimi before starting this cycle).

Stopping here per the brief: no F2, no backend work. Continuing the
15-minute read-only inbox poll.
