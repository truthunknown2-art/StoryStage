export type DirectorAlphaStageId =
  | "story-breakdown"
  | "director-planning"
  | "animatic-compile";

export type ProductionStageStatus =
  | "blocked"
  | "ready"
  | "running"
  | "needs-human-review"
  | "completed"
  | "failed";

export type ProductionStageError = {
  code: string;
  message: string;
  retryable: boolean;
};

export type ProductionStageRecord = {
  stageId: DirectorAlphaStageId;
  status: ProductionStageStatus;
  inputContentHash: string;
  outputContentHash: string | null;
  attempt: number;
  startedAt: string | null;
  completedAt: string | null;
  error: ProductionStageError | null;
};

export const createProductionStageRecord = (input: {
  stageId: DirectorAlphaStageId;
  inputContentHash: string;
  ready?: boolean;
}): ProductionStageRecord => ({
  stageId: input.stageId,
  status: input.ready === false ? "blocked" : "ready",
  inputContentHash: input.inputContentHash,
  outputContentHash: null,
  attempt: 0,
  startedAt: null,
  completedAt: null,
  error: null,
});
