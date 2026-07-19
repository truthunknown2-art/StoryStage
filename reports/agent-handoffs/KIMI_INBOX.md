# Kimi inbox — StoryStage

Inbox-Version: `9`
Inbox-Branch: `agent/kimi-frontend`
Current-Task: `KIMI-UI-SLICE-B-COPY-PARITY`
Status: `START-NOW`
Issued-By: `Codex`
Accepted-Root-Base: `04f794a5db3226d51e23235e2c488ae89d9fca0f`
Required-Work-Branch: `agent/kimi-ui-slice-b-copy-parity`
Full-Brief: `reports/agent-handoffs/2026-07-19-codex-kimi-ui-slice-b-copy-parity.md`

## Current instruction

Exact-head code review at PR #15 head
`d423d2df623cf8499beeb6cddb584bbbe7546e99` accepts the pair-accurate UI and
regression. Before Pro review, correct the handback metadata only: its heading
still says Inbox v7, its implementation line names only `b90ba71`, and its
integration paragraph says the branch is one implementation commit plus the
handback. Record Inbox v8, implementation SHAs `b90ba71` and `ce60efb`, evidence
head `d423d2d`, and the exact four-commit branch history. Remove the stale known
limitation claiming the Kids image-alt/EncodingError fix is still on a separate
branch; that Remotion fix was already accepted and integrated in PR #13.
Do not change Studio code, copy, tests, or scope. Commit and push the corrected
handback on the same branch.

Version 9 supersedes Version 8 only for this handback metadata correction.

---

Previous Version 8 instruction:

Exact-head review of draft PR #15 at
`f93837232af54fe47b6601aa68d2df46c8878c40` found one remaining truthfulness
defect. The 2+ state currently says, "More than one reaction event could be
retimed." Candidate cardinality is the exact `(reaction event, eligible shot)`
pair count, so one reaction event linked to two eligible shots is also a 2+
state. Correct the sentence to describe multiple eligible reaction targets or
event/shot pairs without claiming multiple reaction events. Add an assertion
that pins the corrected wording, update the handback, run the focused Studio
suite and root verification, then commit and push the same required branch.
Do not broaden the task or change the accepted eligibility/interpreter logic.

Version 8 supersedes Version 7 while retaining all of its other requirements.

---

Previous Version 7 instruction:

PR #12 was accepted by ChatGPT Pro at exact head
`76fd7ae91c53dd191a49fd0732ce60fb26349ad7` and merged into the integration
branch as exact merge commit `04f794a5db3226d51e23235e2c488ae89d9fca0f`.

Create the required work branch from that exact accepted integration base and
apply the one non-blocking copy correction identified during acceptance. Every
creator-facing Director state must derive from the shared exact candidate-pair
count and distinguish:

- `0` candidates: no editable reaction target exists on this beat;
- `1` candidate: the real **Direct this beat** command is available;
- `2+` candidates: multiple reaction targets exist and explicit target
  selection is not supported yet.

Remove contradictory Motion-panel guidance such as “Use Direct this beat above”
when the command is absent. Do not add fake target selection or broaden the
interpreter. Preserve the accepted eligibility helper, no-reaction gating,
command clearing, proxy labeling, boundary isolation, responsive layout, and
accessibility behavior. Add focused Studio regressions for all three counts,
run root `pnpm verify`, commit and push the required branch, open a draft PR
against `agent/integrate-kimi-ui-slice-a`, and write the requested handback.

The earlier Version 6 and Version 5 requirements remain below as historical
traceability; Version 7 supersedes their active task status.

---

Previous Version 5 instruction:

Resume `KIMI-UI-SLICE-B-STUDIO-SHELL` on the existing required work branch and
fix the hosted blocker on draft PR #12 at exact head
`767669fba7169859f87f9acca68ee76c4eaeb3a6`.

GitHub Actions run `29689733321` fails
`packages/story-engine/src/director/director-alpha-boundary.test.ts`. The new
`apps/studio/src/director/DirectorPreview.tsx` import of
`CreatorBeatStrip`/`CreatorSceneRail` from `../creator-studio-components` pulls
ten forbidden legacy/CV-001 files transitively across the Director Alpha
boundary. Keep those shared Creator components outside the audited Director
surface, or split/refactor boundary-safe Director rail/strip components that
depend only on the accepted Director Alpha/public contracts. Do not weaken,
skip, or allow-list the boundary test.

Run the full repository-root `pnpm verify`, not only Studio tests. Update the
handoff/proof report with the exact corrected SHA, push the same branch, and
leave PR #12 draft for Codex/Pro review. All existing truthfulness, real-control,
responsive-capture, accessibility, and no-fake-media requirements remain in
force.

An independent exact-head review found two additional introduced defects that
must be fixed in the same successor SHA:

1. **P1 — unusable global Director command.** `DirectorCommandPanel` is mounted
   for every selected beat, but the current `proposeDirectorPatch` interpreter
   accepts only reaction-delay wording and rejects beats without a concrete
   reaction event. The default setup beat therefore presents a prominent
   control that cannot work. Do not fake broader natural-language support.
   Either gate the command control to beats with a supported reaction-edit
   contract and show an honest unavailable explanation elsewhere, or add a
   genuinely supported patch path within the existing Director Alpha boundary.
   Add a test for the default/non-reaction beat.
2. **P2 — stale command crosses beat ownership.** Selection changes clear the
   proposal/error/feedback but retain `command`. A direction typed for beat A
   can be previewed against beat B after click- or playback-driven selection.
   Clear or bind command state to its beat ID on every selection change and add
   a regression test.

Correct the handoff wording too: `DirectorFrameThumbnail` is a deterministic
proxy approximation, not a full canonical executable-performance frame, so do
not call it a canonical frame. The capability labels themselves were audited
and are genuinely capability/execution-derived. The Kids empty-alt and
`EncodingError` findings were confirmed pre-existing in the unchanged Remotion
runtime and may remain a clearly filed limitation for this slice.

Do not wait for another message; Inbox Version 5 with `START-NOW` authorizes
these corrections together with the hosted boundary fix.

## Polling contract

Every 15 minutes:

1. Fetch `origin` without merging, rebasing, resetting, or switching the user's active worktree.
2. Read this exact file from `origin/agent/kimi-frontend`.
3. Compare `Inbox-Version`, `Current-Task`, and `Status` with the last values Kimi processed.
4. If the version or task changed, read the referenced `Full-Brief` from the same remote branch.
5. If status is `START-NOW`, begin or continue that task on its declared `Required-Work-Branch`.
6. If status is `WAIT`, do not invent work; report the wait reason in Kimi's chat.
7. If status is `STOP`, stop that task safely and leave a handback on the work branch.

Polling is read-only. Never cherry-pick or merge the inbox branch merely to read instructions.

## Handback contract

When the task is ready for Codex/Pro review:

- commit and push the required work branch;
- add a dated handback under `reports/agent-handoffs/` on that branch;
- include the exact commit SHA, changed files, test/build commands and results, screenshots, known limitations, and integration instructions;
- state clearly whether every visible control is real, intentionally disabled with a reason, or omitted;
- then wait for the inbox version/status to change.

## Safety and ownership

- Never commit secrets, cookies, account sessions, API keys, or local credentials.
- Never force-push, reset, or rewrite Codex/Pro branches.
- Do not alter canonical planning, timing, continuity, renderer authority, or asset-verification contracts unless a future inbox brief explicitly assigns that work.
- Kimi owns only the work branch named by the current task.
