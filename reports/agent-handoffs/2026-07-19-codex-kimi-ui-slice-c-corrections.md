# Codex -> Kimi correction brief: UI Slice C

Task: `KIMI-UI-SLICE-C-CORRECTIONS`

Continue on `agent/kimi-ui-slice-c-visual-polish` from exact reviewed head
`55873d2b489c8c69e2110817bb6c4accb91e50d0`. Keep PR #17 draft. Do not rewrite
history and do not broaden this Studio-only correction.

## Required corrections

1. **Make the rail capability label exact.**
   `beatIsRenderReady()` only evaluates performance-capability resolution while
   the ordinary renderer is still proxy-only. Rename the creator-facing state
   to `Performance ready` / `Performance proxy`, or derive a genuine full
   production-readiness gate. The smaller performance-specific wording is the
   intended correction for this slice. Update tests, handback text, and visual
   evidence so the UI cannot imply final media or full-beat render readiness.

2. **Make timeline zoom geometry truthful.**
   `minWidth: ${zoom * 100}%` does not shrink an auto-width grid below 100%, so
   the current 60-90% controls change the number without changing the lanes.
   Use a real geometry-affecting width and define the intended below-100%
   behavior, or clamp the minimum to 100% and remove inert zoom-out states.
   Add a focused assertion that pins the rendered geometry/style at the minimum,
   default, and an above-100% value. Do not alter canonical frames or timing.

3. **Expose the new metadata to assistive technology.**
   The scene-rail button has an explicit `aria-label`, which replaces descendant
   text. Include the resolved duration and corrected performance-capability
   wording in its accessible name or a bound description. Add a focused test.

4. **Replace or qualify the black Player proof.**
   `studio-1440x900-direct-command-one-target.png` is black at 0:17. The same
   blank frame exists in the Slice B base evidence, so this is not introduced by
   Slice C, but it cannot prove the claimed dominant framed Player. Recapture the
   required exactly-one-target state only after the ordinary Remotion Player has
   visibly settled on a nonblank frame. If it remains blank after deterministic
   seek-and-settle, do not hide that: retain the evidence, describe the
   pre-existing runtime blocker precisely, and avoid claiming visual Player
   acceptance. Do not modify runtime code in this Kimi lane.

## Preserve

- Exact 0 / 1 / 2+ reaction-target behavior and command ownership.
- Real Visual/Motion controls and boundary-safe Director imports.
- Studio-only ownership; no engine/runtime/renderer/asset-authority changes.
- No fake Export, Audio, Assets, waveform, add-scene, or add-beat controls.
- Responsive and reduced-motion behavior from Slice C.

## Verification and handback

Run focused Studio tests, Studio typecheck/lint, and root `pnpm verify`. Replace
the handback with the exact successor SHA, changed files, test results, known
limitations, and corrected screenshots. Commit and push the same required
branch, update PR #17, then wait for Codex/Pro review.
