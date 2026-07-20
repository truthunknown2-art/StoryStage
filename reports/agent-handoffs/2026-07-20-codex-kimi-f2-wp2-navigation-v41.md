# Kimi F2-WP2 — long-form navigation and bounded rendering

## Authority

- Active phase: **F2 — Long-form Studio shell**
- Work package: **F2-WP2** in `docs/plans/milestone-2.md`
- Exact base: `product/v1@1982407c201d68ce78c98a5f530cda348a15c8ed`
- Required branch: `agent/kimi-f2-longform-navigation-wp2`
- Tracking issue: `https://github.com/truthunknown2-art/StoryStage/issues/41`
- Pull-request target: `product/v1`
- Owner: Kimi CLI
- Reviewer/integrator: Codex

The exact base contains accepted F2-WP1 and the retained B3 multi-shot Director
planning reference. Local root verification and hosted run `29761209150` pass
at this exact combined product head.

## One visible deliverable

Turn the accepted Studio shell into a truthful long-form navigation workspace.
Act and sequence expansion works; only the selected scene exposes beat rows;
scene-relative playhead scrubbing, previous/next scene navigation, rail
selection, and overview selection remain synchronized. When a selected scene's
ancestors are collapsed, an explicit selected-scene summary keeps the hidden
selection understandable and reachable.

## Primary invariant

The selected scene identity and its scene-relative playhead survive every act
and sequence expansion or collapse. The DOM never renders beat rows for more
than the selected scene.

## Allowed files

- `apps/studio/src/product-v1/**`
- the Product-v1/F2 section only in `apps/studio/src/styles.css`
- focused Product v1 tests in `apps/studio/src/App.test.tsx` or one adjacent
  Product v1 test
- `reports/agent-handoffs/2026-07-20-kimi-f2-wp2-navigation/**`
- one exact WP2 handback under `reports/agent-handoffs/`

Use only the accepted local demo data and existing approved reference assets.

## Required behavior

1. Act and sequence headers expand and collapse through real controls with
   semantic expanded state.
2. Beat rows render only beneath the selected scene when its ancestors are
   expanded.
3. Collapsing a selected scene's act or sequence preserves the selection and
   displays a clear selected-scene summary outside the hidden subtree.
4. The summary provides a direct action to reveal the selected scene again.
5. Rail selection, episode-overview selection, previous/next scene navigation,
   and scene-relative playhead scrubbing update the same authoritative scene
   state.
6. Changing scenes clamps or resets the local playhead deterministically and
   visibly. Choose one behavior and encode it in tests.
7. The scene scrubber is explicitly local UI timing, not media playback, and
   has an accessible label plus numeric readout.
8. The permanent local-demo disclosure and all accepted WP1 truth labels remain
   intact.

## Explicit non-goals

No real-time media playback, frame-accurate editing, global timeline tracks,
drag/trim, persistence, Director editing, F3 inspector controls, asset
readiness, audio or waveforms, generation, recording, rendering, export,
backend contracts, shared schemas, packages, legacy-surface edits, responsive
or keyboard WP3 work, or backend product work.

Do not begin WP3. Do not turn disabled Preview or Export controls into pretend
success paths.

## Required verification

1. `pnpm --filter @storystage/studio test`
2. `pnpm --filter @storystage/studio typecheck`
3. `pnpm --filter @storystage/studio build`
4. `pnpm verify`
5. Focused tests traverse all two acts, four sequences, and eight scenes;
   collapse both a selected sequence and selected act; reveal the selected
   scene again; select from rail and overview; use previous/next boundaries;
   move the playhead; change scenes; and prove rendered beat rows never exceed
   the selected scene's beat count.
6. Browser click-through at `1440x900` covering:
   - an expanded selected scene;
   - the same selection hidden behind collapsed ancestors with its summary
     visible;
   - a second-act scene selected from the overview;
   - a moved scene-relative playhead.
7. Actual `1440x900` screenshots for those three material states.
8. Zero page or console errors during the capture path.

## Completion and handback

1. Fetch GitHub and claim issue #41 before implementation.
2. Create the required branch from the exact base above. Do not reuse or merge
   the WP1 branch.
3. Implement only WP2 and run every required check.
4. Commit and push one immutable successor and open a draft PR to `product/v1`.
5. Report exact SHA, changed files, commands and results, screenshot paths and
   SHA-256 hashes, bounded-DOM evidence, known limitations, and integration
   instructions.
6. Stop. WP3, F3, and backend work require a later higher inbox version.
