# SS-007 paste script to first watchable cut

Date: 2026-07-17
Status: **IMPLEMENTED - Pro blocker correction awaiting re-audit**

## Outcome

StoryStage's real entry point now behaves like a product: choose Kids or History, paste a script, press **Create first cut**, and immediately land on a watchable frame-zero Remotion cut. The first cut is explicit about silent narration and candidate or placeholder picture, then presents one evidence-derived upgrade route toward a finished episode.

## Implemented behavior

- The New Production screen has one always-visible primary **Create first cut** action. A valid script and directing profile are enough to use it; art and audio approval are not falsely required for a draft.
- The resulting production opens at frame zero in the real shared `ProductionComposition`, with the existing profile-specific shot breakdown, cuts, camera direction, captions, timing, and fallback stage.
- The preview's truth strip distinguishes no narration, silent first cut, draft voice, incomplete voice rights, timing mismatch, and approved narration from the current production evidence.
- Candidate public art and non-private placeholders retain their in-composition preview-only watermarks. A first cut never presents either as approved picture.
- A compact path derives Picture, Voice, Timing, Mix, and Delivery readiness from the actual session, approved assets, audio state, review state, and verified delivery.
- Picture readiness uses the same `approved-art`, `source-acquisition`, and `visual-bindings` gates as the full-production renderer. Valid code-authored Show Pack treatments do not leave the path falsely stuck on Picture.
- Exactly one next upgrade is highlighted. Its action routes to the workspace that owns the evidence: Assets, Audio, or Finish.
- Kids Adventure and Frankly Weird History retain distinct directing profiles, shot grammar, and fallback visual treatments.
- This slice adds no generation service, credentials, browser-session access, automatic approval, render bypass, or delivery shortcut.

## Verification

- Repository privacy verification, lint, all workspace typechecks, and all production builds pass.
- All 34 Studio tests pass, including first-cut creation, silent-state truth, frame-zero entry, picture-upgrade routing, and Kids/History profile distinction.
- All 143 repository tests pass.
- The Electron workspace bundle check passes.
- In-app browser QA confirms the first-cut CTA is visible, a silent cut reports `Silent first cut - add narration`, playback begins at frame 0, and **Review picture** navigates to the Assets workspace.

## Product truth

This is a watchable directed draft, not a finished episode. The default history preview still uses the visibly watermarked Rook candidate when no approved private presenter exists, Kids still falls back to visibly watermarked placeholder art, and neither profile receives a voice performance merely by creating a cut. Those are now explicit upgrade steps rather than invisible gaps.
