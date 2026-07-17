import {z} from "zod";

export const startRenderRequestSchema = z
  .object({simulateFailure: z.boolean().optional().default(false)})
  .strict();

export const startRenderResponseSchema = z.object({jobId: z.string().min(1)}).strict();

export const desktopCapabilitiesSchema = z.object({
  localRendering: z.boolean(),
  openRenderedFile: z.boolean(),
  manualImageExchange: z.boolean(),
}).strict();

const productionIdSchema = z.string().regex(/^[a-z0-9][a-z0-9-]*$/);

export const exportGenerationJobRequestSchema = z.object({
  serializedJob: z.string().min(2).max(2_000_000),
}).strict();

export const exportGenerationJobResultSchema = z.discriminatedUnion("ok", [
  z.object({
    ok: z.literal(true),
    jobId: productionIdSchema,
    briefCount: z.number().int().nonnegative(),
  }).strict(),
  z.object({ok: z.literal(false), error: z.object({code: z.string().min(1), message: z.string().min(1)}).strict()}).strict(),
]);

export const stageCandidateBundleRequestSchema = z.object({
  exchangeJobId: productionIdSchema,
}).strict();

export const stageCandidateBundleResultSchema = z.discriminatedUnion("status", [
  z.object({
    status: z.literal("prepared"),
    importId: productionIdSchema,
    preparedCount: z.number().int().nonnegative(),
    needsManualMaskCount: z.number().int().nonnegative(),
    missingRoleCount: z.number().int().nonnegative(),
  }).strict(),
  z.object({status: z.literal("cancelled")}).strict(),
  z.object({status: z.literal("failed"), error: z.object({code: z.string().min(1), message: z.string().min(1)}).strict()}).strict(),
]);

const activeJobFields = {
  jobId: z.string().min(1),
  message: z.string().min(1),
};

export const idleRenderJobSchema = z.object({
  status: z.literal("idle"),
  progress: z.null(),
  message: z.string().min(1),
}).strict();

export const queuedRenderJobSchema = z.object({...activeJobFields, status: z.literal("queued"), progress: z.null()}).strict();
export const bundlingRenderJobSchema = z.object({...activeJobFields, status: z.literal("bundling"), progress: z.number().min(0).max(1)}).strict();
export const renderingRenderJobSchema = z.object({...activeJobFields, status: z.literal("rendering"), progress: z.number().min(0).max(1)}).strict();
export const encodingRenderJobSchema = z.object({...activeJobFields, status: z.literal("encoding"), progress: z.null()}).strict();
export const completedRenderJobSchema = z.object({
  ...activeJobFields,
  status: z.literal("completed"),
  progress: z.null(),
  outputPath: z.string().min(1),
}).strict();
export const failedRenderJobSchema = z.object({
  ...activeJobFields,
  status: z.literal("failed"),
  progress: z.null(),
  error: z.object({code: z.string().min(1), message: z.string().min(1)}),
}).strict();

export const renderJobEventSchema = z.discriminatedUnion("status", [
  queuedRenderJobSchema,
  bundlingRenderJobSchema,
  renderingRenderJobSchema,
  encodingRenderJobSchema,
  completedRenderJobSchema,
  failedRenderJobSchema,
]);
export const renderJobStateSchema = z.union([idleRenderJobSchema, renderJobEventSchema]);

export const openRenderedFileResultSchema = z.discriminatedUnion("ok", [
  z.object({ok: z.literal(true)}).strict(),
  z.object({ok: z.literal(false), error: z.object({code: z.string(), message: z.string()}).strict()}).strict(),
]);

export const renderWorkerCommandSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("start"),
    workspaceRoot: z.string().min(1),
    request: startRenderRequestSchema.extend({jobId: z.string().min(1)}),
  }).strict(),
]);

export const renderWorkerMessageSchema = z.discriminatedUnion("type", [
  z.object({type: z.literal("event"), payload: renderJobEventSchema}).strict(),
]);

export const assetWorkerCommandSchema = z.object({
  type: z.literal("prepare-candidate-bundle"),
  requestId: z.string().min(1),
  sourceRoot: z.string().min(1),
  stagingRoot: z.string().min(1),
  serializedBundle: z.string().min(2).max(2_000_000),
}).strict();

export const assetWorkerMessageSchema = z.discriminatedUnion("type", [
  z.object({type: z.literal("prepared"), requestId: z.string().min(1), serializedPreparedCandidates: z.string().min(2).max(2_000_000)}).strict(),
  z.object({type: z.literal("failed"), requestId: z.string().min(1), error: z.object({code: z.string().min(1), message: z.string().min(1)}).strict()}).strict(),
]);

const allowedTransitions = {
  idle: ["queued"],
  queued: ["bundling", "failed"],
  bundling: ["rendering", "failed"],
  rendering: ["encoding", "failed"],
  encoding: ["completed", "failed"],
  completed: [],
  failed: [],
} as const;

export function canTransitionRenderJob(from: RenderJobStatus, to: RenderJobStatus): boolean {
  return (allowedTransitions[from] as readonly string[]).includes(to);
}

export const IPC_CHANNELS = {
  capabilities: "storystage:capabilities",
  exportGenerationJob: "storystage:export-generation-job",
  stageCandidateBundle: "storystage:stage-candidate-bundle",
  renderEvent: "storystage:render-event",
  renderStart: "storystage:render-start",
  openRenderedFile: "storystage:open-rendered-file",
} as const;

export type StartRenderRequest = z.input<typeof startRenderRequestSchema>;
export type StartRenderResponse = z.infer<typeof startRenderResponseSchema>;
export type DesktopCapabilities = z.infer<typeof desktopCapabilitiesSchema>;
export type ExportGenerationJobRequest = z.infer<typeof exportGenerationJobRequestSchema>;
export type ExportGenerationJobResult = z.infer<typeof exportGenerationJobResultSchema>;
export type StageCandidateBundleRequest = z.infer<typeof stageCandidateBundleRequestSchema>;
export type StageCandidateBundleResult = z.infer<typeof stageCandidateBundleResultSchema>;
export type RenderJobEvent = z.infer<typeof renderJobEventSchema>;
export type RenderJobState = z.infer<typeof renderJobStateSchema>;
export type RenderJobStatus = RenderJobState["status"];
export type OpenRenderedFileResult = z.infer<typeof openRenderedFileResultSchema>;
export type RenderWorkerCommand = z.infer<typeof renderWorkerCommandSchema>;
export type RenderWorkerMessage = z.infer<typeof renderWorkerMessageSchema>;
export type AssetWorkerCommand = z.infer<typeof assetWorkerCommandSchema>;
export type AssetWorkerMessage = z.infer<typeof assetWorkerMessageSchema>;

export type StoryStageDesktopBridge = {
  getCapabilities: () => Promise<DesktopCapabilities>;
  exportGenerationJob: (request: ExportGenerationJobRequest) => Promise<ExportGenerationJobResult>;
  stageCandidateBundle: (request: StageCandidateBundleRequest) => Promise<StageCandidateBundleResult>;
  startSampleRender: (request: StartRenderRequest) => Promise<StartRenderResponse>;
  subscribeToRenderJobs: (listener: (event: RenderJobEvent) => void) => () => void;
  openRenderedFile: (jobId: string) => Promise<OpenRenderedFileResult>;
};
