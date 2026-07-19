import { z } from "zod";
import { hashCanonical } from "../canonical-hash";
import { hashSchema, identifierSchema } from "../model";
import {
  directorEventTimingAdjustmentSchema,
  directorLocomotionDirectiveSchema,
} from "./director-proposal";
import { directorWorldStateSchema } from "./world-state";

const causalEventSchema = z
  .object({
    id: identifierSchema,
    sceneId: identifierSchema,
    beatId: identifierSchema,
    order: z.number().int().nonnegative(),
    kind: z.enum([
      "entrance",
      "exit",
      "occlusion",
      "reveal",
      "gaze",
      "anticipation",
      "action",
      "impact",
      "reaction",
      "settle",
      "hold",
      "prop-launch",
      "prop-attach",
      "prop-offer",
      "prop-transfer",
      "prop-release",
      "dialogue-start",
      "dialogue-end",
      "music-change",
    ]),
    subjectIds: z.array(identifierSchema),
    propId: identifierSchema.nullable(),
    causedByEventIds: z.array(identifierSchema),
    description: z.string().min(1),
  })
  .strict();

const performanceRequirementSchema = z
  .object({
    id: identifierSchema,
    entityId: identifierSchema,
    action: z.string().min(1),
    source: z.enum([
      "articulated-rig",
      "drawing-sequence",
      "atlas-cycle",
      "living-hold",
      "proxy",
    ]),
    requiredInternalChannels: z.array(identifierSchema),
    requiredEventIds: z.array(identifierSchema).min(1),
  })
  .strict();

const beatPlanSchema = z
  .object({
    beatId: identifierSchema,
    beatContentHash: hashSchema,
    audienceTakeaway: z.string().min(1),
    emotionalTurn: z
      .object({ from: z.string().min(1), to: z.string().min(1) })
      .strict(),
    reactionDelayFrames: z.number().int().min(0).max(30),
    eventTimingAdjustments: z.array(directorEventTimingAdjustmentSchema),
    muteReadable: z.boolean(),
    eventIds: z.array(identifierSchema).min(1),
    performanceRequirements: z.array(performanceRequirementSchema),
    sound: z
      .object({
        dialogueLineIds: z.array(identifierSchema),
        narrationLineIds: z.array(identifierSchema),
        effectEventIds: z.array(identifierSchema),
        musicFunction: z.string().min(1),
      })
      .strict(),
  })
  .strict();

const shotIntentSchema = z
  .object({
    id: identifierSchema,
    sceneId: identifierSchema,
    stageId: identifierSchema,
    beatIds: z.array(identifierSchema).min(1),
    storyFunction: z.string().min(1),
    entryEventId: identifierSchema,
    exitEventId: identifierSchema,
    camera: z
      .object({
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
        axisId: identifierSchema,
        motivation: z.string().min(1),
      })
      .strict(),
    composition: z
      .object({
        focalRegion: z.enum([
          "left-third",
          "center",
          "right-third",
          "upper-third",
          "lower-third",
        ]),
        depthLayers: z.array(identifierSchema).min(3),
        foregroundOccluderIds: z.array(identifierSchema),
        negativeSpace: z.enum(["left", "right", "above", "none"]),
      })
      .strict(),
    blocking: z.array(
      z
        .object({
          entityId: identifierSchema,
          entryLandmarkId: identifierSchema,
          exitLandmarkId: identifierSchema,
          facing: z.enum(["left", "right", "front", "three-quarter", "away"]),
          gazeTargetId: identifierSchema.nullable(),
          locomotion: directorLocomotionDirectiveSchema
            .omit({ entityId: true, destinationLandmarkId: true })
            .optional(),
        })
        .strict(),
    ),
    transition: z
      .object({
        kind: z.enum([
          "hard-cut",
          "match-cut",
          "camera-carry",
          "foreground-wipe",
          "dissolve",
        ]),
        motivation: z.string().min(1),
      })
      .strict(),
    timingEnvelope: z
      .object({
        earliestCutEventId: identifierSchema,
        preferredCutEventId: identifierSchema,
        latestCutEventId: identifierSchema,
        minimumReadFrames: z.number().int().nonnegative(),
        minimumDurationFrames: z.number().int().positive(),
        preferredDurationFrames: z.number().int().positive(),
        maximumDurationFrames: z.number().int().positive(),
      })
      .strict()
      .refine(
        (envelope) =>
          envelope.minimumDurationFrames <= envelope.preferredDurationFrames &&
          envelope.preferredDurationFrames <= envelope.maximumDurationFrames,
        {
          message:
            "Shot timing preference must stay inside its minimum and maximum.",
        },
      ),
  })
  .strict();

