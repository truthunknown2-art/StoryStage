# Kimi F2-WP2 correction — bounded beat-row count

## Authority

- Active package: **F2-WP2 — Long-form navigation and bounded rendering**
- Exact rejected head: `5eb684ebcbf62886a5371311cf8226a48220df0a`
- Existing branch: `agent/kimi-f2-longform-navigation-wp2`
- Existing draft PR: `https://github.com/truthunknown2-art/StoryStage/pull/42`
- Tracking issue: `https://github.com/truthunknown2-art/StoryStage/issues/41`
- Accepted product base remains:
  `1982407c201d68ce78c98a5f530cda348a15c8ed`

Continue on the existing branch. Do not replace history, rebase, or start a new
package.

## Exact blocker

Every demo scene has two beats, but the candidate renders both beats in the
selected rail scene and duplicates the same two beats in the center board. All
four rows receive `data-beat-for`, and the new regression test explicitly
expects `4`:

- `StudioShell.tsx`: selected rail beats near lines 247–259;
- `StudioShell.tsx`: duplicate board beats near lines 295–304;
- `App.test.tsx`: `expect(beatRows.length).toBe(4)` near lines 438 and 448.

That contradicts the v41 requirement to prove the rendered beat-row count
never exceeds the selected scene's beat count. Green tests do not override the
ticket invariant when the test encodes the wrong count.

## Required correction

1. Render the selected scene's beat rows once, beneath the selected scene in
   the hierarchy rail as specified by WP2.
2. Remove the duplicate center-board beat list rather than merely removing its
   `data-beat-for` marker or hiding it from the test.
3. Update the regression test to assert exactly the selected scene's two beat
   rows, and continue asserting that every row belongs to the selected scene
   before and after selection changes.
4. Preserve all accepted behavior: act/sequence collapse, hidden-selection
   summary and Reveal, selection synchronization, playhead move/reset,
   disclosure labels, and disabled-control honesty.
5. Recapture the three `1440x900` WP2 screenshots and update their hashes and
   click-through report because the visible board changes.

## Non-goals

No redesign, new navigation behavior, new data, playhead change, responsive or
keyboard WP3 work, F3 controls, backend work, schema, dependency, generated
asset, persistence, media, audio, rendering, or export change.

## Required verification

1. `pnpm --filter @storystage/studio test`
2. `pnpm --filter @storystage/studio typecheck`
3. `pnpm --filter @storystage/studio build`
4. `pnpm verify`
5. Browser click-through at `1440x900` for the three v41 states, with zero
   console warnings/errors and zero page errors.
6. Independent evidence that exactly two beat rows exist for each selected
   two-beat demo scene and no row belongs to another scene.

## Handback

Commit and push one immutable successor on the existing branch. Update PR #42
with the exact implementation SHA, evidence tip, changed files, command
results, recaptured screenshot paths and SHA-256 hashes, and known limitations.
Then stop. WP3, F3, and backend work remain unauthorized.
