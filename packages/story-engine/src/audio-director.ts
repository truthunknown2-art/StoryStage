import { z } from "zod";
import { hashCanonical } from "./canonical-hash";
import { hashSchema, identifierSchema } from "./model";

export const audioRoleSchema = z.enum([
  "dialogue",
  "narration",
  "foley",
  "sfx",
  "ambience",
  "music",
]);
export const audioSourceRouteSchema = z.enum([
  "recorded",
  "imported",
  "manual-generation",
  "api-generation",
  "stock",
]);
export const audioProviderSchema = z.enum([
  "local",
  "suno",
  "openai",
  "elevenlabs",
  "stability",
  "other",
]);

export const audioBriefSchema = z
  .object({
    schemaVersion: z.literal("1.0"),
    id: identifierSchema,
    productionId: identifierSchema,
    sceneId: identifierSchema,
    beatId: identifierSchema,
    shotId: identifierSchema.optional(),
    lineId: identifierSchema.optional(),
    speakerId: identifierSchema.optional(),
    role: audioRoleSchema,
    creativeDirection: z.string().min(1),
    intendedDurationInFrames: z.number().int().positive(),
    acquisitionRoutes: z.array(audioSourceRouteSchema).min(1),
    providerNotes: z.string().optional(),
  })
  .strict();

export const audioEvidenceSchema = z
  .object({
    id: identifierSchema,
    kind: z.enum([
      "creator-owned",
      "commercial-license",
      "stock-license",
      "provider-terms",
      "voice-consent",
    ]),
    note: z.string().min(1),
    capturedAt: z.string().datetime(),
  })
  .strict();

export const approvedAudioAssetVersionSchema = z
  .object({
    schemaVersion: z.literal("1.0"),
    id: identifierSchema,
    briefId: identifierSchema,
    sourceRoute: audioSourceRouteSchema,
    sourceProvider: audioProviderSchema,
    sourceContentHash: hashSchema,
    canonicalContentHash: hashSchema,
    relativeFile: z.string().min(1),
    mediaType: z.literal("audio/wav"),
    sampleRate: z.literal(48_000),
    channels: z.union([z.literal(1), z.literal(2)]),
    sampleCount: z.number().int().positive(),
    approvedAt: z.string().datetime(),
    rightsEvidence: z.array(audioEvidenceSchema).min(1),
    voiceConsentEvidenceId: identifierSchema.optional(),
  })
  .strict()
  .superRefine((asset, context) => {
    if (
      asset.voiceConsentEvidenceId &&
      !asset.rightsEvidence.some(
        (evidence) =>
          evidence.id === asset.voiceConsentEvidenceId &&
          evidence.kind === "voice-consent",
      )
    )
      context.addIssue({
        code: "custom",
        path: ["voiceConsentEvidenceId"],
        message: "Voice consent must reference bundled voice-consent evidence.",
      });
  });

export const dialoguePerformanceSchema = z
  .object({
    schemaVersion: z.literal("1.0"),
    id: identifierSchema,
    productionId: identifierSchema,
    lineId: identifierSchema,
    speakerId: identifierSchema,
    takeId: identifierSchema,
    approvedAssetVersionId: identifierSchema,
    actingDirection: z.string().min(1),
    source: z.enum(["owner-performance", "licensed-synthetic-voice"]),
  })
  .strict();

const sampleSpanSchema = z
  .object({
    startSample: z.number().int().nonnegative(),
    endSample: z.number().int().positive(),
  })
  .strict()
  .refine((span) => span.endSample > span.startSample, {
    message: "Sample span must have positive duration.",
  });

export const speechAlignmentArtifactSchema = z
  .object({
    schemaVersion: z.literal("1.0"),
    id: identifierSchema,
    dialoguePerformanceId: identifierSchema,
    canonicalContentHash: hashSchema,
    transcript: z.string().min(1),
    words: z
      .array(
        sampleSpanSchema.extend({
          text: z.string().min(1),
          confidence: z.number().min(0).max(1),
        }),
      )
      .min(1),
    visemes: z.array(
      sampleSpanSchema.extend({
        value: z.enum(["rest", "closed", "wide", "round", "teeth", "tongue"]),
      }),
    ),
  })
  .strict();

