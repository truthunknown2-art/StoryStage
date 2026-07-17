# SS-001 completion report

Date: 2026-07-16  
Status: **ACCEPTED — SS-001 approved and closed by ChatGPT Pro**

## Outcome

StoryStage now has a working desktop walking skeleton. The same unprivileged React studio runs in a browser and in a sandboxed Electron renderer. It previews a schema-validated deterministic Remotion episode, starts an isolated render worker, displays typed progress, creates a genuine H.264/AAC MP4, reveals completed output, converts worker failure into visible state, and retries through a fresh job without restarting the studio.

The fixture is exactly 1280×720, 30 FPS, and 360 frames (12 seconds), with two scenes, four visible/selectable shots, two cutout characters, multiple depth layers, a hard cut, restrained camera push, gesture, reaction pose, timed mock dialogue, caption, evidence card, and locally generated SFX.

## Final architecture

- `apps/studio`: pure React/Vite, `@remotion/player`, semantic timeline, inspector, visible shot selection, and browser/desktop host adapters. It imports no Electron, Node built-ins, Remotion renderer, or bundler.
- `apps/desktop`: Electron main/preload only. It owns capabilities, job identifiers, the authoritative in-memory job registry, state validation, output-path policy, OS file reveal, navigation policy, timeout enforcement, and utility-process supervision. It performs no rendering.
- `apps/render-worker`: separately built worker protocol, Remotion bundler/renderer, CLI, exact-frame proof extraction, media metadata, environment capture, audio verification, and determinism checks.
- `packages/contracts`: strict Zod episode, IPC, worker, capability, and discriminated render-job schemas. The EpisodePlan schema version is `1.0`; this package contains no fixtures.
- `packages/fixtures`: production cards and the sample episode plan, parsed by the real schemas.
- `packages/remotion-runtime`: deterministic compositions and frame-derived animation shared by Player and render worker.

The validated boundaries are React renderer ↔ preload/Electron main and Electron main ↔ render worker. The normal render state machine is `idle → queued → bundling → rendering → encoding → completed`; every active phase may fail, and both `completed` and `failed` are terminal. Retry requests a new main-owned UUID and starts at `queued`.

## Pro audit corrections incorporated

- Moved all job authority to an Electron-main registry keyed by main-generated UUIDs.
- Rejects unknown-job, mismatched-job, stale, terminal, regressive-progress, and illegal-transition worker events.
- Uses `null` progress for queued, encoding, completed, and failed; only bundling/rendering carry a bounded numeric fraction.
- Kills timed-out workers and maps crash, exit, invalid-message, job-ID mismatch, invalid-transition, unsafe-path, and timeout cases to typed failure codes.
- Resolves completed outputs through `realpath` and accepts them only inside the canonical SS-001 artifact root.
- Makes React subscriptions StrictMode-safe and proves cleanup with an active-listener test.
- Disables local rendering visibly in browser mode and proves that no fake browser job is created.
- Added a restrictive CSP, denied new windows, and blocks navigation outside the exact packaged file or fixed development origin.
- Replaced timestamp-based proof extraction with exact frame-index selection using FFmpeg `select=eq(n\,FRAME_INDEX)`.
- Added an environment manifest, complete FFmpeg/FFprobe command evidence, audio-stream proof, and `volumedetect` output.
- Refocused the proposed follow-up on the animation kernel and EpisodePlan contract rather than persistence/queue work.

## Meaningful deviations from the brief

- Electron supervises the separately built worker with `utilityProcess.fork()` rather than generic `child_process.fork()`. This gives a dedicated Node-capable process with Electron lifecycle integration; the same render service remains independently invokable from the CLI.
- The optional music/ambience bed is omitted to avoid scope expansion; the local paper-flip cue proves audio rendering.
- Project-owned `ffmpeg-static` and `ffprobe-static` avoid machine-level media-tool prerequisites on Windows.
- The explicit worker-failure control remains visible but intentionally tiny for SS-001 acceptance. It must move behind a developer flag before release.

## Files created or changed

