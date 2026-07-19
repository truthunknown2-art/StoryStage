# Scene Craft Rule & Evidence Ledger v1

- **Status:** Non-normative editorial knowledge and evidence classification
  only. Grants no planning, timing, rig, capability, render, audio, export, or
  production authority. No row is a validator, threshold, compiler behavior,
  quality gate, model instruction, or production rule.
- **IDs:** `SC-###` are stable and carry no classification, because
  classification may change after calibration. Never encode class in an ID.
- **Source corpus:** Scene Craft v1 (`0a4f25d`) and the Codex/Pro v1.1
  amendment (`3f07a61`), read without merging the coordination branch.
- **Milestone:** SCENECRAFT-001 (`docs/PRODUCT_ROADMAP.md`, M3) at the
  documentation/evidence layer only.

Enforcement classes (exact vocabulary): `hard invariant`, `warning`,
`information`, `planner prior`, `hypothesis`, `example only`.
Evidence kinds (exact vocabulary): `measured reference`, `project regression`,
`established editorial practice`, `unvalidated hypothesis`, `worked example`.
Rows that are not `hard invariant` deliberately avoid blocking language
(`fails`, `banned`, `must reject`); only hard invariants may block.

## Source & evidence registry

Git commits and blob IDs are provenance metadata; the independently computed
SHA-256 values below are of the referenced file bytes.

| Artifact                                                        | Git commit / blob                                                | SHA-256 (file bytes)                                               | Evidence kind                  | What it can support                                                                   | What it cannot support                                                                               |
| --------------------------------------------------------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------ | ------------------------------ | ------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `docs/editorial/scene-craft-v1.md`                              | `0a4f25d` / blob `5ca8a0d763f75188e7b8bcb469d96b251971c005`      | `74f510efc3ebfb7dbf143eeac2c83fef30e017c2ee59363f0dcc4b6da9ef8138` | established editorial practice | Creative vocabulary, section structure, candidate numeric claims                      | Validating any numeric claim                                                                         |
| `docs/editorial/scene-craft-v1.1.md`                            | `3f07a61` / blob `3b3cd1a9beb12dca42d4523335d68386f520ccc2`      | `8a128f2ecdd7616e801940d6c07e28d0a69aff0af9119ac1b1c9e602458d90e2` | established editorial practice | The accepted hard-versus-soft ruling, taxonomy, softened text, illustrative treatment | Granting authority                                                                                   |
| `docs/PRODUCT_ROADMAP.md`                                       | base `c7618f0` / blob `2392b9ff14ddc2be68f834c502c8235edb54a4fa` | `428b8af5a8232ff09c2e27cd787e7c14c89f6448f7d7deb84f1b951411c98388` | established editorial practice | Milestone scope and ownership                                                         | Rule evidence                                                                                        |
| `docs/REFERENCE-DIRECTION-STUDY.md`                             | base `c7618f0` / blob `fcadbec974e6de88fdde1977c289de2b2260efa3` | `8626e859ebb83541ff903722728d27a22a39d18c84fc6050ee6e1a661f4b9dd1` | established editorial practice | Direction-study context for priors                                                    | Exact StoryStage thresholds                                                                          |
| `docs/reference-analysis/kids-dragon-hunt-2-analysis.json`      | base `c7618f0` / blob `918678ab0a1ed6397e086aa721b2e3f35bb26361` | `f0bfd8e2f4f65b6681be46164abc92d5402230f8d63c8818e9c91e34bd6fbf8d` | measured reference             | Existence of established editorial patterns in reference kids content                 | Exact StoryStage numeric thresholds or mixes                                                         |
| `docs/reference-analysis/sticko-teen-analysis.json`             | base `c7618f0` / blob `02cf995b9c17589b18d7ec97268e006c92bac037` | `7c7366d919dac8de8fb7d9b3a304165cae3f440fc43a533e30a15e5553697f2a` | measured reference             | Reference-content coverage/reaction/pacing patterns                                   | Exact StoryStage numeric thresholds                                                                  |
| `docs/reference-analysis/profile-comparison.md`                 | base `c7618f0` / blob `00800a224fee21ae381a5fbaaeedeab90082b782` | `8bd4aef3d1621d5ae5712a87739d507da2a901605679f08d31639ebed777ff11` | measured reference             | Cross-profile grammar context                                                         | Exact numeric rules                                                                                  |
| `docs/design/kids-showcase-proof/pro-encoded-frame-audit-v3.md` | base `c7618f0` / blob `e9cc015cd9f8f05f414d431f05055f70f02ab53c` | `7c614aa6d41087359f6d3860b0b3befb0b58d9a27299124112472eeab883c28f` | project regression             | One project-observed repeated gesture and smear ghosting in one 30s render            | Universal numeric limits (a regression proves one failure looked bad in one render, not a threshold) |
| `docs/design/kids-showcase-proof/proof-report.json`             | base `c7618f0` / blob `8f7c9e44e82f66ede0269dad94d77af8d31929f4` | `75599bdef8b1970daca8a3904ceec3a9b3b9b4892221d83ab64c1e32ba0bbde0` | project regression             | Proof-run provenance                                                                  | Rule evidence                                                                                        |
| `docs/design/kids-showcase-proof/frame-024.png`                 | base `c7618f0` / blob `f87e505fdcd747cae9ac4849d2d80cd597dcfc44` | `cffdaa0022ee6e11d05637215b287b6ec219f459999f079a32265f31f6fd68ee` | project regression             | Frame-level audit artifact                                                            | Rule evidence                                                                                        |
| `docs/design/kids-showcase-proof/frame-069.png`                 | base `c7618f0` / blob `e1bc8c55d9b4dd6eacd05b059a5958718412ea65` | `49decff83688b5cae450be47ead3a674b6ea59de60c3554463a9ba277f2f53c4` | project regression             | Frame-level audit artifact                                                            | Rule evidence                                                                                        |
| `docs/design/kids-showcase-proof/frame-108.png`                 | base `c7618f0` / blob `e5864b6117519937e42174157a1d2311cc9cd8ae` | `ad6130f43f3465e1f65ce823dc3782c95260ea4055cd5c7a137b6415246ccc55` | project regression             | Frame-level audit artifact                                                            | Rule evidence                                                                                        |

