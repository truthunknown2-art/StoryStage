import { z } from "zod";
import { hashCanonical } from "../canonical-hash";
import { hashSchema, identifierSchema } from "../model";
import { directorWorldStateSchema } from "./world-state";
import { validateContinuityRules } from "./continuity-rules";

export const continuityMotionModeSchema = z.enum([
  "idle",
  "decelerating",
  "walking",
  "sneaking",
  "running",
  "turning",
  "reacting",
  "performing",
]);

export const continuityActionPhaseSchema = z.enum([
  "anticipation",
  "action",
  "impact",
  "reaction",
  "settle",
  "hold",
]);

export const continuityPerformanceStateSchema = z
  .object({
    entityId: identifierSchema,
    motionMode: continuityMotionModeSchema,
    actionPhase: continuityActionPhaseSchema,
    gaitPhase: z.number().min(0).max(1).nullable(),
    performanceProgramId: identifierSchema.nullable(),
    performanceProgramContentHash: hashSchema.nullable(),
  })
  .strict()
  .refine(
    (state) =>
      (state.performanceProgramId === null) ===
      (state.performanceProgramContentHash === null),
    {
      message:
        "Performance state program IDs and hashes must be bound together.",
    },
  );

export const continuityPerformanceSegmentSchema = z
  .object({
    entityId: identifierSchema,
    startFrame: z.number().int().nonnegative(),
    endFrameExclusive: z.number().int().positive(),
    motionMode: continuityMotionModeSchema,
    actionPhase: continuityActionPhaseSchema,
    gaitStart: z.number().min(0).max(1).nullable(),
    gaitAdvanceCycles: z.number().nonnegative().nullable(),
    performanceProgramId: identifierSchema.nullable(),
    performanceProgramContentHash: hashSchema.nullable(),
  })
  .strict()
  .refine((segment) => segment.endFrameExclusive > segment.startFrame, {
    message: "Performance segment end must follow its start.",
  })
  .superRefine((segment, context) => {
    const locomoting = [
      "walking",
      "sneaking",
      "running",
      "decelerating",
    ].includes(segment.motionMode);
    if (
      (segment.gaitStart === null) !==
      (segment.gaitAdvanceCycles === null)
    )
      context.addIssue({
        code: "custom",
        path: ["gaitStart"],
        message:
          "Performance segment gait start and unwrapped advance must both be present or both be null.",
      });
    if (
      (segment.performanceProgramId === null) !==
      (segment.performanceProgramContentHash === null)
    )
      context.addIssue({
        code: "custom",
        path: ["performanceProgramContentHash"],
        message:
          "Performance segment program IDs and hashes must be bound together.",
      });
    if (locomoting && segment.gaitStart === null)
      context.addIssue({
        code: "custom",
        path: ["gaitStart"],
        message:
          "Locomotion performance segments require an advancing gait phase.",
      });
    if (segment.motionMode === "idle" && segment.gaitStart !== null)
      context.addIssue({
        code: "custom",
        path: ["gaitStart"],
        message: "Idle performance segments cannot advance gait.",
      });
  });

const continuityVisemeCueSchema = z
  .object({
    startFrame: z.number().int().nonnegative(),
    endFrameExclusive: z.number().int().positive(),
    visemeId: identifierSchema,
  })
  .strict()
  .refine((cue) => cue.endFrameExclusive > cue.startFrame, {
    message: "Viseme cue end must follow its start.",
  });

export const continuityVisemeProgramSchema = z
  .object({
    id: identifierSchema,
    shotId: identifierSchema,
    entityId: identifierSchema,
    sourceLineId: identifierSchema,
    cues: z.array(continuityVisemeCueSchema).min(1),
    contentHash: hashSchema,
  })
  .strict()
  .superRefine((program, context) => {
    const { contentHash, ...draft } = program;
    if (hashCanonical(draft) !== contentHash)
      context.addIssue({
        code: "custom",
        path: ["contentHash"],
        message: "Continuity viseme program hash is invalid.",
      });
    program.cues.forEach((cue, index) => {
      const previous = program.cues[index - 1];
      if (previous && cue.startFrame < previous.endFrameExclusive)
        context.addIssue({
          code: "custom",
          path: ["cues", index],
          message: "Viseme cues must be ordered and non-overlapping.",
        });
    });
  });

const directorPictureEventSchema = z
  .object({
    source: z.literal("director-event"),
    eventId: identifierSchema,
    frame: z.number().int().nonnegative(),
    subjectIds: z.array(identifierSchema),
  })
  .strict();

