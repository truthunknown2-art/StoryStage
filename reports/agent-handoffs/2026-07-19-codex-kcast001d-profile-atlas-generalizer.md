# KCAST-001D profile atlas generalizer handoff

## Outcome

Implemented a minimal directional extension of the accepted fixed-grid front
atlas compositor. The same extraction, hash binding, crop ownership, alpha,
exclusive lower-face, and deterministic PNG rules now support `profile-left`
and `profile-right`.

Candidate G was **not** composed or promoted. It fails both the unchanged 32px
canonical-key gate and the view-specific visual-role audit. The proof records
the rejection and verifies that both view attempts fail closed.

## Code

- `packages/asset-pipeline/src/fixed-grid-front-atlas.ts`
  - adds typed profile-left/profile-right composition;
  - retains the 32px maximum key-distance ceiling;
  - emits view-specific atlas lineage and lower-face registration groups;
  - leaves every authority and readiness gate false.
- `packages/asset-pipeline/src/fixed-grid-profile-atlas.test.ts`
  - proves exact 20-part/22-face inventories for both views;
  - proves byte determinism, sealed source rectangles, exclusive lower-face
    invariants, and zero authority;
  - proves failure above the 32px ceiling.
- `packages/asset-pipeline/scripts/kcast001d-ollo-profile-atlas-composition-proof.ts`
  - verifies all ten candidate-G hashes and dimensions;
  - records measured canonical-key distances;
  - requires candidate-G profile composition to reject;
  - writes rejection evidence only.

## Exact evidence

- `reports/evidence/KCAST-001/ollo-profile-source-candidate-g-rejection-evidence.json`
- content hash:
  `6c296121f7eaa00567ca3f6b743006e0300597f0f2abfb819d7d061c611a4d4e`
- derived profile atlases: `false`
- lower-face diagnostics: `false`
- import receipt: `false`
- prepared manifest: `false`
- provider authority: `false`
- preparation authority: `false`
- approval: `false`
- production binding: `false`

## Verification

```text
pnpm --filter @storystage/asset-pipeline exec vitest run \
  src/fixed-grid-front-atlas.test.ts \
  src/fixed-grid-profile-atlas.test.ts \
  src/chroma-key.test.ts

3 test files passed; 12 tests passed.

pnpm --filter @storystage/asset-pipeline typecheck
passed

pnpm --filter @storystage/asset-pipeline proof:kcast001d-profile-atlas
REJECTED as required; evidence hash
6c296121f7eaa00567ca3f6b743006e0300597f0f2abfb819d7d061c611a4d4e
```

## Required next source pass

1. Regenerate L core, L limbs, R limbs, and R lower-face base with a measured
   canonical-magenta distance no greater than 32.
2. Replace the frontal apron in both core sheets with foreshortened,
   view-specific profile layers.
3. Reauthor the right-facing eye/lid/brow set with correct near/far anatomy and
   asymmetric feature handedness.
4. Reauthor the right-facing mouth set with correct handedness.
5. Re-run the proof with new immutable hashes and newly audited crop rectangles.
