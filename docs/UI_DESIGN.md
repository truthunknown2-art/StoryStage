# UI design

StoryStage uses a creator-first information hierarchy. The default product asks, "Does this scene work, and how do I make it better?" Technical authorization and lineage still protect export, but they do not define the editing experience.

## Primary surfaces

### Home

Show recent projects with large visual thumbnails, project template, art style,
duration, simple status, and one clear `New project` action. Do not show revision
numbers, hashes, blocker counts, or production confidence.

### Create

Use one calm setup screen with two starting paths:

1. **Paste a script** for manual screenplay input.
2. **What's your idea?** for a native AI Director conversation that proposes the
   screenplay and hierarchy.

Both paths use the single private-launch template, **Ollo & Friends — Kids
Story**, then choose art direction, target duration, cast, guide-voice state,
format, and language before the same editable proposal review.

When AI is disconnected, **What's your idea?** shows **Connect AI Director** and
a small **Sign in with ChatGPT** connection sheet. The creator never configures
MCP, pastes a key, or opens a terminal. The chat header shows a compact truthful
connection state, with reconnect/sign-out/runtime check in Settings.

Keep generation quality, candidate counts, rig requirements, provider routing, and licensed-media preferences under `More options`.

Reference packet: [AI-native Create and Studio visual direction](design/ai-copilot-studio/README.md).

### Studio

The preview is the center of gravity.

- Left, about 20%: visual scene cards and natural beat text.
- Center, about 55%: large live preview with honest draft labels and familiar playback controls.
- Right, about 25%: a contextual Director panel for plain-language edits plus Visual, Motion, Audio, and Assets controls.
- Bottom: a compact thumbnail beat strip with waveform and real Character, Camera, Voice, and SFX tracks; expand it into the full timeline only when needed.

The selected beat is the default editing unit. Expanding a beat reveals its internal shots. Internal IDs, frame numbers, hashes, and blocker codes never lead the card.

Reference packet: [AI-native Create and Studio visual direction](design/ai-copilot-studio/README.md).

### Export

Open export as a drawer or modal. Use creator language such as `2 visuals need artwork`, `Review the final script`, and `Listen through narration`. Put rights, hashes, render environment, frame counts, deterministic evidence, and worker logs under a collapsed `Advanced preflight` section.

## Visual system

- charcoal `#11161a` foundation
- warm off-white primary text with strong contrast
- mint or teal for selection and primary creative actions
- coral or orange only for actionable attention
- 16px minimum default text in the creator workspace
- large visual thumbnails, 10-14px radii, restrained borders, and generous spacing
- motion and state changes that remain readable without relying on color alone

Avoid low-contrast microcopy, dense full-width validation cards, tiny numbered shot blocks, decorative controls, hashes in headers, and permanent technical inspectors.

## Interaction truth

- Every visible control changes the selected beat or opens a working workflow.
- Plain-language direction compiles to structured beat, motion, camera, asset, audio, or timing changes and shows the result immediately.
- The optional timeline represents the exact tracks used by preview and export.
- `Draft voice`, `Candidate visual`, `Missing background`, and similar contextual badges may appear over the creative surface; large validation tribunals may not.
- Full-body pose replacement cannot be presented as the primary animation method.