const scenePlanSchema = z
  .object({
    sceneId: identifierSchema,
    stageId: identifierSchema,
    geographySummary: z.string().min(1),
    landmarkIds: z.array(identifierSchema).min(1),
    beatIds: z.array(identifierSchema).min(1),
    shotIds: z.array(identifierSchema).min(1),
  })
  .strict();

const directorPlanFields = {
  schemaVersion: z.literal("1.0"),
  id: identifierSchema,
  storyGraphContentHash: hashSchema,
  planningAuthority: z
    .object({
      plannerId: identifierSchema,
      plannerVersion: z.string().min(1),
    })
    .strict(),
  planningArtifactContentHash: hashSchema,
  grammarProfileContentHash: hashSchema,
  sceneWorldContentHashes: z.array(hashSchema).min(1),
  initialWorldState: directorWorldStateSchema,
  events: z.array(causalEventSchema).min(1),
  beats: z.array(beatPlanSchema).min(1),
  scenes: z.array(scenePlanSchema).min(1),
  shots: z.array(shotIntentSchema).min(1),
  status: z.literal("director-plan-ready"),
};

export const directorPlanDraftSchema = z
  .object(directorPlanFields)
  .strict()
  .superRefine(validateDirectorPlan);

export const directorPlanSchema = z
  .object({ ...directorPlanFields, contentHash: hashSchema })
  .strict()
  .superRefine((plan, context) => {
    const { contentHash, ...draft } = plan;
    const result = directorPlanDraftSchema.safeParse(draft);
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
        message: "Director plan hash is invalid.",
      });
  });

export type DirectorPlanDraft = z.infer<typeof directorPlanDraftSchema>;
export type DirectorPlan = z.infer<typeof directorPlanSchema>;

function addDuplicateIssues(
  values: string[],
  path: (string | number)[],
  label: string,
  context: z.RefinementCtx,
) {
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
}

