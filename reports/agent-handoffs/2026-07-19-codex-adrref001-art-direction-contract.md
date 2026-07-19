# ADRREF-001 art-direction contract handoff

Date: 2026-07-19  
Owner: Codex  
Branch: `agent/adrref001-art-direction-contract`  
Integrated UI base: `e876f5f0f7b825a680718e7bff0270dd22459318`  
Initial implementation commit: `d7675641e42c8755c8c181a826e3eec198b19023`
Pro P1 correction commit: `cbabc52219592b42a3bcb53d5b40c4abee6f964f`

## Outcome

Creator art-direction selection is now a sealed, grammar-compatible canonical record rather than React-only state. `Cv002Project` includes the exact selection in serialization and its project hash; all graph edit, undo, redo, and restore paths preserve it; `compileDirectorProject()` carries the exact sealed record into `DirectorProject`.

## Reference authority

- Kids Adventure selections bind the full canonical Ollo environment art-direction board hash `d8fb05e2eeb63b2d8a1397f4aa43a5c4ad28d3cac333ce5b48f0a9bb7b41c30d`, not a compressed Create-screen derivative.
- Weird History binds sealed reference-set manifest `d9e18d925f733e5556afac192923ce5a6c79c511a101a1eed2977596ca109be0`.
- That reference set binds the canonical Git blob for `docs/REFERENCE-DIRECTION-STUDY.md` (`2268f8ffe7646d8e868ea6cb72d9624903137104355ef6547ccbf56ef9b5c6a5`) and the Rook candidate-manifest authority (`6c60b1fa633a4c3c7e9a32cbe475a52277f38b7d5cf2e239b0acee2ada85c691`).

Legal option matrix:

- Kids Adventure: `storybook-watercolor-paper-cutout`
- Kids Adventure: `cut-paper-collage-mixed-media`
- Kids Adventure: `soft-2d-digital-illustration`
- Weird History: `weird-history-editorial-collage`

Cross-grammar options, substituted reference authority, and stale selection/project hashes fail closed.

## Honest boundary

The selection has `selectedBy: "creator"` and `usage: "direction-reference-only"`. This slice creates no generation job, asset, approval, provider authority, renderer change, or final-ready capability. Changing a legal creator selection changes project identity while leaving the story graph and capability report unchanged.

## Verification

Independent Codex run at implementation commit `d7675641e42c8755c8c181a826e3eec198b19023`:

- `pnpm verify` passed in 50.3 seconds.
- Story Engine: 249 tests across 26 files, including 9 ADRREF acceptance cases.
- Studio: 72 tests.
- Asset pipeline: 54 tests.
- Contracts: 11 tests.
- Remotion runtime: 16 tests.
- Desktop: 11 tests.
- Render worker: 15 tests.
- All workspace typechecks and privacy verification passed.
- Privacy verification covered 565 tracked and publishable files.
- `git diff --check` passed before commit.

The only lint output is the two pre-existing KVP Remotion non-pure-animation warnings.

## Integration boundary

This is the contract commit requested by Pro. Kimi's separate Create-screen truthfulness branch must supply the visible title, explicit dirty state, Ollo/blank front door, Mara engineering-demo action, reload display, and truthful selected-reference copy before corrected PR #5 is accepted.

## Pro P1 rejection and correction

Pro rejected the initial implementation for two semantic-authority defects:

1. a re-sealed `DirectorProject` could substitute a different legal same-grammar selection because restore and patch boundaries checked grammar but not the exact source selection;
2. `createCv002Project()` could omit the selection and silently stamp an engine-created default as `selectedBy: "creator"`.

Correction commit `cbabc52219592b42a3bcb53d5b40c4abee6f964f` closes both:

- canonical project creation requires an explicit `Cv002ArtDirectionSelection` fourth argument;
- the implicit creator-default helper is removed;
- the Studio maps the visibly active UI choice to an explicit canonical selection for both preview and Create confirmation;
- `applyDirectorPatch()` independently requires the base Director selection to match the source story selection exactly;
- `restoreDirectorWorkspaceState()` requires every history entry, including H0, to match the source story selection exactly before replay;
- regressions reject zero-patch and patched-history same-grammar substitutions, plus a direct patch substitution;
- public proof/test/fixture call sites now pass an explicit legal selection.

Independent Codex verification at the correction passed `pnpm verify` in 48.4 seconds: Story Engine 253 tests across 26 files, Studio 72, asset pipeline 54, contracts 11, runtime 16, desktop 11, and render worker 15. All typechecks and privacy verification passed for 566 tracked and publishable files. Only the two pre-existing KVP Remotion warnings remain.
