import type { ExecutableEpisodePlan } from "@storystage/story-engine/director-alpha";
import { DirectorEpisodeRenderer } from "./DirectorEpisodeRenderer";

export type DirectorProductionCompositionProps = {
  episodePlan: ExecutableEpisodePlan;
};

/** Browser Player entrypoint. StoryStageProduction delegates to the exact same
 * renderer for worker export, so both paths consume identical episode bytes. */
export const DirectorProductionComposition: React.FC<
  DirectorProductionCompositionProps
> = ({ episodePlan }) => <DirectorEpisodeRenderer episodePlan={episodePlan} />;
