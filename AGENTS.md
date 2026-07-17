# StoryStage Codex operating rules

## Product contract

StoryStage is a directable studio, not a one-click generative-video slot machine. AI may propose structured production objects; deterministic code renders approved objects. Generated objects must eventually support accept, reject, compare, regenerate, lock, and restore semantics.

## Architecture boundaries

1. `packages/contracts` is the shared vocabulary and contains no fixtures.
2. `packages/fixtures` holds schema-valid sample data; never invent a looser mock type universe.
3. `packages/remotion-runtime` is deterministic and contains no Node, Electron, filesystem, timer, randomness, or network behavior.
4. `apps/render-worker` alone owns Remotion bundling, rendering, progress, and output creation.
5. `apps/desktop` owns privileged orchestration and file opening, but does not render.
6. `apps/studio` is an unprivileged browser app. Capability differences flow through host adapters, not scattered Electron checks.
7. Every IPC and worker message is narrow, typed, and validated at both ends.

## Implementation rules

- Keep TypeScript strict.
- Drive Remotion motion only with frames, sequences, and deterministic props.
- Never accept output paths, entry points, executables, or arbitrary channels from the renderer.
- Report worker progress and failure as job data; failures must remain retryable without freezing the UI.
- Keep edits ticket-scoped and preserve the documented product boundaries.

## Definition of done

Run lint, type-check, tests, builds, real render, two-pass determinism, desktop success/failure acceptance, and representative visual inspection. Record exact evidence, meaningful deviations, limitations, and the next proposed ticket in `reports/`.
