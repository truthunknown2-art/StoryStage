# [KIMI] UI Slice B copy parity handback

Task: `KIMI-UI-SLICE-B-COPY-PARITY` (inbox v7, START-NOW)
Work branch: `agent/kimi-ui-slice-b-copy-parity`, from exact accepted integration base `04f794a5db3226d51e23235e2c488ae89d9fca0f` (PR #12 merged)
Implementation commit: `b90ba71` — `fix(studio): truthful Director command copy for 0, 1, and 2+ reaction targets`

## What changed

The one non-blocking acceptance note from PR #12's review: creator-facing Director copy conflated zero and ambiguous candidate counts, and the Motion panel could point at a correctly absent control.

Both the command area (`DirectorPreview.tsx`) and the Motion panel (`DirectorMotionPanel.tsx`) now derive every creator-facing state from the shared exact `(reaction event, eligible shot)` pair count — `listDirectorReactionDelayCandidates` (the helper accepted in PR #12), with no duplicated predicate:

- **0 candidates** — command absent; note: `Structured direction unavailable on this beat. No editable reaction target exists here — shape the beat with the Visual and Motion controls below.` Motion panel: `No editable reaction target exists on this beat, so delay editing is unavailable.`
- **1 candidate** — the real `Direct this beat` command is exposed (`proposeDirectorPatch` path, unchanged). Motion panel: `Use “Direct this beat” above to retime the reaction.`
- **2+ candidates** — command absent; note: `Multiple reaction targets on this beat. More than one eligible reaction target — a reaction event and shot pair — could be retimed, and explicit target selection is not supported yet.` (Pair-accurate: one reaction event linked by two eligible shots is also a 2+ state.) Motion panel matches. No mock target picker added; the interpreter is not broadened.

The Motion panel's previous copy keyed on mere reaction-event _existence_ (`Use “Direct this beat” above…` whenever an event existed), which was wrong for unlinked (0) and ambiguous (2+) cardinality. It now uses the same count as the command gate, so it can never reference a missing control.

Preserved per the brief: the accepted eligibility helper, no-reaction gating, command clearing, proxy labeling, Director Alpha boundary isolation, responsive layout, and accessibility behavior.

## Changed files

Commit `ce60efb` — Inbox v8 pair-accuracy correction:

- `apps/studio/src/director/DirectorPreview.tsx` — the 2+ note no longer claims "more than one reaction event"; candidate cardinality is exact `(event, shot)` pairs, so the copy now reads "More than one eligible reaction target — a reaction event and shot pair — could be retimed, and explicit target selection is not supported yet."
- `apps/studio/src/Cv002DraftReview.test.tsx` — regression pins the corrected wording and asserts the old "reaction event" claim is absent.

Commit `b90ba71` — initial copy-parity implementation:

- `apps/studio/src/director/DirectorPreview.tsx` — three-state command area driven by the exact pair count (replaces boolean eligible/unavailable)
- `apps/studio/src/director/DirectorMotionPanel.tsx` — parity copy from the same count; contradictory "use the command above" guidance removed for absent-control states
- `apps/studio/src/Cv002DraftReview.test.tsx` — new focused regression `renders truthful, distinct copy for zero, one, and ambiguous reaction-target counts` (controls the count via a scoped `vi.mock` override of the shared helper that delegates to the real implementation by default); existing no-reaction gating, command-clearing, ambiguity, and boundary regressions untouched and green

## Commands and results

| Command                                                   | Result                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| --------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `corepack pnpm --filter @storystage/studio test`          | **82/82 passed (7 files)**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `packages/story-engine` `director-alpha-boundary.test.ts` | passed                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `prettier --check` (touched files) / `git diff --check`   | clean                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| **`pnpm verify` (repository root, at `ce60efb`)**         | **exit 0** — 19 capability assets verified; privacy 580 files passed; `eslint .` 0 errors (2 pre-existing render-worker flicker warnings, outside scope); typecheck clean across 10 projects; all tests green: story-engine 254/254, studio 82/82, desktop 11/11, all other packages passed. (The `b90ba71` run flaked once more on `apps/desktop delivery-store.test.ts > recovers cleanly from every publication checkpoint` — 5349 ms vs 5000 ms timeout under parallel load, third sighting of this load-sensitive test across lanes; left untouched per Codex guidance, recommended for the flake/remediation lane; green at the `ce60efb` run.) |

Note: bare `pnpm` is not on this machine's PATH; root commands ran through corepack shims pinned to the repo's `pnpm@11.9.0`.

## Screenshots (this directory)

- `director-zero-candidates-unavailable-1440x900.png` — default setup beat: honest unavailable note, no command input
- `director-one-candidate-command-available-1440x900.png` — reaction beat (3.1): real `Direct this beat` command exposed
- The 2+ (ambiguous) state is only reachable with a beat carrying two eligible (event, shot) pairs, which no current sample script compiles; it is covered by the new focused Studio regression (scoped count override) and by the engine-level ambiguity fixture merged in PR #12 (`director-patch.test.ts`).

## Control honesty statement

- **Real:** Direct this beat command (exactly-one-candidate beats only), Visual/Motion panels, undo/redo, rail/strip selection with exact seek, timeline drawer with real Shots/Events/Camera, event markers.
- **Honestly unavailable with reason:** the structured command on 0-candidate and 2+-candidate beats (distinct truthful copy for each).
- **Omitted:** target picker for ambiguous beats (explicitly not supported yet), Audio/Assets/Export/waveform/trim/keyframe controls (no real behavior in this build).

## Known limitations

1. Ambiguous (2+) beats have no target-selection UI — stated plainly in copy; adding real explicit target selection would be a future slice with an interpreter path.
2. The Kids-route `image-alt`/`EncodingError` findings from the unchanged Remotion runtime remain pre-existing; Codex has a dedicated `agent/remotion-kids-image-a11y` branch addressing them.
3. The recurring load-sensitive `apps/desktop delivery-store` timeout is documented above for the flake lane.

## Integration instructions

Branch is one commit (`b90ba71`) plus this handback on top of the accepted merge `04f794a5`. Draft PR targets `agent/integrate-kimi-ui-slice-a`. Do not merge — Codex and Pro perform the authority and integration review. After integration, `corepack pnpm --filter @storystage/studio test` should remain 82/82.
