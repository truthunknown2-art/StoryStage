import {z} from "zod";
import {hashCanonical} from "./canonical-hash";
import {clearedRightsRecordSchema, hashSchema, identifierSchema, type FrameAccurateRenderPlan} from "./model";
import {type ProductionBundle, productionBundleSchema, verifyProductionBundleHash} from "./production-bundle";
import {parseScript} from "./script-parser";

const safeRelativePathSchema = z.string().min(1).refine((value) => !value.includes("\\") && !value.includes(":") && !value.startsWith("/") && !value.split("/").includes(".."), "Path must be a safe forward-slash relative path.");

const renderIdentitySchema = z.object({
  id: identifierSchema,
  revision: z.number().int().positive(),
  bundleContentHash: hashSchema,
  renderPlanContentHash: hashSchema,
}).strict();

const masterMetadataSchema = z.object({
  relativeFile: safeRelativePathSchema,
  sha256: hashSchema,
  byteLength: z.number().int().positive(),
  codec: z.literal("h264"),
  width: z.literal(1920),
  height: z.literal(1080),
  fps: z.literal(30),
  frameCount: z.number().int().positive(),
  durationInSeconds: z.number().positive(),
  audio: z.object({codec: z.literal("aac"), channels: z.number().int().positive(), sampleRate: z.number().int().positive()}).strict().nullable(),
}).strict();

const toolchainSchema = z.object({
  storyStageVersion: z.string().min(1),
  storyStageCommit: z.string().min(1),
  compilerVersion: z.string().min(1),
  remotionVersion: z.string().min(1),
  ffmpegVersion: z.string().min(1),
  platform: z.string().min(1),
  architecture: z.string().min(1),
}).strict();

const renderReceiptFields = {
  schemaVersion: z.literal("1.0"),
  renderId: identifierSchema,
  production: renderIdentitySchema,
  scope: z.literal("full-production"),
  master: masterMetadataSchema,
  toolchain: toolchainSchema,
  completedAt: z.string().datetime(),
};
export const renderReceiptDraftSchema = z.object(renderReceiptFields).strict();
export const renderReceiptSchema = z.object({...renderReceiptFields, contentHash: hashSchema}).strict();
export type RenderReceiptDraft = z.infer<typeof renderReceiptDraftSchema>;
export type RenderReceipt = z.infer<typeof renderReceiptSchema>;

export function finalizeRenderReceipt(input: RenderReceiptDraft): RenderReceipt {
  const draft = renderReceiptDraftSchema.parse(input);
  return renderReceiptSchema.parse({...draft, contentHash: hashCanonical(draft)});
}

export const verifyRenderReceiptHash = (receipt: RenderReceipt): boolean => {
  const {contentHash, ...draft} = renderReceiptSchema.parse(receipt);
  return contentHash === hashCanonical(renderReceiptDraftSchema.parse(draft));
};

export const deliveryProjectManifestSchema = z.object({
  schemaVersion: z.literal("1.0"),
  production: renderIdentitySchema,
  productionBundleByteHash: hashSchema,
  showPack: z.object({id: identifierSchema, version: z.string().min(1), contentHash: hashSchema}).strict(),
  directingProfile: identifierSchema,
  toolchain: toolchainSchema,
  output: masterMetadataSchema.omit({relativeFile: true, sha256: true, byteLength: true}),
  captionCueCount: z.number().int().nonnegative(),
  approvedVisualAssets: z.array(z.object({assetId: identifierSchema, version: z.string().min(1), contentHash: hashSchema}).strict()),
  audio: z.object({voice: hashSchema.nullable(), music: hashSchema.nullable(), soundEffects: z.array(hashSchema), mix: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()]))}).strict(),
  createdAt: z.string().datetime(),
}).strict();
export type DeliveryProjectManifest = z.infer<typeof deliveryProjectManifestSchema>;

