import {readFileSync} from "node:fs";
import {creativeEpisodePlanSchema} from "../../../../packages/story-engine/src/model";
import {measureDirectedPlan} from "../../../../packages/story-engine/src/metrics";
import {createProductionDraft, buildAnimaticSync} from "../../../../packages/story-engine/src/pipeline";
import {sampleWorkshopScript} from "../../../../packages/story-engine/src/sample-script";
import {getShowPack} from "../../../../packages/story-engine/src/show-pack";

const [kidsPath, historyPath] = process.argv.slice(2);
if (!kidsPath || !historyPath) throw new Error("Usage: compare-profile-output.ts <creative-plan.json|builtin:show-pack-id> <creative-plan.json|builtin:show-pack-id>");
const measure = (source: string) => {
  if (!source.startsWith("builtin:")) return measureDirectedPlan(creativeEpisodePlanSchema.parse(JSON.parse(readFileSync(source, "utf8"))));
  const showPack = getShowPack(source.slice("builtin:".length));
  const draft = createProductionDraft({
    productionId: `profile-proof-${showPack.projectType}`,
    title: `${showPack.displayName} profile proof`,
    projectType: showPack.projectType,
    showPackId: showPack.id,
    preset: "studio",
    script: sampleWorkshopScript,
  });
  return measureDirectedPlan(buildAnimaticSync({draft}).creativePlan);
};
const kids = measure(kidsPath);
const history = measure(historyPath);
const routedShare = (metrics: typeof kids) => ["insert", "kinetic-type", "diagram", "licensed-media", "generated-illustration"].reduce((sum, treatment) => sum + (metrics.treatmentDistribution[treatment] ?? 0), 0);
const cadenceRatio = Math.max(kids.averageShotSeconds, history.averageShotSeconds) / Math.min(kids.averageShotSeconds, history.averageShotSeconds);
const result = {
  cadenceRatio,
  historyInsertRoutingRatio: routedShare(history) / routedShare(kids),
  kidsPerformanceRatio: kids.performanceEventsPerMinute / history.performanceEventsPerMinute,
  cameraBehaviorDiffers: kids.cameraActionsPerMinute !== history.cameraActionsPerMinute,
  transitionsDiffer: JSON.stringify(kids.transitionDistribution) !== JSON.stringify(history.transitionDistribution),
  textDensityDiffers: kids.textEventsPerMinute !== history.textEventsPerMinute,
  assetIntentDiffers: JSON.stringify(kids.assetSourceDistribution) !== JSON.stringify(history.assetSourceDistribution),
};
const passes = cadenceRatio >= 1.2 && routedShare(history) >= routedShare(kids) * 1.5 && kids.performanceEventsPerMinute >= history.performanceEventsPerMinute * 1.5 && result.cameraBehaviorDiffers && result.transitionsDiffer && result.textDensityDiffers && result.assetIntentDiffers;
process.stdout.write(`${JSON.stringify({...result, passes}, null, 2)}\n`);
if (!passes) process.exitCode = 1;
