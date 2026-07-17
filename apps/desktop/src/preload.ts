import {contextBridge, ipcRenderer} from "electron";
import {
  IPC_CHANNELS,
  desktopCapabilitiesSchema,
  openRenderedFileResultSchema,
  renderJobEventSchema,
  startRenderRequestSchema,
  startRenderResponseSchema,
  type RenderJobEvent,
  type StartRenderRequest,
  type StoryStageDesktopBridge,
} from "@storystage/contracts";

const bridge: StoryStageDesktopBridge = {
  getCapabilities: async () => desktopCapabilitiesSchema.parse(await ipcRenderer.invoke(IPC_CHANNELS.capabilities)),
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