export const deliveryProvenanceEntrySchema = z.object({
  id: z.string().trim().min(1),
  mediaKind: z.enum(["visual", "voice", "music", "sound-effect", "show-pack", "code-treatment"]),
  contentHash: hashSchema,
  rights: clearedRightsRecordSchema,
  evidenceReference: z.string().trim().min(1).max(500),
}).strict();
export const deliveryProvenanceReportSchema = z.object({
  schemaVersion: z.literal("1.0"),
  productionBundleContentHash: hashSchema,
  clearanceStatus: z.literal("cleared"),
  entries: z.array(deliveryProvenanceEntrySchema).min(1),
}).strict();
export type DeliveryProvenanceReport = z.infer<typeof deliveryProvenanceReportSchema>;

export const deliveryPayloadRoleSchema = z.enum(["master", "captions", "production-bundle", "render-receipt", "project-manifest", "provenance-rights"]);
export const deliveryPayloadSchema = z.object({role: deliveryPayloadRoleSchema, relativeFile: safeRelativePathSchema, sha256: hashSchema, byteLength: z.number().int().nonnegative()}).strict();
const deliveryManifestFields = {
  schemaVersion: z.literal("1.0"),
  production: renderIdentitySchema,
  renderReceiptContentHash: hashSchema,
  createdAt: z.string().datetime(),
  files: z.array(deliveryPayloadSchema).length(6),
};
const validateDeliveryFiles = (files: Array<z.infer<typeof deliveryPayloadSchema>>, context: z.RefinementCtx) => {
  const roles = new Set(files.map((file) => file.role));
  for (const role of deliveryPayloadRoleSchema.options) if (!roles.has(role)) context.addIssue({code: "custom", path: ["files"], message: `Delivery manifest is missing ${role}.`});
  if (roles.size !== files.length) context.addIssue({code: "custom", path: ["files"], message: "Delivery manifest roles must be unique."});
};
export const deliveryManifestDraftSchema = z.object(deliveryManifestFields).strict().superRefine((manifest, context) => validateDeliveryFiles(manifest.files, context));
export const deliveryManifestSchema = z.object({...deliveryManifestFields, contentHash: hashSchema}).strict().superRefine((manifest, context) => validateDeliveryFiles(manifest.files, context));
export type DeliveryManifestDraft = z.infer<typeof deliveryManifestDraftSchema>;
export type DeliveryManifest = z.infer<typeof deliveryManifestSchema>;

export function finalizeDeliveryManifest(input: DeliveryManifestDraft): DeliveryManifest {
  const draft = deliveryManifestDraftSchema.parse(input);
  return deliveryManifestSchema.parse({...draft, contentHash: hashCanonical(draft)});
}

export const verifyDeliveryManifestHash = (manifest: DeliveryManifest): boolean => {
  const {contentHash, ...draft} = deliveryManifestSchema.parse(manifest);
  return contentHash === hashCanonical(deliveryManifestDraftSchema.parse(draft));
};

const srtTimestamp = (frame: number, fps: number): string => {
  const milliseconds = Math.round(frame * 1000 / fps);
  const hours = Math.floor(milliseconds / 3_600_000);
  const minutes = Math.floor(milliseconds % 3_600_000 / 60_000);
  const seconds = Math.floor(milliseconds % 60_000 / 1000);
  const remainder = milliseconds % 1000;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")},${String(remainder).padStart(3, "0")}`;
};

