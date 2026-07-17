# Architecture decisions

## ADR-001: StoryStage is web-first and desktop-delivered

The studio runs as ordinary React/Vite and gains local capabilities through an adapter.

## ADR-002: Electron is the initial desktop shell

Electron provides a consistent Chromium preview and supervised local processes.

## ADR-003: Remotion is the authoritative video timeline

Frame numbers and validated props determine the rendered output.

## ADR-004: Episode-plan schemas are the renderer contract

Fixtures, Player input, and rendering share the same Zod-validated model.

## ADR-005: Rendering occurs outside the Electron main process

`apps/render-worker` is separately built and runs in an Electron utility process so render failures cannot terminate the UI or main process.

## ADR-006: Browser and desktop capabilities use host adapters

`BrowserHostAdapter` and `DesktopHostAdapter` keep capability checks out of the component tree.
