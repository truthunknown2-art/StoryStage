# KVP-001 production proof checkpoint

- Branch: `agent/kvp001-production-proof-wip`
- Base: `cc5f8a55e32d727a2a1636d9146d394f64050e52`
- Status: **WIP — do not merge**

## Scope

- KVP-001 canonical 140-frame performance fixture and proof runner.
- Real `@remotion/player` evidence route for the existing Director composition.
- Story Engine continuity/performance authority changes.
- Content-addressed capability asset verification.
- Migration from one clipped puppet sheet to independently cropped, transparent local-part assets.
- Ollo & Friends cast and layered mixed-media environment direction.

## Current verification

Passing:

- Story Engine typecheck and 227 tests.
- Remotion Runtime typecheck.
- Render Worker typecheck.
- Studio typecheck and 72 tests.
- Capability asset catalog verification for 15 immutable assets.

Known failing integration tests:

- Remotion Runtime: 8 failures. The manifest now declares 13 independently verified part/exposure assets while the runtime/test fixture still binds one whole-sheet asset.
- Render Worker: 2 failures for the same incomplete single-asset to multi-asset migration.

## Acceptance boundary

This checkpoint is published for collaboration and recovery, not acceptance. KVP-001 remains red until the production serial render path is frame-order independent and two complete 140-frame lossless sequences match byte-for-byte in the pinned environment. Fresh-page `renderStill` equality is not an acceptable workaround.

## Next implementation step

Complete batch verification and candidate-ID resolution for every rig part/exposure asset in the Remotion runtime and render worker, update fixtures to reject missing/stale/tampered individual assets, then rerun the determinism matrix.
