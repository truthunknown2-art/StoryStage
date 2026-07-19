import { z } from "zod";
import { hashCanonical } from "../canonical-hash";
import {
  cv002BeatRoleSchema,
  cv002GrammarSchema,
  cv002ProjectSchema,
  type Cv002Project,
} from "../cv002-story-draft";
import {
  hashSchema,
  identifierSchema,
  showPackSchema,
  type ShowPack,
} from "../model";
import { verifyShowPackHash } from "../show-pack";
import {
  capabilityRegistrySchema,
  type CapabilityRegistry,
} from "./capability-report";
import { grammarProfileSchema, type GrammarProfile } from "./grammar-profile";
import { sceneWorldPlanSchema, type SceneWorldPlan } from "./scene-world";
import {
  directorCameraMovementSchema,
  directorShotSizeSchema,
} from "./director-proposal";

const unique = (
  values: readonly string[],
  path: (string | number)[],
  label: string,
  context: z.RefinementCtx,
) => {
  const seen = new Set<string>();
  values.forEach((value, index) => {
    if (seen.has(value))
      context.addIssue({
        code: "custom",
        path: [...path, index],
        message: `Duplicate ${label} ${value}.`,
      });
    seen.add(value);
  });
};

const same = (left: unknown, right: unknown) =>
  hashCanonical(left) === hashCanonical(right);

const sortedUnique = (values: readonly string[], label: string) => {
  const result = [...new Set(values)].sort();
  if (result.length !== values.length)
    throw new Error(`${label} values must be unique.`);
  return result;
};

const canonicalSet = (values: readonly string[]) => [...new Set(values)].sort();

const opaqueRef = (kind: string, source: unknown) =>
  `${kind}-ref-${hashCanonical({ kind, source }).slice(0, 20)}`;

const sealedSchema = <T extends z.ZodRawShape>(fields: T, message: string) =>
  z
    .object({ ...fields, contentHash: hashSchema })
    .strict()
    .superRefine((artifact, context) => {
      const { contentHash, ...draft } = artifact as Record<string, unknown> & {
        contentHash: string;
      };
      if (hashCanonical(draft) !== contentHash)
        context.addIssue({
          code: "custom",
          path: ["contentHash"],
          message,
        });
    });

const seal = <T extends Record<string, unknown>>(draft: T) => ({
  ...draft,
  contentHash: hashCanonical(draft),
});

export const editorialCoverageRoleSchema = z.enum([
  "establish-geography",
  "primary-performance",
  "listener-reaction",
  "cut-on-action",
  "reveal-insert",
  "comprehension-hold",
  "continuity-bridge",
]);

export const editorialEnergyShapeSchema = z.enum([
  "flat-comic",
  "sustained-tension",
  "rising",
  "peak",
  "falling",
  "breather",
  "button",
  "bridge",
  "reveal",
]);

export const editorialCameraAngleSchema = z.enum([
  "eye-level",
  "low-angle",
  "high-angle",
  "overhead",
  "profile",
  "over-shoulder",
]);

export const editorialTransitionKindSchema = z.enum([
  "hard-cut",
  "match-cut",
  "camera-carry",
  "foreground-wipe",
  "dissolve",
]);

export const editorialReadBiasSchema = z.enum([
  "brief",
  "normal",
  "emphasis",
  "hold",
]);

const editorialPrimaryPurposeSchema = z.enum([
  "establish",
  "advance",
  "feel",
  "punctuate",
  "bridge",
  "payoff",
]);

const editorialSecondaryPurposeSchema = z.enum([
  "preserve-geography",
  "listener-reaction",
  "reveal-information",
  "carry-action",
  "reset-energy",
  "support-dialogue",
]);

const editorialReasonCodeSchema = z.enum([
  "story-clarity",
  "character-performance",
  "causal-readability",
  "reaction-coverage",
  "reveal-coverage",
  "action-continuity",
  "pacing",
  "composition",
  "geography",
  "visual-variety",
]);

const structuredCameraReasonSchema = z.enum([
  "establish-geography",
  "follow-action",
  "increase-emphasis",
  "reveal-information",
  "preserve-screen-direction",
  "reset-geography",
  "hold-performance",
  "support-point-of-view",
]);

const structuredTransitionReasonSchema = z.enum([
  "action-continuity",
  "reaction-readability",
  "clause-boundary",
  "comic-hold",
  "new-information",
  "resolved-eyeline",
  "geography-reset",
  "graphic-match",
  "time-transition",
  "scene-transition",
]);

const outputFormatSchema = z
  .object({
    width: z.number().int().positive(),
    height: z.number().int().positive(),
    fps: z.number().int().positive(),
  })
  .strict();

export type EditorialOutputFormat = z.infer<typeof outputFormatSchema>;

const grammarForShowPack = (showPack: ShowPack) =>
  showPack.projectType === "kids" ? "kids-adventure" : "weird-history";

const cameraMovementFromProfile = (movement: string) => {
  if (movement === "cameraPush") return "push" as const;
  if (["locked", "pan", "reframe"].includes(movement)) return movement;
  throw new Error(`Unsupported Show Pack camera movement ${movement}.`);
};

const transitionWeightsFor = (showPack: ShowPack) => [
  {
    kind: "hard-cut" as const,
    weight: showPack.profile.transitionPolicy.hardCut,
  },
  {
    kind: "foreground-wipe" as const,
    weight: showPack.profile.transitionPolicy.foregroundWipe,
  },
  {
    kind: "camera-carry" as const,
    weight: showPack.profile.transitionPolicy.cameraCarry,
  },
  {
    kind: "dissolve" as const,
    weight: showPack.profile.transitionPolicy.briefDissolve,
  },
];

const editorialTargetsFields = {
  schemaVersion: z.literal("1.0"),
  authority: z.literal("editorial-targets-planning-guidance"),
  productionBindable: z.literal(false),
  grammar: cv002GrammarSchema,
  showPackId: identifierSchema,
  showPackContentHash: hashSchema,
  grammarProfileId: identifierSchema,
  grammarProfileContentHash: hashSchema,
  referenceStudyContentHashes: z.array(hashSchema).min(1),
  fps: z.number().int().positive(),
  hardConstraints: z
    .object({
      absoluteShotDurationFrames: z
        .object({
          minimum: z.number().int().positive(),
          maximum: z.number().int().positive(),
        })
        .strict(),
      allowedShotSizes: z.array(directorShotSizeSchema).min(1),
      allowedCameraMovements: z.array(directorCameraMovementSchema).min(1),
      allowedTransitionKinds: z.array(editorialTransitionKindSchema).min(1),
    })
    .strict(),
  priors: z
    .object({
      preferredShotDurationFrames: z
        .object({
          minimum: z.number().int().positive(),
          maximum: z.number().int().positive(),
        })
        .strict(),
      targetCutsPerMinute: z.number().positive(),
      maximumStaticIdeaFrames: z.number().int().positive(),
      shotSizeWeights: z.array(
        z
          .object({
            shotSize: directorShotSizeSchema,
            weight: z.number().min(0).max(1),
          })
          .strict(),
      ),
      cameraMovementWeights: z.array(
        z
          .object({
            movement: directorCameraMovementSchema,
            weight: z.number().min(0).max(1),
          })
          .strict(),
      ),
      transitionWeights: z.array(
        z
          .object({
            kind: editorialTransitionKindSchema,
            weight: z.number().min(0).max(1),
          })
          .strict(),
      ),
      performanceRatesPerMinute: z
        .object({
          gestures: z.number().nonnegative(),
          reactions: z.number().nonnegative(),
          poseChanges: z.number().nonnegative(),
        })
        .strict(),
      enforcement: z.literal("non-blocking-priors"),
    })
    .strict(),
};

export const editorialTargetsSchema = sealedSchema(
  editorialTargetsFields,
  "Editorial targets hash is invalid.",
).superRefine((targets, context) => {
  if (
    targets.hardConstraints.absoluteShotDurationFrames.minimum >
    targets.hardConstraints.absoluteShotDurationFrames.maximum
  )
    context.addIssue({
      code: "custom",
      path: ["hardConstraints", "absoluteShotDurationFrames"],
      message: "Absolute shot duration range is reversed.",
    });
  if (
    targets.priors.preferredShotDurationFrames.minimum >
    targets.priors.preferredShotDurationFrames.maximum
  )
    context.addIssue({
      code: "custom",
      path: ["priors", "preferredShotDurationFrames"],
      message: "Preferred shot duration range is reversed.",
    });
  [
    targets.priors.shotSizeWeights,
    targets.priors.cameraMovementWeights,
    targets.priors.transitionWeights,
  ].forEach((weights, index) => {
    const total = weights.reduce((sum, item) => sum + item.weight, 0);
    if (Math.abs(total - 1) > 0.001)
      context.addIssue({
        code: "custom",
        path: ["priors", index],
        message: "Editorial target weight groups must be normalized.",
      });
  });
});

export type EditorialTargets = z.infer<typeof editorialTargetsSchema>;

export function createEditorialTargets(input: {
  showPack: ShowPack;
  grammarProfile: GrammarProfile;
  referenceStudyContentHashes: readonly string[];
  fps: number;
}): EditorialTargets {
  const showPack = showPackSchema.parse(input.showPack);
  const grammarProfile = grammarProfileSchema.parse(input.grammarProfile);
  const fps = z.number().int().positive().parse(input.fps);
  if (!verifyShowPackHash(showPack))
    throw new Error("Show Pack hash is invalid.");
  const grammar = grammarForShowPack(showPack);
  if (
    grammarProfile.kind !== grammar ||
    grammarProfile.id !== showPack.profile.id
  )
    throw new Error(
      "Show Pack and GrammarProfile do not describe the same grammar.",
    );
  const referenceStudyContentHashes = sortedUnique(
    input.referenceStudyContentHashes,
    "Reference study hash",
  );
  if (referenceStudyContentHashes.length === 0)
    throw new Error("Editorial targets require measured reference lineage.");
  const cameraMovementWeights = showPack.profile.cameraPolicy.moves
    .map((item) => ({
      movement: directorCameraMovementSchema.parse(
        cameraMovementFromProfile(item.type),
      ),
      weight: item.weight,
    }))
    .sort((left, right) => left.movement.localeCompare(right.movement));
  const transitionWeights = transitionWeightsFor(showPack)
    .filter((item) => item.weight > 0)
    .sort((left, right) => left.kind.localeCompare(right.kind));
  const draft = {
    schemaVersion: "1.0" as const,
    authority: "editorial-targets-planning-guidance" as const,
    productionBindable: false as const,
    grammar,
    showPackId: showPack.id,
    showPackContentHash: showPack.contentHash,
    grammarProfileId: grammarProfile.id,
    grammarProfileContentHash: grammarProfile.contentHash,
    referenceStudyContentHashes,
    fps,
    hardConstraints: {
      absoluteShotDurationFrames: grammarProfile.pacing.shotDurationFrames,
      allowedShotSizes: [...showPack.allowedFramings].sort(),
      allowedCameraMovements: [
        ...grammarProfile.camera.allowedMovements,
      ].sort(),
      allowedTransitionKinds: transitionWeights.map((item) => item.kind),
    },
    priors: {
      preferredShotDurationFrames: {
        minimum: showPack.profile.cadence.minShotFrames,
        maximum: showPack.profile.cadence.maxShotFrames,
      },
      targetCutsPerMinute: showPack.profile.cadence.targetCutsPerMinute,
      maximumStaticIdeaFrames: showPack.profile.cadence.maxStaticFrames,
      shotSizeWeights: [
        {
          shotSize: "wide" as const,
          weight: showPack.profile.framingWeights.wide,
        },
        {
          shotSize: "medium" as const,
          weight: showPack.profile.framingWeights.medium,
        },
        {
          shotSize: "close-up" as const,
          weight: showPack.profile.framingWeights.closeUp,
        },
        {
          shotSize: "insert" as const,
          weight: showPack.profile.framingWeights.insert,
        },
      ].sort((left, right) => left.shotSize.localeCompare(right.shotSize)),
      cameraMovementWeights,
      transitionWeights,
      performanceRatesPerMinute: {
        gestures: showPack.profile.performancePolicy.gesturesPerMinute,
        reactions: showPack.profile.performancePolicy.reactionsPerMinute,
        poseChanges: showPack.profile.performancePolicy.poseChangesPerMinute,
      },
      enforcement: "non-blocking-priors" as const,
    },
  };
  return editorialTargetsSchema.parse(seal(draft));
}

