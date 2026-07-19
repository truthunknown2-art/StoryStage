import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex } from "@noble/hashes/utils.js";
import { hashCanonical } from "./canonical-hash";
import {
  candidateRigReviewExerciseDefinitionContentHash,
  deriveCandidateRigReviewExerciseState,
  type CandidateRigReviewMode,
  type CandidateRigReviewView,
} from "./candidate-rig-review-exercise";
import { evaluateCandidateRigReviewRuntimeFrame } from "./candidate-rig-review-runtime";

export const candidateRigReviewImplementationSourceNormalization =
  "utf8-nfc-lf-no-bom-v1" as const;

export const normalizeCandidateRigReviewImplementationSource = (
  source: string,
) =>
  source
    .replace(/^\uFEFF/, "")
    .replace(/\r\n?/g, "\n")
    .normalize("NFC");

const hashExactUtf8 = (value: string) =>
  bytesToHex(sha256(new TextEncoder().encode(value)));

export type CandidateRigReviewImplementationSources = {
  evaluatorSource: string;
  exerciseSource: string;
  runtimeWrapperSource: string;
  publicBoundarySource: string;
  actorLocalKernelSource: string;
  receiptBuilderSource: string;
  generatorSource: string;
};

const canonicalFixture = {
  id: "candidate-rig-review-implementation-fixture-v2",
  views: ["front", "profile-left", "profile-right"] as const,
  visualProgramContentHash: hashCanonical("canonical-review-visual-program"),
  motionProgramContentHash: hashCanonical("canonical-review-motion-program"),
  partIds: ["part-head", "part-torso", "part-scarf"],
  socketIds: ["socket-neck", "socket-hand-prop"],
  exposureIds: [
    "exposure-mouth-rest",
    "exposure-viseme-ai",
    "exposure-viseme-ee",
    "exposure-viseme-oh",
  ],
  visemeIds: ["viseme-ai", "viseme-ee", "viseme-oh"],
  semanticRoles: [
    { componentId: "part-head", semanticRole: "head", kind: "part" as const },
    {
      componentId: "part-torso",
      semanticRole: "torso",
      kind: "part" as const,
    },
    {
      componentId: "part-scarf",
      semanticRole: "scarf",
      kind: "part" as const,
    },
    {
      componentId: "exposure-mouth-rest",
      semanticRole: "mouth-rest",
      kind: "exposure" as const,
    },
    {
      componentId: "exposure-viseme-ai",
      semanticRole: "viseme-ai",
      kind: "exposure" as const,
    },
    {
      componentId: "exposure-viseme-ee",
      semanticRole: "viseme-ee",
      kind: "exposure" as const,
    },
    {
      componentId: "exposure-viseme-oh",
      semanticRole: "viseme-oh",
      kind: "exposure" as const,
    },
  ],
} as const;

export type CandidateRigReviewImplementationReceipt = {
  schemaVersion: "1.0";
  receiptKind: "candidate-rig-review-implementation-verification";
  authorityDomain: "source-review-only";
  implementationId: "generic-recipe-driven-2d-source-review";
  implementationVersion: "2.0.0";
  sourceNormalization: typeof candidateRigReviewImplementationSourceNormalization;
  evaluatorSourceContentHash: string;
  exerciseSourceContentHash: string;
  runtimeWrapperSourceContentHash: string;
  publicBoundarySourceContentHash: string;
  actorLocalKernelSourceContentHash: string;
  receiptBuilderSourceContentHash: string;
  generatorSourceContentHash: string;
  implementationSourceClosureContentHash: string;
  canonicalFixtureContentHash: string;
  canonicalBehaviorContentHash: string;
  exerciseDefinitionContentHash: string;
  evaluatedModes: readonly ["clean", "overlay", "motion"];
  evaluatedViews: readonly ["front", "profile-left", "profile-right"];
  evaluatedMotionFramesPerView: 180;
  evaluatedMotionFrameCount: 540;
  contentHash: string;
  renderedMediaReceipt: false;
  approvalAuthority: false;
  capabilityAuthority: false;
  productionBindable: false;
};

function assertCanonicalMotionFrameCount(value: number): asserts value is 540 {
  if (value !== 540)
    throw new Error(
      "Candidate rig review implementation receipt must exercise all 180 motion frames in all three supported views.",
    );
}

