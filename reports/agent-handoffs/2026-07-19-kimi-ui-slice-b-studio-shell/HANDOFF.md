# [KIMI] UI Slice B handback — real Studio shell

Task: `KIMI-UI-SLICE-B-STUDIO-SHELL` (inbox v2, START-NOW)
Work branch: `agent/kimi-ui-slice-b-studio-shell`, from exact base `agent/integrate-kimi-ui-slice-a@21e8d4c601e5e96a540f93ede2b52660bfa6ac0a`
Claim posted: Issue #11 (`CLAIMED agent/kimi-ui-slice-b-studio-shell @ 21e8d4c…`)
Implementation commit: `60cd50f` — `feat(studio): post-create Studio shell for sealed episodes (KIMI-UI-SLICE-B-STUDIO-SHELL)`

## What was built

The post-create Studio shell — the workspace a creator lands in after Create first cut → Review direction draft — replacing the previous direction-draft presentation. One shell serves both Kids Adventure and Weird History drafts:

- **Left:** Scenes and beats rail. Image-led cards whose thumbnails are deterministic proxy approximations rendered from the sealed episode plan (`DirectorFrameThumbnail`), grouped by scene with role labels.
- **Center:** the dominant, authoritative Player — the real `DirectorProductionComposition` playing the sealed episode with native controls, framed by an honest `Draft animatic` badge and a shots/seconds caption.
- **Right:** real Director controls. Undo/redo with exact canonical-hash restore and retained selection; the now-wired `DirectorCommandPanel` as the single structured-direction input; Visual/Motion department tabs hosting the existing patch-backed panels; `DirectorChangePreview` apply/cancel; per-beat capability card (`Proxy performance` / `Render-ready performance` / `Final character rig unavailable`); `Advanced / Preflight` closed by default.
- **Bottom:** compact genuine timeline. `CreatorBeatStrip` thumbnail cards plus the selected-beat `DirectorTimelineDrawer` — collapsed by default, containing only real Shots, Events, and Camera lanes, with event markers that seek to their resolved frames.

Behavior verified: rail/strip selection seeks the Player to the exact beat start; playback drives the active beat and timeline playhead; patches rebuild affected thumbnails and timeline data; undo/redo restore exact project hashes while retaining the selected beat.

Nothing was fabricated: no waveforms, trim handles, keyframe editors, Audio/Assets/Export controls, or production-authority pretense. No Mara artwork relabeled. `Cv001CreatorApp.tsx`, `story-engine`, `asset-pipeline`, `remotion-runtime`, `render-worker`, and KCAST contracts untouched.

## Changed files

Commit `60cd50f` (initial implementation):

- `apps/studio/src/director/DirectorPreview.tsx` — `DirectorAnimaticPreview` rewritten as the shell (rail / dominant Player / Director panel / bottom timeline; seek sync, playhead tracking, replay-after-patch, undo/redo)
- `apps/studio/src/director/DirectorMotionPanel.tsx` — duplicated command input removed (the command panel now owns structured direction); keeps real motion facts
- `apps/studio/src/director/DirectorTimelineDrawer.tsx` — collapsed by default (one-line)
- `apps/studio/src/Cv002DraftReview.tsx` — direction-draft screen renders the single shell inside `CreatorStudioShell`
- `apps/studio/src/cv002-draft-review.css` — shell grid (3-column ≥861px, stacked below), 44px targets, visible focus, contrast fixes
- `apps/studio/src/Cv002DraftReview.test.tsx` — updated to the shell UX and extended: strip/rail seek parity, event-marker seek + playhead tracking, shell honesty labels, advanced closed by default, no Export/Audio/Assets pretense; no behavior assertions weakened

Side effect to note: `Kvp001PlayerEvidence.tsx` (unmodified, outside scope) reuses `DirectorAnimaticPreview` and therefore now renders the shell; its tests still pass.

