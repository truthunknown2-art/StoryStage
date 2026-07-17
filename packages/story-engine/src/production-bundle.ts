import {z} from "zod";
import {hashCanonical} from "./canonical-hash";
import {compileAnimation, verifyRenderPlanHash} from "./animation-compiler";
import {
  directedPlanMetricsSchema,
  approvedAssetVersionSchema,
  frameAccurateRenderPlanSchema,
  hashSchema,
  productionDraftSchema,
  productionEstimateSchema,
  resolvedProductionPlanSchema,
  shotOverrideSchema,
} from "./model";

const productionBundleFields = {
  schemaVersion: z.literal("1.0"),
  production: productionDraftSchema,
  overrides: z.array(shotOverrideSchema),
  resolvedPlan: resolvedProductionPlanSchema,
  renderPlan: frameAccurateRenderPlanSchema,
  metrics: directedPlanMetricsSchema,
  estimate: productionEstimateSchema,
  approvedAssetVersions: z.array(approvedAssetVersionSchema).optional(),
};

const validateProductionBundle = (bundle: z.infer<z.ZodObject<typeof productionBundleFields>>, context: z.RefinementCtx) => {
  const identity = bundle.production.productionId;
  const revision = bundle.production.revision;
  if (bundle.resolvedPlan.creativePlan.productionId !== identity || bundle.renderPlan.productionId !== identity) context.addIssue({code: "custom", message: "Production bundle plans must share the production identity."});
  if (bundle.resolvedPlan.creativePlan.planRevision !== revision || bundle.renderPlan.planRevision !== revision) context.addIssue({code: "custom", message: "Production bundle plans must share the production revision."});
  if (bundle.resolvedPlan.showPack.id !== bundle.production.showPackId || bundle.renderPlan.showPack.id !== bundle.production.showPackId || bundle.resolvedPlan.showPack.contentHash !== bundle.renderPlan.showPack.contentHash) context.addIssue({code: "custom", message: "Production bundle plans must share the authoritative Show Pack identity and hash."});
  const compiledRenderPlan = compileAnimation(bundle.resolvedPlan);
  if (!verifyRenderPlanHash(bundle.renderPlan) || hashCanonical(compiledRenderPlan) !== hashCanonical(bundle.renderPlan)) context.addIssue({code: "custom", message: "Production bundle render plan must exactly derive from the included resolved plan."});
  const creativePlan = bundle.resolvedPlan.creativePlan;
  const aspectMatches = bundle.production.format.aspectRatio === "16:9" ? creativePlan.width * 9 === creativePlan.height * 16 : creativePlan.width * 16 === creativePlan.height * 9;
  if (creativePlan.title !== bundle.production.title || creativePlan.projectType !== bundle.production.projectType || creativePlan.fps !== bundle.production.format.fps || !aspectMatches) context.addIssue({code: "custom", message: "Production bundle draft must match the included creative plan."});
  if (hashCanonical(bundle.overrides) !== hashCanonical(bundle.resolvedPlan.overrides)) context.addIssue({code: "custom", message: "Production bundle overrides must match the resolved plan."});
  if (hashCanonical(bundle.metrics) !== hashCanonical(bundle.renderPlan.metrics)) context.addIssue({code: "custom", message: "Production bundle metrics must match the frozen render plan."});
  for (const [index, approved] of (bundle.approvedAssetVersions ?? []).entries()) {
    const requirement = bundle.resolvedPlan.requirements.find((candidate) => candidate.id === approved.requirementId);
    const asset = bundle.resolvedPlan.approvedAssets.find((candidate) => candidate.id === approved.assetId && candidate.contentHash === approved.contentHash);
    if (!requirement || requirement.status !== "resolved" || !asset || bundle.resolvedPlan.generationBriefs.some((brief) => brief.requirementId === approved.requirementId)) context.addIssue({code: "custom", path: ["approvedAssetVersions", index], message: "Approved asset versions must be applied to the included resolved plan."});
  }
  const expectedEstimate = {
    shotCount: bundle.renderPlan.shots.length,
    durationSeconds: bundle.renderPlan.durationInFrames / bundle.renderPlan.fps,
    newRequirementCount: bundle.resolvedPlan.generationBriefs.length,
    deferredRequirementCount: bundle.resolvedPlan.requirements.filter((requirement) => requirement.status === "deferred").length,
    estimatedCandidateImages: bundle.resolvedPlan.generationBriefs.reduce((sum, brief) => sum + brief.candidateCount, 0),
    outputWidth: bundle.renderPlan.width,
    outputHeight: bundle.renderPlan.height,
  };
  if (hashCanonical(bundle.estimate) !== hashCanonical(expectedEstimate)) context.addIssue({code: "custom", message: "Production bundle estimate must match the included plans."});
};

export const productionBundleDraftSchema = z.object(productionBundleFields).strict().superRefine(validateProductionBundle);

export const productionBundleSchema = z.object({...productionBundleFields,
  savedAt: z.string().datetime(),
  contentHash: hashSchema,
}).strict().superRefine(validateProductionBundle);

export type ProductionBundleDraft = z.infer<typeof productionBundleDraftSchema>;
export type ProductionBundle = z.infer<typeof productionBundleSchema>;

export function finalizeProductionBundle(draftInput: ProductionBundleDraft, savedAt: string): ProductionBundle {
  const draft = productionBundleDraftSchema.parse(draftInput);
  const unhashed = {...draft, savedAt};
  return productionBundleSchema.parse({...unhashed, contentHash: hashCanonical(unhashed)});
}

export function verifyProductionBundleHash(bundle: ProductionBundle): boolean {
  const unhashed = Object.fromEntries(Object.entries(bundle).filter(([key]) => key !== "contentHash"));
  return hashCanonical(unhashed) === bundle.contentHash;
}
