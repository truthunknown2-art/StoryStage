# Codex F2-WP2 acceptance — inbox v43

## Verdict

**ACCEPT** exact remote head
`ee900201d40aca2e38e559e19b40e9ec2b6282f0` for F2-WP2.

This acceptance is limited to **F2-WP2 — Long-form navigation and bounded
rendering**. PR #42 remains draft and unmerged. WP3, F3, frontend phase
acceptance, and backend product work are not authorized by this verdict.

## Immutable scope

- Product base: `1982407c201d68ce78c98a5f530cda348a15c8ed`
- Required branch: `agent/kimi-f2-longform-navigation-wp2`
- Draft PR: `https://github.com/truthunknown2-art/StoryStage/pull/42`
- Tracking issue: `https://github.com/truthunknown2-art/StoryStage/issues/41`
- Accepted correction commit: `420b4bd6c180e17c6e4c9bd371528e6792eb3ffd`
- Accepted handback/evidence tip: `ee900201d40aca2e38e559e19b40e9ec2b6282f0`

## Accepted behavior

- Act and sequence expansion/collapse preserve one authoritative scene
  selection.
- A selected scene hidden by collapsed ancestors remains clear through the
  selected-scene summary and Reveal action.
- Rail, overview, previous/next navigation, transport, and selected-scene
  summary stay synchronized.
- Scene-relative playhead behavior is deterministic and truthfully labelled as
  local UI timing rather than media playback.
- The v42 blocker is resolved: each two-beat scene renders exactly two beat
  rows, only in the hierarchy rail, and every row belongs to the selected
  scene. The duplicate center-board beat list and its dead CSS are removed.
- Permanent local-demo disclosure and disabled-control truth labels remain.

## Independent verification

At exact head `ee900201d40aca2e38e559e19b40e9ec2b6282f0`:

- `pnpm --filter @storystage/studio test` — **69/69 passed**
- `pnpm --filter @storystage/studio typecheck` — **passed**
- `pnpm --filter @storystage/studio build` — **passed**
- Hosted `Verify StoryStage` run
  `https://github.com/truthunknown2-art/StoryStage/actions/runs/29764722843`
  — **passed**
- PR base/head and clean merge state were rechecked against GitHub.
- Click-through report records every required navigation state as passing with
  zero console entries and zero page errors.

## Visual evidence

The three actual 1440×900 captures were inspected and their SHA-256 hashes were
independently recomputed:

- `wp2-expanded-selected-scene-1440x900.png`
  — `add899d1e742d9ce6e53dd94c8dad9738fd241343d9a10cc22292bf468b3d05c`
- `wp2-collapsed-selection-summary-1440x900.png`
  — `311ad101e3209e5c6af5b69e6e9c7dee6a9a47918c07d339890afcc71d2934c0`
- `wp2-act2-scene-playhead-1440x900.png`
  — `cbc37055a229926453958cd58ce550ddf63615118c76163ce6baec4b6e4c7312`

The expanded state shows exactly two selected-scene beat rows without a board
duplicate; the collapsed state keeps selection understandable and revealable;
the second-act state keeps scene selection, playhead, and overview synchronized.

## Disposition

No blocking defect remains in this work package. Kimi must stop on `WAIT` and
must not modify PR #42 or start another package until a higher inbox version
provides exact authority.
