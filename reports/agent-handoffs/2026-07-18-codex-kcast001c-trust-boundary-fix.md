# KCAST-001C trust-boundary correction handoff

Date: 2026-07-18

Branch: `agent/kcast001-provider-neutral-rig`

Base checkpoint: `3a2781de37a6be00220c01bc899f5487a8b854b0`

Review status: awaiting Pro re-review

## Why this correction exists

Pro rejected the `3a2781d` safe-intake checkpoint on two P1 trust-boundary defects:

1. A pre-existing `character-rig` or `character-rig/candidates` symlink or Windows junction could redirect derived staging writes outside the trusted staging root.
2. The story-engine exported a report-only import-receipt constructor, so a canonically rehashed forged complete report could mint an authoritative receipt without reopened staged bytes.

## Corrections

- Every derived staging directory segment is created non-recursively and then checked with `lstat`, `realpath`, and canonical-root containment.
- The same derived-directory checks run immediately before each candidate, staging-report, and import-receipt publication.
- Regression coverage plants both `character-rig` and nested `candidates` junctions and proves the outside directories remain empty.
- The public story-engine report-only receipt constructor and its draft schema were removed.
- A complete receipt is now created only through the asset worker's trusted staging route.
- The trusted receipt path revalidates the exact request, bundle, and staging report; reopens the persisted report; and reopens every content-addressed PNG to verify byte length, SHA-256, PNG header, dimensions, one-page decode, and decoded alpha classification.
- Incomplete staging returns a null receipt. A complete verified staging run returns the serialized immutable receipt beside the staging report.
- Regressions cover forged self-hashed complete reports and staged-byte tampering.

## Verification

- `pnpm verify`: passed
  - Story engine: 240 tests
  - Asset pipeline: 54 tests
  - Contracts: 11 tests
  - Asset worker: 3 tests
  - Remotion runtime: 16 tests
  - Desktop: 11 tests
  - Render worker: 15 tests
  - Studio: 72 tests
- All package typechecks passed.
- Privacy verification passed for 545 tracked and publishable files.
- Lint completed with only the two pre-existing KVP proof warnings in `apps/render-worker/src/kvp001-proof.ts`.
- `git diff --check`: passed.

No asset was promoted, no provider was granted authority, and the committed Ollo evidence remains incomplete and unapproved.
