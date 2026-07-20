import {describe, expect, it} from "vitest";
import {hashCanonical} from "./canonical-hash";
import {createCv002ArtDirectionSelection} from "./cv002-art-direction";
import {
  applyCv002GraphOperation,
  commitCv002Operation,
  compileCv002DirectionDraft,
  createCv002Project,
  createCv002StoryGraph,
  type Cv002Project,
  type Cv002StoryGraph,
  reconstructCv002Source,
  redoCv002Operation,
  restoreCv002Project,
  undoCv002Operation,
} from "./cv002-story-draft";

const SCRIPT = [
  "Long before the first lighthouse marked the harbor, families crossed this cold inlet in narrow wooden boats. The trip looked ordinary from shore, but sudden fog could erase the mountains and turn a familiar route into a dangerous puzzle. Guides watched the tide, listened for bells, and counted each pull of the oars.",
  "In 1894, the town finally built a signal tower on the black rocks. Its keeper raised colored flags by day and lit an oil lamp at night, because captains needed a warning they could recognize through rain. Then a winter storm shattered the upper window, and the keeper climbed outside to protect the flame.",
  "The tower survived, but its most famous rescue was almost ridiculous. A goat had wandered onto a supply boat, kicked over a crate, and accidentally rang the emergency bell. Villagers launched their boats expecting a wreck; instead, they found one embarrassed sailor, three floating cabbages, and the loudest goat in local history.",
].join("\n\n");
const KIDS_ART_DIRECTION = createCv002ArtDirectionSelection("kids-adventure", "cut-paper-collage-mixed-media");
const HISTORY_ART_DIRECTION = createCv002ArtDirectionSelection("weird-history", "weird-history-editorial-collage");

const flatten = (graph: ReturnType<typeof createCv002StoryGraph>) => graph.scenes.flatMap((scene) => scene.beats);

function reseal<T extends {contentHash: string}>(value: T): T {
  const {contentHash: _contentHash, ...draft} = value;
  void _contentHash;
  return {...draft, contentHash: hashCanonical(draft)} as T;
}

function resealProjectWithGraph(project: Cv002Project, graph: Cv002StoryGraph): Cv002Project {
  const beats = flatten(graph);
  const directions = project.directionDraft.directions.map((direction, index) => reseal({...direction, beatId: beats[index]!.id, beatContentHash: beats[index]!.contentHash}));
  const directionDraft = reseal({...project.directionDraft, graphContentHash: graph.contentHash, directions});
  return reseal({...project, graph, directionDraft});
}

