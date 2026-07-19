# Editorial Director feasibility ruling

- Status: conditionally accepted architecture; implementation not yet authorized
- Kimi proposal: `docs/adr/ADR-EDI-001-ai-editorial-director.md`
- Proposal commit: `595851ef841ca351bac778e48e6e31587ebafef9`
- Reviewed Director lineage: `1517a209ed726e17e27ae2f7c9a0e7e347f6dccf`
- Reviewers: ChatGPT Pro and Codex
- Date: 2026-07-19

## Decision

StoryStage will have a provider-neutral AI Editorial Director. Creative
judgment is proposed by an external planner; deterministic StoryStage code
validates, binds, times, compiles, and seals it. The current
`directorProposalDraftSchema` is not the implementation seam for that planner.
It is an override document for shots the compiler has already authored.

The immediate visible blocker remains Ollo registration. Editorial work runs in
parallel so the approved rig is not dropped back into the same mechanical
lookup-table direction that produced incoherent earlier cuts.

## Why the current proposal cannot be used

The current strict v1 draft contains planner identity/version, story-graph
hash, one direction record per beat, event timing adjustments, and shot-size or
camera-movement overrides for existing shot IDs. It cannot author:

- 1:n beat coverage or speaker/listener/reveal coverage topology;
- scene energy curves;
- subjects, props, camera angle, composition, or negative space;
- structured camera or transition reasons;
- creator-readable rationales;
- prior-shot variety context;
- asynchronous invocation, retry, resumability, or bounded replanning.

The canonical plan can represent n:m `beatIds`, but `director-compiler.ts`
currently creates topology itself and permits only one episode-wide two-shot
beat. Focal position, facing, coverage purpose, motivations, and duration are
still selected by modulo tables and fixed formulas inside the compiler.

## Immediate P0 containment

The current custom planner path has a proven lineage defect. `assertProposal()`
checks beat ID and order but not that every direction's `beatContentHash`
equals the exact canonical source beat hash. A caller can substitute another
beat's hash, recompute the nested direction hash, and still receive an
`animatic-ready` DirectorProject. A valid DirectorProject may then be accepted
by `sealDirectorProductionBundle()`.

Before any external planner exists, StoryStage must:

1. require exact beat ID, source order, and beat-content hash binding;
2. reject missing, duplicated, reordered, or foreign directions;
3. reject substituted story graph or grammar lineage;
4. add adversarial regressions plus a valid custom-planner control;
5. keep this containment commit independent of the new editorial architecture.

## New authority boundary

Model invocation must be asynchronous and outside `compileDirectorProject()`:

```text
exact project request
  -> asynchronous EditorialPlanningStage
  -> strict hash-free external intent
  -> trusted host injects IDs, lineage, provider metadata, and response hash
  -> sealed editorial proposal
  -> deterministic candidate validator/compiler
  -> private diagnostic-only pilot artifact
```

The external response may not author canonical hashes, frame numbers, event
IDs, shot IDs, capability claims, or production authority. Reproducibility
means the same sealed editorial proposal produces the same compiled output; it
does not mean the same prompt always produces the same model response.

The production planner interface remains separate from the asynchronous model
stage. No network call belongs inside deterministic compilation.

## Required contract amendments

### Separate semantic direction from invocation provenance

The semantic proposal hash must not change merely because GPT, Kimi, a
heuristic, or Preston authored the same creative choices. Use two artifacts:

```ts
type EditorialDirectorProposalV1 = {
  // Creative proposal only.
  contentHash: Hash;
};

type EditorialPlanningInvocationReceipt = {
  proposalContentHash: Hash;
  providerId: string;
  modelId: string;
  modelVersion: string;
  promptTemplateContentHash: Hash;
  contextContentHashes: Hash[];
  rawResponseContentHash: Hash;
  startedAt: string;
  completedAt: string;
  contentHash: Hash;
};
```

The Director plan binds the semantic proposal. Orchestration and history bind
the invocation receipt separately.

### Proposal-owned shot identities

Every proposed shot needs a stable identity derived from proposal-local
semantics such as scene, ordinal, beat IDs, coverage type, and subjects. The
compiler derives the canonical DirectorShotId and preserves a one-to-one
`sourceEditorialShotId` lineage. A proposal may reference only scene, beat,
entity, prop, landmark, causal-event, grammar, target, and capability
inventories present in the exact request. Invented references fail closed.

### No hidden compiler direction

The proposal owns shot coverage, coverage type, subjects, props, framing,
angle, composition intent, camera intent, transition intent, read bias, reason
codes, rationale, and scene energy function. The compiler validates, rejects,
and deterministically resolves them. It may not silently restore modulo focal
rotation, facing rotation, the one-multi-shot cap, role-to-size tables,
word-count-only duration, or templated motivations. Those rules remain only in
`HeuristicEditorialPlanner` as an explicit baseline implementation.

### Explicit outcomes, fallback, and revisions

Planning returns an explicit accepted or rejected outcome. Rejection binds the
rejected proposal when available plus an exact diagnostics hash. An optional
production fallback creates a new heuristic proposal and records requested
planner, rejected AI proposal, fallback planner, and reason hash. The blind
pilot uses `fallbackAllowed: false` and at most one bounded revision round.

A quality revision is a new artifact binding prior proposal, quality report,
addressed finding IDs, and the complete successor proposal. It never mutates an
accepted or failed proposal in place.

### Heuristic behavioral-equivalence fixtures

Before comparing planners, freeze one Kids and one Weird History fixture.
Moving existing direction logic into `HeuristicEditorialPlanner` must preserve
scene order, beat coverage, shot count and purpose, subjects, framing, camera
and transition intent, timing, continuity, executable program, and episode
duration. If proposal-owned IDs make byte equality impossible, record and test
an explicit semantic-equivalence mapping instead of pretending hashes match.

