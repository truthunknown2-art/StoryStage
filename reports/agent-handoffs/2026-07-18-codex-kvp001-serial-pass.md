# KVP-001 serial determinism checkpoint

- Branch: `agent/kvp001-production-proof-wip`
- Base: `cc5f8a55e32d727a2a1636d9146d394f64050e52`
- Status: **serial production path PASS; Pro acceptance still pending**

## What changed

- Replaced the single clipped puppet sheet at render time with 17 independently content-addressed and browser-verified rig assets.
- Every part and facial exposure is resolved by its sealed manifest candidate ID.
- Asset verification is atomic: no local-parts visual mounts until the full set passes byte length and SHA-256 checks.
- Replaced compositor-sensitive CSS eyes with sealed raster eye and pupil exposures while retaining deterministic blink and quantized gaze animation.
- Removed transformed crop boxes from limb rendering, eliminating the invisible sprite-edge failure class.

## Exact evidence

- Executable episode: `75c071b3cb3592d37b2c0074ae5a923464c28bc6f55714e1939c2940cbcfd970`
- Lossless sequence pass 1: `db188bcc86e5bf97f151f408e94de1722d35872a517b7134f9aae6cb88633596`
- Lossless sequence pass 2: `db188bcc86e5bf97f151f408e94de1722d35872a517b7134f9aae6cb88633596`
- Lossless comparison: 140/140 exact PNG matches, 0 mismatches.
- Fresh-page still comparison: 11/11 exact matches, 0 mismatches.
- Encoded-pass decoded comparison: 11/11 exact matches, 0 mismatches.
- Encoded MP4 pass hashes: `81f1c66ee22eb861f46001771c97a6acb293883d073768e1fa2024b567815f9d` for both passes.
- Output contract: 1920×1080, 30 fps, 140 frames, H.264/yuv420p.

Evidence files:

- `reports/evidence/KVP-001/kvp001-production-proof.mp4`
- `reports/evidence/KVP-001/contact-sheet.png`
- `reports/evidence/KVP-001/proof-report.json`

## Verification completed

- Remotion Runtime typecheck and 16 tests passed.
- Render Worker typecheck and 15 tests passed.
- Studio typecheck passed.
- 19 content-addressed Director assets passed catalog verification.
- Ordinary-script local-parts reaction smoke rendered through the production composition.

## Acceptance still required

This checkpoint does not yet claim Pro acceptance. The next proof revision must record the pinned OS/Chromium/Node/Remotion/font/device-scale/GPU environment and add selected-frame order independence for isolated, ascending, descending, and deterministic-shuffle evaluation. The real Player visual review also remains a separate gate.
