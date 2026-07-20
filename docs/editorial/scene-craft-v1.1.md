# Scene Craft v1.1 — non-normative directing knowledge

- **Status:** Draft editorial knowledge base; non-normative until rule
  classification, evidence mapping, and pilot calibration are accepted. Every
  candidate rule is classified with evidence in
  [`scene-craft-rule-ledger-v1.md`](./scene-craft-rule-ledger-v1.md) under a
  stable rule ID (`SC-###`).
- **Supersedes for future adoption:** `scene-craft-v1.md` at
  `0a4f25d8c5eb4956ed508cf3ab05df1c3c92dd3e`.
- **Editorial source:** Kimi Scene Craft v1, amended by Codex and ChatGPT Pro.
- **Scope and authority:** planning context, quality observations, capability
  requests, and blind editorial evaluation only. **This document grants no
  planning, timing, rig, capability, render, audio, export, or production
  authority.** Nothing here is a validator, threshold, compiler behavior,
  quality gate, model instruction, or production rule. Codex will decide later
  whether any accepted entry becomes behavior.

Scene Craft v1 captured useful creative vocabulary, but mixed continuity
invariants, editorial preferences, project regressions, reference priors,
unvalidated hypotheses, and one illustrative edit. This revision separates
those categories so StoryStage does not replace a mechanical lookup-table
director with a more elaborate rule-table director. The companion ledger is
the classification of record: each section below names the rule IDs that
carry its claims.

## Rule taxonomy

No statement in this document becomes code until it is represented with the
following metadata and reviewed under a new immutable content hash:

```ts
type SceneCraftRule = {
  id: string;
  grammarScope: Array<"kids-adventure" | "weird-history">;
  domain: "plan" | "continuity" | "quality" | "rig" | "audio";
  enforcement:
    | "hard invariant"
    | "warning"
    | "information"
    | "planner prior"
    | "hypothesis"
    | "example only";
  minimumSampleSize: number | null;
  exceptionCodes: string[];
  sourceContentHashes: string[];
  evidenceKind:
    | "measured reference"
    | "project regression"
    | "established editorial practice"
    | "unvalidated hypothesis"
    | "worked example";
  confidence: "low" | "medium" | "high";
};
```

Hard invariants belong in deterministic compilers and continuity validators.
Soft taste findings belong in the quality report. Priors guide a planner but do
not become quotas. Hypotheses remain non-normative until measured.

### Hard invariant classes

Only these classes may block:

- broken source, plan, grammar, asset, timing, or capability lineage;
- illegal or unsatisfied timing and readable-action windows;
- continuity, geography, axis, screen-direction, or lifecycle dropout;
- unexplained prop ownership, attachment, scale, depth-plane, or position
  jumps;
- unsupported capabilities or camera/transition labels that do not match the
  rendered result;
- action, gait, contact, plant, catch, handoff, or causal-response
  discontinuity;
- known fake-preview or accidental whole-body pose-swap techniques.

_Ledger rules: SC-001, SC-002, SC-003, SC-004, SC-005, SC-006, SC-007,
SC-008, SC-009._

### Soft editorial findings

These inform planning and human review but do not veto a cut by themselves:

- shot-size and transition distribution;
- same-size, camera-movement, focal-staging, or gesture streaks;
- duration variance and unchanged visual-idea duration;
- composition variety and reaction coverage;
- reveal coverage completeness.

_Ledger rules: SC-025, SC-026, SC-027, SC-028, SC-029, SC-030, SC-031,
SC-032, SC-033, SC-034, SC-035, SC-036, SC-037, SC-039 (all hypothesis or
example only, low confidence, pending calibration)._

### Unvalidated hypotheses

The following values from v1 are explicitly non-normative pending calibration:

- an 8–16 frame reveal hold or any claimed threefold reveal improvement;
- `CV < 0.15` as a universal pacing threshold;
- a universal four-second static-idea limit;
- a six-second gesture-repeat limit or six mandatory gestures per character;
- three-of-four coverage for every reveal;
- 15 shots per 30 seconds.

_Ledger rules: SC-024, SC-025, SC-026, SC-027, SC-029, SC-039._

## 1. Shot purpose

Every shot declares one primary purpose and may carry compatible secondary
purposes:

```ts
type EditorialShotPurpose = {
  primaryPurpose:
    | "establish"
    | "advance"
    | "feel"
    | "punctuate"
    | "bridge"
    | "payoff";
  secondaryPurposes: Array<
    | "preserve-geography"
    | "listener-reaction"
    | "reveal-information"
    | "carry-action"
    | "reset-energy"
    | "support-dialogue"
  >;
  reasonCodes: EditorialReasonCode[];
  rationale: string;
};
```

