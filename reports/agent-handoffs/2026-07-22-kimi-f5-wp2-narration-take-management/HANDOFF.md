# F5-WP2 immutable handback — Narration recording and take-management UX

Task: `F5-WP2-NARRATION-TAKE-MANAGEMENT`
Issue: [#129](https://github.com/truthunknown2-art/StoryStage/issues/129)
Required branch: `agent/kimi-f5-wp2-narration-take-management`
Inbox: version `95` on `origin/agent/kimi-frontend`
Full brief:
`reports/agent-handoffs/2026-07-22-codex-kimi-f5-wp2-narration-take-management-v95.md`

## Exact identity

- Exact accepted product base: `2aea29220b278d1dc043c03d0d32ee4857bc32a7`
  (verified before writing: detached `HEAD` equalled this exact commit with a
  clean tree, and it was the live `origin/product/v1` head).
- Required branch was confirmed absent locally and remotely before creation
  and was created at the exact base.
- Canonical start-status transition: PR
  [#130](https://github.com/truthunknown2-art/StoryStage/pull/130) merged the
  bounded F5-WP2 start status into `product/v1` at
  `cc7f45117afd76b52444fc30735d0b2b4bf9bb8f` after this branch was created.
  That merge changes only `docs/ROADMAP_STATUS.md` and names exactly this
  assignment (`START_NOW / F5 / F5-WP2 / owner Kimi / exactBase 2aea2922… /
  this branch / issue #129`). It was incorporated by a plain fast-forward
  merge before any implementation commit — no reset, rebase, cherry-pick,
  force-push, or status edit by Kimi — so the branch carries the canonical
  status it must verify against. The branch still descends directly from the
  exact accepted base.
- Implementation/evidence head: `8c60c720238477d5909692a859d7b117a5551456`
- Kimi handback tip: the commit containing this file, reported as an exact
  remote SHA in the draft PR and issue #129 because a Git commit cannot
  embed its own SHA.

## What the package adds

Only the accepted Product v1 Audio workspace's Narration experience is
extended, per the brief. New module
`apps/studio/src/product-v1/narration-takes.ts` (pure typed state model) and
`apps/studio/src/product-v1/NarrationTakePanel.tsx` (view plus the
session-local state hook) provide:

1. **A deterministic, typed, session-local recording state machine.**
   `reduceRecording` is the only way state changes: idle, armed, recording,
   stopped/review, cancelled, interrupted, permission-denied, and
   missing-device, over an explicit permitted-transition table. An event the
   current state does not permit returns `null` (fail closed), and the UI
   renders exactly the controls that have a bounded transition. No real
   clock, device, permission, stream, or audio buffer participates.
2. **Honest arm/record/stop/cancel controls.** Every state badge and detail
   states that no audio is captured and no media exists; a stopped
   walkthrough is only a completed UI walkthrough, never a recording success.
   Permission-denied and missing-device states are explicit deterministic
   simulations for workflow review — the copy states the browser was never
   asked for device access and no device was enumerated.
3. **Prototype take decisions.** Audition toggles a comparison review mark
   whose copy states no audio plays; Keep marks session-only prototype
   metadata (the control then disappears because it would have no further
   transition); Discard removes only session metadata and says no file or
   audio was deleted; Retake arms a fresh walkthrough while the existing
   take stays unchanged.
4. **A deterministic import walkthrough.** The chooser lists declared
   fixture metadata only (two valid entries, one plain-text entry for the
   invalid path) and never opens a picker, reads a path/file/blob, or
   inspects bytes. Picked, invalid, empty, and cancelled results each carry
   exact no-file truth.
5. **Prototype trim/gain/restore editing.** Bounded numeric metadata only:
   trim start stays in `[0, trim end − 1]`, trim end in
   `[trim start + 1, declared duration]`, gain in ±12 dB. The editor shows
   exact current draft values, deterministic bounds, dirty/clean state, and
   exactly what Restore changes (trim `0s–<declared>s`, gain `0 dB`).
   Durations are declared planning metadata, always labelled as never
   decoded or measured. No waveform exists.
6. **An explicit unsaved-change decision.** Any action that would leave or
   replace the active take while its trim/gain draft is dirty — switching
   takes, discard, retake, a scene/beat scope change, a track switch, or
   starting a new recording/import walkthrough — opens an `alertdialog`
   requiring Stay, Discard draft edits, or Keep edits as session metadata.
   State is never silently dropped; while a decision is pending, further
   guarded actions are ignored fail-closed.
7. **Scope preservation with no leak.** Every prototype take is bound to the
   exact scene/beat scope where it was created and is visible only there;
   selection follows the accepted deterministic rule (keep while visible,
   else first visible, else none). A scope or track change abandons any
   unfinished walkthrough, closes the chooser, and clears decision notes
   deterministically, and a dirty draft always passes the unsaved-change
   decision first.
8. **Preserved accepted behavior.** F5-WP1 empty/no-card truth,
   guide-versus-final timing labels, track keyboard contract, shared scope,
   and all F1–F4 behavior are unchanged. Dialogue, SFX, and Music acquired
   no recording or placement behavior: the take panel renders only for
   Narration (hidden on other tracks), and Narration's inspector keeps one
   truthful disabled orientation action (`Play take audio`) because
   playback, waveforms, and mixing remain outside this package.

The persistent label **Local prototype — no audio is captured, imported, or
played** is visible on every workflow state.

## Changed files

Implementation/evidence head `8c60c72` (9 source/script files plus the
evidence directory, +4085/−14):

```
 apps/studio/scripts/f5-wp2-evidence.mjs                 | new — reproducible browser evidence with the exact ten-capture fail-closed set gate
 apps/studio/src/App.test.tsx                            | +2 — wire the two new focused test files into the standard suite entrypoint
 apps/studio/src/product-v1/AudioWorkspace.tsx           | integrate the take panel and route scope/track changes through the unsaved-change guard
 apps/studio/src/product-v1/NarrationTakePanel.tsx       | new — take-management view plus the session-local narration state hook
 apps/studio/src/product-v1/audio-workspace.ts           | Narration orientation/empty-state truth now that F5-WP2 states exist (Dialogue/SFX/Music unchanged)
 apps/studio/src/product-v1/f5-wp2-evidence-gate.test.ts | new — pure fail-closed evidence-set regression
 apps/studio/src/product-v1/narration-takes.test.tsx     | new — 25 focused tests
 apps/studio/src/product-v1/narration-takes.ts           | new — pure typed state machine, fixtures, clamps, guard, and truth vocabulary
 apps/studio/src/styles.css                              | pv1-takes panel styles plus the same basic ≤1024px collapse as the accepted audio columns
 reports/agent-handoffs/2026-07-22-kimi-f5-wp2-narration-take-management/screenshots/ | new — ten 1440x900 captures plus the machine-readable report
```

The handback commit adds only this file. No manifest, lockfile,
roadmap/status/plan document, Kimi inbox, contract, story engine, desktop,
worker, Godot, Remotion, asset, audio-engine, persistence, renderer, export,
packaging, or legacy file was changed, and no F5-WP3+ surface was touched.
The only canonical-document delta on the branch is the accepted PR #130
start-status merge incorporated unchanged by fast-forward.

## Verification (exact commands/results)

- `pnpm --filter @storystage/studio exec vitest run src/product-v1/narration-takes.test.tsx src/product-v1/f5-wp2-evidence-gate.test.ts`
  — PASS, 29/29 focused tests: the complete transition table and permitted
  control sets for every recording state; success/cancel/error paths with
  retry and dismiss recovery; fail-closed impossible transitions; exact
  no-capture/no-device/no-media truth vocabulary per state; import
  picked/invalid/empty/cancelled copy; trim/gain clamps, dirty tracking,
  restore; take scope binding with no cross-scope leak; take-build origin
  truth and declared durations; guarded-action labels; the visible arm →
  record → stop → keep walkthrough; cancel/disarm recovery; simulated
  permission-denied/missing-device/interrupted recovery; walkthrough
  abandonment on scope change; audition/keep/discard/retake decisions
  without playback claims; the import chooser with focus, invalid/empty/
  cancelled/picked results without any file API; trim/gain editing with
  exact values, bounds, dirty state, keep, and restore; ±12 dB and
  trim-order clamps; unsaved-change stay/discard/keep decisions across take
  switching, scope changes, track changes, discard, and retake; scope
  preservation through error/retry/track/scene round-trips; and keyboard/
  focus behavior including chooser focus on open with focus return, dialog
  Stay focus, and Escape handling. Plus the pure exact-ten evidence-set
  gate (accepts exactly the ten in any order; fails closed on a missing
  capture, an empty report, a duplicate, and an extra capture).
- `pnpm --filter @storystage/studio test` — PASS, 281/281 tests (the
  standard command; both focused files are wired into the
  already-enumerated `App.test.tsx` entrypoint). One earlier run under
  dev-server CPU load timed out in three unchanged, timing-sensitive
  accepted tests (`F2-WP2 expand/collapse`, one F3-WP4 proposal-edit test,
  one AI re-announce test); the identical suite then passed 281/281 with no
  code change, matching the documented host-flake pattern. No failure was
  normalized or concealed.
- `pnpm --filter @storystage/studio typecheck` — PASS.
- `pnpm --filter @storystage/studio build` — PASS; only the pre-existing
  Vite large-chunk warning remains.
- Touched-file lint (`npx eslint` on every changed source/script file) —
  PASS with zero errors; `git diff --check` — PASS.
- `node apps/studio/scripts/f5-wp2-evidence.mjs` against the local Studio
  dev server (`vite --host 127.0.0.1 --port 5195 --strictPort`, verified
  serving this workspace after a stale v93-workspace server occupying the
  port was identified by PID/command line and stopped) — PASS, 27/27
  checks, zero console warnings, zero console errors, zero page errors, no
  horizontal document overflow in any captured state.
- Repository-root verification, serialized with bounded workers as the
  brief permits for this host (`VITEST_MAX_WORKERS=2 pnpm verify:roadmap &&
  pnpm verify:director-capability-assets &&
  pnpm verify:candidate-rig-review-implementation-receipt &&
  pnpm verify:e1-app-server-schema && pnpm verify:e1-wp4-failure-matrix &&
  pnpm verify:privacy && pnpm lint && pnpm typecheck &&
  pnpm -r --if-present --workspace-concurrency=1 test`, run on this branch
  after the canonical start-status fast-forward) — PASS, exit code 0:
  - `verify:roadmap` — PASS:
    `Roadmap consistency PASS: F5 / F5-WP2 / START_NOW /
    2aea29220b278d1dc043c03d0d32ee4857bc32a7 /
    cc7f45117afd76b52444fc30735d0b2b4bf9bb8f`.
  - `verify:director-capability-assets` — PASS.
  - `verify:candidate-rig-review-implementation-receipt` — PASS.
  - `verify:e1-app-server-schema` — PASS (`0.144.1`).
  - `verify:e1-wp4-failure-matrix` — PASS.
  - `verify:privacy` — PASS.
  - `pnpm lint` — PASS with zero errors.
  - `pnpm typecheck` (all packages) — PASS.
  - `pnpm -r --if-present --workspace-concurrency=1 test` (serialized, all
    packages) — PASS, exit code 0. Per-package counts in the retained
    serialized run: studio 281/281, story-engine 353/353, asset-pipeline
    126/126, remotion-runtime 29/29, registration-review 21/21, desktop
    11/11, render-worker 24/24, asset-worker 5/5, e1-director-lab 4/4; the
    remaining packages (contracts, orchestration, codex-lab, fixtures)
    passed earlier in the same zero-exit run. Two earlier unbounded
    recursive attempts hit the documented unchanged asset-pipeline CPU
    timeout flake in three different timing-sensitive tests (two
    character-rig tests and one decoration-mask hook, all in files this
    package does not touch); the identical suites passed with bounded
    workers, matching the documented host-flake pattern. No failure was
    normalized or concealed.
- Hosted verification: the GitHub Verify run for the exact handback tip is
  reported in the draft PR and issue #129 once the pushed tip's check
  completes.

## Evidence (all 1440x900, dimension-verified, unique SHA-256, exactly the ten expected captures)

Machine-readable report:
`reports/agent-handoffs/2026-07-22-kimi-f5-wp2-narration-take-management/screenshots/clickthrough-report.json`
Report SHA-256:
`191112f9ac8612489026bc1cf97439e622041f02c941fc33763132d58fc609cb`

Listeners (`console` warning/error and `pageerror`) were attached before any
navigation. The real Projects → Create → shared proposal review → Studio →
Audio workspace path was exercised at 1440x900:

- `wp2-1440x900-projects.png` —
  `16b8dc3f03862e5d18bfc3a18277e9fdcc9f5d7b8203af3a0ff3e7ea4917eebf`
- `wp2-1440x900-studio-board.png` —
  `c2864e10ff5674dd2e636494b0ddd9511e6655ff7375dba3a2499620f3a4b7df`
- `wp2-1440x900-audio-narration-idle.png` (**required:** Narration take
  panel idle with the persistent prototype label, idle recorder truth,
  empty take list, and empty review state) —
  `0d90d6727baf43ce9b04e45c1a879ffd50f4638a6bad413c9b7f53ba22a91221`
- `wp2-1440x900-recording-walkthrough.png` (**required:** armed→recording
  walkthrough with visible no-capture truth) —
  `3fed2efc448fc9aa1a4ac72af5277b660c2f038cee355ef814b853165d085943`
- `wp2-1440x900-permission-denied.png` (**required:** simulated
  permission-denied recovery, explicitly never a browser permission
  request) —
  `ce978dbdf12ccb5dff14d4bbf24173c41c5fb42eefdac81b57bf996a9283497a`
- `wp2-1440x900-missing-device.png` (**required:** simulated missing-device
  recovery, explicitly never device enumeration) —
  `67c6714b9dd84182f56437570f89e57ee4b894fa29f4ec393d638574d9819a4b`
- `wp2-1440x900-take-review-decision.png` (**required:** audition review
  mark and kept decision with visible no-playback/no-media truth) —
  `5ee55be457183a1df99f03aa2156e6a9c28875a130858481597629685136f375`
- `wp2-1440x900-import-invalid-result.png` (**required:** invalid-file
  import result naming the fixture with no import/open/read claim; the
  empty and cancelled results are exercised as report checks) —
  `9b0752bb0e3584f3fb1230029928d2d789023dce3f69b3c253b9e566b29a5b31`
- `wp2-1440x900-trim-gain-dirty-unsaved.png` (**required:** trim/gain dirty
  state with exact values and bounds plus the unsaved-change
  stay/discard/keep dialog) —
  `a2fcb79a65718d264a62387cf570144505375879ab4978777f73d3648a844d7c`
- `wp2-1440x900-scope-change-no-leak.png` (**required:** beat-scope change
  with zero prototype takes in the new scope, no stale take leak, and the
  updated scope header) —
  `6d78a35ae689174109d12856029981f6b116e510bb338b3d137573d7e6fa51b2`

The report also records: F5-WP1 planning-card/inspector truth intact on
arrival; the exact idle badge and persistent label; armed/recording/stopped
no-capture copy; cancelled recovery; both simulated failure recoveries; the
kept walkthrough take bound to its exact scope; audition no-playback truth;
kept session-metadata truth; chooser fixture-metadata truth; invalid/empty/
cancelled/picked import results; exact trim/gain values, bounds, and dirty
state; the unsaved-change decision copy and outcome; scope-change
no-leak/restore checks; keyboard reachability with a visible ≥2 px focus
outline on the take-management controls; the whole-surface truth sweep (no
device/file/playback/persistence success claim, every remaining orientation
action disabled); the fail-closed exact-ten capture-set gate result; and
per-state horizontal-overflow measurements.

## Visible-control truth state

- Track tabs, shared scene/beat scope selects, planning-card selection, and
  the F5-WP1 inspector work exactly as accepted; every new control
  (walkthrough, import, take decision, trim/gain stepper, dialog) causes an
  observable, truthful state change and is a real button with visible focus.
- Every recording, import, and take state states that it is a local UI
  prototype: no microphone, permission prompt, device, file, audio bytes,
  playback, waveform, or persistence exists. `Recorded`, `Imported`,
  `Playing`, `Saved`, `Ready`, and `Complete` are never used as success
  claims; `kept` is always limited to session-only prototype metadata with
  an explicit no-audio restatement.
- Permission-denied and missing-device states are deterministic simulations
  for workflow review, not evidence of any browser device request.
- `Play take audio` remains disabled with its reason; Preview and Export
  remain disabled for the accepted reasons; the AI Director surfaces remain
  explicitly no-service local fixtures.

## Limitations and stop

This is the bounded F5-WP2 local-prototype state model only. It does not
accept F5-WP2 or F5, start F5-WP3, record or import real audio, touch a
device/permission/file/clipboard, decode or play media, render waveforms,
analyze timing or lip sync, mix, place SFX/music, persist projects, connect
providers, workers, or backend contracts, or authorize Godot, Remotion,
rendering, export, packaging, QA, or private-launch work. The complete
responsive, compact, reduced-motion, and milestone evidence gate remains
F5-WP5; this package captures a coherent 1440x900 desktop layout only and
claims no responsive or milestone-complete evidence. Session-local take
state lives inside the mounted Audio workspace exactly like the accepted
F5-WP1 card selection; it is never saved to a project, file, or device.

Merge only after the exact handback tip has a green hosted check and Codex
review. Do not treat this handback as F5-WP2 acceptance. Kimi stops here
and exits; no F5-WP3 or later work begun.
