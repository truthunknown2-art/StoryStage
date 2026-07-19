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

- Candidate bundle: `ollo-turnaround-candidate-bundle-b.json`; content hash `d402889f59b483add770b58f9f1b619822a388a7a5d0b02632777d4ea99afc84`.
- Staging report: `ollo-turnaround-staging-report-b.json`; content hash `832e0bcad358939c3f46209b3beb8736452013f7cba1d96182a7a6e0fcc0fd76`.
- View evidence: `ollo-turnaround-view-evidence-b.json`; content hash `1e8dca9a0d3ce48d1115cf5baf6a06142d5ce109242fc8053a8eb50bf137bf1c`.
- Self-hashed coverage evidence: `ollo-turnaround-coverage-evidence-b-v1.json`; evidence hash `b0b7c8a0d52e0a8e960e067cb9f3b723d26ed0668e176a31566b745d74d586a0`; exact file hash `91860ac41e83e2bdc1e4653f3e6781db541f0bc35e9681ba2ebf5523a831f4a1`.
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

## Ollo front rig-source candidate C

Candidate C replaces the rejected single-sheet attempt with four smaller, fixed-grid source tasks. The raw sheets remain untrusted generation outputs. Repository code must reopen the exact bytes, remove chroma, extract only declared cells, record source rectangles and hashes, and compose the canonical parts and face atlases before either atlas may enter staging.

The fail-closed fixed-grid proof subsequently rejected candidate-C core, limb, and eye sheets: core and eye foreground crossed mathematical equal-cell boundaries, and `hand-right` in the limb sheet left only one transparent pixel before its boundary. Those three sheets remain preserved as rejected evidence. The candidate-C mouth sheet passed geometric isolation but remains semantically conditional pending an explicit ruling on its combined nose, muzzle, and mouth replacement-patch construction.

Reference roles for all four generations:

- Identity authority: the original Ollo & Friends board at `C:\Projects\.codex-remote-attachments\019f6dc3-6859-79d1-960a-fc69c9e275d9\ccd4a098-d7a1-4f52-9381-07fabcb1fd0d\1-Photo-1.jpg`.
- Registration authority: accepted front review crop `derived/ollo-turnaround-candidate-b-front.png`.
- No alternate rabbit, human, or inferred hidden anatomy is authoritative.

The first 5-by-4 attempt is preserved as `candidates/ollo-parts-front-candidate-b-rejected-fused.png`; SHA-256 `5e9e27fe832e030bb8490af6684cb1e21e59ccc2171ccca04582cfbabd39b1af`; `1536x1024`; 1,846,922 bytes. It is rejected because the torso visibly includes costume and leg anatomy and multiple arm cells fuse hands into limb segments. It must never enter staging.

### Core and costume sheet

- File: `candidates/ollo-parts-front-core-candidate-c-chroma.png`
- SHA-256: `939d9f98be6e5812d12c0da04c123bab3697717fd459c6a6c057c0f363d62b01`
- Dimensions: `1536x1024`
- Byte length: 1,750,649
- Declared grid: 4 columns by 2 rows
- Declared order: torso, pelvis, head, tail, ear-left, ear-right, secondary-front, secondary-back

Exact built-in image-generation prompt:

```text
Use case: stylized-concept
Asset type: explicit separated FRONT core-and-costume source sheet for Ollo's production 2D articulated rig
Identity authority: Image 1 is the original Ollo identity board. Registration authority: Image 2 is the accepted neutral straight-front Ollo source. Preserve exactly the same pale golden species-ambiguous child, proportions, huge orange leaf ears, three forehead tufts, paper/watercolor/felt materials, deep red scarf and front pocket. Do not redesign as rabbit or human.

Create a landscape sheet with a perfectly uniform edge-to-edge #ff00ff background. No shadows, floor, gradients, texture in the background, text, labels, guides, borders, logos, or watermark. Do not use #ff00ff in the pieces.

Use an exact 4-column x 2-row invisible grid with generous uniform gutters. Place exactly one isolated component in each cell in this order:
ROW 1: torso; pelvis; head shell; tail.
ROW 2: left ear; right ear; front scarf-and-pocket layer; back scarf-and-trailing-tail layer.

STRICT component definitions:
1 torso = pale-golden chest/abdomen shell with cream belly marking only; NO pelvis, legs, arms, hands, head, ears, scarf, collar, pocket, or tail.
2 pelvis = compact pale-golden hip shell only; NO torso, belly, legs, feet, scarf, or tail.
3 head shell = Ollo's round pale-golden head and three forehead tufts only; NO ears and NO facial features at all: no eyes, pupils, eyelids, brows, nose, muzzle line, cheeks, or mouth.
4 tail = Ollo's small pale-golden tail only.
5 and 6 ears = two distinct complete anatomical leaf ears, front-facing, orange inner leaf with pale veins, unattached.
7 front costume = only Ollo's deep-red front scarf/collar plus front pocket/apron construction, no body.
8 back costume = only deep-red rear scarf collar plus trailing scarf tail/flap, no body.

Every component must be front-view, fully visible, isolated, non-overlapping, uncropped, surrounded by at least one component-width of magenta gutter, with crisp production edges and restrained paper grain. Jointed attachment pieces need small hidden overlap tabs. Exactly 8 pieces, no duplicates or extras.
Avoid: assembled character, attached anatomy, fused costume/body, face graphics on head shell, human anatomy, rabbit redesign, action pose, perspective, cast/contact shadows, touching pieces, crop clipping.
```

### Limb sheet

- File: `candidates/ollo-parts-front-limbs-candidate-c-chroma.png`
- SHA-256: `0349707a411a9eeb5cde7516ee8264953ef92098d1b0f585b0c4e27715f654f9`
- Dimensions: `1672x941`
- Byte length: 1,350,459
- Declared grid: 6 columns by 2 rows
- Declared order: upper-arm-left, lower-arm-left, hand-left, upper-arm-right, lower-arm-right, hand-right, upper-leg-left, lower-leg-left, foot-left, upper-leg-right, lower-leg-right, foot-right

Exact built-in image-generation prompt:

