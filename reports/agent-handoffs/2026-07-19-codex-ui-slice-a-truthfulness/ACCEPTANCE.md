# Codex UI Slice A truthfulness acceptance

Date: 2026-07-19

Branch: `agent/codex-ui-slice-a-truthfulness`

Base: `5bfe39261ffe2216d5f073e598ed4746abe1966b`

## Scope

This fallback closes only the narrow Create-screen truthfulness blockers from Issue #7. It does not claim the broader Slice B editor implementation.

## Browser acceptance

- Clean launch opens the Ollo & Friends sample, not the Mara engineering proof.
- Project title is visible in the primary form.
- Replacing the script with an arbitrary 23-word sample derived the title `A fox discovers a clock hidden beneath the`.
- Script, grammar, and art-direction edits surfaced `Unsaved setup changes`.
- Weird History remained selectable and switched to its approved editorial-collage reference.
- Mara remained behind the explicit `Open engineering animation demo` action.
- Opening that demo with dirty setup now shows a confirmation before any title, script, grammar, or art-direction mutation.
- Cancelling with `Keep editing` preserved the exact prior setup.
- The engineering action opened the truthful three-beat prototype and its articulated-motion labels.
- Returning to Create and loading the Ollo sample restored the Ollo-first setup without hiding the saved Mara prototype.
- Desktop and 820-pixel responsive views were visually inspected.
- Browser console warnings/errors: none.

## Evidence

- `ollo-default-desktop.png`
- `ollo-default-820px-viewport.png`
- `engineering-demo-discard-confirmation.png`

## Automated verification

- Studio tests: 77/77 passed after the Pro review correction.
- Focused tests: 28/28 passed.
- Studio typecheck: passed.
- Studio build: passed.
- Workspace lint: passed in the worker verification.
- Full `pnpm verify`: passed in the worker verification.
- `git diff --check`: passed in the worker verification.
- Only the pre-existing Remotion purity warnings remain.

## Honest boundary

Ollo & Friends is the default project grammar and its approved identity/reference art is visible, but the channel-character rigs remain in progress. Creating a normal first cut still produces a directed animatic draft; the Mara route is explicitly an engineering animation demo.

## Pro review correction

Pro conditionally rejected the first pushed head because `openEngineeringAnimationDemo()` mutated the form before deciding whether confirmation was required. The corrected implementation stores a pending confirmation reason, applies no setup mutation until the user confirms, distinguishes dirty setup from replacement of an edited demo, and includes regressions for both dirty-without-demo and dirty-with-edited-demo cases. The ordinary path copy now says `proxy animatic only, no final character animation` instead of claiming there is no animation at all.