A shot may have zero to two compatible secondary purposes. It is rejected only
when it has no primary purpose, declares contradictory purposes, or cannot
satisfy its purposes inside the exact timing and capability envelope. Multiple
useful functions are not themselves a reason to split a shot.

_Ledger rules: SC-010 (hard invariant rejection cases), SC-011 (purpose
vocabulary, planner prior)._

## 2. Coverage and shot mix

Wide, medium, close-up, insert, two-shot, listener reaction, and point-of-view
coverage are planning vocabulary, not a mandatory sequence.

- A wide can establish or re-establish geography.
- A medium carries performance and conversational body language.
- A close-up spends emphasis on a readable feeling or decision.
- An insert makes information, contact, or a prop state readable.
- A reaction is motivated by the listener or affected character, not a static
  role label.

The v1 `25 / 40 / 25 / 10` mix is a soft reference prior. Distribution is not
judged below eight shots, is informational for 8–11 shots, and may produce a
warning at 12 or more shots only when substantially outside the active grammar
target without a valid semantic justification. Any target must bind the exact
grammar-profile, show-pack, reference-analysis, sample-size, confidence, and
evaluation-window hashes.

_Ledger rules: SC-012, SC-013 (planner prior vocabulary), SC-030 (mix prior,
unvalidated)._

## 3. Motivated cuts and continuity

Every cut declares a motivation. Cut on action when motion continuity carries
the eye across the boundary. Cut on stillness when the completed hold, joke,
reaction, realization, or new information is the event.

Useful motivations include:

- action continuity, reaction readability, clause boundary, or comic hold;
- new information, resolved eyeline, geography reset, or graphic match;
- intentional jump, time transition, or scene transition.

Hard failures include cutting before a required read window, between
incompatible action phases, across a gait discontinuity, before contact or
causal response is readable, or across an unexplained axis/geography reversal.
A cut on a hold is not inherently defective.

_Ledger rules: SC-014 (planner prior vocabulary), SC-042 (hard invariant
mechanical cut failures)._

## 4. Motivated camera

Each shot has one primary camera intent. A compound camera program is allowed
only when the renderer supports every component, the proposal declares a
structured reason, and deterministic validation confirms that the rendered
samples perform the claimed movement.

Push, pull, pan, track, orbit, and locked framing are choices tied to story and
blocking. A motivated pan-plus-push is not rejected merely because it combines
two components. A camera label that does not match its actual samples is a hard
failure.

_Ledger rules: SC-015 (planner prior vocabulary), SC-005 (hard invariant
label honesty), SC-034 (v1 claim recorded as hypothesis and superseded)._

## 5. Pacing and holds

Scenes declare an energy shape rather than being forced through one universal
curve. Supported planning vocabulary includes:

`flat-comic`, `sustained-tension`, `rising`, `falling`, `breather`, `button`,
`bridge`, and `reveal`.

A pre-reveal hold is an available directing device, not a quota. Its duration
is resolved by approved audio, action phase, read windows, grammar, scene
energy, and the timing solver.

Low duration variance may produce a warning only when there are at least eight
resolved shots, the sequence is not an intentional montage, audio does not
prescribe regular intervals, and the sample offers enough opportunity for
variation. Mechanical failures remain outside the taste report.

_Ledger rules: SC-016 (energy shapes, planner prior), SC-017 (pre-reveal hold
device, planner prior), SC-024 (8–16f hold, hypothesis), SC-025 (CV floor,
hypothesis)._

## 6. Variety and meaningful change

Three same-sized shots, repeated camera movement, focal staging, gesture,
long visual ideas, or low duration variance are observations, not automatic
rejection.

- Three same-sized shots may warn unless justified; four or more may warn more
  strongly but still require semantic context.
- Gesture repetition is meaningful only when the same semantic motion program,
  phase structure, timing, and screen function recur visibly.
- A visual idea has changed when performance, framing, blocking, gaze, prop
  state, camera, lighting/effect, or audio meaning changes.

A six-second locked close-up with excellent acting is not a static tableau.

_Ledger rules: SC-026 (static-idea limit, hypothesis), SC-027 (gesture
repeat, project regression observation with hypothesis status), SC-028
(same-size streaks, hypothesis), SC-033 (focal staging, hypothesis)._

## 7. Transition grammar

Transition kinds remain planning vocabulary and EditorialTargets priors. Hard
block only when:

