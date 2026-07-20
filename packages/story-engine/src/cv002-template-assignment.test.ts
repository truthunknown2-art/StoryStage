import { describe, expect, it } from "vitest";
import { hashCanonical } from "./canonical-hash";
import { createCv002ArtDirectionSelection } from "./cv002-art-direction";
import {
  commitCv002Operation,
  createCv002Project,
  type Cv002Project,
} from "./cv002-story-draft";
import {
  compileCv002AssignedScenePreview,
  createCv002TemplateAssignment,
  CV002_OBJECT_DISCOVERY_TEMPLATE_ID,
  CV002_PROTOTYPE_CHARACTER_ASSET,
  CV002_PROTOTYPE_LANTERN_ASSET,
  restoreCv002TemplateAssignment,
  verifyCv002TemplateAssignment,
} from "./cv002-template-assignment";

const KIDS_SCRIPT = [
  "Mara follows a trail of blue feathers until she reaches a quiet clearing. A small lantern hums beneath an old stump, and she freezes when its light follows her gaze. She kneels beside it and whispers that she has never seen anything glow like that before.",
  "The handle is cold, so Mara tests it with one finger before reaching with both hands. She leans forward, lifts the lantern slowly, and steadies it against her chest. Tiny paper stars spill from the glass while the forest seems to hold its breath.",
  "Mara gasps, then turns the lantern toward her friends at the edge of the clearing. She raises it proudly as the stars circle her head and the group cheers. The lantern settles into a warm golden glow, and Mara grins because their next path has appeared.",
].join("\n\n");
const KIDS_ART_DIRECTION = createCv002ArtDirectionSelection(
  "kids-adventure",
  "cut-paper-collage-mixed-media",
);
const HISTORY_ART_DIRECTION = createCv002ArtDirectionSelection(
  "weird-history",
  "weird-history-editorial-collage",
);

const CROSS_PARAGRAPH_SCRIPT = [
  "Mara followed the silver moth through ferny shadows while Milo counted every glowing wingbeat and tried not to stumble behind her. The light crossed a ruined doorway, circled a carved stone face, and waited where moonlight painted a bright path across the floor.",
  "Milo stepped through first and offered his hand, although the quiet hall made both friends listen twice before moving again. Mara smiled at the hovering guide, took one careful breath, and promised they would discover why it had brought them there tonight.",
].join("\n\n");

const LONG_BEAT_SCRIPT = [
  `Mara ${Array.from({ length: 62 }, () => "carefully").join(" ")} followed the patient moth until the old doorway finally opened.`,
  "Milo watched the moonlit stones and kept one hand near Mara while the tiny light circled above their heads.",
  "Together they crossed the threshold and listened for the gentle sound that had called them into the sleeping ruin.",
].join(" ");

const makeAssignment = (project: Cv002Project, sceneIndex = 0) => {
  const scene = project.graph.scenes[sceneIndex]!;
  return createCv002TemplateAssignment({
    project,
    sceneId: scene.id,
    noticeBeatId: scene.beats[0]!.id,
    pickupBeatId: scene.beats[1]!.id,
    presentBeatId: scene.beats[2]!.id,
    characterAssetId: CV002_PROTOTYPE_CHARACTER_ASSET.id,
    propAssetId: CV002_PROTOTYPE_LANTERN_ASSET.id,
  });
};

