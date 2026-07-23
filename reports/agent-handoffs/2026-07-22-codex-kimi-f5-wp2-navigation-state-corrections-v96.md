# Kimi correction brief - F5-WP2 navigation, recording-state, focus, and discard truth

## Immutable assignment identity

- Inbox version: `96`
- Repository: `truthunknown2-art/StoryStage`
- Exact accepted product base: `cc7f45117afd76b52444fc30735d0b2b4bf9bb8f`
- Original F5-WP2 accepted root base: `2aea29220b278d1dc043c03d0d32ee4857bc32a7`
- Rejected implementation/evidence head: `8c60c720238477d5909692a859d7b117a5551456`
- Rejected exact handback head: `f79cc248585f5e21ecfa0d4b205b83f1acff1f4b`
- Required branch: `agent/kimi-f5-wp2-narration-take-management-v2`
- Rejected draft PR retained for traceability: `#131`
- GitHub issue: `#129`
- Package: `F5-WP2` correction only
- Owner: Kimi for `apps/studio` frontend/UI/UX
- Dispatcher and reviewer: Codex

Before writing, fetch GitHub truth and verify detached `HEAD` equals the exact
accepted product base above, that it is the live `origin/product/v1` head, and
that the required v2 branch is absent locally and remotely. Read the five
mandatory product sources in their routed order, the team protocol, the
original Version 95 brief, this correction brief, and issue #129 including all
four Codex rejection comments.

Create only the required v2 branch. Incorporate the two rejected-branch
commits `8c60c720238477d5909692a859d7b117a5551456` and
`f79cc248585f5e21ecfa0d4b205b83f1acff1f4b` in that order without modifying
the rejected branch or PR #131, then apply only the bounded corrections below.
Never reset, rebase, force-push, overwrite, or rewrite either history.

The Version 95 coordination wrapper recorded exit code 1 after Kimi had already
published the exact remote handback, passed hosted verification, posted the
complete issue comment, emitted a complete final response, and left a clean
worktree. Treat this as a recorded wrapper irregularity, not an instruction to
redo accepted work. Exit cleanly after the Version 96 handback if possible.

## Accepted parts to preserve

Preserve the deterministic session-local recording/import/take model, explicit
no-device/no-file/no-audio/no-playback/no-persistence truth, recording failure
simulations, fixture-metadata import flow, bounded trim/gain/restore editing,
scene/beat scope isolation, accepted F5-WP1 Audio hierarchy, 1440x900 desktop
layout, and fail-closed evidence machinery. Do not redesign or broaden them.

## Exact review findings to correct

### 1. Workspace and Back to Projects navigation silently destroy narration state

`StudioShell.tsx` directly switches among Board, Assets, and Audio and directly
returns to Projects. `AudioWorkspace` is conditionally mounted, while all
narration takes, dirty edits, and pending state live inside
`useNarrationTakes`. Leaving Audio therefore unmounts and destroys the complete
session without the required unsaved-change decision; even a clean take cannot
survive a compatible Audio -> Board/Assets -> Audio round trip.

- Lift or otherwise retain the session-local F5-WP2 narration model at the
  smallest existing Product v1 owner that survives workspace changes. Do not
  add persistence, browser storage, backend state, or a second audio model.
- Route workspace changes and Back to Projects through the same typed guarded
  navigation contract as other destructive leave/replace paths.
- If dirty edits or another incompatible pending narration operation would be
  lost, show the explicit Stay / Discard / Keep decision before navigation.
- Stay must preserve the exact current state and return focus to the initiating
  navigation control. Discard and Keep must resolve deterministically and then
  perform the originally requested navigation.
- Compatible workspace round trips must preserve session-local takes, selected
  take, clean edits, and exact scene/beat/track ownership.
- Back to Projects may intentionally end the project session only after its
  required decision; it must never silently discard dirty state.

### 2. Track changes leave recording/import operations stale and hidden

The current scope reset is keyed only to scene and beat. Track selection simply
changes the active track, so an armed/recording walkthrough or open import
chooser can disappear on another track and reappear stale when Narration is
reselected.

- Treat a track change as an incompatible leave for active recording,
  interrupted/review work, an open import chooser, or any other operation that
  cannot truthfully survive outside Narration.
- Resolve it through a deterministic cancel/close or the existing explicit
  unsaved decision, as appropriate to whether local edits could be lost.
- Returning to Narration must never resurrect a hidden armed/recording state,
  stale chooser, stale dialog, or stale focus target.
- Preserve compatible clean Narration takes and exact scope ownership.

