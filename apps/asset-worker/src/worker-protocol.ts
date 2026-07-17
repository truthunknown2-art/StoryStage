import {CandidateStagingError, stageCandidateBundle} from "@storystage/asset-pipeline";
import {
  assetWorkerCommandSchema,
  assetWorkerMessageSchema,
  type AssetWorkerMessage,
} from "@storystage/contracts";

export async function runAssetWorkerCommand(rawCommand: unknown, emit: (message: AssetWorkerMessage) => void): Promise<void> {
  const parsed = assetWorkerCommandSchema.safeParse(rawCommand);
  if (!parsed.success) {
    emit(assetWorkerMessageSchema.parse({
      type: "failed",
      requestId: "unknown-request",
      error: {code: "INVALID_ASSET_WORKER_COMMAND", message: "The asset worker received an invalid command envelope."},
    }));
    return;
  }

  try {
    const prepared = await stageCandidateBundle({
      bundle: JSON.parse(parsed.data.serializedBundle),
      sourceRoot: parsed.data.sourceRoot,
      stagingRoot: parsed.data.stagingRoot,
    });
    emit(assetWorkerMessageSchema.parse({
      type: "prepared",
      requestId: parsed.data.requestId,
      serializedPreparedCandidates: JSON.stringify(prepared),
    }));
  } catch (error) {
    emit(assetWorkerMessageSchema.parse({
      type: "failed",
      requestId: parsed.data.requestId,
      error: {
        code: error instanceof CandidateStagingError ? error.code.toUpperCase().replaceAll("-", "_") : "ASSET_PREPARATION_FAILED",
        message: error instanceof Error ? error.message : "Candidate preparation failed.",
      },
    }));
  }
}
