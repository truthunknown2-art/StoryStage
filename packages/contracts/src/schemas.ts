import {z} from "zod";

export const startRenderRequestSchema = z
  .object({simulateFailure: z.boolean().optional().default(false)})
  .strict();

export const startRenderResponseSchema = z.object({jobId: z.string().min(1)}).strict();

export const desktopCapabilitiesSchema = z.object({
  localRendering: z.boolean(),
  openRenderedFile: z.boolean(),
  manualImageExchange: z.boolean(),
  localAudioImport: z.boolean(),
}).strict();

const productionIdSchema = z.string().regex(/^[a-z0-9][a-z0-9-]*$/);
export const productionRenderScopeSchema = z.enum(["engineering-slice", "full-production"]);
export const startProductionRenderRequestSchema = z.object({productionId: productionIdSchema, revision: z.number().int().positive(), scope: productionRenderScopeSchema}).strict();

export const exportGenerationJobRequestSchema = z.object({
  serializedJob: z.string().min(2).max(2_000_000),
  productionBundleContentHash: z.string().regex(/^[a-f0-9]{64}$/),
}).strict();

export const exportGenerationJobResultSchema = z.discriminatedUnion("ok", [
  z.object({
    ok: z.literal(true),
    jobId: productionIdSchema,
    briefCount: z.number().int().nonnegative(),
  }).strict(),
  z.object({ok: z.literal(false), error: z.object({code: z.string().min(1), message: z.string().min(1)}).strict()}).strict(),
]);

export const stageCandidateBundleRequestSchema = z.object({
  exchangeJobId: productionIdSchema,
}).strict();

export const stagedCandidateSummarySchema = z.object({
  candidateId: productionIdSchema,
  candidateSetId: productionIdSchema.nullable(),
  originalName: z.string().min(1),
  briefId: productionIdSchema.nullable(),
  fileRole: z.string().min(1).nullable(),
  mediaType: z.enum(["image/png", "image/jpeg", "image/webp"]),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  stagingState: z.enum(["staged-byte-verified", "staged-needs-mask"]),
  checks: z.object({dimensions: z.literal(true), mediaType: z.literal(true), alphaOrMatte: z.boolean(), registration: z.literal(false)}).strict(),
}).strict();

export const stageCandidateBundleResultSchema = z.discriminatedUnion("status", [
  z.object({
    status: z.literal("staged"),
    importId: productionIdSchema,
    stagedCount: z.number().int().nonnegative(),
    needsManualMaskCount: z.number().int().nonnegative(),
    missingRoleCount: z.number().int().nonnegative(),
    candidates: z.array(stagedCandidateSummarySchema),
  }).strict(),
  z.object({status: z.literal("cancelled")}).strict(),
  z.object({status: z.literal("failed"), error: z.object({code: z.string().min(1), message: z.string().min(1)}).strict()}).strict(),
]);

export const importLooseCandidateFilesRequestSchema = z.object({exchangeJobId: productionIdSchema}).strict();
export const importLooseCandidateFilesResultSchema = z.discriminatedUnion("status", [
  z.object({
    status: z.literal("mapping-required"),
    importId: productionIdSchema,
    candidates: z.array(stagedCandidateSummarySchema).min(1),
    expectedRoles: z.array(z.object({briefId: productionIdSchema, requirementId: productionIdSchema, candidateSetId: productionIdSchema, candidateSetNumber: z.number().int().positive(), entityName: z.string().min(1), fileRole: z.string().min(1)}).strict()).min(1),
  }).strict(),
  z.object({status: z.literal("cancelled")}).strict(),
  z.object({status: z.literal("failed"), error: z.object({code: z.string().min(1), message: z.string().min(1)}).strict()}).strict(),
]);

export const finalizeLooseCandidateMappingRequestSchema = z.object({
  importId: productionIdSchema,
  assignments: z.array(z.object({candidateId: productionIdSchema, candidateSetId: productionIdSchema, briefId: productionIdSchema, fileRole: z.string().min(1)}).strict()).min(1),
}).strict();
export const finalizeLooseCandidateMappingResultSchema = stageCandidateBundleResultSchema;

export const preparedCandidateSummarySchema = z.object({
  candidateId: productionIdSchema,
  fileRole: z.string().min(1),
  assetClass: z.enum(["reference-sheet", "character-pose", "background-plate", "background-layer", "prop-cutout", "editorial-visual"]),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
}).strict();

