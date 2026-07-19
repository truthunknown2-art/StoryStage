# Pro technical acceptance — KCAST-001C Ollo source acquisition

Date: 2026-07-19
Verdict: **ACCEPTED**
Accepted exact evidence head: `89bf99da29961098b8ce2d566697a0e6413e87c0`
Accepted exact implementation SHA: `e283230206cb5064b732506d984ecb3a6392c898`
Repository: `truthunknown2-art/StoryStage`
Branch: `agent/kcast001-ollo-source-acquisition`
Draft PR: `#9`

## Accepted checkpoint

Pro found no P0/P1 trust-boundary or contract blocker in the Ollo three-view source-acquisition slice.

The accepted checkpoint establishes that:

- the original Ollo board is the sole character-identity authority;
- the art-direction board supplies material and texture treatment only;
- the repository-owned chroma-to-alpha, staging, reopen, and crop path is deterministic and content-addressed;
- the external image-helper alpha remains an untrusted visual companion with no production authority;
- front, profile-left, and profile-right review crops preserve their exact source rectangles and byte hashes;
- incomplete rig intake remains explicit and fail-closed;
- no flattened crop is represented as an articulated or production-bindable rig asset.

## Non-blocking visual notes

Pro recorded four visual-review risks that do not invalidate the accepted source evidence:

- the profile views contain some anatomical ambiguity;
- future generations must be guarded against human-character drift;
- edge matte quality must be rechecked at animation scale;
- three-quarter and rear identity views are still absent.

## Guardrails for the next slice

- Do not mirror one profile to manufacture the other.
- Do not infer hidden anatomy from flattened review crops.
- Do not treat flattened crops as riggable parts.
- Acquire explicit separated front-part and front-face/exposure sources that remain bound to the accepted Ollo identity.
- Only after those explicit sources exist may deterministic part preparation begin.
- Keep missing directions, parts, and exposures honest and fail-closed.
- Production authority still requires complete prepared views, a validated rig-family manifest, a moving diagnostic, and Preston's explicit approval.

## Hosted verification

GitHub Actions `Verify StoryStage` passed at accepted evidence head `89bf99da29961098b8ce2d566697a0e6413e87c0`.
