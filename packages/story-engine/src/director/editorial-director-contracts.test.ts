import { describe, expect, it } from "vitest";
import { hashCanonical } from "../canonical-hash";
import { createCv002ArtDirectionSelection } from "../cv002-art-direction";
import { createCv002Project } from "../cv002-story-draft";
import {
  sealGuideVoiceClock,
  sealGuideVoiceTimingBasis,
  type GuideVoiceClause,
} from "../guide-voice-clock";
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
  createGuideBoundEditorialPlanningArtifacts,
  createEditorialTargets,
  createSourceEditorialShotLineage,
  editorialDirectorProposalV1Schema,
  editorialGuideClauseRegistryV1Schema,
  editorialGuideFrameGridV1Schema,
  editorialPilotPairSpecV1Schema,
  editorialPlanningRequestSchema,
  editorialPlanningResultSchema,
  editorialTargetsSchema,
  editorialTimingBindingV1Schema,
  externalEditorialIntentDraftSchema,
  restoreEditorialDirectorProposalV1,
  restoreEditorialExternalPlanningAttemptReceipt,
  restoreEditorialExternalResponseParseReceipt,
  restoreEditorialHeuristicPlanningAttemptReceipt,
  restoreEditorialManualPlanningAttemptReceipt,
  restoreEditorialPlanningRequest,
  restoreGuideBoundEditorialPlanningRequest,
  restoreEditorialPlanningResult,
  restoreEditorialPlanningRunSpec,
  restoreEditorialProposalBindingReceipt,
  restoreEditorialTargets,
  sealEditorialAcceptedResult,
  sealEditorialFallbackResult,
  sealEditorialExternalPlanningAttemptReceipt,
  sealEditorialExternalResponseParseReceipt,
  sealEditorialHeuristicPlanningAttemptReceipt,
  sealEditorialManualPlanningAttemptReceipt,
  sealEditorialPlanningDiagnostics,
  sealEditorialProposalBindingReceipt,
  sealEditorialRejectedResult,
  sealEditorialRevisionResult,
  sealEditorialPlanningRunSpec,
  sealEditorialPilotPairSpecV1,
  sealEstimatedEditorialTimingBudget,
  verifyEditorialPilotPair,
  type EditorialPlanningRequest,
  type EditorialPlanningRequestSources,
  type EditorialPlanningRunSpec,
  type EditorialPlanningAttemptReceipt,
  type EditorialExternalRawResponse,
  type EditorialDirectorProposalV1,
  type ExternalEditorialIntentDraft,
  type GuideBoundEditorialPlanningRequestSources,
} from "./editorial-director-contracts";
import { grammarProfiles } from "./grammar-profile";
import { sealSceneWorldPlan } from "./scene-world";

const hash = (value: string) => hashCanonical({ value });
const resealArtifact = <T extends { contentHash: string }>(artifact: T): T => {
  const { contentHash: _contentHash, ...draft } = artifact;
  void _contentHash;
  return { ...draft, contentHash: hashCanonical(draft) } as T;
};
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

