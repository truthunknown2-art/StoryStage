# KCAST-001I tail recipe correction v11 handoff

## Scope

This change closes only the Ollo front and profile-left pelvis-to-tail seam/orbit defect. It does not accept the rig, grant motion capability, or repair the other joint gaps visible in the diagnostic packet.

## Exact correction

- Front tail recipe: `childPivot {x: 141, y: 201}` and `restTransform {x: 76, y: 35}`.
- Profile-left tail recipe: `childPivot {x: 156, y: 266}` and `restTransform {x: 87, y: 66}`.
- Tail rotation, scale, z-index, topology, schema, artwork, and authority flags are unchanged.
- The immutable private `set-parent-socket` patches retain the fixed evidence-led points:
  - front `(236000000, 126000000)` micropixels;
  - profile-left `(272000000, 172000000)` micropixels.

## Measured result

| View | Before max gap | After -15° / 0° / +15° | Corrected receipt |
| --- | ---: | ---: | --- |
| front | 31.989515 px | 0.300000 / 0.300000 / 0.300000 px | `c0286c2f272488eb746e3ccd81de8053fd4f98102cfeb1d386f31a211a7d789d` |
| profile-left | 44.534786 px | 0 / 0 / 0 px | `2fec634003d37e5b840cfea28645e3cff58e884086cb675852871d376bd6283a` |

Hash-bound report: `81c5a9cd8beeccc55d63eae1f90389625c6a7b0f2bebe708430db5a13628217f`.

Local ignored render evidence:

- `artifacts/KCAST-001/private-registration-diagnostic/v11-tail-recipe-corrected-front/gap-orbit.png` — sha256 `743aff58e9fa78aa24c3c1f4e5789332f1a3d34ed3ed1b6c57da395621c250fa`
- `artifacts/KCAST-001/private-registration-diagnostic/v11-tail-recipe-corrected-front/zero.png` — sha256 `8ad7fadfaccef88942c19b39c4111c4e7f041097d0885403246b48006a7e695f`
- `artifacts/KCAST-001/private-registration-diagnostic/v11-tail-recipe-corrected-profile-left/gap-orbit.png` — sha256 `c58572dcabaa7bc69a99166db9dd3abf093e819bcbe50bdaa8819572b2186d39`
- `artifacts/KCAST-001/private-registration-diagnostic/v11-tail-recipe-corrected-profile-left/zero.png` — sha256 `87885d2d303ba58921efe3f46bbf40564c060267c21f654ea539b172fecd9282`

Visual inspection shows the tail attached in both zero-pose and orbit panels. Both receipts keep approval, capability, production, motion, ordinary-player, and export authority false.

## Verification

- `pnpm --filter @storystage/asset-pipeline typecheck` — pass
- `pnpm --filter @storystage/render-worker typecheck` — pass
- `pnpm --filter @storystage/asset-pipeline exec vitest run src/ollo-candidate-i-registration-guides.test.ts` — 2 tests pass
- `pnpm --filter @storystage/asset-pipeline exec vitest run src/candidate-rig-exact-attachment-measurement.test.ts` — 4 tests pass
- `pnpm --filter @storystage/story-engine exec vitest run src/candidate-rig-private-registration-contract.test.ts` — 6 tests pass
- `pnpm --filter @storystage/render-worker exec vitest run src/candidate-rig-private-registration-diagnostic.test.ts` — 4 tests pass
- `pnpm --filter @storystage/render-worker exec tsx src/kcast001i-ollo-tail-socket-corrections-v11-proof.ts` — pass; wrote report hash above

## Remaining blockers

The gap-orbit composites still show pre-existing failures at non-tail joints, including ears, wrists, ankles, neck, torso-to-pelvis, shoulders, elbows, and knees. This handoff must not be used as all-joint Gate 1 acceptance or as authority to bind the 30-second player. Human static inspection and dedicated corrections for those joints remain required.
