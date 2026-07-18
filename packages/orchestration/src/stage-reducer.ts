import type {
  ProductionStageError,
  ProductionStageRecord,
} from "./production-stage";

export type ProductionStageEvent =
  | { type: "started"; at: string }
  | { type: "completed"; at: string; outputContentHash: string }
  | { type: "failed"; at: string; error: ProductionStageError }
  | { type: "needs-human-review"; outputContentHash: string }
  | { type: "retry-ready" };

export function reduceProductionStage(
  record: ProductionStageRecord,
  event: ProductionStageEvent,
): ProductionStageRecord {
  if (event.type === "started") {
    if (record.status !== "ready")
      throw new Error(`${record.stageId} cannot start from ${record.status}.`);
    return {
      ...record,
      status: "running",
      attempt: record.attempt + 1,
      startedAt: event.at,
      completedAt: null,
      error: null,
    };
  }
  if (event.type === "completed") {
    if (record.status !== "running")
      throw new Error(
        `${record.stageId} cannot complete from ${record.status}.`,
      );
    return {
      ...record,
      status: "completed",
      outputContentHash: event.outputContentHash,
      completedAt: event.at,
      error: null,
    };
  }
  if (event.type === "failed") {
    if (record.status !== "running")
      throw new Error(`${record.stageId} cannot fail from ${record.status}.`);
    return {
      ...record,
      status: "failed",
      completedAt: event.at,
      error: event.error,
    };
  }
  if (event.type === "needs-human-review") {
    if (record.status !== "running")
      throw new Error(
        `${record.stageId} cannot request review from ${record.status}.`,
      );
    return {
      ...record,
      status: "needs-human-review",
      outputContentHash: event.outputContentHash,
      error: null,
    };
  }
  if (record.status !== "failed")
    throw new Error(`${record.stageId} cannot retry from ${record.status}.`);
  return { ...record, status: "ready", error: null };
}
