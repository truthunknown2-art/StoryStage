import {z} from "zod";

const identifierSchema = z.string().regex(/^[a-z0-9][a-z0-9-]*$/);
const hashSchema = z.string().regex(/^[a-f0-9]{64}$/);

export const projectTypeSchema = z.enum(["kids", "explainer"]);
export const productionPresetSchema = z.enum(["draft", "studio", "premium"]);
export const visualModeSchema = z.enum(["kids-adventure", "weird-history-editorial"]);

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

export const scriptElementSchema = z.discriminatedUnion("type", [
  sceneHeadingElementSchema,
  dialogueElementSchema,
  actionElementSchema,
]);

export const scriptDocumentSchema = z.object({
  schemaVersion: z.literal("1.0"),
  id: identifierSchema,
  title: z.string().min(1),
  sourceText: z.string().min(1),
  elements: z.array(scriptElementSchema).min(1),
}).strict();

export const storyEntitySchema = z.object({
  id: identifierSchema,
  kind: z.enum(["character", "location", "prop"]),
  name: z.string().min(1),
  mentions: z.number().int().positive(),
}).strict();

export const storyAnalysisSchema = z.object({
  schemaVersion: z.literal("1.0"),
  documentId: identifierSchema,
  characters: z.array(storyEntitySchema),
  locations: z.array(storyEntitySchema),
  props: z.array(storyEntitySchema),
  warnings: z.array(z.string().min(1)),
}).strict();

export const semanticActionTypeSchema = z.enum([
  "enter",
  "exit",
  "talk",
  "lookAt",
  "gesture",
  "react",
  "holdPose",
  "hardCut",
  "cameraPush",
  "reframe",
  "insert",
  "foregroundWipe",
  "kineticType",
  "beatAccent",
  "pan",
]);

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

