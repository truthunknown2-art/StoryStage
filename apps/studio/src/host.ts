import type {
  ApproveMusicTrackRequest,
  ApproveMusicTrackResult,
  ApproveSoundEffectRequest,
  ApproveSoundEffectResult,
  ApproveVoiceTrackRequest,
  ApproveVoiceTrackResult,
  DesktopCapabilities,
  ExportGenerationJobRequest,
  ExportGenerationJobResult,
  FinalizeLooseCandidateMappingRequest,
  FinalizeLooseCandidateMappingResult,
  ImportLooseCandidateFilesRequest,
  ImportLooseCandidateFilesResult,
  ImportMusicTrackRequest,
  ImportMusicTrackResult,
  ImportSoundEffectRequest,
  ImportSoundEffectResult,
  ImportVoiceTrackRequest,
  ImportVoiceTrackResult,
  GetGenerationExchangeRequest,
  GetGenerationExchangeResult,
  ListGenerationExchangesRequest,
  ListGenerationExchangesResult,
  ListProductionBundlesResult,
  ListPublicShowPackCandidatesRequest,
  ListPublicShowPackCandidatesResult,
  LoadProductionBundleRequest,
  LoadProductionBundleResult,
  OpenRenderedFileResult,
  PrepareGenerationImportRequest,
  PrepareGenerationImportResult,
  ReviewCandidateSetRequest,
  ReviewCandidateSetResult,
  ReviewPublicShowPackCandidateRequest,
  ReviewPublicShowPackCandidateResult,
  RenderJobEvent,
  SaveProductionBundleRequest,
  SaveProductionBundleResult,
  StartRenderRequest,
  StartRenderResponse,
  StartProductionRenderRequest,
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
  prepareGenerationImport(request: PrepareGenerationImportRequest): Promise<PrepareGenerationImportResult>;
  reviewCandidateSet(request: ReviewCandidateSetRequest): Promise<ReviewCandidateSetResult>;
  listPublicShowPackCandidates(request: ListPublicShowPackCandidatesRequest): Promise<ListPublicShowPackCandidatesResult>;
  reviewPublicShowPackCandidate(request: ReviewPublicShowPackCandidateRequest): Promise<ReviewPublicShowPackCandidateResult>;
  importVoiceTrack(request: ImportVoiceTrackRequest): Promise<ImportVoiceTrackResult>;
  approveVoiceTrack(request: ApproveVoiceTrackRequest): Promise<ApproveVoiceTrackResult>;
  importMusicTrack(request: ImportMusicTrackRequest): Promise<ImportMusicTrackResult>;
  approveMusicTrack(request: ApproveMusicTrackRequest): Promise<ApproveMusicTrackResult>;
  importSoundEffect(request: ImportSoundEffectRequest): Promise<ImportSoundEffectResult>;
  approveSoundEffect(request: ApproveSoundEffectRequest): Promise<ApproveSoundEffectResult>;
  startSampleRender(request: StartRenderRequest): Promise<StartRenderResponse>;
  startProductionRender(request: StartProductionRenderRequest): Promise<StartRenderResponse>;
  subscribeToRenderJobs(listener: (event: RenderJobEvent) => void): () => void;
  openRenderedFile(jobId: string): Promise<OpenRenderedFileResult>;
}

