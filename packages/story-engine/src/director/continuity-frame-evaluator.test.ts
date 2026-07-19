import { describe, expect, it } from "vitest";
import { hashCanonical } from "../canonical-hash";
import { createCv002Project } from "../cv002-story-draft";
import { compileDirectorProject } from "./director-compiler";
import {
  continuityMotionProgressAt,
  evaluateContinuityFrame,
} from "./continuity-frame-evaluator";
import {
  localPerformanceFrameSchema,
  rigVisualProgramSchema,
} from "./visual-performance-contract";

const sentence =
  "A curious traveler follows the bright trail, watches her friend, and carefully carries the lantern toward the old forest gate.";
const script = Array.from(
  { length: 9 },
  (_, index) => `${sentence} ${index + 1}.`,
).join(" ");

describe("canonical continuity frame evaluation", () => {
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
});

describe("visual performance contract", () => {
  it("seals rig references and rejects forbidden root authority in local output", () => {
    const draft = {
      schemaVersion: "1.0" as const,
      id: "generic-kids-rig",
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
