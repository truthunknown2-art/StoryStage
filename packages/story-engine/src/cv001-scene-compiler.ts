import { z } from "zod";
import { verifyRenderPlanHash } from "./animation-compiler";
import { hashCanonical } from "./canonical-hash";
import { getCv001AttachmentContinuity } from "./cv001-rig-kinematics";
import {
  assertMotionProgram,
  cv001RigContract,
  directedBeatProgramSchema,
  getMotionProgramIssues,
  type DirectedBeatProgram,
  type MotionTrack,
} from "./motion-program";
import {
  hashSchema,
  identifierSchema,
  type FrameAccurateRenderPlan,
} from "./model";

export const CV001_MOTION_COMPILER_ID = "cv001-three-beat-motion-compiler";
export const CV001_MOTION_COMPILER_VERSION = "1.0.0";

export const cv001BeatIntentSchema = z.enum([
  "notice-prop",
  "reach-and-pick-up",
  "react-and-present",
]);

const cv001BeatBaseSchema = z
  .object({
    id: identifierSchema,
    order: z.number().int().min(1).max(3),
    sceneId: identifierSchema,
    shotId: identifierSchema,
    text: z.string().trim().min(1).max(500),
    intent: cv001BeatIntentSchema,
    characterId: z.literal("cv001-character"),
    propId: z.literal("lantern"),
    emotion: z.enum(["curious", "cautious", "pleased"]),
    durationInFrames: z.number().int().min(24).max(180),
    cameraIntent: z.enum(["hold", "gentle-push", "reframe"]),
  })
  .strict();

export const cv001BeatInputSchema = cv001BeatBaseSchema;
const noticeBeatSchema = cv001BeatBaseSchema.extend({
  order: z.literal(1),
  intent: z.literal("notice-prop"),
});
const pickupBeatSchema = cv001BeatBaseSchema.extend({
  order: z.literal(2),
  intent: z.literal("reach-and-pick-up"),
});
const presentBeatSchema = cv001BeatBaseSchema.extend({
  order: z.literal(3),
  intent: z.literal("react-and-present"),
});

export const cv001ThreeBeatSceneInputSchema = z
  .object({
    schemaVersion: z.literal("1.0"),
    sceneId: identifierSchema,
    planContentHash: hashSchema,
    fps: z.literal(30),
    rigContractId: z.literal("cv001-paper-cut-rig-v1"),
    beats: z.tuple([noticeBeatSchema, pickupBeatSchema, presentBeatSchema]),
  })
  .strict()
  .superRefine((input, context) => {
    const beatIds = input.beats.map((beat) => beat.id);
    const shotIds = input.beats.map((beat) => beat.shotId);
    if (new Set(beatIds).size !== beatIds.length)
      context.addIssue({
        code: "custom",
        message: "CV-001 beat IDs must be unique.",
        path: ["beats"],
      });
    if (new Set(shotIds).size !== shotIds.length)
      context.addIssue({
        code: "custom",
        message: "CV-001 shot IDs must be unique.",
        path: ["beats"],
      });
    input.beats.forEach((beat, index) => {
      if (beat.sceneId !== input.sceneId)
        context.addIssue({
          code: "custom",
          message: "Every beat must reference the input scene.",
          path: ["beats", index, "sceneId"],
        });
    });
  });

export type Cv001BeatInput = z.infer<typeof cv001BeatInputSchema>;
export type Cv001ThreeBeatSceneInput = z.infer<
  typeof cv001ThreeBeatSceneInputSchema
>;

const directedShotMotionBindingFields = {
  schemaVersion: z.literal("1.0"),
  beatId: identifierSchema,
  beatContentHash: hashSchema,
  shotId: identifierSchema,
  rigContractId: z.literal("cv001-paper-cut-rig-v1"),
  program: directedBeatProgramSchema,
  programContentHash: hashSchema,
};

const directedShotMotionBindingDraftSchema = z
  .object(directedShotMotionBindingFields)
  .strict();

export const directedShotMotionBindingSchema = z
  .object({
    ...directedShotMotionBindingFields,
    contentHash: hashSchema,
  })
  .strict()
  .superRefine((binding, context) => {
    if (hashCanonical(binding.program) !== binding.programContentHash)
      context.addIssue({
        code: "custom",
        message: "Motion program content hash does not match the program.",
        path: ["programContentHash"],
      });
    const { contentHash, ...draft } = binding;
    if (hashCanonical(draft) !== contentHash)
      context.addIssue({
        code: "custom",
        message: "Directed shot motion binding hash is invalid.",
        path: ["contentHash"],
      });
  });

