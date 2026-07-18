import { z } from "zod";
import { hashCanonical } from "../canonical-hash";
import { hashSchema, identifierSchema } from "../model";
import { directorPlanSchema, type DirectorPlan } from "./director-plan";

const resolvedEventSchema = z
  .object({
    eventId: identifierSchema,
    frame: z.number().int().nonnegative(),
  })
  .strict();

const resolvedShotSchema = z
  .object({
    shotId: identifierSchema,
    startFrame: z.number().int().nonnegative(),
    endFrameExclusive: z.number().int().positive(),
    cutEventId: identifierSchema,
  })
  .strict()
  .refine((shot) => shot.endFrameExclusive > shot.startFrame, {
    message: "Resolved shot end must follow its start.",
  });

const timingSolutionFields = {
  schemaVersion: z.literal("1.0"),
  directorPlanContentHash: hashSchema,
  timingBasis: z
    .object({
      kind: z.enum(["estimated", "guide-audio", "approved-final-audio"]),
      contentHash: hashSchema,
    })
    .strict(),
  resolvedEvents: z.array(resolvedEventSchema).min(1),
  resolvedShots: z.array(resolvedShotSchema).min(1),
  durationInFrames: z.number().int().positive(),
};

export const timingSolutionDraftSchema = z
  .object(timingSolutionFields)
  .strict()
  .superRefine((solution, context) => {
    if (
      new Set(solution.resolvedEvents.map((event) => event.eventId)).size !==
      solution.resolvedEvents.length
    )
      context.addIssue({
        code: "custom",
        path: ["resolvedEvents"],
        message: "Timing solution event IDs must be unique.",
      });
    if (
      new Set(solution.resolvedShots.map((shot) => shot.shotId)).size !==
      solution.resolvedShots.length
    )
      context.addIssue({
        code: "custom",
        path: ["resolvedShots"],
        message: "Timing solution shot IDs must be unique.",
      });
    let expectedStart = 0;
    solution.resolvedShots.forEach((shot, index) => {
      if (shot.startFrame !== expectedStart)
        context.addIssue({
          code: "custom",
          path: ["resolvedShots", index, "startFrame"],
          message: `${shot.shotId} must start at frame ${expectedStart}.`,
        });
      expectedStart = shot.endFrameExclusive;
    });
    if (expectedStart !== solution.durationInFrames)
      context.addIssue({
        code: "custom",
        path: ["durationInFrames"],
        message:
          "Resolved shots must cover the episode without gaps or overlaps.",
      });
  });

export const timingSolutionSchema = z
  .object({ ...timingSolutionFields, contentHash: hashSchema })
  .strict()
  .superRefine((solution, context) => {
    const { contentHash, ...draft } = solution;
    const result = timingSolutionDraftSchema.safeParse(draft);
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
        message: "Timing solution hash is invalid.",
      });
  });

export type TimingSolutionDraft = z.infer<typeof timingSolutionDraftSchema>;
export type TimingSolution = z.infer<typeof timingSolutionSchema>;

export function sealTimingSolution(
  rawPlan: DirectorPlan,
  rawDraft: TimingSolutionDraft,
): TimingSolution {
  const plan = directorPlanSchema.parse(rawPlan);
  const draft = timingSolutionDraftSchema.parse(rawDraft);
  if (draft.directorPlanContentHash !== plan.contentHash)
    throw new Error("Timing solution does not match the Director plan.");

  const eventFrames = new Map(
    draft.resolvedEvents.map((event) => [event.eventId, event.frame]),
  );
  const plannedEventIds = new Set(plan.events.map((event) => event.id));
  if (
    eventFrames.size !== plannedEventIds.size ||
    [...plannedEventIds].some((eventId) => !eventFrames.has(eventId))
  )
    throw new Error(
      "Timing solution must resolve every Director event exactly once.",
    );

  if (
    draft.resolvedShots.length !== plan.shots.length ||
    draft.resolvedShots.some(
      (shot, index) => shot.shotId !== plan.shots[index]?.id,
    )
  )
    throw new Error("Timing solution must preserve the Director shot order.");

  draft.resolvedShots.forEach((resolved, index) => {
    const shot = plan.shots[index]!;
    const duration = resolved.endFrameExclusive - resolved.startFrame;
    if (
      duration < shot.timingEnvelope.minimumDurationFrames ||
      duration > shot.timingEnvelope.maximumDurationFrames
    )
      throw new Error(`${shot.id} falls outside its approved timing envelope.`);
    const allowedCutEvents = new Set([
      shot.timingEnvelope.earliestCutEventId,
      shot.timingEnvelope.preferredCutEventId,
      shot.timingEnvelope.latestCutEventId,
    ]);
    if (!allowedCutEvents.has(resolved.cutEventId))
      throw new Error(`${shot.id} cuts on an unapproved event.`);
    const cutFrame = eventFrames.get(resolved.cutEventId);
    if (
      cutFrame === undefined ||
      cutFrame < resolved.startFrame ||
      cutFrame >= resolved.endFrameExclusive
    )
      throw new Error(`${shot.id} cut event falls outside its resolved shot.`);
    if (
      resolved.endFrameExclusive - 1 - cutFrame <
      shot.timingEnvelope.minimumReadFrames
    )
      throw new Error(`${shot.id} cuts before its read window completes.`);
  });

  return timingSolutionSchema.parse({
    ...draft,
    contentHash: hashCanonical(draft),
  });
}
