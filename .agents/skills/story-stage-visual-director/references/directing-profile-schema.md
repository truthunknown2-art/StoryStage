# Directing profile authoring

Profiles are quantitative directing policies shared by one or more Show Packs. A Show Pack owns series identity and approved assets; the profile owns production grammar.

## Required dimensions

- `cadence`: target cuts per minute plus minimum, maximum, and maximum-static frames
- `treatmentWeights` and `framingWeights`, each totaling 1
- `cameraPolicy.moves`, with weighted semantic camera actions totaling 1
- `transitionPolicy`, with weights totaling 1
- `textPolicy`: mode, maximum words, and target events per minute
- `performancePolicy`: gesture, reaction, and pose-change rates
- asset-routing priority by factual and creative use
- SFX and music rhythm
- continuity and repetition rules
- profile-specific quality checks

## Comparison gates

For the SS-002 canonical script:

- average shot duration differs by at least 20%
- history routes at least 1.5 times the kids share to inserts, evidence, graphics, or B-roll
- kids produces at least 1.5 times the history rate of character action and gesture events
- text, transition, camera, and asset-routing policies differ

Preserve deterministic fallbacks. An AI planner may propose a plan later, but the same schemas and validators must accept or reject it.

`packages/story-engine/src/model.ts` is the schema source of truth. `measureDirectedPlan()` in `packages/story-engine/src/metrics.ts` is the only metric implementation used by runtime diagnostics, automated tests, and this skill's comparison utility.
