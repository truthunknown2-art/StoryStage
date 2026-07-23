# Kimi assignment - F5-WP2 narration recording and take-management UX

## Immutable assignment identity

- Inbox version: `95`
- Repository: `truthunknown2-art/StoryStage`
- Exact accepted base: `2aea29220b278d1dc043c03d0d32ee4857bc32a7`
- Required branch: `agent/kimi-f5-wp2-narration-take-management`
- GitHub issue: `#129`
- Milestone plan: `docs/plans/milestone-F5.md`
- Package: `F5-WP2` only
- Owner: Kimi for `apps/studio` frontend/UI/UX
- Dispatcher and reviewer: Codex

Before writing, fetch GitHub truth, verify detached `HEAD` equals the exact
accepted base, verify the required branch does not already exist locally or
remotely, read the five mandatory product sources in their routed order, read
the team protocol, this full brief, and issue #129, then claim issue #129.

## Outcome

Extend only the accepted Product v1 Audio workspace Narration experience with
a complete, deterministic recording/import/take-management UX state model. A
creator must be able to walk through arm, record, stop, cancel, audition, keep,
discard, retake, import, trim, gain, restore, error, and unsaved-change states
while the selected scene, beat, track, and take remain explicit. Every surface
must state that this is a local UI prototype: no microphone, permission prompt,
file, audio bytes, playback, waveform, persistence, or backend exists.

## Primary invariant

Every recording, import, and take-management path ends in an explicit success,
error, or cancel state, selected scene/beat/track/take scope is preserved, and
no state claims that a device or audio file was actually used.

## Required implementation

1. Extend the accepted Audio workspace; do not add a competing route, duplicate
   track hierarchy, or enter Legacy Studio.
2. Add a deterministic, typed, session-local Narration state machine covering
   idle, armed, recording walkthrough, stopped/review, cancelled, interrupted,
   permission denied, and missing device. No real clock, device, permission,
   stream, or audio buffer may participate.
3. Make arm, record, stop, and cancel controls perform honest UI-state
   transitions. Recording and stopped states must visibly say that no audio is
   captured and no media exists. A completed transition is only a completed UI
   walkthrough, never a recording success claim.
4. Add deterministic local-prototype take decisions for audition, keep,
   discard, and retake. Audition may change review state but must not play or
   claim to play audio. Keep/discard/retake may update only session-local
   prototype metadata and must preserve the take's explicit no-media truth.
5. Add a deterministic import walkthrough with chooser/result states backed
   only by fixture metadata. Cover cancel, empty, and invalid-file results. Do
   not open a picker, read a path/file/blob, inspect bytes, or create media.
6. Add prototype trim-handle, gain, and restore editing over bounded numeric
   metadata only. Show exact current values, deterministic bounds, dirty/clean
   state, and what Restore changes. Do not render a waveform or imply decoded
   duration/audio.
7. Add an explicit unsaved-change decision wherever leaving or replacing the
   active prototype take could lose local edits. Cover stay/cancel, discard, and
   confirm paths without silently dropping state.
8. Preserve selected scene, beat, Narration track, and take through every
   compatible transition. On scene/beat or track changes, resolve incompatible
   state deterministically, never leak a take across scope, and never bypass an
   unsaved-change decision.
9. Keep accepted F5-WP1 empty/no-card truth, guide-versus-final timing labels,
   track keyboard behavior, shared scope, and all accepted F1-F4 behavior
   intact. Dialogue, SFX, and Music must not acquire recording or placement
   behavior in this package.

## Truth language and interaction requirements

- Keep a persistent visible label such as **Local prototype - no audio is
  captured, imported, or played** on every new workflow state.
- Do not use `Recorded`, `Imported`, `Playing`, `Saved`, `Ready`, `Complete`, or
  equivalent success language unless the same phrase explicitly limits the
  success to local UI/prototype metadata and states that no media exists.
