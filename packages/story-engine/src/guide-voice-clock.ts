import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex } from "@noble/hashes/utils.js";
import { z } from "zod";
import { canonicalJson, hashCanonical } from "./canonical-hash";
import { hashSchema, identifierSchema } from "./model";
import { getScriptContentHash } from "./script-approval";
import { inspectPcmWav } from "./wav-audio";

const safeIntegerSchema = z.number().int().nonnegative().safe();
const positiveSafeIntegerSchema = z.number().int().positive().safe();

export const guideVoiceClauseSchema = z
  .object({
    clauseId: identifierSchema,
    sourceRange: z
      .object({
        start: safeIntegerSchema,
        end: positiveSafeIntegerSchema,
      })
      .strict()
      .refine((range) => range.end > range.start, {
        message: "Guide clause source range must have positive length.",
      }),
    speakerRef: identifierSchema.nullable(),
    startSample: safeIntegerSchema,
    endSampleExclusive: positiveSafeIntegerSchema,
  })
  .strict()
  .refine((clause) => clause.endSampleExclusive > clause.startSample, {
    message: "Guide clause sample range must have positive length.",
  });

const guideVoiceClockFields = {
  schemaVersion: z.literal("1.0"),
  scriptContentHash: hashSchema,
  audioContentHash: hashSchema,
  codec: z.literal("wav"),
  sampleRate: z.number().int().min(8_000).max(192_000),
  channels: z.union([z.literal(1), z.literal(2)]),
  durationSamples: positiveSafeIntegerSchema,
  clauses: z.array(guideVoiceClauseSchema).min(1),
  authority: z.literal("guide-timing-only"),
  productionBindable: z.literal(false),
};

const validateGuideVoiceClockDraft: Parameters<
  ReturnType<typeof z.object<typeof guideVoiceClockFields>>["superRefine"]
>[0] = (clock, context) => {
  const clauseIds = new Set<string>();
  let previousSourceEnd = 0;
  let previousSampleEnd = 0;
  clock.clauses.forEach((clause, index) => {
    if (clauseIds.has(clause.clauseId))
      context.addIssue({
        code: "custom",
        path: ["clauses", index, "clauseId"],
        message: "Guide clause IDs must be unique.",
      });
    clauseIds.add(clause.clauseId);
    if (index > 0 && clause.sourceRange.start < previousSourceEnd)
      context.addIssue({
        code: "custom",
        path: ["clauses", index, "sourceRange"],
        message:
          "Guide clause source ranges must be ordered and non-overlapping.",
      });
    if (index > 0 && clause.startSample < previousSampleEnd)
      context.addIssue({
        code: "custom",
        path: ["clauses", index, "startSample"],
        message:
          "Guide clause sample ranges must be ordered and non-overlapping.",
      });
    if (clause.endSampleExclusive > clock.durationSamples)
      context.addIssue({
        code: "custom",
        path: ["clauses", index, "endSampleExclusive"],
        message: "Guide clause exceeds the guide audio duration.",
      });
    previousSourceEnd = clause.sourceRange.end;
    previousSampleEnd = clause.endSampleExclusive;
  });
};

export const guideVoiceClockDraftSchema = z
  .object(guideVoiceClockFields)
  .strict()
  .superRefine(validateGuideVoiceClockDraft);

export const guideVoiceClockSchema = z
  .object({ ...guideVoiceClockFields, contentHash: hashSchema })
  .strict()
  .superRefine((clock, context) => {
    const { contentHash, ...draft } = clock;
    const draftResult = guideVoiceClockDraftSchema.safeParse(draft);
    if (!draftResult.success)
      draftResult.error.issues.forEach((issue) =>
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
        message: "Guide voice clock hash is invalid.",
      });
  });

export type GuideVoiceClause = z.infer<typeof guideVoiceClauseSchema>;
export type GuideVoiceClockDraft = z.infer<typeof guideVoiceClockDraftSchema>;
export type GuideVoiceClockV1 = z.infer<typeof guideVoiceClockSchema>;
export type GuideVoiceClockSources = {
  script: string;
  audioBytes: Uint8Array;
};

