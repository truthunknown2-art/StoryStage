# Kimi handback — Ollo Gate 1 registration review UI A (inbox v23)

Task: `KIMI-OLLO-GATE1-REVIEW-UI-A`
Brief: `reports/agent-handoffs/2026-07-19-codex-kimi-ollo-gate1-review-ui-a-v23.md`
Branch: `agent/kimi-ollo-gate1-review-ui-a`
Draft PR base: `agent/kcast001i-registration-measurement-v2`

## SHAs

- Upstream base (exact Gate 1 v8 head): `c934021f9580fe200aef8e54573383e07eb24932`
- Implementation commit (app + lockfile): `f6bc323ee3dfd76d5f928494e2b9defb9a613027`
- Branch head (this handback + screenshots): recorded as the branch tip at push time; see PR description.

## What was built

Standalone private app `apps/registration-review` ("Private Rig Lab") — a
read-only registration-review surface for the Ollo Candidate I Gate 1 v8
diagnostic. It is outside ordinary Studio/Player: no Studio route, no Player
import, no network/filesystem/provider access in the browser, and no patch,
approval, motion, capability, export, or production state anywhere in the
package.

- `src/presentation-model.ts` — local, read-only presentation model (lossless
  projection of host-validated artifacts: immutable content hashes, nullable
  evidence image references, joint/orbit samples, mask summaries, unresolved
  requirements).
- `src/host.ts` — narrow host adapter contract. Two hosts: the empty host
  (renders the polished empty state `No verified registration artifact
  loaded.`) and the explicit test-fixture host.
- `src/fixture-model.ts` — development/test fixture marked `isTestFixture`,
  which forces the persistent `TEST FIXTURE — NOT PRODUCTION EVIDENCE` banner.
  All values are the real v8 diagnostic values: aggregate hash
  `a90d1565b1fa4966d63193f56af2ccd8e44d1cbe4078a134e4e554ddfe6299a1`, per-view
  measurement/effective/gate hashes, the eight real unresolved requirements
  with their real reason text, real joint/orbit gap samples, and real mask
  summaries. Image references point at the read-only local artifact tree
  (served by a dev-only Vite middleware gated on `KIMI_RR_EVIDENCE_DIR`) with
  the real per-PNG SHA-256 digests and 1920×1080 dimensions.
- UI: top bar (StoryStage mark + Private Rig Lab, candidate, aggregate hash
  affordance, `Needs registration correction`, `Unapproved evidence`,
  `Motion locked`), view rail (three views, real model-derived counts,
  keyboard selection), diagnostic stage (9 real tabs: Original, Seams, Rest,
  −15°, 0°, +15°, Gap/orbit, Near/far, Masked; Fit/100% zoom that genuinely
  rescales the canvas; explicit unavailable state for missing images),
  requirement inspector (IDs, roles, topology edge, status, evidence basis,
  proposal state, joint/orbit table, mask summary), issue strip (8 unresolved
  grouped by view and type, selection focuses inspector evidence) with the
  fixed authority footer `Candidate evidence only · no runtime node · no
  motion channel · no production binding`.

### Data corrections vs the brief text

The brief's quoted counts (32/29/29 joints) are stale relative to the real v8
tree. Real v8 values are used: front 29 components / 32 joints / 3 unresolved;
profile-left 29 / 32 / 3; profile-right 29 / 34 / 2 (joints = sockets +
attachments per view: 16+16, 16+16, 17+17). Counts are rendered from the
supplied model, never hard-coded in component copy.

## Changed files

- `apps/registration-review/index.html`
- `apps/registration-review/package.json`
- `apps/registration-review/tsconfig.json`
- `apps/registration-review/vite.config.ts` (dev-only `/evidence/` static
  middleware, active only when `KIMI_RR_EVIDENCE_DIR` is set; port 5175)
- `apps/registration-review/src/App.tsx`
- `apps/registration-review/src/App.test.tsx`
- `apps/registration-review/src/boundary.test.ts`
- `apps/registration-review/src/components/DiagnosticStage.tsx`
- `apps/registration-review/src/components/EmptyState.tsx`
- `apps/registration-review/src/components/IssueStrip.tsx`
- `apps/registration-review/src/components/RequirementInspector.tsx`
- `apps/registration-review/src/components/TopBar.tsx`
- `apps/registration-review/src/components/ViewRail.tsx`
- `apps/registration-review/src/fixture-model.ts`
- `apps/registration-review/src/host.ts`
- `apps/registration-review/src/main.tsx` (dev-fixture entry;
  `?fixture=empty` selects the empty host variant)
- `apps/registration-review/src/presentation-model.ts`
- `apps/registration-review/src/registration-review.css`
- `apps/registration-review/src/test/setup.ts`
- `pnpm-lock.yaml` (new package + `lucide-react@1.24.0` dep, same version as
  apps/studio)
- `reports/agent-handoffs/2026-07-19-kimi-ollo-gate1-review-ui-a/**`
  (this handback + screenshots + capture report)

No files under `director/`, continuity, compiler, or contract paths were
touched. The ignored v8 artifact tree was read locally only; no artifact bytes
were copied into Git.

## Commands and results

- `corepack pnpm --filter @storystage/registration-review test` — 14/14 pass
  (12 truth tests in `App.test.tsx`, 2 boundary tests in `boundary.test.ts`
  scanning imports in both directions).
