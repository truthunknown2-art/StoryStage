import {contextBridge, ipcRenderer} from "electron";
import {
  IPC_CHANNELS,
  desktopCapabilitiesSchema,
  exportGenerationJobRequestSchema,
  exportGenerationJobResultSchema,
  finalizeLooseCandidateMappingRequestSchema,
  finalizeLooseCandidateMappingResultSchema,
  importLooseCandidateFilesRequestSchema,
  importLooseCandidateFilesResultSchema,
  openRenderedFileResultSchema,
  renderJobEventSchema,
  startRenderRequestSchema,
  startRenderResponseSchema,
  stageCandidateBundleRequestSchema,
  stageCandidateBundleResultSchema,
  type ExportGenerationJobRequest,
  type FinalizeLooseCandidateMappingRequest,
  type ImportLooseCandidateFilesRequest,
  type RenderJobEvent,
  type StartRenderRequest,
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
  startSampleRender: async (request: StartRenderRequest) => {
    const payload = startRenderRequestSchema.parse(request);
    return startRenderResponseSchema.parse(await ipcRenderer.invoke(IPC_CHANNELS.renderStart, payload));
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
