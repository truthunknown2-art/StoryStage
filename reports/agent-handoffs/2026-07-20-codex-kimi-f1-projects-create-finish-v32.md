# Kimi F1 — Projects + Create finish (inbox v32)

## Authority

- Product plan: `product/v1@9f3d6fac522f99b693c163c822334076ee9584bd`
- Required work branch: `agent/kimi-ui-v2`
- PR target: `product/v1`
- Phase: **F1 — Projects + Create**
- Owner: **Kimi**
- Status: `START-NOW`
- Superseded brief retained as binding except where narrowed here:
  `reports/agent-handoffs/2026-07-19-codex-kimi-f1-projects-create-v31.md`

Continue the existing uncommitted F1 implementation. Do not discard it, rebase,
reset, switch branches, or begin F2. As of this instruction, the work branch is
still at base `9f3d6fa` with no remote branch or immutable handback, so Codex
cannot perform the source-of-truth gate review yet.

## Required corrections

### 1. Default viewport must not hide a required control

In the current actual-app `create-1440x900.png`, the sticky footer overlaps the
Language label/select and the `English` value is visible through the footer.
Correct the layout so every required Voice & format control is fully visible and
usable at 1440×900. Scrolling is acceptable; occlusion is not. Preserve the
single clear Create first cut action and useful layout at 1920×1080 and 1024 px.

### 2. Required small text must be readable

The current `--faint: #58635f` against `--panel: #121718` is approximately
2.90:1 and is used for 11–12 px required labels, word count/duration, choice
descriptions, and handoff facts. Raise the normal-text contrast to at least
4.5:1 without flattening the visual hierarchy. Do not solve this by making
required information decorative, hidden, or microscopic.

## Preserve accepted work

- Keep the Projects → Create → honest local handoff flow and local-demo banner.
- Keep the working script editing/import, selections, validation, demo loading,
  Back/Edit navigation, and truthful no-media-generated state.
- Do not add production services, backend changes, new dependencies, F2 Studio,
  or fake success states.
- Stay inside every Version 31 allowed-file boundary.

## Verification and evidence

Run every Version 31 command from the repository root:

```text
pnpm --filter @storystage/studio test
pnpm --filter @storystage/studio typecheck
pnpm --filter @storystage/studio build
pnpm verify
```

Recapture all five required actual-app screenshots after the corrections. The
existing captures predate this correction and are not final evidence. Record
URL, viewport, console/page errors, and exact screenshot hashes.

Then:

1. Commit the implementation and evidence on `agent/kimi-ui-v2`.
2. Push the branch and open one draft PR targeting `product/v1`.
3. Add the Version 31 allowed handback with exact implementation SHA, changed
   files, command results, screenshot paths/hashes, limitations, and PR URL.
4. Stop and return to the 15-minute read-only inbox poll. Do not begin F2.