export function restoreEditorialTargets(
  serialized: string,
  sources: Parameters<typeof createEditorialTargets>[0],
): EditorialTargets {
  const restored = editorialTargetsSchema.parse(JSON.parse(serialized));
  const expected = createEditorialTargets(sources);
  if (!same(restored, expected))
    throw new Error(
      "Editorial targets do not match their exact source artifacts.",
    );
  return restored;
}

const editorialTimingBudgetFields = {
  schemaVersion: z.literal("1.0"),
  authority: z.literal("editorial-timing-budget-solver-owned"),
  productionBindable: z.literal(false),
  storyProjectContentHash: hashSchema,
  storyGraphContentHash: hashSchema,
  output: outputFormatSchema,
  basis: z.literal("estimated"),
  scenes: z
    .array(
      z
        .object({
          sourceSceneContentHash: hashSchema,
          durationInFrames: z.number().int().positive(),
        })
        .strict(),
    )
    .min(1),
  episodeDurationInFrames: z.number().int().positive(),
};

export const editorialTimingBudgetSchema = sealedSchema(
  editorialTimingBudgetFields,
  "Editorial timing budget hash is invalid.",
).superRefine((budget, context) => {
  const total = budget.scenes.reduce(
    (sum, scene) => sum + scene.durationInFrames,
    0,
  );
  if (total !== budget.episodeDurationInFrames)
    context.addIssue({
      code: "custom",
      path: ["episodeDurationInFrames"],
      message: "Episode duration must equal its scene budgets.",
    });
});

export type EditorialTimingBudget = z.infer<typeof editorialTimingBudgetSchema>;

export function sealEstimatedEditorialTimingBudget(input: {
  storyProject: Cv002Project;
  output: EditorialOutputFormat;
  sceneDurationFrames: readonly number[];
}): EditorialTimingBudget {
  const storyProject = cv002ProjectSchema.parse(input.storyProject);
  const output = outputFormatSchema.parse(input.output);
  if (input.sceneDurationFrames.length !== storyProject.graph.scenes.length)
    throw new Error(
      "Timing budget must cover every source scene exactly once.",
    );
  const scenes = storyProject.graph.scenes.map((scene, index) => ({
    sourceSceneContentHash: scene.contentHash,
    durationInFrames: z
      .number()
      .int()
      .positive()
      .parse(input.sceneDurationFrames[index]),
  }));
  const draft = {
    schemaVersion: "1.0" as const,
    authority: "editorial-timing-budget-solver-owned" as const,
    productionBindable: false as const,
    storyProjectContentHash: storyProject.contentHash,
    storyGraphContentHash: storyProject.graph.contentHash,
    output,
    basis: "estimated" as const,
    scenes,
    episodeDurationInFrames: scenes.reduce(
      (sum, scene) => sum + scene.durationInFrames,
      0,
    ),
  };
  return editorialTimingBudgetSchema.parse(seal(draft));
}

const beatBindingSchema = z
  .object({
    beatRef: identifierSchema,
    sourceBeatId: identifierSchema,
    sourceBeatContentHash: hashSchema,
    sourceOrder: z.number().int().nonnegative(),
    role: cv002BeatRoleSchema,
    text: z.string().min(1),
    causalActionRef: identifierSchema,
  })
  .strict();

const stageBindingSchema = z
  .object({
    stageRef: identifierSchema,
    sourceStageId: identifierSchema,
    cameraAxisRef: identifierSchema,
    depthPlanes: z
      .array(
        z
          .object({
            depthPlaneRef: identifierSchema,
            sourceDepthPlaneId: identifierSchema,
            role: z.enum([
              "far-background",
              "background",
              "midground",
              "performance",
              "foreground",
            ]),
            depth: z.number(),
          })
          .strict(),
      )
      .min(3),
    landmarks: z.array(
      z
        .object({
          landmarkRef: identifierSchema,
          sourceLandmarkId: identifierSchema,
          kind: z.enum([
            "entrance",
            "exit",
            "perch",
            "resting-place",
            "action-mark",
            "geography-anchor",
          ]),
        })
        .strict(),
    ),
    occluders: z.array(
      z
        .object({
          occluderRef: identifierSchema,
          sourceOccluderId: identifierSchema,
        })
        .strict(),
    ),
    permittedShotSizes: z.array(directorShotSizeSchema).min(1),
  })
  .strict();

const subjectBindingSchema = z
  .object({ subjectRef: identifierSchema, sourceEntityId: identifierSchema })
  .strict();

const propBindingSchema = z
  .object({ propRef: identifierSchema, sourcePropId: identifierSchema })
  .strict();

const capabilityBindingSchema = z
  .object({
    capabilityRef: identifierSchema,
    sourceCapabilityContentHash: hashSchema,
    requirementId: identifierSchema,
    ownerSubjectRef: identifierSchema,
    kind: z.enum(["articulated-rig", "atlas-cycle", "living-hold"]),
  })
  .strict();

const requestSceneSchema = z
  .object({
    sceneRef: identifierSchema,
    sourceSceneId: identifierSchema,
    sourceSceneContentHash: hashSchema,
    sourceOrder: z.number().int().nonnegative(),
    sceneWorldContentHash: hashSchema,
    beats: z.array(beatBindingSchema).min(1),
    stages: z.array(stageBindingSchema).min(1),
    subjects: z.array(subjectBindingSchema),
    props: z.array(propBindingSchema),
    capabilities: z.array(capabilityBindingSchema),
  })
  .strict()
  .superRefine((scene, context) => {
    unique(
      scene.beats.map((beat) => beat.beatRef),
      ["beats"],
      "beat ref",
      context,
    );
    unique(
      scene.stages.map((stage) => stage.stageRef),
      ["stages"],
      "stage ref",
      context,
    );
    unique(
      scene.subjects.map((subject) => subject.subjectRef),
      ["subjects"],
      "subject ref",
      context,
    );
    unique(
      scene.props.map((prop) => prop.propRef),
      ["props"],
      "prop ref",
      context,
    );
    unique(
      scene.capabilities.map((capability) => capability.capabilityRef),
      ["capabilities"],
      "capability ref",
      context,
    );
    scene.beats.forEach((beat, index) => {
      if (beat.sourceOrder !== index)
        context.addIssue({
          code: "custom",
          path: ["beats", index, "sourceOrder"],
          message: "Request beats must preserve source order.",
        });
    });
    const subjectRefs = new Set(
      scene.subjects.map((subject) => subject.subjectRef),
    );
    scene.capabilities.forEach((capability, index) => {
      if (!subjectRefs.has(capability.ownerSubjectRef))
        context.addIssue({
          code: "custom",
          path: ["capabilities", index, "ownerSubjectRef"],
          message: "Capability owner is not a subject in this scene.",
        });
    });
    scene.stages.forEach((stage, stageIndex) => {
      unique(
        stage.depthPlanes.map((plane) => plane.depthPlaneRef),
        ["stages", stageIndex, "depthPlanes"],
        "depth plane ref",
        context,
      );
      unique(
        stage.landmarks.map((landmark) => landmark.landmarkRef),
        ["stages", stageIndex, "landmarks"],
        "landmark ref",
        context,
      );
      unique(
        stage.occluders.map((occluder) => occluder.occluderRef),
        ["stages", stageIndex, "occluders"],
        "occluder ref",
        context,
      );
      stage.depthPlanes.forEach((plane, planeIndex) => {
        if (
          planeIndex > 0 &&
          plane.depth < stage.depthPlanes[planeIndex - 1]!.depth
        )
          context.addIssue({
            code: "custom",
            path: ["stages", stageIndex, "depthPlanes", planeIndex],
            message: "Depth planes must remain ordered far to near.",
          });
      });
    });
  });

const requestSequenceSchema = z
  .object({
    sequenceRef: identifierSchema,
    adapter: z.literal("synthetic-flat-graph-v1"),
    scenes: z.array(requestSceneSchema).min(1),
  })
  .strict();

const requestVocabularySchema = z
  .object({
    coverageRoles: z.array(editorialCoverageRoleSchema).min(1),
    energyShapes: z.array(editorialEnergyShapeSchema).min(1),
    shotSizes: z.array(directorShotSizeSchema).min(1),
    cameraAngles: z.array(editorialCameraAngleSchema).min(1),
    cameraMovements: z.array(directorCameraMovementSchema).min(1),
    transitionKinds: z.array(editorialTransitionKindSchema).min(1),
  })
  .strict();

const editorialPlanningRequestFields = {
  schemaVersion: z.literal("0.2-pilot"),
  authority: z.literal("editorial-planning-request-diagnostic-only"),
  productionBindable: z.literal(false),
  pilotId: identifierSchema,
  grammar: cv002GrammarSchema,
  storyProjectContentHash: hashSchema,
  storyGraphContentHash: hashSchema,
  artDirectionSelectionContentHash: hashSchema,
  grammarProfileContentHash: hashSchema,
  showPackContentHash: hashSchema,
  editorialTargetsContentHash: hashSchema,
  capabilityRegistryContentHash: hashSchema,
  timingBudgetContentHash: hashSchema,
  output: outputFormatSchema,
  sceneWorldContentHashes: z.array(hashSchema).min(1),
  episode: z
    .object({
      episodeRef: identifierSchema,
      sequences: z.array(requestSequenceSchema).length(1),
    })
    .strict(),
  allowedVocabulary: requestVocabularySchema,
  maximumShotsPerScene: z.number().int().min(1).max(32),
  maximumCoveragePerBeat: z.number().int().min(1).max(8),
  fallbackAllowed: z.literal(false),
  maximumRevisionRounds: z.literal(1),
};

export const editorialPlanningRequestSchema = sealedSchema(
  editorialPlanningRequestFields,
  "Editorial planning request hash is invalid.",
).superRefine((request, context) => {
  const sequence = request.episode.sequences[0]!;
  unique(
    sequence.scenes.map((scene) => scene.sceneRef),
    ["episode", "sequences", 0, "scenes"],
    "scene ref",
    context,
  );
  sequence.scenes.forEach((scene, index) => {
    if (scene.sourceOrder !== index)
      context.addIssue({
        code: "custom",
        path: ["episode", "sequences", 0, "scenes", index, "sourceOrder"],
        message: "Request scenes must preserve source order.",
      });
  });
  if (
    !same(
      request.sceneWorldContentHashes,
      sequence.scenes.map((scene) => scene.sceneWorldContentHash),
    )
  )
    context.addIssue({
      code: "custom",
      path: ["sceneWorldContentHashes"],
      message: "Request scene-world lineage does not match its hierarchy.",
    });
});

export type EditorialPlanningRequest = z.infer<
  typeof editorialPlanningRequestSchema
>;

export type EditorialPlanningRequestSources = {
  pilotId: string;
  storyProject: Cv002Project;
  showPack: ShowPack;
  grammarProfile: GrammarProfile;
  sceneWorlds: readonly SceneWorldPlan[];
  capabilityRegistry: CapabilityRegistry;
  editorialTargets: EditorialTargets;
  timingBudget: EditorialTimingBudget;
  output: EditorialOutputFormat;
};

