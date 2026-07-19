import {describe, expect, it} from "vitest";
import {ProductionMutationCoordinator, StaleProductionError} from "./production-mutation-lock";

describe("production publication serialization", () => {
  it("holds later edits behind the exact publication point", async () => {
    const coordinator = new ProductionMutationCoordinator();
    let currentHash = "a".repeat(64);
    let releasePublication!: () => void;
    const publicationPaused = new Promise<void>((resolve) => {releasePublication = resolve;});
    let publicationEntered = false;
    let saveEntered = false;
    const publication = coordinator.run("production-one:r1", async () => {
      publicationEntered = true;
      if (currentHash !== "a".repeat(64)) throw new StaleProductionError("stale");
      await publicationPaused;
      return currentHash;
    });
    await Promise.resolve();
    const save = coordinator.run("production-one:r1", async () => {saveEntered = true; currentHash = "b".repeat(64);});
    await Promise.resolve();
    expect(publicationEntered).toBe(true);
    expect(saveEntered).toBe(false);
    releasePublication();
    await expect(publication).resolves.toBe("a".repeat(64));
    await save;
    expect(currentHash).toBe("b".repeat(64));
  });

  it("returns the typed stale-production failure when an edit won the lock first", async () => {
    const coordinator = new ProductionMutationCoordinator();
    let currentHash = "a".repeat(64);
    await coordinator.run("production-one:r1", async () => {currentHash = "b".repeat(64);});
    await expect(coordinator.run("production-one:r1", async () => {
      if (currentHash !== "a".repeat(64)) throw new StaleProductionError("The production changed while rendering.");
    })).rejects.toMatchObject({code: "STALE_PRODUCTION"});
  });
});
