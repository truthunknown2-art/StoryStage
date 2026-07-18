import { describe, expect, it } from "vitest";
import { hashCanonical } from "../canonical-hash";
import { directorPlanDraftSchema, sealDirectorPlan } from "./director-plan";
import { sealExecutableEpisodePlan } from "./executable-episode-plan";
import { grammarProfiles } from "./grammar-profile";
import { analyzeDirectorQuality } from "./quality-report";
import { sealSceneWorldPlan } from "./scene-world";
import { sealTimingSolution } from "./timing-solution";

const hash = hashCanonical("fixture");

const createDraft = () => ({
  schemaVersion: "1.0" as const,
  id: "director-plan-fixture",
  storyGraphContentHash: hash,
  planningAuthority: {
    plannerId: "test-director",
    plannerVersion: "1.0",
  },
  planningArtifactContentHash: hash,
  grammarProfileContentHash: grammarProfiles.kidsAdventure.contentHash,
  sceneWorldContentHashes: [hash],
  initialWorldState: {
    frame: 0,
    entities: {
      mara: {
        entityId: "mara",
        lifecycle: "onstage" as const,
        transform: { x: 0.25, y: 0, z: 0, scale: 1, rotation: 0 },
        facing: "right" as const,
        gazeTargetId: "moth",
        velocity: { x: 0, y: 0, z: 0 },
      },
    },
    props: {
      moth: {
        kind: "free" as const,
        transform: { x: 0.6, y: 0.4, z: 0, scale: 1, rotation: 0 },
      },
    },
  },
  events: [
    {
      id: "notice-moth",
      sceneId: "scene-one",
      beatId: "beat-one",
      order: 0,
      kind: "gaze" as const,
      subjectIds: ["mara"],
      propId: "moth",
      causedByEventIds: [],
      description: "Mara notices the moth.",
    },
    {
      id: "mara-reacts",
      sceneId: "scene-one",
      beatId: "beat-one",
      order: 1,
      kind: "reaction" as const,
      subjectIds: ["mara"],
      propId: null,
      causedByEventIds: ["notice-moth"],
      description: "Mara stops and reacts.",
    },
  ],
  beats: [
    {
      beatId: "beat-one",
      beatContentHash: hash,
      audienceTakeaway: "Mara sees something unexpected.",
      emotionalTurn: { from: "curious", to: "surprised" },
      reactionDelayFrames: 0,
      eventTimingAdjustments: [],
      muteReadable: true,
      eventIds: ["notice-moth", "mara-reacts"],
      performanceRequirements: [
        {
          id: "mara-reaction",
          entityId: "mara",
          action: "notice and recoil",
          source: "articulated-rig" as const,
          requiredInternalChannels: ["gaze", "head", "torso"],
          requiredEventIds: ["notice-moth", "mara-reacts"],
        },
      ],
      sound: {
        dialogueLineIds: [],
        narrationLineIds: [],
        effectEventIds: ["notice-moth"],
        musicFunction: "Pause the playful bed for the discovery.",
      },
    },
  ],
  scenes: [
    {
      sceneId: "scene-one",
      stageId: "forest-stage",
      geographySummary: "Mara is left of the moth in one persistent clearing.",
      landmarkIds: ["forest-entry", "moth-perch"],
      beatIds: ["beat-one"],
      shotIds: ["shot-one"],
    },
  ],
  shots: [
    {
      id: "shot-one",
      sceneId: "scene-one",
      stageId: "forest-stage",
      beatIds: ["beat-one"],
      storyFunction: "Establish the discovery and preserve geography.",
      entryEventId: "notice-moth",
      exitEventId: "mara-reacts",
      camera: {
        size: "wide" as const,
        angle: "eye-level" as const,
        movement: "locked" as const,
        subjectIds: ["mara", "moth"],
        axisId: "mara-moth-axis",
        motivation: "Let the audience read both cause and reaction.",
      },
      composition: {
        focalRegion: "left-third" as const,
        depthLayers: ["background", "characters", "foreground"],
        foregroundOccluderIds: ["foreground-ferns"],
        negativeSpace: "right" as const,
      },
      blocking: [
        {
          entityId: "mara",
          entryLandmarkId: "forest-entry",
          exitLandmarkId: "forest-entry",
          facing: "right" as const,
          gazeTargetId: "moth",
        },
      ],
      transition: {
        kind: "hard-cut" as const,
        motivation: "Open on the first causal event.",
      },
      timingEnvelope: {
        earliestCutEventId: "mara-reacts",
        preferredCutEventId: "mara-reacts",
        latestCutEventId: "mara-reacts",
        minimumReadFrames: 12,
        minimumDurationFrames: 60,
        preferredDurationFrames: 90,
        maximumDurationFrames: 120,
      },
    },
  ],
  status: "director-plan-ready" as const,
});

