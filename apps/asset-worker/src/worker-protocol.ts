import {CandidateStagingError, CharacterRigStagingError, prepareCandidateSets, stageCandidateBundle, stageCharacterRigCandidateBundle, stageLooseCandidateFiles, verifyStagedCandidates} from "@storystage/asset-pipeline";
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
    if (parsed.data.type === "stage-character-rig-candidates") {
      const report = await stageCharacterRigCandidateBundle({
        request: JSON.parse(parsed.data.serializedRigRequest),
        bundle: JSON.parse(parsed.data.serializedRigBundle),
        sourceRoot: parsed.data.sourceRoot,
        trustedStagingRoot: parsed.data.trustedStagingRoot,
        stagingRoot: parsed.data.stagingRoot,
        stagedAt: parsed.data.stagedAt,
      });
      emit(assetWorkerMessageSchema.parse({type: "character-rig-staged", requestId: parsed.data.requestId, serializedStagingReport: JSON.stringify(report)}));
      return;
    }
    if (parsed.data.type === "prepare-candidate-sets") {
      const report = await prepareCandidateSets({request: JSON.parse(parsed.data.serializedRequest), trustedStagingRoot: parsed.data.trustedStagingRoot, stagingRoot: parsed.data.stagingRoot});
      emit(assetWorkerMessageSchema.parse({type: "prepared", requestId: parsed.data.requestId, serializedPreparationReport: JSON.stringify(report)}));
      return;
    }
    if (parsed.data.type === "verify-staged-candidates") {
      const verified = await verifyStagedCandidates({candidates: JSON.parse(parsed.data.serializedStagedCandidates), trustedStagingRoot: parsed.data.trustedStagingRoot, stagingRoot: parsed.data.stagingRoot});
      emit(assetWorkerMessageSchema.parse({type: "verified", requestId: parsed.data.requestId, serializedStagedCandidates: JSON.stringify(verified)}));
      return;
    }
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
        code: error instanceof CandidateStagingError || error instanceof CharacterRigStagingError ? error.code.toUpperCase().replaceAll("-", "_") : "ASSET_STAGING_FAILED",
        message: error instanceof Error ? error.message : "Candidate staging failed.",
      },
    }));
  }
}