export type DirectedShotMotionBinding = z.infer<
  typeof directedShotMotionBindingSchema
>;

const cv001CompiledSceneMotionDraftSchema = z
  .object({
    schemaVersion: z.literal("1.0"),
    compiler: z
      .object({
        id: z.literal(CV001_MOTION_COMPILER_ID),
        version: z.literal(CV001_MOTION_COMPILER_VERSION),
      })
      .strict(),
    sceneId: identifierSchema,
    planContentHash: hashSchema,
    rigContractId: z.literal("cv001-paper-cut-rig-v1"),
    bindings: z.tuple([
      directedShotMotionBindingSchema,
      directedShotMotionBindingSchema,
      directedShotMotionBindingSchema,
    ]),
  })
  .strict();

export const cv001CompiledSceneMotionSchema = z
  .object({
    ...cv001CompiledSceneMotionDraftSchema.shape,
    contentHash: hashSchema,
  })
  .strict()
  .superRefine((scene, context) => {
    if (new Set(scene.bindings.map((binding) => binding.shotId)).size !== 3)
      context.addIssue({
        code: "custom",
        message: "Compiled scene motion requires three unique shot bindings.",
        path: ["bindings"],
      });
    const { contentHash, ...draft } = scene;
    if (hashCanonical(draft) !== contentHash)
      context.addIssue({
        code: "custom",
        message: "Compiled scene motion hash is invalid.",
        path: ["contentHash"],
      });
  });

export type Cv001CompiledSceneMotion = z.infer<
  typeof cv001CompiledSceneMotionSchema
>;

type PhaseType = DirectedBeatProgram["phases"][number]["type"];

const partitionDuration = (
  duration: number,
  types: PhaseType[],
  minimums: number[],
  weights: number[],
): DirectedBeatProgram["phases"] => {
  const minimumTotal = minimums.reduce((sum, value) => sum + value, 0);
  const remaining = duration - minimumTotal;
  if (remaining < 0) throw new Error("Beat is too short for required phases.");
  const extras = weights.map((weight) => Math.floor(remaining * weight));
  let unassigned = remaining - extras.reduce((sum, value) => sum + value, 0);
  for (let index = 0; unassigned > 0; index = (index + 1) % extras.length) {
    extras[index]! += 1;
    unassigned -= 1;
  }
  let cursor = 0;
  return types.map((type, index) => {
    const startFrame = cursor;
    cursor += minimums[index]! + extras[index]!;
    return { type, startFrame, endFrame: cursor };
  });
};

const keyframes = (
  entries: Array<
    [
      number,
      number,
      (
        | "linear"
        | "ease-in"
        | "ease-out"
        | "ease-in-out"
        | "playful-overshoot"
      )?,
    ]
  >,
) =>
  entries.map(([frame, value, easing]) => ({
    frame,
    value,
    easing: easing ?? "linear",
  }));

const lastFrame = (beat: Cv001BeatInput) => beat.durationInFrames - 1;

const cameraTracks = (beat: Cv001BeatInput): MotionTrack[] => {
  if (beat.cameraIntent === "hold") return [];
  if (beat.cameraIntent === "gentle-push")
    return [
      {
        type: "camera",
        property: "scale",
        keyframes: keyframes([
          [0, 1, "ease-in-out"],
          [lastFrame(beat), 1.02],
        ]),
      },
    ];
  return [
    {
      type: "camera",
      property: "x",
      keyframes: keyframes([
        [0, 0, "ease-in-out"],
        [lastFrame(beat), -12],
      ]),
    },
  ];
};

const motionProgramId = (beat: Cv001BeatInput) =>
  `${beat.id}-${hashCanonical(beat).slice(0, 12)}-motion`;

