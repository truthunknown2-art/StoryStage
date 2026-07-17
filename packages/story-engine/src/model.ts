import {z} from "zod";

export const STORY_ENGINE_COMPILER_VERSION = "0.2.0";

export const identifierSchema = z.string().regex(/^[a-z0-9][a-z0-9-]*$/);
export const hashSchema = z.string().regex(/^[a-f0-9]{64}$/);
const safeRelativePathSchema = z.string().min(1).refine((value) => !value.includes("\\") && !value.includes(":") && !value.startsWith("/") && !value.split("/").includes(".."), "Path must be a safe forward-slash relative path.");

export const projectTypeSchema = z.enum(["kids", "explainer"]);
export const productionPresetSchema = z.enum(["draft", "studio", "premium"]);
export const visualModeSchema = z.enum(["kids-adventure", "weird-history-editorial"]);
export const shotFramingSchema = z.enum(["wide", "medium", "close-up", "insert"]);
export const shotTreatmentSchema = z.enum([
  "environment",
  "character-performance",
  "reaction",
  "insert",
  "kinetic-type",
  "diagram",
  "licensed-media",
  "generated-illustration",
]);
export const transitionStyleSchema = z.enum(["hard-cut", "foreground-wipe", "camera-carry", "brief-dissolve"]);
export const gestureSchema = z.enum(["explain", "point", "lift", "shrug", "run", "listen", "celebrate", "none"]);
export const cameraMoveSchema = z.enum(["locked", "cameraPush", "pan", "reframe"]);

export const productionPolicySchema = z.object({
  preset: productionPresetSchema,
  maxNewAssets: z.number().int().nonnegative(),
  imageCandidatesPerRequest: z.number().int().nonnegative(),
  imageQuality: z.enum(["low", "medium", "high"]),
  backgroundLayerTarget: z.number().int().positive(),
  posePack: z.enum(["basic", "standard", "extended"]),
  stockSearchLimit: z.number().int().nonnegative(),
  maxProposed3DShots: z.number().int().nonnegative(),
  cadenceMultiplier: z.number().positive(),
  outputHeight: z.union([z.literal(720), z.literal(1080), z.literal(2160)]),
  audioPasses: z.union([z.literal(1), z.literal(2), z.literal(3)]),
}).strict();

export const assetRoutingPolicySchema = z.object({
  reuseApprovedFirst: z.boolean(),
  generateMissing: z.boolean(),
  licensedSources: z.enum(["disabled", "factual-first", "allowed"]),
  allowGeneratedHistoricalReconstruction: z.boolean(),
  proposed3D: z.enum(["never", "review-only"]),
}).strict();

export const productionDraftSchema = z.object({
  schemaVersion: z.literal("1.0"),
  productionId: identifierSchema,
  revision: z.number().int().positive(),
  title: z.string().trim().min(1),
  projectType: projectTypeSchema,
  showPackId: identifierSchema,
  preset: productionPresetSchema,
  script: z.string().trim().min(1),
  assetRoutingPolicy: assetRoutingPolicySchema,
  format: z.object({
    aspectRatio: z.enum(["16:9", "9:16"]),
    fps: z.literal(30),
  }).strict(),
}).strict();

export const productionDiagnosticSchema = z.object({
  code: z.enum(["invalid-production", "invalid-script", "show-pack-mismatch", "planning-failed"]),
  path: z.string(),
  message: z.string().min(1),
}).strict();

export const sceneHeadingElementSchema = z.object({
  id: identifierSchema,
  type: z.literal("scene-heading"),
  ordinal: z.number().int().positive(),
  interiorExterior: z.enum(["INT", "EXT", "INT/EXT"]),
  location: z.string().min(1),
  timeOfDay: z.string().min(1),
}).strict();

export const dialogueElementSchema = z.object({
  id: identifierSchema,
  type: z.literal("dialogue"),
  sceneId: identifierSchema,
  speaker: z.string().min(1),
  text: z.string().min(1),
  narration: z.boolean(),
}).strict();

export const actionElementSchema = z.object({
  id: identifierSchema,
  type: z.literal("action"),
  sceneId: identifierSchema,
  text: z.string().min(1),
}).strict();

export const scriptElementSchema = z.discriminatedUnion("type", [sceneHeadingElementSchema, dialogueElementSchema, actionElementSchema]);

export const scriptDocumentSchema = z.object({
  schemaVersion: z.literal("1.0"),
  id: identifierSchema,
  productionId: identifierSchema,
  title: z.string().min(1),
  sourceText: z.string().min(1),
  elements: z.array(scriptElementSchema).min(1),
}).strict();

export const storyEntitySchema = z.object({
  id: identifierSchema,
  kind: z.enum(["character", "location", "prop"]),
  name: z.string().min(1),
  mentions: z.number().int().positive(),
  sceneIds: z.array(identifierSchema).min(1),
  sourceElementIds: z.array(identifierSchema).min(1),
  confidence: z.number().min(0).max(1),
  status: z.enum(["confirmed", "needs-review", "unresolved"]),
  role: z.enum(["speaker", "presenter", "support", "prop", "location"]),
}).strict();

