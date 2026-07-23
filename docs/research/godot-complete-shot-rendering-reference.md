# Godot complete-shot rendering reference

## Source receipt

- User-supplied example: [Scrabdackle — Rigging the opening cutscene in Godot
  Engine](https://www.youtube.com/watch?v=0kDE9Qe9Bbc)
- Creator process note: [How I used AnimationPlayer to animate my
  cutscene](https://www.reddit.com/r/godot/comments/m707rz/how_i_used_animationplayer_to_animate_my/)
- Engine references: [Godot cutout animation](https://docs.godotengine.org/en/stable/tutorials/animation/cutout_animation.html)
  and [Movie Maker mode](https://docs.godotengine.org/en/stable/tutorials/animation/creating_movies.html).
- Consulted 2026-07-20 for architecture research only. StoryStage copies no
  source code, character, artwork, animation, or audio from the reference.

## What the example demonstrates

Godot can render a complete 2D cartoon shot rather than only a transparent
character pass. Layered environments, cutout characters, props, effects,
lighting, and shot-local camera movement can live in one bounded shot scene. The
result is visually coherent because occlusion, depth, performance, and camera
are evaluated together.

The creator's retrospective also identifies the failure mode StoryStage must
avoid: one giant `AnimationPlayer` became difficult to change, and timing edits
could break other elements. Their preferred improvement was to keep individual
shots/scenes independent and arrange them through a higher-level sequencer.

## Retained decisions

- Godot owns one complete bounded visual shot: set layers, characters, props,
  foreground occlusion, parallax, ambient/particles, lights/shaders, and local
  camera.
- Each shot has its own scene graph and bounded animation resources. A 20-minute
  episode is never one Godot scene or monolithic `AnimationPlayer`.
- Remotion owns the higher-level episode edit: order, trims, handles,
  transitions, global narration/dialogue/SFX/music, captions, titles, evidence
  cards, selected-range/full preview, stitching, encoding, and delivery.
- Godot may receive narration timing and emit cue/viseme events or scratch audio,
  but the authoritative mix remains editable outside the shot renderer.
- The default interchange is a complete visual shot master plus proxy and cue
  transcript. Alpha, foreground/transition matte, ID matte, depth/plane-index,
  isolated-character, or debug passes are optional and requested only when an
  accepted editorial operation needs them.
- Determinism is judged by decoded-frame equivalence. B2-WP1 may begin with an
  image sequence; B2-WP6 must benchmark that against a lossless intra-frame shot
  container plus proxy before fixing the production transport.

## Rejected decisions

- Godot as the whole 20-minute editor, audio mixer, caption tool, and delivery
  application.
- Remotion independently rebuilding Godot's shot camera, environment layers, or
  foreground occlusion.
- Transparent character-only output as the default production contract.
- One giant Godot timeline or one `AnimationPlayer` for the episode.
- Copying the reference's source, art, characters, or specific animation.

## First proof

B2-WP1 must prove two independent complete Godot shots totaling 8–12 seconds,
then let Remotion reorder, trim, transition, caption, and globally mix them
without rerendering Godot. Changing only Shot B must leave Shot A's output hash
unchanged. This is the smallest honest test of the final architecture.