const performancePictureEventSchema = z
  .object({
    source: z.literal("performance-event"),
    id: identifierSchema,
    parentDirectorEventId: identifierSchema,
    sourceProgramContentHash: hashSchema,
    frame: z.number().int().nonnegative(),
    subjectIds: z.array(identifierSchema).min(1),
    kind: z.enum([
      "deceleration",
      "foot-contact",
      "plant",
      "blink",
      "prop-contact",
      "prop-release",
    ]),
  })
  .strict();

export const continuityPictureEventSchema = z.discriminatedUnion("source", [
  directorPictureEventSchema,
  performancePictureEventSchema,
]);

export const continuityCameraStateSchema = z
  .object({
    axisId: identifierSchema,
    size: z.enum(["extreme-wide", "wide", "medium", "close-up", "insert"]),
    angle: z.enum([
      "eye-level",
      "low-angle",
      "high-angle",
      "overhead",
      "profile",
      "over-shoulder",
    ]),
    movement: z.enum(["locked", "pan", "track", "push", "pull", "reframe"]),
    subjectIds: z.array(identifierSchema).min(1),
    motivation: z.string().min(1),
    screenProjection: z
      .object({
        worldXDirection: z.union([z.literal(-1), z.literal(1)]),
        worldXOffset: z.number(),
      })
      .strict(),
  })
  .strict();

const continuityCameraKeyframeSchema = z
  .object({
    frame: z.number().int().nonnegative(),
    x: z.number(),
    y: z.number(),
    scale: z.number().positive(),
  })
  .strict();

const continuityTransitionKeyframeSchema = z
  .object({
    frame: z.number().int().nonnegative(),
    progress: z.number().min(0).max(1),
  })
  .strict();

const hashedContinuityProgram = <T extends z.ZodRawShape>(shape: T) =>
  z
    .object({ ...shape, contentHash: hashSchema })
    .strict()
    .superRefine((program, context) => {
      const { contentHash, ...draft } = program as Record<string, unknown> & {
        contentHash: string;
      };
      if (hashCanonical(draft) !== contentHash)
        context.addIssue({
          code: "custom",
          path: ["contentHash"],
          message: "Continuity program hash is invalid.",
        });
    });

export const continuityCameraProgramSchema = hashedContinuityProgram({
  id: identifierSchema,
  focalRegion: z.enum([
    "left-third",
    "center",
    "right-third",
    "upper-third",
    "lower-third",
  ]),
  keyframes: z.array(continuityCameraKeyframeSchema).min(2),
});

export const continuityTransitionProgramSchema = hashedContinuityProgram({
  id: identifierSchema,
  kind: z.enum([
    "hard-cut",
    "match-cut",
    "camera-carry",
    "foreground-wipe",
    "dissolve",
  ]),
  progressKeyframes: z.array(continuityTransitionKeyframeSchema).min(2),
  occluderId: identifierSchema.nullable(),
});

export const continuityShotStateSchema = z
  .object({
    shotId: identifierSchema,
    sceneId: identifierSchema,
    stageId: identifierSchema,
    beatIds: z.array(identifierSchema).min(1),
    startFrame: z.number().int().nonnegative(),
    endFrameExclusive: z.number().int().positive(),
    cutEventId: identifierSchema,
    camera: continuityCameraStateSchema,
    cameraProgram: continuityCameraProgramSchema,
    transitionProgram: continuityTransitionProgramSchema,
    entryWorldState: directorWorldStateSchema,
    exitWorldState: directorWorldStateSchema,
    entryPerformanceState: z.array(continuityPerformanceStateSchema).min(1),
    exitPerformanceState: z.array(continuityPerformanceStateSchema).min(1),
    performanceSegments: z.array(continuityPerformanceSegmentSchema).min(1),
    pictureEvents: z.array(continuityPictureEventSchema).min(1),
  })
  .strict()
  .refine((shot) => shot.endFrameExclusive > shot.startFrame, {
    message: "Continuity shot end must follow its start.",
  })
  .superRefine((shot, context) => {
    const entityIds = Object.keys(shot.entryWorldState.entities).sort();
    const segmentEntityIds = [
      ...new Set(shot.performanceSegments.map((segment) => segment.entityId)),
    ].sort();
    if (hashCanonical(entityIds) !== hashCanonical(segmentEntityIds))
      context.addIssue({
        code: "custom",
        path: ["performanceSegments"],
        message: "Performance segments must cover every continuity entity.",
      });
    entityIds.forEach((entityId) => {
      const segments = shot.performanceSegments
        .filter((segment) => segment.entityId === entityId)
        .sort((left, right) => left.startFrame - right.startFrame);
      if (
        segments[0]?.startFrame !== shot.startFrame ||
        segments.at(-1)?.endFrameExclusive !== shot.endFrameExclusive ||
        segments.some(
          (segment, index) =>
            index > 0 &&
            segment.startFrame !== segments[index - 1]!.endFrameExclusive,
        )
      )
        context.addIssue({
          code: "custom",
          path: ["performanceSegments"],
          message: `${entityId} performance segments must cover the shot without gaps or overlaps.`,
        });
      if (
        segments.some(
          (segment) =>
            segment.startFrame < shot.startFrame ||
            segment.endFrameExclusive > shot.endFrameExclusive,
        )
      )
        context.addIssue({
          code: "custom",
          path: ["performanceSegments"],
          message: `${entityId} performance segments must remain inside the shot.`,
        });
    });
  });