export function createEditorialPlanningRequest(
  input: EditorialPlanningRequestSources,
): EditorialPlanningRequest {
  const pilotId = identifierSchema.parse(input.pilotId);
  const storyProject = cv002ProjectSchema.parse(input.storyProject);
  const showPack = showPackSchema.parse(input.showPack);
  const grammarProfile = grammarProfileSchema.parse(input.grammarProfile);
  const sceneWorlds = input.sceneWorlds.map((world) =>
    sceneWorldPlanSchema.parse(world),
  );
  const capabilityRegistry = capabilityRegistrySchema.parse(
    input.capabilityRegistry,
  );
  const editorialTargets = editorialTargetsSchema.parse(input.editorialTargets);
  const timingBudget = editorialTimingBudgetSchema.parse(input.timingBudget);
  const output = outputFormatSchema.parse(input.output);
  if (!verifyShowPackHash(showPack))
    throw new Error("Show Pack hash is invalid.");
  if (
    grammarForShowPack(showPack) !== storyProject.grammar ||
    grammarProfile.kind !== storyProject.grammar ||
    grammarProfile.id !== showPack.profile.id
  )
    throw new Error("Project, Show Pack, and GrammarProfile do not match.");
  if (
    editorialTargets.showPackContentHash !== showPack.contentHash ||
    editorialTargets.grammarProfileContentHash !== grammarProfile.contentHash ||
    editorialTargets.grammar !== storyProject.grammar ||
    editorialTargets.fps !== output.fps
  )
    throw new Error("EditorialTargets are stale for the planning sources.");
  if (
    timingBudget.storyProjectContentHash !== storyProject.contentHash ||
    timingBudget.storyGraphContentHash !== storyProject.graph.contentHash ||
    !same(timingBudget.output, output)
  )
    throw new Error("Timing budget is stale for the planning sources.");
  if (sceneWorlds.length !== storyProject.graph.scenes.length)
    throw new Error(
      "SceneWorldPlans must cover every source scene exactly once.",
    );

  const entityIds = new Set(
    sceneWorlds.flatMap((world) =>
      Object.keys(world.initialWorldState.entities),
    ),
  );
  capabilityRegistry.capabilities.forEach((capability) => {
    if (!entityIds.has(capability.entityId))
      throw new Error(
        `Capability ${capability.id} owner ${capability.entityId} is absent from every SceneWorldPlan.`,
      );
  });

  const episodeRef = opaqueRef("episode", {
    storyProjectContentHash: storyProject.contentHash,
  });
  const sequenceRef = opaqueRef("sequence", {
    storyGraphContentHash: storyProject.graph.contentHash,
    adapter: "synthetic-flat-graph-v1",
  });
  const subjectRefFor = (entityId: string) =>
    opaqueRef("subject", {
      storyGraphContentHash: storyProject.graph.contentHash,
      entityId,
    });
  const capabilityRefFor = (contentHash: string) =>
    opaqueRef("capability", { contentHash });

  const scenes = storyProject.graph.scenes.map((sourceScene, sceneIndex) => {
    const world = sceneWorlds[sceneIndex]!;
    if (
      world.sceneId !== sourceScene.id ||
      world.sourceSceneContentHash !== sourceScene.contentHash ||
      timingBudget.scenes[sceneIndex]!.sourceSceneContentHash !==
        sourceScene.contentHash
    )
      throw new Error(
        `SceneWorldPlan ${sceneIndex} is not bound to its source scene and timing budget.`,
      );
    const sceneRef = opaqueRef("scene", {
      sourceSceneContentHash: sourceScene.contentHash,
    });
    const beats = sourceScene.beats.map((beat, beatIndex) => ({
      beatRef: opaqueRef("beat", { sourceBeatContentHash: beat.contentHash }),
      sourceBeatId: beat.id,
      sourceBeatContentHash: beat.contentHash,
      sourceOrder: beatIndex,
      role: beat.role,
      text: beat.text,
      causalActionRef: opaqueRef("causal-action", {
        sourceBeatContentHash: beat.contentHash,
      }),
    }));
    const subjects = Object.keys(world.initialWorldState.entities)
      .sort()
      .map((sourceEntityId) => ({
        subjectRef: subjectRefFor(sourceEntityId),
        sourceEntityId,
      }));
    const props = Object.keys(world.initialWorldState.props)
      .sort()
      .map((sourcePropId) => ({
        propRef: opaqueRef("prop", {
          storyGraphContentHash: storyProject.graph.contentHash,
          sourcePropId,
        }),
        sourcePropId,
      }));
    const stages = [...world.stages]
      .sort((left, right) => left.id.localeCompare(right.id))
      .map((stage) => {
        if (stage.depthPlanes.length < 3)
          throw new Error(
            `Stage ${stage.id} cannot support a three-layer editorial composition.`,
          );
        const stageRef = opaqueRef("stage", {
          sourceSceneContentHash: sourceScene.contentHash,
          stageId: stage.id,
        });
        return {
          stageRef,
          sourceStageId: stage.id,
          cameraAxisRef: opaqueRef("camera-axis", { stageRef }),
          depthPlanes: [...stage.depthPlanes]
            .sort(
              (left, right) =>
                left.depth - right.depth || left.id.localeCompare(right.id),
            )
            .map((plane) => ({
              depthPlaneRef: opaqueRef("depth-plane", {
                stageRef,
                sourceDepthPlaneId: plane.id,
              }),
              sourceDepthPlaneId: plane.id,
              role: plane.role,
              depth: plane.depth,
            })),
          landmarks: [...stage.landmarks]
            .sort((left, right) => left.id.localeCompare(right.id))
            .map((landmark) => ({
              landmarkRef: opaqueRef("landmark", {
                stageRef,
                sourceLandmarkId: landmark.id,
              }),
              sourceLandmarkId: landmark.id,
              kind: landmark.kind,
            })),
          occluders: [...stage.occluders]
            .sort((left, right) => left.id.localeCompare(right.id))
            .map((occluder) => ({
              occluderRef: opaqueRef("occluder", {
                stageRef,
                sourceOccluderId: occluder.id,
              }),
              sourceOccluderId: occluder.id,
            })),
          permittedShotSizes: canonicalSet(
            stage.cameraZones.flatMap((zone) => zone.permittedShotSizes),
          ),
        };
      });
    const subjectRefs = new Set(
      subjects.map((subject) => subject.sourceEntityId),
    );
    const capabilities = capabilityRegistry.capabilities
      .filter((capability) => subjectRefs.has(capability.entityId))
      .sort((left, right) => left.contentHash.localeCompare(right.contentHash))
      .map((capability) => ({
        capabilityRef: capabilityRefFor(capability.contentHash),
        sourceCapabilityContentHash: capability.contentHash,
        requirementId: capability.requirementId,
        ownerSubjectRef: subjectRefFor(capability.entityId),
        kind: capability.kind,
      }));
    return {
      sceneRef,
      sourceSceneId: sourceScene.id,
      sourceSceneContentHash: sourceScene.contentHash,
      sourceOrder: sceneIndex,
      sceneWorldContentHash: world.contentHash,
      beats,
      stages,
      subjects,
      props,
      capabilities,
    };
  });

  const draft = {
    schemaVersion: "0.2-pilot" as const,
    authority: "editorial-planning-request-diagnostic-only" as const,
    productionBindable: false as const,
    pilotId,
    grammar: storyProject.grammar,
    storyProjectContentHash: storyProject.contentHash,
    storyGraphContentHash: storyProject.graph.contentHash,
    artDirectionSelectionContentHash:
      storyProject.artDirectionSelection.contentHash,
    grammarProfileContentHash: grammarProfile.contentHash,
    showPackContentHash: showPack.contentHash,
    editorialTargetsContentHash: editorialTargets.contentHash,
    capabilityRegistryContentHash: capabilityRegistry.contentHash,
    timingBudgetContentHash: timingBudget.contentHash,
    output,
    sceneWorldContentHashes: scenes.map((scene) => scene.sceneWorldContentHash),
    episode: {
      episodeRef,
      sequences: [
        {
          sequenceRef,
          adapter: "synthetic-flat-graph-v1" as const,
          scenes,
        },
      ] as const,
    },
    allowedVocabulary: {
      coverageRoles: editorialCoverageRoleSchema.options,
      energyShapes: editorialEnergyShapeSchema.options,
      shotSizes: editorialTargets.hardConstraints.allowedShotSizes,
      cameraAngles: editorialCameraAngleSchema.options,
      cameraMovements: editorialTargets.hardConstraints.allowedCameraMovements,
      transitionKinds: editorialTargets.hardConstraints.allowedTransitionKinds,
    },
    maximumShotsPerScene: 32,
    maximumCoveragePerBeat: 8,
    fallbackAllowed: false as const,
    maximumRevisionRounds: 1 as const,
  };
  return editorialPlanningRequestSchema.parse(seal(draft));
}

export function restoreEditorialPlanningRequest(
  serialized: string,
  sources: EditorialPlanningRequestSources,
): EditorialPlanningRequest {
  const restored = editorialPlanningRequestSchema.parse(JSON.parse(serialized));
  const expected = createEditorialPlanningRequest(sources);
  if (!same(restored, expected))
    throw new Error(
      "Editorial planning request does not match its source artifacts.",
    );
  return restored;
}

export const editorialPlanningLaneSchema = z.enum([
  "heuristic-control",
  "external-candidate",
  "manual-candidate",
]);

const editorialPlanningRunSpecFields = {
  schemaVersion: z.literal("1.0"),
  authority: z.literal("editorial-planning-run-spec-diagnostic-only"),
  productionBindable: z.literal(false),
  requestContentHash: hashSchema,
  lane: editorialPlanningLaneSchema,
  fallbackAllowed: z.literal(false),
};

export const editorialPlanningRunSpecSchema = sealedSchema(
  editorialPlanningRunSpecFields,
  "Editorial planning run spec hash is invalid.",
);

export type EditorialPlanningRunSpec = z.infer<
  typeof editorialPlanningRunSpecSchema
>;

export function sealEditorialPlanningRunSpec(input: {
  request: EditorialPlanningRequest;
  lane: z.infer<typeof editorialPlanningLaneSchema>;
}): EditorialPlanningRunSpec {
  const request = editorialPlanningRequestSchema.parse(input.request);
  const draft = {
    schemaVersion: "1.0" as const,
    authority: "editorial-planning-run-spec-diagnostic-only" as const,
    productionBindable: false as const,
    requestContentHash: request.contentHash,
    lane: editorialPlanningLaneSchema.parse(input.lane),
    fallbackAllowed: false as const,
  };
  return editorialPlanningRunSpecSchema.parse(seal(draft));
}

export function assertEditorialPlanningRunSpecMatchesRequest(input: {
  request: EditorialPlanningRequest;
  runSpec: EditorialPlanningRunSpec;
}): EditorialPlanningRunSpec {
  const request = editorialPlanningRequestSchema.parse(input.request);
  const runSpec = editorialPlanningRunSpecSchema.parse(input.runSpec);
  if (runSpec.requestContentHash !== request.contentHash)
    throw new Error("Editorial planning run spec is stale for its request.");
  const expected = sealEditorialPlanningRunSpec({
    request,
    lane: runSpec.lane,
  });
  if (!same(runSpec, expected))
    throw new Error("Editorial planning run spec does not match its request.");
  return runSpec;
}

export function restoreEditorialPlanningRunSpec(input: {
  serialized: string;
  request: EditorialPlanningRequest;
}): EditorialPlanningRunSpec {
  return assertEditorialPlanningRunSpecMatchesRequest({
    request: input.request,
    runSpec: editorialPlanningRunSpecSchema.parse(JSON.parse(input.serialized)),
  });
}

const purposeSchema = z
  .object({
    primaryPurpose: editorialPrimaryPurposeSchema,
    secondaryPurposes: z.array(editorialSecondaryPurposeSchema).max(2),
    reasonCodes: z.array(editorialReasonCodeSchema).min(1).max(4),
  })
  .strict();

const subjectBlockingSchema = z
  .object({
    subjectRef: identifierSchema,
    entryLandmarkRef: identifierSchema,
    exitLandmarkRef: identifierSchema,
    facing: z.enum(["left", "right", "front", "three-quarter", "away"]),
    gazeTargetRef: identifierSchema.nullable(),
  })
  .strict();