const hashSource = (source: string) =>
  hashExactUtf8(normalizeCandidateRigReviewImplementationSource(source));

/**
 * Builds the receipt with the imported, module-owned runtime only. There is no
 * evaluator/runtime callback parameter: generator code cannot substitute a
 * behavior implementation while claiming hashes for different source bytes.
 */
export const buildCandidateRigReviewImplementationReceipt = (
  sources: CandidateRigReviewImplementationSources,
): CandidateRigReviewImplementationReceipt => {
  const evaluatedModes = ["clean", "overlay", "motion"] as const;
  const evaluatedViews = [...canonicalFixture.views] as [
    "front",
    "profile-left",
    "profile-right",
  ];
  const cases = evaluatedViews.flatMap((view) =>
    evaluatedModes.flatMap((mode) => {
      const frames =
        mode === "motion" ? Array.from({ length: 180 }, (_, i) => i) : [0];
      return frames.map((localFrame) => {
        const state = deriveCandidateRigReviewExerciseState({
          mode: mode as CandidateRigReviewMode,
          view: view as CandidateRigReviewView,
          localFrame,
          visualProgramContentHash: canonicalFixture.visualProgramContentHash,
          motionProgramContentHash:
            mode === "motion"
              ? canonicalFixture.motionProgramContentHash
              : null,
          visemeIds: canonicalFixture.visemeIds,
        });
        const input = {
          mode,
          localFrame,
          actionPhase: state.actionPhase,
          motionMode: state.motionMode,
          gazeVectorLocal: state.gazeVectorLocal,
          visemeId: state.visemeId,
          program: {
            partIds: [...canonicalFixture.partIds],
            socketIds: [...canonicalFixture.socketIds],
            exposureIds: [...canonicalFixture.exposureIds],
            semanticRoles: [...canonicalFixture.semanticRoles],
          },
        };
        return {
          view,
          mode,
          localFrame,
          exerciseState: state,
          input,
          output: evaluateCandidateRigReviewRuntimeFrame(input),
        };
      });
    }),
  );
  const evaluatedMotionFrameCount = cases.filter(
    (entry) => entry.mode === "motion",
  ).length;
  assertCanonicalMotionFrameCount(evaluatedMotionFrameCount);
  const sourceContentHashes = {
    evaluator: hashSource(sources.evaluatorSource),
    exercise: hashSource(sources.exerciseSource),
    runtimeWrapper: hashSource(sources.runtimeWrapperSource),
    publicBoundary: hashSource(sources.publicBoundarySource),
    actorLocalKernel: hashSource(sources.actorLocalKernelSource),
    receiptBuilder: hashSource(sources.receiptBuilderSource),
    generator: hashSource(sources.generatorSource),
  };
  const draft = {
    schemaVersion: "1.0" as const,
    receiptKind: "candidate-rig-review-implementation-verification" as const,
    authorityDomain: "source-review-only" as const,
    implementationId: "generic-recipe-driven-2d-source-review" as const,
    implementationVersion: "2.0.0" as const,
    sourceNormalization: candidateRigReviewImplementationSourceNormalization,
    evaluatorSourceContentHash: sourceContentHashes.evaluator,
    exerciseSourceContentHash: sourceContentHashes.exercise,
    runtimeWrapperSourceContentHash: sourceContentHashes.runtimeWrapper,
    publicBoundarySourceContentHash: sourceContentHashes.publicBoundary,
    actorLocalKernelSourceContentHash: sourceContentHashes.actorLocalKernel,
    receiptBuilderSourceContentHash: sourceContentHashes.receiptBuilder,
    generatorSourceContentHash: sourceContentHashes.generator,
    implementationSourceClosureContentHash: hashCanonical(sourceContentHashes),
    canonicalFixtureContentHash: hashCanonical(canonicalFixture),
    canonicalBehaviorContentHash: hashCanonical(cases),
    exerciseDefinitionContentHash:
      candidateRigReviewExerciseDefinitionContentHash,
    evaluatedModes,
    evaluatedViews,
    evaluatedMotionFramesPerView: 180 as const,
    evaluatedMotionFrameCount,
    renderedMediaReceipt: false as const,
    approvalAuthority: false as const,
    capabilityAuthority: false as const,
    productionBindable: false as const,
  };
  return { ...draft, contentHash: hashCanonical(draft) };
};
