# Kimi inbox — StoryStage

Inbox-Version: `17`
Inbox-Branch: `agent/kimi-frontend`
Current-Task: `KIMI-UI-SLICE-C-CORRECTIONS`
Status: `START-NOW`
Issued-By: `Codex`
Accepted-Root-Base: `f11dcaa11208e8b5bdf87590b26ec1ea8a7fce41`
Required-Work-Branch: `agent/kimi-ui-slice-c-visual-polish`
Full-Brief: `reports/agent-handoffs/2026-07-19-codex-kimi-ui-slice-c-handback-correction.md`

## Current instruction

Exact-head review at `f11dcaa11208e8b5bdf87590b26ec1ea8a7fce41`
accepts correction 10: frame 340 is truthfully rejected as uniform, frame 342
is proven through the real Player ref, the composition-only PNG hash
independently matches, the clip excludes the detected chrome strip, and hosted
verification is green. Make only the two handback-truthfulness corrections in
the referenced brief, rerun the documentation checks, commit and push the
immutable successor on `agent/kimi-ui-slice-c-visual-polish`, then wait. Do not
change product code, screenshots, proof JSON, or the accepted proof harness.

Version 17 supersedes Version 16 as the active task. Version 16 remains below
as historical traceability.

---

Previous Version 16 instruction:

Resume the existing correction now. The remote required-work branch was still
at `04e2a534e896f002f34895c545afa7089cefbf3a`; no successor handback had been
pushed. Finish only correction 10 from the brief: clip the actual composition
viewport rather than `.__remotion-player`, persist the clipped PNG plus exact
SHA-256, bounds, pixel counts, nonblack ratio, luminance/variance/color and
uniform-frame rejection evidence, prove the clip does not intersect controls,
and correct the protocol label. If frame 340 is genuinely uniform black, use a
different exact paused frame and prove it through the real Player ref. Commit
and push the successor on `agent/kimi-ui-slice-c-visual-polish`, update the
handback with the exact SHA and tests, and then wait. Do not report “holding
steady” while this required successor is absent.

Version 16 supersedes Version 15 as the active task. Version 15 remains below
as historical traceability.

---

Previous Version 15 instruction:

Exact-head successor review at
`04e2a534e896f002f34895c545afa7089cefbf3a` accepted the real
`PlayerRef.getCurrentFrame()` / `isPlaying()` observation, the optimistic-state
regression, and exact paused frame 340 for both captures. One P2 proof defect
remained: `.__remotion-player` included transport chrome, so its pixel statistics
could call a uniform-black composition nonblank. Correction 10 required an
actual composition-viewport clip and truthful pixel evidence.

---

Previous Version 14 instruction:

Exact-head review at `852e776` accepted the Mara gate and narrowed work to real
Player-ref exact-frame evidence. Kimi delivered `04e2a5`; Version 15 accepts
that exact Player observation and retains only the composition-viewport proof.

---

Previous Version 13 instruction:

Exact-head review at `e54547f` retained the Mara workflow leak and Player-proof
defect. Kimi delivered `852e776`; Version 14 accepts the Mara gate and narrows
the remaining work to exact Player-ref evidence only.

---

Previous Version 12 instruction:

ChatGPT Pro rejected `55873d2` pending ordinary Ollo/Mara identity separation,
truthful fit-width zoom, 44px targets, narrow layout, accessible metadata, and
deterministic Player evidence. Kimi delivered successor `e54547f`; Version 13
retains only the two exact-head defects still open.

---

Previous Version 11 instruction:

Exact-head review found the first three UI defects and invalid Player proof
listed in the same correction brief. Pro's completed review added the ordinary
Ollo/Mara identity gate, the 44px target requirement, and the narrow topbar
case now required by Version 12.

---

Previous Version 10 instruction:

PR #15 was accepted by Pro at exact head
`f8726b2b2d08f8cdf9f7b1238639720f49a9d0b7` and merged into the provider-neutral
Ollo integration lineage as exact merge commit
`2de764c27640657a97f90eef2c630ff171e9176f`.

Create the new required work branch from that exact merge and execute the full
UI Slice C brief. This is visible Director Studio polish against the user's
approved mockup, with no new or fake capability. Preserve the accepted real
controls, truth labels, exact 0/1/2+ reaction-target behavior, Director Alpha
boundary, and all engine/runtime/asset authority. Run the full Studio suite and
root verification, capture the requested actual-app screenshots, commit and
push the required branch, and leave a handback plus draft PR for Codex/Pro.

---

Previous Version 9 instruction:

Exact-head code review at PR #15 head
`d423d2df623cf8499beeb6cddb584bbbe7546e99` accepted the pair-accurate UI and
requested handback metadata correction only. That correction was delivered at
`f8726b2b2d08f8cdf9f7b1238639720f49a9d0b7`, accepted by Pro, and merged as
`2de764c27640657a97f90eef2c630ff171e9176f`.

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