### 3. Confirmation focus is restored only for Stay

The current `resolvePending` path deliberately restores focus for Stay but not
for Discard or Keep. Those outcomes can remove the focused dialog button and
leave focus on `body` across select-take, scope, retake, pointer track,
workspace, and Back-to-Projects transitions.

- Define a deterministic post-decision focus destination for every Stay,
  Discard, and Keep outcome.
- For Stay, return to the control that requested the blocked action.
- For a completed in-workspace action, focus the resulting selected control or
  the closest stable heading/status target that explains the new state.
- For workspace navigation, focus that workspace's stable heading or primary
  entry target. For Back to Projects, focus the Projects page heading or first
  stable project action.
- Never leave focus on a removed dialog node or `document.body`; keep Escape
  and keyboard-only behavior deterministic.

### 4. Discard walkthrough has no explicit discarded/cancel outcome

The current `discard-walkthrough` transition reaches generic idle without an
observable discard/cancel decision. `sendRecording` records a visible decision
only for Keep, so the creator cannot tell whether the stopped walkthrough was
discarded or merely reset.

- Give Discard an explicit truthful local-prototype outcome, such as
  `Walkthrough discarded - no audio existed`, distinct from generic idle.
- The outcome must remain visibly bounded to UI/prototype metadata and must not
  claim that media was deleted.
- Add a deterministic next action that returns to idle or starts a new
  walkthrough without erasing the outcome before it can be perceived.

## Required regressions

Add focused tests that encode why state cannot disappear and keyboard users do
not lose their place:

1. Create a take, make trim/gain dirty, request Board and Assets navigation,
   and cover Stay, Discard, and Keep. Stay preserves exact state and focus;
   Discard/Keep resolve deterministically; compatible round trips preserve
   session-local takes.
2. Request Back to Projects with dirty edits and cover Stay, Discard, and Keep,
   including exact navigation and post-decision focus.
3. Switch tracks while armed, recording, stopped/review, interrupted if
   reachable, and while the import chooser is open. Returning to Narration must
   not resurrect stale operation state or stale focus.
4. Pin confirmation focus behavior after Stay, Discard, and Keep for
   select-take, scene, beat, retake, pointer-selected track, keyboard-selected
   track, workspace navigation, and Back to Projects.
5. Assert the explicit Discard walkthrough outcome and its persistent
   no-media truth before the next action resets it.
6. Preserve the original F5-WP2 transition, failure, scope, truth-language,
   keyboard, reduced-motion, and fail-closed evidence tests.

## Required verification and browser evidence

Run at minimum:

- the corrected focused F5-WP2 tests;
- the complete Studio suite with `VITEST_MAX_WORKERS=2`;
- Studio typecheck and production build;
- touched-file lint and `git diff --check`;
- the corrected evidence script through the real Product v1 journey; and
- the repository-root verifier serialized with bounded workers, recording an
  exact truthful ledger for any unchanged host flake.

Recapture or add the minimum exact 1440x900 evidence needed to prove:

- the workspace-navigation unsaved decision and preserved Audio round trip;
- Back to Projects Stay plus one completing decision;
- track switching from an active recording/import operation without stale
  resurrection;
- post-decision focus on a visible stable destination; and
- the explicit discard-walkthrough outcome.

Update the expected screenshot-name set so the gate fails closed on missing,
duplicate, extra, empty, wrong-dimension, or duplicate-hash captures. Regenerate
the report and every SHA-256. Require zero console warnings/errors and zero page
errors. Do not claim responsive or milestone-complete evidence.

## Allowed files

Touch only the minimum existing F5-WP2 and Product v1 Studio shell/workspace
source, styles, tests, package evidence script/report/screenshots, and one new
immutable v2 correction handback. Do not modify canonical product, roadmap,
status, plan, backend, workers, Godot, Remotion, or Kimi inbox files. Do not add
persistence or begin any F5-WP3+ behavior.

## Handback and stop condition

Commit and push one immutable successor on the required v2 branch, open one new
draft PR to `product/v1`, leave rejected PR #131 unchanged for traceability,
and post the complete correction handback to issue #129. Record the accepted
product base, original root base, rejected heads, correction implementation and
evidence head, final handback tip, exact changed files, commands/results,
screenshot dimensions/hashes, report SHA, console/page-error counts, remaining
limitations, and the Version 95 wrapper exit-code irregularity. Then exit
cleanly without polling.

Stop before F5-WP3. Do not request ChatGPT Pro review and do not merge.
