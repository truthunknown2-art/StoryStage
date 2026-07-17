import {z} from "zod";
import {hashCanonical} from "./canonical-hash";
import {approvedAssetVersionSchema, hashSchema, identifierSchema} from "./model";

export const candidateSetReviewDecisionSchema = z.object({
  candidateSetId: identifierSchema,
  briefId: identifierSchema,
  requirementId: identifierSchema,
  status: z.enum(["selected", "approved", "rejected"]),
  notes: z.string(),
  decidedAt: z.string().datetime(),
  approvedAssetVersion: approvedAssetVersionSchema.nullable(),
}).strict().superRefine((decision, context) => {
  if ((decision.status === "approved") !== Boolean(decision.approvedAssetVersion)) context.addIssue({code: "custom", path: ["approvedAssetVersion"], message: "Only a finally approved candidate set may bind an approved asset version."});
  if (decision.approvedAssetVersion && decision.approvedAssetVersion.requirementId !== decision.requirementId) context.addIssue({code: "custom", path: ["approvedAssetVersion", "requirementId"], message: "Approved asset version must match the reviewed requirement."});
});

const assetReviewRecordFields = {
  schemaVersion: z.literal("1.0"),
  exchangeJobId: identifierSchema,
  importId: identifierSchema,
  preparationReportContentHash: hashSchema,
  decisions: z.array(candidateSetReviewDecisionSchema),
};

const validateReviewRecord = (record: z.infer<z.ZodObject<typeof assetReviewRecordFields>>, context: z.RefinementCtx) => {
  const candidateSetIds = new Set<string>();
  const approvedRequirements = new Set<string>();
  for (const [index, decision] of record.decisions.entries()) {
    if (candidateSetIds.has(decision.candidateSetId)) context.addIssue({code: "custom", path: ["decisions", index, "candidateSetId"], message: "A candidate set may have only one current review decision."});
    candidateSetIds.add(decision.candidateSetId);
    if (decision.status === "approved") {
      if (approvedRequirements.has(decision.requirementId)) context.addIssue({code: "custom", path: ["decisions", index, "requirementId"], message: "A requirement may have only one approved candidate set."});
      approvedRequirements.add(decision.requirementId);
    }
  }
};

export const assetReviewRecordDraftSchema = z.object(assetReviewRecordFields).strict().superRefine(validateReviewRecord);
export const assetReviewRecordSchema = z.object({...assetReviewRecordFields, updatedAt: z.string().datetime(), contentHash: hashSchema}).strict().superRefine(validateReviewRecord);

export type CandidateSetReviewDecision = z.infer<typeof candidateSetReviewDecisionSchema>;
export type AssetReviewRecordDraft = z.infer<typeof assetReviewRecordDraftSchema>;
export type AssetReviewRecord = z.infer<typeof assetReviewRecordSchema>;

export function finalizeAssetReviewRecord(draftInput: AssetReviewRecordDraft, updatedAt: string): AssetReviewRecord {
  const draft = assetReviewRecordDraftSchema.parse(draftInput);
  const unhashed = {...draft, updatedAt};
  return assetReviewRecordSchema.parse({...unhashed, contentHash: hashCanonical(unhashed)});
}

export function verifyAssetReviewRecordHash(record: AssetReviewRecord): boolean {
  const {contentHash, ...unhashed} = record;
  return hashCanonical(unhashed) === contentHash;
}
