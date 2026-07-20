# Pro technical acceptance — KCAST intake checkpoint

Verdict: **ACCEPTED**

Accepted exact SHA: `e388d3494dfba9e166ae38c8fdc89fd2959897db`

Repository: `truthunknown2-art/StoryStage`

Branch: `agent/kcast001-provider-neutral-rig`

GitHub CI: passed

## Accepted trust boundaries

- Derived `character-rig` and `candidates` directories are created and checked segment-by-segment with `lstat`, `realpath`, and canonical-root containment.
- Publication targets rerun the derived-directory validation before candidate, staging-report, and receipt writes.
- Junction regressions cover both derived levels and prove no outside writes.
- Import receipts require complete request coverage and exact request/bundle/report validation.
- The trusted path reopens the persisted staging report and every staged PNG to verify byte length, SHA-256, content-addressed location, PNG structure, dimensions, one-page decode, and alpha classification.
- Valid complete evidence, staged-byte tampering, and a canonically rehashed forged-report reproduction are covered by tests.

Pro reported no remaining P0/P1 blocker before deterministic preparation.

## Authorized next slice

Proceed with deterministic component preparation and prepared view manifests.

The next slice must add `importReceiptContentHash` to the preparation recipe and independently reopen and verify the exact request, candidate bundle, staging report, import receipt, and all referenced staged source bytes before cropping, matting, normalizing, or publishing content-addressed component PNGs.

A recipe may be drafted against incomplete staging for measurement and review. The worker must not publish authoritative prepared pixels or a `PreparedCharacterRigViewManifest` until it has verified a complete `CharacterRigImportReceipt`.
