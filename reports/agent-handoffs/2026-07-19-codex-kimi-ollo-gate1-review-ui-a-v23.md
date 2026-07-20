# Codex implementation handoff — Kimi Ollo Gate 1 review UI A (Version 23)

Build the first real frontend for StoryStage's private, authority-false Ollo
registration review. This is a standalone review tool for Preston/Codex/Pro,
not another ordinary Studio screen and not a motion demo.

## Exact source and branch

- Create `agent/kimi-ollo-gate1-review-ui-a` from exact upstream
  `c934021f9580fe200aef8e54573383e07eb24932`.
- Open a draft PR targeting `agent/kcast001i-registration-measurement-v2`.
- Do not merge, rebase, reset, force-push, or modify the upstream Gate 1 branch.
- The upstream is intentionally unapproved. Its exact all-view v8 aggregate is
  `a90d1565b1fa4966d63193f56af2ccd8e44d1cbe4078a134e4e554ddfe6299a1`.

The current real state is:

```text
front:         29 components / 32 joints / 3 unresolved requirements
profile-left:  29 components / 29 joints / 3 unresolved requirements
profile-right: 29 components / 29 joints / 2 unresolved requirements
allViewsAccepted: false
motionAuthorized: false
decision: needs-registration-correction
```

The eight unresolved requirements are the front and profile-left tail parent
sockets plus the two scarf mask-only requirements in each of the three views.
The UI must derive what it displays from its supplied presentation model; do not
hard-code these counts into component copy.

## Product boundary

Create a separate private app package, preferably
`apps/registration-review`, so the existing ordinary Studio boundary remains
intact. It may consume the accepted private registration contract exported by
`@storystage/story-engine/private-candidate-rig-registration`, but it must not:

- import ordinary Studio screens or add a route/navigation item to ordinary
  Studio;
- import the ordinary Remotion Player or present this evidence as an episode;
- read arbitrary filesystem paths, call a provider/model, or fetch network
  media in the browser;
- create or alter proposal patches, approval receipts, capability counts,
  motion programs, preparation manifests, or production state.

The application root must accept a narrow, read-only presentation model from a
host adapter. If no host-verified artifact is supplied, render a polished empty
state: `No verified registration artifact loaded.` Do not silently fall back to
sample evidence. A test/demo fixture is allowed only behind an explicit test or
development-fixture entry point and must show a persistent `TEST FIXTURE — NOT
PRODUCTION EVIDENCE` banner.

## Binding visual structure

Use the accepted StoryStage Create/Studio visual language: near-black green
surface, warm paper imagery, mint focus/selection, amber blocked states, compact
typography, strong spacing, and quiet borders. Match the clarity of the approved
mockups rather than the old dashboard density.

Build this information architecture:

1. **Top bar**
   - StoryStage mark + `Private Rig Lab`.
   - Candidate `Ollo / Candidate I`.
   - immutable aggregate hash affordance.
   - prominent `Needs registration correction` badge.
   - `Unapproved evidence` and `Motion locked` labels.
   - no Approve, Export, Render, or Publish action.
2. **View rail**
   - Front, Profile left, Profile right cards.
   - real component/joint/unresolved counts and selected state.
   - keyboard selection and honest per-view status.
3. **Diagnostic stage**
   - large 16:9 evidence canvas.
   - real tabs: Original, Seams, Rest, −15°, 0°, +15°, Gap/orbit,
     Near/far, Masked.
   - tab controls switch only among host-supplied exact image references.
   - missing images show an explicit unavailable state; never a proxy drawing.
   - Fit/100% zoom may be implemented if it genuinely changes the stage.
4. **Requirement inspector**
   - selected requirement ID, parent/child roles, socket/channel, measurement
     status, evidence basis, source feature IDs, proposal state, and exact
     content hashes.
   - joint/orbit tables when supplied, with clear pass/fail samples.
   - mask evidence summary when supplied, including original/masked identity
     and why alpha-indistinguishable evidence remains blocked.
   - no editable coordinates or patch button in Slice A.
5. **Issue strip**
   - all unresolved requirements grouped by view and type.
   - selection focuses the exact corresponding inspector evidence.
   - a fixed authority footer: `Candidate evidence only · no runtime node · no
motion channel · no production binding`.

Do not call the stage an animation preview. Do not say `approved`, `rig-ready`,
`render-ready`, or `production` except in explicit negative/locked language.

## Presentation model and truth tests

Keep the presentation type local to the private app; it is not a new canonical
engine schema. It should be a lossless projection of already-validated host
artifacts, including immutable content hashes and nullable evidence image URLs.
The app must not recalculate authority.

Add focused tests for:

- no-artifact empty state;
- explicit test-fixture banner and inability to mistake it for real evidence;
- all three view states and source-order view navigation;
- 8 unresolved items rendered from the supplied model, not constants;
- selecting a view/issue changes the real stage/inspector selection;
- every diagnostic tab either shows the exact supplied URL/hash or an explicit
  unavailable state;
- no Approve/Export/Render/Publish controls or ordinary Player import;
- locked authority labels remain visible at desktop and narrow widths;
- keyboard navigation, focus visibility, labelled controls, target sizes, and
  reduced-motion behavior;
- stale selection safely resets when a replacement model lacks the prior item.

Add a boundary test that fails if ordinary Studio imports the private review app
or if the private review app imports ordinary Studio/Player modules.

## Evidence and screenshots

Use the exact local v8 artifact tree only as read-only design/reference input:

`C:/Projects/StoryStage-ollo-registration-next/artifacts/KCAST-001/private-registration-diagnostic/`

Do not commit that ignored artifact tree or copy private packet bytes into Git.
For visual evidence, capture:

- desktop (approximately 1536×960) with the explicit test-fixture banner;
- narrow layout (approximately 1100×760);
- no-artifact empty state.

The screenshots must state that they demonstrate UI behavior, not accepted rig
evidence. Record exact screenshot SHA-256 values and browser console status.

## Required verification and handback

Run the private app tests, typecheck/build, relevant boundary tests, and root
`pnpm verify`. Commit and push the work branch, open the draft PR, and add a
handback under `reports/agent-handoffs/` containing:

- exact upstream and head SHAs;
- exact changed files;
- commands/results;
- screenshot paths, dimensions, frame/state, and SHA-256 values;
- console errors/warnings;
- accessibility checks;
- known limitations;
- a control-truth table marking every control as read-only-real, intentionally
  unavailable, or omitted.

Stop after the handback. Slice A has no patch authoring, approval, motion,
ordinary Player, or production authority.
