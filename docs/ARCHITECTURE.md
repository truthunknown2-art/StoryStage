# StoryStage architecture

StoryStage is a local-first, web-first production system delivered through a secure Electron shell. The story engine owns production meaning; the renderer consumes only an approved, frozen, content-addressed render plan.

```text
ProductionDraft
  -> ScriptDocument
  -> entity ledger + timing
  -> profile-driven CreativeEpisodePlan
  -> visual requirements + approved-asset resolution
  -> manual ChatGPT Images generation job (local outbox/inbox)
  -> byte-verified private staging
  -> candidate preparation + human approval
  -> ResolvedProductionPlan
  -> exact-frame, hash-verified FrameAccurateRenderPlan
  -> Remotion preview/render worker
```

## Schema ownership

- `packages/story-engine`: sole owner of real production drafts, scripts, entity ledgers, directing profiles, Show Packs, semantic actions, visual requirements, generation exchange, resolved plans, metrics, and frozen render plans.
- `packages/asset-pipeline`: trusted Node-side candidate staging. It validates the provider-neutral bundle, rejects unsafe paths and symlinks, sniffs actual image bytes, verifies dimensions and SHA-256 hashes, enforces byte limits, and chooses the private output path.
- `packages/contracts`: IPC channels, desktop capabilities, render-job state, and strict worker command/event envelopes only. It contains no production-domain model.
- `packages/fixtures`: isolated SS-001 presentation fixture and legacy composition schema used only for workstation/regression proof. It is not accepted by the New Production workflow.
- `packages/remotion-runtime`: deterministic compositions and frame-derived animation. The current SS-001 composition remains a regression target until the SS-002 render-plan composition replaces it.
- `apps/studio`: unprivileged React/Vite production UI. It consumes story-engine plans and may pass browser `File` objects to a constrained desktop staging API; it never supplies arbitrary filesystem paths and has no direct dependency on the legacy Remotion fixture.
- `apps/desktop`: Electron main/preload. It owns OS capabilities, native file selection, project-directory policy, and worker supervision; it never directs or renders.
- `apps/render-worker`: independently invokable Node utility for Remotion bundling, rendering, progress, proof frames, and determinism checks.
- `apps/asset-worker`: one-shot utility process for untrusted candidate inspection and private staging. It uses a strict worker envelope, a 30-second desktop timeout, and a capped Node heap so untrusted byte inspection cannot run inside the renderer or Electron main process.

## Determinism

- Production and plan identities derive from `productionId + revision`, never a title.
- Directing decisions use weighted, stable ordinal allocation; no production path uses `Math.random()`.
- Show Pack, style-bible, fixture-asset, and frozen-plan identities are computed from canonical serialization.
- Imported candidate and approved-asset identities must be computed from actual bytes by the asset worker.
- Acquisition prompts and provider instructions stop at the resolved-plan boundary and never enter a render plan.
- The final renderer reads approved local assets only and performs no model calls or remote fetches.

## Manual ChatGPT Images boundary

The first provider is `manual-chatgpt-images`. StoryStage exports a schema-validated local generation job. An authenticated ChatGPT/Codex task creates candidates, and StoryStage imports a schema-validated candidate bundle. StoryStage never stores ChatGPT credentials, automates web login, or treats a ChatGPT subscription as an API credential. See `docs/CHATGPT-IMAGE-BRIDGE.md`.

## Security and failure model

Electron uses context isolation, disabled Node integration in the renderer, sandboxing, web security, denied new windows, and restricted navigation. IPC and worker envelopes are strict Zod objects. Electron main owns opaque exchange IDs, the `userData` exchange root, immutable writes, durable lifecycle state, restart rehydration, stale-job checks, and native folder selection. It delegates untrusted inspection/staging to `apps/asset-worker`, which calls `packages/asset-pipeline` under a timeout and capped heap. The pipeline enforces file count/size/type/pixel limits, rejects traversal, UNC paths, and symlink/junction ancestors, canonicalizes the main-owned destination beneath a trusted root, computes hashes and dimensions from bytes, and rejects active or unrecognized formats such as SVG. A staged file remains unregistered and unapproved. Full image decode/metadata normalization remains a Gate 4 task.

The render state machine is `idle -> queued -> bundling -> rendering -> encoding -> completed`, with typed failure from active states. Worker crashes, invalid messages, timeouts, rejected commands, and missing outputs become visible failures.
