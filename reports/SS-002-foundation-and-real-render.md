# SS-002 durable foundation and real asset-to-frame proof

Date: 2026-07-17
Status: accepted by Pro at replay-safety follow-up commit `1c0d6a2`

## Scope

This milestone responds to Pro's rejection of `49a7608` after its earlier rejection of `e85e351`. Pro's audit of `14baf87` accepted the executable vertical slice and marked A-C, E, and F resolved, but found that crashes before selected/approved review persistence could collide with regenerated timestamp-bound immutable files. Follow-up commit `1c0d6a2` made both selected-rig construction and asset promotion replay-safe and covered the real filesystem checkpoints Pro named. Pro's narrow re-audit then accepted Gate 4, marked D resolved, found no remaining blocker in scope, and accepted this as the durable foundation for continued product work.

## Blocker mapping

- A - exact bundle derivation: the full stored render plan must canonically equal a fresh compile; main finalizes persistence metadata; per-revision saves serialize; the UI tracks the last acknowledged hash.
- B - atomic import evidence: separate bundle/record/report schemas cross-check brief, set, role, codec, dimensions, rights, source hash, and staged hash. A temporary evidence directory is atomically renamed. Five tests cover failure after every write, after commit, retry, and conflict.
- C - exact generation binding: jobs carry the production bundle hash and authoritative generation briefs. Rehydration compares the semantic brief payload while deliberately normalizing the valid `draft` to `exported` lifecycle transition; a restart regression test covers the finalized job.
- D - artifact-backed lifecycle and approval recovery: restart validates required loose sessions, staged bytes, preparation/contact sheets, reviews, approved local versions, rejection decisions, and supersession targets. Selected-rig construction and promotion rediscover and fully verify existing manifests, validations, videos, and diagnostic reports, reusing their original stable timestamps. Immutable files are published from complete temporary files through atomic hard links. The later approval transaction remains ordered review -> production revision -> approved state and is idempotently reconciled at startup.
- E - later reverification without a TOCTOU reread: staging returns verified byte buffers and detected metadata, and those exact buffers are passed to Sharp. Approval and rendering independently reopen and rehash prepared/approved evidence and check containment, symlinks, codec, dimensions, alpha, validation, and diagnostic hashes.
- F - real path: generation job -> manifest-bound staging -> exact three-file evidence -> Sharp normalization -> contact sheet -> selected set -> manifest -> validation -> moving diagnostic -> selected review -> immutable promotion -> approved review -> approval transaction -> new revision -> approved hash-bound voice/music/SFX WAV masters -> shot-relative effect cue -> reviewed mix -> profile-specific mouth cues -> exact recompile -> two approved Remotion renders with AAC -> decoded-frame comparison.

## Proof output

Command:

```powershell
pnpm render:production-proof
```

Evidence: `artifacts/SS-002/proof-report.json`

Observed output:

- two H.264 renders, 1920x1080, 30 fps
- 6.08 seconds for the deliberately minimal one-line production
- 181 probed video frames
- stereo AAC at 48 kHz
- approved production bundle hash `7dc6daa770fb919fb7006918539bb76a895b83dcdd59737c1b0f6c253d572aaf`
- approved WAV voice-track hash `ca9a7fb71d288d7f5e56fca76eb5cff8b254fa872cd2e5d6faf57da41092212c`
- approved WAV music-track hash `56294cd40b01d90caf473aa02bb4071600f90e30a2db36c781a28d387eef8491`
- approved custom-SFX hash `378deaca8fc0debd25e154dc8b5e401c4b2d38fc65101a0bd05aba4062bae264`
- approved manifest hash `742dcc10ea4f51e584eaadca08c7e531cba467a0b955f45fdd447e1165c76f58`
- diagnostic report hash `60f8e8c111a6d19b320e7dd721d097da35036961e01974a861a0201b4ab68df9`
- exact decoded frames 0, 45, 90, 135, and 179 have matching SHA-256 hashes across both renders

Visual inspection confirms actual approved character pixels, exact-frame timing-driven mouth/pose changes, plan-driven shot cuts, deterministic transition entrance treatment, camera scaling/movement, and fallback visual treatment. The proof fixture is intentionally crude and must not be evaluated as final art. The latest two-pass proof retained exact decoded-frame matches at all five sampled indices.

## Automated evidence

