import { z } from "zod";
import {
  approvedAudioAssetVersionSchema,
  compiledAudioMixPlanSchema,
  frameToSample,
  type ApprovedAudioAssetVersion,
  type CompiledAudioMixPlan,
} from "../audio-director";
import { hashCanonical } from "../canonical-hash";
import { hashSchema, identifierSchema } from "../model";
import {
  directorProjectSchema,
  type DirectorProject,
} from "./director-project";
import { assertPlanningArtifactMatchesDirectorPlan } from "./planning-artifact-lineage";

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

const directorProductionBundleDraftSchema = z
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

/**
 * Structural wire-envelope validation only. This validates the bundle's own
 * shape, internal audio references, and canonical self-hash. It cannot
 * establish authority for referenced artifacts that are not embedded in the
 * payload. Authority transitions must call verifyDirectorProductionBundle().
 */
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

export const serializedDirectorProductionBundleSchema =
  directorProductionBundleSchema;

export function parseDirectorProductionBundleEnvelope(
  raw: unknown,
): DirectorProductionBundle {
  return serializedDirectorProductionBundleSchema.parse(raw);
}

const verifiedDirectorProductionBundleBrand: unique symbol = Symbol(
  "StoryStage.VerifiedDirectorProductionBundle",
);

/**
 * Process-local authority result. The brand is intentionally not serialized;
 * every JSON or IPC boundary must verify again from trusted source artifacts.
 */
export type VerifiedDirectorProductionBundle = Readonly<{
  bundle: DirectorProductionBundle;
  directorProject: DirectorProject;
  audioMixPlan: CompiledAudioMixPlan;
  approvedAudioAssetVersions: readonly ApprovedAudioAssetVersion[];
  [verifiedDirectorProductionBundleBrand]: true;
}>;

export type VerifyDirectorProductionBundleInput = {
  bundle: unknown;
  directorProject: unknown;
  audioMixPlan: unknown;
  approvedAudioAssetVersions: readonly unknown[];
};

export type VerifyStoredDirectorProductionBundleInput = {
  rawBundle: unknown;
  resolveDirectorProjectByContentHash: (contentHash: string) => unknown;
  resolveAudioMixPlanByContentHash: (contentHash: string) => unknown;
  resolveApprovedAudioAssetVersion: (
    approvedAssetVersionId: string,
    assetContentHash: string,
  ) => unknown;
};

