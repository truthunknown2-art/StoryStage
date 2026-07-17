import {
  assetGenerationRequestSchema,
  resolvedProductionPlanSchema,
  type AssetGenerationRequest,
  type AssetManifestEntry,
  type CreativeEpisodePlan,
  type ResolvedProductionPlan,
  type ShotOverride,
  type ShowPack,
  type StoryEntity,
} from "./model";

const slug = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

type EntityKind = "character" | "location" | "prop";

const assetKindFor = (kind: EntityKind): AssetManifestEntry["kind"] => {
  if (kind === "character") return "character-rig";
  return kind;
};

function makeGenerationRequest(
  showPack: ShowPack,
  entity: StoryEntity,
  resolvedAssetId: string,
  creativePlan: CreativeEpisodePlan,
): AssetGenerationRequest {
  const assetKind = entity.kind === "character" ? "character-identity" : entity.kind === "location" ? "background-plate" : "prop";
  return assetGenerationRequestSchema.parse({
    schemaVersion: "1.0",
    id: `generate-${slug(entity.id)}`,
    showPackId: showPack.id,
    entityId: entity.id,
    assetKind,
    brief: `Create an original ${assetKind.replaceAll("-", " ")} for ${entity.name} under the approved ${showPack.displayName} identity bible.`,
    referenceAssetIds: [resolvedAssetId],
    candidateCount: creativePlan.productionPolicy.imageCandidatesPerRequest,
    imageQuality: creativePlan.productionPolicy.imageQuality,
    backgroundLayerTarget: creativePlan.productionPolicy.backgroundLayerTarget,
    posePack: creativePlan.productionPolicy.posePack,
    status: "draft",
  });
}

export function resolveAssets(
  creativePlan: CreativeEpisodePlan,
  showPack: ShowPack,
  overrides: ShotOverride[] = [],
): ResolvedProductionPlan {
  const placeholder = showPack.assets.find((candidate) => candidate.kind === "placeholder");
  if (!placeholder) throw new Error(`Show pack ${showPack.id} is missing a placeholder asset.`);

  const warnings = [...creativePlan.analysis.warnings];
  const generationRequests: AssetGenerationRequest[] = [];

  const resolveGroup = (entities: StoryEntity[], kind: EntityKind) => {
    const candidates = showPack.assets.filter((candidate) => candidate.kind === assetKindFor(kind));
    return entities.map((entity, index) => {
      const normalizedName = entity.name.toLowerCase();
      const tagged = candidates.find((candidate) => candidate.tags.some((tag) => normalizedName.includes(tag.toLowerCase()) || tag.toLowerCase().includes(normalizedName)));
      const selected = tagged ?? (kind === "prop" ? undefined : candidates[index]);
      const asset = selected ?? placeholder;
      const resolved = Boolean(selected);
      if (!resolved) warnings.push(`${entity.kind} ${entity.name} has no approved asset; using ${placeholder.displayName}.`);
      if (generationRequests.length < creativePlan.productionPolicy.maxNewAssets) {
        generationRequests.push(makeGenerationRequest(showPack, entity, asset.id, creativePlan));
      }
      return {entityId: entity.id, entityName: entity.name, assetId: asset.id, resolved};
    });
  };

  return resolvedProductionPlanSchema.parse({
    schemaVersion: "1.1",
    creativePlan,
    showPack,
    characters: resolveGroup(creativePlan.analysis.characters, "character"),
    locations: resolveGroup(creativePlan.analysis.locations, "location"),
    props: resolveGroup(creativePlan.analysis.props, "prop"),
    overrides,
    generationRequests,
    warnings: [...new Set(warnings)],
  });
}
