import { z } from "zod";
import { hashCanonical } from "./canonical-hash";
import { hashSchema, identifierSchema } from "./model";

const motionStateSchema = z.enum([
  "idle",
  "decelerating",
  "walking",
  "sneaking",
  "running",
  "turning",
  "reacting",
  "performing",
]);

const entityStateSchema = z
  .object({
    entityId: identifierSchema,
    visible: z.boolean(),
    stageX: z.number().min(0).max(1),
    stageY: z.number().min(0).max(1),
    apparentScale: z.number().positive(),
    facing: z.enum(["left", "right", "camera", "away"]),
    motion: motionStateSchema,
    gaitPhase: z.number().min(0).max(1).nullable(),
    gazeTargetId: identifierSchema.nullable(),
    attachmentOwnerId: identifierSchema.nullable(),
  })
  .strict();

const directorEventKindSchema = z.enum([
  "entrance",
  "exit",
  "occlusion",
  "reveal",
  "gaze-acquire",
  "deceleration",
  "foot-contact",
  "pivot",
  "attach",
  "detach",
  "anticipation",
  "action",
  "impact",
  "reaction",
  "settle",
  "portal-cross",
]);

const directorEventSchema = z
  .object({
    id: identifierSchema,
    kind: directorEventKindSchema,
    frameOffset: z.number().int().nonnegative(),
    subjectIds: z.array(identifierSchema),
    description: z.string().min(1),
  })
  .strict();

const cameraPlanSchema = z
  .object({
    shotSize: z.enum([
      "extreme-wide",
      "wide",
      "medium",
      "close-up",
      "extreme-close-up",
      "insert",
    ]),
    angle: z.enum([
      "eye-level",
      "low-angle",
      "high-angle",
      "overhead",
      "profile",
      "neutral-frontal",
    ]),
    movement: z.enum(["locked", "pan", "track", "push", "pull", "reframe"]),
    focalSubjectId: identifierSchema,
    lensIntent: z.string().min(1),
    axisId: identifierSchema,
  })
  .strict();

const layerPlanSchema = z
  .object({
    layerId: identifierSchema,
    role: z.enum([
      "background",
      "midground",
      "character",
      "prop",
      "effect",
      "foreground-occluder",
    ]),
    depth: z.number().int(),
    assetRequirementId: identifierSchema,
    animated: z.boolean(),
  })
  .strict();

const directorShotSchema = z
  .object({
    id: identifierSchema,
    sceneId: identifierSchema,
    stageId: identifierSchema,
    beatId: identifierSchema,
    storyFunction: z.string().min(1),
    startFrame: z.number().int().nonnegative(),
    durationInFrames: z.number().int().positive(),
    cutInEventId: identifierSchema.nullable(),
    cutOutEventId: identifierSchema,
    cutMotivation: z.string().min(1),
    camera: cameraPlanSchema,
    layers: z.array(layerPlanSchema).min(2),
    entryState: z.array(entityStateSchema).min(1),
    exitState: z.array(entityStateSchema).min(1),
    events: z.array(directorEventSchema).min(1),
    minimumReadFramesAfterCutEvent: z.number().int().min(0),
    performanceProgramIds: z.array(identifierSchema),
    dialogueLineIds: z.array(identifierSchema),
    audioIntentIds: z.array(identifierSchema),
    axisReset: z.boolean().default(false),
  })
  .strict();

const directorTimelineFields = {
  schemaVersion: z.literal("1.0"),
  productionId: identifierSchema,
  grammarId: z.enum(["kids-adventure-v1", "weird-history-v1"]),
  sourceContentHash: hashSchema,
  fps: z.number().int().positive(),
  durationInFrames: z.number().int().positive(),
  shots: z.array(directorShotSchema).min(1),
};

export const directorTimelineDraftSchema = z
  .object(directorTimelineFields)
  .strict()
  .superRefine((timeline, context) => validateTimeline(timeline, context));

export const directorTimelineSchema = z
  .object({ ...directorTimelineFields, contentHash: hashSchema })
  .strict()
  .superRefine((timeline, context) => {
    const { contentHash, ...draft } = timeline;
    const result = directorTimelineDraftSchema.safeParse(draft);
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
        message: "Director timeline hash is invalid.",
      });
  });

type DirectorTimelineDraft = z.infer<typeof directorTimelineDraftSchema>;
export type DirectorTimeline = z.infer<typeof directorTimelineSchema>;
export type DirectorShot = DirectorTimeline["shots"][number];

const eventKinds = (shot: DirectorTimelineDraft["shots"][number]) =>
  new Set(shot.events.map((event) => event.kind));

const circularDistance = (left: number, right: number) => {
  const direct = Math.abs(left - right);
  return Math.min(direct, 1 - direct);
};

