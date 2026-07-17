import {buildAnimaticSync, createProductionDraft} from "../pipeline";
import type {ProductionDraft, ShotOverride} from "../model";

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

export const rookPilot001Direction: Readonly<Record<string, Omit<ShotOverride, "shotId">>> = {
  "1.01": {treatment: "environment", framing: "wide", transition: "camera-carry", cameraAction: "cameraPush"},
  "1.02": {treatment: "character-performance", framing: "medium", transition: "hard-cut", cameraAction: "reframe"},
  "1.03": {treatment: "generated-illustration", framing: "insert", transition: "hard-cut", cameraAction: "cameraPush"},
  "1.04": {treatment: "character-performance", framing: "close-up", transition: "hard-cut", cameraAction: "reframe"},
  "1.05": {treatment: "generated-illustration", framing: "wide", transition: "hard-cut", cameraAction: "pan"},
  "1.06": {treatment: "kinetic-type", framing: "insert", transition: "hard-cut", cameraAction: "cameraPush"},
  "1.07": {treatment: "diagram", framing: "insert", transition: "hard-cut", cameraAction: "reframe"},
  "1.08": {treatment: "generated-illustration", framing: "wide", transition: "hard-cut", cameraAction: "cameraPush"},
  "1.09": {treatment: "diagram", framing: "insert", transition: "hard-cut", cameraAction: "pan"},
  "1.10": {treatment: "kinetic-type", framing: "insert", transition: "hard-cut", cameraAction: "cameraPush"},
  "1.11": {treatment: "reaction", framing: "close-up", transition: "hard-cut", cameraAction: "reframe"},
};

export function createRookPilot001Draft(): ProductionDraft {
  return createProductionDraft({productionId: rookPilot001.id, title: rookPilot001.title, projectType: "explainer", showPackId: "weird-history-editorial-v1", preset: "studio", script: rookPilot001.script, assetRoutingPolicy: {reuseApprovedFirst: true, generateMissing: true, licensedSources: "disabled", allowGeneratedHistoricalReconstruction: true, proposed3D: "never"}, format: {aspectRatio: "16:9", fps: 30}});
}

export function createRookPilot001Fixture(): {draft: ProductionDraft; overrides: ShotOverride[]} {
  const draft = createRookPilot001Draft();
  const base = buildAnimaticSync({draft});
  const shotNumbers = new Set(base.renderPlan.shots.map((shot) => shot.number));
  const missingDirection = base.renderPlan.shots.filter((shot) => !rookPilot001Direction[shot.number]);
  const staleDirection = Object.keys(rookPilot001Direction).filter((number) => !shotNumbers.has(number));
  if (missingDirection.length > 0 || staleDirection.length > 0) throw new Error(`Rook Pilot 001 direction no longer matches its compiled shots (missing: ${missingDirection.map((shot) => shot.number).join(", ") || "none"}; stale: ${staleDirection.join(", ") || "none"}).`);
  const overrides: ShotOverride[] = base.renderPlan.shots.map((shot) => ({shotId: shot.id, ...rookPilot001Direction[shot.number]!}));
  return {draft, overrides};
}
