import { describe, expect, it } from "vitest";
import { hashCanonical } from "../canonical-hash";
import { createCv002Project } from "../cv002-story-draft";
import { createCv002ArtDirectionSelection } from "../cv002-art-direction";
import { applyDirectorPatch } from "./apply-director-patch";
import { createCapabilityRegistry } from "./capability-report";
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

const reseal = <T extends { contentHash: string }>(value: T): T => {
  const { contentHash: _contentHash, ...draft } = value;
  void _contentHash;
  return { ...draft, contentHash: hashCanonical(draft) } as T;
};

const fixture = () => {
  const storyProject = createCv002Project(
    "Workspace proof",
    script,
    "kids-adventure",
    createCv002ArtDirectionSelection(
      "kids-adventure",
      "cut-paper-collage-mixed-media",
    ),
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
  it("binds an unpatched H0 workspace to the exact supplied capability registry", () => {
    const storyProject = createCv002Project(
      "Registry continuity",
      script,
      "kids-adventure",
      createCv002ArtDirectionSelection(
        "kids-adventure",
        "cut-paper-collage-mixed-media",
      ),
    );
    const registryA = createCapabilityRegistry({
      version: "workspace-registry-a",
      capabilities: [],
    });
    const registryB = createCapabilityRegistry({
      version: "workspace-registry-b",
      capabilities: [],
    });
    const firstCut = compileDirectorProject({
      storyProject,
      capabilities: registryA,
    });
    const serialized = serializeDirectorWorkspaceState(
      createDirectorWorkspaceState(
        firstCut,
        firstCut.directorPlan.beats[0]!.beatId,
      ),
    );

    expect(() =>
      restoreDirectorWorkspaceState(serialized, storyProject, registryA),
    ).not.toThrow();
    expect(() =>
      restoreDirectorWorkspaceState(serialized, storyProject, registryB),
    ).toThrow(/another capability registry/i);
    expect(() =>
      restoreDirectorWorkspaceState(serialized, storyProject),
    ).toThrow(/another capability registry/i);
  });

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
    const restored = restoreDirectorWorkspaceState(serialized, storyProject);

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
      restoreDirectorWorkspaceState(JSON.stringify(forged), storyProject),
    ).toThrow();
  });

  it("rejects a self-rehashed revision that the stored patch did not produce", () => {
    const { storyProject, firstCut, selectedBeatId, patch, revisedCut } =
      fixture();
    const alternatePatch = proposeDirectorPatch({
      baseDirectorProject: firstCut,
      targetBeatId: selectedBeatId,
      command: "Make the reaction 8 frames later",
    });
    const alternateCut = applyDirectorPatch({
      storyProject,
      baseDirectorProject: firstCut,
      patch: alternatePatch,
    });
    const workspace = recordDirectorWorkspaceRevision(
      createDirectorWorkspaceState(firstCut, selectedBeatId),
      patch,
      revisedCut,
    );
    const forged = structuredClone(workspace);
    const forgedProject = structuredClone(alternateCut);
    forgedProject.revision = {
      baseDirectorProjectContentHash: firstCut.contentHash,
      directorPatchContentHash: patch.contentHash,
    };
    const forgedDraft = structuredClone(forgedProject);
    delete (forgedDraft as Partial<typeof forgedProject>).contentHash;
    forgedProject.contentHash = hashCanonical(forgedDraft);
    forged.history.entries[1]!.directorProject = forgedProject;

    expect(() =>
      restoreDirectorWorkspaceState(JSON.stringify(forged), storyProject),
    ).toThrow(/semantic replay/i);
  });

  it("rejects a self-rehashed H0 bound to another story graph", () => {
    const { storyProject: expectedStoryProject } = fixture();
    const otherStoryProject = createCv002Project(
      "Another workspace",
      script.replaceAll("traveler", "inventor"),
      "weird-history",
      createCv002ArtDirectionSelection(
        "weird-history",
        "weird-history-editorial-collage",
      ),
    );
    const otherFirstCut = compileDirectorProject({
      storyProject: otherStoryProject,
    });
    const forgedFirstCut = structuredClone(otherFirstCut);
    forgedFirstCut.storyProjectContentHash = expectedStoryProject.contentHash;
    const forgedFirstCutDraft = structuredClone(forgedFirstCut);
    delete (forgedFirstCutDraft as Partial<typeof forgedFirstCut>).contentHash;
    forgedFirstCut.contentHash = hashCanonical(forgedFirstCutDraft);
    const forgedWorkspace = createDirectorWorkspaceState(
      forgedFirstCut,
      forgedFirstCut.directorPlan.beats[0]!.beatId,
    );

    expect(() =>
      restoreDirectorWorkspaceState(
        JSON.stringify(forgedWorkspace),
        expectedStoryProject,
      ),
    ).toThrow(/another story graph/i);
  });

  it("rejects a zero-patch workspace whose H0 substitutes a same-grammar art direction", () => {
    const storybookStory = createCv002Project(
      "Same graph",
      script,
      "kids-adventure",
      createCv002ArtDirectionSelection(
        "kids-adventure",
        "storybook-watercolor-paper-cutout",
      ),
    );
    const collageStory = createCv002Project(
      "Same graph",
      script,
      "kids-adventure",
      createCv002ArtDirectionSelection(
        "kids-adventure",
        "cut-paper-collage-mixed-media",
      ),
    );
    const originalFirstCut = compileDirectorProject({
      storyProject: storybookStory,
    });
    const forgedFirstCut = reseal({
      ...originalFirstCut,
      storyProjectContentHash: collageStory.contentHash,
    });
    const workspace = createDirectorWorkspaceState(
      forgedFirstCut,
      forgedFirstCut.directorPlan.beats[0]!.beatId,
    );

    expect(() =>
      restoreDirectorWorkspaceState(JSON.stringify(workspace), collageStory),
    ).toThrow(/another art direction/i);
  });

  it("rejects a same-grammar art-direction substitution in patched history", () => {
    const storybookStory = createCv002Project(
      "Patched graph",
      script,
      "kids-adventure",
      createCv002ArtDirectionSelection(
        "kids-adventure",
        "storybook-watercolor-paper-cutout",
      ),
    );
    const collageStory = createCv002Project(
      "Patched graph",
      script,
      "kids-adventure",
      createCv002ArtDirectionSelection(
        "kids-adventure",
        "cut-paper-collage-mixed-media",
      ),
    );
    const firstCut = compileDirectorProject({ storyProject: storybookStory });
    const selectedBeatId = firstCut.directorPlan.events.find(
      (event) => event.kind === "reaction",
    )!.beatId;
    const patch = proposeDirectorPatch({
      baseDirectorProject: firstCut,
      targetBeatId: selectedBeatId,
      command: "Make the reaction 6 frames later",
    });
    const revisedCut = applyDirectorPatch({
      storyProject: storybookStory,
      baseDirectorProject: firstCut,
      patch,
    });

    const forgedFirstCut = reseal({
      ...firstCut,
      storyProjectContentHash: collageStory.contentHash,
      artDirectionSelection: collageStory.artDirectionSelection,
    });
    const forgedPatch = reseal({
      ...patch,
      baseDirectorProjectContentHash: forgedFirstCut.contentHash,
    });
    const forgedRevision = reseal({
      ...revisedCut,
      storyProjectContentHash: collageStory.contentHash,
      revision: {
        baseDirectorProjectContentHash: forgedFirstCut.contentHash,
        directorPatchContentHash: forgedPatch.contentHash,
      },
    });
    const workspace = recordDirectorWorkspaceRevision(
      createDirectorWorkspaceState(forgedFirstCut, selectedBeatId),
      forgedPatch,
      forgedRevision,
    );

    expect(() =>
      restoreDirectorWorkspaceState(JSON.stringify(workspace), collageStory),
    ).toThrow(/revision 1 belongs to another art direction/i);
  });
});
