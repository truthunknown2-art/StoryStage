# F4-WP3 immutable handback

Task: `F4-WP3-IMAGE-REQUEST-IMPORT-UX`

Issue: [#109](https://github.com/truthunknown2-art/StoryStage/issues/109)

Required branch: `agent/kimi-f4-wp3-image-request-import-ux`

Inbox: version `84` on `origin/agent/kimi-frontend`

## Exact identity

- Exact authorized implementation base:
  `5eb0037fb6e702696d008b913de53721c12a47b7`.
- Accepted F4-WP3 start transition incorporated before final verification:
  `f5885d8d9a1c8444e14c0f1f2ead011035e9150d`.
- Exact implementation and evidence SHA:
  `10586e0836f641408d67808e3fa04af893a62446`.
- Handback tip: the commit containing this file; GitHub issue #109 and the
  pull request record its exact pushed SHA because a commit cannot embed its
  own identity.

Kimi implemented the bounded package and generated its browser evidence in
the watcher-provided v84 workspace. After completing verification, the Kimi
CLI stopped making progress before commit, push, PR, or handback. Codex
stopped only the stalled Kimi process, preserved the complete workspace,
reproduced the verification, audited scope and truth boundaries, and
published this immutable handback. No duplicate Kimi launch occurred.

## Delivered result

The accepted Product v1 **Assets & Rigs** workspace now provides a bounded,
scene-scoped request and candidate-review flow for non-ready requirements:

- A deterministic request-pack preview carries the planned prompt, named
  descriptive references, expected views/layers, intended use, and current
  blocker from the accepted F4-WP2 requirement model.
- Every request pack states that it is planning text only. It does not copy,
  open, generate, download, upload, attach, or import anything.
- Choose and drop controls express local demo intent only. The package has no
  file input, picker API, byte read, MIME sniffing, provider, credential,
  clipboard, network, storage, or worker integration.
- Candidate metadata review requires creator-entered source and rights text,
  validates a deterministic declared-format fixture, and provides an explicit
  confirmation step before adding a session-local descriptive record.
- Missing source, missing rights, wrong declared format, duplicate identity,
  stale identity, invalid transition, cancel, and unavailable paths all fail
  closed without creating a record.
- Confirmed records do not change requirement readiness, counts, approval,
  preparation, rigging, or production state. The adjacent UI states that no
  file or production-usable artifact exists.
- Opening, closing, cancelling, Escape, invalid submission, and terminal
  transitions preserve a deterministic keyboard-focus path. Scene, episode,
  category, and requirement scope changes close transient candidate state.

The implementation/evidence commit adds 21 files or file changes with 3,030
insertions and 10 deletions. `App.test.tsx` changes only by importing the new
focused regression suite.

## Verification

- Focused F4-WP3 suite: PASS, 17/17 tests.
- `pnpm --filter @storystage/studio test`: PASS, 193/193 tests.
- `pnpm --filter @storystage/studio typecheck`: PASS.
- `pnpm --filter @storystage/studio build`: PASS; only the existing Vite
  large-chunk warning remains.
- Touched-file ESLint: PASS with zero errors; `styles.css` is ignored because
  ESLint has no matching configuration.
- `git diff --check`: PASS.
- Serialized repository-root `pnpm --workspace-concurrency=1 verify`: PASS in
  256.9 seconds. Roadmap consistency, generated artifacts, E1 security
  evidence, privacy (1,073 files), repository lint, all-package typecheck,
  and all tests passed. Notable suites include Story Engine 353/353,
  asset-pipeline 126/126, and Studio 193/193. Repository lint retains only the
  two pre-existing Remotion purity warnings in
  `apps/render-worker/src/kvp001-proof.ts`.
- `node apps/studio/scripts/f4-wp3-evidence.mjs` against the local Studio dev
  server: PASS, 16/16 browser checks, zero console issues, zero page errors,
  no horizontal document overflow, and 11 captured 1440x900 states.

## Evidence

Machine-readable report:
`screenshots/clickthrough-report.json`

Report SHA-256:
`ed49c40a5b8aac004a50ba195fccf6dca8853c492b6131b61d60e5d83fdcb0bd`

The report records every screenshot SHA-256 and verifies request focus,
request-pack truth, drop intent, metadata review, missing source, missing
rights, confirmation review, confirmed local record, duplicate, wrong-format,
and cancel behavior. Codex independently matched the screenshot hashes and
visually inspected the request-pack, confirmation, and confirmed-record states
at original resolution.

## Limitations and stop

This is F4-WP3 only. It does not accept F4, start F4-WP4, read or write image
files, connect an image provider, create or inspect artwork, persist projects,
prepare layers, rig characters, approve assets, animate in Godot, assemble in
Remotion, render, export, package Windows, or launch privately. Merge only
after the exact pushed handback tip passes hosted checks and independent
exact-head review.
