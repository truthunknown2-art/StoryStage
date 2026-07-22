# Kimi full brief — F3-WP4 AI Director conversation and proposal shell

## Assignment identity

- Inbox-Version: `72`
- Issue: `#89`
- Exact accepted base: `0111274544afda55f8481be103bd3c7ad4db661a`
- Required branch: `agent/kimi-f3-wp4-ai-director-proposal-shell`
- Owner: Kimi, frontend/UI only
- Review/integration: Codex
- Milestone audit: ChatGPT Pro at F3-WP5 unless a concrete blocker requires earlier review

Claim issue #89 before writing. Create the required branch only from the exact
accepted base. The branch must be absent locally and remotely before creation.

## Primary invariant

A creator can enter through exactly **Paste a script** or **What's your idea?**,
reach the same editable pre-project proposal review, and understand, revise,
reject, apply, undo, or cancel one clearly scoped fixture proposal without any
claim that live AI, project persistence, media generation, rendering, or
production mutation occurred.

## Required New Project journey

- Replace the old grammar-first hierarchy with the single private-launch
  template **Ollo & Friends — Kids Story** and exactly two initial paths:
  **Paste a script** and **What's your idea?**. Do not show Weird History.
- Paste/import remains bounded local input and produces a deterministic local
  screenplay/hierarchy proposal for review.
- Idea entry opens a normal creator-facing AI Director conversation form for
  story idea, target duration, tone, cast, and constraints. It must not resemble
  a terminal or engineering console.
- Both paths must use the same proposal-review component and state model before
  the local demo can enter Studio. The review visibly identifies the proposed
  episode/scene/beat hierarchy and direction, affected range, and asset impact.
- The final action remains local demo navigation only and says plainly that no
  production project, media, render, or export has been created.

## Connection and failure fixtures

- Provide deterministic labelled local states for **Connected**, **Signed out**,
  **Offline**, **Usage limit**, **Update required**, **Crashed/error**, and
  **Cancelled**. Never imply they came from a live Codex session.
- Signed-out or disconnected idea entry opens compact **Connect AI Director**
  UI with a runtime-check fixture and **Sign in with ChatGPT** fixture action.
  These may transition only local demo state.
- Never expose an API key, cookie, token, password, MCP URL/JSON, terminal
  command, credential file, or unredacted diagnostic.
- Add one truthful AI Director status chip in Create and Studio plus a compact
  **Settings → AI Director** surface with local reconnect, sign-out,
  runtime-check, and redacted-diagnostics fixture actions.

## Studio AI Director shell

- Add a docked right-side **AI Director** conversation/proposal panel while the
  visual board remains primary.
- Reuse the accepted selected scene, beat, and playhead as authoritative scope.
  Show a persistent local fixture thread; selected shot/character labels;
  captured playhead/range chips; scene-duration scrubber/time readout;
  streamed-progress states; and bounded tool-activity labels derived from the
  accepted E1 vocabulary.
- Show one structured, time-anchored screenplay/hierarchy/direction proposal
  with affected range, affected assets, and proposal markers.
- **Preview**, **Apply**, **Revise**, **Reject**, and **Undo** mutate only the
  bounded local fixture proposal state. Apply is explicit and reversible. It
  remains independent from the accepted manual Direct/Visual/Motion per-beat
  history and cannot call a host or production adapter.
- Rejected, cancelled, error, limited, and offline proposals never appear
  applied. Preserve understandable scope and one honest recovery action.
- Preserve accepted F1/F2 navigation and F3-WP1 through F3-WP3 manual
  direction/history behavior.

## Truth boundary

Every AI conversation, connection, progress, tool-activity, proposal, preview,
apply, and undo result is deterministic labelled fixture/demo UI. This package
does not connect to Codex/App Server/MCP, create a saved project or screenplay,
or produce assets, media, animation, audio, renders, or exports.

## Allowed files

- `apps/studio/src/product-v1/ProductV1App.tsx`
- `apps/studio/src/product-v1/CreateProject.tsx`
- `apps/studio/src/product-v1/StudioShell.tsx`
- new narrowly named F3-WP4 fixture/state/components under
  `apps/studio/src/product-v1/**`
- focused tests for those modules under `apps/studio/src/product-v1/**`
- `apps/studio/src/App.test.tsx`
- `apps/studio/src/styles.css`
- package-scoped screenshots/reports under the established evidence location
- one exact handback under `reports/agent-handoffs/**`

Do not change package manifests/lockfiles, production fixtures, roadmap/status,
this inbox, contracts, story engine, desktop host, Codex lab/runtime, workers,
Godot, Remotion, assets, audio, persistence, or backend code.

## Non-goals

No live AI connection; API-key or credential UI; terminal-first UI; generic
agent framework; real screenplay generation; saved-project mutation; production
command application; image generation; assets/rigs/audio; Godot; Remotion;
render/export; background autonomy; F3-WP5; or backend product work.

## Required verification

- both entry paths converge on the same proposal-review model and cannot bypass
  review;
- Connected, Signed out, Offline, Usage limit, Update required, Crashed/error,
  and Cancelled states remain explicit local fixtures with no credentials or
  live-service claims;
- scope/time anchors/affected range/assets remain stable through
  Preview/Revise/Reject/Apply/Undo; Apply is explicit and reversible; and
  rejected/cancelled/error proposals cannot appear applied;
- existing F1/F2 navigation and F3-WP1 through F3-WP3 manual direction/history
  tests remain passing;
- `pnpm --filter @storystage/studio test`;
- `pnpm --filter @storystage/studio typecheck`;
- `pnpm --filter @storystage/studio build`;
- repository-root `pnpm verify`;
- actual 1440x900 screenshots for the two-path New Project choice, connected
  idea proposal review, Paste-a-script proposal review, Studio AI Director
  proposal, and one signed-out/offline connection state;
- browser click-through proves both paths converge, one proposal can be applied
  and undone, manual direction state remains independent, status/settings
  actions are truthful local fixtures, and there are zero console warnings or
  errors and zero page errors.

## Handback and stop

Commit and push the exact required branch, open a draft PR to `product/v1`, and
publish one immutable handback containing the exact SHA, changed files,
commands/results, evidence paths and SHA-256 hashes, fixture truth table,
limitations, and integration instructions. Then exit. Do not begin F3-WP5,
live AI integration, persistence, backend work, Godot, Remotion, rendering, or
export.
