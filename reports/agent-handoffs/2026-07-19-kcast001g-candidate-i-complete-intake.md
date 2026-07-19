# KCAST-001G — Candidate I deterministic profile intake

Status: deterministic composition, byte-verified staging, and mechanical import
receipt evidence only. This handoff does not grant identity, semantic-view,
registration, preparation, approval, or production authority.

## Result

- Sealed the ten raw Candidate I input rasters by exact SHA-256, byte length,
  dimensions, measured chroma, and 8-connected keyed-alpha content bounds.
- Composed both profile views with the existing
  `composeKidsBipedV1ProfileAtlases()` contract: 20 canonical part roles and 22
  canonical face roles per view.
- Proved byte-identical composition and staging reruns, non-identical left/right
  foreground roles, and non-flipped left/right foreground roles. The comparison
  keys each source, crops all 42 corresponding canonical roles to exact connected
  alpha bounds, zeros RGB under transparent pixels, centers each pair on one
  pairwise-max transparent canvas, then mirrors only the left role for an exact
  pixel comparison. This is byte evidence, not a semantic-view approval.
- Preserved the Candidate G rejection evidence at file SHA-256
  `1f57e64075fb6d97f33464a148e29b0e739ad7a25b8b942f0712a585f54a5aa1`.
- Reconciled Candidate H turnaround, Candidate F front kits, and Candidate I
  profile kits into the exact seven-item request bundle. Staging status is
  `complete`.
- Reopened the exact persisted staging report and all content-addressed files,
  then created the mechanical verified-import receipt twice with byte-identical
  results. The receipt has `providerAuthority:false` and
  `approvalRequired:true`; it is not an identity, semantic, registration,
  preparation, approval, or production decision.

## Right lower-face normalization

The unmodified right lower-face source
`1428225cc23c6ead2424ad07ab158ada58a210c4e5f2fbd152151585da68e286`
cannot provide a fully opaque common patch plane large enough for the widest and
tallest canonical mouth overlays. The proof includes a negative compositor call
that fails the unchanged exclusive-patch alpha-plane contract.

The accepted diagnostic route leaves the raw raster unchanged and applies one
explicit transform: uniform `1.5x` resize, Sharp/Lanczos3, then deterministic PNG
encoding. The normalized raster is `2172x1629`, SHA-256
`a3717dc5f87ff911124fcc46481dc0fb588c6e061035b6e44a5364b06010a124`.
Its connected content bounds are `(738,614,768,384)` and its fully opaque mouth
change rectangle is `(804,720,380,210)`. Both the raw rejection and normalized
lineage are recorded in the evidence JSON.

## Exact derived outputs

| Output                                                                    | SHA-256                                                            |
| ------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `derived/ollo-parts-profile-left-source-set-i-alpha.png`                  | `7fbb40653a0ef6598fc8c96f55f84b4ee9e28da18b9e96778ac3ebd9e8e9ba81` |
| `derived/ollo-face-profile-left-source-set-i-alpha.png`                   | `46e3f51ee56d4dff0a1b86dbecd773e22d1ea9a27543bdf6383d9b140debab78` |
| `derived/ollo-lower-face-profile-left-source-candidate-diagnostic-i.png`  | `e1c9827c7961d1d824e199fe7f528efb04d509cba5e51fae3939c41545427660` |
| `derived/ollo-parts-profile-right-source-set-i-alpha.png`                 | `97321741fdf6ec482893a6050a0fbc6ec9ee0a243310fe44325295ac995e6a06` |
| `derived/ollo-face-profile-right-source-set-i-alpha.png`                  | `2574cf00a897e03641c56a1fd007b21507baf93f4ec0067ce9997b2879ed84ce` |
| `derived/ollo-lower-face-profile-right-source-candidate-diagnostic-i.png` | `9abab11e4fd8a8abe09da9223ffc3e4d592a1fa33898b4f86aa1baf22bdfb01a` |

Bundle content hash:
`ffc0d8186be2559466b84d0c8daeb46ea13085f13cc781416f0cd5eb8648b40c`.

Staging report content hash:
`616e96a3216d09ecd93eb0d5a610b7e959090f81661835e22314f89d55b7eb4b`.

Evidence content hash:
`a509959cad26617113f839978c57f0bded1498b9f39e336f0b644b96a88f577e`.

Evidence file SHA-256:
`b48faa6e191da2aa9f445c20a36327a9f4eedb1ab948a5b470c7040b0dc0b7c7`.

Mechanical import receipt content hash:
`da3609ced3ae19a908f3f0dbbabfc5ce76e96208e34642b5df56d47cdefee9de`.

Mechanical import receipt file SHA-256:
`4d539cf5d9fdeddad35bf134283256625ddcdfd1d8996be855c2cc83395be573`.

## Verification

- `pnpm --filter @storystage/asset-pipeline typecheck`
- `pnpm --filter @storystage/asset-pipeline proof:kcast001g-complete-intake`
- `pnpm --filter @storystage/asset-pipeline exec vitest run src/fixed-grid-profile-atlas.test.ts`
- Visual inspection of all six profile atlas/diagnostic PNGs found no obvious
  crop leakage, chroma fringe, clipping, or lower-face pixels outside the
  exclusive swap region. Atlas-only inspection does not establish assembled
  identity, near/far semantic correctness, or registration.

## Gates intentionally still false

- identity consistency and semantic-view audit
- profile and front visual-role audit
- registration readiness
- prepared manifest created
- provider, preparation, approval, and production authority

The verified mechanical import receipt is true. Every human-review and
downstream authority gate listed above remains false.
