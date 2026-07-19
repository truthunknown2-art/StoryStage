import {describe, expect, it, vi} from "vitest";
import {runAssetWorkerCommand} from "./worker-protocol";

describe("asset worker protocol", () => {
  it("turns an invalid envelope into a typed failure", async () => {
    const emit = vi.fn();
    await runAssetWorkerCommand({type: "run-arbitrary-command", executable: "powershell.exe"}, emit);
    expect(emit).toHaveBeenCalledWith({
      type: "failed",
      requestId: "unknown-request",
      error: {code: "INVALID_ASSET_WORKER_COMMAND", message: "The asset worker received an invalid command envelope."},
    });
  });

  it("routes character rig intake through the typed utility-process boundary", async () => {
    const emit = vi.fn();
    await runAssetWorkerCommand({
      type: "stage-character-rig-candidates",
      requestId: "rig-intake-one",
      importId: "rig-import-one",
      sourceRoot: "C:\\source",
      trustedStagingRoot: "C:\\trusted",
      stagingRoot: "C:\\trusted\\rig-intake-one",
      stagedAt: "2026-07-18T20:05:00.000Z",
      serializedRigRequest: "{}",
      serializedRigBundle: "{}",
    }, emit);
    expect(emit).toHaveBeenCalledWith({
      type: "failed",
      requestId: "rig-intake-one",
      error: expect.objectContaining({code: "INVALID_REQUEST"}),
    });
  });

  it("rejects credential-shaped character rig command fields", async () => {
    const emit = vi.fn();
    await runAssetWorkerCommand({
      type: "stage-character-rig-candidates",
      requestId: "rig-intake-one",
      importId: "rig-import-one",
      sourceRoot: "C:\\source",
      trustedStagingRoot: "C:\\trusted",
      stagingRoot: "C:\\trusted\\rig-intake-one",
      stagedAt: "2026-07-18T20:05:00.000Z",
      serializedRigRequest: "{}",
      serializedRigBundle: "{}",
      apiKey: "must-never-cross-this-boundary",
    }, emit);
    expect(emit).toHaveBeenCalledWith({
      type: "failed",
      requestId: "unknown-request",
      error: {
        code: "INVALID_ASSET_WORKER_COMMAND",
        message: "The asset worker received an invalid command envelope.",
      },
    });
  });
});
