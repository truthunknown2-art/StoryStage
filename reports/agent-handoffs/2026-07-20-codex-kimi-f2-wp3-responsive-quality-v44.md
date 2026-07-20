# Kimi F2-WP3 — responsive, keyboard, and visual-quality pass

## Authority

- Active phase: **F2 — Long-form Studio shell**
- Active package: **F2-WP3 — Responsive, keyboard, and visual-quality pass**
- Exact verified product base:
  `4218da84437aa4e202a4d48d79899cf270e7cdde`
- Required branch: `agent/kimi-f2-responsive-keyboard-wp3`
- Tracking issue: `https://github.com/truthunknown2-art/StoryStage/issues/43`
- PR target: `product/v1`
- Owner: Kimi CLI
- Reviewer/integrator: Codex

Create the required branch from the exact product base. Do not merge, rebase,
replace history, or modify another agent's branch.

## One visible deliverable

Turn the accepted long-form Studio shell into a visually coherent, responsive,
keyboard-operable workspace at 1920×1080, 1440×900, and 1024×800. Preserve the
exact WP2 navigation model and truthfulness while making the rail, scene board,
inspector, transport, and episode overview readable at every required size.

## Primary invariant

The complete selected-scene navigation workflow remains visible,
understandable, and operable without horizontal page overflow at all three
required viewports. Responsive layout and keyboard input must drive the same
authoritative scene state accepted in WP2.

## Allowed files

- `apps/studio/src/product-v1/**`
- Product-v1/F2 section only in `apps/studio/src/styles.css`
- focused Product v1 tests in `apps/studio/src/App.test.tsx` or one adjacent
  Product v1 test
- `reports/agent-handoffs/2026-07-20-kimi-f2-wp3-responsive-quality/**`
- one exact WP3 handback under `reports/agent-handoffs/`

Use only accepted local demo data and existing approved reference assets.

## Required behavior

1. Tune hierarchy, spacing, typography, and visual weight toward the approved
   Studio mockup without redesigning the product or adding capabilities.
2. Preserve one authoritative selected scene and scene-relative playhead across
   rail, scene board, transport, selected-scene summary, and episode overview.
3. Add clearly visible keyboard focus for every interactive Product v1 Studio
   control.
4. Add keyboard scene navigation in the scene rail using a small documented key
   contract. It must cross sequence and act boundaries, respect first/last
   boundaries, reveal or preserve understandable collapsed selection, and
   update the same authoritative state.
5. At 1024×800, use the simplest deliberate compact treatment—drawers or
   ordered stacked regions—for rail and inspector. Do not leave three crushed
   desktop columns.
6. Keep transport, selected-scene identity, local-timing disclosure, and
   episode overview reachable at compact width.
7. Add reduced-motion behavior through `prefers-reduced-motion` for Product v1
   Studio transitions or motion.
8. Preserve semantic expanded/current/selected state, permanent local-demo
   disclosure, disabled Preview/Export honesty, and all WP2 bounded-DOM
   behavior.
9. No horizontal page overflow, overlap, clipped required controls, or
   unreachable content at 1920×1080, 1440×900, or 1024×800.

## Explicit non-goals

No new product feature, Director authoring, F3 inspector behavior, media
playback, animation polish, generation, persistence, audio, waveform, timeline
editing, drag/trim, rendering, export, backend contract, shared schema,
dependency, legacy-surface change, or backend product work.

Do not begin WP4. Do not make Preview or Export pretend to work.

## Required verification

1. `pnpm --filter @storystage/studio test`
2. `pnpm --filter @storystage/studio typecheck`
3. `pnpm --filter @storystage/studio build`
4. `pnpm verify`
5. Focused tests cover the complete keyboard scene-navigation contract,
   first/last boundaries, act/sequence crossing, selection synchronization,
   collapse/reveal preservation, and the existing exactly-two-beat-row
   invariant.
6. Browser click-through at 1920×1080, 1440×900, and 1024×800 proves selection
   visibility, keyboard focus/navigation, control reachability, no overlap, no
   horizontal page overflow, and the permanent truth labels.
7. Actual screenshots at all three sizes, including a noninitial selected scene
   and the compact layout.
8. Zero page errors and zero console errors/warnings during the capture path.
9. With reduced motion emulated, no Product v1 Studio transition depends on
   animation for meaning.

## Completion and handback

Claim issue #43, implement only WP3, commit and push one immutable successor,
open a draft PR to `product/v1`, and report exact SHA, changed files,
commands/results, keyboard contract, screenshot paths and SHA-256 hashes,
responsive measurements, console/page errors, known limitations, and
integration instructions. Then stop on `WAIT`. WP4, F3, and backend work remain
unauthorized.
