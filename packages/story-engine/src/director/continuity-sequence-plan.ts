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
  })
  .strict();

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
    pictureEvents: z.array(continuityPictureEventSchema).min(1),
  })
  .strict()
  .refine((shot) => shot.endFrameExclusive > shot.startFrame, {
    message: "Continuity shot end must follow its start.",
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
};

export const continuitySequencePlanDraftSchema = z
  .object(continuitySequencePlanFields)
  .strict()
  .superRefine(validateContinuityRules);

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
