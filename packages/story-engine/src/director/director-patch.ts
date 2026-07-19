import { z } from "zod";
import { hashCanonical } from "../canonical-hash";
import { hashSchema, identifierSchema } from "../model";
import {
  directorProjectSchema,
  type DirectorProject,
} from "./director-project";
import {
  directorCameraMovementSchema,
  directorShotSizeSchema,
} from "./director-proposal";

const delayEventOperationSchema = z
  .object({
    id: identifierSchema,
    kind: z.literal("delay-event"),
    beatId: identifierSchema,
    eventId: identifierSchema,
    sourceShotId: identifierSchema,
    frames: z.number().int().min(1).max(30),
  })
  .strict();

const setShotSizeOperationSchema = z
  .object({
    id: identifierSchema,
    kind: z.literal("set-shot-size"),
    beatId: identifierSchema,
    shotId: identifierSchema,
    shotSize: directorShotSizeSchema,
  })
  .strict();

const setCameraMovementOperationSchema = z
  .object({
    id: identifierSchema,
    kind: z.literal("set-camera-movement"),
    beatId: identifierSchema,
    shotId: identifierSchema,
    movement: directorCameraMovementSchema,
  })
  .strict();

export const directorPatchOperationSchema = z.discriminatedUnion("kind", [
  delayEventOperationSchema,
  setShotSizeOperationSchema,
  setCameraMovementOperationSchema,
]);

const directorPatchFields = {
  schemaVersion: z.literal("1.0"),
  id: identifierSchema,
  baseDirectorProjectContentHash: hashSchema,
  targetBeatId: identifierSchema,
  sourceCommand: z.string().trim().min(1),
  operations: z.array(directorPatchOperationSchema).min(1),
};

export const directorPatchDraftSchema = z
  .object(directorPatchFields)
  .strict()
  .superRefine((patch, context) => {
    if (
      patch.operations.some(
        (operation) => operation.beatId !== patch.targetBeatId,
      )
    )
      context.addIssue({
        code: "custom",
        path: ["operations"],
        message: "Every Director patch operation must stay on its target beat.",
      });
  });

export const directorPatchSchema = z
  .object({ ...directorPatchFields, contentHash: hashSchema })
  .strict()
  .superRefine((patch, context) => {
    const { contentHash, ...draft } = patch;
    const result = directorPatchDraftSchema.safeParse(draft);
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
        message: "Director patch hash is invalid.",
      });
  });

export type DirectorPatchOperation = z.infer<
  typeof directorPatchOperationSchema
>;
export type DirectorPatch = z.infer<typeof directorPatchSchema>;

export function sealDirectorPatch(
  raw: z.infer<typeof directorPatchDraftSchema>,
): DirectorPatch {
  const draft = directorPatchDraftSchema.parse(raw);
  return directorPatchSchema.parse({
    ...draft,
    contentHash: hashCanonical(draft),
  });
}

const requestedFrames = (command: string) => {
  const explicit = command.match(/(\d+)\s*frames?/i)?.[1];
  return explicit ? Number(explicit) : 6;
};

/** Deterministic Alpha command interpreter. A future GPT Director may propose
 * the same schema, but never mutates the project directly. */
