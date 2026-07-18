import { z } from "zod";
import { identifierSchema } from "./model";

export const motionEasingSchema = z.enum([
  "linear",
  "ease-in",
  "ease-out",
  "ease-in-out",
  "playful-overshoot",
]);

export const motionKeyframeSchema = z
  .object({
    frame: z.number().int().nonnegative(),
    value: z.number().finite(),
    easing: motionEasingSchema.default("linear"),
  })
  .strict();

const keyedTrack = {
  keyframes: z.array(motionKeyframeSchema).min(2),
};

export const boneMotionTrackSchema = z
  .object({
    type: z.literal("bone"),
    boneId: identifierSchema,
    property: z.enum(["x", "y", "rotation", "scale"]),
    ...keyedTrack,
  })
  .strict();

export const rootMotionTrackSchema = z
  .object({
    type: z.literal("root"),
    property: z.enum(["x", "y", "rotation", "scale"]),
    ...keyedTrack,
  })
  .strict();

export const faceMotionTrackSchema = z
  .object({
    type: z.literal("face"),
    channel: z.enum(["gaze-x", "gaze-y", "blink", "mouth-open"]),
    ...keyedTrack,
  })
  .strict();

export const cameraMotionTrackSchema = z
  .object({
    type: z.literal("camera"),
    property: z.enum(["x", "y", "scale"]),
    ...keyedTrack,
  })
  .strict();

export const attachmentMotionTrackSchema = z
  .object({
    type: z.literal("attachment"),
    propId: identifierSchema,
    boneId: identifierSchema,
    startFrame: z.number().int().nonnegative(),
    endFrame: z.number().int().positive(),
  })
  .strict();

export const motionTrackSchema = z.discriminatedUnion("type", [
  boneMotionTrackSchema,
  rootMotionTrackSchema,
  faceMotionTrackSchema,
  cameraMotionTrackSchema,
  attachmentMotionTrackSchema,
]);

export const performancePhaseSchema = z
  .object({
    type: z.enum(["anticipation", "action", "overshoot", "settle", "hold"]),
    startFrame: z.number().int().nonnegative(),
    endFrame: z.number().int().positive(),
  })
  .strict();

export const directedBeatProgramSchema = z
  .object({
    schemaVersion: z.literal("1.0"),
    id: identifierSchema,
    fps: z.literal(30),
    durationInFrames: z.number().int().min(2),
    tracks: z.array(motionTrackSchema).min(1),
    phases: z.array(performancePhaseSchema).min(1),
  })
  .strict()
  .superRefine((program, context) => {
    for (const [trackIndex, track] of program.tracks.entries()) {
      if (track.type === "attachment") {
        if (track.startFrame >= track.endFrame)
          context.addIssue({
            code: "custom",
            message: "Attachment startFrame must precede endFrame.",
            path: ["tracks", trackIndex],
          });
        if (track.endFrame > program.durationInFrames)
          context.addIssue({
            code: "custom",
            message: "Attachment extends beyond the program.",
            path: ["tracks", trackIndex, "endFrame"],
          });
        continue;
      }
      for (let index = 0; index < track.keyframes.length; index += 1) {
        const keyframe = track.keyframes[index]!;
        if (keyframe.frame >= program.durationInFrames)
          context.addIssue({
            code: "custom",
            message: "Keyframe extends beyond the program.",
            path: ["tracks", trackIndex, "keyframes", index, "frame"],
          });
        if (index > 0 && keyframe.frame <= track.keyframes[index - 1]!.frame)
          context.addIssue({
            code: "custom",
            message: "Keyframes must be strictly ordered.",
            path: ["tracks", trackIndex, "keyframes", index, "frame"],
          });
      }
    }
    for (const [phaseIndex, phase] of program.phases.entries()) {
      if (phase.startFrame >= phase.endFrame)
        context.addIssue({
          code: "custom",
          message: "Phase startFrame must precede endFrame.",
          path: ["phases", phaseIndex],
        });
      if (phase.endFrame > program.durationInFrames)
        context.addIssue({
          code: "custom",
          message: "Phase extends beyond the program.",
          path: ["phases", phaseIndex, "endFrame"],
        });
      if (
        phaseIndex > 0 &&
        phase.startFrame < program.phases[phaseIndex - 1]!.endFrame
      )
        context.addIssue({
          code: "custom",
          message: "Performance phases may not overlap or run out of order.",
          path: ["phases", phaseIndex, "startFrame"],
        });
    }
  });