## Hard invariants

Evidence-bound mechanical/authority failures only: exact lineage and source
coverage, timing-basis and guide-clock lineage, timing/read envelopes, causal
ordering, continuity/geography/axis/screen-direction/visibility/lifecycle,
root motion/velocity, prop ownership/attachment, gait/action/contact/plant/
settle, capability/approval authority, asset bytes/manifests, honest camera and
transition execution, deterministic media verification, and no hidden fallback
or competing preview paths. These rows may block and live in Codex-owned
compiler/continuity validators, not in this document.

### SC-001 — Exact source, plan, grammar, asset, timing, and capability lineage

- **Principle:** Any break in exact source, plan, grammar, asset, timing, or capability lineage is a blocking failure.
- **Domain:** continuity · **Grammar scope:** kids-adventure, weird-history
- **Enforcement:** hard invariant · **Confidence:** high
- **Evaluation window:** every compiled plan
- **Minimum sample:** n/a — a single instance proves the failure
- **Exception codes:** —
- **Evidence:** `docs/editorial/scene-craft-v1.1.md` §Hard-invariant classes (blob `3b3cd1a…`, sha-256 `8a128f2e…`) · established editorial practice
- **Measured sample:** n/a
- **Calibration status:** accepted (authority-owned; no calibration pending)
- **Future consumer:** compiler & continuity validators · **Implementation owner:** Codex
- **Notes:** Lineage failure is mechanical, never a taste finding; this is the only blocking kind the ruling accepts.

### SC-002 — Legal timing and readable-action windows

- **Principle:** Cuts and actions must fit the legal timing envelope and the required read windows.
- **Domain:** continuity · **Grammar scope:** kids-adventure, weird-history
- **Enforcement:** hard invariant · **Confidence:** high
- **Evaluation window:** every cut boundary and action phrase
- **Minimum sample:** n/a
- **Exception codes:** —
- **Evidence:** `docs/editorial/scene-craft-v1.1.md` §Hard-invariant classes, §3, §5 (blob `3b3cd1a…`) · established editorial practice
- **Measured sample:** n/a
- **Calibration status:** accepted (authority-owned)
- **Future consumer:** timing solver & read-window validation · **Implementation owner:** Codex
- **Notes:** Cutting before a required read window or inside an unsatisfied action envelope is measurable.

### SC-003 — Continuity of geography, axis, screen direction, and subject lifecycle

- **Principle:** Geography, axis, screen direction, and subject lifecycle may not drop out or reverse without declared transition logic.
- **Domain:** continuity · **Grammar scope:** kids-adventure, weird-history
- **Enforcement:** hard invariant · **Confidence:** high
- **Evaluation window:** every shot boundary and scene transition
- **Minimum sample:** n/a
- **Exception codes:** `declared-transition-logic`
- **Evidence:** `docs/editorial/scene-craft-v1.1.md` §Hard-invariant classes, §3, §7 (blob `3b3cd1a…`) · established editorial practice
- **Measured sample:** n/a
- **Calibration status:** accepted (authority-owned)
- **Future consumer:** continuity validation · **Implementation owner:** Codex
- **Notes:** Intentional jumps are legal only with declared transition logic.

### SC-004 — Prop ownership, attachment, scale, depth-plane, and position consistency

- **Principle:** Props may not jump ownership, attachment, scale, depth plane, or position without explanation.
- **Domain:** continuity · **Grammar scope:** kids-adventure, weird-history
- **Enforcement:** hard invariant · **Confidence:** high
- **Evaluation window:** every shot containing a tracked prop
- **Minimum sample:** n/a
- **Exception codes:** —
- **Evidence:** `docs/editorial/scene-craft-v1.1.md` §Hard-invariant classes (blob `3b3cd1a…`) · established editorial practice
- **Measured sample:** n/a
- **Calibration status:** accepted (authority-owned)
- **Future consumer:** continuity validation · **Implementation owner:** Codex
- **Notes:** Prop jumps are mechanical discontinuities in the asset/continuity envelope.

### SC-005 — Executed camera and transition behavior matches its labels

- **Principle:** A camera or transition label must match what deterministic sampling actually rendered.
- **Domain:** quality · **Grammar scope:** kids-adventure, weird-history
- **Enforcement:** hard invariant · **Confidence:** high
- **Evaluation window:** every camera program and transition boundary
- **Minimum sample:** n/a
- **Exception codes:** —
- **Evidence:** `docs/editorial/scene-craft-v1.1.md` §Hard-invariant classes, §4, §7 (blob `3b3cd1a…`) · established editorial practice
- **Measured sample:** n/a
- **Calibration status:** accepted (authority-owned)
- **Future consumer:** deterministic sample validation · **Implementation owner:** Codex
- **Notes:** Motivation stays editorial; executed-behavior honesty is mechanical.

### SC-006 — Action, gait, contact, plant, catch, handoff, and causal-response continuity

- **Principle:** Action mechanics — gait, contact, plant, catch, handoff, causal response — may not be discontinuous.
- **Domain:** continuity · **Grammar scope:** kids-adventure, weird-history
- **Enforcement:** hard invariant · **Confidence:** high
- **Evaluation window:** every action phrase and cut boundary
- **Minimum sample:** n/a
- **Exception codes:** —
- **Evidence:** `docs/editorial/scene-craft-v1.1.md` §Hard-invariant classes, §3 (blob `3b3cd1a…`) · established editorial practice
- **Measured sample:** n/a
- **Calibration status:** accepted (authority-owned)
- **Future consumer:** continuity validation · **Implementation owner:** Codex
- **Notes:** Cuts across gait discontinuity or unreadable contact are mechanical failures.

### SC-007 — No known fake-preview or accidental whole-body pose-swap techniques

