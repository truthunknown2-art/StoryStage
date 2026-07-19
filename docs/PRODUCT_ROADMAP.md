# StoryStage product roadmap amendment

- **Product owner:** Preston
- **Project lead:** ChatGPT Pro
- **Implementation authority:** Codex
- **UI/UX and editorial-design owner:** Kimi
- **Status:** binding roadmap amendment
- **Date:** 2026-07-19
- **Current accepted integration head:** `agent/kcast001-provider-neutral-rig@714d65ce80df2625b0b1ffc86ca52cc4cd8fe4e4`

## North star

StoryStage is a professional AI-assisted animation studio, not a fixture renderer and not an opaque one-click video generator.

```text
paste or import a screenplay
→ choose Kids Adventure or Weird History
→ review editable sequences, scenes, and beats
→ AI Editorial Director proposes purposeful coverage and pacing
→ deterministic StoryStage compiler validates and seals one canonical plan
→ generate or acquire characters, sets, props, rigs, performance, and audio
→ edit a beat or shot in plain language or direct manipulation
→ recompile and replay the affected range
→ render and deliver a reproducible finished episode
```

The product combines AI judgment with deterministic execution:

```text
AI proposes taste and intent
StoryStage code owns identity, lineage, timing, continuity, capability, rendering, and delivery
Preston remains final creative authority
```

## Non-negotiable product rules

1. **One canonical path.** Studio Player, render worker, final MP4, and evidence consume the same `ExecutableEpisodePlan`. No fake preview path, Ollo-only composition, or demo-only compiler.
2. **Provider-neutral intelligence.** External GPT, Kimi, Codex, or future model providers emit bounded intent. They never author canonical hashes, exact frames, capabilities, asset approval, or production status.
3. **Deterministic authority.** Timing, continuity, camera samples, performance binding, prop ownership, asset verification, hashes, and delivery remain deterministic compiler/worker authority.
4. **Human approval is explicit.** Candidate art, registration, motion, voice, and editorial pilots remain unapproved until Preston accepts exact hash-bound evidence.
5. **Honest UI.** Unsupported controls stay absent or visibly disabled. Candidate media never receives `Render-ready`, `Approved`, or `Production` wording.
6. **Visible progress beats foundation recursion.** After current safety and registration gates, every major slice ends in something Preston can watch, compare, or edit.
7. **Fixtures are not the roadmap.** Moonlit Ruins, Mara, Milo, and engineering art remain tests only. Ollo & Friends is the recurring Kids identity.

## Current product truth

### Working now

- Script-first Create flow for Kids Adventure and Weird History.
- Editable canonical scenes and beats.
- Director Studio shell with scene rail, authoritative Remotion Player, Director panel, beat strip, selected-beat Shots/Events/Camera lanes, exact seeking, patch preview/apply, undo/redo, and reload.
- Hash-sealed Director, timing, continuity, capability, workspace, asset, render, and delivery foundations.
- Atlas-cycle, living-hold, and local articulated-parts execution proofs.
- Complete mechanically verified Candidate I Ollo source intake: front and genuine opposing profiles, part kits, and face/exposure kits.

### Not yet product-complete

- Ollo has no approved registration, prepared three-view rig family, or production capability.
- The Alpha planner still relies heavily on lookup tables, word-count timing, index rotation, and templated motivations.
- No safe rich external Editorial Director contract is implemented.
- No user-visible guide voice, final dialogue, music/SFX workflow, or audio-master timing exists in the current creator path.
- StoryStage cannot yet produce a polished Ollo episode from an arbitrary script.

## Critical path and parallel lanes

Two lanes proceed in parallel and meet in one visible Ollo milestone.

```text
Lane A: Ollo performance
exact geometry proposal
→ private joint diagnostic
→ Preston Gate 1
→ full motion diagnostic
→ Preston Gate 2
→ prepared three-view rig family
→ native Ollo capability

Lane B: Editorial intelligence
cross-artifact lineage containment
→ EditorialTargets + external intent + sealed proposal
→ heuristic-planner equivalence
→ private blind A/B proxy pilot
→ AI-planner verdict

Both lanes
→ one real 20–30 second Ollo Storylight sequence
→ ordinary Studio Player + ordinary render worker
```

## Ordered milestones

### M0 — EDI-000b: complete planner-lineage containment

**Owner:** Codex

PR #18 closed the compiler-entry exploit. The same invariant must be enforced independently at:

```text
DirectorProject schema/sealing
workspace H0 restore
all workspace revisions
applyDirectorPatch
sealDirectorProductionBundle
production-bundle schema parse
```

Required reusable assertion:

```ts
assertPlanningArtifactMatchesDirectorPlan(planningArtifact, directorPlan);
```

It compares every canonical `beatId` and `beatContentHash` in source order. No external or manual AI importer is authorized before this closes.

### M1 — KCAST-001J: authority-false Ollo registration proposal and compact diagnostic

**Owner:** Codex  
**Human gate:** Preston

Use exact Candidate I atlas bytes to produce typed attachment evidence:

```text
mechanical seam
proposed-review-required
shared profile pivot
rigid decoration
mask-only
missing / insufficient / ambiguous
```

