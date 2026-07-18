import {
  generationBriefsMatchAuthoritativePlan,
  generationExchangeStateSchema,
  generationJobSchema,
  hashCanonical,
  productionBundleSchema,
  verifyGenerationJobHash,
  verifyProductionBundleHash,
  type GenerationExchangeState,
  type GenerationJob,
  type ProductionBundle,
} from "@storystage/story-engine";

type MotionReviewLineageInput = {
  sourceProduction: unknown;
  generationJob: unknown;
  exchangeState: unknown;
  currentProduction: {id: string; revision: number};
  currentRenderPlanContentHash: string;
};

export type VerifiedMotionReviewLineage = {
  sourceProduction: ProductionBundle;
  generationJob: GenerationJob;
  exchangeState: GenerationExchangeState;
};

export function verifyRookMotionReviewLineage(input: MotionReviewLineageInput): VerifiedMotionReviewLineage {
  const sourceProduction = productionBundleSchema.parse(input.sourceProduction);
  const generationJob = generationJobSchema.parse(input.generationJob);
  const exchangeState = generationExchangeStateSchema.parse(input.exchangeState);

  if (!verifyProductionBundleHash(sourceProduction)) throw new Error("Motion review source production failed its immutable content hash.");
  if (!verifyGenerationJobHash(generationJob)) throw new Error("Motion review generation job failed its immutable content hash.");
  if (generationJob.productionBundleContentHash !== sourceProduction.contentHash) throw new Error("Motion review generation job is not bound to the packet source production.");
  if (generationJob.production.id !== sourceProduction.production.productionId
    || generationJob.production.revision !== sourceProduction.production.revision
    || generationJob.production.title !== sourceProduction.production.title) throw new Error("Motion review generation job does not match the packet source production identity.");
  if (hashCanonical(generationJob.showPack) !== hashCanonical({id: sourceProduction.resolvedPlan.showPack.id, version: sourceProduction.resolvedPlan.showPack.version, contentHash: sourceProduction.resolvedPlan.showPack.contentHash})
    || !generationBriefsMatchAuthoritativePlan(generationJob.briefs, sourceProduction.resolvedPlan.generationBriefs)) throw new Error("Motion review generation job does not match the packet source production briefs.");
  if (exchangeState.exchangeJobId !== generationJob.exchangeJobId || exchangeState.generationJobContentHash !== generationJob.contentHash) throw new Error("Motion review exchange state is not bound to the verified generation job.");
  if (exchangeState.production.id !== generationJob.production.id || exchangeState.production.revision !== generationJob.production.revision) throw new Error("Motion review exchange state does not match the verified generation job identity.");
  if (exchangeState.status !== "needs-review") throw new Error("Motion review exchange is no longer awaiting human review.");
  if (input.currentProduction.id !== sourceProduction.production.productionId || input.currentProduction.revision !== sourceProduction.production.revision) throw new Error("Current Rook production identity does not match the prepared source production.");
  if (input.currentRenderPlanContentHash !== sourceProduction.renderPlan.contentHash) throw new Error("Current Rook render plan does not match the prepared source production render plan.");

  return {sourceProduction, generationJob, exchangeState};
}