const guideVoiceClockExpectationSchema = z.union([
  z.object({ expectedContentHash: hashSchema }).strict(),
  z
    .object({ expectedClauses: z.array(guideVoiceClauseSchema).min(1) })
    .strict(),
]);

export type GuideVoiceClockExpectation = z.infer<
  typeof guideVoiceClockExpectationSchema
>;

export function hashGuideAudioBytes(audioBytes: Uint8Array): string {
  return bytesToHex(sha256(audioBytes));
}

function assertClauseSourceCoverage(
  clauses: readonly GuideVoiceClause[],
  script: string,
): void {
  let cursor = 0;
  clauses.forEach((clause, index) => {
    if (clause.sourceRange.end > script.length)
      throw new Error(`Guide clause ${index + 1} exceeds the source script.`);
    if (/\S/u.test(script.slice(cursor, clause.sourceRange.start)))
      throw new Error(
        `Guide clauses omit non-whitespace script content before clause ${index + 1}.`,
      );
    if (!script.slice(clause.sourceRange.start, clause.sourceRange.end).trim())
      throw new Error(
        `Guide clause ${index + 1} does not bind visible script text.`,
      );
    cursor = clause.sourceRange.end;
  });
  if (/\S/u.test(script.slice(cursor)))
    throw new Error(
      "Guide clauses omit non-whitespace script content after the final clause.",
    );
}

function inspectGuideWav(audioBytes: Uint8Array) {
  const metadata = inspectPcmWav(audioBytes);
  const blockAlign = (metadata.channels * metadata.bitsPerSample) / 8;
  if (!Number.isSafeInteger(blockAlign) || blockAlign <= 0)
    throw new Error("Guide WAV block alignment is invalid.");
  if (metadata.dataBytes % blockAlign !== 0)
    throw new Error("Guide WAV data does not end on a complete sample frame.");
  return {
    sampleRate: metadata.sampleRate,
    channels: metadata.channels,
    durationSamples: metadata.dataBytes / blockAlign,
  };
}

export function sealGuideVoiceClock(
  sources: GuideVoiceClockSources,
  clauses: readonly GuideVoiceClause[],
): GuideVoiceClockV1 {
  if (!sources.script.length)
    throw new Error("Guide script must not be empty.");
  const wav = inspectGuideWav(sources.audioBytes);
  const draft = guideVoiceClockDraftSchema.parse({
    schemaVersion: "1.0",
    scriptContentHash: getScriptContentHash(sources.script),
    audioContentHash: hashGuideAudioBytes(sources.audioBytes),
    codec: "wav",
    ...wav,
    clauses,
    authority: "guide-timing-only",
    productionBindable: false,
  });
  assertClauseSourceCoverage(draft.clauses, sources.script);
  return guideVoiceClockSchema.parse({
    ...draft,
    contentHash: hashCanonical(draft),
  });
}

function assertGuideVoiceClockSources(
  rawClock: GuideVoiceClockV1,
  sources: GuideVoiceClockSources,
): GuideVoiceClockV1 {
  const clock = guideVoiceClockSchema.parse(rawClock);
  if (clock.scriptContentHash !== getScriptContentHash(sources.script))
    throw new Error(
      "Guide voice clock does not match the exact source script.",
    );
  if (clock.audioContentHash !== hashGuideAudioBytes(sources.audioBytes))
    throw new Error("Guide voice clock does not match the exact WAV bytes.");
  const wav = inspectGuideWav(sources.audioBytes);
  if (
    clock.sampleRate !== wav.sampleRate ||
    clock.channels !== wav.channels ||
    clock.durationSamples !== wav.durationSamples
  )
    throw new Error("Guide voice clock does not match the WAV metadata.");
  assertClauseSourceCoverage(clock.clauses, sources.script);
  return clock;
}

