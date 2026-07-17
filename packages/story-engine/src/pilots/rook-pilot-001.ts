import {buildAnimaticSync, createProductionDraft} from "../pipeline";
import type {ProductionDraft, ShotOverride, ShotTreatment} from "../model";

export const rookPilot001 = {
  id: "rook-pilot-001",
  title: "The Dancing Plague Had a Payroll",
  profile: "frankly-weird-history",
  presenter: "Rook",
  editorialApprovalStatus: "draft-needs-user-approval",
  script: `INT. EDITORIAL ARCHIVE - NIGHT

NARRATOR: In 1518 Strasbourg watched one woman begin dancing alone in the street.

NARRATOR: Within weeks the growing crowd had become a genuine public emergency.

NARRATOR: Officials chose music instead of medicine and built the dancers a stage.

NARRATOR: Their gloriously backward theory said exhausted dancers could dance the fever out.

NARRATOR: History remembers a dancing plague but someone also approved its entertainment budget.`,
} as const;

const allowedTreatments = new Set<ShotTreatment>(["environment", "character-performance", "reaction", "kinetic-type"]);
const boundedTreatmentCycle: ShotTreatment[] = ["character-performance", "kinetic-type", "reaction", "environment"];

export function createRookPilot001Draft(): ProductionDraft {
  return createProductionDraft({productionId: rookPilot001.id, title: rookPilot001.title, projectType: "explainer", showPackId: "weird-history-editorial-v1", preset: "studio", script: rookPilot001.script, assetRoutingPolicy: {reuseApprovedFirst: true, generateMissing: true, licensedSources: "disabled", allowGeneratedHistoricalReconstruction: false, proposed3D: "never"}, format: {aspectRatio: "16:9", fps: 30}});
}

export function createRookPilot001Fixture(): {draft: ProductionDraft; overrides: ShotOverride[]} {
  const draft = createRookPilot001Draft();
  const base = buildAnimaticSync({draft});
  const overrides: ShotOverride[] = base.renderPlan.shots.flatMap((shot, index) => allowedTreatments.has(shot.treatment) ? [] : [{shotId: shot.id, treatment: boundedTreatmentCycle[index % boundedTreatmentCycle.length]!}]);
  return {draft, overrides};
}
