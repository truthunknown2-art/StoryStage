# KCAST-001D front source-atlas composition

This slice composes untrusted Ollo front-view source art. It does **not** prepare a rig, create an import receipt, approve art, prove registration, or make anything production-bindable.

## Exact source set

| Role                   | Exact source                                                       | SHA-256                                                            | Extraction                                                   | Measured key |
| ---------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------ | ------------------------------------------------------------ | ------------ |
| Core and costume       | `candidates/ollo-parts-front-core-candidate-d-chroma.png`          | `8678f1b4813bb02ff7d6eb2a3885dac7d5677cebd4555a9b3e1a31862793219d` | strict 4-by-2 equal grid                                     | `#f706f2`    |
| Limbs                  | `candidates/ollo-parts-front-limbs-candidate-e-chroma.png`         | `1f1a6dca2775de25bd402ea250461dc824c157201f55c814053138383a187b21` | strict 6-by-2 equal grid                                     | `#f209eb`    |
| Eyes, lids, and brows  | `candidates/ollo-face-front-eyes-candidate-c-chroma.png`           | `65c568d88c21e7c89f7d8cd9863e8da6119e568b1c06242389bca1c33ddcb875` | 14 sealed, human-audited source rectangles in declared order | `#f805f8`    |
| Mouth overlays         | `candidates/ollo-face-front-mouth-overlays-candidate-f-chroma.png` | `2fe8b26f892cf951e74a5a6c9ee75738efedef57481d2994828460b97d365437` | strict 4-by-2 equal grid                                     | `#f607eb`    |
| Static lower-face base | `candidates/ollo-face-front-lower-base-candidate-f-chroma.png`     | `b20a8c344b74dcd9ee3e4b6c0ca93f305cb0e6e9f1bb75a170b8d13a53c0437c` | sealed source rectangle `340,290,768,480`                    | `#f607f2`    |

The canonical chroma processor is reused for every source. The default measured-key distance ceiling is 24. The E limb sheet alone uses an explicit ceiling of 32; that exception is recorded in its sealed source lineage and remains below the canonical matte processor's transparent radius of 40. This is a bounded acceptance of a uniform near-magenta background, not a general tolerance increase.

Equal-grid mode partitions the whole exact source using `floor(i * size / count)` boundaries. Sealed-rectangle mode binds every rectangle, role order, exact source hash, and dimensions into a manifest hash. Both modes reject missing roles, duplicate role ownership, overlaps, out-of-raster rectangles, foreground outside a declared rectangle, empty cells, and foreground within four pixels of a rectangle boundary. No pixel classifier assigns semantic roles.

Rejected C/D/E source attempts remain evidence of why generated layout cannot be pixel authority. They do not enter the composed bundle.

## Exclusive lower-face patch contract

The eight canonical mouth roles are full lower-face replacement patches, not standalone floating mouths.

- `replacementMode`: `exclusive`
- `ownedFeatures`: `nose`, `muzzle`, `mouth`
- `registrationGroup`: `ollo-front-lower-face-v1`
- common canvas: `768x480`
- common pivot: `384,120`
- common nose anchor: `384,120`
- exact mouth-change bounds: `220,200,328,180`
- base alpha-plane SHA-256: `09186bf9294c388856bd84140907ecadd3a52f0b94205e44f700fa3ccb7c5b4e`
- atomic replacement and fixed z-order: required
- lower-face art in the head component: prohibited

Repository code reuses one exact keyed base raster for all eight patches and composites each mouth overlay only inside the sealed mouth-change bounds. Every patch has identical width, height, pivot, nose anchor, and alpha plane. The proof performs a byte-level comparison of every patch against the base outside the change box and requires a delta of exactly zero. It also requires each overlay to change at least one pixel inside the box.

The source-candidate diagnostic is `derived/ollo-lower-face-source-candidate-diagnostic-f.png`, SHA-256 `6ba6452b349557580b3d2a33936eace2c8aecb34ddae282205b3c9f505b1e39b`, `4608x480`. Its six poses are `mouth-rest -> viseme-ai -> mouth-rest -> viseme-mbp -> mouth-rest -> viseme-oh`, held for three frames each. It is review evidence only.

## Deterministic outputs

| Output                                            |  Dimensions | Components | SHA-256                                                            |
| ------------------------------------------------- | ----------: | ---------: | ------------------------------------------------------------------ |
| `derived/ollo-parts-front-source-set-f-alpha.png` | `1600x1248` |         20 | `a8c74ff89094a4169be9b19f7d9c0e251f0059aa6d13a9075994d74ba11efe30` |
| `derived/ollo-face-front-source-set-f-alpha.png`  | `4896x2112` |         22 | `b9564f7fd1a30e470ea62e9d85d430dcb2d437f4b9e9a5ef01cc1507cb6925c7` |

Atlas placement follows the canonical `kids-biped-v1` component arrays, not source-sheet order. Each atlas cell uses the maximum component canvas for its group with a 24-pixel transparent gutter. The evidence JSON preserves source hash, keyed hash, source rectangle, component content bounds, component hash, atlas cell, and atlas placement for every role.

- Candidate bundle: `ollo-front-candidate-bundle-f.json`; content hash `ad678eebdfc97a73aaaecacacd59f1f55009db0a27bed7ac39ffa3e7331758ad`.
- Incomplete staging report: `ollo-front-staging-report-f.json`; content hash `5922389b1e50ddf64bdea9cf58710ba66502c2df0034922993ac65c328f9f042`.
- Composition evidence: `ollo-front-atlas-evidence-f.json`; content hash `35113c30ad22d1ea007015eb9119753f50cd6ffc2db662c1fb4f37d196b29162`.
- Proof command: `pnpm --filter @storystage/asset-pipeline proof:kcast001d-front-atlas`.

The provider-neutral bundle stages the exact accepted turnaround source plus `parts-front` and `face-front`. Its status is `incomplete`. `parts-profile-left`, `face-profile-left`, `parts-profile-right`, and `face-profile-right` remain missing. Three-quarter and rear turnaround instruction views also remain absent.

## Honest gate

- declared canonical front inventory: complete
- visual role audit passed: false
- registration ready: false
- import receipt created: false
- prepared manifest created: false
- provider authority: false
- preparation authority: false
- production-bindable: false
- moving diagnostic and Preston approval: still required after complete intake and real preparation

Raw source pieces use different natural scales. Atlas collation preserves pixels and lineage but does not claim assembly scale, pivots, sockets, shared head coordinates, or riggability.
