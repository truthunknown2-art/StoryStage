# StoryStage

StoryStage is a directable local animation-production studio. It turns a pasted script into an inspectable profile-driven plan, manages a human-approved manual ChatGPT Images exchange, prepares and versions local assets, and compiles approved production meaning into deterministic Remotion frames.

SS-001 is the workstation regression skeleton. SS-002 is the active real asset-to-frame production path. The project is not yet a finished automatic episode factory; see [Project state](docs/PROJECT_STATE.md) for the blunt status and [Product roadmap](docs/PRODUCT_ROADMAP.md) for the binding completion order.

## Requirements

- Node.js 20.19 or newer
- pnpm 11
- Windows for the current Electron operator path

## Run

```powershell
pnpm install
pnpm dev
```

`pnpm dev` builds the isolated workers, starts Vite at <http://127.0.0.1:5173>, and opens the Electron studio.

Useful commands:

```powershell
pnpm dev:web
pnpm build
pnpm lint
pnpm typecheck
pnpm test
pnpm verify
pnpm render:sample
pnpm render:determinism
pnpm render:audio
pnpm render:production-proof
pnpm prepare:rook
```

`pnpm render:production-proof` creates an ignored private engineering fixture under `artifacts/SS-002/`, renders its four-second selected-rig diagnostic, finalizes an immutable approved asset and new production bundle, renders a real 24-second 1080p H.264 MP4, extracts exact frame indices, probes video/audio streams, and writes `proof-report.json`.

The generated proof art is deliberately primitive. It proves that approved pixels traverse the real path; it is not a visual target.

`pnpm prepare:rook` stages the public original Rook history-presenter sources, reproducibly normalizes them onto the canonical character canvas, validates their shared ground registration, and creates the four-second review diagnostic. Later runs hash-verify and reuse that bound diagnostic instead of replacing reviewed evidence with a newly encoded container. The command does not approve the character or bind it to a production.

## Workspace

- `apps/studio` - unprivileged React/Vite production UI
- `apps/desktop` - sandboxed Electron main/preload, persistence, promotion, and worker supervision
- `apps/render-worker` - evidence-verifying Remotion renderer and proof tooling
- `apps/asset-worker` - isolated staging, reverification, and preparation worker
- `packages/story-engine` - production domain, directing, evidence, manifests, approval, and exact plans
- `packages/asset-pipeline` - byte staging and Sharp image preparation
- `packages/contracts` - strict IPC and worker envelopes
- `packages/fixtures` - isolated SS-001 regression data
- `packages/remotion-runtime` - SS-001 regression plus SS-002 production compositions
- `docs` - product truth, architecture, image bridge, quality, and decisions
- `tickets` / `reports` - implementation scope and permanent evidence

Read `docs/ARCHITECTURE.md` before changing a package or process boundary.