export type MotionKeyframe = z.infer<typeof motionKeyframeSchema>;
export type MotionTrack = z.infer<typeof motionTrackSchema>;
export type DirectedBeatProgram = z.infer<typeof directedBeatProgramSchema>;

export type MotionProgramIssue = {
  code:
    | "missing-articulated-motion"
    | "missing-camera-motion"
    | "missing-facial-motion"
    | "missing-performance-phases"
    | "missing-prop-attachment"
    | "root-without-articulation";
  message: string;
};

const trackChanges = (track: Exclude<MotionTrack, { type: "attachment" }>) =>
  new Set(track.keyframes.map((keyframe) => keyframe.value)).size > 1;

export function getMotionProgramIssues(
  program: DirectedBeatProgram,
  options: { cv001Proof?: boolean } = {},
): MotionProgramIssue[] {
  const movingBones = new Set(
    program.tracks
      .filter(
        (track): track is Extract<MotionTrack, { type: "bone" }> =>
          track.type === "bone" && trackChanges(track),
      )
      .map((track) => track.boneId),
  );
  const rootMoves = program.tracks.some(
    (track) => track.type === "root" && trackChanges(track),
  );
  const phaseTypes = new Set(program.phases.map((phase) => phase.type));
  const issues: MotionProgramIssue[] = [];
  if (movingBones.size < 3)
    issues.push({
      code: "missing-articulated-motion",
      message:
        "Primary performance requires changing tracks on at least three articulated bones.",
    });
  if (
    !["anticipation", "action", "settle"].every((phase) =>
      phaseTypes.has(phase as DirectedBeatProgram["phases"][number]["type"]),
    )
  )
    issues.push({
      code: "missing-performance-phases",
      message:
        "Primary performance requires anticipation, action, and settle phases.",
    });
  if (rootMoves && movingBones.size < 3)
    issues.push({
      code: "root-without-articulation",
      message:
        "Root translation cannot carry the performance without articulated bone motion.",
    });
  if (options.cv001Proof) {
    if (
      !program.tracks.some(
        (track) =>
          track.type === "face" &&
          ["gaze-x", "gaze-y", "mouth-open"].includes(track.channel) &&
          trackChanges(track),
      )
    )
      issues.push({
        code: "missing-facial-motion",
        message: "CV-001 requires changing gaze or mouth tracks.",
      });
    if (
      !program.tracks.some(
        (track) => track.type === "camera" && trackChanges(track),
      )
    )
      issues.push({
        code: "missing-camera-motion",
        message: "CV-001 requires a deterministic camera move.",
      });
    if (!program.tracks.some((track) => track.type === "attachment"))
      issues.push({
        code: "missing-prop-attachment",
        message: "CV-001 requires a bounded prop attachment.",
      });
  }
  return issues;
}

export function assertMotionProgram(
  program: DirectedBeatProgram,
  options: { cv001Proof?: boolean } = {},
): DirectedBeatProgram {
  const parsed = directedBeatProgramSchema.parse(program);
  const issues = getMotionProgramIssues(parsed, options);
  if (issues.length > 0)
    throw new Error(
      `Motion program rejected: ${issues.map((issue) => `${issue.code}: ${issue.message}`).join(" ")}`,
    );
  return parsed;
}

const ease = (value: number, easing: MotionKeyframe["easing"]) => {
  if (easing === "ease-in") return value * value;
  if (easing === "ease-out") return 1 - (1 - value) ** 2;
  if (easing === "ease-in-out")
    return value < 0.5 ? 2 * value * value : 1 - (-2 * value + 2) ** 2 / 2;
  if (easing === "playful-overshoot") {
    const shifted = value - 1;
    return 1 + 2.70158 * shifted ** 3 + 1.70158 * shifted ** 2;
  }
  return value;
};