export const candidateSetPreparationSummarySchema = z.object({
  candidateSetId: productionIdSchema,
  briefId: productionIdSchema,
  requirementId: productionIdSchema,
  entityName: z.string().min(1),
  outputRole: z.enum(["character-canonical-sheet", "character-parts", "background-master", "background-layers", "prop-cutout", "editorial-illustration", "diagram", "reconstruction"]),
  status: z.enum(["ready-for-review", "needs-attention"]),
  preparedCandidates: z.array(preparedCandidateSummarySchema),
  failures: z.array(z.object({candidateId: productionIdSchema, fileRole: z.string().min(1), status: z.enum(["needs-manual-mask", "failed"]), code: z.string().min(1), message: z.string().min(1)}).strict()),
  contactSheetDataUrl: z.string().startsWith("data:image/png;base64,").max(4_000_000).nullable(),
  rig: z.object({type: z.enum(["character-rig", "background-layers", "prop"]), validationStatus: z.enum(["passed", "failed"]), diagnosticVideoDataUrl: z.string().startsWith("data:video/mp4;base64,").max(24_000_000)}).strict().nullable(),
}).strict();

export const preparationReviewSchema = z.object({
  importId: productionIdSchema,
  preparedAt: z.string().datetime(),
  candidateSets: z.array(candidateSetPreparationSummarySchema).min(1),
}).strict();

export const prepareGenerationImportRequestSchema = z.object({exchangeJobId: productionIdSchema}).strict();
export const prepareGenerationImportResultSchema = z.discriminatedUnion("status", [
  z.object({status: z.literal("prepared"), review: preparationReviewSchema}).strict(),
  z.object({status: z.literal("failed"), error: z.object({code: z.string().min(1), message: z.string().min(1)}).strict()}).strict(),
]);

export const approvedAssetVersionBridgeSchema = z.object({
  assetId: productionIdSchema,
  version: z.string().min(1),
  requirementId: productionIdSchema,
  contentHash: z.string().regex(/^[a-f0-9]{64}$/),
  relativeFile: z.string().min(1),
  provenance: z.object({sourceType: z.enum(["generated", "licensed", "public-domain", "user-owned", "project-owned"]), provider: z.string().min(1), usageNotes: z.string().min(1)}).strict(),
  approvedAt: z.string().datetime(),
}).strict();
export const publicShowPackCandidateSummarySchema = z.object({
  candidateId: productionIdSchema,
  version: z.string().min(1),
  showPackId: productionIdSchema,
  displayName: z.string().min(1),
  status: z.literal("candidate-needs-human-review"),
  contentHash: z.string().regex(/^[a-f0-9]{64}$/),
  identityLock: z.string().min(1),
  provenance: z.object({provider: z.string().min(1), usageNotes: z.string().min(1)}).strict(),
  files: z.array(z.object({role: z.enum(["identity-sheet", "neutral-pose", "talk-pose", "reaction-pose"]), url: z.string().startsWith("/"), width: z.number().int().positive(), height: z.number().int().positive()}).strict()).length(4),
  diagnosticUrl: z.string().startsWith("/"),
  verifiedByHost: z.boolean(),
  canReview: z.boolean(),
  review: z.discriminatedUnion("decision", [
    z.object({decision: z.literal("none")}).strict(),
    z.object({decision: z.literal("rejected"), decidedAt: z.string().datetime()}).strict(),
    z.object({decision: z.literal("approved"), decidedAt: z.string().datetime(), targetProductionRevision: z.number().int().positive(), targetProductionBundleContentHash: z.string().regex(/^[a-f0-9]{64}$/)}).strict(),
  ]),
}).strict();
export const listPublicShowPackCandidatesRequestSchema = z.object({productionId: productionIdSchema, revision: z.number().int().positive(), productionBundleContentHash: z.string().regex(/^[a-f0-9]{64}$/).nullable()}).strict();
export const listPublicShowPackCandidatesResultSchema = z.object({candidates: z.array(publicShowPackCandidateSummarySchema)}).strict();
export const publicShowPackReviewAcknowledgementsBridgeSchema = z.object({identitySheet: z.boolean(), neutralPose: z.boolean(), talkPose: z.boolean(), reactionPose: z.boolean(), movingDiagnostic: z.boolean(), identityConsistency: z.boolean(), matteEdges: z.boolean(), provenance: z.boolean()}).strict();
export const reviewPublicShowPackCandidateRequestSchema = z.object({
  productionId: productionIdSchema,
  revision: z.number().int().positive(),
  productionBundleContentHash: z.string().regex(/^[a-f0-9]{64}$/),
  candidateId: productionIdSchema,
  decision: z.enum(["approve", "reject"]),
  acknowledgements: publicShowPackReviewAcknowledgementsBridgeSchema,
}).strict();
export const reviewPublicShowPackCandidateResultSchema = z.discriminatedUnion("status", [
  z.object({status: z.literal("reviewed"), decision: z.enum(["approved", "rejected"]), approvedAssetVersion: approvedAssetVersionBridgeSchema.nullable(), targetProductionRevision: z.number().int().positive().nullable(), targetProductionBundleContentHash: z.string().regex(/^[a-f0-9]{64}$/).nullable()}).strict(),
  z.object({status: z.literal("failed"), error: z.object({code: z.string().min(1), message: z.string().min(1)}).strict()}).strict(),
]);
export const candidateSetReviewSummarySchema = z.object({candidateSetId: productionIdSchema, briefId: productionIdSchema, requirementId: productionIdSchema, status: z.enum(["selected", "approved", "rejected"]), notes: z.string(), decidedAt: z.string().datetime(), approvedAssetVersion: approvedAssetVersionBridgeSchema.nullable()}).strict();
export const reviewCandidateSetRequestSchema = z.object({exchangeJobId: productionIdSchema, candidateSetId: productionIdSchema, decision: z.enum(["select", "approve", "reject"]), notes: z.string().max(2_000)}).strict();
export const reviewCandidateSetResultSchema = z.discriminatedUnion("status", [
  z.object({status: z.literal("reviewed"), exchangeStatus: z.enum(["needs-review", "approved", "rejected"]), decisions: z.array(candidateSetReviewSummarySchema), approvedAssetVersion: approvedAssetVersionBridgeSchema.nullable()}).strict(),
  z.object({status: z.literal("failed"), error: z.object({code: z.string().min(1), message: z.string().min(1)}).strict()}).strict(),
]);

