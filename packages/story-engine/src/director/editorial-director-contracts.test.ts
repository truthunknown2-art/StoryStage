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
  restoreEditorialPlanningInvocationReceipt,
  restoreEditorialPlanningRequest,
  restoreEditorialPlanningResult,
  restoreEditorialTargets,
  sealEditorialAcceptedResult,
  sealEditorialFallbackResult,
  sealEditorialPlanningDiagnostics,
  sealEditorialPlanningInvocationReceipt,
  sealEditorialRejectedResult,
  sealEditorialRevisionResult,
  sealEstimatedEditorialTimingBudget,
  type EditorialPlanningRequest,
  type EditorialPlanningRequestSources,
  type ExternalEditorialIntentDraft,
} from "./editorial-director-contracts";
import { grammarProfiles } from "./grammar-profile";

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
) => {
  const storyProject = createCv002Project(
    "Storylight contract pilot",
    script,
    "kids-adventure",
    createCv002ArtDirectionSelection(
      "kids-adventure",
      "cut-paper-collage-mixed-media",
    ),
  );
  const compiled = compileDirectorProject({ storyProject });
  const editorialTargets = createEditorialTargets({
    showPack: kidsAdventureShowPack,
    grammarProfile: grammarProfiles.kidsAdventure,
    referenceStudyContentHashes: [hash("kids-reference-study")],
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
    showPack: kidsAdventureShowPack,
    grammarProfile: grammarProfiles.kidsAdventure,
    sceneWorlds: compiled.sceneWorlds,
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
        const lead = scene.subjects.find(
          (subject) => subject.sourceEntityId === "lead",
        )!;
        const support = scene.subjects.find(
          (subject) => subject.sourceEntityId === "support",
        )!;
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

  it("rejects a self-rehashed external-intent substitution in every downstream transition", () => {
    const { request } = fixture();
    const proposal = proposalFor(request);
    const successor = revisedProposalFor(request);
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
      proposal,
      ...receiptEvidence,
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
      proposal,
      diagnostics: clean,
      invocationReceipt: receipt,
      revisionRound: 0,
    });
    const rejected = sealEditorialRejectedResult({
      request,
      rejectedProposal: proposal,
      rejectedIntent: externalIntentFor(request),
      diagnostics: hard,
      invocationReceipt: receipt,
      reasonCodes: ["continuity-invalid"],
      revisionRound: 0,
    });
    const revision = sealEditorialRevisionResult({
      request,
      priorProposal: proposal,
      qualityDiagnostics: hard,
      addressedFindingIds: ["hard-one"],
      successorProposal: successor,
      successorInvocationReceipt: null,
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
        proposal: forged,
        ...receiptEvidence,
      }),
    ).toThrow(requestBindingError);
    expect(() =>
      restoreEditorialPlanningInvocationReceipt({
        serialized: JSON.stringify(receipt),
        request,
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
        proposal: forged,
        diagnostics: clean,
        invocationReceipt: receipt,
        revisionRound: 0,
      }),
    ).toThrow(requestBindingError);
    expect(() =>
      sealEditorialRejectedResult({
        request,
        rejectedProposal: forged,
        rejectedIntent: externalIntentFor(request),
        diagnostics: hard,
        invocationReceipt: receipt,
        reasonCodes: ["continuity-invalid"],
        revisionRound: 0,
      }),
    ).toThrow(requestBindingError);
    expect(() =>
      sealEditorialRevisionResult({
        request,
        priorProposal: forged,
        qualityDiagnostics: hard,
        addressedFindingIds: ["hard-one"],
        successorProposal: successor,
        successorInvocationReceipt: null,
      }),
    ).toThrow(requestBindingError);
    expect(() =>
      sealEditorialRevisionResult({
        request,
        priorProposal: proposal,
        qualityDiagnostics: hard,
        addressedFindingIds: ["hard-one"],
        successorProposal: forgedSuccessor,
        successorInvocationReceipt: null,
      }),
    ).toThrow(requestBindingError);

    expect(() =>
      restoreEditorialPlanningResult({
        serialized: JSON.stringify(accepted),
        request,
        proposals: [forged],
        receipts: [receipt],
        diagnostics: [clean],
      }),
    ).toThrow(requestBindingError);
    expect(() =>
      restoreEditorialPlanningResult({
        serialized: JSON.stringify(rejected),
        request,
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
        proposals: [proposal, forgedSuccessor],
        receipts: [],
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
    const shared = {
      request,
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
        proposal,
      }),
    ).toEqual(openai);
  });

  it("seals and relationally restores accepted, rejected, and one-round revision artifacts", () => {
    const { request } = fixture();
    const proposal = proposalFor(request);
    const successor = revisedProposalFor(request);
    const receipt = sealEditorialPlanningInvocationReceipt({
      request,
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
      proposal,
      diagnostics: clean,
      invocationReceipt: receipt,
      revisionRound: 0,
    });
    expect(
      restoreEditorialPlanningResult({
        serialized: JSON.stringify(accepted),
        request,
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
      rejectedProposal: proposal,
      rejectedIntent: externalIntentFor(request),
      diagnostics: hard,
      invocationReceipt: receipt,
      reasonCodes: ["continuity-invalid"],
      revisionRound: 0,
    });
    expect(
      restoreEditorialPlanningResult({
        serialized: JSON.stringify(rejected),
        request,
        proposals: [proposal],
        receipts: [receipt],
        diagnostics: [hard],
        rejectedIntents: [externalIntentFor(request)],
      }),
    ).toEqual(rejected);

    const revision = sealEditorialRevisionResult({
      request,
      priorProposal: proposal,
      qualityDiagnostics: hard,
      addressedFindingIds: ["hard-one"],
      successorProposal: successor,
      successorInvocationReceipt: null,
    });
    expect(
      restoreEditorialPlanningResult({
        serialized: JSON.stringify(revision),
        request,
        proposals: [proposal, successor],
        receipts: [],
        diagnostics: [hard],
      }),
    ).toEqual(revision);
  });

  it("forbids pilot fallback and rejects hard-diagnostic acceptance", () => {
    const { request } = fixture();
    const proposal = proposalFor(request);
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
    expect(() => sealEditorialFallbackResult(request)).toThrow(/forbidden/i);
    expect(() =>
      sealEditorialAcceptedResult({
        request,
        proposal,
        diagnostics: hard,
        invocationReceipt: null,
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
