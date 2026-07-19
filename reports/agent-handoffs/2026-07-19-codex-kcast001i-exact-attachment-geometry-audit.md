# KCAST-001I exact attachment-geometry audit

Date: 2026-07-19  
Status: **REGISTRATION BLOCKED; DIAGNOSTIC REVIEW PATH REQUIRED**  
Repository: `truthunknown2-art/StoryStage`  
Committed authority before this audit: `4df42df4741564fc5243005f8722dcdce506eefe`

## Outcome

Candidate-I is complete source intake, but its three parts atlases do not contain
enough distinct pixel attachment features to mechanically prove the complete
three-view articulated topology.

The current generated registration plans are deterministic proposals. They are
not measured registrations. `sourcePivot()` uses the center of a part's alpha
bounds plus a role-specific vertical ratio, while parent sockets are reconstructed
from target-guide scene offsets. A plan can therefore be self-consistent and still
rotate artwork around a physically wrong point.

No clean raster, motion reel, review receipt, or ordinary Player path may promote
these plans to registration authority.

## Exact source lineage inspected

| View | Parts atlas SHA-256 | Parts dimensions | Face atlas SHA-256 | Face dimensions |
| --- | --- | ---: | --- | ---: |
| front | `a8c74ff89094a4169be9b19f7d9c0e251f0059aa6d13a9075994d74ba11efe30` | 1600x1248 | `b9564f7fd1a30e470ea62e9d85d430dcb2d437f4b9e9a5ef01cc1507cb6925c7` | 4896x2112 |
| profile-left | `7fbb40653a0ef6598fc8c96f55f84b4ee9e28da18b9e96778ac3ebd9e8e9ba81` | 1845x1652 | `46e3f51ee56d4dff0a1b86dbecd773e22d1ea9a27543bdf6383d9b140debab78` | 4008x1832 |
| profile-right | `97321741fdf6ec482893a6050a0fbc6ec9ee0a243310fe44325295ac995e6a06` | 1860x1620 | `2574cf00a897e03641c56a1fd007b21507baf93f4ec0067ce9997b2879ed84ce` | 5328x2052 |

Generated proposal-plan hashes inspected:

- front: `39f43f9c03f8c2c33201b66f68dc6dd36041f2aae0369ee951604021c5a3e034`
- profile-left: `42afa5f55532d607ea6d5ce0d29569c933b4e71f82dc62dc43f7df68ee0a6998`
- profile-right: `36cc435e071c77b9dc32d6f3e671debcdd31ad65fe02ea200e9000c393a64b51`

## Measured failure pattern

Approximate plan-to-source seam errors are material rather than cosmetic:

- child pivots are commonly 10-44 pixels away from attachment-seam midpoints;
- parent sockets are commonly 30-200 pixels away from detectable source features;
- front shoulder and tail parent features are absent or non-unique;
- profile-left has insufficient shoulder, hip, and ear parent features;
- profile-right lacks a distinct torso neck socket and pelvis proximal feature and
  has insufficient hip and ear features;
- profile near/far ears and limbs sometimes have two topology children but only one
  visible source attachment feature;
- scarf tabs blend into decorative artwork and cannot be classified as hinges from
  alpha geometry.

Representative regression: the front left-ear plan uses approximately `(160, 268)`;
the exact-alpha attachment seam is approximately `(178, 258)`. The old plan can pass
its own transformed-pivot check because its socket is projected from the same wrong
pivot.

The production detector must reproduce exact rational seam endpoints. The numbers
above are audit estimates only and must not become code-owned coordinates.

## Required feature classes

Mask eligibility is orthogonal to mechanical authority.

1. `articulation-proximal`: independently detected child attachment seam.
2. `articulation-distal`: independently detected parent socket seam or rim.
3. `proposed-review-required`: authority-false socket or pivot proposed from a guide
   or assembled fit for human correction; never silently upgraded.
4. `shared-pivot-group`: explicit reviewed mapping where multiple profile children
   intentionally use one socket. It must never be inferred from missing features.
5. `rigid-registration`: non-hinge landmark for a rigid overlay. One anchor may set
   translation only while rotation and scale inherit from the parent; multiple
   independent anchors may solve a bounded reflection-free similarity fit.
6. `mask-only`: technical support eligible for pixel removal with zero transform
   authority.

Scarf layers are `rigid-registration` and/or `mask-only`. They are never animated
articulation edges unless a future approved topology explicitly adds such a joint.

## Mechanical acceptance contract

For a mechanically proven animated edge, require independently derived child and
parent seams. The accepted registration must prove:

- transformed seam midpoint separation is at most 0.5 output pixels;
- seam tangents are compatible;
- outward normals oppose;
- seam widths are compatible under a declared tolerance and scale;
- parent/child assignment is unique and injective;
- -15-degree, 0-degree, and +15-degree orbit diagnostics preserve the joint center
  and do not expose an explosive gap or destructive overlap;
- changing masking does not change any measured joint geometry.

Missing, insufficient, or ambiguous geometry must fail closed with typed outcomes,
not fall back to alpha-bounds centers or guide-manufactured sockets.

## Human-review escape hatch

The current source needs a private, authority-false compact diagnostic so Preston
can correct or approve joints that are not mechanically represented in the atlas.
That diagnostic may show:

- exact original component and alpha support;
- detected seams, midpoint, tangent, normal, class, and mask boundary;
- a clearly marked proposed or shared socket;
- assembled rest pose;
- -15-degree and +15-degree joint motion;
- gap/overlap heatmap;
- rigid-decoration inherited transform;
- typed missing/insufficient/ambiguous reason.

Rendering this diagnostic does not grant registration, preparation, capability,
playback, export, approval, or production authority. The complete 180-frame reel,
ordinary Player exposure, and production render remain blocked until either:

1. Preston submits a hash-bound registration decision for every proposed/shared
   joint; or
2. source art is regenerated with unambiguous attachment geometry and passes the
   mechanical gate.

## Required implementation changes

- Remove caller-authored `tab-roi` selectors and alpha-centroid pivots from authority.
- Detect attachment candidates from exact, unresampled RGBA atlas bytes.
- Measure seam midpoints before tab masking.
- Keep target guides as ranking hints only.
- Bind all feature classes, source hashes, measurement algorithm hashes, diagnostic
  proposals, and human decisions into dependent receipts.
- Keep the diagnostic composition reachable only from the private render-worker
  route; ordinary Studio and public Remotion entrypoints must not import it.
- Add adversarial regressions for alpha-center substitution, projected child sockets,
  one-pixel tab mutation, oversized masks, scarf-as-hinge, one-anchor decorative
  rotation, ambiguous candidates, guide fallback, and mask-before-measurement.

## Authority statement

This audit is evidence of a blocker. It is not a registration approval, prepared
manifest, render capability, trusted review receipt, or final media claim.
