import {hashCanonical} from "./canonical-hash";
import {
  generationJobDraftSchema,
  generationJobSchema,
  generationBriefSchema,
  type GenerationExchangeState,
  type GenerationBrief,
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

const authoritativeBriefPayload = (briefsInput: GenerationBrief[]) => generationBriefSchema.array().parse(briefsInput).map((brief) => Object.fromEntries(Object.entries(brief).filter(([key]) => key !== "status")));

export function generationBriefsMatchAuthoritativePlan(jobBriefs: GenerationBrief[], planBriefs: GenerationBrief[]): boolean {
  return hashCanonical(authoritativeBriefPayload(jobBriefs)) === hashCanonical(authoritativeBriefPayload(planBriefs));
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
