import { describe, expect, it } from "vitest";
import { hashCanonical } from "./canonical-hash";
import {
  createCv002ArtDirectionSelection,
  cv002ArtDirectionRegistry,
  cv002ArtDirectionSelectionSchema,
  cv002WeirdHistoryReferenceSetManifest,
  cv002WeirdHistoryReferenceSetManifestSchema,
  type Cv002ArtDirectionGrammar,
  type Cv002ArtDirectionOptionId,
} from "./cv002-art-direction";
import {
  commitCv002Operation,
  createCv002Project,
  redoCv002Operation,
  restoreCv002Project,
  undoCv002Operation,
} from "./cv002-story-draft";
import { compileDirectorProject } from "./director/director-compiler";
import { directorProjectSchema } from "./director/director-project";

const SCRIPT = [
  "Long before the first lighthouse marked the harbor, families crossed this cold inlet in narrow wooden boats. The trip looked ordinary from shore, but sudden fog could erase the mountains and turn a familiar route into a dangerous puzzle. Guides watched the tide, listened for bells, and counted each pull of the oars.",
  "In 1894, the town finally built a signal tower on the black rocks. Its keeper raised colored flags by day and lit an oil lamp at night, because captains needed a warning they could recognize through rain. Then a winter storm shattered the upper window, and the keeper climbed outside to protect the flame.",
  "The tower survived, but its most famous rescue was almost ridiculous. A goat had wandered onto a supply boat, kicked over a crate, and accidentally rang the emergency bell. Villagers launched their boats expecting a wreck; instead, they found one embarrassed sailor, three floating cabbages, and the loudest goat in local history.",
].join("\n\n");

const LEGAL_SELECTIONS = [
  ["kids-adventure", "storybook-watercolor-paper-cutout"],
  ["kids-adventure", "cut-paper-collage-mixed-media"],
  ["kids-adventure", "soft-2d-digital-illustration"],
  ["weird-history", "weird-history-editorial-collage"],
] as const satisfies readonly (readonly [
  Cv002ArtDirectionGrammar,
  Cv002ArtDirectionOptionId,
])[];

const withoutHash = <T extends { contentHash: string }>(value: T) => {
  const { contentHash: _contentHash, ...draft } = value;
  void _contentHash;
  return draft;
};

