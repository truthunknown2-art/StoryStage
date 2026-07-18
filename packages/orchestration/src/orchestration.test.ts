import { describe, expect, it } from "vitest";
import { MemoryArtifactByHashStore } from "./artifact-store";
import { createProductionStageRecord } from "./production-stage";
import { reduceProductionStage } from "./stage-reducer";
import { runProductionStage } from "./stage-runner";

describe("Production stage orchestration", () => {
  it("records an output by canonical hash without duplicating the artifact", async () => {
    const store = new MemoryArtifactByHashStore();
    const record = createProductionStageRecord({
      stageId: "director-planning",
      inputContentHash: "a".repeat(64),
    });
    const times = ["2026-07-18T10:00:00.000Z", "2026-07-18T10:00:01.000Z"];
    const result = await runProductionStage({
      record,
      stageInput: { story: "proof" },
      execute: () => ({ contentHash: "b".repeat(64), plan: "canonical" }),
      artifactStore: store,
      clock: { now: () => times.shift()! },
    });

    expect(result.ok).toBe(true);
    expect(result.record).toMatchObject({
      status: "completed",
      attempt: 1,
      outputContentHash: "b".repeat(64),
    });
    expect(await store.get("b".repeat(64))).toEqual({
      contentHash: "b".repeat(64),
      plan: "canonical",
    });
  });

  it("keeps operational retries outside canonical artifacts", async () => {
    const store = new MemoryArtifactByHashStore();
    const initial = createProductionStageRecord({
      stageId: "animatic-compile",
      inputContentHash: "c".repeat(64),
    });
    const failed = await runProductionStage({
      record: initial,
      stageInput: null,
      execute: () => {
        throw new Error("renderer unavailable");
      },
      artifactStore: store,
      clock: { now: () => "2026-07-18T10:00:00.000Z" },
    });
    expect(failed.record.status).toBe("failed");
    const retry = reduceProductionStage(failed.record, {
      type: "retry-ready",
    });
    const completed = await runProductionStage({
      record: retry,
      stageInput: null,
      execute: () => ({ contentHash: "d".repeat(64) }),
      artifactStore: store,
      clock: { now: () => "2026-07-18T10:00:01.000Z" },
    });
    expect(completed.record.attempt).toBe(2);
    expect(completed.record.outputContentHash).toBe("d".repeat(64));
  });
});
