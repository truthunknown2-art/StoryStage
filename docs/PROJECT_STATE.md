# Project state

## Accepted baseline

SS-001 remains accepted workstation infrastructure: browser studio, secure Electron host, isolated render worker, deterministic regression fixture, real MP4 output, progress, file reveal, and retryable failure state. Its geometric sample is not a product-quality visual target.

## Active milestone

`SS-002: Two-Profile Script-to-Animatic + Generated Asset Seam` is active.

Pro's narrow re-audit of follow-up commit `1c0d6a2` accepted Gate 4, marked D resolved, found no remaining code-level blocker in scope, and called the result an honest durable foundation for continued product work. That acceptance covers the import, preparation, selection, promotion, approval-recovery, and approved-frame foundation; it does not claim product completion or final visual quality.

- Production bundles are finalized by Electron main, saved through per-production/revision queues, and rejected unless the complete stored render plan canonically equals a fresh compile of the included resolved plan.
- Generation exports are bound to the exact acknowledged production-bundle content hash and authoritative generation briefs. Restart comparison normalizes only the valid brief lifecycle status change from draft to exported.
- Import evidence is a schema-checked, cross-file-bound, atomic directory transaction. Bundle metadata, import records, and validation reports bind role, codec, dimensions, rights, source hash, and staged hash. Crash-point tests cover failure after each write and after atomic commit, followed by idempotent retry.
- Durable exchange states are schema-refined and rehydrated only when their required artifacts verify. Structured and loose staged bytes are reopened in the isolated worker before later trust transitions.
- Sharp performs real decode, orientation normalization, metadata stripping, trim/padding, canonical canvas registration, alpha checks, prepared PNG writes, and contact-sheet generation.
- Coherent contact sheets are compared before rigging. Only the selected set receives a role-specific manifest, technical validation, and a four-second moving diagnostic.
- Final human approval binds the exact prepared bytes, manifest, validation report, watched diagnostic MP4, provenance, and immutable local asset version.
- Approval is an idempotently recoverable review -> production revision -> approved-state transaction. Startup reconciliation completes any crash-stranded approval, and tests cover all three checkpoints.
- Selected-rig construction and promotion are independently replay-safe before that transaction begins. Retries verify and reuse existing manifests, validation reports, diagnostic videos/reports, stable timestamps, and the resulting `ApprovedAssetVersion`.
- Immutable artifact publication uses complete temporary files plus atomic hard links, so a process exit cannot leave a partially written final filename.
- Approval creates a new production revision through the same shared operation used by the desktop and proof runner, then recompiles the complete frame-accurate plan.
- The SS-002 Remotion composition consumes the saved plan and approved local pixels. The render worker independently rechecks containment, symlinks, PNG codec/dimensions/alpha, hashes, validation, diagnostic evidence, and production-bundle derivation.
- The Electron bundle now includes every workspace TypeScript package it executes. A build-time check rejects unresolved `@storystage/*` runtime imports, covering the launch crash found during the live desktop pass.
- Direction review now has a functional frame playhead, play/pause transport, exact shot-boundary jumps, and synchronized shot inspector. It remains an explicitly labeled planning timeline until approved artwork exists.
- Completed approved renders now stream back into the sandboxed studio through a narrow, validated `storystage-media` route. The in-app H.264 player has native playback plus exact-frame and shot-boundary review controls; it exposes only verified completed MP4s from registered render roots.
- A root renderer error boundary replaces blank-window failures with a local recovery screen, preserves saved production data, and offers an explicit reload action with optional technical detail.
- The former disabled Preflight placeholder is now an evidence-backed readiness view. It distinguishes compiled/saved/renderer checks, required asset approvals, deferred sources, engineering-slice eligibility, and the still-closed finished-episode gate.
- Exported manual image jobs now become a resumable ChatGPT subscription prompt queue. Each candidate-set file has a role-specific, continuity-locked prompt and suggested filename; prompts leave StoryStage only through an explicit copy action, and the app never reads or stores the ChatGPT session.

## Real proof

`pnpm render:production-proof` creates a private deterministic engineering fixture and exercises the concrete staging, evidence, Sharp preparation, selected-rig, review, approval transaction, production-revision, and render operations used by the desktop.

Current proof evidence is under `artifacts/SS-002/`:

- two 6.08-second H.264 MP4 renders of the same saved production revision
- 1920x1080 at 30 fps
- 181 probed video frames per render
- stereo AAC stream
- five exact-index decoded frame pairs with matching SHA-256 hashes
- four-second moving diagnostic and content-bound report
- exact production bundle, approved manifest, and diagnostic hashes

The proof art is deliberately simple local engineering art. It proves the executable path; it is not evidence of the requested visual style or a substitute for original ChatGPT-generated production assets.

## Gate status

- Gate 1 reference cut measurements: complete.
- Gates 2-3 production draft, New Production UI, two-profile planning, metrics, and semantic overrides: accepted by Pro against commit `1c60d93`.
- Gate 4 durable generation/import foundation and executable manual image exchange: accepted by Pro at follow-up commit `1c0d6a2`; A-F and the executable approved-frame slice are resolved within that audit scope.
- Gate 5 original ChatGPT production art for both profiles: the credential-free subscription prompt queue and import path are implemented and live-verified; actual generated images still need a real authenticated manual generation/import pass.
- Gate 6 preparation and validation: implemented for 2D pose-swap characters, background layers, and props; skeletal/part rigging and Blender routing remain pending.
- Gate 7 semantic Remotion animation: initial plan-driven 24-second slice implemented and proven; full episode coverage and visual polish remain pending.
- Gate 8 review/override: shot overrides, asset selection/approval, a functional frame-accurate cut timeline, in-app playback of completed approved H.264 slices with synchronized shot/frame review, and evidence-backed production preflight exist; unrendered live Remotion preview, full-length playback, and broader inspector coverage remain incomplete.
- Gate 9 profile-distinct production outputs: pending.

## Product truth

StoryStage is not yet the complete script-to-finished-episode product. It does not yet automatically create final ChatGPT art, voice acting, music selection, licensed stock/archive media, or Blender scenes. The manual subscription-backed image workflow is intentional: no API key, browser cookie, password, or ChatGPT session is stored by the app.

A narrow MVP still requires one polished 2-3 minute episode in one approved Show Pack with recurring approved original assets, real voice timing, basic lip sync, captions, SFX/music, appropriate factual or generated visuals, editable locks, provenance, and reproducible 1080p output.