- Workspace: root package/scripts, pnpm workspace and lockfile, shared TypeScript config, ESLint config, and gitignore.
- Product guidance: `README.md`, `AGENTS.md`, all six required files under `docs/`, the SS-001 ticket, and this permanent report.
- Contracts and fixtures: `packages/contracts/src/*` and `packages/fixtures/src/*`.
- Animation runtime: `packages/remotion-runtime/src/*` and the local placeholder WAV.
- Render worker: `apps/render-worker/src/*`, package/build configuration, render CLI, exact-frame/audio/environment evidence tooling.
- Desktop: `apps/desktop/src/main.ts`, `preload.ts`, and package/build configuration.
- Studio: `apps/studio/src/*`, host adapters, UI tests, CSS, Vite config, and entry files.
- Evidence: gitignored `artifacts/SS-001/*`, including the final artifact manifest.

## Commands executed and recorded

```text
npx create-video@latest --yes --blank --no-tailwind StoryStage
pnpm install
pnpm install --force
node scripts/generate-placeholder-sfx.mjs
pnpm dev:web
pnpm dev
pnpm lint
pnpm typecheck
pnpm test
pnpm verify
pnpm build
pnpm render:sample
pnpm render:determinism
pnpm render:audio
```

The final root-command logs are under `artifacts/SS-001/logs/`, including separate lint, typecheck, test, verify, build, browser-dev, desktop-dev, sample-render, determinism, and audio logs. The forced install was used once after workspace directories moved so Windows pnpm junctions were rebuilt cleanly.

## Verification results

- `pnpm lint`: exit 0, no findings.
- `pnpm typecheck`: exit 0 across all six code workspaces.
- `pnpm test`: exit 0; 18 tests passed, 0 failed.
  - Contracts: 6.
  - Fixtures: 2.
  - Render worker: 3.
  - Studio and host adapters: 7.
- `pnpm verify`: exit 0 after all source corrections.
- `pnpm build`: exit 0 for the worker, Electron main/preload, strict studio typecheck, and Vite production build.
- Boundary grep: no Electron/Node/renderer/bundler imports in the studio and no studio/renderer/bundler imports in Electron main/preload.
- Schema grep: no `z.any()` or `.passthrough()` usage.
- Non-blocking warning: the studio bundle is about 1,009 kB before gzip (about 288 kB gzip), above Vite's 500 kB chunk-warning threshold.

## Real-render result and media metadata

`artifacts/SS-001/sample.mp4` is a genuine local render created through both the CLI and the desktop worker.

```json
{
  "codec": "h264",
  "audioCodec": "aac",
  "durationInSeconds": 12,
  "fps": 30,
  "frameCount": 360,
  "height": 720,
  "width": 1280
}
```

FFprobe independently reports H.264 video at 1280×720/30 FPS/360 frames and AAC-LC stereo audio at 48 kHz. FFmpeg `volumedetect` reports mean volume `-41.4 dB` and max volume `-13.1 dB`, proving the local cue is present rather than a silent placeholder stream.

## Determinism check

`pnpm render:determinism` rendered `sample-pass-a.mp4` and `sample-pass-b.mp4`, verified identical expected metadata, extracted frames 0, 180, and 330 from each MP4 by exact decoded frame index, and compared SHA-256 hashes. All pairs matched:

```text
frame 000  056f3b9dcf80edc9123b75218865444e0697295094ee1bc4871bca2aa746dce1
frame 180  9d03e0a2ae699fe2679606beb37082c1ac75f70418e2dad0fa157aab7d7922eb
frame 330  3cd5ae37c7fe0b22e5d235cc6bf0fa9c5d5dc55eb845a7fcab9a941527298426
```

Each pass records commands of this exact shape:

```text
ffmpeg -y -i PASS.mp4 -vf "select=eq(n\,FRAME_INDEX)" -frames:v 1 frame-FRAME_INDEX.png
```

MP4 byte identity is deliberately not asserted because container and encoder metadata can differ without changing decoded frames. Machine-readable metadata, all six exact extraction commands, hashes, and the success boolean are in `artifacts/SS-001/determinism.json`. Toolchain versions and OS details are in `artifacts/SS-001/env.json`.

## Desktop security and job integrity