export const continuityTransitionLinkSchema = z
  .object({
    fromShotId: identifierSchema,
    toShotId: identifierSchema,
    cutEventId: identifierSchema,
    kind: z.enum([
      "hard-cut",
      "match-cut",
      "camera-carry",
      "foreground-wipe",
      "dissolve",
    ]),
    motivation: z.string().min(1),
    bridgeKind: z.enum([
      "none",
      "axis-reset-event",
      "portal-cross-event",
      "foreground-occlusion",
      "location-transition-event",
      "neutral-establishing-shot",
    ]),
    bridgeEventId: identifierSchema.nullable(),
  })
  .strict();

const continuitySequencePlanFields = {
  schemaVersion: z.literal("1.0"),
  directorPlanContentHash: hashSchema,
  timingSolutionContentHash: hashSchema,
  sceneWorldContentHashes: z.array(hashSchema).min(1),
  fps: z.number().int().positive(),
  durationInFrames: z.number().int().positive(),
  shots: z.array(continuityShotStateSchema).min(1),
  transitions: z.array(continuityTransitionLinkSchema),
  visemePrograms: z.array(continuityVisemeProgramSchema),
};

export const continuitySequencePlanDraftSchema = z
  .object(continuitySequencePlanFields)
  .strict()
  .superRefine((plan, context) => {
    validateContinuityRules(plan, context);
    const programIds = new Set<string>();
    const bindings = new Set<string>();
    plan.visemePrograms.forEach((program, index) => {
      const shot = plan.shots.find(
        (candidate) => candidate.shotId === program.shotId,
      );
      const binding = `${program.shotId}:${program.entityId}`;
      if (programIds.has(program.id) || bindings.has(binding))
        context.addIssue({
          code: "custom",
          path: ["visemePrograms", index],
          message:
            "Continuity viseme program IDs and shot/entity bindings must be unique.",
        });
      programIds.add(program.id);
      bindings.add(binding);
      if (
        !shot ||
        !shot.beatIds.includes(program.sourceLineId) ||
        !shot.entryWorldState.entities[program.entityId] ||
        program.cues.some(
          (cue) =>
            cue.startFrame < shot.startFrame ||
            cue.endFrameExclusive > shot.endFrameExclusive,
        )
      )
        context.addIssue({
          code: "custom",
          path: ["visemePrograms", index],
          message:
            "Continuity viseme programs must bind an exact shot entity, source beat, and in-shot cue range.",
        });
    });
  });

export const continuitySequencePlanSchema = z
  .object({ ...continuitySequencePlanFields, contentHash: hashSchema })
  .strict()
  .superRefine((plan, context) => {
    const { contentHash, ...draft } = plan;
    const result = continuitySequencePlanDraftSchema.safeParse(draft);
    if (!result.success)
      result.error.issues.forEach((issue) =>
        context.addIssue({
          code: "custom",
          path: issue.path,
          message: issue.message,
        }),
      );
    if (hashCanonical(draft) !== contentHash)
      context.addIssue({
        code: "custom",
        path: ["contentHash"],
        message: "Continuity sequence plan hash is invalid.",
      });
  });

export type ContinuityPerformanceState = z.infer<
  typeof continuityPerformanceStateSchema
>;
export type ContinuityPerformanceSegment = z.infer<
  typeof continuityPerformanceSegmentSchema
>;
export type ContinuityVisemeProgram = z.infer<
  typeof continuityVisemeProgramSchema
>;
export type ContinuityShotState = z.infer<typeof continuityShotStateSchema>;
export type ContinuityTransitionLink = z.infer<
  typeof continuityTransitionLinkSchema
>;
export type ContinuitySequencePlanDraft = z.infer<
  typeof continuitySequencePlanDraftSchema
>;
export type ContinuitySequencePlan = z.infer<
  typeof continuitySequencePlanSchema
>;

export function sealContinuitySequencePlan(
  rawDraft: ContinuitySequencePlanDraft,
): ContinuitySequencePlan {
  const draft = continuitySequencePlanDraftSchema.parse(rawDraft);
  return continuitySequencePlanSchema.parse({
    ...draft,
    contentHash: hashCanonical(draft),
  });
}
