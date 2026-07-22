# F4-WP2 immutable handback

Task: `F4-WP2-SCENE-ASSET-REQUIREMENTS-READINESS`  
Issue: [#103](https://github.com/truthunknown2-art/StoryStage/issues/103)  
Required branch: `agent/kimi-f4-wp2-scene-asset-requirements-readiness`  
Inbox: version `81` on `origin/agent/kimi-frontend`

## Exact identity

- Exact authorized implementation base: `f99ff77890355e1e6003d48e683b3153ce59c64b`.
- Accepted F4-WP2 start transition incorporated before final verification:
  `a535cefb66c82aff664157143bdac2948f020da8`.
- Exact implementation and evidence SHA:
  `109de772db688b6dfdc4b5e6dd86c2227fe92962`.
- Handback tip: the commit containing this file; GitHub issue #103 and the
  pull request record its exact pushed SHA because a commit cannot embed its
  own identity.

Kimi implemented the initial bounded package in the watcher-provided v81
workspace, then exited before evidence publication, commit, push, or handback.
Codex recovered that same workspace rather than launching duplicate work,
closed the independent preflight findings, generated the evidence, and
published this immutable handback. No Kimi implementation branch existed on
the remote before this recovery.

## Delivered result

The accepted Product v1 **Assets & Rigs** workspace now provides deterministic
scene-scoped planning requirements over the bounded Ollo demo fixture:

- Required and Optional are mutually exclusive necessity classifications;
  Reusable is an independent mechanically derived property when the same
  local record appears in more than one scene.
- The bounded readiness vocabulary is Missing, Candidate, Needs preparation,
  Needs review, and Ready. Every Ready result is adjacent to a visible
  local-record-only disclaimer and never claims an artifact, approval, rig,
  capability, or production readiness.
- One selected scene is the scope authority. All-scenes mode is explicitly an
  episode summary, never a selected-scene result. Counts derive from the same
  resolved rows the UI renders.
- Invalid or stale fixture references fail closed as Unavailable, remain in
  the displayed total, and are excluded from necessity, reuse, and readiness
  counts.
- Every blocked row shows a readable reason and one disabled next-preparation
  action with an unavailable explanation. Missing records cannot be opened.
- Open-record controls synchronize the accepted asset selection/detail and
  have unique accessible names. Selected-asset detail uses the same resolved,
  fail-closed requirement model as the list and counts.

The package remains deterministic, session-local fixture UI. It performs no
script analysis, AI inference, MCP call, file creation, import, generation,
review, approval, slicing, or rigging.

## Review corrections

The independent preflight found and Codex corrected five truth/accessibility
defects before freezing the implementation:

1. Reusable no longer competes with Required/Optional.
2. Detail no longer bypasses the fail-closed resolved model.
3. Selected-scene Ready aggregates now carry the same adjacent disclaimer.
4. Unavailable rendered rows remain included in the displayed total.
5. Open-record buttons have unique asset-and-scene accessible names.

The evidence script's unused `window` lint declaration was also removed. A
user-space `pnpm`/`pnpm.cmd` shim wrapping `corepack pnpm` was created under
`C:\Users\pbirc\bin` only to recover the hidden watcher shell environment; it
is not part of the repository, product, or package result.

## Verification

- `pnpm --filter @storystage/studio exec vitest run src/product-v1/asset-requirements.test.tsx`
  — PASS, 19/19 focused tests.
- `pnpm --filter @storystage/studio test` — PASS, 172/172 tests. The focused
  suite is imported by the standard Studio entrypoint.
- `pnpm --filter @storystage/studio typecheck` — PASS.
- `pnpm --filter @storystage/studio build` — PASS; only the existing Vite
  large-chunk warning remains.
- `pnpm lint` — PASS with zero errors; only the two pre-existing Remotion
  purity warnings in `apps/render-worker/src/kvp001-proof.ts` remain.
- `git diff --check` — PASS.
- Repository-root `pnpm verify` — PASS after incorporating the accepted
  F4-WP2 start transition: roadmap consistency, generated artifacts, E1
  failure/security evidence, privacy (1055 files), lint, all-package
  typecheck, and all tests. Notable suites: Story Engine 353/353,
  asset-pipeline 126/126, Studio 172/172.
- `node apps/studio/scripts/f4-wp2-evidence.mjs` against the local Studio dev
  server — PASS, 11/11 browser checks, zero console issues, zero page errors,
  and no horizontal document overflow in any captured state.

The first attempted root verification correctly failed before product code ran
because the workspace still carried the prior accepted status while the live
inbox said `START-NOW`. The already-accepted GitHub start transition
`a535cef...` was fast-forwarded into the branch, after which the complete root
verification passed. No status content was invented or edited in this package.

## Evidence

Machine-readable report:
`screenshots/clickthrough-report.json`  
Report SHA-256:
`b2f133a29ad92e60d633c345ab2052790d42cc6f3f4f4d5aa6c069edbca5de83`

The six 1440x900 screenshots and their SHA-256 hashes are:

- `wp2-1440x900-all-scenes-aggregate.png` — `cb9a5dcc03ed6882ac6e9c1d4b008ab8b533b53a8cc8689794321886fe51a1b4`
- `wp2-1440x900-scene3-partial.png` — `e019a04778b8c2bbbb76ce93045cb09e15a9c23a1ff19e25c2b8a3d887ff8e1d`
- `wp2-1440x900-open-record-focus.png` — `e4378da0e0e39ff17a5f5a3af2922353bf01dc0a56d4966a6d63257b350378ff`
- `wp2-1440x900-scene4-blocked.png` — `8440a657c6341f3e6489f9da902d857b47eccd7f4d634e0c258eba1f5eb0fff2`
- `wp2-1440x900-scene1-ready.png` — `88e6ad58683c3f8dce07212b979eaca4a311196aca40a6b784899cd6cf4a8415`
- `wp2-1440x900-empty-props-scene2.png` — `7d13883fb555274be419589754f20d12f524570150cdc98299a63dd0ac81049a`

## Limitations and stop

This is F4-WP2 only. It does not accept F4, start F4-WP3, create or import
images, prepare or approve layers/rigs, persist projects, connect providers or
workers, or authorize backend, Godot, Remotion, rendering, export, packaging,
or private-launch work. Merge only after the exact pushed handback tip passes
hosted checks and independent exact-head review.