- **Principle:** Fake-preview tricks and accidental whole-body pose swaps are prohibited unless an approved future style capability legitimizes a variant.
- **Domain:** rig · **Grammar scope:** kids-adventure, weird-history
- **Enforcement:** hard invariant · **Confidence:** high
- **Evaluation window:** every render
- **Minimum sample:** n/a
- **Exception codes:** `approved-style-capability`
- **Evidence:** `docs/editorial/scene-craft-v1.1.md` §Hard-invariant classes, §9 (blob `3b3cd1a…`) + `docs/design/kids-showcase-proof/pro-encoded-frame-audit-v3.md` (blob `e9cc015…`, sha-256 `7c614aa6…`) · project regression
- **Measured sample:** 1 render (30s kids showcase proof; ghosting observed around 0:16/0:20)
- **Calibration status:** accepted (authority-owned)
- **Future consumer:** renderer & rig validation · **Implementation owner:** Codex
- **Notes:** The accidental variant was project-observed; approved smear drawings may become a valid future style capability.

### SC-008 — Asset integrity and deterministic honest render output

- **Principle:** Output must be exactly what the sealed plan produced, from intact asset bytes and manifests, deterministically.
- **Domain:** quality · **Grammar scope:** kids-adventure, weird-history
- **Enforcement:** hard invariant · **Confidence:** high
- **Evaluation window:** every render and delivery
- **Minimum sample:** n/a
- **Exception codes:** —
- **Evidence:** `docs/editorial/scene-craft-v1.1.md` §Hard-invariant classes (blob `3b3cd1a…`) · established editorial practice
- **Measured sample:** n/a
- **Calibration status:** accepted (authority-owned)
- **Future consumer:** renderer authority & media verification · **Implementation owner:** Codex
- **Notes:** Integrity and determinism are authority properties, not preferences.

### SC-009 — No hidden planner fallback or competing preview path

- **Principle:** Planner intent may not be silently substituted, and no hidden fallback or competing preview path may exist.
- **Domain:** plan · **Grammar scope:** kids-adventure, weird-history
- **Enforcement:** hard invariant · **Confidence:** high
- **Evaluation window:** every planning pass and preview
- **Minimum sample:** n/a
- **Exception codes:** —
- **Evidence:** `docs/editorial/scene-craft-v1.1.md` §Hard-invariant classes (blob `3b3cd1a…`) · established editorial practice
- **Measured sample:** n/a
- **Calibration status:** accepted (authority-owned)
- **Future consumer:** planner authority · **Implementation owner:** Codex
- **Notes:** Fallback must be declared; silence is an authority failure.

### SC-010 — Shot rejected when it has no primary purpose, contradictory purposes, or an unsatisfiable envelope

- **Principle:** A shot is rejected only when it has no primary purpose, declares contradictory purposes, or cannot satisfy its purposes inside the exact timing and capability envelope.
- **Domain:** plan · **Grammar scope:** kids-adventure, weird-history
- **Enforcement:** hard invariant · **Confidence:** high
- **Evaluation window:** every planned shot
- **Minimum sample:** n/a
- **Exception codes:** —
- **Evidence:** `docs/editorial/scene-craft-v1.1.md` §1 (blob `3b3cd1a…`) · established editorial practice
- **Measured sample:** n/a
- **Calibration status:** accepted (authority-owned)
- **Future consumer:** plan validation · **Implementation owner:** Codex
- **Notes:** Narrows v1's "exactly one job" to mechanical rejection cases; multiple useful functions are fine (see SC-011).

### SC-021 — Timing authority hierarchy: approved final audio → guide voice → estimated timing

- **Principle:** Approved final audio outranks guide voice, which outranks estimated timing; the deterministic timing solver owns final frames.
- **Domain:** audio · **Grammar scope:** kids-adventure, weird-history
- **Enforcement:** hard invariant · **Confidence:** high
- **Evaluation window:** every timed episode
- **Minimum sample:** n/a
- **Exception codes:** —
- **Evidence:** `docs/editorial/scene-craft-v1.md` §10 (blob `5ca8a0d…`) + `docs/editorial/scene-craft-v1.1.md` §10 (blob `3b3cd1a…`) · established editorial practice
- **Measured sample:** n/a
- **Calibration status:** accepted (authority-owned)
- **Future consumer:** timing authority · **Implementation owner:** Codex
- **Notes:** Estimated timing never overrides an approved or guide basis; word-count estimates are fallback, never master.

### SC-038 — No accidental semi-transparent multi-pose smear frames

- **Principle:** Speed is conveyed by spacing and background streaks, not by accidental opacity-stacked whole-body crossfades.
- **Domain:** rig · **Grammar scope:** kids-adventure, weird-history
- **Enforcement:** hard invariant · **Confidence:** high
- **Evaluation window:** every render
- **Minimum sample:** n/a
- **Exception codes:** `approved-style-capability`
- **Evidence:** `docs/editorial/scene-craft-v1.md` §9 (blob `5ca8a0d…`) + `docs/design/kids-showcase-proof/pro-encoded-frame-audit-v3.md` (blob `e9cc015…`) · project regression
- **Measured sample:** 1 render (30s kids showcase proof)
- **Calibration status:** accepted (authority-owned)
- **Future consumer:** renderer & rig validation · **Implementation owner:** Codex
- **Notes:** Project-observed ghosting; approved smear drawings may become a valid future capability.

### SC-048 — Transition mechanical failures

- **Principle:** Hard-block transition label mismatch, a wipe that never occludes, an unexplained teleport, a background swap during falsely continuous action, a lifecycle/position jump without declared logic, and a dissolve concealing an unsupported full-body pose substitution.
- **Domain:** continuity · **Grammar scope:** kids-adventure, weird-history
- **Enforcement:** hard invariant · **Confidence:** high
- **Evaluation window:** every transition boundary
- **Minimum sample:** n/a
- **Exception codes:** `declared-transition-logic`, `approved-style-capability`
- **Evidence:** `docs/editorial/scene-craft-v1.1.md` §7 (blob `3b3cd1a…`) · established editorial practice
- **Measured sample:** n/a
- **Calibration status:** accepted (authority-owned)
- **Future consumer:** continuity & renderer validation · **Implementation owner:** Codex
- **Notes:** Mechanical failures only; transition taste is graded separately (SC-018, SC-031, SC-032, SC-033).

