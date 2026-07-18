import { z } from "zod";
import { audioRoleSchema } from "./audio-director";
import { hashCanonical } from "./canonical-hash";
import { hashSchema, identifierSchema } from "./model";

export const directingGrammarSchema = z.enum([
  "kids-adventure-v1",
  "weird-history-v1",
]);

export const pictureEventKindSchema = z.enum([
  "anticipation",
  "contact",
  "action",
  "impact",
  "reaction",
  "reveal",
  "settle",
  "transition",
]);

const pictureEventSchema = z
  .object({
    id: identifierSchema,
    kind: pictureEventKindSchema,
    frameOffset: z.number().int().nonnegative(),
    description: z.string().min(1),
  })
  .strict();

const compositionSchema = z
  .object({
    scale: z.enum([
      "extreme-wide",
      "wide",
      "medium",
      "close-up",
      "extreme-close-up",
      "insert",
    ]),
    focalSubjectId: identifierSchema,
    screenDirection: z.enum([
      "left-to-right",
      "right-to-left",
      "toward-camera",
      "away-from-camera",
      "static",
    ]),
    depthPlaneIds: z.array(identifierSchema).min(2),
    eyelineTargetIds: z.array(identifierSchema),
    staging: z.string().min(1),
  })
  .strict();

const transitionSchema = z
  .object({
    type: z.enum([
      "opening",
      "hard-cut",
      "match-cut",
      "action-cut",
      "foreground-wipe",
      "dissolve",
    ]),
    motivation: z.string().min(1),
  })
  .strict();

const directedShotSchema = z
  .object({
    id: identifierSchema,
    sceneId: identifierSchema,
    beatId: identifierSchema,
    storyFunction: z.string().min(1),
    startFrame: z.number().int().nonnegative(),
    durationInFrames: z.number().int().positive(),
    composition: compositionSchema,
    transition: transitionSchema,
    continuity: z
      .object({
        entryState: z.string().min(1),
        exitState: z.string().min(1),
        directionException: z.string().min(1).optional(),
      })
      .strict(),
    performanceProgramIds: z.array(identifierSchema),
    assetRequirementIds: z.array(identifierSchema).min(1),
    events: z.array(pictureEventSchema).min(1),
    audioIntentIds: z.array(identifierSchema),
  })
  .strict();

const directedBeatSchema = z
  .object({
    id: identifierSchema,
    sceneId: identifierSchema,
    audienceQuestion: z.string().min(1),
    knowledgeBefore: z.string().min(1),
    knowledgeAfter: z.string().min(1),
    emotionBefore: z.string().min(1),
    emotionAfter: z.string().min(1),
    muteReadableAction: z.string().min(1),
    audioReadableIntent: z.string().min(1),
    shotIds: z.array(identifierSchema).min(1),
  })
  .strict();

const directedSceneSchema = z
  .object({
    id: identifierSchema,
    objective: z.string().min(1),
    geography: z.string().min(1),
    sceneKitId: identifierSchema,
    beatIds: z.array(identifierSchema).min(1),
  })
  .strict();

const directorAudioIntentSchema = z
  .object({
    id: identifierSchema,
    role: audioRoleSchema,
    shotId: identifierSchema,
    anchorEventId: identifierSchema,
    offsetFrames: z.number().int(),
    direction: z.string().min(1),
    duckMusicDb: z.number().min(-24).max(0).optional(),
  })
  .strict();

const directedSequencePlanFields = {
  schemaVersion: z.literal("1.0"),
  id: identifierSchema,
  productionId: identifierSchema,
  grammarId: directingGrammarSchema,
  sourceContentHash: hashSchema,
  startFrame: z.number().int().nonnegative(),
  durationInFrames: z.number().int().positive(),
  scenes: z.array(directedSceneSchema).min(1),
  beats: z.array(directedBeatSchema).min(1),
  shots: z.array(directedShotSchema).min(1),
  audioIntents: z.array(directorAudioIntentSchema),
};

export const directedSequencePlanDraftSchema = z
  .object(directedSequencePlanFields)
  .strict()
  .superRefine((plan, context) => validatePlan(plan, context));

export const directedSequencePlanSchema = z
  .object({ ...directedSequencePlanFields, contentHash: hashSchema })
  .strict()
  .superRefine((plan, context) => {
    const { contentHash, ...draft } = plan;
    const draftResult = directedSequencePlanDraftSchema.safeParse(draft);
    if (!draftResult.success)
      for (const issue of draftResult.error.issues)
        context.addIssue({ ...issue, path: issue.path });
    if (hashCanonical(draft) !== contentHash)
      context.addIssue({
        code: "custom",
        path: ["contentHash"],
        message: "Directed sequence plan hash is invalid.",
      });
  });

type DirectedSequencePlanDraft = z.infer<
  typeof directedSequencePlanDraftSchema
>;
export type DirectedSequencePlan = z.infer<typeof directedSequencePlanSchema>;

