import { describe, expect, it } from "vitest";
import { hashCanonical } from "../canonical-hash";
import { createCv002ArtDirectionSelection } from "../cv002-art-direction";
import { createCv002Project } from "../cv002-story-draft";
import { kidsAdventureShowPack, weirdHistoryShowPack } from "../show-pack";
import {
  alphaCapabilityRegistry,
  createCapabilityRegistry,
  type CapabilityRegistry,
  type PerformanceCapabilityDraft,
} from "./capability-report";
import { compileDirectorProject } from "./director-compiler";
import { directorProductionBundleSchema } from "./director-production-bundle";
import { directorProjectSchema } from "./director-project";
import { directorProposalSchema } from "./director-proposal";
import {
  bindEditorialDirectorProposalV1,
  createEditorialPlanningRequest,
  createEditorialTargets,
  createSourceEditorialShotLineage,
  editorialDirectorProposalV1Schema,
  editorialPlanningRequestSchema,
  editorialPlanningResultSchema,
  editorialTargetsSchema,
  externalEditorialIntentDraftSchema,
  restoreEditorialDirectorProposalV1,
  restoreEditorialHeuristicPlanningReceipt,
  restoreEditorialManualPlanningReceipt,
  restoreEditorialPlanningInvocationReceipt,
  restoreEditorialPlanningRequest,
  restoreEditorialPlanningResult,
  restoreEditorialPlanningRunSpec,
  restoreEditorialTargets,
  sealEditorialAcceptedResult,
  sealEditorialFallbackResult,
  sealEditorialHeuristicPlanningReceipt,
  sealEditorialManualPlanningReceipt,
  sealEditorialPlanningDiagnostics,
  sealEditorialPlanningInvocationReceipt,
  sealEditorialRejectedResult,
  sealEditorialRevisionResult,
  sealEditorialPlanningRunSpec,
  sealEstimatedEditorialTimingBudget,
  type EditorialPlanningRequest,
  type EditorialPlanningRequestSources,
  type ExternalEditorialIntentDraft,
} from "./editorial-director-contracts";
import { grammarProfiles } from "./grammar-profile";
import { sealSceneWorldPlan } from "./scene-world";

const hash = (value: string) => hashCanonical({ value });
const output = { width: 1920, height: 1080, fps: 30 } as const;

const sentence = (prefix: string) =>
  `${Array.from({ length: 30 }, (_, index) => `${prefix}${index}`).join(" ")}.`;
const script = `${sentence("forest-a-")} ${sentence("forest-b-")}\n\n${sentence("lantern-a-")} ${sentence("lantern-b-")}`;

const livingHoldCapability = (entityId: string): PerformanceCapabilityDraft => {
  const assetContentHash = hash(`asset-${entityId}`);
  return {
    id: `capability-${entityId}`,
    requirementId: `requirement-${entityId}`,
    entityId,
    kind: "living-hold",
    rendererId: "living-hold-renderer",
    rendererVersion: "1.0.0",
    assets: [
      {
        assetId: `hold-${entityId}`,
        version: "1.0.0",
        contentHash: assetContentHash,
        status: "approved",
        relativeFile: `assets/${assetContentHash}/hold.png`,
        byteLength: 1024,
        immutableLocationId: `sha256:${assetContentHash}`,
      },
    ],
    execution: {
      kind: "living-hold",
      assetId: `hold-${entityId}`,
      atlasWidth: 200,
      atlasHeight: 100,
      frames: [
        {
          source: { x: 0, y: 0, width: 100, height: 100 },
          anchor: { x: 0.5, y: 1 },
        },
        {
          source: { x: 100, y: 0, width: 100, height: 100 },
          anchor: { x: 0.5, y: 1 },
        },
      ],
      poseSequence: [0, 1],
      cycleFrames: 24,
      breathingAmplitude: 0.01,
    },
  };
};

const fixture = (
  capabilities: CapabilityRegistry = alphaCapabilityRegistry,
  options: {
    grammar?: "kids-adventure" | "weird-history";
    includeProp?: boolean;
  } = {},
) => {
  const grammar = options.grammar ?? "kids-adventure";
  const showPack =
    grammar === "kids-adventure" ? kidsAdventureShowPack : weirdHistoryShowPack;
  const grammarProfile =
    grammar === "kids-adventure"
      ? grammarProfiles.kidsAdventure
      : grammarProfiles.weirdHistory;
  const artStyle =
    grammar === "kids-adventure"
      ? "cut-paper-collage-mixed-media"
      : "weird-history-editorial-collage";
  const storyProject = createCv002Project(
    "Storylight contract pilot",
    script,
    grammar,
    createCv002ArtDirectionSelection(grammar, artStyle),
  );
  const compiled = compileDirectorProject({ storyProject });
  const sceneWorlds = options.includeProp
    ? compiled.sceneWorlds.map((world) => {
        const { contentHash: _contentHash, ...draft } = world;
        void _contentHash;
        return sealSceneWorldPlan({
          ...draft,
          initialWorldState: {
            ...draft.initialWorldState,
            props: {
              ...draft.initialWorldState.props,
              "evidence-card": {
                kind: "free",
                transform: {
                  x: 0.5,
                  y: 0.6,
                  z: 0,
                  scale: 1,
                  rotation: 0,
                },
              },
            },
          },
        });
      })
    : compiled.sceneWorlds;
  const editorialTargets = createEditorialTargets({
    showPack,
    grammarProfile,
    referenceStudyContentHashes: [hash(`${grammar}-reference-study`)],
    fps: output.fps,
  });
  const timingBudget = sealEstimatedEditorialTimingBudget({
    storyProject,
    output,
    sceneDurationFrames: storyProject.graph.scenes.map(() => 300),
  });
  const sources: EditorialPlanningRequestSources = {
    pilotId: "storylight-contract-pilot",
    storyProject,
    showPack,
    grammarProfile,
    sceneWorlds,
    capabilityRegistry: capabilities,
    editorialTargets,
    timingBudget,
    output,
  };
  const request = createEditorialPlanningRequest(sources);
  return { ...sources, request };
};