### SC-049 — Cut mechanical failures

- **Principle:** Hard-block cuts before a required read window, between incompatible action phases, across gait discontinuity, before readable contact/causal response, and across unexplained axis/geography reversals.
- **Domain:** continuity · **Grammar scope:** kids-adventure, weird-history
- **Enforcement:** hard invariant · **Confidence:** high
- **Evaluation window:** every cut boundary
- **Minimum sample:** n/a
- **Exception codes:** —
- **Evidence:** `docs/editorial/scene-craft-v1.1.md` §3 (blob `3b3cd1a…`) · established editorial practice
- **Measured sample:** n/a
- **Calibration status:** accepted (authority-owned)
- **Future consumer:** continuity validation · **Implementation owner:** Codex
- **Notes:** A cut on a hold is not inherently defective; only the mechanical cases block.

### SC-050 — Reveal hard failure: unreadable causality

- **Principle:** A reveal blocks only when the audience cannot identify what was noticed, who reacted, or what changed.
- **Domain:** continuity · **Grammar scope:** kids-adventure, weird-history
- **Enforcement:** hard invariant · **Confidence:** high
- **Evaluation window:** every reveal-class beat
- **Minimum sample:** n/a
- **Exception codes:** —
- **Evidence:** `docs/editorial/scene-craft-v1.1.md` §8 (blob `3b3cd1a…`) · established editorial practice
- **Measured sample:** n/a
- **Calibration status:** accepted (authority-owned)
- **Future consumer:** continuity validation · **Implementation owner:** Codex
- **Notes:** Palette completeness stays a graded finding (SC-029); only causality blocks.

## Planner priors

Accepted planning knowledge: purposeful coverage, listener reactions,
motivated cuts/camera, scene energy shaping, reveal preparation, performance
follow-through, and audio-led timing. These guide a planner; they are never
quotas.

### SC-011 — Shot purpose vocabulary: one primary purpose plus zero to two compatible secondaries

- **Principle:** Every shot declares a primary purpose (establish, advance, feel, punctuate, bridge, payoff) and may carry up to two compatible secondary purposes with reason codes.
- **Domain:** plan · **Grammar scope:** kids-adventure, weird-history
- **Enforcement:** planner prior · **Confidence:** medium
- **Evaluation window:** planner context per shot
- **Minimum sample:** n/a
- **Exception codes:** —
- **Evidence:** `docs/editorial/scene-craft-v1.md` §1 + `docs/editorial/scene-craft-v1.1.md` §1 (blobs `5ca8a0d…`, `3b3cd1a…`) · established editorial practice
- **Measured sample:** n/a
- **Calibration status:** accepted as planner vocabulary (non-normative)
- **Future consumer:** AI planner context · **Implementation owner:** Kimi (with Codex planner contracts)
- **Notes:** Vocabulary, not a quota; the only rejection cases are mechanical (SC-010).

### SC-012 — Coverage vocabulary: wide, medium, close-up, insert, two-shot, listener reaction, POV

- **Principle:** Shot sizes and coverage types are planning choices tied to story function, not a mandatory sequence.
- **Domain:** plan · **Grammar scope:** kids-adventure, weird-history
- **Enforcement:** planner prior · **Confidence:** medium
- **Evaluation window:** planner context per scene
- **Minimum sample:** n/a
- **Exception codes:** —
- **Evidence:** `docs/editorial/scene-craft-v1.md` §2 + `docs/editorial/scene-craft-v1.1.md` §2 + `docs/reference-analysis/kids-dragon-hunt-2-analysis.json` (patterns exist in reference content) · established editorial practice
- **Measured sample:** n/a
- **Calibration status:** accepted as planner vocabulary
- **Future consumer:** AI planner context · **Implementation owner:** Kimi
- **Notes:** Distribution is judged separately as a graded finding (SC-030).

### SC-013 — Listener reaction is motivated by who is listening

- **Principle:** Reaction shots come from who is listening or affected, not from a static role label.
- **Domain:** plan · **Grammar scope:** kids-adventure, weird-history
- **Enforcement:** planner prior · **Confidence:** medium
- **Evaluation window:** planner context per dialogue beat
- **Minimum sample:** n/a
- **Exception codes:** —
- **Evidence:** `docs/editorial/scene-craft-v1.md` §2 + `docs/editorial/scene-craft-v1.1.md` §2 · established editorial practice
- **Measured sample:** n/a
- **Calibration status:** accepted as planner vocabulary
- **Future consumer:** AI planner context · **Implementation owner:** Kimi
- **Notes:** Accepted roadmap principle; reaction frequency is a graded finding, not a gate.

### SC-014 — Cut motivation vocabulary: on action or on stillness, both valid when motivated

- **Principle:** Cut on action when motion carries the eye; cut on stillness when the completed hold, joke, reaction, realization, or new information is the event.
- **Domain:** plan · **Grammar scope:** kids-adventure, weird-history
- **Enforcement:** planner prior · **Confidence:** medium
- **Evaluation window:** planner context per cut
- **Minimum sample:** n/a
- **Exception codes:** `intentional-jump`, `completed-hold`, `comic-hold`, `new-information`
- **Evidence:** `docs/editorial/scene-craft-v1.md` §3 + `docs/editorial/scene-craft-v1.1.md` §3 · established editorial practice
- **Measured sample:** n/a
- **Calibration status:** accepted as planner vocabulary
- **Future consumer:** AI planner context · **Implementation owner:** Kimi
- **Notes:** A cut on a hold is not inherently defective; only mechanical cut failures block (SC-049).

### SC-015 — Motivated camera vocabulary: push, pull, pan, track, orbit, locked