const compileNoticeBeat = (beat: Cv001BeatInput): DirectedBeatProgram => {
  const phases = partitionDuration(
    beat.durationInFrames,
    ["anticipation", "action", "settle", "hold"],
    [2, 2, 2, 4],
    [0.2, 0.45, 0.2, 0.15],
  );
  const actionStart = phases[1]!.startFrame;
  const settleStart = phases[2]!.startFrame;
  const end = lastFrame(beat);
  return assertMotionProgram(
    directedBeatProgramSchema.parse({
      schemaVersion: "1.0",
      id: motionProgramId(beat),
      fps: 30,
      durationInFrames: beat.durationInFrames,
      phases,
      tracks: [
        {
          type: "bone",
          boneId: "torso",
          property: "rotation",
          keyframes: keyframes([
            [0, 0],
            [actionStart + 2, 0, "ease-in"],
            [settleStart, 7, "ease-out"],
            [end, 2],
          ]),
        },
        {
          type: "bone",
          boneId: "head",
          property: "rotation",
          keyframes: keyframes([
            [0, 0],
            [Math.max(1, actionStart - 1), -10, "ease-out"],
            [settleStart, -6, "ease-in-out"],
            [end, -4],
          ]),
        },
        {
          type: "bone",
          boneId: "upper-arm-right",
          property: "rotation",
          keyframes: keyframes([
            [0, -20],
            [settleStart, -42, "ease-out"],
            [end, -38],
          ]),
        },
        {
          type: "bone",
          boneId: "lower-arm-right",
          property: "rotation",
          keyframes: keyframes([
            [0, 30],
            [settleStart, 8, "ease-out"],
            [end, 12],
          ]),
        },
        {
          type: "bone",
          boneId: "hand-right",
          property: "rotation",
          keyframes: keyframes([
            [0, 4],
            [settleStart, -16, "ease-out"],
            [end, -12],
          ]),
        },
        {
          type: "face",
          channel: "gaze-x",
          keyframes: keyframes([
            [0, 0],
            [Math.max(1, actionStart - 2), 1, "ease-out"],
            [end, 1],
          ]),
        },
        {
          type: "face",
          channel: "blink",
          keyframes: keyframes([
            [0, 0],
            [Math.max(1, actionStart - 1), 1],
            [actionStart + 1, 0],
            [end, 0],
          ]),
        },
        ...cameraTracks(beat),
      ],
    }),
    { rigContract: cv001RigContract },
  );
};

const compilePickupBeat = (beat: Cv001BeatInput): DirectedBeatProgram => {
  const phases = partitionDuration(
    beat.durationInFrames,
    ["anticipation", "action", "overshoot", "settle", "hold"],
    [2, 4, 2, 2, 4],
    [0.15, 0.42, 0.12, 0.18, 0.13],
  );
  const action = phases[1]!;
  const attachFrame = Math.min(
    action.endFrame - 1,
    action.startFrame +
      Math.max(1, Math.floor((action.endFrame - action.startFrame) * 0.7)),
  );
  const overshootStart = phases[2]!.startFrame;
  const settleStart = phases[3]!.startFrame;
  const end = lastFrame(beat);
  return assertMotionProgram(
    directedBeatProgramSchema.parse({
      schemaVersion: "1.0",
      id: motionProgramId(beat),
      fps: 30,
      durationInFrames: beat.durationInFrames,
      phases,
      tracks: [
        {
          type: "root",
          property: "x",
          keyframes: keyframes([
            [0, 0, "ease-in"],
            [overshootStart, 150, "playful-overshoot"],
            [settleStart, 178, "ease-out"],
            [end, 170],
          ]),
        },
        {
          type: "bone",
          boneId: "torso",
          property: "rotation",
          keyframes: keyframes([
            [0, 2],
            [action.startFrame, -3, "ease-in"],
            [overshootStart, 15, "playful-overshoot"],
            [settleStart, 11, "ease-out"],
            [end, 4],
          ]),
        },
        {
          type: "bone",
          boneId: "head",
          property: "rotation",
          keyframes: keyframes([
            [0, -4],
            [action.startFrame, -12, "ease-in-out"],
            [overshootStart, 9, "playful-overshoot"],
            [end, 2],
          ]),
        },
        {
          type: "bone",
          boneId: "upper-arm-right",
          property: "rotation",
          keyframes: keyframes([
            [0, -38],
            [attachFrame, 28, "ease-out"],
            [overshootStart, 41, "playful-overshoot"],
            [end, 18],
          ]),
        },
        {
          type: "bone",
          boneId: "lower-arm-right",
          property: "rotation",
          keyframes: keyframes([
            [0, 12],
            [attachFrame, -68, "ease-out"],
            [overshootStart, -82, "playful-overshoot"],
            [end, -48],
          ]),
        },
        {
          type: "bone",
          boneId: "hand-right",
          property: "rotation",
          keyframes: keyframes([
            [0, -12],
            [attachFrame, -2, "ease-out"],
            [overshootStart, 8, "playful-overshoot"],
            [end, 0],
          ]),
        },
        {
          type: "face",
          channel: "gaze-x",
          keyframes: keyframes([
            [0, 1],
            [settleStart, 1],
            [end, 0.4],
          ]),
        },
        {
          type: "face",
          channel: "mouth-open",
          keyframes: keyframes([
            [0, 0],
            [action.startFrame, 0.8, "ease-out"],
            [overshootStart, 1, "playful-overshoot"],
            [end, 0.1],
          ]),
        },
        ...cameraTracks(beat),
        {
          type: "attachment",
          propId: "lantern",
          boneId: "hand-right",
          startFrame: attachFrame,
          endFrame: beat.durationInFrames,
        },
      ],
    }),
    { rigContract: cv001RigContract },
  );
};

