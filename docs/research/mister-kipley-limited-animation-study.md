# Mister Kipley limited-animation study

Reference: [We're Going on a Dragon Hunt 2](https://www.youtube.com/watch?v=XHa6Lr1I76k), 3:18, observed July 17, 2026.

This study derives production grammar only. StoryStage must not copy the reference's characters, artwork, script, music, or exact shot sequence.

## Method

- Captured 100 full-work samples at two-second intervals.
- Captured 108 successive samples across five five-second windows at roughly four to five observations per second.
- Chose windows for two-character locomotion and acting (10–15s), water traversal (40–45s), quicksand interaction (80–85s), cave staging and transition (145–150s), and the dragon payoff (170–175s).
- Stored frames and contact sheets under ignored `artifacts/reference-analysis`; only this derived analysis is committed.
- Separated cuts and camera reframes from character-root motion, internal articulation, facial change, prop or layer motion, and effects.

## What the animation actually does

The reference is limited cutout animation, but it is not a pose slideshow. It combines reusable rigs and cycles with aggressive editorial direction.

### 10–15s: run cycle and reaction

- Both characters translate while their arms and legs alternate, torsos and heads bob, and the two cycles are offset from each other.
- The edit cuts from a two-character running composition to a close reaction around 12.7s, then returns to the run around 14.1s.
- The close shot changes gaze, brows, mouth, head angle, and an arm gesture. The reaction is not carried by swapping the whole body.

### 40–45s: environment reset and swim entrance

- A gesture and reaction composition gives way to an empty river establishing view around 41.7s.
- Characters enter progressively from the left and bottom rather than appearing fully staged at once.
- Translation is paired with a swim cycle, head bob, limb offsets, and staggered entrances. The static painted background makes the character motion easy to read.

### 80–85s: quicksand interaction

- The sequence starts on lower bodies and sinking ground, introduces vines into the hands, then reframes closer on the characters' strain.
- Arms, torsos, head angles, eye shapes, brows, and mouths change through the pull. Root position and crop also change.
- The obstacle, hand contact, and expression all support the same narrated action.

### 145–150s: eye-line acting, exit, dissolve, foot cycle

- A close two-shot uses eye direction and facial changes before the characters leave the composition.
- The empty environment creates a short staging reset.
- A dissolve or layered transition leads into a close foot-cycle insert. The locomotion is shown with repeated articulated leg and foot phases, not a sliding full-body cutout.

### 170–175s: creature payoff

- The reveal escalates through wide, medium, and extreme-close dragon views in rapid succession.
- Dragon head, jaw, eyes, and framing change during the push-in sequence.
- The edit cuts to the children's reaction, holds the confrontation, then lets the characters' raised arms and exit clear the frame for the dragon.

## Derived kids-animation grammar

1. Direct a semantic beat, then decide whether it needs one continuous shot or several editorial shots.
2. Pair root translation with a locomotion cycle and grounded contacts.
3. Layer gaze, face, head, torso, limbs, hands, and secondary motion; do not make one full-body image carry the performance.
4. Use anticipation, action, overshoot, settle, and a comprehension hold.
5. Reuse backgrounds, but refresh attention through entrances, exits, empty-environment resets, foreground wipes, shot-size changes, and controlled camera motion.
6. Time the largest gesture, expression, cut, or effect to narration stress, music, or SFX.
7. Use pose and expression sprites as rig parts or accents, never as the entire animation model.
8. Make the preview and export evaluate the same deterministic scene graph at the requested frame.

## Product consequence

StoryStage needs a motion compiler and deterministic 2D scene graph beneath Remotion. A Kids Adventure beat must compile into character-rig tracks, camera curves, layer motion, prop contacts, caption timing, and audio cues. Remotion remains the compositor and renderer; it should not be asked to impersonate the whole character-animation engine with three image swaps.

The first honest milestone is one 10–15 second kids scene with one rigged character, one interactive prop, a three-layer background, phoneme-timed mouth shapes, two shot sizes, a camera reframe, parallax, SFX, and a creator-facing beat editor. No full-body pose swap may carry the primary performance.
