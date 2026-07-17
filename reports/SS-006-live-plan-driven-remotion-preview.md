# SS-006 live plan-driven Remotion preview

Date: 2026-07-17
Status: **IMPLEMENTED — awaiting ChatGPT Pro audit**

## Outcome

Direction now embeds the same `ProductionComposition` used by final rendering. The old interval-driven planning transport no longer pretends to be playback; the Remotion Player owns the frame clock and the timeline, shot selection, and inspector follow it.

## Implemented behavior

- The complete current frame-accurate render plan drives the live composition at its real width, height, FPS, and duration.
- Play, pause, exact-frame scrubbing, shot-boundary jumps, mute, fullscreen, timecode, active shot, and inspector state are synchronized through the Player ref and frame events.
- Captions, profile-specific stage direction, transitions, camera motion, deterministic pose-swap mouth cues, approved voice/music, transition accents, and approved placed SFX reuse the final-render component and props.
- Approved private art is addressed through `storystage-media://asset/<asset>/<manifest-hash>/<role>`. Electron finds an actually bound approved version, re-verifies its immutable manifest, validation report, diagnostic, and requested file hash, then returns only the verified PNG bytes.
- Approved voice, music, and custom SFX continue through their existing verified private media routes.
- The built-in public Rook candidate can animate in browser or desktop review context, but it carries an in-composition `UNAPPROVED CANDIDATE · PREVIEW ONLY` overlay and review border.
- Any other non-private binding carries a `PLACEHOLDER PREVIEW · NOT APPROVED` watermark. Preview trust is derived from the actual approved-version set rather than a plan routing label.
- Preview media does not alter picture, audio, rights, final-render, receipt, or verified-delivery gates.

## Verification

- Studio typecheck and Desktop typecheck pass.
- All 32 Studio tests pass. Coverage includes frame/inspector synchronization, public candidate watermarking, public candidate pose routing, approved private asset URL routing, and absence of a watermark only when every consumed visual is privately approved.
- The full production build succeeds, including the Electron workspace bundle check.
- In-app browser QA on Rook Pilot 001 confirms the real composition is visible, the candidate watermark remains in the top viewport, shot 1.04 seeks the Player/timeline/inspector to frame 218, and 0.9 seconds of real playback advances it to frame 247.

## Product truth

This is now a real unrendered episode preview, not finished production art. The current Rook pixels remain an unapproved public candidate, the history set is still a designed fallback stage, and the Kids art library remains incomplete. Those facts are visible and still block final delivery.