function validatePlan(
  plan: DirectedSequencePlanDraft,
  context: z.RefinementCtx,
) {
  const unique = <T extends { id: string }>(items: T[], path: string) => {
    const byId = new Map<string, T>();
    items.forEach((item, index) => {
      if (byId.has(item.id))
        context.addIssue({
          code: "custom",
          path: [path, index, "id"],
          message: `Duplicate ${path} id ${item.id}.`,
        });
      byId.set(item.id, item);
    });
    return byId;
  };
  const sceneById = unique(plan.scenes, "scenes");
  const beatById = unique(plan.beats, "beats");
  const shotById = unique(plan.shots, "shots");
  const audioById = unique(plan.audioIntents, "audioIntents");

  for (const [index, scene] of plan.scenes.entries()) {
    for (const beatId of scene.beatIds) {
      const beat = beatById.get(beatId);
      if (!beat || beat.sceneId !== scene.id)
        context.addIssue({
          code: "custom",
          path: ["scenes", index, "beatIds"],
          message: `Scene ${scene.id} has an invalid beat reference ${beatId}.`,
        });
    }
  }

  for (const [index, beat] of plan.beats.entries()) {
    if (!sceneById.has(beat.sceneId))
      context.addIssue({
        code: "custom",
        path: ["beats", index, "sceneId"],
        message: `Beat ${beat.id} references an unknown scene.`,
      });
    for (const shotId of beat.shotIds) {
      const shot = shotById.get(shotId);
      if (!shot || shot.beatId !== beat.id)
        context.addIssue({
          code: "custom",
          path: ["beats", index, "shotIds"],
          message: `Beat ${beat.id} has an invalid shot reference ${shotId}.`,
        });
    }
  }

  const orderedShots = [...plan.shots].sort(
    (left, right) => left.startFrame - right.startFrame,
  );
  let expectedFrame = plan.startFrame;
  for (const shot of orderedShots) {
    const shotIndex = plan.shots.indexOf(shot);
    if (!sceneById.has(shot.sceneId) || !beatById.has(shot.beatId))
      context.addIssue({
        code: "custom",
        path: ["shots", shotIndex],
        message: `Shot ${shot.id} has invalid scene or beat lineage.`,
      });
    if (shot.startFrame !== expectedFrame)
      context.addIssue({
        code: "custom",
        path: ["shots", shotIndex, "startFrame"],
        message: `Shot ${shot.id} must start at frame ${expectedFrame}; directed sequences cannot contain silent gaps or overlaps.`,
      });
    expectedFrame = shot.startFrame + shot.durationInFrames;
    const eventIds = new Set<string>();
    shot.events.forEach((event, eventIndex) => {
      if (eventIds.has(event.id))
        context.addIssue({
          code: "custom",
          path: ["shots", shotIndex, "events", eventIndex, "id"],
          message: `Shot ${shot.id} repeats event ${event.id}.`,
        });
      eventIds.add(event.id);
      if (event.frameOffset >= shot.durationInFrames)
        context.addIssue({
          code: "custom",
          path: ["shots", shotIndex, "events", eventIndex, "frameOffset"],
          message: `Event ${event.id} falls outside shot ${shot.id}.`,
        });
    });
    for (const audioIntentId of shot.audioIntentIds) {
      const intent = audioById.get(audioIntentId);
      if (
        !intent ||
        intent.shotId !== shot.id ||
        !eventIds.has(intent.anchorEventId)
      )
        context.addIssue({
          code: "custom",
          path: ["shots", shotIndex, "audioIntentIds"],
          message: `Shot ${shot.id} has a stale audio intent ${audioIntentId}.`,
        });
    }
  }
  if (expectedFrame !== plan.startFrame + plan.durationInFrames)
    context.addIssue({
      code: "custom",
      path: ["durationInFrames"],
      message: "Directed shots must cover the declared sequence range exactly.",
    });
}

export function createDirectedSequencePlan(
  input: z.input<typeof directedSequencePlanDraftSchema>,
): DirectedSequencePlan {
  const draft = directedSequencePlanDraftSchema.parse(input);
  return directedSequencePlanSchema.parse({
    ...draft,
    contentHash: hashCanonical(draft),
  });
}

export function resolveDirectorAudioIntentFrame(
  plan: DirectedSequencePlan,
  intentId: string,
): number {
  const parsed = directedSequencePlanSchema.parse(plan);
  const intent = parsed.audioIntents.find(
    (candidate) => candidate.id === intentId,
  );
  if (!intent) throw new Error(`Unknown director audio intent: ${intentId}`);
  const shot = parsed.shots.find(
    (candidate) => candidate.id === intent.shotId,
  )!;
  const event = shot.events.find(
    (candidate) => candidate.id === intent.anchorEventId,
  )!;
  const absoluteFrame =
    shot.startFrame + event.frameOffset + intent.offsetFrames;
  if (
    absoluteFrame < shot.startFrame ||
    absoluteFrame >= shot.startFrame + shot.durationInFrames
  )
    throw new Error(
      `Audio intent ${intentId} resolves outside shot ${shot.id}.`,
    );
  return absoluteFrame;
}
