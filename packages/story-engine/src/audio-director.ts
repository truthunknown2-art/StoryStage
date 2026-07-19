import { z } from "zod";
import { hashCanonical } from "./canonical-hash";
import { hashSchema, identifierSchema } from "./model";
import {
  directorPlanSchema,
  type DirectorPlan,
} from "./director/director-plan";
import {
  timingSolutionSchema,
  type TimingSolution,
} from "./director/timing-solution";

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
/** @deprecated Provider catalogues belong to adapter packages, not the domain. */
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
    /**
     * Opaque adapter identity. Domain contracts deliberately do not encode a
     * provider catalogue: adapters can be replaced without changing a cue.
     */
    providerAdapterId: identifierSchema,
    sourceContentHash: hashSchema,
    canonicalContentHash: hashSchema,
    relativeFile: z.string().min(1),
    mediaType: z.literal("audio/wav"),
    sampleRate: z.literal(48_000),
    channels: z.union([z.literal(1), z.literal(2)]),
    sampleCount: z.number().int().positive(),
    approvalStatus: z.literal("approved"),
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

const spokenLineFields = {
  schemaVersion: z.literal("1.0"),
  lineId: identifierSchema,
  productionId: identifierSchema,
  sceneId: identifierSchema,
  beatId: identifierSchema,
  speakerId: identifierSchema.nullable(),
  role: z.enum(["dialogue", "narration"]),
  text: z.string().trim().min(1),
};

export const spokenLineDraftSchema = z.object(spokenLineFields).strict();

export const spokenLineSchema = z
  .object({ ...spokenLineFields, contentHash: hashSchema })
  .strict()
  .superRefine((line, context) => {
    const { contentHash, ...draft } = line;
    if (hashCanonical(draft) !== contentHash)
      context.addIssue({
        code: "custom",
        path: ["contentHash"],
        message: "Spoken line hash is invalid.",
      });
  });

export function sealSpokenLine(
  raw: z.input<typeof spokenLineDraftSchema>,
): SpokenLine {
  const draft = spokenLineDraftSchema.parse(raw);
  return spokenLineSchema.parse({
    ...draft,
    contentHash: hashCanonical(draft),
  });
}

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

const mixTargetSchema = z
  .object({
    integratedLufs: z.number().min(-40).max(-5),
    truePeakDbtp: z.number().min(-12).max(0),
    channels: z.literal(2),
  })
  .strict();

/** Human-authored intent. It contains no absolute timeline authority. */
export const authoredAudioCueIntentSchema = z
  .object({
    schemaVersion: z.literal("1.0"),
    id: identifierSchema,
    productionId: identifierSchema,
    sceneId: identifierSchema,
    beatId: identifierSchema,
    shotId: identifierSchema.nullable(),
    lineId: identifierSchema.nullable(),
    anchorEventId: identifierSchema,
    offsetFrames: z.number().int(),
    approvedAssetVersionId: identifierSchema,
    approvedAssetContentHash: hashSchema,
    role: audioRoleSchema,
    event: z.enum([
      "prelap",
      "on-action",
      "impact",
      "reaction",
      "tail",
      "continuous",
    ]),
    trimStartSample: z.number().int().nonnegative().default(0),
    trimEndSampleExclusive: z
      .number()
      .int()
      .positive()
      .nullable()
      .default(null),
    bus: z.enum(["dialogue", "effects", "music"]),
    gainDb: z.number().min(-96).max(24),
    pan: z.number().min(-1).max(1),
    fadeInFrames: z.number().int().nonnegative(),
    fadeOutFrames: z.number().int().nonnegative(),
    duckingGroup: z
      .enum(["dialogue", "music", "effects"])
      .nullable()
      .default(null),
  })
  .strict()
  .superRefine((cue, context) => {
    if (
      (cue.role === "dialogue" || cue.role === "narration") &&
      cue.lineId === null
    )
      context.addIssue({
        code: "custom",
        path: ["lineId"],
        message: "Spoken cues must bind a stable lineId.",
      });
    if (
      cue.trimEndSampleExclusive !== null &&
      cue.trimEndSampleExclusive <= cue.trimStartSample
    )
      context.addIssue({
        code: "custom",
        path: ["trimEndSampleExclusive"],
        message: "Audio trim must have positive duration.",
      });
  });