const externalEditorialShotSchema = z
  .object({
    localOrdinal: z.number().int().nonnegative(),
    beatRefs: z.array(identifierSchema).min(1),
    coverageRole: editorialCoverageRoleSchema,
    stageRef: identifierSchema,
    subjectBlocking: z.array(subjectBlockingSchema),
    propRefs: z.array(identifierSchema),
    causalActionRefs: z.array(identifierSchema).min(1),
    purpose: purposeSchema,
    shotSize: directorShotSizeSchema,
    cameraAngle: editorialCameraAngleSchema,
    cameraAxisRef: identifierSchema,
    compositionIntent: z
      .object({
        focalRegion: z.enum([
          "left-third",
          "center",
          "right-third",
          "upper-third",
          "lower-third",
        ]),
        negativeSpace: z.enum(["left", "right", "above", "none"]),
        depthPlaneRefs: z.array(identifierSchema).min(3),
        foregroundOccluderRefs: z.array(identifierSchema),
      })
      .strict(),
    cameraIntent: z
      .object({
        movement: directorCameraMovementSchema,
        reasonCodes: z.array(structuredCameraReasonSchema).min(1).max(3),
      })
      .strict(),
    transitionIntent: z
      .object({
        kind: editorialTransitionKindSchema,
        reasonCodes: z.array(structuredTransitionReasonSchema).min(1).max(3),
      })
      .strict(),
    readBias: editorialReadBiasSchema,
    requestedCapabilityRefs: z.array(identifierSchema),
    rationaleNote: z.string().trim().min(1).max(280).optional(),
  })
  .strict();

const externalBeatCoverageSchema = z
  .object({
    beatRef: identifierSchema,
    editorialShotOrdinals: z.array(z.number().int().nonnegative()).min(1),
  })
  .strict();

const externalSceneSchema = z
  .object({
    sceneRef: identifierSchema,
    energyShape: editorialEnergyShapeSchema,
    beats: z.array(externalBeatCoverageSchema).min(1),
    editorialShots: z.array(externalEditorialShotSchema).min(1),
  })
  .strict();

const externalSequenceSchema = z
  .object({
    sequenceRef: identifierSchema,
    scenes: z.array(externalSceneSchema).min(1),
  })
  .strict();

/**
 * Untrusted creative output. It carries one trusted request reference and
 * opaque host refs only: never source IDs, hashes, frames, canonical events,
 * provider metadata, or authority claims.
 */
export const externalEditorialIntentDraftSchema = z
  .object({
    schemaVersion: z.literal("0.2-pilot"),
    requestContentHash: hashSchema,
    episode: z
      .object({
        episodeRef: identifierSchema,
        sequences: z.array(externalSequenceSchema).min(1),
      })
      .strict(),
  })
  .strict();

export type ExternalEditorialIntentDraft = z.infer<
  typeof externalEditorialIntentDraftSchema
>;

const canonicalizeShot = (
  shot: z.infer<typeof externalEditorialShotSchema>,
) => ({
  ...shot,
  subjectBlocking: [...shot.subjectBlocking].sort((left, right) =>
    left.subjectRef.localeCompare(right.subjectRef),
  ),
  propRefs: canonicalSet(shot.propRefs),
  causalActionRefs: canonicalSet(shot.causalActionRefs),
  purpose: {
    ...shot.purpose,
    secondaryPurposes: canonicalSet(shot.purpose.secondaryPurposes),
    reasonCodes: canonicalSet(shot.purpose.reasonCodes),
  },
  compositionIntent: {
    ...shot.compositionIntent,
    foregroundOccluderRefs: canonicalSet(
      shot.compositionIntent.foregroundOccluderRefs,
    ),
  },
  cameraIntent: {
    ...shot.cameraIntent,
    reasonCodes: canonicalSet(shot.cameraIntent.reasonCodes),
  },
  transitionIntent: {
    ...shot.transitionIntent,
    reasonCodes: canonicalSet(shot.transitionIntent.reasonCodes),
  },
  requestedCapabilityRefs: canonicalSet(shot.requestedCapabilityRefs),
});

const canonicalizeExternalIntent = (intent: ExternalEditorialIntentDraft) => ({
  ...intent,
  episode: {
    ...intent.episode,
    sequences: intent.episode.sequences.map((sequence) => ({
      ...sequence,
      scenes: sequence.scenes.map((scene) => ({
        ...scene,
        beats: scene.beats.map((beat) => ({
          ...beat,
          editorialShotOrdinals: [...beat.editorialShotOrdinals].sort(
            (left, right) => left - right,
          ),
        })),
        editorialShots: scene.editorialShots.map(canonicalizeShot),
      })),
    })),
  },
});

export function deriveEditorialShotId(input: {
  sceneRef: string;
  localOrdinal: number;
  beatRefs: readonly string[];
  coverageRole: z.infer<typeof editorialCoverageRoleSchema>;
  stageRef: string;
  subjectRefs: readonly string[];
  propRefs: readonly string[];
}): string {
  return `editorial-shot-${hashCanonical({
    sceneRef: input.sceneRef,
    localOrdinal: input.localOrdinal,
    beatRefs: input.beatRefs,
    coverageRole: input.coverageRole,
    stageRef: input.stageRef,
    subjectRefs: canonicalSet(input.subjectRefs),
    propRefs: canonicalSet(input.propRefs),
  })}`;
}

const boundEditorialShotSchema = externalEditorialShotSchema
  .extend({ editorialShotId: identifierSchema })
  .strict();

const proposalBeatCoverageSchema = z
  .object({
    beatRef: identifierSchema,
    sourceEditorialShotIds: z.array(identifierSchema).min(1),
  })
  .strict();

const proposalSceneSchema = z
  .object({
    sceneRef: identifierSchema,
    energyShape: editorialEnergyShapeSchema,
    beats: z.array(proposalBeatCoverageSchema).min(1),
    editorialShots: z.array(boundEditorialShotSchema).min(1),
  })
  .strict();

const proposalSequenceSchema = z
  .object({
    sequenceRef: identifierSchema,
    scenes: z.array(proposalSceneSchema).min(1),
  })
  .strict();

const editorialDirectorProposalFields = {
  schemaVersion: z.literal("1.0"),
  authority: z.literal("editorial-pilot-diagnostic-only"),
  productionBindable: z.literal(false),
  requestContentHash: hashSchema,
  externalIntentContentHash: hashSchema,
  episode: z
    .object({
      episodeRef: identifierSchema,
      sequences: z.array(proposalSequenceSchema).min(1),
    })
    .strict(),
};

export const editorialDirectorProposalV1Schema = sealedSchema(
  editorialDirectorProposalFields,
  "Editorial Director proposal hash is invalid.",
).superRefine((proposal, context) => {
  const shotIds = proposal.episode.sequences.flatMap((sequence) =>
    sequence.scenes.flatMap((scene) =>
      scene.editorialShots.map((shot) => shot.editorialShotId),
    ),
  );
  unique(shotIds, ["episode"], "editorial shot ID", context);
  proposal.episode.sequences.forEach((sequence, sequenceIndex) =>
    sequence.scenes.forEach((scene, sceneIndex) => {
      scene.editorialShots.forEach((shot, shotIndex) => {
        if (shot.localOrdinal !== shotIndex)
          context.addIssue({
            code: "custom",
            path: [
              "episode",
              "sequences",
              sequenceIndex,
              "scenes",
              sceneIndex,
              "editorialShots",
              shotIndex,
              "localOrdinal",
            ],
            message: "Editorial shot order is not forward and contiguous.",
          });
        const expectedId = deriveEditorialShotId({
          sceneRef: scene.sceneRef,
          localOrdinal: shot.localOrdinal,
          beatRefs: shot.beatRefs,
          coverageRole: shot.coverageRole,
          stageRef: shot.stageRef,
          subjectRefs: shot.subjectBlocking.map(
            (blocking) => blocking.subjectRef,
          ),
          propRefs: shot.propRefs,
        });
        if (shot.editorialShotId !== expectedId)
          context.addIssue({
            code: "custom",
            path: [
              "episode",
              "sequences",
              sequenceIndex,
              "scenes",
              sceneIndex,
              "editorialShots",
              shotIndex,
              "editorialShotId",
            ],
            message:
              "Editorial shot ID does not match its proposal-local semantics.",
          });
      });
    }),
  );
});

export type EditorialDirectorProposalV1 = z.infer<
  typeof editorialDirectorProposalV1Schema
>;

const requireMember = (
  values: ReadonlySet<string>,
  value: string,
  label: string,
) => {
  if (!values.has(value))
    throw new Error(`Foreign editorial ${label} ${value}.`);
};

const requireVocabulary = (
  values: readonly string[],
  value: string,
  label: string,
) => {
  if (!values.includes(value))
    throw new Error(
      `Editorial ${label} ${value} is outside request vocabulary.`,
    );
};

