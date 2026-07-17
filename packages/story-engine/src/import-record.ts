import {z} from "zod";
import {hashCanonical} from "./canonical-hash";
import {
  candidateBundleSchema,
  hashSchema,
  identifierSchema,
  rightsRecordSchema,
  stagedCandidateSchema,
} from "./model";

export const importValidationFindingSchema = z.object({
  severity: z.enum(["info", "warning", "error"]),
  code: z.string().min(1),
  candidateId: identifierSchema.nullable(),
  message: z.string().min(1),
}).strict();

export const stagedImportAssetSchema = z.object({
  candidateId: identifierSchema,
  candidateSetId: identifierSchema,
  briefId: identifierSchema,
  requirementId: identifierSchema,
  fileRole: z.string().min(1),
  originalName: z.string().min(1),
  mediaType: z.enum(["image/png", "image/jpeg", "image/webp"]),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  rights: rightsRecordSchema,
  stagedCandidate: stagedCandidateSchema,
}).strict();

export const candidateSetValidationSchema = z.object({
  candidateSetId: identifierSchema,
  briefId: identifierSchema,
  requirementId: identifierSchema,
  expectedRoles: z.array(z.string().min(1)).min(1),
  returnedRoles: z.array(z.string().min(1)),
  missingRoles: z.array(z.string().min(1)),
  complete: z.boolean(),
}).strict();

const importRecordFields = {
  schemaVersion: z.literal("1.0"),
  importId: identifierSchema,
  sourceMode: z.enum(["structured-bundle", "loose-files"]),
  exchangeJobId: identifierSchema,
  generationJobContentHash: hashSchema,
  production: z.object({id: identifierSchema, revision: z.number().int().positive()}).strict(),
  manifestContentHash: hashSchema,
  candidateBundle: candidateBundleSchema,
  assets: z.array(stagedImportAssetSchema).min(1),
  candidateSets: z.array(candidateSetValidationSchema).min(1),
  findings: z.array(importValidationFindingSchema),
};

const validateImportRecord = (record: z.infer<z.ZodObject<typeof importRecordFields>>, context: z.RefinementCtx) => {
  if (record.candidateBundle.exchangeJobId !== record.exchangeJobId || record.candidateBundle.generationJobContentHash !== record.generationJobContentHash) {
    context.addIssue({code: "custom", path: ["candidateBundle"], message: "Candidate bundle must match the import exchange identity."});
  }
  if (record.candidateBundle.production.id !== record.production.id || record.candidateBundle.production.revision !== record.production.revision) {
    context.addIssue({code: "custom", path: ["candidateBundle", "production"], message: "Candidate bundle production must match the import production."});
  }
  if (hashCanonical(record.candidateBundle) !== record.manifestContentHash) {
    context.addIssue({code: "custom", path: ["manifestContentHash"], message: "Candidate bundle canonical hash does not match the import record."});
  }
  const bundleAssetById = new Map(record.candidateBundle.assets.map((asset) => [asset.candidateId, asset]));
  const importedIds = new Set<string>();
  for (const [index, asset] of record.assets.entries()) {
    if (importedIds.has(asset.candidateId)) context.addIssue({code: "custom", path: ["assets", index, "candidateId"], message: "Imported candidate IDs must be unique."});
    importedIds.add(asset.candidateId);
    const bundleAsset = bundleAssetById.get(asset.candidateId);
    if (!bundleAsset || bundleAsset.briefId !== asset.briefId || bundleAsset.candidateSetId !== asset.candidateSetId || bundleAsset.fileRole !== asset.fileRole || bundleAsset.contentHash !== asset.stagedCandidate.sourceContentHash) {
      context.addIssue({code: "custom", path: ["assets", index], message: "Staged import asset must match its immutable candidate-bundle entry."});
    }
  }
  if (importedIds.size !== bundleAssetById.size || record.candidateBundle.assets.some((asset) => !importedIds.has(asset.candidateId))) {
    context.addIssue({code: "custom", path: ["assets"], message: "Import record must preserve every candidate-bundle asset exactly once."});
  }
  const candidateSetKeys = new Set<string>();
  for (const [index, candidateSet] of record.candidateSets.entries()) {
    const key = `${candidateSet.briefId}:${candidateSet.candidateSetId}`;
    if (candidateSetKeys.has(key)) context.addIssue({code: "custom", path: ["candidateSets", index], message: "Candidate-set validation entries must be unique."});
    candidateSetKeys.add(key);
    const setAssets = record.assets.filter((asset) => asset.briefId === candidateSet.briefId && asset.candidateSetId === candidateSet.candidateSetId);
    const returnedRoles = [...new Set(setAssets.map((asset) => asset.fileRole))].sort();
    const missingRoles = candidateSet.expectedRoles.filter((role) => !returnedRoles.includes(role));
    if (setAssets.length === 0 || setAssets.some((asset) => asset.requirementId !== candidateSet.requirementId) || hashCanonical(returnedRoles) !== hashCanonical([...candidateSet.returnedRoles].sort()) || hashCanonical(missingRoles) !== hashCanonical(candidateSet.missingRoles) || candidateSet.complete !== (missingRoles.length === 0)) {
      context.addIssue({code: "custom", path: ["candidateSets", index], message: "Candidate-set validation must match the staged assets and expected roles."});
    }
  }
  for (const [index, asset] of record.assets.entries()) {
    if (!candidateSetKeys.has(`${asset.briefId}:${asset.candidateSetId}`)) context.addIssue({code: "custom", path: ["assets", index, "candidateSetId"], message: "Every staged asset must belong to a validated candidate set."});
  }
};

export const importRecordDraftSchema = z.object(importRecordFields).strict().superRefine(validateImportRecord);

export const importRecordSchema = z.object({...importRecordFields,
  createdAt: z.string().datetime(),
  contentHash: hashSchema,
}).strict().superRefine(validateImportRecord);

export type ImportRecordDraft = z.infer<typeof importRecordDraftSchema>;
export type ImportRecord = z.infer<typeof importRecordSchema>;
export type StagedImportAsset = z.infer<typeof stagedImportAssetSchema>;

export function finalizeImportRecord(draftInput: ImportRecordDraft, createdAt: string): ImportRecord {
  const draft = importRecordDraftSchema.parse(draftInput);
  const unhashed = {...draft, createdAt};
  return importRecordSchema.parse({...unhashed, contentHash: hashCanonical(unhashed)});
}

export function verifyImportRecordHash(record: ImportRecord): boolean {
  const unhashed = Object.fromEntries(Object.entries(record).filter(([key]) => key !== "contentHash"));
  return hashCanonical(unhashed) === record.contentHash;
}