const compilePresentBeat = (beat: Cv001BeatInput): DirectedBeatProgram => {
  const phases = partitionDuration(
    beat.durationInFrames,
    ["anticipation", "action", "settle", "hold"],
    [2, 2, 2, 12],
    [0.18, 0.45, 0.25, 0.12],
  );
  const actionStart = phases[1]!.startFrame;
  const settleStart = phases[2]!.startFrame;
  const end = lastFrame(beat);
  return assertMotionProgram(
    directedBeatProgramSchema.parse({
      schemaVersion: "1.0",
      id: motionProgramId(beat),
      fps: 30,
      durationInFrames: beat.durationInFrames,
      phases,
      tracks: [
        {
          type: "root",
          property: "x",
          keyframes: keyframes([
            [0, 170],
            [actionStart, 166, "ease-in"],
            [settleStart, 174, "ease-out"],
            [end, 170],
          ]),
        },
        {
          type: "bone",
          boneId: "torso",
          property: "rotation",
          keyframes: keyframes([
            [0, 4],
            [actionStart, -4, "ease-in"],
            [settleStart, 8, "ease-out"],
            [end, 1],
          ]),
        },
        {
          type: "bone",
          boneId: "head",
          property: "rotation",
          keyframes: keyframes([
            [0, 2],
            [actionStart, -8, "ease-out"],
            [settleStart, 10, "playful-overshoot"],
            [end, 0],
          ]),
        },
        {
          type: "bone",
          boneId: "upper-arm-right",
          property: "rotation",
          keyframes: keyframes([
            [0, 18],
            [actionStart, 8, "ease-in"],
            [settleStart, 38, "playful-overshoot"],
            [end, 25],
          ]),
        },
        {
          type: "bone",
          boneId: "lower-arm-right",
          property: "rotation",
          keyframes: keyframes([
            [0, -48],
            [actionStart, -34, "ease-in"],
            [settleStart, -72, "playful-overshoot"],
            [end, -55],
          ]),
        },
        {
          type: "bone",
          boneId: "hand-right",
          property: "rotation",
          keyframes: keyframes([
            [0, 0],
            [actionStart, -8, "ease-in"],
            [settleStart, 12, "ease-out"],
            [end, 2],
          ]),
        },
        {
          type: "face",
          channel: "gaze-x",
          keyframes: keyframes([
            [0, 0.4],
            [actionStart, -0.2, "ease-out"],
            [settleStart, 0, "ease-in-out"],
            [end, 0],
          ]),
        },
        {
          type: "face",
          channel: "mouth-open",
          keyframes: keyframes([
            [0, 0.1],
            [actionStart, 1, "ease-out"],
            [settleStart, 0.45, "ease-in-out"],
            [end, 0.1],
          ]),
        },
        ...cameraTracks(beat),
        {
          type: "attachment",
          propId: "lantern",
          boneId: "hand-right",
          startFrame: 0,
          endFrame: beat.durationInFrames,
        },
      ],
    }),
    { rigContract: cv001RigContract },
  );
};

const trackRange = (track: Exclude<MotionTrack, { type: "attachment" }>) => {
  const values = track.keyframes.map((keyframe) => keyframe.value);
  return Math.max(...values) - Math.min(...values);
};

const firstChangeFrame = (
  track: Exclude<MotionTrack, { type: "attachment" }>,
) =>
  track.keyframes.find(
    (keyframe) => keyframe.value !== track.keyframes[0]!.value,
  )?.frame ?? Number.MAX_SAFE_INTEGER;