export function buildDeliverySrt(bundleInput: ProductionBundle): {cueCount: number; text: string} {
  const bundle = productionBundleSchema.parse(bundleInput);
  if (!verifyProductionBundleHash(bundle)) throw new Error("Delivery captions require an exact verified production bundle.");
  const scriptDocument = parseScript(bundle.production.script, bundle.production.title, bundle.production.productionId);
  const sourceById = new Map(scriptDocument.elements.map((element) => [element.id, element]));
  const explicitOmissions = new Set(bundle.overrides.filter((override) => override.caption === null).map((override) => override.shotId));
  const creativeById = new Map(bundle.resolvedPlan.creativePlan.shots.map((shot) => [shot.id, shot]));
  const captionCues = bundle.renderPlan.shots.flatMap((shot) => {
    const creative = creativeById.get(shot.id);
    const spoken = creative?.sourceElementIds.some((id) => ["dialogue", "narration"].includes(sourceById.get(id)?.type ?? "")) ?? false;
    if (explicitOmissions.has(shot.id)) return [];
    const text = shot.caption ?? (spoken ? creative?.sourceExcerpt.trim() : null);
    if (spoken && !text) throw new Error(`Spoken shot ${shot.id} is missing caption coverage without an explicit omission decision.`);
    return text ? [{shot, text}] : [];
  });
  const blocks = captionCues.map(({shot, text}, index) => {
    const start = srtTimestamp(shot.startFrame, bundle.renderPlan.fps);
    const end = srtTimestamp(Math.min(bundle.renderPlan.durationInFrames, shot.startFrame + shot.durationInFrames), bundle.renderPlan.fps);
    const caption = text.replaceAll("\r\n", "\n").replaceAll("\r", "\n").trim();
    return `${index + 1}\r\n${start} --> ${end}\r\n${caption.replaceAll("\n", "\r\n")}`;
  });
  return {cueCount: captionCues.length, text: `${blocks.join("\r\n\r\n")}${blocks.length ? "\r\n" : ""}`};
}

export const deliveryRenderPlanContentHash = (plan: FrameAccurateRenderPlan): string => plan.contentHash;

export function buildDeliveryProjectManifest(input: {bundle: ProductionBundle; receipt: RenderReceipt; captionCueCount: number; productionBundleByteHash: string}): DeliveryProjectManifest {
  const {bundle, receipt} = input;
  if (!verifyProductionBundleHash(bundle) || !verifyRenderReceiptHash(receipt) || receipt.production.bundleContentHash !== bundle.contentHash) throw new Error("A delivery project manifest requires one exact bundle and render receipt.");
  const mix = bundle.audioMix ? Object.fromEntries(Object.entries(bundle.audioMix).map(([key, value]) => [key, value ?? null])) : {};
  const usedSoundEffects = new Set((bundle.soundEffectCues ?? []).map((cue) => cue.assetContentHash));
  return deliveryProjectManifestSchema.parse({
    schemaVersion: "1.0",
    production: receipt.production,
    productionBundleByteHash: input.productionBundleByteHash,
    showPack: bundle.renderPlan.showPack,
    directingProfile: bundle.renderPlan.directingProfile.id,
    toolchain: receipt.toolchain,
    output: {codec: receipt.master.codec, width: receipt.master.width, height: receipt.master.height, fps: receipt.master.fps, frameCount: receipt.master.frameCount, durationInSeconds: receipt.master.durationInSeconds, audio: receipt.master.audio},
    captionCueCount: input.captionCueCount,
    approvedVisualAssets: (bundle.approvedAssetVersions ?? []).map((asset) => ({assetId: asset.assetId, version: asset.version, contentHash: asset.contentHash})),
    audio: {voice: bundle.voiceTrack?.contentHash ?? null, music: bundle.audioMix?.musicDecision === "approved-master" ? bundle.musicTrack?.contentHash ?? null : null, soundEffects: (bundle.soundEffectAssets ?? []).filter((asset) => usedSoundEffects.has(asset.contentHash)).map((asset) => asset.contentHash), mix},
    createdAt: receipt.completedAt,
  });
}