export const voiceTrackBridgeSchema = z.object({
  id: productionIdSchema,
  contentHash: z.string().regex(/^[a-f0-9]{64}$/),
  relativeFile: z.string().min(1),
  sourceFileName: z.string().min(1).max(260),
  codec: z.enum(["pcm-wav", "ieee-float-wav"]),
  durationInSeconds: z.number().positive().max(14_400),
  sampleRate: z.number().int().min(8_000).max(192_000),
  channels: z.union([z.literal(1), z.literal(2)]),
  bitsPerSample: z.union([z.literal(16), z.literal(24), z.literal(32)]),
  importedAt: z.string().datetime(),
  approvalStatus: z.enum(["imported", "approved"]),
  approvedAt: z.string().datetime().nullable(),
  rights: z.object({sourceType: z.enum(["generated", "licensed", "public-domain", "user-owned", "project-owned"]), provider: z.string().min(1), usageNotes: z.string().min(1), clearanceStatus: z.literal("cleared"), evidenceReference: z.string().trim().min(1).max(500)}).strict().optional(),
}).strict();
export const importVoiceTrackRequestSchema = z.object({productionId: productionIdSchema, revision: z.number().int().positive(), productionBundleContentHash: z.string().regex(/^[a-f0-9]{64}$/)}).strict();
export const importVoiceTrackResultSchema = z.discriminatedUnion("status", [
  z.object({status: z.literal("imported"), track: voiceTrackBridgeSchema}).strict(),
  z.object({status: z.literal("cancelled")}).strict(),
  z.object({status: z.literal("failed"), error: z.object({code: z.string().min(1), message: z.string().min(1)}).strict()}).strict(),
]);
const clearedMediaRightsBridgeSchema = z.object({sourceType: z.enum(["generated", "licensed", "public-domain", "user-owned", "project-owned"]), provider: z.string().min(1), usageNotes: z.string().min(1), clearanceStatus: z.literal("cleared"), evidenceReference: z.string().trim().min(1).max(500)}).strict();
export const approveVoiceTrackRequestSchema = z.object({productionId: productionIdSchema, revision: z.number().int().positive(), productionBundleContentHash: z.string().regex(/^[a-f0-9]{64}$/), voiceTrackContentHash: z.string().regex(/^[a-f0-9]{64}$/), listenedThrough: z.literal(true), rights: clearedMediaRightsBridgeSchema}).strict();
export const approveVoiceTrackResultSchema = z.discriminatedUnion("ok", [
  z.object({ok: z.literal(true), track: voiceTrackBridgeSchema}).strict(),
  z.object({ok: z.literal(false), error: z.object({code: z.string().min(1), message: z.string().min(1)}).strict()}).strict(),
]);
export const importMusicTrackRequestSchema = importVoiceTrackRequestSchema;
export const importMusicTrackResultSchema = importVoiceTrackResultSchema;
export const approveMusicTrackRequestSchema = z.object({productionId: productionIdSchema, revision: z.number().int().positive(), productionBundleContentHash: z.string().regex(/^[a-f0-9]{64}$/), musicTrackContentHash: z.string().regex(/^[a-f0-9]{64}$/), listenedThrough: z.literal(true), rights: clearedMediaRightsBridgeSchema}).strict();
export const approveMusicTrackResultSchema = approveVoiceTrackResultSchema;
export const importSoundEffectRequestSchema = importVoiceTrackRequestSchema;
export const importSoundEffectResultSchema = importVoiceTrackResultSchema;
export const approveSoundEffectRequestSchema = z.object({productionId: productionIdSchema, revision: z.number().int().positive(), productionBundleContentHash: z.string().regex(/^[a-f0-9]{64}$/), soundEffectContentHash: z.string().regex(/^[a-f0-9]{64}$/), listenedThrough: z.literal(true), rights: clearedMediaRightsBridgeSchema}).strict();
export const approveSoundEffectResultSchema = approveVoiceTrackResultSchema;