export function getCv001CompiledBeatIssues(
  beat: Cv001BeatInput,
  program: DirectedBeatProgram,
): string[] {
  const issues = getMotionProgramIssues(program, {
    rigContract: cv001RigContract,
  }).map((issue) => `${issue.code}: ${issue.message}`);
  const movingBones = program.tracks.filter(
    (track): track is Extract<MotionTrack, { type: "bone" }> =>
      track.type === "bone" && trackRange(track) >= 2,
  );
  if (new Set(movingBones.map((track) => track.boneId)).size < 3)
    issues.push("At least three rendered bones must move by 2 degrees.");
  if (
    !movingBones.some(
      (track) =>
        ["upper-arm-right", "lower-arm-right", "hand-right"].includes(
          track.boneId,
        ) && trackRange(track) >= 12,
    )
  )
    issues.push("At least one limb track must move by 12 degrees.");
  if (
    !program.tracks.some(
      (track) =>
        track.type === "face" &&
        ["gaze-x", "mouth-open"].includes(track.channel) &&
        trackRange(track) >= 0.25,
    )
  )
    issues.push("A rendered gaze or mouth channel must change by 0.25.");
  for (const track of program.tracks) {
    if (
      track.type === "camera" &&
      trackRange(track) > 0 &&
      !(
        (track.property === "scale" && trackRange(track) >= 0.015) ||
        (["x", "y"].includes(track.property) && trackRange(track) >= 8)
      )
    )
      issues.push("Camera motion is below the perceptible floor.");
    if (
      track.type === "root" &&
      ["x", "y"].includes(track.property) &&
      trackRange(track) > 0 &&
      trackRange(track) < 4
    )
      issues.push("Root translation is below the perceptible floor.");
  }
  if (
    program.phases[0]?.startFrame !== 0 ||
    program.phases.at(-1)?.endFrame !== program.durationInFrames ||
    program.phases.some(
      (phase, index) =>
        index > 0 && program.phases[index - 1]!.endFrame !== phase.startFrame,
    )
  )
    issues.push("Performance phases must cover the beat without gaps.");
  const requiredPhaseOrder =
    beat.intent === "reach-and-pick-up"
      ? ["anticipation", "action", "overshoot", "settle", "hold"]
      : ["anticipation", "action", "settle", "hold"];
  if (
    hashCanonical(program.phases.map((phase) => phase.type)) !==
    hashCanonical(requiredPhaseOrder)
  )
    issues.push("Performance phase order does not match the beat intent.");
  const attachments = program.tracks.filter(
    (track): track is Extract<MotionTrack, { type: "attachment" }> =>
      track.type === "attachment",
  );
  if (beat.intent === "notice-prop" && attachments.length > 0)
    issues.push("Notice beat must end unattached.");
  if (beat.intent === "reach-and-pick-up") {
    if (
      attachments.length !== 1 ||
      attachments[0]!.startFrame <= 0 ||
      attachments[0]!.endFrame !== program.durationInFrames
    )
      issues.push(
        "Pickup beat must attach exactly once through its final frame.",
      );
    else {
      const continuity = getCv001AttachmentContinuity(program);
      if (
        continuity.distance >= 0.001 ||
        continuity.rotationDelta >= 0.001 ||
        continuity.scaleDelta >= 0.001
      )
        issues.push("Pickup attachment transform is discontinuous.");
    }
  }
  if (beat.intent === "react-and-present") {
    if (
      attachments.length !== 1 ||
      attachments[0]!.startFrame !== 0 ||
      attachments[0]!.endFrame !== program.durationInFrames
    )
      issues.push(
        "Present beat must remain attached for its complete duration.",
      );
    const hold = program.phases.at(-1);
    if (!hold || hold.type !== "hold" || hold.endFrame - hold.startFrame < 12)
      issues.push("Present beat final hold must last at least 12 frames.");
  }
  if (beat.intent === "notice-prop") {
    const head = program.tracks.find(
      (track): track is Exclude<MotionTrack, { type: "attachment" }> =>
        track.type === "bone" && track.boneId === "head",
    );
    const torso = program.tracks.find(
      (track): track is Exclude<MotionTrack, { type: "attachment" }> =>
        track.type === "bone" && track.boneId === "torso",
    );
    const gaze = program.tracks.find(
      (track): track is Exclude<MotionTrack, { type: "attachment" }> =>
        track.type === "face" && track.channel === "gaze-x",
    );
    if (
      !head ||
      !torso ||
      !gaze ||
      firstChangeFrame(head) >= firstChangeFrame(torso) ||
      firstChangeFrame(gaze) >= firstChangeFrame(torso)
    )
      issues.push("Notice beat gaze and head must lead the torso.");
  }
  return issues;
}