export function bindEditorialDirectorProposalV1(input: {
  request: EditorialPlanningRequest;
  externalIntent: ExternalEditorialIntentDraft;
}): EditorialDirectorProposalV1 {
  const request = editorialPlanningRequestSchema.parse(input.request);
  const parsedIntent = externalEditorialIntentDraftSchema.parse(
    input.externalIntent,
  );
  if (parsedIntent.requestContentHash !== request.contentHash)
    throw new Error("External editorial intent targets a stale request.");
  if (parsedIntent.episode.episodeRef !== request.episode.episodeRef)
    throw new Error("External editorial intent targets a foreign episode.");
  const intent = canonicalizeExternalIntent(parsedIntent);
  if (intent.episode.sequences.length !== request.episode.sequences.length)
    throw new Error(
      "External editorial intent must preserve sequence coverage.",
    );

  const sequences = intent.episode.sequences.map((sequence, sequenceIndex) => {
    const requestSequence = request.episode.sequences[sequenceIndex]!;
    if (sequence.sequenceRef !== requestSequence.sequenceRef)
      throw new Error("External editorial sequence order or identity changed.");
    if (sequence.scenes.length !== requestSequence.scenes.length)
      throw new Error("External editorial intent must cover every scene.");
    const scenes = sequence.scenes.map((scene, sceneIndex) => {
      const requestScene = requestSequence.scenes[sceneIndex]!;
      if (scene.sceneRef !== requestScene.sceneRef)
        throw new Error("External editorial scene order or identity changed.");
      if (scene.beats.length !== requestScene.beats.length)
        throw new Error(
          "External editorial intent must preserve every beat row.",
        );
      if (scene.editorialShots.length > request.maximumShotsPerScene)
        throw new Error("External editorial scene exceeds its shot bound.");
      requireVocabulary(
        request.allowedVocabulary.energyShapes,
        scene.energyShape,
        "energy shape",
      );
      const beatIndexByRef = new Map(
        requestScene.beats.map((beat, index) => [beat.beatRef, index] as const),
      );
      const actionRefByBeat = new Map(
        requestScene.beats.map(
          (beat) => [beat.beatRef, beat.causalActionRef] as const,
        ),
      );
      const subjectRefs = new Set(
        requestScene.subjects.map((subject) => subject.subjectRef),
      );
      const propRefs = new Set(requestScene.props.map((prop) => prop.propRef));
      const capabilityByRef = new Map(
        requestScene.capabilities.map(
          (capability) => [capability.capabilityRef, capability] as const,
        ),
      );
      const stageByRef = new Map(
        requestScene.stages.map((stage) => [stage.stageRef, stage] as const),
      );
      let previousFirstBeatIndex = -1;
      let previousLastBeatIndex = -1;
      const editorialShots = scene.editorialShots.map((shot, shotIndex) => {
        if (shot.localOrdinal !== shotIndex)
          throw new Error(
            "Editorial shot order must be forward and contiguous.",
          );
        const beatIndexes = shot.beatRefs.map((beatRef) => {
          const beatIndex = beatIndexByRef.get(beatRef);
          if (beatIndex == null)
            throw new Error(`Foreign editorial beat ${beatRef}.`);
          return beatIndex;
        });
        if (
          beatIndexes.some(
            (beatIndex, index) => beatIndex !== beatIndexes[0]! + index,
          )
        )
          throw new Error(
            "Editorial shot beat refs must be forward and contiguous.",
          );
        const firstBeatIndex = beatIndexes[0]!;
        const lastBeatIndex = beatIndexes[beatIndexes.length - 1]!;
        if (
          firstBeatIndex < previousFirstBeatIndex ||
          lastBeatIndex < previousLastBeatIndex
        )
          throw new Error(
            "Editorial shots must preserve nondecreasing first and last source beat order.",
          );
        previousFirstBeatIndex = firstBeatIndex;
        previousLastBeatIndex = lastBeatIndex;
        const stage = stageByRef.get(shot.stageRef);
        if (!stage)
          throw new Error(`Foreign editorial stage ${shot.stageRef}.`);
        if (shot.cameraAxisRef !== stage.cameraAxisRef)
          throw new Error(
            "Editorial camera axis is not owned by the selected stage.",
          );
        const landmarkRefs = new Set(
          stage.landmarks.map((landmark) => landmark.landmarkRef),
        );
        const depthIndexByRef = new Map(
          stage.depthPlanes.map(
            (plane, index) => [plane.depthPlaneRef, index] as const,
          ),
        );
        const occluderRefs = new Set(
          stage.occluders.map((occluder) => occluder.occluderRef),
        );
        const validGazeRefs = new Set([
          ...subjectRefs,
          ...propRefs,
          ...landmarkRefs,
        ]);
        shot.subjectBlocking.forEach((blocking) => {
          requireMember(subjectRefs, blocking.subjectRef, "subject ref");
          requireMember(
            landmarkRefs,
            blocking.entryLandmarkRef,
            "entry landmark ref",
          );
          requireMember(
            landmarkRefs,
            blocking.exitLandmarkRef,
            "exit landmark ref",
          );
          if (blocking.gazeTargetRef)
            requireMember(
              validGazeRefs,
              blocking.gazeTargetRef,
              "gaze target ref",
            );
        });
        if (
          new Set(shot.subjectBlocking.map((blocking) => blocking.subjectRef))
            .size !== shot.subjectBlocking.length
        )
          throw new Error(
            "Editorial subject blocking must be unique per subject.",
          );
        if (
          shot.subjectBlocking.length === 0 &&
          (shot.coverageRole === "primary-performance" ||
            shot.coverageRole === "listener-reaction" ||
            shot.purpose.primaryPurpose === "feel")
        )
          throw new Error(
            "Editorial performance, listener reaction, and feeling shots require a blocked subject.",
          );
        if (
          shot.subjectBlocking.length === 0 &&
          shot.requestedCapabilityRefs.length > 0
        )
          throw new Error(
            "A subjectless editorial shot cannot request subject capabilities.",
          );
        shot.propRefs.forEach((propRef) =>
          requireMember(propRefs, propRef, "prop ref"),
        );
        const expectedActionRefs = canonicalSet(
          shot.beatRefs.map((beatRef) => actionRefByBeat.get(beatRef)!),
        );
        if (!same(shot.causalActionRefs, expectedActionRefs))
          throw new Error(
            "Editorial causal action refs must equal the canonical action set of every covered beat.",
          );
        const depthIndexes = shot.compositionIntent.depthPlaneRefs.map(
          (depthPlaneRef) => {
            const depthIndex = depthIndexByRef.get(depthPlaneRef);
            if (depthIndex == null)
              throw new Error(
                `Foreign editorial depth plane ref ${depthPlaneRef}.`,
              );
            return depthIndex;
          },
        );
        if (new Set(depthIndexes).size < 3)
          throw new Error(
            "Editorial composition requires three distinct depth layers.",
          );
        if (
          depthIndexes.some(
            (depthIndex, index) =>
              index > 0 && depthIndex <= depthIndexes[index - 1]!,
          )
        )
          throw new Error(
            "Editorial depth layers must remain ordered far to near.",
          );
        shot.compositionIntent.foregroundOccluderRefs.forEach((occluderRef) =>
          requireMember(occluderRefs, occluderRef, "foreground occluder ref"),
        );
        shot.requestedCapabilityRefs.forEach((capabilityRef) => {
          const capability = capabilityByRef.get(capabilityRef);
          if (!capability)
            throw new Error(
              `Foreign editorial capability ref ${capabilityRef}.`,
            );
          if (
            !shot.subjectBlocking.some(
              (blocking) => blocking.subjectRef === capability.ownerSubjectRef,
            )
          )
            throw new Error(
              `Editorial capability ${capabilityRef} is not owned by a blocked subject.`,
            );
        });
        requireVocabulary(
          request.allowedVocabulary.coverageRoles,
          shot.coverageRole,
          "coverage role",
        );
        requireVocabulary(
          request.allowedVocabulary.shotSizes,
          shot.shotSize,
          "shot size",
        );
        requireVocabulary(
          stage.permittedShotSizes,
          shot.shotSize,
          "stage shot size",
        );
        requireVocabulary(
          request.allowedVocabulary.cameraAngles,
          shot.cameraAngle,
          "camera angle",
        );
        requireVocabulary(
          request.allowedVocabulary.cameraMovements,
          shot.cameraIntent.movement,
          "camera movement",
        );
        requireVocabulary(
          request.allowedVocabulary.transitionKinds,
          shot.transitionIntent.kind,
          "transition kind",
        );
        return {
          ...shot,
          editorialShotId: deriveEditorialShotId({
            sceneRef: scene.sceneRef,
            localOrdinal: shot.localOrdinal,
            beatRefs: shot.beatRefs,
            coverageRole: shot.coverageRole,
            stageRef: shot.stageRef,
            subjectRefs: shot.subjectBlocking.map(
              (blocking) => blocking.subjectRef,
            ),
            propRefs: shot.propRefs,
          }),
        };
      });
      const shotsByOrdinal = new Map(
        editorialShots.map((shot) => [shot.localOrdinal, shot] as const),
      );
      const coverageCounts = new Map<string, number>();
      const beats = scene.beats.map((beatCoverage, beatIndex) => {
        const requestBeat = requestScene.beats[beatIndex]!;
        if (beatCoverage.beatRef !== requestBeat.beatRef)
          throw new Error("External editorial beat order or identity changed.");
        const sourceEditorialShotIds = beatCoverage.editorialShotOrdinals.map(
          (ordinal) => {
            const shot = shotsByOrdinal.get(ordinal);
            if (!shot || !shot.beatRefs.includes(beatCoverage.beatRef))
              throw new Error("Beat-to-shot coverage is not reciprocal.");
            return shot.editorialShotId;
          },
        );
        const reciprocalOrdinals = editorialShots
          .filter((shot) => shot.beatRefs.includes(beatCoverage.beatRef))
          .map((shot) => shot.localOrdinal);
        if (!same(beatCoverage.editorialShotOrdinals, reciprocalOrdinals))
          throw new Error("Beat-to-shot coverage is not exact and reciprocal.");
        coverageCounts.set(beatCoverage.beatRef, sourceEditorialShotIds.length);
        return { beatRef: beatCoverage.beatRef, sourceEditorialShotIds };
      });
      requestScene.beats.forEach((beat) => {
        const count = coverageCounts.get(beat.beatRef) ?? 0;
        if (count === 0)
          throw new Error(`Editorial plan omits beat ${beat.beatRef}.`);
        if (count > request.maximumCoveragePerBeat)
          throw new Error(
            `Editorial beat ${beat.beatRef} exceeds its coverage bound.`,
          );
      });
      return {
        sceneRef: scene.sceneRef,
        energyShape: scene.energyShape,
        beats,
        editorialShots,
      };
    });
    return { sequenceRef: sequence.sequenceRef, scenes };
  });

  const draft = {
    schemaVersion: "1.0" as const,
    authority: "editorial-pilot-diagnostic-only" as const,
    productionBindable: false as const,
    requestContentHash: request.contentHash,
    externalIntentContentHash: hashCanonical(intent),
    episode: {
      episodeRef: intent.episode.episodeRef,
      sequences,
    },
  };
  return editorialDirectorProposalV1Schema.parse(seal(draft));
}

const externalIntentFromProposal = (
  proposal: EditorialDirectorProposalV1,
): ExternalEditorialIntentDraft => ({
  schemaVersion: "0.2-pilot",
  requestContentHash: proposal.requestContentHash,
  episode: {
    episodeRef: proposal.episode.episodeRef,
    sequences: proposal.episode.sequences.map((sequence) => ({
      sequenceRef: sequence.sequenceRef,
      scenes: sequence.scenes.map((scene) => ({
        sceneRef: scene.sceneRef,
        energyShape: scene.energyShape,
        beats: scene.beats.map((beat) => ({
          beatRef: beat.beatRef,
          editorialShotOrdinals: beat.sourceEditorialShotIds.map(
            (shotId) =>
              scene.editorialShots.find(
                (shot) => shot.editorialShotId === shotId,
              )!.localOrdinal,
          ),
        })),
        editorialShots: scene.editorialShots.map((boundShot) => {
          const { editorialShotId, ...shot } = boundShot;
          void editorialShotId;
          return shot;
        }),
      })),
    })),
  },
});

export function assertEditorialProposalMatchesRequest(input: {
  request: EditorialPlanningRequest;
  proposal: EditorialDirectorProposalV1;
}): EditorialDirectorProposalV1 {
  const request = editorialPlanningRequestSchema.parse(input.request);
  const proposal = editorialDirectorProposalV1Schema.parse(input.proposal);
  if (proposal.requestContentHash !== request.contentHash)
    throw new Error("Editorial proposal has a stale request binding.");
  const rebound = bindEditorialDirectorProposalV1({
    request,
    externalIntent: externalIntentFromProposal(proposal),
  });
  if (!same(proposal, rebound))
    throw new Error(
      "Editorial proposal does not match its exact request-bound external intent.",
    );
  return proposal;
}

export function restoreEditorialDirectorProposalV1(input: {
  serialized: string;
  request: EditorialPlanningRequest;
}): EditorialDirectorProposalV1 {
  const restored = editorialDirectorProposalV1Schema.parse(
    JSON.parse(input.serialized),
  );
  return assertEditorialProposalMatchesRequest({
    request: input.request,
    proposal: restored,
  });
}

export const sourceEditorialShotLineageSchema = z
  .object({
    sourceEditorialProposalContentHash: hashSchema,
    sourceEditorialShotId: identifierSchema,
  })
  .strict();

export type SourceEditorialShotLineage = z.infer<
  typeof sourceEditorialShotLineageSchema
>;

export function createSourceEditorialShotLineage(input: {
  request: EditorialPlanningRequest;
  proposal: EditorialDirectorProposalV1;
  editorialShotId: string;
}): SourceEditorialShotLineage {
  const proposal = assertEditorialProposalMatchesRequest({
    request: input.request,
    proposal: input.proposal,
  });
  const exists = proposal.episode.sequences.some((sequence) =>
    sequence.scenes.some((scene) =>
      scene.editorialShots.some(
        (shot) => shot.editorialShotId === input.editorialShotId,
      ),
    ),
  );
  if (!exists) throw new Error("Unknown source editorial shot ID.");
  return sourceEditorialShotLineageSchema.parse({
    sourceEditorialProposalContentHash: proposal.contentHash,
    sourceEditorialShotId: input.editorialShotId,
  });
}

const editorialExternalPlanningAttemptReceiptFields = {
  schemaVersion: z.literal("1.0"),
  authority: z.literal("editorial-planning-external-attempt-provenance"),
  productionBindable: z.literal(false),
  requestContentHash: hashSchema,
  runSpecContentHash: hashSchema,
  lane: z.literal("external-candidate"),
  providerId: identifierSchema,
  modelId: identifierSchema,
  modelVersion: z.string().trim().min(1).max(120),
  promptTemplateContentHash: hashSchema,
  contextContentHashes: z.array(hashSchema),
  rawResponseContentHash: hashSchema,
  startedAt: z.string().datetime(),
  completedAt: z.string().datetime(),
};

