# F3-WP5 immutable handback

Task: `F3-WP5-RESPONSIVE-ACCESSIBILITY-EVIDENCE`  
Issue: [#95](https://github.com/truthunknown2-art/StoryStage/issues/95)  
Draft PR: [#97](https://github.com/truthunknown2-art/StoryStage/pull/97)  
Required branch: `agent/kimi-f3-wp5-responsive-accessibility-evidence`

## Exact identity

- Accepted implementation base: `272812f25fa0f4f794edfb69426028349900382e`
- Initial recovered Kimi implementation: `581b122d74e30f14d8cfd3070f14f06b3d866904`
- Codex review-correction implementation: `180fa59b6e60115ca0120a6db92615dc8c658f5f`
- Final implementation and evidence head: `e3d63f64b1fa4822eb6cbf70cdd7800313e74d1e`
- Live integration state used for the synthetic merge: `product/v1@b03622cb9a99ce0fa5048b799468c50835d2703f`
- Handback tip: the commit containing this file, reported as an exact remote SHA in PR #97 and issue #95 because a Git commit cannot embed its own SHA.

Kimi's process was interrupted by the host restart after it committed the first
candidate but before it could push or publish a handback. Codex recovered that
clean exact commit, pushed it without rewriting history, reviewed it, and made
only the bounded F3-WP5 corrections described below on the same required
branch.

## Delivered result

The accepted F3 Projects → Create → Studio journey is keyboard-usable and
focus-safe at 1920×1080, 1440×900, and 1024×800. The compact hierarchy rail is
an internally scrollable 300 px region, leaving the board visible in the first
1024×800 viewport while preserving rail → board → inspector → AI Director DOM
and visual order.

The final correction also:

- moves focus to the Studio AI composer before the signed-out Connect surface
  is removed;
- gives every settled AI fixture turn a unique live-region identity, including
  repeated identical outcomes at the same scope;
- settles reduced-motion fixture requests immediately without decorative
  staged progress;
- captures clean top-of-page wide Studio evidence, independent Direct, Visual,
  Motion, signed-out, proposal, reduced-motion, and error states;
- captures compact Create, shared review, final review actions, settings,
  keyboard focus, proposal, reduced-motion, and error states; and
- commits the portable, lint-clean reproduction script at
  `apps/studio/scripts/f3-wp5-evidence.mjs`.

The complete base-to-head delta contains 34 allowed files: nine existing
Product v1 modules/tests/styles, the one audit script, the comparison matrix,
the machine-readable report, and 22 screenshots. No manifest, lockfile,
roadmap/status, coordination inbox, contract, engine, desktop, worker, Godot,
Remotion, asset, audio, persistence, renderer, export, or packaging file was
changed.

## Verification

- `pnpm --filter @storystage/studio test` — PASS, 135/135 tests.
- `pnpm --filter @storystage/studio typecheck` — PASS.
- `pnpm --filter @storystage/studio build` — PASS; only the existing Vite
  large-chunk warning remains.
- `node apps/studio/scripts/f3-wp5-evidence.mjs` against the local Studio dev
  server — PASS, 40/40 checks, zero console warnings/errors, and zero page
  errors.
- `pnpm verify` in a clean synthetic merge of exact `e3d63f6...` with live
  `product/v1@b03622c...` — PASS in 255.2 seconds. Lint has zero errors and only
  the two pre-existing Remotion purity warnings in
  `apps/render-worker/src/kvp001-proof.ts`; every recursive typecheck and test
  suite passed.
- Branch-only `pnpm verify` retains only the brief-authorized roadmap check
  conflict because the required implementation base predates the live
  `START_NOW` transition. The complete live synthetic merge passes that guard.
- Independent exact-head code/accessibility audit — ACCEPT `e3d63f6...`.
- Independent exact-head visual audit — ACCEPT `e3d63f6...`.
- Independent exact-head mechanical evidence audit — ACCEPT `e3d63f6...`.

## Evidence

- Machine-readable report:
  `screenshots/clickthrough-report.json`
- Report SHA-256:
  `a32203786806be09eab81a0af07fc45dd378154693dd8778125ba09d1a96f837`
- Screenshot set: 22 distinct PNGs; every file is exactly its named viewport
  size and every SHA-256 is unique and matches the report.
- Accepted reference set: all three WebP references plus the reference README;
  every recorded SHA-256 matches the repository file.
- Comparison matrix: `REFERENCE-COMPARISON.md` with `MATCH`,
  `INTENTIONAL ADAPTATION`, and `DEFERRED OUTSIDE F3` decisions.

## Visible-control truth state

- Projects, both Create paths, shared editable review, hierarchy navigation,
  Direct/Visual/Motion drafts, session-local Apply/Undo/Redo, transport timing,
  settings disclosure, AI fixture request/cancel/revise/reject/apply/undo, and
  keyboard models work as labelled local UI behavior.
- Every AI connection, thread, progress, tool, proposal, Preview, Apply, Undo,
  and failure path remains deterministic labelled fixture behavior with
  **Local AI Director fixture — no service connected** visible.
- Preview and Export remain disabled with reasons. No control claims a real
  screenplay generation, account sign-in, project save, asset creation,
  animation, media playback, render, export, or production success.

## Limitations and stop

This is a complete F3 frontend milestone candidate, not a production backend
or finished studio. It does not connect live Codex/App Server/MCP, persist a
project, create assets or rigs, animate in Godot, assemble in Remotion, record
audio, render, export, package Windows, or launch privately.

Merge only after the exact handback tip has a green hosted check and ChatGPT Pro
accepts the complete F3 milestone candidate. Do not treat this package handback
as F3 acceptance by itself.
