import {
  generationBriefSchema,
  resolvedProductionPlanSchema,
  type AssetManifestEntry,
  type AssetRequirement,
  type CreativeEpisodePlan,
  type GenerationBrief,
  type ResolvedProductionPlan,
  type ResolvedVisual,
  type ShotOverride,
  type ShowPack,
  type StoryEntity,
  type VisualRequirement,
} from "./model";
import {applyTreatmentOverrides} from "./visual-requirements";

type Match = {asset: AssetManifestEntry; strategy: "explicit-binding" | "identity-lock" | "semantic-tag" | "show-pack-role" | "placeholder"; confidence: number; resolved: boolean};

const priorityRank: Record<AssetRequirement["priority"], number> = {"recurring-character": 0, "required-location": 1, "repeated-prop": 2, "single-shot-insert": 3, optional: 4};

function assetKindForEntity(entity: StoryEntity): AssetManifestEntry["kind"] {
  if (entity.kind === "character") return "character-rig";
  return entity.kind;
}

function explicitTagMatch(asset: AssetManifestEntry, entity: StoryEntity): boolean {
  const words = entity.name.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
  return asset.tags.some((tag) => words.some((word) => word.length > 2 && tag.toLowerCase() === word));
}

function matchEntity(showPack: ShowPack, entity: StoryEntity, placeholder: AssetManifestEntry): Match {
  if (entity.role === "presenter" && showPack.roleBindings.narrationPresenterAssetId) {
    const bound = showPack.assets.find((asset) => asset.id === showPack.roleBindings.narrationPresenterAssetId);
    if (bound) return {asset: bound, strategy: "show-pack-role", confidence: 1, resolved: true};
  }
  const compatible = showPack.assets.filter((asset) => asset.kind === assetKindForEntity(entity));
  const tagged = compatible.find((asset) => explicitTagMatch(asset, entity));
  if (tagged) return {asset: tagged, strategy: "semantic-tag", confidence: 0.9, resolved: true};
  return {asset: placeholder, strategy: "placeholder", confidence: 0, resolved: false};
}

function matchRequirement(showPack: ShowPack, requirement: VisualRequirement, entity: StoryEntity | undefined, entityMatch: Match | undefined, placeholder: AssetManifestEntry): Match {
  if (entity && entityMatch) return entityMatch;
  if (requirement.role === "diagram") {
    const graphic = showPack.assets.find((asset) => asset.kind === "graphic");
    if (graphic) return {asset: graphic, strategy: "show-pack-role", confidence: 1, resolved: true};
  }
  if (requirement.role === "foreground") {
    const overlay = showPack.assets.find((asset) => asset.kind === "overlay");
    if (overlay) return {asset: overlay, strategy: "show-pack-role", confidence: 1, resolved: true};
  }
  return {asset: placeholder, strategy: "placeholder", confidence: 0, resolved: false};
}

function requirementPriority(entity: StoryEntity | undefined, requirement: VisualRequirement, consumingShotCount: number): AssetRequirement["priority"] {
  if (entity?.kind === "character") return "recurring-character";
  if (entity?.kind === "location" || requirement.role === "background") return "required-location";
  if (entity?.kind === "prop" && (entity.mentions > 1 || consumingShotCount > 1)) return "repeated-prop";
  if (requirement.required) return "single-shot-insert";
  return "optional";
}

function outputRole(requirement: AssetRequirement, entity: StoryEntity | undefined): GenerationBrief["outputRole"] {
  if (entity?.kind === "character") return "character-canonical-sheet";
  if (entity?.kind === "location" || requirement.role === "background") return "background-master";
  if (entity?.kind === "prop" || requirement.role === "prop" || requirement.role === "insert") return "prop-cutout";
  if (requirement.role === "diagram") return "diagram";
  if (requirement.role === "reconstruction") return "reconstruction";
  return "editorial-illustration";
}