```text
Use case: stylized-concept
Asset type: explicit separated FRONT limb source sheet for Ollo's production 2D articulated rig
Identity authority: Image 1 is the original Ollo identity board. Registration authority: Image 2 is the accepted neutral straight-front Ollo source. Preserve Ollo's exact pale-golden species-ambiguous child identity, orange paws, round proportions, and tactile paper/watercolor/felt material. Do not redesign as rabbit or human.

Create a wide landscape sheet with a perfectly uniform edge-to-edge #ff00ff chroma background. No floor, shadows, gradients, background texture, labels, text, numbers, guides, borders, logos, or watermark. Do not use #ff00ff in any piece.

Use an exact 6-column x 2-row invisible grid with wide uniform gutters. Place exactly one isolated component in each cell in this exact order:
ROW 1: left upper arm; left lower arm; left hand; right upper arm; right lower arm; right hand.
ROW 2: left upper leg; left lower leg; left foot; right upper leg; right lower leg; right foot.

STRICT:
- Exactly 12 pieces, no assembled character, no duplicates, no extras.
- Upper-arm pieces are shoulder-to-elbow tubes ONLY, with NO lower arm and NO hand.
- Lower-arm pieces are elbow-to-wrist tubes ONLY, with NO upper arm and NO hand.
- Hand pieces are small complete orange Ollo paws ONLY, with NO arm attached.
- Upper-leg pieces are hip-to-knee tubes ONLY, with NO lower leg and NO foot.
- Lower-leg pieces are knee-to-ankle tubes ONLY, with NO upper leg and NO foot.
- Foot pieces are small complete orange Ollo feet ONLY, with NO leg attached.
- Every segment has clean rounded overlap tabs extending slightly beyond both joint boundaries so rotation cannot open seams.
- Anatomical left/right art is distinct and front-view; do not substitute one reused or mirrored item.
- All pieces fully visible, centered in their cells, isolated, non-overlapping, uncropped, and surrounded by at least one piece-width of magenta gutter.
- Match Ollo's accepted front-view scale relationships: short childlike limbs, warm cream/golden fur-paper, orange paw tips, crisp cut-paper silhouettes and restrained grain.
Avoid: hands fused to arms, feet fused to legs, entire limbs, human fingers, realistic human anatomy, rabbit redesign, action pose, perspective, cast/contact shadows, touching pieces, crop clipping.
```

### Eye, lid, and brow sheet

- File: `candidates/ollo-face-front-eyes-candidate-c-chroma.png`
- SHA-256: `65c568d88c21e7c89f7d8cd9863e8da6119e568b1c06242389bca1c33ddcb875`
- Dimensions: `1774x887`
- Byte length: 1,186,316
- Declared grid: 7 columns by 2 rows
- Declared order: eye-white-left, pupil-left, lid-open-left, lid-half-left, lid-closed-left, brow-neutral-left, brow-raised-left, eye-white-right, pupil-right, lid-open-right, lid-half-right, lid-closed-right, brow-neutral-right, brow-raised-right

Exact built-in image-generation prompt:

```text
Use case: stylized-concept
Asset type: explicit separated FRONT eye/lid/brow component sheet for Ollo's production 2D articulated rig
Identity authority: Image 1 is Ollo's original face identity. Registration authority: Image 2 is the accepted exact front-view head scale and facial design. Preserve the same very large dark-brown oval eyes with cream/off-white eye whites, small warm brows, pale-golden paper texture, and child-friendly proportions. No redesign.

Create one wide landscape sheet on a perfectly uniform edge-to-edge #ff00ff chroma background. No shadows, gradients, background texture, floor, labels, text, numbers, guides, borders, logos, watermark, head, face, nose, mouth, ears, character, or props. Do not use #ff00ff in the components.

Use an exact 7-column x 2-row invisible grid with wide uniform gutters. Exactly one isolated component per cell:
ROW 1, anatomical LEFT components: left eye white; left pupil; left open upper-lid overlay; left half-closed lid overlay; left closed-lid line/overlay; left neutral brow; left raised brow.
ROW 2, anatomical RIGHT components: right eye white; right pupil; right open upper-lid overlay; right half-closed lid overlay; right closed-lid line/overlay; right neutral brow; right raised brow.

STRICT:
- Exactly 14 isolated pieces, no duplicates, no extras.
- The first and second rows must form distinct anatomical left/right pairs that match Ollo's accepted straight-front face, not reused mirror placeholders.
- Eye whites contain no pupils.
- Pupils are dark-brown Ollo pupils only, with the same tiny warm highlight treatment.
- Lid overlays contain only the eyelid shape or closed-eye stroke, no eye white or pupil.
- Brow pieces contain only the small warm-brown eyebrow shape.
- All variants for each side share consistent size, position logic, line weight, and material texture so they can be registration-aligned downstream.
- Every piece fully visible, isolated, non-overlapping, uncropped, centered in its cell, with large clean magenta gutters and crisp production edges.
Avoid: full eye assemblies, face/head, text, labels, human eyelashes, photorealism, random expressions, touching pieces, crop clipping, cast/contact shadows.
```

### Mouth and viseme sheet

- File: `candidates/ollo-face-front-mouths-candidate-c-chroma.png`
- SHA-256: `af31dc7fcc64dc25c82a1061d0faa04db8f7e7ccea2d1daf638044f7e80690d5`
- Dimensions: `1448x1086`
- Byte length: 1,125,541
- Declared grid: 4 columns by 2 rows
- Declared order: mouth-rest, viseme-ai, viseme-e, viseme-mbp, viseme-oh, viseme-fv, viseme-l, viseme-wq

Exact built-in image-generation prompt:

```text
Use case: stylized-concept
Asset type: explicit separated FRONT mouth/viseme source sheet for Ollo's production 2D articulated rig
Identity authority: Image 1 is Ollo's original mouth and muzzle identity. Registration authority: Image 2 is the accepted exact front-view face scale. Preserve Ollo's tiny warm child-friendly mouth construction, dark cocoa linework, small cream muzzle area only when needed for a clean replacement edge, and the same tactile paper/watercolor material. No redesign.

Create one landscape sheet on a perfectly uniform edge-to-edge #ff00ff chroma background. No shadows, gradients, background texture, floor, text, labels, phoneme letters, numbers, guides, borders, logos, watermark, head, eyes, brows, nose, ears, character, or props. Do not use #ff00ff in the components.

Use an exact 4-column x 2-row invisible grid with wide uniform gutters. Exactly one isolated mouth component per cell:
ROW 1: neutral closed tiny smile (mouth-rest); wide open A/I viseme; horizontal E viseme; closed-lips M/B/P viseme.
ROW 2: round O/H viseme; lower-lip-to-upper-teeth F/V viseme; tongue-to-upper-mouth L viseme; small pursed W/Q viseme.

STRICT:
- Exactly 8 mouth pieces, no duplicates or extras.
- Each cell contains only the replaceable mouth/muzzle graphic, never a whole face or head.
- All eight variants share the exact same center, scale family, palette, line weight, and replacement-canvas logic for registration.
- Shapes must be visually distinct and animation-readable at small size while remaining unmistakably Ollo, not realistic human lips.
- Neutral rest is a tiny closed smile; A/I is vertically open; E is horizontally stretched; M/B/P fully closed; O/H rounded; F/V shows a simplified lower-lip/upper-tooth contact; L shows a simple tongue cue; W/Q is small and pursed.
- Fully visible, isolated, non-overlapping, uncropped, centered with large clean magenta gutters and crisp production edges.
Avoid: text or letters, labels, full faces, photorealistic human mouths/teeth, gore, random expressions, touching pieces, crop clipping, cast/contact shadows.
```