export function assertGuideVoiceClockMatchesSources(
  rawClock: GuideVoiceClockV1,
  sources: GuideVoiceClockSources,
  rawExpectation: GuideVoiceClockExpectation,
): GuideVoiceClockV1 {
  const clock = assertGuideVoiceClockSources(rawClock, sources);
  const expectation = guideVoiceClockExpectationSchema.parse(rawExpectation);
  if (
    "expectedContentHash" in expectation &&
    clock.contentHash !== expectation.expectedContentHash
  )
    throw new Error(
      "Guide voice clock does not match the frozen expected clock hash.",
    );
  if (
    "expectedClauses" in expectation &&
    canonicalJson(clock.clauses) !== canonicalJson(expectation.expectedClauses)
  )
    throw new Error(
      "Guide voice clock does not match the frozen expected clause grid.",
    );
  return clock;
}

export function serializeGuideVoiceClock(clock: GuideVoiceClockV1): string {
  return canonicalJson(guideVoiceClockSchema.parse(clock));
}

export function restoreGuideVoiceClock(
  serialized: string,
  sources: GuideVoiceClockSources,
  expectation: GuideVoiceClockExpectation,
): GuideVoiceClockV1 {
  return assertGuideVoiceClockMatchesSources(
    guideVoiceClockSchema.parse(JSON.parse(serialized) as unknown),
    sources,
    expectation,
  );
}

const guideVoiceTimingBasisFields = {
  schemaVersion: z.literal("1.0"),
  kind: z.literal("guide-audio"),
  guideVoiceClockContentHash: hashSchema,
  audioContentHash: hashSchema,
  sampleRate: z.number().int().min(8_000).max(192_000),
  durationSamples: positiveSafeIntegerSchema,
  fps: z.number().int().min(1).max(240),
  samplesPerFrame: positiveSafeIntegerSchema,
  authority: z.literal("guide-timing-only"),
  productionBindable: z.literal(false),
};

const guideVoiceTimingBasisDraftSchema = z
  .object(guideVoiceTimingBasisFields)
  .strict()
  .superRefine((basis, context) => {
    if (basis.sampleRate % basis.fps !== 0)
      context.addIssue({
        code: "custom",
        path: ["fps"],
        message:
          "Guide sample rate must resolve to an integer number of samples per frame.",
      });
    if (basis.samplesPerFrame !== basis.sampleRate / basis.fps)
      context.addIssue({
        code: "custom",
        path: ["samplesPerFrame"],
        message: "Guide samples-per-frame value is not derived from its FPS.",
      });
    if (basis.durationSamples % basis.samplesPerFrame !== 0)
      context.addIssue({
        code: "custom",
        path: ["durationSamples"],
        message: "Guide duration ends on a fractional frame boundary.",
      });
  });

export const guideVoiceTimingBasisSchema = z
  .object({ ...guideVoiceTimingBasisFields, contentHash: hashSchema })
  .strict()
  .superRefine((basis, context) => {
    const { contentHash, ...draft } = basis;
    const draftResult = guideVoiceTimingBasisDraftSchema.safeParse(draft);
    if (!draftResult.success)
      draftResult.error.issues.forEach((issue) =>
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
        message: "Guide timing basis hash is invalid.",
      });
  });

export type GuideVoiceTimingBasisV1 = z.infer<
  typeof guideVoiceTimingBasisSchema
>;

const guideVoiceTimingBasisExpectationSchema = z.union([
  z.object({ expectedContentHash: hashSchema }).strict(),
  z.object({ expectedFps: z.number().int().min(1).max(240) }).strict(),
]);

export type GuideVoiceTimingBasisExpectation = z.infer<
  typeof guideVoiceTimingBasisExpectationSchema
>;

