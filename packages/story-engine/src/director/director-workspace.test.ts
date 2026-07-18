import { describe, expect, it } from "vitest";
import { createCv002Project } from "../cv002-story-draft";
import { applyDirectorPatch } from "./apply-director-patch";
import { compileDirectorProject } from "./director-compiler";
import { proposeDirectorPatch } from "./director-patch";
import {
  createDirectorWorkspaceState,
  currentDirectorWorkspaceProject,
  recordDirectorWorkspaceRevision,
  restoreDirectorWorkspaceState,
  selectDirectorWorkspaceBeat,
  serializeDirectorWorkspaceState,
  undoDirectorWorkspace,
} from "./director-workspace";

const sentence =
  "A curious traveler follows a bright clue and pauses when the hidden answer changes everything.";
const script = Array.from(
  { length: 9 },
  (_, index) => `${sentence.slice(0, -1)} ${index + 1}.`,
).join(" ");

const fixture = () => {
  const storyProject = createCv002Project(
    "Workspace proof",
    script,
    "kids-adventure",
  );
  const firstCut = compileDirectorProject({ storyProject });
  const selectedBeatId = firstCut.directorPlan.events.find(
    (event) => event.kind === "reaction",
  )!.beatId;
  const patch = proposeDirectorPatch({
    baseDirectorProject: firstCut,
    targetBeatId: selectedBeatId,
    command: "Make the reaction 6 frames later",
  });
  const revisedCut = applyDirectorPatch({
    storyProject,
    baseDirectorProject: firstCut,
    patch,
  });
  return { storyProject, firstCut, selectedBeatId, patch, revisedCut };
};

describe("Director workspace", () => {
  it("restores the exact current project, history cursor, and selected beat", () => {
    const { storyProject, firstCut, selectedBeatId, patch, revisedCut } =
      fixture();
    let workspace = createDirectorWorkspaceState(
      firstCut,
      firstCut.directorPlan.beats[0]!.beatId,
    );
    workspace = selectDirectorWorkspaceBeat(workspace, selectedBeatId);
    workspace = recordDirectorWorkspaceRevision(workspace, patch, revisedCut);
    const serialized = serializeDirectorWorkspaceState(workspace);
    const restored = restoreDirectorWorkspaceState(
      serialized,
      storyProject.contentHash,
    );

    expect(restored.selectedBeatId).toBe(selectedBeatId);
    expect(restored.history.cursor).toBe(1);
    expect(currentDirectorWorkspaceProject(restored).contentHash).toBe(
      revisedCut.contentHash,
    );
    expect(
      currentDirectorWorkspaceProject(undoDirectorWorkspace(restored))
        .contentHash,
    ).toBe(firstCut.contentHash);
    expect(undoDirectorWorkspace(restored).selectedBeatId).toBe(selectedBeatId);
  });

  it("rejects a saved workspace with forged revision lineage", () => {
    const { storyProject, firstCut, selectedBeatId, patch, revisedCut } =
      fixture();
    const workspace = recordDirectorWorkspaceRevision(
      createDirectorWorkspaceState(firstCut, selectedBeatId),
      patch,
      revisedCut,
    );
    const forged = structuredClone(workspace);
    forged.history.entries[1]!.patch!.baseDirectorProjectContentHash =
      "f".repeat(64);

    expect(() =>
      restoreDirectorWorkspaceState(
        JSON.stringify(forged),
        storyProject.contentHash,
      ),
    ).toThrow();
  });
});