export const editorialExternalPlanningAttemptReceiptSchema = sealedSchema(
  editorialExternalPlanningAttemptReceiptFields,
  "Editorial external planning attempt receipt hash is invalid.",
).superRefine((receipt, context) => {
  unique(
    receipt.contextContentHashes,
    ["contextContentHashes"],
    "context content hash",
    context,
  );
  if (Date.parse(receipt.completedAt) < Date.parse(receipt.startedAt))
    context.addIssue({
      code: "custom",
      path: ["completedAt"],
      message: "Editorial planning completion cannot precede its start.",
    });
});

export type EditorialExternalPlanningAttemptReceipt = z.infer<
  typeof editorialExternalPlanningAttemptReceiptSchema
>;

export function sealEditorialExternalPlanningAttemptReceipt(input: {
  request: EditorialPlanningRequest;
  runSpec: EditorialPlanningRunSpec;
  providerId: string;
  modelId: string;
  modelVersion: string;
  promptTemplateContentHash: string;
  contextContentHashes: readonly string[];
  rawResponseContentHash: string;
  startedAt: string;
  completedAt: string;
}): EditorialExternalPlanningAttemptReceipt {
  const request = editorialPlanningRequestSchema.parse(input.request);
  const runSpec = assertEditorialPlanningRunSpecMatchesRequest({
    request,
    runSpec: input.runSpec,
  });
  if (runSpec.lane !== "external-candidate")
    throw new Error(
      "External planning attempt receipts require the external-candidate lane.",
    );
  const draft = {
    schemaVersion: "1.0" as const,
    authority: "editorial-planning-external-attempt-provenance" as const,
    productionBindable: false as const,
    requestContentHash: request.contentHash,
    runSpecContentHash: runSpec.contentHash,
    lane: "external-candidate" as const,
    providerId: identifierSchema.parse(input.providerId),
    modelId: identifierSchema.parse(input.modelId),
    modelVersion: input.modelVersion,
    promptTemplateContentHash: hashSchema.parse(
      input.promptTemplateContentHash,
    ),
    contextContentHashes: sortedUnique(
      input.contextContentHashes,
      "Invocation context hash",
    ),
    rawResponseContentHash: hashSchema.parse(input.rawResponseContentHash),
    startedAt: input.startedAt,
    completedAt: input.completedAt,
  };
  return editorialExternalPlanningAttemptReceiptSchema.parse(seal(draft));
}

export function restoreEditorialExternalPlanningAttemptReceipt(input: {
  serialized: string;
  request: EditorialPlanningRequest;
  runSpec: EditorialPlanningRunSpec;
}): EditorialExternalPlanningAttemptReceipt {
  const restored = editorialExternalPlanningAttemptReceiptSchema.parse(
    JSON.parse(input.serialized),
  );
  const expected = sealEditorialExternalPlanningAttemptReceipt({
    request: input.request,
    runSpec: input.runSpec,
    providerId: restored.providerId,
    modelId: restored.modelId,
    modelVersion: restored.modelVersion,
    promptTemplateContentHash: restored.promptTemplateContentHash,
    contextContentHashes: restored.contextContentHashes,
    rawResponseContentHash: restored.rawResponseContentHash,
    startedAt: restored.startedAt,
    completedAt: restored.completedAt,
  });
  if (!same(restored, expected))
    throw new Error(
      "External attempt receipt does not restore against exact artifacts.",
    );
  return restored;
}

const editorialHeuristicPlanningAttemptReceiptFields = {
  schemaVersion: z.literal("1.0"),
  authority: z.literal("editorial-planning-heuristic-attempt-provenance"),
  productionBindable: z.literal(false),
  requestContentHash: hashSchema,
  runSpecContentHash: hashSchema,
  lane: z.literal("heuristic-control"),
  plannerId: identifierSchema,
  plannerVersion: z.string().trim().min(1).max(120),
  rawIntentContentHash: hashSchema,
};

export const editorialHeuristicPlanningAttemptReceiptSchema = sealedSchema(
  editorialHeuristicPlanningAttemptReceiptFields,
  "Editorial heuristic planning attempt receipt hash is invalid.",
);

export type EditorialHeuristicPlanningAttemptReceipt = z.infer<
  typeof editorialHeuristicPlanningAttemptReceiptSchema
>;

export function sealEditorialHeuristicPlanningAttemptReceipt(input: {
  request: EditorialPlanningRequest;
  runSpec: EditorialPlanningRunSpec;
  plannerId: string;
  plannerVersion: string;
  rawIntentContentHash: string;
}): EditorialHeuristicPlanningAttemptReceipt {
  const request = editorialPlanningRequestSchema.parse(input.request);
  const runSpec = assertEditorialPlanningRunSpecMatchesRequest({
    request,
    runSpec: input.runSpec,
  });
  if (runSpec.lane !== "heuristic-control")
    throw new Error(
      "Heuristic planning attempt receipts require the heuristic-control lane.",
    );
  const draft = {
    schemaVersion: "1.0" as const,
    authority: "editorial-planning-heuristic-attempt-provenance" as const,
    productionBindable: false as const,
    requestContentHash: request.contentHash,
    runSpecContentHash: runSpec.contentHash,
    lane: "heuristic-control" as const,
    plannerId: identifierSchema.parse(input.plannerId),
    plannerVersion: input.plannerVersion,
    rawIntentContentHash: hashSchema.parse(input.rawIntentContentHash),
  };
  return editorialHeuristicPlanningAttemptReceiptSchema.parse(seal(draft));
}

export function restoreEditorialHeuristicPlanningAttemptReceipt(input: {
  serialized: string;
  request: EditorialPlanningRequest;
  runSpec: EditorialPlanningRunSpec;
}): EditorialHeuristicPlanningAttemptReceipt {
  const restored = editorialHeuristicPlanningAttemptReceiptSchema.parse(
    JSON.parse(input.serialized),
  );
  const expected = sealEditorialHeuristicPlanningAttemptReceipt({
    request: input.request,
    runSpec: input.runSpec,
    plannerId: restored.plannerId,
    plannerVersion: restored.plannerVersion,
    rawIntentContentHash: restored.rawIntentContentHash,
  });
  if (!same(restored, expected))
    throw new Error(
      "Heuristic receipt does not restore against exact artifacts.",
    );
  return restored;
}

const editorialManualPlanningAttemptReceiptFields = {
  schemaVersion: z.literal("1.0"),
  authority: z.literal("editorial-planning-manual-attempt-authorship"),
  productionBindable: z.literal(false),
  requestContentHash: hashSchema,
  runSpecContentHash: hashSchema,
  lane: z.literal("manual-candidate"),
  authorId: identifierSchema,
  authorshipEvidenceContentHash: hashSchema,
  rawIntentContentHash: hashSchema,
};

export const editorialManualPlanningAttemptReceiptSchema = sealedSchema(
  editorialManualPlanningAttemptReceiptFields,
  "Editorial manual planning attempt receipt hash is invalid.",
);

export type EditorialManualPlanningAttemptReceipt = z.infer<
  typeof editorialManualPlanningAttemptReceiptSchema
>;

export function sealEditorialManualPlanningAttemptReceipt(input: {
  request: EditorialPlanningRequest;
  runSpec: EditorialPlanningRunSpec;
  authorId: string;
  authorshipEvidenceContentHash: string;
  rawIntentContentHash: string;
}): EditorialManualPlanningAttemptReceipt {
  const request = editorialPlanningRequestSchema.parse(input.request);
  const runSpec = assertEditorialPlanningRunSpecMatchesRequest({
    request,
    runSpec: input.runSpec,
  });
  if (runSpec.lane !== "manual-candidate")
    throw new Error(
      "Manual planning attempt receipts require the manual-candidate lane.",
    );
  const draft = {
    schemaVersion: "1.0" as const,
    authority: "editorial-planning-manual-attempt-authorship" as const,
    productionBindable: false as const,
    requestContentHash: request.contentHash,
    runSpecContentHash: runSpec.contentHash,
    lane: "manual-candidate" as const,
    authorId: identifierSchema.parse(input.authorId),
    authorshipEvidenceContentHash: hashSchema.parse(
      input.authorshipEvidenceContentHash,
    ),
    rawIntentContentHash: hashSchema.parse(input.rawIntentContentHash),
  };
  return editorialManualPlanningAttemptReceiptSchema.parse(seal(draft));
}

export function restoreEditorialManualPlanningAttemptReceipt(input: {
  serialized: string;
  request: EditorialPlanningRequest;
  runSpec: EditorialPlanningRunSpec;
}): EditorialManualPlanningAttemptReceipt {
  const restored = editorialManualPlanningAttemptReceiptSchema.parse(
    JSON.parse(input.serialized),
  );
  const expected = sealEditorialManualPlanningAttemptReceipt({
    request: input.request,
    runSpec: input.runSpec,
    authorId: restored.authorId,
    authorshipEvidenceContentHash: restored.authorshipEvidenceContentHash,
    rawIntentContentHash: restored.rawIntentContentHash,
  });
  if (!same(restored, expected))
    throw new Error("Manual receipt does not restore against exact artifacts.");
  return restored;
}

export const editorialPlanningAttemptReceiptSchema = z.union([
  editorialHeuristicPlanningAttemptReceiptSchema,
  editorialExternalPlanningAttemptReceiptSchema,
  editorialManualPlanningAttemptReceiptSchema,
]);

export type EditorialPlanningAttemptReceipt = z.infer<
  typeof editorialPlanningAttemptReceiptSchema
>;

export function assertEditorialPlanningAttemptReceiptMatchesArtifacts(input: {
  request: EditorialPlanningRequest;
  runSpec: EditorialPlanningRunSpec;
  attemptReceipt: EditorialPlanningAttemptReceipt;
}): EditorialPlanningAttemptReceipt {
  const request = editorialPlanningRequestSchema.parse(input.request);
  const runSpec = assertEditorialPlanningRunSpecMatchesRequest({
    request,
    runSpec: input.runSpec,
  });
  const receipt = editorialPlanningAttemptReceiptSchema.parse(
    input.attemptReceipt,
  );
  if (
    receipt.requestContentHash !== request.contentHash ||
    receipt.runSpecContentHash !== runSpec.contentHash
  )
    throw new Error(
      "Planning attempt receipt is stale for its exact artifacts.",
    );
  if (receipt.lane !== runSpec.lane)
    throw new Error(
      "Planning attempt receipt lane does not match its run spec.",
    );
  return receipt;
}

const editorialProposalBindingReceiptFields = {
  schemaVersion: z.literal("1.0"),
  authority: z.literal("editorial-planning-proposal-binding-provenance"),
  productionBindable: z.literal(false),
  requestContentHash: hashSchema,
  runSpecContentHash: hashSchema,
  lane: editorialPlanningLaneSchema,
  attemptReceiptContentHash: hashSchema,
  externalIntentContentHash: hashSchema,
  proposalContentHash: hashSchema,
};

export const editorialProposalBindingReceiptSchema = sealedSchema(
  editorialProposalBindingReceiptFields,
  "Editorial proposal binding receipt hash is invalid.",
);

export type EditorialProposalBindingReceipt = z.infer<
  typeof editorialProposalBindingReceiptSchema
>;

