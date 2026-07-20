# Kimi F2-WP2 handback — long-form navigation and bounded rendering (inbox v41)

Task: `F2-WP2-LONG-FORM-NAVIGATION`
Brief: `reports/agent-handoffs/2026-07-20-codex-kimi-f2-wp2-navigation-v41.md`
Package: `docs/plans/milestone-2.md` → F2-WP2
Branch: `agent/kimi-f2-longform-navigation-wp2`
Draft PR target: `product/v1`
Tracking issue: https://github.com/truthunknown2-art/StoryStage/issues/41 (claimed)

## SHAs

- Exact base: `product/v1@1982407c201d68ce78c98a5f530cda348a15c8ed`
- Implementation head: `f3be388387e7729a452e167cc2f6486f2e77c3c3`
- Handback/evidence tip: named separately in the PR body.

## What was built

The accepted Studio shell is now a truthful long-form navigation workspace.
One authoritative scene state drives everything; the selected scene and its
scene-relative playhead survive every act/sequence expansion and collapse;
the DOM never renders beat rows for more than the selected scene.

1. **Act and sequence expand/collapse** — every group header is a real
   button with `aria-expanded` and a direction chevron.
2. **Bounded beat rendering** — beat rows appear only beneath the selected
   scene (in the rail) and in the board's beat card. Every beat row carries
   `data-beat-for="<scene-id>"`; a test proves every rendered row belongs to
   the selected scene and the count never exceeds it.
3. **Hidden-selection summary + reveal** — collapsing the selected scene's
   act or sequence preserves the selection (board, transport, overview keep
   it) and shows an explicit summary inside the collapsed group:
   `Selected scene N · <title>` plus a **Reveal** action that re-expands
   exactly the hiding ancestors.
4. **Scene-relative playhead** — a labelled slider per scene
   (`local UI timing — not media playback`) with an accessible name that
   includes the scene title and a numeric `M:SS / M:SS` readout. Moving it
   is honest local UI state only.
5. **Deterministic playhead reset** — changing scenes from any surface
   (rail, overview, previous/next) resets the playhead to `0:00`. This is
   the chosen clamp/reset behavior and is encoded in tests.
6. All WP1 truth labels remain: reference-art board label, honest no-media
   note, layout-demo disclosure on the created-project route, permanent
   local-demo banner, Director-arrives-in-F3 explanation, disabled
   Preview/Export with plain-language reasons.

## Changed files (exact paths)

- `apps/studio/src/product-v1/StudioShell.tsx` — collapse state, group
  toggles, bounded rail beats, hidden-selection summaries, reveal action,
  scene-relative playhead with deterministic reset.
- `apps/studio/src/styles.css` — F2 section: group toggles, hidden-selection
  summary, rail beats, playhead styles.
- `apps/studio/src/App.test.tsx` — five new F2-WP2 tests; one disabled-Preview
  reason assertion updated for the WP2 wording.
- `reports/agent-handoffs/2026-07-20-kimi-f2-wp2-navigation/**` — this
  handback + screenshots + click-through report.

No other files touched: no manifests, dependencies, schemas, engine,
runtime, packages, legacy surfaces, or WP3 work.

## Tests

`apps/studio/src/App.test.tsx` — 19/19 pass; the five new F2-WP2 tests:

1. Expand/collapse traversal across both acts and all four sequences with
   semantic `aria-expanded` state; every scene reachable afterwards.
2. Beat rows render only for the selected scene (`data-beat-for` proof,
   before and after switching scenes).
3. Collapsed selected sequence: selection preserved, summary visible,
   Reveal restores the scene.
4. Collapsed selected act: same guarantee at act level.
5. Playhead: starts at `0:00`, moves honestly (`0:42`, `1:20`), resets to
   `0:00` on scene change via transport, rail, and overview; labelled as
   local UI timing, not media playback.

## Commands and results

1. `pnpm --filter @storystage/studio test` — **69/69 pass**.
2. `pnpm --filter @storystage/studio typecheck` — clean.
3. `pnpm --filter @storystage/studio build` — clean.
4. `pnpm verify` — **exit 0**.

## Browser click-through (headless Chromium, 1440×900, `http://127.0.0.1:5174/`)

All checks passed with zero console errors, zero warnings, zero page
errors (machine-readable: `screenshots/clickthrough-report.json`):

- Expanded selected scene (Scene 3): rail beat rows visible only under it.
- Collapsed its sequence: summary `Selected scene 3 · Berry Patch` visible
  with Reveal; board still shows the scene; Reveal restores the rail card.
- Second-act scene (Scene 5) selected from the overview: rail, board,
  transport, and overview agree.
- Playhead moved to `0:45 / 2:50`; scene change resets it to `0:00`.

## Screenshots (actual app, 1440×900)

| File | State | SHA-256 |
| --- | --- | --- |
| `screenshots/wp2-expanded-selected-scene-1440x900.png` | expanded Scene 3 with bounded rail beats | `0a3ecdb177ba55659fac2125e4bc077fa0db6da9d934c97a7c6e7bfea33e1ab3` |
| `screenshots/wp2-collapsed-selection-summary-1440x900.png` | Scene 3 hidden behind collapsed Sequence 2, summary + Reveal visible | `19f7ecf59bfe8a8b095f9976d1c78ec366873002e76370a24c7bbc78f6c8636e` |
| `screenshots/wp2-act2-scene-playhead-1440x900.png` | Scene 5 selected from overview, playhead at 0:45 | `9476cdb1a28096df4c5c82b5a99f4eca1293198ef06c2a465f7a97525f4f4d07` |

## Control truth table

| Control | Truth |
| --- | --- |
| Act/sequence headers | real expand/collapse, `aria-expanded` |
| Rail scene cards | real selection, `aria-current` |
| Overview scene cards | real selection, same single state |
| Previous / Next scene | real; disabled at boundaries |
| Reveal (hidden selection) | real — re-expands the hiding ancestors |
| Scene playhead slider | real local UI timing state; labelled not-media-playback; resets to 0 on scene change |
| Preview / Export | disabled with adjacent plain-language reasons |
| Director fields / Apply | omitted — arrives in F3 |
| Play/pause/scrub-to-media, waveforms, timeline tracks | omitted — non-goals |

## Known limitations

- Collapse state and playhead are session-local (no persistence, per
  scope).
- The playhead is a navigation aid only; it does not drive any media
  (there is no media in this slice).
- Beat metadata remains concise local demo data (2 beats per scene).
- The board shows one shared reference image for all scenes, labelled as
  reference art.

## Integration instructions

Fast-forward or squash-merge the draft PR into `product/v1`. The branch is
built on the exact base `1982407c201d68ce78c98a5f530cda348a15c8ed` (which
contains accepted F2-WP1) and touches only the files listed above.

Stopping here: no WP3, F3, or backend work. Continuing the 15-minute
read-only inbox poll.
