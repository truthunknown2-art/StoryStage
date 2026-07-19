# Codex handoff — Kimi Scene Craft v1.1 evidence ledger

## Purpose

Turn the useful but mixed Scene Craft material into a complete, auditable,
non-normative editorial knowledge ledger. This closes roadmap milestone
`SCENECRAFT-001` at the documentation/evidence layer only. Codex will decide
later whether any accepted entry becomes compiler, continuity, quality-report,
capability, or planner behavior.

## Exact branch contract

- Create `agent/kimi-scenecraft-v11-evidence-ledger` from exact accepted base
  `c7618f06c96bd52a866e87dadaaea7a4cf991e4c`.
- Draft PR target: `agent/kcast001-provider-neutral-rig`.
- Source documents are available without changing branches at:
  - `origin/agent/kimi-frontend:docs/editorial/scene-craft-v1.md`
    (original source commit `0a4f25d8c5eb4956ed508cf3ab05df1c3c92dd3e`);
  - `origin/agent/kimi-frontend:docs/editorial/scene-craft-v1.1.md`
    (Codex/Pro amendment commit
    `3f07a614625e99532672ad366965afbb66f178cd`).
- Read the binding roadmap now present on the accepted base:
  `docs/PRODUCT_ROADMAP.md`, milestone M3 and the Kimi handoff section.

Do not merge or cherry-pick the coordination branch. Copy and revise only the
two exact source documents needed for this task.

## Required deliverables

1. `docs/editorial/scene-craft-v1.1.md`
   - preserve the accepted Pro/Codex hard-versus-soft ruling;
   - link every creative section to ledger rule IDs;
   - state clearly that the document grants no planning, timing, rig,
     capability, render, audio, export, or production authority.
2. `docs/editorial/scene-craft-v1.1-rule-ledger.json`
   - valid formatted JSON;
   - one source-artifact registry plus one numbered record for every candidate
     rule, threshold, principle, warning, prior, hypothesis, and example from
     v1 and the v1.1 amendment;
   - no unclassified leftovers hidden only in prose.
3. A dated handback under `reports/agent-handoffs/` with exact commit SHA,
   changed files, commands/results, limitations, and integration instructions.

## Required record shape

Each ledger rule must contain at least:

```text
id
title
sourceSection
grammarScope
domain
enforcement
minimumSampleSize
exceptionCodes
sourceContentHashes
evidenceKind
confidence
disposition
rationale
```

Allowed enforcement values:

```text
hard-invariant
warning
information
planner-prior
hypothesis
example-only
```

Allowed evidence kinds:

```text
measured-reference
project-regression
established-practice
unvalidated-hypothesis
```

The source-artifact registry must identify the exact repo path/reference, Git
commit where applicable, independently computed SHA-256 of the referenced file
bytes, evidence kind, and a short statement of what that source can and cannot
support. Git commit IDs are provenance metadata, not substitutes for the
64-character file-content SHA-256.

## Classification rules

- Only evidence-bound mechanical/authority failures may be classified
  `hard-invariant`: exact lineage and source coverage, timing/read envelopes,
  causal/continuity/geography/axis/lifecycle/prop/contact/gait/action
  consistency, capability/approval authority, asset integrity, honest executed
  camera/transition behavior, deterministic honest render output, and no
  hidden planner fallback.
- Shot mix, duration CV, streaks, focal/gesture repetition, reveal pattern,
  static-idea duration, reaction frequency, transition mix, and total shot
  count are graded findings or hypotheses only. They require minimum sample,
  semantic exceptions, evidence, and confidence before any future calibration.
- Every inherited numeric claim from v1—including 8–16 frames, CV 0.15,
  four/six-second limits, gesture counts, reveal counts, shot counts, and
  percentage mixes—must be `hypothesis`, `planner-prior`, or `example-only`
  unless a directly measured source in this repository genuinely supports the
  exact claim. Do not invent evidence or upgrade confidence.
- The 15-shot treatment is an illustrative high-energy example, never a target
  or scoring rubric.
- Preserve purposeful coverage, listener reaction, motivated cuts/camera,
  energy shaping, reveal preparation, performance follow-through, and
  audio-led timing as useful planner knowledge without turning them into quotas.
- The blind-pilot scoring rubric may be recorded as an accepted evaluation
  contract, but it does not authorize a validator or hard gate inside product
  code.

## Exact stop rules

- No TypeScript/product code, schema export, validator, quality threshold,
  compiler/runtime behavior, model call, UI, audio route, or production gate.
- No new reference-video claims or web research in this slice.
- No fake content hashes, Git SHAs presented as content hashes, empty evidence
  disguised as established practice, or universal animation folklore presented
  as measured fact.
- Do not prepare the Storylight external-intent examples yet; Codex will issue
  that next task against the accepted Editorial Director contract head.

## Verification

At minimum run:

```text
node -e "JSON.parse(require('fs').readFileSync('docs/editorial/scene-craft-v1.1-rule-ledger.json','utf8')); console.log('valid JSON')"
corepack pnpm exec prettier --check docs/editorial/scene-craft-v1.1.md docs/editorial/scene-craft-v1.1-rule-ledger.json
git diff --check
```

Report the exact rule count, count by enforcement class, count by evidence
kind, any rules left at low confidence, and every limitation. Commit and push,
open the draft PR, then wait for exact-head Codex/Pro review.
