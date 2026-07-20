# KCAST-001 provider-neutral acquisition contract

- Repo: `truthunknown2-art/StoryStage`
- Branch: `agent/kcast001-provider-neutral-rig`
- Base: `a8d7aef33eacc2f52e3b4d92e2aafbf033179681`
- Status: **contract slice ready for review; worker/UI/production Ollo assets not implemented**

## Scope

This slice creates the provider-neutral boundary between an external artwork source and StoryStage's trusted rig-preparation pipeline. It does not automate a signed-in browser session, store provider credentials, or grant technical authority to provider metadata.

The contract:

- binds every request to an exact Show Pack, character, identity reference, template, and canonical hash;
- uses `manual-file-import` as the only initial acquisition mode;
- explicitly records that credentials and account sessions are not required by StoryStage;
- requires front, profile-left, and profile-right part and face kits plus a complete turnaround;
- rejects a request that omits separate upper/lower arms or legs;
- requires eyes, lids, brows, mouth rest, and named guide-viseme exposures;
- accepts only PNG, safe relative paths, at most 32 files, 50 MB per file, 256 MB total, 8192 px per dimension, and 64 MP per image;
- hash-binds the returned bundle to the exact request;
- rejects missing, duplicate, unknown, traversing, oversized, or hash-tampered inputs;
- returns `providerAuthority: false` and keeps human approval mandatory.

The canonical Ollo identity lock used by the tests is:

`0950d7043347528a302de5d70f36736dcfbec1f9e0177296756e91b96fbc846f`

## Changed files

- `packages/story-engine/src/character-rig-acquisition.ts`
- `packages/story-engine/src/character-rig-acquisition.test.ts`
- `packages/story-engine/src/index.ts`
- `packages/story-engine/package.json`

## Verification

- `pnpm --filter @storystage/story-engine typecheck`
- `pnpm exec vitest run src/character-rig-acquisition.test.ts`
- `pnpm verify` (all workspace typechecks and tests pass; lint has only the two existing KVP proof-harness warnings)

## Known gaps / next slice

- This does not create production Ollo artwork.
- Candidate sheets remain untrusted until local decode, matte/alpha extraction, component separation, registration, pivot, hierarchy, exposure, and diagnostic validation succeed.
- The asset worker does not yet consume this request/bundle contract.
- The Studio does not yet expose Parts -> Pivots -> Expressions -> Test Motion review.
- The current legacy `manual-chatgpt-images` exchange remains supported and has not yet been migrated.
- Preston must visually approve a completed Ollo rig family before it can become production-bindable.
