import {
  assertMotionProgram,
  cv001RigContract,
  directedShotMotionBindingSchema,
  verifyRenderPlanHash,
  type DirectedShotMotionBinding,
  type FrameAccurateRenderPlan,
} from "@storystage/story-engine";

export type { DirectedShotMotionBinding } from "@storystage/story-engine";

export function assertDirectedShotMotionBindings(
  plan: FrameAccurateRenderPlan,
  sliceDurationInFrames: number,
  bindings: DirectedShotMotionBinding[],
): DirectedShotMotionBinding[] {
  if (!verifyRenderPlanHash(plan))
    throw new Error("Directed motion requires a verified render plan hash.");
  const parsedBindings = bindings.map((binding) =>
    directedShotMotionBindingSchema.parse(binding),
  );
  if (
    new Set(parsedBindings.map((binding) => binding.shotId)).size !==
    parsedBindings.length
  )
    throw new Error("Directed motion bindings may not target a shot twice.");
  const renderedDuration = Math.min(
    sliceDurationInFrames,
    plan.durationInFrames,
  );
  return parsedBindings.map((binding) => {
    const program = assertMotionProgram(binding.program, {
      rigContract: cv001RigContract,
    });
    const shot = plan.shots.find(
      (candidate) => candidate.id === binding.shotId,
    );
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
    if (shot.startFrame + shot.durationInFrames > renderedDuration)
      throw new Error(
        `Directed motion shot ${shot.id} is truncated by render duration ${renderedDuration}.`,
      );
    return binding;
  });
}

export function assertDirectedShotMotionBinding(
  plan: FrameAccurateRenderPlan,
  sliceDurationInFrames: number,
  binding: DirectedShotMotionBinding,
): DirectedShotMotionBinding {
  return assertDirectedShotMotionBindings(plan, sliceDurationInFrames, [
    binding,
  ])[0]!;
}