## Minimal external intent

The pilot intent is bounded and hash-free except for the exact trusted request
reference supplied by the host:

```ts
type ExternalEditorialIntentDraft = {
  schemaVersion: "0.1-pilot";
  requestContentHash: Hash;
  scenes: Array<{
    sceneId: string;
    energyShape: "rising" | "peak" | "falling" | "breather";
    shots: Array<{
      localOrdinal: number;
      beatIds: string[];
      coverageRole:
        | "establish-geography"
        | "primary-performance"
        | "listener-reaction"
        | "cut-on-action"
        | "reveal-insert"
        | "comprehension-hold"
        | "continuity-bridge";
      shotSize: DirectorShotSize;
      cameraMovement: DirectorCameraMovement;
      cameraReason: StructuredCameraReason;
      transitionKind: DirectorTransitionKind;
      transitionReason: StructuredTransitionReason;
      readBias: "brief" | "normal" | "emphasis" | "hold";
      rationaleNote?: string;
    }>;
  }>;
};
```

Final frame counts remain timing-solver authority. Structured reason codes are
machine-auditable; bounded rationale prose is creator testimony only.

## Editorial targets

Do not create a third independent directing configuration. Derive and seal
`EditorialTargets` from the exact Show Pack, GrammarProfile, and reference-study
hashes. Reuse the existing cadence, maximum-static, framing, transition,
gesture, reaction, and pose-rate values.

Hard constraints may block:

- allowed shot/camera/transition vocabulary;
- absolute shot duration envelope;
- coverage, axis, geography, continuity, and capability validity;
- source/project/timing lineage.

Priors produce warnings and scores:

- shot-size and transition mix;
- preferred duration range and maximum static idea;
- gesture, reaction, and pose-change rates;
- composition and camera variety.

Every target artifact binds its Show Pack, GrammarProfile, reference studies,
sample size, evaluation window, and confidence. Distribution weights must be
normalized, buckets must not overlap, and seconds convert using the exact
output FPS.

## Validation required before external topology

- reciprocal scene/shot/beat membership and source ordering;
- bounded coverage cardinality and complete beat coverage;
- shot beat IDs contiguous and from one scene;
- canonical compiler-generated shot/event IDs;
- valid entity, prop, landmark, depth plane, and occluder references;
- event locality and earliest/preferred/latest timing order;
- fixed scene/voice timing budget so 1:n coverage cannot inflate runtime;
- exact grammar and capability-registry binding;
- continuity, axis, geography, and screen-order validation;
- exact art-direction/project binding, not merely story text.

The current story graph has no general speaker/dialogue/cast/prop/location
model. The first Ollo pilot is therefore limited to the frozen narration-driven
Storylight excerpt. Hierarchical screenplay ingest follows the pilot.

## Diagnostic-only blind pilot

The first experiment uses a frozen 20-30 second `Storylight in the Little Wood`
excerpt containing establishment, Ollo action, Storylight/prop reveal,
Tix-or-Dot reaction, focus change, and payoff.

- Cut A: expanded heuristic planner.
- Cut B: manually exchanged AI editorial intent.
- Same script, story graph, scene world, characters, assets, capability
  registry, renderer versions, output format, timing budget, and continuity
  compiler.
- No fallback. Invalid Cut B ends with diagnostics.
- Both cuts remain private and visibly watermarked
  `EDITORIAL PILOT - NOT FOR DELIVERY`.
- Randomize labels before Preston and Pro score them; reveal rationales later.

The pilot returns a separate artifact with
`authority: editorial-pilot-diagnostic-only` and
`productionBindable: false`. It must be rejected by DirectorProject,
production-bundle, final-render, delivery, Studio export, and public worker
boundaries.

Hard gates for both cuts:

- zero P0/P1 continuity or schema defects;
- zero unsupported capabilities or unapproved Ollo authority;
- all beats covered within the same timing budget;
- identical source and render lineage;
- exact plan/output hashes recorded;
- no hidden fallback.

Blind scoring:

| Category | Weight |
| --- | ---: |
| Story clarity and causality | 25 |
| Purposeful composition and coverage | 20 |
| Motivated cuts and action continuity | 20 |
| Pacing and readable holds | 15 |
| Character reactions and performance coverage | 10 |
| Visual variety without randomness | 10 |

Success requires Preston to choose the AI-directed cut for publication, a
minimum 15-point AI margin, no additional hard defect, quality findings no
worse, and no fallback. One successful Ollo pilot authorizes further
development, not default AI planning. Repeat later on fast Weird History and a
quiet Kids dialogue/reaction excerpt.

## Authorized implementation order

Parallel now:

1. Codex finishes Ollo proposal, compact joint diagnostic, and Preston Gate 1.
2. Codex lands the independent current-planner P0 containment.
3. Kimi and Codex prepare sealed EditorialTargets, strict external intent,
   deterministic validator, heuristic adapter, and private blind-pilot runner.
4. No model API integration and no Studio rationale UI yet.

Then:

1. Preston accepts Ollo geometry for the motion diagnostic.
2. Render blind proxy Cut A and Cut B with identical lineage.
3. Render again with the same approved Ollo rig.
4. Run the blind verdict and record hashes/scores.
5. Build hierarchical screenplay ingest.
6. Make guide voice the timing master.
7. Add full-episode timeline/audio UI only when real data exists.

This architecture is the missing directing intelligence, not production
authority. Deterministic StoryStage code remains the sole authority for exact
timing, continuity, capabilities, hashes, rendering, and delivery.
