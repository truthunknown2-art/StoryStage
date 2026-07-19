import { z } from "zod";
import { hashCanonical } from "../canonical-hash";
import {
  cv002BeatDirectionSchema,
  cv002GrammarSchema,
  type Cv002Project,
} from "../cv002-story-draft";
import { hashSchema, identifierSchema } from "../model";

export const directorEventTimingAdjustmentSchema = z
  .object({
    beatId: identifierSchema,
    eventId: identifierSchema,
    sourceShotId: identifierSchema,
    frames: z.number().int().min(1).max(30),
  })
  .strict();

export const directorShotSizeSchema = z.enum([
  "extreme-wide",
  "wide",
  "medium",
  "close-up",
  "insert",
]);

export const directorCameraMovementSchema = z.enum([
  "locked",
  "pan",
  "track",
  "push",
  "pull",
  "reframe",
]);

export const directorLocomotionDirectiveSchema = z
  .object({
    entityId: identifierSchema,
    destinationLandmarkId: identifierSchema,
    mode: z.enum(["walking", "sneaking", "running"]),
    decelerationFrames: z.number().int().positive(),
    impactFrames: z.number().int().positive(),
    settleFrames: z.number().int().positive(),
  })
  .strict();

export type DirectorShotSize = z.infer<typeof directorShotSizeSchema>;
export type DirectorCameraMovement = z.infer<
  typeof directorCameraMovementSchema
>;

export const directorShotOverrideSchema = z
  .object({
    beatId: identifierSchema,
    shotId: identifierSchema,
    shotSize: directorShotSizeSchema.nullable(),
    cameraMovement: directorCameraMovementSchema.nullable(),
    locomotion: directorLocomotionDirectiveSchema.nullable().optional(),
  })
  .strict()
  .refine(
    (override) =>
      override.shotSize !== null ||
      override.cameraMovement !== null ||
      override.locomotion != null,
    {
      message:
        "A shot override must change size, camera movement, or locomotion.",
    },
  );

const directorProposalFields = {
  schemaVersion: z.literal("1.0"),
  plannerId: identifierSchema,
  plannerVersion: z.string().trim().min(1),
  storyGraphContentHash: hashSchema,
  grammar: cv002GrammarSchema,
  beatDirections: z.array(cv002BeatDirectionSchema).min(1),
  eventTimingAdjustments: z.array(directorEventTimingAdjustmentSchema),
  shotOverrides: z.array(directorShotOverrideSchema),
};

/** AI-judgment boundary. A future GPT/Codex skill emits this draft contract;
 * the deterministic compiler validates and seals the exact planning artifact. */
export const directorProposalDraftSchema = z
  .object(directorProposalFields)
  .strict();

export const directorProposalSchema = z
  .object({ ...directorProposalFields, contentHash: hashSchema })
  .strict()
  .superRefine((proposal, context) => {
    const { contentHash, ...draft } = proposal;
    if (hashCanonical(draft) !== contentHash)
      context.addIssue({
        code: "custom",
        path: ["contentHash"],
        message: "Director planning artifact hash is invalid.",
      });
  });

export type DirectorProposalDraft = z.infer<typeof directorProposalDraftSchema>;
export type DirectorProposal = z.infer<typeof directorProposalSchema>;

export const sealDirectorProposal = (
  raw: DirectorProposalDraft,
): DirectorProposal => {
  const draft = directorProposalDraftSchema.parse(raw);
  return directorProposalSchema.parse({
    ...draft,
    contentHash: hashCanonical(draft),
  });
};

export type DirectorPlanningContext = {
  storyProject: Cv002Project;
};

export interface DirectorPlanner {
  propose(input: DirectorPlanningContext): DirectorProposalDraft;
}

export class Cv002AlphaDirectorPlanner implements DirectorPlanner {
  propose({ storyProject }: DirectorPlanningContext): DirectorProposalDraft {
    return {
      schemaVersion: "1.0",
      plannerId: "cv002-alpha-director",
      plannerVersion: "1.0",
      storyGraphContentHash: storyProject.graph.contentHash,
      grammar: storyProject.grammar,
      beatDirections: storyProject.directionDraft.directions,
      eventTimingAdjustments: [],
      shotOverrides: [],
    };
  }
}