export const audioCueSchema = z
  .object({
    schemaVersion: z.literal("1.0"),
    id: identifierSchema,
    productionId: identifierSchema,
    sceneId: identifierSchema,
    beatId: identifierSchema,
    shotId: identifierSchema.optional(),
    lineId: identifierSchema.optional(),
    approvedAssetVersionId: identifierSchema,
    role: audioRoleSchema,
    event: z.enum([
      "prelap",
      "on-action",
      "impact",
      "reaction",
      "tail",
      "continuous",
    ]),
    startFrame: z.number().int().nonnegative(),
    durationInFrames: z.number().int().positive(),
    trimStartSample: z.number().int().nonnegative(),
    bus: z.enum(["dialogue", "effects", "music"]),
    gainDb: z.number().min(-96).max(24),
    pan: z.number().min(-1).max(1),
    fadeInFrames: z.number().int().nonnegative(),
    fadeOutFrames: z.number().int().nonnegative(),
    duckingGroup: z.enum(["dialogue", "music", "effects"]).optional(),
  })
  .strict()
  .superRefine((cue, context) => {
    if (cue.fadeInFrames + cue.fadeOutFrames > cue.durationInFrames)
      context.addIssue({
        code: "custom",
        path: ["fadeOutFrames"],
        message: "Cue fades cannot exceed cue duration.",
      });
  });

const audioMixPlanFields = {
  schemaVersion: z.literal("1.0"),
  id: identifierSchema,
  productionId: identifierSchema,
  fps: z.number().int().positive(),
  sampleRate: z.literal(48_000),
  durationInFrames: z.number().int().positive(),
  cues: z.array(audioCueSchema),
  target: z
    .object({
      integratedLufs: z.number().min(-40).max(-5),
      truePeakDbtp: z.number().min(-12).max(0),
      channels: z.literal(2),
    })
    .strict(),
};

export const audioMixPlanDraftSchema = z
  .object(audioMixPlanFields)
  .strict()
  .superRefine((plan, context) => {
    const ids = new Set<string>();
    for (const [index, cue] of plan.cues.entries()) {
      if (ids.has(cue.id))
        context.addIssue({
          code: "custom",
          path: ["cues", index, "id"],
          message: `Duplicate cue id ${cue.id}.`,
        });
      ids.add(cue.id);
      if (cue.startFrame + cue.durationInFrames > plan.durationInFrames)
        context.addIssue({
          code: "custom",
          path: ["cues", index, "durationInFrames"],
          message: "Cue extends beyond the production duration.",
        });
    }
  });

export const audioMixPlanSchema = audioMixPlanDraftSchema.and(
  z.object({ contentHash: hashSchema }).strict(),
);

export const audioMasterReceiptSchema = z
  .object({
    schemaVersion: z.literal("1.0"),
    id: identifierSchema,
    productionId: identifierSchema,
    mixPlanContentHash: hashSchema,
    rendererId: identifierSchema,
    rendererVersion: z.string().min(1),
    stems: z
      .object({
        dialogue: hashSchema,
        effects: hashSchema,
        music: hashSchema,
      })
      .strict(),
    masterContentHash: hashSchema,
    measuredIntegratedLufs: z.number(),
    measuredTruePeakDbtp: z.number(),
    clippedSamples: z.number().int().nonnegative(),
    editorialApproval: z.enum(["pending", "approved", "rejected"]),
    renderedAt: z.string().datetime(),
  })
  .strict();

export type AudioBrief = z.infer<typeof audioBriefSchema>;
export type ApprovedAudioAssetVersion = z.infer<
  typeof approvedAudioAssetVersionSchema
>;
export type DialoguePerformance = z.infer<typeof dialoguePerformanceSchema>;
export type SpeechAlignmentArtifact = z.infer<
  typeof speechAlignmentArtifactSchema
>;
export type AudioCue = z.infer<typeof audioCueSchema>;
export type AudioMixPlan = z.infer<typeof audioMixPlanSchema>;
export type AudioMasterReceipt = z.infer<typeof audioMasterReceiptSchema>;

export function frameToSample(
  frame: number,
  fps: number,
  sampleRate = 48_000,
): number {
  if (
    !Number.isInteger(frame) ||
    frame < 0 ||
    !Number.isInteger(fps) ||
    fps <= 0
  )
    throw new Error("Frame and fps must be positive integers.");
  const numerator = frame * sampleRate;
  if (numerator % fps !== 0)
    throw new Error(
      `Frame ${frame} at ${fps}fps does not resolve to an integer ${sampleRate}Hz sample boundary.`,
    );
  return numerator / fps;
}

export function createAudioMixPlan(
  input: z.input<typeof audioMixPlanDraftSchema>,
): AudioMixPlan {
  const draft = audioMixPlanDraftSchema.parse(input);
  return audioMixPlanSchema.parse({
    ...draft,
    contentHash: hashCanonical(draft),
  });
}
