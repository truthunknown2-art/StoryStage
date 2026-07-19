import {z} from "zod";
import {hashCanonical} from "./canonical-hash";
import {approvedAssetVersionSchema, hashSchema, identifierSchema, rightsRecordSchema, type ShowPack} from "./model";

const safeRelativeFileSchema = z.string().min(1).refine((value) => !value.includes("\\") && !value.includes(":") && !value.startsWith("/") && !value.split("/").includes(".."), "Candidate paths must stay relative to the allowlisted candidate root.");
const candidateFileRoleSchema = z.enum(["identity-sheet", "neutral-pose", "talk-pose", "reaction-pose"]);
const fileEvidenceSchema = z.object({file: safeRelativeFileSchema, fileContentHash: hashSchema}).strict();
const domainEvidenceSchema = z.object({file: safeRelativeFileSchema, fileContentHash: hashSchema, contentHash: hashSchema}).strict();

export const publicShowPackCandidateManifestSchema = z.object({
  schemaVersion: z.literal("1.0"),
  candidateId: identifierSchema,
  version: z.string().min(1),
  showPackId: identifierSchema,
  showPack: z.object({id: identifierSchema, version: z.string().min(1), contentHash: hashSchema}).strict(),
  displayName: z.string().min(1),
  status: z.literal("candidate-needs-human-review"),
  provider: z.string().min(1),
  generatedAt: z.string().datetime(),
  rights: rightsRecordSchema,
  style: z.object({medium: z.string().min(1), palette: z.array(z.string().min(1)).min(3), identityLock: z.string().min(1)}).strict(),
  files: z.array(z.object({role: candidateFileRoleSchema, file: safeRelativeFileSchema, contentHash: hashSchema, mediaType: z.literal("image/png"), width: z.number().int().positive(), height: z.number().int().positive(), alpha: z.boolean()}).strict()).length(4),
  preparedFiles: z.array(z.object({role: candidateFileRoleSchema, file: safeRelativeFileSchema, contentHash: hashSchema, width: z.number().int().positive(), height: z.number().int().positive()}).strict()).length(4),
  evidence: z.object({prompts: fileEvidenceSchema, contactSheet: fileEvidenceSchema, rigManifest: domainEvidenceSchema, rigValidation: domainEvidenceSchema, diagnosticReport: domainEvidenceSchema, diagnosticVideo: fileEvidenceSchema}).strict(),
  validation: z.object({
    transparentCorners: z.literal(true),
    brightGreenEdgePixels: z.literal(0),
    normalization: z.literal("passed"),
    rigValidation: z.literal("passed"),
    identityConsistency: z.literal("needs-human-review"),
    movingDiagnostic: z.literal("created-needs-human-review"),
    prompts: safeRelativeFileSchema,
    rigManifest: safeRelativeFileSchema,
    rigValidationReport: safeRelativeFileSchema,
    movingDiagnosticFile: safeRelativeFileSchema,
    movingDiagnosticContentHash: hashSchema,
  }).strict(),
  contentHash: hashSchema,
}).strict().superRefine((candidate, context) => {
  const roles = candidate.files.map((file) => file.role);
  const preparedRoles = candidate.preparedFiles.map((file) => file.role);
  if (candidate.showPackId !== candidate.showPack.id) context.addIssue({code: "custom", message: "The candidate Show Pack shortcut must match its exact release binding."});
  if (new Set(roles).size !== 4 || new Set(preparedRoles).size !== 4 || roles.some((role) => !preparedRoles.includes(role))) context.addIssue({code: "custom", message: "Source and prepared candidates must bind exactly one copy of every required Rook role."});
  if (candidate.validation.rigManifest !== candidate.evidence.rigManifest.file || candidate.validation.rigValidationReport !== candidate.evidence.rigValidation.file || candidate.validation.movingDiagnosticFile !== candidate.evidence.diagnosticVideo.file || candidate.validation.movingDiagnosticContentHash !== candidate.evidence.diagnosticVideo.fileContentHash || candidate.validation.prompts !== candidate.evidence.prompts.file) context.addIssue({code: "custom", message: "Candidate validation pointers must match the complete evidence bindings."});
});