export const saveProductionBundleRequestSchema = z.object({serializedDraft: z.string().min(2).max(10_000_000)}).strict();
export const saveProductionBundleResultSchema = z.discriminatedUnion("ok", [
  z.object({ok: z.literal(true), productionId: productionIdSchema, revision: z.number().int().positive(), contentHash: z.string().regex(/^[a-f0-9]{64}$/)}).strict(),
  z.object({ok: z.literal(false), error: z.object({code: z.string().min(1), message: z.string().min(1)}).strict()}).strict(),
]);
export const productionBundleSummarySchema = z.object({productionId: productionIdSchema, revision: z.number().int().positive(), title: z.string().min(1), projectType: z.enum(["kids", "explainer"]), showPackId: productionIdSchema, savedAt: z.string().datetime(), contentHash: z.string().regex(/^[a-f0-9]{64}$/)}).strict();
export const listProductionBundlesResultSchema = z.object({productions: z.array(productionBundleSummarySchema)}).strict();
export const loadProductionBundleRequestSchema = z.object({productionId: productionIdSchema, revision: z.number().int().positive()}).strict();
export const loadProductionBundleResultSchema = z.discriminatedUnion("ok", [
  z.object({ok: z.literal(true), serializedBundle: z.string().min(2).max(10_000_000)}).strict(),
  z.object({ok: z.literal(false), error: z.object({code: z.string().min(1), message: z.string().min(1)}).strict()}).strict(),
]);

export const generationExchangeSummarySchema = z.object({exchangeJobId: productionIdSchema, productionId: productionIdSchema, revision: z.number().int().positive(), title: z.string().min(1), status: z.enum(["awaiting-results", "files-imported", "staged", "needs-review", "approved", "rejected", "superseded"]), briefCount: z.number().int().nonnegative(), importId: productionIdSchema.nullable(), updatedAt: z.string().datetime()}).strict();
export const listGenerationExchangesRequestSchema = z.object({productionId: productionIdSchema.optional()}).strict();
export const listGenerationExchangesResultSchema = z.object({exchanges: z.array(generationExchangeSummarySchema)}).strict();
export const getGenerationExchangeRequestSchema = z.object({exchangeJobId: productionIdSchema}).strict();
export const getGenerationExchangeResultSchema = z.discriminatedUnion("ok", [
  z.object({ok: z.literal(true), summary: generationExchangeSummarySchema, looseMapping: z.object({status: z.literal("mapping-required"), importId: productionIdSchema, candidates: z.array(stagedCandidateSummarySchema).min(1), expectedRoles: z.array(z.object({briefId: productionIdSchema, requirementId: productionIdSchema, candidateSetId: productionIdSchema, candidateSetNumber: z.number().int().positive(), entityName: z.string().min(1), fileRole: z.string().min(1)}).strict()).min(1)}).strict().nullable(), stagedCandidates: z.array(stagedCandidateSummarySchema), preparation: preparationReviewSchema.nullable(), assetReviews: z.array(candidateSetReviewSummarySchema), missingRoleCount: z.number().int().nonnegative(), findings: z.array(z.object({severity: z.enum(["info", "warning", "error"]), code: z.string().min(1), candidateId: productionIdSchema.nullable(), message: z.string().min(1)}).strict())}).strict(),
  z.object({ok: z.literal(false), error: z.object({code: z.string().min(1), message: z.string().min(1)}).strict()}).strict(),
]);

const activeJobFields = {
  jobId: z.string().min(1),
  message: z.string().min(1),
};

export const verifiedDeliverySummarySchema = z.object({
  deliveryManifestContentHash: z.string().regex(/^[a-f0-9]{64}$/),
  productionId: productionIdSchema,
  revision: z.number().int().positive(),
  productionBundleContentHash: z.string().regex(/^[a-f0-9]{64}$/),
  rightsStatus: z.literal("cleared"),
  captionCueCount: z.number().int().nonnegative(),
  master: z.object({width: z.literal(1920), height: z.literal(1080), fps: z.literal(30), frameCount: z.number().int().positive(), durationInSeconds: z.number().positive()}).strict(),
}).strict();
export const getVerifiedDeliveryRequestSchema = z.object({productionId: productionIdSchema, revision: z.number().int().positive(), productionBundleContentHash: z.string().regex(/^[a-f0-9]{64}$/)}).strict();
export const getVerifiedDeliveryResultSchema = z.object({delivery: verifiedDeliverySummarySchema.nullable()}).strict();

