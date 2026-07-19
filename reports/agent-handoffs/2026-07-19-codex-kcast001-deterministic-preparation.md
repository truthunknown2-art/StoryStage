# KCAST-001 deterministic preparation handoff

Date: 2026-07-19  
Owner: Codex  
Branch: `agent/kcast001-preparation-worker`  
Accepted intake base: `acc13d49577bf88e378676b3c11ef1aa5fdde74e`  
Exact implementation commit: `9bf48cb1101de29106e51abe75976ac3b6709fdc`

## Outcome

The trusted asset worker can now prepare one sealed character-rig view from an exact, complete intake lineage. It independently reopens the persisted request, candidate bundle, staging report, verified import receipt, and every referenced staged source before deriving or publishing component pixels.

This slice does not approve a character, create a final articulated rig, or make any provider authoritative. Every prepared view remains approval-required and provider-neutral.

## Trust and determinism boundaries

- Draft recipes may reference incomplete staging for measurement and review, but sealed executable recipes require an exact `importReceiptContentHash`.
- Request and candidate-bundle evidence are persisted immutably alongside staging evidence.
- The worker command accepts a sealed recipe plus host-owned roots and `preparedAt`; it does not accept credentials, provider sessions, arbitrary evidence copies, or arbitrary output paths.
- All recipe components are decoded, cropped, matted, normalized, measured, validated, and sealed in memory before prepared output publication begins.
- Existing-alpha and controlled chroma-key extraction produce fixed RGBA PNGs with content-addressed filenames and immutable location IDs.
- The worker verifies foreground bounds, transparent gutter, crop-boundary clearance, dimensions, pivots, sockets, hierarchy, role coverage, z-order, source lineage, and aggregate pixel budgets.
- Prepared files are reopened and verified after publication. The `PreparedCharacterRigViewManifest` is published last and its sealer remains private to the trusted asset pipeline.
- Byte-identical retries are idempotent; conflicting existing bytes and preplanted symlinks/junctions fail closed.

## Verification

Independent Codex run at implementation commit `9bf48cb1101de29106e51abe75976ac3b6709fdc`:

- `pnpm verify` passed.
- Story Engine: 242 tests passed.
- Asset pipeline: 63 tests passed, including 18 preparation tests.
- Contracts: 11 tests passed.
- Asset worker: 5 tests passed.
- Remotion runtime: 16 tests passed.
- Render worker: 15 tests passed.
- Desktop: 11 tests passed.
- Studio: 72 tests passed.
- All workspace typechecks passed.
- Privacy verification passed for 549 tracked and publishable files.
- `git diff --check` passed before commit.

The only lint output is the two pre-existing KVP Remotion non-pure-animation warnings in `apps/render-worker/src/kvp001-proof.ts`; there are no lint errors.

## Review request

Review the exact implementation commit above for ACCEPTED / CONDITIONAL / REJECTED before this preparation contract is used to produce the Ollo front/profile diagnostic views. In particular, verify that no authoritative prepared pixels or prepared-view manifest can be produced without the exact complete import receipt and reopened source evidence.