- **Principle:** Each shot has one primary camera intent; compound programs are welcome when every component is supported, a structured reason is declared, and sampling proves the movement.
- **Domain:** plan · **Grammar scope:** kids-adventure, weird-history
- **Enforcement:** planner prior · **Confidence:** medium
- **Evaluation window:** planner context per shot
- **Minimum sample:** n/a
- **Exception codes:** `declared-compound-reason`
- **Evidence:** `docs/editorial/scene-craft-v1.md` §4 + `docs/editorial/scene-craft-v1.1.md` §4 · established editorial practice
- **Measured sample:** n/a
- **Calibration status:** accepted as planner vocabulary
- **Future consumer:** AI planner context · **Implementation owner:** Kimi
- **Notes:** Label honesty is mechanical (SC-005); the v1 "never stack" phrasing is recorded as superseded (SC-034).

### SC-016 — Scene energy shapes: flat-comic, sustained-tension, rising, falling, breather, button, bridge, reveal

- **Principle:** Scenes declare an energy shape; shot durations track the declared shape rather than a universal metronome.
- **Domain:** plan · **Grammar scope:** kids-adventure, weird-history
- **Enforcement:** planner prior · **Confidence:** medium
- **Evaluation window:** planner context per scene
- **Minimum sample:** n/a
- **Exception codes:** —
- **Evidence:** `docs/editorial/scene-craft-v1.md` §5 + `docs/editorial/scene-craft-v1.1.md` §5 · established editorial practice
- **Measured sample:** n/a
- **Calibration status:** accepted as planner vocabulary
- **Future consumer:** AI planner context · **Implementation owner:** Kimi
- **Notes:** Energy shaping is an accepted principle; the single v1 curve is generalized, not a quota.

### SC-017 — Pre-reveal hold is an available directing device

- **Principle:** A held beat of stillness can prepare a scare or reveal; its duration resolves from approved audio, action phase, read windows, grammar, scene energy, and the timing solver.
- **Domain:** plan · **Grammar scope:** kids-adventure, weird-history
- **Enforcement:** planner prior · **Confidence:** medium
- **Evaluation window:** planner context per reveal-class beat
- **Minimum sample:** n/a
- **Exception codes:** `approved-audio-drives-duration`, `action-phase-drives-duration`
- **Evidence:** `docs/editorial/scene-craft-v1.md` §5 + `docs/editorial/scene-craft-v1.1.md` §5 · established editorial practice
- **Measured sample:** n/a
- **Calibration status:** accepted as planner vocabulary
- **Future consumer:** AI planner context · **Implementation owner:** Kimi
- **Notes:** The device is accepted; the numeric 8–16 frame version stays unvalidated (SC-024).

### SC-018 — Transition kinds are planning vocabulary

- **Principle:** Hard cut, dissolve, occlusion wipe, and match cut are EditorialTargets priors chosen per meaning, with semantic exceptions welcomed.
- **Domain:** plan · **Grammar scope:** kids-adventure, weird-history
- **Enforcement:** planner prior · **Confidence:** medium
- **Evaluation window:** planner context per transition
- **Minimum sample:** n/a
- **Exception codes:** `intentional-graphic-rhyme`, `time-transition`, `emotional-suspension`
- **Evidence:** `docs/editorial/scene-craft-v1.md` §7 + `docs/editorial/scene-craft-v1.1.md` §7 · established editorial practice
- **Measured sample:** n/a
- **Calibration status:** accepted as planner vocabulary
- **Future consumer:** AI planner context · **Implementation owner:** Kimi
- **Notes:** An identical-pose dissolve can be intentional; only the mechanical cases block (SC-048).

### SC-019 — Reveal coverage scales with narrative importance: micro, beat, major, set-piece

- **Principle:** The notice → show subject → react → re-ground palette scales: a micro reveal may need one shot, a set-piece prefers the full palette.
- **Domain:** plan · **Grammar scope:** kids-adventure, weird-history
- **Enforcement:** planner prior · **Confidence:** medium
- **Evaluation window:** planner context per reveal-class beat
- **Minimum sample:** n/a
- **Exception codes:** `micro-importance-single-shot`, `beat-subject-plus-response`
- **Evidence:** `docs/editorial/scene-craft-v1.md` §8 + `docs/editorial/scene-craft-v1.1.md` §8 · established editorial practice
- **Measured sample:** n/a
- **Calibration status:** accepted as planner vocabulary
- **Future consumer:** AI planner context · **Implementation owner:** Kimi
- **Notes:** The fixed four-shot pattern becomes a palette; only unreadable causality blocks (SC-050).

### SC-020 — Rig capability knowledge: gaze leads motion, phrase arc, living holds, view-correct facing

- **Principle:** Default performance arc is anticipation → action → contact/impact → settle, with gaze leading, living holds, and view-correct facing as style targets with intentional exceptions.
- **Domain:** rig · **Grammar scope:** kids-adventure, weird-history
- **Enforcement:** planner prior · **Confidence:** medium
- **Evaluation window:** planner context per performance beat
- **Minimum sample:** n/a
- **Exception codes:** `style-exception`, `approved-style-capability`
- **Evidence:** `docs/editorial/scene-craft-v1.md` §9 + `docs/editorial/scene-craft-v1.1.md` §9 · established editorial practice
- **Measured sample:** n/a
- **Calibration status:** accepted as planner vocabulary
- **Future consumer:** rig capability requests (only when a plan requires them) · **Implementation owner:** Codex
- **Notes:** Numeric micro-timing stays hypothesis (SC-035, SC-036, SC-037); overshoot is optional by action and style.

### SC-022 — Requested cues must synchronize exactly; sound density is editorial

