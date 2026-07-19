import {
  creativeEpisodePlanSchema,
  type AssetRoutingPolicy,
  type CreativeEpisodePlan,
  type CreativeShot,
  type ShotOverride,
  type StoryAnalysis,
  type VisualRequirement,
} from "./model";

type RequirementInput = Pick<CreativeShot, "focusCharacterName" | "id" | "locationName" | "sceneId" | "sourceElementIds" | "treatment">;

const sourceIntentForTreatment = (treatment: CreativeShot["treatment"], routing: AssetRoutingPolicy): VisualRequirement["sourceIntent"] => {
  if (treatment === "licensed-media") return routing.licensedSources === "disabled" ? "generated" : "public-domain";
  if (treatment === "generated-illustration") return "generated";
  return "approved-recurring";
};

export function buildVisualRequirementsForShot(shot: RequirementInput, analysis: StoryAnalysis, routing: AssetRoutingPolicy): VisualRequirement[] {
  const entityByName = new Map([...analysis.characters, ...analysis.locations, ...analysis.props].map((entity) => [entity.name.toLowerCase(), entity]));
  const location = entityByName.get(shot.locationName.toLowerCase());
  const requirements: VisualRequirement[] = [{
    id: `${shot.id}-background`,
    sceneId: shot.sceneId,
    shotId: shot.id,
    role: "background",
    entityId: location?.id ?? null,
    reusableConceptKey: null,
    sourceIntent: "approved-recurring",
    required: true,
    description: `Background for ${shot.locationName}`,
  }];

  if (shot.focusCharacterName) {
    const character = entityByName.get(shot.focusCharacterName.toLowerCase());
    requirements.push({id: `${shot.id}-character`, sceneId: shot.sceneId, shotId: shot.id, role: "character", entityId: character?.id ?? null, reusableConceptKey: null, sourceIntent: "approved-recurring", required: true, description: `On-screen performance for ${shot.focusCharacterName}`});
  }

  const prop = analysis.props.find((candidate) => candidate.sourceElementIds.some((id) => shot.sourceElementIds.includes(id)));
  if (shot.treatment === "insert" || prop) requirements.push({id: `${shot.id}-insert`, sceneId: shot.sceneId, shotId: shot.id, role: prop ? "prop" : "insert", entityId: prop?.id ?? null, reusableConceptKey: null, sourceIntent: prop ? "approved-recurring" : "generated", required: true, description: prop ? `Readable prop view of ${prop.name}` : "Editorial insert visual"});
  if (shot.treatment === "diagram" || shot.treatment === "kinetic-type") requirements.push({id: `${shot.id}-diagram`, sceneId: shot.sceneId, shotId: shot.id, role: "diagram", entityId: null, reusableConceptKey: null, sourceIntent: "user-owned", required: true, description: shot.treatment === "kinetic-type" ? "Profile-authored kinetic typography" : "Profile-authored explanatory diagram"});
  if (shot.treatment === "licensed-media") requirements.push({id: `${shot.id}-evidence`, sceneId: shot.sceneId, shotId: shot.id, role: "evidence", entityId: null, reusableConceptKey: null, sourceIntent: sourceIntentForTreatment(shot.treatment, routing), required: true, description: "Authenticated contextual evidence or licensed source"});
  if (shot.treatment === "generated-illustration") requirements.push({id: `${shot.id}-reconstruction`, sceneId: shot.sceneId, shotId: shot.id, role: routing.allowGeneratedHistoricalReconstruction ? "reconstruction" : "insert", entityId: null, reusableConceptKey: null, sourceIntent: "generated", required: true, description: "Original generated illustration with reconstruction labeling when factual"});
  return requirements;
}

export function applyTreatmentOverrides(plan: CreativeEpisodePlan, overrides: ShotOverride[]): CreativeEpisodePlan {
  const shotIds = new Set(plan.shots.map((shot) => shot.id));
  const treatmentOverrides = new Map<string, NonNullable<ShotOverride["treatment"]>>();
  for (const override of overrides) {
    if (!shotIds.has(override.shotId)) throw new Error(`Shot override references unknown shot ${override.shotId}.`);
    if (treatmentOverrides.has(override.shotId) && override.treatment) throw new Error(`Shot ${override.shotId} has more than one treatment override.`);
    if (override.treatment) treatmentOverrides.set(override.shotId, override.treatment);
  }
  if (treatmentOverrides.size === 0) return plan;

  const existingRequirementsByShot = new Map<string, VisualRequirement[]>();
  for (const requirement of plan.visualRequirements) existingRequirementsByShot.set(requirement.shotId, [...(existingRequirementsByShot.get(requirement.shotId) ?? []), requirement]);
  const visualRequirements: VisualRequirement[] = [];
  const shots = plan.shots.map((shot) => {
    const treatment = treatmentOverrides.get(shot.id);
    if (!treatment || treatment === shot.treatment) {
      visualRequirements.push(...(existingRequirementsByShot.get(shot.id) ?? []));
      return shot;
    }

    const actions = shot.actions.filter((action) => action.detail.type !== "kineticType");
    if (treatment === "kinetic-type") actions.push({id: `${shot.id}-override-kinetic-type`, actorName: null, targetName: null, label: `Treatment override: ${shot.sourceExcerpt}`, startOffsetFrames: 0, durationInFrames: shot.durationInFrames, detail: {type: "kineticType", text: shot.sourceExcerpt, emphasis: shot.sourceExcerpt.trim().split(/\s+/).length === 1 ? "word" : "phrase"}});
    const reroutedShot = {...shot, treatment, actions};
    const requirements = buildVisualRequirementsForShot(reroutedShot, plan.analysis, plan.assetRoutingPolicy);
    visualRequirements.push(...requirements);
    return {...reroutedShot, visualRequirementIds: requirements.map((requirement) => requirement.id)};
  });

  return creativeEpisodePlanSchema.parse({...plan, shots, visualRequirements});
}
