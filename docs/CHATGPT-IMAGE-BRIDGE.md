# ChatGPT Image Bridge

## Decision

StoryStage's first image provider is `manual-chatgpt-images`. The user's existing ChatGPT subscription is used through an authenticated ChatGPT/Codex task, not through a hidden API call and not by automating credentials.

The standalone app does not sign in to ChatGPT, store cookies, reuse auth caches, or pretend a subscription is an API credential. A future OpenAI API adapter would be separate, opt-in, explicitly billed, and separately configured.

## Local exchange

```text
saved ProductionBundle content hash
  -> exact generation-job.json under the private outbox
  -> manual ChatGPT image generation
  -> candidate-bundle.json + candidates, or loose downloaded files
  -> isolated byte staging
  -> evidence/{candidate-bundle, import-record, validation-report}.json
  -> prepared canonical PNGs + contact sheets
  -> coherent-set selection
  -> manifest + validation + moving diagnostic MP4
  -> final user approval
  -> immutable local asset version + provenance
  -> new saved production revision
  -> real Remotion render
```

Electron main assigns the exchange ID, verifies the acknowledged production snapshot, requires exact canonical equality with its generation briefs, finalizes the immutable job, and opens the private job folder. No ChatGPT credential, cookie, token, local browser state, or arbitrary renderer path enters the job.

Two return paths are supported:

- a strict provider-neutral `candidate-bundle.json` directory;
- loose PNG/JPEG/WebP downloads mapped by the user to candidate set, brief, and role.

Both paths copy bytes into a main-owned private root through the isolated asset worker. The worker sniffs real codecs, checks dimensions/pixel and byte limits, rejects unsafe paths/symlinks/UNC sources, computes SHA-256 hashes, and records alpha state. Import evidence is cross-file checked and committed atomically.

Preparation reopens every staged file, verifies bytes and declared metadata again, decodes through Sharp, normalizes orientation, strips metadata, trims/pads to a role-specific canvas, calculates registration, enforces transparency rules, writes actual PNG derivatives, and creates contact sheets. Opaque moving cutouts stop for manual masking; they are never relabeled as alpha-ready.

The user compares coherent candidate sets before rigging. Selecting a set builds only that set's manifest, technical report, and four-second moving diagnostic. Final approval remains disabled until the diagnostic exists. Approval copies the exact reviewed PNGs, manifest, validation, diagnostic MP4, diagnostic report, and provenance to an immutable local asset version.

## Private repository boundary

The repository may contain provider-neutral schemas, validators, sanitized fixtures, fake identifiers, hashes, non-secret provenance, and intentionally public original lab assets.

It must never contain ChatGPT/OpenAI passwords, cookies, bearer tokens, API keys, auth caches, `.env` credentials, raw private candidates, unpublished identity sheets, user-owned source media, private jobs, or Electron session state. Privacy verification runs before pushes.

`artifacts/SS-002/private/` is a deterministic engineering fixture generated locally by the proof command. It contains no user account data and is ignored by Git.

## Operator workflow

1. Paste a script; choose Kids Adventure or Frankly Weird History, a Show Pack, and production policy.
2. Review the parsed scenes, entities, direction plan, and missing asset ledger.
3. Wait for the current production revision to save and display its acknowledged hash.
4. Review exactly what will be disclosed, then export the exact bundle-bound generation job.
5. Generate original candidates in the authenticated ChatGPT task.
6. Import a structured result folder or loose downloaded files and map their roles.
7. Prepare candidates and compare contact sheets.
8. Select one coherent set; wait for its moving diagnostic; watch it.
9. Final-approve or reject the set.
10. Let StoryStage create the new revision and render only from its immutable approved assets.

This is deliberately a short, human-approved subscription workflow. It does not make image creation unattended, but it also does not compromise the user's account.
