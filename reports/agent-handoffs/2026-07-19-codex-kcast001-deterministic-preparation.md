# KCAST-001 deterministic preparation handoff

Date: 2026-07-19  
Owner: Codex  
Branch: `agent/kcast001-preparation-worker`  
Accepted intake base: `acc13d49577bf88e378676b3c11ef1aa5fdde74e`  
Initial implementation commit: `9bf48cb1101de29106e51abe75976ac3b6709fdc`  
Accepted correction implementation: `86cf1d89e27c352c9eb0e9e27a188a2899ebcaa5`

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

## Pro topology rejection and correction

Pro rejected implementation commit `9bf48cb1101de29106e51abe75976ac3b6709fdc` for one P1: it enforced an arbitrary acyclic tree but did not enforce the actual `kids-biped-v1` anatomical topology or exposure targets.

Exact correction commit: `86cf1d89e27c352c9eb0e9e27a188a2899ebcaa5`

The correction adds canonical, versioned, deeply frozen topology authority `6ab97203293ff1736587a224b515d9ce5562825442d02e8cd31b98c4db588c83`. Executable requests must bind that exact hash. Preparation now enforces:

- 29 exact part roles and one torso root;
- torso -> pelvis/head/shoulders/secondary layers;
- pelvis -> same-side hips and tail;
- shoulder -> elbow -> wrist chains;
- hip -> knee -> ankle chains;
- head -> ears/eyes/brows/mouth and eye-white -> pupil/open-lid hierarchy;
- exact semantic socket ownership with no left/right cross-wiring;
- 13 exact exposure roles: lid variants target the corresponding open lid, raised brows target the corresponding neutral brow, and all visemes target `mouth-rest`.

Regressions reject the former all-children-under-torso success fixture, `hand-left` on the right arm chain, `viseme-ai` targeting a lid/eye, an arbitrary request template hash, and mutation of the frozen topology authority. The canonical articulated chain remains deterministic and byte-identical on retry.

The Ollo incomplete intake evidence was regenerated and re-proved at the correction:

- request: `82844eac0b85b33c7fd1e6cf8654755fc27a17aedeb0e0f2acd5779407cc6310`
- candidate bundle: `52b0395e9780183e8fc4abb09213f3808914a5d774eeeeb92f4fbaf168ae54d4`
- staging report: `405408d488ffa8b8c73002fa1dbb9216ff48527819e96d726b73057b8237616b`
- exact turnaround candidate bytes remain `e608a47c8af86b2ca271bb22b7fc8c82454b8a8a5a6e11531d9f876e4f27158e`
- status remains honestly `incomplete`, provider-neutral, unapproved, and approval-required.

Independent Codex verification at the correction passed `pnpm verify` in 50.6 seconds: Story Engine 247, asset pipeline 63, contracts 11, asset worker 5, runtime 16, render worker 15, desktop 11, and Studio 72. The standalone KCAST intake proof also returned PASS with the exact regenerated hashes above. Only the two pre-existing KVP Remotion warnings remain.
