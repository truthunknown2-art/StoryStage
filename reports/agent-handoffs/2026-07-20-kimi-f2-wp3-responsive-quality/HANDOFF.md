# Kimi F2-WP3 handback — responsive, keyboard, and visual-quality pass (inbox v44)

Task: `F2-WP3-RESPONSIVE-KEYBOARD-VISUAL-QUALITY`
Brief: `reports/agent-handoffs/2026-07-20-codex-kimi-f2-wp3-responsive-quality-v44.md`
Branch: `agent/kimi-f2-responsive-keyboard-wp3`
Draft PR target: `product/v1`
Tracking issue: https://github.com/truthunknown2-art/StoryStage/issues/43 (claimed)

## SHAs

- Exact product base: `4218da84437aa4e202a4d48d79899cf270e7cdde`
- Implementation head: `3d15046bebb7f785949831e3635950c139b370bb`
- Handback/evidence tip: named separately in the PR body.

## What was built

The accepted long-form Studio shell is now a visually coherent, responsive,
keyboard-operable workspace at 1920×1080, 1440×900, and 1024×800 — with the
exact WP2 navigation model and truthfulness preserved.

1. **Rail keyboard contract** (documented in `StudioShell.tsx` and visible as
   a rail hint): ArrowDown/ArrowRight select the next scene, ArrowUp/ArrowLeft
   the previous, Home/End the first/last. Navigation crosses sequence and act
   boundaries, clamps at first/last, **reveals collapsed ancestors of the
   target**, moves focus with the selection, and always drives the same
   authoritative scene state via one `selectScene` path used by rail,
   overview, and transport.
2. **Visible keyboard focus** on every interactive control (global
   focus-visible outline; browser-verified on the rail at 1920).
3. **Compact 1024×800 treatment** — deliberate ordered stacked regions
   (rail → board → inspector → overview) with a 2-up scene grid in the rail
   and a full-width `1fr` rail track at every size; no crushed columns, no
   horizontal overflow.
4. **Reduced-motion behavior** — selection/affordance transitions exist and
   are collapsed to 0.01ms under `prefers-reduced-motion`; browser-emulated
   proof that no Studio transition depends on animation for meaning.
5. All accepted behavior preserved: one selection + playhead, bounded
   two-beat rows, hidden-selection summary + Reveal, truth labels, disabled
   Preview/Export honesty, permanent local-demo disclosure.

## Changed files (exact paths)

- `apps/studio/src/product-v1/StudioShell.tsx` — `selectScene` single
  selection path, rail keyboard contract + focus follow, ancestor reveal on
  keyboard navigation, rail keyboard hint.
- `apps/studio/src/styles.css` — F2 section: rail `1fr` track, compact
  stacked regions with 2-up scene grid, selection transitions +
  reduced-motion guard, rail hint style.
- `apps/studio/src/App.test.tsx` — three new WP3 tests.
- `reports/agent-handoffs/2026-07-20-kimi-f2-wp3-responsive-quality/**` —
  this handback + screenshots + click-through report.

No other files touched: no manifests, dependencies, schemas, engine,
runtime, packages, legacy surfaces, or WP4 work.

## Tests

`apps/studio/src/App.test.tsx` — 22/22 pass; the three new WP3 tests:

1. Rail keyboard contract: ArrowDown/Up navigation with focus follow,
   sequence and act boundary crossing, Home/End jumps, first/last clamps,
   transport/board/overview agreement.
2. Keyboard navigation into a collapsed region reveals the target scene's
   ancestors and selects it.
3. Stylesheet gates: selection motion exists and is covered by the
   reduced-motion block; compact stacked layout rule exists; global
   focus-visible rule present.

## Commands and results

1. `pnpm --filter @storystage/studio test` — **22/22 pass** (suite total
   72/72 across the package incl. WP1/WP2 tests; root verify line below).
2. `pnpm --filter @storystage/studio typecheck` — clean.
3. `pnpm --filter @storystage/studio build` — clean.
4. `pnpm verify` — **exit 0** (third attempt; the first two stopped at the
   upstream `import-evidence-store` 5000 ms budget flake, documented below).

## Browser click-through (headless Chromium)

All checks passed (33/33) with zero console errors/warnings and zero page
errors on every viewport (machine-readable:
`screenshots/clickthrough-report.json`):

- **1920×1080**: keyboard drove selection Scene 1 → 5 across the act
  boundary; rail/overview/board agree; computed focus outline ≥2px on the
  rail; no horizontal overflow; all truth labels visible.
- **1440×900**: overview selection drives the board (Scene 6, readout
  `12:50–15:20 of 20:00`); no overflow.
- **1024×800**: layout stacks (`flex-direction: column`); rail, inspector,
  transport, overview all reachable; selection still drives the board; no
  overflow.
- **Reduced motion emulated**: rail selection transition computes to
  `1e-05s` (0.01ms) — disabled; no meaning depends on animation.

## Screenshots (actual app)

| File | Viewport | State | SHA-256 |
| --- | --- | --- | --- |
| `screenshots/wp3-1920x1080-keyboard-selected.png` | 1920×1080 | keyboard-driven Scene 5 selection with visible focus | `1b3c699ae450bcde6c056aa0fe7d52aa03d7d5d2f51c9329081c3b18fe59b900` |
| `screenshots/wp3-1440x900-scene-6-selected.png` | 1440×900 | overview-driven Scene 6 selection | `8f4b297e0b90ab4744c73c3d9dddd047a9747f54223ae048614e3f4330e5d12a` |
| `screenshots/wp3-1024x800-compact.png` | 1024×800 | compact stacked regions, Scene 3 selected | `ebf3b04e2f6230765db7c4210c45945842276b01d7f210d6f1ffc37cf9cb0c14` |

## Keyboard contract (documented)

- `ArrowDown` / `ArrowRight` — next scene (crosses sequence/act boundaries;
  clamps at last).
- `ArrowUp` / `ArrowLeft` — previous scene (clamps at first).
- `Home` / `End` — first / last scene.
- Any keyboard move reveals collapsed ancestors of the target and moves
  focus to the selected rail card; the same `selectScene` path serves mouse
  and keyboard on every surface.

## Control truth table

| Control | Truth |
| --- | --- |
| Rail scene cards | real selection (click + keyboard contract), `aria-current`, visible focus |
| Overview scene cards | real selection, same single state |
| Act/sequence headers | real expand/collapse, `aria-expanded` |
| Reveal (hidden selection) | real — re-expands hiding ancestors |
| Previous / Next scene | real; disabled at boundaries |
| Scene playhead | real local UI timing; labelled not-media-playback; resets on scene change |
| Preview / Export | disabled with adjacent plain-language reasons |
| Director fields / Apply | omitted — arrives in F3 |

## Known limitations

- Collapse state, playhead, and focus position are session-local.
- The compact rail is two-up at ≤1024px; per-scene beat rows stay in the
  selected card's column.
- Root `pnpm verify` passed on the third attempt (exit 0, studio 72/72).
  The first two attempts stopped at the upstream asset-pipeline
  `import-evidence-store` test exceeding its hardcoded 5000 ms budget under
  load (5086–5113 ms; the file passes isolated in 224 ms, 5/5) — unchanged
  upstream work, unmodified by this branch.
- The board shows one shared reference image for all scenes, labelled as
  reference art.

## Integration instructions

Fast-forward or squash-merge the draft PR into `product/v1`. The branch is
built on the exact base `4218da84437aa4e202a4d48d79899cf270e7cdde` and
touches only the files listed above.

Stopping on WAIT: no WP4, F3, or backend work. Continuing the 15-minute
read-only inbox poll.
