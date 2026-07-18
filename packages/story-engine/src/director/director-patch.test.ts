import { describe, expect, it } from "vitest";
import { createCv002Project } from "../cv002-story-draft";
import { applyDirectorPatch } from "./apply-director-patch";
import { compileDirectorProject } from "./director-compiler";
import { describeDirectorPatch, proposeDirectorPatch } from "./director-patch";
import {
  createDirectorHistory,
  currentDirectorProject,
  recordDirectorRevision,
  redoDirectorHistory,
  undoDirectorHistory,
} from "./director-history";

const sentence =
  "A curious traveler follows a bright clue and pauses when the hidden answer changes everything.";
const script = Array.from(
  { length: 9 },
  (_, index) => `${sentence.slice(0, -1)} ${index + 1}.`,
).join(" ");

describe("Director patch", () => {
  it("proposes a hash-bound structured reaction delay", () => {
    const storyProject = createCv002Project(
      "Patch proof",
      script,
      "kids-adventure",
    );
    const base = compileDirectorProject({ storyProject });
    const targetBeatId = base.directorPlan.beats.find(
      (beat) =>
        base.directorPlan.shots.filter((shot) =>
          shot.beatIds.includes(beat.beatId),
        ).length === 2,
    )!.beatId;
    const patch = proposeDirectorPatch({
      baseDirectorProject: base,
      targetBeatId,
      command: "Make the partner reaction 12 frames later",
    });

    expect(patch.baseDirectorProjectContentHash).toBe(base.contentHash);
    expect(patch.targetBeatId).toBe(targetBeatId);
    expect(patch.operations).toEqual([
      {
        id: `delay-reaction-${targetBeatId}`,
        kind: "delay-reaction",
        beatId: targetBeatId,
        frames: 12,
      },
    ]);
    expect(describeDirectorPatch(patch)).toEqual([
      "Delay the reaction by 12 frames",
    ]);
  });

  it("recompiles one beat deterministically while preserving unrelated programs", () => {
    const storyProject = createCv002Project(
      "Locality proof",
      script,
      "kids-adventure",
    );
    const base = compileDirectorProject({ storyProject });
    const targetBeatId = base.directorPlan.beats.find(
      (beat) =>
        base.directorPlan.shots.filter((shot) =>
          shot.beatIds.includes(beat.beatId),
        ).length === 2,
    )!.beatId;
    const patch = proposeDirectorPatch({
      baseDirectorProject: base,
      targetBeatId,
      command: "Make the reaction later",
    });
    const edited = applyDirectorPatch({
      storyProject,
      baseDirectorProject: base,
      patch,
    });
    const repeated = applyDirectorPatch({
      storyProject,
      baseDirectorProject: base,
      patch,
    });

    expect(edited.contentHash).toBe(repeated.contentHash);
    expect(edited.contentHash).not.toBe(base.contentHash);
    expect(edited.revision).toEqual({
      baseDirectorProjectContentHash: base.contentHash,
      directorPatchContentHash: patch.contentHash,
    });
    expect(
      edited.directorPlan.beats.find((beat) => beat.beatId === targetBeatId)
        ?.reactionDelayFrames,
    ).toBe(6);
    expect(edited.timingSolution.durationInFrames).toBe(
      base.timingSolution.durationInFrames + 6,
    );
    expect(edited.sceneWorlds.map((world) => world.contentHash)).toEqual(
      base.sceneWorlds.map((world) => world.contentHash),
    );

    const basePrograms = [
      ...(base.executableEpisodePlan.proxyStagePrograms ?? []),
      ...(base.executableEpisodePlan.proxyCameraPrograms ?? []),
      ...(base.executableEpisodePlan.proxyEntityPrograms ?? []),
      ...(base.executableEpisodePlan.proxyCaptionPrograms ?? []),
      ...(base.executableEpisodePlan.proxyTransitionPrograms ?? []),
    ].filter((program) => !program.sourceBeatIds.includes(targetBeatId));
    const editedById = new Map(
      [
        ...(edited.executableEpisodePlan.proxyStagePrograms ?? []),
        ...(edited.executableEpisodePlan.proxyCameraPrograms ?? []),
        ...(edited.executableEpisodePlan.proxyEntityPrograms ?? []),
        ...(edited.executableEpisodePlan.proxyCaptionPrograms ?? []),
        ...(edited.executableEpisodePlan.proxyTransitionPrograms ?? []),
      ].map((program) => [program.id, program]),
    );
    expect(
      basePrograms.every(
        (program) =>
          editedById.get(program.id)?.contentHash === program.contentHash,
      ),
    ).toBe(true);

    let history = createDirectorHistory(base);
    history = recordDirectorRevision(history, patch, edited);
    history = undoDirectorHistory(history);
    expect(currentDirectorProject(history).contentHash).toBe(base.contentHash);
    history = redoDirectorHistory(history);
    expect(currentDirectorProject(history).contentHash).toBe(
      edited.contentHash,
    );
  });
});
