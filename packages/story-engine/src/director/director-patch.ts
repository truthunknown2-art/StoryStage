import { z } from "zod";
import { hashCanonical } from "../canonical-hash";
import { hashSchema, identifierSchema } from "../model";
import {
  directorProjectSchema,
  type DirectorProject,
} from "./director-project";

export const directorPatchOperationSchema = z
  .object({
    id: identifierSchema,
    kind: z.literal("delay-reaction"),
    beatId: identifierSchema,
    frames: z.number().int().min(1).max(30),
  })
  .strict();

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
  const operation: DirectorPatchOperation = {
    id: `delay-reaction-${input.targetBeatId}`,
    kind: "delay-reaction",
    beatId: input.targetBeatId,
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

export function describeDirectorPatch(patch: DirectorPatch): string[] {
  return directorPatchSchema
    .parse(patch)
    .operations.map((operation) =>
      operation.kind === "delay-reaction"
        ? `Delay the reaction by ${operation.frames} frames`
        : "Apply the direction change",
    );
}
