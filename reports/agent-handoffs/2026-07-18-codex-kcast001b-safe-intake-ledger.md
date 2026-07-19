# KCAST-001B safe intake and recipe ledger

- Repo: `truthunknown2-art/StoryStage`
- Branch: `agent/kcast001-provider-neutral-rig`
- Base: `a77a1cf` (stacked PR #3)
- Status: **implementation ready for verification; extraction/manifest/diagnostic not yet implemented**

## What this slice adds

- Partial provider-neutral candidate-bundle inspection. A turnaround may be staged as `incomplete`; the complete-only validation gate still fails until all seven required sheets are present.
- Stable anatomical left/right limb, ear, eye, pupil, lid, and brow identities across every view.
- A hash-sealed staging report bound to the exact request, bundle, identity lock, and rig template, plus a complete-only seven-file `CharacterRigImportReceipt` contract.
- A proposed extraction recipe ledger for named parts and exposures, source crops, matte mode, output canvas/padding, child pivots, parent joints, parent sockets, rest transforms, sockets, deterministic z-order, processor versions, and exposure registration.
- A utility-process asset-worker command for character-rig staging. Credentials, API keys, browser sessions, and provider authority are excluded from the strict command schema.
- A safe staging implementation that rejects unsafe paths, network roots, symlinks/junctions, byte/hash/dimension drift, non-PNG or animated/truncated PNGs, decode-limit violations, reused source bytes, and immutable output collisions.

## Pro review corrections incorporated

- Replaced view-relative `near`/`far` identities with stable anatomical `left`/`right` roles for limbs, ears, eyes, pupils, lids, and brows.
- Made one `requirementsForRigProfile()` function authoritative for both request construction and request validation.
- Enforced exact role partitioning: body roles cannot enter a face kit and face/exposure roles cannot enter a parts kit.
- Added child pivot, parent joint, parent socket, rest translation/rotation/scale, z-order, and processor identity to the preparation ledger so a later generic renderer does not hardcode Ollo placement.
- Kept reusable rig-family authority and per-episode capability binding as distinct next-slice concerns.

## Ollo evidence

- Unapproved turnaround candidate: `reports/evidence/KCAST-001/candidates/ollo-turnaround-candidate-a.png`
- Candidate SHA-256: `e608a47c8af86b2ca271bb22b7fc8c82454b8a8a5a6e11531d9f876e4f27158e`
- Safe-intake request: `reports/evidence/KCAST-001/ollo-rig-request-v1.json`
- Partial bundle: `reports/evidence/KCAST-001/ollo-turnaround-candidate-bundle-a.json`
- Staging report: `reports/evidence/KCAST-001/ollo-turnaround-staging-report-a.json`
- Staging report hash: `c8f1bfbbdc9a8333caca650ee48d399e40e683166cde5cca765503bed5bf3925`
- Result: `incomplete`; the six front/profile parts and face sheets remain missing; provider authority is false and human approval remains mandatory.

The generated front-parts chroma sheet is also retained as an untrusted draft. It is not included in the staged bundle because component-count, separation, matte, and crop checks have not yet passed.

## Verification

- `pnpm --filter @storystage/story-engine typecheck`
- `pnpm --filter @storystage/story-engine exec vitest run src/character-rig-acquisition.test.ts src/character-rig-preparation.test.ts`
- `pnpm --filter @storystage/asset-pipeline typecheck`
- `pnpm --filter @storystage/asset-pipeline exec vitest run src/character-rig-staging.test.ts`
- `pnpm --filter @storystage/asset-worker typecheck`
- `pnpm --filter @storystage/asset-worker test`
- `pnpm --filter @storystage/asset-pipeline proof:kcast001b-intake`

## Honest remaining work

- No component crop or matte is executed yet. The recipe ledger exists so the next worker step has exact authority and review lineage.
- The current articulated manifest still lacks the reusable three-view rig-family wrapper and episode-specific capability binding. Those remain the next contract slice rather than being hidden in this intake change.
- Front/profile face sheets and rig-ready upper/lower-limb sheets still need candidate generation, measurement, and review.
- No Ollo manifest, local performance program, moving diagnostic, or production approval exists yet.
- KVP-001 acceptance does not approve this Ollo candidate.
