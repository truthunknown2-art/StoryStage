import {contextBridge, ipcRenderer} from "electron";
import {
  IPC_CHANNELS,
  approveMusicTrackRequestSchema,
  approveMusicTrackResultSchema,
  approveVoiceTrackRequestSchema,
  approveVoiceTrackResultSchema,
  desktopCapabilitiesSchema,
  exportGenerationJobRequestSchema,
  exportGenerationJobResultSchema,
  finalizeLooseCandidateMappingRequestSchema,
  finalizeLooseCandidateMappingResultSchema,
  importLooseCandidateFilesRequestSchema,
  importLooseCandidateFilesResultSchema,
  importMusicTrackRequestSchema,
  importMusicTrackResultSchema,
  importVoiceTrackRequestSchema,
  importVoiceTrackResultSchema,
  getGenerationExchangeRequestSchema,
  getGenerationExchangeResultSchema,
  listGenerationExchangesRequestSchema,
  listGenerationExchangesResultSchema,
  listProductionBundlesResultSchema,
  loadProductionBundleRequestSchema,
  loadProductionBundleResultSchema,
  openRenderedFileResultSchema,
  prepareGenerationImportRequestSchema,
  prepareGenerationImportResultSchema,
  reviewCandidateSetRequestSchema,
  reviewCandidateSetResultSchema,
  saveProductionBundleRequestSchema,
  saveProductionBundleResultSchema,
  renderJobEventSchema,
  startRenderRequestSchema,
  startRenderResponseSchema,
  startProductionRenderRequestSchema,
  stageCandidateBundleRequestSchema,
  stageCandidateBundleResultSchema,
  type ExportGenerationJobRequest,
  type ApproveMusicTrackRequest,
  type ApproveVoiceTrackRequest,
  type FinalizeLooseCandidateMappingRequest,
  type ImportLooseCandidateFilesRequest,
  type ImportMusicTrackRequest,
  type ImportVoiceTrackRequest,
  type GetGenerationExchangeRequest,
  type ListGenerationExchangesRequest,
  type LoadProductionBundleRequest,
  type PrepareGenerationImportRequest,
  type ReviewCandidateSetRequest,
  type RenderJobEvent,
  type SaveProductionBundleRequest,
  type StartRenderRequest,
  type StartProductionRenderRequest,
  type StoryStageDesktopBridge,
  type StageCandidateBundleRequest,
} from "@storystage/contracts";