export function evaluateKeyframes(
  keyframes: MotionKeyframe[],
  frame: number,
): number {
  if (frame <= keyframes[0]!.frame) return keyframes[0]!.value;
  if (frame >= keyframes.at(-1)!.frame) return keyframes.at(-1)!.value;
  const nextIndex = keyframes.findIndex((keyframe) => keyframe.frame >= frame);
  const previous = keyframes[nextIndex - 1]!;
  const next = keyframes[nextIndex]!;
  const progress = (frame - previous.frame) / (next.frame - previous.frame);
  return (
    previous.value +
    (next.value - previous.value) * ease(progress, previous.easing)
  );
}

type TransformValues = Partial<
  Record<"x" | "y" | "rotation" | "scale", number>
>;

export type EvaluatedMotionProgram = {
  root: TransformValues;
  bones: Record<string, TransformValues>;
  face: Partial<
    Record<Extract<MotionTrack, { type: "face" }>["channel"], number>
  >;
  camera: Partial<
    Record<Extract<MotionTrack, { type: "camera" }>["property"], number>
  >;
  attachments: Array<{ propId: string; boneId: string }>;
  phase: DirectedBeatProgram["phases"][number]["type"] | null;
};

export function evaluateMotionProgram(
  program: DirectedBeatProgram,
  requestedFrame: number,
): EvaluatedMotionProgram {
  const frame = Math.max(
    0,
    Math.min(program.durationInFrames - 1, requestedFrame),
  );
  const result: EvaluatedMotionProgram = {
    root: {},
    bones: {},
    face: {},
    camera: {},
    attachments: [],
    phase:
      program.phases.find(
        (phase) => frame >= phase.startFrame && frame < phase.endFrame,
      )?.type ?? null,
  };
  for (const track of program.tracks) {
    if (track.type === "attachment") {
      if (frame >= track.startFrame && frame < track.endFrame)
        result.attachments.push({ propId: track.propId, boneId: track.boneId });
      continue;
    }
    const value = evaluateKeyframes(track.keyframes, frame);
    if (track.type === "root") result.root[track.property] = value;
    if (track.type === "bone")
      (result.bones[track.boneId] ??= {})[track.property] = value;
    if (track.type === "face") result.face[track.channel] = value;
    if (track.type === "camera") result.camera[track.property] = value;
  }
  return result;
}

