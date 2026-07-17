import {compileAnimation} from "./animation-compiler";
import {resolveAssets} from "./asset-resolver";
import {directEpisode} from "./director";
import {
  type CreativeEpisodePlan,
  type FrameAccurateRenderPlan,
  type ProductionPreset,
  type ResolvedProductionPlan,
  type ScriptDocument,
  type ShotOverride,
  type StoryAnalysis,
} from "./model";
import {analyzeStory, parseScript} from "./script-parser";
import {getProductionPolicy} from "./production-policy";
import {getShowPack} from "./show-pack";
import {createEstimatedTiming, EstimatedTextTimingProvider, type DialogueTimingProvider} from "./timing";

export type BuildAnimaticInput = {
  script: string;
  title?: string;
  showPackId: string;
  preset?: ProductionPreset;
  overrides?: ShotOverride[];
  timingProvider?: DialogueTimingProvider;
};

export type AnimaticBuild = {
  scriptDocument: ScriptDocument;
  storyAnalysis: StoryAnalysis;
  creativePlan: CreativeEpisodePlan;
  resolvedPlan: ResolvedProductionPlan;
  renderPlan: FrameAccurateRenderPlan;
};

function buildFromStages(
  input: BuildAnimaticInput,
  scriptDocument: ScriptDocument,
  storyAnalysis: StoryAnalysis,
  timing: ReturnType<typeof createEstimatedTiming>,
): AnimaticBuild {
  const showPack = getShowPack(input.showPackId);
  const productionPolicy = getProductionPolicy(input.preset ?? "studio");
  const creativePlan = directEpisode(scriptDocument, storyAnalysis, timing, {productionPolicy, showPack});
  const resolvedPlan = resolveAssets(creativePlan, showPack, input.overrides ?? []);
  return {scriptDocument, storyAnalysis, creativePlan, resolvedPlan, renderPlan: compileAnimation(resolvedPlan)};
}

export function buildAnimaticSync(input: BuildAnimaticInput): AnimaticBuild {
  const scriptDocument = parseScript(input.script, input.title);
  const storyAnalysis = analyzeStory(scriptDocument);
  const timing = createEstimatedTiming(scriptDocument);
  return buildFromStages(input, scriptDocument, storyAnalysis, timing);
}

export async function buildAnimatic(input: BuildAnimaticInput): Promise<AnimaticBuild> {
  const scriptDocument = parseScript(input.script, input.title);
  const storyAnalysis = analyzeStory(scriptDocument);
  const timingProvider = input.timingProvider ?? new EstimatedTextTimingProvider();
  const timing = await timingProvider.createTiming(scriptDocument);
  return buildFromStages(input, scriptDocument, storyAnalysis, timing);
}