function makeGenerationBrief(showPack: ShowPack, creativePlan: CreativeEpisodePlan, requirement: AssetRequirement, entity: StoryEntity | undefined): GenerationBrief {
  const output = outputRole(requirement, entity);
  const compatibleKind = entity ? assetKindForEntity(entity) : output === "diagram" ? "graphic" : "placeholder";
  const references = showPack.assets.filter((asset) => asset.kind === compatibleKind && asset.kind !== "placeholder").slice(0, 2).map((asset) => ({assetId: asset.id, contentHash: asset.contentHash}));
  return generationBriefSchema.parse({
    schemaVersion: "1.0",
    id: `brief-${requirement.id}`,
    exchangeMode: "manual-chatgpt-images",
    productionId: creativePlan.productionId,
    requirementId: requirement.id,
    showPack: {id: showPack.id, version: showPack.version, contentHash: showPack.contentHash},
    styleBible: showPack.styleBible,
    identityLock: null,
    entity: {id: entity?.id ?? null, name: entity?.name ?? requirement.role.toUpperCase(), kind: entity?.kind ?? "visual"},
    outputRole: output,
    candidateCount: creativePlan.productionPolicy.imageCandidatesPerRequest,
    imageQuality: creativePlan.productionPolicy.imageQuality,
    backgroundLayerTarget: creativePlan.productionPolicy.backgroundLayerTarget,
    posePack: creativePlan.productionPolicy.posePack,
    controlledMatte: "#00ff00",
      referenceAssets: references,
      sourceExcerpts: creativePlan.shots
        .filter((shot) => requirement.consumingShotIds.includes(shot.id))
        .map((shot) => shot.sourceExcerpt)
        .filter((excerpt, index, excerpts) => excerpt.length > 0 && excerpts.indexOf(excerpt) === index)
        .slice(0, 3),
      creativeRequirements: [`Create an original ${output.replaceAll("-", " ")} for ${entity?.name ?? requirement.role}.`, ...showPack.profile.qualityRules],
    continuityRequirements: [`Match style bible ${showPack.styleBible.id} at ${showPack.styleBible.contentHash}.`, "Preserve approved identity and proportions across every returned file."],
    prohibitedChanges: ["Do not copy supplied reference-channel characters or branded art.", "Do not add text, signatures, watermarks, or unrequested props."],
    expectedFiles: output === "character-canonical-sheet" ? ["identity-sheet.png", "neutral-pose.png", "talk-pose.png", "reaction-pose.png"] : output === "background-master" ? ["clean-plate.png", "midground.png", "foreground-occluders.png"] : ["candidate.png"],
    consumingSceneIds: requirement.consumingSceneIds,
    consumingShotIds: requirement.consumingShotIds,
    approvalRequired: true,
    status: "draft",
  });
}

function visualGroupKey(visual: VisualRequirement): string {
  if (visual.entityId) return `${visual.role}-entity-${visual.entityId}`;
  if (visual.reusableConceptKey) return `${visual.role}-concept-${visual.reusableConceptKey}`;
  return `${visual.role}-shot-${visual.shotId}-${visual.id}`;
}

