import {directedPlanMetricsSchema, type CreativeEpisodePlan, type DirectedPlanMetrics, type FrameAccurateRenderPlan} from "./model";

type MeasurablePlan = Pick<CreativeEpisodePlan, "fps" | "shots" | "visualRequirements"> | Pick<FrameAccurateRenderPlan, "fps" | "shots">;

function distribution(values: string[]): Record<string, number> {
  if (values.length === 0) return {};
  const counts = new Map<string, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return Object.fromEntries([...counts].sort(([left], [right]) => left.localeCompare(right)).map(([key, count]) => [key, count / values.length]));
}

export function measureDirectedPlan(plan: MeasurablePlan): DirectedPlanMetrics {
  const durationFrames = plan.shots.reduce((sum, shot) => sum + shot.durationInFrames, 0);
  const minutes = durationFrames / plan.fps / 60;
  const durations = plan.shots.map((shot) => shot.durationInFrames / plan.fps).sort((left, right) => left - right);
  const middle = Math.floor(durations.length / 2);
  const median = durations.length % 2 ? durations[middle]! : (durations[middle - 1]! + durations[middle]!) / 2;
  const actionTypes = plan.shots.flatMap((shot) => shot.actions.map((action) => action.detail.type));
  const captions = plan.shots.map((shot) => shot.caption).filter((caption): caption is string => Boolean(caption));
  const sources = "visualRequirements" in plan ? plan.visualRequirements.map((requirement) => requirement.sourceIntent) : [];
  return directedPlanMetricsSchema.parse({
    averageShotSeconds: durationFrames / plan.shots.length / plan.fps,
    medianShotSeconds: median,
    cutsPerMinute: plan.shots.length / minutes,
    framingDistribution: distribution(plan.shots.map((shot) => shot.framing)),
    treatmentDistribution: distribution(plan.shots.map((shot) => shot.treatment)),
    cameraActionsPerMinute: actionTypes.filter((type) => ["cameraPush", "pan", "reframe"].includes(type)).length / minutes,
    transitionDistribution: distribution(plan.shots.map((shot) => shot.transition)),
    textEventsPerMinute: (captions.length + actionTypes.filter((type) => type === "kineticType").length) / minutes,
    textWordsPerMinute: captions.reduce((sum, caption) => sum + caption.split(/\s+/).filter(Boolean).length, 0) / minutes,
    performanceEventsPerMinute: actionTypes.filter((type) => ["gesture", "react", "enter", "beatAccent"].includes(type)).length / minutes,
    poseChangesPerMinute: actionTypes.filter((type) => type === "poseChange").length / minutes,
    reactionsPerMinute: actionTypes.filter((type) => type === "react").length / minutes,
    assetSourceDistribution: distribution(sources),
    maximumStaticFrames: Math.max(...plan.shots.map((shot) => shot.durationInFrames)),
  });
}
