# SS-007 paste script to first watchable cut

Date: 2026-07-17
Status: **ACTIVE**

## Product objective

Make the user's real entry point feel like a product: choose Kids or History, paste a script, and immediately watch a directed first cut. The first cut may be silent and may contain clearly labeled candidate or placeholder art, but it must already demonstrate scene breakdown, camera, cuts, captions, performance timing, and profile-specific visual grammar.

## Acceptance contract

- The primary creation action is **Create first cut** and explains that it immediately opens a watchable Remotion preview.
- A valid pasted script and selected profile are enough to create the first cut; art and audio approval remain later upgrade steps.
- The preview starts at frame zero with profile-specific direction, captions, cuts, camera motion, and honest candidate/placeholder watermarking.
- The preview clearly identifies whether narration is approved, draft/unapproved, or absent, and never implies that a silent cut has final audio.
- A compact upgrade path attached to the preview derives picture, voice, timing, mix, and delivery state from current evidence.
- The path highlights one next upgrade and routes to its actual owning workspace: Assets, Audio timing/voice, or Finish.
- Kids and History first cuts remain visibly distinct and use their existing directing profiles and fallback stages.
- No new generation service, API credential, automatic approval, render bypass, or delivery shortcut is introduced.
- Automated tests cover one-click first-cut creation, silent-state truth, profile distinction, and upgrade routing.

## Out of scope

Automatic subscription-backed browser operation, new image generation, Show Pack library expansion, TTS, phoneme analysis, Blender execution, stock/archive licensing, and final episode polish.