The private worker-only diagnostic shows, per view and joint:

```text
original crop
exact seam/tab evidence
proposed or shared socket
rest pose
-15° / 0° / +15°
gap and orbit heatmaps
basis and authority labels
```

Preston patches pivots/sockets/shared groups through immutable proposal patches.

Gate 1 decision:

```text
accepted-for-motion-diagnostic
needs-registration-correction
regenerate-source
```

No ordinary Player, capability count, preparation, export, or production authority is allowed here.

### M2 — EDI-001A: Editorial Director contracts and heuristic extraction

**Owners:** Codex for contracts/compiler; Kimi for editorial knowledge and planner examples

Add provider-neutral artifacts:

```text
ExternalEditorialIntentDraft
EditorialPlanningInvocationReceipt
EditorialDirectorProposalV1
EditorialTargets
EditorialProposalRevision
EditorialPlanningOutcome
```

The proposal owns coverage topology, primary/secondary shot purpose, subjects/props, framing, angle, composition intent, camera/transition intent, read bias, structured reason codes, rationale, and scene energy intent.

Move the existing lookup-table behavior into `HeuristicEditorialPlanner`; remove hidden editorial choices from the compiler. Freeze one Kids and one Weird History equivalence fixture.

No model API call belongs inside deterministic compilation.

### M3 — SCENECRAFT-001: Scene Craft v1.1 and rule taxonomy

**Owner:** Kimi  
**Validator integration:** Codex

Revise `docs/editorial/scene-craft-v1.md` before encoding any rule.

Every rule declares:

```text
domain
hard invariant / warning / information / planner prior / hypothesis / example only
minimum sample size
semantic exception codes
evidence source hashes
evidence kind
confidence
```

Accepted principles include purposeful coverage, listener reactions, motivated cuts/camera, energy shaping, reveal preparation, performance follow-through, and audio-led timing.

Do not hard-code universal quotas for shot mix, duration CV, same-size streaks, reveal shot count, static duration, blink timing, gesture inventory, or the illustrative 15-shot example.

### M4 — EDI-001B: blind proxy editorial pilot

**Owners:** Codex builds the private runner; Kimi/manual GPT authors Cut B intent; Preston and Pro judge

Freeze one 20–30 second `Storylight in the Little Wood` excerpt containing:

```text
space establishment
Ollo physical action
Storylight/prop reveal
Tix or Dot listener reaction
focus change
payoff
```

Render with identical lineage:

```text
Cut A: expanded heuristic proposal
Cut B: manually authored AI editorial intent
```

Both use the same story graph, scene worlds, timing budget, continuity compiler, capability registry, renderer versions, and output settings. No fallback is allowed. Both are private, watermarked, and `productionBindable:false`.

Blind rubric:

| Category                                     | Weight |
| -------------------------------------------- | -----: |
| Story clarity and causality                  |     25 |
| Purposeful composition and coverage          |     20 |
| Motivated cuts and action continuity         |     20 |
| Pacing and readable holds                    |     15 |
| Character reactions and performance coverage |     10 |
| Visual variety without randomness            |     10 |

Success requires Preston to choose Cut B, a margin of at least 15 points, zero additional hard defects, no worse quality findings, and no hidden fallback.

### M5 — KCAST-001K: full Ollo motion review and promotion

**Owner:** Codex  
**Human gate:** Preston

After Gate 1, render the private semantic-role motion reel for all three views:

```text
living hold
blink and independent gaze
head/torso overlap
left reach
right reach
hip/knee/ankle articulation
named plant holds
rest/AI/MBP/OH visemes
settle to neutral
```

Use authoritative lossless frame transcripts and full MP4 decode checks. Preston Gate 2 sets:

```text
identityConsistencyPassed
semanticViewAuditPassed
visualRoleAuditPassed
registrationReady
```

Only all four true authorize preparation, three prepared view manifests, the rig-family manifest, approved assets, and native Ollo capability registration.

### M6 — OLLO-VIS-001: first real 20–30 second Ollo sequence

**Owners:** Codex implementation; Kimi visual/UX review; Preston final acceptance

This is the next decisive product milestone.

It runs through:

```text
arbitrary Kids project
→ canonical editorial proposal
→ DirectorPlan
→ TimingSolution
→ ContinuitySequencePlan
→ ExecutableEpisodePlan
→ existing StoryStage Player
→ ordinary render worker
```

It visibly proves:

```text
front and genuine left/right profiles
living motion
blink/gaze/visemes
walk or run
real deceleration and named plant
left/right reaches
prop contact and ownership
motivated cuts and camera
no sliding, ghosting, pose swaps, or continuity drops
```

No special Ollo composition or bespoke preview is permitted.

### M7 — EDI-001C: rerun the blind pilot with approved Ollo

Rerender Cuts A and B with the same approved Ollo rig and repeat the blind judgment. This separates editorial quality from proxy-art quality. Only repeated success authorizes AI planning as a creator-facing default.

Before defaulting AI planning, repeat on:

```text
one fast Weird History excerpt
one quiet Kids dialogue/reaction excerpt
```