Candidate C is not accepted merely because every requested grid cell is occupied. Independent visual audit, deterministic crop/matte evidence, identity review, registration review, complete bundle staging, preparation, moving diagnostic, and Preston approval remain mandatory.

## Ollo front rig-source candidate D geometry corrections

Candidate D changes only the rejected core, limb, and eye source tasks. Components are reduced and centered inside true equal-grid safety gutters. The candidate-C mouth sheet remains the proposed mouth source until its replacement-patch semantics receive an explicit ruling.

### Candidate-D core and costume sheet

- File: `candidates/ollo-parts-front-core-candidate-d-chroma.png`
- SHA-256: `8678f1b4813bb02ff7d6eb2a3885dac7d5677cebd4555a9b3e1a31862793219d`
- Dimensions: `1536x1024`
- Byte length: 1,488,702

Exact built-in image-edit prompt:

```text
Edit/rebuild Image 1 as a stricter machine-extractable version of the same Ollo core-and-costume sheet. Image 2 remains the only identity authority; Image 3 remains front registration guidance.

Keep exactly the same eight independent components and exact row-major meaning:
4 equal columns x 2 equal rows.
ROW 1: torso; pelvis; head shell; tail.
ROW 2: anatomical left ear; anatomical right ear; front scarf-and-pocket layer; back scarf-and-trailing-tail layer.

CRITICAL GEOMETRY CORRECTION:
- Reduce every component uniformly enough that it fits well inside its mathematical equal cell.
- The entire sheet must have four exactly equal columns and two exactly equal rows.
- Leave a continuous, perfectly empty #ff00ff safety band at least 48 pixels wide centered on every internal vertical boundary at 25%, 50%, and 75% of image width, and at least 48 pixels high centered on the horizontal 50% boundary.
- Leave at least 48 pixels of empty #ff00ff around the outer sheet boundary.
- No foreground, antialiasing, paper grain, tab, scarf tip, head tuft, cheek tuft, or ear may enter any safety band.
- Center exactly one complete component in each cell. No piece may cross, touch, or approach a cell boundary.
- Keep useful hidden overlap tabs, but shorten them so they remain inside their cell.
- Preserve each piece fully; no cropping.

Background must be perfectly flat uniform edge-to-edge #ff00ff, no shadows, texture, gradients, floor, labels, text, numbers, grid lines, borders, guides, logos, or watermark. No #ff00ff in pieces.
Preserve Ollo's exact pale-golden paper/watercolor/felt material, proportions, orange leaf ears, blank head shell with no face, small tail, and deep-red costume. Exactly 8 pieces, no duplicates/extras, no assembled character, no fused body/costume.
```

### Candidate-D limb sheet

- File: `candidates/ollo-parts-front-limbs-candidate-d-chroma.png`
- SHA-256: `d6ce2cea45a00ed7ee2447df86d3e6efa05d9a996b4722a11e86c49b7ac406b8`
- Dimensions: `1672x941`
- Byte length: 1,237,624

Exact built-in image-edit prompt:

```text
Edit/rebuild Image 1 as a stricter machine-extractable Ollo FRONT limb sheet. Image 2 remains the only identity authority; Image 3 remains front registration guidance.

Keep exactly 12 independent components and exact row-major meaning in a 6 equal-column x 2 equal-row sheet:
ROW 1: left upper arm; left lower arm; left hand; right upper arm; right lower arm; right hand.
ROW 2: left upper leg; left lower leg; left foot; right upper leg; right lower leg; right foot.

CRITICAL GEOMETRY AND IDENTITY CORRECTION:
- Reduce every component by roughly 15-20% and center it well inside its mathematical equal cell.
- Leave a continuous perfectly empty #ff00ff safety band at least 40 pixels wide centered on every internal vertical column boundary and at least 48 pixels high centered on the horizontal row boundary.
- Leave at least 48 pixels of empty #ff00ff around the full sheet boundary.
- No foreground, antialiasing, paper grain, joint tab, paw, toe, or limb may enter any safety band.
- No clipping, crossing, touching, or near-boundary content.
- Preserve true separate upper/lower limb segments and useful short rounded overlap tabs.
- Hands must match approved Ollo's simple child-friendly FOUR-DIGIT mitten-paw construction: three rounded front fingers plus one side thumb, exactly four digit lobes total. No five-finger or five-lobed human-like hand.
- Feet remain small simplified Ollo paws, not human feet.
- Left and right components must be independently drawn anatomical counterparts with small natural paper-texture/asymmetry differences; never identical duplicates and never one mechanically mirrored source.

Background perfectly flat uniform edge-to-edge #ff00ff, no texture, shadows, gradients, floor, text, labels, numbers, grid lines, borders, guides, logos, or watermark. No #ff00ff in pieces.
Preserve Ollo's pale-golden/cream paper-watercolor-felt material and warm orange paws. Exactly 12 pieces, no duplicates/extras, no assembled character, no fused hands/arms or feet/legs.
```

### Candidate-D eye, lid, and brow sheet

- File: `candidates/ollo-face-front-eyes-candidate-d-chroma.png`
- SHA-256: `c01c4445d7a031806f850f9a2fa55ed206ba3100bdefb7a91c724da83140b453`
- Dimensions: `1774x887`
- Byte length: 1,075,373

Exact built-in image-edit prompt:

```text
Edit/rebuild Image 1 as a stricter machine-extractable version of the same Ollo eye/lid/brow sheet. Image 2 is the only identity authority; Image 3 is front registration guidance.

Keep exactly 14 independent components with the same exact row-major meaning in a 7 equal-column x 2 equal-row sheet:
ROW 1 left: eye white; pupil; open lid; half-closed lid; closed lid; neutral brow; raised brow.
ROW 2 right: eye white; pupil; open lid; half-closed lid; closed lid; neutral brow; raised brow.

CRITICAL GEOMETRY CORRECTION:
- Reduce every component by roughly 30% while preserving its shape, style, and readability.
- The sheet has seven exactly equal mathematical columns and two equal rows.
- Center one complete component in each cell.
- Leave a continuous perfectly empty #ff00ff safety band at least 32 pixels wide centered on every internal vertical column boundary, and at least 48 pixels high centered on the horizontal row boundary.
- Leave at least 48 pixels of empty #ff00ff around the full outer boundary.
- No foreground, antialiasing, highlight, lid arc, brow, linework, or paper grain may enter any boundary safety band.
- No component may cross, touch, or approach another cell. No cropping.

Background is perfectly flat uniform edge-to-edge #ff00ff with no texture, shadows, gradients, floor, text, labels, numbers, grid lines, borders, guides, logos, or watermark. No #ff00ff in components.
Preserve Ollo's exact eye identity and tactile paper/watercolor material. Eye whites have no pupils; pupils are separate; lids contain only lid art; brows contain only brow art; left/right are distinct. Exactly 14 pieces, no duplicates/extras, no face/head/nose/mouth/ears.
```

Candidate D remains an unapproved, provider-neutral source candidate. Passing cell isolation does not prove identity, scale, head registration, or production authority.

## Candidate E surgical cell corrections

Candidate E is a surgical edit of the candidate-D limb and eye sheets. The limb edit introduces the Pro-required four-digit mitten paw and moves the right hand away from the preceding cell. The eye edit reduces and recenters the half-lid cells. These files remain raw untrusted sources; exact sealed rectangles may be used when a generator's semantic grid does not land on mathematical equal-cell boundaries.

- Limb file: `candidates/ollo-parts-front-limbs-candidate-e-chroma.png`
- Limb SHA-256: `1f1a6dca2775de25bd402ea250461dc824c157201f55c814053138383a187b21`
- Limb dimensions/bytes: `1672x941`; 1,178,287 bytes
- Eye file: `candidates/ollo-face-front-eyes-candidate-e-chroma.png`
- Eye SHA-256: `c43ba138267c774e5a8e691f006917a33a52664ce06bfc5a9b0688cec20995df`
- Eye dimensions/bytes: `1774x887`; 1,067,566 bytes

Exact limb edit prompt:

```text
Surgical geometry correction to Image 1 only. Preserve the exact 12 Ollo limb pieces, identity, colors, textures, four-digit mitten paws, joint tabs, order, background, and 6 equal columns x 2 equal rows. Image 2 remains identity authority.

The current ROW-1 RIGHT HAND in column 6 is too far left and its antialiased edge crosses into column 5. Correct the sheet as follows:
- Scale both hand pieces down about 15% while preserving four digit lobes.
- Place the left hand exactly at the mathematical center of row 1 column 3.
- Place the right hand exactly at the mathematical center of row 1 column 6; move it substantially to the right so its entire silhouette, tab, antialiasing, and paper grain are at least 48 pixels inside column 6's left and right boundaries.
- Re-center every other component on its mathematical cell center without changing its semantic order.
- Every component, including both hands and feet, must have at least 40 pixels of perfectly empty #ff00ff on all four sides before its cell boundary.
- No foreground pixel or antialiasing may touch or cross a cell boundary.
- Preserve exactly 12 isolated components: row 1 left upper arm, left lower arm, left hand, right upper arm, right lower arm, right hand; row 2 left upper leg, left lower leg, left foot, right upper leg, right lower leg, right foot.
- Keep left/right components independently drawn and visibly distinct; no duplication or mechanical mirror.

Perfectly uniform edge-to-edge #ff00ff background. No text, labels, grid lines, guides, borders, shadows, gradients, floor, extra pieces, cropping, touching, or fused parts.
```

Exact eye edit prompt:

```text
Surgical geometry correction to Image 1 only. Preserve exactly the same 14 Ollo eye/lid/brow pieces, semantic order, identity, colors, texture, two rows, seven equal mathematical columns, and flat #ff00ff background. Image 2 remains identity authority.

The HALF-CLOSED LID pieces in column 4 of both rows are too wide/right-shifted and touch column 4's right boundary. Correct this:
- Scale both half-closed lid pieces down by about 20%.
- Place each exactly at the mathematical center of column 4 in its row.
- Ensure at least 36 pixels of perfectly empty #ff00ff between every edge/antialiased pixel of each half-lid and both left/right cell boundaries.
- Re-center every other component exactly within its own mathematical cell without changing semantic order or shape.
- Every one of the 14 components must have at least 24 pixels of perfectly empty #ff00ff on all four sides before its cell boundary.
- No foreground, antialiasing, highlight, lid arc, brow, linework, or paper grain may touch or cross any cell boundary.
- Keep distinct anatomical left/right artwork, not identical duplicates or mechanical mirrors.

Exact order remains:
Row 1 left: eye white, pupil, open lid, half-closed lid, closed lid, neutral brow, raised brow.
Row 2 right: eye white, pupil, open lid, half-closed lid, closed lid, neutral brow, raised brow.

Perfectly uniform edge-to-edge #ff00ff. No text, labels, guides, grid lines, borders, shadows, gradients, head, face, nose, mouth, ears, extra components, touching, or cropping.
```

## Candidate F atomic lower-face sources

Candidate F implements Pro's accepted exclusive lower-face replacement-patch strategy using one generated mouthless nose/muzzle base plus one mouth-only overlay sheet. Repository code must reuse the exact same normalized base bytes for every rest/viseme output and prove zero pixel delta outside the declared mouth-change rectangle.

- Base file: `candidates/ollo-face-front-lower-base-candidate-f-chroma.png`
- Base SHA-256: `b20a8c344b74dcd9ee3e4b6c0ca93f305cb0e6e9f1bb75a170b8d13a53c0437c`
- Base dimensions/bytes: `1448x1086`; 1,137,674 bytes
- Overlay file: `candidates/ollo-face-front-mouth-overlays-candidate-f-chroma.png`
- Overlay SHA-256: `2fe8b26f892cf951e74a5a6c9ee75738efedef57481d2994828460b97d365437`
- Overlay dimensions/bytes: `1448x1086`; 1,045,490 bytes

Exact base-generation prompt:

```text
Use case: stylized-concept
Asset type: one static lower-face BASE patch for Ollo's production 2D rig
Image 2 is the only identity authority. Image 3 is front registration guidance. Image 1 supplies the approved candidate-C lower-face paper/watercolor construction only.

Create exactly ONE isolated, straight-front Ollo lower-face base patch: the warm orange oval nose plus the symmetrical pale cream muzzle/cheek shape beneath it. Preserve the tactile cut-paper/watercolor/felt texture and exact child-friendly Ollo style.

CRITICAL: the base patch must have NO MOUTH WHATSOEVER.
- no smile line
- no closed line
- no open mouth
- no lips
- no teeth
- no tongue
- no philtrum or vertical connector line below the nose
- no dark mark beneath the nose
The cream muzzle beneath the nose must be clean, continuous, and unmarked so separate mouth graphics can be composited later.

Place the single patch centered in a landscape image on a perfectly uniform edge-to-edge #ff00ff background with at least one patch-width of clean gutter on every side. No head, eyes, brows, ears, body, character, extra object, shadows, floor, gradients, background texture, text, labels, guides, borders, logos, or watermark. Do not use #ff00ff in the patch. Crisp isolated production edge, no clipping.
```

