import { describe, expect, it } from "vitest";
import type { ArtifactCodec } from "./artifact-codec";
import { MemoryArtifactByHashStore } from "./artifact-store";
import { createProductionStageRecord } from "./production-stage";
import { reduceProductionStage } from "./stage-reducer";
import { runProductionStage } from "./stage-runner";

type ProofInput = { story: string };
type ProofOutput = { contentHash: string; plan?: string };
const proofInputCodec: ArtifactCodec<ProofInput> = {
  parse: (value) => value as ProofInput,
  contentHash: (value) =>
    value.story === "proof" ? "a".repeat(64) : "e".repeat(64),
};
const proofOutputCodec: ArtifactCodec<ProofOutput> = {
  parse: (value) => value as ProofOutput,
  contentHash: (value) =>
    value.plan === "canonical" ? "b".repeat(64) : "d".repeat(64),
};

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
      inputCodec: proofInputCodec,
      outputCodec: proofOutputCodec,
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
      stageInput: { story: "retry" },
      inputCodec: {
        parse: (value) => value as ProofInput,
        contentHash: () => "c".repeat(64),
      },
      outputCodec: proofOutputCodec,
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
      stageInput: { story: "retry" },
      inputCodec: {
        parse: (value) => value as ProofInput,
        contentHash: () => "c".repeat(64),
      },
      outputCodec: proofOutputCodec,
      execute: () => ({ contentHash: "d".repeat(64) }),
      artifactStore: store,
      clock: { now: () => "2026-07-18T10:00:01.000Z" },
    });
    expect(completed.record.attempt).toBe(2);
    expect(completed.record.outputContentHash).toBe("d".repeat(64));
  });

  it("rejects a forged input hash before stage execution", async () => {
    let executed = false;
    const result = await runProductionStage({
      record: createProductionStageRecord({
        stageId: "story-breakdown",
        inputContentHash: "f".repeat(64),
      }),
      stageInput: { story: "proof" },
      inputCodec: proofInputCodec,
      outputCodec: proofOutputCodec,
      execute: () => {
        executed = true;
        return { contentHash: "b".repeat(64), plan: "canonical" };
      },
      artifactStore: new MemoryArtifactByHashStore(),
      clock: { now: () => "2026-07-18T10:00:00.000Z" },
    });

    expect(result.ok).toBe(false);
    expect(executed).toBe(false);
    expect(result.record.error?.message).toMatch(/input hash mismatch/i);
  });

  it("rejects an output whose declared hash does not match the codec", async () => {
    const store = new MemoryArtifactByHashStore();
    const result = await runProductionStage({
      record: createProductionStageRecord({
        stageId: "director-planning",
        inputContentHash: "a".repeat(64),
      }),
      stageInput: { story: "proof" },
      inputCodec: proofInputCodec,
      outputCodec: proofOutputCodec,
      execute: () => ({
        contentHash: "0".repeat(64),
        plan: "canonical",
      }),
      artifactStore: store,
      clock: { now: () => "2026-07-18T10:00:00.000Z" },
    });

    expect(result.ok).toBe(false);
    expect(result.record.error?.message).toMatch(/output hash mismatch/i);
    expect(await store.has("0".repeat(64))).toBe(false);
    expect(await store.has("b".repeat(64))).toBe(false);
  });
});
