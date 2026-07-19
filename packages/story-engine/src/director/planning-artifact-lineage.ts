import type { DirectorPlan } from "./director-plan";
import type { DirectorProposal } from "./director-proposal";

export const PLANNING_ARTIFACT_DIRECTOR_PLAN_LINEAGE_ERROR =
  "Director planning artifact beat lineage does not match the Director plan.";

/**
 * Cross-artifact containment for the exact beat identity that survived
 * deterministic compilation. The Director plan order is the canonical source
 * order established at compiler entry; neither artifact may reorder, omit,
 * duplicate, or substitute a beat after that boundary.
 */
export function assertPlanningArtifactMatchesDirectorPlan(
  planningArtifact: Pick<DirectorProposal, "beatDirections">,
  directorPlan: Pick<DirectorPlan, "beats">,
): void {
  const directions = planningArtifact.beatDirections;
  const plannedBeats = directorPlan.beats;
  if (
    directions.length !== plannedBeats.length ||
    directions.some((direction, index) => {
      const plannedBeat = plannedBeats[index];
      return (
        !plannedBeat ||
        direction.beatId !== plannedBeat.beatId ||
        direction.beatContentHash !== plannedBeat.beatContentHash
      );
    })
  )
    throw new Error(PLANNING_ARTIFACT_DIRECTOR_PLAN_LINEAGE_ERROR);
}