export const storyAnalysisSchema = z.object({
  schemaVersion: z.literal("1.1"),
  documentId: identifierSchema,
  characters: z.array(storyEntitySchema),
  locations: z.array(storyEntitySchema),
  props: z.array(storyEntitySchema),
  warnings: z.array(z.string().min(1)),
}).strict();

export const actionDetailSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("talk"),
    dialogueLineId: identifierSchema,
    timingId: identifierSchema,
    mouthCue: z.object({mode: z.literal("timing-driven-pose-swap"), openFrames: z.number().int().min(1).max(12), closedFrames: z.number().int().min(1).max(12), phaseOffsetFrames: z.number().int().min(0).max(23)}).strict().optional(),
  }).strict(),
  z.object({type: z.literal("gesture"), gestureId: gestureSchema, intensity: z.number().min(0).max(1)}).strict(),
  z.object({type: z.literal("react"), poseId: identifierSchema}).strict(),
  z.object({type: z.literal("enter"), direction: z.enum(["left", "right", "foreground", "background"])}).strict(),
  z.object({type: z.literal("exit"), direction: z.enum(["left", "right", "foreground", "background"])}).strict(),
  z.object({type: z.literal("lookAt")}).strict(),
    z.object({type: z.literal("holdPose"), poseId: identifierSchema}).strict(),
    z.object({type: z.literal("poseChange"), poseId: identifierSchema}).strict(),
  z.object({type: z.literal("hardCut")}).strict(),
  z.object({type: z.literal("cameraPush"), fromScale: z.number().positive(), toScale: z.number().positive(), easingId: identifierSchema}).strict(),
  z.object({type: z.literal("reframe"), framing: shotFramingSchema, easingId: identifierSchema}).strict(),
  z.object({type: z.literal("insert"), visualRequirementId: identifierSchema}).strict(),
  z.object({type: z.literal("foregroundWipe"), layer: z.enum(["character", "prop", "environment"])}).strict(),
  z.object({type: z.literal("kineticType"), text: z.string().min(1), emphasis: z.enum(["word", "phrase"])}).strict(),
  z.object({type: z.literal("beatAccent"), intensity: z.number().min(0).max(1)}).strict(),
  z.object({type: z.literal("pan"), fromX: z.number(), toX: z.number(), easingId: identifierSchema}).strict(),
]);

export const semanticActionDraftSchema = z.object({
  id: identifierSchema,
  actorName: z.string().min(1).nullable(),
  targetName: z.string().min(1).nullable(),
  label: z.string().min(1),
  startOffsetFrames: z.number().int().nonnegative(),
  durationInFrames: z.number().int().positive(),
  detail: actionDetailSchema,
}).strict();

export const visualRequirementRoleSchema = z.enum(["background", "foreground", "character", "prop", "insert", "diagram", "evidence", "reconstruction"]);
export const visualSourceIntentSchema = z.enum(["approved-recurring", "generated", "licensed-stock", "public-domain", "user-owned"]);

export const visualRequirementSchema = z.object({
  id: identifierSchema,
  sceneId: identifierSchema,
  shotId: identifierSchema,
  role: visualRequirementRoleSchema,
  entityId: identifierSchema.nullable(),
  reusableConceptKey: identifierSchema.nullable(),
  sourceIntent: visualSourceIntentSchema,
  required: z.boolean(),
  description: z.string().min(1),
}).strict();

export const creativeShotSchema = z.object({
  id: identifierSchema,
  sceneId: identifierSchema,
  number: z.string().min(1),
  title: z.string().min(1),
  framing: shotFramingSchema,
  treatment: shotTreatmentSchema,
  transition: transitionStyleSchema,
  locationName: z.string().min(1),
  focusCharacterName: z.string().min(1).nullable(),
  sourceElementIds: z.array(identifierSchema).min(1),
  sourceExcerpt: z.string().min(1),
  visualRequirementIds: z.array(identifierSchema).min(1),
  durationInFrames: z.number().int().positive(),
  actions: z.array(semanticActionDraftSchema).min(1),
  caption: z.string().min(1).nullable(),
}).strict();

export const creativeSceneSchema = z.object({
  id: identifierSchema,
  sourceSceneId: identifierSchema,
  number: z.number().int().positive(),
  title: z.string().min(1),
  locationName: z.string().min(1),
  shotIds: z.array(identifierSchema).min(1),
}).strict();

