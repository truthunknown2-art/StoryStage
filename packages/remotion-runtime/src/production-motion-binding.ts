import {
  assertMotionProgram,
  type DirectedBeatProgram,
  type FrameAccurateRenderPlan,
} from "@storystage/story-engine";

export type DirectedShotMotionBinding = {
  shotId: string;
  program: DirectedBeatProgram;
};

export function assertDirectedShotMotionBinding(
  plan: FrameAccurateRenderPlan,
  sliceDurationInFrames: number,
  binding: DirectedShotMotionBinding,
): DirectedShotMotionBinding {
  const program = assertMotionProgram(binding.program, { cv001Proof: true });
  const shot = plan.shots.find((candidate) => candidate.id === binding.shotId);
  if (!shot)
    throw new Error(
      `Directed motion target ${binding.shotId} does not exist in render plan ${plan.id}.`,
    );
  if (plan.fps !== program.fps)
    throw new Error(
      `Directed motion fps ${program.fps} does not match render plan fps ${plan.fps}.`,
    );
  if (shot.durationInFrames !== program.durationInFrames)
    throw new Error(
      `Directed motion duration ${program.durationInFrames} does not match shot ${shot.id} duration ${shot.durationInFrames}.`,
    );
  const renderedDuration = Math.min(
    sliceDurationInFrames,
    plan.durationInFrames,
  );
  if (shot.startFrame + shot.durationInFrames > renderedDuration)
    throw new Error(
      `Directed motion shot ${shot.id} is truncated by render duration ${renderedDuration}.`,
    );
  return { shotId: binding.shotId, program };
}
