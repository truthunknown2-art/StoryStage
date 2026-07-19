import { describe, expect, it } from "vitest";
import { hashCanonical } from "../canonical-hash";
import { createCv002Project } from "../cv002-story-draft";
import { createCv002ArtDirectionSelection } from "../cv002-art-direction";
import { applyDirectorPatch } from "./apply-director-patch";
import { createCapabilityRegistry } from "./capability-report";
import { compileDirectorProject } from "./director-compiler";
import {
  describeDirectorPatch,
  proposeDirectorPatch,
  proposeDirectorVisualPatch,
} from "./director-patch";
import { directorProjectSchema } from "./director-project";
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

const reseal = <T extends { contentHash: string }>(value: T): T => {
  const { contentHash: _contentHash, ...draft } = value;
  void _contentHash;
  return { ...draft, contentHash: hashCanonical(draft) } as T;
};

const reactionTarget = (base: ReturnType<typeof compileDirectorProject>) => {
  const beat = base.directorPlan.beats.find((candidate) =>
    base.directorPlan.events.some(
      (event) => event.beatId === candidate.beatId && event.kind === "reaction",
    ),
  )!;
  return beat.beatId;
};

const delayOperation = (patch: ReturnType<typeof proposeDirectorPatch>) => {
  const operation = patch.operations[0];
  if (!operation || operation.kind !== "delay-event")
    throw new Error("Expected a delay-event operation.");
  return operation;
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
      shotOverrides: [],
    };
  }
}