const validateInputPlan = (
  input: Cv001ThreeBeatSceneInput,
  renderPlan: FrameAccurateRenderPlan,
) => {
  if (!verifyRenderPlanHash(renderPlan))
    throw new Error("CV-001 compiler requires a verified render plan hash.");
  if (renderPlan.contentHash !== input.planContentHash)
    throw new Error("CV-001 input planContentHash does not match the plan.");
  if (renderPlan.fps !== input.fps)
    throw new Error("CV-001 input and render plan must run at 30 fps.");
  const shots = input.beats.map((beat) => {
    const matchingShots = renderPlan.shots.filter(
      (candidate) => candidate.id === beat.shotId,
    );
    if (matchingShots.length !== 1)
      throw new Error(
        matchingShots.length === 0
          ? `CV-001 shot ${beat.shotId} does not exist.`
          : `CV-001 shot ${beat.shotId} must appear exactly once in the render plan.`,
      );
    const shot = matchingShots[0]!;
    if (shot.sceneId !== input.sceneId)
      throw new Error(`CV-001 shot ${shot.id} belongs to the wrong scene.`);
    if (shot.durationInFrames !== beat.durationInFrames)
      throw new Error(
        `CV-001 shot ${shot.id} duration does not match its beat.`,
      );
    return shot;
  });
  if (
    shots.some(
      (shot, index) =>
        index > 0 && shot.startFrame <= shots[index - 1]!.startFrame,
    )
  )
    throw new Error("CV-001 shots must appear in beat order.");
};

export const createDirectedShotMotionBinding = (
  beat: Cv001BeatInput,
  program: DirectedBeatProgram,
): DirectedShotMotionBinding => {
  const draft = directedShotMotionBindingDraftSchema.parse({
    schemaVersion: "1.0",
    beatId: beat.id,
    beatContentHash: hashCanonical(beat),
    shotId: beat.shotId,
    rigContractId: cv001RigContract.id,
    program,
    programContentHash: hashCanonical(program),
  });
  return directedShotMotionBindingSchema.parse({
    ...draft,
    contentHash: hashCanonical(draft),
  });
};

export function compileCv001ThreeBeatScene({
  input: rawInput,
  renderPlan,
}: {
  input: Cv001ThreeBeatSceneInput;
  renderPlan: FrameAccurateRenderPlan;
}): Cv001CompiledSceneMotion {
  const input = cv001ThreeBeatSceneInputSchema.parse(rawInput);
  validateInputPlan(input, renderPlan);
  const programs = [
    compileNoticeBeat(input.beats[0]),
    compilePickupBeat(input.beats[1]),
    compilePresentBeat(input.beats[2]),
  ] as const;
  programs.forEach((program, index) => {
    const beat = input.beats[index]!;
    const issues = getCv001CompiledBeatIssues(beat, program);
    if (issues.length > 0)
      throw new Error(
        `CV-001 beat ${beat.id} failed compilation: ${issues.join(" ")}`,
      );
  });
  const bindings = [
    createDirectedShotMotionBinding(input.beats[0], programs[0]),
    createDirectedShotMotionBinding(input.beats[1], programs[1]),
    createDirectedShotMotionBinding(input.beats[2], programs[2]),
  ] as const;
  const draft = cv001CompiledSceneMotionDraftSchema.parse({
    schemaVersion: "1.0",
    compiler: {
      id: CV001_MOTION_COMPILER_ID,
      version: CV001_MOTION_COMPILER_VERSION,
    },
    sceneId: input.sceneId,
    planContentHash: input.planContentHash,
    rigContractId: input.rigContractId,
    bindings,
  });
  return cv001CompiledSceneMotionSchema.parse({
    ...draft,
    contentHash: hashCanonical(draft),
  });
}

export function verifyCv001CompiledSceneMotion(
  input: Cv001ThreeBeatSceneInput,
  scene: Cv001CompiledSceneMotion,
): boolean {
  const parsedInput = cv001ThreeBeatSceneInputSchema.safeParse(input);
  const parsedScene = cv001CompiledSceneMotionSchema.safeParse(scene);
  if (!parsedInput.success || !parsedScene.success) return false;
  if (
    parsedScene.data.sceneId !== parsedInput.data.sceneId ||
    parsedScene.data.planContentHash !== parsedInput.data.planContentHash ||
    parsedScene.data.rigContractId !== parsedInput.data.rigContractId
  )
    return false;
  return parsedScene.data.bindings.every((binding, index) => {
    const beat = parsedInput.data.beats[index]!;
    return (
      binding.beatId === beat.id &&
      binding.shotId === beat.shotId &&
      binding.beatContentHash === hashCanonical(beat)
    );
  });
}
