# Codex integration review — Kimi UI Slice A

Date: 2026-07-19

Integration branch: `agent/integrate-kimi-ui-slice-a`

Accepted product base: `acc13d49577bf88e378676b3c11ef1aa5fdde74e`

Kimi source branch: `agent/kimi-ui-slice-a`

Kimi implementation commit: `4643f5e`

Kimi evidence handback commit: `7340151f436ea5ede5d8ac3ee34fb522df96b97e`

## Integration result

Both Kimi commits cherry-picked cleanly onto the accepted KVP/KCAST product lineage. The canonical Ollo identity and environment boards were already byte-identical on the accepted base, so the integration added only the four web-weight UI derivatives, the creator sources/tests, and the handback evidence.

The Create screen now provides a clear script-first workflow with real state for script editing, text import, natural-beat preview, project grammar, three Ollo art directions, saved work, and first-cut creation. Unsupported voice, frame, and language choices remain disabled with an explicit reason.

## Independent live-flow review

- Loaded the Ollo & Friends sample script.
- Confirmed `140 words`, an estimated 55 seconds, and 9 derived beats.
- Confirmed Kids Adventure remains selected.
- Created the first cut and verified the draft opens as Kids Adventure with 3 scenes and 9 beats.
- Confirmed the Ollo sample was not mislabeled as Weird History.
- Confirmed no Ollo rig or final-animation claim is made; the UI states that cast identity is approved while character rigs remain in progress.

## Verification

- `pnpm verify`: passed on the integrated lineage.
- Privacy verification passed for 562 tracked and publishable files.
- Story engine: 240 tests.
- Asset pipeline: 54 tests.
- Studio: 72 tests.
- All remaining workspace tests and typechecks passed.
- Lint completed with only the two pre-existing KVP proof warnings.

## Known limitation retained honestly

Art direction is currently Create-screen state only because the production draft contract has no art-direction field yet. This integration does not pretend the choice already drives generation. Persisting and binding that selection is a later contract slice.
