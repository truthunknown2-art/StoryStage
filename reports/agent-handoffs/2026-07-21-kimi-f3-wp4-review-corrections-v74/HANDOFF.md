# F3-WP4 review corrections v74 handoff

Status: `READY_FOR_EXACT_HEAD_REVIEW`

## Identity

- Accepted product base: `0111274544afda55f8481be103bd3c7ad4db661a`
- Rejected predecessor PR: #91 at `536265ebb4f2fd7f9e021de2aaa3aada2dee673e`
- Required correction branch: `agent/kimi-f3-wp4-review-corrections-v74`
- Correction implementation commit: `269b9d26a804ce557be7852fcffe3b52f3c1d62f`
- Tracking issue: #89

The watcher-created Kimi session preserved the predecessor merge and began the requested correction, but its repeated test loop was stopped after the source changes were safely present in the isolated v74 workspace. Codex completed only the bounded review corrections, reran the checks, and captured replacement evidence. No F3-WP5 work is included.

## Corrections completed

1. Both New Project paths converge on one editable proposal review. Episode, scene, beat, direction, and direction-summary fields are locally editable before the user enters Studio.
2. Blank or whitespace-only reviewed episode titles fail closed with an accessible inline alert and invalid field state.
3. A new request supersedes only unresolved streaming or completed proposals. Cancelled and error turns retain their settled truth; applied, rejected, and already-superseded turns remain unchanged.
4. AI proposal Undo is tied to the exact immutable committed history node, preventing an obsolete Undo from reviving after redo-branch truncation and cursor reuse.
5. The broad stylesheet formatter churn from the rejected head was removed while retaining the intentional F3-WP4 presentation changes.
6. The review disclosure remains explicit: only the reviewed episode title enters the fixed Ollo layout demo. Reviewed scenes, beats, and direction remain review-only and unsaved.

## Verification

- `pnpm --filter @storystage/studio test`: PASS, 9 files / 123 tests.
- `pnpm --filter @storystage/studio typecheck`: PASS.
- `pnpm --filter @storystage/studio build`: PASS, 19 capability assets; only the existing chunk-size warning.
- Root verification excluding the coordination-only roadmap guard: PASS.
  - capability asset, candidate-rig receipt, E1 schema, E1-WP4 failure matrix, and privacy checks passed;
  - lint passed with the two existing Remotion non-pure-animation warnings and zero errors;
  - all workspace typechecks passed;
  - all workspace tests passed, including Studio 123/123.
- `pnpm verify`: stopped only at `verify:roadmap` because this correction branch deliberately retains the live `START_NOW` coordination inbox while product status names Codex as package owner. Run `verify:roadmap` again in the clean product/inbox integration checkout.
- `git diff --check`: PASS.
- Browser correction clickthrough at 1440x900: PASS for both entry paths, editable review, blank-title rejection, reviewed-title carry-over, review-only scene/beat/direction boundary, zero console warnings, zero console errors, and zero page errors observed by a listener attached before both corrected flows.

The jsdom `HTMLCanvasElement.getContext` notices emitted by the Studio suite are the existing environment limitation; they are not test failures.

## Replacement browser evidence

All paths are under `reports/agent-handoffs/2026-07-21-kimi-f3-wp4-ai-director-proposal-shell/screenshots/`.

| Artifact | SHA-256 |
| --- | --- |
| `wp4-correction-idea-editable-review-1440x900.png` | `f0e4a357bde5337df50673056406678656dbbb9cf9c08b8e534401d88f831902` |
| `wp4-correction-blank-title-gate-1440x900.png` | `020168b19fb7f5633d65f249c1b2d7f66673a2184c819b5c1ef1d33aeab255a9` |
| `wp4-correction-paste-editable-review-1440x900.png` | `a2edaa0f83ca61b76a5af6e923927f0562aac9f51e4dfad4a0f9d26beb283339` |
| `wp4-correction-reviewed-title-studio-boundary-1440x900.png` | `f9fc9f4485af41f0aee327d420a1d8ced62dfd693b8a165ab1e467324156564f` |
| `clickthrough-correction-report.json` | `4ab4b3d1d1f7f15a5877a5913fc951b14515d197d0e4e94230056d22f5b0e05c` |

The idea and blank-title screenshots were recaptured at the top of the page after direct visual inspection; they visibly show the edited hierarchy and accessible rejection state rather than only the bottom action area.

## Truthful boundary

This remains an F3-WP4 local UI/fixture package. It does not connect a production AI service, generate a screenplay, create media, plan script-specific production scenes, render animation, save review edits, or export an episode. Those capabilities are not advertised as complete.

Stop after F3-WP4 integration. Do not begin F3-WP5 without the separately persisted milestone authorization.
