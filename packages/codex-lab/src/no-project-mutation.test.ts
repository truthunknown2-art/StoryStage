import { describe, expect, it } from "vitest";
import { createE1Wp4NoProjectMutationReceipt } from "./no-project-mutation";

describe("E1-WP4 no-project-mutation tripwire", () => {
  it("leaves the decoy project byte-identical across the failure gate", async () => {
    const receipt = await createE1Wp4NoProjectMutationReceipt();
    expect(receipt).toMatchObject({
      unchanged: true,
      projectMutationAllowed: false,
      beforeSha256: receipt.afterSha256,
      persistedPath: false,
    });
  });
});
