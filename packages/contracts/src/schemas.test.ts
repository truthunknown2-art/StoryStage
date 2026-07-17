import {describe, expect, it} from "vitest";
import {
  canTransitionRenderJob,
  exportGenerationJobRequestSchema,
  renderJobEventSchema,
  renderWorkerMessageSchema,
  startRenderRequestSchema,
  stageCandidateBundleRequestSchema,
} from "./schemas";

describe("StoryStage contracts", () => {
  it("rejects renderer-provided filesystem paths", () => {
    expect(startRenderRequestSchema.safeParse({outputPath: "C:/arbitrary/output.mp4"}).success).toBe(false);
  });

  it("keeps image exchange requests path-free and bounded", () => {
    expect(exportGenerationJobRequestSchema.safeParse({serializedJob: "{}", outputPath: "C:/elsewhere"}).success).toBe(false);
    expect(stageCandidateBundleRequestSchema.safeParse({exchangeJobId: "job-one", sourcePath: "C:/elsewhere"}).success).toBe(false);
    expect(exportGenerationJobRequestSchema.safeParse({serializedJob: "x".repeat(2_000_001)}).success).toBe(false);
  });

  it("validates render-worker messages at the process boundary", () => {
    const result = renderWorkerMessageSchema.parse({
      type: "event",
      payload: {jobId: "job-1", status: "rendering", progress: 0.5, message: "Rendering frame 180 of 360"},
    });
    expect(result.type).toBe("event");
  });

  it("rejects incomplete failed job events", () => {
    expect(renderJobEventSchema.safeParse({jobId: "job-1", status: "failed", progress: null, message: "nope"}).success).toBe(false);
  });

  it("enforces the render-job state machine", () => {
    expect(canTransitionRenderJob("idle", "queued")).toBe(true);
    expect(canTransitionRenderJob("queued", "bundling")).toBe(true);
    expect(canTransitionRenderJob("bundling", "rendering")).toBe(true);
    expect(canTransitionRenderJob("rendering", "encoding")).toBe(true);
    expect(canTransitionRenderJob("encoding", "completed")).toBe(true);
    expect(canTransitionRenderJob("queued", "completed")).toBe(false);
    expect(canTransitionRenderJob("completed", "failed")).toBe(false);
    expect(canTransitionRenderJob("failed", "queued")).toBe(false);
  });

  it("keeps indeterminate and terminal phases free of invented progress", () => {
    expect(renderJobEventSchema.safeParse({jobId: "job-1", status: "queued", progress: 0, message: "Queued"}).success).toBe(false);
    expect(renderJobEventSchema.safeParse({jobId: "job-1", status: "encoding", progress: 0.9, message: "Encoding"}).success).toBe(false);
    expect(renderJobEventSchema.safeParse({jobId: "job-1", status: "completed", progress: 1, message: "Done", outputPath: "out.mp4"}).success).toBe(false);
  });
});
