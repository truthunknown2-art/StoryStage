import {z} from "zod";

// SS-001 regression-only presentation fixture. This is deliberately owned by
// the fixtures package; it is not StoryStage's production-domain model.
export const legacyProductionSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  episodeTitle: z.string().min(1),
  showPack: z.string().min(1),
  logline: z.string().min(1),
  durationLabel: z.string().min(1),
  stage: z.enum(["development", "board-review", "animatic-approved", "voice-recording", "final-render"]),
  stageLabel: z.string().min(1),
  updatedLabel: z.string().min(1),
  warningCount: z.number().int().nonnegative(),
  palette: z.tuple([z.string(), z.string(), z.string()]),
}).strict();

const legacyShotSchema = z.object({
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
}).strict();

const legacySceneSchema = z.object({
  id: z.string().min(1),
  number: z.number().int().positive(),
  title: z.string().min(1),
  summary: z.string().min(1),
  startFrame: z.number().int().nonnegative(),
  durationInFrames: z.number().int().positive(),
  color: z.string().min(1),
  shotIds: z.array(z.string().min(1)).min(1),
}).strict();

const legacyTimelineEventSchema = z.object({
  id: z.string().min(1),
  kind: z.enum(["camera", "character-a", "character-b", "dialogue", "sfx", "music"]),
  label: z.string().min(1),
  detail: z.string().min(1),
  startFrame: z.number().int().nonnegative(),
  durationInFrames: z.number().int().positive(),
  locked: z.boolean(),
  color: z.string().min(1),
}).strict();

const legacyCaptionSchema = z.object({
  text: z.string(),
  startMs: z.number().nonnegative(),
  endMs: z.number().positive(),
  timestampMs: z.number().nullable(),
  confidence: z.number().nullable(),
}).strict();

export const legacyEpisodePlanSchema = z.object({
  schemaVersion: z.literal("1.0"),
  id: z.string().min(1),
  productionId: z.string().min(1),
  title: z.string().min(1),
  showPack: z.string().min(1),
  fps: z.number().int().positive(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  durationInFrames: z.number().int().positive(),
  scenes: z.array(legacySceneSchema).min(1),
  shots: z.array(legacyShotSchema).min(1),
  timeline: z.array(legacyTimelineEventSchema),
  captions: z.array(legacyCaptionSchema),
}).strict();

export type LegacyEpisodePlan = z.infer<typeof legacyEpisodePlanSchema>;

export function calculateLegacyEpisodeDurationInFrames(plan: LegacyEpisodePlan): number {
  const parsed = legacyEpisodePlanSchema.parse(plan);
  return Math.max(
    ...parsed.scenes.map((scene) => scene.startFrame + scene.durationInFrames),
    ...parsed.shots.map((shot) => shot.startFrame + shot.durationInFrames),
    ...parsed.timeline.map((event) => event.startFrame + event.durationInFrames),
  );
}
