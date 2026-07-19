# KCAST-001D Codex handoff — deterministic front source atlases

## Outcome

PASS at the source-candidate boundary. Exact D-core, E-limb, C-eye, and F-exclusive-lower-face inputs now yield byte-reproducible transparent front atlases with complete crop and placement lineage. The three-item turnaround/front bundle stages provider-neutrally as `incomplete`; no receipt or prepared manifest was created.

## Implementation

- Added `packages/asset-pipeline/src/fixed-grid-front-atlas.ts`.
- Added focused tests in `packages/asset-pipeline/src/fixed-grid-front-atlas.test.ts`.
- Exported the composer through the asset-pipeline index and included its tests in the package test command.
- Added `packages/asset-pipeline/scripts/kcast001d-ollo-front-atlas-composition-proof.ts` and `proof:kcast001d-front-atlas`.
- Preserved strict equal-grid extraction while adding exact source-hash/dimension-bound sealed rectangle manifests. Both are fail-closed.
- Enforced the exclusive lower-face replacement contract and exact outside-change-box pixel equality.
- Generated the two source atlases, the six-pose lower-face diagnostic, the incomplete candidate bundle, staging report, and composition evidence.

## Exact results

- Parts-front: `a8c74ff89094a4169be9b19f7d9c0e251f0059aa6d13a9075994d74ba11efe30`, `1600x1248`, 20 roles.
- Face-front: `b9564f7fd1a30e470ea62e9d85d430dcb2d437f4b9e9a5ef01cc1507cb6925c7`, `4896x2112`, 22 roles.
- Lower-face diagnostic: `6ba6452b349557580b3d2a33936eace2c8aecb34ddae282205b3c9f505b1e39b`, `4608x480`, six poses at three frames each.
- Bundle: `47bd4d5f6564d26db5c90163af6a04c61a79482a10f3fa3c3ce44b483f4ff379`.
- Staging report: `78436f1f1243d1f6ff2372e7ceb20257718220fd35b81627d72462305cd65725`, `incomplete`.
- Evidence: `4b9e4278bd9d1204b5137440426b37ff142de70af8b99a5fc5095ff22e327ff8`.

## Verification

- Focused chroma and front-atlas tests: 8 passed.
- Asset-pipeline typecheck: passed.
- `proof:kcast001d-front-atlas`: passed and reproduced both atlas byte streams exactly.
- Visual inspection: both transparent atlases and the lower-face diagnostic open correctly; canonical ordering and gutters are visible.

## Remaining blockers

- Four profile kits are missing, so intake is incomplete.
- No shared assembly scale, head registration, pivots, sockets, hierarchy, or occlusion proof exists.
- `visualRoleAuditPassed` and `registrationReady` remain false.
- The head's required absence of lower-face art still needs to remain an explicit preparation/assembly gate.
- A complete seven-item import, authoritative preparation, moving diagnostic, and Preston approval remain mandatory before production binding.

No commit or push was performed by this worker.