- **Principle:** Cues the plan actually requests must be exactly synchronized; the system does not require an effect for every footfall, reveal, whoosh, or magical event.
- **Domain:** audio · **Grammar scope:** kids-adventure, weird-history
- **Enforcement:** planner prior · **Confidence:** medium
- **Evaluation window:** planner context per audio plan
- **Minimum sample:** n/a
- **Exception codes:** —
- **Evidence:** `docs/editorial/scene-craft-v1.md` §10 + `docs/editorial/scene-craft-v1.1.md` §10 · established editorial practice
- **Measured sample:** n/a
- **Calibration status:** accepted as planner vocabulary
- **Future consumer:** audio lane · **Implementation owner:** Codex
- **Notes:** Softens v1's cue-per-event density to requested-cue synchronization only.

### SC-023 — J-cut and L-cut audio bridges are available polish

- **Principle:** The next scene's audio may start under the current shot, or vice versa, as a professional transition polish.
- **Domain:** audio · **Grammar scope:** kids-adventure, weird-history
- **Enforcement:** planner prior · **Confidence:** medium
- **Evaluation window:** planner context per scene transition
- **Minimum sample:** n/a
- **Exception codes:** —
- **Evidence:** `docs/editorial/scene-craft-v1.md` §10 (blob `5ca8a0d…`) · established editorial practice
- **Measured sample:** n/a
- **Calibration status:** accepted as planner vocabulary
- **Future consumer:** audio lane · **Implementation owner:** Codex
- **Notes:** Established technique; a choice, not a requirement.

## Hypotheses (unvalidated — pending blind-pilot calibration)

Every inherited numeric claim from v1 sits here at low confidence. None has
exact supporting evidence in this repository, and none was upgraded. Blocking
language is deliberately avoided; these rows inform future graded findings only.

### SC-024 — Pre-reveal hold of 8–16 frames, with a claimed threefold reveal improvement

- **Principle:** A near-still hold of 8–16 frames before a reveal may strengthen its payoff.
- **Domain:** plan · **Grammar scope:** kids-adventure
- **Enforcement:** hypothesis · **Confidence:** low
- **Evaluation window:** pending blind-pilot calibration (none accepted)
- **Minimum sample:** pending calibration
- **Exception codes:** —
- **Evidence:** `docs/editorial/scene-craft-v1.md` §5 + `docs/editorial/scene-craft-v1.1.md` §Unvalidated hypotheses · unvalidated hypothesis
- **Measured sample:** none in this repository
- **Calibration status:** uncalibrated — pending blind pilot
- **Future consumer:** quality report (only after calibration) · **Implementation owner:** Codex (calibration), none today
- **Notes:** No measured source supports the frame range or the 3× claim; the device itself is SC-017.

### SC-025 — Shot-duration CV below 0.15 reads metronomic

- **Principle:** Very low shot-duration variance may read as metronomic when the sample offers room for variation.
- **Domain:** quality · **Grammar scope:** kids-adventure, weird-history
- **Enforcement:** hypothesis · **Confidence:** low
- **Evaluation window:** pending blind-pilot calibration; a future graded finding may consider it only for ≥8 resolved shots
- **Minimum sample:** 8 resolved shots
- **Exception codes:** `intentional-montage`, `audio-prescribed-intervals`, `insufficient-variation-opportunity`
- **Evidence:** `docs/editorial/scene-craft-v1.md` §5 + `docs/editorial/scene-craft-v1.1.md` §5, §Unvalidated hypotheses · unvalidated hypothesis
- **Measured sample:** none in this repository
- **Calibration status:** uncalibrated — pending blind pilot
- **Future consumer:** quality report (only after calibration) · **Implementation owner:** Codex (calibration), none today
- **Notes:** A universal CV floor has no measured support; sample size and semantic exceptions are recorded for any future graded finding.

### SC-026 — Unchanged visual idea beyond 4 seconds

- **Principle:** A visual idea that does not evolve may go stale; change is counted semantically (performance, framing, blocking, gaze, prop state, camera, lighting/effect, or audio meaning).
- **Domain:** quality · **Grammar scope:** kids-adventure, weird-history
- **Enforcement:** hypothesis · **Confidence:** low
- **Evaluation window:** pending blind-pilot calibration
- **Minimum sample:** pending calibration
- **Exception codes:** `excellent-acting-hold`, `intentional-tableau`
- **Evidence:** `docs/editorial/scene-craft-v1.md` §6 + `docs/editorial/scene-craft-v1.1.md` §6, §Unvalidated hypotheses · unvalidated hypothesis
- **Measured sample:** none in this repository
- **Calibration status:** uncalibrated — pending blind pilot
- **Future consumer:** quality report (only after calibration) · **Implementation owner:** Codex (calibration), none today
- **Notes:** A six-second locked close-up with excellent acting is not a static tableau; the universal limit is explicitly non-normative.

### SC-027 — Identical gesture repeated within 6 seconds; six distinct gestures per character

- **Principle:** Visible repetition of the same semantic gesture in a short window may read as mechanical; repetition counts only when the same semantic program, phase structure, timing, and screen function recur visibly.
- **Domain:** rig · **Grammar scope:** kids-adventure
- **Enforcement:** hypothesis · **Confidence:** low
- **Evaluation window:** pending blind-pilot calibration
- **Minimum sample:** pending calibration
- **Exception codes:** `semantic-variation-present`
- **Evidence:** `docs/editorial/scene-craft-v1.md` §6 + `docs/design/kids-showcase-proof/pro-encoded-frame-audit-v3.md` (the hand-to-ear listen repeated twice in 6s) · project regression (observation) with unvalidated universal limit
- **Measured sample:** 1 render (30s kids showcase proof; one observed repetition)
- **Calibration status:** uncalibrated — pending blind pilot
- **Future consumer:** quality report (only after calibration) · **Implementation owner:** Codex (calibration), none today
- **Notes:** The project observation is real; the universal 6-second limit and six-mandatory-gestures requirement are not supported by it.

### SC-028 — More than two consecutive same-sized shots

