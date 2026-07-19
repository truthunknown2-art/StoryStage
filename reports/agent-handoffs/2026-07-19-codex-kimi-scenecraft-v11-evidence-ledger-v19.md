# Codex handoff — Kimi Scene Craft v1.1 evidence ledger (Version 19)

This brief supersedes the Version 18 JSON-first deliverable with ChatGPT Pro's
binding review format. The task, scope, branch, and safety boundaries are
otherwise unchanged.

## Exact branch contract

- Create `agent/kimi-scenecraft-v11-evidence-ledger` from exact accepted base
  `c7618f06c96bd52a866e87dadaaea7a4cf991e4c`.
- Draft PR target: `agent/kcast001-provider-neutral-rig`.
- Source documents are available without switching branches at:
  - `origin/agent/kimi-frontend:docs/editorial/scene-craft-v1.md`
    (source commit `0a4f25d8c5eb4956ed508cf3ab05df1c3c92dd3e`);
  - `origin/agent/kimi-frontend:docs/editorial/scene-craft-v1.1.md`
    (Codex/Pro amendment commit
    `3f07a614625e99532672ad366965afbb66f178cd`).
- Read `docs/PRODUCT_ROADMAP.md`, milestone M3 and the Kimi handoff section.
- Do not merge or cherry-pick the coordination branch. Copy/revise only the
  exact source documents needed for this task.

## Required deliverables

1. `docs/editorial/scene-craft-v1.1.md`
   - status: **Draft editorial knowledge base; non-normative until rule
     classification, evidence mapping, and pilot calibration are accepted**;
   - preserve purposeful coverage, listener reactions, motivated cuts/camera,
     scene energy shaping, reveal preparation, performance follow-through, and
     audio-led timing without turning preferences into universal law;
   - link every candidate principle/number/example to ledger rule IDs;
   - state explicitly that it grants no planning, timing, rig, capability,
     render, audio, export, or production authority.
2. `docs/editorial/scene-craft-rule-ledger-v1.md`
   - use stable IDs `SC-001`, `SC-002`, ...; never encode classification in an
     ID because classification may change after calibration;
   - include every candidate rule, threshold, principle, warning, prior,
     hypothesis, and example from v1 and the v1.1 amendment;
   - no `[PLAN]`, `[CHECK]`, `[RIG]`, or `[AUDIO]` item may remain unclassified.
3. `reports/agent-handoffs/2026-07-19-kimi-scenecraft001-rule-evidence-ledger.md`
   - exact base/head SHAs, changed files, rule counts by class, softened or
     removed v1 claims, numeric claims retained with evidence, numeric claims
     demoted, unresolved questions, commands/results, and an explicit statement
     that no code or authority changed.

## Required ledger fields

Every row must include:

```text
rule ID
plain-language principle
domain
grammar scope
enforcement class
evaluation window
minimum sample requirement
semantic exception codes
evidence source path
exact Git blob and/or 64-character file-content SHA-256
evidence kind
measured sample size, when applicable
confidence
current calibration status
future consumer
implementation owner
notes/rationale
```

Allowed enforcement classes are exactly:

```text
hard invariant
warning
information
planner prior
hypothesis
example only
```

Allowed evidence kinds are exactly:

```text
measured reference
project regression
established editorial practice
unvalidated hypothesis
worked example
```

The evidence source path must identify the exact repository artifact. Record
the Git blob and/or independently computed SHA-256 of the referenced bytes plus
what the evidence can and cannot support. A project regression proves that one
specific failure looked bad in one render; it does not prove a universal
numeric threshold.

## Classification rules

- Hard invariants are limited to already accepted evidence-bound classes:
  source/project/plan lineage and exact coverage; timing-basis and guide-clock
  lineage; timing/read envelopes; causal ordering; continuity, geography,
  axis, screen direction, visibility and lifecycle; root motion/velocity; prop
  ownership/attachment; gait/action/contact/plant/settle; capability/approval
  authority; asset bytes/manifests; honest camera and transition execution;
  deterministic media verification; hidden fallback or competing preview paths.
- Mix, rhythm, variety, reveal richness, gesture frequency, shot count,
  duration CV, streaks, focal repetition, static-idea duration, reaction
  frequency, and transition mix remain graded or unvalidated until calibrated.
- Every inherited numeric claim—including 8–16 frames, `CV < 0.15`, claimed
  threefold improvement, four/six-second limits, gesture counts, reveal counts,
  percentage mixes, and 15 shots—must have exact supporting evidence, sample
  size, evaluation window, confidence, and non-blocking class, or be removed or
  marked unvalidated. Do not invent evidence.
- The 15-shot treatment is one possible high-energy worked example: not a
  target, not the pilot rubric, and not a required shot count.
- One primary shot purpose plus zero to two compatible secondary purposes is
  planning vocabulary, not a quota.
- Cutting on action and cutting on stillness are both valid when motivated.
- Reveal coverage scales by narrative importance; a micro reveal may need only
  one or two shots while a major reveal may use preparation, subject, reaction,
  and re-grounding.
- The blind-pilot scoring rubric is an accepted evaluation contract, not a
  product validator or compiler hard gate.
- Candidate reason/exception codes remain editorial vocabulary only. They do
  not become schemas, enums, validators, or compiler contracts in this task.
- No warning, information, prior, hypothesis, or example row may use blocking
  language such as `fails`, `banned`, `must reject`, or equivalent.

## Exact stop rules

- Documentation only. No TypeScript, schema, validator, quality-report,
  grammar-profile, Show Pack, runtime, worker, UI, audio, provider/model prompt,
  motion, asset requirement, EditorialTargets value, or production gate.
- No new reference-video claims or web research in this slice.
- Do not create Storylight intent examples yet. They wait for both the exact
  accepted Editorial Director contract head and a frozen host-issued pilot
  planning request including clause references from the guide-clock work.
- Do not continue general Studio polish after this task.

## Verification and handback

Run at minimum:

```text
corepack pnpm exec prettier --check docs/editorial/scene-craft-v1.1.md docs/editorial/scene-craft-rule-ledger-v1.md reports/agent-handoffs/2026-07-19-kimi-scenecraft001-rule-evidence-ledger.md
git diff --check
```

Report exact counts by enforcement class and evidence kind, low-confidence and
uncalibrated rows, every limitation, and the exact commit SHA. Push the work
branch, open the draft PR, and wait for immutable-head Codex/Pro review.
