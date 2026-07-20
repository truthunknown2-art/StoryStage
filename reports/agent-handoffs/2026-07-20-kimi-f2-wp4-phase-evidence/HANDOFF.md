# Kimi F2-WP4 handback — phase evidence and integration gate (inbox v46)

Task: `F2-WP4-PHASE-EVIDENCE-INTEGRATION-GATE`
Brief: `reports/agent-handoffs/2026-07-20-codex-kimi-f2-wp4-phase-evidence-v46.md`
Branch: `agent/kimi-f2-phase-evidence-wp4`
Draft PR target: `product/v1`
Tracking issue: https://github.com/truthunknown2-art/StoryStage/issues/45 (claimed)

## Scope and lineage

- Exact product base: `0a88945585865ffb9deb957fe145efd3f5b17742`
- Integrated predecessors: F2-WP1 (`1ab5f43` merge), F2-WP2 (`4218da8`
  merge), F2-WP3 (`0a88945` merge)
- Evidence commit: recorded in the PR body (single commit on the exact base).
- This package is **evidence-only**: no Product v1 source, test, CSS,
  dependency, schema, runtime, engine, legacy-surface, or planning-document
  file was changed.

## What the evidence proves

The integrated long-form Studio shell at the exact base navigates the
complete bounded 20-minute demo without losing selection, flooding the
screen, overflowing, obscuring required controls, or pretending production
services exist.

## Commands and results

1. `pnpm --filter @storystage/studio test` — **72/72 pass**.
2. `pnpm --filter @storystage/studio typecheck` — clean.
3. `pnpm --filter @storystage/studio build` — clean.
4. `pnpm verify` — **exit 0** (second attempt; the first stopped at the
   known upstream asset-pipeline 5000 ms load flake, documented below).

## Pass/fail checklist (28/28 pass — `screenshots/evidence-report.json`)

- **E1** — all eight scenes selectable across both acts and all four
  sequences; rail, board, transport readout, and episode overview agree on
  every scene.
- **E2** — exactly two beat rows exist, all `data-beat-for` the selected
  scene (checked after selection changes).
- **E3** — collapsing the selected sequence preserves selection; the
  `Selected scene N · title` summary appears and the board still shows the
  scene.
- **E4** — Reveal restores the hidden selected scene.
- **E5** — ArrowDown crosses the act boundary (Scene 4 → 5) and carries
  focus to the target rail card.
- **E6** — End jumps to the last scene; ArrowDown clamps there.
- **E7** — Home jumps to the first scene; ArrowUp clamps there.
- **E8** — computed keyboard focus outline ≥ 2px.
- **E9** — scene-relative playhead moves with an exact numeric readout
  (`0:45 / 2:50`).
- **E10** — the playhead resets deterministically to `0:00` on scene change.
- **E11–E15** — permanent local-demo banner, `Reference board — not
  animation`, `local UI timing — not media playback`, disabled Preview with
  reason, disabled Export with reason.
- **E16** — no horizontal overflow at 1440×900 (scrollWidth 1440).
- **E17–E18** — zero console warnings/errors and zero page errors at
  1440×900.
- **E19–E21** — no overflow, zero console/page errors at 1920×1080.
- **E22** — 1024×800 layout stacks in deliberate order (rail 1 → board 2 →
  inspector 3 → overview 4).
- **E23** — rail, inspector, transport, overview all reachable at 1024×800.
- **E24** — compact selection still drives the board.
- **E25** — no horizontal overflow at 1024×800.
- **E26–E27** — zero console/page errors at 1024×800.
- **E28** — reduced motion collapses Studio transitions to 0.01ms; no
  animation-dependent meaning.

## Measurements (exact DOM bounds — `evidence-report.json`)

- **1440×900**: rail x24 y−20 w250 h799, board x292 w816, inspector x1126
  w290, overview strip x0 y797 w1440 h103, transport x292 y616 w816 h44;
  scrollWidth = clientWidth (no overflow).
- **1920×1080**: scrollWidth = clientWidth (no overflow).
- **1024×800**: layout `flex-direction: column`; order rail/board/inspector/
  overview = 1/2/3/4; scrollWidth = clientWidth.
- **Reduced motion**: `.pv1-rail-scene` computed `transition-duration:
  1e-05s` under `prefers-reduced-motion: reduce` emulation.
- **Playhead state**: `0:45 / 2:50` after scrub at Scene 5; `0:00` after
  scene change.

## Screenshots (actual integrated product)

| File | Viewport | State | SHA-256 |
| --- | --- | --- | --- |
| `screenshots/wp4-desktop-expanded-navigation.png` | 1440×900 | expanded navigation, initial scene | `dcf3546add39f34e34495ce3618059c059798887ca37aa923d448f170995bb17` |
| `screenshots/wp4-desktop-collapsed-hidden-selection.png` | 1440×900 | Scene 3 hidden behind collapsed Sequence 2, summary + Reveal | `2db4e7611b69d698dfb08fe850753ef0638d04708e612bedc25c7d746f86bc58` |
| `screenshots/wp4-desktop-keyboard-selected-act-boundary.png` | 1440×900 | keyboard-selected Scene 5 across the act boundary, focus visible | `f64bdeb63e0f166a2007f025edb36c6093fedb9cc24f7ef5e0ea610e5ffadcef` |
| `screenshots/wp4-synchronized-overview-playhead.png` | 1440×900 | overview/board/transport/playhead synchronized at Scene 5, 0:45 | `7a61453710d0450e2ab7a32c335bda9ccb0559c64b83fd78d0c5782dfd5b0b23` |
| `screenshots/wp4-1024x800-compact-stacked.png` | 1024×800 | compact ordered stacked regions, Scene 3 selected | `410491b99be6fc3807c37618b35731c15717633e07f8226aa1fe2a1c39c2b3cf` |

SHA-256 values recomputed at capture time and stored in
`evidence-report.json` alongside every DOM measurement.

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

- Evidence is for the integrated candidate at the exact base; it does not
  accept F2 — Codex, Pro, and Preston gates follow this handback.
- Root `pnpm verify` passed on the second attempt (exit 0, studio 72/72).
  The first attempt stopped at the upstream asset-pipeline 5000 ms load
  flake (two heavy tests at 5183–5208 ms against a 5000 ms budget; both
  files pass isolated) — unchanged upstream work.
- Selection, collapse, playhead, and focus position are session-local.
- The board shows one shared reference image for all scenes, labelled as
  reference art.

## Integration instructions

Fast-forward or squash-merge the draft PR into `product/v1`. The branch adds
only `reports/agent-handoffs/2026-07-20-kimi-f2-wp4-phase-evidence/**` and
this handback.

Stopping on `WAIT`: no F3 or backend work. Continuing the 15-minute
read-only inbox poll.