describe("Director patch", () => {
  it("rejects a same-grammar art-direction substitution independently at patch application", () => {
    const storybookStory = createCv002Project(
      "Patch art authority",
      script,
      "kids-adventure",
      createCv002ArtDirectionSelection(
        "kids-adventure",
        "storybook-watercolor-paper-cutout",
      ),
    );
    const collageStory = createCv002Project(
      "Patch art authority",
      script,
      "kids-adventure",
      createCv002ArtDirectionSelection(
        "kids-adventure",
        "cut-paper-collage-mixed-media",
      ),
    );
    const originalBase = compileDirectorProject({
      storyProject: storybookStory,
    });
    const forgedBase = reseal({
      ...originalBase,
      storyProjectContentHash: collageStory.contentHash,
    });
    const target = reactionTarget(forgedBase);
    const patch = proposeDirectorPatch({
      baseDirectorProject: forgedBase,
      targetBeatId: target,
      command: "Make the reaction 6 frames later",
    });

    expect(() =>
      applyDirectorPatch({
        storyProject: collageStory,
        baseDirectorProject: forgedBase,
        patch,
      }),
    ).toThrow(/art direction does not match/i);
  });

  it("preserves exact capability authority and rejects silent registry migration", () => {
    const storyProject = createCv002Project(
      "Capability patch locality",
      script,
      "kids-adventure",
      createCv002ArtDirectionSelection(
        "kids-adventure",
        "cut-paper-collage-mixed-media",
      ),
    );
    const probe = compileDirectorProject({ storyProject });
    const requirement =
      probe.directorPlan.beats[0]!.performanceRequirements[0]!;
    expect(requirement.source).toBe("living-hold");
    const contentHash = "a".repeat(64);
    const registry = createCapabilityRegistry({
      version: "patch-capability-registry-a",
      capabilities: [
        {
          id: "patch-living-hold-capability",
          requirementId: requirement.id,
          entityId: requirement.entityId,
          kind: "living-hold",
          rendererId: "test-living-hold-renderer",
          rendererVersion: "1.0.0",
          assets: [
            {
              assetId: "patch-living-hold-asset",
              version: "1.0.0",
              contentHash,
              status: "approved",
              relativeFile: `capability-assets/${contentHash}.png`,
              byteLength: 128,
              immutableLocationId: `sha256:${contentHash}`,
            },
          ],
          execution: {
            kind: "living-hold",
            assetId: "patch-living-hold-asset",
            atlasWidth: 100,
            atlasHeight: 100,
            frames: [
              {
                source: { x: 0, y: 0, width: 50, height: 100 },
                anchor: { x: 25, y: 100 },
              },
              {
                source: { x: 50, y: 0, width: 50, height: 100 },
                anchor: { x: 25, y: 100 },
              },
            ],
            poseSequence: [0, 1],
            cycleFrames: 24,
            breathingAmplitude: 0.01,
          },
        },
      ],
    });
    const otherRegistry = createCapabilityRegistry({
      version: "patch-capability-registry-b",
      capabilities: [],
    });
    const base = compileDirectorProject({
      storyProject,
      capabilities: registry,
    });
    const targetBeatId = reactionTarget(base);
    const patch = proposeDirectorPatch({
      baseDirectorProject: base,
      targetBeatId,
      command: "Make the reaction later",
    });
    const originalProgram = base.executableEpisodePlan.performancePrograms.find(
      (program) => program.id === requirement.id,
    )!;
    const edited = applyDirectorPatch({
      storyProject,
      baseDirectorProject: base,
      patch,
      capabilities: registry,
    });
    const editedProgram = edited.executableEpisodePlan.performancePrograms.find(
      (program) => program.id === requirement.id,
    )!;

    expect(originalProgram.execution?.kind).toBe("living-hold");
    expect(editedProgram.contentHash).toBe(originalProgram.contentHash);
    expect(edited.capabilityReport.registryContentHash).toBe(
      registry.contentHash,
    );
    expect(() =>
      applyDirectorPatch({
        storyProject,
        baseDirectorProject: base,
        patch,
        capabilities: otherRegistry,
      }),
    ).toThrow(/explicit migration artifact/i);
    expect(() =>
      applyDirectorPatch({ storyProject, baseDirectorProject: base, patch }),
    ).toThrow(/explicit migration artifact/i);
  });

  it("proposes a hash-bound structured reaction delay", () => {
    const storyProject = createCv002Project(
      "Patch proof",
      script,
      "kids-adventure",
      createCv002ArtDirectionSelection(
        "kids-adventure",
        "cut-paper-collage-mixed-media",
      ),
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
      createCv002ArtDirectionSelection(
        "kids-adventure",
        "cut-paper-collage-mixed-media",
      ),
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

    const delayedShotId = delayOperation(patch).sourceShotId;
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
      createCv002ArtDirectionSelection(
        "kids-adventure",
        "cut-paper-collage-mixed-media",
      ),
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
        eventId: delayOperation(patch).eventId,
        sourceShotId: delayOperation(patch).sourceShotId,
        frames: 8,
      },
    ]);
  });

  it("recompiles one shot for patch-backed size and camera movement", () => {
    const storyProject = createCv002Project(
      "Visual patch proof",
      script,
      "kids-adventure",
      createCv002ArtDirectionSelection(
        "kids-adventure",
        "cut-paper-collage-mixed-media",
      ),
    );
    const base = compileDirectorProject({ storyProject });
    const shot = base.directorPlan.shots[0]!;
    const targetBeatId = shot.beatIds[0]!;
    const patch = proposeDirectorVisualPatch({
      baseDirectorProject: base,
      targetBeatId,
      shotId: shot.id,
      shotSize: shot.camera.size === "close-up" ? "wide" : "close-up",
      cameraMovement: shot.camera.movement === "track" ? "push" : "track",
    });
    const edited = applyDirectorPatch({
      storyProject,
      baseDirectorProject: base,
      patch,
    });
    const editedShot = edited.directorPlan.shots.find(
      (candidate) => candidate.id === shot.id,
    )!;

    expect(patch.operations.map((operation) => operation.kind)).toEqual([
      "set-shot-size",
      "set-camera-movement",
    ]);
    expect(editedShot.camera.size).toBe(
      shot.camera.size === "close-up" ? "wide" : "close-up",
    );
    expect(editedShot.camera.movement).toBe(
      shot.camera.movement === "track" ? "push" : "track",
    );
    expect(edited.planningArtifact.shotOverrides).toEqual([
      {
        beatId: targetBeatId,
        shotId: shot.id,
        shotSize: editedShot.camera.size,
        cameraMovement: editedShot.camera.movement,
      },
    ]);
    const editedCameraPrograms = new Map(
      (edited.executableEpisodePlan.proxyCameraPrograms ?? []).map(
        (program) => [program.shotId, program],
      ),
    );
    expect(
      (base.executableEpisodePlan.proxyCameraPrograms ?? [])
        .filter((program) => program.shotId !== shot.id)
        .every(
          (program) =>
            editedCameraPrograms.get(program.shotId)?.contentHash ===
            program.contentHash,
        ),
    ).toBe(true);
    expect(editedCameraPrograms.get(shot.id)?.contentHash).not.toBe(
      (base.executableEpisodePlan.proxyCameraPrograms ?? []).find(
        (program) => program.shotId === shot.id,
      )?.contentHash,
    );

    let history = createDirectorHistory(base);
    history = recordDirectorRevision(history, patch, edited);
    expect(
      currentDirectorProject(undoDirectorHistory(history)).contentHash,
    ).toBe(base.contentHash);
    expect(
      currentDirectorProject(redoDirectorHistory(undoDirectorHistory(history)))
        .contentHash,
    ).toBe(edited.contentHash);
  });

  it("rejects the current visual values as a no-op", () => {
    const storyProject = createCv002Project(
      "Visual no-op proof",
      script,
      "kids-adventure",
      createCv002ArtDirectionSelection(
        "kids-adventure",
        "cut-paper-collage-mixed-media",
      ),
    );
    const base = compileDirectorProject({ storyProject });
    const shot = base.directorPlan.shots[0]!;

    expect(() =>
      proposeDirectorVisualPatch({
        baseDirectorProject: base,
        targetBeatId: shot.beatIds[0]!,
        shotId: shot.id,
        shotSize: shot.camera.size,
        cameraMovement: shot.camera.movement,
      }),
    ).toThrow("Choose a different shot size or camera movement.");
  });

  it("rejects a visual patch when the shot belongs to another beat", () => {
    const storyProject = createCv002Project(
      "Wrong visual target proof",
      script,
      "kids-adventure",
      createCv002ArtDirectionSelection(
        "kids-adventure",
        "cut-paper-collage-mixed-media",
      ),
    );
    const base = compileDirectorProject({ storyProject });
    const shot = base.directorPlan.shots[0]!;
    const otherBeatId = base.directorPlan.beats.find(
      (beat) => !shot.beatIds.includes(beat.beatId),
    )!.beatId;

    expect(() =>
      proposeDirectorVisualPatch({
        baseDirectorProject: base,
        targetBeatId: otherBeatId,
        shotId: shot.id,
        shotSize: "close-up",
      }),
    ).toThrow(/does not belong/i);
  });

  it("rejects a self-rehashed planning artifact when the compiled plan still names the original artifact", () => {
    const storyProject = createCv002Project(
      "Artifact binding proof",
      script,
      "kids-adventure",
      createCv002ArtDirectionSelection(
        "kids-adventure",
        "cut-paper-collage-mixed-media",
      ),
    );
    const base = compileDirectorProject({ storyProject });
    const forged = structuredClone(base);
    const originalDirection = forged.planningArtifact.beatDirections[0]!;
    const directionDraft = structuredClone(originalDirection);
    delete (directionDraft as Partial<typeof originalDirection>).contentHash;
    const changedDirectionDraft = {
      ...directionDraft,
      musicIntent:
        directionDraft.musicIntent === "wonder-rise"
          ? ("playful-bed" as const)
          : ("wonder-rise" as const),
    };
    forged.planningArtifact.beatDirections[0] = {
      ...changedDirectionDraft,
      contentHash: hashCanonical(changedDirectionDraft),
    };
    const artifactDraft = structuredClone(forged.planningArtifact);
    delete (artifactDraft as Partial<typeof forged.planningArtifact>)
      .contentHash;
    forged.planningArtifact.contentHash = hashCanonical(artifactDraft);
    const projectDraft = structuredClone(forged);
    delete (projectDraft as Partial<typeof forged>).contentHash;
    forged.contentHash = hashCanonical(projectDraft);

    expect(() => directorProjectSchema.parse(forged)).toThrow(
      /exact compiled plan authority and content/i,
    );
  });

  it("rejects a reaction-delay note when the selected beat has no reaction event", () => {
    const storyProject = createCv002Project(
      "Missing target proof",
      script,
      "weird-history",
      createCv002ArtDirectionSelection(
        "weird-history",
        "weird-history-editorial-collage",
      ),
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
