import { describe, expect, it } from "vitest";
import { hashCanonical } from "../canonical-hash";
import { createCv002Project } from "../cv002-story-draft";
import { compileContinuitySequencePlan } from "./continuity-compiler";
import { sealContinuitySequencePlan } from "./continuity-sequence-plan";
import { compileDirectorProject } from "./director-compiler";
import {
  continuityGaitPhaseAt,
  continuityMotionProgressAt,
  evaluateContinuityFrame,
} from "./continuity-frame-evaluator";
import {
  localPerformanceFrameSchema,
  rigVisualProgramSchema,
} from "./visual-performance-contract";
import { executableEpisodePlanSchema } from "./executable-episode-plan";

const sentence =
  "A curious traveler follows the bright trail, watches her friend, and carefully carries the lantern toward the old forest gate.";
const script = Array.from(
  { length: 9 },
  (_, index) => `${sentence} ${index + 1}.`,
).join(" ");

describe("canonical continuity frame evaluation", () => {
  it.each([8, 12, 24, 30])(
    "preserves forward gait across an unwrapped %i-frame cycle span",
    (durationInFrames) => {
      const advanceCycles = durationInFrames / 12;
      const phases = Array.from({ length: durationInFrames }, (_, frame) =>
        continuityGaitPhaseAt(
          0,
          advanceCycles,
          frame / Math.max(1, durationInFrames - 1),
        ),
      ) as number[];
      const forwardDeltas = phases.slice(1).map((phase, index) => {
        const previous = phases[index]!;
        return (((phase - previous) % 1) + 1) % 1;
      });
      const sampledAtlasFrames = new Set(
        phases.map((phase) => Math.floor(phase * 4) % 4),
      );

      expect(phases[0]).toBe(0);
      expect(phases.at(-1)).toBeCloseTo(advanceCycles % 1, 10);
      expect(forwardDeltas.every((delta) => delta > 0)).toBe(true);
      expect(forwardDeltas.reduce((sum, delta) => sum + delta, 0)).toBeCloseTo(
        advanceCycles,
        10,
      );
      expect(sampledAtlasFrames.size).toBeGreaterThan(1);
    },
  );

  it("resolves exact root boundaries plus camera and transition samples", () => {
    const project = compileDirectorProject({
      storyProject: createCv002Project(
        "Frame evaluator",
        script,
        "kids-adventure",
      ),
    });
    const episode = project.executableEpisodePlan;
    const shot = episode.shots[0]!;
    const continuity = episode.continuitySequencePlan.shots[0]!;
    const first = evaluateContinuityFrame(episode, shot.startFrame);
    const last = evaluateContinuityFrame(episode, shot.endFrameExclusive - 1);

    expect(first.episodePlanContentHash).toBe(episode.contentHash);
    expect(first.continuitySequencePlanContentHash).toBe(
      episode.continuitySequencePlan.contentHash,
    );
    expect(first.entities.lead?.rootTransform).toEqual(
      continuity.entryWorldState.entities.lead?.transform,
    );
    expect(last.entities.lead?.rootTransform).toEqual(
      continuity.exitWorldState.entities.lead?.transform,
    );
    expect(first.camera.programContentHash).toHaveLength(64);
    expect(first.transition.programContentHash).toHaveLength(64);
    expect(first.transition.toShotId).toBe(shot.directorShotId);
  });

  it("is deterministic for the same sealed episode and frame", () => {
    const project = compileDirectorProject({
      storyProject: createCv002Project(
        "Deterministic frame",
        script,
        "kids-adventure",
      ),
    });
    const first = evaluateContinuityFrame(project.executableEpisodePlan, 12);
    const second = evaluateContinuityFrame(project.executableEpisodePlan, 12);
    expect(hashCanonical(first)).toBe(hashCanonical(second));
  });

  it("decelerates into a named plant and holds its root progress", () => {
    const atStart = continuityMotionProgressAt(0, 0, 29, 20, 26);
    const beforeDeceleration = continuityMotionProgressAt(19, 0, 29, 20, 26);
    const duringDeceleration = continuityMotionProgressAt(23, 0, 29, 20, 26);
    const atPlant = continuityMotionProgressAt(26, 0, 29, 20, 26);
    const afterPlant = continuityMotionProgressAt(28, 0, 29, 20, 26);

    expect(atStart).toBe(0);
    expect(beforeDeceleration).toBeLessThan(duringDeceleration);
    expect(duringDeceleration).toBeLessThan(1);
    expect(atPlant).toBe(1);
    expect(afterPlant).toBe(1);
  });

  it("rejects frames outside the sealed episode", () => {
    const project = compileDirectorProject({
      storyProject: createCv002Project(
        "Frame bounds",
        script,
        "kids-adventure",
      ),
    });
    expect(() =>
      evaluateContinuityFrame(
        project.executableEpisodePlan,
        project.executableEpisodePlan.format.durationInFrames,
      ),
    ).toThrow(/falls outside the episode/);
  });

  it("reports locomotion, deceleration, named plant, settle, and a stopped root on exact frames", () => {
    const project = compileDirectorProject({
      storyProject: createCv002Project(
        "Performance state authority",
        script,
        "kids-adventure",
      ),
    });
    const baseEpisode = project.executableEpisodePlan;
    const continuityDraft = structuredClone(baseEpisode.continuitySequencePlan);
    Reflect.deleteProperty(continuityDraft, "contentHash");
    const shot = continuityDraft.shots.at(-1)!;
    const boundSegment = shot.performanceSegments.find(
      (segment) => segment.performanceProgramId !== null,
    )!;
    const entityId = boundSegment.entityId;
    const entryWorld = shot.entryWorldState.entities[entityId]!;
    const exitWorld = shot.exitWorldState.entities[entityId]!;
    exitWorld.transform.x = entryWorld.transform.x + 0.12;
    exitWorld.velocity = { x: 0, y: 0, z: 0 };
    const decelerationFrame = shot.endFrameExclusive - 8;
    const plantFrame = shot.endFrameExclusive - 3;
    shot.performanceSegments = [
      ...shot.performanceSegments.filter(
        (segment) => segment.entityId !== entityId,
      ),
      {
        entityId,
        startFrame: shot.startFrame,
        endFrameExclusive: decelerationFrame,
        motionMode: "running",
        actionPhase: "action",
        gaitStart: 0,
        gaitAdvanceCycles: 0.5,
        performanceProgramId: boundSegment.performanceProgramId,
        performanceProgramContentHash:
          boundSegment.performanceProgramContentHash,
      },
      {
        entityId,
        startFrame: decelerationFrame,
        endFrameExclusive: plantFrame,
        motionMode: "decelerating",
        actionPhase: "action",
        gaitStart: 0.5,
        gaitAdvanceCycles: 0.25,
        performanceProgramId: boundSegment.performanceProgramId,
        performanceProgramContentHash:
          boundSegment.performanceProgramContentHash,
      },
      {
        entityId,
        startFrame: plantFrame,
        endFrameExclusive: shot.endFrameExclusive,
        motionMode: "idle",
        actionPhase: "settle",
        gaitStart: null,
        gaitAdvanceCycles: null,
        performanceProgramId: boundSegment.performanceProgramId,
        performanceProgramContentHash:
          boundSegment.performanceProgramContentHash,
      },
    ];
    const exitPerformance = shot.exitPerformanceState.find(
      (state) => state.entityId === entityId,
    )!;
    Object.assign(exitPerformance, {
      motionMode: "idle",
      actionPhase: "settle",
      gaitPhase: null,
      performanceProgramId: boundSegment.performanceProgramId,
      performanceProgramContentHash: boundSegment.performanceProgramContentHash,
    });
    shot.pictureEvents.push(
      {
        source: "performance-event",
        id: `${shot.shotId}-${entityId}-test-deceleration`,
        parentDirectorEventId: shot.cutEventId,
        sourceProgramContentHash: boundSegment.performanceProgramContentHash!,
        frame: decelerationFrame,
        subjectIds: [entityId],
        kind: "deceleration",
      },
      {
        source: "performance-event",
        id: `${shot.shotId}-${entityId}-test-plant`,
        parentDirectorEventId: shot.cutEventId,
        sourceProgramContentHash: boundSegment.performanceProgramContentHash!,
        frame: plantFrame,
        subjectIds: [entityId],
        kind: "plant",
      },
    );
    shot.pictureEvents.sort((left, right) => left.frame - right.frame);
    const continuitySequencePlan = sealContinuitySequencePlan(continuityDraft);
    const episodeDraft = structuredClone(baseEpisode);
    Reflect.deleteProperty(episodeDraft, "contentHash");
    episodeDraft.continuitySequencePlan = continuitySequencePlan;
    const episode = executableEpisodePlanSchema.parse({
      ...episodeDraft,
      contentHash: hashCanonical(episodeDraft),
    });

    const walking = evaluateContinuityFrame(episode, decelerationFrame - 1)
      .entities[entityId]!;
    const decelerating = evaluateContinuityFrame(episode, decelerationFrame)
      .entities[entityId]!;
    const planted = evaluateContinuityFrame(episode, plantFrame).entities[
      entityId
    ]!;
    const held = evaluateContinuityFrame(episode, plantFrame + 1).entities[
      entityId
    ]!;

    expect(walking.motionMode).toBe("running");
    expect(walking.gaitPhase).not.toBeNull();
    expect(decelerating.motionMode).toBe("decelerating");
    expect(decelerating.gaitPhase).not.toBeNull();
    expect(planted.motionMode).toBe("idle");
    expect(planted.actionPhase).toBe("settle");
    expect(planted.gaitPhase).toBeNull();
    expect(held.rootTransform).toEqual(planted.rootTransform);
    expect(held.velocity).toEqual({ x: 0, y: 0, z: 0 });
  });

  it("resolves compiler-owned viseme cues exactly and keeps them stable across unrelated animation edits", () => {
    const project = compileDirectorProject({
      storyProject: createCv002Project(
        "Exact visemes",
        script,
        "kids-adventure",
      ),
    });
    const episode = project.executableEpisodePlan;
    const visemeProgram = episode.continuitySequencePlan.visemePrograms[0]!;
    const firstCue = visemeProgram.cues[0]!;
    const secondCue = visemeProgram.cues[1]!;

    expect(
      evaluateContinuityFrame(episode, firstCue.startFrame).entities[
        visemeProgram.entityId
      ]?.visemeId,
    ).toBe(firstCue.visemeId);
    expect(
      evaluateContinuityFrame(episode, secondCue.startFrame).entities[
        visemeProgram.entityId
      ]?.visemeId,
    ).toBe(secondCue.visemeId);
    if (firstCue.startFrame > 0)
      expect(
        evaluateContinuityFrame(episode, firstCue.startFrame - 1).entities[
          visemeProgram.entityId
        ]?.visemeId,
      ).toBeNull();

    const bindings = episode.performancePrograms.map((program) => ({
      id: program.id,
      entityId: program.entityId,
      kind: program.kind,
      contentHash:
        program.id ===
        episode.performancePrograms.find(
          (candidate) => candidate.kind === "articulated-rig",
        )?.id
          ? hashCanonical("unrelated-blink-amplitude-edit")
          : program.contentHash!,
      sourceShotIds: program.sourceShotIds!,
    }));
    const recompiled = compileContinuitySequencePlan({
      directorPlan: project.directorPlan,
      timingSolution: project.timingSolution,
      sceneWorlds: project.sceneWorlds,
      fps: episode.format.fps,
      performancePrograms: bindings,
    });
    expect(
      recompiled.visemePrograms.find(
        (candidate) => candidate.id === visemeProgram.id,
      )?.contentHash,
    ).toBe(visemeProgram.contentHash);
  });

  it("never carries a performance program into a shot outside its lineage", () => {
    const project = compileDirectorProject({
      storyProject: createCv002Project(
        "No lineage bleed",
        script,
        "kids-adventure",
      ),
    });
    const episode = project.executableEpisodePlan;
    const multiShotBeat = project.directorPlan.beats.find(
      (beat) =>
        project.directorPlan.shots.filter((shot) =>
          shot.beatIds.includes(beat.beatId),
        ).length === 2,
    )!;
    const [allowedShot, forbiddenShot] = project.directorPlan.shots.filter(
      (shot) => shot.beatIds.includes(multiShotBeat.beatId),
    );
    const primaryRequirement = multiShotBeat.performanceRequirements.find(
      (requirement) =>
        requirement.requiredEventIds[0] === allowedShot!.entryEventId &&
        requirement.requiredEventIds.at(-1) === allowedShot!.exitEventId,
    )!;
    const primaryProgram = episode.performancePrograms.find(
      (program) => program.id === primaryRequirement.id,
    )!;

    expect(primaryProgram.sourceShotIds).toEqual([allowedShot!.id]);
    const recompiled = compileContinuitySequencePlan({
      directorPlan: project.directorPlan,
      timingSolution: project.timingSolution,
      sceneWorlds: project.sceneWorlds,
      fps: episode.format.fps,
      performancePrograms: episode.performancePrograms.map((program) => ({
        id: program.id,
        entityId: program.entityId,
        kind: program.kind,
        contentHash: program.contentHash!,
        sourceShotIds: program.sourceShotIds!,
      })),
    });
    const forbiddenContinuityShot = recompiled.shots.find(
      (shot) => shot.shotId === forbiddenShot!.id,
    )!;
    expect(
      forbiddenContinuityShot.performanceSegments
        .filter((segment) => segment.entityId === primaryProgram.entityId)
        .every((segment) => segment.performanceProgramId !== primaryProgram.id),
    ).toBe(true);

    const explicitlyShared = compileContinuitySequencePlan({
      directorPlan: project.directorPlan,
      timingSolution: project.timingSolution,
      sceneWorlds: project.sceneWorlds,
      fps: episode.format.fps,
      performancePrograms: episode.performancePrograms.map((program) => ({
        id: program.id,
        entityId: program.entityId,
        kind: program.kind,
        contentHash: program.contentHash!,
        sourceShotIds:
          program.id === primaryProgram.id
            ? [allowedShot!.id, forbiddenShot!.id]
            : program.sourceShotIds!,
      })),
    });
    const explicitlySharedShot = explicitlyShared.shots.find(
      (shot) => shot.shotId === forbiddenShot!.id,
    )!;
    expect(
      explicitlySharedShot.performanceSegments.some(
        (segment) =>
          segment.entityId === primaryProgram.entityId &&
          segment.performanceProgramId === primaryProgram.id,
      ),
    ).toBe(true);
  });
});

describe("visual performance contract", () => {
  it("seals rig references and rejects forbidden root authority in local output", () => {
    const draft = {
      schemaVersion: "1.0" as const,
      id: "generic-kids-rig",
      sourcePerformanceProgramContentHash: hashCanonical("performance-program"),
      rigManifestContentHash: hashCanonical("rig-manifest"),
      partIds: ["torso", "head", "upper-arm"],
      socketIds: ["right-hand"],
      exposureIds: ["mouth-rest", "mouth-open"],
      visemeIds: ["rest", "open"],
    };
    expect(
      rigVisualProgramSchema.parse({
        ...draft,
        contentHash: hashCanonical(draft),
      }).contentHash,
    ).toHaveLength(64);

    expect(() =>
      localPerformanceFrameSchema.parse({
        parts: {},
        face: {
          eyeOpen: 1,
          pupilX: 0,
          pupilY: 0,
          brow: 0,
          mouthExposureId: null,
        },
        sockets: {},
        localEffects: [],
        rootTransform: { x: 1, y: 1 },
      }),
    ).toThrow();
  });
});
