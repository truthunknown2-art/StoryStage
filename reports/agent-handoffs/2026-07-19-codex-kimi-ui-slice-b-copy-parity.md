# Kimi handoff — Studio Director candidate-count copy parity

Task: `KIMI-UI-SLICE-B-COPY-PARITY`  
Status: `START-NOW`  
Required branch: `agent/kimi-ui-slice-b-copy-parity`  
Exact accepted base: `04f794a5db3226d51e23235e2c488ae89d9fca0f`  
PR base: `agent/integrate-kimi-ui-slice-a`

## Why this slice exists

ChatGPT Pro accepted PR #12 at exact head
`76fd7ae91c53dd191a49fd0732ce60fb26349ad7`. Functional eligibility parity is
closed. The only acceptance note is creator copy that still conflates zero and
ambiguous candidate counts, and can direct the creator to a control that is
correctly absent.

## Required change

Use the existing shared `listDirectorReactionDelayCandidates()` result as the
single source for both command availability and creator-facing explanation.
Render truthful, distinct states for exactly zero, exactly one, and two or more
eligible `(reaction event, shot)` pairs. The one-candidate state may expose the
real command. The other two states must explain why it is unavailable. The
ambiguous state must say explicit shot/event target selection is not supported
yet.

Update the Motion panel so it never says to use a missing control. Do not add a
mock target picker, broaden natural-language support, duplicate the eligibility
predicate, weaken the Director Alpha import boundary, or alter canonical
planning/timing/continuity authority.

## Exact-head review correction (Inbox Version 8)

Draft PR #15 at `f93837232af54fe47b6601aa68d2df46c8878c40` still says
"More than one reaction event could be retimed" in the 2+ state. That is not
necessarily true: one reaction event linked to two eligible shots also creates
two exact candidates. Replace that sentence with wording about multiple
eligible reaction targets or exact event/shot pairs. Pin the corrected visible
copy in the focused Studio regression and update the handback evidence. Keep
all other Version 7 behavior and boundaries unchanged.

## Handback metadata correction (Inbox Version 9)

The UI correction at `ce60efb8fef4d98027b02d194c0cd6ef60b24d51` and evidence
head `d423d2df623cf8499beeb6cddb584bbbe7546e99` are accepted for exact-head Pro
review once hosted verification completes. Correct only stale handback metadata:
Inbox version, both implementation SHAs, exact evidence head/four-commit history,
and the obsolete Remotion-fix limitation. Do not change Studio behavior.

## Proof required

- Focused Studio tests cover 0, 1, and 2+ exact candidate-pair counts.
- Existing no-reaction, ambiguity, beat-selection clearing, and boundary tests
  remain green.
- Root `pnpm verify` passes.
- All visible controls remain real, honestly disabled with a reason, or omitted.
- Handback includes exact SHA, changed files, commands/results, screenshot paths,
  and known limitations.

Commit and push the required branch, open a draft PR against
`agent/integrate-kimi-ui-slice-a`, then wait for Codex/Pro review.