const weight = z.number().min(0).max(1);
export const directingProfileSchema = z.object({
  id: identifierSchema,
  version: z.string().min(1),
  projectType: projectTypeSchema,
  visualMode: visualModeSchema,
  cadence: z.object({
    targetCutsPerMinute: z.number().positive(),
    minShotFrames: z.number().int().positive(),
    maxShotFrames: z.number().int().positive(),
    maxStaticFrames: z.number().int().positive(),
  }).strict(),
  treatmentWeights: z.object({
    environment: weight,
    characterPerformance: weight,
    reaction: weight,
    insert: weight,
    kineticType: weight,
    diagram: weight,
    licensedMedia: weight,
    generatedIllustration: weight,
  }).strict(),
  framingWeights: z.object({wide: weight, medium: weight, closeUp: weight, insert: weight}).strict(),
  cameraPolicy: z.object({moves: z.array(z.object({type: cameraMoveSchema, weight, maximumPerMinute: z.number().positive().optional()}).strict()).min(1)}).strict(),
  transitionPolicy: z.object({hardCut: weight, foregroundWipe: weight, cameraCarry: weight, briefDissolve: weight}).strict(),
  performancePolicy: z.object({gesturesPerMinute: z.number().nonnegative(), reactionsPerMinute: z.number().nonnegative(), poseChangesPerMinute: z.number().nonnegative()}).strict(),
  textPolicy: z.object({mode: z.enum(["participation-cues", "editorial-keywords"]), maximumWords: z.number().int().positive(), targetEventsPerMinute: z.number().nonnegative()}).strict(),
  accentColor: z.string().min(1),
  qualityRules: z.array(z.string().min(1)).min(1),
}).strict().superRefine((profile, context) => {
  if (profile.cadence.minShotFrames > profile.cadence.maxShotFrames) context.addIssue({code: "custom", message: "Cadence minimum must not exceed cadence maximum."});
  const totals = [
    Object.values(profile.treatmentWeights).reduce((sum, value) => sum + value, 0),
    Object.values(profile.framingWeights).reduce((sum, value) => sum + value, 0),
    Object.values(profile.transitionPolicy).reduce((sum, value) => sum + value, 0),
    profile.cameraPolicy.moves.reduce((sum, move) => sum + move.weight, 0),
  ];
  if (totals.some((total) => Math.abs(total - 1) > 0.001)) context.addIssue({code: "custom", message: "Every directing weight group must total 1."});
});

