# Codex correction handoff — Kimi Ollo Gate 1 review UI A (Version 24)

Independent code and visual audits reject draft PR #25 at exact head
`a375209586758acc235a4ff0621cca6fd8760163`. The standalone product boundary,
host-driven empty state, explicit fixture gate, visual direction, screenshots,
and absence of fake authority controls are accepted. Apply only the corrections
below on the existing branch `agent/kimi-ollo-gate1-review-ui-a`, push an
immutable successor to the existing PR, update the PR body, and wait.

## 1. Fix cross-view issue selection

Issue selection must carry both `viewId` and `requirementId`. Clicking any issue
in Profile left or Profile right while Front is active must atomically select
that issue's view and requirement; the stale-selection guard must not replace it
with Front's first requirement. Add regressions that begin on Front and select
at least one issue in each other view, then assert the rail, stage, selected
requirement, and inspector all agree.

## 2. Restore exact v8 joint evidence truth

The exact v8 `joint-evidence` directories contain:

```text
front:         32 joint-evidence sets
profile-left:  29 joint-evidence sets
profile-right: 29 joint-evidence sets
```

Do not label `sockets + attachments` as joint counts. The existing `32/32/34`
fixture values are false. Derive and display `32/29/29` from the lossless
fixture projection of the exact evidence. If socket and attachment cardinality
is useful anywhere, label the two counts separately and never sum them under
`joints`. Update tests so they pin the exact real counts.

## 3. Correct and expose exact image/hash bindings

The Profile-right bindings must include:

```text
Seams: 3d28b985a696572d0e61db1c068ccf0a450005bf93c4571d9f9a3659f4041329
Rest:  e8b6d83e672b7612281eea1287773e65341197b6126b03e57e95df8eacdc6244
```

The current fixture assigns the Rest hash to Seams and the −15° hash to Rest.
Correct the source projection and add a test that would fail under that swap.
`DiagnosticStage` must present the exact active image SHA-256 alongside its
host-supplied URL/state and tests must assert the exact URL/hash pair for every
available diagnostic tab. Unavailable evidence must remain explicit.

Expose the selected view's exact measurement, proposal, and gate content hashes
in the inspector. Do not silently truncate binding hashes where exact identity
is the purpose; a compact visual affordance may show a prefix only if the full
digest is visibly accessible and copied/read from the supplied model without
recalculation.

## 4. Make accessibility claims real

- Implement diagnostic tabs with one tab stop, Left/Right arrow selection,
  correct `tab`/`tabpanel` relationships, `aria-selected`, and a labelled panel.
- Make every diagnostic tab, Fit/100% zoom control, and other compact interactive
  target at least 44 CSS pixels in its relevant axis. Add focused tests or
  deterministic style assertions for the target contract.
- Add a reduced-motion rule and a focused assertion that verifies it.
- Preserve visible keyboard focus and labelled controls.

Do not claim roving tabs, 44-pixel targets, or reduced-motion verification until
the implementation and tests prove them.

## 5. Repair desktop and narrow layout defects

- Keep the authority footer fixed/sticky and visibly present in both populated
  desktop and narrow captures, without covering selected content.
- The joint/orbit evidence table must not silently clip the `+15°` column or its
  values. At desktop it should fit; at narrow width either reflow or provide an
  obvious labelled horizontal scroll region with keyboard access.
- Preserve the accepted stage scale, rail hierarchy, fixture banner, locked
  authority labels, and honest no-artifact state.

Recapture desktop (~1536×960), narrow (~1100×760), and no-artifact screenshots.
The populated screenshots must visibly prove the authority footer, and one
capture must prove the full orbit-table data is reachable. Recompute exact
SHA-256 values and report console status.

## 6. Make the handback exact

Use the two-commit handback protocol if needed so the final report can name the
immutable implementation head without self-reference. The handback and PR body
must state:

- exact accepted upstream base and exact successor head SHA;
- the actual commit count/delta rather than `one commit` if false;
- every changed file by exact path, not globs;
- exact test/build/root verification results;
- exact screenshot paths, dimensions, states, hashes, and console status;
- a truthful accessibility checklist tied to implementation/tests;
- known limitations and unchanged locked authority.

## Acceptance checks

Run at minimum the private app test suite, boundary tests, typecheck/build, and
root `pnpm verify`. Hosted verification must pass on the exact pushed successor.
Do not add patch authoring, approval, motion, ordinary Player, export, render,
publish, production authority, or broaden the private app boundary.