### M8 — SCRIPT-001: hierarchical screenplay ingest

Add:

```text
episode
→ acts/sequences
→ scenes
→ beats
→ dialogue/action/transition units
→ cast, props, locations, continuity state
```

This replaces the short-paragraph ceiling and enables 5–20 minute episodes with scene-scoped planning and episode-level arcs.

### M9 — AUDIO-001: guide voice as timing master

Implement provider-neutral guide voice/import with exact clause and phoneme/viseme timing.

Timing priority:

```text
approved final audio
→ guide voice
→ estimated timing
```

Unlock real captions, J/L cuts, dialogue coverage, lip sync, music functions, SFX cues, ducking, and audio-aware editorial planning.

### M10 — STUDIO-001: full-episode editable timeline

**UI/UX owner:** Kimi  
**Data/patch authority:** Codex

Expose only real lanes:

```text
Scenes
Shots
Events
Camera
Voice
SFX
Music
```

Add deterministic direct manipulation through patch artifacts:

```text
drag cut/hold
reorder scene
select reaction target
retime cue
scrub exact frame
plain-language revise selected range
```

Keep the approved mockups as the binding visual target.

### M11 — KIPLY-BENCH-001: external animation-quality benchmark

Reproduce the directing and limited-animation grammar of one selected 30-second Mr. Kipply passage using original StoryStage story content and assets, initially without audio.

The benchmark must be generated through the ordinary product path. It tests scene interpretation, coverage, composition, camera, performance, cuts, continuity, and timing. It is not a hand-authored showcase beside the product.

### M12 — Show Pack breadth and finished-episode automation

After Ollo and the editorial pilot succeed:

```text
Tix rig and sparkbird locomotion
Dot glow/social motion grammar
Storylight lantern motion grammar
episode-specific character/prop/location generation
layered set and occluder authoring
asset reuse and Show Pack libraries
full audio/mix/delivery automation
2–3 minute publishable pilot
5–20 minute chunked production
```

## Immediate assignments

### Codex

1. Finish the Candidate I exact detector, proposal bases, immutable Preston patch model, and private compact diagnostic. Stop before full 180-frame authority.
2. Land EDI-000b cross-artifact planner containment.
3. Produce and implement M2 contracts/heuristic extraction without model API integration.
4. Integrate Kimi UI Slice C only after exact composition-only Player proof passes.
5. Do not add broad Show Pack inventory, audio UI, or another fixture-specific animation patch before M1/M2 gates.

### Kimi

1. Close UI Slice C with genuine `PlayerRef` exact-frame plus composition-only persisted pixel proof, then stop that polish lane.
2. Produce `Scene Craft v1.1` with the approved taxonomy and evidence mapping.
3. Prepare provider-neutral example `ExternalEditorialIntentDraft` documents for the frozen Storylight pilot, without canonical IDs/hashes or compiler authority.
4. Design the read-only Ollo registration review surface and later blind A/B review surface against real artifacts. Do not add fake controls or candidate media to ordinary playback.
5. After those gates, own full-episode timeline/direct-manipulation UX against Codex-owned patch contracts.

### Project lead

- Audit immutable technical checkpoints for P0/P1 authority defects.
- Audit actual visual evidence at Ollo Gate 1, Gate 2, OLLO-VIS-001, and the blind pilot.
- Prevent foundation-only drift and competing preview/render paths.
- Keep Codex and Kimi contracts non-overlapping.

### Preston

1. Correct or approve Ollo registration proposal at Gate 1.
2. Approve or reject the full Ollo motion evidence at Gate 2.
3. Score the blind editorial cuts and choose the publishable one.
4. Accept the real 20–30 second Ollo sequence.
5. Select the Mr. Kipply benchmark excerpt when M11 begins.

## Stop rules

Do not proceed when:

- external AI can author canonical hashes, IDs, frames, capabilities, or authority;
- a planning artifact can disagree with its source graph or DirectorPlan;
- candidate Ollo media enters normal playback or capability counts before approval;
- an engineering character is cosmetically presented as Ollo;
- a new UI control has no executable contract;
- a special composition or second compiler is created for a proof;
- a quality prior is promoted to a hard block without sample size, exceptions, and evidence;
- a milestone ends only in schemas/tests when creator-visible proof was required.

## Alpha completion

Director Studio Alpha is complete when Preston can:

```text
paste an arbitrary 100–300 word Kids or Weird History script
choose a real art direction
review/edit natural scenes and beats
compile one canonical AI-assisted directed animatic
select a beat and revise it in plain language
recompile/replay only the affected range
see honest capability gaps
watch a real Ollo sequence with approved performance
render the same plan through the ordinary worker
```

## Product completion

The intended product is complete only when a solo creator can take an arbitrary screenplay through:

```text
hierarchical story breakdown
AI editorial direction
asset and Show Pack planning
approved character/set/prop generation
rigging and performance
voice, lip sync, SFX, music, and mixing
editable full-episode timeline
validated final rendering
reproducible delivery
```

without leaving StoryStage except for explicitly approved provider-neutral asset or voice exchanges.
