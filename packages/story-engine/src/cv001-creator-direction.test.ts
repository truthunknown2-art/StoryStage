import {describe, expect, it} from "vitest";
import {hashCanonical} from "./canonical-hash";
import {
  commitCv001CreatorCommand,
  compileCv001CreatorScene,
  createCv001CreatorProject,
  createDefaultCv001CreatorDirectionState,
  parseCv001CreatorCommand,
  parseCv001ThreeBeatScript,
  redoCv001CreatorEdit,
  restoreCv001CreatorProject,
  undoCv001CreatorEdit,
  updateCv001CreatorSelection,
  CV001_DEFAULT_SCRIPT,
} from "./cv001-creator-direction";
import {createCv001ThreeBeatProofFixture} from "./cv001-proof-fixture";
import {compileCv001ThreeBeatScene, getCv001CompiledBeatIssues} from "./cv001-scene-compiler";
import {frameAccurateRenderPlanSchema} from "./model";

const setup = () => {
  const fixture = createCv001ThreeBeatProofFixture();
  const project = createCv001CreatorProject({title: "The Lantern Discovery", script: CV001_DEFAULT_SCRIPT});
  return {fixture, project};
};

describe("CV-001 creator direction model", () => {
  it("parses only the fixed three-paragraph script shape", () => {
    expect(parseCv001ThreeBeatScript(CV001_DEFAULT_SCRIPT)).toEqual([
      "Mara notices a strange lantern glowing beside the path.",
      "She leans in, reaches carefully, and lifts it from the ground.",
      "It flickers awake, and Mara proudly shows it to us.",
    ]);
    expect(() => parseCv001ThreeBeatScript("One\n\nTwo")).toThrow(/exactly three/);
    expect(() => parseCv001ThreeBeatScript("One\n\nTwo\n\nThree\n\nFour")).toThrow(/exactly three/);
  });

  it("reproduces the accepted CV-001-B motion byte-for-byte at defaults", () => {
    const {fixture} = setup();
    const directionState = createDefaultCv001CreatorDirectionState(fixture.input);
    const creator = compileCv001CreatorScene({baseInput: fixture.input, directionState, renderPlan: fixture.renderPlan});
    const accepted = compileCv001ThreeBeatScene(fixture);
    expect(creator.sceneMotion).toEqual(accepted);
    expect(creator.sceneMotion.contentHash).toBe(accepted.contentHash);
  });

  it("parses required, punctuation, case, and multi-clause commands deterministically", () => {
    const {project} = setup();
    const beatId = project.baseInput.beats[2].id;
    expect(parseCv001CreatorCommand(beatId, "Make the reaction bigger and hold it longer.").operations).toEqual([
      {type: "set-performance", value: "big"},
      {type: "set-hold", value: "long"},
    ]);
    expect(parseCv001CreatorCommand(beatId, "MAKE IT BIGGER; HOLD IT LONGER!")).toEqual(
      parseCv001CreatorCommand(beatId, "make it bigger and hold it longer"),
    );
  });

  it("rejects unsupported and contradictory language without partial acceptance", () => {
    const {project} = setup();
    const beatId = project.baseInput.beats[2].id;
    expect(() => parseCv001CreatorCommand(beatId, "Make it feel more magical and Pixar-like.")).toThrow(/outside this prototype/);
    expect(() => parseCv001CreatorCommand(beatId, "Make it bigger and more subtle.")).toThrow(/contradicts itself/);
    expect(() => parseCv001CreatorCommand(beatId, "Make it quicker and make it slower.")).toThrow(/contradicts itself/);
  });

  it.each([0, 1, 2])("changes only selected beat %s", (beatIndex) => {
    const {fixture, project} = setup();
    const before = compileCv001CreatorScene({baseInput: project.baseInput, directionState: project.directionState, renderPlan: fixture.renderPlan});
    const command = parseCv001CreatorCommand(project.baseInput.beats[beatIndex]!.id, "Make it bigger");
    const result = commitCv001CreatorCommand({project, command, renderPlan: fixture.renderPlan});
    result.compiled.sceneMotion.bindings.forEach((binding, index) => {
      if (index === beatIndex) expect(binding.contentHash).not.toBe(before.sceneMotion.bindings[index]!.contentHash);
      else expect(binding).toEqual(before.sceneMotion.bindings[index]!);
    });
    expect(result.project.baseInput).toEqual(project.baseInput);
    expect(fixture.renderPlan.durationInFrames).toBe(300);
  });

  it.each([
    "Make it bigger",
    "Make it more subtle",
    "Hold it longer",
    "Shorten the hold",
    "Make it snappier",
    "Make it slower",
    "Push in more",
    "Use less camera movement",
  ])("keeps every supported direction validator-clean: %s", (text) => {
    const {fixture, project} = setup();
    const command = parseCv001CreatorCommand(project.baseInput.beats[1].id, text);
    const result = commitCv001CreatorCommand({project, command, renderPlan: fixture.renderPlan});
    result.compiled.sceneMotion.bindings.forEach((binding, index) => {
      expect(getCv001CompiledBeatIssues(project.baseInput.beats[index]!, binding.program)).toEqual([]);
    });
    expect(result.compiled.sceneMotion.bindings[1].program.durationInFrames).toBe(120);
  });

  it("keeps a long present hold inside the fixed beat and above twelve frames", () => {
    const {fixture, project} = setup();
    const command = parseCv001CreatorCommand(project.baseInput.beats[2].id, "Hold it longer");
    const result = commitCv001CreatorCommand({project, command, renderPlan: fixture.renderPlan});
    const program = result.compiled.sceneMotion.bindings[2].program;
    const hold = program.phases.at(-1)!;
    expect(program.durationInFrames).toBe(90);
    expect(hold.endFrame - hold.startFrame).toBe(24);
    expect(fixture.renderPlan.durationInFrames).toBe(300);
  });

  it("is deterministic and rejects a no-op transaction", () => {
    const {fixture, project} = setup();
    const command = parseCv001CreatorCommand(project.baseInput.beats[2].id, "Make it bigger");
    const first = commitCv001CreatorCommand({project, command, renderPlan: fixture.renderPlan});
    const second = commitCv001CreatorCommand({project, command, renderPlan: fixture.renderPlan});
    expect(first).toEqual(second);
    expect(() => commitCv001CreatorCommand({project: first.project, command, renderPlan: fixture.renderPlan})).toThrow(/No change needed/);
  });

  it("undoes, redoes, and removes the redo branch after a new edit", () => {
    const {fixture, project} = setup();
    const beatId = project.baseInput.beats[2].id;
    const first = commitCv001CreatorCommand({project, command: parseCv001CreatorCommand(beatId, "Make it bigger"), renderPlan: fixture.renderPlan});
    const undone = undoCv001CreatorEdit(first.project);
    const undoneCompiled = compileCv001CreatorScene({baseInput: undone.baseInput, directionState: undone.directionState, renderPlan: fixture.renderPlan});
    expect(undoneCompiled.contentHash).toBe(first.transaction.beforeCompiledHash);
    const redone = redoCv001CreatorEdit(undone);
    const redoneCompiled = compileCv001CreatorScene({baseInput: redone.baseInput, directionState: redone.directionState, renderPlan: fixture.renderPlan});
    expect(redoneCompiled.contentHash).toBe(first.transaction.afterCompiledHash);
    const branched = commitCv001CreatorCommand({project: undone, command: parseCv001CreatorCommand(beatId, "Hold it longer"), renderPlan: fixture.renderPlan});
    expect(branched.project.history).toHaveLength(1);
    expect(branched.project.history[0]!.command.operations).toEqual([{type: "set-hold", value: "long"}]);
  });

  it("persists selection and rejects tampered or stale canonical state", () => {
    const {fixture, project} = setup();
    const selected = updateCv001CreatorSelection(project, project.baseInput.beats[2].id);
    expect(restoreCv001CreatorProject(JSON.stringify(selected), fixture.renderPlan).selectedBeatId).toBe(project.baseInput.beats[2].id);

    const tampered = JSON.parse(JSON.stringify(selected));
    tampered.title = "Tampered";
    expect(() => restoreCv001CreatorProject(JSON.stringify(tampered), fixture.renderPlan)).toThrow();

    const {contentHash: _hash, ...payload} = fixture.renderPlan;
    const stalePayload = {...payload, title: `${payload.title} stale`};
    const stalePlan = frameAccurateRenderPlanSchema.parse({...stalePayload, contentHash: hashCanonical(stalePayload)});
    expect(() => restoreCv001CreatorProject(JSON.stringify(selected), stalePlan)).toThrow(/stale render plan/);
  });

  it("keeps canonical creator history free of time, UUID, path, and random fields", () => {
    const {fixture, project} = setup();
    const result = commitCv001CreatorCommand({project, command: parseCv001CreatorCommand(project.baseInput.beats[0].id, "Make it bigger"), renderPlan: fixture.renderPlan});
    const serialized = JSON.stringify(result.project);
    expect(serialized).not.toMatch(/timestamp|createdAt|updatedAt|uuid|filesystem|random|[A-Z]:\\/i);
    expect(result.transaction.id).toBe("edit-0001");
  });
});