const externalIntentFor = (
  request: EditorialPlanningRequest,
): ExternalEditorialIntentDraft => ({
  schemaVersion: "0.2-pilot",
  requestContentHash: request.contentHash,
  episode: {
    episodeRef: request.episode.episodeRef,
    sequences: request.episode.sequences.map((sequence) => ({
      sequenceRef: sequence.sequenceRef,
      scenes: sequence.scenes.map((scene) => {
        const stage = scene.stages[0]!;
        const lead =
          scene.subjects.find((subject) => subject.sourceEntityId === "lead") ??
          scene.subjects[0]!;
        const support =
          scene.subjects.find(
            (subject) => subject.sourceEntityId === "support",
          ) ?? scene.subjects[1]!;
        const entry = stage.landmarks.find(
          (landmark) => landmark.kind === "entrance",
        )!;
        const exit = stage.landmarks.find(
          (landmark) => landmark.kind === "exit",
        )!;
        const capabilities = scene.capabilities.filter(
          (capability) => capability.ownerSubjectRef === lead.subjectRef,
        );
        const editorialShots = scene.beats.map((beat, localOrdinal) => ({
          localOrdinal,
          beatRefs: [beat.beatRef],
          coverageRole:
            localOrdinal === 0
              ? ("establish-geography" as const)
              : ("primary-performance" as const),
          stageRef: stage.stageRef,
          subjectBlocking: [
            {
              subjectRef: lead.subjectRef,
              entryLandmarkRef: entry.landmarkRef,
              exitLandmarkRef: exit.landmarkRef,
              facing: "right" as const,
              gazeTargetRef: support.subjectRef,
            },
          ],
          propRefs: [],
          causalActionRefs: [beat.causalActionRef],
          purpose: {
            primaryPurpose:
              localOrdinal === 0
                ? ("establish" as const)
                : ("advance" as const),
            secondaryPurposes: ["preserve-geography" as const],
            reasonCodes: ["story-clarity" as const, "geography" as const],
          },
          shotSize: "wide" as const,
          cameraAngle: "eye-level" as const,
          cameraAxisRef: stage.cameraAxisRef,
          compositionIntent: {
            focalRegion: "left-third" as const,
            negativeSpace: "right" as const,
            depthPlaneRefs: stage.depthPlanes.map(
              (plane) => plane.depthPlaneRef,
            ),
            foregroundOccluderRefs: [],
          },
          cameraIntent: {
            movement: "locked" as const,
            reasonCodes: ["establish-geography" as const],
          },
          transitionIntent: {
            kind: "hard-cut" as const,
            reasonCodes: ["clause-boundary" as const],
          },
          readBias: "normal" as const,
          requestedCapabilityRefs: capabilities.map(
            (capability) => capability.capabilityRef,
          ),
          rationaleNote:
            "Carry the source beat without inventing exact timing.",
        }));
        return {
          sceneRef: scene.sceneRef,
          energyShape: "rising" as const,
          beats: scene.beats.map((beat, ordinal) => ({
            beatRef: beat.beatRef,
            editorialShotOrdinals: [ordinal],
          })),
          editorialShots,
        };
      }),
    })),
  },
});

const proposalFor = (request: EditorialPlanningRequest) =>
  bindEditorialDirectorProposalV1({
    request,
    externalIntent: externalIntentFor(request),
  });

const revisedProposalFor = (request: EditorialPlanningRequest) => {
  const intent = externalIntentFor(request);
  intent.episode.sequences[0]!.scenes[0]!.editorialShots[0]!.cameraIntent = {
    movement: "push",
    reasonCodes: ["increase-emphasis"],
  };
  return bindEditorialDirectorProposalV1({ request, externalIntent: intent });
};

const runSpecFor = (
  request: EditorialPlanningRequest,
  lane:
    | "heuristic-control"
    | "external-candidate"
    | "manual-candidate" = "external-candidate",
) => sealEditorialPlanningRunSpec({ request, lane });

