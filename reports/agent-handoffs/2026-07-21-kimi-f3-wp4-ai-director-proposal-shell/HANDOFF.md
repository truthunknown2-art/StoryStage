# Kimi F3-WP4 handback — AI Director conversation and proposal shell (inbox v73)

Task: `F3-WP4-AI-DIRECTOR-PROPOSAL-SHELL`
Brief: `reports/agent-handoffs/2026-07-21-codex-kimi-f3-wp4-ai-director-proposal-shell-v71.md`
Branch: `agent/kimi-f3-wp4-ai-director-proposal-shell`
Draft PR target: `product/v1`
Tracking issue: https://github.com/truthunknown2-art/StoryStage/issues/89 (v73 claim posted)

## SHAs

- Exact base: `product/v1@0111274544afda55f8481be103bd3c7ad4db661a`
  (verified as the checkout HEAD before branching; required branch absent
  locally and remotely before creation)
- Kimi implementation head (code + tests + evidence):
  `693c738f412fbcf1fdf6659f9ded780b7779c590`.
- Handback tip: this commit, named separately in the PR body.

## What was built

1. **Two-path New Project on one private-launch template** — the old
   grammar-first Create hierarchy is replaced by the single template
   **Ollo & Friends — Kids Story** (Kids Adventure grammar · Storybook
   Cutout style, shown as fixed template facts) with exactly two entry
   paths: **Paste a script** and **What's your idea?**. Weird History and
   the grammar/art-style/narration/format/language pickers are gone.
2. **Paste a script** keeps the accepted bounded local input (paste or
   .txt import, word count, duration estimate) and produces a
   deterministic local screenplay/hierarchy proposal (`create-proposal.ts`
   `buildPasteProposal`): scenes of at most two detected beats each with
   per-beat seconds and fixture planning direction, hidden-beat count,
   whole-episode affected range, and an honest no-assets impact line.
   Empty scripts fail closed before review.
3. **What's your idea?** opens a normal creator-facing conversation form
   (story idea, target duration, tone, cast, constraints — no terminal or
   engineering-console resemblance) and produces the same
   `CreateProposal` model deterministically from those fields
   (`buildIdeaProposal`). Empty ideas fail closed before review.
4. **One shared, unbypassable Review proposal surface** —
   `ProposalReview.tsx` renders both proposals: proposed
   episode/scene/beat hierarchy and direction, affected range, asset
   impact, the source badge (From your script / From your idea), and the
   mandatory fixture label. The form screens expose no Studio entry; the
   only way in is **Enter Studio — local demo only**, next to the plain
   statement that no production project, media, render, or export has
   been created. Revise returns to the intact form; Start over returns
   to the choice.
5. **Deterministic connection/turn fixtures** — six independent
   connection states (Connected, Signed out, Offline, Usage limit,
   Update required, Crashed) with exact labels; Cancelled and Error are
   turn/result states that never overwrite the connection state. Every
   AI surface carries **Local AI Director fixture — no service
   connected**. E1-derived means vocabulary only (`get_scene_context`,
   `submit_direction_proposal`); the E1 lab is never imported or called.
6. **Connect AI Director + status chip + Settings → AI Director** —
   signed-out/disconnected idea entry and the disconnected Studio panel
   show the compact Connect surface with a truthful runtime-check fixture
   ("no runtime was contacted") and a **Sign in with ChatGPT** fixture
   action that transitions only local demo state. One chip in the Create
   and Studio topbars reports the connection truthfully; its compact
   settings surface offers the six-state fixture selector plus local
   reconnect, sign-out, runtime-check, and redacted-diagnostics fixture
   actions. No API key, cookie, token, password, MCP URL/JSON, terminal
   command, credential, or unredacted diagnostic exists anywhere.
