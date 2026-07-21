# AI-native Create and Studio visual packet

## Authority and intent

This packet records the product hierarchy Preston requested. The two supplied
screens are user-approved visual direction; the concept board is design
inspiration generated to explore the missing in-product AI Director. None of the
three images proves implemented capability or supplies exact production layout
measurements.

- [`create-screen-reference.webp`](create-screen-reference.webp) — user-supplied
  Create direction.
- [`studio-timeline-reference.webp`](studio-timeline-reference.webp) —
  user-supplied Studio direction.
- [`ai-copilot-concept-board.webp`](ai-copilot-concept-board.webp) — generated
  concept inspiration for the docked Director states and hierarchy.

## Required New Project hierarchy

New Project starts with exactly two clear choices:

1. **Paste a script** — paste or import a screenplay. StoryStage proposes the
   episode → sequence → scene → beat hierarchy for review.
2. **What's your idea?** — open the native AI Director chat. The creator describes
   the story, target duration, tone, cast, and constraints; Codex proposes the
   screenplay and hierarchy for review.

Both paths use the only private-launch project template,
**Ollo & Friends — Kids Story**, and meet at the same editable review gate before
project creation. Do not label the choice "project grammar." Do not show a
disabled or placeholder Weird History option. Additional templates are future
work.

## Required Studio hierarchy

- Keep the visual canvas and selected shot/scene as the primary surface.
- Keep episode/sequence/scene/beat navigation to the left and the compact
  episode/track timeline below.
- Make the **AI Director** a dockable right-side conversation, not a terminal and
  not a detached engineering console.
- Always show the chat's current scope: episode, sequence, scene, beat, shot,
  current playhead, selected time range, character, or asset.
- When the creator selects a scene, character, asset, or range, the chat follows
  that selection without silently including the entire project.
- Selecting a scene loads that scene's complete duration into the preview and
  scrubber. The scrubber supports play/pause, seek, frame/time readout, range
  selection, and proposal markers without forcing every scene to the same length.
- Provide explicit context chips: **Use playhead**, **Use selected range**, **Use
  selected shot**, and **Use selected character**. “Here” means the captured
  playhead/range attached to the request, not whatever happens to be selected
  when the model responds.
- Requests may target script/dialogue, shot boundary or duration, character
  action/expression/facing/blocking, camera/framing, prop/layer/occlusion,
  ambient effects, narration/visemes, SFX/music cues, captions, or transition.
- A request such as “make this reaction warmer,” “change this camera angle,” or
  “at 00:03.2 have Ollo notice the lantern” produces a structured, time-anchored
  proposal and impact list.
- Show **Preview**, **Apply**, **Revise**, **Reject**, and **Undo** for proposals.
  Durable changes use the same validated command path as manual controls.
- Clearly identify which shots, script lines, assets, timings, and render jobs
  would change before Apply. Unrelated ranges remain unchanged.
- If the selected rig or asset cannot perform the request, offer a bounded asset/
  capability request or an honest fallback. Never present missing motion, view,
  prop, layer, or audio as completed.
- Connection, signed-out, offline, usage-limited, incompatible, cancelled, and
  error states must be understandable without exposing tokens or implementation
  jargon.

## Responsive behavior

At compact widths, preserve canvas, selection, transport, and proposal review.
The Director may collapse to a labelled drawer; the scene rail and timeline may
collapse progressively. Do not make the normal creator use a terminal, hide the
proposal scope, or claim that a fixture created a script, image, animation,
recording, render, or export.

## Implementation routing

- F3-WP4 builds the truthful frontend conversation/proposal shell and the two
  New Project paths from labelled fixtures.
- F3-WP5 proves responsive, keyboard, accessibility, and visual fidelity against
  this packet.
- E1 proves the real Codex/App Server/MCP events and authority states before the
  product UI connects to them.
- B3 connects the accepted UI to persistent, scoped Codex sessions and the
  deterministic proposal/application command layer.
