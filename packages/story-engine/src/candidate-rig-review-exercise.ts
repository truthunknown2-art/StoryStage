import { hashCanonical } from "./canonical-hash";

export const candidateRigReviewExerciseDefinition = {
  id: "generic-rig-source-review-exercise",
  version: "1.0.0",
  fps: 30,
  durationInFrames: 180,
  segments: [
    { start: 0, end: 30, motionMode: "idle", actionPhase: "hold" },
    {
      start: 30,
      end: 60,
      motionMode: "performing",
      actionPhase: "anticipation",
    },
    { start: 60, end: 90, motionMode: "walking", actionPhase: "action" },
    {
      start: 90,
      end: 120,
      motionMode: "reacting",
      actionPhase: "reaction",
    },
    {
      start: 120,
      end: 150,
      motionMode: "performing",
      actionPhase: "action",
    },
    { start: 150, end: 180, motionMode: "idle", actionPhase: "settle" },
  ],
} as const;

export const candidateRigReviewExerciseDefinitionContentHash = hashCanonical(
  candidateRigReviewExerciseDefinition,
);

export type CandidateRigReviewView = "front" | "profile-left" | "profile-right";
export type CandidateRigReviewMode = "clean" | "overlay" | "motion";

export const roundCandidateRigReviewExerciseValue = (value: number) =>
  Math.round(value * 1e6) / 1e6;

export const deriveCandidateRigReviewExerciseState = (input: {
  mode: CandidateRigReviewMode;
  view: CandidateRigReviewView;
  localFrame: number;
  visualProgramContentHash: string;
  motionProgramContentHash: string | null;
  visemeIds: readonly string[];
}) => {
  const facing = {
    front: "front",
    "profile-left": "left",
    "profile-right": "right",
  }[input.view] as "front" | "left" | "right";
  if (input.mode !== "motion")
    return {
      fps: 30,
      motionMode: "idle" as const,
      actionPhase: "hold" as const,
      phaseProgress: 1,
      gaitPhase: null,
      facing,
      gazeVectorLocal: null,
      visemeId: null,
      microMotionSeed: hashCanonical({
        exercise: candidateRigReviewExerciseDefinitionContentHash,
        program: input.visualProgramContentHash,
        mode: input.mode,
        localFrame: 0,
      }),
    };
  if (
    input.motionProgramContentHash === null ||
    input.localFrame < 0 ||
    input.localFrame >= candidateRigReviewExerciseDefinition.durationInFrames
  )
    throw new Error(
      "Candidate rig review motion frame is outside the canonical exercise.",
    );
  const segment = candidateRigReviewExerciseDefinition.segments.find(
    (entry) => input.localFrame >= entry.start && input.localFrame < entry.end,
  );
  if (!segment)
    throw new Error("Candidate rig review exercise has no frame segment.");
  const segmentFrame = input.localFrame - segment.start;
  const phaseProgress = roundCandidateRigReviewExerciseValue(
    segmentFrame / (segment.end - segment.start - 1),
  );
  const gaitPhase =
    segment.motionMode === "walking"
      ? roundCandidateRigReviewExerciseValue((segmentFrame % 15) / 15)
      : null;
  const gazeVectorLocal =
    segment.motionMode === "performing" || segment.motionMode === "reacting"
      ? {
          x: roundCandidateRigReviewExerciseValue(
            ((input.localFrame % 11) - 5) / 10,
          ),
          y: roundCandidateRigReviewExerciseValue(
            ((input.localFrame % 7) - 3) / 12,
          ),
        }
      : null;
  const visemeId =
    input.localFrame >= 120 &&
    input.localFrame < 150 &&
    input.visemeIds.length > 0
      ? input.visemeIds[
          Math.floor((input.localFrame - 120) / 5) % input.visemeIds.length
        ]!
      : null;
  return {
    fps: candidateRigReviewExerciseDefinition.fps,
    motionMode: segment.motionMode,
    actionPhase: segment.actionPhase,
    phaseProgress,
    gaitPhase,
    facing,
    gazeVectorLocal,
    visemeId,
    microMotionSeed: hashCanonical({
      exercise: candidateRigReviewExerciseDefinitionContentHash,
      motionProgram: input.motionProgramContentHash,
      localFrame: input.localFrame,
    }),
  };
};