- `corepack pnpm --filter @storystage/registration-review typecheck` — 0 errors.
- `corepack pnpm --filter @storystage/registration-review build` — success
  (`tsc --noEmit && vite build`; 213.97 kB JS / 9.41 kB CSS).
- Root `pnpm verify` (lint + typecheck + all package tests, run with pnpm
  11.9.0 via corepack shims) — exit 0, clean pass on the whole monorepo
  including the new package.

## Screenshots (UI behavior demonstration — NOT accepted rig evidence)

All three screenshots show the explicit `TEST FIXTURE — NOT PRODUCTION
EVIDENCE` banner state (fixture host) or the empty host. They demonstrate UI
behavior only; the character imagery rendered inside the stage is the local
unapproved v8 diagnostic evidence and remains unapproved.

| File | Viewport | State | SHA-256 |
| --- | --- | --- | --- |
| `screenshots/desktop-1536x960-front.png` | 1536×960 | fixture host, front view, Original tab | `fad7d04a34bd91138822ae7313656e310021fd65b1d822adbda43a6ca5309858` |
| `screenshots/narrow-1100x760-front.png` | 1100×760 | fixture host, front view, Original tab, tabs wrap | `6c61a545cac5a7b15edbc9ca5618beeb7a4f212ff8d4d9e213c00edd51160afa` |
| `screenshots/empty-1536x960.png` | 1536×960 | empty host (`?fixture=empty`) | `95f003bb14b18fbf82c6a51707235404cb53b71805186760994f6997c62dd300` |

Captured with headless Chromium (Playwright 1.62.0-alpha) against the dev
server with `KIMI_RR_EVIDENCE_DIR` pointing at the read-only v8 artifact tree.
Machine-readable copy: `screenshots/capture-report.json`.

### Browser console status

- desktop 1536×960: no console errors, no warnings, no page errors.
- narrow 1100×760: no console errors, no warnings, no page errors.
- empty 1536×960: no console errors, no warnings, no page errors.

## Accessibility checks

- Keyboard: view rail cards are real buttons with arrow-key and Tab
  navigation; diagnostic tabs are a real `tablist` with roving selection;
  issue strip items are real buttons. Covered by
  `supports keyboard navigation across the view rail` and tab/issue tests.
- Labels: stage canvas is an `img` with per-tab alt text; tabs carry
  `aria-selected`; the zoom control is a labelled segmented control; the issue
  strip is a labelled `region`; unavailable images render a text state, never
  a bare icon.
- Locked authority labels (`Unapproved evidence`, `Motion locked`, authority
  footer) remain visible at 1536px and 1100px — asserted by
  `keeps locked authority labels visible in the top bar and footer` and
  confirmed in both screenshots.
- Reduced motion: a `prefers-reduced-motion: reduce` block collapses all
  animation/transition durations and scroll behavior.
- Focus visibility: a global mint `:focus-visible` outline; interactive
  controls carry explicit minimum target heights (44px rail/tab/zoom targets,
  34px compact chips).

## Control-truth table

| Control | Truth |
| --- | --- |
| View rail cards (Front / Profile left / Profile right) | read-only-real — switch the presented view from the supplied model |
| Diagnostic tabs (9) | read-only-real — switch among host-supplied exact image references only; missing reference renders the explicit unavailable state |
| Fit / 100% zoom | read-only-real — genuinely toggles stage scaling between fit-to-panel and native pixels with scroll |
| Issue strip items (8) | read-only-real — focus the exact corresponding inspector evidence |
| Aggregate hash affordance | read-only-real — displays the immutable v8 aggregate hash (truncated chip, full hash in tooltip) |
| Evidence image (missing reference) | intentionally unavailable — explicit `Evidence unavailable` state naming the image kind; never a proxy drawing |
| Scarf mask derivation | intentionally unavailable — no derivation entries exist in v8; inspector shows the mask summary and the alpha-indistinguishable blocker reason |
| Approve / Export / Render / Publish | omitted — Slice A has no approval, export, render, or publish authority (asserted by test) |
| Editable coordinates / patch authoring | omitted — Slice A authors nothing |

## Known limitations

- Slice A is read-only: no patch authoring, no approval, no motion, no Player,
  no production binding. The staged imagery is unapproved diagnostic evidence.
- The evidence middleware is development-only and inert unless
  `KIMI_RR_EVIDENCE_DIR` is set; production hosting must supply exact image
  URLs through the host adapter.
- The `?fixture=empty` selector exists only on the dev-fixture entry point;
  real hosts construct the empty host directly.
- The brief's quoted joint counts (32/29/29) are stale; the fixture carries
  the real v8 values (32/32/34) as documented above.
- Screenshots embed renders of the local unapproved diagnostic imagery for UI
  verification; they are marked test-fixture UI evidence and are not rig
  evidence.

## Merge instructions

Fast-forward or squash-merge the draft PR into
`agent/kcast001i-registration-measurement-v2`. The branch is a single commit
on top of exact base `c934021f9580fe200aef8e54573383e07eb24932`; it touches
only `apps/registration-review/`, `pnpm-lock.yaml`, and this handback
directory, so no conflicts with the measurement lane are expected. If
`pnpm-lock.yaml` has moved upstream, regenerate with
`corepack pnpm install --lockfile-only` after merge.

Stopping here per the brief: no patch authoring, no Player, no approval,
motion, or production authority exercised.
