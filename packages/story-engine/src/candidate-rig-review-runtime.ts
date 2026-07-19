import { evaluateCandidateRigReviewFrame } from "./candidate-rig-review-evaluator";
import { evaluateActorLocalPerformanceKernel } from "./director/visual-performance-contract";

export type CandidateRigReviewRuntimeInput = {
  mode: "clean" | "overlay" | "motion";
  localFrame: number;
  actionPhase: string;
  motionMode: string;
  gazeVectorLocal: { x: number; y: number } | null;
  visemeId: string | null;
  program: {
    partIds: string[];
    socketIds: string[];
    exposureIds: string[];
    semanticRoles: Array<{
      componentId: string;
      semanticRole: string;
      kind: "part" | "exposure";
    }>;
  };
};

const moduleOwnedCandidateRigReviewRenderer = Object.freeze({
  evaluate: evaluateCandidateRigReviewFrame,
});

/**
 * The actual source-review runtime boundary. Receipt generation executes this
 * exact wrapper, including the shared actor-local validation kernel, rather
 * than a direct evaluator shortcut.
 */
export const evaluateCandidateRigReviewRuntimeFrame = (
  input: CandidateRigReviewRuntimeInput,
) =>
  evaluateActorLocalPerformanceKernel(
    moduleOwnedCandidateRigReviewRenderer,
    input,
    input.program,
  );