function validateDirectorPlan(
  plan: DirectorPlanDraft,
  context: z.RefinementCtx,
) {
  addDuplicateIssues(
    plan.events.map((event) => event.id),
    ["events"],
    "event",
    context,
  );
  addDuplicateIssues(
    plan.beats.map((beat) => beat.beatId),
    ["beats"],
    "beat",
    context,
  );
  addDuplicateIssues(
    plan.scenes.map((scene) => scene.sceneId),
    ["scenes"],
    "scene",
    context,
  );
  addDuplicateIssues(
    plan.shots.map((shot) => shot.id),
    ["shots"],
    "shot",
    context,
  );

  const events = new Map(plan.events.map((event) => [event.id, event]));
  const beats = new Set(plan.beats.map((beat) => beat.beatId));
  const shots = new Set(plan.shots.map((shot) => shot.id));
  const shotsById = new Map(plan.shots.map((shot) => [shot.id, shot]));
  const scenes = new Set(plan.scenes.map((scene) => scene.sceneId));

  plan.events.forEach((event, eventIndex) =>
    event.causedByEventIds.forEach((causeId) => {
      const cause = events.get(causeId);
      if (!cause)
        context.addIssue({
          code: "custom",
          path: ["events", eventIndex, "causedByEventIds"],
          message: `${event.id} references unknown cause ${causeId}.`,
        });
      else if (cause.order >= event.order)
        context.addIssue({
          code: "custom",
          path: ["events", eventIndex, "causedByEventIds"],
          message: `${event.id} must follow cause ${causeId}.`,
        });
    }),
  );

  plan.beats.forEach((beat, beatIndex) => {
    beat.eventIds.forEach((eventId) => {
      const event = events.get(eventId);
      if (!event || event.beatId !== beat.beatId)
        context.addIssue({
          code: "custom",
          path: ["beats", beatIndex, "eventIds"],
          message: `${beat.beatId} references an unknown or foreign event ${eventId}.`,
        });
    });
    beat.performanceRequirements.forEach((requirement, requirementIndex) => {
      if (
        requirement.source !== "proxy" &&
        requirement.requiredInternalChannels.length === 0
      )
        context.addIssue({
          code: "custom",
          path: [
            "beats",
            beatIndex,
            "performanceRequirements",
            requirementIndex,
          ],
          message: `${requirement.id} needs internal motion channels; root-only motion is not performance.`,
        });
      requirement.requiredEventIds.forEach((eventId) => {
        if (!events.has(eventId))
          context.addIssue({
            code: "custom",
            path: [
              "beats",
              beatIndex,
              "performanceRequirements",
              requirementIndex,
            ],
            message: `${requirement.id} references unknown event ${eventId}.`,
          });
      });
    });
    const totalDelay = beat.eventTimingAdjustments.reduce(
      (total, adjustment) => total + adjustment.frames,
      0,
    );
    if (totalDelay !== beat.reactionDelayFrames)
      context.addIssue({
        code: "custom",
        path: ["beats", beatIndex, "reactionDelayFrames"],
        message: `${beat.beatId} reaction delay does not match its event-bound adjustments.`,
      });
    beat.eventTimingAdjustments.forEach((adjustment, adjustmentIndex) => {
      const event = events.get(adjustment.eventId);
      const shot = shotsById.get(adjustment.sourceShotId);
      if (!event || event.beatId !== beat.beatId || event.kind !== "reaction")
        context.addIssue({
          code: "custom",
          path: ["beats", beatIndex, "eventTimingAdjustments", adjustmentIndex],
          message: `${adjustment.eventId} is not a reaction event for ${beat.beatId}.`,
        });
      if (
        !shot ||
        !shot.beatIds.includes(beat.beatId) ||
        ![
          shot.entryEventId,
          shot.exitEventId,
          shot.timingEnvelope.earliestCutEventId,
          shot.timingEnvelope.preferredCutEventId,
          shot.timingEnvelope.latestCutEventId,
        ].includes(adjustment.eventId)
      )
        context.addIssue({
          code: "custom",
          path: ["beats", beatIndex, "eventTimingAdjustments", adjustmentIndex],
          message: `${adjustment.sourceShotId} is not the source shot for ${adjustment.eventId}.`,
        });
    });
  });

  plan.scenes.forEach((scene, sceneIndex) => {
    scene.beatIds.forEach((beatId) => {
      if (!beats.has(beatId))
        context.addIssue({
          code: "custom",
          path: ["scenes", sceneIndex, "beatIds"],
          message: `${scene.sceneId} references unknown beat ${beatId}.`,
        });
    });
    scene.shotIds.forEach((shotId) => {
      if (!shots.has(shotId))
        context.addIssue({
          code: "custom",
          path: ["scenes", sceneIndex, "shotIds"],
          message: `${scene.sceneId} references unknown shot ${shotId}.`,
        });
    });
  });

  plan.shots.forEach((shot, shotIndex) => {
    if (!scenes.has(shot.sceneId))
      context.addIssue({
        code: "custom",
        path: ["shots", shotIndex, "sceneId"],
        message: `${shot.id} references unknown scene ${shot.sceneId}.`,
      });
    shot.beatIds.forEach((beatId) => {
      if (!beats.has(beatId))
        context.addIssue({
          code: "custom",
          path: ["shots", shotIndex, "beatIds"],
          message: `${shot.id} references unknown beat ${beatId}.`,
        });
    });
    [
      shot.entryEventId,
      shot.exitEventId,
      shot.timingEnvelope.earliestCutEventId,
      shot.timingEnvelope.preferredCutEventId,
      shot.timingEnvelope.latestCutEventId,
    ].forEach((eventId) => {
      if (!events.has(eventId))
        context.addIssue({
          code: "custom",
          path: ["shots", shotIndex],
          message: `${shot.id} references unknown timing event ${eventId}.`,
        });
    });
  });
}

export function sealDirectorPlan(rawDraft: DirectorPlanDraft): DirectorPlan {
  const draft = directorPlanDraftSchema.parse(rawDraft);
  return directorPlanSchema.parse({
    ...draft,
    contentHash: hashCanonical(draft),
  });
}