describe("CV-002-B capability-gated template assignment", () => {
  it("binds one explicitly mapped Kids scene to the accepted rig and project assets", () => {
    const project = createCv002Project(
      "The blue lantern",
      KIDS_SCRIPT,
      "kids-adventure",
      KIDS_ART_DIRECTION,
    );
    const assignment = makeAssignment(project);
    expect(assignment.template.id).toBe(CV002_OBJECT_DISCOVERY_TEMPLATE_ID);
    expect(assignment.projectGraphHash).toBe(project.graph.contentHash);
    expect(assignment.slots.map((slot) => slot.beatId)).toEqual(
      project.graph.scenes[0]!.beats.map((beat) => beat.id),
    );
    expect(assignment.characterAsset.origin).toBe("project-owned-code");
    expect(assignment.propAsset.id).toBe("lantern");
  });

  it("requires Kids grammar, three distinct beats, and the explicit project assets", () => {
    const kids = createCv002Project(
      "The blue lantern",
      KIDS_SCRIPT,
      "kids-adventure",
      KIDS_ART_DIRECTION,
    );
    const history = createCv002Project(
      "The blue lantern",
      KIDS_SCRIPT,
      "weird-history",
      HISTORY_ART_DIRECTION,
    );
    expect(() => makeAssignment(history)).toThrow(/Kids Adventure only/);
    const scene = kids.graph.scenes[0]!;
    expect(() =>
      createCv002TemplateAssignment({
        project: kids,
        sceneId: scene.id,
        noticeBeatId: scene.beats[0]!.id,
        pickupBeatId: scene.beats[0]!.id,
        presentBeatId: scene.beats[2]!.id,
        characterAssetId: "cv001-character",
        propAssetId: "lantern",
      }),
    ).toThrow(/different beat/);
    expect(() =>
      createCv002TemplateAssignment({
        project: kids,
        sceneId: scene.id,
        noticeBeatId: scene.beats[0]!.id,
        pickupBeatId: scene.beats[1]!.id,
        presentBeatId: scene.beats[2]!.id,
        characterAssetId: "someone-else",
        propAssetId: "lantern",
      }),
    ).toThrow(/project-owned Mara and lantern/);
  });

  it("compiles only a valid assignment through the accepted articulated CV-001 envelope", () => {
    const project = createCv002Project(
      "The blue lantern",
      KIDS_SCRIPT,
      "kids-adventure",
      KIDS_ART_DIRECTION,
    );
    const assignment = makeAssignment(project, 1);
    const preview = compileCv002AssignedScenePreview(project, assignment);
    expect(preview.compiled.sceneMotion.rigContractId).toBe(
      "cv001-paper-cut-rig-v1",
    );
    expect(preview.compiled.sceneMotion.bindings).toHaveLength(3);
    expect(preview.sourceBeatIds).toEqual(
      project.graph.scenes[1]!.beats.map((beat) => beat.id),
    );
    expect(
      preview.compiled.sceneMotion.bindings[1]!.program.tracks.some(
        (track) => track.type === "attachment" && track.propId === "lantern",
      ),
    ).toBe(true);
  });

  it("builds mapped input directly when a supported merge spans a paragraph boundary", () => {
    const initial = createCv002Project(
      "The moon hall",
      CROSS_PARAGRAPH_SCRIPT,
      "kids-adventure",
      KIDS_ART_DIRECTION,
    );
    const beats = initial.graph.scenes.flatMap((scene) => scene.beats);
    expect(beats).toHaveLength(4);
    const merged = commitCv002Operation(initial, {
      type: "merge-beats",
      leftBeatId: beats[1]!.id,
      rightBeatId: beats[2]!.id,
    });
    expect(merged.graph.scenes).toHaveLength(1);
    expect(merged.graph.scenes[0]!.beats).toHaveLength(3);
    const assignment = makeAssignment(merged);
    expect(() =>
      compileCv002AssignedScenePreview(merged, assignment),
    ).not.toThrow();
  });

  it("rejects an assignment whose mapped text exceeds the CV-001 downstream limit", () => {
    const project = createCv002Project(
      "The long beat",
      LONG_BEAT_SCRIPT,
      "kids-adventure",
      KIDS_ART_DIRECTION,
    );
    expect(project.graph.scenes[0]!.beats[0]!.text.length).toBeGreaterThan(500);
    expect(() => makeAssignment(project)).toThrow(/500/);
  });

  it("invalidates after any graph, scene, beat, or role change", () => {
    const project = createCv002Project(
      "The blue lantern",
      KIDS_SCRIPT,
      "kids-adventure",
      KIDS_ART_DIRECTION,
    );
    const assignment = makeAssignment(project);
    const target = project.graph.scenes[0]!.beats[0]!;
    const changedProject = commitCv002Operation(project, {
      type: "set-role",
      beatId: target.id,
      role: "reveal",
    });
    expect(() =>
      verifyCv002TemplateAssignment(changedProject, assignment),
    ).toThrow(/story graph changed/i);
  });

  it("fails closed on a self-rehashed assignment reference tamper", () => {
    const project = createCv002Project(
      "The blue lantern",
      KIDS_SCRIPT,
      "kids-adventure",
      KIDS_ART_DIRECTION,
    );
    const assignment = makeAssignment(project);
    const { contentHash: _hash, ...draft } = assignment;
    void _hash;
    const alteredDraft = { ...draft, sceneContentHash: "0".repeat(64) };
    const altered = {
      ...alteredDraft,
      contentHash: hashCanonical(alteredDraft),
    };
    expect(() =>
      restoreCv002TemplateAssignment(JSON.stringify(altered), project),
    ).toThrow(/scene changed|ID is not content-derived/);
  });
});
