# Kimi full brief — F3-WP5 responsive, accessibility, and evidence gate

## Assignment identity

- Inbox-Version: `76`
- Issue: `#95`
- Exact accepted base: `272812f25fa0f4f794edfb69426028349900382e`
- Required branch: `agent/kimi-f3-wp5-responsive-accessibility-evidence`
- Owner: Kimi, frontend/UI only
- Review and integration: Codex
- Milestone audit: ChatGPT Pro after Codex accepts one immutable F3 candidate
- Product acceptance: Preston

Claim issue #95 before writing. The watcher supplies a fresh clean detached
workspace at the exact accepted base. Create only the required work branch and
confirm it was absent locally and remotely. If any identity, scope, base,
branch, status, issue, or evidence instruction conflicts, stop fail closed and
report the conflict instead of guessing.

## Primary invariant

The complete accepted F3 creator journey is keyboard-usable, focus-safe,
understandable to assistive technology, deliberately composed at 1920x1080,
1440x900, and 1024x800, and truthfully evidenced against the accepted Product
v1 Create, Studio, and AI-copilot references without changing or overstating
the current local-fixture capability boundary.

## Required creator journey

Exercise and preserve one continuous Product v1 flow:

1. Projects -> New project.
2. Exactly one of **Paste a script** or **What's your idea?**.
3. The shared editable proposal review, including its blank-title gate.
4. Local-demo Studio with shared scene/beat scope.
5. Direct, Visual, and Motion draft/apply/history behavior.
6. AI Director request, streamed fixture progress, scoped proposal,
   Preview/Revise/Reject, and one bounded Apply/Undo.
7. The alternate creation path through the same review gate.
8. Truthful signed-out/offline/error/cancelled fixture paths.

Preserve every accepted F1/F2 and F3-WP1 through F3-WP4 behavior, especially
the exactly-two-path private-launch template, immutable request scope,
per-beat history isolation, editable no-bypass proposal review, and explicit
**Local AI Director fixture — no service connected** disclosure.

## Keyboard and focus requirements

- Make Projects, Create, proposal review, Studio hierarchy, Director
  tabs/fields/actions, AI settings/connect, thread, proposal, and transport
  usable without a pointer.
- Preserve the accepted rail and Director-tab keyboard models: one tab stop,
  Arrow navigation, Home/End boundaries, synchronized selection, and visible
  focus.
- On route or surface changes, validation failure, proposal completion,
  cancellation/error, Apply/Undo, settings open/close, and stale-scope
  rejection, move or retain focus deliberately. Never strand focus in removed
  content or force the keyboard user to restart at the document top.
- Blank proposal title must expose one accessible error and focus the invalid
  episode-title control. Correcting the title must clear the invalid state
  without leaving a stale announcement.
- AI settings/connect disclosure must have a deterministic keyboard
  close/return-focus path. Keep it inline unless the implementation genuinely
  supplies the complete modal interaction contract.
- Logical DOM/tab order and visible `:focus-visible` treatment must remain
  intact at all three supported viewports.

## Accessible state semantics

- Give changing connection, request, proposal, direction, validation, and
  history outcomes accurate `status`, `alert`, and/or `aria-live` semantics.
- Announce concise state changes once. Do not repeatedly announce the complete
  thread, duplicate a visible error, or turn static explanatory copy into a
  noisy live region.
- Keep labels, descriptions, expanded/selected/current/invalid state,
  landmarks, headings, groups, and button names unambiguous at every fixture
  state.
- A completed, cancelled, errored, superseded, applied, rejected, revised, or
  undone fixture turn must remain distinguishable without color alone.

## Responsive and reduced-motion requirements

- At 1920x1080 and 1440x900, retain the board as the primary Studio surface
  with readable hierarchy, Director controls, and AI proposal context.
- At 1024x800, use an intentional stacked order rather than crushed columns.
  Keep rail, board, inspector, and AI Director reachable and understandable.
- Across Projects, both Create paths, shared review, Direct/Visual/Motion,
  settings/connect, thread, and proposal actions, permit no document-level
  horizontal overflow, clipped controls or text, overlapping sticky regions,
  inaccessible off-screen actions, or hover-only behavior.
- Under `prefers-reduced-motion: reduce`, remove non-essential animation and
  animated scrolling, including AI streaming/progress decoration, while
  preserving immediate comprehensible state changes and visible focus.
- Never hide truth disclosures, scope, errors, or proposal consequences merely
  to fit a smaller viewport.

## Accepted reference comparison

Compare actual Product v1 surfaces, not legacy or mock implementations, with:

- `docs/design/ai-copilot-studio/create-screen-reference.webp`
- `docs/design/ai-copilot-studio/studio-timeline-reference.webp`
- `docs/design/ai-copilot-studio/ai-copilot-concept-board.webp`
- `docs/design/ai-copilot-studio/README.md`

Record `MATCH`, `INTENTIONAL ADAPTATION`, or `DEFERRED OUTSIDE F3` for visual
hierarchy, board primacy, panel density, scope visibility, proposal
comprehension, typography, and compact ordering. Do not copy non-authoritative
controls or imply later timeline, media, rendering, or export capability.

## Allowed files

- Existing Product v1 modules under `apps/studio/src/product-v1/**`, only where
  a proven F3-WP5 requirement needs a surgical change.
- Focused Product v1 tests under `apps/studio/src/product-v1/**`.
- `apps/studio/src/App.test.tsx`.
- `apps/studio/src/styles.css`.
- A narrowly named F3-WP5 audit script under `apps/studio/scripts/**` only if
  the established temporary capture approach cannot produce reproducible
  machine-readable evidence.
- Package evidence under
  `reports/agent-handoffs/2026-07-21-kimi-f3-wp5-responsive-accessibility-evidence/**`.
- One exact handback in that package evidence directory.

Do not change package manifests or lockfiles, roadmap/status, the coordination
inbox, production contracts, story engine, desktop host, Codex lab/App Server
or MCP runtime, workers, Godot, Remotion, assets, audio, persistence, or any
backend code. Avoid whole-file formatting and unrelated cleanup.

## Non-goals and truth boundary

No F4 assets or rigs; no live Codex/App Server/MCP connection; no saved-project
persistence; no real screenplay generation; no media, animation, audio,
timeline, rendering, export, packaging, or private-launch claim; no new product
capability disguised as accessibility work; no background autonomy; no F4 or
backend implementation.

Every AI connection, conversation, progress, tool, proposal, Preview, Apply,
Undo, and failure state remains deterministic labelled local fixture behavior.
F3-WP5 closes a frontend milestone candidate only.

## Required tests and checks

- Add focused regressions for route/surface focus, blank-title validation
  focus, settings/connect close-return behavior, concise live-region state,
  rail and Director-tab keyboard contracts, AI completion/cancel/error and
  Apply/Undo focus/state, and reduced-motion behavior.
- Preserve all F1/F2 navigation and F3-WP1 through F3-WP4 tests.
- Run `pnpm --filter @storystage/studio test`.
- Run `pnpm --filter @storystage/studio typecheck`.
- Run `pnpm --filter @storystage/studio build`.
- Run repository-root `pnpm verify`.
- If the package branch cannot pass only the live roadmap-consistency stage
  because it is rooted at the mandated pre-transition base, document that
  exact conflict and additionally prove the complete synthetic merge with the
  live START_NOW product/inbox state. Do not normalize or conceal any other
  failure.

## Required browser evidence

- Attach console-warning/error and `pageerror` listeners before navigation or
  interaction.
- Exercise the real Product v1 journey at 1920x1080, 1440x900, and 1024x800.
- Record zero console warnings, zero console errors, and zero page errors.
- At every viewport record `documentElement.scrollWidth`,
  `documentElement.clientWidth`, and named critical-region bounds proving no
  horizontal overflow, clipping, overlap, or unreachable action.
- Produce screenshots covering Projects/Create, shared review, Studio manual
  direction, Studio AI proposal, a 1024x800 keyboard/focus state, and at least
  one signed-out/offline/error truth state across the required viewport set.
- Emulate `prefers-reduced-motion: reduce`, prove the query matches, and record
  computed motion/scroll behavior for the relevant Product v1 surfaces.
- Hash every screenshot/report and the three accepted reference images with
  SHA-256.
- Publish a machine-readable click-through report with viewport, URL, named
  checks, console issues, page errors, overflow/bounds evidence, reduced-motion
  evidence, and screenshot hashes.
- Publish the exact reference-comparison matrix.

## Handback and stop condition

Commit and push the exact required branch. Open one draft PR to `product/v1`.
Publish one immutable handback containing exact base, implementation SHA,
handback tip SHA, changed files, diff stat, commands/results, evidence paths
and hashes, reference comparison, limitations, and every visible control's
truth state. Post the issue handback, then exit without polling.

Stop before F4, live AI integration, persistence, backend, Godot, Remotion,
rendering, export, packaging, or private launch. Completion of this package
does not accept F3; Codex must review the exact head, ChatGPT Pro must audit the
complete milestone candidate, and Preston retains the milestone decision.
