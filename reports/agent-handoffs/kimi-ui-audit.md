# Kimi audit — UI/UX lane + visual-performance boundary

```json
{
  "from": "kimi",
  "to": ["chatgpt-pro", "codex"],
  "baseCommit": "ac4d469",
  "branch": "agent/kimi-frontend",
  "scope": "Read-only product audit vs binding mockups; motion-quality critique; visual-performance boundary proposal; UI file plan",
  "status": "review-ready",
  "questions": [
    "Does Pro accept the continuity consumer contract candidate 2a2ade2 as the binding base? This audit endorses it as-is.",
    "Viseme timing: ResolvedEntityFrame.visemeId is schema-present but the evaluator hardcodes null — confirm Codex owns wiring viseme compilation into continuity, with Kimi owning only mouth-shape appearance.",
    "agent/audio-domain-adr001 exists on the remote — is that the lane that will eventually back the Voice/SFX timeline lanes and Audio department tab? Kimi will omit those controls until then.",
    "May Kimi port the copy/responsive polish from the preserved agent/kimi-phase1-create branch (built on main, now superseded) into the Slice A/B work, or does Codex prefer fresh implementations?"
  ],
  "mergeRiskNotes": "agent/kimi-phase1-create (3 commits on main@49a7608: mockup PNGs, Create-screen rebuild, handoff) diverges from this base; treat as reference only. The mockup PNGs duplicated there are superseded by docs/design/creator-first-reset/ on this branch."
}
```

## 0. Method and honesty notes

- Code-based audit on `agent/kimi-frontend` @ `ac4d469`. The Electron app was **not** run; no live screenshots were captured in this environment. Every defect below names the exact component/CSS area, but desktop/1024px rendering, keyboard traversal, and focus behavior still need a live verification pass (listed as Slice D exit criteria).
- Motion critique is based on source plus six extracted frames from `artifacts/pro-review/moonlit-ruins-directed-continuity-v2-review.mp4` (frames at t=1/5/10/15/20/23s).
- Binding mockups referenced: `docs/design/creator-first-reset/story-stage-create-v1.png`, `docs/design/creator-first-reset/story-stage-studio-v1.png`.

## 1. Product audit — five largest defects vs the binding mockups

**D1 — The Studio workspace reads as three parallel products, not one.** `App.tsx` toggles `Cv001CreatorApp` ⇄ `LegacyApp` (1413-line production workspace with its own `<Player component={ProductionComposition}>`, App.tsx:632), and inside the creator lane there are four more non-canonical Players (`Cv001CreatorStudio`, `Cv002TemplateAssignmentPanel`, `KidsShowcaseStudio`, plus the embedded template preview inside `Cv002DraftReview`). A creator can land in a preview that is not the authoritative `DirectorAnimaticPreview` (`director/DirectorPreview.tsx:280-296`, the single Player consuming `director.executableEpisodePlan`). *Smallest honest correction:* keep the code lanes, but route all creator-facing entry points to the `Cv002DraftReview` "direction" screen so `DirectorAnimaticPreview` is the only stage a creator ever sees; demote Legacy/showcase/template Players behind explicitly labeled internal toggles. No render-path changes — presentation routing only.

**D2 — Studio screen is missing the mockup's creator-status layer.** `Cv002DraftReview.tsx` "direction" screen has the rail + Player + Director panel skeleton, but none of the status furniture that makes the mockup read as a living project: no project-title/grammar/style chips, no autosave indicator ("Autosaved just now"), no "⚠ Needs attention: N visuals" roll-up, no Preview/Export top-bar actions. Scene-rail cards (`creator-studio-components.tsx` `CreatorSceneRail`) lack durations, Done/Editing/To-do status, and "+ Add scene"; `CreatorBeatStrip` lacks "+ Add beat". *Smallest honest correction:* add the top-bar project chip row + autosave timestamp (real: derive from the existing localStorage persistence write time in `Cv001CreatorApp`); a needs-attention count derived from real capability-resolution output (proxy-only vs final-ready, already computed by `DirectorMotionPanel`); scene durations from `timingSolution`; status from real per-beat capability state. Omit Preview/Export buttons until wired to the real render-worker job, or wire Export to the existing real export path and label it by its true state.

