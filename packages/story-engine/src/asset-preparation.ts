import {z} from "zod";
import {hashCanonical} from "./canonical-hash";
import {hashSchema, identifierSchema, preparedCandidateSchema, stagedCandidateSchema} from "./model";

export const candidatePreparationInputSchema = z.object({
  candidateSetId: identifierSchema,
  briefId: identifierSchema,
  requirementId: identifierSchema,
  fileRole: z.string().min(1),
  expectedMediaType: z.enum(["image/png", "image/jpeg", "image/webp"]),
  expectedWidth: z.number().int().positive(),
  expectedHeight: z.number().int().positive(),
  outputRole: z.enum(["character-canonical-sheet", "character-parts", "background-master", "background-layers", "prop-cutout", "editorial-illustration", "diagram", "reconstruction"]),
  stagedCandidate: stagedCandidateSchema,
}).strict();

export const prepareCandidateSetsRequestSchema = z.object({
  importId: identifierSchema,
  importRecordContentHash: hashSchema,
  exchangeJobId: identifierSchema,
  candidates: z.array(candidatePreparationInputSchema).min(1).max(32),
}).strict();

export const candidatePreparationFailureSchema = z.object({
  candidateId: identifierSchema,
  candidateSetId: identifierSchema,
  briefId: identifierSchema,
  fileRole: z.string().min(1),
  status: z.enum(["needs-manual-mask", "failed"]),
  code: z.string().min(1),
  message: z.string().min(1),
}).strict();

export const candidateSetContactSheetSchema = z.object({
  candidateSetId: identifierSchema,
  relativeFile: z.string().min(1),
  contentHash: hashSchema,
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  cells: z.array(z.object({candidateId: identifierSchema, fileRole: z.string().min(1), left: z.number().int().nonnegative(), top: z.number().int().nonnegative(), width: z.number().int().positive(), height: z.number().int().positive()}).strict()).min(1),
}).strict();

export const candidateSetPreparationSchema = z.object({
  candidateSetId: identifierSchema,
  briefId: identifierSchema,
  requirementId: identifierSchema,
  outputRole: z.enum(["character-canonical-sheet", "character-parts", "background-master", "background-layers", "prop-cutout", "editorial-illustration", "diagram", "reconstruction"]),
  status: z.enum(["ready-for-review", "needs-attention"]),
  preparedCandidates: z.array(preparedCandidateSchema),
  failures: z.array(candidatePreparationFailureSchema),
  contactSheet: candidateSetContactSheetSchema.nullable(),
}).strict().superRefine((set, context) => {
  const candidateIds = [...set.preparedCandidates.map((candidate) => candidate.candidateId), ...set.failures.map((failure) => failure.candidateId)];
  if (new Set(candidateIds).size !== candidateIds.length) context.addIssue({code: "custom", message: "Preparation outcomes must contain each candidate at most once."});
  if (set.preparedCandidates.some((candidate) => candidate.candidateSetId !== set.candidateSetId || candidate.briefId !== set.briefId || candidate.requirementId !== set.requirementId)) context.addIssue({code: "custom", message: "Prepared candidates must share their set, brief, and requirement identity."});
  if (set.status === "ready-for-review" && (set.failures.length > 0 || set.preparedCandidates.length === 0 || !set.contactSheet)) context.addIssue({code: "custom", message: "A review-ready set requires prepared candidates, a contact sheet, and no failures."});
  if (set.status === "needs-attention" && set.failures.length === 0) context.addIssue({code: "custom", message: "A set needing attention must explain at least one failure."});
}).strict();

const preparationReportFields = {
  schemaVersion: z.literal("1.0"),
  importId: identifierSchema,
  importRecordContentHash: hashSchema,
  exchangeJobId: identifierSchema,
  processor: z.object({id: z.literal("sharp"), version: z.string().min(1)}).strict(),
  candidateSets: z.array(candidateSetPreparationSchema).min(1),
};

export const preparationReportDraftSchema = z.object(preparationReportFields).strict();
export const preparationReportSchema = z.object({...preparationReportFields, preparedAt: z.string().datetime(), contentHash: hashSchema}).strict();

export type CandidatePreparationFailure = z.infer<typeof candidatePreparationFailureSchema>;
export type CandidatePreparationInput = z.infer<typeof candidatePreparationInputSchema>;
export type PrepareCandidateSetsRequest = z.infer<typeof prepareCandidateSetsRequestSchema>;
export type CandidateSetContactSheet = z.infer<typeof candidateSetContactSheetSchema>;
export type CandidateSetPreparation = z.infer<typeof candidateSetPreparationSchema>;
export type PreparationReportDraft = z.infer<typeof preparationReportDraftSchema>;
export type PreparationReport = z.infer<typeof preparationReportSchema>;

export function finalizePreparationReport(draftInput: PreparationReportDraft, preparedAt: string): PreparationReport {
  const draft = preparationReportDraftSchema.parse(draftInput);
  const unhashed = {...draft, preparedAt};
  return preparationReportSchema.parse({...unhashed, contentHash: hashCanonical(unhashed)});
}

export function verifyPreparationReportHash(report: PreparationReport): boolean {
  const {contentHash, ...unhashed} = report;
  return hashCanonical(unhashed) === contentHash;
}
