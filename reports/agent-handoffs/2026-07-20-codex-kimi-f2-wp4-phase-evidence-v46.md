# Kimi F2-WP4 — phase evidence and integration gate

## Authority

- Active phase: **F2 — Long-form Studio shell**
- Active package: **F2-WP4 — Phase evidence and integration gate**
- Exact verified product base:
  `0a88945585865ffb9deb957fe145efd3f5b17742`
- Integrated predecessors: F2-WP1, F2-WP2, and F2-WP3
- Required branch: `agent/kimi-f2-phase-evidence-wp4`
- Tracking issue: `https://github.com/truthunknown2-art/StoryStage/issues/45`
- PR target: `product/v1`
- Owner: Kimi CLI
- Reviewer/integrator: Codex
- Milestone auditor: ChatGPT Pro after immutable handback
- Product acceptance: Preston after Codex and Pro verdicts

Create the required branch from the exact product base. Do not merge, rebase,
replace history, or modify another agent's branch.

## One visible deliverable

Publish the final immutable F2 evidence package for the accepted long-form
Studio shell. Recapture the real integrated product at the exact base, prove
the entire bounded 20-minute demo navigation contract at desktop and compact
sizes, and leave one handback that Codex and Pro can audit without inference.

## Primary invariant

Every evidence claim describes only behavior present in the exact pushed
candidate. The package must prove the complete demo episode is navigable
without losing selection, flooding the screen, freezing, overflowing,
obscuring required controls, or pretending production services exist.

## Allowed files

- `reports/agent-handoffs/2026-07-20-kimi-f2-wp4-phase-evidence/**`
- one exact F2-WP4 handback under `reports/agent-handoffs/`

This is evidence-only. Do not modify Product v1 source, tests, CSS,
dependencies, schemas, runtime, engine, legacy surfaces, or planning documents.
If the integrated product has a blocking defect, report it instead of quietly
patching it.

## Required evidence

1. Run the complete F2 click-through against exact integrated code and
   exercise all eight demo scenes across both acts and all sequences.
2. Prove one authoritative selected scene across hierarchy rail, scene board,
   transport, selected-scene identity, scene-relative playhead, and episode
   overview.
3. Prove act/sequence collapse and expansion, a hidden current selection with
   its summary and Reveal action, keyboard crossing of sequence and act
   boundaries, Home/End and first/last clamps, and exactly two beat rows only
   for the selected scene.
4. Prove permanent local-demo, reference-art, local-timing, Preview, and Export
   truth labels.
5. Prove the complete workspace has no horizontal page overflow, overlap,
   clipped required control, or unreachable required region at 1920×1080,
   1440×900, and 1024×800.
6. Prove the 1024×800 layout uses deliberate ordered stacked regions and keeps
   rail, board, inspector, transport, and overview reachable.
7. Prove visible keyboard focus and reduced-motion behavior without
   animation-dependent meaning.
8. Record exact DOM bounds and measurements sufficient to support the claims,
   selected-scene and playhead states, console warnings/errors, page errors,
   and a complete pass/fail checklist.
9. Capture actual final screenshots: desktop expanded navigation, desktop
   collapsed hidden-selection summary, noninitial keyboard-selected scene
   across an act boundary, synchronized overview/playhead state, and compact
   stacked layout. Include exact viewport and SHA-256 for every image.
10. Record scope, exact base/head lineage, commands/results, known limitations,
    and a control truth table.

## Required verification

1. `pnpm --filter @storystage/studio test`
2. `pnpm --filter @storystage/studio typecheck`
3. `pnpm --filter @storystage/studio build`
4. `pnpm verify`
5. Browser click-through at all three required sizes.
6. Screenshot hash recomputation.
7. Zero page errors and zero console errors/warnings during the capture path.

## Explicit non-goals

No opportunistic polish, source correction, new feature, F3 Director control,
persistence, media playback, timeline editing, generation, audio, rendering,
export, backend contract, backend implementation, or phase rollover.

Do not begin F3 or backend work. Do not claim F2 is accepted; Codex, Pro, and
Preston gates follow this handback.

## Completion and handback

Branch from the exact verified product base, claim issue #45, add only the
evidence files, commit and push one immutable successor, open a draft PR to
`product/v1`, and report the exact SHA, changed files, commands/results,
screenshots and SHA-256 hashes, full checklist, errors, measurements,
limitations, and integration instructions. Then stop on `WAIT`.
