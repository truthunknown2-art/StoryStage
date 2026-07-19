# KCAST-001 source-generation record

These files are **unapproved source candidates**. They do not become production assets merely because they were produced by an image model or committed to Git.

## Tool boundary

- Generation path: OpenAI built-in image generation through Codex.
- API key: not used.
- ChatGPT account credentials/session: not stored by StoryStage.
- Provider authority: none.
- Required downstream gates: byte staging, component extraction, pivots/sockets, hierarchy, exposures, moving diagnostic, and Preston approval.

## Ollo turnaround candidate A

- File: `candidates/ollo-turnaround-candidate-a.png`
- SHA-256: `e608a47c8af86b2ca271bb22b7fc8c82454b8a8a5a6e11531d9f876e4f27158e`
- Dimensions: `1774x887`
- Byte length: `1713138`
- Current classification: valid only as an opaque `turnaround-sheet` candidate.
- Review warning: the two side views require human confirmation that they genuinely cover left and right identity rather than repeating one profile construction.

Prompt:

```text
Use case: illustration-story
Asset type: untrusted source turnaround sheet for a production 2D articulated character rig
Primary request: Create a clean five-view turnaround sheet of OLLO only, preserving the exact approved character identity from the reference board.
Input image: the supplied Ollo & Friends board is the identity reference. Ollo is the warm cream/yellow woodland creature with two large upright orange leaf-like ears, small tan eyebrow marks, a tiny three-tuft forelock, big dark brown oval eyes, warm orange nose, small cream muzzle, red scarf with a front pocket, short rounded body, orange hands and feet, and a small tail.
Views required, left-to-right: front, three-quarter facing right, exact right-facing profile, exact left-facing profile, rear.
Style/medium: warm children's storybook watercolor plus layered paper cutout texture; crisp separable silhouette; match the reference proportions, palette, facial construction, scarf, ear asymmetry, and tactile paper texture.
Composition/framing: one horizontal production sheet, all five full-body neutral standing views at exactly the same scale and baseline, generous spacing, no overlaps, no cropping, arms relaxed slightly away from torso, feet visible.
Scene/backdrop: flat uniform warm off-white studio background with no scene, props, shadows, gradients, or floor plane.
Lighting/mood: neutral even reference lighting.
Constraints: Ollo only; exact same character identity in every view; neutral expression; consistent head/body ratio and limb length; profile views must be true profiles; rear view must show back-of-head, scarf, and tail construction; clean contours suitable for later component extraction.
Avoid: extra characters, labels, logos, text, watermark, decorative borders, action poses, perspective distortion, cast shadows, background objects, identity drift, inconsistent costume or colors.
```

## Ollo front parts candidate A

- File: `candidates/ollo-parts-front-candidate-a.png`
- SHA-256: `087af507440a15a9dc0dffcdcda43ec99414ccde4d6af25050805230c73b3330`
- Byte length: `1737328`
- Current classification: untrusted chroma-sheet draft; **not yet a valid `parts-front` return**.
- Reason: the sheet must be measured and human-checked for the exact required component inventory, true upper/lower limb separation, matte quality, crop gutters, and identity consistency. It is intentionally omitted from the current staging bundle until those checks exist.

Prompt:

```text
Use case: illustration-story
Asset type: untrusted front-view separated-parts source sheet for a production 2D articulated rig
Primary request: Create a clean front-view disassembled parts kit of OLLO only, preserving the exact approved identity from the reference board.
Input image: supplied Ollo & Friends board is the exact identity, palette, proportions, paper texture, and costume reference.
Style/medium: warm storybook watercolor with layered paper-cutout texture, crisp production edges.
Scene/backdrop: perfectly flat solid #ff00ff chroma-key background, one uniform color with no texture, shadows, gradients, lighting variation, floor plane, or reflections. Do not use #ff00ff anywhere in the character pieces.
Composition/framing: landscape production sheet with generous uniform gutters. Every part is fully visible, isolated, non-overlapping, uncropped, front-facing, and shown only once. Arrange parts in a neat regular grid without labels.
Required independent pieces: torso with cream belly but without limbs; pelvis/hip body piece; full head with both large upright orange leaf ears and forelock but without facial features; left upper arm; left lower arm; left hand; right upper arm; right lower arm; right hand; left upper leg; left lower leg; left foot; right upper leg; right lower leg; right foot; tail; red scarf front piece with pocket; red scarf back flap; left ear-near decorative overlay; right ear-far decorative overlay.
Constraints: preserve Ollo's exact cream/yellow and orange palette, round proportions, red scarf construction, tactile paper texture; paired limb pieces must be mirrored but individually complete with overlap margin around joints; safety gutters at least one part-width; no whole assembled character; no facial eyes, pupils, brows, or mouth on the head because those are supplied separately.
Avoid: extra characters, assembled poses, labels, letters, numbers, logos, watermark, props, cast shadows, contact shadows, duplicate or missing pieces, touching pieces, crop-edge clipping, perspective, gradients, background variation, identity drift.
```

## Safe-intake evidence

- Request: `ollo-rig-request-v1.json`
- Candidate bundle: `ollo-turnaround-candidate-bundle-a.json`
- Staging report: `ollo-turnaround-staging-report-a.json`
- Proof command: `pnpm --filter @storystage/asset-pipeline proof:kcast001b-intake`
- Result: exact turnaround bytes stage successfully as `incomplete`, with six rig-ready sheets still missing, `providerAuthority: false`, and `approvalRequired: true`.
