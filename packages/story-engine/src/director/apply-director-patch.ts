import { cv002ProjectSchema, type Cv002Project } from "../cv002-story-draft";
import { compileDirectorProject } from "./director-compiler";
import { directorPatchSchema, type DirectorPatch } from "./director-patch";
import {
  directorProjectSchema,
  type DirectorProject,
} from "./director-project";
import {
  Cv002AlphaDirectorPlanner,
  type DirectorPlanner,
} from "./director-proposal";

class DirectorPatchPlanner implements DirectorPlanner {
  constructor(
    private readonly base: DirectorProject,
    private readonly patch: DirectorPatch,
  ) {}

  propose({ storyProject }: Parameters<DirectorPlanner["propose"]>[0]) {
    const proposal = new Cv002AlphaDirectorPlanner().propose({ storyProject });
    const delays = new Map(
      this.base.directorPlan.beats
        .filter((beat) => beat.reactionDelayFrames > 0)
        .map((beat) => [beat.beatId, beat.reactionDelayFrames]),
    );
    this.patch.operations.forEach((operation) => {
      if (operation.kind === "delay-reaction")
        delays.set(
          operation.beatId,
          (delays.get(operation.beatId) ?? 0) + operation.frames,
        );
    });
    return {
      ...proposal,
      plannerId: "director-patch-applier",
      plannerVersion: "1.0",
      beatTimingAdjustments: [...delays.entries()].map(
        ([beatId, reactionDelayFrames]) => ({ beatId, reactionDelayFrames }),
      ),
    };
  }
}

export function applyDirectorPatch(input: {
  storyProject: Cv002Project;
  baseDirectorProject: DirectorProject;
  patch: DirectorPatch;
}): DirectorProject {
  const storyProject = cv002ProjectSchema.parse(input.storyProject);
  const base = directorProjectSchema.parse(input.baseDirectorProject);
  const patch = directorPatchSchema.parse(input.patch);
  if (patch.baseDirectorProjectContentHash !== base.contentHash)
    throw new Error("Director patch is stale for the selected first cut.");
  if (base.storyProjectContentHash !== storyProject.contentHash)
    throw new Error(
      "Director patch story source does not match its first cut.",
    );
  const currentDelay =
    base.directorPlan.beats.find((beat) => beat.beatId === patch.targetBeatId)
      ?.reactionDelayFrames ?? 0;
  const addedDelay = patch.operations.reduce(
    (total, operation) => total + operation.frames,
    0,
  );
  if (currentDelay + addedDelay > 30)
    throw new Error("Accumulated reaction delay cannot exceed 30 frames.");

  return compileDirectorProject({
    storyProject,
    planner: new DirectorPatchPlanner(base, patch),
    revision: {
      baseDirectorProjectContentHash: base.contentHash,
      directorPatchContentHash: patch.contentHash,
    },
  });
}
