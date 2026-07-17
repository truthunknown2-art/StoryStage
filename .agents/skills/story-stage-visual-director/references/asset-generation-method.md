# Asset generation method

## Exchange

Use a provider-neutral manual exchange first:

1. Export a style-bible-bound generation brief.
2. Generate candidates with ChatGPT Images outside the final renderer.
3. Import candidate files and provider metadata.
4. Prepare matte, alpha, crop, padding, registration, and hashes locally.
5. Validate the rig, pose set, prop, or layered background.
6. Require human approval and create an immutable asset version.

## Character order

1. Approve a canonical identity sheet: front, three-quarter, side, neutral, happy, concerned, surprised, scale, palette, and costume callouts.
2. Generate role-specific rig parts with hidden joint overlap.
3. Generate aligned face, mouth, hand, and pose packs.
4. Register all parts to canonical coordinates.
5. Render motion tests before approval.

Use full-body cutout plus pose swaps for kids. Use an upper-body presenter plus restrained pose swaps and illustrated inserts for history.

## Background order

Generate one master plate, then segment it into far, middle, stage, and foreground layers. Inpaint hidden areas, estimate depth, render a parallax test, correct masks, and approve the layered pack. Do not independently generate unrelated layers.

## Provenance

Record provider class, model when known, prompt version, references and hashes, outputs and roles, preparation version, rights notes, approval status, reviewer, and timestamps. Never overwrite an approved version.
