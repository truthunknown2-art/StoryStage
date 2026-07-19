import { createCv002Project } from "../cv002-story-draft";
import { createCv002ArtDirectionSelection } from "../cv002-art-direction";
import {
  Cv002AlphaDirectorPlanner,
  type DirectorPlanner,
  type DirectorProposalDraft,
} from "./director-proposal";

export const KVP001_PROOF_LIMITATION =
  "KVP-001 proves that an explicit upstream Director locomotion decision compiles through the canonical production path. It does not claim that the ordinary planner infers this performance from arbitrary scripts.";

const firstSentence = [
  ...Array.from({ length: 43 }, (_, index) => `wonder${index}`),
  "shocked!",
].join(" ");
const remainder = Array.from(
  { length: 5 },
  (_, sentenceIndex) =>
    `${Array.from(
      { length: 12 },
      (_, wordIndex) => `detail${sentenceIndex}x${wordIndex}`,
    ).join(" ")}.`,
).join(" ");

export const kvp001KidsScript = `${firstSentence} ${remainder}`;

export class Kvp001ProofDirectorPlanner implements DirectorPlanner {
  readonly basePlanner = new Cv002AlphaDirectorPlanner();

  propose(
    input: Parameters<DirectorPlanner["propose"]>[0],
  ): DirectorProposalDraft {
    const draft = this.basePlanner.propose(input);
    const firstBeat = input.storyProject.graph.scenes[0]!.beats[0]!;
    return {
      ...draft,
      plannerId: "kvp001-proof-director",
      plannerVersion: "1.0",
      shotOverrides: [
        ...draft.shotOverrides,
        {
          beatId: firstBeat.id,
          shotId: "shot-1-main",
          shotSize: null,
          cameraMovement: null,
          locomotion: {
            entityId: "lead",
            destinationLandmarkId: "exit-1",
            mode: "running",
            decelerationFrames: 30,
            impactFrames: 8,
            settleFrames: 30,
          },
        },
      ],
    };
  }
}

export const createKvp001ProofFixture = () => ({
  storyProject: createCv002Project(
    "KVP exact first shot",
    kvp001KidsScript,
    "kids-adventure",
    createCv002ArtDirectionSelection(
      "kids-adventure",
      "cut-paper-collage-mixed-media",
    ),
  ),
  planner: new Kvp001ProofDirectorPlanner(),
  limitation: KVP001_PROOF_LIMITATION,
});