export const semanticActionDraftSchema = z.object({
  id: identifierSchema,
  type: semanticActionTypeSchema,
  actorName: z.string().min(1).nullable(),
  targetName: z.string().min(1).nullable(),
  label: z.string().min(1),
  startOffsetFrames: z.number().int().nonnegative(),
  durationInFrames: z.number().int().positive(),
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

export const creativeEpisodePlanSchema = z.object({
  schemaVersion: z.literal("1.1"),
  id: identifierSchema,
  title: z.string().min(1),
  fps: z.number().int().positive(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  projectType: projectTypeSchema,
  productionPolicy: productionPolicySchema,
  showPackId: identifierSchema,
  directingProfileId: identifierSchema,
  analysis: storyAnalysisSchema,
  scenes: z.array(creativeSceneSchema).min(1),
  shots: z.array(creativeShotSchema).min(1),
}).strict();

export const assetOriginSchema = z.enum(["project-owned-code", "generated-approved", "licensed-stock", "user-owned"]);

export const assetManifestEntrySchema = z.object({
  id: identifierSchema,
  kind: z.enum(["character-rig", "location", "prop", "overlay", "graphic", "placeholder"]),
  version: z.string().min(1),
  displayName: z.string().min(1),
  contentHash: hashSchema,
  origin: assetOriginSchema,
  license: z.string().min(1),
  localAssetKey: identifierSchema,
  tags: z.array(z.string().min(1)),
  palette: z.tuple([z.string().min(1), z.string().min(1), z.string().min(1)]),
}).strict();

export const directingProfileSchema = z.object({
  id: identifierSchema,
  version: z.string().min(1),
  projectType: projectTypeSchema,
  visualMode: visualModeSchema,
  cadenceSeconds: z.tuple([z.number().positive(), z.number().positive()]),
  maxStaticSeconds: z.number().positive(),
  shotMix: z.object({
    wide: z.number().min(0).max(1),
    medium: z.number().min(0).max(1),
    closeUp: z.number().min(0).max(1),
    insert: z.number().min(0).max(1),
    graphic: z.number().min(0).max(1),
  }).strict(),
  cameraMoves: z.array(z.enum(["locked", "push", "pan", "track", "crash-in"])).min(1),
  transitions: z.array(transitionStyleSchema).min(1),
  textMode: z.enum(["participation-cues", "editorial-keywords"]),
  accentColor: z.string().min(1),
  qualityRules: z.array(z.string().min(1)).min(1),
}).strict().superRefine((profile, context) => {
  if (profile.cadenceSeconds[0] > profile.cadenceSeconds[1]) {
    context.addIssue({code: "custom", message: "Cadence minimum must not exceed cadence maximum."});
  }
  const total = Object.values(profile.shotMix).reduce((sum, value) => sum + value, 0);
  if (Math.abs(total - 1) > 0.001) context.addIssue({code: "custom", message: "Shot mix must total 1."});
});

export const assetFactoryPolicySchema = z.object({
  providerClass: z.literal("chatgpt-images"),
  integrationStatus: z.enum(["disabled", "mock", "connected"]),
  requiredCharacterOutputs: z.array(z.enum(["identity-sheet", "expression-set", "mouth-set", "pose-set", "separated-parts"])).min(1),
  requiredBackgroundOutputs: z.array(z.enum(["clean-plate", "depth-layers", "foreground-occluders"])).min(1),
  approvalRequired: z.literal(true),
}).strict();

export const showPackSchema = z.object({
  schemaVersion: z.literal("1.1"),
  id: identifierSchema,
  version: z.string().min(1),
  displayName: z.string().min(1),
  contentHash: hashSchema,
  projectType: projectTypeSchema,
  profile: directingProfileSchema,
  assetFactory: assetFactoryPolicySchema,
  assets: z.array(assetManifestEntrySchema).min(1),
  allowedGestures: z.array(gestureSchema).min(1),
  allowedFramings: z.array(shotFramingSchema).min(1),
}).strict();

export const assetGenerationRequestSchema = z.object({
  schemaVersion: z.literal("1.0"),
  id: identifierSchema,
  showPackId: identifierSchema,
  entityId: identifierSchema,
  assetKind: z.enum(["character-identity", "character-parts", "background-plate", "background-layers", "prop", "illustration"]),
  brief: z.string().min(1),
  referenceAssetIds: z.array(identifierSchema),
  candidateCount: z.number().int().nonnegative(),
  imageQuality: z.enum(["low", "medium", "high"]),
  backgroundLayerTarget: z.number().int().positive(),
  posePack: z.enum(["basic", "standard", "extended"]),
  status: z.enum(["draft", "approved", "generating", "review", "accepted", "rejected"]),
}).strict();

export const resolvedEntitySchema = z.object({
  entityId: identifierSchema,
  entityName: z.string().min(1),
  assetId: identifierSchema,
  resolved: z.boolean(),
}).strict();

export const shotOverrideSchema = z.object({
  shotId: identifierSchema,
  framing: shotFramingSchema.optional(),
  gesture: gestureSchema.optional(),
  treatment: shotTreatmentSchema.optional(),
  locationAssetId: identifierSchema.optional(),
}).strict();

export const resolvedProductionPlanSchema = z.object({
  schemaVersion: z.literal("1.1"),
  creativePlan: creativeEpisodePlanSchema,
  showPack: showPackSchema,
  characters: z.array(resolvedEntitySchema),
  locations: z.array(resolvedEntitySchema),
  props: z.array(resolvedEntitySchema),
  overrides: z.array(shotOverrideSchema),
  generationRequests: z.array(assetGenerationRequestSchema),
  warnings: z.array(z.string().min(1)),
}).strict();

export const compiledActionSchema = z.object({
  id: identifierSchema,
  type: semanticActionTypeSchema,
  actorId: identifierSchema.nullable(),
  targetId: identifierSchema.nullable(),
  label: z.string().min(1),
  startFrame: z.number().int().nonnegative(),
  endFrame: z.number().int().positive(),
}).strict();

export const renderShotSchema = z.object({
  id: identifierSchema,
  sceneId: identifierSchema,
  number: z.string().min(1),
  title: z.string().min(1),
  framing: shotFramingSchema,
  treatment: shotTreatmentSchema,
  transition: transitionStyleSchema,
  locationAssetId: identifierSchema,
  focusCharacterId: identifierSchema.nullable(),
  startFrame: z.number().int().nonnegative(),
  durationInFrames: z.number().int().positive(),
  actions: z.array(compiledActionSchema).min(1),
  caption: z.string().min(1).nullable(),
}).strict();

export const frameAccurateRenderPlanSchema = z.object({
  schemaVersion: z.literal("1.1"),
  id: identifierSchema,
  title: z.string().min(1),
  fps: z.number().int().positive(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  durationInFrames: z.number().int().positive(),
  projectType: projectTypeSchema,
  productionPolicy: productionPolicySchema,
  directingProfile: z.object({id: identifierSchema, version: z.string().min(1), visualMode: visualModeSchema}).strict(),
  showPack: z.object({id: identifierSchema, version: z.string().min(1), contentHash: hashSchema}).strict(),
  assets: z.array(assetManifestEntrySchema).min(1),
  characters: z.array(resolvedEntitySchema),
  locations: z.array(resolvedEntitySchema),
  props: z.array(resolvedEntitySchema),
  shots: z.array(renderShotSchema).min(1),
  unresolvedWarnings: z.array(z.string().min(1)),
}).strict().superRefine((plan, context) => {
  const finalFrame = Math.max(...plan.shots.map((shot) => shot.startFrame + shot.durationInFrames));
  if (finalFrame !== plan.durationInFrames) context.addIssue({code: "custom", message: "Duration must equal the final shot boundary."});
  for (const shot of plan.shots) {
    for (const action of shot.actions) {
      const shotEnd = shot.startFrame + shot.durationInFrames;
      if (action.endFrame <= action.startFrame || action.startFrame < shot.startFrame || action.endFrame > shotEnd) {
        context.addIssue({code: "custom", message: `Action ${action.id} has an invalid frame range.`});
      }
    }
  }
});

export type ProjectType = z.infer<typeof projectTypeSchema>;
export type ProductionPreset = z.infer<typeof productionPresetSchema>;
export type ProductionPolicy = z.infer<typeof productionPolicySchema>;
export type VisualMode = z.infer<typeof visualModeSchema>;
export type ScriptElement = z.infer<typeof scriptElementSchema>;
export type ScriptDocument = z.infer<typeof scriptDocumentSchema>;
export type StoryAnalysis = z.infer<typeof storyAnalysisSchema>;
export type StoryEntity = z.infer<typeof storyEntitySchema>;
export type SemanticActionType = z.infer<typeof semanticActionTypeSchema>;
export type ShotFraming = z.infer<typeof shotFramingSchema>;
export type ShotTreatment = z.infer<typeof shotTreatmentSchema>;
export type Gesture = z.infer<typeof gestureSchema>;
export type CreativeEpisodePlan = z.infer<typeof creativeEpisodePlanSchema>;
export type CreativeShot = z.infer<typeof creativeShotSchema>;
export type AssetManifestEntry = z.infer<typeof assetManifestEntrySchema>;
export type DirectingProfile = z.infer<typeof directingProfileSchema>;
export type ShowPack = z.infer<typeof showPackSchema>;
export type AssetGenerationRequest = z.infer<typeof assetGenerationRequestSchema>;
export type ResolvedProductionPlan = z.infer<typeof resolvedProductionPlanSchema>;
export type ShotOverride = z.infer<typeof shotOverrideSchema>;
export type FrameAccurateRenderPlan = z.infer<typeof frameAccurateRenderPlanSchema>;