Exact mouth-overlay generation prompt:

```text
Use case: stylized-concept
Asset type: MOUTH-ONLY overlay source sheet for Ollo's atomic lower-face replacement patches
Image 1 provides the eight approved candidate mouth shapes as visual shape reference. Image 2 is the static nose+muzzle base that will remain pixel-identical. Image 3 is Ollo identity authority.

Create exactly eight isolated MOUTH-ONLY graphics on a perfectly uniform edge-to-edge #ff00ff background, arranged in an exact 4 equal-column x 2 equal-row grid:
ROW 1: neutral closed tiny smile; A/I wide-open mouth; E horizontal mouth; M/B/P fully closed lips.
ROW 2: O/H round mouth; F/V lower-lip-to-upper-teeth mouth; L tongue-to-upper-mouth cue; W/Q small pursed mouth.

ABSOLUTE EXCLUSION:
- NO NOSE in any cell.
- NO CREAM MUZZLE, cheek patch, beige backing shape, or pale face pixels.
- NO philtrum/vertical line extending upward toward a nose.
- NO head, face, eyes, brows, ears, body, character, labels, text, phoneme letters, numbers, guides, grid lines, borders, or extra graphics.
Each cell contains only the dark cocoa/orange mouth line, mouth opening/interior, and any necessary small teeth/tongue/lip pixels.

Registration/geometry:
- Center every mouth at the same relative x position and the same mouth baseline within its equal cell.
- Keep all mouth graphics within a consistent compact scale family suitable for compositing beneath Image 2's nose.
- Leave at least 48 pixels of perfectly empty #ff00ff before every cell boundary; no antialiased pixel may cross or touch a boundary.
- Exactly one mouth graphic per cell, isolated, uncropped, non-overlapping.
- Preserve Ollo's warm tactile paper/watercolor line style; simplified child-friendly shapes, not realistic human lips.
- The eight mouth shapes must be visibly distinct and readable at animation scale.

Perfect flat #ff00ff background, no shadows, gradients, texture, floor, watermark, logo, or cast/contact shadow.
```

Candidate F is not accepted until the repository proves identical patch dimensions, pivot, nose anchor, alpha boundary, and pixels outside one sealed `mouthChangeBounds`, plus the rapid exposure diagnostic required by Pro.

## Safe-intake evidence

- Request: `ollo-rig-request-v1.json`
- Candidate bundle: `ollo-turnaround-candidate-bundle-a.json`
- Staging report: `ollo-turnaround-staging-report-a.json`
- Proof command: `pnpm --filter @storystage/asset-pipeline proof:kcast001b-intake`
- Result: exact turnaround bytes stage successfully as `incomplete`: the sheet is a `partialItem`, three verified crops are persisted, `three-quarter` and `rear` remain `missingSubitems`, six rig-kit files remain missing, `providerAuthority: false`, and `approvalRequired: true`.

## Candidate G profile rig-source attempt

Candidate G is a preserved **rejected source-generation attempt**, not an
accepted profile kit. The exact rasters are committed so the deterministic
profile proof can reopen and reject the same bytes. See
`PROFILE-ATLAS-COMPOSITION.md` for the measured-key and visual-role findings.

Authoritative repository references used by the generation calls:

- profile-left registration/identity review:
  `derived/ollo-turnaround-candidate-b-profile-left.png`;
  SHA-256 `c91d7319470e6786750c78ab9cf23824a272fbd08d5238ed21107a2e83b37214`;
- profile-right registration/identity review:
  `derived/ollo-turnaround-candidate-b-profile-right.png`;
  SHA-256 `0204f3b83e731b4d914020a360f943001102b539f8d265343525a675e9614314`;
- front core material/role reference:
  `candidates/ollo-parts-front-core-candidate-d-chroma.png`;
  SHA-256 `8678f1b4813bb02ff7d6eb2a3885dac7d5677cebd4555a9b3e1a31862793219d`;
- front limb role reference:
  `candidates/ollo-parts-front-limbs-candidate-e-chroma.png`;
  SHA-256 `1f1a6dca2775de25bd402ea250461dc824c157201f55c814053138383a187b21`;
- front eye role reference:
  `candidates/ollo-face-front-eyes-candidate-c-chroma.png`;
  SHA-256 `65c568d88c21e7c89f7d8cd9863e8da6119e568b1c06242389bca1c33ddcb875`;
- front lower-face base:
  `candidates/ollo-face-front-lower-base-candidate-f-chroma.png`;
  SHA-256 `b20a8c344b74dcd9ee3e4b6c0ca93f305cb0e6e9f1bb75a170b8d13a53c0437c`;
- front mouth overlays:
  `candidates/ollo-face-front-mouth-overlays-candidate-f-chroma.png`;
  SHA-256 `2fe8b26f892cf951e74a5a6c9ee75738efedef57481d2994828460b97d365437`.

Three final edits also used built-in-generation intermediate images. They are
not rig evidence and are deliberately not copied into StoryStage, but their
immutable generation-store identifiers and hashes are recorded for provenance:

| Role                                 | Generation-store source                         | SHA-256                                                            |   Bytes |
| ------------------------------------ | ----------------------------------------------- | ------------------------------------------------------------------ | ------: |
| profile-left core edit target        | `exec-e2ba045f-07b3-4e40-8e9a-93cdd2951b9f.png` | `ab408427774bef27e0dea0f23eb112ca41db1ba485672fb4e97964f5d99348fa` | 1690371 |
| profile-left limb edit target        | `exec-f3ffe960-b320-40d7-b25e-4e7e6cc91934.png` | `860ceb07a4f9f9ea8e41e55f2ad9c35c2c8f5b0806a239bc4c232b3d148c4f5e` | 1314530 |
| profile-right lower-face edit target | `exec-752d75b7-68ea-4327-b75b-341ed3aa6857.png` | `650b02ee09f6f0ada5e57c2e8e2c85ea1a56d31fc6eb54cb827562357c16eaf7` | 1353338 |

Exact final outputs:

| File                                                                       | SHA-256                                                            | Dimensions  |   Bytes | Gate                                     |
| -------------------------------------------------------------------------- | ------------------------------------------------------------------ | ----------- | ------: | ---------------------------------------- |
| `candidates/ollo-parts-profile-left-core-candidate-g-chroma.png`           | `152e5b8fc7036b96f584c785ce6461a245781f81a829fd2a3d2ef0f9701724b1` | `1536x1024` | 1857848 | reject                                   |
| `candidates/ollo-parts-profile-left-limbs-candidate-g-chroma.png`          | `b0e744c349af9c1d18d55d0b6886f24bfdee76c14540ecd3fb2e1295b0e21749` | `1672x941`  | 1555960 | reject                                   |
| `candidates/ollo-face-profile-left-eyes-candidate-g-chroma.png`            | `ab827cdb3b9682549f25d165ad9e95b40fa17cc8d7cfd938670e75449638d067` | `1774x887`  | 1202538 | source-only conditional; bundle rejected |
| `candidates/ollo-face-profile-left-lower-base-candidate-g-chroma.png`      | `269094a84b3b73fb5542b6203648764bca4491cef0bb8644d5f3c021e71ca880` | `1448x1086` | 1160237 | source-only conditional; bundle rejected |
| `candidates/ollo-face-profile-left-mouth-overlays-candidate-g-chroma.png`  | `e9dcdd519b16e48f38d7712102c34432293b1eacd1e1bb76daa16c5f966929aa` | `1672x941`  | 1059258 | source-only conditional; bundle rejected |
| `candidates/ollo-parts-profile-right-core-candidate-g-chroma.png`          | `899cf650e9b847ff05c68f9b24cf125e0663716c62852b15009fd3e475980465` | `1536x1024` | 1650640 | reject                                   |
| `candidates/ollo-parts-profile-right-limbs-candidate-g-chroma.png`         | `fc7fca59c9354216e36352c46501a0378ed06e51a3658a3d20c6edd8968e5a99` | `1672x941`  | 1519625 | reject                                   |
| `candidates/ollo-face-profile-right-eyes-candidate-g-chroma.png`           | `3ab91e167a2d05701c646f1ec2740ce7b3412a3b2e470dda022694a4893f0b8c` | `1774x887`  | 1192449 | reject                                   |
| `candidates/ollo-face-profile-right-lower-base-candidate-g-chroma.png`     | `0ce49c0b8928936b7d7d940f6787751e217f3c705a2701a0bd887ffb3462c8f1` | `1448x1086` | 1259131 | reject                                   |
| `candidates/ollo-face-profile-right-mouth-overlays-candidate-g-chroma.png` | `ec150581a072088765094f35157505c6aab677441b1ff8e5d45ae21a8f491a16` | `1672x941`  | 1064917 | reject                                   |

### Profile-left core final edit prompt

```text
Edit target: Image 1. Images 2 and 3 are identity and anatomical references.
Use case: precise-object-edit
Asset type: untrusted profile-left core-parts rig source sheet
Primary request: Change ONLY the first two cells of Image 1 so they become clean isolated core shells instead of assembled body chunks.
Cell R1C1 torso: replace with Ollo's pale-golden PROFILE-LEFT torso shell ONLY, matching the side silhouette and paper texture; no arm, hand, leg, foot, pocket, scarf, tail, ear, or head. It must be a simple torso body shell with rectangular registration tabs only.
Cell R1C2 pelvis: replace with Ollo's pale-golden PROFILE-LEFT pelvis/hip shell ONLY, a compact hip piece; no leg, foot, torso, tail, costume, or other attached art. It must have registration tabs only.
Invariants: preserve the blank profile-left head shell, tail, two distinct ears, red secondary-front layer, red secondary-back layer, exact 2x4 positions, scale, generous gutters, and perfectly flat #ff00ff background from Image 1 unchanged. Preserve exact Ollo watercolor/paper identity. Exactly eight components total. All pieces isolated.
Avoid: full body, fused limbs, attached feet, attached hands, assembled costume, text, labels, shadows, gradients, watermark.
```

### Profile-left limbs final edit prompt

```text
Edit target: Image 1. Image 2 is the correct segment-separation reference.
Use case: precise-object-edit
Asset type: untrusted profile-left limb-parts rig source sheet
Primary request: Correct ONLY the eight limb-segment cells in Image 1. Row 1 cells 1, 2, 4, and 5 must be plain isolated PROFILE-LEFT upper/lower arm segments with smooth rounded/furry cuffs and rectangular joint tabs at both ends—NO fingers, thumb, paw, hand, or digit lobes attached. Row 2 cells 1, 2, 4, and 5 must be plain isolated PROFILE-LEFT upper/lower leg segments with smooth rounded/furry cuffs and rectangular joint tabs at both ends—NO toes, foot, paw, or digit lobes attached.
Invariants: preserve the two isolated four-digit hands in row 1 cells 3 and 6; preserve the two isolated side-profile feet in row 2 cells 3 and 6; preserve their distinct near/far art; preserve the exact 2x6 layout, positions, scale, pale-golden watercolor paper texture, generous gutters, and perfectly flat #ff00ff background. Exactly 12 pieces total.
Avoid: full limbs, fused hand or foot, fingers/toes on segment pieces, assembled body, labels, text, grid lines, shadows, gradients, watermark.
```

### Profile-left eye/lid/brow prompt

```text
Use case: illustration-story
Asset type: untrusted source-candidate PROFILE-LEFT eye/lid/brow exposure sheet for a production 2D articulated rig
Primary request: Generate a NEW clean orthographic profile-left facial component sheet for Ollo, preserving the exact huge dark-brown eye, cream eye white, dark brow line, warm watercolor paper-cutout texture, and child-friendly identity from the references. Ollo faces screen-left.
Composition/framing: one landscape sheet, exactly 14 isolated components in a strict 2-row by 7-column layout, generous equal gutters. Row 1 left-to-right: eye-white-left, pupil-left with white catchlights, lid-open-left, lid-half-left, lid-closed-left, brow-neutral-left, brow-raised-left. Row 2 left-to-right: eye-white-right, pupil-right with white catchlights, lid-open-right, lid-half-right, lid-closed-right, brow-neutral-right, brow-raised-right.
Profile rules: all shapes use profile-left side-view geometry. The near eye is the larger visible profile eye; the far eye is smaller/narrower and independently drawn, not a duplicate. Whites contain no pupils. Pupils contain no eye white. Lids contain no pupil/white. Brows are isolated strokes.
Scene/backdrop: perfectly flat solid #ff00ff chroma-key background, one uniform color.
Style/medium: exact soft watercolor storybook paper-cutout texture from the references; clean source art; crisp fully visible edges.
Constraints: exactly 14 components and nothing else; every component completely separated; no touching or overlap; each centered in its own cell with safety padding; no nose, muzzle, mouth, head shell, ears, body, costume, labels, numbers, guides, grid lines, text, watermark, cast shadows, floor, reflections, gradients, or texture in the magenta background. Do not use #ff00ff inside any component.
Avoid: front-facing eyes, assembled face, duplicated left/right art, generic cartoon eyes, extra expressions, eyelashes, extra props, generic rabbit redesign.
```

