import {z} from "zod";
import {hashCanonical} from "./canonical-hash";
import {hashSchema, identifierSchema, preparedCandidateSchema, type GenerationBrief, type PreparedCandidate} from "./model";

export const rigAssetBindingSchema = z.object({
  candidateId: identifierSchema,
  fileRole: z.string().min(1),
  contentHash: hashSchema,
  relativeFile: z.string().min(1),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  registration: preparedCandidateSchema.shape.registration,
}).strict();

const manifestIdentityFields = {
  schemaVersion: z.literal("1.0"),
  manifestId: identifierSchema,
  candidateSetId: identifierSchema,
  briefId: identifierSchema,
  requirementId: identifierSchema,
  entityId: identifierSchema.nullable(),
  entityName: z.string().min(1),
  createdAt: z.string().datetime(),
};

export const characterRigManifestDraftSchema = z.object({...manifestIdentityFields,
  type: z.literal("character-rig"),
  animationMode: z.literal("pose-swap-2d"),
  identityReference: rigAssetBindingSchema,
  poses: z.object({neutral: rigAssetBindingSchema, talk: rigAssetBindingSchema, reaction: rigAssetBindingSchema}).strict(),
}).strict();

export const backgroundLayerManifestDraftSchema = z.object({...manifestIdentityFields,
  type: z.literal("background-layers"),
  layers: z.tuple([
    z.object({role: z.literal("far"), parallax: z.number().min(0).max(1), asset: rigAssetBindingSchema}).strict(),
    z.object({role: z.literal("midground"), parallax: z.number().min(0).max(1), asset: rigAssetBindingSchema}).strict(),
    z.object({role: z.literal("foreground"), parallax: z.number().min(0).max(1), asset: rigAssetBindingSchema}).strict(),
  ]),
}).strict();

export const propManifestDraftSchema = z.object({...manifestIdentityFields,
  type: z.literal("prop"),
  assetClass: z.enum(["prop", "editorial-visual", "diagram", "reconstruction"]),
  cutout: rigAssetBindingSchema,
}).strict();

export const assetRigManifestDraftSchema = z.discriminatedUnion("type", [characterRigManifestDraftSchema, backgroundLayerManifestDraftSchema, propManifestDraftSchema]);
export const assetRigManifestSchema = z.discriminatedUnion("type", [
  z.object({...characterRigManifestDraftSchema.shape, contentHash: hashSchema}).strict(),
  z.object({...backgroundLayerManifestDraftSchema.shape, contentHash: hashSchema}).strict(),
  z.object({...propManifestDraftSchema.shape, contentHash: hashSchema}).strict(),
]);

const rigValidationFields = {
  schemaVersion: z.literal("1.0"),
  manifestId: identifierSchema,
  manifestContentHash: hashSchema,
  candidateSetId: identifierSchema,
  status: z.enum(["passed", "failed"]),
  checks: z.array(z.object({code: z.string().min(1), status: z.enum(["passed", "failed"]), message: z.string().min(1)}).strict()).min(1),
};
export const rigValidationReportDraftSchema = z.object(rigValidationFields).strict().superRefine((report, context) => {
  const failed = report.checks.some((check) => check.status === "failed");
  if ((report.status === "failed") !== failed) context.addIssue({code: "custom", message: "Rig validation status must reflect its checks."});
});
export const rigValidationReportSchema = z.object({...rigValidationFields, validatedAt: z.string().datetime(), contentHash: hashSchema}).strict().superRefine((report, context) => {
  const failed = report.checks.some((check) => check.status === "failed");
  if ((report.status === "failed") !== failed) context.addIssue({code: "custom", message: "Rig validation status must reflect its checks."});
});

const rigDiagnosticReportFields = {
  schemaVersion: z.literal("1.0"),
  candidateSetId: identifierSchema,
  manifestContentHash: hashSchema,
  validationReportContentHash: hashSchema,
  videoContentHash: hashSchema,
  videoRelativeFile: z.string().min(1),
  fps: z.literal(30),
  frameCount: z.literal(120),
  width: z.literal(1280),
  height: z.literal(720),
  sourceDiagnosticContentHash: hashSchema.nullable(),
};
export const rigDiagnosticReportDraftSchema = z.object(rigDiagnosticReportFields).strict();
export const rigDiagnosticReportSchema = z.object({...rigDiagnosticReportFields, renderedAt: z.string().datetime(), contentHash: hashSchema}).strict();

export type RigAssetBinding = z.infer<typeof rigAssetBindingSchema>;
export type AssetRigManifestDraft = z.infer<typeof assetRigManifestDraftSchema>;
export type AssetRigManifest = z.infer<typeof assetRigManifestSchema>;
export type RigValidationReport = z.infer<typeof rigValidationReportSchema>;
export type RigDiagnosticReportDraft = z.infer<typeof rigDiagnosticReportDraftSchema>;
export type RigDiagnosticReport = z.infer<typeof rigDiagnosticReportSchema>;

const binding = (candidate: PreparedCandidate): RigAssetBinding => rigAssetBindingSchema.parse({candidateId: candidate.candidateId, fileRole: candidate.fileRole, contentHash: candidate.preparedContentHash, relativeFile: candidate.relativeFile, width: candidate.width, height: candidate.height, registration: candidate.registration});
const byRole = (prepared: PreparedCandidate[], role: string): PreparedCandidate => {
  const candidate = prepared.find((entry) => entry.fileRole === role);
  if (!candidate) throw new Error(`Prepared candidate set is missing ${role}.`);
  return candidate;
};

