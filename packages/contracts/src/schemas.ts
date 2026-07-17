import {z} from "zod";

export const productionStageSchema = z.enum([
  "development",
  "board-review",
  "animatic-approved",
  "voice-recording",
  "final-render",
]);

export const productionSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  episodeTitle: z.string().min(1),
  showPack: z.string().min(1),
  logline: z.string().min(1),
  durationLabel: z.string().min(1),
  stage: productionStageSchema,
  stageLabel: z.string().min(1),
  updatedLabel: z.string().min(1),
  warningCount: z.number().int().nonnegative(),
  palette: z.tuple([z.string(), z.string(), z.string()]),
});

export const shotSchema = z.object({
  id: z.string().min(1),
  sceneId: z.string().min(1),
  number: z.string().min(1),
  title: z.string().min(1),
  framing: z.string().min(1),
  description: z.string().min(1),
  startFrame: z.number().int().nonnegative(),
  durationInFrames: z.number().int().positive(),
  status: z.enum(["draft", "proposed", "approved", "locked"]),
  purpose: z.string().min(1),
});

export const sceneSchema = z.object({
  id: z.string().min(1),
  number: z.number().int().positive(),
  title: z.string().min(1),
  summary: z.string().min(1),
  startFrame: z.number().int().nonnegative(),
  durationInFrames: z.number().int().positive(),
  color: z.string().min(1),
  shotIds: z.array(z.string().min(1)).min(1),
});

export const timelineKindSchema = z.enum([
  "camera",
  "character-a",
  "character-b",
  "dialogue",
  "sfx",
  "music",
]);

export const timelineEventSchema = z.object({
  id: z.string().min(1),
  kind: timelineKindSchema,
  label: z.string().min(1),
  detail: z.string().min(1),
  startFrame: z.number().int().nonnegative(),
  durationInFrames: z.number().int().positive(),
  locked: z.boolean(),
  color: z.string().min(1),
});

export const captionSchema = z.object({
  text: z.string(),
  startMs: z.number().nonnegative(),
  endMs: z.number().positive(),
  timestampMs: z.number().nullable(),
  confidence: z.number().nullable(),
});

export const episodePlanSchema = z.object({
  schemaVersion: z.literal("1.0"),
  id: z.string().min(1),
  productionId: z.string().min(1),
  title: z.string().min(1),
  showPack: z.string().min(1),
  fps: z.number().int().positive(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  durationInFrames: z.number().int().positive(),
  scenes: z.array(sceneSchema).min(1),
  shots: z.array(shotSchema).min(1),
  timeline: z.array(timelineEventSchema),
  captions: z.array(captionSchema),
});

export const startRenderRequestSchema = z
  .object({simulateFailure: z.boolean().optional().default(false)})
  .strict();

export const startRenderResponseSchema = z.object({jobId: z.string().min(1)}).strict();

export const desktopCapabilitiesSchema = z.object({
  localRendering: z.boolean(),
  openRenderedFile: z.boolean(),
});

const activeJobFields = {
  jobId: z.string().min(1),
  message: z.string().min(1),
};

export const idleRenderJobSchema = z.object({
  status: z.literal("idle"),
  progress: z.null(),
  message: z.string().min(1),
});

export const queuedRenderJobSchema = z.object({...activeJobFields, status: z.literal("queued"), progress: z.null()});
export const bundlingRenderJobSchema = z.object({...activeJobFields, status: z.literal("bundling"), progress: z.number().min(0).max(1)});
export const renderingRenderJobSchema = z.object({...activeJobFields, status: z.literal("rendering"), progress: z.number().min(0).max(1)});
export const encodingRenderJobSchema = z.object({...activeJobFields, status: z.literal("encoding"), progress: z.null()});
export const completedRenderJobSchema = z.object({
  ...activeJobFields,
  status: z.literal("completed"),
  progress: z.null(),
  outputPath: z.string().min(1),
});
export const failedRenderJobSchema = z.object({
  ...activeJobFields,
  status: z.literal("failed"),
  progress: z.null(),
  error: z.object({code: z.string().min(1), message: z.string().min(1)}),
});

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
  z.object({ok: z.literal(true)}),
  z.object({ok: z.literal(false), error: z.object({code: z.string(), message: z.string()})}),
]);

export const renderWorkerCommandSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("start"),
    workspaceRoot: z.string().min(1),
    request: startRenderRequestSchema.extend({jobId: z.string().min(1)}),
  }),
]);

export const renderWorkerMessageSchema = z.discriminatedUnion("type", [
  z.object({type: z.literal("event"), payload: renderJobEventSchema}),
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

export function calculateEpisodeDurationInFrames(plan: EpisodePlan): number {
  const parsed = episodePlanSchema.parse(plan);
  return Math.max(
    ...parsed.scenes.map((scene) => scene.startFrame + scene.durationInFrames),
    ...parsed.shots.map((shot) => shot.startFrame + shot.durationInFrames),
    ...parsed.timeline.map((event) => event.startFrame + event.durationInFrames),
  );
}

export const IPC_CHANNELS = {
  capabilities: "storystage:capabilities",
  renderEvent: "storystage:render-event",
  renderStart: "storystage:render-start",
  openRenderedFile: "storystage:open-rendered-file",
} as const;

export type ProductionStage = z.infer<typeof productionStageSchema>;
export type Production = z.infer<typeof productionSchema>;
export type Scene = z.infer<typeof sceneSchema>;
export type Shot = z.infer<typeof shotSchema>;
export type TimelineKind = z.infer<typeof timelineKindSchema>;
export type TimelineEvent = z.infer<typeof timelineEventSchema>;
export type EpisodePlan = z.infer<typeof episodePlanSchema>;
export type StartRenderRequest = z.input<typeof startRenderRequestSchema>;
export type StartRenderResponse = z.infer<typeof startRenderResponseSchema>;
export type DesktopCapabilities = z.infer<typeof desktopCapabilitiesSchema>;
export type RenderJobEvent = z.infer<typeof renderJobEventSchema>;
export type RenderJobState = z.infer<typeof renderJobStateSchema>;
export type RenderJobStatus = RenderJobState["status"];
export type OpenRenderedFileResult = z.infer<typeof openRenderedFileResultSchema>;
export type RenderWorkerCommand = z.infer<typeof renderWorkerCommandSchema>;
export type RenderWorkerMessage = z.infer<typeof renderWorkerMessageSchema>;

export type StoryStageDesktopBridge = {
  getCapabilities: () => Promise<DesktopCapabilities>;
  startSampleRender: (request: StartRenderRequest) => Promise<StartRenderResponse>;
  subscribeToRenderJobs: (listener: (event: RenderJobEvent) => void) => () => void;
  openRenderedFile: (jobId: string) => Promise<OpenRenderedFileResult>;
};
