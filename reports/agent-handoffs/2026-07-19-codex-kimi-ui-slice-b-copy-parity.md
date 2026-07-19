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
