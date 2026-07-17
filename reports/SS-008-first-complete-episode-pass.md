# SS-008 first complete episode pass

Date: 2026-07-17
Status: **IMPLEMENTED - Pro blocker correction awaiting re-audit**

## Outcome

StoryStage now remembers the work through durable evidence rather than making the user rediscover it. The Production desk inspects each exact saved bundle and verified delivery, labels its next useful action, and resumes directly into Assets, Audio, or Finish. Direction adds an evidence-backed confidence state and shot-addressable playback review cues.

## Implemented behavior

- Saved productions are reopened and schema-verified in the background. Their current full-production blockers and exact verified-delivery result determine the desk guidance.
- Picture blockers resume into Assets; voice, timing, mix, custom-SFX, or audio-rights blockers resume into Audio; a gate-complete project resumes into Finish for rendering; a verified delivery resumes into Finish as publishable.
- The Production desk distinguishes **watchable**, **technically ready**, and **publishable**. Only zero full-production blockers earns technically ready, and only a current verified delivery earns publishable.
- New first cuts still open in Direction instead of skipping the immediate creative result.
- The live preview repeats the same three confidence states next to the real composition and reports the exact remaining full-render gate count.
- Playback validation reports the first exact shot with unlocked spoken timing, a caption containing at least eight words above the explicit 4.25 words-per-second review threshold, or a placed SFX cue whose referenced asset is missing approval or content-bound rights.
- Invalid SFX cues are collapsed to unique affected shots and ordered by the frozen render plan. Cue insertion order cannot move the reported first issue later in the episode.
- Clicking a validation cue selects its shot and seeks the authoritative Remotion Player to that shot's first frame. Audio-owned issues also expose a direct **Open Audio** route.
- No missing SFX is invented when no cue exists. Caption density is a visible review heuristic, not a new final-render gate.

## Verification

- Repository privacy verification, lint, all workspace typechecks, and all production builds pass.
- All 40 Studio tests pass. Added coverage exercises picture-blocked, audio-blocked, gate-complete, and verified-delivery resume states; confidence truth; exact unlocked-timing seeking; dense-caption review; and invalid referenced-SFX evidence.
- All 149 repository tests pass, and the Electron workspace bundle check passes.
- In-app browser QA on a new History first cut confirms **Watchable, not publishable yet**, six real render gates, one timing cue at shot 1.02, exact seek from frame 0 to frame 72, synchronized shot selection, and direct Audio routing.
- Visual QA at the real editor scale confirms the upgrade path, confidence row, validation cue, timeline, and inspector remain readable without overlapping the composition or workspace rail.

## Product truth

This slice shortens and clarifies the human completion loop; it does not perform the missing human work. The current first cut still needs real picture approval, voice, timing review, mix decisions, rendering, and verified delivery. StoryStage now resumes at those honest gaps and points to concrete playback evidence instead of pretending the draft is finished.
