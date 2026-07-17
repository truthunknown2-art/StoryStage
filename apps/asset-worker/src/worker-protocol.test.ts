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
});
