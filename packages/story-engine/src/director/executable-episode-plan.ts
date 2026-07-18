import { z } from "zod";
import { hashCanonical } from "../canonical-hash";
import { hashSchema, identifierSchema } from "../model";
import { directorPlanSchema, type DirectorPlan } from "./director-plan";
import { timingSolutionSchema, type TimingSolution } from "./timing-solution";

const executableShotSchema = z
  .object({
    id: identifierSchema,
    directorShotId: identifierSchema,
    startFrame: z.number().int().nonnegative(),
    endFrameExclusive: z.number().int().positive(),
    cutEventId: identifierSchema,
    stageKitId: identifierSchema,
    treatmentRendererId: identifierSchema,
    transitionRendererId: identifierSchema,
    performanceProgramIds: z.array(identifierSchema),
    layerIds: z.array(identifierSchema).min(3),
  })
  .strict();

const performanceProgramSchema = z
  .object({
    id: identifierSchema,
    kind: z.enum([
      "articulated-rig",
      "drawing-sequence",
      "atlas-cycle",
      "living-hold",
    ]),
    rendererId: identifierSchema,
    rendererVersion: z.string().min(1),
    entityId: identifierSchema,
    eventIds: z.array(identifierSchema).min(1),
    assetIds: z.array(identifierSchema),
    manifestContentHash: hashSchema,
  })
  .strict();

const approvedAssetBindingSchema = z
  .object({
    assetId: identifierSchema,
    version: z.string().min(1),
    contentHash: hashSchema,
    status: z.enum(["approved", "proxy"]),
  })
  .strict();

const executableEpisodePlanFields = {
  schemaVersion: z.literal("1.0"),
  id: identifierSchema,
  renderMode: z.enum(["proxy-animatic", "final"]),
  directorPlanContentHash: hashSchema,
  timingSolutionContentHash: hashSchema,
  grammarProfileContentHash: hashSchema,
  registryVersions: z
    .object({
      stage: z.string().min(1),
      performance: z.string().min(1),
      treatment: z.string().min(1),
      transition: z.string().min(1),
      audio: z.string().min(1),
    })
    .strict(),
  format: z
    .object({
      width: z.number().int().positive(),
      height: z.number().int().positive(),
      fps: z.number().int().positive(),
      durationInFrames: z.number().int().positive(),
    })
    .strict(),
  stageKits: z.array(
    z
      .object({
        id: identifierSchema,
        rendererId: identifierSchema,
        layerIds: z.array(identifierSchema).min(3),
        assetIds: z.array(identifierSchema),
      })
      .strict(),
  ),
  shots: z.array(executableShotSchema).min(1),
  performancePrograms: z.array(performanceProgramSchema),
  approvedAssets: z.array(approvedAssetBindingSchema),
  audioCues: z.array(
    z
      .object({
        id: identifierSchema,
        eventId: identifierSchema,
        assetId: identifierSchema.nullable(),
        gain: z.number().min(0).max(2),
      })
      .strict(),
  ),
};

export const executableEpisodePlanDraftSchema = z
  .object(executableEpisodePlanFields)
  .strict();

export const executableEpisodePlanSchema = z
  .object({ ...executableEpisodePlanFields, contentHash: hashSchema })
  .strict()
  .superRefine((episode, context) => {
    const { contentHash, ...draft } = episode;
    if (hashCanonical(draft) !== contentHash)
      context.addIssue({
        code: "custom",
        path: ["contentHash"],
        message: "Executable episode plan hash is invalid.",
      });
    if (
      episode.renderMode === "final" &&
      episode.approvedAssets.some((asset) => asset.status !== "approved")
    )
      context.addIssue({
        code: "custom",
        path: ["approvedAssets"],
        message: "Final renders may not consume proxy assets.",
      });
  });

export type ExecutableEpisodePlanDraft = z.infer<
  typeof executableEpisodePlanDraftSchema
>;
export type ExecutableEpisodePlan = z.infer<typeof executableEpisodePlanSchema>;

export function sealExecutableEpisodePlan(
  rawDirectorPlan: DirectorPlan,
  rawTimingSolution: TimingSolution,
  rawDraft: ExecutableEpisodePlanDraft,
): ExecutableEpisodePlan {
  const directorPlan = directorPlanSchema.parse(rawDirectorPlan);
  const timing = timingSolutionSchema.parse(rawTimingSolution);
  const draft = executableEpisodePlanDraftSchema.parse(rawDraft);
  if (
    draft.directorPlanContentHash !== directorPlan.contentHash ||
    timing.directorPlanContentHash !== directorPlan.contentHash
  )
    throw new Error("Executable plan does not match the Director plan.");
  if (draft.timingSolutionContentHash !== timing.contentHash)
    throw new Error("Executable plan does not match the Timing Solution.");
  if (
    draft.grammarProfileContentHash !== directorPlan.grammarProfileContentHash
  )
    throw new Error("Executable plan does not match the directing grammar.");
  if (draft.format.durationInFrames !== timing.durationInFrames)
    throw new Error("Executable duration does not match the Timing Solution.");

  const programIds = new Set(
    draft.performancePrograms.map((program) => program.id),
  );
  const stageIds = new Set(draft.stageKits.map((stage) => stage.id));
  const assetIds = new Set(draft.approvedAssets.map((asset) => asset.assetId));
  if (
    draft.shots.length !== timing.resolvedShots.length ||
    draft.shots.some((shot, index) => {
      const resolved = timing.resolvedShots[index];
      return (
        !resolved ||
        shot.directorShotId !== resolved.shotId ||
        shot.startFrame !== resolved.startFrame ||
        shot.endFrameExclusive !== resolved.endFrameExclusive ||
        shot.cutEventId !== resolved.cutEventId
      );
    })
  )
    throw new Error("Executable shots must exactly match the Timing Solution.");
  draft.shots.forEach((shot) => {
    if (!stageIds.has(shot.stageKitId))
      throw new Error(`${shot.id} references an unknown stage kit.`);
    if (
      shot.performanceProgramIds.some((programId) => !programIds.has(programId))
    )
      throw new Error(`${shot.id} references an unknown performance program.`);
  });
  draft.performancePrograms.forEach((program) => {
    if (program.assetIds.some((assetId) => !assetIds.has(assetId)))
      throw new Error(`${program.id} references an unresolved asset.`);
  });
  draft.stageKits.forEach((stage) => {
    if (stage.assetIds.some((assetId) => !assetIds.has(assetId)))
      throw new Error(`${stage.id} references an unresolved asset.`);
  });

  return executableEpisodePlanSchema.parse({
    ...draft,
    contentHash: hashCanonical(draft),
  });
}
