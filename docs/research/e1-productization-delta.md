# E1 to productization delta

**Status:** retained work after the E1 feasibility milestone

**Scope:** exact boundary between E1-WP4 evidence and later roadmap packages

## F3 - creator-facing AI Director UX

- Translate the proven success and failure event vocabulary into the real
  StoryStage connection, conversation, proposal, preview, reject, and recovery
  surfaces.
- Use fixture-backed states first. F3 does not connect the production Studio to
  Codex, add Apply, or create a second visual-shot authority.
- Preserve exact creator language for signed out, offline, usage limited, update
  required, crashed, cancelled, rejected proposal, and disabled Apply.

## B3 - durable AI Director product integration

- Connect real project/scene/beat/shot/range context through the shared validated
  StoryStage command layer.
- Own persistent threads, explicit scope, auth lifecycle, bounded context,
  tool/approval policy, proposal lineage, stale checks, Preview, Apply, Reject,
  Revise, Undo, and no-mutation-before-Apply behavior.
- Add a documented explicit retry policy; E1 intentionally treats every App
  Server retry request as visible failure and never retries automatically.
- Keep deterministic StoryStage code authoritative for IDs, timing, continuity,
  assets, capabilities, render jobs, and saved state.

## R1 - Windows distribution decision

- Resolve every question in
  `docs/research/e1-codex-distribution-license-questions.md`.
- Choose and verify either an allowed pinned bundle or an official installed-
  client discovery path.
- Remove development-checkout, pnpm, and Node.js assumptions from the installed
  application; add signing, notices, update, rollback, uninstall, and clean-
  machine evidence.

## R2 - installed-build security and release gate

- Add Windows job/process containment for App Server and owned MCP descendants,
  malicious project/media and prompt-injection testing, navigation/IPC/CSP
  review, support-bundle redaction, and crash/orphan recovery.
- Verify credential opacity, diagnostics, backups, updates, uninstall, and data
  retention in the packaged build.
- Freeze release hashes, licenses, rollback behavior, and private-launch support
  procedures.

E1-WP4 closes none of these later packages. Its fixture UI, tests, and receipts
exist only to make their starting contract precise and fail-closed.
