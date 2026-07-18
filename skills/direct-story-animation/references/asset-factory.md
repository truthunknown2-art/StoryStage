# Asset factory

## Build an entity graph

Assign stable IDs to characters, locations, props, wardrobe, graphics, and reusable effects. Resolve each shot need in this order:

1. approved exact asset and view;
2. approved asset plus compatible rig, crop, or layer operation;
3. approved identity with a new required view or action drawing;
4. new asset generation with an explicit approval gate;
5. licensed or public-domain evidence when the grammar permits it.

Never regenerate an identity because a shot needs another pose. Generate the missing view or part package against the locked identity reference.

## Character package

- identity sheet and palette;
- front, profile, three-quarter, and back views as needed;
- scale reference;
- separated head, torso, limbs, hands, hair/clothing/foliage, and prop grips for articulated routes;
- expression and mouth sets;
- view-specific hero drawings;
- chronological locomotion and one-shot sequences;
- crop, anchor, contact, exposure, event, and continuity manifests.

## Location package

- clean master plate;
- far, midground, ground/contact, and foreground-occluder layers;
- interactive props and lighting/effect masks;
- safe character lanes and horizon/camera metadata;
- alternate angles only when the shot plan requires them;
- exact extraction masks and content hashes.

## Fast scene assembly

Compile a `SceneKit` once, then reuse it across shots. A scene shot should select:

```text
camera preset + layer subset + character view/rig + prop state + lighting state + event program
```

Do not flatten a reusable location into a unique image per shot. Generate deltas: a new foreground plant, open door, prop state, or angle—not the entire world again.

## Approval and lineage

Bind every rendered pixel source into an immutable asset-set hash. Record provider, prompt/reference hash, rights evidence, preparation steps, and human approval. Replacing a PNG, mask, atlas, or manifest must invalidate dependent shot and render hashes.
