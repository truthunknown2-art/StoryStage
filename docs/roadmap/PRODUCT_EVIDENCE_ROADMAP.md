# StoryStage product evidence roadmap

- **Status:** active source-of-truth roadmap
- **Updated:** 2026-07-19
- **Product goal:** a professional AI-automated animation studio that turns a
  screenplay into an editable, coherently directed production using consistent
  characters, layered environments, deterministic animation, real audio lanes,
  and reliable export.

## Product truth

StoryStage's consistent assets, reusable rigs, deterministic compiler, Remotion
runtime, and editable scene model remain the correct foundation. The product is
not complete merely because those foundations exist. The current missing layer
is the combined intelligence that makes the result feel deliberately directed:

1. **Editorial direction** — coverage, composition, camera, reactions, reveals,
   motivated cuts, holds, and scene energy.
2. **Character performance** — registered joints, gaze/head/torso overlap,
   action phases, locomotion, contact, living holds, expression, and lip sync.
3. **Audio and timing** — approved or guide voice as the master clock, music,
   SFX, pauses, emphasis, J/L cuts, and exact cue synchronization.

Better drawings alone do not solve these problems. More cuts alone do not solve
them either. The target is motivated visual change with readable continuity.

## Authority boundary

The creative planner proposes taste and bounded editorial intent. It does not
invent canonical hashes, exact frame numbers, capabilities, renderer identity,
or production authority.

```text
script / screenplay
  → hierarchical story graph
  → asynchronous AI editorial planning
  → bounded, hash-free creative intent
  → trusted host binding
  → sealed EditorialDirectorProposal
  → deterministic Director compiler
  → TimingSolution
  → ContinuitySequencePlan
  → ExecutableEpisodePlan
  → ordinary Player and render worker
```

No silent fallback is allowed in the editorial pilot. An invalid AI proposal
ends the pilot with diagnostics; it must never be presented as an AI-authored
cut after substituting heuristic output.

## Evidence gates

### Gate 1 — real Ollo registration

The next creator-visible evidence is a private, non-exportable registration
diagnostic for front, left profile, and right profile that shows:

- exact measured and proposed joints;
- immutable base proposal plus review corrections;
- rest, minus 15°, zero, and plus 15° contact tests;
- gap/orbit and z-order evidence;
- complete, legible joint and seam identities;
- no motion, preparation, approval, capability, or export authority.

Preston approves or corrects the joints. Approval is required before production
motion proof.

### Gate 2 — blind editorial judgment

Use one frozen 20–30 second Storylight excerpt.

- **Cut A:** expanded deterministic heuristic planner.
- **Cut B:** manually exchanged AI editorial intent using the accepted external
  intent boundary.

Both cuts use identical script, story graph, art, asset hashes, timing budget,
capability registry, continuity compiler, renderer, and audio basis. Only the
editorial proposal changes. Labels are randomized.

| Criterion                                    | Weight |
| -------------------------------------------- | -----: |
| Story clarity and causality                  |     25 |
| Purposeful composition and coverage          |     20 |
| Motivated cuts and action continuity         |     20 |
| Pacing and readable holds                    |     15 |
| Character reactions and performance coverage |     10 |
| Visual variety without randomness            |     10 |

The AI cut passes only when Preston chooses it for publication, it wins by at
least 15 points, it introduces no additional hard defect, and no fallback
occurred.

### Gate 3 — ordinary-path benchmark

After Ollo registration and the editorial pilot pass, reproduce one selected
30-second Mr. Kipply-style passage using original StoryStage story content and
assets. It must run through the ordinary project, Player, compiler, capability
registry, and worker—not a disconnected hand-authored showcase.

The benchmark tests scene interpretation, coverage, composition, camera,
performance, cuts, continuity, timing, and later approved audio.

## Product build sequence after the evidence gates

1. Expand screenplay understanding to
   `episode → act/sequence → scene → beat → dialogue/action/transition → cast/props/locations`.
2. Generate, record, or import guide voice before final timing; derive shots,
   captions, visemes, pauses, and J/L cuts from its exact timing basis.
3. Expose only real editable timeline lanes:
   `Scenes`, `Shots`, `Events`, `Camera`, `Voice`, `SFX`, and `Music`.
4. Add deterministic creator patches for moving a cut, extending a hold,
   reordering a scene, selecting a reaction, and replanning a bounded range.
5. Integrate approved music/SFX/voice providers without committing account
   credentials or session material.

## Team ownership

### Kimi

- UI/UX and approved mockup fidelity;
- scene-craft knowledge and planner context;
- reference analysis and visual product review;
- creator-readable shot rationales.

### Codex

- editorial and asset contracts;
- trusted host binding and deterministic compiler;
- validators, rig registration, runtime, worker, audio, and timing integration;
- Git integration, verification, and evidence packaging.

### ChatGPT Pro

- architecture and milestone authority;
- adversarial contract review;
- frame-level film-quality acceptance;
- protection against fixture work masquerading as product progress.

### Preston

- final creative authority;
- Ollo registration approval/correction;
- blind Cut A/B judgment;
- final channel-quality and publication bar.

## Current active lanes

- Kimi UI Slice C composition-only exact-frame proof.
- Candidate-I Ollo registration contract and private diagnostic.
- DirectorPlanner source-lineage containment and hosted verification.
- EditorialDirectorProposal and diagnostic-only pilot contracts.

Work is not considered landed until the exact commit is pushed to GitHub and
its relevant local and hosted checks pass.
