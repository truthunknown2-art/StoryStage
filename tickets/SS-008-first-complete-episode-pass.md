# SS-008 first complete episode pass

Date: 2026-07-17
Status: **ACCEPTED by ChatGPT Pro at `fabbd2d`**

## Product objective

Make one real episode easy to carry from first cut to verified delivery without reconstructing the workflow after every pause. Resuming a saved project should identify and open its next incomplete human step, while the preview points to concrete timing, caption, and audio-evidence issues and states the cut's real completion level.

## Acceptance contract

- Every saved production receives evidence-derived resume guidance from its exact durable bundle and verified-delivery state.
- The Production desk labels the next useful action and distinguishes a watchable cut, a gate-complete cut ready to render, and a verified publishable delivery.
- Opening a saved production resumes into Assets, Audio, or Finish according to the first incomplete production gate; a new first cut still opens in Direction.
- Direction exposes a compact confidence overlay: Watchable, Technically ready, and Publishable. No state is inferred from button history or optimistic UI state.
- Playback validation identifies the exact first affected shot for unlocked spoken timing, captions with at least eight words above 4.25 words per second, and invalid referenced SFX evidence. Each issue can seek/select its owning shot or route to Audio.
- Validation warnings do not invent mandatory SFX, factual, or style requirements. They report only evidence already present in the frozen plan and saved production state.
- Verified delivery remains the only Publishable state. Full-render readiness remains the only Technically ready state.
- Automated tests cover resume routing for picture, audio, finish, and delivered states plus shot-addressable validation and confidence truth.

## Out of scope

New generation or animation systems, AI voice, automatic approval, new asset pipelines, browser-session automation, factual verification, stock/archive acquisition, Blender execution, cloud publishing, and final visual-library expansion.