export function sealEditorialProposalBindingReceipt(input: {
  request: EditorialPlanningRequest;
  runSpec: EditorialPlanningRunSpec;
  attemptReceipt: EditorialPlanningAttemptReceipt;
  proposal: EditorialDirectorProposalV1;
}): EditorialProposalBindingReceipt {
  const request = editorialPlanningRequestSchema.parse(input.request);
  const runSpec = assertEditorialPlanningRunSpecMatchesRequest({
    request,
    runSpec: input.runSpec,
  });
  const attemptReceipt = assertEditorialPlanningAttemptReceiptMatchesArtifacts({
    request,
    runSpec,
    attemptReceipt: input.attemptReceipt,
  });
  const proposal = assertEditorialProposalMatchesRequest({
    request,
    proposal: input.proposal,
  });
  if (
    "rawIntentContentHash" in attemptReceipt &&
    attemptReceipt.rawIntentContentHash !== proposal.externalIntentContentHash
  )
    throw new Error(
      "Planning attempt raw intent does not match its bound proposal.",
    );
  const draft = {
    schemaVersion: "1.0" as const,
    authority: "editorial-planning-proposal-binding-provenance" as const,
    productionBindable: false as const,
    requestContentHash: request.contentHash,
    runSpecContentHash: runSpec.contentHash,
    lane: runSpec.lane,
    attemptReceiptContentHash: attemptReceipt.contentHash,
    externalIntentContentHash: proposal.externalIntentContentHash,
    proposalContentHash: proposal.contentHash,
  };
  return editorialProposalBindingReceiptSchema.parse(seal(draft));
}

export function assertEditorialProposalBindingReceiptMatchesArtifacts(input: {
  request: EditorialPlanningRequest;
  runSpec: EditorialPlanningRunSpec;
  attemptReceipt: EditorialPlanningAttemptReceipt;
  proposal: EditorialDirectorProposalV1;
  proposalBindingReceipt: EditorialProposalBindingReceipt;
}): EditorialProposalBindingReceipt {
  const restored = editorialProposalBindingReceiptSchema.parse(
    input.proposalBindingReceipt,
  );
  const expected = sealEditorialProposalBindingReceipt({
    request: input.request,
    runSpec: input.runSpec,
    attemptReceipt: input.attemptReceipt,
    proposal: input.proposal,
  });
  if (!same(restored, expected))
    throw new Error(
      "Editorial proposal binding receipt does not match its exact artifacts.",
    );
  return restored;
}

export function restoreEditorialProposalBindingReceipt(input: {
  serialized: string;
  request: EditorialPlanningRequest;
  runSpec: EditorialPlanningRunSpec;
  attemptReceipt: EditorialPlanningAttemptReceipt;
  proposal: EditorialDirectorProposalV1;
}): EditorialProposalBindingReceipt {
  return assertEditorialProposalBindingReceiptMatchesArtifacts({
    request: input.request,
    runSpec: input.runSpec,
    attemptReceipt: input.attemptReceipt,
    proposal: input.proposal,
    proposalBindingReceipt: editorialProposalBindingReceiptSchema.parse(
      JSON.parse(input.serialized),
    ),
  });
}

export const editorialHardDiagnosticCodeSchema = z.enum([
  "schema-invalid",
  "stale-request",
  "foreign-reference",
  "coverage-invalid",
  "vocabulary-invalid",
  "continuity-invalid",
  "capability-invalid",
  "timing-budget-invalid",
]);

const editorialHardDiagnosticCodes = new Set<string>(
  editorialHardDiagnosticCodeSchema.options,
);

const editorialQualityDiagnosticCodeSchema = identifierSchema.refine(
  (code) => !editorialHardDiagnosticCodes.has(code),
  "Hard diagnostic codes are reserved for hard findings.",
);

const diagnosticFindingBase = {
  id: identifierSchema,
  message: z.string().trim().min(1).max(500),
};

const diagnosticFindingSchema = z.discriminatedUnion("severity", [
  z
    .object({
      ...diagnosticFindingBase,
      severity: z.literal("hard"),
      code: editorialHardDiagnosticCodeSchema,
    })
    .strict(),
  z
    .object({
      ...diagnosticFindingBase,
      severity: z.literal("warning"),
      code: editorialQualityDiagnosticCodeSchema,
    })
    .strict(),
  z
    .object({
      ...diagnosticFindingBase,
      severity: z.literal("information"),
      code: editorialQualityDiagnosticCodeSchema,
    })
    .strict(),
]);

const editorialPlanningDiagnosticsFields = {
  schemaVersion: z.literal("1.0"),
  authority: z.literal("editorial-planning-diagnostic-only"),
  productionBindable: z.literal(false),
  requestContentHash: hashSchema,
  proposalContentHash: hashSchema.nullable(),
  findings: z.array(diagnosticFindingSchema),
};

export const editorialPlanningDiagnosticsSchema = sealedSchema(
  editorialPlanningDiagnosticsFields,
  "Editorial planning diagnostics hash is invalid.",
).superRefine((diagnostics, context) =>
  unique(
    diagnostics.findings.map((finding) => finding.id),
    ["findings"],
    "diagnostic finding",
    context,
  ),
);

export type EditorialPlanningDiagnostics = z.infer<
  typeof editorialPlanningDiagnosticsSchema
>;

export function sealEditorialPlanningDiagnostics(input: {
  request: EditorialPlanningRequest;
  proposal: EditorialDirectorProposalV1 | null;
  findings: readonly z.infer<typeof diagnosticFindingSchema>[];
}): EditorialPlanningDiagnostics {
  const request = editorialPlanningRequestSchema.parse(input.request);
  const proposal = input.proposal
    ? assertEditorialProposalMatchesRequest({
        request,
        proposal: input.proposal,
      })
    : null;
  const findings = input.findings
    .map((finding) => diagnosticFindingSchema.parse(finding))
    .sort((left, right) => left.id.localeCompare(right.id));
  if (new Set(findings.map((finding) => finding.id)).size !== findings.length)
    throw new Error("Diagnostic finding IDs must be unique.");
  const draft = {
    schemaVersion: "1.0" as const,
    authority: "editorial-planning-diagnostic-only" as const,
    productionBindable: false as const,
    requestContentHash: request.contentHash,
    proposalContentHash: proposal?.contentHash ?? null,
    findings,
  };
  return editorialPlanningDiagnosticsSchema.parse(seal(draft));
}

const planningResultBase = {
  schemaVersion: z.literal("1.0"),
  authority: z.literal("editorial-pilot-diagnostic-only"),
  productionBindable: z.literal(false),
  requestContentHash: hashSchema,
  runSpecContentHash: hashSchema,
  attemptReceiptContentHash: hashSchema,
};

const acceptedResultFields = {
  ...planningResultBase,
  status: z.literal("accepted"),
  proposalContentHash: hashSchema,
  diagnosticsContentHash: hashSchema,
  proposalBindingReceiptContentHash: hashSchema,
  revisionRound: z.union([z.literal(0), z.literal(1)]),
  fallbackUsed: z.literal(false),
  contentHash: hashSchema,
};

const rejectedResultFields = {
  ...planningResultBase,
  status: z.literal("rejected"),
  rejectedProposalContentHash: hashSchema.nullable(),
  rejectedIntentContentHash: hashSchema.nullable(),
  diagnosticsContentHash: hashSchema,
  proposalBindingReceiptContentHash: hashSchema.nullable(),
  reasonCodes: z
    .array(
      z.enum([
        "schema-invalid",
        "stale-request",
        "foreign-reference",
        "coverage-invalid",
        "vocabulary-invalid",
        "continuity-invalid",
        "capability-invalid",
        "timing-budget-invalid",
        "quality-revision-exhausted",
      ]),
    )
    .min(1),
  revisionRound: z.union([z.literal(0), z.literal(1)]),
  fallbackUsed: z.literal(false),
  contentHash: hashSchema,
};

const revisionResultFields = {
  ...planningResultBase,
  status: z.literal("revision"),
  priorProposalContentHash: hashSchema,
  qualityDiagnosticsContentHash: hashSchema,
  addressedFindingIds: z.array(identifierSchema).min(1),
  successorProposalContentHash: hashSchema,
  successorProposalBindingReceiptContentHash: hashSchema,
  revisionRound: z.literal(1),
  fallbackUsed: z.literal(false),
  contentHash: hashSchema,
};

export const editorialPlanningResultSchema = z
  .discriminatedUnion("status", [
    z.object(acceptedResultFields).strict(),
    z.object(rejectedResultFields).strict(),
    z.object(revisionResultFields).strict(),
  ])
  .superRefine((result, context) => {
    const { contentHash, ...draft } = result;
    if (hashCanonical(draft) !== contentHash)
      context.addIssue({
        code: "custom",
        path: ["contentHash"],
        message: "Editorial planning result hash is invalid.",
      });
    if (
      result.status === "revision" &&
      result.priorProposalContentHash === result.successorProposalContentHash
    )
      context.addIssue({
        code: "custom",
        path: ["successorProposalContentHash"],
        message: "Editorial revision must create a new proposal.",
      });
  });

export type EditorialPlanningResult = z.infer<
  typeof editorialPlanningResultSchema
>;

const assertAttemptReceipt = (
  attemptReceipt: EditorialPlanningAttemptReceipt,
  request: EditorialPlanningRequest,
  runSpec: EditorialPlanningRunSpec,
) => {
  if (!attemptReceipt)
    throw new Error("Every editorial planning result requires a lane receipt.");
  return assertEditorialPlanningAttemptReceiptMatchesArtifacts({
    request,
    runSpec,
    attemptReceipt,
  });
};

const assertProposalBindingReceipt = (
  proposalBindingReceipt: EditorialProposalBindingReceipt,
  request: EditorialPlanningRequest,
  runSpec: EditorialPlanningRunSpec,
  attemptReceipt: EditorialPlanningAttemptReceipt,
  proposal: EditorialDirectorProposalV1,
) => {
  if (!proposalBindingReceipt)
    throw new Error(
      "A bound editorial proposal requires an exact proposal binding receipt.",
    );
  return assertEditorialProposalBindingReceiptMatchesArtifacts({
    request,
    runSpec,
    attemptReceipt,
    proposal,
    proposalBindingReceipt,
  });
};

const assertDiagnostics = (
  diagnostics: EditorialPlanningDiagnostics,
  request: EditorialPlanningRequest,
  proposal: EditorialDirectorProposalV1 | null,
) => {
  const requestBoundProposal = proposal
    ? assertEditorialProposalMatchesRequest({ request, proposal })
    : null;
  const parsed = editorialPlanningDiagnosticsSchema.parse(diagnostics);
  if (
    parsed.requestContentHash !== request.contentHash ||
    parsed.proposalContentHash !== (requestBoundProposal?.contentHash ?? null)
  )
    throw new Error("Diagnostics are stale for their result artifacts.");
  return parsed;
};

export function sealEditorialAcceptedResult(input: {
  request: EditorialPlanningRequest;
  runSpec: EditorialPlanningRunSpec;
  proposal: EditorialDirectorProposalV1;
  diagnostics: EditorialPlanningDiagnostics;
  attemptReceipt: EditorialPlanningAttemptReceipt;
  proposalBindingReceipt: EditorialProposalBindingReceipt;
  revisionRound: 0 | 1;
}): EditorialPlanningResult {
  const request = editorialPlanningRequestSchema.parse(input.request);
  const runSpec = assertEditorialPlanningRunSpecMatchesRequest({
    request,
    runSpec: input.runSpec,
  });
  const proposal = assertEditorialProposalMatchesRequest({
    request,
    proposal: input.proposal,
  });
  const diagnostics = assertDiagnostics(input.diagnostics, request, proposal);
  if (diagnostics.findings.some((finding) => finding.severity === "hard"))
    throw new Error("A proposal with hard diagnostics cannot be accepted.");
  const attemptReceipt = assertAttemptReceipt(
    input.attemptReceipt,
    request,
    runSpec,
  );
  const proposalBindingReceipt = assertProposalBindingReceipt(
    input.proposalBindingReceipt,
    request,
    runSpec,
    attemptReceipt,
    proposal,
  );
  const draft = {
    schemaVersion: "1.0" as const,
    authority: "editorial-pilot-diagnostic-only" as const,
    productionBindable: false as const,
    requestContentHash: request.contentHash,
    runSpecContentHash: runSpec.contentHash,
    attemptReceiptContentHash: attemptReceipt.contentHash,
    status: "accepted" as const,
    proposalContentHash: proposal.contentHash,
    diagnosticsContentHash: diagnostics.contentHash,
    proposalBindingReceiptContentHash: proposalBindingReceipt.contentHash,
    revisionRound: input.revisionRound,
    fallbackUsed: false as const,
  };
  return editorialPlanningResultSchema.parse(seal(draft));
}