Commit `ffee66e` — Hosted blocker resolution (PR #12 feedback, inbox v4):

- `apps/studio/src/director/DirectorSceneBeatRail.tsx` — **new**: boundary-safe `DirectorSceneRail` / `DirectorBeatStrip` importing only `@storystage/story-engine/director-alpha` contracts + `./DirectorFrameThumbnail`, so the Director Alpha import-boundary audit can no longer reach legacy CV-001/showcase code
- `apps/studio/src/director/DirectorPreview.tsx` — rail/strip imports switched to `./DirectorSceneBeatRail` (no markup or behavior change; same aria labels and CSS classes)
- `apps/studio/src/creator-studio-components.tsx` — `CreatorSceneRail` / `CreatorBeatStrip` / `firstFrameForBeat` removed (no remaining consumers); `CreatorStudioShell` unchanged

Commit `e13292a` — Inbox v5 review-defect corrections (exact-head review findings):

- **P1 — unusable global Director command.** `DirectorCommandPanel` was mounted for every selected beat, but the Alpha interpreter accepts only reaction-delay wording on beats with exactly one concrete reaction event, so the default setup beat presented a control that could never work. The command control now mounts only when the selected beat satisfies that same acceptance predicate (mirrored from `proposeDirectorPatch`, commented inline); all other beats get an honest `Structured direction unavailable on this beat` note pointing at the Visual/Motion controls. No broadened natural-language pretense.
- **P2 — stale command crosses beat ownership.** `command` now clears on every selection change together with proposal/error/feedback, so a direction typed for beat A can never be previewed against beat B.
- Regression tests (2 new): default/non-reaction beat shows the honest note and no input, a reaction beat keeps the real control, typed command clears on selection change.
- Handback wording corrected in this directory: `DirectorFrameThumbnail` is described as a deterministic proxy approximation, not a canonical frame. Capability labels were audited as genuinely capability/execution-derived and are unchanged. The Kids empty-alt / `EncodingError` findings remain a filed pre-existing limitation (unchanged Remotion runtime), as confirmed by the review.

## Commands and results

| Command                                                             | Result                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| ------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `corepack pnpm --filter @storystage/studio test`                    | **81/81 passed (7 files)** — includes the P1 gating and P2 command-clearing regression tests                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `corepack pnpm --filter @storystage/studio typecheck`               | clean                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `corepack pnpm exec eslint apps/studio`                             | clean                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `prettier --check` (touched files)                                  | clean                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `verify:director-capability-assets` + `tsc --noEmit` + `vite build` | succeeded (pre-existing >500 kB chunk note unchanged)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `git diff --check`                                                  | clean                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| **`pnpm verify` (repository root, at `e13292a`)**                   | **exit 0** — 19 capability assets verified; privacy 580 files passed; `eslint .` 0 errors (2 pre-existing render-worker flicker warnings in `kvp001-proof.ts`, outside slice scope); typecheck clean across 10 projects; all tests green: story-engine 253/253 (incl. `director-alpha-boundary`), studio 81/81, desktop 11/11, contracts/fixtures/orchestration/asset-pipeline/remotion-runtime/asset-worker/render-worker all passed. The first run flaked on `apps/desktop delivery-store.test.ts` (5000 ms timeout under parallel load; unrelated to this branch — the same test passed in 1507 ms isolated and passed in the green rerun). Per Codex guidance the test was left untouched; flagged for the flake/remediation lane. |

Note: bare `pnpm` is not on this machine's PATH; root commands were run through corepack shims pinned to the repo's `pnpm@11.9.0`.

## Responsive and accessibility gates (Chromium + axe-core 4.10.3, dev server on port 5174\*)

| Gate                               | 1440×900         | 1024×768         | 820×900        |
| ---------------------------------- | ---------------- | ---------------- | -------------- |
| Horizontal page overflow (Kids)    | none (1440=1440) | none (1024=1024) | none (820=820) |
| Horizontal page overflow (History) | none             | —                | —              |
| Axe critical/serious (History)     | **0**            | —                | —              |
| Axe critical/serious (Kids)        | 1 pre-existing†  | same 1†          | same 1†        |
| Console warnings/errors (History)  | **0**            | —                | —              |
| Console warnings/errors (Kids)     | 1 pre-existing†  | —                | —              |

\* Port 5173 is occupied by another agent's dev server (kvp001 worktree), left running; gates ran against this branch on 5174.
† Single 2098×750 blob `<img>` (empty alt) rendered inside `.__remotion-player` by `DirectorProductionComposition` (`packages/remotion-runtime`) — outside the allowed scope, byte-identical to base `21e8d4c`, and reproducible on the untouched base (verified by stashing this branch's changes). `image-alt` critical + `EncodingError` console warning share this one element. Requires a remotion-runtime fix; flagged for Codex/Pro.

Interactive targets ≥44px enforced in shell CSS; `summary:focus-visible` and button focus rings verified in the stacked layouts.

## Screenshots (this directory)

- `kids-1440x900.png` — shell, Kids Adventure (approved-art beat: `Render-ready performance`/`APPROVED PERFORMANCE`)
- `history-1440x900.png` — shell, Weird History (`PROXY ANIMATIC` badge, `Proxy performance`)
- `kids-1024x768.png` — 3-column shell holds, strip scrolls horizontally
- `kids-820x900.png` — stacked layout, scene grid, no overflow

Machine-readable gate output: `proof-report.json`. Full control inventory: `control-to-state-map.md`.

## Known limitations

1. The pre-existing Kids-route `image-alt` critical + `EncodingError` warning described above (remotion-runtime, out of scope).
2. At 1440×900 the Director panel scrolls internally to reach the capability card and `Advanced / Preflight` — deliberate, keeps the Player dominant without page overflow.
3. At ≤860px the shell stacks; scene columns scroll horizontally before the Player/Director sections (consistent with the previous responsive pattern).
4. `DirectorCommandPanel` was dead code on the base; it is now the single structured-direction entry, and `DirectorMotionPanel`'s duplicated input was removed (same `proposeDirectorPatch` path, no behavior loss).
5. Unit-level interaction proofs (seek parity, event-marker seek, patch rebuild, undo/redo hashes) are covered by the test suite; browser-level interaction was spot-checked visually, not scripted end-to-end.

## Integration instructions

Branch is two commits on top of `21e8d4c` (implementation `60cd50f` + this evidence pack). Open as a **draft PR targeting `agent/integrate-kimi-ui-slice-a`** (same convention as PR #10). Do not merge — Codex and Pro perform the authority and integration review. After integration, `corepack pnpm --filter @storystage/studio test` should remain 79/79.