- **Principle:** Same-size streaks may read as monotony; three may warrant attention unless justified, four or more more strongly, always with semantic context.
- **Domain:** quality · **Grammar scope:** kids-adventure, weird-history
- **Enforcement:** hypothesis · **Confidence:** low
- **Evaluation window:** pending blind-pilot calibration
- **Minimum sample:** 3 consecutive (observation threshold only)
- **Exception codes:** `stated-justification`, `semantic-context`
- **Evidence:** `docs/editorial/scene-craft-v1.md` §6 + `docs/editorial/scene-craft-v1.1.md` §6 · unvalidated hypothesis
- **Measured sample:** none in this repository
- **Calibration status:** uncalibrated — pending blind pilot
- **Future consumer:** quality report (only after calibration) · **Implementation owner:** Codex (calibration), none today
- **Notes:** Streaks are observations, never automatic rejection.

### SC-029 — Reveal coverage of at least three of four pattern shots

- **Principle:** A reveal may benefit from preparation, subject, and reaction shots; completeness scales with narrative importance (SC-019).
- **Domain:** quality · **Grammar scope:** kids-adventure
- **Enforcement:** hypothesis · **Confidence:** low
- **Evaluation window:** pending blind-pilot calibration
- **Minimum sample:** pending calibration
- **Exception codes:** `micro-importance-single-shot`, `beat-subject-plus-response`
- **Evidence:** `docs/editorial/scene-craft-v1.md` §8 + `docs/editorial/scene-craft-v1.1.md` §8, §Unvalidated hypotheses · unvalidated hypothesis
- **Measured sample:** none in this repository
- **Calibration status:** uncalibrated — pending blind pilot
- **Future consumer:** quality report (only after calibration) · **Implementation owner:** Codex (calibration), none today
- **Notes:** Three-of-four coverage is explicitly non-normative; only unreadable causality blocks (SC-050).

### SC-030 — Kids profile shot mix ≈ 25/40/25/10 (wide/medium/close/insert), ±10%

- **Principle:** A reference mix may guide coverage balance when bound to an exact grammar profile, show-pack, reference analysis, sample size, confidence, and evaluation window.
- **Domain:** quality · **Grammar scope:** kids-adventure
- **Enforcement:** planner prior · **Confidence:** low
- **Evaluation window:** not judged below 8 shots; informational at 8–11; a future graded finding may consider 12+ only when substantially outside the bound target without valid semantic justification
- **Minimum sample:** 12 shots (for any future warning variant)
- **Exception codes:** `semantic-justification`, `below-minimum-sample`
- **Evidence:** `docs/editorial/scene-craft-v1.md` §2 + `docs/editorial/scene-craft-v1.1.md` §2 · unvalidated hypothesis
- **Measured sample:** none in this repository
- **Calibration status:** uncalibrated — pending blind pilot
- **Future consumer:** quality report (only after calibration) · **Implementation owner:** Codex (calibration), none today
- **Notes:** No measured source validates the exact percentages; kept as a prior, never a quota.

### SC-031 — Hard cuts as the default majority of boundaries

- **Principle:** Hard cuts are the default transition; their share is a style observation, not a target.
- **Domain:** plan · **Grammar scope:** kids-adventure, weird-history
- **Enforcement:** planner prior · **Confidence:** low
- **Evaluation window:** pending blind-pilot calibration
- **Minimum sample:** pending calibration
- **Exception codes:** `style-exception`
- **Evidence:** `docs/editorial/scene-craft-v1.md` §7 · established editorial practice (the default) with an unvalidated percentage
- **Measured sample:** none in this repository
- **Calibration status:** uncalibrated — pending blind pilot
- **Future consumer:** quality report (only after calibration) · **Implementation owner:** Codex (calibration), none today
- **Notes:** The "≥80%" figure is unmeasured; the default practice itself is accepted vocabulary (SC-018).

### SC-032 — Dissolve of 8–16 frames with a pose/position change across it

- **Principle:** A dissolve reads best when the subject evolves across it; an identical-pose dissolve can still be an intentional graphic rhyme, time transition, or emotional suspension.
- **Domain:** quality · **Grammar scope:** kids-adventure, weird-history
- **Enforcement:** hypothesis · **Confidence:** low
- **Evaluation window:** pending blind-pilot calibration
- **Minimum sample:** pending calibration
- **Exception codes:** `intentional-graphic-rhyme`, `time-transition`, `emotional-suspension`
- **Evidence:** `docs/editorial/scene-craft-v1.md` §7 + `docs/editorial/scene-craft-v1.1.md` §7 · unvalidated hypothesis
- **Measured sample:** none in this repository
- **Calibration status:** uncalibrated — pending blind pilot
- **Future consumer:** quality report (only after calibration) · **Implementation owner:** Codex (calibration), none today
- **Notes:** The mechanical pose-substitution case is a hard invariant (SC-048); the universal pose-change preference stays unvalidated.

### SC-033 — Foreground-occlusion wipe locked to the occluder's motion, 6–10 frames

- **Principle:** A wipe travels with its occluder; the frame range is illustrative.
- **Domain:** quality · **Grammar scope:** kids-adventure
- **Enforcement:** hypothesis · **Confidence:** low
- **Evaluation window:** pending blind-pilot calibration
- **Minimum sample:** pending calibration
- **Exception codes:** —
- **Evidence:** `docs/editorial/scene-craft-v1.md` §7 · unvalidated hypothesis
- **Measured sample:** none in this repository
- **Calibration status:** uncalibrated — pending blind pilot
- **Future consumer:** quality report (only after calibration) · **Implementation owner:** Codex (calibration), none today
- **Notes:** The mechanical failure is a wipe that never occludes (SC-048); the frame range is unmeasured.

### SC-034 — v1 claim: one motivated move per shot, never stacked without a stated reason

- **Principle:** Recorded as the v1 phrasing; superseded by v1.1's declared-reason compound permission (SC-015).
- **Domain:** plan · **Grammar scope:** kids-adventure, weird-history
- **Enforcement:** hypothesis · **Confidence:** low
- **Evaluation window:** superseded by SC-015 (v1.1 §4)
- **Minimum sample:** n/a
- **Exception codes:** `declared-compound-reason`
- **Evidence:** `docs/editorial/scene-craft-v1.md` §4 + `docs/editorial/scene-craft-v1.1.md` §4 · unvalidated hypothesis
- **Measured sample:** none in this repository
- **Calibration status:** superseded — recorded for traceability, not an active restriction
- **Future consumer:** none · **Implementation owner:** none
- **Notes:** Kept so the amendment history is auditable; the active rule is SC-015.