7. **Docked Studio AI Director panel** — a fourth, right-side column
   (`AiDirectorPanel.tsx`); the visual board stays primary. It shows the
   authoritative selected scene/beat scope, honest shot ("No shots
   planned — beat scope only") and fixture character labels, a
   scene-duration scrubber/time readout bound to the same session
   playhead, a persistent local fixture thread, streamed-progress fixture
   replay with a real Cancel, and bounded E1 tool-activity labels.
8. **One clearly scoped, time-anchored proposal** — each request captures
   its scope immutably at send time (scene, beat, playhead, beat range);
   selection changes never retarget it. The proposal shows a summary,
   exactly one proposed `performanceDirection`, affected range, affected
   assets (session-local metadata only), markers (beat start + captured
   playhead), and fixture tool activity. A newer request supersedes a
   still-pending older one.
9. **Bounded Apply/Undo through the accepted history** — Preview (an
   honest before/after note), Revise (reloads the request), and Reject
   change no direction. Apply commits exactly the proposed
   `performanceDirection` to the immutable captured beat through the
   accepted session-local per-beat history (`applyProposalToBeatState` →
   `updateDirectDraft` + `applyDirectDraft`), one atomic step, no host or
   production adapter call. Apply fails closed — disabled with an honest
   reason — when the current selection differs from the captured scope
   (with the one recovery action **Return to captured scope**) or when
   the captured beat has unapplied manual drafts. Undo restores the exact
   prior snapshot and is itself fail-closed once the beat's history has
   moved on. Rejected, cancelled, error, superseded, limited, and offline
   outcomes can never appear applied.
10. **Preserved accepted behavior** — F1/F2 navigation and the F3-WP1
    scope/tab semantics, F3-WP2 Direct drafts, and F3-WP3 Visual/Motion
    scoped history are unchanged; all retained tests pass (see the
    authorized Create/Studio updates below).

## Changed files (exact paths, allowed scope only)

- `apps/studio/src/product-v1/ai-director-fixture.ts` — new pure fixture
  state model: six connection states + labels, turn/result states, E1
  tool-activity vocabulary, streamed-stage fixture labels, immutable
  captured scope, deterministic proposal builder, turn transitions
  (start/advance/complete/cancel/reject/supersede), fail-closed Apply
  guard, bounded apply/undo through `direct-history.ts`, runtime-check
  and redacted-diagnostics fixture text.
- `apps/studio/src/product-v1/create-proposal.ts` — new pure deterministic
  `CreateProposal` model and the paste/idea builders plus the single
  template constants and idea-form options.
- `apps/studio/src/product-v1/AiDirectorControls.tsx` — new status chip +
  compact Settings → AI Director surface (fixture selector, local
  reconnect/sign-out/runtime-check/redacted-diagnostics).
- `apps/studio/src/product-v1/ConnectAiDirector.tsx` — new compact Connect
  surface (runtime-check fixture, Sign in with ChatGPT fixture action,
  reconnect).
- `apps/studio/src/product-v1/ProposalReview.tsx` — new shared Review
  proposal surface for both Create paths.
- `apps/studio/src/product-v1/AiDirectorPanel.tsx` — new docked Studio
  conversation/proposal panel.
- `apps/studio/src/product-v1/CreateProject.tsx` — rewritten to the
  two-path single-template flow converging on the shared review.
- `apps/studio/src/product-v1/ProductV1App.tsx` — new draft shape, created
  proposal title handoff, session AI connection fixture state, fixed
  template labels for the created Studio.
- `apps/studio/src/product-v1/StudioShell.tsx` — topbar chip, the docked
  panel column, the captured-scope commit writer, and the cross-scene
  return-to-captured-scope recovery (rides the accepted scene-change
  adjustment, then applies the captured beat exactly once).
- `apps/studio/src/App.test.tsx` — 16 new F3-WP4 tests (below); F1
  Create tests and two F2-WP1 assertions updated for the authorized
  two-path Create and the new panel (navigation, keyboard, scope, and
  history assertions retained verbatim); import additions only.
- `apps/studio/src/styles.css` — F3-WP4 styles: chip/settings, Connect
  surface, two-path Create, shared review, docked panel; fourth studio
  grid column + compact-layout rules; reduced-motion additions.
- `reports/agent-handoffs/2026-07-21-kimi-f3-wp4-ai-director-proposal-shell/**`
  — this handback, five 1440×900 screenshots, and the machine-readable
  click-through report.

No other files touched: no package manifests/lockfiles (the new test
coverage lives in the already-enumerated `src/App.test.tsx`), demo-project
fixtures, roadmap/status, coordination inbox, contracts, story engine,
desktop host, Codex lab/runtime, workers, Godot, Remotion, assets, audio,
persistence, or backend code. Evidence capture used the already-installed
workspace `playwright-core` (root `@playwright/cli` dev dependency) and a
temp script outside the repository; nothing was installed or left behind.

## Tests

`apps/studio` — **116/116 pass** (9 files; 100 retained → 16 new: 7 pure,
9 UI).

New pure fixture tests (`App.test.tsx`, F3-WP4 state model suite):

1. Six connection fixtures carry exact labels and the mandatory fixture
   label is exact.
2. Captured scope is immutable; streaming stages cap; Cancelled/Error
   turns can never complete; completion fails closed to Error when the
   connection is not Connected; identical inputs build identical
   proposals.
3. Apply fails closed on stale scope and unapplied manual drafts; clean +
   matching scope is the only open path.
4. Apply commits exactly `performanceDirection` as one atomic history
   step (other seven fields untouched); Undo restores the exact prior
   snapshot; the Undo guard closes after a later manual commit or
   unapplied draft.
5. Rejected, cancelled, error, and superseded proposals can never be
   applied; supersede never disturbs an applied record.

New pure proposal tests:

6. Paste builder: deterministic, null on empty input, exact
   template/episode/scene/beat shape, hidden-beat counting, honest range
   and asset-impact labels.
7. Idea builder: deterministic, null on empty idea, three-scene shape,
   duration/tone/cast/constraints echoed exactly.

New F3-WP4 UI tests:

8. Both entry paths converge on the same review model (same landmarks,
   facts, fixture label, local-demo-only note); forms cannot bypass
   review; Revise restores the intact form; Start over returns to the
   choice.
9. Idea entry is gated by the Connect fixture while signed out;
   fixture sign-in transitions only local state; the conversation form is
   creator-facing; empty idea fails closed with no review.
10. Studio panel streams stages with a real Cancel, completes
    deterministically, and shows summary, proposed direction, affected
    range/assets/markers, E1 tool vocabulary, and immutable captured
    chips; Preview changes nothing; selection changes never retarget the
    captured scope; stale-selection Apply fails closed and the recovery
    action returns to the captured scope.
11. Apply commits only the captured beat's `performanceDirection`
    (another beat untouched; draft matches committed) and Undo restores
    the exact prior snapshot (Director Undo back to disabled).
12. Unapplied manual drafts fail Apply closed; committing the manual
    draft in the Director workspace re-opens Apply, and the proposal then
    layers on top of it in the same per-beat history.
13. Cancelled and Error are turn states with preserved captured scope and
    the Revise-and-resend recovery, while the connection chip stays
    independently truthful (Offline).
14. A newer request supersedes the pending proposal (Apply disabled);
    Reject changes nothing and cannot appear applied.
15. Manual direction committed on one beat stays byte-identical through
    another beat's AI apply + undo cycle.
16. Settings → AI Director exposes all six fixtures with truthful chip
    transitions, local reconnect/sign-out, runtime check, and redacted
    diagnostics without credential material.

Retained: all F1, F2-WP1/WP2/WP3, F3-WP1, F3-WP2, and F3-WP3 tests pass.
Authorized updates (same class as the accepted F3-WP2/F3-WP3 updates):
the F1 Create tests now pin the single template, the two paths, the
shared review, and the removal of Weird History and the old pickers; the
F2-WP1 created-project test now pins the fixed template labels plus the
proposal episode title (the layout-demo disclosure is retained verbatim);
the F2-WP1 honest-controls test additionally pins the docked panel's
fixture truth and signed-out Connect surface. The F1
`not.toHaveTextContent(/rendered(?! output)|exported/i)` gate is
unchanged and still passes.

## Commands and results

1. `pnpm --filter @storystage/studio test` — **116/116 pass** (9 files).
2. `pnpm --filter @storystage/studio typecheck` — clean.
3. `pnpm --filter @storystage/studio build` — clean (pre-existing >500 kB
   chunk warning only).
4. Repository-root verify chain — every step **PASS** except the
   documented `verify:roadmap` conflict below:
   - `verify:director-capability-assets` — PASS (19 assets).
   - `verify:candidate-rig-review-implementation-receipt` — PASS.
   - `verify:e1-app-server-schema` — PASS.
   - `verify:e1-wp4-failure-matrix` — PASS.
   - `verify:privacy` — PASS (990 files).
   - `pnpm lint` — 0 errors (2 pre-existing warnings in
     `apps/render-worker/src/kvp001-proof.ts`, untouched here); eslint
     clean on every file this package changed. Prettier check clean on
     every changed file.
   - `pnpm -r --if-present typecheck` — clean across all packages.
   - `pnpm -r --if-present test` — **all suites pass** (exit 0): studio
     116/116, story-engine 353/353, asset-pipeline 126/126, codex-lab
     104/104, remotion-runtime 29/29, render-worker 24/24,
     registration-review 21/21, contracts 11/11, desktop 11/11,
     asset-worker 5/5, orchestration 4/4, e1-director-lab 4/4,
     fixtures 2/2.

## verify:roadmap conflict (base-inherent, same class as F3-WP1/F3-WP2/F3-WP3)

`pnpm verify:roadmap` fails with
`Codex owns the active package but Kimi is not waiting: START-NOW`.
Root cause: the mandated exact base `01112745` predates the F3-WP4
`START_NOW` status transition on `origin/product/v1` tip
(`2b0cd6f6209e43825951b1654e6cfb13c4de94d6`). The base's
`docs/ROADMAP_STATUS.md` still records F3-WP3 / owner Codex /
ACCEPTED_WAIT, while `scripts/check-roadmap-consistency.ps1`
cross-checks the **live** `origin/agent/kimi-frontend` inbox (v73:
START-NOW, this branch named). The guard compares only the base status
file and the live inbox — this diff touches neither, and the live status
on `product/v1` tip already names F3-WP4 / owner Kimi / this exact base,
branch, and issue, so the same checkout passes there. Editing
`docs/ROADMAP_STATUS.md` is forbidden by this brief; reported here
exactly, not worked around.

## Browser click-through (headless Chromium, 1440×900, dev server)

All **43 checks passed** with **zero console warnings/errors and zero
page errors** (machine-readable: `screenshots/clickthrough-report.json`):
two-path choice with the single template and no Weird History; signed-out
Connect surface with truthful runtime check and no credential/terminal
material; fixture sign-in transitions only the local chip; idea path
reaches the shared review with hierarchy/direction/range/asset impact and
the local-demo-only note; paste form cannot bypass review and converges
on the same review model; Studio opens only through the review action and
keeps the layout-demo disclosure; the docked panel streams progress with
a real Cancel, completes deterministically, and shows immutable captured
scope chips, affected range/assets/markers, and E1 tool vocabulary; Apply
fails closed on stale selection and the recovery action returns to the
captured scope; Apply commits the proposed performanceDirection and Undo
restores the exact prior snapshot; manual direction on another beat stays
independent; the settings surface offers all six fixtures, the chip
follows Offline truthfully with an honest Reconnect surface, and redacted
diagnostics carry no credential material.

## Screenshots (actual app, 1440×900)

| File                                                          | State                                                                                                                                                                                                                                                                                | SHA-256                                                            |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------ |
| `screenshots/wp4-new-project-two-path-choice-1440x900.png`    | Two-path New Project choice: single Ollo & Friends — Kids Story template card, Paste a script / What's your idea? paths, signed-out AI Director chip, local-demo banner, no Weird History                                                                                            | `af9541ccd132579e73e40ec4e34d132df887c2f592075421fa2b05a59f64ba99` |
| `screenshots/wp4-idea-proposal-review-connected-1440x900.png` | Connected idea proposal review: From your idea badge, fixture label, three-scene hierarchy with directions and seconds, direction summary, affected range, asset impact, local-demo-only note, Revise/Start over/Enter Studio actions                                                | `6b6ba34b72a5983f41a1f9f805c3cf0fa76faed7131e8e1f858f96d0309a3e82` |
| `screenshots/wp4-paste-proposal-review-1440x900.png`          | Paste-a-script proposal review on the same surface: From your script badge, detected scene/beat hierarchy from the pasted sample, same facts and actions                                                                                                                             | `5186088140f3ec4ba7c7b2238052503d21dde911e08e6d7a75743d99b2440247` |
| `screenshots/wp4-studio-ai-director-proposal-1440x900.png`    | Studio with the docked AI Director panel: connected chip, scope header, layout-demo note, primary board, Director inspector, completed fixture proposal with captured chips (Playhead 0:30, Range 0:00–1:10), affected range/assets, E1 tool activity, markers, and proposal actions | `f6ecaaf3582495234d3e0c6b7eb6ca3c4617d1f29b1e57a0c3210d007217595f` |
| `screenshots/wp4-create-idea-signed-out-connect-1440x900.png` | Signed-out connection state: compact Connect AI Director surface with the fixture label, Sign in with ChatGPT fixture action, and the truthful runtime-check result                                                                                                                  | `5f8647624b31909dc926467e4f740a02b594dd02244d02900b64500ac0fc2fba` |

Machine-readable click-through evidence:
`screenshots/clickthrough-report.json` SHA-256
`cf78d845fb0c34bf2f145842aa0006570dc971212dbbe07691384aee6f235e77`.

## Fixture truth table

| Control                                                                                                                                             | Truth                                                                                                                                                                                                                                           |
| --------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Paste a script / What's your idea? path cards                                                                                                       | real local navigation onto the two entry paths                                                                                                                                                                                                  |
| Script textarea / Import .txt / word count / duration                                                                                               | real bounded local input (accepted F1 behavior); never leaves the device                                                                                                                                                                        |
| Idea conversation fields (story idea, target duration, tone, cast, constraints)                                                                     | real local form state feeding only the deterministic local proposal builder                                                                                                                                                                     |
| Create proposal (either path)                                                                                                                       | real; runs the deterministic local builder — no AI service contacted                                                                                                                                                                            |
| Review proposal surface                                                                                                                             | real shared component and state model for both paths; the only route into Studio                                                                                                                                                                |
| Revise input / Start over                                                                                                                           | real local navigation restoring the intact form / the choice                                                                                                                                                                                    |
| Enter Studio — local demo only                                                                                                                      | real local demo navigation; plainly states no production project, media, render, or export was created                                                                                                                                          |
| AI Director status chip (Create + Studio)                                                                                                           | real readout of the session-local connection fixture                                                                                                                                                                                            |
| Settings → AI Director: connection fixture selector                                                                                                 | real deterministic selector over the six labelled fixture states                                                                                                                                                                                |
| Reconnect / Sign out / Sign in with ChatGPT / Run runtime check / View redacted diagnostics                                                         | labelled local fixture actions; they transition only demo state, contact nothing, and carry no credential material                                                                                                                              |
| Connect AI Director surface                                                                                                                         | real local gate for signed-out/disconnected AI surfaces                                                                                                                                                                                         |
| Panel scope line, shot/character labels, scrubber/time readout                                                                                      | real readouts of the authoritative selected scene/beat and session playhead; shot honestly absent (beat scope only); characters are labelled fixture cast labels                                                                                |
| Conversation thread                                                                                                                                 | real session-local fixture thread; persists across selection changes                                                                                                                                                                            |
| Send request                                                                                                                                        | real; captures the current scope immutably and starts the deterministic streamed fixture replay                                                                                                                                                 |
| Streamed stages / tool activity                                                                                                                     | labelled deterministic fixture replay using accepted E1 vocabulary only — never a live stream or lab call                                                                                                                                       |
| Cancel request                                                                                                                                      | real; settles the turn to the Cancelled state, preserving captured scope                                                                                                                                                                        |
| Preview proposal                                                                                                                                    | real read-only before/after note; changes no direction                                                                                                                                                                                          |
| Revise request / Revise and resend                                                                                                                  | real; reloads the request text into the composer                                                                                                                                                                                                |
| Reject proposal                                                                                                                                     | real resolution marker; changes no direction and blocks Apply                                                                                                                                                                                   |
| Apply proposal                                                                                                                                      | real only for a completed, pending proposal with matching selection and no unapplied manual drafts; commits exactly the proposed `performanceDirection` to the captured beat through the accepted session-local history; fails closed otherwise |
| Undo proposal apply                                                                                                                                 | real exact prior-snapshot restore through the same history; fail-closed once the beat's history has moved on                                                                                                                                    |
| Return to captured scope                                                                                                                            | the one honest recovery action; re-selects the captured scene/beat through the accepted selection path                                                                                                                                          |
| Live Codex/App Server/MCP connection, credentials, saved projects, screenplay files, assets, media, animation, audio, renders, exports, persistence | omitted — explicit non-goals; every surface is a labelled local fixture                                                                                                                                                                         |

## Known limitations

- The connection, conversation, proposals, and diagnostics are
  deterministic labelled fixtures; nothing contacts a real service, and
  the demo Studio still shows the bounded Ollo layout plan with its
  existing disclosure.
- Session-local only: the thread, connection fixture, and direction
  history are React state and do not survive a reload (by design this
  package).
- The created project enters the same layout-demo Studio; script- or
  idea-specific scenes are not planned or generated (disclosed in place).
- Proposal Apply is bounded to `performanceDirection` on the captured
  beat by design; Visual/Motion fields stay manual-only in this package.
- During the ad-hoc verify run, the CPU-heavy `asset-pipeline`
  rig-preparation test flaked once under parallel load (dev server plus
  the recursive suite); it passed 126/126 in the clean canonical full
  recursive `pnpm -r --if-present test` run (exit 0) reported above.
  Unrelated to this diff (untouched package); recorded for transparency.

## Integration instructions

Fast-forward or squash-merge the draft PR into `product/v1`. The branch
is built on the exact base `0111274544afda55f8481be103bd3c7ad4db661a`
and touches only the files listed above. The base-inherent
`verify:roadmap` conflict resolves on `product/v1` tip (the F3-WP4
`START_NOW` transition is already recorded there).

F3-WP5, live AI integration, persistence, backend work, Godot, Remotion,
rendering, and export were not started. Exiting after this handback; not
polling.
