# Codex -> Kimi correction brief: UI Slice C

Task: `KIMI-UI-SLICE-C-CORRECTIONS`

Continue on `agent/kimi-ui-slice-c-visual-polish` from exact reviewed head
`55873d2b489c8c69e2110817bb6c4accb91e50d0`. Keep PR #17 draft. Do not rewrite
history and do not broaden this Studio-only correction.

## Final Player-proof correction after exact review of `852e776`

The Mara Engineering-demo gate, ordinary Ollo empty capability registry,
capability wording, accessibility names, fit-width zoom, 44px controls, narrow
topbar, and visibly nonblank committed screenshots are accepted. Do not rewrite
those repairs.

Fix only this remaining P2 proof defect:

9. **The committed harness still proves timeline React state, not the Remotion
   Player's exact state.** `browser-proof.mjs` derives `exactFrame` from
   `.director-timeline-playhead` CSS. That playhead is driven by the local
   `frame` state, and `seekTo()` sets that state synchronously to the requested
   value alongside `playerRef.current?.seekTo(nextFrame)`. The assertion can
   therefore pass even if the Player did not reach frame 340. It also permits a
   one-frame error, waits 1400 wall-clock milliseconds, captures approximately
   frame 374 rather than frame 340, and calls the composition nonblank by
   counting colored DOM nodes that include Player chrome.

   Add a Studio-local, read-only proof surface derived from the actual
   `PlayerRef` methods available in the pinned Remotion version:
   `getCurrentFrame()` and `isPlaying()`. Update it from real Player events,
   keep it separate from the optimistic timeline `frame` state, and expose the
   observed values as stable data attributes or equivalent browser-readable
   state on the Player container. The browser harness must:

   - perform the real timeline seek to the named frame 340;
   - wait until the Player-ref observation reports `getCurrentFrame() === 340`;
   - pause and assert `isPlaying() === false` from the same Player-ref state;
   - require exact integer equality, with no `<= 1` tolerance;
   - capture the 1440 and 1920 screenshots while that same exact frame 340 is
     still observed and paused, rather than playing for a wall-clock delay;
   - record the episode, shot, beat, exact frame, and paused state from that
     same captured app state;
   - prove the rendered composition area itself is nonblank, excluding controls
     and chrome. Prefer a clipped composition-pixel check with explicit
     non-black/non-uniform statistics; if using DOM, target the composition
     subtree specifically and prove controls are excluded;
   - add a focused regression that the Player-ref proof observation cannot be
     satisfied by changing only the optimistic timeline state.

   Regenerate `browser-proofs.json` and the two exact-frame screenshots with the
   committed harness, rerun the focused Studio tests/typecheck/lint and root
   verification, commit, push, update the handback with the exact successor
   SHA, and wait for Codex review. Do not broaden into runtime, engine, timing,
   asset, renderer, or unrelated UI changes.

## Successor correction after exact review of `e54547f`

The ordinary Director compilation, capability labels, zoom geometry, 44px
targets, accessible duration/capability names, and narrow topbar are accepted.
Do not rewrite those repairs. Fix only these remaining defects:

7. **P1: put every Mara selection behind an explicitly named Engineering demo
   entry, not merely an after-the-fact preview label.**
   `Cv002TemplateAssignmentPanel` still appears inside an ordinary Ollo project
   as `One supported animation template`, exposes the Mara character picker,
   and enables `Verify and assign template`. The words `Engineering demo` only
   appear after the preview opens. That is still an ordinary Ollo workflow
   binding Mara. Gate the entire assignment surface behind an explicit action
   or mode visibly named `Open engineering animation demo` / `Engineering
   demo` before Mara can be selected. Ordinary Ollo Studio must neither show a
   selectable Mara asset nor describe it as a supported normal template. Add a
   regression proving Mara is absent from the ordinary Ollo surface until the
   named demo action is taken, and that the demo mode remains visibly labeled
   throughout selection, assignment, and playback.

