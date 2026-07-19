import { z } from "zod";
import {
  approvedAudioAssetVersionSchema,
  compiledAudioMixPlanSchema,
  type ApprovedAudioAssetVersion,
  type CompiledAudioMixPlan,
} from "../audio-director";
import { hashCanonical } from "../canonical-hash";
import { hashSchema, identifierSchema } from "../model";
import {
  directorProjectSchema,
  type DirectorProject,
} from "./director-project";

export const approvedAudioVersionBindingSchema = z
  .object({
    approvedAssetVersionId: identifierSchema,
    assetContentHash: hashSchema,
  })
  .strict();

export const selectedAudioTakeSchema = z
  .object({
    lineId: identifierSchema,
    takeId: identifierSchema,
    dialoguePerformanceId: identifierSchema,
    approvedAssetVersionId: identifierSchema,
    assetContentHash: hashSchema,
  })
  .strict();

const directorProductionBundleFields = {
  schemaVersion: z.literal("1.0"),
  id: identifierSchema,
  productionId: identifierSchema,
  directorProjectId: identifierSchema,
  directorProjectContentHash: hashSchema,
  directorPlanContentHash: hashSchema,
  timingSolutionContentHash: hashSchema,
  approvedAudioVersions: z.array(approvedAudioVersionBindingSchema),
  selectedTakes: z.array(selectedAudioTakeSchema),
  audioMixPlanContentHash: hashSchema,
};

export const directorProductionBundleDraftSchema = z
  .object(directorProductionBundleFields)
  .strict()
  .superRefine((bundle, context) => {
    const approvedIds = new Set<string>();
    bundle.approvedAudioVersions.forEach((binding, index) => {
      if (approvedIds.has(binding.approvedAssetVersionId))
        context.addIssue({
          code: "custom",
          path: ["approvedAudioVersions", index],
          message: `Duplicate approved audio version ${binding.approvedAssetVersionId}.`,
        });
      approvedIds.add(binding.approvedAssetVersionId);
    });

    const lineIds = new Set<string>();
    bundle.selectedTakes.forEach((take, index) => {
      if (lineIds.has(take.lineId))
        context.addIssue({
          code: "custom",
          path: ["selectedTakes", index, "lineId"],
          message: `Line ${take.lineId} has more than one selected take.`,
        });
      lineIds.add(take.lineId);
      if (!approvedIds.has(take.approvedAssetVersionId))
        context.addIssue({
          code: "custom",
          path: ["selectedTakes", index, "approvedAssetVersionId"],
          message: `Selected take ${take.takeId} is not in the approved audio set.`,
        });
    });
  });

export const directorProductionBundleSchema = z
  .object({ ...directorProductionBundleFields, contentHash: hashSchema })
  .strict()
  .superRefine((bundle, context) => {
    const { contentHash, ...draft } = bundle;
    const result = directorProductionBundleDraftSchema.safeParse(draft);
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
        message: "Director production bundle hash is invalid.",
      });
  });

export type ApprovedAudioVersionBinding = z.infer<
  typeof approvedAudioVersionBindingSchema
>;
export type SelectedAudioTake = z.infer<typeof selectedAudioTakeSchema>;
export type DirectorProductionBundle = z.infer<
  typeof directorProductionBundleSchema
>;

export type SealDirectorProductionBundleInput = {
  id: string;
  directorProject: DirectorProject;
  audioMixPlan: CompiledAudioMixPlan;
  approvedAudioAssetVersions: readonly ApprovedAudioAssetVersion[];
  selectedTakes: readonly SelectedAudioTake[];
};

/**
 * Seals mutable production choices beside, never inside, DirectorProject.
 */
export function sealDirectorProductionBundle(
  input: SealDirectorProductionBundleInput,
): DirectorProductionBundle {
  const directorProject = directorProjectSchema.parse(input.directorProject);
  const mixPlan = compiledAudioMixPlanSchema.parse(input.audioMixPlan);
  if (
    mixPlan.directorPlanContentHash !==
      directorProject.directorPlan.contentHash ||
    mixPlan.timingSolutionContentHash !==
      directorProject.timingSolution.contentHash
  )
    throw new Error(
      "Audio mix plan is stale for the selected Director project.",
    );

  const assets = input.approvedAudioAssetVersions.map((asset) =>
    approvedAudioAssetVersionSchema.parse(asset),
  );
  const assetById = new Map(assets.map((asset) => [asset.id, asset] as const));
  if (assetById.size !== assets.length)
    throw new Error("Approved audio versions must be unique.");

  const selectedTakes = input.selectedTakes.map((take) =>
    selectedAudioTakeSchema.parse(take),
  );
  const selectedByLineId = new Map(
    selectedTakes.map((take) => [take.lineId, take] as const),
  );
  if (selectedByLineId.size !== selectedTakes.length)
    throw new Error("Each spoken line must have exactly one selected take.");

  for (const take of selectedTakes) {
    const asset = assetById.get(take.approvedAssetVersionId);
    if (!asset || asset.canonicalContentHash !== take.assetContentHash)
      throw new Error(
        `Selected take ${take.takeId} has a stale audio asset binding.`,
      );
  }
  for (const cue of mixPlan.cues) {
    const asset = assetById.get(cue.approvedAssetVersionId);
    if (!asset || asset.canonicalContentHash !== cue.assetContentHash)
      throw new Error(
        `Audio cue ${cue.id} is not bound to an approved version.`,
      );
    if (cue.lineId !== null) {
      const take = selectedByLineId.get(cue.lineId);
      if (
        !take ||
        take.approvedAssetVersionId !== cue.approvedAssetVersionId ||
        take.assetContentHash !== cue.assetContentHash
      )
        throw new Error(`Audio cue ${cue.id} does not use its selected take.`);
    }
  }

  const draft = directorProductionBundleDraftSchema.parse({
    schemaVersion: "1.0",
    id: input.id,
    productionId: mixPlan.productionId,
    directorProjectId: directorProject.id,
    directorProjectContentHash: directorProject.contentHash,
    directorPlanContentHash: directorProject.directorPlan.contentHash,
    timingSolutionContentHash: directorProject.timingSolution.contentHash,
    approvedAudioVersions: assets
      .map((asset) => ({
        approvedAssetVersionId: asset.id,
        assetContentHash: asset.canonicalContentHash,
      }))
      .sort((left, right) =>
        left.approvedAssetVersionId.localeCompare(right.approvedAssetVersionId),
      ),
    selectedTakes: [...selectedTakes].sort((left, right) =>
      left.lineId.localeCompare(right.lineId),
    ),
    audioMixPlanContentHash: mixPlan.contentHash,
  });
  return directorProductionBundleSchema.parse({
    ...draft,
    contentHash: hashCanonical(draft),
  });
}
