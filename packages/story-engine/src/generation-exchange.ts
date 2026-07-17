import {hashCanonical} from "./canonical-hash";
import {
  generationJobDraftSchema,
  generationJobSchema,
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