export class BrowserHostAdapter implements HostAdapter {
  getCapabilities = async () => ({localRendering: false, openRenderedFile: false, manualImageExchange: false, localAudioImport: false});
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
  prepareGenerationImport = async (_request: PrepareGenerationImportRequest): Promise<PrepareGenerationImportResult> => {
    void _request;
    return {status: "failed", error: {code: "DESKTOP_REQUIRED", message: "Image preparation requires the desktop app."}};
  };
  reviewCandidateSet = async (_request: ReviewCandidateSetRequest): Promise<ReviewCandidateSetResult> => {
    void _request;
    return {status: "failed", error: {code: "DESKTOP_REQUIRED", message: "Asset review requires the desktop app."}};
  };
  // The browser preview intentionally ignores production scope because it cannot read durable review state.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  listPublicShowPackCandidates = async (_request: ListPublicShowPackCandidatesRequest): Promise<ListPublicShowPackCandidatesResult> => ({candidates: [{candidateId: "weird-history-rook-v1", version: "1.0.0", showPackId: "weird-history-editorial-v1", displayName: "Rook editorial presenter", status: "candidate-needs-human-review", contentHash: "6c60b1fa633a4c3c7e9a32cbe475a52277f38b7d5cf2e239b0acee2ada85c691", identityLock: "Angular swept-back dark hair, cream rolled-sleeve shirt, vermilion neck scarf, charcoal high-waist trousers, practical dark shoes.", provenance: {provider: "ChatGPT Images", usageNotes: "Original StoryStage Show Pack candidate; do not promote to an approved production asset before explicit human visual review."}, files: [{role: "identity-sheet", url: "/show-packs/weird-history/rook/v1/identity-sheet.png", width: 1536, height: 1024}, {role: "neutral-pose", url: "/show-packs/weird-history/rook/v1/prepared/rook-v1-neutral.png", width: 1600, height: 1800}, {role: "talk-pose", url: "/show-packs/weird-history/rook/v1/prepared/rook-v1-talk.png", width: 1600, height: 1800}, {role: "reaction-pose", url: "/show-packs/weird-history/rook/v1/prepared/rook-v1-reaction.png", width: 1600, height: 1800}], diagnosticUrl: "/show-packs/weird-history/rook/v1/prepared/rig-diagnostic-rook-v1.mp4", verifiedByHost: false, canReview: false, review: {decision: "none"}}]});
  reviewPublicShowPackCandidate = async (_request: ReviewPublicShowPackCandidateRequest): Promise<ReviewPublicShowPackCandidateResult> => {
    void _request;
    return {status: "failed", error: {code: "DESKTOP_REQUIRED", message: "Trusted Show Pack review and binding requires the desktop app."}};
  };
  importVoiceTrack = async (_request: ImportVoiceTrackRequest): Promise<ImportVoiceTrackResult> => {
    void _request;
    return {status: "failed", error: {code: "DESKTOP_REQUIRED", message: "Voice recording import requires the desktop app."}};
  };
  approveVoiceTrack = async (_request: ApproveVoiceTrackRequest): Promise<ApproveVoiceTrackResult> => {
    void _request;
    return {ok: false, error: {code: "DESKTOP_REQUIRED", message: "Voice recording approval requires the desktop app."}};
  };
  importMusicTrack = async (_request: ImportMusicTrackRequest): Promise<ImportMusicTrackResult> => {
    void _request;
    return {status: "failed", error: {code: "DESKTOP_REQUIRED", message: "Music import requires the desktop app."}};
  };
  approveMusicTrack = async (_request: ApproveMusicTrackRequest): Promise<ApproveMusicTrackResult> => {
    void _request;
    return {ok: false, error: {code: "DESKTOP_REQUIRED", message: "Music approval requires the desktop app."}};
  };
  importSoundEffect = async (_request: ImportSoundEffectRequest): Promise<ImportSoundEffectResult> => {
    void _request;
    return {status: "failed", error: {code: "DESKTOP_REQUIRED", message: "Sound-effect import requires the desktop app."}};
  };
  approveSoundEffect = async (_request: ApproveSoundEffectRequest): Promise<ApproveSoundEffectResult> => {
    void _request;
    return {ok: false, error: {code: "DESKTOP_REQUIRED", message: "Sound-effect approval requires the desktop app."}};
  };
  startSampleRender = async (_request: StartRenderRequest): Promise<StartRenderResponse> => {
    void _request;
    throw new Error("Local rendering is available in the desktop app");
  };
  startProductionRender = async (_request: StartProductionRenderRequest): Promise<StartRenderResponse> => {
    void _request;
    throw new Error("Production rendering is available in the desktop app");
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
  prepareGenerationImport = (request: PrepareGenerationImportRequest) => this.bridge.prepareGenerationImport(request);
  reviewCandidateSet = (request: ReviewCandidateSetRequest) => this.bridge.reviewCandidateSet(request);
  listPublicShowPackCandidates = (request: ListPublicShowPackCandidatesRequest) => this.bridge.listPublicShowPackCandidates(request);
  reviewPublicShowPackCandidate = (request: ReviewPublicShowPackCandidateRequest) => this.bridge.reviewPublicShowPackCandidate(request);
  importVoiceTrack = (request: ImportVoiceTrackRequest) => this.bridge.importVoiceTrack(request);
  approveVoiceTrack = (request: ApproveVoiceTrackRequest) => this.bridge.approveVoiceTrack(request);
  importMusicTrack = (request: ImportMusicTrackRequest) => this.bridge.importMusicTrack(request);
  approveMusicTrack = (request: ApproveMusicTrackRequest) => this.bridge.approveMusicTrack(request);
  importSoundEffect = (request: ImportSoundEffectRequest) => this.bridge.importSoundEffect(request);
  approveSoundEffect = (request: ApproveSoundEffectRequest) => this.bridge.approveSoundEffect(request);
  startSampleRender = (request: StartRenderRequest) => this.bridge.startSampleRender(request);
  startProductionRender = (request: StartProductionRenderRequest) => this.bridge.startProductionRender(request);
  subscribeToRenderJobs = (listener: (event: RenderJobEvent) => void) => this.bridge.subscribeToRenderJobs(listener);
  openRenderedFile = (jobId: string) => this.bridge.openRenderedFile(jobId);
}

export const createHostAdapter = (bridge?: StoryStageDesktopBridge): HostAdapter =>
  bridge ? new DesktopHostAdapter(bridge) : new BrowserHostAdapter();
