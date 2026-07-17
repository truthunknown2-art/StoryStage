# ChatGPT Image Bridge

## Decision

StoryStage's first image provider is `manual-chatgpt-images`. The user's existing ChatGPT subscription is used through an authenticated ChatGPT/Codex task, not through a hidden API call and not by automating browser credentials.

The standalone StoryStage app does **not** sign in to ChatGPT, store cookies, reuse an auth cache, or claim unattended image generation. OpenAI API support may be added later as a separate opt-in adapter with separate billing and explicit credential setup.

## Local exchange

```text
StoryStage production
  -> .storystage-local/jobs/outbox/<job-id>/generation-brief.json
  -> ChatGPT/Codex image-generation task
  -> .storystage-local/jobs/inbox/<job-id>/candidate-bundle.json + candidates/
  -> byte-verified private staging
  -> deterministic preparation and registration
  -> human review and identity lock
  -> immutable approved asset + provenance record
```

The current desktop UI shows an exact disclosure review before export, assigns a main-owned opaque exchange ID, writes an immutable hash-verified job plus durable lifecycle state under Electron `userData`, and opens its folder. On restart, Electron rehydrates only jobs whose canonical hash, folder identity, production revision, and authoritative Show Pack still verify. Import uses a native folder picker; the renderer never submits a path. Electron main rejects stale identities, then a timed utility process with a capped heap invokes the trusted `packages/asset-pipeline` boundary to validate each candidate's byte hash, actual codec, dimensions/pixel limits, alpha state, size, safe source path, and main-owned staging destination. UNC locations, source symlinks, and staging symlink/junction ancestors are rejected. Candidate bundles must match the exact exchange-job hash, production revision, brief roles, and Show Pack hash.

Two honest return paths are supported: a strict `candidate-bundle.json` folder produced by this Codex/ChatGPT workflow, or loose downloaded PNG/JPEG/WebP files. Loose files are staged first, then the user maps each opaque candidate to an expected brief/file role (or leaves it unused); StoryStage writes the matching local candidate manifest itself. Neither path approves an asset for render.

## Repository boundary

The public repository may contain:

- provider-neutral schemas and validators;
- prompt and generation-brief templates;
- sanitized fixtures with fake identifiers;
- content hashes and non-secret provenance metadata;
- original lab assets intentionally approved for publication.

The public repository must never contain:

- ChatGPT or OpenAI passwords, cookies, bearer tokens, API keys, or auth caches;
- `.env` files or credential exports;
- raw private candidate bundles;
- unpublished identity sheets or user-owned source material;
- local job state or application session data.

These local paths and common credential formats are blocked by `.gitignore`. Before every push, the staged diff is checked for secret-shaped values and accidentally tracked local artifacts.

## Operator workflow

1. Paste a script and choose the project type, Show Pack, directing profile, and production policy.
2. Review the entity ledger and generation briefs.
3. Review the exact prompts, excerpts, reference hashes, and file roles that will be shared, then approve an immutable local job pack.
4. Ask the authenticated StoryStage Codex task to process the next pack with ChatGPT Images.
5. Import the returned candidate bundle, or select loose downloaded images and map them to expected roles.
6. Review staged candidates, perform preparation and registration, then approve identity, mask, pivots, layers, and usage rights.
7. Render only from immutable approved local assets.

This is deliberately a short human-approved round trip. A future supported subscription-backed integration can replace the operator step without changing the provider-neutral job contract.
