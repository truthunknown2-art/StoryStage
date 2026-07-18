# Limited-animation grammar

Use limited animation deliberately: conserve drawings while preserving readable performance. A static body translated across the frame is not a walk. Three full-body images swapped on a timer are not a performance.

## Analyze motion from evidence

1. Build a coarse contact sheet across the entire reference to locate edit, staging, and treatment changes.
2. Build successive-frame sheets at four to six samples per second for at least five representative windows: entrance or locomotion, dialogue acting, obstacle or prop interaction, transition, and payoff.
3. Record what changes between adjacent samples. Separate hard cuts from camera motion, root translation, internal articulation, facial changes, layer motion, and effects.
4. Mark whether motion follows anticipation, action, overshoot, settle, and hold.
5. Record the narration, music, or SFX accent that motivates each change.
6. Store contact sheets under ignored artifacts. Commit only measurements, classifications, and derived grammar.

Use `scripts/build-frame-contact-sheet.py` and `assets/animation-analysis-template.csv` for repeatable analysis.

## Direct a beat

Plan a semantic beat before its shots. Produce a directed beat program containing:

- `intent`: the idea, emotion, or action the viewer must understand
- `staging`: subjects, screen direction, shot size, entrances, exits, and focal target
- `performance`: gaze, face, head, torso, limbs, hands, root motion, prop contact, and secondary motion
- `phases`: anticipation, action, overshoot, settle, and comprehension hold
- `camera`: cut, push, pan, reframe, shake, focus target, and easing
- `layers`: background depth, parallax, foreground occlusion, particles, and masks
- `timing`: narration words or phonemes, music accents, SFX, captions, and beat boundaries
- `continuity`: incoming and outgoing pose, position, prop state, and screen direction

A beat may compile to one continuous shot or several editorial shots. Keep the beat as the creator-facing unit and expose internal shots only when expanded.

## Build real cutout performance

Require a hierarchical rig with stable pivots and attachment sockets:

- root, pelvis, torso, neck, head
- upper and lower arms, hands, and optional hand shapes
- upper and lower legs, feet, and ground contacts
- eyes, lids, brows, pupils, mouth shapes, and optional jaw
- hair, clothing, tails, or accessories as secondary-motion nodes
- prop sockets, masks, z-order, mesh or sprite nodes, and per-part bounds

Evaluate the hierarchy at the requested output frame. Support animation curves, constraints, inverse kinematics, clip blending, attachments, and procedural secondary motion. Render the same evaluated scene in preview and export.

## Compile semantic actions

Translate direction into layered tracks, not a pose name. For example, `notice prop and recoil` may compile to:

1. shift pupils and head toward the prop
2. lead the torso into a small lean
3. raise brows and change mouth shape
4. reach or brace with articulated arm segments
5. recoil with overshoot
6. settle and hold long enough to read

Style profiles modify amplitudes, easing, spacing, holds, and editorial cadence without changing the semantic intent.

## Kids-adventure defaults

Treat these as proposed defaults until a measured profile overrides them:

- favor large readable arcs and silhouettes
- lead actions with gaze or head before torso and limbs
- pair root translation with a walk, run, swim, sneak, or climb cycle
- offset head bob, torso rotation, arms, and legs; avoid synchronized mannequin motion
- use facial changes and hand shapes as layers within continuous motion
- align the largest performance accent with a stressed word, musical hit, or SFX
- use environmental resets, entrances, foreground wipes, and shot-size changes to refresh attention
- hold important reactions long enough for comprehension
- animate on twos or threes when appropriate while evaluating deterministic output at the full render frame rate

## Honest routing

- Use layered 2D rigs for recurring characters, repeatable locomotion, dialogue, reactions, and prop interaction.
- Use Remotion for deterministic sequencing, captions, compositing, audio, transitions, and final rendering.
- Use a frame-evaluated scene graph for bones, meshes, constraints, camera, parallax, masks, and effects.
- Use Blender only for complex perspective rotation, spatial camera travel, lighting-dependent interaction, or geometry that layered 2D cannot fake convincingly.
- Use generated video only as an explicit shot treatment. Never let it silently replace the deterministic character system.
- Treat arbitrary image slicing and auto-rigging as a fallback. Prefer generation briefs that request separate rig-ready parts, neutral poses, expressions, hand shapes, props, and background depth layers.

## Reject false animation

Reject or repair a beat when any of these carries the primary performance:

- full-body pose replacement without continuous articulated motion
- character sliding without matching locomotion and ground contact
- camera motion presented as character motion
- lip flaps with no gaze, face, head, or torso intent
- unrelated loop motion that ignores the narration beat
- prop contact that floats, slips, or changes hands
- identical easing and amplitude applied to every action
- cuts that hide continuity errors rather than direct attention
- motion visible in preview but produced by a different path in export
