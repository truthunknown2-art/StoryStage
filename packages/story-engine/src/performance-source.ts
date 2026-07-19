import { z } from "zod";
import { hashCanonical } from "./canonical-hash";
import { hashSchema, identifierSchema } from "./model";

export const performanceViewSchema = z.enum([
  "profile-left",
  "profile-right",
  "three-quarter-left",
  "three-quarter-right",
  "front",
  "back",
]);

export const performanceSegmentSchema = z
  .object({
    name: z.enum([
      "anticipation",
      "action",
      "overshoot",
      "settle",
      "hold",
      "locomotion",
    ]),
    startFrame: z.number().int().nonnegative(),
    endFrame: z.number().int().positive(),
  })
  .strict()
  .refine((phase) => phase.endFrame > phase.startFrame, {
    message: "Performance phases must have positive duration.",
  });

const atlasCycleSourceSchema = z
  .object({
    kind: z.literal("atlas-cycle"),
    clipId: identifierSchema,
    view: performanceViewSchema,
    frameCount: z.number().int().min(4),
    drive: z.literal("root-distance"),
    loop: z.literal(true),
    rootDistancePerLoop: z.number().positive(),
    footContactFrames: z.array(z.number().int().nonnegative()).min(1),
  })
  .strict();

const drawingSequenceSourceSchema = z
  .object({
    kind: z.literal("drawing-sequence"),
    clipId: identifierSchema,
    view: performanceViewSchema,
    frameCount: z.number().int().min(4),
    loop: z.literal(false),
    authoredPhases: z
      .array(
        z.enum(["anticipation", "action", "overshoot", "settle", "hold"]),
      )
      .min(3),
  })
  .strict()
  .superRefine((source, context) => {
    for (const required of ["action", "settle"] as const) {
      if (!source.authoredPhases.includes(required))
        context.addIssue({
          code: "custom",
          path: ["authoredPhases"],
          message: `Drawing sequences require an authored ${required} phase.`,
        });
    }
  });

const articulatedPerformanceSourceSchema = z
  .object({
    kind: z.literal("articulated-performance"),
    rigId: identifierSchema,
    view: performanceViewSchema,
    channels: z
      .array(
        z.enum([
          "root",
          "torso",
          "head",
          "gaze",
          "blink",
          "mouth",
          "left-arm",
          "right-arm",
          "left-leg",
          "right-leg",
          "secondary",
        ]),
      )
      .min(2),
  })
  .strict();

const livingHoldSourceSchema = z
  .object({
    kind: z.literal("living-hold"),
    drawingAssetId: identifierSchema,
    view: performanceViewSchema,
    allowedDurationInFrames: z.number().int().positive().max(60),
    internalChannels: z
      .array(
        z.enum([
          "gaze",
          "blink",
          "mouth",
          "head",
          "breathing",
          "secondary",
        ]),
      )
      .min(2),
  })
  .strict();

export const performanceSourceSchema = z.discriminatedUnion("kind", [
  atlasCycleSourceSchema,
  drawingSequenceSourceSchema,
  articulatedPerformanceSourceSchema,
  livingHoldSourceSchema,
]);

const shotPerformanceProgramFields = {
  schemaVersion: z.literal("1.0"),
  id: identifierSchema,
  shotId: identifierSchema,
  performerId: identifierSchema,
  sources: z.array(performanceSourceSchema).min(1),
  phases: z.array(performanceSegmentSchema).min(1),
  entranceContinuityHash: hashSchema,
  exitContinuityHash: hashSchema,
  fallbackPolicy: z.literal("forbid-whole-body-pose-swap"),
};

export const shotPerformanceProgramDraftSchema = z
  .object(shotPerformanceProgramFields)
  .strict()
  .superRefine((program, context) => {
    for (const [index, phase] of program.phases.entries()) {
      const next = program.phases[index + 1];
      if (next && next.startFrame < phase.endFrame)
        context.addIssue({
          code: "custom",
          path: ["phases", index + 1, "startFrame"],
          message: "Performance phases cannot overlap.",
        });
    }
    const livingHold = program.sources.find(
      (source) => source.kind === "living-hold",
    );
    if (
      livingHold &&
      program.phases.some(
        (phase) =>
          phase.name !== "hold" &&
          phase.endFrame - phase.startFrame >
            livingHold.allowedDurationInFrames,
      )
    )
      context.addIssue({
        code: "custom",
        path: ["sources"],
        message:
          "A living hold cannot silently carry a long major-action phase.",
      });
  });

export const shotPerformanceProgramSchema = z
  .object({ ...shotPerformanceProgramFields, contentHash: hashSchema })
  .strict()
  .superRefine((program, context) => {
    const { contentHash, ...draft } = program;
    const draftResult = shotPerformanceProgramDraftSchema.safeParse(draft);
    if (!draftResult.success)
      for (const issue of draftResult.error.issues)
        context.addIssue({ ...issue, path: issue.path });
    if (hashCanonical(draft) !== contentHash)
      context.addIssue({
        code: "custom",
        path: ["contentHash"],
        message: "Shot performance program hash is invalid.",
      });
  });

export function createShotPerformanceProgram(
  input: z.input<typeof shotPerformanceProgramDraftSchema>,
) {
  const draft = shotPerformanceProgramDraftSchema.parse(input);
  return shotPerformanceProgramSchema.parse({
    ...draft,
    contentHash: hashCanonical(draft),
  });
}

export type PerformanceSource = z.infer<typeof performanceSourceSchema>;
export type ShotPerformanceProgram = z.infer<
  typeof shotPerformanceProgramSchema
>;