export function buildDeliveryProvenanceReport(input: {bundle: ProductionBundle; transitionSfxContentHash?: string}): DeliveryProvenanceReport {
  const bundle = productionBundleSchema.parse(input.bundle);
  if (!verifyProductionBundleHash(bundle)) throw new Error("Delivery provenance requires an exact verified production bundle.");
  const entries: Array<z.infer<typeof deliveryProvenanceEntrySchema>> = [];
  for (const asset of bundle.approvedAssetVersions ?? []) entries.push({id: asset.assetId, mediaKind: "visual", contentHash: asset.contentHash, rights: {...asset.provenance, clearanceStatus: "cleared", evidenceReference: asset.relativeFile}, evidenceReference: asset.relativeFile});
  const approvedHashes = new Set((bundle.approvedAssetVersions ?? []).map((asset) => asset.contentHash));
  const usedAssetIds = new Set(bundle.renderPlan.shots.flatMap((shot) => [shot.locationAssetId, ...shot.visualBindings.map((binding) => binding.assetId)]));
  for (const asset of bundle.renderPlan.assets.filter((candidate) => usedAssetIds.has(candidate.id) && !approvedHashes.has(candidate.contentHash))) {
    if (asset.kind === "placeholder") throw new Error(`Delivery provenance cannot clear placeholder asset ${asset.id}.`);
    const sourceType = asset.origin === "licensed-stock" ? "licensed" : asset.origin === "user-owned" ? "user-owned" : asset.origin === "generated-approved" ? "generated" : "project-owned";
    const evidenceReference = `show-pack/${bundle.renderPlan.showPack.id}@${bundle.renderPlan.showPack.version}#${asset.id}`;
    entries.push({id: asset.id, mediaKind: "show-pack", contentHash: asset.contentHash, rights: {sourceType, provider: asset.origin === "project-owned-code" ? "StoryStage" : asset.displayName, usageNotes: asset.license, clearanceStatus: "cleared", evidenceReference}, evidenceReference});
  }
  const addAudio = (track: ProductionBundle["voiceTrack"], mediaKind: "voice" | "music" | "sound-effect") => {
    if (!track) return;
    if (track.approvalStatus !== "approved" || !track.rights) throw new Error(`Delivery is blocked because ${mediaKind} ${track.sourceFileName} lacks content-bound cleared rights.`);
    entries.push({id: track.id, mediaKind, contentHash: track.contentHash, rights: track.rights, evidenceReference: track.rights.evidenceReference});
  };
  addAudio(bundle.voiceTrack, "voice");
  if (bundle.audioMix?.musicDecision === "approved-master") addAudio(bundle.musicTrack, "music");
  const usedSoundEffects = new Set((bundle.soundEffectCues ?? []).map((cue) => cue.assetContentHash));
  for (const asset of (bundle.soundEffectAssets ?? []).filter((candidate) => usedSoundEffects.has(candidate.contentHash))) addAudio(asset, "sound-effect");
  if (bundle.audioMix?.transitionSfx === "paper-flip") {
    if (!input.transitionSfxContentHash || !hashSchema.safeParse(input.transitionSfxContentHash).success) throw new Error("Delivery is blocked because the built-in transition sound was not byte-verified.");
    const evidenceReference = "packages/remotion-runtime/public/audio/paper-flip.wav";
    entries.push({id: "paper-flip", mediaKind: "sound-effect", contentHash: input.transitionSfxContentHash, rights: {sourceType: "project-owned", provider: "StoryStage", usageNotes: "Bundled project-owned transition sound.", clearanceStatus: "cleared", evidenceReference}, evidenceReference});
  }
  const treatments = new Set(bundle.renderPlan.shots.map((shot) => shot.treatment));
  for (const treatment of treatments) {
    const evidenceReference = `story-engine/${bundle.renderPlan.compilerVersion}/treatment/${treatment}`;
    entries.push({id: `treatment-${treatment}`, mediaKind: "code-treatment", contentHash: hashCanonical({compilerVersion: bundle.renderPlan.compilerVersion, treatment}), rights: {sourceType: "project-owned", provider: "StoryStage", usageNotes: "Project-owned deterministic rendering treatment.", clearanceStatus: "cleared", evidenceReference}, evidenceReference});
  }
  const unique = [...new Map(entries.map((entry) => [`${entry.mediaKind}:${entry.contentHash}`, entry])).values()];
  return deliveryProvenanceReportSchema.parse({schemaVersion: "1.0", productionBundleContentHash: bundle.contentHash, clearanceStatus: "cleared", entries: unique});
}
