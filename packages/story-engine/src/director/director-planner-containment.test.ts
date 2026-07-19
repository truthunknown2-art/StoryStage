import { describe, expect, it } from "vitest";
import { hashCanonical } from "../canonical-hash";
import { createCv002ArtDirectionSelection } from "../cv002-art-direction";
import { createCv002Project } from "../cv002-story-draft";
import {
  compileDirectorProject,
  tryCompileDirectorProject,
} from "./director-compiler";
import {
  Cv002AlphaDirectorPlanner,
  type DirectorPlanner,
  type DirectorProposalDraft,
} from "./director-proposal";

const sentence =
  "A curious traveler follows a bright clue and pauses when the hidden answer changes everything.";
const script = Array.from(
  { length: 9 },
  (_, index) => `${sentence.slice(0, -1)} ${index + 1}.`,
).join(" ");

const storyProject = createCv002Project(
  "Planner containment",
  script,
  "kids-adventure",
  createCv002ArtDirectionSelection(
    "kids-adventure",
    "cut-paper-collage-mixed-media",
  ),
);

const otherStoryProject = createCv002Project(
  "Other planner lineage",
  script.replaceAll("traveler", "wanderer"),
  "kids-adventure",
  createCv002ArtDirectionSelection(
    "kids-adventure",
    "cut-paper-collage-mixed-media",
  ),
);

type BeatDirection = DirectorProposalDraft["beatDirections"][number];

const resealDirection = (
  direction: BeatDirection,
  patch: Partial<Omit<BeatDirection, "contentHash">>,
): BeatDirection => {
  const { contentHash: _contentHash, ...draft } = direction;
  void _contentHash;
  const next = { ...draft, ...patch };
  return { ...next, contentHash: hashCanonical(next) };
};

const customPlanner = (
  mutate: (proposal: DirectorProposalDraft) => DirectorProposalDraft,
): DirectorPlanner => {
  const basePlanner = new Cv002AlphaDirectorPlanner();
  return {
    propose(context) {
      return mutate(basePlanner.propose(context));
    },
  };
};

const expectPlannerOutputRejected = (
  planner: DirectorPlanner,
  message: string,
) => {
  expect(tryCompileDirectorProject({ storyProject, planner })).toEqual({
    ok: false,
    diagnostics: [{ code: "planner-output-invalid", message }],
  });
};

describe("Director planner containment", () => {
  it("rejects a self-rehashed direction carrying another beat's content hash", () => {
    const planner = customPlanner((proposal) => ({
      ...proposal,
      plannerId: "cross-beat-hash-substitution",
      beatDirections: [
        resealDirection(proposal.beatDirections[0]!, {
          beatContentHash: proposal.beatDirections[1]!.beatContentHash,
        }),
        ...proposal.beatDirections.slice(1),
      ],
    }));

    expectPlannerOutputRejected(
      planner,
      "Director proposal beat directions must reference the exact canonical beat content hashes.",
    );
  });

  it.each([
    {
      name: "duplicates one beat direction",
      mutate: (directions: BeatDirection[]) => [
        directions[0]!,
        directions[0]!,
        ...directions.slice(2),
      ],
    },
    {
      name: "omits one beat direction",
      mutate: (directions: BeatDirection[]) => directions.slice(0, -1),
    },
    {
      name: "reorders beat directions",
      mutate: (directions: BeatDirection[]) => [
        directions[1]!,
        directions[0]!,
        ...directions.slice(2),
      ],
    },
  ])("rejects a proposal that $name", ({ mutate }) => {
    const planner = customPlanner((proposal) => ({
      ...proposal,
      plannerId: "invalid-beat-coverage",
      beatDirections: mutate(proposal.beatDirections),
    }));

    expectPlannerOutputRejected(
      planner,
      "Director proposal must cover every story beat exactly once in source order.",
    );
  });

  it("rejects a substituted story-graph lineage", () => {
    const planner = customPlanner((proposal) => ({
      ...proposal,
      plannerId: "substituted-graph-lineage",
      storyGraphContentHash: otherStoryProject.graph.contentHash,
    }));

    expectPlannerOutputRejected(
      planner,
      "Director proposal is not bound to the current story graph.",
    );
  });

  it("rejects a substituted grammar lineage", () => {
    const planner = customPlanner((proposal) => ({
      ...proposal,
      plannerId: "substituted-grammar-lineage",
      grammar: "weird-history",
    }));

    expectPlannerOutputRejected(
      planner,
      "Director proposal is not bound to the current story graph.",
    );
  });

  it("accepts a custom planner whose directions retain canonical lineage", () => {
    const planner = customPlanner((proposal) => ({
      ...proposal,
      plannerId: "valid-custom-planner",
      beatDirections: [
        resealDirection(proposal.beatDirections[0]!, {
          shotSize: "close-up",
          cameraIntent: "gentle-push",
        }),
        ...proposal.beatDirections.slice(1),
      ],
    }));

    const project = compileDirectorProject({ storyProject, planner });

    expect(project.status).toBe("animatic-ready");
    expect(project.planningArtifact.plannerId).toBe("valid-custom-planner");
    expect(project.planningArtifact.beatDirections[0]).toMatchObject({
      beatId: storyProject.graph.scenes[0]!.beats[0]!.id,
      beatContentHash: storyProject.graph.scenes[0]!.beats[0]!.contentHash,
      shotSize: "close-up",
      cameraIntent: "gentle-push",
    });
    expect(project.storyProjectContentHash).toBe(storyProject.contentHash);
    expect(project.planningArtifact.storyGraphContentHash).toBe(
      storyProject.graph.contentHash,
    );
  });
});