export const cv001LanternMotionProgram = assertMotionProgram(
  directedBeatProgramSchema.parse({
    schemaVersion: "1.0",
    id: "cv001-lantern-reach",
    fps: 30,
    durationInFrames: 120,
    phases: [
      { type: "anticipation", startFrame: 0, endFrame: 24 },
      { type: "action", startFrame: 24, endFrame: 64 },
      { type: "overshoot", startFrame: 64, endFrame: 78 },
      { type: "settle", startFrame: 78, endFrame: 104 },
      { type: "hold", startFrame: 104, endFrame: 120 },
    ],
    tracks: [
      {
        type: "root",
        property: "x",
        keyframes: [
          { frame: 0, value: 0, easing: "ease-in-out" },
          { frame: 24, value: 0, easing: "ease-in" },
          { frame: 64, value: 150, easing: "playful-overshoot" },
          { frame: 82, value: 170, easing: "ease-out" },
          { frame: 119, value: 170 },
        ],
      },
      {
        type: "root",
        property: "y",
        keyframes: [
          { frame: 0, value: 0, easing: "ease-in-out" },
          { frame: 48, value: -10, easing: "ease-out" },
          { frame: 78, value: -4, easing: "ease-in-out" },
          { frame: 119, value: 0 },
        ],
      },
      {
        type: "bone",
        boneId: "torso",
        property: "rotation",
        keyframes: [
          { frame: 0, value: 0, easing: "ease-in-out" },
          { frame: 20, value: -3, easing: "ease-in" },
          { frame: 56, value: 11, easing: "playful-overshoot" },
          { frame: 70, value: 15, easing: "ease-out" },
          { frame: 94, value: 4, easing: "ease-in-out" },
          { frame: 119, value: 0 },
        ],
      },
      {
        type: "bone",
        boneId: "head",
        property: "rotation",
        keyframes: [
          { frame: 0, value: 0, easing: "ease-out" },
          { frame: 12, value: -9, easing: "ease-in-out" },
          { frame: 28, value: -13, easing: "ease-out" },
          { frame: 54, value: -4, easing: "playful-overshoot" },
          { frame: 72, value: 9, easing: "ease-out" },
          { frame: 96, value: 2, easing: "ease-in-out" },
          { frame: 119, value: 0 },
        ],
      },
      {
        type: "bone",
        boneId: "upper-arm-right",
        property: "rotation",
        keyframes: [
          { frame: 0, value: -28, easing: "ease-in-out" },
          { frame: 20, value: -38, easing: "ease-in" },
          { frame: 54, value: 28, easing: "playful-overshoot" },
          { frame: 68, value: 41, easing: "ease-out" },
          { frame: 88, value: 29, easing: "ease-in-out" },
          { frame: 119, value: 18 },
        ],
      },
      {
        type: "bone",
        boneId: "lower-arm-right",
        property: "rotation",
        keyframes: [
          { frame: 0, value: 24, easing: "ease-in-out" },
          { frame: 20, value: 12, easing: "ease-in" },
          { frame: 54, value: -68, easing: "playful-overshoot" },
          { frame: 68, value: -82, easing: "ease-out" },
          { frame: 88, value: -61, easing: "ease-in-out" },
          { frame: 119, value: -48 },
        ],
      },
      {
        type: "bone",
        boneId: "hand-right",
        property: "rotation",
        keyframes: [
          { frame: 0, value: 0, easing: "ease-in-out" },
          { frame: 42, value: -12, easing: "ease-out" },
          { frame: 60, value: 8, easing: "playful-overshoot" },
          { frame: 78, value: 3, easing: "ease-in-out" },
          { frame: 119, value: 0 },
        ],
      },
      {
        type: "face",
        channel: "gaze-x",
        keyframes: [
          { frame: 0, value: 0, easing: "ease-out" },
          { frame: 10, value: 1, easing: "ease-in-out" },
          { frame: 84, value: 1, easing: "ease-in-out" },
          { frame: 119, value: 0.15 },
        ],
      },
      {
        type: "face",
        channel: "blink",
        keyframes: [
          { frame: 0, value: 0 },
          { frame: 8, value: 0 },
          { frame: 10, value: 1 },
          { frame: 12, value: 0 },
          { frame: 88, value: 0 },
          { frame: 90, value: 1 },
          { frame: 92, value: 0 },
          { frame: 119, value: 0 },
        ],
      },
      {
        type: "face",
        channel: "mouth-open",
        keyframes: [
          { frame: 0, value: 0 },
          { frame: 26, value: 0, easing: "ease-out" },
          { frame: 32, value: 1, easing: "ease-in" },
          { frame: 39, value: 0.15, easing: "ease-out" },
          { frame: 51, value: 0.75, easing: "ease-in-out" },
          { frame: 64, value: 0.2, easing: "ease-out" },
          { frame: 76, value: 1, easing: "ease-in-out" },
          { frame: 98, value: 0.1 },
          { frame: 119, value: 0 },
        ],
      },
      {
        type: "camera",
        property: "scale",
        keyframes: [
          { frame: 0, value: 1, easing: "ease-in-out" },
          { frame: 119, value: 1.08 },
        ],
      },
      {
        type: "camera",
        property: "x",
        keyframes: [
          { frame: 0, value: 0, easing: "ease-in-out" },
          { frame: 119, value: -42 },
        ],
      },
      {
        type: "attachment",
        propId: "lantern",
        boneId: "hand-right",
        startFrame: 48,
        endFrame: 120,
      },
    ],
  }),
  { cv001Proof: true },
);
