import { z } from "zod";
import { hashCanonical } from "../canonical-hash";
import { hashSchema, identifierSchema } from "../model";
import { directorPlanSchema, type DirectorPlan } from "./director-plan";
import { grammarProfileSchema, type GrammarProfile } from "./grammar-profile";
import { timingSolutionSchema, type TimingSolution } from "./timing-solution";

const directorQualityFindingSchema = z
  .object({
    id: identifierSchema,
    code: z.enum([
      "repeated-shot-signature",
      "repeated-camera-move",
      "centered-staging",
      "uniform-shot-duration",
      "performance-source-repetition",
    ]),
    severity: z.literal("warning"),
    shotIds: z.array(identifierSchema),
    beatIds: z.array(identifierSchema),
    creatorMessage: z.string().min(1),
    technicalMessage: z.string().min(1),
  })
  .strict();

const directorQualityReportFields = {
  schemaVersion: z.literal("1.0"),
  directorPlanContentHash: hashSchema,
  grammarProfileContentHash: hashSchema,
  timingSolutionContentHash: hashSchema.nullable(),
  findings: z.array(directorQualityFindingSchema),
  status: z.enum(["clear", "review-recommended"]),
};

export const directorQualityReportSchema = z
  .object({ ...directorQualityReportFields, contentHash: hashSchema })
  .strict()
  .superRefine((report, context) => {
    const { contentHash, ...draft } = report;
    if (hashCanonical(draft) !== contentHash)
      context.addIssue({
        code: "custom",
        path: ["contentHash"],
        message: "Director quality report hash is invalid.",
      });
    if ((report.findings.length === 0) !== (report.status === "clear"))
      context.addIssue({
        code: "custom",
        path: ["status"],
        message: "Director quality status does not match its findings.",
      });
  });

export type DirectorQualityReport = z.infer<typeof directorQualityReportSchema>;
type Finding = z.infer<typeof directorQualityFindingSchema>;

const makeFinding = (
  code: Finding["code"],
  shotIds: string[],
  beatIds: string[],
  creatorMessage: string,
  technicalMessage: string,
): Finding => ({
  id: `quality-${hashCanonical({ code, shotIds, beatIds }).slice(0, 12)}`,
  code,
  severity: "warning",
  shotIds,
  beatIds,
  creatorMessage,
  technicalMessage,
});

const standardDeviation = (values: number[]) => {
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  return Math.sqrt(
    values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length,
  );
};

export function analyzeDirectorQuality(
  rawPlan: DirectorPlan,
  rawGrammar: GrammarProfile,
  rawTiming?: TimingSolution,
): DirectorQualityReport {
  const plan = directorPlanSchema.parse(rawPlan);
  const grammar = grammarProfileSchema.parse(rawGrammar);
  const timing = rawTiming ? timingSolutionSchema.parse(rawTiming) : undefined;
  if (grammar.contentHash !== plan.grammarProfileContentHash)
    throw new Error(
      "Quality analysis grammar does not match the Director plan.",
    );
  if (timing && timing.directorPlanContentHash !== plan.contentHash)
    throw new Error(
      "Quality analysis timing does not match the Director plan.",
    );

  const findings: Finding[] = [];
  const signature = (shot: DirectorPlan["shots"][number]) =>
    [
      shot.camera.size,
      shot.camera.angle,
      shot.camera.movement,
      shot.composition.focalRegion,
    ].join(":");
  let runStart = 0;
  for (let index = 1; index <= plan.shots.length; index += 1) {
    if (
      index < plan.shots.length &&
      signature(plan.shots[index]!) === signature(plan.shots[runStart]!)
    )
      continue;
    const run = plan.shots.slice(runStart, index);
    if (run.length > grammar.pacing.maximumRepeatedShotSignature)
      findings.push(
        makeFinding(
          "repeated-shot-signature",
          run.map((shot) => shot.id),
          [...new Set(run.flatMap((shot) => shot.beatIds))],
          "Several shots use the same framing and staging in a row. Vary the visual idea or justify the repetition.",
          `${run.length} consecutive shots share signature ${signature(run[0]!)}.`,
        ),
      );
    runStart = index;
  }

  let movementRunStart = 0;
  for (let index = 1; index <= plan.shots.length; index += 1) {
    if (
      index < plan.shots.length &&
      plan.shots[index]!.camera.movement ===
        plan.shots[movementRunStart]!.camera.movement
    )
      continue;
    const run = plan.shots.slice(movementRunStart, index);
    if (run.length > grammar.pacing.maximumRepeatedShotSignature)
      findings.push(
        makeFinding(
          "repeated-camera-move",
          run.map((shot) => shot.id),
          [...new Set(run.flatMap((shot) => shot.beatIds))],
          "The camera repeats the same move too many times. Choose movement from story need, not habit.",
          `${run.length} consecutive shots use ${run[0]!.camera.movement}.`,
        ),
      );
    movementRunStart = index;
  }

  if (plan.shots.length >= 4) {
    const centered = plan.shots.filter(
      (shot) => shot.composition.focalRegion === "center",
    );
    if (centered.length / plan.shots.length >= 0.75)
      findings.push(
        makeFinding(
          "centered-staging",
          centered.map((shot) => shot.id),
          [...new Set(centered.flatMap((shot) => shot.beatIds))],
          "Nearly every shot centers the subject. Use the frame to create direction, anticipation, and visual hierarchy.",
          `${centered.length}/${plan.shots.length} shots use centered focal staging.`,
        ),
      );
  }

  const requirements = plan.beats.flatMap((beat) =>
    beat.performanceRequirements.map((requirement) => ({
      ...requirement,
      beatId: beat.beatId,
    })),
  );
  if (
    requirements.length >= 4 &&
    new Set(requirements.map((requirement) => requirement.source)).size === 1
  ) {
    const beatIds = [
      ...new Set(requirements.map((requirement) => requirement.beatId)),
    ];
    findings.push(
      makeFinding(
        "performance-source-repetition",
        plan.shots
          .filter((shot) =>
            shot.beatIds.some((beatId) => beatIds.includes(beatId)),
          )
          .map((shot) => shot.id),
        beatIds,
        "Every action uses the same animation method. Confirm that each performance source actually fits the action.",
        `${requirements.length} performance requirements all use ${requirements[0]!.source}.`,
      ),
    );
  }

  if (timing && timing.resolvedShots.length >= 5) {
    const durations = timing.resolvedShots.map(
      (shot) => shot.endFrameExclusive - shot.startFrame,
    );
    const mean =
      durations.reduce((sum, value) => sum + value, 0) / durations.length;
    if (standardDeviation(durations) / mean < 0.06)
      findings.push(
        makeFinding(
          "uniform-shot-duration",
          timing.resolvedShots.map((shot) => shot.shotId),
          [...new Set(plan.shots.flatMap((shot) => shot.beatIds))],
          "The cuts land at almost identical intervals. Let actions, reactions, and read time determine each cut.",
          `Shot-duration coefficient of variation is ${(standardDeviation(durations) / mean).toFixed(3)}.`,
        ),
      );
  }

  const draft = {
    schemaVersion: "1.0" as const,
    directorPlanContentHash: plan.contentHash,
    grammarProfileContentHash: grammar.contentHash,
    timingSolutionContentHash: timing?.contentHash ?? null,
    findings,
    status:
      findings.length === 0
        ? ("clear" as const)
        : ("review-recommended" as const),
  };
  return directorQualityReportSchema.parse({
    ...draft,
    contentHash: hashCanonical(draft),
  });
}