export const idleRenderJobSchema = z.object({
  status: z.literal("idle"),
  progress: z.null(),
  message: z.string().min(1),
}).strict();

export const queuedRenderJobSchema = z.object({...activeJobFields, status: z.literal("queued"), progress: z.null()}).strict();
export const bundlingRenderJobSchema = z.object({...activeJobFields, status: z.literal("bundling"), progress: z.number().min(0).max(1)}).strict();
export const renderingRenderJobSchema = z.object({...activeJobFields, status: z.literal("rendering"), progress: z.number().min(0).max(1)}).strict();
export const encodingRenderJobSchema = z.object({...activeJobFields, status: z.literal("encoding"), progress: z.null()}).strict();
export const completedRenderJobSchema = z.object({
  ...activeJobFields,
  status: z.literal("completed"),
  progress: z.null(),
  outputPath: z.string().min(1),
  renderReceipt: z.object({contentHash: z.string().regex(/^[a-f0-9]{64}$/), path: z.string().min(1)}).strict().optional(),
  delivery: verifiedDeliverySummarySchema.optional(),
}).strict();
export const failedRenderJobSchema = z.object({
  ...activeJobFields,
  status: z.literal("failed"),
  progress: z.null(),
  error: z.object({code: z.string().min(1), message: z.string().min(1)}),
}).strict();

export const renderJobEventSchema = z.discriminatedUnion("status", [
  queuedRenderJobSchema,
  bundlingRenderJobSchema,
  renderingRenderJobSchema,
  encodingRenderJobSchema,
  completedRenderJobSchema,
  failedRenderJobSchema,
]);
export const renderJobStateSchema = z.union([idleRenderJobSchema, renderJobEventSchema]);

export const openRenderedFileResultSchema = z.discriminatedUnion("ok", [
  z.object({ok: z.literal(true)}).strict(),
  z.object({ok: z.literal(false), error: z.object({code: z.string(), message: z.string()}).strict()}).strict(),
]);

export const renderWorkerCommandSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("start"),
    workspaceRoot: z.string().min(1),
    request: startRenderRequestSchema.extend({jobId: z.string().min(1)}),
  }).strict(),
  z.object({
    type: z.literal("start-production"),
    workspaceRoot: z.string().min(1),
    trustedProductionRoot: z.string().min(1),
    bundleFile: z.string().min(1),
    assetsRoot: z.string().min(1),
    outputRoot: z.string().min(1),
    request: z.object({jobId: z.string().min(1), bundleContentHash: z.string().regex(/^[a-f0-9]{64}$/), scope: productionRenderScopeSchema}).strict(),
  }).strict(),
  z.object({
    type: z.literal("start-rig-diagnostic"),
    workspaceRoot: z.string().min(1),
    importRoot: z.string().min(1),
    manifestFile: z.string().min(1),
    outputFile: z.string().min(1),
    request: z.object({jobId: z.string().min(1), entityName: z.string().min(1)}).strict(),
  }).strict(),
]);

export const renderWorkerMessageSchema = z.discriminatedUnion("type", [
  z.object({type: z.literal("event"), payload: renderJobEventSchema}).strict(),
]);

export const assetWorkerCommandSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("stage-character-rig-candidates"),
    requestId: z.string().min(1),
    importId: productionIdSchema,
    sourceRoot: z.string().min(1),
    trustedStagingRoot: z.string().min(1),
    stagingRoot: z.string().min(1),
    stagedAt: z.string().datetime(),
    serializedRigRequest: z.string().min(2).max(4_000_000),
    serializedRigBundle: z.string().min(2).max(4_000_000),
  }).strict(),
  z.object({
    type: z.literal("prepare-character-rig-view"),
    requestId: z.string().min(1),
    trustedStagingRoot: z.string().min(1),
    stagingRoot: z.string().min(1),
    preparedAt: z.string().datetime(),
    serializedPreparationRecipe: z.string().min(2).max(8_000_000),
  }).strict(),
  z.object({
    type: z.literal("stage-candidate-bundle"),
    requestId: z.string().min(1),
    sourceRoot: z.string().min(1),
    trustedStagingRoot: z.string().min(1),
    stagingRoot: z.string().min(1),
    serializedBundle: z.string().min(2).max(2_000_000),
  }).strict(),
  z.object({
    type: z.literal("stage-loose-candidates"),
    requestId: z.string().min(1),
    trustedStagingRoot: z.string().min(1),
    stagingRoot: z.string().min(1),
    files: z.array(z.object({candidateId: z.string().regex(/^[a-z0-9][a-z0-9-]*$/), sourceFile: z.string().min(1)}).strict()).min(1).max(32),
  }).strict(),
  z.object({
    type: z.literal("verify-staged-candidates"),
    requestId: z.string().min(1),
    trustedStagingRoot: z.string().min(1),
    stagingRoot: z.string().min(1),
    serializedStagedCandidates: z.string().min(2).max(2_000_000),
  }).strict(),
  z.object({
    type: z.literal("prepare-candidate-sets"),
    requestId: z.string().min(1),
    trustedStagingRoot: z.string().min(1),
    stagingRoot: z.string().min(1),
    serializedRequest: z.string().min(2).max(4_000_000),
  }).strict(),
]);

