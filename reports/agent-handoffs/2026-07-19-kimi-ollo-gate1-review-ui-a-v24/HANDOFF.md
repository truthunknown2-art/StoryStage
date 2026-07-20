# Kimi handback — Ollo Gate 1 review UI A corrections (inbox v24)

Task: `KIMI-OLLO-GATE1-REVIEW-UI-A-CORRECTIONS`
Brief: `reports/agent-handoffs/2026-07-19-codex-kimi-ollo-gate1-review-ui-a-v24-corrections.md`
Branch: `agent/kimi-ollo-gate1-review-ui-a` (successor to rejected head
`a375209586758acc235a4ff0621cca6fd8760163`, draft PR #25)

Receipt note (inbox v26): this file was corrected documentation-only after the
audited UI tip — the SHA chain and delta counts below are the exact ones; the
earlier "branch tip"/"two-commit" wording was wrong and has been removed.

## SHAs

- Accepted upstream base: `c934021f9580fe200aef8e54573383e07eb24932`
- Provider base (PR #25 target, inbox v25 retarget): `92e026357269e759364c087aaf551b6328e8d9e2`
- Prior rejected head: `a375209586758acc235a4ff0621cca6fd8760163`
- Accepted implementation commit: `6c3e695029ba06ee4a78ee851f68699b8893b43d`
- Accepted screenshot/handback commit: `4efcd27d55e9e26d44b5ec2818c0ed7e1742bbf8`
- Immutable audited UI tip: `bdc3bb4e54d364d32219726e6df2067e9c75868a`

The correction delta from the rejected head through the audited UI tip is
three commits: the implementation commit, the screenshot/handback commit, and
the retarget-note commit. The later receipt commit that carries this
correction is documentation-only and is named separately in the PR body; no
branch-tip claim is made here.

## Corrections applied

1. **Cross-view issue selection.** `IssueStrip` now reports
   `(viewId, requirementId)`; `App` applies both in one batched update, so the
   stale-selection guard never sees a requirement foreign to the active view.
   Selected styling/aria now requires both view and requirement to match.
   Regression test begins on Front and selects issues in Profile left and
   Profile right (and back), asserting rail `aria-pressed`, stage image, and
   inspector heading all agree each time.
2. **Exact v8 joint truth.** `counts.joints` now carries the exact
   `packet/joint-evidence/` set counts: front 32, profile-left 29,
   profile-right 29. The false sockets-plus-attachments values (32/32/34) are
   gone from model, fixture comments, and tests. The joint/orbit tables were
   expanded from a 4-row subset to the complete `gap-orbit-measurements.json`
   sample sets (16/16/17) and are labelled separately
   (`Joint/orbit samples (N supplied)`). Tests pin both number sets exactly.
3. **Image/hash bindings.** Profile-right bindings corrected to the diagnostic
   receipt truth — Seams `3d28b985a696572d0e61db1c068ccf0a450005bf93c4571d9f9a3659f4041329`,
   Rest `e8b6d83e672b7612281eea1287773e65341197b6126b03e57e95df8eacdc6244`
   (the earlier fixture was captured against a mid-regeneration tree and had
   the Rest hash on Seams and the −15° hash on Rest). A dedicated test pins
   these exact digests and fails under the swap. `DiagnosticStage` now renders
   the active image's exact host-supplied URL, full SHA-256, and dimensions
   beneath the canvas; a test walks all nine tabs asserting the exact URL/hash
   pair from the supplied model. `RequirementInspector` gains a View evidence
   bindings section with the selected view's full measurement, effective
   proposal, and gate content hashes (no truncation anywhere; mask evidence
   hashes also render in full).
4. **Accessibility made real.** Diagnostic tabs are a roving-tabindex tablist:
   one tab stop, Left/Right/Home/End selection with focus follow,
   `aria-selected`, `aria-controls` → `tabpanel`, and the panel is labelled by
   the active tab. All compact targets (tabs, Fit/100% zoom, issue buttons)
   are ≥44 CSS px in the relevant axis. The reduced-motion media rule is
   asserted. A deterministic stylesheet test pins the 44px rules, the fixed
   footer rule, the scroll-region rule, the reduced-motion block, and
   focus-visible outlines; a behavior test proves the roving tabs.
5. **Layout repairs.** The authority footer is now `position: fixed` with
   reserved bottom padding on the app shell — visibly present in every capture
   without covering content. The orbit table wraps joint names at the
   role/socket boundary (no mid-word breaks), fits at desktop, and lives in a
   labelled, keyboard-focusable horizontal scroll region
   (`role="region"`, `tabIndex="0"`, aria-label describing horizontal
   scrolling) so the `+15°` column is always reachable.
6. **Exact handback.** This document names exact SHAs, the true three-commit
   delta, every changed file by path, exact verification results, screenshot
   hashes, and a truthful accessibility checklist.

## Changed files (exact paths)

- `apps/registration-review/src/App.tsx` — atomic cross-view issue selection.
- `apps/registration-review/src/components/IssueStrip.tsx` — `(viewId,
  requirementId)` selection contract; selected state requires both.
- `apps/registration-review/src/components/DiagnosticStage.tsx` — roving
  tabs, tab/tabpanel wiring, exact URL/SHA-256/dimension binding strip.
- `apps/registration-review/src/components/RequirementInspector.tsx` — View
  evidence bindings (full measurement/proposal/gate hashes), full mask
  hashes, complete orbit sample set, joint-name wrap fix, labelled scroll
  region.
- `apps/registration-review/src/fixture-model.ts` — joint-evidence counts
  32/29/29; corrected profile-right Seams/Rest SHA-256 bindings; complete
  16/16/17 gap-orbit sample sets; corrected header comments.
- `apps/registration-review/src/presentation-model.ts` — `counts.joints`
  documented as exact joint-evidence set counts.
- `apps/registration-review/src/registration-review.css` — 44px tab/zoom
  targets, fixed authority footer + reserved padding, `.rr-joints-scroll`,
  `.rr-joint-socket`, `.rr-stage-binding*`, `.rr-bindings`, `.rr-hash-full`.
- `apps/registration-review/src/App.test.tsx` — updated count assertions;
  new regressions for cross-view selection, joint truth pins, per-tab exact
  URL/hash pairs, profile-right swap pins, view bindings exposure, roving
  tabs, and the stylesheet contract.
- `reports/agent-handoffs/2026-07-19-kimi-ollo-gate1-review-ui-a-v24/HANDOFF.md`
  — this file.
- `reports/agent-handoffs/2026-07-19-kimi-ollo-gate1-review-ui-a-v24/screenshots/desktop-1536x960-front.png`
- `reports/agent-handoffs/2026-07-19-kimi-ollo-gate1-review-ui-a-v24/screenshots/narrow-1100x760-front.png`
- `reports/agent-handoffs/2026-07-19-kimi-ollo-gate1-review-ui-a-v24/screenshots/desktop-1536x960-profile-right-orbit.png`
- `reports/agent-handoffs/2026-07-19-kimi-ollo-gate1-review-ui-a-v24/screenshots/empty-1536x960.png`
- `reports/agent-handoffs/2026-07-19-kimi-ollo-gate1-review-ui-a-v24/screenshots/capture-report.json`

No other files changed. Nothing under `director/`, continuity, compiler, or
contract paths; no Studio/Player imports; the ignored v8 artifact tree was
read locally only.

## Commands and results

- `corepack pnpm --filter @storystage/registration-review test` — 21/21 pass
  (19 app tests incl. the new regressions, 2 boundary tests).
- `corepack pnpm --filter @storystage/registration-review build`
  (`tsc --noEmit && vite build`) — clean; 226.83 kB JS / 10.21 kB CSS.
- Root `pnpm verify` — run four times on this machine. Privacy checks, lint,
  typecheck, and every package test suite pass, including
  `@storystage/registration-review` 21/21. One upstream test,
  `packages/asset-pipeline/src/candidate-rig-exact-attachment-measurement.test.ts`
  › "reopens all six exact atlases and reproduces typed fail-closed geometry
  outcomes", fails intermittently on THIS machine by exceeding its own
  hardcoded 120000 ms per-test timeout (observed 122.6–131.5 s across runs;
  it passes isolated at 117.9 s). One further upstream flake,
  `character-rig-preparation.test.ts`, exceeded its 5000 ms budget twice
  under parallel load and passes in 3.7 s isolated. Both tests are outside
  this slice's boundary, are unmodified by this branch, and pass or fail
  identically on the unchanged base — this is a machine-performance margin,
  not a regression. They were not touched because the slice may not modify
  upstream measurement tests or their timeouts.

## Screenshots (UI behavior demonstration — NOT accepted rig evidence)

Populated captures show the explicit `TEST FIXTURE — NOT PRODUCTION EVIDENCE`
banner and the fixed authority footer. Character imagery is the local
unapproved v8 diagnostic evidence rendered by the test fixture.

| File | Viewport | State | SHA-256 |
| --- | --- | --- | --- |
| `screenshots/desktop-1536x960-front.png` | 1536×960 | fixture, front, Original tab; footer visible | `b9df2b2ef127f5aa093da6c41f966817bdbe46b42193112598c3bbafb7980b58` |
| `screenshots/narrow-1100x760-front.png` | 1100×760 | fixture, front, Original tab; tabs wrap; footer visible | `fc00d61b23c8ef3c330044774cc77bd30cbee41d78406a34552d6adad0287a22` |
| `screenshots/desktop-1536x960-profile-right-orbit.png` | 1536×960 | fixture, profile-right selected via rail, scrolled to the orbit table; all three angle columns reachable; footer visible | `818e73d183c0aefdd3eea76fbda19c21d8e949eef54c2b5e8599e008e946e663` |
| `screenshots/empty-1536x960.png` | 1536×960 | empty host (`?fixture=empty`) | `800938e0791f7be7b3acb6de70a1b0299c95387894189f8999950c303509938b` |

Captured with headless Chromium (Playwright 1.62.0-alpha) against the dev
server with `KIMI_RR_EVIDENCE_DIR` pointing at the read-only v8 tree.
Machine-readable copy: `screenshots/capture-report.json`.

### Browser console status

All four captures: no console errors, no console warnings, no page errors.

## Accessibility checklist (implementation + test evidence)

- Roving tabs: one tab stop; Arrow/Home/End selection; focus follows
  selection — proven by `implements roving diagnostic tabs with arrow-key
  selection and a labelled panel`.
- tab/tabpanel: every tab carries `aria-controls` → the single panel; the
  panel carries `aria-labelledby` → the active tab — proven by the same test.
- Target sizes: tabs, zoom buttons, and issue buttons ≥44px — pinned by
  `enforces the 44px target contract, fixed footer, and reduced-motion rule
  in the stylesheet`.
- Reduced motion: `@media (prefers-reduced-motion: reduce)` collapses
  animation/transition durations and smooth scrolling — pinned by the same
  stylesheet test.
- Focus visibility: global mint `:focus-visible` outline — pinned by the
  stylesheet test; the orbit scroll region is keyboard-focusable
  (`tabIndex="0"`) with a descriptive label.
- Locked authority labels and fixed footer visible at 1536px and 1100px —
  asserted by `keeps locked authority labels visible in the top bar and
  footer` and visible in both populated captures.

## Known limitations

- Local root `pnpm verify` is green except the two upstream asset-pipeline
  timeouts documented above (machine-bound; isolated passes; untouched by
  this branch). Hosted verification on the pushed successor is the deciding
  gate per the brief.
- Slice A remains read-only: no patch authoring, approval, motion, ordinary
  Player, export, render, publish, or production authority. Locked labels
  unchanged.
- The orbit table's horizontal scroll region is exercised programmatically
  and via keyboard focus; at 1536px the table fits without scrolling, at
  1100px scrolling is required for the last column (by design, labelled).
- The `?fixture=empty` selector exists only on the dev-fixture entry point.
- Screenshots embed renders of the local unapproved diagnostic imagery for UI
  verification; they are marked test-fixture UI evidence, not rig evidence.
- The brief's original quoted counts (32/29/29) are now the implemented
  truth; the earlier handback's 32/32/34 correction note is superseded.

## Merge instructions

PR #25 was retargeted by Codex (inbox v25) and now drafts into
`agent/kcast001-provider-neutral-rig` at accepted merge
`92e026357269e759364c087aaf551b6328e8d9e2`. Fast-forward or squash-merge the
draft there. The UI/evidence delta adds three commits on top of the rejected
head `a3752095…` (implementation, screenshot/handback, retarget note); the
branch still touches only `apps/registration-review/`, `pnpm-lock.yaml`, and
`reports/agent-handoffs/`. If `pnpm-lock.yaml` drifted upstream, regenerate
with `corepack pnpm install --lockfile-only` after merge.

Stopping here per the brief: no patch authoring, no Player, no approval,
motion, export, render, publish, or production authority exercised.
