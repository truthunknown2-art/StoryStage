import {
  calculateLegacyEpisodeDurationInFrames,
  sampleEpisodePlan,
} from "@storystage/fixtures";
import {
  buildAnimaticSync,
  createProductionDraft,
  cv001LanternMotionProgram,
  sampleWorkshopScript,
} from "@storystage/story-engine";
import { Composition } from "remotion";
import {
  ProductionComposition,
  type ProductionCompositionProps,
} from "./ProductionComposition";
import {
  RigDiagnosticComposition,
  type RigDiagnosticCompositionProps,
} from "./RigDiagnosticComposition";
import { Cv001RigProofComposition } from "./Cv001RigProofComposition";
import { StoryStageComposition } from "./StoryStageComposition";
import {
  STORY_STAGE_COMPOSITION_ID,
  STORY_STAGE_CV001_RIG_PROOF_COMPOSITION_ID,
  STORY_STAGE_PRODUCTION_COMPOSITION_ID,
  STORY_STAGE_RIG_DIAGNOSTIC_COMPOSITION_ID,
} from "./manifest";

export {
  STORY_STAGE_COMPOSITION_ID,
  STORY_STAGE_CV001_RIG_PROOF_COMPOSITION_ID,
  STORY_STAGE_PRODUCTION_COMPOSITION_ID,
  STORY_STAGE_RIG_DIAGNOSTIC_COMPOSITION_ID,
} from "./manifest";

const defaultProductionBuild = buildAnimaticSync({
  draft: createProductionDraft({
    productionId: "production-remotion-default",
    title: "The Punctual Box",
    projectType: "explainer",
    showPackId: "weird-history-editorial-v1",
    preset: "studio",
    script: sampleWorkshopScript,
  }),
});
const defaultProductionProps: ProductionCompositionProps = {
  plan: defaultProductionBuild.renderPlan,
  playbackAssets: {},
  sliceDurationInFrames: Math.min(
    defaultProductionBuild.renderPlan.durationInFrames,
    720,
  ),
};
const transparentPixel =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAF/gL+Avz9WQAAAABJRU5ErkJggg==";
const defaultDiagnosticProps: RigDiagnosticCompositionProps = {
  asset: {
    type: "prop",
    assetId: "diagnostic-placeholder",
    assetClass: "prop",
    cutout: transparentPixel,
  },
  entityName: "Selected asset",
};

export const StoryStageRoot: React.FC = () => {
  return (
    <>
      <Composition
        id={STORY_STAGE_COMPOSITION_ID}
        component={StoryStageComposition}
        durationInFrames={calculateLegacyEpisodeDurationInFrames(
          sampleEpisodePlan,
        )}
        fps={sampleEpisodePlan.fps}
        width={sampleEpisodePlan.width}
        height={sampleEpisodePlan.height}
        defaultProps={{ plan: sampleEpisodePlan }}
      />
      <Composition
        id={STORY_STAGE_RIG_DIAGNOSTIC_COMPOSITION_ID}
        component={RigDiagnosticComposition}
        durationInFrames={120}
        fps={30}
        width={1280}
        height={720}
        defaultProps={defaultDiagnosticProps}
      />
      <Composition
        id={STORY_STAGE_CV001_RIG_PROOF_COMPOSITION_ID}
        component={Cv001RigProofComposition}
        durationInFrames={cv001LanternMotionProgram.durationInFrames}
        fps={cv001LanternMotionProgram.fps}
        width={1920}
        height={1080}
        defaultProps={{ program: cv001LanternMotionProgram }}
      />
      <Composition
        id={STORY_STAGE_PRODUCTION_COMPOSITION_ID}
        component={ProductionComposition}
        durationInFrames={defaultProductionProps.sliceDurationInFrames}
        fps={defaultProductionProps.plan.fps}
        width={defaultProductionProps.plan.width}
        height={defaultProductionProps.plan.height}
        defaultProps={defaultProductionProps}
        calculateMetadata={({ props }) => ({
          durationInFrames:
            props.mode === "director-episode"
              ? props.episodePlan.format.durationInFrames
              : Math.min(
                  props.sliceDurationInFrames,
                  props.plan.durationInFrames,
                ),
          fps:
            props.mode === "director-episode"
              ? props.episodePlan.format.fps
              : props.plan.fps,
          width:
            props.mode === "director-episode"
              ? props.episodePlan.format.width
              : props.plan.width,
          height:
            props.mode === "director-episode"
              ? props.episodePlan.format.height
              : props.plan.height,
        })}
      />
    </>
  );
};

export { StoryStageComposition };
export type { StoryStageCompositionProps } from "./StoryStageComposition";
export { ProductionComposition };
export type {
  ProductionCompositionProps,
  LegacyProductionCompositionProps,
  DirectorEpisodeProductionProps,
  PlaybackAsset,
} from "./ProductionComposition";
export { DirectorEpisodeRenderer } from "./director/DirectorEpisodeRenderer";
export { RigDiagnosticComposition };
export type { RigDiagnosticCompositionProps } from "./RigDiagnosticComposition";
export { Cv001RigProofComposition };
export type { Cv001RigProofCompositionProps } from "./Cv001RigProofComposition";
export {
  KIDS_SHOWCASE_DURATION_IN_FRAMES,
  KIDS_SHOWCASE_FPS,
  KIDS_SHOWCASE_HEIGHT,
  KIDS_SHOWCASE_WIDTH,
  KidsShowcaseComposition,
  kidsShowcaseShots,
} from "./KidsShowcaseComposition";
export type {
  KidsShowcaseCompositionProps,
  KidsShowcaseShot,
} from "./KidsShowcaseComposition";
export {
  cv001RigLayout,
  getCv001AttachmentContinuity,
  getCv001LanternHandAnchor,
  getCv001LanternHandTransform,
  getCv001LanternPickupAnchor,
  getCv001LanternPickupTransform,
} from "./cv001-rig-kinematics";
export type { Cv001WorldTransform } from "./cv001-rig-kinematics";
export {
  assertDirectedShotMotionBinding,
  assertDirectedShotMotionBindings,
  assertDirectedSceneMotion,
} from "./production-motion-binding";
export type { DirectedShotMotionBinding } from "./production-motion-binding";
