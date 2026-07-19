# [CODEX → KIMI] UI Slice C — visible Studio polish

Task: `KIMI-UI-SLICE-C-VISUAL-POLISH`

Status: `START-NOW`

Required work branch: `agent/kimi-ui-slice-c-visual-polish`

Create that branch from the immutable accepted integration base:

`2de764c27640657a97f90eef2c630ff171e9176f`

That merge contains Pro-accepted PR #15 at exact head
`f8726b2b2d08f8cdf9f7b1238639720f49a9d0b7` on the provider-neutral Ollo
lineage. Do not branch from the old UI Slice B base.

## Product objective

Make the existing, working Director Studio visibly closer to the user's approved
editor mockup while Codex finishes the Ollo rig/runtime path. This is a real
visual-polish slice, not a new capability slice.

The user should see a professional animation-editor hierarchy immediately:

- compact production header;
- legible scene rail with useful thumbnails and state;
- dominant 16:9 Player canvas;
- calm, well-spaced Director inspector;
- readable beat strip and multi-track timeline;
- consistent selection, hover, focus, disabled, and unavailable states;
- coherent StoryStage dark palette with the mint accent used intentionally.

Local visual references supplied by the user:

- `C:\Users\pbirc\Downloads\Generated image 1.png` — Director Studio mockup
- `C:\Users\pbirc\Downloads\Generated image 2.png` — Create-flow mockup

The Director Studio reference is primary for this slice. Inspect the current
app at desktop widths and compare it directly with the reference before coding.

## Scope

Polish the already-accepted Director Studio shell only:

- header spacing, badges, and action hierarchy;
- scene-rail density, thumbnail framing, selection, and metadata;
- Player container, aspect-ratio behavior, transport spacing, and empty/error
  containment;
- Director panel rhythm, tab treatment, field grouping, and primary-action
  hierarchy;
- beat strip/timeline sizing, track labels, marker legibility, zoom controls,
  and selected-range treatment;
- responsive behavior at 1440×900, 1600×900, and 1920×1080;
- keyboard focus visibility, contrast, reduced-motion compatibility, and
  narrow-width degradation.

Prefer CSS/layout/component refactors within `apps/studio`. Reuse the existing
design tokens and accepted components where they help; consolidate duplicate
visual rules when safe.

## Truthfulness constraints

Do not add mock controls or imply missing capabilities.

- The existing real controls must remain real.
- Intentionally unavailable features must stay absent or clearly unavailable
  with the accepted reason.
- Do not add Audio, Assets, Export, trimming, waveforms, keyframes, generative
  media, target selection, or Ollo-final-render controls.
- Keep deterministic proxy thumbnails labelled honestly; do not call them final
  or canonical rendered frames.
- Do not change Director eligibility, patch interpretation, timing, continuity,
  renderer authority, asset authority, or Ollo acquisition/registration logic.
- Do not broaden the task into the Create flow unless a shared token change is
  mechanically necessary and does not alter behavior.

## Acceptance evidence

1. Preserve all accepted Studio behavior and the exact 0/1/2+ reaction-target
   states from PR #15.
2. Add or update focused tests only where layout/accessibility behavior needs a
   regression; do not snapshot huge implementation trees.
3. Run the full Studio suite and repository-root `pnpm verify`.
4. Capture fresh screenshots from the actual app, at minimum:
   - 1440×900 with a setup/no-target beat selected;
   - 1440×900 with the real exactly-one-target Director command visible;
   - 1920×1080 showing the complete Player/Director/timeline hierarchy.
5. In the handback, include a short mockup-parity audit: what now matches, what
   intentionally differs because a capability is absent, and what remains for
   the Ollo media/runtime lane.
6. State for every visible control whether it is real, unavailable with a
   reason, or omitted.

## Handback

Commit and push only `agent/kimi-ui-slice-c-visual-polish`, open a draft PR
against `agent/kcast001-provider-neutral-rig`, and write a dated handback under
`reports/agent-handoffs/` with exact SHAs, changed files, tests, screenshots,
and limitations. Do not merge. Codex and Pro will review the immutable head.