export const compiledAudioCueSchema = z
  .object({
    schemaVersion: z.literal("1.0"),
    id: identifierSchema,
    productionId: identifierSchema,
    sceneId: identifierSchema,
    beatId: identifierSchema,
    shotId: identifierSchema.nullable(),
    lineId: identifierSchema.nullable(),
    anchorEventId: identifierSchema,
    offsetFrames: z.number().int(),
    approvedAssetVersionId: identifierSchema,
    assetContentHash: hashSchema,
    role: audioRoleSchema,
    event: z.enum([
      "prelap",
      "on-action",
      "impact",
      "reaction",
      "tail",
      "continuous",
    ]),
    resolvedStartFrame: z.number().int().nonnegative(),
    startSample: z.number().int().nonnegative(),
    durationFrames: z.number().int().positive(),
    trimStartSample: z.number().int().nonnegative(),
    trimEndSampleExclusive: z.number().int().positive(),
    bus: z.enum(["dialogue", "effects", "music"]),
    gainDb: z.number().min(-96).max(24),
    pan: z.number().min(-1).max(1),
    fadeInFrames: z.number().int().nonnegative(),
    fadeOutFrames: z.number().int().nonnegative(),
    duckingGroup: z.enum(["dialogue", "music", "effects"]).nullable(),
  })
  .strict()
  .superRefine((cue, context) => {
    if (cue.fadeInFrames + cue.fadeOutFrames > cue.durationFrames)
      context.addIssue({
        code: "custom",
        path: ["fadeOutFrames"],
        message: "Cue fades cannot exceed cue duration.",
      });
  });

const compiledAudioMixPlanFields = {
  schemaVersion: z.literal("2.0"),
  id: identifierSchema,
  productionId: identifierSchema,
  directorPlanContentHash: hashSchema,
  timingSolutionContentHash: hashSchema,
  fps: z.number().int().positive(),
  sampleRate: z.literal(48_000),
  durationInFrames: z.number().int().positive(),
  spokenLineContentHashes: z.array(hashSchema),
  cues: z.array(compiledAudioCueSchema),
  target: mixTargetSchema,
};

export const compiledAudioMixPlanDraftSchema = z
  .object(compiledAudioMixPlanFields)
  .strict()
  .superRefine((plan, context) => {
    const cueIds = new Set<string>();
    plan.cues.forEach((cue, index) => {
      if (cueIds.has(cue.id))
        context.addIssue({
          code: "custom",
          path: ["cues", index, "id"],
          message: `Duplicate cue id ${cue.id}.`,
        });
      cueIds.add(cue.id);
      if (cue.productionId !== plan.productionId)
        context.addIssue({
          code: "custom",
          path: ["cues", index, "productionId"],
          message: "Cue production must match its mix plan.",
        });
      if (cue.resolvedStartFrame + cue.durationFrames > plan.durationInFrames)
        context.addIssue({
          code: "custom",
          path: ["cues", index, "durationFrames"],
          message: "Cue extends beyond the production duration.",
        });
      if (
        cue.startSample !==
        frameToSample(cue.resolvedStartFrame, plan.fps, plan.sampleRate)
      )
        context.addIssue({
          code: "custom",
          path: ["cues", index, "startSample"],
          message: "Cue start sample is not frame accurate.",
        });
    });
  });

export const compiledAudioMixPlanSchema = z
  .object({ ...compiledAudioMixPlanFields, contentHash: hashSchema })
  .strict()
  .superRefine((plan, context) => {
    const { contentHash, ...draft } = plan;
    const result = compiledAudioMixPlanDraftSchema.safeParse(draft);
    if (!result.success)
      result.error.issues.forEach((issue) =>
        context.addIssue({
          code: "custom",
          path: issue.path,
          message: issue.message,
        }),
      );
    if (hashCanonical(draft) !== contentHash)
      context.addIssue({
        code: "custom",
        path: ["contentHash"],
        message: "Compiled audio mix plan hash is invalid.",
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
      if (cue.productionId !== plan.productionId)
        context.addIssue({
          code: "custom",
          path: ["cues", index, "productionId"],
          message: "Cue production must match its mix plan.",
        });
      if (cue.startFrame + cue.durationInFrames > plan.durationInFrames)
        context.addIssue({
          code: "custom",
          path: ["cues", index, "durationInFrames"],
          message: "Cue extends beyond the production duration.",
        });
      try {
        frameToSample(cue.startFrame, plan.fps, plan.sampleRate);
        frameToSample(
          cue.startFrame + cue.durationInFrames,
          plan.fps,
          plan.sampleRate,
        );
      } catch (error) {
        context.addIssue({
          code: "custom",
          path: ["cues", index, "startFrame"],
          message:
            error instanceof Error
              ? error.message
              : "Cue does not resolve to exact sample boundaries.",
        });
      }
    }
  });

export const legacyAudioMixPlanSchema = z
  .object({ ...audioMixPlanFields, contentHash: hashSchema })
  .strict()
  .superRefine((plan, context) => {
    const { contentHash, ...draft } = plan;
    const draftResult = audioMixPlanDraftSchema.safeParse(draft);
    if (!draftResult.success)
      for (const issue of draftResult.error.issues)
        context.addIssue({ ...issue, path: issue.path });
    if (hashCanonical(draft) !== contentHash)
      context.addIssue({
        code: "custom",
        path: ["contentHash"],
        message: "Audio mix plan hash is invalid.",
      });
  });

/**
 * Canonical read surface during the 1.0 -> 2.0 migration. New production code
 * must emit 2.0 through compileAudioMixPlan; 1.0 remains readable only so old
 * saved projects do not become corrupt overnight.
 */
export const audioMixPlanSchema = z.union([
  compiledAudioMixPlanSchema,
  legacyAudioMixPlanSchema,
]);

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
export type SpokenLine = z.infer<typeof spokenLineSchema>;
export type AuthoredAudioCueIntent = z.infer<
  typeof authoredAudioCueIntentSchema
>;
export type CompiledAudioCue = z.infer<typeof compiledAudioCueSchema>;
export type CompiledAudioMixPlan = z.infer<typeof compiledAudioMixPlanSchema>;
export type LegacyAudioMixPlan = z.infer<typeof legacyAudioMixPlanSchema>;
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
): LegacyAudioMixPlan {
  const draft = audioMixPlanDraftSchema.parse(input);
  return legacyAudioMixPlanSchema.parse({
    ...draft,
    contentHash: hashCanonical(draft),
  });
}

