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
- F - real path: generation job -> manifest-bound staging -> exact three-file evidence -> Sharp normalization -> contact sheet -> selected set -> manifest -> validation -> moving diagnostic -> selected review -> immutable promotion -> approved review -> approval transaction -> new revision -> exact recompile -> two approved Remotion renders -> decoded-frame comparison.

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
- approved production bundle hash `9a2661f5287df6252f1970f503d1979cd7b9c898a96f88ea2aaf2d33e7964a3a`
- approved manifest hash `742dcc10ea4f51e584eaadca08c7e531cba467a0b955f45fdd447e1165c76f58`
- diagnostic report hash `4d5c922ab564f4c1cddef8dd8d89d68ef366f0592b1787db3ca354d807a03fcc`
- exact decoded frames 0, 45, 90, 135, and 179 have matching SHA-256 hashes across both renders

Visual inspection confirms actual approved character pixels, pose/mouth/arm changes, plan-driven shot cuts, camera scaling/movement, and fallback visual treatment. The proof fixture is intentionally crude and must not be evaluated as final art.

## Automated evidence

- `pnpm verify`: privacy check, lint, all package typechecks, and 89 tests across fixtures, contracts, story-engine, desktop, asset-pipeline, studio, asset-worker, and render-worker
- `pnpm build`: all nine code packages plus the Vite studio bundle
- story-engine: production derivation, job/evidence hashes, lifecycle, approval/recompile, diagnostic binding, profile behavior
- asset-pipeline: real transparent character-kit preparation, contact sheet, rig validation, opaque-mask stop, tamper rejection
- asset-pipeline: 11 real filesystem replay tests after selected manifest, validation, diagnostic video/report, promoted files, manifest, validation, diagnostic video/report, and immediately before both review-persistence boundaries
- desktop: approval transaction crash/retry tests at review persistence, production persistence, and approved-state persistence
- render-worker: strict sample, production, and rig-diagnostic command routing
- studio: host boundary, resume/review state, StrictMode-safe render subscription, exact-frame timeline/inspector synchronization, in-app completed-render playback and seeking, recoverable root renderer failure instead of a blank window, and evidence-backed preflight routing
- desktop build: the asset pipeline is bundled into Electron instead of leaking workspace TypeScript imports; a build-time scan fails on any unresolved `@storystage/*` runtime import

## Live UI evidence

The desktop smoke pass first exposed and then verified a real launch blocker: `@storystage/asset-pipeline` was externalized, causing Electron to execute workspace TypeScript and fail on an extensionless story-engine import. The asset pipeline is now bundled and StoryStage launches to the production desk. New Production opens the real setup, creates the default Frankly Weird History production, and produces 25 shots from two natural scenes. The new cut-timing panel visibly exposes all 25 proportional shot boundaries; jumping to shot 1.04 moves the playhead to frame 203 and synchronizes the inspector to 1.04. Live playback advanced the playhead from frame 203 to 221, and Pause held that position. The viewport-height editor shell keeps all three navigation actions visible while the shot canvas scrolls independently. Preflight reports 3/6 engineering checks ready, routes each blocker to its owning view, and explicitly keeps the finished-episode gate closed. The Assets view exposes the five production-bound generation briefs. The restarted Electron main process successfully installs the restricted completed-render media scheme; the player contract and shot/frame seeking are automated, while true live playback awaits the first approved real-art render rather than a fabricated UI state.

Screenshots are intentionally private engineering artifacts under `artifacts/SS-002/ui/` and remain ignored by Git.

## Known open product work

- Real original ChatGPT-generated kids and history art has not yet completed the manual round trip.
- The current character implementation is honest 2D pose-swap, not a skeletal or Blender rig.
- Completed 24-second approved MP4s can now play and seek inside the editor, but unrendered live Remotion preview and full-length approved playback are not complete.
- Final voice timing, lip sync, music selection, licensed archive/stock ingestion, and automatic Blender routing are not implemented.
- The two polished 25-40 second profile outputs required by Gate 9 remain open.
