import {CandidateStagingError, stageCandidateBundle, stageLooseCandidateFiles} from "@storystage/asset-pipeline";
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
    if (parsed.data.type === "stage-loose-candidates") {
      const staged = await stageLooseCandidateFiles({files: parsed.data.files, trustedStagingRoot: parsed.data.trustedStagingRoot, stagingRoot: parsed.data.stagingRoot});
      emit(assetWorkerMessageSchema.parse({type: "loose-staged", requestId: parsed.data.requestId, serializedLooseCandidates: JSON.stringify(staged)}));
      return;
    }
    const staged = await stageCandidateBundle({
      bundle: JSON.parse(parsed.data.serializedBundle),
      sourceRoot: parsed.data.sourceRoot,
      trustedStagingRoot: parsed.data.trustedStagingRoot,
      stagingRoot: parsed.data.stagingRoot,
    });
    emit(assetWorkerMessageSchema.parse({
      type: "staged",
      requestId: parsed.data.requestId,
      serializedStagedCandidates: JSON.stringify(staged),
    }));
  } catch (error) {
    emit(assetWorkerMessageSchema.parse({
      type: "failed",
      requestId: parsed.data.requestId,
      error: {
        code: error instanceof CandidateStagingError ? error.code.toUpperCase().replaceAll("-", "_") : "ASSET_STAGING_FAILED",
        message: error instanceof Error ? error.message : "Candidate staging failed.",
      },
    }));
  }
}
