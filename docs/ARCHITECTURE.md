# StoryStage architecture

StoryStage is web-first and desktop-delivered. React/Vite owns the unprivileged studio; Electron provides a sandboxed local host; a separately built utility process owns Remotion bundling and rendering.

```text
Validated episode plan
  ├─> React studio ─> Remotion Player
  │       │
  │       ├─ BrowserHostAdapter
  │       └─ DesktopHostAdapter ─> validated preload API
  │                                      │
  └──────────────────────────────> Electron main
                                         │ validated worker command/event
                                         ▼
                                  render-worker app
                                         │
                                         └─> H.264 MP4 + progress
```

## Boundaries

- `apps/studio`: React/Vite and `@remotion/player`; no Electron, Node, renderer, or bundler imports.
- `apps/desktop`: Electron main/preload only. It owns OS capabilities, output-path policy, and worker supervision, but never renders.
- `apps/render-worker`: independently invokable Node-side render service, bundler, renderer, progress, proof frames, and determinism tooling.
- `packages/contracts`: Zod schemas, inferred types, identifiers, job states, IPC channels, and worker protocols; no fixtures or UI/render behavior.
- `packages/fixtures`: schema-validated sample production and episode data.
- `packages/remotion-runtime`: deterministic compositions and frame-derived animation; no filesystem, Electron, timers, randomness, or network access.

## Security and failure model

Electron uses `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`, `webSecurity: true`, denied new windows, and restricted navigation. The preload exposes four specific methods with listener cleanup. Both IPC boundaries parse Zod schemas. The React renderer cannot supply output paths, entry points, executables, or arbitrary IPC channels.

The render state machine is `idle → queued → bundling → rendering → encoding → completed`, with failure allowed from active states and retry returning to `queued`. One render may be active in SS-001. A worker crash, invalid message, timeout, rejected command, or missing output is converted to a typed visible failure.
