import {describe, expect, it} from "vitest";
import {hashCanonical} from "./canonical-hash";
import {
  applyCv002GraphOperation,
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
    const project = createCv002Project("The blue lantern", KIDS_SCRIPT, "kids-adventure");
    const assignment = makeAssignment(project);
    expect(assignment.template.id).toBe(CV002_OBJECT_DISCOVERY_TEMPLATE_ID);
    expect(assignment.projectGraphHash).toBe(project.graph.contentHash);
    expect(assignment.slots.map((slot) => slot.beatId)).toEqual(project.graph.scenes[0]!.beats.map((beat) => beat.id));
    expect(assignment.characterAsset.origin).toBe("project-owned-code");
    expect(assignment.propAsset.id).toBe("lantern");
  });

  it("requires Kids grammar, three distinct beats, and the explicit project assets", () => {
    const kids = createCv002Project("The blue lantern", KIDS_SCRIPT, "kids-adventure");
    const history = createCv002Project("The blue lantern", KIDS_SCRIPT, "weird-history");
    expect(() => makeAssignment(history)).toThrow(/Kids Adventure only/);
    const scene = kids.graph.scenes[0]!;
    expect(() => createCv002TemplateAssignment({project: kids, sceneId: scene.id, noticeBeatId: scene.beats[0]!.id, pickupBeatId: scene.beats[0]!.id, presentBeatId: scene.beats[2]!.id, characterAssetId: "cv001-character", propAssetId: "lantern"})).toThrow(/different beat/);
    expect(() => createCv002TemplateAssignment({project: kids, sceneId: scene.id, noticeBeatId: scene.beats[0]!.id, pickupBeatId: scene.beats[1]!.id, presentBeatId: scene.beats[2]!.id, characterAssetId: "someone-else", propAssetId: "lantern"})).toThrow(/project-owned Mara and lantern/);
  });

  it("compiles only a valid assignment through the accepted articulated CV-001 envelope", () => {
    const project = createCv002Project("The blue lantern", KIDS_SCRIPT, "kids-adventure");
    const assignment = makeAssignment(project, 1);
    const preview = compileCv002AssignedScenePreview(project, assignment);
    expect(preview.compiled.sceneMotion.rigContractId).toBe("cv001-paper-cut-rig-v1");
    expect(preview.compiled.sceneMotion.bindings).toHaveLength(3);
    expect(preview.sourceBeatIds).toEqual(project.graph.scenes[1]!.beats.map((beat) => beat.id));
    expect(preview.compiled.sceneMotion.bindings[1]!.program.tracks.some((track) => track.type === "attachment" && track.propId === "lantern")).toBe(true);
  });

  it("invalidates after any graph, scene, beat, or role change", () => {
    const project = createCv002Project("The blue lantern", KIDS_SCRIPT, "kids-adventure");
    const assignment = makeAssignment(project);
    const target = project.graph.scenes[0]!.beats[0]!;
    const changedGraph = applyCv002GraphOperation(project.graph, {type: "set-role", beatId: target.id, role: "reveal"});
    const changedProject = {...project, graph: changedGraph, directionDraft: project.directionDraft, contentHash: project.contentHash};
    expect(() => verifyCv002TemplateAssignment(changedProject as Cv002Project, assignment)).toThrow();
  });

  it("fails closed on a self-rehashed assignment reference tamper", () => {
    const project = createCv002Project("The blue lantern", KIDS_SCRIPT, "kids-adventure");
    const assignment = makeAssignment(project);
    const {contentHash: _hash, ...draft} = assignment;
    void _hash;
    const alteredDraft = {...draft, sceneContentHash: "0".repeat(64)};
    const altered = {...alteredDraft, contentHash: hashCanonical(alteredDraft)};
    expect(() => restoreCv002TemplateAssignment(JSON.stringify(altered), project)).toThrow(/scene changed|ID is not content-derived/);
  });
});