export const assetWorkerMessageSchema = z.discriminatedUnion("type", [
  z.object({type: z.literal("character-rig-staged"), requestId: z.string().min(1), serializedStagingReport: z.string().min(2).max(8_000_000), serializedImportReceipt: z.string().min(2).max(8_000_000).nullable()}).strict(),
  z.object({type: z.literal("character-rig-prepared"), requestId: z.string().min(1), serializedPreparedViewManifest: z.string().min(2).max(16_000_000)}).strict(),
  z.object({type: z.literal("staged"), requestId: z.string().min(1), serializedStagedCandidates: z.string().min(2).max(2_000_000)}).strict(),
  z.object({type: z.literal("loose-staged"), requestId: z.string().min(1), serializedLooseCandidates: z.string().min(2).max(2_000_000)}).strict(),
  z.object({type: z.literal("verified"), requestId: z.string().min(1), serializedStagedCandidates: z.string().min(2).max(2_000_000)}).strict(),
  z.object({type: z.literal("prepared"), requestId: z.string().min(1), serializedPreparationReport: z.string().min(2).max(8_000_000)}).strict(),
  z.object({type: z.literal("failed"), requestId: z.string().min(1), error: z.object({code: z.string().min(1), message: z.string().min(1)}).strict()}).strict(),
]);

export const workerLooseStagedCandidateSchema = z.object({
  candidate: z.object({
    candidateId: z.string().regex(/^[a-z0-9][a-z0-9-]*$/),
    sourceContentHash: z.string().regex(/^[a-f0-9]{64}$/),
    stagedContentHash: z.string().regex(/^[a-f0-9]{64}$/),
    relativeFile: z.string().min(1),
    stagingState: z.enum(["staged-byte-verified", "staged-needs-mask"]),
    checks: z.object({dimensions: z.literal(true), mediaType: z.literal(true), alphaOrMatte: z.boolean(), registration: z.literal(false)}).strict(),
  }).strict(),
  originalName: z.string().min(1),
  mediaType: z.enum(["image/png", "image/jpeg", "image/webp"]),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
}).strict();

const allowedTransitions = {
  idle: ["queued"],
  queued: ["bundling", "failed"],
  bundling: ["rendering", "failed"],
  rendering: ["encoding", "failed"],
  encoding: ["completed", "failed"],
  completed: [],
  failed: [],
} as const;

export function canTransitionRenderJob(from: RenderJobStatus, to: RenderJobStatus): boolean {
  return (allowedTransitions[from] as readonly string[]).includes(to);
}

export const IPC_CHANNELS = {
  capabilities: "storystage:capabilities",
  exportGenerationJob: "storystage:export-generation-job",
  importLooseCandidateFiles: "storystage:import-loose-candidate-files",
  finalizeLooseCandidateMapping: "storystage:finalize-loose-candidate-mapping",
  stageCandidateBundle: "storystage:stage-candidate-bundle",
  saveProductionBundle: "storystage:save-production-bundle",
  listProductionBundles: "storystage:list-production-bundles",
  loadProductionBundle: "storystage:load-production-bundle",
  listGenerationExchanges: "storystage:list-generation-exchanges",
  getGenerationExchange: "storystage:get-generation-exchange",
  prepareGenerationImport: "storystage:prepare-generation-import",
  reviewCandidateSet: "storystage:review-candidate-set",
  listPublicShowPackCandidates: "storystage:list-public-show-pack-candidates",
  reviewPublicShowPackCandidate: "storystage:review-public-show-pack-candidate",
  importVoiceTrack: "storystage:import-voice-track",
  approveVoiceTrack: "storystage:approve-voice-track",
  importMusicTrack: "storystage:import-music-track",
  approveMusicTrack: "storystage:approve-music-track",
  importSoundEffect: "storystage:import-sound-effect",
  approveSoundEffect: "storystage:approve-sound-effect",
  renderEvent: "storystage:render-event",
  renderStart: "storystage:render-start",
  productionRenderStart: "storystage:production-render-start",
  openRenderedFile: "storystage:open-rendered-file",
  getVerifiedDelivery: "storystage:get-verified-delivery",
  openDeliveryMaster: "storystage:open-delivery-master",
  revealDeliveryBundle: "storystage:reveal-delivery-bundle",
} as const;

