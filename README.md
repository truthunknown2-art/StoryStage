# StoryStage

StoryStage is a directable animation production studio. It converts a structured, inspectable episode plan into deterministic Remotion previews and local renders instead of asking a model to improvise an entire video in one opaque pass.

SS-001 is the walking skeleton: a polished studio shell, a 12-second cutout-animation sample, a secure Electron boundary, and a real local MP4 render pipeline.

## Requirements

- Node.js 20.19 or newer
- pnpm 11

## Run it

```powershell
pnpm install
pnpm dev
```

`pnpm dev` starts the Vite interface at <http://127.0.0.1:5173> and opens the same interface in Electron.

```powershell
pnpm dev:web
pnpm render:sample
pnpm render:determinism
pnpm render:audio
pnpm verify
pnpm build
```

The sample is written to `artifacts/SS-001/sample.mp4`. The determinism command renders two passes, extracts exact frame indices 0, 180, and 330 from each, compares SHA-256 hashes, records the extraction commands, captures the toolchain environment, and verifies the sample's audio stream. `pnpm render:audio` can rerun the audio-stream and `volumedetect` proof independently.

## Workspace

- `apps/studio` — pure React/Vite interface and Remotion Player
- `apps/desktop` — sandboxed Electron main/preload boundary and worker supervision
- `apps/render-worker` — independently invokable Remotion renderer and evidence tooling
- `packages/contracts` — Zod schemas, job states, and process protocols
- `packages/fixtures` — schema-valid sample productions and episode plan
- `packages/remotion-runtime` — deterministic composition and frame-driven animation
- `docs` — product, UI, quality, state, architecture, and ADRs
- `tickets` / `reports` — implementation instructions and permanent evidence

Read [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) before changing a package or process boundary.
