import type { ExecutableEpisodePlan } from "@storystage/story-engine/director-alpha";
import {
  DirectorGuideAudioLayer,
  type DirectorGuideAudioPlayback,
} from "./DirectorGuideAudioLayer";
import { DirectorEpisodeRenderer } from "./DirectorEpisodeRenderer";

export type DirectorProductionCompositionProps = {
  episodePlan: ExecutableEpisodePlan;
  guideAudio?: DirectorGuideAudioPlayback;
};

/** Browser Player entrypoint. StoryStageProduction delegates to the exact same
 * renderer for worker export, so both paths consume identical episode bytes. */
export const DirectorProductionComposition: React.FC<
  DirectorProductionCompositionProps
> = ({ episodePlan, guideAudio }) => (
  <>
    <DirectorEpisodeRenderer episodePlan={episodePlan} />
    {guideAudio ? (
      <DirectorGuideAudioLayer
        format={episodePlan.format}
        playback={guideAudio}
      />
    ) : null}
  </>
);