export function assertGuideVoiceTimingBasisMatchesClock(
  rawBasis: GuideVoiceTimingBasisV1,
  rawClock: GuideVoiceClockV1,
  rawExpectation: GuideVoiceTimingBasisExpectation,
): GuideVoiceTimingBasisV1 {
  const basis = guideVoiceTimingBasisSchema.parse(rawBasis);
  const clock = guideVoiceClockSchema.parse(rawClock);
  if (
    basis.guideVoiceClockContentHash !== clock.contentHash ||
    basis.audioContentHash !== clock.audioContentHash ||
    basis.sampleRate !== clock.sampleRate ||
    basis.durationSamples !== clock.durationSamples
  )
    throw new Error("Guide timing basis does not match its guide voice clock.");
  const expectation =
    guideVoiceTimingBasisExpectationSchema.parse(rawExpectation);
  if (
    "expectedContentHash" in expectation &&
    basis.contentHash !== expectation.expectedContentHash
  )
    throw new Error(
      "Guide timing basis does not match the frozen expected basis hash.",
    );
  if ("expectedFps" in expectation && basis.fps !== expectation.expectedFps)
    throw new Error(
      "Guide timing basis does not match the frozen selected FPS.",
    );
  return basis;
}

export function sealGuideVoiceTimingBasis(
  rawClock: GuideVoiceClockV1,
  sources: GuideVoiceClockSources,
  fps: number,
): GuideVoiceTimingBasisV1 {
  const clock = assertGuideVoiceClockSources(rawClock, sources);
  if (!Number.isSafeInteger(fps) || fps < 1 || fps > 240)
    throw new Error("Guide TimingBasis FPS must be an integer from 1 to 240.");
  if (clock.sampleRate % fps !== 0)
    throw new Error(
      "Guide sample rate must resolve to an integer number of samples per frame.",
    );
  const samplesPerFrame = clock.sampleRate / fps;
  if (clock.durationSamples % samplesPerFrame !== 0)
    throw new Error("Guide duration ends on a fractional frame boundary.");
  const draft = guideVoiceTimingBasisDraftSchema.parse({
    schemaVersion: "1.0",
    kind: "guide-audio",
    guideVoiceClockContentHash: clock.contentHash,
    audioContentHash: clock.audioContentHash,
    sampleRate: clock.sampleRate,
    durationSamples: clock.durationSamples,
    fps,
    samplesPerFrame,
    authority: "guide-timing-only",
    productionBindable: false,
  });
  return guideVoiceTimingBasisSchema.parse({
    ...draft,
    contentHash: hashCanonical(draft),
  });
}

export function serializeGuideVoiceTimingBasis(
  basis: GuideVoiceTimingBasisV1,
): string {
  return canonicalJson(guideVoiceTimingBasisSchema.parse(basis));
}

export function restoreGuideVoiceTimingBasis(
  serialized: string,
  clock: GuideVoiceClockV1,
  sources: GuideVoiceClockSources,
  clockExpectation: GuideVoiceClockExpectation,
  basisExpectation: GuideVoiceTimingBasisExpectation,
): GuideVoiceTimingBasisV1 {
  const verifiedClock = assertGuideVoiceClockMatchesSources(
    clock,
    sources,
    clockExpectation,
  );
  return assertGuideVoiceTimingBasisMatchesClock(
    guideVoiceTimingBasisSchema.parse(JSON.parse(serialized) as unknown),
    verifiedClock,
    basisExpectation,
  );
}

export function guideSampleToFrame(
  sample: number,
  rawBasis: GuideVoiceTimingBasisV1,
): number {
  const basis = guideVoiceTimingBasisSchema.parse(rawBasis);
  if (
    !Number.isSafeInteger(sample) ||
    sample < 0 ||
    sample > basis.durationSamples
  )
    throw new Error("Guide sample boundary is outside the timing basis.");
  if (sample % basis.samplesPerFrame !== 0)
    throw new Error("Guide sample boundary resolves to a fractional frame.");
  return sample / basis.samplesPerFrame;
}

export function guideFrameToSample(
  frame: number,
  rawBasis: GuideVoiceTimingBasisV1,
): number {
  const basis = guideVoiceTimingBasisSchema.parse(rawBasis);
  const durationFrames = basis.durationSamples / basis.samplesPerFrame;
  if (!Number.isSafeInteger(frame) || frame < 0 || frame > durationFrames)
    throw new Error("Guide frame boundary is outside the timing basis.");
  return frame * basis.samplesPerFrame;
}

