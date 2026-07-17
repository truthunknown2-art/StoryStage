# Reference direction study

This study extracts directing grammar from the two user-supplied references. It does **not** copy their characters, artwork, layouts, scripts, or channel identity. The implementation target is an original StoryStage system that can reproduce the underlying production discipline with project-owned assets.

## Method

- Source A: Mister Kipley, “We're Going on a Dragon Hunt 2” (3:18).
- Source B: Sticko Explains, “Your Teen Tells Their Best Friend This Instead Of You” (12:20).
- Decoded samples: every 5 seconds for Source A, every 20 seconds for Source B, and every second for each opening 30 seconds (137 sampled frames in total).
- Automated scene-change pass: ffmpeg `scdet` at threshold 8. This is useful as a relative hard-reset measure; it under-counts animated reframes and may over-count high-motion transitions.
- Reference videos and derived frame sheets remain under ignored `artifacts/reference-study/`. They are analysis evidence, never production assets.

## What the references are actually doing

### Kids adventure / movement song

The look is driven by reusable production pieces, not constant one-off illustration.

- Two persistent 2D character rigs carry the episode through pose swaps: run, crouch, swim, listen, react, point, hide, and celebrate.
- Rich painted environments do most of the visual-quality work. Foreground leaf layers repeatedly cross the characters to create depth without 3D.
- The director alternates wide geography, medium two-shots, single-character reaction close-ups, prop/creature reveals, and environmental inserts.
- Large foreground wipes and occlusion passes hide pose and set changes. The motion feels continuous even when the underlying character art is swapping.
- Repetition is intentional: repeated movement loops let children follow along, while facial reactions and camera scale changes keep the loop from feeling frozen.
- The opening spends roughly ten seconds on title/reveal choreography, then shifts into a readable action cycle. Threat or discovery beats receive tighter framings and stronger contrast.
- The threshold-8 detector found 29 hard visual resets after the opening, with a median detected interval of about 2.7 seconds and a mean of 4.5 seconds. The real perceptual beat rate is faster because pose changes and foreground passes often occur inside a shot.

### Fast editorial explainer

The character art is intentionally minimal. Modernity comes from editorial velocity and compositing variety.

- Stick characters are a reusable symbolic rig, not the whole visual language.
- The visual idea changes constantly: full-body stick performance, face close-up, diagram, oversized keyword, prop gag, photo/stock background, cutout object, simple set, icon, chart-like metaphor, or negative-space pause.
- A restrained base palette makes red emphasis words, warnings, emotional heat, and selected props land immediately.
- Typography is treated as a shot, not a subtitle layer. One phrase can occupy the whole frame; a highlighted word can be the visual punchline.
- Photos and stock-like images are usually subordinated with blur, crop, tint, or simplified stick overlays so the channel identity remains consistent.
- Hard cuts and abrupt spatial resets dominate. Transitions are sparse and motivated; pace comes from new visual ideas, not decorative wipes.
- The threshold-8 detector found 314 hard visual resets, with a median detected interval of about 1.75 seconds and a mean of 2.35 seconds across the 12:20 episode.

## Original StoryStage directing profiles

### `kids-adventure-v1`

Purpose: movement songs, narrated adventures, and young-audience stories.

- Editorial beat target: 2.5–5 seconds, with longer 5–8 second movement loops when the audience must copy an action.
- Shot mix target: 25% wides, 40% mediums/two-shots, 25% close reactions, 10% inserts or creature reveals.
- Camera: gentle pushes, lateral tracking, foreground occlusion wipes, selective crash-in for surprise, and stable horizons.
- Performance: at least one readable pose or expression change every 1–2 seconds; listening characters must react.
- Sets: one rich layered background may support several shots, but framing, depth layers, and foreground passes must vary.
- Text: title cards and short participation cues only. Dialogue captions are a delivery/accessibility choice, not the main composition.
- Asset routing: recurring generated characters become approved rigs; generated backgrounds become depth-separated set plates; one-off creatures and props become cutouts; 3D is exceptional.
- Audio: actions and cuts align to lyric, beat, or narrated verb. Movement loops must expose repeatable counts.
- Gate: silhouettes readable at thumbnail size, no accidental anatomy drift, no static talking tableau longer than four seconds, and recurring identity checks pass.

### `weird-history-editorial-v1`

Purpose: Frankly Weird History and other fast narrated explainers.

- Editorial beat target: 1.2–3.0 seconds; a shot may hold longer only when internal typography, prop, crop, or pose events keep producing new information.
- Shot mix target: 15% establishing/set shots, 25% character performance, 20% close reaction, 20% kinetic type/diagram, 20% insert/photo/archival/prop.
- Camera: mostly hard cuts; short pushes and pans emphasize a claim; layout resets are preferred over ornamental transitions.
- Performance: economical stick/cutout poses, frequent eye/face changes, narrator-avatar returns as a visual anchor, and reaction shots used as punctuation.
- Sets: sparse neutral stage plus heavily cropped/tinted contextual photos, maps, documents, and generated reconstructions.
- Text: one short idea at a time; accent color marks the operative word. Text must change composition, not merely repeat narration.
- Asset routing: factual archival media requires an approved licensed source; generated imagery is labeled reconstruction/illustration; stock is transformed into a consistent editorial layer; speculative images never masquerade as evidence.
- Audio: visual resets follow clause boundaries and punch words. Short semantic SFX punctuate reveals; music provides bed and escalation without dictating every cut.
- Gate: no unchanged visual idea longer than four seconds, factual-source provenance present, text readable in under one second, and at least three visual modes per 30 seconds.

## Product consequences

1. StoryStage needs one plan/compiler/renderer with versioned directing profiles, not two unrelated applications.
2. A show pack must contain art assets **and** directing policy: shot distributions, cadence, transition limits, text policy, asset-routing rules, audio rhythm, and quality checks.
3. A single “intensity” slider is too vague. Replace it with named production presets whose effects are inspectable: `Draft`, `Standard`, and `Hero`, plus per-profile pace and motion controls.
4. Generated assets must be approved and converted into deterministic local assets before final rendering. The renderer must never call an image model.
5. New Production must begin with project type and show-pack selection, because those choices alter planning before a shot exists.