export type PublicShowPackCandidateManifest = z.infer<typeof publicShowPackCandidateManifestSchema>;

export function publicShowPackCandidateMatchesRelease(candidate: Pick<PublicShowPackCandidateManifest, "showPack">, showPack: ShowPack): boolean {
  return candidate.showPack.id === showPack.id && candidate.showPack.version === showPack.version && candidate.showPack.contentHash === showPack.contentHash;
}

export function verifyPublicShowPackCandidateManifestHash(candidateInput: PublicShowPackCandidateManifest): boolean {
  const candidate = publicShowPackCandidateManifestSchema.parse(candidateInput);
  const {contentHash, ...unhashed} = candidate;
  return hashCanonical(unhashed) === contentHash;
}

export const publicShowPackReviewAcknowledgementsSchema = z.object({
  identitySheet: z.boolean(),
  neutralPose: z.boolean(),
  talkPose: z.boolean(),
  reactionPose: z.boolean(),
  movingDiagnostic: z.boolean(),
  identityConsistency: z.boolean(),
  matteEdges: z.boolean(),
  provenance: z.boolean(),
}).strict();

export const publicShowPackReviewRecordSchema = z.object({
  schemaVersion: z.literal("1.0"),
  candidateId: identifierSchema,
  candidateContentHash: hashSchema,
  productionId: identifierSchema,
  sourceProductionRevision: z.number().int().positive(),
  sourceProductionBundleContentHash: hashSchema,
  decision: z.enum(["approved", "rejected"]),
  acknowledgements: publicShowPackReviewAcknowledgementsSchema,
  decidedAt: z.string().datetime(),
  approvedAssetVersion: approvedAssetVersionSchema.nullable(),
  targetProductionRevision: z.number().int().positive().nullable(),
  targetProductionBundleContentHash: hashSchema.nullable(),
  contentHash: hashSchema,
}).strict().superRefine((record, context) => {
  const hasApproval = record.approvedAssetVersion !== null && record.targetProductionRevision !== null && record.targetProductionBundleContentHash !== null;
  if ((record.decision === "approved") !== hasApproval) context.addIssue({code: "custom", message: "Only an approved review may bind an immutable asset and target production."});
  if (record.decision === "approved" && Object.values(record.acknowledgements).some((value) => !value)) context.addIssue({code: "custom", message: "Rook approval requires every visual and provenance acknowledgement."});
});

export type PublicShowPackReviewAcknowledgements = z.infer<typeof publicShowPackReviewAcknowledgementsSchema>;
export type PublicShowPackReviewRecord = z.infer<typeof publicShowPackReviewRecordSchema>;

export function finalizePublicShowPackReviewRecord(input: Omit<PublicShowPackReviewRecord, "contentHash">): PublicShowPackReviewRecord {
  return publicShowPackReviewRecordSchema.parse({...input, contentHash: hashCanonical(input)});
}

export function verifyPublicShowPackReviewRecordHash(recordInput: PublicShowPackReviewRecord): boolean {
  const record = publicShowPackReviewRecordSchema.parse(recordInput);
  const {contentHash, ...unhashed} = record;
  return hashCanonical(unhashed) === contentHash;
}

export function assertPublicShowPackReviewAttemptIsCompatible(record: PublicShowPackReviewRecord, currentRevision: number, requestedDecision: "approve" | "reject"): void {
  const expected = requestedDecision === "approve" ? "approved" : "rejected";
  if (record.decision !== expected) throw new Error("Rook already has the opposite final decision in this production lineage.");
  if (record.sourceProductionRevision !== currentRevision && requestedDecision !== "approve") throw new Error("Rook is already bound in this production lineage; its approved target revision cannot be rejected.");
}