export function proposeDirectorPatch(input: {
  baseDirectorProject: DirectorProject;
  targetBeatId: string;
  command: string;
}): DirectorPatch {
  const base = directorProjectSchema.parse(input.baseDirectorProject);
  const command = input.command.trim();
  const beat = base.directorPlan.beats.find(
    (candidate) => candidate.beatId === input.targetBeatId,
  );
  if (!beat) throw new Error(`Unknown Director beat ${input.targetBeatId}.`);
  if (
    !/\b(?:react|reaction|response)\b/i.test(command) ||
    !/\blater\b/i.test(command)
  )
    throw new Error(
      "Director Alpha currently understands reaction-delay notes such as “Make the reaction 6 frames later.”",
    );
  const frames = requestedFrames(command);
  if (!Number.isInteger(frames) || frames < 1 || frames > 30)
    throw new Error("Reaction delay must be between 1 and 30 frames.");
  const reactionEvents = base.directorPlan.events.filter(
    (event) => event.beatId === input.targetBeatId && event.kind === "reaction",
  );
  const candidates = reactionEvents.flatMap((event) =>
    base.directorPlan.shots
      .filter(
        (shot) =>
          shot.beatIds.includes(input.targetBeatId) &&
          [
            shot.entryEventId,
            shot.exitEventId,
            shot.timingEnvelope.earliestCutEventId,
            shot.timingEnvelope.preferredCutEventId,
            shot.timingEnvelope.latestCutEventId,
          ].includes(event.id),
      )
      .map((shot) => ({ event, shot })),
  );
  if (candidates.length === 0)
    throw new Error(
      "The selected beat has no concrete reaction event to delay.",
    );
  if (candidates.length > 1)
    throw new Error(
      "The selected beat has more than one possible reaction event. Choose a specific event before applying this direction.",
    );
  const { event, shot } = candidates[0]!;
  const operation: DirectorPatchOperation = {
    id: `delay-event-${event.id}`,
    kind: "delay-event",
    beatId: input.targetBeatId,
    eventId: event.id,
    sourceShotId: shot.id,
    frames,
  };
  const identity = hashCanonical({
    baseDirectorProjectContentHash: base.contentHash,
    sourceCommand: command,
    operations: [operation],
  });
  return sealDirectorPatch({
    schemaVersion: "1.0",
    id: `director-patch-${identity.slice(0, 12)}`,
    baseDirectorProjectContentHash: base.contentHash,
    targetBeatId: input.targetBeatId,
    sourceCommand: command,
    operations: [operation],
  });
}

export function proposeDirectorVisualPatch(input: {
  baseDirectorProject: DirectorProject;
  targetBeatId: string;
  shotId: string;
  shotSize?: z.infer<typeof directorShotSizeSchema>;
  cameraMovement?: z.infer<typeof directorCameraMovementSchema>;
}): DirectorPatch {
  const base = directorProjectSchema.parse(input.baseDirectorProject);
  const shot = base.directorPlan.shots.find(
    (candidate) => candidate.id === input.shotId,
  );
  if (!shot || !shot.beatIds.includes(input.targetBeatId))
    throw new Error(
      "The selected shot is stale or does not belong to the selected beat.",
    );
  const operations: DirectorPatchOperation[] = [];
  if (input.shotSize && input.shotSize !== shot.camera.size)
    operations.push({
      id: `set-shot-size-${shot.id}`,
      kind: "set-shot-size",
      beatId: input.targetBeatId,
      shotId: shot.id,
      shotSize: input.shotSize,
    });
  if (input.cameraMovement && input.cameraMovement !== shot.camera.movement)
    operations.push({
      id: `set-camera-movement-${shot.id}`,
      kind: "set-camera-movement",
      beatId: input.targetBeatId,
      shotId: shot.id,
      movement: input.cameraMovement,
    });
  if (!operations.length)
    throw new Error("Choose a different shot size or camera movement.");
  const sourceCommand = [
    input.shotSize ? `size ${input.shotSize}` : null,
    input.cameraMovement ? `camera ${input.cameraMovement}` : null,
  ]
    .filter(Boolean)
    .join(", ");
  const identity = hashCanonical({
    baseDirectorProjectContentHash: base.contentHash,
    sourceCommand,
    operations,
  });
  return sealDirectorPatch({
    schemaVersion: "1.0",
    id: `director-patch-${identity.slice(0, 12)}`,
    baseDirectorProjectContentHash: base.contentHash,
    targetBeatId: input.targetBeatId,
    sourceCommand,
    operations,
  });
}

export function describeDirectorPatch(patch: DirectorPatch): string[] {
  return directorPatchSchema
    .parse(patch)
    .operations.map((operation) =>
      operation.kind === "delay-event"
        ? `Delay the reaction by ${operation.frames} frames`
        : operation.kind === "set-shot-size"
          ? `Set ${operation.shotId} to ${operation.shotSize}`
          : operation.kind === "set-camera-movement"
            ? `Set ${operation.shotId} camera to ${operation.movement}`
            : "Apply the direction change",
    );
}
