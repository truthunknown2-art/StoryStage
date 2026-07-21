import { describe, expect, it } from "vitest";
import { createE1Wp4NoProjectMutationReceipt } from "./no-project-mutation";

describe("E1-WP4 no-project-mutation tripwire", () => {
  it("runs real round-trip failures beside a byte-identical decoy project", async () => {
    const receipt = await createE1Wp4NoProjectMutationReceipt();
    expect(receipt).toMatchObject({
      schemaVersion: 2,
      unchanged: true,
      unexpectedFileDetection: true,
      failurePathCount: 9,
      projectMutationAllowed: false,
      beforeSha256: receipt.afterSha256,
      persistedPath: false,
    });
    expect(
      receipt.failureExercises.map(({ observedCode }) => observedCode),
    ).toEqual([
      "RUNTIME_NOT_INSTALLED",
      "OPERATION_CANCELLED",
      "AUTH_REQUIRED",
      "AUTH_REVOKED",
      "OFFLINE",
      "USAGE_LIMITED",
      "PROTOCOL_INCOMPATIBLE",
      "MCP_STARTUP_FAILED",
      "PROTOCOL_REQUEST_FAILED",
    ]);
    expect(
      receipt.failureExercises
        .filter(({ clientClosed }) => clientClosed !== null)
        .every(({ clientClosed }) => clientClosed),
    ).toBe(true);
  });
});
