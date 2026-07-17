import {compileAnimation} from "./animation-compiler";
import {resolveAssets} from "./asset-resolver";
import {directEpisode} from "./director";
import {measureDirectedPlan} from "./metrics";
import {
  productionDraftSchema,
  productionEstimateSchema,
  type AssetRoutingPolicy,
  type CreativeEpisodePlan,
  type DirectedPlanMetrics,
  type FrameAccurateRenderPlan,
  type ProductionDiagnostic,
  type ProductionDraft,
  type ProductionEstimate,
  type ProjectType,
  type ResolvedProductionPlan,
  type ScriptDocument,
  type ShotOverride,
  type StoryAnalysis,
} from "./model";
import {analyzeStory, parseScript} from "./script-parser";
import {getProductionPolicy} from "./production-policy";
import {getShowPack} from "./show-pack";
import {createEstimatedTiming, EstimatedTextTimingProvider, type DialogueTimingProvider} from "./timing";

export type BuildAnimaticInput = {draft: ProductionDraft; overrides?: ShotOverride[]; timingProvider?: DialogueTimingProvider};
export type CreateProductionDraftInput = Omit<ProductionDraft, "schemaVersion" | "revision" | "assetRoutingPolicy" | "format"> & {revision?: number; assetRoutingPolicy?: AssetRoutingPolicy; format?: ProductionDraft["format"]};

export type AnimaticBuild = {
  draft: ProductionDraft;
  scriptDocument: ScriptDocument;
  storyAnalysis: StoryAnalysis;
  creativePlan: CreativeEpisodePlan;
  resolvedPlan: ResolvedProductionPlan;
  renderPlan: FrameAccurateRenderPlan;
  metrics: DirectedPlanMetrics;
  estimate: ProductionEstimate;
};

export type BuildAnimaticResult = {ok: true; build: AnimaticBuild; diagnostics: []} | {ok: false; diagnostics: ProductionDiagnostic[]};

export function defaultAssetRoutingPolicy(projectType: ProjectType): AssetRoutingPolicy {
  return {reuseApprovedFirst: true, generateMissing: true, licensedSources: projectType === "explainer" ? "factual-first" : "disabled", allowGeneratedHistoricalReconstruction: projectType === "explainer", proposed3D: "never"};
}

export function createProductionDraft(input: CreateProductionDraftInput): ProductionDraft {
  return productionDraftSchema.parse({schemaVersion: "1.0", revision: input.revision ?? 1, ...input, assetRoutingPolicy: input.assetRoutingPolicy ?? defaultAssetRoutingPolicy(input.projectType), format: input.format ?? {aspectRatio: "16:9", fps: 30}});
}

function validateDraft(draftInput: ProductionDraft): ProductionDraft {
  const draft = productionDraftSchema.parse(draftInput);
  const showPack = getShowPack(draft.showPackId);
  if (showPack.projectType !== draft.projectType) throw new Error(`Show Pack ${showPack.id} is ${showPack.projectType}, not ${draft.projectType}.`);
  return draft;
}

function buildFromStages(input: BuildAnimaticInput, draft: ProductionDraft, scriptDocument: ScriptDocument, storyAnalysis: StoryAnalysis, timing: ReturnType<typeof createEstimatedTiming>): AnimaticBuild {
  const showPack = getShowPack(draft.showPackId);
  const productionPolicy = getProductionPolicy(draft.preset);
  const creativePlan = directEpisode(scriptDocument, storyAnalysis, timing, {draft, productionPolicy, showPack});
  const resolvedPlan = resolveAssets(creativePlan, showPack, input.overrides ?? []);
  const renderPlan = compileAnimation(resolvedPlan);
  const metrics = measureDirectedPlan(creativePlan);
  const estimate = productionEstimateSchema.parse({shotCount: renderPlan.shots.length, durationSeconds: renderPlan.durationInFrames / renderPlan.fps, newRequirementCount: resolvedPlan.generationBriefs.length, deferredRequirementCount: resolvedPlan.requirements.filter((requirement) => requirement.status === "deferred").length, estimatedCandidateImages: resolvedPlan.generationBriefs.reduce((sum, brief) => sum + brief.candidateCount, 0), outputWidth: renderPlan.width, outputHeight: renderPlan.height});
  return {draft, scriptDocument, storyAnalysis, creativePlan, resolvedPlan, renderPlan, metrics, estimate};
}

export function buildAnimaticSync(input: BuildAnimaticInput): AnimaticBuild {
  const draft = validateDraft(input.draft);
  const showPack = getShowPack(draft.showPackId);
  const scriptDocument = parseScript(draft.script, draft.title, draft.productionId);
  const storyAnalysis = analyzeStory(scriptDocument, {includeNarrationPresenter: Boolean(showPack.roleBindings.narrationPresenterAssetId)});
  return buildFromStages(input, draft, scriptDocument, storyAnalysis, createEstimatedTiming(scriptDocument));
}

function diagnosticFrom(error: unknown): ProductionDiagnostic {
  const message = error instanceof Error ? error.message : "The production could not be planned.";
  const code: ProductionDiagnostic["code"] = /Show Pack/.test(message) ? "show-pack-mismatch" : /script|scene heading|screenplay|Paste/.test(message) ? "invalid-script" : "planning-failed";
  return {code, path: code === "invalid-script" ? "script" : "production", message};
}

export function tryBuildAnimaticSync(input: BuildAnimaticInput): BuildAnimaticResult {
  const parsed = productionDraftSchema.safeParse(input.draft);
  if (!parsed.success) return {ok: false, diagnostics: parsed.error.issues.map((issue) => ({code: "invalid-production", path: issue.path.join("."), message: issue.message}))};
  try {
    return {ok: true, build: buildAnimaticSync({...input, draft: parsed.data}), diagnostics: []};
  } catch (error) {
    return {ok: false, diagnostics: [diagnosticFrom(error)]};
  }
}

export async function buildAnimatic(input: BuildAnimaticInput): Promise<AnimaticBuild> {
  const draft = validateDraft(input.draft);
  const showPack = getShowPack(draft.showPackId);
  const scriptDocument = parseScript(draft.script, draft.title, draft.productionId);
  const storyAnalysis = analyzeStory(scriptDocument, {includeNarrationPresenter: Boolean(showPack.roleBindings.narrationPresenterAssetId)});
  const timingProvider = input.timingProvider ?? new EstimatedTextTimingProvider();
  return buildFromStages(input, draft, scriptDocument, storyAnalysis, await timingProvider.createTiming(scriptDocument));
}
