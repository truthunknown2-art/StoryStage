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
  -> deterministic preparation and validation
  -> human review and identity lock
  -> immutable approved asset + provenance record
```

The current desktop UI shows an exact disclosure review before export, assigns a main-owned opaque exchange ID, writes an immutable hash-verified job under Electron `userData`, and opens its folder. Import uses a native folder picker; the renderer never submits a path. The trusted `packages/asset-pipeline` boundary validates each candidate's byte hash, actual codec, dimensions/pixel limits, alpha state, size, safe source path, and staging destination. Candidate bundles must match the exact exchange-job hash, production revision, brief roles, and Show Pack hash.

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
5. Import the returned candidate bundle.
6. Review prepared candidates; approve identity, mask, registration, pivots, layers, and usage rights.
7. Render only from immutable approved local assets.

This is deliberately a short human-approved round trip. A future supported subscription-backed integration can replace the operator step without changing the provider-neutral job contract.
