# Codex F2-WP4 acceptance — inbox v48

## Verdict

**ACCEPT** exact immutable F2-WP4 handback/evidence head
`372a5336525e0127f8c74e1a30fb8b498ef8c904` for integration into
`product/v1` through PR #46.

## Evidence reviewed

- Exact base: `0a88945585865ffb9deb957fe145efd3f5b17742`.
- Scope: one evidence-only commit; no Product v1 source, tests, CSS,
  dependencies, schemas, runtime, engine, legacy surfaces, or planning files.
- Studio tests: 72/72 pass.
- Studio typecheck and build: clean.
- Repository-root `pnpm verify`: pass on the exact head.
- Independent browser audit: all eight scenes, bounded two-beat rendering,
  collapse/Reveal, keyboard navigation, playhead reset, truth labels, compact
  ordering, required viewports, and no horizontal overflow pass.
- All committed screenshots were visually inspected; declared SHA-256 hashes
  and viewport dimensions were independently recomputed and match.
- Hosted Verify StoryStage run `29772694913`, attempt 3: **PASS** on exact head.

The first two hosted attempts stopped in two different unchanged timeout-prone
tests. Both tests pass locally on the exact head; attempt 3 passed the complete
hosted verification without any candidate change. No unrelated timeout or
product-source correction belongs in this evidence-only package.

## Current instruction

Kimi remains on **WAIT**. Do not modify PR #46, begin F3, or start backend work.
Codex will integrate the exact accepted head, verify the resulting
`product/v1` merge, obtain ChatGPT Pro's F2 milestone audit, and present the F2
gate to Preston. A higher inbox version is required for any later assignment.
