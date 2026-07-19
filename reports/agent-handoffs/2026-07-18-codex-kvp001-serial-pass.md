# KVP-001 strict determinism checkpoint

- Branch: `agent/kvp001-production-proof-wip`
- Base: `cc5f8a55e32d727a2a1636d9146d394f64050e52`
- Status: **strict determinism accepted by Pro at `a8d7aef`; proxy-vs-rig authority closure PASS; final Pro/Player closure pending**

## What changed

- Replaced the single clipped puppet sheet at render time with 17 independently content-addressed and browser-verified rig assets.
- Every part and facial exposure is resolved by its sealed manifest candidate ID.
- Asset verification is atomic: no local-parts visual mounts until the full set passes byte length, SHA-256, and browser decode checks plus `document.fonts.ready`.
- Replaced compositor-sensitive CSS eyes with sealed raster eye and pupil exposures while retaining deterministic blink and quantized gaze animation.
- Removed transformed crop boxes from limb rendering, eliminating the invisible sprite-edge failure class.

## Exact evidence

- Executable episode: `75c071b3cb3592d37b2c0074ae5a923464c28bc6f55714e1939c2940cbcfd970`
- Lossless sequence pass 1: `db188bcc86e5bf97f151f408e94de1722d35872a517b7134f9aae6cb88633596`
- Lossless sequence pass 2: `db188bcc86e5bf97f151f408e94de1722d35872a517b7134f9aae6cb88633596`
- Lossless comparison: 140/140 exact PNG matches, 0 mismatches.
- Isolated fresh-browser comparison: 11/11 exact matches, 0 mismatches.
- Shared-browser ascending comparison: 11/11 exact matches, 0 mismatches.
- Shared-browser descending comparison: 11/11 exact matches, 0 mismatches.
- Shared-browser deterministic-shuffle comparison: 11/11 exact matches, 0 mismatches.
- Encoded-pass decoded comparison: 11/11 exact matches, 0 mismatches.
- Encoded MP4 pass hashes: `81f1c66ee22eb861f46001771c97a6acb293883d073768e1fa2024b567815f9d` for both passes.
- Output contract: 1920x1080, 30 fps, 140 frames, H.264/yuv420p.
- Proxy-vs-rig planning/timing/scene-world/shot/event/format artifact projection: exact match.
- Proxy-vs-rig canonical authority comparison: 140/140 exact frame matches.
- Proxy-vs-rig visual comparison: 10/11 selected frames differ as required; frame 0 matches because both renders are fully hidden by the canonical opening transition.

Pinned environment receipt:

- Windows: `win32 10.0.26200`
- Node: `24.13.0`
- Remotion / Renderer / Bundler: `4.0.490`
- Chromium: `Google Chrome for Testing 149.0.7790.0`
- Chromium executable SHA-256: `ec76dc3e69ffab9daddf0bbe7bf0a9e0a034b2d086741a0ae2ef6358a597537b`
- Chrome mode: `headless-shell`; GL override: `null`; device scale: `1`; concurrency: `1`
- Bundle: 127 files, aggregate hash `d24a1061192b81a2d13d41ccf1445167d75f3eb38758897c4330a395bac31253`
- Arial regular: `b3658eadae55e682b5f69eb64c439c1ecc8f196c0bb8d4756d145d13bc86476a`
- Arial bold: `e8f4e3baf6cc35fed6fcce3a540e8b39e8f6cda1d22a28f2ec8f526fef7a43f5`
- Arial Black: `10df702864b1f89cb29ba0d6b97c04228338d16807e13e8d8c74b91aba5e5f23`

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

Pro accepted the strict determinism P1 at `a8d7aef`. This follow-up closes the remaining authority-isolation failure class by retaining the capability-free proxy compilation and comparing it with the rig-enabled compilation. The real Player visual review remains a separate Preston gate, and the fixture still does not prove general arbitrary-script synthesis of compound locomotion-to-acting performances.
