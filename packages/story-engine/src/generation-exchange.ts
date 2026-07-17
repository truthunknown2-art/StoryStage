import {hashCanonical} from "./canonical-hash";
import {
  generationJobDraftSchema,
  generationJobSchema,
  type GenerationExchangeState,
  type GenerationJob,
  type GenerationJobDraft,
} from "./model";

type GenerationJobMetadata = {exchangeJobId: string; createdAt: string};

export function finalizeGenerationJob(draftInput: GenerationJobDraft, metadata: GenerationJobMetadata): GenerationJob {
  const draft = generationJobDraftSchema.parse(draftInput);
  const unhashed = {...draft, briefs: draft.briefs.map((brief) => ({...brief, status: "exported" as const})), ...metadata};
  return generationJobSchema.parse({...unhashed, contentHash: hashCanonical(unhashed)});
}

export function verifyGenerationJobHash(job: GenerationJob): boolean {
  const unhashed = Object.fromEntries(Object.entries(job).filter(([key]) => key !== "contentHash"));
  return hashCanonical(unhashed) === job.contentHash;
}

const allowedExchangeTransitions: Record<GenerationExchangeState["status"], readonly GenerationExchangeState["status"][]> = {
  "awaiting-results": ["files-imported", "staged", "superseded"],
  "files-imported": ["staged", "superseded"],
  staged: ["needs-review", "superseded"],
  "needs-review": ["approved", "rejected", "superseded"],
  approved: [],
  rejected: [],
  superseded: [],
};

export function canTransitionGenerationExchange(from: GenerationExchangeState["status"], to: GenerationExchangeState["status"]): boolean {
  return allowedExchangeTransitions[from].includes(to);
}
