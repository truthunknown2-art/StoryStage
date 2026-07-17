# SS-006 live plan-driven Remotion preview

Date: 2026-07-17
Status: **ACTIVE**

## Product objective

Replace the planning-only fake transport with the real plan-driven Remotion composition used by final output. Direction should feel like editing the episode, not reading metadata about an episode that may eventually exist.

## Acceptance contract

- Direction embeds `ProductionComposition` from the shared Remotion runtime rather than a separate visual approximation.
- The Remotion Player frame clock is authoritative for play, pause, scrubbing, shot jumps, shot selection, timecode, and inspector synchronization.
- The current frame-accurate plan drives transitions, captions, camera motion, performance gestures, pose-swap mouth cues, music, voice, and placed custom sound effects.
- Approved private visual assets are exposed only through a narrow Electron route that re-verifies immutable manifest and file hashes before playback.
- Approved private audio continues through the verified `storystage-media` routes. Browser mode never claims access to private desktop media.
- Unapproved public Show Pack candidates may appear for review context, but the preview carries an unavoidable visible candidate watermark. Missing and placeholder material is also visibly watermarked.
- Preview availability does not modify picture, audio, full-render, rights, or verified-delivery gates.
- Automated tests cover player/timeline synchronization, shot jumps, watermark truth, and playback asset routing.

## Out of scope

Automatic ChatGPT image generation, automatic human approvals, final character/environment library completion, phoneme analysis, skeletal rigging, Blender scene execution, stock/archive licensing, and cloud publishing.
