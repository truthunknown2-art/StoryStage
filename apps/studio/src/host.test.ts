import {describe, expect, it, vi} from "vitest";
import {BrowserHostAdapter, DesktopHostAdapter} from "./host";

describe("host adapters", () => {
  it("marks browser rendering as unavailable without faking completion", async () => {
    const host = new BrowserHostAdapter();
    expect(await host.getCapabilities()).toEqual({localRendering: false, openRenderedFile: false, manualImageExchange: false});
    await expect(host.startSampleRender({})).rejects.toThrow("desktop app");
  });

  it("delegates the narrow desktop bridge", async () => {
    const bridge = {
      getCapabilities: vi.fn(async () => ({localRendering: true, openRenderedFile: true, manualImageExchange: true})),
      exportGenerationJob: vi.fn(async () => ({ok: true as const, jobId: "job-one", briefCount: 2})),
      stageCandidateBundle: vi.fn(async () => ({status: "prepared" as const, importId: "import-one", preparedCount: 2, needsManualMaskCount: 1, missingRoleCount: 1})),
      startSampleRender: vi.fn(async () => ({jobId: "job-1"})),
      subscribeToRenderJobs: vi.fn(() => () => undefined),
      openRenderedFile: vi.fn(async () => ({ok: true as const})),
    };
    const host = new DesktopHostAdapter(bridge);
    expect(await host.startSampleRender({})).toEqual({jobId: "job-1"});
    expect(await host.stageCandidateBundle({exchangeJobId: "job-one"})).toMatchObject({status: "prepared", preparedCount: 2});
    expect(bridge.startSampleRender).toHaveBeenCalledWith({});
  });
});
