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

## Ollo three-view turnaround candidate B

Candidate B is the current source-acquisition candidate for the front, profile-left, and profile-right review set. It is still unapproved, is not a separated rig, and is not production-bindable.

Reference roles:

- Identity authority: `C:\Projects\.codex-remote-attachments\019f6dc3-6859-79d1-960a-fc69c9e275d9\ccd4a098-d7a1-4f52-9381-07fabcb1fd0d\1-Photo-1.jpg`; SHA-256 `0950d7043347528a302de5d70f36736dcfbec1f9e0177296756e91b96fbc846f`; `1280x960`; 126956 bytes. This is the only character-identity authority.
- Material/texture direction only: `C:\Users\pbirc\Downloads\e44ea5c3-4cb0-4f13-803a-d2a38b2e5162.png`; SHA-256 `d8fb05e2eeb63b2d8a1397f4aa43a5c4ad28d3cac333ce5b48f0a9bb7b41c30d`; `1536x1024`; 2940395 bytes. Its alternate rabbit design is explicitly not identity authority.

Exact built-in image-generation prompt:

```text
Use case: stylized-concept
Asset type: production character turnaround source for a layered 2D animation rig
Primary request: Create a clean three-view orthographic turnaround of Ollo, the exact pale golden leaf-eared child character from Image 1.
Input images: Image 1 is the ONLY character identity authority. Preserve Ollo's exact species ambiguity, face, huge upright orange leaf-shaped ears with visible pale veins, three small forehead tufts, pale cream/golden body, dark oval eyes, orange nose and paws, small tail, deep red scarf, and red front pocket/apron. Image 2 is MATERIAL/TEXTURE guidance only: borrow its tactile cut-paper collage, watercolor wash, felt, fabric, and paper-grain treatment. Explicitly ignore and do not copy the rabbit redesign of Ollo shown in Image 2.
Scene/backdrop: perfectly flat solid #00ff00 chroma-key background for later removal; uniform edge-to-edge with no shadows, gradients, texture, floor plane, reflections, or lighting variation.
Composition/framing: one wide landscape sheet containing exactly three separate full-body views, evenly spaced, all the same head height, foot line, proportions, scale, palette, clothing, and texture: (1) exact straight front view looking forward, (2) exact 90-degree left profile facing screen-left, (3) exact 90-degree right profile facing screen-right. No three-quarter angles. Entire ears, scarf tails, hands, feet, and tail must fit with generous padding and no overlap between views.
Pose: neutral rigging pose, upright and balanced, both feet flat and parallel, arms relaxed slightly away from torso so shoulder/elbow/wrist silhouettes are separable, hands open and visible, mouth closed in a tiny neutral smile, eyes open, brows neutral. The left and right profiles must be true mirrored anatomical views, not front-facing faces pasted on sideways bodies.
Style/medium: professional children's animation model sheet; layered cut-paper collage and gentle watercolor/felt texture; crisp readable silhouettes; restrained internal texture; animation-friendly part boundaries.
Constraints: Ollo from Image 1 only; exact same character in all three views; no redesign; no rabbit ears; no pose variation; no action; no props; no ground shadow; no contact shadow; no cast shadow; no text; no labels; no rulers; no borders; no other characters; no watermark. Do not use #00ff00 anywhere in Ollo.
```

Generated chroma plate:

- File: `candidates/ollo-turnaround-candidate-b-chroma.png`
- SHA-256: `ae779f1a2068753a1e40c65ab8509f3e65f7dff41fe84560addd81a73c3a1a7d`
- Dimensions: `1774x887`
- Byte length: 1703180

The built-in image helper also produced `candidates/ollo-turnaround-candidate-b-alpha.png` using:

```powershell
C:\Users\pbirc\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe C:\Users\pbirc\.codex\skills\.system\imagegen\scripts\remove_chroma_key.py --input reports\evidence\KCAST-001\candidates\ollo-turnaround-candidate-b-chroma.png --out reports\evidence\KCAST-001\candidates\ollo-turnaround-candidate-b-alpha.png --auto-key border --soft-matte --transparent-threshold 12 --opaque-threshold 220 --despill
```

That helper measured key `#03f807` and reported 1,046,627 transparent, 8,081 partial-alpha, and 518,830 opaque pixels. Its output SHA-256 is `709317090e7a482e753e22e4e399389142727bc22c965d1d4bcf597ad2784277`, dimensions are `1774x887`, and byte length is 1201209. It remains an **untrusted visual companion only** because the helper is outside StoryStage's production pipeline.

The canonical acquisition alpha is independently re-derived by repository code:

```powershell
pnpm --dir packages/asset-pipeline chroma-key:atlas -- ..\..\reports\evidence\KCAST-001\candidates\ollo-turnaround-candidate-b-chroma.png ..\..\reports\evidence\KCAST-001\candidates\ollo-turnaround-candidate-b-alpha-repo.png
```

- File: `candidates/ollo-turnaround-candidate-b-alpha-repo.png`
- SHA-256: `38d0321cfcb1daaf564b676c19fe65d2a3c0172ac1b378fe4a4b13076de9b0ec`
- Dimensions: `1774x887`
- Byte length: 1131309
- Processor: `border-median-soft-distance-matte@1.0.0`, Sharp `0.34.5`, border stride 24, transparent radius 40, opaque radius 225, PNG compression 9 with adaptive filtering and no palette.
- Measured key: `#05f708`; 1,047,216 transparent, 12,001 partial-alpha, and 514,321 opaque pixels.
- The KCAST proof re-derives these bytes from the chroma plate and requires byte equality before it stages them. This does not claim equivalence with the external helper's different matte.

Deterministic review crops from the reopened staged canonical alpha:

| View                               | Exact crop `(x,y,w,h)` | Output                                                  | SHA-256                                                            | Content bounds  | Boundary touch |
| ---------------------------------- | ---------------------- | ------------------------------------------------------- | ------------------------------------------------------------------ | --------------- | -------------- |
| front                              | `96,16,528,832`        | `derived/ollo-turnaround-candidate-b-front.png`         | `4e4dc1a16caf4ff5f0bad85979921db1c14cc01969a8406648efefd778417ce7` | `36,23,477,781` | false          |
| profile-left (faces screen-left)   | `680,16,448,832`       | `derived/ollo-turnaround-candidate-b-profile-left.png`  | `c91d7319470e6786750c78ab9cf23824a272fbd08d5238ed21107a2e83b37214` | `44,17,351,787` | false          |
| profile-right (faces screen-right) | `1150,16,448,832`      | `derived/ollo-turnaround-candidate-b-profile-right.png` | `0204f3b83e731b4d914020a360f943001102b539f8d265343525a675e9614314` | `26,17,358,787` | false          |

The crops use `sharp-exact-review-crop@1.0.0`, Sharp `0.34.5`, PNG compression 9, adaptive filtering disabled, palette disabled, and effort 10. They are identity/registration review images, not `parts-*` or `face-*` returns.

Source-acquisition evidence:

- Candidate bundle: `ollo-turnaround-candidate-bundle-b.json`; content hash `5809cee2128a65bf1bb33cecba40c267a01d61426bab871f2799d3adfe72d4ba`.
- Staging report: `ollo-turnaround-staging-report-b.json`; content hash `6b48a2e902c1a7126711c9b15006004f1ac1c0277a9830388d82c0e6251f304f`.
- View evidence: `ollo-turnaround-view-evidence-b.json`; content hash `cb68cc47c2a9f6356389703f5fcab4bfdca0d5aa7e1aeb9273af38992d1b82f9`.
- Proof command: `pnpm --filter @storystage/asset-pipeline proof:kcast001c-source`.
- Result: the one exact canonical turnaround source stages through `stageCharacterRigCandidateBundle()`, is reopened from its content-addressed private staging location, and yields three byte-deterministic review crops.

Remaining visual and rig caveats:

- The three requested review directions are acquired, but the canonical turnaround-item instruction also requests a three-quarter and rear view. Those two instruction views are absent, so turnaround instruction coverage is not complete.
- Each view is one flattened full-body illustration. It does not provide the canonical 29 separated anatomical parts, the 13 legal face/exposure targets, joints, pivots, sockets, overlap margins, or rear occlusion art.
- The profiles visibly merge or hide far-side limbs. They cannot be mechanically relabelled as valid separated side-view parts.
- Left and right profiles are not pixel mirrors: ear overlap, scarf tail, pocket, face, and tail constructions differ. A human must decide whether the differences are intentional anatomical/costume perspective or identity drift.
- The matte is suitable for review, but edge texture/despill still needs inspection at animation scale before any downstream component extraction.
- No complete import receipt or prepared-view manifest can be created from this partial bundle. Front/profile parts kits and face kits remain missing.
- No moving diagnostic exists yet. Even after all three articulated views are prepared and assembled, Preston's explicit moving-diagnostic approval remains mandatory before production binding.

## Safe-intake evidence

- Request: `ollo-rig-request-v1.json`
- Candidate bundle: `ollo-turnaround-candidate-bundle-a.json`
- Staging report: `ollo-turnaround-staging-report-a.json`
- Proof command: `pnpm --filter @storystage/asset-pipeline proof:kcast001b-intake`
- Result: exact turnaround bytes stage successfully as `incomplete`, with six rig-ready sheets still missing, `providerAuthority: false`, and `approvalRequired: true`.