export type StartRenderRequest = z.input<typeof startRenderRequestSchema>;
export type StartRenderResponse = z.infer<typeof startRenderResponseSchema>;
export type StartProductionRenderRequest = z.infer<typeof startProductionRenderRequestSchema>;
export type ProductionRenderScope = z.infer<typeof productionRenderScopeSchema>;
export type DesktopCapabilities = z.infer<typeof desktopCapabilitiesSchema>;
export type ExportGenerationJobRequest = z.infer<typeof exportGenerationJobRequestSchema>;
export type ExportGenerationJobResult = z.infer<typeof exportGenerationJobResultSchema>;
export type StageCandidateBundleRequest = z.infer<typeof stageCandidateBundleRequestSchema>;
export type StageCandidateBundleResult = z.infer<typeof stageCandidateBundleResultSchema>;
export type SaveProductionBundleRequest = z.infer<typeof saveProductionBundleRequestSchema>;
export type SaveProductionBundleResult = z.infer<typeof saveProductionBundleResultSchema>;
export type ProductionBundleSummary = z.infer<typeof productionBundleSummarySchema>;
export type GenerationExchangeSummary = z.infer<typeof generationExchangeSummarySchema>;
export type ListProductionBundlesResult = z.infer<typeof listProductionBundlesResultSchema>;
export type LoadProductionBundleRequest = z.infer<typeof loadProductionBundleRequestSchema>;
export type LoadProductionBundleResult = z.infer<typeof loadProductionBundleResultSchema>;
export type ListGenerationExchangesRequest = z.infer<typeof listGenerationExchangesRequestSchema>;
export type ListGenerationExchangesResult = z.infer<typeof listGenerationExchangesResultSchema>;
export type GetGenerationExchangeRequest = z.infer<typeof getGenerationExchangeRequestSchema>;
export type GetGenerationExchangeResult = z.infer<typeof getGenerationExchangeResultSchema>;
export type StagedCandidateSummary = z.infer<typeof stagedCandidateSummarySchema>;
export type ImportLooseCandidateFilesRequest = z.infer<typeof importLooseCandidateFilesRequestSchema>;
export type ImportLooseCandidateFilesResult = z.infer<typeof importLooseCandidateFilesResultSchema>;
export type FinalizeLooseCandidateMappingRequest = z.infer<typeof finalizeLooseCandidateMappingRequestSchema>;
export type FinalizeLooseCandidateMappingResult = z.infer<typeof finalizeLooseCandidateMappingResultSchema>;
export type PreparedCandidateSummary = z.infer<typeof preparedCandidateSummarySchema>;
export type CandidateSetPreparationSummary = z.infer<typeof candidateSetPreparationSummarySchema>;
export type PreparationReview = z.infer<typeof preparationReviewSchema>;
export type PrepareGenerationImportRequest = z.infer<typeof prepareGenerationImportRequestSchema>;
export type PrepareGenerationImportResult = z.infer<typeof prepareGenerationImportResultSchema>;
export type ApprovedAssetVersionBridge = z.infer<typeof approvedAssetVersionBridgeSchema>;
export type CandidateSetReviewSummary = z.infer<typeof candidateSetReviewSummarySchema>;
export type ReviewCandidateSetRequest = z.infer<typeof reviewCandidateSetRequestSchema>;
export type ReviewCandidateSetResult = z.infer<typeof reviewCandidateSetResultSchema>;
export type PublicShowPackCandidateSummary = z.infer<typeof publicShowPackCandidateSummarySchema>;
export type ListPublicShowPackCandidatesResult = z.infer<typeof listPublicShowPackCandidatesResultSchema>;
export type ListPublicShowPackCandidatesRequest = z.infer<typeof listPublicShowPackCandidatesRequestSchema>;
export type ReviewPublicShowPackCandidateRequest = z.infer<typeof reviewPublicShowPackCandidateRequestSchema>;
export type ReviewPublicShowPackCandidateResult = z.infer<typeof reviewPublicShowPackCandidateResultSchema>;
export type VoiceTrackBridge = z.infer<typeof voiceTrackBridgeSchema>;
export type ImportVoiceTrackRequest = z.infer<typeof importVoiceTrackRequestSchema>;
export type ImportVoiceTrackResult = z.infer<typeof importVoiceTrackResultSchema>;
export type ApproveVoiceTrackRequest = z.infer<typeof approveVoiceTrackRequestSchema>;
export type ApproveVoiceTrackResult = z.infer<typeof approveVoiceTrackResultSchema>;
export type ImportMusicTrackRequest = z.infer<typeof importMusicTrackRequestSchema>;
export type ImportMusicTrackResult = z.infer<typeof importMusicTrackResultSchema>;
export type ApproveMusicTrackRequest = z.infer<typeof approveMusicTrackRequestSchema>;
export type ApproveMusicTrackResult = z.infer<typeof approveMusicTrackResultSchema>;
export type ImportSoundEffectRequest = z.infer<typeof importSoundEffectRequestSchema>;
export type ImportSoundEffectResult = z.infer<typeof importSoundEffectResultSchema>;
export type ApproveSoundEffectRequest = z.infer<typeof approveSoundEffectRequestSchema>;
export type ApproveSoundEffectResult = z.infer<typeof approveSoundEffectResultSchema>;
export type RenderJobEvent = z.infer<typeof renderJobEventSchema>;
export type RenderJobState = z.infer<typeof renderJobStateSchema>;
export type RenderJobStatus = RenderJobState["status"];
export type OpenRenderedFileResult = z.infer<typeof openRenderedFileResultSchema>;
export type VerifiedDeliverySummary = z.infer<typeof verifiedDeliverySummarySchema>;
export type GetVerifiedDeliveryRequest = z.infer<typeof getVerifiedDeliveryRequestSchema>;
export type GetVerifiedDeliveryResult = z.infer<typeof getVerifiedDeliveryResultSchema>;
export type RenderWorkerCommand = z.infer<typeof renderWorkerCommandSchema>;
export type RenderWorkerMessage = z.infer<typeof renderWorkerMessageSchema>;
export type AssetWorkerCommand = z.infer<typeof assetWorkerCommandSchema>;
export type AssetWorkerMessage = z.infer<typeof assetWorkerMessageSchema>;
export type WorkerLooseStagedCandidate = z.infer<typeof workerLooseStagedCandidateSchema>;