- Permission-denied and missing-device states are deterministic simulations for
  workflow review, not evidence that the browser requested device access.
- Every enabled control must cause an observable, truthful state change; omit
  controls that have no bounded state transition.
- Use real buttons, labels, descriptions, dialogs/alerts where appropriate, and
  preserve visible focus, logical focus return, keyboard reachability, and
  deterministic Escape/cancel behavior.
- The complete responsive, compact, reduced-motion, and milestone evidence gate
  remains F5-WP5. This package requires a coherent 1440x900 desktop layout.

## Explicit non-goals

- `MediaRecorder`, `getUserMedia`, microphone/device enumeration, permission
  APIs/prompts, streams, timers tied to real capture, or audio buffers;
- file dialogs, drag/drop, clipboard paths, file/blob reads, WAV/media storage,
  uploads, downloads, or persistence;
- playback, audio decoding, waveform generation, duration analysis, speech
  synthesis, transcription, timing authority, phonemes, visemes, or lip sync;
- real trim/gain processing, fades, mixing, SFX/music placement, or ducking;
- provider integration, workers, backend contracts, Godot, Remotion, rendering,
  export, packaging, QA, or private launch;
- F5-WP3, F5-WP4, F5-WP5, F6, or any later package; and
- canonical roadmap, plan, product architecture, or Kimi inbox edits.

## Required tests and evidence

Add focused tests that encode why the workflow is safe and understandable:

- every required recording state and permitted transition;
- cancel/error/retry recovery for permission denied, missing device, and
  interrupted walkthroughs;
- audition/keep/discard/retake prototype decisions without playback/media
  claims;
- import cancel, empty, and invalid-file paths without any file API/read;
- trim/gain bounds, dirty state, restore, and unsaved-change stay/discard/confirm
  paths;
- selected scene/beat/track/take preservation and deterministic resolution with
  no cross-scope leakage;
- exact persistent no-device/no-file/no-audio/no-playback truth vocabulary;
- keyboard/focus behavior for new controls and any dialog; and
- the complete accepted Studio suite remains green.

Run at minimum:

- the focused new F5-WP2 tests;
- the complete `apps/studio` test suite with bounded workers if needed;
- Studio typecheck and production build;
- touched-file lint and `git diff --check`; and
- the repository-root verifier, serialized if required by the host.

Capture actual browser evidence at 1440x900 through the real Product v1 journey
for at least:

- Narration armed/recording walkthrough with visible no-capture truth;
- permission-denied recovery;
- missing-device recovery;
- retake or take-review decision with visible no-playback/no-media truth;
- invalid or empty import result with no file-read claim;
- trim/gain dirty state plus unsaved-change decision; and
- scene/beat scope change proving no stale take leaks.

The evidence script must pin the exact expected screenshot-name set and fail
closed on missing, duplicate, extra, empty, wrong-dimension, or duplicate-hash
captures. The report must bind each image to exact 1440x900 dimensions and
SHA-256, exercise the real Product v1 navigation, attach console/page-error
listeners before navigation, and report zero console warnings/errors and zero
page errors. Do not claim responsive or milestone-complete evidence.

## Allowed files

Touch only the minimum `apps/studio` source, styles, tests, and package-specific
browser evidence/report files required for F5-WP2, plus the immutable handback.
Do not modify canonical product/roadmap/status documents, backend packages,
workers, Godot/Remotion code, or the Kimi inbox.

## Handback and stop condition

Commit and push only the required branch. Open a draft PR to `product/v1`. Add
an immutable dated handback under `reports/agent-handoffs/` that records the
exact implementation/evidence head, final handback tip, changed files, exact
commands/results, screenshot paths/dimensions/hashes, console/page-error count,
truthful limitations, and integration instructions. Post the complete handback
to issue #129, then exit cleanly.

Stop before F5-WP3. Do not wait in an idle Kimi session and do not begin any
later package.