function assertAudioBindings(
  bundle: DirectorProductionBundle,
  mixPlan: CompiledAudioMixPlan,
  assets: readonly ApprovedAudioAssetVersion[],
): void {
  const assetById = new Map(assets.map((asset) => [asset.id, asset] as const));
  if (assetById.size !== assets.length)
    throw new Error("Approved audio versions must be unique.");

  if (bundle.approvedAudioVersions.length !== assets.length)
    throw new Error(
      "Director production bundle does not bind the exact approved audio set.",
    );
  for (const binding of bundle.approvedAudioVersions) {
    const asset = assetById.get(binding.approvedAssetVersionId);
    if (!asset || asset.canonicalContentHash !== binding.assetContentHash)
      throw new Error(
        `Approved audio binding ${binding.approvedAssetVersionId} is stale.`,
      );
  }

  const selectedByLineId = new Map(
    bundle.selectedTakes.map((take) => [take.lineId, take] as const),
  );
  if (selectedByLineId.size !== bundle.selectedTakes.length)
    throw new Error("Each spoken line must have exactly one selected take.");
  for (const take of bundle.selectedTakes) {
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
}

function assertAudioMixMatchesDirectorProject(
  mixPlan: CompiledAudioMixPlan,
  directorProject: DirectorProject,
  assetById: ReadonlyMap<string, ApprovedAudioAssetVersion>,
): void {
  const { directorPlan, timingSolution, executableEpisodePlan } =
    directorProject;
  if (
    mixPlan.durationInFrames !== timingSolution.durationInFrames ||
    mixPlan.fps !== executableEpisodePlan.format.fps
  )
    throw new Error(
      "Audio mix format does not match the exact Director project timing.",
    );

  const eventById = new Map(
    directorPlan.events.map((event) => [event.id, event] as const),
  );
  const frameByEventId = new Map(
    timingSolution.resolvedEvents.map(
      (event) => [event.eventId, event.frame] as const,
    ),
  );
  const shotById = new Map(
    directorPlan.shots.map((shot) => [shot.id, shot] as const),
  );
  for (const cue of mixPlan.cues) {
    const event = eventById.get(cue.anchorEventId);
    const anchorFrame = frameByEventId.get(cue.anchorEventId);
    if (
      !event ||
      anchorFrame === undefined ||
      event.sceneId !== cue.sceneId ||
      event.beatId !== cue.beatId ||
      cue.resolvedStartFrame !== anchorFrame + cue.offsetFrames
    )
      throw new Error(
        `Audio cue ${cue.id} does not match its exact Director event timing.`,
      );
    if (cue.shotId !== null) {
      const shot = shotById.get(cue.shotId);
      const shotEventIds = shot
        ? new Set([
            shot.entryEventId,
            shot.exitEventId,
            shot.timingEnvelope.earliestCutEventId,
            shot.timingEnvelope.preferredCutEventId,
            shot.timingEnvelope.latestCutEventId,
          ])
        : null;
      if (
        !shot ||
        shot.sceneId !== cue.sceneId ||
        !shot.beatIds.includes(cue.beatId) ||
        !shotEventIds?.has(cue.anchorEventId)
      )
        throw new Error(
          `Audio cue ${cue.id} does not belong to its claimed Director shot.`,
        );
    }
    const asset = assetById.get(cue.approvedAssetVersionId);
    const trimmedSamples = cue.trimEndSampleExclusive - cue.trimStartSample;
    if (
      !asset ||
      cue.trimStartSample >= asset.sampleCount ||
      cue.trimEndSampleExclusive > asset.sampleCount ||
      trimmedSamples !==
        frameToSample(cue.durationFrames, mixPlan.fps, mixPlan.sampleRate)
    )
      throw new Error(
        `Audio cue ${cue.id} duration does not match its approved asset.`,
      );
  }
}

function deepFreezeEvidence<T>(value: T, seen = new WeakSet<object>()): T {
  if (value === null || typeof value !== "object" || seen.has(value))
    return value;
  seen.add(value);
  for (const child of Object.values(value as Record<string, unknown>))
    deepFreezeEvidence(child, seen);
  return Object.freeze(value);
}

/**
 * Establishes production-bundle authority from the exact source artifacts.
 * Callers must reopen those artifacts from a trusted content-addressed store;
 * arbitrary objects supplied beside a bundle are not independent evidence.
 */
export function verifyDirectorProductionBundle(
  input: VerifyDirectorProductionBundleInput,
): VerifiedDirectorProductionBundle {
  const bundle = parseDirectorProductionBundleEnvelope(input.bundle);
  const directorProject = directorProjectSchema.parse(input.directorProject);
  assertPlanningArtifactMatchesDirectorPlan(
    directorProject.planningArtifact,
    directorProject.directorPlan,
  );
  const audioMixPlan = compiledAudioMixPlanSchema.parse(input.audioMixPlan);
  const approvedAudioAssetVersions = input.approvedAudioAssetVersions.map(
    (asset) => approvedAudioAssetVersionSchema.parse(asset),
  );

  if (
    bundle.directorProjectId !== directorProject.id ||
    bundle.directorProjectContentHash !== directorProject.contentHash ||
    bundle.directorPlanContentHash !==
      directorProject.directorPlan.contentHash ||
    bundle.timingSolutionContentHash !==
      directorProject.timingSolution.contentHash
  )
    throw new Error(
      "Director production bundle does not match the exact Director project.",
    );
  if (
    bundle.productionId !== audioMixPlan.productionId ||
    bundle.audioMixPlanContentHash !== audioMixPlan.contentHash ||
    audioMixPlan.directorPlanContentHash !==
      directorProject.directorPlan.contentHash ||
    audioMixPlan.timingSolutionContentHash !==
      directorProject.timingSolution.contentHash
  )
    throw new Error(
      "Director production bundle does not match the exact audio mix plan.",
    );

  const assetById = new Map(
    approvedAudioAssetVersions.map((asset) => [asset.id, asset] as const),
  );
  assertAudioMixMatchesDirectorProject(
    audioMixPlan,
    directorProject,
    assetById,
  );
  assertAudioBindings(bundle, audioMixPlan, approvedAudioAssetVersions);
  return deepFreezeEvidence({
    bundle,
    directorProject,
    audioMixPlan,
    approvedAudioAssetVersions,
    [verifiedDirectorProductionBundleBrand]: true as const,
  });
}

/**
 * Trusted-store authority transition for restore, rendering, publication, and
 * delivery. Every referenced artifact is resolved by the exact hash already
 * sealed into the structural envelope before the source-aware verifier runs.
 */
export function verifyStoredDirectorProductionBundle(
  input: VerifyStoredDirectorProductionBundleInput,
): VerifiedDirectorProductionBundle {
  const bundle = parseDirectorProductionBundleEnvelope(input.rawBundle);
  return verifyDirectorProductionBundle({
    bundle,
    directorProject: input.resolveDirectorProjectByContentHash(
      bundle.directorProjectContentHash,
    ),
    audioMixPlan: input.resolveAudioMixPlanByContentHash(
      bundle.audioMixPlanContentHash,
    ),
    approvedAudioAssetVersions: bundle.approvedAudioVersions.map((binding) =>
      input.resolveApprovedAudioAssetVersion(
        binding.approvedAssetVersionId,
        binding.assetContentHash,
      ),
    ),
  });
}

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
  assertPlanningArtifactMatchesDirectorPlan(
    input.directorProject.planningArtifact,
    input.directorProject.directorPlan,
  );
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
  const selectedTakes = input.selectedTakes.map((take) =>
    selectedAudioTakeSchema.parse(take),
  );

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
  const bundle = parseDirectorProductionBundleEnvelope({
    ...draft,
    contentHash: hashCanonical(draft),
  });
  return verifyDirectorProductionBundle({
    bundle,
    directorProject,
    audioMixPlan: mixPlan,
    approvedAudioAssetVersions: assets,
  }).bundle;
}
