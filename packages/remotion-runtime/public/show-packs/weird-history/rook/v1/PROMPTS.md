# Rook v1 generation prompts

These assets were generated with the built-in ChatGPT image tool, not an API key. The outputs remain a candidate set until a human approves identity consistency and a moving diagnostic.

## Identity sheet

Use case: illustration-story  
Asset type: StoryStage recurring presenter canonical identity sheet for an original fast-paced weird-history explainer  
Primary request: Create a production-ready character identity sheet for an original fictional presenter called Rook, an energetic adult historical explainer with an unmistakable but non-celebrity identity. Show four full-body views in one image: front, left three-quarter, right three-quarter, and side profile, plus a compact row of six facial expressions (neutral, delighted, skeptical, alarmed, conspiratorial, deadpan).  
Scene/backdrop: clean warm off-white studio sheet, no environment, no props.  
Subject: compact slightly lanky silhouette, angular swept-back dark hair, expressive eyebrows, cream rolled-sleeve shirt, charcoal high-waist trousers, small vermilion neck scarf, practical dark shoes. Hands must be clear and simple enough to animate.  
Style/medium: original tactile editorial cut-paper illustration with crisp ink contour accents, subtle screenprint grain, bold geometric shapes, limited palette of warm cream, charcoal black, vermilion red, and a tiny muted teal accent. Modern, smart, funny, visually distinct. Do not imitate any named YouTube channel, artist, copyrighted character, or existing mascot.  
Composition/framing: all full-body figures entirely visible with generous spacing, consistent proportions and costume across views; expression heads aligned below. Orthographic reference-sheet clarity rather than a dramatic scene.  
Lighting/mood: even neutral reference lighting, witty and energetic.  
Constraints: exact identity consistency across all views; readable silhouette at thumbnail size; no cropped limbs; no overlapping figures; no labels, letters, captions, logos, signature, border, or watermark; no photorealism; no 3D render; no extra characters; no historical costume.

## Pose derivation template

Each pose used the identity sheet as the authoritative reference and repeated this lock:

> Preserve the exact character identity, face, angular swept-back dark hair, cream rolled-sleeve shirt, vermilion neck scarf, charcoal high-waist trousers, shoes, proportions, palette, ink lines, and tactile screenprint texture. Render one full-body Rook on a perfectly flat solid `#00ff00` chroma-key background with no shadows, gradients, floor, text, watermark, or additional figures. Keep the entire character visible with generous padding and do not use `#00ff00` in the subject.

The individual actions were:

- Neutral: relaxed three-quarter stance, arms resting naturally, mouth closed, attentive neutral expression.
- Talk: explanatory three-quarter pose, mouth visibly open mid-syllable, one clear presenting-hand gesture.
- Reaction: skeptical three-quarter reaction, raised eyebrow, doubtful half-frown, slight lean, one hand on hip and one palm turned up.

Chroma removal used the built-in image skill's local `remove_chroma_key.py` helper with border auto-keying, soft matte, thresholds 12/220, and despill. All three outputs have transparent corners and zero detected bright-green edge pixels.