export type GuideVoiceFrameClause = GuideVoiceClause & {
  startFrame: number;
  endFrameExclusive: number;
};

const guideVoiceFrameBindingExpectationSchema = z
  .object({
    expectedClockContentHash: hashSchema,
    expectedTimingBasisContentHash: hashSchema,
  })
  .strict();

export type GuideVoiceFrameBindingExpectation = z.infer<
  typeof guideVoiceFrameBindingExpectationSchema
>;

export function bindGuideVoiceClockToFrames(
  rawClock: GuideVoiceClockV1,
  rawBasis: GuideVoiceTimingBasisV1,
  rawExpectation: GuideVoiceFrameBindingExpectation,
): GuideVoiceFrameClause[] {
  const clock = guideVoiceClockSchema.parse(rawClock);
  const expectation =
    guideVoiceFrameBindingExpectationSchema.parse(rawExpectation);
  if (clock.contentHash !== expectation.expectedClockContentHash)
    throw new Error(
      "Guide frame binding does not match the frozen expected clock hash.",
    );
  const basis = assertGuideVoiceTimingBasisMatchesClock(rawBasis, clock, {
    expectedContentHash: expectation.expectedTimingBasisContentHash,
  });
  return clock.clauses.map((clause) => ({
    ...clause,
    startFrame: guideSampleToFrame(clause.startSample, basis),
    endFrameExclusive: guideSampleToFrame(clause.endSampleExclusive, basis),
  }));
}

export type GuideClockAbCut = GuideVoiceClockSources & {
  clock: GuideVoiceClockV1;
  timingBasis: GuideVoiceTimingBasisV1;
};

export type GuideClockAbExpectation = GuideVoiceFrameBindingExpectation;

const equalBytes = (left: Uint8Array, right: Uint8Array) =>
  left.byteLength === right.byteLength &&
  left.every((byte, index) => byte === right[index]);

export function assertGuideClockAbEquality(
  left: GuideClockAbCut,
  right: GuideClockAbCut,
  rawExpectation: GuideClockAbExpectation,
): void {
  const expectation =
    guideVoiceFrameBindingExpectationSchema.parse(rawExpectation);
  const clockExpectation = {
    expectedContentHash: expectation.expectedClockContentHash,
  } as const;
  const basisExpectation = {
    expectedContentHash: expectation.expectedTimingBasisContentHash,
  } as const;
  const leftClock = assertGuideVoiceClockMatchesSources(
    left.clock,
    left,
    clockExpectation,
  );
  const rightClock = assertGuideVoiceClockMatchesSources(
    right.clock,
    right,
    clockExpectation,
  );
  const leftBasis = assertGuideVoiceTimingBasisMatchesClock(
    left.timingBasis,
    leftClock,
    basisExpectation,
  );
  const rightBasis = assertGuideVoiceTimingBasisMatchesClock(
    right.timingBasis,
    rightClock,
    basisExpectation,
  );
  bindGuideVoiceClockToFrames(leftClock, leftBasis, expectation);
  bindGuideVoiceClockToFrames(rightClock, rightBasis, expectation);
  const mismatches: string[] = [];
  if (leftClock.scriptContentHash !== rightClock.scriptContentHash)
    mismatches.push("script hash");
  if (leftClock.contentHash !== rightClock.contentHash)
    mismatches.push("clock hash");
  if (
    leftClock.audioContentHash !== rightClock.audioContentHash ||
    !equalBytes(left.audioBytes, right.audioBytes)
  )
    mismatches.push("exact guide WAV bytes/audio hash");
  if (canonicalJson(leftClock.clauses) !== canonicalJson(rightClock.clauses))
    mismatches.push("clause timing grid");
  if (canonicalJson(leftBasis) !== canonicalJson(rightBasis))
    mismatches.push("TimingBasis");
  if (mismatches.length)
    throw new Error(
      `Blind A/B cuts do not share the same guide timing instrument: ${mismatches.join(
        ", ",
      )}.`,
    );
}
