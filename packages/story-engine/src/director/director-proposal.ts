import type {
  Cv002BeatDirection,
  Cv002Grammar,
  Cv002Project,
} from "../cv002-story-draft";

/** AI-judgment boundary. A future GPT/Codex skill emits this contract; the
 * deterministic compiler remains responsible for validating and sealing it. */
export type DirectorProposal = {
  schemaVersion: "1.0";
  plannerId: string;
  plannerVersion: string;
  storyGraphContentHash: string;
  grammar: Cv002Grammar;
  beatDirections: Cv002BeatDirection[];
};

export type DirectorPlanningContext = {
  storyProject: Cv002Project;
};

export interface DirectorPlanner {
  propose(input: DirectorPlanningContext): DirectorProposal;
}

export class Cv002AlphaDirectorPlanner implements DirectorPlanner {
  propose({ storyProject }: DirectorPlanningContext): DirectorProposal {
    return {
      schemaVersion: "1.0",
      plannerId: "cv002-alpha-director",
      plannerVersion: "1.0",
      storyGraphContentHash: storyProject.graph.contentHash,
      grammar: storyProject.grammar,
      beatDirections: storyProject.directionDraft.directions,
    };
  }
}