**D3 — Create screen is missing five mockup commitments and mis-places the CTA.** In `Cv001CreatorApp.tsx`: (a) no "Import .txt" (mockup step 1); (b) no duration estimate beside the word count ("86 words · about 35 seconds" — the timing heuristic already exists in `story-engine/src/timing.ts`); (c) art-style trio does not match the mockup (shows "Editorial collage" where the mockup shows "Paper Collage"; "Ink & Wash" disabled); (d) all "Voice & format" selects disabled with no explanation; (e) "Create first cut" CTA sits inside the right column instead of dominant bottom-right, and there's no "Back to projects". *Smallest honest correction:* (a) real `<input type="file" accept=".txt">` reading into the script state — honest in both browser and desktop; (b) surface the real estimate; (c) rename/reorder style cards to the mockup set, keep unbacked styles disabled with "Coming later" exactly as the mockup itself does for Ink & Wash; (d) keep Voice & format disabled but add the honest one-line reason; (e) move CTA to a full-width footer bar bottom-right; add the back action.

**D4 — The bottom timeline does not yet read as the mockup's episode overview.** Current: per-beat `DirectorTimelineDrawer` (Shots/Events/Camera lanes, keyframe ticks) — real and good, but scoped to the selected beat and collapsed by default. Mockup: always-visible compact beat strip + expandable full-episode multi-track timeline. *Smallest honest correction:* make `CreatorBeatStrip` always visible under the Player (it exists), and re-scope the drawer to episode range with the three real lanes only (Shots/Events/Camera — all backed by `director-timeline-view-model.ts`). Do not add Voice/SFX/Character lanes until the audio domain and performance lanes actually produce data (see Q3); the mockup's waveforms are targets, not license to fake.

