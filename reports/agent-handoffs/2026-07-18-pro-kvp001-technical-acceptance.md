# KVP-001 technical acceptance

- Repo: `truthunknown2-art/StoryStage`
- Reviewed branch: `agent/kvp001-production-proof-wip`
- Accepted exact SHA: `c40a704001d416ea0d39565adf1323ad94160a18`
- Pull request: `#2`
- Reviewer: ChatGPT Pro
- Verdict: **ACCEPTED - no remaining P0/P1 technical blocker**

## Accepted proof

- The same fixture is compiled both without the concrete rig capability (`Hproxy`) and with `local-parts-v1` (`Hrig`).
- Planning artifact, scene worlds, Director plan, Timing Solution, executable shots, resolved events, format, and composition metadata remain identical.
- Canonical authority matches exactly for all 140 frames after excluding only the deliberately different performance-program, capability, and asset identities.
- The authority comparison covers root transform and velocity, lifecycle and visibility, facing and gaze, motion mode, action phase and progress, gait, visemes, camera, transitions, and prop state and ownership.
- Proxy and rig output differs on 10 of 11 selected frames. Frame 0 is identical because the opening transition has zero opacity.
- Strict serial and frame-order determinism evidence remains green.
- GitHub Actions verification passed for the accepted SHA.

## Gates that remain separate

- Preston's Player review remains the human visual-quality and appeal gate.
- Arbitrary-script inference of compound locomotion, planting, and acting remains a later production capability.
- This record documents the review outcome. It does not move the accepted engineering SHA or turn the proof fixture into a production animation by itself.
