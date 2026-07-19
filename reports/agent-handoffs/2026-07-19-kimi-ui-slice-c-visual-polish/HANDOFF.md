# [KIMI] UI Slice C handback — Director Studio visual polish + corrections

Task: `KIMI-UI-SLICE-C-VISUAL-POLISH` → `KIMI-UI-SLICE-C-CORRECTIONS` (inbox v10 → v12, START-NOW)
Work branch: `agent/kimi-ui-slice-c-visual-polish`, from exact accepted integration base `2de764c27640657a97f90eef2c630ff171e9176f`
Implementation commits: `206ff36` (Slice C polish), `1daf540` (v11/v12 corrections)
Visual references: `Generated image 1.png` (Director Studio mockup, primary), `Generated image 2.png` (Create-flow mockup)

## Slice C (accepted scope) — what was polished

Real-data visual polish of the accepted Director Studio shell: production header with real grammar/art-direction tag pills; scene-rail per-beat resolved durations and honest capability chips; framed dominant Player; pill tabs and mint primary-action hierarchy; beat-strip durations; selected-beat timeline with tools row, zoom, whole-second ruler, colored lane dots; wide-desktop sizing; reduced-motion guards. Details in the original commit `206ff36`.

## Corrections (inbox v11/v12, commit 1daf540)

**P1 — Mara capability truth.** Ordinary Ollo & Friends drafts previously compiled against `createBundledKidsPilotCapabilityRegistry(...)`, whose executable identity is the Mara engineering fixture (`mara-performance-v1`, `mara-run-right-v1`, `bundled-mara-*`) — so "ready" wording was Mara engineering art presented as ordinary Ollo readiness. Ordinary Ollo drafts now compile against the empty `alphaCapabilityRegistry`: **zero `mara-*` asset IDs bind, 0 of N performance requirements resolve supported, everything reports `Proxy performance`** (probed and regression-tested). Mara remains only in the explicit demo surfaces, both now visibly labeled **Engineering demo**: the Cv001 demo badge and the assigned template preview header. No Ollo approval is created or claimed.

**P1 — truthful timeline zoom.** `minWidth: zoom*100%` could not shrink an auto-width grid, making sub-100% zoom inert. Zoom is now honest zoom-in plus return-to-fit: real lane width (`width`, not `min-width`), minimum 1.0 labeled **Fit width** with minus disabled, maximum 2.5, 44×44 hit targets with small icons retained. Measured browser proof in `browser-proofs.json`: at 100% grid 1440/lane 1326 px not scrollable; at 160% grid 2304/lane 2190 px scrollable; a shots-lane seek lands on its exact resolved frame (title "Seek to reaction, frame 340" → transport 0:11 = frame 330 floor ✓); returns to fit cleanly.

**P2 — assistive metadata.** Rail/strip buttons have explicit `aria-label`s that replace descendant text; names now include the resolved duration and performance-capability wording (`… · 2.5 seconds, Proxy performance`). Focused test added.

**P2 — narrow topbar cascade.** Slice C's global four-column topbar rule overrode the 760px two-column layout. Final narrow override added (`grid-template-columns: auto 1fr`, actions pinned right); 740px evidence shows a clean two-row cascade with no horizontal overflow (measured 740=740).

**Player proof replaced.** The prior one-target screenshot was black at 0:17 (same blank frame exists in Slice B base evidence; the beat-start frame is a dark cut/transition frame). Recaptured after deterministic seek-settle-play-pause: `studio-1440x900-direct-command-one-target.png` is a **nonblank paused frame** with metadata — episode `cc68cfd33d43013e…`, absolute frame 360 (0:12), shot `shot-5-main`, beat `beat-a3f3e65ef08a`, paused=true (see `browser-proofs.json`).

## Changed files

Commit `206ff36`: `Cv002DraftReview.tsx` (header tags), `DirectorSceneBeatRail.tsx` (durations/chips), `DirectorTimelineDrawer.tsx` (tools/ruler/dots), `DirectorPreview.tsx` (fps), `cv002-draft-review.css` (polish block), `Cv002DraftReview.test.tsx`.

Commit `1daf540`:

- `apps/studio/src/Cv002DraftReview.tsx` — ordinary Ollo compiles against the empty Alpha registry (Mara registry selection removed); Studio-local, no engine/runtime change
- `apps/studio/src/Cv001CreatorStudio.tsx` — demo badge reads `Engineering demo`
- `apps/studio/src/Cv002TemplateAssignmentPanel.tsx` — preview header reads `Engineering demo · real articulated preview`
- `apps/studio/src/director/DirectorSceneBeatRail.tsx` — chips `Performance ready`/`Proxy performance` + a11y names with duration and capability wording
- `apps/studio/src/director/DirectorTimelineDrawer.tsx` — honest zoom (1.0 Fit width → 2.5), real width, disabled minus at fit
- `apps/studio/src/cv002-draft-review.css` — 44px zoom targets, ≤760px topbar cascade
- `apps/studio/src/Cv002DraftReview.test.tsx` — new regressions: zero Mara bindings + zero ready on ordinary Ollo, a11y names, fit-width zoom geometry, Engineering demo label; updated chip/honesty assertions (Weird History unchanged)
- `apps/studio/src/Cv001CreatorStudio.test.tsx` — Engineering demo label regression

