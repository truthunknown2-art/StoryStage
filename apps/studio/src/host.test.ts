import {describe, expect, it, vi} from "vitest";
import {BrowserHostAdapter, DesktopHostAdapter} from "./host";

describe("host adapters", () => {
  it("marks browser rendering as unavailable without faking completion", async () => {
    const host = new BrowserHostAdapter();
    expect(await host.getCapabilities()).toEqual({localRendering: false, openRenderedFile: false, manualImageExchange: false, localAudioImport: false});
    await expect(host.startSampleRender({})).rejects.toThrow("desktop app");
  });

  it("delegates the narrow desktop bridge", async () => {
    const bridge = {
      getCapabilities: vi.fn(async () => ({localRendering: true, openRenderedFile: true, manualImageExchange: true, localAudioImport: true})),
      exportGenerationJob: vi.fn(async () => ({ok: true as const, jobId: "job-one", briefCount: 2})),
      importLooseCandidateFiles: vi.fn(async () => ({status: "cancelled" as const})),
      finalizeLooseCandidateMapping: vi.fn(async () => ({status: "cancelled" as const})),
      stageCandidateBundle: vi.fn(async () => ({status: "staged" as const, importId: "import-one", stagedCount: 2, needsManualMaskCount: 1, missingRoleCount: 1, candidates: []})),
      saveProductionBundle: vi.fn(async () => ({ok: true as const, productionId: "production-one", revision: 1, contentHash: "a".repeat(64)})),
      listProductionBundles: vi.fn(async () => ({productions: []})),
      loadProductionBundle: vi.fn(async () => ({ok: false as const, error: {code: "NOT_FOUND", message: "Not found"}})),
      listGenerationExchanges: vi.fn(async () => ({exchanges: []})),
      getGenerationExchange: vi.fn(async () => ({ok: false as const, error: {code: "NOT_FOUND", message: "Not found"}})),
      prepareGenerationImport: vi.fn(async () => ({status: "failed" as const, error: {code: "NOT_READY", message: "Not ready"}})),
      reviewCandidateSet: vi.fn(async () => ({status: "failed" as const, error: {code: "NOT_READY", message: "Not ready"}})),
      listPublicShowPackCandidates: vi.fn(async () => ({candidates: []})),
      reviewPublicShowPackCandidate: vi.fn(async () => ({status: "failed" as const, error: {code: "NOT_READY", message: "Not ready"}})),
      importVoiceTrack: vi.fn(async () => ({status: "cancelled" as const})),
      approveVoiceTrack: vi.fn(async () => ({ok: false as const, error: {code: "NOT_READY", message: "Not ready"}})),
      importMusicTrack: vi.fn(async () => ({status: "cancelled" as const})),
      approveMusicTrack: vi.fn(async () => ({ok: false as const, error: {code: "NOT_READY", message: "Not ready"}})),
      importSoundEffect: vi.fn(async () => ({status: "cancelled" as const})),
      approveSoundEffect: vi.fn(async () => ({ok: false as const, error: {code: "NOT_READY", message: "Not ready"}})),
      startSampleRender: vi.fn(async () => ({jobId: "job-1"})),
      startProductionRender: vi.fn(async () => ({jobId: "production-job-1"})),
      subscribeToRenderJobs: vi.fn(() => () => undefined),
      openRenderedFile: vi.fn(async () => ({ok: true as const})),
    };
    const host = new DesktopHostAdapter(bridge);
    expect(await host.startSampleRender({})).toEqual({jobId: "job-1"});
    expect(await host.stageCandidateBundle({exchangeJobId: "job-one"})).toMatchObject({status: "staged", stagedCount: 2});
    expect(bridge.startSampleRender).toHaveBeenCalledWith({});
  });
});
