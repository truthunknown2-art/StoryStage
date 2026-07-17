# SS-009 Frankly Weird History Publishable Pilot 001

Date: 2026-07-17
Status: **FIRST CONTENT PASS IMPLEMENTED - awaiting Pro audit and human gates**

## Outcome so far

The Rook pilot is now directed as a specific episode instead of inheriting a repetitive template. Editorial routing rises from 18% to 64% while the script, duration, frame count, and eleven-shot structure stay unchanged.

## Implemented content slice

- A strict shot-number map freezes treatment, framing, transition, and camera intent for all eleven shots. Any script/compiler drift that creates a missing or stale shot direction now fails immediately.
- Shots 1.03, 1.05, and 1.08 are labeled generated reconstructions with one acquisition brief each. These are the only new image assets requested by this content pass.
- Shots 1.07 and 1.09 use animated code-authored policy diagrams tied to the actual editorial text.
- Shots 1.06 and 1.10 retain full-frame kinetic type. The remaining environment, presenter-performance, and reaction beats make Rook an anchor rather than the only visual idea.
- Every post-establishing transition is an explicit hard cut.
- The frozen render shot now carries optional editorial text, allowing deterministic type and diagram treatments to communicate the narration without reverse-engineering UI labels.
- Approved prop manifests retain their `assetClass` through preview, diagnostic, and final rendering. Opaque `editorial-visual`, `diagram`, and `reconstruction` pixels no longer take the transparent-prop validation path.
- Reconstruction art renders full-frame with camera motion and a persistent `Generated reconstruction` disclosure. Before approval, the same shot renders an honest content-specific acquisition placeholder.
- `pnpm render:rook-preview` now renders six representative treatment frames into ignored SS-009 evidence: environment, presenter performance, reconstruction placeholder, diagram, kinetic type, and reaction.
- The built-in ChatGPT image tool generated exactly three 1672×941 reconstruction candidates for shots 1.03, 1.05, and 1.08. Their exact prompts, hashes, local mappings, and proposed generated-media rights record are captured in the committed candidate ledger; the pixels remain ignored and unapproved until the desktop review flow imports them.

## Human gates still open

The user has not yet approved or rejected Rook, approved the pilot script, supplied/approved final narration, approved the three reconstruction candidates, locked final spoken timing, reviewed the mix, or accepted a verified delivery. This milestone does not claim a publishable episode until all of those durable facts exist.

## Verification

- `pnpm verify` passes privacy validation, lint, all workspace typechecks, and all 149 repository tests. Studio remains 40/40; Story Engine is 41/41.
- `pnpm build` passes render worker, asset worker, Electron main/preload with workspace-bundle verification, and the Studio production build.
- `pnpm render:rook-preview` renders six representative 1920×1080 frames from the real production composition. Visual inspection caught and removed a duplicated diagram footer/caption and made the first causal node visible on the incoming hard cut.
- In-app browser QA rebuilds the exact Rook fixture at 790 frames, shows 64% editorial routing, three asset briefs, six honest remaining production gates, generated-reconstruction disclosure, readable code-authored diagrams, and the unchanged 26-second runtime.
- The three generated candidates are 1672×941 PNGs with distinct logged SHA-256 hashes. They remain in ignored local artifacts and are not counted as approved assets.
