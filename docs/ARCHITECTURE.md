# StoryStage architecture

StoryStage is a local-first production system delivered through a secure Electron shell. The story engine owns production meaning; the renderer consumes only an approved, frozen, content-addressed plan and immutable local asset evidence.

```text
ProductionDraft
  -> ScriptDocument + entity ledger + timing
  -> profile-driven CreativeEpisodePlan
  -> visual requirements + generation briefs
  -> main-finalized content-addressed ProductionBundle
  -> exact bundle-bound manual ChatGPT Images job
  -> structured or loose-file import
  -> isolated byte staging + atomic import evidence
  -> Sharp decode/normalize/register + contact sheets
  -> preliminary coherent-set selection
  -> selected-set manifest + technical validation + moving diagnostic
  -> final human approval + immutable ApprovedAssetVersion
  -> new production revision + deterministic full recompile
  -> exact-frame FrameAccurateRenderPlan
  -> evidence-verifying Remotion render worker
```

## Schema ownership

- `packages/story-engine`: production drafts, scripts, entity ledgers, directing profiles, Show Packs, semantic actions, visual requirements, generation exchanges, candidate/import/preparation/review evidence, rig manifests, approvals, resolved plans, metrics, and frozen render plans.
- `packages/asset-pipeline`: trusted Node-side byte staging and image preparation. It rejects unsafe paths and formats, verifies bytes and declared metadata, decodes through Sharp, normalizes orientation/metadata, enforces alpha rules, writes canonical PNG derivatives, calculates registration, and creates contact sheets.
- `packages/contracts`: strict IPC channels, capabilities, review summaries, and worker command/event envelopes. It exposes no user-selected filesystem paths to the renderer.
- `packages/fixtures`: the isolated SS-001 regression fixture only.
- `packages/remotion-runtime`: SS-001 regression composition plus SS-002 production and rig-diagnostic compositions. Production motion derives from the frame-accurate plan and approved playback assets.
- `apps/studio`: unprivileged React/Vite production UI. It reviews disclosure, mappings, contact sheets, diagnostics, approval, revision saves, and render state.
- `apps/desktop`: Electron main/preload. Main owns production/job/import/asset/render roots, finalizes hashes and timestamps, serializes saves, validates durable artifact state, supervises workers, and promotes approvals.
- `apps/render-worker`: bundles and renders Remotion compositions and independently revalidates the exact production snapshot, approved asset bytes, PNG headers, dimensions, alpha requirements, manifests, validation reports, and diagnostic MP4 hashes.
- `apps/asset-worker`: isolated utility process for untrusted candidate staging, reverification, and image preparation under time and heap limits.

## Determinism and authority

- Identity derives from `productionId + revision`, never title.
- Directing uses stable weighted allocation; production code does not use random directing choices.
- Show Packs, jobs, evidence, manifests, diagnostics, bundles, and render plans use canonical SHA-256 identities.
- Electron main, not the renderer, assigns final persistence metadata, job IDs, paths, and output roots.
- A generation job must exactly equal the briefs in one saved production bundle.
- A production bundle must contain the exact canonical output of recompiling its resolved plan.
- Approval never mutates an old accepted bundle. The Studio applies immutable approved versions to a new revision and recompiles.
- The render worker performs no model calls and no remote fetches.

## Human-gated asset order

1. Decode and normalize every returned candidate.
2. Build contact sheets and compare coherent candidate sets.
3. Select one set and reject its siblings.
4. Build only the selected set's character/background/prop manifest.
5. Run technical validation and render a moving diagnostic.
6. Let the user watch that exact MP4.
7. Final-approve the bytes, evidence, provenance, and manifest.
8. Create and save a new production revision.
9. Render from the exact new saved bundle.

A JSON-valid manifest alone is never considered a rig or an approval.

## Security and failure model

Electron uses context isolation, disabled Node integration in the renderer, sandboxing, web security, denied new windows, and restricted navigation. IPC and both worker directions are strict Zod envelopes.

Main-owned private roots live below Electron `userData/.storystage-local`. Content-addressed snapshots and immutable evidence are written with exclusive creation. Import evidence is assembled in a random temporary directory and atomically renamed; orphaned crash directories are ignored, and retry is idempotent. Rehydration omits malformed states instead of listing them as resumable.

At every later trust transition, referenced staged or approved files are reopened, kept inside their canonical root, checked for symlink components, rehashed, and compared with their bound evidence. The preparation worker also re-detects image codec, dimensions, and alpha state. The production renderer rechecks PNG headers, dimensions, required alpha, approved diagnostics, and bundle derivation before pixels move.

The render state machine is `idle -> queued -> bundling -> rendering -> encoding -> completed`, with typed failure from active states. Crashes, invalid messages, timeouts, mismatched job IDs, unsafe output paths, stale events, and missing outputs become visible failures.