describe("AI Editorial Director planning boundary", () => {
  it("derives real non-blocking EditorialTargets from exact Show Packs and GrammarProfiles", () => {
    const kids = createEditorialTargets({
      showPack: kidsAdventureShowPack,
      grammarProfile: grammarProfiles.kidsAdventure,
      referenceStudyContentHashes: [hash("study-b"), hash("study-a")],
      fps: 30,
    });
    const history = createEditorialTargets({
      showPack: weirdHistoryShowPack,
      grammarProfile: grammarProfiles.weirdHistory,
      referenceStudyContentHashes: [hash("history-study")],
      fps: 30,
    });

    expect(kids.priors).toMatchObject({
      targetCutsPerMinute:
        kidsAdventureShowPack.profile.cadence.targetCutsPerMinute,
      enforcement: "non-blocking-priors",
    });
    expect(kids.hardConstraints.absoluteShotDurationFrames).toEqual(
      grammarProfiles.kidsAdventure.pacing.shotDurationFrames,
    );
    expect(history.priors.shotSizeWeights).not.toEqual(
      kids.priors.shotSizeWeights,
    );
    expect(
      restoreEditorialTargets(JSON.stringify(kids), {
        showPack: kidsAdventureShowPack,
        grammarProfile: grammarProfiles.kidsAdventure,
        referenceStudyContentHashes: [hash("study-b"), hash("study-a")],
        fps: 30,
      }),
    ).toEqual(kids);
    expect(editorialTargetsSchema.parse(kids)).toEqual(kids);
  });

  it("constructs one synthetic sequence from actual canonical project and scene artifacts", () => {
    const current = fixture();
    const sequence = current.request.episode.sequences[0]!;

    expect(current.request).toMatchObject({
      storyProjectContentHash: current.storyProject.contentHash,
      storyGraphContentHash: current.storyProject.graph.contentHash,
      artDirectionSelectionContentHash:
        current.storyProject.artDirectionSelection.contentHash,
      grammarProfileContentHash: current.grammarProfile.contentHash,
      showPackContentHash: current.showPack.contentHash,
      editorialTargetsContentHash: current.editorialTargets.contentHash,
      capabilityRegistryContentHash: current.capabilityRegistry.contentHash,
      timingBudgetContentHash: current.timingBudget.contentHash,
      fallbackAllowed: false,
      maximumRevisionRounds: 1,
    });
    expect(sequence.adapter).toBe("synthetic-flat-graph-v1");
    expect(
      sequence.scenes.map((scene) => scene.sourceSceneContentHash),
    ).toEqual(
      current.storyProject.graph.scenes.map((scene) => scene.contentHash),
    );
    expect(
      sequence.scenes.every(
        (scene) => scene.stages[0]!.depthPlanes.length >= 3,
      ),
    ).toBe(true);
    expect(
      restoreEditorialPlanningRequest(JSON.stringify(current.request), current),
    ).toEqual(current.request);

    const forged = structuredClone(current.request);
    forged.episode.sequences[0]!.scenes[0]!.sourceSceneContentHash =
      hash("forged-scene");
    const { contentHash: _forgedHash, ...forgedDraft } = forged;
    void _forgedHash;
    forged.contentHash = hashCanonical(forgedDraft);
    expect(editorialPlanningRequestSchema.safeParse(forged).success).toBe(true);
    expect(() =>
      restoreEditorialPlanningRequest(JSON.stringify(forged), current),
    ).toThrow(/does not match its source artifacts/i);
  });

  it("rejects stale SceneWorld, target, timing, and capability-owner lineage", () => {
    const current = fixture();
    const reversedWorlds = [...current.sceneWorlds].reverse();
    expect(() =>
      createEditorialPlanningRequest({
        ...current,
        sceneWorlds: reversedWorlds,
      }),
    ).toThrow(/not bound to its source scene/i);

    const staleTargets = createEditorialTargets({
      showPack: kidsAdventureShowPack,
      grammarProfile: grammarProfiles.kidsAdventure,
      referenceStudyContentHashes: [hash("other-reference")],
      fps: 24,
    });
    expect(() =>
      createEditorialPlanningRequest({
        ...current,
        editorialTargets: staleTargets,
      }),
    ).toThrow(/targets are stale/i);

    const foreignRegistry = createCapabilityRegistry({
      version: "foreign-owner-v1",
      capabilities: [livingHoldCapability("ghost")],
    });
    expect(() => fixture(foreignRegistry)).toThrow(
      /absent from every sceneworld/i,
    );
  });

  it("keeps external intent on opaque refs with no nested authority, hashes, frames, or events", () => {
    const { request } = fixture();
    const intent = externalIntentFor(request);
    const shot = intent.episode.sequences[0]!.scenes[0]!.editorialShots[0]!;

    expect(externalEditorialIntentDraftSchema.parse(intent)).toEqual(intent);
    for (const forbidden of [
      { contentHash: hash("external") },
      { authority: "production" },
      { startFrame: 12 },
      { canonicalEventId: "event-one" },
      { sourceBeatId: "beat-internal" },
    ])
      expect(
        externalEditorialIntentDraftSchema.safeParse({
          ...intent,
          episode: {
            ...intent.episode,
            sequences: [
              {
                ...intent.episode.sequences[0]!,
                scenes: [
                  {
                    ...intent.episode.sequences[0]!.scenes[0]!,
                    editorialShots: [{ ...shot, ...forbidden }],
                  },
                ],
              },
            ],
          },
        }).success,
      ).toBe(false);
  });

  it("binds hierarchical reciprocal coverage, blocking, camera axis, action refs, and depth", () => {
    const current = fixture(
      createCapabilityRegistry({
        version: "lead-hold-v1",
        capabilities: [livingHoldCapability("lead")],
      }),
    );
    const proposal = proposalFor(current.request);
    const firstScene = proposal.episode.sequences[0]!.scenes[0]!;
    const firstShot = firstScene.editorialShots[0]!;

    expect(firstScene.beats[0]!.sourceEditorialShotIds).toEqual([
      firstShot.editorialShotId,
    ]);
    expect(firstShot.subjectBlocking).toHaveLength(1);
    expect(firstShot.requestedCapabilityRefs).toHaveLength(1);
    expect(
      firstShot.compositionIntent.depthPlaneRefs.length,
    ).toBeGreaterThanOrEqual(3);
    expect(firstShot).not.toHaveProperty("startFrame");
    expect(firstShot).not.toHaveProperty("eventId");
    expect(
      restoreEditorialDirectorProposalV1({
        serialized: JSON.stringify(proposal),
        request: current.request,
      }),
    ).toEqual(proposal);

    const forged = structuredClone(proposal);
    forged.requestContentHash = hash("foreign-request");
    const { contentHash: _forgedHash, ...forgedDraft } = forged;
    void _forgedHash;
    forged.contentHash = hashCanonical(forgedDraft);
    expect(editorialDirectorProposalV1Schema.safeParse(forged).success).toBe(
      true,
    );
    expect(() =>
      restoreEditorialDirectorProposalV1({
        serialized: JSON.stringify(forged),
        request: current.request,
      }),
    ).toThrow(/stale request/i);
  });

  it("rejects reciprocal coverage whose shots reverse source beat order", () => {
    const { request } = fixture();
    const intent = externalIntentFor(request);
    const scene = intent.episode.sequences[0]!.scenes[0]!;
    scene.editorialShots = [...scene.editorialShots]
      .reverse()
      .map((shot, localOrdinal) => ({ ...shot, localOrdinal }));
    scene.beats.forEach((beat) => {
      beat.editorialShotOrdinals = [
        scene.editorialShots.findIndex((shot) =>
          shot.beatRefs.includes(beat.beatRef),
        ),
      ];
    });

    expect(() =>
      bindEditorialDirectorProposalV1({ request, externalIntent: intent }),
    ).toThrow(/nondecreasing first and last source beat order/i);
  });

  it("allows subjectless geography, prop reveals, and evidence while protecting performance subjects", () => {
    const { request } = fixture();
    const environment = externalIntentFor(request);
    const environmentShot =
      environment.episode.sequences[0]!.scenes[0]!.editorialShots[0]!;
    environmentShot.subjectBlocking = [];
    environmentShot.requestedCapabilityRefs = [];
    environmentShot.coverageRole = "establish-geography";
    environmentShot.purpose.primaryPurpose = "establish";
    expect(
      bindEditorialDirectorProposalV1({
        request,
        externalIntent: environment,
      }).episode.sequences[0]!.scenes[0]!.editorialShots[0]!.subjectBlocking,
    ).toEqual([]);

    const withProp = fixture(alphaCapabilityRegistry, { includeProp: true });
    const propReveal = externalIntentFor(withProp.request);
    const propScene = withProp.request.episode.sequences[0]!.scenes[0]!;
    const propShot =
      propReveal.episode.sequences[0]!.scenes[0]!.editorialShots[0]!;
    propShot.subjectBlocking = [];
    propShot.requestedCapabilityRefs = [];
    propShot.coverageRole = "reveal-insert";
    propShot.purpose.primaryPurpose = "advance";
    propShot.propRefs = [propScene.props[0]!.propRef];
    expect(
      bindEditorialDirectorProposalV1({
        request: withProp.request,
        externalIntent: propReveal,
      }).episode.sequences[0]!.scenes[0]!.editorialShots[0]!.propRefs,
    ).toEqual([propScene.props[0]!.propRef]);

    const history = fixture(alphaCapabilityRegistry, {
      grammar: "weird-history",
    });
    const evidence = externalIntentFor(history.request);
    const evidenceShot =
      evidence.episode.sequences[0]!.scenes[0]!.editorialShots[0]!;
    evidenceShot.subjectBlocking = [];
    evidenceShot.requestedCapabilityRefs = [];
    evidenceShot.coverageRole = "reveal-insert";
    evidenceShot.purpose.primaryPurpose = "punctuate";
    evidenceShot.rationaleNote =
      "Subjectless evidence card for the Weird History visual argument.";
    expect(
      bindEditorialDirectorProposalV1({
        request: history.request,
        externalIntent: evidence,
      }).episode.sequences[0]!.scenes[0]!.editorialShots[0]!.subjectBlocking,
    ).toEqual([]);

    const listenerWithoutListener = externalIntentFor(request);
    const listenerShot =
      listenerWithoutListener.episode.sequences[0]!.scenes[0]!
        .editorialShots[0]!;
    listenerShot.subjectBlocking = [];
    listenerShot.requestedCapabilityRefs = [];
    listenerShot.coverageRole = "listener-reaction";
    expect(() =>
      bindEditorialDirectorProposalV1({
        request,
        externalIntent: listenerWithoutListener,
      }),
    ).toThrow(/require a blocked subject/i);

    const feelingWithoutSubject = externalIntentFor(request);
    const feelingShot =
      feelingWithoutSubject.episode.sequences[0]!.scenes[0]!.editorialShots[0]!;
    feelingShot.subjectBlocking = [];
    feelingShot.requestedCapabilityRefs = [];
    feelingShot.coverageRole = "establish-geography";
    feelingShot.purpose.primaryPurpose = "feel";
    expect(() =>
      bindEditorialDirectorProposalV1({
        request,
        externalIntent: feelingWithoutSubject,
      }),
    ).toThrow(/require a blocked subject/i);

    const capable = fixture(
      createCapabilityRegistry({
        version: "lead-hold-v1",
        capabilities: [livingHoldCapability("lead")],
      }),
    );
    const subjectlessCapability = externalIntentFor(capable.request);
    const subjectlessCapabilityShot =
      subjectlessCapability.episode.sequences[0]!.scenes[0]!.editorialShots[0]!;
    subjectlessCapabilityShot.subjectBlocking = [];
    subjectlessCapabilityShot.coverageRole = "establish-geography";
    subjectlessCapabilityShot.purpose.primaryPurpose = "establish";
    expect(() =>
      bindEditorialDirectorProposalV1({
        request: capable.request,
        externalIntent: subjectlessCapability,
      }),
    ).toThrow(/subjectless editorial shot cannot request/i);

    const wrongOwner = externalIntentFor(capable.request);
    const wrongOwnerShot =
      wrongOwner.episode.sequences[0]!.scenes[0]!.editorialShots[0]!;
    const support =
      capable.request.episode.sequences[0]!.scenes[0]!.subjects.find(
        (subject) => subject.sourceEntityId === "support",
      )!;
    wrongOwnerShot.subjectBlocking[0] = {
      ...wrongOwnerShot.subjectBlocking[0]!,
      subjectRef: support.subjectRef,
    };
    expect(() =>
      bindEditorialDirectorProposalV1({
        request: capable.request,
        externalIntent: wrongOwner,
      }),
    ).toThrow(/not owned by a blocked subject/i);
  });

  it("requires the exact canonical causal action set for every covered beat", () => {
    const { request } = fixture();
    const multiBeatIntent = () => {
      const intent = externalIntentFor(request);
      const requestScene = request.episode.sequences[0]!.scenes[0]!;
      const scene = intent.episode.sequences[0]!.scenes[0]!;
      const shot = scene.editorialShots[0]!;
      shot.beatRefs = requestScene.beats.map((beat) => beat.beatRef);
      shot.causalActionRefs = requestScene.beats
        .map((beat) => beat.causalActionRef)
        .reverse();
      scene.beats[0]!.editorialShotOrdinals = [0];
      scene.beats[1]!.editorialShotOrdinals = [0, 1];
      return { intent, requestScene };
    };

    const canonical = multiBeatIntent();
    const bound = bindEditorialDirectorProposalV1({
      request,
      externalIntent: canonical.intent,
    });
    expect(
      bound.episode.sequences[0]!.scenes[0]!.editorialShots[0]!
        .causalActionRefs,
    ).toEqual(
      canonical.requestScene.beats.map((beat) => beat.causalActionRef).sort(),
    );

    const missing = multiBeatIntent();
    missing.intent.episode.sequences[0]!.scenes[0]!.editorialShots[0]!.causalActionRefs =
      [missing.requestScene.beats[0]!.causalActionRef];
    expect(() =>
      bindEditorialDirectorProposalV1({
        request,
        externalIntent: missing.intent,
      }),
    ).toThrow(/canonical action set of every covered beat/i);

    const extra = multiBeatIntent();
    extra.intent.episode.sequences[0]!.scenes[0]!.editorialShots[0]!.causalActionRefs.push(
      request.episode.sequences[0]!.scenes[1]!.beats[0]!.causalActionRef,
    );
    expect(() =>
      bindEditorialDirectorProposalV1({
        request,
        externalIntent: extra.intent,
      }),
    ).toThrow(/canonical action set of every covered beat/i);

    const foreign = multiBeatIntent();
    foreign.intent.episode.sequences[0]!.scenes[0]!.editorialShots[0]!.causalActionRefs.push(
      "causal-action-ref-foreign",
    );
    expect(() =>
      bindEditorialDirectorProposalV1({
        request,
        externalIntent: foreign.intent,
      }),
    ).toThrow(/canonical action set of every covered beat/i);
  });

  it("rejects a self-rehashed external-intent substitution in every downstream transition", () => {
    const { request } = fixture();
    const proposal = proposalFor(request);
    const successor = revisedProposalFor(request);
    const runSpec = runSpecFor(request);
    const forged = structuredClone(proposal);
    forged.externalIntentContentHash = hash("substituted-external-intent");
    const { contentHash: _forgedHash, ...forgedDraft } = forged;
    void _forgedHash;
    forged.contentHash = hashCanonical(forgedDraft);
    const forgedSuccessor = structuredClone(successor);
    forgedSuccessor.externalIntentContentHash = hash(
      "substituted-successor-external-intent",
    );
    const { contentHash: _forgedSuccessorHash, ...forgedSuccessorDraft } =
      forgedSuccessor;
    void _forgedSuccessorHash;
    forgedSuccessor.contentHash = hashCanonical(forgedSuccessorDraft);

    expect(forged.requestContentHash).toBe(request.contentHash);
    expect(editorialDirectorProposalV1Schema.safeParse(forged).success).toBe(
      true,
    );
    expect(
      editorialDirectorProposalV1Schema.safeParse(forgedSuccessor).success,
    ).toBe(true);

    const receiptEvidence = {
      providerId: "openai",
      modelId: "gpt-pro",
      modelVersion: "2026-07-19",
      promptTemplateContentHash: hash("prompt"),
      contextContentHashes: [hash("context")],
      rawResponseContentHash: hash("response"),
      startedAt: "2026-07-19T08:00:00.000Z",
      completedAt: "2026-07-19T08:00:01.000Z",
    } as const;
    const receipt = sealEditorialPlanningInvocationReceipt({
      request,
      runSpec,
      proposal,
      ...receiptEvidence,
    });
    const successorReceipt = sealEditorialPlanningInvocationReceipt({
      request,
      runSpec,
      proposal: successor,
      ...receiptEvidence,
      rawResponseContentHash: hash("successor-response"),
    });
    const clean = sealEditorialPlanningDiagnostics({
      request,
      proposal,
      findings: [],
    });
    const hard = sealEditorialPlanningDiagnostics({
      request,
      proposal,
      findings: [
        {
          id: "hard-one",
          severity: "hard",
          code: "continuity-invalid",
          message: "The causal action cannot resolve.",
        },
      ],
    });
    const accepted = sealEditorialAcceptedResult({
      request,
      runSpec,
      proposal,
      diagnostics: clean,
      planningReceipt: receipt,
      revisionRound: 0,
    });
    const rejected = sealEditorialRejectedResult({
      request,
      runSpec,
      rejectedProposal: proposal,
      rejectedIntent: externalIntentFor(request),
      diagnostics: hard,
      planningReceipt: receipt,
      reasonCodes: ["continuity-invalid"],
      revisionRound: 0,
    });
    const revision = sealEditorialRevisionResult({
      request,
      runSpec,
      priorProposal: proposal,
      qualityDiagnostics: hard,
      addressedFindingIds: ["hard-one"],
      successorProposal: successor,
      successorPlanningReceipt: successorReceipt,
    });
    const requestBindingError = /exact request-bound external intent/i;
    const firstShot =
      proposal.episode.sequences[0]!.scenes[0]!.editorialShots[0]!;

    expect(() =>
      restoreEditorialDirectorProposalV1({
        serialized: JSON.stringify(forged),
        request,
      }),
    ).toThrow(requestBindingError);
    expect(() =>
      createSourceEditorialShotLineage({
        request,
        proposal: forged,
        editorialShotId: firstShot.editorialShotId,
      }),
    ).toThrow(requestBindingError);
    expect(() =>
      sealEditorialPlanningInvocationReceipt({
        request,
        runSpec,
        proposal: forged,
        ...receiptEvidence,
      }),
    ).toThrow(requestBindingError);
    expect(() =>
      restoreEditorialPlanningInvocationReceipt({
        serialized: JSON.stringify(receipt),
        request,
        runSpec,
        proposal: forged,
      }),
    ).toThrow(requestBindingError);
    expect(() =>
      sealEditorialPlanningDiagnostics({
        request,
        proposal: forged,
        findings: [],
      }),
    ).toThrow(requestBindingError);
    expect(() =>
      sealEditorialAcceptedResult({
        request,
        runSpec,
        proposal: forged,
        diagnostics: clean,
        planningReceipt: receipt,
        revisionRound: 0,
      }),
    ).toThrow(requestBindingError);
    expect(() =>
      sealEditorialRejectedResult({
        request,
        runSpec,
        rejectedProposal: forged,
        rejectedIntent: externalIntentFor(request),
        diagnostics: hard,
        planningReceipt: receipt,
        reasonCodes: ["continuity-invalid"],
        revisionRound: 0,
      }),
    ).toThrow(requestBindingError);
    expect(() =>
      sealEditorialRevisionResult({
        request,
        runSpec,
        priorProposal: forged,
        qualityDiagnostics: hard,
        addressedFindingIds: ["hard-one"],
        successorProposal: successor,
        successorPlanningReceipt: successorReceipt,
      }),
    ).toThrow(requestBindingError);
    expect(() =>
      sealEditorialRevisionResult({
        request,
        runSpec,
        priorProposal: proposal,
        qualityDiagnostics: hard,
        addressedFindingIds: ["hard-one"],
        successorProposal: forgedSuccessor,
        successorPlanningReceipt: successorReceipt,
      }),
    ).toThrow(requestBindingError);

    expect(() =>
      restoreEditorialPlanningResult({
        serialized: JSON.stringify(accepted),
        request,
        runSpec,
        proposals: [forged],
        receipts: [receipt],
        diagnostics: [clean],
      }),
    ).toThrow(requestBindingError);
    expect(() =>
      restoreEditorialPlanningResult({
        serialized: JSON.stringify(rejected),
        request,
        runSpec,
        proposals: [forged],
        receipts: [receipt],
        diagnostics: [hard],
        rejectedIntents: [externalIntentFor(request)],
      }),
    ).toThrow(requestBindingError);
    expect(() =>
      restoreEditorialPlanningResult({
        serialized: JSON.stringify(revision),
        request,
        runSpec,
        proposals: [proposal, forgedSuccessor],
        receipts: [successorReceipt],
        diagnostics: [hard],
      }),
    ).toThrow(requestBindingError);
  });

  it("canonicalizes unordered sets without changing semantic proposal identity", () => {
    const { request } = fixture();
    const first = externalIntentFor(request);
    const firstShot = first.episode.sequences[0]!.scenes[0]!.editorialShots[0]!;
    const support = request.episode.sequences[0]!.scenes[0]!.subjects.find(
      (subject) => subject.sourceEntityId === "support",
    )!;
    firstShot.subjectBlocking.push({
      ...firstShot.subjectBlocking[0]!,
      subjectRef: support.subjectRef,
      gazeTargetRef: firstShot.subjectBlocking[0]!.subjectRef,
    });
    const reordered = structuredClone(first);
    const shot = reordered.episode.sequences[0]!.scenes[0]!.editorialShots[0]!;
    shot.purpose.reasonCodes.reverse();
    shot.subjectBlocking.reverse();
    shot.requestedCapabilityRefs.reverse();
    const firstProposal = bindEditorialDirectorProposalV1({
      request,
      externalIntent: first,
    });
    const reorderedProposal = bindEditorialDirectorProposalV1({
      request,
      externalIntent: reordered,
    });
    expect(reorderedProposal).toEqual(firstProposal);
  });

  it("fails closed on foreign refs, vocabulary, nonreciprocal coverage, and reorder", () => {
    const { request } = fixture();
    const foreign = externalIntentFor(request);
    foreign.episode.sequences[0]!.scenes[0]!.editorialShots[0]!.cameraAxisRef =
      "camera-axis-ref-foreign";
    expect(() =>
      bindEditorialDirectorProposalV1({ request, externalIntent: foreign }),
    ).toThrow(/camera axis/i);

    const shallow = externalIntentFor(request);
    shallow.episode.sequences[0]!.scenes[0]!.editorialShots[0]!.compositionIntent.depthPlaneRefs =
      shallow.episode.sequences[0]!.scenes[0]!.editorialShots[0]!.compositionIntent.depthPlaneRefs.slice(
        0,
        2,
      );
    expect(() =>
      bindEditorialDirectorProposalV1({ request, externalIntent: shallow }),
    ).toThrow();

    const nonreciprocal = externalIntentFor(request);
    nonreciprocal.episode.sequences[0]!.scenes[0]!.beats[0]!.editorialShotOrdinals =
      [1];
    expect(() =>
      bindEditorialDirectorProposalV1({
        request,
        externalIntent: nonreciprocal,
      }),
    ).toThrow(/reciprocal/i);

    const reorderedScenes = externalIntentFor(request);
    reorderedScenes.episode.sequences[0]!.scenes.reverse();
    expect(() =>
      bindEditorialDirectorProposalV1({
        request,
        externalIntent: reorderedScenes,
      }),
    ).toThrow(/scene order/i);

    const reorderedBeats = externalIntentFor(request);
    reorderedBeats.episode.sequences[0]!.scenes[0]!.beats.reverse();
    expect(() =>
      bindEditorialDirectorProposalV1({
        request,
        externalIntent: reorderedBeats,
      }),
    ).toThrow(/beat order/i);

    const vocabulary = externalIntentFor(request) as unknown as {
      episode: {
        sequences: Array<{
          scenes: Array<{
            editorialShots: Array<{
              cameraIntent: { movement: string; reasonCodes: string[] };
            }>;
          }>;
        }>;
      };
    };
    vocabulary.episode.sequences[0]!.scenes[0]!.editorialShots[0]!.cameraIntent.movement =
      "whip-pan";
    expect(() =>
      bindEditorialDirectorProposalV1({
        request,
        externalIntent: vocabulary as unknown as ExternalEditorialIntentDraft,
      }),
    ).toThrow();

    const capable = fixture(
      createCapabilityRegistry({
        version: "lead-hold-v1",
        capabilities: [livingHoldCapability("lead")],
      }),
    );
    const foreignCapability = externalIntentFor(capable.request);
    foreignCapability.episode.sequences[0]!.scenes[0]!.editorialShots[0]!.requestedCapabilityRefs =
      ["capability-ref-foreign"];
    expect(() =>
      bindEditorialDirectorProposalV1({
        request: capable.request,
        externalIntent: foreignCapability,
      }),
    ).toThrow(/foreign editorial capability/i);
  });

  it("keeps semantic proposal identity separate from provider invocation receipts", () => {
    const { request } = fixture();
    const proposal = proposalFor(request);
    const runSpec = runSpecFor(request);
    const shared = {
      request,
      runSpec,
      proposal,
      modelVersion: "2026-07-19",
      promptTemplateContentHash: hash("prompt"),
      contextContentHashes: [hash("context")],
      rawResponseContentHash: hash("response"),
      startedAt: "2026-07-19T08:00:00.000Z",
      completedAt: "2026-07-19T08:00:01.000Z",
    };
    const openai = sealEditorialPlanningInvocationReceipt({
      ...shared,
      providerId: "openai",
      modelId: "gpt-pro",
    });
    const kimi = sealEditorialPlanningInvocationReceipt({
      ...shared,
      providerId: "moonshot",
      modelId: "kimi-k3",
    });

    expect(openai.proposalContentHash).toBe(proposal.contentHash);
    expect(kimi.proposalContentHash).toBe(proposal.contentHash);
    expect(openai.contentHash).not.toBe(kimi.contentHash);
    expect(
      restoreEditorialPlanningInvocationReceipt({
        serialized: JSON.stringify(openai),
        request,
        runSpec,
        proposal,
      }),
    ).toEqual(openai);
  });

  it("binds every candidate lane to an exact sealed run spec and mandatory lane receipt", () => {
    const { request } = fixture();
    const proposal = proposalFor(request);
    const externalRun = runSpecFor(request, "external-candidate");
    const heuristicRun = runSpecFor(request, "heuristic-control");
    const manualRun = runSpecFor(request, "manual-candidate");

    expect(externalRun.fallbackAllowed).toBe(false);
    expect(
      restoreEditorialPlanningRunSpec({
        serialized: JSON.stringify(externalRun),
        request,
      }),
    ).toEqual(externalRun);

    const externalReceipt = sealEditorialPlanningInvocationReceipt({
      request,
      runSpec: externalRun,
      proposal,
      providerId: "openai",
      modelId: "gpt-pro",
      modelVersion: "2026-07-19",
      promptTemplateContentHash: hash("prompt"),
      contextContentHashes: [hash("context")],
      rawResponseContentHash: hash("response"),
      startedAt: "2026-07-19T08:00:00.000Z",
      completedAt: "2026-07-19T08:00:01.000Z",
    });
    const heuristicReceipt = sealEditorialHeuristicPlanningReceipt({
      request,
      runSpec: heuristicRun,
      proposal,
      plannerId: "heuristic-editorial-planner",
      plannerVersion: "1.0.0",
      startedAt: "2026-07-19T08:00:00.000Z",
      completedAt: "2026-07-19T08:00:01.000Z",
    });
    const manualReceipt = sealEditorialManualPlanningReceipt({
      request,
      runSpec: manualRun,
      proposal,
      authorId: "editor-pbirc",
      authorshipEvidenceContentHash: hash("manual-authorship-evidence"),
      authoredAt: "2026-07-19T08:00:00.000Z",
    });

    expect(heuristicReceipt).toMatchObject({
      lane: "heuristic-control",
      plannerId: "heuristic-editorial-planner",
      plannerVersion: "1.0.0",
    });
    expect(externalReceipt).toMatchObject({
      lane: "external-candidate",
      providerId: "openai",
      modelId: "gpt-pro",
    });
    expect(manualReceipt).toMatchObject({
      lane: "manual-candidate",
      authorId: "editor-pbirc",
      authorshipEvidenceContentHash: hash("manual-authorship-evidence"),
    });
    expect(
      restoreEditorialHeuristicPlanningReceipt({
        serialized: JSON.stringify(heuristicReceipt),
        request,
        runSpec: heuristicRun,
        proposal,
      }),
    ).toEqual(heuristicReceipt);
    expect(
      restoreEditorialManualPlanningReceipt({
        serialized: JSON.stringify(manualReceipt),
        request,
        runSpec: manualRun,
        proposal,
      }),
    ).toEqual(manualReceipt);

    const clean = sealEditorialPlanningDiagnostics({
      request,
      proposal,
      findings: [],
    });
    for (const [runSpec, planningReceipt] of [
      [externalRun, externalReceipt],
      [heuristicRun, heuristicReceipt],
      [manualRun, manualReceipt],
    ] as const) {
      const accepted = sealEditorialAcceptedResult({
        request,
        runSpec,
        proposal,
        diagnostics: clean,
        planningReceipt,
        revisionRound: 0,
      });
      expect(accepted).toMatchObject({
        runSpecContentHash: runSpec.contentHash,
        planningReceiptContentHash: planningReceipt.contentHash,
      });
    }

    expect(() =>
      sealEditorialAcceptedResult({
        request,
        runSpec: externalRun,
        proposal,
        diagnostics: clean,
        planningReceipt: heuristicReceipt,
        revisionRound: 0,
      }),
    ).toThrow(/stale for its exact artifacts|lane does not match/i);
    expect(() =>
      sealEditorialAcceptedResult({
        request,
        runSpec: externalRun,
        proposal,
        diagnostics: clean,
        planningReceipt: null as never,
        revisionRound: 0,
      }),
    ).toThrow(/requires a lane receipt/i);
    expect(() =>
      sealEditorialPlanningInvocationReceipt({
        request,
        runSpec: heuristicRun,
        proposal,
        providerId: "openai",
        modelId: "gpt-pro",
        modelVersion: "2026-07-19",
        promptTemplateContentHash: hash("prompt"),
        contextContentHashes: [],
        rawResponseContentHash: hash("response"),
        startedAt: "2026-07-19T08:00:00.000Z",
        completedAt: "2026-07-19T08:00:01.000Z",
      }),
    ).toThrow(/external-candidate lane/i);
  });

  it("reserves structural diagnostic codes for hard findings", () => {
    const { request } = fixture();
    const proposal = proposalFor(request);
    expect(
      sealEditorialPlanningDiagnostics({
        request,
        proposal,
        findings: [
          {
            id: "hard-one",
            severity: "hard",
            code: "coverage-invalid",
            message: "Coverage is structurally incomplete.",
          },
          {
            id: "quality-warning",
            severity: "warning",
            code: "shot-mix-prior",
            message: "The shot mix could be livelier.",
          },
          {
            id: "quality-information",
            severity: "information",
            code: "cadence-observation",
            message: "Cadence remains inside the soft target.",
          },
        ],
      }).findings.map((finding) => finding.severity),
    ).toEqual(["hard", "information", "warning"]);

    expect(() =>
      sealEditorialPlanningDiagnostics({
        request,
        proposal,
        findings: [
          {
            id: "soft-structural",
            severity: "warning",
            code: "coverage-invalid",
            message: "Structural failures cannot be softened.",
          },
        ] as never,
      }),
    ).toThrow();
    expect(() =>
      sealEditorialPlanningDiagnostics({
        request,
        proposal,
        findings: [
          {
            id: "hard-quality",
            severity: "hard",
            code: "shot-mix-prior",
            message: "Quality observations cannot become hard failures.",
          },
        ] as never,
      }),
    ).toThrow();
  });

  it("seals and relationally restores accepted, rejected, and one-round revision artifacts", () => {
    const { request } = fixture();
    const proposal = proposalFor(request);
    const successor = revisedProposalFor(request);
    const runSpec = runSpecFor(request);
    const receipt = sealEditorialPlanningInvocationReceipt({
      request,
      runSpec,
      proposal,
      providerId: "openai",
      modelId: "gpt-pro",
      modelVersion: "2026-07-19",
      promptTemplateContentHash: hash("prompt"),
      contextContentHashes: [hash("context")],
      rawResponseContentHash: hash("response"),
      startedAt: "2026-07-19T08:00:00.000Z",
      completedAt: "2026-07-19T08:00:01.000Z",
    });
    const successorReceipt = sealEditorialPlanningInvocationReceipt({
      request,
      runSpec,
      proposal: successor,
      providerId: "openai",
      modelId: "gpt-pro",
      modelVersion: "2026-07-19",
      promptTemplateContentHash: hash("prompt"),
      contextContentHashes: [hash("context")],
      rawResponseContentHash: hash("successor-response"),
      startedAt: "2026-07-19T08:00:01.000Z",
      completedAt: "2026-07-19T08:00:02.000Z",
    });
    const clean = sealEditorialPlanningDiagnostics({
      request,
      proposal,
      findings: [
        {
          id: "warning-one",
          severity: "warning",
          code: "shot-mix-prior",
          message: "A soft prior observation, not a blocker.",
        },
      ],
    });
    const accepted = sealEditorialAcceptedResult({
      request,
      runSpec,
      proposal,
      diagnostics: clean,
      planningReceipt: receipt,
      revisionRound: 0,
    });
    expect(
      restoreEditorialPlanningResult({
        serialized: JSON.stringify(accepted),
        request,
        runSpec,
        proposals: [proposal],
        receipts: [receipt],
        diagnostics: [clean],
      }),
    ).toEqual(accepted);

    const hard = sealEditorialPlanningDiagnostics({
      request,
      proposal,
      findings: [
        {
          id: "hard-one",
          severity: "hard",
          code: "continuity-invalid",
          message: "The causal action cannot resolve.",
        },
      ],
    });
    const rejected = sealEditorialRejectedResult({
      request,
      runSpec,
      rejectedProposal: proposal,
      rejectedIntent: externalIntentFor(request),
      diagnostics: hard,
      planningReceipt: receipt,
      reasonCodes: ["continuity-invalid"],
      revisionRound: 0,
    });
    expect(
      restoreEditorialPlanningResult({
        serialized: JSON.stringify(rejected),
        request,
        runSpec,
        proposals: [proposal],
        receipts: [receipt],
        diagnostics: [hard],
        rejectedIntents: [externalIntentFor(request)],
      }),
    ).toEqual(rejected);

    const revision = sealEditorialRevisionResult({
      request,
      runSpec,
      priorProposal: proposal,
      qualityDiagnostics: hard,
      addressedFindingIds: ["hard-one"],
      successorProposal: successor,
      successorPlanningReceipt: successorReceipt,
    });
    expect(
      restoreEditorialPlanningResult({
        serialized: JSON.stringify(revision),
        request,
        runSpec,
        proposals: [proposal, successor],
        receipts: [successorReceipt],
        diagnostics: [hard],
      }),
    ).toEqual(revision);
  });

  it("forbids pilot fallback and rejects hard-diagnostic acceptance", () => {
    const { request } = fixture();
    const proposal = proposalFor(request);
    const runSpec = runSpecFor(request);
    const receipt = sealEditorialPlanningInvocationReceipt({
      request,
      runSpec,
      proposal,
      providerId: "openai",
      modelId: "gpt-pro",
      modelVersion: "2026-07-19",
      promptTemplateContentHash: hash("prompt"),
      contextContentHashes: [],
      rawResponseContentHash: hash("response"),
      startedAt: "2026-07-19T08:00:00.000Z",
      completedAt: "2026-07-19T08:00:01.000Z",
    });
    const hard = sealEditorialPlanningDiagnostics({
      request,
      proposal,
      findings: [
        {
          id: "hard-one",
          severity: "hard",
          code: "continuity-invalid",
          message: "Hard defect.",
        },
      ],
    });
    expect(() => sealEditorialFallbackResult(request, runSpec)).toThrow(
      /forbidden/i,
    );
    expect(() =>
      sealEditorialAcceptedResult({
        request,
        runSpec,
        proposal,
        diagnostics: hard,
        planningReceipt: receipt,
        revisionRound: 0,
      }),
    ).toThrow(/hard diagnostics/i);
  });

  it("provides checked shot lineage while remaining rejected by production authority schemas", () => {
    const { request } = fixture();
    const proposal = proposalFor(request);
    const shot = proposal.episode.sequences[0]!.scenes[0]!.editorialShots[0]!;
    expect(
      createSourceEditorialShotLineage({
        request,
        proposal,
        editorialShotId: shot.editorialShotId,
      }),
    ).toEqual({
      sourceEditorialProposalContentHash: proposal.contentHash,
      sourceEditorialShotId: shot.editorialShotId,
    });
    expect(editorialDirectorProposalV1Schema.parse(proposal)).toEqual(proposal);
    expect(directorProposalSchema.safeParse(proposal).success).toBe(false);
    expect(directorProjectSchema.safeParse(proposal).success).toBe(false);
    expect(directorProductionBundleSchema.safeParse(proposal).success).toBe(
      false,
    );
    expect(editorialPlanningRequestSchema.parse(request)).toEqual(request);
    expect(editorialPlanningResultSchema.safeParse(proposal).success).toBe(
      false,
    );
  });
});
