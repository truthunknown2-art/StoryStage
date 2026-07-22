# Kimi assignment - F5-WP1 audio workspace and track hierarchy

## Immutable assignment identity

- Inbox version: `91`
- Repository: `truthunknown2-art/StoryStage`
- Exact accepted base: `eb9890d75126381e61849a5994f28474d133bfb7`
- Required branch: `agent/kimi-f5-wp1-audio-workspace-track-hierarchy`
- GitHub issue: `#124`
- Milestone plan: `docs/plans/milestone-F5.md`
- Package: `F5-WP1` only
- Owner: Kimi for `apps/studio` frontend/UI/UX
- Dispatcher and reviewer: Codex

Before writing, fetch GitHub truth, verify detached `HEAD` equals the exact
accepted base, verify the required branch does not already exist locally or
remotely, read the five mandatory product sources in their routed order, read
the team protocol, this full brief, and issue #124, then claim issue #124.

## Outcome

Extend the accepted Product v1 Studio with the first bounded narration and
sound workspace slice. The creator must be able to understand Narration,
Dialogue, SFX, and Music as four track types, see their shared scene/beat scope,
select truthful local-demo take or cue cards, inspect the selected track, and
distinguish guide timing from final timing. Nothing in this package may imply
that media was recorded, imported, decoded, played, mixed, persisted, or sent
to an engine.

## Primary invariant

Narration, Dialogue, SFX, and Music share one explicit scene/beat scope, and
every take or cue remains visibly associated with its selected track without
implying that media exists.

## Required implementation

1. Add a Product v1 Audio workspace reachable through the accepted Studio
   navigation without adding a competing route or entering Legacy Studio.
2. Provide four understandable views: Narration, Dialogue, SFX, and Music.
   Their selected state, heading, count/state summary, cards, and inspector must
   agree.
3. Reuse the accepted selected scene and beat as the visible audio scope. A
   scene or beat change must update the audio surface deterministically and must
   not leak selection from the previous scope.
4. Add bounded truthful fixture data sufficient to show take cards for voice
   tracks and cue cards for SFX/Music. Label every fixture as local demo or
   planning data; do not describe it as recorded, imported, playable, saved, or
   production media.
5. Add an understandable empty state for each track type and for a scope with no
   cards. Empty state copy must explain what later work will enable without a
   fake success action.
6. Add one selected-track inspector that exposes only planning metadata already
   supported by this slice: track type, scene/beat scope, selected take/cue
   identity, status/truth label, and guide-versus-final timing basis.
7. Use exact truth language for timing. Guide timing is provisional planning
   information; final timing is unavailable until later accepted audio work.
8. If device, import, audition/playback, waveform, lip-sync, or mixing actions
   are visible for orientation, keep them disabled with a specific reason.
   Omission is preferable when a disabled control adds no creator value.
9. Preserve all accepted F1-F4 behavior, routes, focus contracts, scoped
   selection/history, asset readiness truth, and local-fixture boundaries.

## Interaction and accessibility requirements

- Use the repository's existing tabs/navigation and selection conventions.
- The active track view must expose programmatic selected state and be keyboard
  reachable.
- Cards must use real buttons or links when selectable; selection must produce
  an observable inspector change.
- Empty/demo/unavailable labels must remain visible without hover.
- Preserve visible focus and sensible focus order for every new control.
- This package requires a coherent desktop layout; the complete responsive,
  compact, reduced-motion, and milestone evidence gate remains F5-WP5.

## Explicit non-goals

- microphone, permission, or device access;
- real record/stop/cancel/audition/retake behavior;
- file dialogs, file reads, import, media storage, or persistence;
- playback, audio decoding, waveforms, trim handles, gain, fades, looping,
  ducking, or mixing;
- timing analysis, speech synthesis, phonemes, visemes, lip sync, mouth events,
  or canonical timing writes;
- provider integration, workers, backend contracts, Godot, Remotion, rendering,
  export, packaging, QA, or private launch;
- F5-WP2, F5-WP3, F5-WP4, F5-WP5, F6, or any later package; and
- canonical roadmap, plan, product architecture, or Kimi inbox edits.

## Required tests and evidence

Add focused tests that prove why the package is safe and understandable:

- Audio is reachable through Product v1 Studio and all four views work.
- Track selection, heading, cards, and inspector remain synchronized.
- Scene/beat changes update scope and clear or deterministically replace stale
  card selection.
- Voice take cards and SFX/Music cue cards remain associated with the correct
  track and scope.
- Empty states and local-demo truth labels are visible and exact.
- Guide timing cannot be mistaken for final timing.
- No device/file/playback/waveform/lip-sync/mixing success path exists.
- Accepted Studio tests continue to pass.

Run at minimum:

- the focused new F5-WP1 tests;
- the complete `apps/studio` test suite with bounded workers if needed;
- Studio typecheck and production build;
- touched-file lint and `git diff --check`; and
- the repository-root verifier, serialized if required by the host.

Capture actual desktop browser evidence at 1440x900 for:

- Narration with a selected local-demo take and inspector;
- one Dialogue empty or scoped state;
- SFX with a selected local-demo cue; and
- Music showing the guide-versus-final timing boundary.

The evidence report must bind every screenshot to exact dimensions and SHA-256,
contain no duplicate image hash, exercise the real Product v1 navigation, and
record console/page errors. Do not claim responsive or milestone-complete
evidence in this package.

## Allowed files

Touch only the minimum `apps/studio` source, styles, tests, and package-specific
browser evidence/report files required for F5-WP1, plus the immutable handback.
Do not modify canonical product/roadmap/status documents, backend packages,
workers, Godot/Remotion code, or the Kimi inbox.

## Handback and stop condition

Commit and push only the required branch. Open a draft PR to `product/v1`. Add
an immutable dated handback under `reports/agent-handoffs/` that records the
exact implementation/evidence head, final handback tip, changed files, exact
commands/results, screenshot paths/dimensions/hashes, console/page-error count,
truthful limitations, and integration instructions. Post the complete handback
to issue #124, then exit cleanly.

Stop before F5-WP2. Do not wait in an idle Kimi session and do not begin any
later package.
