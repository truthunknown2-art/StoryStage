export type CandidateRigReviewEvaluatorInput = {
  mode: "clean" | "overlay" | "motion";
  localFrame: number;
  actionPhase: string;
  motionMode: string;
  gazeVectorLocal: { x: number; y: number } | null;
  visemeId: string | null;
  program: {
    partIds: string[];
    socketIds: string[];
    semanticRoles: Array<{
      componentId: string;
      semanticRole: string;
      kind: "part" | "exposure";
    }>;
  };
};

const roundEvaluatorValue = (value: number) => Math.round(value * 1e6) / 1e6;

/**
 * The one module-owned source-review evaluator. Its normalized source bytes and
 * canonical behavior transcript are sealed by the generated implementation
 * receipt; callers cannot inject or substitute another evaluator.
 */
export const evaluateCandidateRigReviewFrame = (
  input: CandidateRigReviewEvaluatorInput,
) => {
  const motion = input.mode === "motion";
  const wave = motion
    ? roundEvaluatorValue(((input.localFrame % 30) - 15) / 15)
    : 0;
  const mouthExposureId =
    input.visemeId === null
      ? null
      : (input.program.semanticRoles.find(
          (binding) => binding.semanticRole === input.visemeId,
        )?.componentId ?? null);
  return {
    parts: Object.fromEntries(
      input.program.partIds.map((partId, index) => [
        partId,
        {
          x: 0,
          y: roundEvaluatorValue(wave * (index % 2 === 0 ? 2 : -2)),
          rotation: roundEvaluatorValue(wave * (index % 2 === 0 ? 1 : -1)),
          scaleX: 1,
          scaleY: 1,
          opacity: 1,
          exposureId: null,
        },
      ]),
    ),
    face: {
      eyeOpen: input.actionPhase === "impact" ? 0.6 : 1,
      pupilX: input.gazeVectorLocal?.x ?? 0,
      pupilY: input.gazeVectorLocal?.y ?? 0,
      brow: input.motionMode === "reacting" ? 0.5 : 0,
      mouthExposureId,
    },
    sockets: Object.fromEntries(
      input.program.socketIds.map((socketId) => [
        socketId,
        { x: 0, y: 0, rotation: 0, scale: 1 },
      ]),
    ),
    localEffects: [],
  };
};