### SC-035 — Pose or expression evolves every 1–2 seconds during holds

- **Principle:** Living holds carry micro-motion; the interval is a style target, not a gate.
- **Domain:** rig · **Grammar scope:** kids-adventure, weird-history
- **Enforcement:** hypothesis · **Confidence:** low
- **Evaluation window:** pending blind-pilot calibration
- **Minimum sample:** pending calibration
- **Exception codes:** `intentional-stillness`
- **Evidence:** `docs/editorial/scene-craft-v1.md` §9 + `docs/editorial/scene-craft-v1.1.md` §9 · unvalidated hypothesis
- **Measured sample:** none in this repository
- **Calibration status:** uncalibrated — pending blind pilot
- **Future consumer:** rig capability requests (after calibration) · **Implementation owner:** Codex (calibration), none today
- **Notes:** The living-hold principle is SC-020; the interval is unmeasured.

### SC-036 — Gaze leads the head by 2–4 frames, the head leads the body by 2–4 frames

- **Principle:** Gaze-first motion reads naturally; the offsets are illustrative.
- **Domain:** rig · **Grammar scope:** kids-adventure, weird-history
- **Enforcement:** hypothesis · **Confidence:** low
- **Evaluation window:** pending blind-pilot calibration
- **Minimum sample:** pending calibration
- **Exception codes:** `style-exception`
- **Evidence:** `docs/editorial/scene-craft-v1.md` §9 + `docs/editorial/scene-craft-v1.1.md` §9 · unvalidated hypothesis
- **Measured sample:** none in this repository
- **Calibration status:** uncalibrated — pending blind pilot
- **Future consumer:** rig capability requests (after calibration) · **Implementation owner:** Codex (calibration), none today
- **Notes:** Gaze-lead itself is accepted knowledge (SC-020) without the numeric offsets.

### SC-037 — Blink cadence of 2.5–4.5 seconds, never metronomic

- **Principle:** Blinks vary within a human range; the interval is a style target.
- **Domain:** rig · **Grammar scope:** kids-adventure, weird-history
- **Enforcement:** hypothesis · **Confidence:** low
- **Evaluation window:** pending blind-pilot calibration
- **Minimum sample:** pending calibration
- **Exception codes:** `style-exception`
- **Evidence:** `docs/editorial/scene-craft-v1.md` §9 + `docs/editorial/scene-craft-v1.1.md` §9 · unvalidated hypothesis
- **Measured sample:** none in this repository
- **Calibration status:** uncalibrated — pending blind pilot
- **Future consumer:** rig capability requests (after calibration) · **Implementation owner:** Codex (calibration), none today
- **Notes:** The interval is unmeasured.

## Examples

### SC-039 — The 15-shot high-energy treatment

- **Principle:** One possible high-energy coverage treatment of a 30-second throwaway showcase, demonstrating the applied vocabulary.
- **Domain:** plan · **Grammar scope:** kids-adventure
- **Enforcement:** example only · **Confidence:** low
- **Evaluation window:** illustration only — not a target, not the pilot rubric, not a required shot count
- **Minimum sample:** n/a
- **Exception codes:** —
- **Evidence:** `docs/editorial/scene-craft-v1.md` §Worked example + `docs/editorial/scene-craft-v1.1.md` §Illustrative high-energy treatment · worked example
- **Measured sample:** 1 illustrative edit (30s throwaway showcase)
- **Calibration status:** accepted as worked example (non-normative); rows must be labelled essential, optional coverage, or alternate before reuse
- **Future consumer:** planner examples (a later task) · **Implementation owner:** Kimi
- **Notes:** Its shot count and timings are illustrative; a planner may combine, omit, or extend coverage.

### SC-040 — Blind-pilot scoring rubric

- **Principle:** Human blind review scores clarity/causality 25, composition/coverage 20, motivated cuts 20, pacing/holds 15, reactions/performance 10, variety 10; it never rewards matching a proposed shot list.
- **Domain:** quality · **Grammar scope:** kids-adventure, weird-history
- **Enforcement:** example only · **Confidence:** medium
- **Evaluation window:** human blind pilot review
- **Minimum sample:** n/a
- **Exception codes:** —
- **Evidence:** `docs/editorial/scene-craft-v1.1.md` §Illustrative high-energy treatment (blob `3b3cd1a…`) · established editorial practice
- **Measured sample:** n/a
- **Calibration status:** accepted as the human evaluation contract; authorizes no validator or hard gate inside product code
- **Future consumer:** human blind review · **Implementation owner:** Pro + Preston (review), none in product
- **Notes:** Calibration of numeric editorial thresholds waits for blind-pilot results.

## Classification notes

- **No numeric claim is retained as measured.** Every inherited v1 number
  (8–16 frames, CV 0.15, claimed threefold improvement, four/six-second
  limits, gesture counts, reveal counts, percentage mixes, 15 shots) is
  hypothesis, planner prior, or example only, at low confidence, pending
  blind-pilot calibration. No evidence was invented or upgraded.
- **Reason and exception codes stay editorial vocabulary.** They are not
  schemas, enums, validators, or compiler contracts in this task.
- **v1 `[PLAN]`/`[CHECK]`/`[RIG]`/`[AUDIO]` tags are fully classified:** plan
  tags map to planner priors and hypotheses; check tags map to hard invariants
  (mechanical only) or hypotheses (graded); rig tags map to rig priors,
  hypotheses, and the two project-regression invariants; audio tags map to the
  timing-authority invariant and audio priors.
- **Storylight external-intent examples are deliberately absent** pending the
  exact accepted Editorial Director contract head and a frozen host-issued
  pilot planning request with clause references.
