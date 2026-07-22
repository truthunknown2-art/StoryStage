# F5 - Narration and sound workspace

## Authority

- Governing roadmap: `docs/PRODUCT_ROADMAP.md`, milestone F5
- Required predecessor: accepted F4 assets and rigs workspace content at
  `product/v1@5c7107f3b201780865c30f11a59716e4a82d16d4`
- Exact plan base: verified F4 acceptance/status merge
  `product/v1@02be1ed0d68a4dd963b1a0fbf3643ad03fa69903`
- Owner: Kimi for `apps/studio` frontend implementation
- Dispatcher and device/audio feasibility reviewer: Codex
- Milestone auditor: ChatGPT Pro
- Product authority: Preston's standing dependency-ordered continuation
  direction recorded on 2026-07-21
- Decomposition approval: the dependency-ordered F5-WP1 through F5-WP5
  decomposition was accepted in G0 and is restated here before implementation
- Current authorization: `ACCEPTED_WAIT`. F5-WP1 requires a separate issue,
  exact-base status transition, full brief, required branch, and higher
  validated Kimi inbox version before `START_NOW`
- Backend product work remains blocked until the complete F6 Frontend Gate is
  accepted

## Objective and milestone invariant

Complete the creator-facing narration, sound-effects, and music workflow states
before connecting devices, files, analysis, or final mixing.

Recording, takes, cues, and mix controls must expose complete
success/error/cancel states without claiming access to a microphone or audio
file until the backend exists. Every visible result must be real local prototype
state or clearly labelled demo/unavailable state.

## Dependency-ordered work packages

### F5-WP1 - Audio workspace and track hierarchy

**Primary invariant:** Narration, Dialogue, SFX, and Music share one explicit
scene/beat scope, and every take or cue remains visibly associated with its
selected track without implying that media exists.

**Tasks**

- add Narration, Dialogue, SFX, and Music views;
- add scene and beat scope that agrees with the existing Studio selection;
- add truthful local-demo take and cue cards;
- add a selected-track inspector; and
- distinguish guide timing from final timing wherever timing is shown.

**Non-goals:** microphone or device access, file access or import, playback,
waveforms, lip sync, mixing, persistence, backend contracts, Godot, Remotion,
rendering, or export.

**Targeted verification and completion:** scope, navigation, selection, and
track-inspector tests; honest empty and labelled-demo states; Studio
typecheck/build; desktop screenshots; root verification; and an exact pushed
handback. Stop before F5-WP2.

### F5-WP2 - Narration recording and take-management UX

**Primary invariant:** every recording, import, and take-management path ends in
an explicit success, error, or cancel state, and no path claims that a device or
audio file was actually used.

**Tasks**

- add arm, record, stop, cancel, audition, keep, discard, and retake states;
- add import, trim-handle, gain, and restore states;
- cover permission denied, missing device, interrupted, empty, invalid-file,
  and unsaved-change paths; and
- preserve the selected scene, beat, track, and take through every transition.

**Non-goals:** real `MediaRecorder` or device calls, actual file reads, WAV
storage, speech synthesis, playback, waveform decoding, automatic timing
authority, or backend contracts.

**Targeted verification and completion:** state-machine tests cover every
listed path; no simulated success is presented as real media; selected scope
survives cancel/error/retry; record, permission, and retake screenshots; root
verification; and an exact pushed handback. Stop before F5-WP3.

### F5-WP3 - SFX and music placement UX

**Primary invariant:** every SFX or music cue has explicit scope, source-rights
truth, and reversible local placement state, including missing-media and
license-warning failures.

**Tasks**

- add a searchable, clearly labelled local-library prototype;
- expose source, license, and attribution fields;
- add local prototype states for import, place, move, trim, loop, fade, gain,
  mute, delete, and narration ducking; and
- cover missing-media and license-warning states.

**Non-goals:** web downloading, Suno or other provider APIs, real file import,
audio decoding or playback, final mixing, persistent cue writes, or backend
contracts.

**Targeted verification and completion:** cue-edit tests prove scoped and
reversible local state; source/license requirements remain visible; missing
media and license warnings fail closed; SFX, music, and warning screenshots;
root verification; and an exact pushed handback. Stop before F5-WP4.

### F5-WP4 - Timing and lip-sync review UX

**Primary invariant:** derived timing is visibly tied to one selected narration
take, becomes stale when that take changes, and cannot become timing authority
without an explicit scoped apply action.

**Tasks**

- show the selected narration take as the timing basis;
- add word/clause markers and a clearly approximate viseme lane;
- add editable mouth events plus mute and solo controls;
- invalidate derived timing after take replacement; and
- add an explicit apply-as-timing-authority review action.

**Non-goals:** phoneme inference, waveform generation, character animation,
canonical timing writes, Godot shots, Remotion assembly, or backend analysis.

**Targeted verification and completion:** take replacement invalidates derived
state; manual viseme edits remain scoped; mute/solo changes observable local
state; guide/final/approximate/authority copy is exact; timing and stale-state
screenshots; root verification; and an exact pushed handback. Stop before
F5-WP5.

### F5-WP5 - Responsive, accessibility, and evidence gate

**Primary invariant:** the complete F5 audio journey is keyboard-usable and
reachable at supported viewport sizes, and its evidence matches the exact
candidate without claiming backend audio capabilities.

**Tasks**

- complete keyboard operation, focus restoration, compact layout, and
  accessible state announcements across the audio workflow;
- honor reduced motion; and
- capture exact screenshot/hash evidence and a complete click-through at the
  required viewports.

**Non-goals:** F6 timeline/export, device or file integration, provider APIs,
backend audio, real playback or mixing, Godot, Remotion, rendering, export, or
packaging.

**Targeted verification and completion:** required viewports; no overflow or
unreachable region; complete keyboard route; reduced-motion checks; zero
console/page errors; exact evidence hashes and handback; root and hosted
verification; independent Codex audit; ChatGPT Pro exact-head milestone review;
and Preston's standing-authority acceptance.

## Required milestone evidence

- recording, import, and take-management success/error/cancel states;
- permission-denied, missing-device, interrupted, invalid-file, and unsaved
  states without simulated media success;
- scoped SFX/music placement, retiming, gain/fade/mute, and narration-ducking
  interactions with source/license truth;
- selected-take timing basis, stale derived timing, manual mouth events, and
  explicit timing-authority review;
- keyboard and responsive captures at the required viewports;
- exact screenshot dimensions and unique hashes, zero console/page errors,
  complete tests, root verification, hosted verification, and exact handback;
  and
- independent Codex audits plus ChatGPT Pro's exact-pushed-head milestone
  verdict copied to GitHub.

## Milestone gate

Preston can understand and complete the intended narration and sound journey,
including failures, while every take, cue, timing marker, and mix control is
truthfully local prototype state and no screen claims real recorded, imported,
played, analyzed, or mixed media. Passing F5 does not authorize F6 until its
separate ticket and exact-base status transition, and it does not authorize
backend product work before the accepted F6 Frontend Gate.
