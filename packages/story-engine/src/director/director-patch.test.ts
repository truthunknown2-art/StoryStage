import { describe, expect, it } from "vitest";
import { hashCanonical } from "../canonical-hash";
import { createCv002Project } from "../cv002-story-draft";
import { applyDirectorPatch } from "./apply-director-patch";
import { compileDirectorProject } from "./director-compiler";
import { describeDirectorPatch, proposeDirectorPatch } from "./director-patch";
import type {
  DirectorPlanner,
  DirectorProposalDraft,
} from "./director-proposal";
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

const reactionTarget = (base: ReturnType<typeof compileDirectorProject>) => {
  const beat = base.directorPlan.beats.find((candidate) =>
    base.directorPlan.events.some(
      (event) => event.beatId === candidate.beatId && event.kind === "reaction",
    ),
  )!;
  return beat.beatId;
};

class CustomDirectorPlanner implements DirectorPlanner {
  propose({
    storyProject,
  }: Parameters<DirectorPlanner["propose"]>[0]): DirectorProposalDraft {
    const beatDirections = storyProject.directionDraft.directions.map(
      (direction, index) => {
        if (index !== 0) return direction;
        const directionDraft = Object.fromEntries(
          Object.entries(direction).filter(([key]) => key !== "contentHash"),
        ) as Omit<typeof direction, "contentHash">;
        const customDraft = {
          ...directionDraft,
          cameraIntent: "snap-reframe" as const,
          musicIntent: "wonder-rise" as const,
        };
        return { ...customDraft, contentHash: hashCanonical(customDraft) };
      },
    );
    return {
      schemaVersion: "1.0",
      plannerId: "custom-gpt-director",
      plannerVersion: "9.4",
      storyGraphContentHash: storyProject.graph.contentHash,
      grammar: storyProject.grammar,
      beatDirections,
      eventTimingAdjustments: [],
    };
  }
}

describe("Director patch", () => {
  it("proposes a hash-bound structured reaction delay", () => {
    const storyProject = createCv002Project(
      "Patch proof",
      script,
      "kids-adventure",
    );
    const base = compileDirectorProject({ storyProject });
    const targetBeatId = reactionTarget(base);
    const patch = proposeDirectorPatch({
      baseDirectorProject: base,
      targetBeatId,
      command: "Make the partner reaction 12 frames later",
    });

    expect(patch.baseDirectorProjectContentHash).toBe(base.contentHash);
    expect(patch.targetBeatId).toBe(targetBeatId);
    const reactionEvent = base.directorPlan.events.find(
      (event) => event.beatId === targetBeatId && event.kind === "reaction",
    )!;
    const sourceShot = base.directorPlan.shots.find(
      (shot) =>
        shot.beatIds.includes(targetBeatId) &&
        [
          shot.entryEventId,
          shot.exitEventId,
          shot.timingEnvelope.earliestCutEventId,
          shot.timingEnvelope.preferredCutEventId,
          shot.timingEnvelope.latestCutEventId,
        ].includes(reactionEvent.id),
    )!;
    expect(patch.operations).toEqual([
      {
        id: `delay-event-${reactionEvent.id}`,
        kind: "delay-event",
        beatId: targetBeatId,
        eventId: reactionEvent.id,
        sourceShotId: sourceShot.id,
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
    const targetBeatId = reactionTarget(base);
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

    const delayedShotId = patch.operations[0]!.sourceShotId;
    const untouchedTargetShotIds = base.directorPlan.shots
      .filter(
        (shot) =>
          shot.beatIds.includes(targetBeatId) && shot.id !== delayedShotId,
      )
      .map((shot) => shot.id);
    const baseTargetPrograms = (
      base.executableEpisodePlan.proxyEntityPrograms ?? []
    ).filter((program) => untouchedTargetShotIds.includes(program.shotId));
    const editedTargetPrograms = new Map(
      (edited.executableEpisodePlan.proxyEntityPrograms ?? []).map(
        (program) => [program.id, program],
      ),
    );
    expect(
      baseTargetPrograms.every(
        (program) =>
          editedTargetPrograms.get(program.id)?.contentHash ===
          program.contentHash,
      ),
    ).toBe(true);

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

  it("preserves the exact custom planning artifact while applying an event-local edit", () => {
    const storyProject = createCv002Project(
      "Custom planner proof",
      script,
      "kids-adventure",
    );
    const base = compileDirectorProject({
      storyProject,
      planner: new CustomDirectorPlanner(),
    });
    const targetBeatId = reactionTarget(base);
    const patch = proposeDirectorPatch({
      baseDirectorProject: base,
      targetBeatId,
      command: "Make the reaction 8 frames later",
    });
    const edited = applyDirectorPatch({
      storyProject,
      baseDirectorProject: base,
      patch,
    });

    expect(base.planningArtifact.plannerId).toBe("custom-gpt-director");
    expect(edited.planningArtifact.plannerId).toBe("custom-gpt-director");
    expect(edited.planningArtifact.plannerVersion).toBe("9.4");
    expect(edited.planningArtifact.beatDirections).toEqual(
      base.planningArtifact.beatDirections,
    );
    expect(edited.planningArtifact.eventTimingAdjustments).toEqual([
      {
        beatId: targetBeatId,
        eventId: patch.operations[0]!.eventId,
        sourceShotId: patch.operations[0]!.sourceShotId,
        frames: 8,
      },
    ]);
  });

  it("rejects a reaction-delay note when the selected beat has no reaction event", () => {
    const storyProject = createCv002Project(
      "Missing target proof",
      script,
      "weird-history",
    );
    const base = compileDirectorProject({ storyProject });
    const targetBeatId = base.directorPlan.beats.find(
      (beat) =>
        !base.directorPlan.events.some(
          (event) => event.beatId === beat.beatId && event.kind === "reaction",
        ),
    )!.beatId;

    expect(() =>
      proposeDirectorPatch({
        baseDirectorProject: base,
        targetBeatId,
        command: "Make the reaction 6 frames later",
      }),
    ).toThrow(/no concrete reaction event/i);
  });
});