describe("CV-002 editable story breakdown", () => {
  it("accepts the bounded script and preserves exact text and offsets", () => {
    const graph = createCv002StoryGraph(SCRIPT, "kids-adventure");
    expect(graph.scenes).toHaveLength(3);
    expect(reconstructCv002Source(graph)).toBe(SCRIPT);
    flatten(graph).forEach((beat) => expect(SCRIPT.slice(beat.sourceRange.start, beat.sourceRange.end)).toBe(beat.text));
  });

  it("rejects scripts outside the honest word and paragraph bounds", () => {
    expect(() => createCv002StoryGraph("Too short.", "kids-adventure")).toThrow(/80 to 400/);
    const sevenParagraphs = Array.from({length: 7}, (_, index) => `Paragraph ${index} ` + "word ".repeat(12)).join("\n\n");
    expect(() => createCv002StoryGraph(sevenParagraphs, "weird-history")).toThrow(/one to six/);
    expect(() => createCv002StoryGraph("word ".repeat(401), "kids-adventure")).toThrow(/80 to 400/);
  });

  it("is deterministic with stable content-derived IDs", () => {
    const first = createCv002StoryGraph(SCRIPT, "weird-history");
    const second = createCv002StoryGraph(SCRIPT, "weird-history");
    expect(second).toEqual(first);
    expect(flatten(first).every((beat) => beat.id.startsWith("beat-") && !beat.id.includes("random"))).toBe(true);
  });

  it("compiles materially different direction grammars from the same approved spans", () => {
    const kidsGraph = createCv002StoryGraph(SCRIPT, "kids-adventure");
    const historyGraph = createCv002StoryGraph(SCRIPT, "weird-history");
    const kids = compileCv002DirectionDraft(kidsGraph);
    const history = compileCv002DirectionDraft(historyGraph);
    expect(kids.status).toBe("direction-draft-ready");
    expect(kids.animationStatus).toBe("templates-unassigned");
    kids.directions.forEach((direction, index) => {
      const other = history.directions[index]!;
      const fields = ["staging", "shotSize", "treatment", "cameraIntent", "transition", "performanceIntent", "textEmphasis", "sfxIntent", "musicIntent"] as const;
      expect(fields.filter((field) => direction[field] !== other[field]).length).toBeGreaterThanOrEqual(5);
    });
  });

  it("splits and merges a beat without losing a source character", () => {
    const graph = createCv002StoryGraph(SCRIPT, "kids-adventure");
    const target = flatten(graph).find((beat) => beat.text.includes("familiar route"))!;
    const offset = target.sourceRange.start + target.text.indexOf("but sudden");
    const split = applyCv002GraphOperation(graph, {type: "split-beat", beatId: target.id, atOffset: offset});
    expect(flatten(split)).toHaveLength(flatten(graph).length + 1);
    expect(reconstructCv002Source(split)).toBe(SCRIPT);
    const leftIndex = flatten(split).findIndex((beat) => beat.sourceRange.start === target.sourceRange.start);
    const merged = applyCv002GraphOperation(split, {type: "merge-beats", leftBeatId: flatten(split)[leftIndex]!.id, rightBeatId: flatten(split)[leftIndex + 1]!.id});
    expect(reconstructCv002Source(merged)).toBe(SCRIPT);
    expect(flatten(merged).map((beat) => beat.text)).toEqual(flatten(graph).map((beat) => beat.text));
  });

  it("adds and removes an editable scene boundary", () => {
    const graph = createCv002StoryGraph(SCRIPT, "weird-history");
    const target = graph.scenes[0]!.beats[1]!;
    const added = applyCv002GraphOperation(graph, {type: "set-scene-boundary", beatId: target.id, enabled: true});
    expect(added.scenes).toHaveLength(4);
    const removed = applyCv002GraphOperation(added, {type: "set-scene-boundary", beatId: target.id, enabled: false});
    expect(removed.contentHash).toBe(graph.contentHash);
  });

  it("rejects idempotent scene-boundary operations", () => {
    const graph = createCv002StoryGraph(SCRIPT, "weird-history");
    const existingBoundary = graph.scenes[1]!.beats[0]!;
    const ordinaryBeat = graph.scenes[0]!.beats[1]!;
    expect(() => applyCv002GraphOperation(graph, {type: "set-scene-boundary", beatId: existingBoundary.id, enabled: true})).toThrow(/already starts a scene/i);
    expect(() => applyCv002GraphOperation(graph, {type: "set-scene-boundary", beatId: ordinaryBeat.id, enabled: false})).toThrow(/does not start a scene/i);
  });

  it("changes only one beat direction when its semantic role changes", () => {
    const graph = createCv002StoryGraph(SCRIPT, "kids-adventure");
    const target = flatten(graph)[2]!;
    const before = compileCv002DirectionDraft(graph);
    const changed = applyCv002GraphOperation(graph, {type: "set-role", beatId: target.id, role: "reaction"});
    const after = compileCv002DirectionDraft(changed);
    after.directions.forEach((direction, index) => {
      if (index === 2) expect(direction.contentHash).not.toBe(before.directions[index]!.contentHash);
      else expect(direction).toEqual(before.directions[index]);
    });
  });

  it("undoes, redoes, and truncates a redo branch canonically", () => {
    const project = createCv002Project("Harbor signals", SCRIPT, "weird-history", HISTORY_ART_DIRECTION);
    const target = flatten(project.graph)[1]!;
    const first = commitCv002Operation(project, {type: "set-role", beatId: target.id, role: "reveal"});
    const undone = undoCv002Operation(first);
    expect(undone.graph.contentHash).toBe(project.graph.contentHash);
    expect(redoCv002Operation(undone).graph.contentHash).toBe(first.graph.contentHash);
    const branched = commitCv002Operation(undone, {type: "set-scene-boundary", beatId: target.id, enabled: true});
    expect(branched.history).toHaveLength(1);
    expect(branched.history[0]!.operation.type).toBe("set-scene-boundary");
  });

  it("fails closed on a self-rehashed semantic history tamper", () => {
    const project = createCv002Project("Harbor signals", SCRIPT, "kids-adventure", KIDS_ART_DIRECTION);
    const target = flatten(project.graph)[1]!;
    const committed = commitCv002Operation(project, {type: "set-role", beatId: target.id, role: "reveal"});
    const transaction = committed.history[0]!;
    const {contentHash: _transactionHash, ...transactionDraft} = transaction;
    void _transactionHash;
    const alteredTransaction = {...transactionDraft, operation: {type: "set-role" as const, beatId: target.id, role: "reaction" as const}};
    const resealedTransaction = {...alteredTransaction, contentHash: hashCanonical(alteredTransaction)};
    const {contentHash: _projectHash, ...projectDraft} = committed;
    void _projectHash;
    const alteredProject = {...projectDraft, history: [resealedTransaction]};
    const resealedProject = {...alteredProject, contentHash: hashCanonical(alteredProject)};
    expect(() => restoreCv002Project(JSON.stringify(resealedProject))).toThrow(/Story edit result/);
  });

  it("rejects a self-rehashed final source span beyond the real source length", () => {
    const project = createCv002Project("Harbor signals", SCRIPT, "kids-adventure", KIDS_ART_DIRECTION);
    const graph = project.graph;
    const lastScene = graph.scenes.at(-1)!;
    const lastBeat = lastScene.beats.at(-1)!;
    const sourceRange = {...lastBeat.sourceRange, end: SCRIPT.length + 100};
    const forgedBeat = reseal({...lastBeat, sourceRange, id: `beat-${hashCanonical({sourceRange, text: lastBeat.text}).slice(0, 12)}`});
    const sceneBeats = [...lastScene.beats.slice(0, -1), forgedBeat];
    const sceneRange = {...lastScene.sourceRange, end: SCRIPT.length + 100};
    const forgedScene = reseal({...lastScene, sourceRange: sceneRange, beats: sceneBeats, id: `scene-${hashCanonical({sourceRange: sceneRange, beatIds: sceneBeats.map((beat) => beat.id)}).slice(0, 12)}`});
    const forgedGraph = reseal({...graph, scenes: [...graph.scenes.slice(0, -1), forgedScene]});
    const forgedProject = resealProjectWithGraph(project, forgedGraph);

    expect(() => restoreCv002Project(JSON.stringify(forgedProject))).toThrow(/source span exceeds/i);
  });

  it("rejects a self-rehashed project whose edit history was erased", () => {
    const project = createCv002Project("Harbor signals", SCRIPT, "weird-history", HISTORY_ART_DIRECTION);
    const target = flatten(project.graph)[1]!;
    const changedGraph = applyCv002GraphOperation(project.graph, {type: "set-role", beatId: target.id, role: "reaction"});
    const forged = reseal({...project, graph: changedGraph, directionDraft: compileCv002DirectionDraft(changedGraph), history: [], historyCursor: 0});

    expect(() => restoreCv002Project(JSON.stringify(forged))).toThrow(/not anchored to the deterministic initial breakdown/i);
  });

  it("rejects self-rehashed forged beat and scene IDs", () => {
    const project = createCv002Project("Harbor signals", SCRIPT, "kids-adventure", KIDS_ART_DIRECTION);
    const firstScene = project.graph.scenes[0]!;
    const forgedBeat = reseal({...firstScene.beats[0]!, id: "beat-forged"});
    const beatScene = reseal({...firstScene, beats: [forgedBeat, ...firstScene.beats.slice(1)], id: `scene-${hashCanonical({sourceRange: firstScene.sourceRange, beatIds: [forgedBeat, ...firstScene.beats.slice(1)].map((beat) => beat.id)}).slice(0, 12)}`});
    const beatGraph = reseal({...project.graph, scenes: [beatScene, ...project.graph.scenes.slice(1)]});
    expect(() => restoreCv002Project(JSON.stringify(resealProjectWithGraph(project, beatGraph)))).toThrow(/Beat ID is not derived/i);

    const forgedScene = reseal({...firstScene, id: "scene-forged"});
    const sceneGraph = reseal({...project.graph, scenes: [forgedScene, ...project.graph.scenes.slice(1)]});
    expect(() => restoreCv002Project(JSON.stringify(resealProjectWithGraph(project, sceneGraph)))).toThrow(/Scene ID is not derived/i);
  });

  it("rejects a self-rehashed no-op history transaction", () => {
    const project = createCv002Project("Harbor signals", SCRIPT, "weird-history", HISTORY_ART_DIRECTION);
    const existingBoundary = project.graph.scenes[1]!.beats[0]!;
    const transactionDraft = {
      schemaVersion: "1.0" as const,
      id: "edit-0001",
      sequence: 1,
      operation: {type: "set-scene-boundary" as const, beatId: existingBoundary.id, enabled: true},
      beforeGraph: project.graph,
      afterGraph: project.graph,
      beforeDirectionHash: project.directionDraft.contentHash,
      afterDirectionHash: project.directionDraft.contentHash,
    };
    const transaction = {...transactionDraft, contentHash: hashCanonical(transactionDraft)};
    const forged = reseal({...project, history: [transaction], historyCursor: 1});

    expect(() => restoreCv002Project(JSON.stringify(forged))).toThrow(/must change the graph/i);
  });

  it("keeps canonical project state free of clocks, UUIDs, paths, and random values", () => {
    const project = createCv002Project("Harbor signals", SCRIPT, "kids-adventure", KIDS_ART_DIRECTION);
    expect(JSON.stringify(project)).not.toMatch(/timestamp|createdAt|updatedAt|uuid|filesystem|random|[A-Z]:\\/i);
  });
});