### Profile-left lower-face base prompt

```text
Use case: illustration-story
Asset type: untrusted source-candidate static PROFILE-LEFT lower-face base for a production 2D articulated rig
Primary request: Generate one isolated static lower-face base for Ollo facing screen-left, preserving the exact small orange oval nose, pale cream muzzle/cheek patch, warm watercolor paper texture, and child-friendly identity from the references. This base is the stable nose+muzzle registration layer for mouth swaps.
Composition/framing: one large centered profile-left lower-face component only, with generous empty padding on all sides. The orange nose sits at the far screen-left tip; the cream muzzle extends behind/below it in true side profile. Keep a clear empty mouth-change area within the muzzle.
Scene/backdrop: perfectly flat solid #ff00ff chroma-key background, one uniform color.
Style/medium: exact soft watercolor storybook paper-cutout texture from the references; crisp fully visible edges.
Constraints: exactly one component; NO mouth line or mouth opening; no smile; no tongue; no teeth; no eye, pupil, lid, brow, head shell, ear, body, costume, labels, guides, text, watermark, cast shadow, floor, reflection, gradient, or texture in the magenta background. Do not use #ff00ff inside the component.
Avoid: front-facing muzzle, assembled face, extra nose, generic rabbit redesign.
```

### Profile-left mouth-overlay prompt

```text
Use case: illustration-story
Asset type: untrusted source-candidate PROFILE-LEFT mouth-overlay exposure sheet for a production 2D articulated rig
Primary request: Generate a NEW clean orthographic profile-left guide-viseme sheet for Ollo, preserving the exact warm dark-brown mouth line, soft watercolor paper texture, and child-friendly identity from the references. Ollo faces screen-left. These are mouth-only overlays that will be placed over the separate static nose+muzzle base in Image 3.
Composition/framing: one landscape sheet, exactly 8 isolated mouth overlays in a strict 2-row by 4-column layout with generous equal gutters. Row 1 left-to-right: mouth-rest (tiny closed smile), viseme-ai (open vertical side-profile mouth), viseme-e (wide horizontal side-profile mouth), viseme-mbp (closed pressed lips). Row 2 left-to-right: viseme-oh (small round opening), viseme-fv (upper teeth touching lower lip), viseme-l (tongue cue), viseme-wq (small pursed opening).
Profile rules: all exposures face screen-left and share one consistent scale and mouth anchor. The shape changes, but the baseline and profile orientation remain consistent.
Scene/backdrop: perfectly flat solid #ff00ff chroma-key background, one uniform color.
Style/medium: exact soft watercolor storybook paper-cutout texture from the references; crisp fully visible edges.
Constraints: exactly 8 overlays and nothing else; every overlay completely separated and centered in its own cell; no touching or overlap; no nose, muzzle patch, cheek patch, head shell, eye, pupil, lid, brow, ear, body, costume, labels, numbers, guides, grid lines, text, watermark, cast shadow, floor, reflection, gradient, or texture in the magenta background. Do not use #ff00ff inside any overlay.
Avoid: front-facing mouths, assembled face, duplicate mouth shapes, lip-sync labels, generic cartoon style, extra expressions, generic rabbit redesign.
```

### Profile-right core prompt

```text
Use case: illustration-story
Asset type: untrusted source-candidate core-parts sheet for a production 2D articulated rig
Primary request: Generate a NEW clean orthographic PROFILE-RIGHT core-parts source sheet for Ollo, preserving the exact pale-golden watercolor-and-paper identity, proportions, leaf ears, cheek shape, tail, red scarf, and red front pocket from the references. Ollo faces screen-right. Match the clean separation and component scale of Image 2, but use true profile-right anatomy and asymmetry from Image 1.
Composition/framing: one landscape sheet, exactly 8 isolated components in a strict 2-row by 4-column layout, generous equal gutters. Row 1 left-to-right: profile-right torso shell ONLY, profile-right pelvis/hip shell ONLY, blank profile-right head shell with snout and cheek silhouette but NO face features and NO ears, profile-right tail. Row 2 left-to-right: ear-left, ear-right, red secondary-front scarf/collar/pocket layer, red secondary-back trailing scarf layer.
Scene/backdrop: perfectly flat solid #ff00ff chroma-key background, one uniform color.
Style/medium: exact soft watercolor storybook paper-cutout texture from the references; clean production source art; crisp fully visible edges.
Constraints: exactly 8 components and nothing else; every component completely separated; no touching or overlap; torso has no arm, hand, leg, foot, pocket, scarf, tail, ear, or head; pelvis has no leg, foot, torso, tail, or costume; each component centered in its cell; safety padding; left and right ears distinct; head shell contains no eye, pupil, brow, nose, muzzle, mouth, or lower-face art; rectangular registration tabs only; no labels, numbers, guides, grid lines, text, watermark, cast shadows, floor, reflections, gradients, or texture in the magenta background. Do not use #ff00ff inside any component.
Avoid: assembled character, full body, front-facing anatomy, three-quarter pose, fused parts, duplicate role, missing role, limb pieces, facial features, mirrored pocket/scarf mistake, generic rabbit redesign.
```

### Profile-right limbs prompt

```text
Use case: illustration-story
Asset type: untrusted source-candidate limb-parts sheet for a production 2D articulated rig
Primary request: Generate a NEW clean orthographic PROFILE-RIGHT limb-parts source sheet for Ollo, preserving the exact pale-golden watercolor-and-paper identity and proportions from the references. Ollo faces screen-right. Match the clean 12-piece separation and scale of Image 2, but use true profile-right geometry and near/far asymmetry from Image 1.
Composition/framing: one landscape sheet, exactly 12 isolated components in a strict 2-row by 6-column layout with generous equal gutters. Row 1 left-to-right: upper-arm-left, lower-arm-left, hand-left, upper-arm-right, lower-arm-right, hand-right. Row 2 left-to-right: upper-leg-left, lower-leg-left, foot-left, upper-leg-right, lower-leg-right, foot-right. All use profile-right side-view geometry; near/far counterparts are visibly distinct.
Scene/backdrop: perfectly flat solid #ff00ff chroma-key background, one uniform color.
Style/medium: exact soft watercolor storybook paper-cutout texture; crisp fully visible edges.
Constraints: exactly 12 components and nothing else; every segment completely separate; upper/lower segments are plain tapered capsules with smooth furry cuffs and rectangular joint tabs at both ends—NO fingers/toes on segment pieces; hands and feet separate; each paw has exactly FOUR total digits: three rounded fingers plus one thumb; left/right hands and feet must be different art, not copies; every piece centered with safety padding; no labels, numbers, guides, grid lines, text, watermark, cast shadows, floor, reflections, gradients, or texture in the magenta background. Do not use #ff00ff inside any component.
Avoid: assembled character, body/head/ears/tail/costume, front-facing limbs, three-quarter pose, fused parts, five-finger hands, duplicated counterpart art, generic rabbit redesign.
```