export function createAssetRigManifest(brief: GenerationBrief, candidateSetId: string, preparedInput: PreparedCandidate[], createdAt: string): AssetRigManifest {
  const prepared = preparedCandidateSchema.array().min(1).parse(preparedInput);
  if (prepared.some((candidate) => candidate.candidateSetId !== candidateSetId || candidate.briefId !== brief.id || candidate.requirementId !== brief.requirementId)) throw new Error("Rig manifest candidates must match the brief and candidate set.");
  const identity = {schemaVersion: "1.0" as const, manifestId: `manifest-${candidateSetId}`, candidateSetId, briefId: brief.id, requirementId: brief.requirementId, entityId: brief.entity.id, entityName: brief.entity.name, createdAt};
  let draft: AssetRigManifestDraft;
  if (brief.outputRole === "character-canonical-sheet" || brief.outputRole === "character-parts") {
    draft = characterRigManifestDraftSchema.parse({...identity, type: "character-rig", animationMode: "pose-swap-2d", identityReference: binding(byRole(prepared, "identity-sheet.png")), poses: {neutral: binding(byRole(prepared, "neutral-pose.png")), talk: binding(byRole(prepared, "talk-pose.png")), reaction: binding(byRole(prepared, "reaction-pose.png"))}});
  } else if (brief.outputRole === "background-master" || brief.outputRole === "background-layers") {
    draft = backgroundLayerManifestDraftSchema.parse({...identity, type: "background-layers", layers: [{role: "far", parallax: 0.04, asset: binding(byRole(prepared, "clean-plate.png"))}, {role: "midground", parallax: 0.12, asset: binding(byRole(prepared, "midground.png"))}, {role: "foreground", parallax: 0.22, asset: binding(byRole(prepared, "foreground-occluders.png"))}]});
  } else {
    const assetClass = brief.outputRole === "diagram" ? "diagram" : brief.outputRole === "reconstruction" ? "reconstruction" : brief.outputRole === "editorial-illustration" ? "editorial-visual" : "prop";
    draft = propManifestDraftSchema.parse({...identity, type: "prop", assetClass, cutout: binding(byRole(prepared, "candidate.png"))});
  }
  return assetRigManifestSchema.parse({...draft, contentHash: hashCanonical(draft)});
}

export function validateAssetRigManifest(manifestInput: AssetRigManifest, validatedAt: string): RigValidationReport {
  const manifest = assetRigManifestSchema.parse(manifestInput);
  const checks: Array<{code: string; status: "passed" | "failed"; message: string}> = [{code: "MANIFEST_HASH", status: hashCanonical(Object.fromEntries(Object.entries(manifest).filter(([key]) => key !== "contentHash"))) === manifest.contentHash ? "passed" : "failed", message: "Manifest canonical hash matches its bindings."}];
  if (manifest.type === "character-rig") {
    const poses = Object.values(manifest.poses);
    const sameCanvas = poses.every((pose) => pose.width === poses[0]!.width && pose.height === poses[0]!.height);
    const sameGround = poses.every((pose) => Math.abs(pose.registration.groundY - poses[0]!.registration.groundY) <= 2);
    checks.push({code: "CHARACTER_CANVAS", status: sameCanvas ? "passed" : "failed", message: "Character pose canvases share exact dimensions."}, {code: "CHARACTER_GROUND", status: sameGround ? "passed" : "failed", message: "Character pose ground registration stays within two pixels."}, {code: "CHARACTER_POSES", status: poses.length === 3 ? "passed" : "failed", message: "Neutral, talk, and reaction poses are bound."});
  } else if (manifest.type === "background-layers") {
    const layers = manifest.layers.map((layer) => layer.asset);
    const sameCanvas = layers.every((layer) => layer.width === layers[0]!.width && layer.height === layers[0]!.height);
    checks.push({code: "BACKGROUND_CANVAS", status: sameCanvas ? "passed" : "failed", message: "Background layers share exact dimensions."}, {code: "BACKGROUND_DEPTH", status: manifest.layers[0].parallax < manifest.layers[1].parallax && manifest.layers[1].parallax < manifest.layers[2].parallax ? "passed" : "failed", message: "Parallax increases from far to foreground."});
  } else {
    checks.push({code: "PROP_REGISTRATION", status: manifest.cutout.registration.groundY < manifest.cutout.height ? "passed" : "failed", message: "Prop registration stays inside the prepared canvas."});
  }
  const draft = rigValidationReportDraftSchema.parse({schemaVersion: "1.0", manifestId: manifest.manifestId, manifestContentHash: manifest.contentHash, candidateSetId: manifest.candidateSetId, status: checks.some((check) => check.status === "failed") ? "failed" : "passed", checks});
  const unhashed = {...draft, validatedAt};
  return rigValidationReportSchema.parse({...unhashed, contentHash: hashCanonical(unhashed)});
}

export function verifyAssetRigManifestHash(manifest: AssetRigManifest): boolean {
  const {contentHash, ...unhashed} = manifest;
  return hashCanonical(unhashed) === contentHash;
}

export function verifyRigValidationReportHash(report: RigValidationReport): boolean {
  const {contentHash, ...unhashed} = report;
  return hashCanonical(unhashed) === contentHash;
}

export function finalizeRigDiagnosticReport(draftInput: RigDiagnosticReportDraft, renderedAt: string): RigDiagnosticReport {
  const draft = rigDiagnosticReportDraftSchema.parse(draftInput);
  const unhashed = {...draft, renderedAt};
  return rigDiagnosticReportSchema.parse({...unhashed, contentHash: hashCanonical(unhashed)});
}

export function verifyRigDiagnosticReportHash(report: RigDiagnosticReport): boolean {
  const {contentHash, ...unhashed} = report;
  return hashCanonical(unhashed) === contentHash;
}