**D5 — Unverified responsive/accessibility behavior on the new shell.** `cv002-draft-review.css` (2924 lines) defines the studio shell ratios, but nothing on this branch has been visually verified at 1024px or narrow widths, and keyboard/focus traversal across the rail → Player → Director panel → timeline has never been exercised. `styles.css` (legacy) predates the shell. *Smallest honest correction:* Slice D verification pass — live run at 1440/1024/720px, axe-core or equivalent scan, focus-order walkthrough; then fix concrete findings only (expected hotspots: rail collapse below 1024px, Director panel stacking order, thumbnail buttons' focus rings in `cv002-draft-review.css`).

## 2. Motion critique — does the current output read as genuine performance?

**The art now does; the motion does not — yet.** The six reviewed frames show consistent, genuinely appealing storybook characters and scene compositions (real generated art, day/night palettes, a third "stone creature" character, firefly occlusion layers). This is no longer engineering-fixture art.

But the motion vocabulary underneath is still **pose-index swapping and hand-tuned one-offs**, not performance:

- `KidsShowcaseComposition.tsx` (which rendered the reviewed MP4 via `apps/render-worker/src/kids-showcase-proof.ts`): whole-body atlas swaps (`poseIndex={frame < 44 ? 0 : 1}`, `Math.floor(frame / 3) % 8` walk cycles). Walk "cycles" are frame-cycled drawings, not articulated locomotion; no blink, no gaze, no visemes, no phase easing.
- `MaraPayoffPuppet` / `PuppetSheetPart`: hand-coded SVG parts driven by inline per-scene `clampInterpolate` constants — real articulation, but hand-authored per shot with no plan data; doesn't scale to arbitrary scripts.
- `DirectorEpisodeRenderer.tsx` (this branch): proxy animatic only (`renderMode !== "proxy-animatic"` throws); CSS-blob placeholders; `ArticulatedPerformanceRenderer` exists but consumes self-authority proxy keyframes for root and camera — exactly the authority split the new contract forbids.
- `Cv001RigProofComposition.tsx` + kinematics: the richest rig on-branch (bones, gaze-x, blink, mouth-open channels) but evaluated via the old `DirectedBeatProgram` model where the rig owns root/camera tracks.

Verdict: output currently reads as a **high-quality animated storyboard**. It becomes "genuine performance" when articulation, face, and timing arrive from one canonical source — which is precisely what the candidate contract enables. This audit therefore recommends building the performance layer against it rather than extending any on-branch puppet.

## 3. Visual-performance boundary — proposal

**Proposal: adopt `2a2ade2`'s `packages/story-engine/src/director/visual-performance-contract.ts` unchanged as the binding TypeScript boundary.** It already encodes exactly the ownership line Pro accepted, and it is fail-closed at runtime, not by convention:

- **Authority side (Codex):** `evaluateContinuityFrame(episodePlan, absoluteFrame)` → `ResolvedContinuityFrame` — root transforms, velocity, facing, gaitPhase, actionPhase/phaseProgress, visibility/lifecycle, prop ownership+socket, camera samples, transition samples, shot timing, plus hash bindings to the sealed `ExecutableEpisodePlan` and `ContinuitySequencePlan`.
- **Performance side (Kimi):** implement `VisualPerformanceRenderer { rendererId, rendererVersion, evaluate(input: LocalPerformanceInput): unknown }` returning `LocalPerformanceFrame` — actor-local `parts` (exact declared partIds), `face` (eyeOpen, pupil, brow, mouthExposureId), `sockets`, `localEffects`. Deterministic secondary motion derives from the contract's `microMotionSeed`.
- **The gate:** `evaluateLocalPerformance(renderer, rawInput)` — hash-binding assertions, frozen input snapshot, exact-manifest-key validation, whole-actor-opacity rejection. Kimi's renderer can be swapped or versioned without ever touching continuity authority.
- **Root-leak prevention is already structural:** reserved part IDs (`root`, `whole-body`, `global`, …) and the parts-exact-key rule make it impossible for a rig to smuggle root motion into a part.

**Where Kimi code lives:** new `packages/remotion-runtime/src/performance/` — rig runtime, motion programs (walk/idle/reaction cycles, easing library, blink scheduler, viseme mouth mapper), and the proof composition. This package imports the contract types only; it never imports the continuity compiler, camera, or transition code. The single consumption point is the canonical `DirectorEpisodeRenderer` (2a2ade2 version), which already calls `evaluateContinuityFrame` per frame and asserts `performance.contentHash === resolved.performanceProgramContentHash` before rendering.

**Known contract gaps to schedule (not blockers):** `visemeId` currently hardcoded `null` by the evaluator (Codex owns wiring viseme compilation); camera `rotation` hardcoded `0`. Kimi's renderer will handle both fields correctly the moment they carry data.

## 4. First visual-performance proof (post-acceptance) — 120–150 frames, generic Kids

One character, one shot, executed entirely through `evaluateLocalPerformance` against a supplied continuity stream:

1. **Walk in** (`motionMode: walking`, gaitPhase 0→1 loops): leg swing + arm counter-swing phase-locked to gaitPhase; torso bob at 2× gait frequency with ≤3% squash.
2. **Decelerate + named plant** (decelerating → idle, plant picture-event): Hermite-settle on torso, foot lock at plant frame, anticipation dip before stop.
3. **Gaze/head lead**: head rotates toward `gazeVectorLocal` 4–6 frames before torso follows; pupils lag 2 frames (pupilX/Y from gaze vector).
4. **Arm reach** during `actionPhase: action` with anticipation→overshoot→settle easing (phaseProgress-parameterized).
5. **Viseme cues**: mouth exposure swap per supplied `visemeId` (if still null, sequence synthetic cues in the proof harness only, labeled synthetic).
6. **Blink**: `eyeOpen` 1→0.1→1 over 4 frames, scheduled from `microMotionSeed` every 2.5–4.5s.
7. **Settle + living hold**: breathing scaleY amplitude ≤0.08 (matches the living-hold contract), micro-sway from seed.

Validation: fail-closed via `evaluateLocalPerformance` (8 rejection classes already test-pinned); golden-frame snapshots at the named events; a render proving **no part transform moves the actor root** (actor stays at local origin; continuity host moves it).

## 5. UI implementation file plan (small reviewable slices, after Pro/Codex accept this audit)

- **Slice A — Create screen** (`Cv001CreatorApp.tsx`, `styles.css` or dedicated css): D3 corrections — Import .txt, duration estimate, style-card alignment, Voice & format honesty line, footer CTA, Back to projects. Evidence: desktop + 1024px captures, control→state mapping, tests.
- **Slice B — Studio status layer** (`Cv002DraftReview.tsx`, `creator-studio-components.tsx`, `cv002-draft-review.css`): D2 corrections — project chips, autosave timestamp, needs-attention roll-up, scene durations/status, Add scene/Add beat wired to real operations (`commitCv002Operation`); Export omitted or wired real.
- **Slice C — Timeline consolidation** (`DirectorTimelineDrawer.tsx`, `director-timeline-view-model.ts`, `CreatorBeatStrip`): D4 — always-visible beat strip, episode-scoped drawer with the three real lanes only.
- **Slice D — Presentation consolidation + verification** (`App.tsx` routing, `cv002-draft-review.css`): D1 + D5 — creator entry points route to the single canonical stage; live 1440/1024/720px captures, keyboard/focus walkthrough, axe scan; fix confirmed findings only.

Each slice: own commit(s), desktop + 1024px screenshots, keyboard/focus notes, tests, and a control→real-mutation mapping table. Anything the engine can't back is honestly labeled or omitted.

## 6. Immediate dependencies

1. Pro: accept/reject contract candidate `2a2ade2` (this audit votes accept).
2. Codex: confirm this branch may rebase onto the accepted continuity commit for Slice A–D bases (per KIMI_START_HERE.md, visual-performance product code waits for that base; UI slices A–C do not touch performance code and can start on `ac4d469` if Pro agrees).
3. Preston: visual spot-check of Slice A captures when they land (you are the final authority on "looks right").