- `contextIsolation: true`
- `nodeIntegration: false`
- `sandbox: true`
- `webSecurity: true`
- restrictive document CSP
- fixed localhost development origin or exact packaged file only
- new windows denied and external navigation blocked
- four specific preload methods; no generic invoke API
- listener cleanup returned by `subscribeToRenderJobs`
- Zod validation at renderer/preload/main/worker boundaries
- main-owned job IDs, composition, executable, workspace, and artifact paths
- canonical output rejected unless it resolves inside `artifacts/SS-001/`
- one authoritative registry prevents late events from mutating a different or terminal job
- monotonic numeric progress inside bundling/rendering phases
- real two-minute kill timeout

## UI and failure/retry acceptance

- Browser-only mode displays a disabled Render button and “Desktop app required for local rendering”; the browser test confirms no fake completion state appears.
- Desktop mode exposed queued/bundling progress and reached `Preview render complete` with Show file.
- The injected worker failure produced `Simulated render-worker failure` and Retry while the studio and Electron main process stayed responsive.
- Retry created a fresh main-owned job and returned to completion without restarting the app.
- Manual scene, shot, camera-event, and character-event selections updated the stage and inspector; the accessibility trace is in `artifacts/SS-001/inspector-reactivity.txt` and automated coverage exercises the same four paths.
- StrictMode subscription coverage proves exactly one active listener after development double-mount and zero after unmount.

## Evidence paths

- `artifacts/SS-001/sample.mp4`
- `artifacts/SS-001/sample-pass-a.mp4`
- `artifacts/SS-001/sample-pass-b.mp4`
- `artifacts/SS-001/determinism.json`
- `artifacts/SS-001/env.json`
- `artifacts/SS-001/audio-streams.json`
- `artifacts/SS-001/audio-verification.txt`
- `artifacts/SS-001/inspector-reactivity.txt`
- `artifacts/SS-001/artifact-manifest.json`
- `artifacts/SS-001/frame-checks/pass-a/frame-{000,180,330}.png`
- matching exact-index frames under `frame-checks/pass-b/`
- `artifacts/SS-001/screenshots/productions-screen.png`
- `artifacts/SS-001/screenshots/episode-idle.png`
- `artifacts/SS-001/screenshots/rendering-progress.png`
- `artifacts/SS-001/screenshots/render-failed.png`
- `artifacts/SS-001/screenshots/render-completed.png`
- `artifacts/SS-001/screenshots/browser-mode.png`
- all root-command logs under `artifacts/SS-001/logs/`

Visual inspection confirmed the neutral studio shell, 16:9 Player fit, visible scene/shot selection, depth layers, palette-changing hard cut, camera push, Otto gesture, caption timing, and evidence-card reveal.

## Known limitations and risks

- One render may be active; there is no cancel, persisted queue, or restart recovery.
- Production and episode data are fixtures; edits are not persisted.
- Every job rebundles the Remotion entry.
- The two-minute worker timeout fits this proof but not a 5–20 minute production episode.
- The studio bundle needs code splitting as additional surfaces become real.
- UI fonts fall back to system fonts; a packaged release should vendor approved fonts.
- Artwork, dialogue, and SFX are deliberate placeholders.
- Release packaging, signing, auto-update, and production resource layout are not implemented.
- Commercial use must review the applicable Remotion license before release.

## Proposed SS-002

**SS-002 — Animation kernel + EpisodePlan v1**

Define a versioned vocabulary of semantic character, camera, prop, and timing actions; define a rig manifest that maps those actions to supported deterministic behaviors; build an EpisodePlan compiler that validates and resolves semantic actions into frame-addressable instructions; and render those instructions through the existing shot/runtime boundary. Keep persistence, queue orchestration, and asset generation behind this contract so the product first proves that directorial intent can compile into inspectable animation.

## Pro approval

ChatGPT Pro returned `Status: ACCEPTED` and stated that no corrective work remained. It explicitly accepted `utilityProcess.fork()` as preserving out-of-main rendering and accepted the Vite chunk-size warning as a non-blocking optimization note. The approval was based on the completion evidence reported in the review conversation; Pro did not independently open the local repository.
