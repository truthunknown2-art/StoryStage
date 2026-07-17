import type {
  DesktopCapabilities,
  ExportGenerationJobRequest,
  ExportGenerationJobResult,
  OpenRenderedFileResult,
  RenderJobEvent,
  StartRenderRequest,
  StartRenderResponse,
  StoryStageDesktopBridge,
  StageCandidateBundleRequest,
  StageCandidateBundleResult,
} from "@storystage/contracts";

export interface HostAdapter {
  getCapabilities(): Promise<DesktopCapabilities>;
  exportGenerationJob(request: ExportGenerationJobRequest): Promise<ExportGenerationJobResult>;
  stageCandidateBundle(request: StageCandidateBundleRequest): Promise<StageCandidateBundleResult>;
  startSampleRender(request: StartRenderRequest): Promise<StartRenderResponse>;
  subscribeToRenderJobs(listener: (event: RenderJobEvent) => void): () => void;
  openRenderedFile(jobId: string): Promise<OpenRenderedFileResult>;
}

export class BrowserHostAdapter implements HostAdapter {
  getCapabilities = async () => ({localRendering: false, openRenderedFile: false, manualImageExchange: false});
  exportGenerationJob = async (_request: ExportGenerationJobRequest): Promise<ExportGenerationJobResult> => {
    void _request;
    return {ok: false, error: {code: "DESKTOP_REQUIRED", message: "Private job export requires the desktop app."}};
  };
  stageCandidateBundle = async (_request: StageCandidateBundleRequest): Promise<StageCandidateBundleResult> => {
    void _request;
    return {status: "failed", error: {code: "DESKTOP_REQUIRED", message: "Secure candidate staging requires the desktop app."}};
  };
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
  exportGenerationJob = (request: ExportGenerationJobRequest) => this.bridge.exportGenerationJob(request);
  stageCandidateBundle = (request: StageCandidateBundleRequest) => this.bridge.stageCandidateBundle(request);
  startSampleRender = (request: StartRenderRequest) => this.bridge.startSampleRender(request);
  subscribeToRenderJobs = (listener: (event: RenderJobEvent) => void) => this.bridge.subscribeToRenderJobs(listener);
  openRenderedFile = (jobId: string) => this.bridge.openRenderedFile(jobId);
}

export const createHostAdapter = (bridge?: StoryStageDesktopBridge): HostAdapter =>
  bridge ? new DesktopHostAdapter(bridge) : new BrowserHostAdapter();
