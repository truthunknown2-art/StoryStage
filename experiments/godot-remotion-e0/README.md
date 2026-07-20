# E0 Godot → Remotion feasibility spike

This is the product-plan-authorized E0 research experiment. It proves one narrow
question: can a pinned Godot 4.x `Skeleton2D`/`Bone2D` performance render as a
deterministic transparent pass and then appear, frame-for-frame, inside an
isolated Remotion composition?

It is not StoryStage product runtime, B1, B2, a final rig, or final Ollo art.
Nothing here is imported by `apps/**` or `packages/**`.

## Result

- **E0 verdict: `PASS`.** The transparent Godot-to-Remotion exchange passed on
  the pinned host. This verdict is limited to the feasibility seam described
  here.
- Capture route: the articulated scene renders inside a transparent
  1920×1080 `SubViewport`; GDScript captures the completed viewport texture
  with `get_texture().get_image()` and saves each RGBA frame with `save_png()`.
  Godot's built-in PNG MovieWriter is not used.
- Godot pass: 120 frames, 1920×1080 RGBA PNG, 30 fps, four-second video stream.
- Rig: one `Skeleton2D` with 18 hierarchical `Bone2D` nodes.
- Performance arc: settle (0–27), articulated step (28–52), reach (53–78),
  react (79–101), and held final pose (107–119).
- Determinism: two corresponding 120-frame renders matched as raw PNG bytes;
  mismatch count `0`. Every matching file also decoded successfully as RGBA8,
  so the decoded RGBA pixel buffers necessarily match exactly on this host.
- Aggregate frame digest:
  `10cebaf5e036c5aa6c51ada66dc4a5e860ed1c4fe93f2a0f7f293722cea13d1f`.
- Composite: H.264, 1920×1080, 30 fps, exactly 120 video frames and a 4.000000
  second video stream.
- MP4 SHA-256:
  `10650e0e7fff3a7f2f86dc123f74c56f4c5f0859ad803db511ec80c4eb5eac78`.

The full per-frame digest and alpha/bounds manifest is
[`evidence/frame-verification.json`](evidence/frame-verification.json). The
combined MP4 probe and representative-still hashes are in
[`evidence/verification.json`](evidence/verification.json).

## Asset decision

The repository's Ollo material was inspected and deliberately not used:

- `reports/evidence/KCAST-001/ollo-complete-candidate-bundle-i.json` calls the
  source art unapproved;
- `reports/evidence/KCAST-001/ollo-rig-request-v1.json` still requires approval;
- `reports/evidence/KCAST-001/ollo-complete-import-receipt-i.json` records
  `providerAuthority: false`.

The experiment therefore draws an original geometric paper-cutout puppet in
Godot and labels its torso `ENGINE SPIKE`. This preserves the Ollo approval gate.

## Pinned tools

- Godot `4.7.1.stable.official.a13da4feb`, official portable Windows x86_64.
- Archive URL:
  `https://github.com/godotengine/godot-builds/releases/download/4.7.1-stable/Godot_v4.7.1-stable_win64.exe.zip`
- Published and locally verified archive SHA-256:
  `c7a289051eaefb460b0106b60e9cd5bee0ef55fd102dcb2bed1eb356cf3d90a1`.
- Console executable SHA-256:
  `35dab11e04ece16a2b93035e65204f4a944a3e00b020d43e54409193379d5eef`.
- Local install used for this evidence: `C:\Tools\Godot\4.7.1`.
- Host: Microsoft Windows 11 Pro `10.0.26200` (build `26200`).
- Rendering method/driver: Godot `gl_compatibility`, native OpenGL 3.3,
  NVIDIA OpenGL driver `610.74` on an NVIDIA GeForce RTX 3080. Windows reports
  display-driver version `32.0.16.1074`.
- Relevant project settings: 1920×1080 viewport and window override,
  `window/per_pixel_transparency/allowed=true`, transparent clear color,
  `transparent_background=true`, and `gl_compatibility` for desktop/mobile.
- Remotion and `@remotion/cli` `4.0.490`, React `19.2.3`, Node `24.13.0`,
  pnpm `11.9.0`.

The Godot archive, executable, import cache, Remotion browser cache, credentials,
and `node_modules` are not committed.

## Reproduce

From this experiment directory in PowerShell:

```powershell
pnpm --dir .\remotion install --frozen-lockfile

.\scripts\render-godot.ps1 -OutputDirectory "$PWD\artifacts\frame-run-a"
.\scripts\render-godot.ps1 -OutputDirectory "$PWD\artifacts\frame-run-b"

Push-Location .\godot
try {
  & 'C:\Tools\Godot\4.7.1\Godot_v4.7.1-stable_win64_console.exe' `
    --headless --path . --script .\verify_frames.gd -- `
    --run-a 'res://../artifacts/frame-run-a' `
    --run-b 'res://../artifacts/frame-run-b' `
    --output 'res://../evidence/frame-verification.json'
} finally {
  Pop-Location
}

.\scripts\render-remotion.ps1 -FrameDirectory "$PWD\artifacts\frame-run-a"
node .\scripts\verify-mp4.mjs `
  .\evidence\frame-verification.json `
  .\evidence\godot-remotion-e0.mp4 `
  .\evidence\verification.json
```

The current workstation's retained full sequences are:

- Run A: `C:\Projects\StoryStage-godot-spike\experiments\godot-remotion-e0\artifacts\frame-run-subviewport-a`
- Run B: `C:\Projects\StoryStage-godot-spike\experiments\godot-remotion-e0\artifacts\frame-run-subviewport-b`

They are intentionally ignored rather than committing 240 full-HD PNGs.
`render-remotion.ps1` byte-checks its copied staging frames before rendering.
The composition selects only
`staticFile("frames/frame-NNNN.png")` from `useCurrentFrame()` and displays it
with Remotion's `Img`; it uses no CSS animation, timers, or hidden real-time state.

## Evidence artifacts

- [`evidence/godot-remotion-e0.mp4`](evidence/godot-remotion-e0.mp4)
- [`evidence/stills/composite-frame-0000.png`](evidence/stills/composite-frame-0000.png) — settle
- [`evidence/stills/composite-frame-0041.png`](evidence/stills/composite-frame-0041.png) — step
- [`evidence/stills/composite-frame-0078.png`](evidence/stills/composite-frame-0078.png) — reach
- [`evidence/stills/composite-frame-0088.png`](evidence/stills/composite-frame-0088.png) — react
- [`evidence/stills/composite-frame-0119.png`](evidence/stills/composite-frame-0119.png) — hold

## Known limitations

- The puppet and environment are deliberately simple engine-test art, not Ollo
  and not a final visual-quality claim.
- Motion is hand-authored keyframe evidence, not a production action graph or
  StoryStage job interface.
- The proof has no narration, lip sync, sound, camera edit, or production asset
  pipeline.
- On this Windows/NVIDIA machine, `RenderingServer.frame_post_draw` did not fire
  under Godot's headless display driver. The unattended script therefore uses
  the ordinary OpenGL compatibility display driver with its window positioned
  off-screen. Same-machine repeatability is proven; cross-GPU determinism is not.
- Godot reports harmless terminal-bone length warnings for ears, hands, feet,
  and tail because those tip bones have no child bone.
- FFprobe reports the exact video stream as 4.000000 seconds / 120 frames. The
  MP4 container reports 4.053333 seconds of mux duration; the verifier records
  both rather than hiding the distinction.
