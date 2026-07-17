import type {RenderWorkerMessage} from "@storystage/contracts";
import {describe, expect, it, vi} from "vitest";
import {runWorkerCommand} from "./worker-protocol";

const command = {
  type: "start" as const,
  workspaceRoot: "C:/StoryStage",
  request: {jobId: "job-1", simulateFailure: false},
};

describe("render-worker protocol", () => {
  it("reports worker success", async () => {
    const messages: RenderWorkerMessage[] = [];
    const fakeRender = vi.fn(async ({jobId, onEvent}) => {
      onEvent?.({jobId, status: "completed", progress: null, message: "done", outputPath: "C:/StoryStage/artifacts/SS-001/sample.mp4"});
      return "C:/StoryStage/artifacts/SS-001/sample.mp4";
    });

    await runWorkerCommand(command, (message) => messages.push(message), fakeRender);
    expect(messages.at(-1)?.payload.status).toBe("completed");
  });

  it("reports worker failure as a typed failed job", async () => {
    const messages: RenderWorkerMessage[] = [];
    const fakeRender = vi.fn(async () => { throw new Error("renderer exploded"); });

    await runWorkerCommand(command, (message) => messages.push(message), fakeRender);
    expect(messages.at(-1)?.payload).toMatchObject({status: "failed", error: {code: "RENDER_FAILED"}});
  });

  it("routes an exact saved production snapshot to the production renderer", async () => {
    const messages: RenderWorkerMessage[] = [];
    const productionCommand = {
      type: "start-production" as const,
      workspaceRoot: "C:/StoryStage",
      trustedProductionRoot: "C:/private/productions",
      bundleFile: "C:/private/productions/production-one/r2/snapshots/hash.json",
      assetsRoot: "C:/private/assets",
      outputRoot: "C:/private/renders/production-one/r2",
      request: {jobId: "job-production", bundleContentHash: "a".repeat(64)},
    };
    const fakeProductionRender = vi.fn(async ({jobId, onEvent}) => {
      const outputPath = "C:/private/renders/production-one/r2/job-production.mp4";
      onEvent?.({jobId, status: "completed", progress: null, message: "done", outputPath});
      return outputPath;
    });

    await runWorkerCommand(productionCommand, (message) => messages.push(message), undefined, fakeProductionRender);

    expect(fakeProductionRender).toHaveBeenCalledWith(expect.objectContaining({jobId: "job-production", bundleContentHash: "a".repeat(64), bundleFile: productionCommand.bundleFile, assetsRoot: productionCommand.assetsRoot}));
    expect(messages.at(-1)?.payload).toMatchObject({jobId: "job-production", status: "completed"});
  });

  it("routes selected local rig evidence to the diagnostic renderer", async () => {
    const messages: RenderWorkerMessage[] = [];
    const diagnosticCommand = {
      type: "start-rig-diagnostic" as const,
      workspaceRoot: "C:/StoryStage",
      importRoot: "C:/private/import-one",
      manifestFile: "C:/private/import-one/prepared/rig-manifest-set-one.json",
      outputFile: "C:/private/import-one/prepared/rig-diagnostic-set-one.mp4",
      request: {jobId: "job-diagnostic", entityName: "Mara"},
    };
    const fakeDiagnosticRender = vi.fn(async ({jobId, onEvent, outputFile}) => {
      onEvent?.({jobId, status: "completed", progress: null, message: "done", outputPath: outputFile});
      return outputFile;
    });

    await runWorkerCommand(diagnosticCommand, (message) => messages.push(message), undefined, undefined, fakeDiagnosticRender);

    expect(fakeDiagnosticRender).toHaveBeenCalledWith(expect.objectContaining({jobId: "job-diagnostic", entityName: "Mara", importRoot: diagnosticCommand.importRoot, manifestFile: diagnosticCommand.manifestFile}));
    expect(messages.at(-1)?.payload).toMatchObject({jobId: "job-diagnostic", status: "completed"});
  });

  it("rejects an invalid worker command", async () => {
    await expect(runWorkerCommand({type: "launch-anything"}, () => undefined)).rejects.toThrow("invalid command");
  });
});
