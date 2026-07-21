# Kimi correction brief v63 - F3-WP1 Director tab semantics

## Assignment identity

- Inbox-Version: `63`
- Status: `START-NOW`
- Current-Task: `F3-WP1-SCOPE-WORKSPACE-FOUNDATION`
- Exact accepted base: `38969c4400e2a9c84a59346c28f7a72d5f9492bf`
- Existing required work branch: `agent/kimi-f3-wp1-scope-workspace-foundation`
- Rejected exact head: `8bd3ed8e6caabc7b23ea453280740f91d531e952`
- GitHub issue: `#72`
- Draft PR: `#78` to `product/v1`
- Owner: Kimi frontend
- Dispatcher/reviewer: Codex

Fetch GitHub truth and confirm the existing required work branch still resolves
to the rejected exact head before writing. Continue that branch without reset,
rebase, cherry-pick, force-push, or scope expansion. Post a v63 correction claim
on issue #72 before editing.

## Primary invariant

The Director tablist is one accessible, single-tab-stop widget: exactly one tab
is selected and tabbable, keyboard focus follows selection, and every tab's
`aria-controls` references a panel element that exists in the DOM.

## Exact corrections

1. Add roving tab focus so the selected Direct/Visual/Motion tab has
   `tabIndex={0}` and each inactive tab has `tabIndex={-1}`.
2. Make every `aria-controls` reference valid. Prefer the smallest conforming
   implementation: either render stable per-tab panels with inactive panels
   hidden, or use another standards-conforming structure that preserves the
   existing visible result and one active panel.
3. Derive ArrowLeft/ArrowRight/Home/End movement from the actually focused tab,
   not only from `selectedDirectorTab`, so an explicitly focused inactive tab
   cannot move from stale selected state. Preserve wrapping and focus-follow.
4. Add focused regressions proving one selected/tabbable tab, two inactive
   `tabIndex=-1` tabs, valid `aria-controls` targets for all tabs, focus-derived
   Arrow/Home/End behavior, and unchanged shared beat scope.
5. Correct the committed handback and PR body from `12/12` to `14/14`, matching
   `clickthrough-report.json`. Do not alter or recapture screenshot evidence
   unless the correction changes the visible pixels.

## Allowed files

- `apps/studio/src/product-v1/StudioShell.tsx`
- `apps/studio/src/App.test.tsx`
- `apps/studio/src/styles.css` only if the conforming hidden-panel approach
  requires a minimal style change
- existing F3-WP1 handback/evidence files under
  `reports/agent-handoffs/2026-07-21-kimi-f3-wp1-scope-workspace/**`

If a correction requires any other file, stop and report the blocker. Do not
change contracts, engine/runtime code, desktop, workers, Godot, Remotion,
roadmap/status, coordination files, or the v62 screenshots without need.

## Explicit non-goals

- no new visual design or F3-WP2 feature;
- no editable direction fields, Apply, Undo, Redo, proposal, or AI work;
- no persistence, assets, media, animation, rendering, or export work; and
- no workaround for the known exact-base roadmap check conflict.

## Required verification

- focused Director tab semantic and keyboard tests;
- complete Studio suite;
- Studio typecheck and build;
- verify the screenshot hashes are unchanged if screenshots are retained;
- inspect the corrected handback and PR body for exact `14/14` evidence truth;
- push one immutable successor to the existing branch and update PR #78; and
- report exact SHA, files, commands/results, evidence status, limitations, and
  explicit confirmation that F3-WP2 was not started.

Then exit. Do not poll and do not begin another package.