function validateTimeline(
  timeline: DirectorTimelineDraft,
  context: z.RefinementCtx,
) {
  const ids = new Set<string>();
  let expectedStart = 0;
  timeline.shots.forEach((shot, shotIndex) => {
    if (ids.has(shot.id))
      context.addIssue({
        code: "custom",
        path: ["shots", shotIndex, "id"],
        message: `Duplicate director shot ${shot.id}.`,
      });
    ids.add(shot.id);
    if (shot.startFrame !== expectedStart)
      context.addIssue({
        code: "custom",
        path: ["shots", shotIndex, "startFrame"],
        message: `Shot ${shot.id} must start at frame ${expectedStart}.`,
      });
    expectedStart = shot.startFrame + shot.durationInFrames;

    const eventById = new Map(shot.events.map((event) => [event.id, event]));
    shot.events.forEach((event, eventIndex) => {
      if (event.frameOffset >= shot.durationInFrames)
        context.addIssue({
          code: "custom",
          path: ["shots", shotIndex, "events", eventIndex, "frameOffset"],
          message: `Event ${event.id} falls outside ${shot.id}.`,
        });
    });
    const cutOut = eventById.get(shot.cutOutEventId);
    if (!cutOut)
      context.addIssue({
        code: "custom",
        path: ["shots", shotIndex, "cutOutEventId"],
        message: `Shot ${shot.id} must cut on a named picture event.`,
      });
    else if (
      shot.durationInFrames - 1 - cutOut.frameOffset <
      shot.minimumReadFramesAfterCutEvent
    )
      context.addIssue({
        code: "custom",
        path: ["shots", shotIndex, "minimumReadFramesAfterCutEvent"],
        message: `Shot ${shot.id} cuts before its required read window completes.`,
      });
    if (shotIndex > 0 && shot.cutInEventId === null)
      context.addIssue({
        code: "custom",
        path: ["shots", shotIndex, "cutInEventId"],
        message: `Shot ${shot.id} must name the preceding cut event.`,
      });
  });

  if (expectedStart !== timeline.durationInFrames)
    context.addIssue({
      code: "custom",
      path: ["durationInFrames"],
      message: "Director shots must cover the production without gaps or overlaps.",
    });

  for (let index = 1; index < timeline.shots.length; index += 1) {
    const previous = timeline.shots[index - 1]!;
    const current = timeline.shots[index]!;
    if (current.cutInEventId !== previous.cutOutEventId)
      context.addIssue({
        code: "custom",
        path: ["shots", index, "cutInEventId"],
        message: `${current.id} must inherit ${previous.id}'s cut event.`,
      });
    if (current.axisReset || previous.stageId !== current.stageId) continue;

    const previousById = new Map(
      previous.exitState.map((state) => [state.entityId, state]),
    );
    const currentById = new Map(
      current.entryState.map((state) => [state.entityId, state]),
    );
    const boundaryKinds = new Set([
      ...eventKinds(previous),
      ...eventKinds(current),
    ]);

    for (const [entityId, outgoing] of previousById) {
      const incoming = currentById.get(entityId);
      if (!incoming) continue;
      if (
        outgoing.visible !== incoming.visible &&
        !["exit", "entrance", "occlusion", "reveal"].some((kind) =>
          boundaryKinds.has(kind as never),
        )
      )
        context.addIssue({
          code: "custom",
          path: ["shots", index, "entryState"],
          message: `${entityId} changes visibility at ${current.id} without a visible event.`,
        });
      if (!outgoing.visible || !incoming.visible) continue;
      if (Math.abs(outgoing.stageX - incoming.stageX) > 0.08)
        context.addIssue({
          code: "custom",
          path: ["shots", index, "entryState"],
          message: `${entityId} teleports across the cut into ${current.id}.`,
        });
      const scaleRatio = incoming.apparentScale / outgoing.apparentScale;
      const focalCloseCut =
        previous.camera.focalSubjectId === current.camera.focalSubjectId &&
        previous.camera.shotSize !== current.camera.shotSize;
      if (!focalCloseCut && (scaleRatio < 0.85 || scaleRatio > 1.18))
        context.addIssue({
          code: "custom",
          path: ["shots", index, "entryState"],
          message: `${entityId} changes apparent scale without a motivated reframe.`,
        });
      if (
        outgoing.motion === "running" &&
        incoming.motion === "idle" &&
        !boundaryKinds.has("deceleration")
      )
        context.addIssue({
          code: "custom",
          path: ["shots", index, "entryState"],
          message: `${entityId} changes from running to idle without deceleration.`,
        });
      if (
        outgoing.motion === "running" &&
        incoming.motion === "running" &&
        outgoing.gaitPhase !== null &&
        incoming.gaitPhase !== null &&
        circularDistance(outgoing.gaitPhase, incoming.gaitPhase) > 0.13
      )
        context.addIssue({
          code: "custom",
          path: ["shots", index, "entryState"],
          message: `${entityId} breaks gait contact at ${current.id}.`,
        });
      if (outgoing.attachmentOwnerId !== incoming.attachmentOwnerId)
        context.addIssue({
          code: "custom",
          path: ["shots", index, "entryState"],
          message: `${entityId} changes owner across ${current.id}; attach/detach must occur on screen.`,
        });
    }

    const sharedVisible = [...previousById.keys()].filter(
      (id) =>
        previousById.get(id)?.visible && currentById.get(id)?.visible,
    );
    for (let left = 0; left < sharedVisible.length; left += 1)
      for (let right = left + 1; right < sharedVisible.length; right += 1) {
        const leftId = sharedVisible[left]!;
        const rightId = sharedVisible[right]!;
        const oldOrder =
          previousById.get(leftId)!.stageX < previousById.get(rightId)!.stageX;
        const newOrder =
          currentById.get(leftId)!.stageX < currentById.get(rightId)!.stageX;
        if (oldOrder !== newOrder)
          context.addIssue({
            code: "custom",
            path: ["shots", index, "entryState"],
            message: `${leftId}/${rightId} reverse screen order at ${current.id}.`,
          });
      }
  }
}

export function createDirectorTimeline(
  input: z.input<typeof directorTimelineDraftSchema>,
): DirectorTimeline {
  const draft = directorTimelineDraftSchema.parse(input);
  return directorTimelineSchema.parse({
    ...draft,
    contentHash: hashCanonical(draft),
  });
}