const bridge: StoryStageDesktopBridge = {
  getCapabilities: async () => desktopCapabilitiesSchema.parse(await ipcRenderer.invoke(IPC_CHANNELS.capabilities)),
  exportGenerationJob: async (request: ExportGenerationJobRequest) => {
    const payload = exportGenerationJobRequestSchema.parse(request);
    return exportGenerationJobResultSchema.parse(await ipcRenderer.invoke(IPC_CHANNELS.exportGenerationJob, payload));
  },
  importLooseCandidateFiles: async (request: ImportLooseCandidateFilesRequest) => {
    const payload = importLooseCandidateFilesRequestSchema.parse(request);
    return importLooseCandidateFilesResultSchema.parse(await ipcRenderer.invoke(IPC_CHANNELS.importLooseCandidateFiles, payload));
  },
  finalizeLooseCandidateMapping: async (request: FinalizeLooseCandidateMappingRequest) => {
    const payload = finalizeLooseCandidateMappingRequestSchema.parse(request);
    return finalizeLooseCandidateMappingResultSchema.parse(await ipcRenderer.invoke(IPC_CHANNELS.finalizeLooseCandidateMapping, payload));
  },
  stageCandidateBundle: async (request: StageCandidateBundleRequest) => {
    const payload = stageCandidateBundleRequestSchema.parse(request);
    return stageCandidateBundleResultSchema.parse(await ipcRenderer.invoke(IPC_CHANNELS.stageCandidateBundle, payload));
  },
  saveProductionBundle: async (request: SaveProductionBundleRequest) => {
    const payload = saveProductionBundleRequestSchema.parse(request);
    return saveProductionBundleResultSchema.parse(await ipcRenderer.invoke(IPC_CHANNELS.saveProductionBundle, payload));
  },
  listProductionBundles: async () => listProductionBundlesResultSchema.parse(await ipcRenderer.invoke(IPC_CHANNELS.listProductionBundles)),
  loadProductionBundle: async (request: LoadProductionBundleRequest) => {
    const payload = loadProductionBundleRequestSchema.parse(request);
    return loadProductionBundleResultSchema.parse(await ipcRenderer.invoke(IPC_CHANNELS.loadProductionBundle, payload));
  },
  listGenerationExchanges: async (request: ListGenerationExchangesRequest) => {
    const payload = listGenerationExchangesRequestSchema.parse(request);
    return listGenerationExchangesResultSchema.parse(await ipcRenderer.invoke(IPC_CHANNELS.listGenerationExchanges, payload));
  },
  getGenerationExchange: async (request: GetGenerationExchangeRequest) => {
    const payload = getGenerationExchangeRequestSchema.parse(request);
    return getGenerationExchangeResultSchema.parse(await ipcRenderer.invoke(IPC_CHANNELS.getGenerationExchange, payload));
  },
  prepareGenerationImport: async (request: PrepareGenerationImportRequest) => {
    const payload = prepareGenerationImportRequestSchema.parse(request);
    return prepareGenerationImportResultSchema.parse(await ipcRenderer.invoke(IPC_CHANNELS.prepareGenerationImport, payload));
  },
  reviewCandidateSet: async (request: ReviewCandidateSetRequest) => {
    const payload = reviewCandidateSetRequestSchema.parse(request);
    return reviewCandidateSetResultSchema.parse(await ipcRenderer.invoke(IPC_CHANNELS.reviewCandidateSet, payload));
  },
  importVoiceTrack: async (request: ImportVoiceTrackRequest) => {
    const payload = importVoiceTrackRequestSchema.parse(request);
    return importVoiceTrackResultSchema.parse(await ipcRenderer.invoke(IPC_CHANNELS.importVoiceTrack, payload));
  },
  approveVoiceTrack: async (request: ApproveVoiceTrackRequest) => {
    const payload = approveVoiceTrackRequestSchema.parse(request);
    return approveVoiceTrackResultSchema.parse(await ipcRenderer.invoke(IPC_CHANNELS.approveVoiceTrack, payload));
  },
  importMusicTrack: async (request: ImportMusicTrackRequest) => {
    const payload = importMusicTrackRequestSchema.parse(request);
    return importMusicTrackResultSchema.parse(await ipcRenderer.invoke(IPC_CHANNELS.importMusicTrack, payload));
  },
  approveMusicTrack: async (request: ApproveMusicTrackRequest) => {
    const payload = approveMusicTrackRequestSchema.parse(request);
    return approveMusicTrackResultSchema.parse(await ipcRenderer.invoke(IPC_CHANNELS.approveMusicTrack, payload));
  },
  startSampleRender: async (request: StartRenderRequest) => {
    const payload = startRenderRequestSchema.parse(request);
    return startRenderResponseSchema.parse(await ipcRenderer.invoke(IPC_CHANNELS.renderStart, payload));
  },
  startProductionRender: async (request: StartProductionRenderRequest) => {
    const payload = startProductionRenderRequestSchema.parse(request);
    return startRenderResponseSchema.parse(await ipcRenderer.invoke(IPC_CHANNELS.productionRenderStart, payload));
  },
  subscribeToRenderJobs: (listener: (event: RenderJobEvent) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, payload: unknown) => {
      const parsed = renderJobEventSchema.safeParse(payload);
      if (parsed.success) listener(parsed.data);
    };
    ipcRenderer.on(IPC_CHANNELS.renderEvent, handler);
    return () => ipcRenderer.removeListener(IPC_CHANNELS.renderEvent, handler);
  },
  openRenderedFile: async (jobId: string) => openRenderedFileResultSchema.parse(await ipcRenderer.invoke(IPC_CHANNELS.openRenderedFile, jobId)),
};

contextBridge.exposeInMainWorld("storyStage", bridge);