describe("Director plan", () => {
  it("seals persistent geography before any shot is designed", () => {
    const world = sealSceneWorldPlan({
      schemaVersion: "1.0",
      id: "forest-world",
      sceneId: "scene-one",
      sourceSceneContentHash: hash,
      coordinateSystem: {
        width: 100,
        height: 56.25,
        depthMinimum: -10,
        depthMaximum: 10,
      },
      stages: [
        {
          id: "forest-stage",
          stageKitRequirementId: "forest-kit",
          walkableSurfaces: [
            {
              id: "forest-floor",
              boundary: [
                { x: 0, y: 0, z: 0 },
                { x: 100, y: 0, z: 0 },
                { x: 100, y: 56.25, z: 0 },
              ],
              elevation: 0,
            },
          ],
          depthPlanes: [
            {
              id: "forest-background",
              role: "background",
              depth: -5,
              layerRequirementId: "forest-background-art",
            },
            {
              id: "forest-performance",
              role: "performance",
              depth: 0,
              layerRequirementId: "character-plane",
            },
            {
              id: "forest-foreground",
              role: "foreground",
              depth: 5,
              layerRequirementId: "forest-foreground-art",
            },
          ],
          landmarks: [
            {
              id: "forest-entry",
              kind: "entrance",
              position: { x: 10, y: 0, z: 0 },
              facing: "right",
            },
          ],
          occluders: [],
          cameraZones: [],
        },
      ],
      portals: [],
      initialWorldState: createDraft().initialWorldState,
    });

    expect(world.stages[0]?.depthPlanes).toHaveLength(3);
  });

  it("seals an untimed causal plan before frame solving", () => {
    const plan = sealDirectorPlan(createDraft());
    expect(plan.contentHash).toHaveLength(64);
    expect(plan.shots[0]?.timingEnvelope.preferredCutEventId).toBe(
      "mara-reacts",
    );
  });

  it("rejects effects that precede their causes", () => {
    const draft = createDraft();
    draft.events[1]!.order = 0;
    expect(() => directorPlanDraftSchema.parse(draft)).toThrow(
      /must follow cause/,
    );
  });

  it("rejects root-only motion disguised as performance", () => {
    const draft = createDraft();
    draft.beats[0]!.performanceRequirements[0]!.requiredInternalChannels = [];
    expect(() => directorPlanDraftSchema.parse(draft)).toThrow(
      /root-only motion/,
    );
  });

  it("binds causal direction to exact timing and one executable plan", () => {
    const directorPlan = sealDirectorPlan(createDraft());
    const timing = sealTimingSolution(directorPlan, {
      schemaVersion: "1.0",
      directorPlanContentHash: directorPlan.contentHash,
      timingBasis: { kind: "estimated", contentHash: hash },
      resolvedEvents: [
        { eventId: "notice-moth", frame: 10 },
        { eventId: "mara-reacts", frame: 40 },
      ],
      resolvedShots: [
        {
          shotId: "shot-one",
          startFrame: 0,
          endFrameExclusive: 61,
          cutEventId: "mara-reacts",
        },
      ],
      durationInFrames: 61,
    });
    const episode = sealExecutableEpisodePlan(directorPlan, timing, {
      schemaVersion: "1.0",
      id: "episode-fixture",
      renderMode: "final",
      directorPlanContentHash: directorPlan.contentHash,
      timingSolutionContentHash: timing.contentHash,
      grammarProfileContentHash: grammarProfiles.kidsAdventure.contentHash,
      registryVersions: {
        stage: "1.0.0",
        performance: "1.0.0",
        treatment: "1.0.0",
        transition: "1.0.0",
        audio: "1.0.0",
      },
      format: { width: 1920, height: 1080, fps: 30, durationInFrames: 61 },
      stageKits: [
        {
          id: "forest-stage",
          rendererId: "layered-stage",
          layerIds: ["background", "characters", "foreground"],
          assetIds: [],
        },
      ],
      shots: [
        {
          id: "executable-shot-one",
          directorShotId: "shot-one",
          startFrame: 0,
          endFrameExclusive: 61,
          cutEventId: "mara-reacts",
          stageKitId: "forest-stage",
          treatmentRendererId: "character-scene",
          transitionRendererId: "hard-cut",
          performanceProgramIds: ["mara-reaction-program"],
          layerIds: ["background", "characters", "foreground"],
        },
      ],
      performancePrograms: [
        {
          id: "mara-reaction-program",
          kind: "articulated-rig",
          rendererId: "paper-rig",
          rendererVersion: "1.0.0",
          entityId: "mara",
          eventIds: ["notice-moth", "mara-reacts"],
          assetIds: ["mara-art"],
          manifestContentHash: hash,
        },
      ],
      approvedAssets: [
        {
          assetId: "mara-art",
          version: "1.0.0",
          contentHash: hash,
          status: "approved",
        },
      ],
      audioCues: [
        {
          id: "moth-chime",
          eventId: "notice-moth",
          assetId: null,
          gain: 0.5,
        },
      ],
    });

    expect(episode.format.durationInFrames).toBe(61);
    expect(episode.shots[0]?.cutEventId).toBe("mara-reacts");
    expect(
      analyzeDirectorQuality(
        directorPlan,
        grammarProfiles.kidsAdventure,
        timing,
      ).status,
    ).toBe("clear");
  });
});
