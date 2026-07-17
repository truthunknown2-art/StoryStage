import {describe, expect, it, vi} from "vitest";
import {BrowserHostAdapter, DesktopHostAdapter} from "./host";

describe("host adapters", () => {
  it("marks browser rendering as unavailable without faking completion", async () => {
    const host = new BrowserHostAdapter();
    expect(await host.getCapabilities()).toEqual({localRendering: false, openRenderedFile: false});
    await expect(host.startSampleRender({})).rejects.toThrow("desktop app");
  });

  it("delegates the narrow desktop bridge", async () => {
    const bridge = {
      getCapabilities: vi.fn(async () => ({localRendering: true, openRenderedFile: true})),
      startSampleRender: vi.fn(async () => ({jobId: "job-1"})),
      subscribeToRenderJobs: vi.fn(() => () => undefined),
      openRenderedFile: vi.fn(async () => ({ok: true as const})),
    };
    const host = new DesktopHostAdapter(bridge);
    expect(await host.startSampleRender({})).toEqual({jobId: "job-1"});
    expect(bridge.startSampleRender).toHaveBeenCalledWith({});
  });
});