- the transition label does not match its rendered semantics;
- an occlusion wipe never occludes the frame;
- a portal crossing becomes an unexplained teleport;
- a background swaps during falsely continuous physical action;
- a subject lifecycle or screen position jumps without declared transition
  logic;
- a dissolve conceals an unsupported full-body pose substitution.

An identical-pose dissolve can be an intentional graphic rhyme, time
transition, or emotional suspension; it is not universally banned.

_Ledger rules: SC-018 (planner prior vocabulary), SC-041 (hard invariant
mechanical transition failures), SC-032 (dissolve pose-change claim,
hypothesis), SC-033 (occlusion wipe timing, hypothesis)._

## 8. Reveal coverage

`notice → show subject → react → re-ground/pay off physically` is a coverage
palette whose use scales with narrative importance:

```ts
type RevealImportance = "micro" | "beat" | "major" | "set-piece";
```

- `micro`: one shot can be sufficient;
- `beat`: subject plus response is usually sufficient;
- `major`: preparation, subject, and reaction are expected;
- `set-piece`: the full palette is preferred.

The hard failure is unreadable causality: the audience cannot identify what
was noticed, who reacted, or what changed.

_Ledger rules: SC-019 (importance-scaled palette, planner prior), SC-043
(unreadable causality, hard invariant), SC-029 (three-of-four coverage,
hypothesis)._

## 9. Rig and performance capability knowledge

Useful defaults include gaze leading head/body motion, gestures with
preparation and resolution, living holds, view-correct facing, and the absence
of accidental opacity-stacked whole-body swaps.

The default action phrase is
`anticipation → action → contact/impact → settle`; overshoot is optional by
action and style. Gaze lead, blink cadence, pose evolution, and living-hold
micro-motion are style targets with intentional exceptions, not universal hard
gates.

Rig contracts describe requested channels and behaviors—not arbitrary asset
counts:

- independent gaze and blink;
- head follow and torso overlap;
- bilateral limb articulation;
- contact, plant, and settle;
- view-correct facing;
- viseme replacement;
- living holds.

Approved smear drawings may eventually be a valid style capability.
Accidental semi-transparent whole-body crossfades remain prohibited.

_Ledger rules: SC-020 (capability knowledge, planner prior), SC-035 (pose
evolution interval, hypothesis), SC-036 (gaze-lead offsets, hypothesis),
SC-037 (blink cadence, hypothesis), SC-038 (accidental smear prohibition,
hard invariant, project regression), SC-007 (pose-swap prohibition,
hard invariant)._

## 10. Audio-led timing

The timing hierarchy is:

`approved final audio → guide voice → estimated timing`.

Narration or dialogue is the master clock when an approved or guide timing
basis exists. The deterministic timing solver owns final frames. Sound density
is editorial: the system does not require an effect for every footfall, reveal,
whoosh, or magical event. Exact synchronization is required for cues the plan
actually requests.

_Ledger rules: SC-021 (timing authority hierarchy, hard invariant), SC-022
(requested-cue synchronization, planner prior), SC-023 (J/L-cut bridges,
planner prior)._

## Illustrative high-energy treatment

The 15-shot v1 table remains one possible high-energy coverage treatment, not
a target or scoring rubric. Its shot count and timings are illustrative. A
planner may combine, omit, or extend coverage based on voice, importance,
performance, capability, and scene energy. Example rows must be labelled
`essential`, `optional coverage`, or `alternate` before reuse.

The blind pilot is scored independently:

| Criterion                            | Weight |
| ------------------------------------ | -----: |
| Story clarity and causality          |     25 |
| Purposeful composition and coverage  |     20 |
| Motivated cuts and action continuity |     20 |
| Pacing and readable holds            |     15 |
| Character reactions and performance  |     10 |
| Visual variety without randomness    |     10 |

It must not reward matching a proposed shot list.

_Ledger rules: SC-039 (15-shot density, example only), SC-040 (blind-pilot
rubric, example only evaluation contract for human review — authorizes no
validator or hard gate)._

## Adoption path

1. This draft is reviewed and sealed under an immutable hash.
2. Codex maps every candidate rule to hard invariant, warning, information,
   prior, hypothesis, or example.
3. Hard invariants remain in compiler and continuity validators.
4. Soft rules enter the quality report with sample sizes and exception codes.
5. Planning material becomes AI-planner context and structured reason codes.
6. Rig material becomes a capability request only when a plan requires it.
7. Blind pilot results calibrate numeric editorial thresholds.

Until those steps occur, this file is planning knowledge only. It authorizes no
new validation rule or production behavior.
