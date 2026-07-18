import type { ArtifactByHashStore, HashBoundArtifact } from "./artifact-store";
import type { ProductionStageRecord } from "./production-stage";
import { reduceProductionStage } from "./stage-reducer";

export type StageClock = { now: () => string };

export type ProductionStageRunResult<TOutput extends HashBoundArtifact> =
  | {
      ok: true;
      record: ProductionStageRecord;
      output: TOutput;
    }
  | {
      ok: false;
      record: ProductionStageRecord;
      output: null;
    };

export async function runProductionStage<
  TInput,
  TOutput extends HashBoundArtifact,
>(input: {
  record: ProductionStageRecord;
  stageInput: TInput;
  execute: (stageInput: TInput) => Promise<TOutput> | TOutput;
  artifactStore: ArtifactByHashStore;
  clock: StageClock;
}): Promise<ProductionStageRunResult<TOutput>> {
  let record = reduceProductionStage(input.record, {
    type: "started",
    at: input.clock.now(),
  });
  try {
    const output = await input.execute(input.stageInput);
    await input.artifactStore.put(output);
    record = reduceProductionStage(record, {
      type: "completed",
      at: input.clock.now(),
      outputContentHash: output.contentHash,
    });
    return { ok: true, record, output };
  } catch (error) {
    record = reduceProductionStage(record, {
      type: "failed",
      at: input.clock.now(),
      error: {
        code: "stage-execution-failed",
        message: error instanceof Error ? error.message : String(error),
        retryable: true,
      },
    });
    return { ok: false, record, output: null };
  }
}