export const creativeEpisodePlanSchema = z.object({
  schemaVersion: z.literal("1.2"),
  id: identifierSchema,
  productionId: identifierSchema,
  planRevision: z.number().int().positive(),
  compilerVersion: z.literal(STORY_ENGINE_COMPILER_VERSION),
  title: z.string().min(1),
  fps: z.number().int().positive(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  projectType: projectTypeSchema,
  productionPolicy: productionPolicySchema,
  assetRoutingPolicy: assetRoutingPolicySchema,
  showPackId: identifierSchema,
  directingProfileId: identifierSchema,
  analysis: storyAnalysisSchema,
  scenes: z.array(creativeSceneSchema).min(1),
  shots: z.array(creativeShotSchema).min(1),
  visualRequirements: z.array(visualRequirementSchema).min(1),
}).strict();

export const assetOriginSchema = z.enum(["project-owned-code", "generated-approved", "licensed-stock", "user-owned"]);
export const assetManifestEntrySchema = z.object({
  id: identifierSchema,
  kind: z.enum(["character-rig", "location", "prop", "overlay", "graphic", "placeholder"]),
  version: z.string().min(1),
  displayName: z.string().min(1),
  contentHash: hashSchema,
  hashStatus: z.enum(["verified-metadata", "verified-bytes"]),
  origin: assetOriginSchema,
  license: z.string().min(1),
  localAssetKey: identifierSchema,
  tags: z.array(z.string().min(1)),
  palette: z.tuple([z.string().min(1), z.string().min(1), z.string().min(1)]),
}).strict();

export const assetFactoryPolicySchema = z.object({
  providerClass: z.literal("chatgpt-images"),
  exchangeMode: z.enum(["manual-chatgpt-images", "openai-images-api"]),
  requiredCharacterOutputs: z.array(z.enum(["identity-sheet", "expression-set", "mouth-set", "pose-set", "separated-parts"])).min(1),
  requiredBackgroundOutputs: z.array(z.enum(["clean-plate", "depth-layers", "foreground-occluders"])).min(1),
  approvalRequired: z.literal(true),
}).strict();

export const showPackSchema = z.object({
  schemaVersion: z.literal("1.2"),
  id: identifierSchema,
  version: z.string().min(1),
  displayName: z.string().min(1),
  contentHash: hashSchema,
  hashStatus: z.literal("verified-metadata"),
  projectType: projectTypeSchema,
  styleBible: z.object({id: identifierSchema, version: z.string().min(1), principles: z.array(z.string().min(1)).min(1), contentHash: hashSchema}).strict(),
  profile: directingProfileSchema,
  assetFactory: assetFactoryPolicySchema,
  assets: z.array(assetManifestEntrySchema).min(1),
  roleBindings: z.object({narrationPresenterAssetId: identifierSchema.nullable()}).strict(),
  allowedGestures: z.array(gestureSchema).min(1),
  allowedFramings: z.array(shotFramingSchema).min(1),
}).strict();

export const assetRequirementSchema = z.object({
  id: identifierSchema,
  entityId: identifierSchema.nullable(),
  role: visualRequirementRoleSchema,
  priority: z.enum(["recurring-character", "required-location", "repeated-prop", "single-shot-insert", "optional"]),
  consumingSceneIds: z.array(identifierSchema).min(1),
  consumingShotIds: z.array(identifierSchema).min(1),
  sourceIntent: visualSourceIntentSchema,
  status: z.enum(["resolved", "unresolved", "deferred"]),
}).strict();

export const generationBriefSchema = z.object({
  schemaVersion: z.literal("1.0"),
  id: identifierSchema,
  exchangeMode: z.literal("manual-chatgpt-images"),
  productionId: identifierSchema,
  requirementId: identifierSchema,
  showPack: z.object({id: identifierSchema, version: z.string().min(1), contentHash: hashSchema}).strict(),
  styleBible: z.object({id: identifierSchema, version: z.string().min(1), principles: z.array(z.string().min(1)).min(1), contentHash: hashSchema}).strict(),
  identityLock: z.object({id: identifierSchema, contentHash: hashSchema}).strict().nullable(),
  entity: z.object({id: identifierSchema.nullable(), name: z.string().min(1), kind: z.enum(["character", "location", "prop", "visual"])}).strict(),
  outputRole: z.enum(["character-canonical-sheet", "character-parts", "background-master", "background-layers", "prop-cutout", "editorial-illustration", "diagram", "reconstruction"]),
  candidateCount: z.number().int().nonnegative(),
  imageQuality: z.enum(["low", "medium", "high"]),
  backgroundLayerTarget: z.number().int().positive(),
  posePack: z.enum(["basic", "standard", "extended"]),
  controlledMatte: z.string().regex(/^#[a-fA-F0-9]{6}$/),
  referenceAssets: z.array(z.object({assetId: identifierSchema, contentHash: hashSchema}).strict()),
  sourceExcerpts: z.array(z.string().min(1)).min(1),
  creativeRequirements: z.array(z.string().min(1)).min(1),
  continuityRequirements: z.array(z.string().min(1)),
  prohibitedChanges: z.array(z.string().min(1)).min(1),
  expectedFiles: z.array(z.string().min(1)).min(1),
  consumingSceneIds: z.array(identifierSchema).min(1),
  consumingShotIds: z.array(identifierSchema).min(1),
  approvalRequired: z.literal(true),
  status: z.enum(["draft", "exported", "returned", "accepted", "rejected"]),
}).strict();

export const generationJobDraftSchema = z.object({
  schemaVersion: z.literal("1.0"),
  exchangeMode: z.literal("manual-chatgpt-images"),
  production: z.object({id: identifierSchema, revision: z.number().int().positive(), title: z.string().min(1)}).strict(),
  productionBundleContentHash: hashSchema,
  showPack: z.object({id: identifierSchema, version: z.string().min(1), contentHash: hashSchema}).strict(),
  briefs: z.array(generationBriefSchema),
  expectedOutputLayout: z.object({manifest: z.literal("candidate-bundle.json"), files: z.literal("candidates/<brief-id>/<candidate-set-id>/<file-role>")}).strict(),
}).strict().superRefine((job, context) => {
  const briefIds = new Set<string>();
  const requirementIds = new Set<string>();
  for (const [index, brief] of job.briefs.entries()) {
    if (brief.productionId !== job.production.id) context.addIssue({code: "custom", path: ["briefs", index, "productionId"], message: "Brief production must match the job production."});
    if (brief.exchangeMode !== job.exchangeMode) context.addIssue({code: "custom", path: ["briefs", index, "exchangeMode"], message: "Brief exchange mode must match the job exchange mode."});
    if (brief.showPack.id !== job.showPack.id || brief.showPack.version !== job.showPack.version || brief.showPack.contentHash !== job.showPack.contentHash) context.addIssue({code: "custom", path: ["briefs", index, "showPack"], message: "Brief Show Pack must match the job Show Pack."});
    if (brief.status !== "draft") context.addIssue({code: "custom", path: ["briefs", index, "status"], message: "Only draft briefs can be finalized into a generation job."});
    if (briefIds.has(brief.id)) context.addIssue({code: "custom", path: ["briefs", index, "id"], message: "Generation brief IDs must be unique."});
    if (requirementIds.has(brief.requirementId)) context.addIssue({code: "custom", path: ["briefs", index, "requirementId"], message: "Generation requirement IDs must be unique."});
    briefIds.add(brief.id);
    requirementIds.add(brief.requirementId);
  }
});

export const generationJobSchema = z.object({...generationJobDraftSchema.shape,
  exchangeJobId: identifierSchema,
  createdAt: z.string().datetime(),
  contentHash: hashSchema,
}).strict().superRefine((job, context) => {
  const briefIds = new Set<string>();
  const requirementIds = new Set<string>();
  for (const [index, brief] of job.briefs.entries()) {
    if (brief.productionId !== job.production.id) context.addIssue({code: "custom", path: ["briefs", index, "productionId"], message: "Brief production must match the job production."});
    if (brief.exchangeMode !== job.exchangeMode) context.addIssue({code: "custom", path: ["briefs", index, "exchangeMode"], message: "Brief exchange mode must match the job exchange mode."});
    if (brief.showPack.id !== job.showPack.id || brief.showPack.version !== job.showPack.version || brief.showPack.contentHash !== job.showPack.contentHash) context.addIssue({code: "custom", path: ["briefs", index, "showPack"], message: "Brief Show Pack must match the job Show Pack."});
    if (brief.status !== "exported") context.addIssue({code: "custom", path: ["briefs", index, "status"], message: "Finalized generation-job briefs must be exported."});
    if (briefIds.has(brief.id)) context.addIssue({code: "custom", path: ["briefs", index, "id"], message: "Generation brief IDs must be unique."});
    if (requirementIds.has(brief.requirementId)) context.addIssue({code: "custom", path: ["briefs", index, "requirementId"], message: "Generation requirement IDs must be unique."});
    briefIds.add(brief.id);
    requirementIds.add(brief.requirementId);
  }
});

export const generationExchangeStatusSchema = z.enum(["awaiting-results", "files-imported", "staged", "needs-review", "approved", "rejected", "superseded"]);
export const generationExchangeStateSchema = z.object({
  schemaVersion: z.literal("1.0"),
  exchangeJobId: identifierSchema,
  generationJobContentHash: hashSchema,
  production: z.object({id: identifierSchema, revision: z.number().int().positive()}).strict(),
  status: generationExchangeStatusSchema,
  importId: identifierSchema.nullable(),
  supersededBy: identifierSchema.nullable().default(null),
  updatedAt: z.string().datetime(),
}).strict().superRefine((state, context) => {
  if (state.status === "awaiting-results" && state.importId !== null) context.addIssue({code: "custom", path: ["importId"], message: "An awaiting exchange cannot claim imported artifacts."});
  if (["files-imported", "staged", "needs-review", "approved", "rejected"].includes(state.status) && state.importId === null) context.addIssue({code: "custom", path: ["importId"], message: `${state.status} requires a durable import identity.`});
  if (state.status === "superseded" && !state.supersededBy) context.addIssue({code: "custom", path: ["supersededBy"], message: "A superseded exchange must identify its replacement."});
  if (state.status !== "superseded" && state.supersededBy !== null) context.addIssue({code: "custom", path: ["supersededBy"], message: "Only a superseded exchange may identify a replacement."});
});

export const rightsRecordSchema = z.object({sourceType: z.enum(["generated", "licensed", "public-domain", "user-owned", "project-owned"]), provider: z.string().min(1), usageNotes: z.string().min(1)}).strict();
export const clearedRightsRecordSchema = rightsRecordSchema.extend({clearanceStatus: z.literal("cleared"), evidenceReference: z.string().trim().min(1).max(500)}).strict();
export const candidateBundleAssetSchema = z.object({candidateId: identifierSchema, candidateSetId: identifierSchema, briefId: identifierSchema, fileRole: z.string().min(1), relativeFile: safeRelativePathSchema, contentHash: hashSchema, mediaType: z.enum(["image/png", "image/jpeg", "image/webp"]), width: z.number().int().positive(), height: z.number().int().positive(), rights: rightsRecordSchema}).strict();
export const candidateBundleSchema = z.object({
  schemaVersion: z.literal("1.0"),
  exchangeMode: z.literal("manual-chatgpt-images"),
  exchangeJobId: identifierSchema,
  generationJobContentHash: hashSchema,
  production: z.object({id: identifierSchema, revision: z.number().int().positive()}).strict(),
  showPack: z.object({id: identifierSchema, version: z.string().min(1), contentHash: hashSchema}).strict(),
  providerMetadata: z.object({provider: z.literal("chatgpt-images"), generatedAt: z.string().datetime(), conversationReference: z.string().min(1).nullable()}).strict(),
  assets: z.array(candidateBundleAssetSchema).min(1),
}).strict();
export const stagedCandidateSchema = z.object({candidateId: identifierSchema, sourceContentHash: hashSchema, stagedContentHash: hashSchema, relativeFile: safeRelativePathSchema, stagingState: z.enum(["staged-byte-verified", "staged-needs-mask"]), checks: z.object({dimensions: z.literal(true), mediaType: z.literal(true), alphaOrMatte: z.boolean(), registration: z.literal(false)}).strict()}).strict();
export const preparedCandidateSchema = z.object({
  schemaVersion: z.literal("1.0"),
  candidateId: identifierSchema,
  candidateSetId: identifierSchema,
  briefId: identifierSchema,
  requirementId: identifierSchema,
  fileRole: z.string().min(1),
  assetClass: z.enum(["reference-sheet", "character-pose", "background-plate", "background-layer", "prop-cutout", "editorial-visual"]),
  sourceContentHash: hashSchema,
  preparedContentHash: hashSchema,
  relativeFile: safeRelativePathSchema,
  mediaType: z.literal("image/png"),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  contentBounds: z.object({left: z.number().int().nonnegative(), top: z.number().int().nonnegative(), width: z.number().int().positive(), height: z.number().int().positive()}).strict(),
  registration: z.object({anchorX: z.number().min(0).max(1), anchorY: z.number().min(0).max(1), pivotX: z.number().int().nonnegative(), pivotY: z.number().int().nonnegative(), groundY: z.number().int().nonnegative()}).strict(),
  processor: z.object({id: z.literal("sharp"), version: z.string().min(1)}).strict(),
  preparationState: z.literal("prepared"),
  checks: z.object({dimensions: z.literal(true), mediaType: z.literal(true), alphaOrMatte: z.literal(true), registration: z.literal(true), metadataStripped: z.literal(true)}).strict(),
}).strict().superRefine((candidate, context) => {
  if (candidate.contentBounds.left + candidate.contentBounds.width > candidate.width || candidate.contentBounds.top + candidate.contentBounds.height > candidate.height) context.addIssue({code: "custom", path: ["contentBounds"], message: "Prepared candidate content bounds must stay inside its canvas."});
  if (candidate.registration.pivotX >= candidate.width || candidate.registration.pivotY >= candidate.height || candidate.registration.groundY >= candidate.height) context.addIssue({code: "custom", path: ["registration"], message: "Prepared candidate registration must stay inside its canvas."});
});
export const assetApprovalSchema = z.object({candidateId: identifierSchema, status: z.enum(["pending", "approved", "rejected"]), approvedBy: z.literal("user").nullable(), approvedAt: z.string().datetime().nullable(), notes: z.string()}).strict();
export const approvedAssetVersionSchema = z.object({assetId: identifierSchema, version: z.string().min(1), requirementId: identifierSchema, contentHash: hashSchema, relativeFile: safeRelativePathSchema, provenance: rightsRecordSchema, approvedAt: z.string().datetime()}).strict();
export const audioMixSchema = z.object({
  profile: projectTypeSchema,
  voiceGain: z.number().min(0).max(2),
  musicDecision: z.enum(["pending", "none", "approved-master"]),
  musicGain: z.number().min(0).max(1).optional(),
  musicLoop: z.boolean().optional(),
  transitionSfx: z.enum(["off", "paper-flip"]),
  transitionSfxGain: z.number().min(0).max(1),
  reviewed: z.boolean(),
}).strict().superRefine((mix, context) => {
  if (mix.reviewed && mix.musicDecision === "pending") context.addIssue({code: "custom", path: ["musicDecision"], message: "A reviewed mix must explicitly choose no music or bind an approved music master."});
});
export const voiceTrackSchema = z.object({
  id: identifierSchema,
  contentHash: hashSchema,
  relativeFile: safeRelativePathSchema,
  sourceFileName: z.string().min(1).max(260),
  codec: z.enum(["pcm-wav", "ieee-float-wav"]),
  durationInSeconds: z.number().positive().max(14_400),
  sampleRate: z.number().int().min(8_000).max(192_000),
  channels: z.union([z.literal(1), z.literal(2)]),
  bitsPerSample: z.union([z.literal(16), z.literal(24), z.literal(32)]),
  importedAt: z.string().datetime(),
  approvalStatus: z.enum(["imported", "approved"]),
  approvedAt: z.string().datetime().nullable(),
  rights: clearedRightsRecordSchema.optional(),
}).strict().superRefine((track, context) => {
  if ((track.approvalStatus === "approved") !== Boolean(track.approvedAt)) context.addIssue({code: "custom", path: ["approvedAt"], message: "Approved voice tracks require an approval timestamp; imported tracks must not have one."});
});
export const musicTrackSchema = voiceTrackSchema;
export const soundEffectAssetSchema = voiceTrackSchema;
export const soundEffectCueSchema = z.object({
  id: identifierSchema,
  assetContentHash: hashSchema,
  shotId: identifierSchema,
  offsetInFrames: z.number().int().nonnegative(),
  gain: z.number().min(0).max(1),
  label: z.string().trim().min(1).max(120),
}).strict();

export const resolvedEntitySchema = z.object({
  entityId: identifierSchema,
  entityName: z.string().min(1),
  assetId: identifierSchema,
  resolved: z.boolean(),
  matchStrategy: z.enum(["explicit-binding", "identity-lock", "semantic-tag", "show-pack-role", "placeholder"]),
  matchConfidence: z.number().min(0).max(1),
}).strict();

export const resolvedVisualSchema = z.object({requirementId: identifierSchema, role: visualRequirementRoleSchema, assetId: identifierSchema, assetVersion: z.string().min(1), contentHash: hashSchema, resolutionStatus: z.enum(["approved", "placeholder", "unresolved"])}).strict();

export const shotOverrideSchema = z.object({
  shotId: identifierSchema,
  treatment: shotTreatmentSchema.optional(),
  framing: shotFramingSchema.optional(),
  transition: transitionStyleSchema.optional(),
  caption: z.string().trim().min(1).max(500).nullable().optional(),
  durationInFrames: z.number().int().min(12).max(1800).optional(),
  timingLocked: z.literal(true).optional(),
  gesture: gestureSchema.optional(),
  gestureIntensity: z.number().min(0).max(1).optional(),
  cameraAction: z.enum(["cameraPush", "pan", "reframe"]).optional(),
}).strict();

export const resolvedProductionPlanSchema = z.object({
  schemaVersion: z.literal("1.2"),
  creativePlan: creativeEpisodePlanSchema,
  showPack: showPackSchema,
  characters: z.array(resolvedEntitySchema),
  locations: z.array(resolvedEntitySchema),
  props: z.array(resolvedEntitySchema),
  approvedAssets: z.array(assetManifestEntrySchema),
  requirements: z.array(assetRequirementSchema).min(1),
  resolvedVisuals: z.array(resolvedVisualSchema).min(1),
  overrides: z.array(shotOverrideSchema),
  generationBriefs: z.array(generationBriefSchema),
  warnings: z.array(z.string().min(1)),
}).strict();

export const compiledActionSchema = z.object({
  id: identifierSchema,
  actorId: identifierSchema.nullable(),
  targetId: identifierSchema.nullable(),
  label: z.string().min(1),
  startFrame: z.number().int().nonnegative(),
  endFrame: z.number().int().positive(),
  detail: actionDetailSchema,
}).strict();

export const renderShotSchema = z.object({
  id: identifierSchema,
  sceneId: identifierSchema,
  number: z.string().min(1),
  title: z.string().min(1),
  editorialText: z.string().min(1).optional(),
  framing: shotFramingSchema,
  treatment: shotTreatmentSchema,
  transition: transitionStyleSchema,
  locationAssetId: identifierSchema,
  focusCharacterId: identifierSchema.nullable(),
  visualBindings: z.array(resolvedVisualSchema).min(1),
  startFrame: z.number().int().nonnegative(),
  durationInFrames: z.number().int().positive(),
  actions: z.array(compiledActionSchema).min(1),
  caption: z.string().min(1).nullable(),
}).strict();

export const directedPlanMetricsSchema = z.object({
  averageShotSeconds: z.number().positive(),
  medianShotSeconds: z.number().positive(),
  cutsPerMinute: z.number().positive(),
  framingDistribution: z.record(z.string(), z.number().min(0).max(1)),
  treatmentDistribution: z.record(z.string(), z.number().min(0).max(1)),
  cameraActionsPerMinute: z.number().nonnegative(),
  transitionDistribution: z.record(z.string(), z.number().min(0).max(1)),
  textEventsPerMinute: z.number().nonnegative(),
  textWordsPerMinute: z.number().nonnegative(),
  performanceEventsPerMinute: z.number().nonnegative(),
  poseChangesPerMinute: z.number().nonnegative(),
  reactionsPerMinute: z.number().nonnegative(),
  assetSourceDistribution: z.record(z.string(), z.number().min(0).max(1)),
  maximumStaticFrames: z.number().int().positive(),
}).strict();

export const productionEstimateSchema = z.object({
  shotCount: z.number().int().positive(),
  durationSeconds: z.number().positive(),
  newRequirementCount: z.number().int().nonnegative(),
  deferredRequirementCount: z.number().int().nonnegative(),
  estimatedCandidateImages: z.number().int().nonnegative(),
  outputWidth: z.number().int().positive(),
  outputHeight: z.number().int().positive(),
}).strict();

export const frameAccurateRenderPlanSchema = z.object({
  schemaVersion: z.literal("1.2"),
  id: identifierSchema,
  productionId: identifierSchema,
  planRevision: z.number().int().positive(),
  compilerVersion: z.literal(STORY_ENGINE_COMPILER_VERSION),
  contentHash: hashSchema,
  title: z.string().min(1),
  fps: z.number().int().positive(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  durationInFrames: z.number().int().positive(),
  projectType: projectTypeSchema,
  productionPolicy: productionPolicySchema,
  assetRoutingPolicy: assetRoutingPolicySchema,
  directingProfile: z.object({id: identifierSchema, version: z.string().min(1), visualMode: visualModeSchema}).strict(),
  showPack: z.object({id: identifierSchema, version: z.string().min(1), contentHash: hashSchema}).strict(),
  assets: z.array(assetManifestEntrySchema).min(1),
  characters: z.array(resolvedEntitySchema),
  locations: z.array(resolvedEntitySchema),
  props: z.array(resolvedEntitySchema),
  shots: z.array(renderShotSchema).min(1),
  metrics: directedPlanMetricsSchema,
  unresolvedWarnings: z.array(z.string().min(1)),
}).strict().superRefine((plan, context) => {
  const finalFrame = Math.max(...plan.shots.map((shot) => shot.startFrame + shot.durationInFrames));
  if (finalFrame !== plan.durationInFrames) context.addIssue({code: "custom", message: "Duration must equal the final shot boundary."});
  for (const shot of plan.shots) {
    const background = shot.visualBindings.find((binding) => binding.role === "background");
    if (background && background.assetId !== shot.locationAssetId) context.addIssue({code: "custom", message: `Shot ${shot.id} background binding must match its location asset.`});
    const compatibleRoles: Partial<Record<typeof shot.treatment, string[]>> = {insert: ["insert", "prop"], diagram: ["diagram"], "kinetic-type": ["diagram"], "licensed-media": ["evidence"], "generated-illustration": ["reconstruction", "insert"]};
    const requiredRoles = compatibleRoles[shot.treatment];
    if (requiredRoles && !shot.visualBindings.some((binding) => requiredRoles.includes(binding.role))) context.addIssue({code: "custom", message: `Shot ${shot.id} treatment lacks a compatible visual binding.`});
    for (const action of shot.actions) {
      const shotEnd = shot.startFrame + shot.durationInFrames;
      if (action.endFrame <= action.startFrame || action.startFrame < shot.startFrame || action.endFrame > shotEnd) context.addIssue({code: "custom", message: `Action ${action.id} has an invalid frame range.`});
    }
  }
});

export type ProjectType = z.infer<typeof projectTypeSchema>;
export type ProductionPreset = z.infer<typeof productionPresetSchema>;
export type ProductionPolicy = z.infer<typeof productionPolicySchema>;
export type AssetRoutingPolicy = z.infer<typeof assetRoutingPolicySchema>;
export type ProductionDraft = z.infer<typeof productionDraftSchema>;
export type ProductionDiagnostic = z.infer<typeof productionDiagnosticSchema>;
export type ScriptElement = z.infer<typeof scriptElementSchema>;
export type ScriptDocument = z.infer<typeof scriptDocumentSchema>;
export type StoryAnalysis = z.infer<typeof storyAnalysisSchema>;
export type StoryEntity = z.infer<typeof storyEntitySchema>;
export type ShotFraming = z.infer<typeof shotFramingSchema>;
export type ShotTreatment = z.infer<typeof shotTreatmentSchema>;
export type Gesture = z.infer<typeof gestureSchema>;
export type ActionDetail = z.infer<typeof actionDetailSchema>;
export type CreativeEpisodePlan = z.infer<typeof creativeEpisodePlanSchema>;
export type CreativeShot = z.infer<typeof creativeShotSchema>;
export type VisualRequirement = z.infer<typeof visualRequirementSchema>;
export type AssetManifestEntry = z.infer<typeof assetManifestEntrySchema>;
export type DirectingProfile = z.infer<typeof directingProfileSchema>;
export type ShowPack = z.infer<typeof showPackSchema>;
export type AssetRequirement = z.infer<typeof assetRequirementSchema>;
export type GenerationBrief = z.infer<typeof generationBriefSchema>;
export type GenerationJobDraft = z.infer<typeof generationJobDraftSchema>;
export type GenerationJob = z.infer<typeof generationJobSchema>;
export type GenerationExchangeState = z.infer<typeof generationExchangeStateSchema>;
export type ResolvedVisual = z.infer<typeof resolvedVisualSchema>;
export type CandidateBundle = z.infer<typeof candidateBundleSchema>;
export type StagedCandidate = z.infer<typeof stagedCandidateSchema>;
export type PreparedCandidate = z.infer<typeof preparedCandidateSchema>;
export type AssetApproval = z.infer<typeof assetApprovalSchema>;
export type ApprovedAssetVersion = z.infer<typeof approvedAssetVersionSchema>;
export type ClearedRightsRecord = z.infer<typeof clearedRightsRecordSchema>;
export type AudioMix = z.infer<typeof audioMixSchema>;
export type VoiceTrack = z.infer<typeof voiceTrackSchema>;
export type MusicTrack = z.infer<typeof musicTrackSchema>;
export type SoundEffectAsset = z.infer<typeof soundEffectAssetSchema>;
export type SoundEffectCue = z.infer<typeof soundEffectCueSchema>;
export type ResolvedProductionPlan = z.infer<typeof resolvedProductionPlanSchema>;
export type ShotOverride = z.infer<typeof shotOverrideSchema>;
export type FrameAccurateRenderPlan = z.infer<typeof frameAccurateRenderPlanSchema>;
export type DirectedPlanMetrics = z.infer<typeof directedPlanMetricsSchema>;
export type ProductionEstimate = z.infer<typeof productionEstimateSchema>;
