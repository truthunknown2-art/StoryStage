# Kimi F1 — Projects + Create (inbox v31)

## Authority

- Product plan: `product/v1@9f3d6fac522f99b693c163c822334076ee9584bd`
- Required work branch: `agent/kimi-ui-v2`
- PR target: `product/v1`
- Phase: **F1 — Projects + Create**
- Owner: **Kimi**
- Status: `START-NOW`

Create the required work branch from the exact product-plan commit above. Do
not base this work on an older UI slice, PR #31, a proof branch, or a local
worktree that has not been reset to that immutable commit.

## Product outcome

Build the first understandable slice of the real StoryStage creator journey:

```text
Projects → Create → honest local Studio handoff
```

The result must look and behave like a polished creator product, not an
engineering dashboard. It is frontend-only and may use bounded local UI state;
production services remain disconnected and must be labelled honestly.

## Visual references

Use these user-provided local references for layout and art direction:

- Create mock: `C:\Users\pbirc\Downloads\Generated image 2.png`
- Studio mock for shared visual language only: `C:\Users\pbirc\Downloads\Generated image 1.png`
- Ollo art direction: `C:\Users\pbirc\Downloads\e44ea5c3-4cb0-4f13-803a-d2a38b2e5162.png`

The repository already contains approved reference crops under
`apps/studio/src/assets/`. Reuse them; do not generate replacement art in this
ticket.

## Allowed files

Kimi may change only:

- `apps/studio/src/App.tsx`
- `apps/studio/src/App.test.tsx`
- `apps/studio/src/styles.css`
- new or existing files under `apps/studio/src/product-v1/**`
- `reports/agent-handoffs/2026-07-19-kimi-f1-projects-create-handback.md`
- `reports/agent-handoffs/2026-07-19-kimi-f1-projects-create/screenshots/**`

Existing assets under `apps/studio/src/assets/**` are read-only for this ticket.
Do not add dependencies or change package manifests. If one of these boundaries
makes an acceptance item impossible, stop and report the exact blocker instead
of widening scope.

## Required UI

### 1. Projects screen

- StoryStage product header and a calm, uncluttered page title.
- A real **New project** action that opens Create.
- At least one clearly labelled local Ollo demo project card with title,
  thumbnail/reference art, Kids Adventure grammar, storybook/cut-paper style,
  approximately 20-minute duration, and an honest `Local UI demo` status.
- An empty-state design that remains understandable if demo projects are
  removed in a test fixture.
- No accounts, collaboration, analytics, engineering confidence panels, asset
  hashes, or production bureaucracy.

### 2. Create screen

Match the hierarchy of the approved Create mock:

- paste/edit script area;
- working `.txt` import using the browser file picker and visible error state;
- live word count and honest duration estimate;
- Kids Adventure / Weird History grammar selection;
- art-direction selection using the existing StoryStage reference assets;
- narration mode, 16:9 format, and language controls;
- preview of detected natural beats;
- **Create first cut** action;
- **Back to projects** action.

Grammar, style, narration, format, and language controls must all update visible
local state. Disabled or future options need a visible reason; do not create a
control that silently does nothing.

Use a small deterministic frontend helper for the preview only: split the
entered text into paragraph/sentence beats, keep the original order, and cap the
visible preview with a clear “and N more” treatment. This is not the production
Director and must not introduce a new shared contract or story-engine path.

### 3. Honest local Studio handoff

`Create first cut` must validate the script and navigate to the existing third
product surface, not show a fake generation toast. For F1, that surface is a
minimal local handoff containing:

- selected project name and choices;
- the locally detected beat summary;
- the permanent banner `Local UI demo — production services are not connected.`;
- copy stating that no imagery, animation, audio, or render was generated;
- working Back/Edit actions.

F2 will replace this minimal handoff with the long-form Studio shell. Do not
build F2 in this ticket.

### 4. Long-form UI demo entry

The Ollo demo card must open a bounded local project representing a 20-minute
episode so later phases can exercise long-form information architecture. It
may use concise metadata and sample scenes; it must not paste thousands of
words or render thousands of cards. Keep the local-demo banner visible.

## Visual and interaction standards

- Follow the mock's near-black surfaces, mint action color, restrained borders,
  generous spacing, readable typography, and art-led cards.
- Default 1440×900 must fit without microscopic controls or unnecessary page
  sprawl; 1920×1080 should feel composed rather than merely stretched.
- Maintain useful responsive behavior down to 1024 px width.
- Interactive targets are at least 44 px where practical.
- Use semantic labels, visible focus, keyboard operation, truthful button text,
  and reduced-motion-safe transitions.
- Preserve error-boundary behavior.

## Required tests

Add focused tests that prove:

1. Projects is the default creator entry.
2. New project and Back to projects navigate correctly.
3. Script edits and `.txt` import update word count and beat preview.
4. Grammar, art style, narration, format, and language choices update state.
5. Empty script blocks first-cut navigation with a useful error.
6. A valid script opens the honest local Studio handoff and never claims media
   was generated or rendered.
7. The long-form Ollo demo remains visibly labelled as a local UI demo.

Run from the repository root:

```text
pnpm --filter @storystage/studio test
pnpm --filter @storystage/studio typecheck
pnpm --filter @storystage/studio build
pnpm verify
```

If root `pnpm verify` fails only in unchanged upstream asset/proof work, capture
the exact failure and continue the handback; do not modify backend packages to
make it green.

## Required visual evidence

Capture the actual running application—not a recreated mock—at:

- Projects: 1440×900 and 1920×1080.
- Create with populated script/beat preview: 1440×900 and 1920×1080.
- Local Studio handoff: 1440×900.

Store screenshots under the allowed evidence directory. Include the exact URL,
viewport, commit, and capture command in the handback.

## Explicit non-goals

- No F2 Studio timeline, scene rail, Director inspector, rig editor, audio
  recorder, or export implementation.
- No backend, desktop, story-engine, contracts, Remotion runtime, renderer,
  asset-pipeline, or worker changes.
- No real generation, AI provider call, upload service, microphone access,
  rendering, or persistence claim.
- No migration/deletion of Legacy proof surfaces unless `App.tsx` merely stops
  using them as the default route.
- No new schema, dependency, framework, design system, demo application, or
  second preview path.
- No PR #31 correction work.

## Handback and stop condition

When complete:

1. Commit and push `agent/kimi-ui-v2`.
2. Open one draft PR targeting `product/v1`.
3. Write the allowed handback with exact SHA, changed files, commands/results,
   screenshot paths, responsive/accessibility notes, known limitations, and PR
   URL.
4. Report completion in Kimi CLI.
5. Stop implementation and continue the existing 15-minute read-only inbox
   poll. Do not begin F2 until a higher inbox version explicitly says
   `START-NOW`.
