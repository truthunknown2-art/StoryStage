# Kimi F2-WP1 created-project truth correction (inbox v39)

## Authority

- Rejected exact head: `c6defdb6370ec84c9f6af42f0ad87d0a6fb6145a`
- Product base remains: `fb3033f8cc5ce536476066708aebb472704de936`
- Existing branch: `agent/kimi-f2-studio-shell-wp1`
- Existing draft PR: `https://github.com/truthunknown2-art/StoryStage/pull/39`
- Task issue: `https://github.com/truthunknown2-art/StoryStage/issues/38`

Continue on the existing branch. Do not create another branch or PR.

## Accepted evidence at the rejected head

Do not rework these accepted parts:

- scoped file set and two-commit handback;
- coherent 1440×900 shell layout;
- one scene selection driving rail, board, transport, and overview;
- correct previous/next boundaries;
- honest reference-art and no-media labels;
- disabled Preview/Export with visible reasons;
- no fake Director controls;
- screenshot dimensions and hashes;
- Studio tests 62/62, typecheck, build, local root `pnpm verify`, and hosted
  Verify StoryStage run `29753859695`.

## Blocking defect

The Create screen supports real grammar and art-style choices, but the Studio
shell always reads badges from `OLLO_DEMO_PROJECT`. A creator can select Weird
History and Paper Collage, choose Create first cut, and land in a project
labelled Kids Adventure / Storybook Cutout. The shell also shows Ollo scene
names under the script-derived project title without saying those scenes are
layout-demo data rather than a plan derived from the pasted script.

That is a creator-facing continuity and truthfulness failure. The local-demo
banner alone says services are disconnected; it does not explain that the
visible hierarchy is unrelated to the creator's script.

## Required correction

Apply only these changes:

1. Let `StudioShell` receive the visible grammar and art-style labels.
2. The seeded Ollo project continues to pass `OLLO_DEMO_PROJECT.grammar` and
   `.artStyle`.
3. The created-project route passes the actual
   `GRAMMAR_LABELS[draft.grammar]` and `ART_STYLE_LABELS[draft.artStyle]`.
4. On the created-project path only, show a concise visible disclosure that the
   shell is using the bounded Ollo layout demo and that script-specific scenes
   have not been planned or generated yet.
5. Add a regression: choose Weird History and Paper Collage, create the first
   cut, verify those exact badges, verify the layout-demo disclosure, and
   verify the old Kids Adventure / Storybook Cutout badges are absent from the
   created-project top bar.
6. Capture one actual 1440×900 created-project Studio screenshot proving the
   nondefault badges and disclosure. Record its exact SHA-256 and add it to the
   click-through report and handback.

Use existing Create label maps. Add no schema, shared contract, project parser,
or new screen.

## Verification

Rerun:

1. `pnpm --filter @storystage/studio test`
2. `pnpm --filter @storystage/studio typecheck`
3. `pnpm --filter @storystage/studio build`
4. `pnpm verify`

Update the existing draft PR and handback with the exact successor SHA, files,
tests, new screenshot path/hash, and the corrected visible-control/state truth.

## Stop

Push one immutable successor and stop. Do not add collapse, playhead, playback,
Director controls, WP2, F3, backend work, or unrelated polish.
