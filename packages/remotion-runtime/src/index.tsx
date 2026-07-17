import {calculateLegacyEpisodeDurationInFrames, sampleEpisodePlan} from "@storystage/fixtures";
import {buildAnimaticSync, createProductionDraft, sampleWorkshopScript} from "@storystage/story-engine";
import {Composition} from "remotion";
import {ProductionComposition, type ProductionCompositionProps} from "./ProductionComposition";
import {RigDiagnosticComposition, type RigDiagnosticCompositionProps} from "./RigDiagnosticComposition";
import {StoryStageComposition} from "./StoryStageComposition";
import {STORY_STAGE_COMPOSITION_ID, STORY_STAGE_PRODUCTION_COMPOSITION_ID, STORY_STAGE_RIG_DIAGNOSTIC_COMPOSITION_ID} from "./manifest";

export {STORY_STAGE_COMPOSITION_ID, STORY_STAGE_PRODUCTION_COMPOSITION_ID, STORY_STAGE_RIG_DIAGNOSTIC_COMPOSITION_ID} from "./manifest";

const defaultProductionBuild = buildAnimaticSync({draft: createProductionDraft({productionId: "production-remotion-default", title: "The Punctual Box", projectType: "explainer", showPackId: "weird-history-editorial-v1", preset: "studio", script: sampleWorkshopScript})});
const defaultProductionProps: ProductionCompositionProps = {plan: defaultProductionBuild.renderPlan, playbackAssets: {}, sliceDurationInFrames: Math.min(defaultProductionBuild.renderPlan.durationInFrames, 720)};
const transparentPixel = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAF/gL+Avz9WQAAAABJRU5ErkJggg==";
const defaultDiagnosticProps: RigDiagnosticCompositionProps = {asset: {type: "prop", assetId: "diagnostic-placeholder", assetClass: "prop", cutout: transparentPixel}, entityName: "Selected asset"};

export const StoryStageRoot: React.FC = () => {
  return (
    <>
    <Composition
      id={STORY_STAGE_COMPOSITION_ID}
      component={StoryStageComposition}
      durationInFrames={calculateLegacyEpisodeDurationInFrames(sampleEpisodePlan)}
      fps={sampleEpisodePlan.fps}
      width={sampleEpisodePlan.width}
      height={sampleEpisodePlan.height}
      defaultProps={{plan: sampleEpisodePlan}}
    />
    <Composition id={STORY_STAGE_RIG_DIAGNOSTIC_COMPOSITION_ID} component={RigDiagnosticComposition} durationInFrames={120} fps={30} width={1280} height={720} defaultProps={defaultDiagnosticProps} />
    <Composition
      id={STORY_STAGE_PRODUCTION_COMPOSITION_ID}
      component={ProductionComposition}
      durationInFrames={defaultProductionProps.sliceDurationInFrames}
      fps={defaultProductionProps.plan.fps}
      width={defaultProductionProps.plan.width}
      height={defaultProductionProps.plan.height}
      defaultProps={defaultProductionProps}
      calculateMetadata={({props}) => ({durationInFrames: Math.min(props.sliceDurationInFrames, props.plan.durationInFrames), fps: props.plan.fps, width: props.plan.width, height: props.plan.height})}
    />
    </>
  );
};

export {StoryStageComposition};
export type {StoryStageCompositionProps} from "./StoryStageComposition";
export {ProductionComposition};
export type {ProductionCompositionProps, PlaybackAsset} from "./ProductionComposition";
export {RigDiagnosticComposition};
export type {RigDiagnosticCompositionProps} from "./RigDiagnosticComposition";
