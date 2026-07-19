import type { ArtifactByHashStore, HashBoundArtifact } from "./artifact-store";
import type { ArtifactCodec } from "./artifact-codec";
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
  stageInput: unknown;
  inputCodec: ArtifactCodec<TInput>;
  outputCodec: ArtifactCodec<TOutput>;
  execute: (stageInput: TInput) => Promise<TOutput> | TOutput;
  artifactStore: ArtifactByHashStore;
  clock: StageClock;
}): Promise<ProductionStageRunResult<TOutput>> {
  let record = reduceProductionStage(input.record, {
    type: "started",
    at: input.clock.now(),
  });
  try {
    const stageInput = input.inputCodec.parse(input.stageInput);
    const verifiedInputHash = input.inputCodec.contentHash(stageInput);
    if (verifiedInputHash !== record.inputContentHash)
      throw new Error(
        `Stage input hash mismatch: expected ${record.inputContentHash}, received ${verifiedInputHash}.`,
      );
    const output = input.outputCodec.parse(await input.execute(stageInput));
    const verifiedOutputHash = input.outputCodec.contentHash(output);
    if (verifiedOutputHash !== output.contentHash)
      throw new Error(
        `Stage output hash mismatch: declared ${output.contentHash}, computed ${verifiedOutputHash}.`,
      );
    await input.artifactStore.put(output);
    record = reduceProductionStage(record, {
      type: "completed",
      at: input.clock.now(),
      outputContentHash: verifiedOutputHash,
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