## Commands and results

| Command                                                 | Result                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `corepack pnpm --filter @storystage/studio test`        | **86/86 passed (7 files)**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `corepack pnpm --filter @storystage/studio typecheck`   | clean                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `corepack pnpm exec eslint apps/studio`                 | clean                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `prettier --check` (touched files) / `git diff --check` | clean                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `pnpm verify` (repository root, at `1daf540`)           | **exit 0, fully green** — 19 capability assets verified; privacy 580 files passed; `eslint .` 0 errors; typecheck clean across 10 projects; all tests green: story-engine 254/254, studio 86/86, desktop 11/11 (the load-sensitive delivery-store timeout did not recur on this run), remotion-runtime 20/20, asset-pipeline 54/54, contracts 11/11, fixtures 2/2, orchestration 4/4, asset-worker 3/3, render-worker 15/15. (Six prior sightings of that parallel-load timeout across lanes remain flagged for Codex's flake/remediation lane.) |

## Browser proofs (`browser-proofs.json`)

- **Zoom geometry:** 100% → grid 1440 / lane 1326 px, `Fit width`, minus disabled, not scrollable; 160% → grid 2304 / lane 2190 px, scrollable; seek to `reaction, frame 340` exact; back to fit.
- **Paused player:** episode `cc68cfd33d43013e660151524646106cc0ecc9d0e3cffea05f165100b0240966`, frame 360, shot `shot-5-main`, beat `beat-a3f3e65ef08a`, paused=true.
- **Responsive:** 820×900 and 740×900 measured overflow-free (sw=iw); 740 topbar renders the two-column cascade (2 rows).

## Screenshots (this directory, actual app)

- `studio-1440x900-setup-beat-no-target.png` — 0-target beat, honest unavailable note, `PROXY PERFORMANCE` chips
- `studio-1440x900-direct-command-one-target.png` — exactly-one-target beat (2.2), real `Direct this beat` command, nonblank paused proxy frame
- `studio-1920x1080-full-hierarchy.png` — full Player/Director/beat-strip/timeline hierarchy at 1920, drawer open with ruler + zoom + lanes
- `studio-820x900-stacked.png` — narrow stacked layout
- `studio-740x900-narrow-topbar.png` — ≤760px two-row topbar cascade
- `engineering-demo-mara-labeled-1440x900.png` — Mara confined to the visibly labeled Engineering demo surface

## Mockup-parity audit (updated post-correction)

**Matches:** compact production header with real tags; legible rail with thumbnails, durations, capability chips; dominant framed 16:9 Player; calm Director inspector with mint primary action; beat strip with durations; multi-track selected-beat timeline with labels, markers, ruler, working zoom.

**Intentionally differs (capability absent):** no Export/Preview-render buttons, no Audio/Assets tabs, no Voice/SFX lanes or waveforms, no Add scene/beat, no attention pill, no target picker. Ordinary Ollo currently plays **proxy** visuals everywhere and says so (`Draft animatic`, `PROXY ANIMATIC`, `Proxy performance`) — there is no approved Ollo performance capability yet, and this slice does not claim one. Mara art appears only inside the explicitly labeled Engineering demo surfaces.

**Remains for the Ollo media/runtime lane:** approved Ollo capability + final media; when an approved Ollo capability exists, `Performance ready` lights up with no further UI change needed. The Kids-route Remotion `image-alt`/`EncodingError` items are handled in Codex's `agent/remotion-kids-image-a11y` lane (PR #13).

## Control honesty statement

- **Real:** header tags, undo/redo, step tabs, rail/strip selection with exact seek, durations + `Proxy performance` chips, Player + native transport, Visual/Motion patch controls, command control on exactly-one-target beats, undo/redo hashes, timeline drawer (Fit-width/2.5 zoom, ruler, seek markers, playhead), Engineering demo surfaces (Cv001 demo, verified template preview).
- **Honestly unavailable with reason:** structured command on 0- and 2+-candidate beats; zoom minus at Fit width; Preview/Apply until a change exists.
- **Omitted (capability absent):** Export, Audio/Assets, waveforms, trim, keyframes, Add scene/beat, attention pill, target picker, any Ollo-readiness claim.

## Known limitations

1. **Duration derivation assumes one beat per shot.** The rail/strip durations sum resolved shot intervals per beat ID, which is exact while Director Alpha emits one beat ID per shot. The generic schema permits shared-beat shots; a future compiler that shares shots across beats needs a genuine interval-union calculation. No engine change was made in this slice.
2. The environmental desktop delivery-store parallel-load timeout documented above (not caused by this branch; proven isolated-pass; flagged for Codex's flake lane).
3. Beat-start frames for mid-episode reaction beats are dark cut/transition frames; the required one-target evidence uses a deterministic paused in-beat frame (metadata above) instead of pretending the start frame is representative.
4. The 2+ ambiguous command state remains covered by tests/engine fixture only (no sample script compiles such a beat).

## Integration instructions

Branch is `206ff36` + `1daf540` + this handback on top of `2de764c`. Draft PR #17 targets `agent/kcast001-provider-neutral-rig`. Do not merge — Codex and Pro review the immutable head. After integration, `corepack pnpm --filter @storystage/studio test` should remain 86/86.
