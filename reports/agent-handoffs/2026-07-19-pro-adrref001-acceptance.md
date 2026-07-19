# Pro technical acceptance — ADRREF-001

Date: 2026-07-19
Verdict: **ACCEPTED**
Accepted exact implementation SHA: `cbabc52219592b42a3bcb53d5b40c4abee6f964f`
Repository: `truthunknown2-art/StoryStage`
Branch: `agent/adrref001-art-direction-contract`
Draft PR: `#8`

## Accepted authority contract

Pro found no remaining P0/P1 defect in ADRREF-001.

- `createCv002Project()` requires an explicit art-direction selection; canonical project creation has no implicit creator-attributed fallback.
- `applyDirectorPatch()` independently requires the base Director project's complete selection to match the exact source `Cv002Project` selection before applying a patch.
- `restoreDirectorWorkspaceState()` validates every stored revision, including H0, against the exact source selection before deterministic history replay.
- The exact comparison covers selection hash, grammar, option, reference-set identity/version/hash, provenance, and usage.
- Regressions reject zero-patch same-grammar substitution, patched-history same-grammar substitution, and direct patch application against a mismatched same-grammar base.
- The Studio passes the visibly active UI option as an explicit canonical selection. Temporary beat preview is not persisted, published, approved, or treated as the creator's saved project.
- Legal selection changes alter canonical project identity while capability resolution remains unchanged.
- The contract creates no generation job, approved asset, provider authority, renderer behavior, or final-ready capability.

GitHub verification passed at documentation head `e18ca859616d32e66d743388ed9d00b7ef18deb5` with exact implementation `cbabc522...`.

## Authorized integration and remaining UI gate

ADRREF-001 may be integrated into corrected PR `#5`.

PR `#5` remains conditional until Kimi Issue `#7` closes:

- visible non-fixture title behavior;
- honest setup dirty/saved state;
- Ollo or blank default front door;
- Mara behind an explicit engineering-animation-demo action;
- restored selected-reference display;
- truthful reference-status copy that does not claim media exists before generation and approval.
