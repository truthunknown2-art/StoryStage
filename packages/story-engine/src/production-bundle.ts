import {z} from "zod";
import {hashCanonical} from "./canonical-hash";
import {compileAnimation, verifyRenderPlanHash} from "./animation-compiler";
import {
  audioMixSchema,
  directedPlanMetricsSchema,
  approvedAssetVersionSchema,
  frameAccurateRenderPlanSchema,
  hashSchema,
  musicTrackSchema,
  productionDraftSchema,
  productionEstimateSchema,
  resolvedProductionPlanSchema,
  shotOverrideSchema,
  soundEffectAssetSchema,
  soundEffectCueSchema,
  voiceTrackSchema,
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
  audioMix: audioMixSchema.optional(),
  musicTrack: musicTrackSchema.optional(),
  soundEffectAssets: z.array(soundEffectAssetSchema).optional(),
  soundEffectCues: z.array(soundEffectCueSchema).optional(),
  voiceTrack: voiceTrackSchema.optional(),
};

const withoutTimingDrivenMouthCues = (plan: z.infer<typeof frameAccurateRenderPlanSchema>) => {
  const {contentHash: _contentHash, ...payload} = plan;
  void _contentHash;
  const legacyPayload = {...payload, shots: payload.shots.map((shot) => ({...shot, actions: shot.actions.map((action) => {
    if (action.detail.type !== "talk") return action;
    const {mouthCue: _mouthCue, ...legacyTalk} = action.detail;
    void _mouthCue;
    return {...action, detail: legacyTalk};
  })}))};
  return frameAccurateRenderPlanSchema.parse({...legacyPayload, contentHash: hashCanonical(legacyPayload)});
};

const validateProductionBundle = (bundle: z.infer<z.ZodObject<typeof productionBundleFields>>, context: z.RefinementCtx) => {
  const identity = bundle.production.productionId;
  const revision = bundle.production.revision;
  if (bundle.resolvedPlan.creativePlan.productionId !== identity || bundle.renderPlan.productionId !== identity) context.addIssue({code: "custom", message: "Production bundle plans must share the production identity."});
  if (bundle.resolvedPlan.creativePlan.planRevision !== revision || bundle.renderPlan.planRevision !== revision) context.addIssue({code: "custom", message: "Production bundle plans must share the production revision."});
  if (bundle.resolvedPlan.showPack.id !== bundle.production.showPackId || bundle.renderPlan.showPack.id !== bundle.production.showPackId || bundle.resolvedPlan.showPack.contentHash !== bundle.renderPlan.showPack.contentHash) context.addIssue({code: "custom", message: "Production bundle plans must share the authoritative Show Pack identity and hash."});
  const compiledRenderPlan = compileAnimation(bundle.resolvedPlan);
  const matchesCurrentCompiler = hashCanonical(compiledRenderPlan) === hashCanonical(bundle.renderPlan);
  const matchesPreMouthCueCompiler = hashCanonical(withoutTimingDrivenMouthCues(compiledRenderPlan)) === hashCanonical(bundle.renderPlan);
  if (!verifyRenderPlanHash(bundle.renderPlan) || (!matchesCurrentCompiler && !matchesPreMouthCueCompiler)) context.addIssue({code: "custom", message: "Production bundle render plan must exactly derive from the included resolved plan."});
  const creativePlan = bundle.resolvedPlan.creativePlan;
  const aspectMatches = bundle.production.format.aspectRatio === "16:9" ? creativePlan.width * 9 === creativePlan.height * 16 : creativePlan.width * 16 === creativePlan.height * 9;
  if (creativePlan.title !== bundle.production.title || creativePlan.projectType !== bundle.production.projectType || creativePlan.fps !== bundle.production.format.fps || !aspectMatches) context.addIssue({code: "custom", message: "Production bundle draft must match the included creative plan."});
  if (hashCanonical(bundle.overrides) !== hashCanonical(bundle.resolvedPlan.overrides)) context.addIssue({code: "custom", message: "Production bundle overrides must match the resolved plan."});
  if (hashCanonical(bundle.metrics) !== hashCanonical(bundle.renderPlan.metrics)) context.addIssue({code: "custom", message: "Production bundle metrics must match the frozen render plan."});
  if (bundle.audioMix && bundle.audioMix.profile !== bundle.production.projectType) context.addIssue({code: "custom", path: ["audioMix", "profile"], message: "Audio mix profile must match the production type."});
  if (bundle.audioMix?.musicDecision === "approved-master" && bundle.musicTrack?.approvalStatus !== "approved") context.addIssue({code: "custom", path: ["audioMix", "musicDecision"], message: "An approved-master music decision requires an approved music track."});
  if (bundle.musicTrack && !bundle.musicTrack.relativeFile.startsWith(`music/${identity}/`)) context.addIssue({code: "custom", path: ["musicTrack", "relativeFile"], message: "Music tracks must stay inside their production-scoped private asset path."});
  const soundEffectAssets = bundle.soundEffectAssets ?? [];
  if (new Set(soundEffectAssets.map((asset) => asset.contentHash)).size !== soundEffectAssets.length) context.addIssue({code: "custom", path: ["soundEffectAssets"], message: "Sound-effect assets must have unique content hashes."});
  const soundEffectByHash = new Map(soundEffectAssets.map((asset) => [asset.contentHash, asset]));
  for (const [index, asset] of soundEffectAssets.entries()) if (!asset.relativeFile.startsWith(`sfx/${identity}/`)) context.addIssue({code: "custom", path: ["soundEffectAssets", index, "relativeFile"], message: "Sound-effect assets must stay inside their production-scoped private asset path."});
  const cueIds = new Set<string>();
  for (const [index, cue] of (bundle.soundEffectCues ?? []).entries()) {
    if (cueIds.has(cue.id)) context.addIssue({code: "custom", path: ["soundEffectCues", index, "id"], message: "Sound-effect cue ids must be unique."});
    cueIds.add(cue.id);
    const asset = soundEffectByHash.get(cue.assetContentHash);
    const shot = bundle.renderPlan.shots.find((candidate) => candidate.id === cue.shotId);
    if (!asset || asset.approvalStatus !== "approved") context.addIssue({code: "custom", path: ["soundEffectCues", index, "assetContentHash"], message: "Sound-effect cues require an approved bound asset."});
    if (!shot || cue.offsetInFrames >= shot.durationInFrames) context.addIssue({code: "custom", path: ["soundEffectCues", index, "offsetInFrames"], message: "Sound-effect cues must start within a render-plan shot."});
  }
  if (bundle.voiceTrack && !bundle.voiceTrack.relativeFile.startsWith(`voice/${identity}/`)) context.addIssue({code: "custom", path: ["voiceTrack", "relativeFile"], message: "Voice tracks must stay inside their production-scoped private asset path."});
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