const makeGuideWav = (durationSamples: number, seed = 0) => {
  const dataLength = durationSamples * 2;
  const bytes = new Uint8Array(44 + dataLength);
  const view = new DataView(bytes.buffer);
  const writeAscii = (offset: number, value: string) =>
    [...value].forEach((character, index) => {
      bytes[offset + index] = character.charCodeAt(0);
    });
  writeAscii(0, "RIFF");
  view.setUint32(4, bytes.length - 8, true);
  writeAscii(8, "WAVE");
  writeAscii(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, 48_000, true);
  view.setUint32(28, 96_000, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeAscii(36, "data");
  view.setUint32(40, dataLength, true);
  for (let index = 44; index < bytes.length; index += 1)
    bytes[index] = (index + seed) % 251;
  return bytes;
};

const guideFixture = () => {
  const base = fixture();
  const sourceBeats = base.storyProject.graph.scenes.flatMap((scene) =>
    scene.beats.map((beat) => ({ scene, beat })),
  );
  const guideVoiceSources = {
    script: base.storyProject.sourceText,
    audioBytes: makeGuideWav(sourceBeats.length * 16_000),
  };
  const clauses: GuideVoiceClause[] = sourceBeats.map(({ beat }, index) => ({
    clauseId: `guide-clause-${index + 1}`,
    sourceRange: beat.sourceRange,
    speakerRef: "narrator",
    startSample: index * 16_000,
    endSampleExclusive: (index + 1) * 16_000,
  }));
  const guideVoiceClock = sealGuideVoiceClock(guideVoiceSources, clauses);
  const guideVoiceTimingBasis = sealGuideVoiceTimingBasis(
    guideVoiceClock,
    guideVoiceSources,
    output.fps,
  );
  const sceneRefBySourceId = new Map(
    base.request.episode.sequences[0]!.scenes.map(
      (scene) => [scene.sourceSceneId, scene.sceneRef] as const,
    ),
  );
  const clauseOwnership = sourceBeats.map(({ scene }, index) => ({
    sourceGuideClauseId: clauses[index]!.clauseId,
    ownerSceneRef: sceneRefBySourceId.get(scene.id)!,
  }));
  const sources: GuideBoundEditorialPlanningRequestSources = {
    ...base,
    guideVoiceClock,
    guideVoiceTimingBasis,
    guideVoiceSources,
    guideBindingExpectation: {
      expectedGuideVoiceClockContentHash: guideVoiceClock.contentHash,
      expectedGuideVoiceTimingBasisContentHash:
        guideVoiceTimingBasis.contentHash,
    },
    clauseOwnership,
  };
  const artifacts = createGuideBoundEditorialPlanningArtifacts(sources);
  const intent = externalIntentFor(artifacts.request);
  intent.episode.sequences.forEach((sequence) =>
    sequence.scenes.forEach((scene, sceneIndex) =>
      scene.editorialShots.forEach((shot, shotIndex) => {
        shot.timingIntent = {
          kind: "guide-audio",
          clauseRefs:
            artifacts.request.episode.sequences[0]!.scenes[sceneIndex]!.beats[
              shotIndex
            ]!.clauseRefs,
        };
      }),
    ),
  );
  return {
    ...base,
    ...sources,
    ...artifacts,
    estimatedRequest: base.request,
    intent,
  };
};

const externalIntentFor = (
  request: EditorialPlanningRequest,
): ExternalEditorialIntentDraft => ({
  schemaVersion: "0.3-pilot",
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
          timingIntent: { kind: "estimated" as const },
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

describe("guide-bound Editorial planning", () => {
  it("reopens exact guide sources and derives the sealed registry, frame grid, timing binding, and UTF-16 lineage", () => {
    const current = guideFixture();
    const requestScenes = current.request.episode.sequences[0]!.scenes;

    expect(
      requestScenes.map((scene) => ({
        sceneRef: scene.sceneRef,
        beatRefs: scene.beats.map((beat) => beat.beatRef),
        stageRefs: scene.stages.map((stage) => stage.stageRef),
        subjectRefs: scene.subjects.map((subject) => subject.subjectRef),
        propRefs: scene.props.map((prop) => prop.propRef),
        capabilityRefs: scene.capabilities.map(
          (capability) => capability.capabilityRef,
        ),
      })),
    ).toEqual(
      current.estimatedRequest.episode.sequences[0]!.scenes.map((scene) => ({
        sceneRef: scene.sceneRef,
        beatRefs: scene.beats.map((beat) => beat.beatRef),
        stageRefs: scene.stages.map((stage) => stage.stageRef),
        subjectRefs: scene.subjects.map((subject) => subject.subjectRef),
        propRefs: scene.props.map((prop) => prop.propRef),
        capabilityRefs: scene.capabilities.map(
          (capability) => capability.capabilityRef,
        ),
      })),
    );

    expect(current.request).toMatchObject({
      schemaVersion: "0.3-pilot",
      sourceRangeUnit: "utf16-code-unit-v1",
      productionBindable: false,
      timingBinding: {
        kind: "guide-audio",
        guideVoiceClockContentHash: current.guideVoiceClock.contentHash,
        guideVoiceTimingBasisContentHash:
          current.guideVoiceTimingBasis.contentHash,
        clauseRegistryContentHash: current.clauseRegistry.contentHash,
        frameGridContentHash: current.frameGrid.contentHash,
        productionBindable: false,
      },
    });
    expect(
      requestScenes.map((scene) => ({
        sourceRange: scene.sourceRange,
        clauseRefs: scene.clauseRefs,
        beats: scene.beats.map((beat) => ({
          sourceRange: beat.sourceRange,
          clauseRefs: beat.clauseRefs,
        })),
      })),
    ).toEqual(
      current.storyProject.graph.scenes.map((scene, sceneIndex) => ({
        sourceRange: scene.sourceRange,
        clauseRefs: current.clauseRegistry.clauses
          .filter(
            (clause) =>
              clause.ownerSceneRef === requestScenes[sceneIndex]!.sceneRef,
          )
          .map((clause) => clause.clauseRef),
        beats: scene.beats.map((beat) => ({
          sourceRange: beat.sourceRange,
          clauseRefs: current.clauseRegistry.clauses
            .filter(
              (clause) =>
                clause.ownerSceneRef === requestScenes[sceneIndex]!.sceneRef &&
                clause.sourceRange.start < beat.sourceRange.end &&
                beat.sourceRange.start < clause.sourceRange.end,
            )
            .map((clause) => clause.clauseRef),
        })),
      })),
    );
    current.clauseRegistry.clauses.forEach((clause) => {
      expect(
        current.storyProject.sourceText.slice(
          clause.sourceRange.start,
          clause.sourceRange.end,
        ),
      ).toBe(clause.text);
    });
    expect(
      restoreGuideBoundEditorialPlanningRequest(
        JSON.stringify(current.request),
        current,
      ),
    ).toEqual(current.request);

    const oldVersion = {
      ...current.request,
      schemaVersion: "0.2-pilot",
    };
    expect(editorialPlanningRequestSchema.safeParse(oldVersion).success).toBe(
      false,
    );
    expect(
      editorialTimingBindingV1Schema.safeParse({
        ...current.timingBinding,
        productionBindable: true,
      }).success,
    ).toBe(false);
    expect(
      editorialGuideClauseRegistryV1Schema.safeParse({
        ...current.clauseRegistry,
        productionBindable: true,
      }).success,
    ).toBe(false);
    expect(
      editorialGuideFrameGridV1Schema.safeParse({
        ...current.frameGrid,
        productionBindable: true,
      }).success,
    ).toBe(false);
    const forgedRange = structuredClone(current.request);
    forgedRange.episode.sequences[0]!.scenes[0]!.beats[0]!.sourceRange.end -= 1;
    const sealedForgedRange = resealArtifact(forgedRange);
    expect(
      editorialPlanningRequestSchema.safeParse(sealedForgedRange).success,
    ).toBe(true);
    expect(() =>
      restoreGuideBoundEditorialPlanningRequest(
        JSON.stringify(sealedForgedRange),
        current,
      ),
    ).toThrow(/exact source artifacts/i);
  });

  it("lets the external planner point only at ordered host clauses and fails closed on timing masquerades", () => {
    const current = guideFixture();
    const proposal = bindEditorialDirectorProposalV1({
      request: current.request,
      externalIntent: current.intent,
    });
    expect(proposal.schemaVersion).toBe("1.1");
    expect(proposal.productionBindable).toBe(false);
    expect(
      editorialDirectorProposalV1Schema.safeParse({
        ...proposal,
        schemaVersion: "1.0",
      }).success,
    ).toBe(false);
    expect(
      externalEditorialIntentDraftSchema.safeParse({
        ...current.intent,
        schemaVersion: "0.2-pilot",
      }).success,
    ).toBe(false);
    expect(
      proposal.episode.sequences.flatMap((sequence) =>
        sequence.scenes.flatMap((scene) =>
          scene.editorialShots.map((shot) => shot.editorialShotId),
        ),
      ),
    ).toEqual(
      proposalFor(current.estimatedRequest).episode.sequences.flatMap(
        (sequence) =>
          sequence.scenes.flatMap((scene) =>
            scene.editorialShots.map((shot) => shot.editorialShotId),
          ),
      ),
    );

    const estimatedIntent = structuredClone(current.intent);
    estimatedIntent.episode.sequences[0]!.scenes[0]!.editorialShots[0]!.timingIntent =
      { kind: "estimated" };
    expect(() =>
      bindEditorialDirectorProposalV1({
        request: current.request,
        externalIntent: estimatedIntent,
      }),
    ).toThrow(/require guide-audio/i);

    const estimated = fixture();
    const guideMasquerade = externalIntentFor(estimated.request);
    guideMasquerade.episode.sequences[0]!.scenes[0]!.editorialShots[0]!.timingIntent =
      {
        kind: "guide-audio",
        clauseRefs: [current.clauseRegistry.clauses[0]!.clauseRef],
      };
    expect(() =>
      bindEditorialDirectorProposalV1({
        request: estimated.request,
        externalIntent: guideMasquerade,
      }),
    ).toThrow(/require estimated/i);

    const duplicate = structuredClone(current.intent);
    const duplicateTiming =
      duplicate.episode.sequences[0]!.scenes[0]!.editorialShots[0]!
        .timingIntent;
    if (duplicateTiming.kind !== "guide-audio")
      throw new Error("Expected guide timing fixture.");
    duplicateTiming.clauseRefs.push(duplicateTiming.clauseRefs[0]!);
    expect(() =>
      bindEditorialDirectorProposalV1({
        request: current.request,
        externalIntent: duplicate,
      }),
    ).toThrow(/unique/i);

    const foreign = structuredClone(current.intent);
    const foreignTiming =
      foreign.episode.sequences[0]!.scenes[0]!.editorialShots[0]!.timingIntent;
    if (foreignTiming.kind !== "guide-audio")
      throw new Error("Expected guide timing fixture.");
    foreignTiming.clauseRefs = [
      current.request.episode.sequences[0]!.scenes[1]!.clauseRefs[0]!,
    ];
    expect(() =>
      bindEditorialDirectorProposalV1({
        request: current.request,
        externalIntent: foreign,
      }),
    ).toThrow(/foreign or cross-scene/i);

    const unrelated = structuredClone(current.intent);
    const unrelatedScene = unrelated.episode.sequences[0]!.scenes[0]!;
    const unrelatedTiming = unrelatedScene.editorialShots[0]!.timingIntent;
    const adjacentTiming = unrelatedScene.editorialShots[1]!.timingIntent;
    if (
      unrelatedTiming.kind !== "guide-audio" ||
      adjacentTiming.kind !== "guide-audio"
    )
      throw new Error("Expected guide timing fixture.");
    unrelatedTiming.clauseRefs = [
      ...unrelatedTiming.clauseRefs,
      ...adjacentTiming.clauseRefs,
    ];
    expect(() =>
      bindEditorialDirectorProposalV1({
        request: current.request,
        externalIntent: unrelated,
      }),
    ).toThrow(/must belong to its claimed request beats/i);

    const missingBeatIntersection = structuredClone(current.intent);
    const multiBeatScene =
      missingBeatIntersection.episode.sequences[0]!.scenes[0]!;
    const requestScene = current.request.episode.sequences[0]!.scenes[0]!;
    multiBeatScene.editorialShots[0]!.beatRefs = [
      requestScene.beats[0]!.beatRef,
      requestScene.beats[1]!.beatRef,
    ];
    multiBeatScene.editorialShots[0]!.causalActionRefs = [
      requestScene.beats[0]!.causalActionRef,
      requestScene.beats[1]!.causalActionRef,
    ].sort();
    multiBeatScene.beats[1]!.editorialShotOrdinals = [0, 1];
    expect(() =>
      bindEditorialDirectorProposalV1({
        request: current.request,
        externalIntent: missingBeatIntersection,
      }),
    ).toThrow(/must intersect a cited guide timing clause/i);

    const reversed = structuredClone(current.intent);
    const reversedTiming =
      reversed.episode.sequences[0]!.scenes[0]!.editorialShots[0]!.timingIntent;
    if (reversedTiming.kind !== "guide-audio")
      throw new Error("Expected guide timing fixture.");
    reversedTiming.clauseRefs = [
      ...current.request.episode.sequences[0]!.scenes[0]!.clauseRefs,
    ].reverse();
    expect(() =>
      bindEditorialDirectorProposalV1({
        request: current.request,
        externalIntent: reversed,
      }),
    ).toThrow(/ordered, and contiguous/i);

    const uncovered = structuredClone(current.intent);
    const uncoveredScene = uncovered.episode.sequences[0]!.scenes[0]!;
    const uncoveredFirst = uncoveredScene.editorialShots[0]!.timingIntent;
    const uncoveredSecond = uncoveredScene.editorialShots[1]!.timingIntent;
    if (
      uncoveredFirst.kind !== "guide-audio" ||
      uncoveredSecond.kind !== "guide-audio"
    )
      throw new Error("Expected guide timing fixture.");
    uncoveredFirst.clauseRefs = [...uncoveredSecond.clauseRefs];
    expect(() =>
      bindEditorialDirectorProposalV1({
        request: current.request,
        externalIntent: uncovered,
      }),
    ).toThrow(/must belong to its claimed request beats/i);

    const backward = structuredClone(current.intent);
    const backwardScene = backward.episode.sequences[0]!.scenes[0]!;
    const backwardFirst = backwardScene.editorialShots[0]!.timingIntent;
    const backwardSecond = backwardScene.editorialShots[1]!.timingIntent;
    if (
      backwardFirst.kind !== "guide-audio" ||
      backwardSecond.kind !== "guide-audio"
    )
      throw new Error("Expected guide timing fixture.");
    [backwardFirst.clauseRefs, backwardSecond.clauseRefs] = [
      [...backwardSecond.clauseRefs],
      [...backwardFirst.clauseRefs],
    ];
    expect(() =>
      bindEditorialDirectorProposalV1({
        request: current.request,
        externalIntent: backward,
      }),
    ).toThrow(/must belong to its claimed request beats/i);

    const authoredFrame = structuredClone(current.intent) as unknown as {
      episode: {
        sequences: Array<{
          scenes: Array<{
            editorialShots: Array<Record<string, unknown>>;
          }>;
        }>;
      };
    };
    authoredFrame.episode.sequences[0]!.scenes[0]!.editorialShots[0]!.startFrame = 0;
    expect(
      externalEditorialIntentDraftSchema.safeParse(authoredFrame).success,
    ).toBe(false);
  });

  it("derives beat refs by exact range overlap while forbidding a clause from crossing scenes", () => {
    const base = fixture();
    const sourceScenes = base.storyProject.graph.scenes;
    const firstScene = sourceScenes[0]!;
    const secondScene = sourceScenes[1]!;
    const sceneRefs = base.request.episode.sequences[0]!.scenes.map(
      (scene) => scene.sceneRef,
    );
    const clauses: GuideVoiceClause[] = [
      {
        clauseId: "guide-clause-scene-one",
        sourceRange: firstScene.sourceRange,
        speakerRef: "narrator",
        startSample: 0,
        endSampleExclusive: 16_000,
      },
      ...secondScene.beats.map((beat, index) => ({
        clauseId: `guide-clause-scene-two-${index + 1}`,
        sourceRange: beat.sourceRange,
        speakerRef: "narrator",
        startSample: (index + 1) * 16_000,
        endSampleExclusive: (index + 2) * 16_000,
      })),
    ];
    const guideVoiceSources = {
      script: base.storyProject.sourceText,
      audioBytes: makeGuideWav(clauses.length * 16_000),
    };
    const guideVoiceClock = sealGuideVoiceClock(guideVoiceSources, clauses);
    const guideVoiceTimingBasis = sealGuideVoiceTimingBasis(
      guideVoiceClock,
      guideVoiceSources,
      output.fps,
    );
    const sourceInput: GuideBoundEditorialPlanningRequestSources = {
      ...base,
      guideVoiceClock,
      guideVoiceTimingBasis,
      guideVoiceSources,
      guideBindingExpectation: {
        expectedGuideVoiceClockContentHash: guideVoiceClock.contentHash,
        expectedGuideVoiceTimingBasisContentHash:
          guideVoiceTimingBasis.contentHash,
      },
      clauseOwnership: clauses.map((clause, index) => ({
        sourceGuideClauseId: clause.clauseId,
        ownerSceneRef: index === 0 ? sceneRefs[0]! : sceneRefs[1]!,
      })),
    };
    const artifacts = createGuideBoundEditorialPlanningArtifacts(sourceInput);
    const firstSceneBeatRefs =
      artifacts.request.episode.sequences[0]!.scenes[0]!.beats.map(
        (beat) => beat.clauseRefs,
      );
    expect(firstSceneBeatRefs).toEqual(
      firstScene.beats.map(() => [
        artifacts.clauseRegistry.clauses[0]!.clauseRef,
      ]),
    );

    const crossingClauses: GuideVoiceClause[] = [
      {
        ...clauses[0]!,
        clauseId: "guide-clause-cross-scene",
        sourceRange: {
          start: firstScene.sourceRange.start,
          end: secondScene.beats[0]!.sourceRange.end,
        },
      },
      ...clauses.slice(2).map((clause, index) => ({
        ...clause,
        startSample: (index + 1) * 16_000,
        endSampleExclusive: (index + 2) * 16_000,
      })),
    ];
    const crossingSources = {
      script: base.storyProject.sourceText,
      audioBytes: makeGuideWav(crossingClauses.length * 16_000),
    };
    const crossingClock = sealGuideVoiceClock(crossingSources, crossingClauses);
    const crossingBasis = sealGuideVoiceTimingBasis(
      crossingClock,
      crossingSources,
      output.fps,
    );
    expect(() =>
      createGuideBoundEditorialPlanningArtifacts({
        ...base,
        guideVoiceClock: crossingClock,
        guideVoiceTimingBasis: crossingBasis,
        guideVoiceSources: crossingSources,
        guideBindingExpectation: {
          expectedGuideVoiceClockContentHash: crossingClock.contentHash,
          expectedGuideVoiceTimingBasisContentHash: crossingBasis.contentHash,
        },
        clauseOwnership: crossingClauses.map((clause, index) => ({
          sourceGuideClauseId: clause.clauseId,
          ownerSceneRef: index === 0 ? sceneRefs[0]! : sceneRefs[1]!,
        })),
      }),
    ).toThrow(/crosses or falls outside/i);
  });

  it("rejects scene-wide guide clause omissions after every shot passes beat locality", () => {
    const base = fixture();
    const sourceRows = base.storyProject.graph.scenes.flatMap(
      (scene, sceneIndex) => scene.beats.map((beat) => ({ sceneIndex, beat })),
    );
    const firstBeat = sourceRows[0]!.beat;
    const splitRelative = firstBeat.text.indexOf(
      " ",
      Math.floor(firstBeat.text.length / 2),
    );
    if (splitRelative < 1)
      throw new Error(
        "Guide coverage fixture requires a splittable first beat.",
      );
    const splitOffset = firstBeat.sourceRange.start + splitRelative;
    const clauseRanges = [
      {
        sceneIndex: 0,
        sourceRange: {
          start: firstBeat.sourceRange.start,
          end: splitOffset,
        },
      },
      {
        sceneIndex: 0,
        sourceRange: {
          start: splitOffset + 1,
          end: firstBeat.sourceRange.end,
        },
      },
      ...sourceRows.slice(1).map(({ sceneIndex, beat }) => ({
        sceneIndex,
        sourceRange: beat.sourceRange,
      })),
    ];
    const clauses: GuideVoiceClause[] = clauseRanges.map((row, index) => ({
      clauseId: `guide-coverage-clause-${index + 1}`,
      sourceRange: row.sourceRange,
      speakerRef: "narrator",
      startSample: index * 16_000,
      endSampleExclusive: (index + 1) * 16_000,
    }));
    const guideVoiceSources = {
      script: base.storyProject.sourceText,
      audioBytes: makeGuideWav(clauses.length * 16_000),
    };
    const guideVoiceClock = sealGuideVoiceClock(guideVoiceSources, clauses);
    const guideVoiceTimingBasis = sealGuideVoiceTimingBasis(
      guideVoiceClock,
      guideVoiceSources,
      output.fps,
    );
    const requestScenes = base.request.episode.sequences[0]!.scenes;
    const artifacts = createGuideBoundEditorialPlanningArtifacts({
      ...base,
      guideVoiceClock,
      guideVoiceTimingBasis,
      guideVoiceSources,
      guideBindingExpectation: {
        expectedGuideVoiceClockContentHash: guideVoiceClock.contentHash,
        expectedGuideVoiceTimingBasisContentHash:
          guideVoiceTimingBasis.contentHash,
      },
      clauseOwnership: clauses.map((clause, index) => ({
        sourceGuideClauseId: clause.clauseId,
        ownerSceneRef: requestScenes[clauseRanges[index]!.sceneIndex]!.sceneRef,
      })),
    });
    const intent = externalIntentFor(artifacts.request);
    intent.episode.sequences.forEach((sequence, sequenceIndex) =>
      sequence.scenes.forEach((scene, sceneIndex) => {
        const requestScene =
          artifacts.request.episode.sequences[sequenceIndex]!.scenes[
            sceneIndex
          ]!;
        scene.editorialShots.forEach((shot, shotIndex) => {
          const localClauseRefs = requestScene.beats[shotIndex]!.clauseRefs;
          shot.timingIntent = {
            kind: "guide-audio",
            clauseRefs:
              sceneIndex === 0 && shotIndex === 0
                ? [localClauseRefs[0]!]
                : [...localClauseRefs],
          };
        });
      }),
    );
    expect(
      artifacts.request.episode.sequences[0]!.scenes[0]!.beats[0]!.clauseRefs,
    ).toHaveLength(2);
    expect(() =>
      bindEditorialDirectorProposalV1({
        request: artifacts.request,
        externalIntent: intent,
      }),
    ).toThrow(/all be covered/i);
  });

  it("seals a no-fallback Cut A/B pair and rejects byte or artifact substitution", () => {
    const current = guideFixture();
    const cutARunSpec = runSpecFor(current.request, "heuristic-control");
    const cutBRunSpec = runSpecFor(current.request, "external-candidate");
    const pairSpec = sealEditorialPilotPairSpecV1({
      request: current.request,
      cutARunSpec,
      cutBRunSpec,
    });
    expect(
      editorialPilotPairSpecV1Schema.safeParse({
        ...pairSpec,
        productionBindable: true,
      }).success,
    ).toBe(false);
    expect(
      verifyEditorialPilotPair({
        pairSpec,
        request: current.request,
        cutARunSpec,
        cutBRunSpec,
        planningSources: current,
        guideVoiceClock: current.guideVoiceClock,
        guideVoiceTimingBasis: current.guideVoiceTimingBasis,
        cutAGuideVoiceSources: current.guideVoiceSources,
        cutBGuideVoiceSources: current.guideVoiceSources,
        clauseOwnership: current.clauseOwnership,
        clauseRegistry: current.clauseRegistry,
        frameGrid: current.frameGrid,
      }),
    ).toEqual(pairSpec);

    expect(() =>
      verifyEditorialPilotPair({
        pairSpec,
        request: current.request,
        cutARunSpec,
        cutBRunSpec,
        planningSources: current,
        guideVoiceClock: current.guideVoiceClock,
        guideVoiceTimingBasis: current.guideVoiceTimingBasis,
        cutAGuideVoiceSources: current.guideVoiceSources,
        cutBGuideVoiceSources: {
          ...current.guideVoiceSources,
          audioBytes: makeGuideWav(current.guideVoiceClock.durationSamples, 7),
        },
        clauseOwnership: current.clauseOwnership,
        clauseRegistry: current.clauseRegistry,
        frameGrid: current.frameGrid,
      }),
    ).toThrow(/exact WAV bytes|exact WAV|source artifacts/i);

    const substitutedRegistry = structuredClone(current.clauseRegistry);
    substitutedRegistry.clauses[0]!.startSample += 1;
    const sealedSubstitution = resealArtifact(substitutedRegistry);
    expect(() =>
      verifyEditorialPilotPair({
        pairSpec,
        request: current.request,
        cutARunSpec,
        cutBRunSpec,
        planningSources: current,
        guideVoiceClock: current.guideVoiceClock,
        guideVoiceTimingBasis: current.guideVoiceTimingBasis,
        cutAGuideVoiceSources: current.guideVoiceSources,
        cutBGuideVoiceSources: current.guideVoiceSources,
        clauseOwnership: current.clauseOwnership,
        clauseRegistry: sealedSubstitution,
        frameGrid: current.frameGrid,
      }),
    ).toThrow(/exact guide sources/i);

    const substitutedGrid = structuredClone(current.frameGrid);
    substitutedGrid.clauses[0]!.startFrame += 1;
    const sealedGridSubstitution = resealArtifact(substitutedGrid);
    expect(() =>
      verifyEditorialPilotPair({
        pairSpec,
        request: current.request,
        cutARunSpec,
        cutBRunSpec,
        planningSources: current,
        guideVoiceClock: current.guideVoiceClock,
        guideVoiceTimingBasis: current.guideVoiceTimingBasis,
        cutAGuideVoiceSources: current.guideVoiceSources,
        cutBGuideVoiceSources: current.guideVoiceSources,
        clauseOwnership: current.clauseOwnership,
        clauseRegistry: current.clauseRegistry,
        frameGrid: sealedGridSubstitution,
      }),
    ).toThrow(/exact guide sources/i);
  });

  it("snapshots mutable guide-bound input getters exactly once before validation and sealing", () => {
    const current = guideFixture();
    const reads = new Map<string, number>();
    const tracked = new Proxy(current, {
      get(target, property, receiver) {
        const key = String(property);
        reads.set(key, (reads.get(key) ?? 0) + 1);
        return Reflect.get(target, property, receiver);
      },
    }) as GuideBoundEditorialPlanningRequestSources;
    const rebuilt = createGuideBoundEditorialPlanningArtifacts(tracked);
    expect(rebuilt.request).toEqual(current.request);
    [
      "pilotId",
      "storyProject",
      "showPack",
      "grammarProfile",
      "sceneWorlds",
      "capabilityRegistry",
      "editorialTargets",
      "timingBudget",
      "output",
      "guideVoiceClock",
      "guideVoiceTimingBasis",
      "guideVoiceSources",
      "guideBindingExpectation",
      "clauseOwnership",
    ].forEach((field) => expect(reads.get(field)).toBe(1));
  });
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

const externalAttemptFor = (
  request: EditorialPlanningRequest,
  runSpec: EditorialPlanningRunSpec = runSpecFor(request),
  rawResponse: EditorialExternalRawResponse = JSON.stringify(
    externalIntentFor(request),
  ),
) =>
  sealEditorialExternalPlanningAttemptReceipt({
    request,
    runSpec,
    providerId: "openai",
    modelId: "gpt-pro",
    modelVersion: "2026-07-19",
    promptTemplateContentHash: hash("prompt"),
    contextContentHashes: [hash("context")],
    rawResponse,
    startedAt: "2026-07-19T08:00:00.000Z",
    completedAt: "2026-07-19T08:00:01.000Z",
  });

const externalEvidenceFor = (
  request: EditorialPlanningRequest,
  runSpec: EditorialPlanningRunSpec,
  attemptReceipt: Extract<
    EditorialPlanningAttemptReceipt,
    { lane: "external-candidate" }
  >,
  externalRawResponse: EditorialExternalRawResponse = JSON.stringify(
    externalIntentFor(request),
  ),
) => ({
  externalRawResponse,
  externalParseReceipt: sealEditorialExternalResponseParseReceipt({
    request,
    runSpec,
    attemptReceipt,
    rawResponse: externalRawResponse,
  }),
});

const bindingFor = (
  request: EditorialPlanningRequest,
  runSpec: EditorialPlanningRunSpec,
  attemptReceipt: EditorialPlanningAttemptReceipt,
  proposal: EditorialDirectorProposalV1,
  externalRawResponse: EditorialExternalRawResponse = JSON.stringify(
    externalIntentFor(request),
  ),
) =>
  sealEditorialProposalBindingReceipt({
    request,
    runSpec,
    attemptReceipt,
    ...(attemptReceipt.lane === "external-candidate"
      ? externalEvidenceFor(
          request,
          runSpec,
          attemptReceipt,
          externalRawResponse,
        )
      : {}),
    proposal,
  });

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
      timingBinding: {
        kind: "estimated",
        timingBudgetContentHash: current.timingBudget.contentHash,
      },
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
    const rawResponse = JSON.stringify(externalIntentFor(request));
    const successorRawResponse = JSON.stringify(
      (() => {
        const intent = externalIntentFor(request);
        intent.episode.sequences[0]!.scenes[0]!.editorialShots[0]!.cameraIntent =
          {
            movement: "push",
            reasonCodes: ["increase-emphasis"],
          };
        return intent;
      })(),
    );
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
      rawResponse,
      startedAt: "2026-07-19T08:00:00.000Z",
      completedAt: "2026-07-19T08:00:01.000Z",
    } as const;
    const attempt = sealEditorialExternalPlanningAttemptReceipt({
      request,
      runSpec,
      ...receiptEvidence,
    });
    const proposalBinding = bindingFor(request, runSpec, attempt, proposal);
    const successorAttempt = sealEditorialExternalPlanningAttemptReceipt({
      request,
      runSpec,
      ...receiptEvidence,
      rawResponse: successorRawResponse,
    });
    const successorProposalBinding = bindingFor(
      request,
      runSpec,
      successorAttempt,
      successor,
      successorRawResponse,
    );
    const externalEvidence = externalEvidenceFor(
      request,
      runSpec,
      attempt,
      rawResponse,
    );
    const successorExternalEvidence = externalEvidenceFor(
      request,
      runSpec,
      successorAttempt,
      successorRawResponse,
    );
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
      attemptReceipt: attempt,
      ...externalEvidence,
      proposalBindingReceipt: proposalBinding,
      revisionRound: 0,
    });
    const rejected = sealEditorialRejectedResult({
      request,
      runSpec,
      rejectedProposal: proposal,
      rejectedIntent: externalIntentFor(request),
      diagnostics: hard,
      attemptReceipt: attempt,
      ...externalEvidence,
      proposalBindingReceipt: proposalBinding,
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
      successorAttemptReceipt: successorAttempt,
      successorExternalParseReceipt:
        successorExternalEvidence.externalParseReceipt,
      successorExternalRawResponse:
        successorExternalEvidence.externalRawResponse,
      successorProposalBindingReceipt: successorProposalBinding,
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
      sealEditorialProposalBindingReceipt({
        request,
        runSpec,
        attemptReceipt: attempt,
        proposal: forged,
      }),
    ).toThrow(requestBindingError);
    expect(() =>
      restoreEditorialProposalBindingReceipt({
        serialized: JSON.stringify(proposalBinding),
        request,
        runSpec,
        attemptReceipt: attempt,
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
        attemptReceipt: attempt,
        proposalBindingReceipt: proposalBinding,
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
        attemptReceipt: attempt,
        proposalBindingReceipt: proposalBinding,
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
        successorAttemptReceipt: successorAttempt,
        successorProposalBindingReceipt: successorProposalBinding,
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
        successorAttemptReceipt: successorAttempt,
        successorProposalBindingReceipt: successorProposalBinding,
      }),
    ).toThrow(requestBindingError);

    expect(() =>
      restoreEditorialPlanningResult({
        serialized: JSON.stringify(accepted),
        request,
        runSpec,
        proposals: [forged],
        attemptReceipts: [attempt],
        proposalBindingReceipts: [proposalBinding],
        diagnostics: [clean],
      }),
    ).toThrow(requestBindingError);
    expect(() =>
      restoreEditorialPlanningResult({
        serialized: JSON.stringify(rejected),
        request,
        runSpec,
        proposals: [forged],
        attemptReceipts: [attempt],
        proposalBindingReceipts: [proposalBinding],
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
        attemptReceipts: [successorAttempt],
        proposalBindingReceipts: [successorProposalBinding],
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

  it("keeps semantic proposal identity separate from provider attempt receipts", () => {
    const { request } = fixture();
    const proposal = proposalFor(request);
    const runSpec = runSpecFor(request);
    const rawResponse = JSON.stringify(externalIntentFor(request));
    const shared = {
      request,
      runSpec,
      modelVersion: "2026-07-19",
      promptTemplateContentHash: hash("prompt"),
      contextContentHashes: [hash("context")],
      rawResponse,
      startedAt: "2026-07-19T08:00:00.000Z",
      completedAt: "2026-07-19T08:00:01.000Z",
    };
    const openai = sealEditorialExternalPlanningAttemptReceipt({
      ...shared,
      providerId: "openai",
      modelId: "gpt-pro",
    });
    const kimi = sealEditorialExternalPlanningAttemptReceipt({
      ...shared,
      providerId: "moonshot",
      modelId: "kimi-k3",
    });

    expect(openai).not.toHaveProperty("proposalContentHash");
    expect(kimi).not.toHaveProperty("proposalContentHash");
    expect(bindingFor(request, runSpec, openai, proposal)).toMatchObject({
      attemptReceiptContentHash: openai.contentHash,
      proposalContentHash: proposal.contentHash,
    });
    expect(openai.contentHash).not.toBe(kimi.contentHash);
    expect(
      restoreEditorialExternalPlanningAttemptReceipt({
        serialized: JSON.stringify(openai),
        request,
        runSpec,
        rawResponse,
      }),
    ).toEqual(openai);
  });

  it("binds external proposals and rejections to one exact parsed response", () => {
    const { request } = fixture();
    const runSpec = runSpecFor(request);
    const intentA = externalIntentFor(request);
    const responseA = JSON.stringify(intentA);
    const attemptA = externalAttemptFor(request, runSpec, responseA);
    const parseA = sealEditorialExternalResponseParseReceipt({
      request,
      runSpec,
      attemptReceipt: attemptA,
      rawResponse: responseA,
    });
    const proposalA = bindEditorialDirectorProposalV1({
      request,
      externalIntent: intentA,
    });
    const intentB = externalIntentFor(request);
    intentB.episode.sequences[0]!.scenes[0]!.editorialShots[0]!.cameraIntent = {
      movement: "push",
      reasonCodes: ["increase-emphasis"],
    };
    const proposalB = bindEditorialDirectorProposalV1({
      request,
      externalIntent: intentB,
    });

    expect(parseA).toMatchObject({
      productionBindable: false,
      status: "intent-parsed",
      parsedIntentContentHash: proposalA.externalIntentContentHash,
      externalAttemptReceiptContentHash: attemptA.contentHash,
      rawResponseContentHash: attemptA.rawResponseContentHash,
      parserId: "strict-json-external-intent",
      parserVersion: "1.0.0",
    });
    expect(
      restoreEditorialExternalResponseParseReceipt({
        serialized: JSON.stringify(parseA),
        request,
        runSpec,
        attemptReceipt: attemptA,
        rawResponse: responseA,
      }),
    ).toEqual(parseA);
    expect(() =>
      sealEditorialProposalBindingReceipt({
        request,
        runSpec,
        attemptReceipt: attemptA,
        externalParseReceipt: parseA,
        externalRawResponse: responseA,
        proposal: proposalB,
      }),
    ).toThrow(/parsed intent does not match its bound proposal/i);

    const rejectedDiagnostics = sealEditorialPlanningDiagnostics({
      request,
      proposal: null,
      findings: [
        {
          id: "hard-continuity",
          severity: "hard",
          code: "continuity-invalid",
          message: "Reject the parsed intent before proposal binding.",
        },
      ],
    });
    expect(() =>
      sealEditorialRejectedResult({
        request,
        runSpec,
        rejectedProposal: null,
        rejectedIntent: intentB,
        diagnostics: rejectedDiagnostics,
        attemptReceipt: attemptA,
        externalParseReceipt: parseA,
        externalRawResponse: responseA,
        proposalBindingReceipt: null,
        reasonCodes: ["continuity-invalid"],
        revisionRound: 0,
      }),
    ).toThrow(/parsed intent does not match its rejected intent/i);

    const bindingA = sealEditorialProposalBindingReceipt({
      request,
      runSpec,
      attemptReceipt: attemptA,
      externalParseReceipt: parseA,
      externalRawResponse: responseA,
      proposal: proposalA,
    });
    const clean = sealEditorialPlanningDiagnostics({
      request,
      proposal: proposalA,
      findings: [],
    });
    const accepted = sealEditorialAcceptedResult({
      request,
      runSpec,
      proposal: proposalA,
      diagnostics: clean,
      attemptReceipt: attemptA,
      externalParseReceipt: parseA,
      externalRawResponse: responseA,
      proposalBindingReceipt: bindingA,
      revisionRound: 0,
    });
    expect(
      restoreEditorialPlanningResult({
        serialized: JSON.stringify(accepted),
        request,
        runSpec,
        proposals: [proposalA],
        attemptReceipts: [attemptA],
        externalParseReceipts: [parseA],
        externalRawResponses: [
          {
            attemptReceiptContentHash: attemptA.contentHash,
            rawResponse: responseA,
          },
        ],
        proposalBindingReceipts: [bindingA],
        diagnostics: [clean],
      }),
    ).toEqual(accepted);

    expect(() =>
      restoreEditorialExternalResponseParseReceipt({
        serialized: JSON.stringify(parseA),
        request,
        runSpec,
        attemptReceipt: attemptA,
        rawResponse: `${responseA} `,
      }),
    ).toThrow(/exact attempt receipt/i);
    expect(() =>
      restoreEditorialPlanningResult({
        serialized: JSON.stringify(accepted),
        request,
        runSpec,
        proposals: [proposalA],
        attemptReceipts: [attemptA],
        externalParseReceipts: [parseA],
        externalRawResponses: [
          {
            attemptReceiptContentHash: attemptA.contentHash,
            rawResponse: `${responseA} `,
          },
        ],
        proposalBindingReceipts: [bindingA],
        diagnostics: [clean],
      }),
    ).toThrow(/exact attempt receipt/i);

    const substitutedParse = structuredClone(parseA);
    if (substitutedParse.status !== "intent-parsed")
      throw new Error("Test fixture expected a parsed intent receipt.");
    substitutedParse.parsedIntentContentHash =
      proposalB.externalIntentContentHash;
    const { contentHash: _parseHash, ...substitutedParseDraft } =
      substitutedParse;
    void _parseHash;
    substitutedParse.contentHash = hashCanonical(substitutedParseDraft);
    expect(() =>
      restoreEditorialExternalResponseParseReceipt({
        serialized: JSON.stringify(substitutedParse),
        request,
        runSpec,
        attemptReceipt: attemptA,
        rawResponse: responseA,
      }),
    ).toThrow(/does not restore/i);
    const substitutedResult = structuredClone(accepted);
    substitutedResult.externalParseReceiptContentHash =
      substitutedParse.contentHash;
    const { contentHash: _resultHash, ...substitutedResultDraft } =
      substitutedResult;
    void _resultHash;
    substitutedResult.contentHash = hashCanonical(substitutedResultDraft);
    expect(() =>
      restoreEditorialPlanningResult({
        serialized: JSON.stringify(substitutedResult),
        request,
        runSpec,
        proposals: [proposalA],
        attemptReceipts: [attemptA],
        externalParseReceipts: [substitutedParse],
        externalRawResponses: [
          {
            attemptReceiptContentHash: attemptA.contentHash,
            rawResponse: responseA,
          },
        ],
        proposalBindingReceipts: [bindingA],
        diagnostics: [clean],
      }),
    ).toThrow(/does not restore/i);
  });

  it("derives accepted and revision parse lineage from the validated binding receipt once", () => {
    const { request } = fixture();
    const runSpec = runSpecFor(request);
    const intentA = externalIntentFor(request);
    const responseA = JSON.stringify(intentA);
    const attemptA = externalAttemptFor(request, runSpec, responseA);
    const parseA = externalEvidenceFor(
      request,
      runSpec,
      attemptA,
      responseA,
    ).externalParseReceipt;
    const proposalA = bindEditorialDirectorProposalV1({
      request,
      externalIntent: intentA,
    });
    const bindingA = sealEditorialProposalBindingReceipt({
      request,
      runSpec,
      attemptReceipt: attemptA,
      externalParseReceipt: parseA,
      externalRawResponse: responseA,
      proposal: proposalA,
    });

    const intentB = externalIntentFor(request);
    intentB.episode.sequences[0]!.scenes[0]!.editorialShots[0]!.cameraIntent = {
      movement: "push",
      reasonCodes: ["increase-emphasis"],
    };
    const responseB = JSON.stringify(intentB);
    const attemptB = externalAttemptFor(request, runSpec, responseB);
    const parseB = externalEvidenceFor(
      request,
      runSpec,
      attemptB,
      responseB,
    ).externalParseReceipt;
    const proposalB = bindEditorialDirectorProposalV1({
      request,
      externalIntent: intentB,
    });
    const bindingB = sealEditorialProposalBindingReceipt({
      request,
      runSpec,
      attemptReceipt: attemptB,
      externalParseReceipt: parseB,
      externalRawResponse: responseB,
      proposal: proposalB,
    });
    const clean = sealEditorialPlanningDiagnostics({
      request,
      proposal: proposalA,
      findings: [],
    });

    let acceptedParseReads = 0;
    const accepted = sealEditorialAcceptedResult({
      request,
      runSpec,
      proposal: proposalA,
      diagnostics: clean,
      attemptReceipt: attemptA,
      get externalParseReceipt() {
        acceptedParseReads += 1;
        return acceptedParseReads === 1 ? parseA : parseB;
      },
      externalRawResponse: responseA,
      proposalBindingReceipt: bindingA,
      revisionRound: 0,
    });
    expect(acceptedParseReads).toBe(1);
    expect(accepted.externalParseReceiptContentHash).toBe(
      bindingA.externalParseReceiptContentHash,
    );
    expect(accepted.externalParseReceiptContentHash).toBe(parseA.contentHash);

    const revisionDiagnostics = sealEditorialPlanningDiagnostics({
      request,
      proposal: proposalA,
      findings: [
        {
          id: "quality-revision",
          severity: "warning",
          code: "shot-mix-prior",
          message: "Revise the camera emphasis.",
        },
      ],
    });
    let revisionParseReads = 0;
    const revision = sealEditorialRevisionResult({
      request,
      runSpec,
      priorProposal: proposalA,
      qualityDiagnostics: revisionDiagnostics,
      addressedFindingIds: ["quality-revision"],
      successorProposal: proposalB,
      successorAttemptReceipt: attemptB,
      get successorExternalParseReceipt() {
        revisionParseReads += 1;
        return revisionParseReads === 1 ? parseB : parseA;
      },
      successorExternalRawResponse: responseB,
      successorProposalBindingReceipt: bindingB,
    });
    expect(revisionParseReads).toBe(1);
    expect(revision.externalParseReceiptContentHash).toBe(
      bindingB.externalParseReceiptContentHash,
    );
    expect(revision.externalParseReceiptContentHash).toBe(parseB.contentHash);
  });

  it("seals invalid UTF-8 as an auditable schema-invalid external rejection", () => {
    const { request } = fixture();
    const runSpec = runSpecFor(request);
    const invalidUtf8 = Uint8Array.of(0xc3, 0x28);
    const attempt = externalAttemptFor(request, runSpec, invalidUtf8);
    const evidence = externalEvidenceFor(
      request,
      runSpec,
      attempt,
      invalidUtf8,
    );
    expect(evidence.externalParseReceipt).toMatchObject({
      status: "schema-invalid",
      parsedIntentContentHash: null,
      productionBindable: false,
    });
    const diagnostics = sealEditorialPlanningDiagnostics({
      request,
      proposal: null,
      findings: [
        {
          id: "hard-schema-invalid",
          severity: "hard",
          code: "schema-invalid",
          message: "The exact external bytes are not valid UTF-8 JSON intent.",
        },
      ],
    });
    const rejected = sealEditorialRejectedResult({
      request,
      runSpec,
      rejectedProposal: null,
      rejectedIntent: null,
      diagnostics,
      attemptReceipt: attempt,
      ...evidence,
      proposalBindingReceipt: null,
      reasonCodes: ["schema-invalid"],
      revisionRound: 0,
    });
    expect(
      restoreEditorialPlanningResult({
        serialized: JSON.stringify(rejected),
        request,
        runSpec,
        proposals: [],
        attemptReceipts: [attempt],
        externalParseReceipts: [evidence.externalParseReceipt],
        externalRawResponses: [
          {
            attemptReceiptContentHash: attempt.contentHash,
            rawResponse: invalidUtf8,
          },
        ],
        proposalBindingReceipts: [],
        diagnostics: [diagnostics],
      }),
    ).toEqual(rejected);
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

    const externalAttempt = externalAttemptFor(request, externalRun);
    const heuristicAttempt = sealEditorialHeuristicPlanningAttemptReceipt({
      request,
      runSpec: heuristicRun,
      plannerId: "heuristic-editorial-planner",
      plannerVersion: "1.0.0",
      rawIntentContentHash: proposal.externalIntentContentHash,
    });
    const manualAttempt = sealEditorialManualPlanningAttemptReceipt({
      request,
      runSpec: manualRun,
      authorId: "editor-pbirc",
      authorshipEvidenceContentHash: hash("manual-authorship-evidence"),
      rawIntentContentHash: proposal.externalIntentContentHash,
    });

    expect(heuristicAttempt).toMatchObject({
      lane: "heuristic-control",
      plannerId: "heuristic-editorial-planner",
      plannerVersion: "1.0.0",
    });
    expect(externalAttempt).toMatchObject({
      lane: "external-candidate",
      providerId: "openai",
      modelId: "gpt-pro",
    });
    expect(manualAttempt).toMatchObject({
      lane: "manual-candidate",
      authorId: "editor-pbirc",
      authorshipEvidenceContentHash: hash("manual-authorship-evidence"),
    });
    expect(
      restoreEditorialHeuristicPlanningAttemptReceipt({
        serialized: JSON.stringify(heuristicAttempt),
        request,
        runSpec: heuristicRun,
      }),
    ).toEqual(heuristicAttempt);
    expect(
      restoreEditorialManualPlanningAttemptReceipt({
        serialized: JSON.stringify(manualAttempt),
        request,
        runSpec: manualRun,
      }),
    ).toEqual(manualAttempt);

    const clean = sealEditorialPlanningDiagnostics({
      request,
      proposal,
      findings: [],
    });
    for (const [runSpec, attemptReceipt] of [
      [externalRun, externalAttempt],
      [heuristicRun, heuristicAttempt],
      [manualRun, manualAttempt],
    ] as const) {
      const proposalBindingReceipt = bindingFor(
        request,
        runSpec,
        attemptReceipt,
        proposal,
      );
      const accepted = sealEditorialAcceptedResult({
        request,
        runSpec,
        proposal,
        diagnostics: clean,
        attemptReceipt,
        ...(attemptReceipt.lane === "external-candidate"
          ? externalEvidenceFor(request, runSpec, attemptReceipt)
          : {}),
        proposalBindingReceipt,
        revisionRound: 0,
      });
      expect(accepted).toMatchObject({
        runSpecContentHash: runSpec.contentHash,
        attemptReceiptContentHash: attemptReceipt.contentHash,
        proposalBindingReceiptContentHash: proposalBindingReceipt.contentHash,
      });
    }

    expect(() =>
      sealEditorialAcceptedResult({
        request,
        runSpec: externalRun,
        proposal,
        diagnostics: clean,
        attemptReceipt: heuristicAttempt,
        proposalBindingReceipt: bindingFor(
          request,
          heuristicRun,
          heuristicAttempt,
          proposal,
        ),
        revisionRound: 0,
      }),
    ).toThrow(/stale for its exact artifacts|lane does not match/i);
    expect(() =>
      sealEditorialAcceptedResult({
        request,
        runSpec: externalRun,
        proposal,
        diagnostics: clean,
        attemptReceipt: null as never,
        proposalBindingReceipt: bindingFor(
          request,
          externalRun,
          externalAttempt,
          proposal,
        ),
        revisionRound: 0,
      }),
    ).toThrow(/requires a lane receipt/i);
    expect(() =>
      sealEditorialExternalPlanningAttemptReceipt({
        request,
        runSpec: heuristicRun,
        providerId: "openai",
        modelId: "gpt-pro",
        modelVersion: "2026-07-19",
        promptTemplateContentHash: hash("prompt"),
        contextContentHashes: [],
        rawResponse: JSON.stringify(externalIntentFor(request)),
        startedAt: "2026-07-19T08:00:00.000Z",
        completedAt: "2026-07-19T08:00:01.000Z",
      }),
    ).toThrow(/external-candidate lane/i);
    const substitutedHeuristicIntent =
      sealEditorialHeuristicPlanningAttemptReceipt({
        request,
        runSpec: heuristicRun,
        plannerId: "heuristic-editorial-planner",
        plannerVersion: "1.0.0",
        rawIntentContentHash: hash("substituted-raw-intent"),
      });
    expect(() =>
      bindingFor(request, heuristicRun, substitutedHeuristicIntent, proposal),
    ).toThrow(/raw intent does not match/i);
  });

  it("seals and restores rejection evidence at raw, intent, and proposal stages", () => {
    const { request } = fixture();
    const runSpec = runSpecFor(request);
    const invalidRawResponse = "{not-json";
    const invalidAttempt = externalAttemptFor(
      request,
      runSpec,
      invalidRawResponse,
    );
    const invalidEvidence = externalEvidenceFor(
      request,
      runSpec,
      invalidAttempt,
      invalidRawResponse,
    );
    const diagnostic = (
      code:
        | "schema-invalid"
        | "stale-request"
        | "foreign-reference"
        | "coverage-invalid",
    ) =>
      sealEditorialPlanningDiagnostics({
        request,
        proposal: null,
        findings: [
          {
            id: `hard-${code}`,
            severity: "hard",
            code,
            message: `Rejected before proposal binding: ${code}.`,
          },
        ],
      });

    const rawRejected = sealEditorialRejectedResult({
      request,
      runSpec,
      rejectedProposal: null,
      rejectedIntent: null,
      diagnostics: diagnostic("schema-invalid"),
      attemptReceipt: invalidAttempt,
      ...invalidEvidence,
      proposalBindingReceipt: null,
      reasonCodes: ["schema-invalid"],
      revisionRound: 0,
    });
    expect(rawRejected).toMatchObject({
      rejectedIntentContentHash: null,
      rejectedProposalContentHash: null,
      attemptReceiptContentHash: invalidAttempt.contentHash,
      externalParseReceiptContentHash:
        invalidEvidence.externalParseReceipt.contentHash,
      proposalBindingReceiptContentHash: null,
    });
    expect(
      restoreEditorialPlanningResult({
        serialized: JSON.stringify(rawRejected),
        request,
        runSpec,
        proposals: [],
        attemptReceipts: [invalidAttempt],
        externalParseReceipts: [invalidEvidence.externalParseReceipt],
        externalRawResponses: [
          {
            attemptReceiptContentHash: invalidAttempt.contentHash,
            rawResponse: invalidRawResponse,
          },
        ],
        proposalBindingReceipts: [],
        diagnostics: [diagnostic("schema-invalid")],
      }),
    ).toEqual(rawRejected);

    const rawIntentLaneAttempts = [
      {
        runSpec: runSpecFor(request, "heuristic-control"),
        createAttempt: (laneRunSpec: EditorialPlanningRunSpec) =>
          sealEditorialHeuristicPlanningAttemptReceipt({
            request,
            runSpec: laneRunSpec,
            plannerId: "heuristic-editorial-planner",
            plannerVersion: "1.0.0",
            rawIntentContentHash: hash("schema-invalid-heuristic-intent"),
          }),
      },
      {
        runSpec: runSpecFor(request, "manual-candidate"),
        createAttempt: (laneRunSpec: EditorialPlanningRunSpec) =>
          sealEditorialManualPlanningAttemptReceipt({
            request,
            runSpec: laneRunSpec,
            authorId: "manual-editor",
            authorshipEvidenceContentHash: hash("manual-authorship"),
            rawIntentContentHash: hash("schema-invalid-manual-intent"),
          }),
      },
    ] as const;

    for (const {
      runSpec: rawIntentRunSpec,
      createAttempt,
    } of rawIntentLaneAttempts) {
      const rawIntentAttempt = createAttempt(rawIntentRunSpec);
      const laneRejected = sealEditorialRejectedResult({
        request,
        runSpec: rawIntentRunSpec,
        rejectedProposal: null,
        rejectedIntent: null,
        diagnostics: diagnostic("schema-invalid"),
        attemptReceipt: rawIntentAttempt,
        proposalBindingReceipt: null,
        reasonCodes: ["schema-invalid"],
        revisionRound: 0,
      });
      expect(laneRejected).toMatchObject({
        rejectedIntentContentHash: null,
        rejectedProposalContentHash: null,
        attemptReceiptContentHash: rawIntentAttempt.contentHash,
        proposalBindingReceiptContentHash: null,
      });
      expect(
        restoreEditorialPlanningResult({
          serialized: JSON.stringify(laneRejected),
          request,
          runSpec: rawIntentRunSpec,
          proposals: [],
          attemptReceipts: [rawIntentAttempt],
          proposalBindingReceipts: [],
          diagnostics: [diagnostic("schema-invalid")],
        }),
      ).toEqual(laneRejected);
    }

    const staleIntent = externalIntentFor(request);
    staleIntent.requestContentHash = hash("stale-request");
    const foreignIntent = externalIntentFor(request);
    foreignIntent.episode.sequences[0]!.scenes[0]!.editorialShots[0]!.stageRef =
      "stage-ref-foreign";
    const coverageIntent = externalIntentFor(request);
    coverageIntent.episode.sequences[0]!.scenes[0]!.beats[0]!.editorialShotOrdinals =
      [1];

    for (const [intent, code] of [
      [staleIntent, "stale-request"],
      [foreignIntent, "foreign-reference"],
      [coverageIntent, "coverage-invalid"],
    ] as const) {
      expect(() =>
        bindEditorialDirectorProposalV1({ request, externalIntent: intent }),
      ).toThrow();
      const diagnostics = diagnostic(code);
      const intentRawResponse = JSON.stringify(intent);
      const intentAttempt = externalAttemptFor(
        request,
        runSpec,
        intentRawResponse,
      );
      const intentEvidence = externalEvidenceFor(
        request,
        runSpec,
        intentAttempt,
        intentRawResponse,
      );
      const rejected = sealEditorialRejectedResult({
        request,
        runSpec,
        rejectedProposal: null,
        rejectedIntent: intent,
        diagnostics,
        attemptReceipt: intentAttempt,
        ...intentEvidence,
        proposalBindingReceipt: null,
        reasonCodes: [code],
        revisionRound: 0,
      });
      expect(rejected).toMatchObject({
        rejectedProposalContentHash: null,
        proposalBindingReceiptContentHash: null,
      });
      expect(
        restoreEditorialPlanningResult({
          serialized: JSON.stringify(rejected),
          request,
          runSpec,
          proposals: [],
          attemptReceipts: [intentAttempt],
          externalParseReceipts: [intentEvidence.externalParseReceipt],
          externalRawResponses: [
            {
              attemptReceiptContentHash: intentAttempt.contentHash,
              rawResponse: intentRawResponse,
            },
          ],
          proposalBindingReceipts: [],
          diagnostics: [diagnostics],
          rejectedIntents: [intent],
        }),
      ).toEqual(rejected);
    }

    const proposal = proposalFor(request);
    const proposalRawResponse = JSON.stringify(externalIntentFor(request));
    const proposalAttempt = externalAttemptFor(
      request,
      runSpec,
      proposalRawResponse,
    );
    const proposalEvidence = externalEvidenceFor(
      request,
      runSpec,
      proposalAttempt,
      proposalRawResponse,
    );
    const proposalBindingReceipt = bindingFor(
      request,
      runSpec,
      proposalAttempt,
      proposal,
      proposalRawResponse,
    );
    const postProposalDiagnostics = sealEditorialPlanningDiagnostics({
      request,
      proposal,
      findings: [
        {
          id: "hard-continuity",
          severity: "hard",
          code: "continuity-invalid",
          message: "Rejected after a proposal was bound.",
        },
      ],
    });
    const postProposalRejected = sealEditorialRejectedResult({
      request,
      runSpec,
      rejectedProposal: proposal,
      rejectedIntent: externalIntentFor(request),
      diagnostics: postProposalDiagnostics,
      attemptReceipt: proposalAttempt,
      ...proposalEvidence,
      proposalBindingReceipt,
      reasonCodes: ["continuity-invalid"],
      revisionRound: 0,
    });
    expect(postProposalRejected).toMatchObject({
      rejectedProposalContentHash: proposal.contentHash,
      rejectedIntentContentHash: proposal.externalIntentContentHash,
      proposalBindingReceiptContentHash: proposalBindingReceipt.contentHash,
    });
  });

  it("rejects missing or substituted attempt, intent, binding, and run artifacts", () => {
    const { request } = fixture();
    const runSpec = runSpecFor(request);
    const proposal = proposalFor(request);
    const rawResponse = JSON.stringify(externalIntentFor(request));
    const attempt = externalAttemptFor(request, runSpec, rawResponse);
    const externalEvidence = externalEvidenceFor(
      request,
      runSpec,
      attempt,
      rawResponse,
    );
    const proposalBindingReceipt = bindingFor(
      request,
      runSpec,
      attempt,
      proposal,
    );
    const diagnostics = sealEditorialPlanningDiagnostics({
      request,
      proposal,
      findings: [],
    });
    const accepted = sealEditorialAcceptedResult({
      request,
      runSpec,
      proposal,
      diagnostics,
      attemptReceipt: attempt,
      ...externalEvidence,
      proposalBindingReceipt,
      revisionRound: 0,
    });
    const substitutedAttempt = structuredClone(attempt);
    substitutedAttempt.rawResponseContentHash = hash("substituted-response");
    const { contentHash: _attemptHash, ...attemptDraft } = substitutedAttempt;
    void _attemptHash;
    substitutedAttempt.contentHash = hashCanonical(attemptDraft);
    const wrongLane = runSpecFor(request, "heuristic-control");

    expect(() =>
      restoreEditorialPlanningResult({
        serialized: JSON.stringify(accepted),
        request,
        runSpec,
        proposals: [proposal],
        attemptReceipts: [],
        proposalBindingReceipts: [proposalBindingReceipt],
        diagnostics: [diagnostics],
      }),
    ).toThrow(/missing its exact attempt receipt/i);
    expect(() =>
      restoreEditorialPlanningResult({
        serialized: JSON.stringify(accepted),
        request,
        runSpec,
        proposals: [proposal],
        attemptReceipts: [substitutedAttempt],
        proposalBindingReceipts: [proposalBindingReceipt],
        diagnostics: [diagnostics],
      }),
    ).toThrow(/missing its exact attempt receipt/i);
    expect(() =>
      restoreEditorialPlanningResult({
        serialized: JSON.stringify(accepted),
        request,
        runSpec,
        proposals: [proposal],
        attemptReceipts: [attempt],
        proposalBindingReceipts: [],
        diagnostics: [diagnostics],
      }),
    ).toThrow(/missing its exact proposal binding receipt/i);
    expect(() =>
      sealEditorialAcceptedResult({
        request,
        runSpec,
        proposal,
        diagnostics,
        attemptReceipt: attempt,
        proposalBindingReceipt: null as never,
        revisionRound: 0,
      }),
    ).toThrow(/requires an exact proposal binding receipt/i);
    expect(() =>
      sealEditorialAcceptedResult({
        request,
        runSpec: wrongLane,
        proposal,
        diagnostics,
        attemptReceipt: attempt,
        proposalBindingReceipt,
        revisionRound: 0,
      }),
    ).toThrow(/lane does not match|stale for its exact artifacts/i);

    const successor = revisedProposalFor(request);
    const successorIntent = externalIntentFor(request);
    successorIntent.episode.sequences[0]!.scenes[0]!.editorialShots[0]!.cameraIntent =
      {
        movement: "push",
        reasonCodes: ["increase-emphasis"],
      };
    const successorRawResponse = JSON.stringify(successorIntent);
    const successorAttempt = externalAttemptFor(
      request,
      runSpec,
      successorRawResponse,
    );
    const successorExternalEvidence = externalEvidenceFor(
      request,
      runSpec,
      successorAttempt,
      successorRawResponse,
    );
    const revisionDiagnostics = sealEditorialPlanningDiagnostics({
      request,
      proposal,
      findings: [
        {
          id: "quality-revision",
          severity: "warning",
          code: "shot-mix-prior",
          message: "Revise the shot mix.",
        },
      ],
    });
    expect(() =>
      sealEditorialRevisionResult({
        request,
        runSpec,
        priorProposal: proposal,
        qualityDiagnostics: revisionDiagnostics,
        addressedFindingIds: ["quality-revision"],
        successorProposal: successor,
        successorAttemptReceipt: successorAttempt,
        successorExternalParseReceipt:
          successorExternalEvidence.externalParseReceipt,
        successorExternalRawResponse:
          successorExternalEvidence.externalRawResponse,
        successorProposalBindingReceipt: proposalBindingReceipt,
      }),
    ).toThrow(/proposal binding receipt does not match/i);

    const staleIntent = externalIntentFor(request);
    staleIntent.requestContentHash = hash("stale-request");
    const staleRawResponse = JSON.stringify(staleIntent);
    const staleAttempt = externalAttemptFor(request, runSpec, staleRawResponse);
    const staleExternalEvidence = externalEvidenceFor(
      request,
      runSpec,
      staleAttempt,
      staleRawResponse,
    );
    const staleDiagnostics = sealEditorialPlanningDiagnostics({
      request,
      proposal: null,
      findings: [
        {
          id: "hard-stale-request",
          severity: "hard",
          code: "stale-request",
          message: "Stale intent.",
        },
      ],
    });
    const rejected = sealEditorialRejectedResult({
      request,
      runSpec,
      rejectedProposal: null,
      rejectedIntent: staleIntent,
      diagnostics: staleDiagnostics,
      attemptReceipt: staleAttempt,
      ...staleExternalEvidence,
      proposalBindingReceipt: null,
      reasonCodes: ["stale-request"],
      revisionRound: 0,
    });
    const substitutedIntent = structuredClone(staleIntent);
    substitutedIntent.requestContentHash = hash("another-stale-request");
    expect(() =>
      restoreEditorialPlanningResult({
        serialized: JSON.stringify(rejected),
        request,
        runSpec,
        proposals: [],
        attemptReceipts: [staleAttempt],
        externalParseReceipts: [staleExternalEvidence.externalParseReceipt],
        externalRawResponses: [
          {
            attemptReceiptContentHash: staleAttempt.contentHash,
            rawResponse: staleRawResponse,
          },
        ],
        proposalBindingReceipts: [],
        diagnostics: [staleDiagnostics],
        rejectedIntents: [substitutedIntent],
      }),
    ).toThrow();
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
    const rawResponse = JSON.stringify(externalIntentFor(request));
    const attempt = externalAttemptFor(request, runSpec, rawResponse);
    const externalEvidence = externalEvidenceFor(
      request,
      runSpec,
      attempt,
      rawResponse,
    );
    const proposalBinding = bindingFor(
      request,
      runSpec,
      attempt,
      proposal,
      rawResponse,
    );
    const successorIntent = externalIntentFor(request);
    successorIntent.episode.sequences[0]!.scenes[0]!.editorialShots[0]!.cameraIntent =
      {
        movement: "push",
        reasonCodes: ["increase-emphasis"],
      };
    const successorRawResponse = JSON.stringify(successorIntent);
    const successorAttempt = externalAttemptFor(
      request,
      runSpec,
      successorRawResponse,
    );
    const successorExternalEvidence = externalEvidenceFor(
      request,
      runSpec,
      successorAttempt,
      successorRawResponse,
    );
    const successorProposalBinding = bindingFor(
      request,
      runSpec,
      successorAttempt,
      successor,
      successorRawResponse,
    );
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
      attemptReceipt: attempt,
      ...externalEvidence,
      proposalBindingReceipt: proposalBinding,
      revisionRound: 0,
    });
    expect(
      restoreEditorialPlanningResult({
        serialized: JSON.stringify(accepted),
        request,
        runSpec,
        proposals: [proposal],
        attemptReceipts: [attempt],
        externalParseReceipts: [externalEvidence.externalParseReceipt],
        externalRawResponses: [
          {
            attemptReceiptContentHash: attempt.contentHash,
            rawResponse,
          },
        ],
        proposalBindingReceipts: [proposalBinding],
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
      attemptReceipt: attempt,
      ...externalEvidence,
      proposalBindingReceipt: proposalBinding,
      reasonCodes: ["continuity-invalid"],
      revisionRound: 0,
    });
    expect(
      restoreEditorialPlanningResult({
        serialized: JSON.stringify(rejected),
        request,
        runSpec,
        proposals: [proposal],
        attemptReceipts: [attempt],
        externalParseReceipts: [externalEvidence.externalParseReceipt],
        externalRawResponses: [
          {
            attemptReceiptContentHash: attempt.contentHash,
            rawResponse,
          },
        ],
        proposalBindingReceipts: [proposalBinding],
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
      successorAttemptReceipt: successorAttempt,
      successorExternalParseReceipt:
        successorExternalEvidence.externalParseReceipt,
      successorExternalRawResponse:
        successorExternalEvidence.externalRawResponse,
      successorProposalBindingReceipt: successorProposalBinding,
    });
    expect(
      restoreEditorialPlanningResult({
        serialized: JSON.stringify(revision),
        request,
        runSpec,
        proposals: [proposal, successor],
        attemptReceipts: [successorAttempt],
        externalParseReceipts: [successorExternalEvidence.externalParseReceipt],
        externalRawResponses: [
          {
            attemptReceiptContentHash: successorAttempt.contentHash,
            rawResponse: successorRawResponse,
          },
        ],
        proposalBindingReceipts: [successorProposalBinding],
        diagnostics: [hard],
      }),
    ).toEqual(revision);
  });

  it("forbids pilot fallback and rejects hard-diagnostic acceptance", () => {
    const { request } = fixture();
    const proposal = proposalFor(request);
    const runSpec = runSpecFor(request);
    const attempt = externalAttemptFor(request, runSpec);
    const proposalBinding = bindingFor(request, runSpec, attempt, proposal);
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
        attemptReceipt: attempt,
        proposalBindingReceipt: proposalBinding,
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