export function resolveAssets(creativePlanInput: CreativeEpisodePlan, showPack: ShowPack, overrides: ShotOverride[] = []): ResolvedProductionPlan {
  const creativePlan = applyTreatmentOverrides(creativePlanInput, overrides);
  const placeholder = showPack.assets.find((asset) => asset.kind === "placeholder");
  if (!placeholder) throw new Error(`Show pack ${showPack.id} is missing a placeholder asset.`);
  const allEntities = [...creativePlan.analysis.characters, ...creativePlan.analysis.locations, ...creativePlan.analysis.props];
  const entityById = new Map(allEntities.map((entity) => [entity.id, entity]));
  const matchByEntityId = new Map(allEntities.map((entity) => {
    const approvedMatch = matchEntity(showPack, entity, placeholder);
    return [entity.id, !creativePlan.assetRoutingPolicy.reuseApprovedFirst && approvedMatch.resolved
      ? {asset: placeholder, strategy: "placeholder" as const, confidence: 0, resolved: false}
      : approvedMatch] as const;
  }));
  const warnings = [...creativePlan.analysis.warnings];

  const toResolvedEntity = (entity: StoryEntity) => {
    const match = matchByEntityId.get(entity.id)!;
    if (!match.resolved) warnings.push(creativePlan.assetRoutingPolicy.reuseApprovedFirst
      ? `${entity.kind} ${entity.name} has no approved compatible asset; using ${placeholder.displayName}.`
      : `${entity.kind} ${entity.name} is routed to replacement generation because approved-asset reuse is disabled.`);
    return {entityId: entity.id, entityName: entity.name, assetId: match.asset.id, resolved: match.resolved, matchStrategy: match.strategy, matchConfidence: match.confidence};
  };

  const grouped = new Map<string, VisualRequirement[]>();
  for (const visual of creativePlan.visualRequirements) {
    const key = visualGroupKey(visual);
    grouped.set(key, [...(grouped.get(key) ?? []), visual]);
  }

  const requirements: AssetRequirement[] = [...grouped.entries()].map(([key, visuals]) => {
    const first = visuals[0]!;
    const entity = first.entityId ? entityById.get(first.entityId) : undefined;
    const match = matchRequirement(showPack, first, entity, entity ? matchByEntityId.get(entity.id) : undefined, placeholder);
    const resolvableByGeneration = ["generated", "approved-recurring"].includes(first.sourceIntent);
    const status: AssetRequirement["status"] = match.resolved ? "resolved" : resolvableByGeneration ? "unresolved" : "deferred";
    return {id: `requirement-${key}`, entityId: first.entityId, role: first.role, priority: requirementPriority(entity, first, visuals.length), consumingSceneIds: [...new Set(visuals.map((visual) => visual.sceneId))].sort(), consumingShotIds: [...new Set(visuals.map((visual) => visual.shotId))].sort(), sourceIntent: first.sourceIntent, status};
  }).sort((left, right) => priorityRank[left.priority] - priorityRank[right.priority] || left.id.localeCompare(right.id));

  const generationBriefs: GenerationBrief[] = [];
  for (const requirement of requirements) {
    if (requirement.status !== "unresolved") {
      if (requirement.status === "deferred") warnings.push(`${requirement.id} requires ${requirement.sourceIntent} acquisition and remains deferred.`);
      continue;
    }
    if (!creativePlan.assetRoutingPolicy.generateMissing || generationBriefs.length >= creativePlan.productionPolicy.maxNewAssets) {
      requirement.status = "deferred";
      warnings.push(`${requirement.id} remains unmet because the ${creativePlan.productionPolicy.preset} generation budget is exhausted or disabled.`);
      continue;
    }
    generationBriefs.push(makeGenerationBrief(showPack, creativePlan, requirement, requirement.entityId ? entityById.get(requirement.entityId) : undefined));
  }

  const requirementByGroupKey = new Map(requirements.map((requirement) => [requirement.id.replace(/^requirement-/, ""), requirement]));
  const requirementByVisualId = new Map(creativePlan.visualRequirements.map((visual) => [visual.id, requirementByGroupKey.get(visualGroupKey(visual))!]));
  const resolvedVisuals: ResolvedVisual[] = creativePlan.visualRequirements.map((visual) => {
    const entity = visual.entityId ? entityById.get(visual.entityId) : undefined;
    const match = matchRequirement(showPack, visual, entity, entity ? matchByEntityId.get(entity.id) : undefined, placeholder);
    const requirement = requirementByVisualId.get(visual.id);
    return {requirementId: visual.id, role: visual.role, assetId: match.asset.id, assetVersion: match.asset.version, contentHash: match.asset.contentHash, resolutionStatus: match.resolved ? "approved" : requirement?.status === "deferred" ? "unresolved" : "placeholder"};
  });

  return resolvedProductionPlanSchema.parse({
    schemaVersion: "1.2",
    creativePlan,
    showPack,
    characters: creativePlan.analysis.characters.map(toResolvedEntity),
    locations: creativePlan.analysis.locations.map(toResolvedEntity),
    props: creativePlan.analysis.props.map(toResolvedEntity),
    approvedAssets: [],
    requirements,
    resolvedVisuals,
    overrides,
    generationBriefs,
    warnings: [...new Set(warnings)],
  });
}
