# Kimi brief — F3-WP4 review corrections (inbox v74)

## Identity

- Package: `F3-WP4-REVIEW-CORRECTIONS`
- Tracking issue: `#89`
- Rejected candidate: PR #91 exact tip
  `536265ebb4f2fd7f9e021de2aaa3aada2dee673e`
- Watcher root base: `0111274544afda55f8481be103bd3c7ad4db661a`
- Required fresh branch: `agent/kimi-f3-wp4-review-corrections-v74`
- Target: `product/v1`

The watcher creates the fresh branch from the exact root base. Incorporate the
rejected candidate tip into that branch with an ordinary non-rewriting merge,
then make only the corrections below. Do not push to or alter
`agent/kimi-f3-wp4-ai-director-proposal-shell` or PR #91.

## Primary invariant

Both New Project paths converge on one genuinely editable, local-only proposal
review; the Studio AI Director permits at most one unsettled/applicable request
and can undo an AI Apply only while the exact history revision created by that
Apply remains current.

## Required corrections

1. Make `ProposalReview` genuinely editable before Studio for both Paste a
   script and What's your idea. Keep one shared review component and one
   unbypassable review gate. Permit bounded local editing of proposed hierarchy
   and direction without implying AI generation, saved production state,
   assets, media, rendering, or export. Revise input remains distinct from
   editing the proposal. Add tests proving edits survive entry into the local
   demo Studio only where the existing draft model supports them; otherwise
   show exactly what the demo consumes and do not claim persistence it lacks.
2. Supersede every earlier unsettled request when a new request is sent,
   including a turn that is still streaming. A superseded streaming turn may
   finish its deterministic timer cleanup but may never become pending,
   applicable, applied, or undoable. Add the overlapping-send regression.
3. Bind panel Undo to immutable history-node or revision identity, not field
   equality. Add the exact regression: AI applies snapshot S; a manual commit
   creates T; a later manual commit recreates S by value. Panel Undo must remain
   disabled and must not restore T. Preserve the accepted per-beat history and
   exact prior-snapshot behavior when no later history change occurred.
4. Remove unrelated formatter churn. Restore the pre-existing formatting of
   `apps/studio/src/styles.css` and all untouched regions of
   `apps/studio/src/App.test.tsx`; retain only intentional F3-WP4 additions and
   necessary changed assertions. Do not run whole-file formatting over legacy
   compact CSS. `git diff --check` must pass and the final diff must be
   reviewable as surgical changes.

## Preserved requirements

- Exactly two New Project paths and only **Ollo & Friends — Kids Story**.
- Every AI surface says `Local AI Director fixture — no service connected`.
- Connection states remain exactly Connected, Signed out, Offline, Usage
  limit, Update required, and Crashed; Cancelled/Error remain turn states.
- Request scope remains immutable. Apply changes only the captured beat's
  `performanceDirection`, fails closed on stale scope or dirty manual draft,
  and uses the accepted session-local direct history.
- No credential, API key, cookie, token, MCP URL/JSON, terminal UI, or
  unredacted diagnostics.

## Non-goals

No F3-WP5, live Codex/App Server/MCP connection, persistence, backend work,
Godot, Remotion, animation, audio, rendering, encoding, export, packaging, or
production-service claim.

## Verification

- Focused pure regressions for streaming supersession and revision-bound Undo.
- UI regressions for editable review on both entry paths and the unchanged
  unbypassable review gate.
- `pnpm --filter @storystage/studio test`
- `pnpm --filter @storystage/studio typecheck`
- `pnpm --filter @storystage/studio build`
- repository-root verification, with any base/inbox roadmap conflict reported
  exactly rather than bypassed.
- `git diff --check` and a before/after diff-stat demonstrating formatter churn
  removal.
- Recapture only screenshots whose visible state changed; provide 1440x900
  actual-app evidence, SHA-256 hashes, and a machine-readable click-through
  report with zero console/page errors.

## Completion

Push the fresh required branch, open a new draft PR to `product/v1`, post one
exact handback on issue #89 with changed files, exact SHAs, checks, evidence,
limitations, and control truth, then exit. Do not advance F3-WP5.