export type StoryStageDesktopBridge = {
  getCapabilities: () => Promise<DesktopCapabilities>;
  exportGenerationJob: (request: ExportGenerationJobRequest) => Promise<ExportGenerationJobResult>;
  importLooseCandidateFiles: (request: ImportLooseCandidateFilesRequest) => Promise<ImportLooseCandidateFilesResult>;
  finalizeLooseCandidateMapping: (request: FinalizeLooseCandidateMappingRequest) => Promise<FinalizeLooseCandidateMappingResult>;
  stageCandidateBundle: (request: StageCandidateBundleRequest) => Promise<StageCandidateBundleResult>;
  saveProductionBundle: (request: SaveProductionBundleRequest) => Promise<SaveProductionBundleResult>;
  listProductionBundles: () => Promise<ListProductionBundlesResult>;
  loadProductionBundle: (request: LoadProductionBundleRequest) => Promise<LoadProductionBundleResult>;
  listGenerationExchanges: (request: ListGenerationExchangesRequest) => Promise<ListGenerationExchangesResult>;
  getGenerationExchange: (request: GetGenerationExchangeRequest) => Promise<GetGenerationExchangeResult>;
  prepareGenerationImport: (request: PrepareGenerationImportRequest) => Promise<PrepareGenerationImportResult>;
  reviewCandidateSet: (request: ReviewCandidateSetRequest) => Promise<ReviewCandidateSetResult>;
  listPublicShowPackCandidates: (request: ListPublicShowPackCandidatesRequest) => Promise<ListPublicShowPackCandidatesResult>;
  reviewPublicShowPackCandidate: (request: ReviewPublicShowPackCandidateRequest) => Promise<ReviewPublicShowPackCandidateResult>;
  importVoiceTrack: (request: ImportVoiceTrackRequest) => Promise<ImportVoiceTrackResult>;
  approveVoiceTrack: (request: ApproveVoiceTrackRequest) => Promise<ApproveVoiceTrackResult>;
  importMusicTrack: (request: ImportMusicTrackRequest) => Promise<ImportMusicTrackResult>;
  approveMusicTrack: (request: ApproveMusicTrackRequest) => Promise<ApproveMusicTrackResult>;
  importSoundEffect: (request: ImportSoundEffectRequest) => Promise<ImportSoundEffectResult>;
  approveSoundEffect: (request: ApproveSoundEffectRequest) => Promise<ApproveSoundEffectResult>;
  startSampleRender: (request: StartRenderRequest) => Promise<StartRenderResponse>;
  startProductionRender: (request: StartProductionRenderRequest) => Promise<StartRenderResponse>;
  subscribeToRenderJobs: (listener: (event: RenderJobEvent) => void) => () => void;
  openRenderedFile: (jobId: string) => Promise<OpenRenderedFileResult>;
  getVerifiedDelivery: (request: GetVerifiedDeliveryRequest) => Promise<GetVerifiedDeliveryResult>;
  openDeliveryMaster: (deliveryManifestContentHash: string) => Promise<OpenRenderedFileResult>;
  revealDeliveryBundle: (deliveryManifestContentHash: string) => Promise<OpenRenderedFileResult>;
};
