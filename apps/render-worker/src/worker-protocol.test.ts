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

  it("rejects an invalid worker command", async () => {
    await expect(runWorkerCommand({type: "launch-anything"}, () => undefined)).rejects.toThrow("invalid command");
  });
});
