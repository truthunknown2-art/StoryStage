# Milestone 2 — Long-form Studio shell

## Authority and accepted base

- Product plan: `docs/PRODUCT_PLAN.md`
- Accepted F1 merge: `7a468673c0a33a37b96b94d965b5d2a857150fac`
- Phase owner: Kimi CLI (frontend/UI/UX)
- Reviewer and integrator: Codex
- Product acceptance authority: Preston
- Allowed product area: `apps/studio/src/product-v1/**`, the Product v1 section
  of `apps/studio/src/styles.css`, focused Studio tests, and phase evidence
- Backend B1/B2, Godot production integration, Remotion media playback,
  persistence, generation, recording, rendering, and export remain unauthorized

## Outcome

Replace the F1 metadata handoff with the first coherent Studio workspace for a
bounded 20-minute Ollo episode. The creator can navigate acts, sequences,
scenes, and the selected scene's beats from a calm scene rail and a compact
episode overview. The center shows an honest local scene-board preview and real
selection/playhead transport. The shell must resemble the approved Studio
direction without pretending that media or backend services exist.

## Phase acceptance gate

At the end of F2, the complete local demo episode is navigable at 1440×900 and
1920×1080 without losing selection, flooding the screen with expanded beat
cards, overflowing the viewport, or freezing. Every visible action either
changes local UI state or is disabled with a plain reason. The permanent banner
must continue to say:

> Local UI demo — production services are not connected.

## Work packages

### F2-WP1 — Studio shell foundation

**Primary invariant:** one selected scene identity drives the rail, center
scene-board, transport readout, and episode overview.

**Deliverable:** add a bounded local hierarchy (two acts, four sequences, eight
scenes, and concise beat metadata) and replace both the created-project handoff
and seeded-demo detail with one visible Studio shell. Include the top bar,
grouped hierarchy rail, center scene-board preview, scene-level previous /
next transport, a right-side "Director arrives in F3" explanation, and a
scene-level episode overview. Use only existing approved local reference art
and label it as reference art—not animation or a rendered frame.

**Non-goals:** playback, scrubbing, drag editing, persistence, Director controls,
asset readiness, audio, waveform display, export, backend contracts, new shared
schemas, or changes to legacy surfaces.

**Targeted verification:** focused Product v1 tests prove Projects → demo →
Studio, Create → Studio, synchronized scene selection across all four surfaces,
previous/next boundary behavior, and the permanent local-demo disclosure.

**Complete when:** the exact branch is pushed with focused tests green and
actual 1440×900 screenshots of the initial and a noninitial selected scene.

### F2-WP2 — Long-form navigation and bounded rendering

**Primary invariant:** navigating the full 20-minute hierarchy never discards
the selected scene and never renders beat rows for every scene at once.

**Deliverable:** make act and sequence expansion real; expose beats only for the
selected scene; add real scene-relative playhead scrubbing plus previous/next
scene and overview selection; keep selection visible when its ancestors are
collapsed by showing an explicit selected-scene summary.

**Non-goals:** real-time media playback, frame-accurate editing, global timeline
tracks, drag/trim, persistence, or Director editing.

**Targeted verification:** tests traverse all acts, sequences, and scenes;
collapse selected ancestors; select from rail and overview; move the playhead;
and assert that rendered beat rows never exceed the selected scene's beat count.

**Complete when:** all navigation paths remain synchronized and the bounded DOM
rule is encoded in a regression test.

### F2-WP3 — Responsive, keyboard, and visual-quality pass

**Primary invariant:** the same Studio workflow remains understandable and
operable without horizontal page overflow at desktop and compact widths.

**Deliverable:** tune the shell to the approved mockup's hierarchy and visual
weight; add visible focus, semantic labels, keyboard scene navigation, compact
rail/inspector behavior, and reduced-motion support. At compact width the scene
rail and inspector become deliberate drawers or stacked regions rather than
crushed columns.

**Non-goals:** new features, animation polish, media generation, inspector
authoring, or final F6 accessibility/export work.

**Targeted verification:** focused keyboard tests plus browser checks at
1920×1080, 1440×900, and 1024×800 for selection visibility, control reachability,
no overlap, no horizontal page overflow, and no console/page errors.

**Complete when:** actual screenshots at all required sizes pass visual review
and the compact layout retains the entire navigation workflow.

### F2-WP4 — Phase evidence and integration gate

**Primary invariant:** the evidence describes only capabilities present in the
exact pushed candidate.

**Deliverable:** recapture final desktop and compact states, record exact hashes,
complete the F2 click-through checklist, run the full Studio and repository
verification, and leave one immutable handback for Codex and Pro.

**Non-goals:** opportunistic polish, F3 controls, backend work, or rolling into
the next phase.

**Targeted verification:** Studio tests, typecheck, build, repository-root
`pnpm verify`, screenshot hash verification, browser console/page-error audit,
and Pro review tied to the exact remote SHA.

**Complete when:** Codex and Pro find no blocking F2 defect and Preston accepts
the visible long-form Studio shell. F3 still requires a separate ticket.

## Stop rules

- Execute only one work package at a time.
- Each package ends in one pushed commit or PR reviewable on its own.
- A completed package does not authorize the next package until Codex records
  its verdict and advances the persisted plan.
- F2 completion does not authorize F3 or backend work without the next explicit
  assignment.
