import {calculateLegacyEpisodeDurationInFrames, sampleEpisodePlan} from "@storystage/fixtures";
import {Composition} from "remotion";
import {StoryStageComposition} from "./StoryStageComposition";
import {STORY_STAGE_COMPOSITION_ID} from "./manifest";

export {STORY_STAGE_COMPOSITION_ID} from "./manifest";

export const StoryStageRoot: React.FC = () => {
  return (
    <Composition
      id={STORY_STAGE_COMPOSITION_ID}
      component={StoryStageComposition}
      durationInFrames={calculateLegacyEpisodeDurationInFrames(sampleEpisodePlan)}
      fps={sampleEpisodePlan.fps}
      width={sampleEpisodePlan.width}
      height={sampleEpisodePlan.height}
      defaultProps={{plan: sampleEpisodePlan}}
    />
  );
};

export {StoryStageComposition};
export type {StoryStageCompositionProps} from "./StoryStageComposition";
