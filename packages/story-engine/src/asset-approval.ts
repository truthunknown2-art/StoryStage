import {
  approvedAssetVersionSchema,
  assetManifestEntrySchema,
  resolvedProductionPlanSchema,
  type ApprovedAssetVersion,
  type AssetManifestEntry,
  type ResolvedProductionPlan,
} from "./model";

const kindForRole = (role: ResolvedProductionPlan["requirements"][number]["role"]): AssetManifestEntry["kind"] => {
  if (role === "background") return "location";
  if (role === "character") return "character-rig";
  if (role === "prop" || role === "insert") return "prop";
  if (role === "foreground") return "overlay";
  return "graphic";
};

export function applyApprovedAssetVersion(plan: ResolvedProductionPlan, approvedInput: ApprovedAssetVersion): ResolvedProductionPlan {
  const approved = approvedAssetVersionSchema.parse(approvedInput);
  const requirement = plan.requirements.find((candidate) => candidate.id === approved.requirementId);
  if (!requirement) throw new Error(`Approved asset references unknown requirement ${approved.requirementId}.`);
  const collision = [...plan.showPack.assets, ...plan.approvedAssets].find((asset) => asset.id === approved.assetId);
  if (collision && collision.contentHash !== approved.contentHash) throw new Error(`Asset ID ${approved.assetId} is already bound to different bytes.`);

  const asset = assetManifestEntrySchema.parse({
    id: approved.assetId,
    kind: kindForRole(requirement.role),
    version: approved.version,
    displayName: `Approved ${requirement.role}`,
    contentHash: approved.contentHash,
    hashStatus: "verified-bytes",
    origin: approved.provenance.sourceType === "generated" ? "generated-approved" : approved.provenance.sourceType === "licensed" ? "licensed-stock" : "user-owned",
    license: approved.provenance.usageNotes,
    localAssetKey: approved.assetId,
    tags: [requirement.role, requirement.entityId ?? "visual", "approved"],
    palette: ["#000000", "#ffffff", "#808080"],
  });

  const dependentVisualIds = new Set(plan.creativePlan.visualRequirements
    .filter((visual) => requirement.consumingShotIds.includes(visual.shotId) && visual.role === requirement.role && visual.entityId === requirement.entityId)
    .map((visual) => visual.id));

  const updateEntities = (entities: ResolvedProductionPlan["characters"]) => entities.map((entity) => entity.entityId === requirement.entityId
    ? {...entity, assetId: asset.id, resolved: true, matchStrategy: "explicit-binding" as const, matchConfidence: 1}
    : entity);
  const entityName = [...plan.characters, ...plan.locations, ...plan.props].find((entity) => entity.entityId === requirement.entityId)?.entityName;

  return resolvedProductionPlanSchema.parse({
    ...plan,
    characters: updateEntities(plan.characters),
    locations: updateEntities(plan.locations),
    props: updateEntities(plan.props),
    approvedAssets: collision ? plan.approvedAssets : [...plan.approvedAssets, asset],
    requirements: plan.requirements.map((candidate) => candidate.id === requirement.id ? {...candidate, status: "resolved"} : candidate),
    resolvedVisuals: plan.resolvedVisuals.map((visual) => dependentVisualIds.has(visual.requirementId) ? {...visual, assetId: asset.id, assetVersion: asset.version, contentHash: asset.contentHash, resolutionStatus: "approved"} : visual),
    generationBriefs: plan.generationBriefs.filter((brief) => brief.requirementId !== requirement.id),
    warnings: plan.warnings.filter((warning) => !warning.includes(requirement.id) && (!entityName || !warning.includes(entityName))),
  });
}