export type CompileAudioMixPlanInput = {
  id: string;
  productionId: string;
  directorPlan: DirectorPlan;
  timingSolution: TimingSolution;
  directorPlanContentHash: string;
  timingSolutionContentHash: string;
  fps: number;
  spokenLines: readonly SpokenLine[];
  cueIntents: readonly z.input<typeof authoredAudioCueIntentSchema>[];
  approvedAssetVersions: readonly z.input<
    typeof approvedAudioAssetVersionSchema
  >[];
  target: z.input<typeof mixTargetSchema>;
};

const parseApprovedAssetForCompilation = (
  raw: z.input<typeof approvedAudioAssetVersionSchema>,
): ApprovedAudioAssetVersion => {
  const candidate = raw as Record<string, unknown>;
  if (
    candidate.approvalStatus !== undefined &&
    candidate.approvalStatus !== "approved"
  )
    throw new Error(
      `Audio asset ${String(candidate.id)} is not an approved asset version.`,
    );
  if (candidate.sampleRate !== 48_000)
    throw new Error(
      `Audio asset ${String(candidate.id)} has the wrong sample rate; 48000Hz is required.`,
    );
  return approvedAudioAssetVersionSchema.parse(raw);
};

/**
 * Resolves authored event-relative intent against one exact Director timeline.
 * The compiler has no provider behavior and performs no I/O.
 */
