# Project state

## Accepted baseline

SS-001 remains accepted workstation infrastructure: browser studio, secure Electron host, isolated render worker, deterministic regression fixture, real MP4 output, progress, file reveal, and retryable failure state. Its geometric sample is not a product-quality visual target.

## Active milestone

`SS-002: Two-Profile Script-to-Animatic + Generated Asset Seam` is active.

Pro rejected commit `e85e351` as a durable foundation while accepting its architectural direction. The next local milestone now closes the cited foundation cracks and consumes them in an executable asset-to-frame path:

- Production bundles are finalized by Electron main, saved through per-production/revision queues, and rejected unless the complete stored render plan canonically equals a fresh compile of the included resolved plan.
- Generation exports are bound to the exact acknowledged production-bundle content hash and exact authoritative generation briefs, both at export and restart rehydration.
- Import evidence is a schema-checked, cross-file-bound, atomic directory transaction. Crash-point tests cover failure after each write and after atomic commit, followed by idempotent retry.
- Durable exchange states are schema-refined and rehydrated only when their required artifacts verify. Structured and loose staged bytes are reopened in the isolated worker before later trust transitions.
- Sharp performs real decode, orientation normalization, metadata stripping, trim/padding, canonical canvas registration, alpha checks, prepared PNG writes, and contact-sheet generation.
- Coherent contact sheets are compared before rigging. Only the selected set receives a role-specific manifest, technical validation, and a four-second moving diagnostic.
- Final human approval binds the exact prepared bytes, manifest, validation report, watched diagnostic MP4, provenance, and immutable local asset version.
- Approval creates a new production revision and recompiles the complete frame-accurate plan.
- The SS-002 Remotion composition consumes the saved plan and approved local pixels. The render worker independently rechecks containment, symlinks, PNG codec/dimensions/alpha, hashes, validation, diagnostic evidence, and production-bundle derivation.

## Real proof

`pnpm render:production-proof` creates a private deterministic engineering fixture and exercises the same selected-rig, approval, production-bundle, and render path.

Current proof evidence is under `artifacts/SS-002/`:

- 24.04-second H.264 MP4
- 1920x1080 at 30 fps
- exactly 720 video frames
- stereo AAC stream
- four exact-index decoded production frames and SHA-256 hashes
- four-second moving diagnostic and content-bound report
- exact production bundle, approved manifest, and diagnostic hashes

The proof art is deliberately simple local engineering art. It proves the executable path; it is not evidence of the requested visual style or a substitute for original ChatGPT-generated production assets.

## Gate status

- Gate 1 reference cut measurements: complete.
- Gates 2-3 production draft, New Production UI, two-profile planning, metrics, and semantic overrides: accepted by Pro against commit `1c60d93`.
- Gate 4 durable generation/import foundation and executable manual image exchange: locally implemented; fresh Pro acceptance pending.
- Gate 5 original ChatGPT production art for both profiles: pending a real authenticated manual generation round trip.
- Gate 6 preparation and validation: implemented for 2D pose-swap characters, background layers, and props; skeletal/part rigging and Blender routing remain pending.
- Gate 7 semantic Remotion animation: initial plan-driven 24-second slice implemented and proven; full episode coverage and visual polish remain pending.
- Gate 8 review/override: shot overrides and asset selection/approval exist; live player/timeline/inspector coverage remains incomplete.
- Gate 9 profile-distinct production outputs: pending.

## Product truth

StoryStage is not yet the complete script-to-finished-episode product. It does not yet automatically create final ChatGPT art, voice acting, music selection, licensed stock/archive media, or Blender scenes. The manual subscription-backed image workflow is intentional: no API key, browser cookie, password, or ChatGPT session is stored by the app.

A narrow MVP still requires one polished 2-3 minute episode in one approved Show Pack with recurring approved original assets, real voice timing, basic lip sync, captions, SFX/music, appropriate factual or generated visuals, editable locks, provenance, and reproducible 1080p output.