### Profile-right eye/lid/brow prompt

```text
Use case: illustration-story
Asset type: untrusted source-candidate PROFILE-RIGHT eye/lid/brow exposure sheet for a production 2D articulated rig
Primary request: Generate a NEW clean orthographic profile-right facial component sheet for Ollo, preserving the exact huge dark-brown eye, cream eye white, orange-brown brow, warm watercolor paper-cutout texture, and child-friendly identity from the references. Ollo faces screen-right. Match the 14-piece separation and scale of Image 2, but use true profile-right geometry and near/far asymmetry from Image 1.
Composition/framing: one landscape sheet, exactly 14 isolated components in a strict 2-row by 7-column layout, generous equal gutters. Row 1 left-to-right: eye-white-left, pupil-left with white catchlights, lid-open-left, lid-half-left, lid-closed-left, brow-neutral-left, brow-raised-left. Row 2 left-to-right: eye-white-right, pupil-right with white catchlights, lid-open-right, lid-half-right, lid-closed-right, brow-neutral-right, brow-raised-right.
Profile rules: all shapes use profile-right side-view geometry. The near eye is larger; the far eye is smaller/narrower and independently drawn, not a duplicate. Whites contain no pupils. Pupils contain no eye white. Lids contain no pupil/white. Brows are isolated.
Scene/backdrop: perfectly flat solid #ff00ff chroma-key background, one uniform color.
Style/medium: exact soft watercolor storybook paper-cutout texture; crisp fully visible edges.
Constraints: exactly 14 components and nothing else; every component completely separated; no touching or overlap; each centered with safety padding; no nose, muzzle, mouth, head shell, ears, body, costume, labels, numbers, guides, grid lines, text, watermark, cast shadows, floor, reflections, gradients, or texture in the magenta background. Do not use #ff00ff inside any component.
Avoid: front-facing eyes, assembled face, duplicated left/right art, generic cartoon eyes, extra expressions, eyelashes, generic rabbit redesign.
```

### Profile-right lower-face final edit prompt

```text
Edit target: Image 1. Images 2 and 3 are the exact scale/silhouette and profile-right identity references.
Use case: precise-object-edit
Asset type: static PROFILE-RIGHT lower-face base
Primary request: Replace the oversized lower-face shape in Image 1 with the exact PROFILE-RIGHT counterpart of Image 2: same compact elongated muzzle/cheek silhouette, same canvas scale, same amount of empty padding, and same watercolor paper texture, but facing screen-right with the small orange nose at the far right tip. Match Image 3's Ollo nose and cheek identity.
Invariants: one isolated nose+muzzle component only; perfectly flat #ff00ff background; mouth-change area remains blank; no mouth line/opening, eye, brow, head shell, ear, body, costume, text, labels, shadows, gradients, or watermark.
Avoid: oversized head/body shape, large round back-of-head mass, screen-left nose, generic rabbit muzzle.
```

### Profile-right mouth-overlay prompt

```text
Use case: illustration-story
Asset type: untrusted source-candidate PROFILE-RIGHT mouth-overlay exposure sheet for a production 2D articulated rig
Primary request: Generate a NEW clean orthographic profile-right guide-viseme sheet for Ollo, preserving the exact warm dark-brown mouth line, soft watercolor paper texture, and child-friendly identity from the references. Ollo faces screen-right. These are the profile-right counterparts to Image 2 and will be placed over the static nose+muzzle base in Image 3.
Composition/framing: one landscape sheet, exactly 8 isolated mouth overlays in a strict 2-row by 4-column layout with generous equal gutters. Row 1 left-to-right: mouth-rest (tiny closed smile), viseme-ai (open vertical side-profile mouth), viseme-e (wide horizontal side-profile mouth), viseme-mbp (closed pressed lips). Row 2 left-to-right: viseme-oh (small round opening), viseme-fv (upper teeth touching lower lip), viseme-l (tongue cue), viseme-wq (small pursed opening).
Profile rules: all exposures face screen-right and share one consistent scale and mouth anchor. The shape changes, but the baseline and orientation remain consistent.
Scene/backdrop: perfectly flat solid #ff00ff chroma-key background, one uniform color.
Style/medium: exact soft watercolor storybook paper-cutout texture; crisp fully visible edges.
Constraints: exactly 8 overlays and nothing else; every overlay completely separated and centered; no touching or overlap; no nose, muzzle patch, cheek patch, head shell, eye, pupil, lid, brow, ear, body, costume, labels, numbers, guides, grid lines, text, watermark, cast shadow, floor, reflection, gradient, or texture in the magenta background. Do not use #ff00ff inside any overlay.
Avoid: screen-left or front-facing mouths, assembled face, duplicate mouth shapes, generic cartoon style, extra expressions, generic rabbit redesign.
```

Candidate G has no provider authority, preparation authority, approval, import
receipt, prepared manifest, or production binding. Its intentionally preserved
failure prevents a later regeneration from silently inheriting old crop or
approval claims.

## Candidate H five-view turnaround sources

The built-in ChatGPT image tool first generated the two views Candidate B does
not contain, then generated a new front and two independently authored profiles
to form a coordinated five-source Candidate H family. Exact references,
prompts, output hashes, chroma measurements, and the no-authority boundary are
recorded in `CANDIDATE-H-MISSING-TURNAROUND-VIEWS.md`.

These five rasters were composed deterministically into a new Candidate H sheet;
Candidate B was not edited or extended. Candidate H has sealed source hashes,
registration cells, derived view bytes, complete five-view coverage evidence,
an exact self-hashed normalization receipt, and a real staging report. The
turnaround item is complete, but the overall rig
request remains incomplete because all six face/parts kits are still absent.
Identity consistency, semantic-view review, and registration readiness remain
false. No import receipt, prepared manifest, approval, rig authority, or
production binding exists.