export function compileAudioMixPlan(
  input: CompileAudioMixPlanInput,
): CompiledAudioMixPlan {
  const directorPlan = directorPlanSchema.parse(input.directorPlan);
  const timingSolution = timingSolutionSchema.parse(input.timingSolution);

  if (input.directorPlanContentHash !== directorPlan.contentHash)
    throw new Error("Audio compilation received a stale Director plan hash.");
  if (input.timingSolutionContentHash !== timingSolution.contentHash)
    throw new Error("Audio compilation received a stale timing solution hash.");
  if (timingSolution.directorPlanContentHash !== directorPlan.contentHash)
    throw new Error("Audio compilation timing is stale for the Director plan.");

  const samplesPerFrame = frameToSample(1, input.fps, 48_000);
  const lineById = new Map<string, SpokenLine>();
  const spokenLines = input.spokenLines.map((raw) =>
    spokenLineSchema.parse(raw),
  );
  for (const line of spokenLines) {
    if (lineById.has(line.lineId))
      throw new Error(`Duplicate spoken line ${line.lineId}.`);
    if (line.productionId !== input.productionId)
      throw new Error(
        `Spoken line ${line.lineId} belongs to another production.`,
      );
    lineById.set(line.lineId, line);
  }

  const assetById = new Map<string, ApprovedAudioAssetVersion>();
  for (const raw of input.approvedAssetVersions) {
    const asset = parseApprovedAssetForCompilation(raw);
    if (assetById.has(asset.id))
      throw new Error(`Duplicate approved audio asset version ${asset.id}.`);
    assetById.set(asset.id, asset);
  }

  const eventById = new Map(
    directorPlan.events.map((event) => [event.id, event] as const),
  );
  const frameByEventId = new Map(
    timingSolution.resolvedEvents.map(
      (event) => [event.eventId, event.frame] as const,
    ),
  );
  const cueIds = new Set<string>();
  const cues = input.cueIntents.map((raw): CompiledAudioCue => {
    const intent = authoredAudioCueIntentSchema.parse(raw);
    if (cueIds.has(intent.id))
      throw new Error(`Duplicate cue id ${intent.id}.`);
    cueIds.add(intent.id);
    if (intent.productionId !== input.productionId)
      throw new Error(`Cue ${intent.id} belongs to another production.`);

    const event = eventById.get(intent.anchorEventId);
    const anchorFrame = frameByEventId.get(intent.anchorEventId);
    if (!event || anchorFrame === undefined)
      throw new Error(
        `Cue ${intent.id} references missing anchor event ${intent.anchorEventId}.`,
      );
    if (event.sceneId !== intent.sceneId || event.beatId !== intent.beatId)
      throw new Error(
        `Cue ${intent.id} anchor does not belong to its authored scene and beat.`,
      );

    if (intent.lineId !== null) {
      const line = lineById.get(intent.lineId);
      if (!line)
        throw new Error(`Cue ${intent.id} references missing spoken line.`);
      if (
        line.sceneId !== intent.sceneId ||
        line.beatId !== intent.beatId ||
        line.role !== intent.role
      )
        throw new Error(`Cue ${intent.id} does not match its spoken line.`);
    }

    const asset = assetById.get(intent.approvedAssetVersionId);
    if (!asset)
      throw new Error(
        `Cue ${intent.id} references a missing approved audio asset version.`,
      );
    if (asset.canonicalContentHash !== intent.approvedAssetContentHash)
      throw new Error(
        `Cue ${intent.id} references an audio asset with the wrong hash.`,
      );

    const trimEnd = intent.trimEndSampleExclusive ?? asset.sampleCount;
    if (
      intent.trimStartSample >= asset.sampleCount ||
      trimEnd > asset.sampleCount
    )
      throw new Error(`Cue ${intent.id} trim is out of bounds for its asset.`);
    const trimmedSamples = trimEnd - intent.trimStartSample;
    if (trimmedSamples <= 0 || trimmedSamples % samplesPerFrame !== 0)
      throw new Error(
        `Cue ${intent.id} asset duration does not resolve to exact frame boundaries.`,
      );

    const resolvedStartFrame = anchorFrame + intent.offsetFrames;
    const durationFrames = trimmedSamples / samplesPerFrame;
    if (
      resolvedStartFrame < 0 ||
      resolvedStartFrame + durationFrames > timingSolution.durationInFrames
    )
      throw new Error(`Cue ${intent.id} is out of bounds for the production.`);

    return compiledAudioCueSchema.parse({
      schemaVersion: "1.0",
      id: intent.id,
      productionId: intent.productionId,
      sceneId: intent.sceneId,
      beatId: intent.beatId,
      shotId: intent.shotId,
      lineId: intent.lineId,
      anchorEventId: intent.anchorEventId,
      offsetFrames: intent.offsetFrames,
      approvedAssetVersionId: intent.approvedAssetVersionId,
      assetContentHash: asset.canonicalContentHash,
      role: intent.role,
      event: intent.event,
      resolvedStartFrame,
      startSample: frameToSample(resolvedStartFrame, input.fps, 48_000),
      durationFrames,
      trimStartSample: intent.trimStartSample,
      trimEndSampleExclusive: trimEnd,
      bus: intent.bus,
      gainDb: intent.gainDb,
      pan: intent.pan,
      fadeInFrames: intent.fadeInFrames,
      fadeOutFrames: intent.fadeOutFrames,
      duckingGroup: intent.duckingGroup,
    });
  });

  const draft = compiledAudioMixPlanDraftSchema.parse({
    schemaVersion: "2.0",
    id: input.id,
    productionId: input.productionId,
    directorPlanContentHash: directorPlan.contentHash,
    timingSolutionContentHash: timingSolution.contentHash,
    fps: input.fps,
    sampleRate: 48_000,
    durationInFrames: timingSolution.durationInFrames,
    spokenLineContentHashes: spokenLines
      .map((line) => line.contentHash)
      .sort((left, right) => left.localeCompare(right)),
    cues: cues.sort(
      (left, right) =>
        left.resolvedStartFrame - right.resolvedStartFrame ||
        left.id.localeCompare(right.id),
    ),
    target: input.target,
  });
  return compiledAudioMixPlanSchema.parse({
    ...draft,
    contentHash: hashCanonical(draft),
  });
}