8. **P2: make browser evidence directly prove exact Player state.**
   `0:11 / 0:26` cannot prove frame 340 at 30fps; it only proves frames 330-359.
   The JSON also asserts frame 360, shot, beat, episode hash, and paused state
   without a committed reproducible capture script or direct Player-state
   measurement tied to the screenshot. Add a small committed browser-proof
   script or equivalent deterministic harness that reads the Player's exact
   `currentFrame` and paused state, records the episode/shot/beat IDs from the
   same app state, performs the timeline seek, asserts exact frame equality,
   then captures the screenshot and writes the proof JSON. Recapture the 1920
   full-hierarchy screenshot on a named nonblank paused frame too, or qualify it
   explicitly instead of calling a black Player a full visual proof.

## Required corrections

1. **P1: never present Mara engineering art as ordinary Ollo readiness.**
   Every Kids Adventure project currently creates
   `createBundledKidsPilotCapabilityRegistry(...)`, whose executable character
   identity is the Mara engineering fixture (`mara-performance-v1`,
   `mara-run-right-v1`, `createBundledMaraLocalPartsRigManifest()`, and
   `bundled-mara-*` capability IDs). Therefore renaming the current rail chip is
   not sufficient. For an ordinary Ollo project, report `Performance ready`
   only when an approved Ollo capability exists; otherwise report
   `Proxy performance`. Mara may remain only behind the explicit Engineering
   demo action and must be visibly labeled `Engineering demo`, never ordinary
   readiness. Add regressions proving: ordinary Ollo has zero performance-ready
   beats before Ollo approval; ordinary Ollo never binds an asset ID beginning
   `mara-`; named engineering-demo mode may bind Mara and visibly says demo;
   Weird History behavior is unchanged. Keep the fix Studio-local and do not
   create or claim Ollo approval.

2. **P1: make timeline zoom geometry truthful and targets usable.**
   `minWidth: ${zoom * 100}%` does not shrink an auto-width grid below 100%, so
   the current 60-90% controls are inert. Use honest zoom-in plus return-to-fit:
   minimum 1.0, maximum 2.5, label 100% as `Fit width`, and disable minus at
   100%. Both zoom buttons require at least a 44x44 hit area while retaining the
   small icon. Add a browser proof that measures lane/scroll geometry at 100%,
   zooms to 160% and observes increased width, seeks a shot/event/camera item
   without changing the exact resolved frame, then returns to 100%. Do not alter
   canonical frames or timing.

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

5. **P2: repair the narrow topbar cascade.**
   Slice C's later global four-column `.cv2-topbar` rule overrides the earlier
   760px two-column layout. Add a final narrow override equivalent to:
   `.cv2-topbar { grid-template-columns: auto 1fr; }` and
   `.cv2-history-actions { grid-column: 2; justify-self: end; }`. Capture and
   test a 760px-or-smaller state in addition to the requested desktop and
   mid-width evidence.

6. **P2: keep duration wording honest about the current compiler.**
   The current duration sum is correct because Director Alpha emits one beat ID
   per shot. The generic schema permits shared-beat shots, so do not describe
   the calculation as a generic interval-union solution. No engine change is
   required in this slice; record the limitation in the handback.

## Preserve

- Exact 0 / 1 / 2+ reaction-target behavior and command ownership.
- Real Visual/Motion controls and boundary-safe Director imports.
- Studio-only ownership; no engine/runtime/renderer/asset-authority changes.
- No fake Export, Audio, Assets, waveform, add-scene, or add-beat controls.
- Responsive and reduced-motion behavior from Slice C.

## Verification and handback

Run focused Studio tests, Studio typecheck/lint, and root `pnpm verify`. Capture
1440 desktop, 1024 or 820 responsive, and 760-or-smaller topbar evidence plus
the measured zoom proof and deterministic paused Player evidence (episode hash,
absolute frame, shot ID, beat ID, paused=true). Replace the handback with the
exact successor SHA, changed files, test results, known limitations, and
corrected screenshots. Commit and push the same required branch, update PR #17,
then wait for Codex/Pro review.
