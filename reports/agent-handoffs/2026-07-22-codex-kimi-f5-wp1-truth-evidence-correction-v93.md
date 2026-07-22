# Kimi correction brief — F5-WP1 empty-state truth and evidence gate

## Immutable assignment identity

- Inbox version: `93`
- Repository: `truthunknown2-art/StoryStage`
- Exact accepted product base: `11f6f049d306efb9808559a24e2bd532be4cdc87`
- Rejected exact head to incorporate: `311c115487db63814d9ea1bde62f3ea047ba05eb`
- Rejected implementation commit: `d12116a602b463900ebffda8952a5c79fa062ee6`
- Required branch: `agent/kimi-f5-wp1-audio-workspace-track-hierarchy-v2`
- Rejected draft PR retained for traceability: `#126`
- GitHub issue: `#124`
- Package: `F5-WP1` correction only
- Owner: Kimi for `apps/studio` frontend/UI/UX
- Dispatcher and reviewer: Codex

Before writing, fetch GitHub truth and verify detached `HEAD` equals the exact
accepted product base above, that it is the live `origin/product/v1` head, and
that the required v2 branch is absent locally and remotely. Read the five
mandatory product sources in their routed order, the team protocol, the
original Version 91 brief, this correction brief, and issue #124 including
Codex's rejection comment.

Create only the required v2 branch. Incorporate the two rejected-branch
commits `d12116a602b463900ebffda8952a5c79fa062ee6` and
`311c115487db63814d9ea1bde62f3ea047ba05eb` in that order without modifying the
rejected branch, then apply the bounded corrections below. Resolve only the
expected canonical-status base difference if one appears. Never reset,
rebase, force-push, overwrite, or rewrite either history.

## Accepted parts to preserve

The Audio workspace information architecture, four track views, shared
scene/beat scope, deterministic card selection, disabled orientation actions,
keyboard tab behavior, desktop layout, and truthful non-empty planning-card
states remain accepted for this correction. Do not redesign or broaden them.

## Exact review findings to correct

### 1. Empty inspector manufactures card/status/timing truth

When a scope has zero cards, the active list and count correctly say that no
planned take or cue exists and the inspector identity row says none is
selected. The inspector nevertheless renders the unconditional fixture label
`Local demo planning card — no audio exists`, a `Planned take` or `Planned
cue` status, and a generic guide/final timing basis. This describes a
nonexistent card and breaks the F5-WP1 invariant that the heading, count,
cards, and inspector agree.

For every track with `selectedCard === null`:

- replace the inspector badge with explicit no-card truth, such as `No
  planning card selected — no audio exists`;
- make Status explicitly say that no planned take/cue exists in the current
  scope, without a card fixture label;
- make Timing basis explicitly say that no guide or final timing exists until
  a planning card exists and later accepted audio work supplies final timing;
- retain the existing no-selection identity row and truthful disabled actions;
  and
- add focused regressions that assert all inspector rows for empty voice and
  cue scopes, not only the identity row.

Do not invent an empty placeholder card, retain stale selection, or hide the
empty truth.

### 2. Screenshot gate accepts an incomplete capture set

`apps/studio/scripts/f5-wp1-evidence.mjs` currently checks dimensions and
unique hashes only for the entries that happen to be in
`report.screenshots`. An incomplete or empty array can satisfy that check.

Define the exact expected nine capture names in the script and fail closed
unless the report contains exactly that set once each, with no missing,
duplicate, or extra name. Continue to require 1440x900 dimensions and unique
SHA-256 hashes. The expected captures are:

1. `wp1-1440x900-projects.png`
2. `wp1-1440x900-proposal-review.png`
3. `wp1-1440x900-studio-board.png`
4. `wp1-1440x900-audio-narration-take.png`
5. `wp1-1440x900-audio-dialogue-empty.png`
6. `wp1-1440x900-audio-sfx-cue.png`
7. `wp1-1440x900-audio-music-timing.png`
8. `wp1-1440x900-audio-scope-change.png`
9. `wp1-1440x900-audio-track-tab-focus.png`

Update the Dialogue browser assertion so it rejects any empty inspector that
claims a local demo planning card, planned status, guide placement, or
available timing. Add a deterministic negative regression proving that the
exact-name/count gate fails for a missing capture without requiring a browser
run if the existing test structure supports it cleanly.

## Required verification and evidence

Run at minimum:

- the corrected focused F5-WP1 tests;
- the complete Studio suite with bounded workers;
- Studio typecheck and production build;
- touched-file lint and `git diff --check`;
- the evidence script from the real Product v1 journey; and
- repository-root verification, preserving an exact failure ledger for any
  unchanged timing-sensitive host flake and using bounded-worker confirmation
  where appropriate.

Recapture all nine screenshots. The Dialogue empty screenshot must visibly
show no-card/no-status/no-timing truth. Regenerate the machine-readable report,
all image hashes, and the report SHA-256. Require zero console warnings/errors
and zero page errors.

## Allowed files

Touch only the minimum existing F5-WP1 Audio workspace source/tests/styles if
needed, `apps/studio/scripts/f5-wp1-evidence.mjs`, the copied package evidence
directory, and one new immutable v2 correction handback. Do not modify
canonical product/roadmap/status documents, packages, workers, Godot,
Remotion, backend code, the Kimi inbox, or any F5-WP2+ surface.

## Handback and stop condition

Commit and push one immutable successor on the required v2 branch, open one
new draft PR to `product/v1`, leave rejected PR #126 unchanged for
traceability, and post a complete correction handback to issue #124. Record
the accepted product base, rejected head, correction
implementation/evidence head, final handback tip, exact changed files,
commands/results, all nine dimensions/hashes, report SHA, console/page-error
counts, and remaining limitations. Then exit cleanly without polling.

Stop before F5-WP2. Do not request ChatGPT Pro review and do not merge.
