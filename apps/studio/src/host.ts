import type {
  DesktopCapabilities,
  OpenRenderedFileResult,
  RenderJobEvent,
  StartRenderRequest,
  StartRenderResponse,
  StoryStageDesktopBridge,
} from "@storystage/contracts";

export interface HostAdapter {
  getCapabilities(): Promise<DesktopCapabilities>;
  startSampleRender(request: StartRenderRequest): Promise<StartRenderResponse>;
  subscribeToRenderJobs(listener: (event: RenderJobEvent) => void): () => void;
  openRenderedFile(jobId: string): Promise<OpenRenderedFileResult>;
}

export class BrowserHostAdapter implements HostAdapter {
  getCapabilities = async () => ({localRendering: false, openRenderedFile: false});
  startSampleRender = async (_request: StartRenderRequest): Promise<StartRenderResponse> => {
    void _request;
    throw new Error("Local rendering is available in the desktop app");
  };
  subscribeToRenderJobs = () => () => undefined;
  openRenderedFile = async (): Promise<OpenRenderedFileResult> => ({ok: false, error: {code: "DESKTOP_REQUIRED", message: "Opening rendered files requires the desktop app."}});
}

export class DesktopHostAdapter implements HostAdapter {
  constructor(private readonly bridge: StoryStageDesktopBridge) {}
  getCapabilities = () => this.bridge.getCapabilities();
  startSampleRender = (request: StartRenderRequest) => this.bridge.startSampleRender(request);
  subscribeToRenderJobs = (listener: (event: RenderJobEvent) => void) => this.bridge.subscribeToRenderJobs(listener);
  openRenderedFile = (jobId: string) => this.bridge.openRenderedFile(jobId);
}

export const createHostAdapter = (bridge?: StoryStageDesktopBridge): HostAdapter =>
  bridge ? new DesktopHostAdapter(bridge) : new BrowserHostAdapter();