describe("ADRREF-001 canonical art-direction selection", () => {
  it("binds Weird History to the pinned directing study and Rook identity authority", () => {
    expect(cv002WeirdHistoryReferenceSetManifest.contentHash).toBe(
      "d9e18d925f733e5556afac192923ce5a6c79c511a101a1eed2977596ca109be0",
    );
    expect(
      cv002ArtDirectionRegistry["weird-history"][
        "weird-history-editorial-collage"
      ],
    ).toEqual({
      id: "weird-history-editorial-collage-reference-set",
      version: "1.0.0",
      contentHash:
        "d9e18d925f733e5556afac192923ce5a6c79c511a101a1eed2977596ca109be0",
    });

    const forgedDraft = {
      ...withoutHash(cv002WeirdHistoryReferenceSetManifest),
      sources: [
        cv002WeirdHistoryReferenceSetManifest.sources[0],
        {
          ...cv002WeirdHistoryReferenceSetManifest.sources[1],
          contentHash: "f".repeat(64),
        },
      ],
    };
    const forged = {
      ...forgedDraft,
      contentHash: hashCanonical(forgedDraft),
    };
    expect(() =>
      cv002WeirdHistoryReferenceSetManifestSchema.parse(forged),
    ).toThrow();
  });

  it.each(LEGAL_SELECTIONS)(
    "seals and restores the legal %s / %s selection",
    (grammar, optionId) => {
      const selection = createCv002ArtDirectionSelection(grammar, optionId);
      const project = createCv002Project(
        "Art direction proof",
        SCRIPT,
        grammar,
        selection,
      );
      const restored = restoreCv002Project(JSON.stringify(project));

      expect(restored.artDirectionSelection).toEqual(selection);
      expect(restored.contentHash).toBe(project.contentHash);
      expect(selection.selectedBy).toBe("creator");
      expect(selection.usage).toBe("direction-reference-only");
    },
  );

  it("changes canonical project identity when the legal selection changes", () => {
    const storybook = createCv002Project(
      "Art direction proof",
      SCRIPT,
      "kids-adventure",
      createCv002ArtDirectionSelection(
        "kids-adventure",
        "storybook-watercolor-paper-cutout",
      ),
    );
    const collage = createCv002Project(
      "Art direction proof",
      SCRIPT,
      "kids-adventure",
      createCv002ArtDirectionSelection(
        "kids-adventure",
        "cut-paper-collage-mixed-media",
      ),
    );

    expect(storybook.artDirectionSelection.contentHash).not.toBe(
      collage.artDirectionSelection.contentHash,
    );
    expect(storybook.contentHash).not.toBe(collage.contentHash);
    expect(storybook.graph.contentHash).toBe(collage.graph.contentHash);

    expect(() =>
      cv002ArtDirectionSelectionSchema.parse({
        ...storybook.artDirectionSelection,
        optionId: "soft-2d-digital-illustration",
      }),
    ).toThrow(/selection hash is invalid/i);
    expect(() =>
      restoreCv002Project(
        JSON.stringify({
          ...storybook,
          artDirectionSelection: collage.artDirectionSelection,
        }),
      ),
    ).toThrow(/project hash is invalid/i);
  });

  it("rejects cross-grammar options and forged canonical reference authority", () => {
    expect(() =>
      createCv002ArtDirectionSelection(
        "kids-adventure",
        "weird-history-editorial-collage",
      ),
    ).toThrow(/not available for this grammar/i);
    expect(() =>
      createCv002ArtDirectionSelection(
        "weird-history",
        "cut-paper-collage-mixed-media",
      ),
    ).toThrow(/not available for this grammar/i);

    const selection = createCv002ArtDirectionSelection(
      "kids-adventure",
      "cut-paper-collage-mixed-media",
    );
    const forgedDraft = {
      ...withoutHash(selection),
      referenceSet: {
        ...selection.referenceSet,
        contentHash: "f".repeat(64),
      },
    };
    expect(() =>
      cv002ArtDirectionSelectionSchema.parse({
        ...forgedDraft,
        contentHash: hashCanonical(forgedDraft),
      }),
    ).toThrow(/canonical reference set/i);
  });

  it("preserves the exact selection through split, merge, role, boundary, undo, redo, and restore", () => {
    const selection = createCv002ArtDirectionSelection(
      "kids-adventure",
      "cut-paper-collage-mixed-media",
    );
    let project = createCv002Project(
      "Editing proof",
      SCRIPT,
      "kids-adventure",
      selection,
    );
    const assertSelection = () =>
      expect(project.artDirectionSelection.contentHash).toBe(
        selection.contentHash,
      );

    const target = project.graph.scenes[0]!.beats[1]!;
    project = commitCv002Operation(project, {
      type: "split-beat",
      beatId: target.id,
      atOffset: target.sourceRange.start + target.text.indexOf("but sudden"),
    });
    assertSelection();

    const splitIndex = project.graph.scenes
      .flatMap((scene) => scene.beats)
      .findIndex((beat) => beat.sourceRange.start === target.sourceRange.start);
    const splitBeats = project.graph.scenes.flatMap((scene) => scene.beats);
    project = commitCv002Operation(project, {
      type: "merge-beats",
      leftBeatId: splitBeats[splitIndex]!.id,
      rightBeatId: splitBeats[splitIndex + 1]!.id,
    });
    assertSelection();

    const roleTarget = project.graph.scenes[0]!.beats[0]!;
    project = commitCv002Operation(project, {
      type: "set-role",
      beatId: roleTarget.id,
      role: roleTarget.role === "reaction" ? "action" : "reaction",
    });
    assertSelection();

    const boundaryTarget = project.graph.scenes[0]!.beats[1]!;
    project = commitCv002Operation(project, {
      type: "set-scene-boundary",
      beatId: boundaryTarget.id,
      enabled: true,
    });
    assertSelection();

    for (let index = 0; index < 4; index += 1) {
      project = undoCv002Operation(project);
      assertSelection();
    }
    for (let index = 0; index < 4; index += 1) {
      project = redoCv002Operation(project);
      assertSelection();
    }
    project = restoreCv002Project(JSON.stringify(project));
    assertSelection();
  });

  it("carries the exact selection into DirectorProject without changing capabilities", () => {
    const storybookProject = createCv002Project(
      "Director proof",
      SCRIPT,
      "kids-adventure",
      createCv002ArtDirectionSelection(
        "kids-adventure",
        "storybook-watercolor-paper-cutout",
      ),
    );
    const collageProject = createCv002Project(
      "Director proof",
      SCRIPT,
      "kids-adventure",
      createCv002ArtDirectionSelection(
        "kids-adventure",
        "cut-paper-collage-mixed-media",
      ),
    );
    const storybookDirector = compileDirectorProject({
      storyProject: storybookProject,
    });
    const collageDirector = compileDirectorProject({
      storyProject: collageProject,
    });

    expect(storybookDirector.artDirectionSelection).toEqual(
      storybookProject.artDirectionSelection,
    );
    expect(collageDirector.artDirectionSelection).toEqual(
      collageProject.artDirectionSelection,
    );
    expect(storybookDirector.capabilityReport).toEqual(
      collageDirector.capabilityReport,
    );

    const historySelection = createCv002ArtDirectionSelection(
      "weird-history",
      "weird-history-editorial-collage",
    );
    const forged = structuredClone(storybookDirector);
    forged.artDirectionSelection = historySelection;
    const forgedDraft = withoutHash(forged);
    forged.contentHash = hashCanonical(forgedDraft);
    expect(() => directorProjectSchema.parse(forged)).toThrow(
      /does not match its planning grammar/i,
    );
  });
});
