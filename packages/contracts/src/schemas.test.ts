import {describe, expect, it} from "vitest";
import {
  canTransitionRenderJob,
  assetWorkerCommandSchema,
  exportGenerationJobRequestSchema,
  importVoiceTrackRequestSchema,
  importMusicTrackRequestSchema,
  importSoundEffectRequestSchema,
  prepareGenerationImportRequestSchema,
  renderJobEventSchema,
  renderWorkerMessageSchema,
  startProductionRenderRequestSchema,
  startRenderRequestSchema,
  stageCandidateBundleRequestSchema,
} from "./schemas";

describe("StoryStage contracts", () => {
  it("rejects renderer-provided filesystem paths", () => {
    expect(startRenderRequestSchema.safeParse({outputPath: "C:/arbitrary/output.mp4"}).success).toBe(false);
    expect(startProductionRenderRequestSchema.safeParse({productionId: "production-one", revision: 1, scope: "engineering-slice", outputPath: "C:/arbitrary/output.mp4"}).success).toBe(false);
  });

  it("requires an explicit bounded production render scope", () => {
    expect(startProductionRenderRequestSchema.safeParse({productionId: "production-one", revision: 1, scope: "engineering-slice"}).success).toBe(true);
    expect(startProductionRenderRequestSchema.safeParse({productionId: "production-one", revision: 1, scope: "full-production"}).success).toBe(true);
    expect(startProductionRenderRequestSchema.safeParse({productionId: "production-one", revision: 1}).success).toBe(false);
    expect(startProductionRenderRequestSchema.safeParse({productionId: "production-one", revision: 1, scope: "arbitrary-range"}).success).toBe(false);
  });

  it("keeps image exchange requests path-free and bounded", () => {
    expect(exportGenerationJobRequestSchema.safeParse({serializedJob: "{}", productionBundleContentHash: "a".repeat(64), outputPath: "C:/elsewhere"}).success).toBe(false);
    expect(stageCandidateBundleRequestSchema.safeParse({exchangeJobId: "job-one", sourcePath: "C:/elsewhere"}).success).toBe(false);
    expect(exportGenerationJobRequestSchema.safeParse({serializedJob: "x".repeat(2_000_001), productionBundleContentHash: "a".repeat(64)}).success).toBe(false);
    expect(prepareGenerationImportRequestSchema.safeParse({exchangeJobId: "job-one", stagingRoot: "C:/elsewhere"}).success).toBe(false);
  });

  it("keeps voice import requests path-free and snapshot-bound", () => {
    const valid = {productionId: "production-one", revision: 1, productionBundleContentHash: "a".repeat(64)};
    expect(importVoiceTrackRequestSchema.safeParse(valid).success).toBe(true);
    expect(importVoiceTrackRequestSchema.safeParse({...valid, sourcePath: "C:/untrusted/voice.wav"}).success).toBe(false);
  });

  it("keeps music import requests path-free and snapshot-bound", () => {
    const valid = {productionId: "production-one", revision: 1, productionBundleContentHash: "a".repeat(64)};
    expect(importMusicTrackRequestSchema.safeParse(valid).success).toBe(true);
    expect(importMusicTrackRequestSchema.safeParse({...valid, sourcePath: "C:/untrusted/music.wav"}).success).toBe(false);
  });

  it("keeps sound-effect import requests path-free and snapshot-bound", () => {
    const valid = {productionId: "production-one", revision: 1, productionBundleContentHash: "a".repeat(64)};
    expect(importSoundEffectRequestSchema.safeParse(valid).success).toBe(true);
    expect(importSoundEffectRequestSchema.safeParse({...valid, sourcePath: "C:/untrusted/hit.wav"}).success).toBe(false);
  });

  it("validates render-worker messages at the process boundary", () => {
    const result = renderWorkerMessageSchema.parse({
      type: "event",
      payload: {jobId: "job-1", status: "rendering", progress: 0.5, message: "Rendering frame 180 of 360"},
    });
    expect(result.type).toBe("event");
  });

  it("keeps the asset worker envelope strict and bounded", () => {
    expect(assetWorkerCommandSchema.safeParse({type: "stage-candidate-bundle", requestId: "request-one", sourceRoot: "C:/trusted-source", trustedStagingRoot: "C:/private-root", stagingRoot: "C:/private-root/import-one", serializedBundle: "{}"}).success).toBe(true);
    expect(assetWorkerCommandSchema.safeParse({type: "stage-candidate-bundle", requestId: "request-one", sourceRoot: "C:/trusted-source", trustedStagingRoot: "C:/private-root", stagingRoot: "C:/private-root/import-one", serializedBundle: "{}", executable: "powershell.exe"}).success).toBe(false);
    expect(assetWorkerCommandSchema.safeParse({type: "prepare-candidate-sets", requestId: "request-two", trustedStagingRoot: "C:/private-root", stagingRoot: "C:/private-root/import-one", serializedRequest: "{}"}).success).toBe(true);
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
