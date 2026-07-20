# Ollo layered-environment guide-audio proof

Status: **PASS**, private render evidence. The environment media is creator-approved; character performance remains proxy-only.

## What this proves

- The ordinary `StoryStageProduction` / `director-episode` path consumes the exact approved Little Wood background and alpha foreground bindings.
- The runtime fetches, hashes, decodes, and displays the immutable plate bytes before continuing the render.
- The foreground plate stays above the character plane and the background uses a distinct frame-driven parallax response.
- Audio-on and muted exports share the exact same episode/picture props and 760-frame clock.

## Exact evidence

- Executable episode plan: `24f761a96d42941ded7642626a394ac9f4494a3e8e50d115f6ca50f00d2d27a1`
- Picture props: `203fc5838ea326ff9c9979b26b6bfe6e437f7d767b895df83c3dca9b5bf399c4`
- Background: `1e550fd7d07d9e084f439a90aa084d142c350a83eb7ba1b0850dabef87400ba0`
- Foreground: `0194924d3d0a94eb537176e464dce386af30a8dcac4e2bb67e5246a43dc946d1`
- Audio-on MP4: `865c23b6ed02a5b157c9800076fba71181e22630ee96b17a5bc420edf058466a`
- Muted MP4: `eb5897f7ec714ece3b12ec37707e54c1d2690178f561ee4d028dfb7aba30ce26`
- Twelve-frame visual contact sheet: `ba7f07b7175e551873451cf6d7f72585442a87042a60b38941043baf1ed63c33`

Outputs are under:

`C:\Projects\StoryStage-ollo-environment-guide-proof\artifacts\EDI-001B\editorial-guide-audio-proof\8fd04b0b0dd2a18a601b`

## Verification

- Proof tests: 5/5 passed.
- Render-worker TypeScript and ESLint passed.
- Real paired Remotion render passed at 1920×1080, 30 fps, 760 frames.
- Audio-on contains 48 kHz AAC; muted contains no audio stream.
- PR #29 hosted verification passed before the environment renderer merged as `e6cbf48e06a5b46963867be7e25e0a428b92b99e`.

## Remaining visible blocker

The contact sheet makes the next priority unambiguous: scenery and depth are now real, but both on-screen performers are still proxy dolls. This evidence does not claim an approved Ollo rig, acting, lip sync, or coherent final character staging.
