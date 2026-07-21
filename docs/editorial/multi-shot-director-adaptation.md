# Multi-shot Director adaptation

- **Status:** Durable B3 planning reference; non-normative until an approved
  B3 work package turns the required fields into contracts and validators.
- **Source context:** Adapted from an exact user-supplied, generator-oriented
  multi-shot animation prompt framework and its linked workflow demonstration.
  Its governed receipt and rule decisions are recorded in
  [`multi-shot-prompt-framework-crosswalk.md`](./multi-shot-prompt-framework-crosswalk.md).
- **Companion knowledge:**
  [`scene-craft-v1.1.md`](./scene-craft-v1.1.md) owns the broader editorial
  vocabulary and classification of hard invariants, priors, hypotheses, and
  examples.
- **Phase boundary:** This document grants no F2, F3, runtime, schema, render,
  asset, audio, or production authority.

## Purpose

StoryStage should preserve the useful directing behavior of a cinematic
multi-shot prompt while replacing generated-video prose with an editable,
machine-valid production plan. The AI Director proposes the cut. Deterministic
systems verify it and compile accepted intent into complete Godot visual-shot
jobs and the canonical Remotion episode edit/audio/overlay composition.

```text
screenplay scene
+ project-template rules and art direction
+ approved assets, rigs, and capabilities
+ location layers and prop inventory
+ incoming world and continuity state
+ editorial Director knowledge
        |
        v
editable multi-shot SceneDirectionPlan proposal
        |
        +--> Godot complete-visual-shot jobs
        +--> Remotion episode edit, transition, caption, and audio plan
        |
        v
continuity, timing, capability, and renderability validation
```

## Useful source ideas to retain

- Break a dramatic scene into shots rather than treating it as one visual.
- Give every shot a purpose and a motivated cut.
- Choose shot count and pacing from story energy, action, dialogue, and
  reactions.
- Describe composition with shot size, angle, camera intent, and optional lens
  shorthand.
- Bind dialogue to the performance and shot in which it occurs.
- Establish location, time, ambience, and subject-driven sound.
- Tighten or widen coverage when the dramatic beat requires a different point
  of view.

These are planning choices, not quotas. Repetition can be correct when it
preserves geography, comparison, comedy, tension, or a deliberate visual rhyme.

## Generator assumptions StoryStage must reject

- No universal 15-second scene duration.
- No 1,500-character production-plan limit.
- No required three-to-seven-shot count or two-to-five-second shot duration.
- No random variation requirement and no rule forbidding consecutive matching
  shot sizes, angles, or movements.
- No repeated prose descriptions used to reconstruct known characters. Plans
  reference approved character, costume, rig, location, prop, and layer IDs.
- No fixed `diegetic sound only` policy. Narration, dialogue, ambience, SFX,
  music, captions, and intentional silence remain separate editable lanes.
- No implication that cinematic prose is executable animation.

Shot and scene duration follow approved or guide audio, readable action phases,
performance, reaction time, dramatic purpose, and the deterministic timing
solver. Lens equivalents remain optional compositional shorthand rather than a
fake physical-camera claim.

## Required Director inputs

Before proposing shots, the Director needs:

- screenplay hierarchy and the exact scene or beat envelope;
- project-template rules, art direction, aspect ratio, frame rate, and output target;
- approved characters, visible views, costumes, rigs, expressions, visemes,
  and action capabilities;
- location depth planes, foreground occluders, ambient elements, lighting or
  time-of-day state, and camera-safe bounds;
- props, ownership, attachments, scale, and lifecycle state;
- selected narration or dialogue timing when available;
- incoming character positions, facing, gaze, eyelines, screen direction,
  geography, prop state, and unresolved dramatic information;
- active editorial knowledge, exceptions, and capability limitations.

Missing information becomes an explicit asset, rig, performance, or direction
request. It must not be silently invented as available production capability.

## Required shot proposal content

The eventual contract name and exact field shape belong to an approved B3 work
package. Conceptually, every proposed shot must carry:

- stable shot identity, scene/beat scope, primary purpose, secondary purposes,
  and rationale;
- resolved duration or timing constraints and cut motivation;
- shot size, angle, composition, focal subject, optional lens shorthand, and
  supported camera intent;
- character blocking, facing, gaze, eyelines, depth plane, entrance/exit,
  action phases, expression, gesture, and viseme intent;
- referenced rig actions plus preparation, contact/impact, hold, reaction, and
  settle requirements where applicable;
- prop use, ownership, attachment, contact, and state changes;
- background, midground, character/prop, foreground-occlusion, and ambient
  layer behavior;
- dialogue, narration, ambience, SFX, music, captions, and intentional silence
  cues without pretending unresolved media already exists;
- incoming and outgoing continuity state;
- Godot and Remotion responsibility boundaries;
- capability requests, validation expectations, and an honest fallback when
  the preferred shot is not renderable.

The creator must be able to compare, accept, reject, revise, regenerate, lock,
and restore proposals at the appropriate scene or shot scope before they become
render authority.

## Engine responsibilities

### Godot

Godot owns articulated character and prop performance passes requested by an
accepted plan: view-correct rigs, action phases, grounded travel, expressions,
visemes, contact, holds, and transparent shot-scoped output.

### Remotion

Remotion remains the canonical episode clock and owns shot sequencing, camera
and multiplane composition, foreground occlusion, ambient layers, transitions,
captions, narration, dialogue, SFX, music, mixing, and final rendering.

The Director may request these behaviors but may not bypass capability,
continuity, timing, asset, or renderability validation.

## B3 adoption test

When B3 is authorized, this reference is successful only if:

1. two materially different scripts produce different, sensible multi-shot
   plans rather than the same template with substituted nouns;
2. every visible proposal is editable and truthfully scoped;
3. plans preserve identity, geography, screen direction, props, action phase,
   and scene state across cuts;
4. requested rig, layer, camera, and audio behavior maps to available
   capabilities or an explicit unmet request;
5. deterministic validation can reject teleporting, sliding, clipping,
   lifecycle dropout, impossible timing, unsupported views, and dishonest
   camera or transition labels;
6. accepted plans compile into bounded Godot and Remotion jobs without using a
   generated-video service.

Until B3 begins, this file is retained so the directing approach is not lost;
it does not authorize implementation during the frontend gate.

## Roadmap adoption boundary

- **G0** governs the source receipt, crosswalk, adaptation, and canonical links.
- **F3** exposes the retained purpose, composition, camera, and action vocabulary
  as honest manual creator controls.
- **F4/B2** make approved assets, views, rigs, layers, props, and supported
  performance/camera behavior the capability boundary.
- **B3** implements typed proposals, deterministic validation, review, and the
  two-script benchmark without importing generator quotas.
- **B4** binds dialogue, narration, captions, visemes, SFX, music, and silence
  to the same canonical timing authority.

The exact classifications and rejected generator rules are normative planning
input in the companion crosswalk. Neither file starts any of those phases.
