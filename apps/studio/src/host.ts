import type {
  DesktopCapabilities,
  ExportGenerationJobRequest,
  ExportGenerationJobResult,
  FinalizeLooseCandidateMappingRequest,
  FinalizeLooseCandidateMappingResult,
  ImportLooseCandidateFilesRequest,
  ImportLooseCandidateFilesResult,
  GetGenerationExchangeRequest,
  GetGenerationExchangeResult,
  ListGenerationExchangesRequest,
  ListGenerationExchangesResult,
  ListProductionBundlesResult,
  LoadProductionBundleRequest,
  LoadProductionBundleResult,
  OpenRenderedFileResult,
  RenderJobEvent,
  SaveProductionBundleRequest,
  SaveProductionBundleResult,
  StartRenderRequest,
  StartRenderResponse,
  StoryStageDesktopBridge,
  StageCandidateBundleRequest,
  StageCandidateBundleResult,
} from "@storystage/contracts";

export interface HostAdapter {
  getCapabilities(): Promise<DesktopCapabilities>;
  exportGenerationJob(request: ExportGenerationJobRequest): Promise<ExportGenerationJobResult>;
  importLooseCandidateFiles(request: ImportLooseCandidateFilesRequest): Promise<ImportLooseCandidateFilesResult>;
  finalizeLooseCandidateMapping(request: FinalizeLooseCandidateMappingRequest): Promise<FinalizeLooseCandidateMappingResult>;
  stageCandidateBundle(request: StageCandidateBundleRequest): Promise<StageCandidateBundleResult>;
  saveProductionBundle(request: SaveProductionBundleRequest): Promise<SaveProductionBundleResult>;
  listProductionBundles(): Promise<ListProductionBundlesResult>;
  loadProductionBundle(request: LoadProductionBundleRequest): Promise<LoadProductionBundleResult>;
  listGenerationExchanges(request: ListGenerationExchangesRequest): Promise<ListGenerationExchangesResult>;
  getGenerationExchange(request: GetGenerationExchangeRequest): Promise<GetGenerationExchangeResult>;
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
  importLooseCandidateFiles = async (_request: ImportLooseCandidateFilesRequest): Promise<ImportLooseCandidateFilesResult> => {
    void _request;
    return {status: "failed", error: {code: "DESKTOP_REQUIRED", message: "Loose candidate import requires the desktop app."}};
  };
  finalizeLooseCandidateMapping = async (_request: FinalizeLooseCandidateMappingRequest): Promise<FinalizeLooseCandidateMappingResult> => {
    void _request;
    return {status: "failed", error: {code: "DESKTOP_REQUIRED", message: "Loose candidate mapping requires the desktop app."}};
  };
  stageCandidateBundle = async (_request: StageCandidateBundleRequest): Promise<StageCandidateBundleResult> => {
    void _request;
    return {status: "failed", error: {code: "DESKTOP_REQUIRED", message: "Secure candidate staging requires the desktop app."}};
  };
  saveProductionBundle = async (_request: SaveProductionBundleRequest): Promise<SaveProductionBundleResult> => {
    void _request;
    return {ok: false, error: {code: "DESKTOP_REQUIRED", message: "Durable production storage requires the desktop app."}};
  };
  listProductionBundles = async (): Promise<ListProductionBundlesResult> => ({productions: []});
  loadProductionBundle = async (_request: LoadProductionBundleRequest): Promise<LoadProductionBundleResult> => {
    void _request;
    return {ok: false, error: {code: "DESKTOP_REQUIRED", message: "Durable production storage requires the desktop app."}};
  };
  listGenerationExchanges = async (_request: ListGenerationExchangesRequest): Promise<ListGenerationExchangesResult> => {
    void _request;
    return {exchanges: []};
  };
  getGenerationExchange = async (_request: GetGenerationExchangeRequest): Promise<GetGenerationExchangeResult> => {
    void _request;
    return {ok: false, error: {code: "DESKTOP_REQUIRED", message: "Exchange recovery requires the desktop app."}};
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
  importLooseCandidateFiles = (request: ImportLooseCandidateFilesRequest) => this.bridge.importLooseCandidateFiles(request);
  finalizeLooseCandidateMapping = (request: FinalizeLooseCandidateMappingRequest) => this.bridge.finalizeLooseCandidateMapping(request);
  stageCandidateBundle = (request: StageCandidateBundleRequest) => this.bridge.stageCandidateBundle(request);
  saveProductionBundle = (request: SaveProductionBundleRequest) => this.bridge.saveProductionBundle(request);
  listProductionBundles = () => this.bridge.listProductionBundles();
  loadProductionBundle = (request: LoadProductionBundleRequest) => this.bridge.loadProductionBundle(request);
  listGenerationExchanges = (request: ListGenerationExchangesRequest) => this.bridge.listGenerationExchanges(request);
  getGenerationExchange = (request: GetGenerationExchangeRequest) => this.bridge.getGenerationExchange(request);
  startSampleRender = (request: StartRenderRequest) => this.bridge.startSampleRender(request);
  subscribeToRenderJobs = (listener: (event: RenderJobEvent) => void) => this.bridge.subscribeToRenderJobs(listener);
  openRenderedFile = (jobId: string) => this.bridge.openRenderedFile(jobId);
}

export const createHostAdapter = (bridge?: StoryStageDesktopBridge): HostAdapter =>
  bridge ? new DesktopHostAdapter(bridge) : new BrowserHostAdapter();