- `pnpm verify`: privacy check, lint, all package typechecks, and 108 tests across fixtures, contracts, story-engine, desktop, asset-pipeline, studio, asset-worker, and render-worker
- `pnpm build`: all nine code packages plus the Vite studio bundle
- story-engine: production derivation, job/evidence hashes, lifecycle, approval/recompile, diagnostic binding, profile behavior
- asset-pipeline: real transparent character-kit preparation, contact sheet, rig validation, opaque-mask stop, tamper rejection
- asset-pipeline: 11 real filesystem replay tests after selected manifest, validation, diagnostic video/report, promoted files, manifest, validation, diagnostic video/report, and immediately before both review-persistence boundaries
- desktop: approval transaction crash/retry tests at review persistence, production persistence, and approved-state persistence
- render-worker: strict sample, scoped production, and rig-diagnostic command routing, with full-production readiness rechecked after the process boundary
- studio: host boundary, resume/review state, StrictMode-safe render subscription, exact-frame timeline/inspector synchronization, asset-aware visual-treatment rerouting, explicit engineering-slice/full-production selection, real transition override editing, spoken-text/frame retiming and explicit timing locks, local voice audition/listen-through approval flow, scope-aware completed-render playback and seeking, recoverable root renderer failure instead of a blank window, and evidence-backed preflight routing
- desktop build: the asset pipeline is bundled into Electron instead of leaking workspace TypeScript imports; a build-time scan fails on any unresolved `@storystage/*` runtime import

## Live UI evidence

The desktop smoke pass first exposed and then verified a real launch blocker: `@storystage/asset-pipeline` was externalized, causing Electron to execute workspace TypeScript and fail on an extensionless story-engine import. The asset pipeline is now bundled and StoryStage launches to the production desk. New Production opens the real setup, creates the default Frankly Weird History production, and produces 25 shots from two natural scenes. The new cut-timing panel visibly exposes all 25 proportional shot boundaries; jumping to shot 1.04 moves the playhead to frame 203 and synchronizes the inspector to 1.04. Live playback advanced the playhead from frame 203 to 221, and Pause held that position. The viewport-height editor shell keeps all navigation actions visible while the shot canvas scrolls independently. The live Audio workspace identifies 11 derived spoken cues and their speakers, shows exact frame timecodes, exposes text/duration editing and timing locks, and now visibly includes separate native voice/music WAV cards, the cue-placed custom-SFX library, and the profile-aware gain/loop/transition-SFX review card. A follow-up in-app-browser smoke pass created the same 25-shot production, opened the Audio workspace without console warnings or errors, and confirmed that browser-only mode correctly disables native WAV import while preserving the full review layout. The asset-rerouting pass then changed shot 1.01 from environment to generated illustration in the live inspector: its route gained a reconstruction binding and one new generation brief, the Assets count moved from five to six, the editorial-routing metric changed from 64% to 68%, and the console remained clean. The full-render pass exposed separate 24-second and full-production scopes; selecting the latter kept the render action disabled and listed six concrete blockers covering eight unresolved visual requirements, 28 non-approved bindings, 0/11 timing locks, missing approved art/voice, and the unreviewed mix. No console warnings or errors appeared. A restart against three older saved productions exposed the mouth-cue compiler migration issue; the narrow legacy verifier restored all three, and opening one immediately resaved the current compiled plan with a new acknowledged hash. Preflight routes each blocker to its owning view and explicitly keeps the finished-episode gate closed. The Assets view exposes the production-bound generation briefs. A real private history generation job was exported and resumed after reload; it exposes 22 role-specific subscription image prompts with suggested filenames, and the user-triggered copy control succeeded. No ChatGPT credential or session data entered the app. The restarted Electron main process successfully installs the restricted completed-render media scheme; the player contract and shot/frame seeking are automated, while true publishable playback awaits the first gate-complete approved real-art render rather than a fabricated UI state.

Screenshots are intentionally private engineering artifacts under `artifacts/SS-002/ui/` and remain ignored by Git.

## Known open product work

- Real original ChatGPT-generated kids and history art has not yet completed the manual round trip; the subscription prompt queue and private exported history job are ready for it.
- The current character implementation is honest 2D pose-swap, not a skeletal or Blender rig.
- Completed approved MP4s can play and seek inside the editor across either the engineering slice or complete frozen duration, transition overrides visibly reach deterministic Remotion frames, and treatment changes rebuild the visual acquisition route. The full scope is implemented and double-gated, but no gate-complete real-art full render exists yet; unrendered live Remotion preview is also open.
- Spoken text, frame retiming, explicit editor timing locks, separate voice/music/SFX WAV import-audition-approval-render binding, shot-relative custom-effect cues, deterministic two-pose mouth timing, and reviewed mix decisions are implemented. Real user masters have not yet been supplied; the proof uses three distinct deterministic engineering tones. Phoneme/viseme sync, licensed archive/stock ingestion, and automatic Blender routing are not implemented.
- The two polished 25-40 second profile outputs required by Gate 9 remain open.