export function sealEditorialRejectedResult(input: {
  request: EditorialPlanningRequest;
  runSpec: EditorialPlanningRunSpec;
  rejectedProposal: EditorialDirectorProposalV1 | null;
  rejectedIntent: ExternalEditorialIntentDraft | null;
  diagnostics: EditorialPlanningDiagnostics;
  attemptReceipt: EditorialPlanningAttemptReceipt;
  proposalBindingReceipt: EditorialProposalBindingReceipt | null;
  reasonCodes: readonly z.infer<
    typeof rejectedResultFields.reasonCodes.element
  >[];
  revisionRound: 0 | 1;
}): EditorialPlanningResult {
  const request = editorialPlanningRequestSchema.parse(input.request);
  const runSpec = assertEditorialPlanningRunSpecMatchesRequest({
    request,
    runSpec: input.runSpec,
  });
  const proposal = input.rejectedProposal
    ? assertEditorialProposalMatchesRequest({
        request,
        proposal: input.rejectedProposal,
      })
    : null;
  const rejectedIntent = input.rejectedIntent
    ? externalEditorialIntentDraftSchema.parse(input.rejectedIntent)
    : null;
  const rejectedIntentContentHash = rejectedIntent
    ? hashCanonical(canonicalizeExternalIntent(rejectedIntent))
    : null;
  const attemptReceipt = assertAttemptReceipt(
    input.attemptReceipt,
    request,
    runSpec,
  );
  if (
    "rawIntentContentHash" in attemptReceipt &&
    attemptReceipt.rawIntentContentHash !== rejectedIntentContentHash
  )
    throw new Error(
      "Planning attempt raw intent does not match its rejected intent evidence.",
    );
  if (
    proposal &&
    rejectedIntentContentHash !== proposal.externalIntentContentHash
  )
    throw new Error("Rejected intent does not match the rejected proposal.");
  if (proposal && !rejectedIntent)
    throw new Error("A rejected proposal must retain its exact bound intent.");
  const schemaInvalid = input.reasonCodes.includes("schema-invalid");
  if (schemaInvalid && rejectedIntent)
    throw new Error(
      "A schema-invalid raw response cannot claim parsed intent evidence.",
    );
  if (!rejectedIntent && !schemaInvalid)
    throw new Error(
      "A rejection without parsed intent evidence must be schema-invalid.",
    );
  const diagnostics = assertDiagnostics(input.diagnostics, request, proposal);
  if (!proposal && input.proposalBindingReceipt)
    throw new Error(
      "A pre-proposal rejection cannot carry a proposal binding receipt.",
    );
  const proposalBindingReceipt = proposal
    ? assertProposalBindingReceipt(
        input.proposalBindingReceipt!,
        request,
        runSpec,
        attemptReceipt,
        proposal,
      )
    : null;
  const draft = {
    schemaVersion: "1.0" as const,
    authority: "editorial-pilot-diagnostic-only" as const,
    productionBindable: false as const,
    requestContentHash: request.contentHash,
    runSpecContentHash: runSpec.contentHash,
    attemptReceiptContentHash: attemptReceipt.contentHash,
    status: "rejected" as const,
    rejectedProposalContentHash: proposal?.contentHash ?? null,
    rejectedIntentContentHash,
    diagnosticsContentHash: diagnostics.contentHash,
    proposalBindingReceiptContentHash:
      proposalBindingReceipt?.contentHash ?? null,
    reasonCodes: canonicalSet(input.reasonCodes),
    revisionRound: input.revisionRound,
    fallbackUsed: false as const,
  };
  return editorialPlanningResultSchema.parse(seal(draft));
}

export function sealEditorialRevisionResult(input: {
  request: EditorialPlanningRequest;
  runSpec: EditorialPlanningRunSpec;
  priorProposal: EditorialDirectorProposalV1;
  qualityDiagnostics: EditorialPlanningDiagnostics;
  addressedFindingIds: readonly string[];
  successorProposal: EditorialDirectorProposalV1;
  successorAttemptReceipt: EditorialPlanningAttemptReceipt;
  successorProposalBindingReceipt: EditorialProposalBindingReceipt;
}): EditorialPlanningResult {
  const request = editorialPlanningRequestSchema.parse(input.request);
  const runSpec = assertEditorialPlanningRunSpecMatchesRequest({
    request,
    runSpec: input.runSpec,
  });
  const prior = assertEditorialProposalMatchesRequest({
    request,
    proposal: input.priorProposal,
  });
  const successor = assertEditorialProposalMatchesRequest({
    request,
    proposal: input.successorProposal,
  });
  const diagnostics = assertDiagnostics(
    input.qualityDiagnostics,
    request,
    prior,
  );
  const findingIds = new Set(diagnostics.findings.map((finding) => finding.id));
  const addressedFindingIds = sortedUnique(
    input.addressedFindingIds,
    "Addressed finding ID",
  );
  addressedFindingIds.forEach((findingId) => {
    if (!findingIds.has(findingId))
      throw new Error(`Revision addresses unknown finding ${findingId}.`);
  });
  const successorAttemptReceipt = assertAttemptReceipt(
    input.successorAttemptReceipt,
    request,
    runSpec,
  );
  const successorProposalBindingReceipt = assertProposalBindingReceipt(
    input.successorProposalBindingReceipt,
    request,
    runSpec,
    successorAttemptReceipt,
    successor,
  );
  const draft = {
    schemaVersion: "1.0" as const,
    authority: "editorial-pilot-diagnostic-only" as const,
    productionBindable: false as const,
    requestContentHash: request.contentHash,
    runSpecContentHash: runSpec.contentHash,
    attemptReceiptContentHash: successorAttemptReceipt.contentHash,
    status: "revision" as const,
    priorProposalContentHash: prior.contentHash,
    qualityDiagnosticsContentHash: diagnostics.contentHash,
    addressedFindingIds,
    successorProposalContentHash: successor.contentHash,
    successorProposalBindingReceiptContentHash:
      successorProposalBindingReceipt.contentHash,
    revisionRound: 1 as const,
    fallbackUsed: false as const,
  };
  return editorialPlanningResultSchema.parse(seal(draft));
}

export function sealEditorialFallbackResult(
  request: EditorialPlanningRequest,
  runSpec: EditorialPlanningRunSpec,
): never {
  const parsed = editorialPlanningRequestSchema.parse(request);
  const parsedRunSpec = assertEditorialPlanningRunSpecMatchesRequest({
    request: parsed,
    runSpec,
  });
  if (!parsed.fallbackAllowed || !parsedRunSpec.fallbackAllowed)
    throw new Error("Editorial fallback is forbidden for this pilot request.");
  throw new Error("No diagnostic-only fallback sealer is authorized.");
}

const missingAttemptReceipt = (resultKind: string): never => {
  throw new Error(
    `Editorial ${resultKind} result restore is missing its exact attempt receipt.`,
  );
};

const missingProposalBindingReceipt = (resultKind: string): never => {
  throw new Error(
    `Editorial ${resultKind} result restore is missing its exact proposal binding receipt.`,
  );
};

export function restoreEditorialPlanningResult(input: {
  serialized: string;
  request: EditorialPlanningRequest;
  runSpec: EditorialPlanningRunSpec;
  proposals: readonly EditorialDirectorProposalV1[];
  attemptReceipts: readonly EditorialPlanningAttemptReceipt[];
  proposalBindingReceipts: readonly EditorialProposalBindingReceipt[];
  diagnostics: readonly EditorialPlanningDiagnostics[];
  rejectedIntents?: readonly ExternalEditorialIntentDraft[];
}): EditorialPlanningResult {
  const restored = editorialPlanningResultSchema.parse(
    JSON.parse(input.serialized),
  );
  const request = editorialPlanningRequestSchema.parse(input.request);
  const runSpec = assertEditorialPlanningRunSpecMatchesRequest({
    request,
    runSpec: input.runSpec,
  });
  if (restored.runSpecContentHash !== runSpec.contentHash)
    throw new Error("Editorial planning result is stale for its run spec.");
  const proposals = input.proposals.map((proposal) =>
    assertEditorialProposalMatchesRequest({ request, proposal }),
  );
  const proposalByHash = new Map(
    proposals.map((proposal) => [proposal.contentHash, proposal] as const),
  );
  const attemptReceiptByHash = new Map(
    input.attemptReceipts.map(
      (receipt) => [receipt.contentHash, receipt] as const,
    ),
  );
  const proposalBindingReceiptByHash = new Map(
    input.proposalBindingReceipts.map(
      (receipt) => [receipt.contentHash, receipt] as const,
    ),
  );
  const diagnosticsByHash = new Map(
    input.diagnostics.map(
      (diagnostic) => [diagnostic.contentHash, diagnostic] as const,
    ),
  );
  let expected: EditorialPlanningResult;
  if (restored.status === "accepted") {
    const proposal = proposalByHash.get(restored.proposalContentHash);
    const diagnostics = diagnosticsByHash.get(restored.diagnosticsContentHash);
    if (!proposal || !diagnostics)
      throw new Error("Accepted result restore is missing bound artifacts.");
    expected = sealEditorialAcceptedResult({
      request,
      runSpec,
      proposal,
      diagnostics,
      attemptReceipt:
        attemptReceiptByHash.get(restored.attemptReceiptContentHash) ??
        missingAttemptReceipt("accepted"),
      proposalBindingReceipt:
        proposalBindingReceiptByHash.get(
          restored.proposalBindingReceiptContentHash,
        ) ?? missingProposalBindingReceipt("accepted"),
      revisionRound: restored.revisionRound,
    });
  } else if (restored.status === "rejected") {
    const proposal = restored.rejectedProposalContentHash
      ? (proposalByHash.get(restored.rejectedProposalContentHash) ?? null)
      : null;
    const intent = restored.rejectedIntentContentHash
      ? ((input.rejectedIntents ?? []).find(
          (candidate) =>
            hashCanonical(canonicalizeExternalIntent(candidate)) ===
            restored.rejectedIntentContentHash,
        ) ?? null)
      : null;
    const diagnostics = diagnosticsByHash.get(restored.diagnosticsContentHash);
    if (!diagnostics)
      throw new Error("Rejected result restore is missing diagnostics.");
    expected = sealEditorialRejectedResult({
      request,
      runSpec,
      rejectedProposal: proposal,
      rejectedIntent: intent,
      diagnostics,
      attemptReceipt:
        attemptReceiptByHash.get(restored.attemptReceiptContentHash) ??
        missingAttemptReceipt("rejected"),
      proposalBindingReceipt: restored.proposalBindingReceiptContentHash
        ? (proposalBindingReceiptByHash.get(
            restored.proposalBindingReceiptContentHash,
          ) ?? missingProposalBindingReceipt("rejected"))
        : null,
      reasonCodes: restored.reasonCodes,
      revisionRound: restored.revisionRound,
    });
  } else {
    const prior = proposalByHash.get(restored.priorProposalContentHash);
    const successor = proposalByHash.get(restored.successorProposalContentHash);
    const diagnostics = diagnosticsByHash.get(
      restored.qualityDiagnosticsContentHash,
    );
    if (!prior || !successor || !diagnostics)
      throw new Error("Revision result restore is missing bound artifacts.");
    expected = sealEditorialRevisionResult({
      request,
      runSpec,
      priorProposal: prior,
      qualityDiagnostics: diagnostics,
      addressedFindingIds: restored.addressedFindingIds,
      successorProposal: successor,
      successorAttemptReceipt:
        attemptReceiptByHash.get(restored.attemptReceiptContentHash) ??
        missingAttemptReceipt("revision successor"),
      successorProposalBindingReceipt:
        proposalBindingReceiptByHash.get(
          restored.successorProposalBindingReceiptContentHash,
        ) ?? missingProposalBindingReceipt("revision successor"),
    });
  }
  if (!same(restored, expected))
    throw new Error("Editorial planning result relational restore failed.");
  return restored;
}
