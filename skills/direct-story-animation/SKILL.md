---
name: direct-story-animation
description: Direct script-driven animated videos as coherent audiovisual productions. Use when breaking scripts into beats and shots; planning staging, composition, continuity, camera, edits, character performance, rigs, sprites, backgrounds, props, layers, sound effects, music, dialogue, visemes, or lip movement; choosing between Kids Adventure and Weird History editorial grammar; reviewing an animatic or render; or compiling a Director plan that must avoid slideshow and pose-swap animation.
---

# Direct Story Animation

Create an untimed, machine-readable `DirectorPlan`, solve it into one `ExecutableEpisodePlan`, then require preview, animatic, picture, animation, audio, final render, and QA to consume that same plan. Treat prose as rationale, never as executable evidence.

The world persists; shots do not own reality. Characters, props, entrances, exits, velocity, gaze, depth, and ownership live in one scene-world state. A shot is only a temporary view into that state and may never silently reset it.

## Workflow

1. Read the script, target audience, show pack, approved assets, duration, format, and production limits.
2. Select one directing grammar. Read [directing-grammar.md](references/directing-grammar.md). Do not average Kids Adventure and Weird History into generic pacing.
3. Build the beat ladder before choosing shots. For every beat record:
   - audience question;
   - knowledge and emotion before/after;
   - visible action or revelation that changes the state;
   - information that must be understood with dialogue muted;
   - dialogue that must remain understandable with picture hidden.
4. Build a causal event graph. Every reaction names its cause; every entrance, exit, reveal, attachment, offer, transfer, and release changes the persistent world through a named event.
5. Design the shot flow without arbitrary frame ranges. Give every shot one primary purpose, an entry and exit event, composition, screen direction, eyeline, depth plan, transition motivation, and timing envelope. Cut on a change of information, action, emotion, scale, or visual idea—not because a timer expired.
6. Choose an honest performance source per performer and phase. Read [performance-and-rigging.md](references/performance-and-rigging.md). Reject whole-body pose switching as a fallback.
7. Resolve capabilities before artwork. Unsupported actions may use a proxy animatic, but final rendering remains locked until a renderer and asset plan exist.
8. Resolve assets through the reusable entity and view graph. Read [asset-factory.md](references/asset-factory.md). Reuse approved identities, plates, props, and rigs before generating new pixels.
9. Spot dialogue, vocal reactions, Foley, ambience, sound effects, and music against named picture events. Read [audio-and-dialogue.md](references/audio-and-dialogue.md). Never leave long-term cues anchored only to guessed timestamps.
10. Emit the contracts described in [director-plan-contract.md](references/director-plan-contract.md). Bind stable IDs and content hashes. Keep creative rationale beside, not instead of, executable references.
11. Solve event dependencies, read windows, performance envelopes, dialogue timing, and cut compatibility into exact frames. Do not manually stretch shots to fill a target duration.
12. Run `node scripts/audit-director-plan.mjs <plan.json>`. Fix every error. Warnings require an explicit creative exception.
13. Render a proxy animatic from the same executable plan as final production. Approve its geography, blocking, camera, cuts, and comprehension before generating final art.
14. Render the affected sequence, inspect consecutive frames and the encoded video, listen to the exact master, and revise. A valid plan is not proof of good direction.

## Allocate judgment correctly

Use AI judgment for:

- beat boundaries and dramatic emphasis;
- staging, focal hierarchy, camera motivation, and editorial rhythm;
- performance direction and source selection;
- asset reuse versus a justified new view or prop;
- sound spotting, music function, and silence;
- identifying ambiguity, boredom, repetition, or emotional dishonesty.

Use hard validators for:

- source-to-beat-to-shot lineage;
- shot coverage, non-overlap, and legal frame ranges;
- continuity edges, screen-direction exceptions, and eyeline targets;
- real clip, rig, layer, event, cue, and asset references;
- root anchors, contacts, view, loop semantics, and exposure timing;
- dialogue line hashes, word alignment, visemes, and exact audio hashes;
- 48 kHz sample boundaries, cue bounds, loudness, peaks, clipping, and mix receipts;
- exact visual asset hashes and deterministic render evidence.

Never let a validator decide whether a joke lands or a reveal feels earned. Never let AI prose waive a broken hash, missing rig, invalid cue, or invisible performance channel.

## Review gates

Fail the plan or render when any of these are true:

- a shot lacks a story function or changes nothing;
- geography, gaze, or screen direction becomes confusing without intent;
- a character translates while facing the wrong travel view;
- a major action uses a living hold or mismatched full-body crossfade;
- animation lacks anticipation, contact/action, overshoot, or settle where the action needs them;
- a foreground layer clips a sprite through an invisible edge;
- a cue survives after its picture event or source hash changes;
- lip motion is generic flapping rather than aligned performance;
- preview and final render consume different picture or audio bytes;
- the sequence works only because explanatory UI text claims it does.

## Deliverables

Return:

1. the validated `DirectorPlan`, `TimingSolution`, and `ExecutableEpisodePlan`;
2. an asset reuse/generation list;
3. performance and rig requirements by shot;
4. audio cue and dialogue plans anchored to events;
5. creative risks and validator failures kept separate;
6. the smallest rendered proof that demonstrates the new decision in motion and sound.
