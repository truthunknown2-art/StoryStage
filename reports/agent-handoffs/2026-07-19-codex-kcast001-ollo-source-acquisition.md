# KCAST-001C Ollo source-acquisition handoff

Date: 2026-07-19
Owner: Codex
Branch: `agent/kcast001-ollo-source-acquisition`
Accepted preparation base: `9a1142d`

## Outcome

One exact, consistent Ollo three-view sheet now passes the existing provider-neutral KCAST byte-staging boundary and yields deterministic front, profile-left, and profile-right review crops from reopened staged bytes.

This is a complete source-evidence chain for those three review directions only. It is not a complete rig intake, prepared rig view, rig family, or production asset.

## Exact lineage

- Generated chroma: `ae779f1a2068753a1e40c65ab8509f3e65f7dff41fe84560addd81a73c3a1a7d`
- External-helper alpha companion: `709317090e7a482e753e22e4e399389142727bc22c965d1d4bcf597ad2784277`
- Canonical repo-derived alpha: `38d0321cfcb1daaf564b676c19fe65d2a3c0172ac1b378fe4a4b13076de9b0ec`
- Request: `82844eac0b85b33c7fd1e6cf8654755fc27a17aedeb0e0f2acd5779407cc6310`
- Candidate bundle: `5809cee2128a65bf1bb33cecba40c267a01d61426bab871f2799d3adfe72d4ba`
- Staging report: `6b48a2e902c1a7126711c9b15006004f1ac1c0277a9830388d82c0e6251f304f`
- View evidence: `cb68cc47c2a9f6356389703f5fcab4bfdca0d5aa7e1aeb9273af38992d1b82f9`
- Front crop: `4e4dc1a16caf4ff5f0bad85979921db1c14cc01969a8406648efefd778417ce7`
- Profile-left crop: `c91d7319470e6786750c78ab9cf23824a272fbd08d5238ed21107a2e83b37214`
- Profile-right crop: `0204f3b83e731b4d914020a360f943001102b539f8d265343525a675e9614314`

## Trust boundary

- The image-tool helper alpha is preserved for visual comparison but has no production authority.
- Repository code independently removes the chroma and requires the committed canonical alpha to reproduce byte-for-byte.
- The canonical alpha enters the accepted `stageCharacterRigCandidateBundle()` path as the one `turnaround-sheet` response.
- The proof reopens the exact content-addressed staged bytes before deriving crops.
- Crops record exact source hashes, rectangles, PNG processor settings, output hashes, content bounds, and boundary checks.
- Crops are explicitly `identity-and-registration-review-only`; they are not parts or face kits.

## Honest gates

- Intake remains `incomplete`.
- The front/profile-left/profile-right parts kits and face kits are all missing.
- The three-view sheet also lacks the three-quarter and rear views named by the canonical turnaround instruction.
- No import receipt, prepared-view manifest, rig-family manifest, moving diagnostic, or approval exists.
- `providerAuthority`, `preparationAuthority`, and `productionBindable` are all false.
- Preston's explicit moving-diagnostic approval remains required after actual articulated sources exist.

## Verification

- `pnpm --filter @storystage/asset-pipeline exec vitest run src/chroma-key.test.ts`
- `pnpm --filter @storystage/asset-pipeline proof:kcast001c-source`
- `pnpm verify` passed in 53.4 seconds: Story Engine 247, asset pipeline 65, contracts 11, asset worker 5, Remotion runtime 16, render worker 15, desktop 11, and Studio 72 tests passed; all workspace typechecks and privacy verification passed.
- `git diff --check` passed.

The only lint output is the two pre-existing KVP non-pure-animation warnings in `apps/render-worker/src/kvp001-proof.ts`; there are no lint errors.
