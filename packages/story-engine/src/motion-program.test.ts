import { describe, expect, it } from "vitest";
import {
  assertMotionProgram,
  cv001LanternMotionProgram,
  directedBeatProgramSchema,
  evaluateMotionProgram,
  getMotionProgramIssues,
} from "./motion-program";

describe("directed motion programs", () => {
  it("evaluates the same requested frame deterministically", () => {
    expect(evaluateMotionProgram(cv001LanternMotionProgram, 60)).toEqual(
      evaluateMotionProgram(cv001LanternMotionProgram, 60),
    );
    expect(
      evaluateMotionProgram(cv001LanternMotionProgram, 60).attachments,
    ).toEqual([{ propId: "lantern", boneId: "hand-right" }]);
    expect(
      evaluateMotionProgram(cv001LanternMotionProgram, 20).attachments,
    ).toEqual([]);
  });

  it("rejects a pose-swap track structurally", () => {
    expect(() =>
      directedBeatProgramSchema.parse({
        ...cv001LanternMotionProgram,
        tracks: [
          {
            type: "pose-swap",
            keyframes: [
              { frame: 0, value: 0 },
              { frame: 10, value: 1 },
            ],
          },
        ],
      }),
    ).toThrow();
  });

  it("rejects root translation that tries to carry performance without articulation", () => {
    const program = directedBeatProgramSchema.parse({
      schemaVersion: "1.0",
      id: "sliding-character",
      fps: 30,
      durationInFrames: 30,
      phases: [
        { type: "anticipation", startFrame: 0, endFrame: 5 },
        { type: "action", startFrame: 5, endFrame: 20 },
        { type: "settle", startFrame: 20, endFrame: 30 },
      ],
      tracks: [
        {
          type: "root",
          property: "x",
          keyframes: [
            { frame: 0, value: 0 },
            { frame: 29, value: 300 },
          ],
        },
      ],
    });
    expect(getMotionProgramIssues(program).map((issue) => issue.code)).toEqual([
      "missing-articulated-motion",
      "root-without-articulation",
    ]);
    expect(() => assertMotionProgram(program)).toThrow(
      /root-without-articulation/,
    );
  });

  it("enforces the CV-001 facial camera and prop-contact proof", () => {
    const withoutContact = directedBeatProgramSchema.parse({
      ...cv001LanternMotionProgram,
      tracks: cv001LanternMotionProgram.tracks.filter(
        (track) => track.type !== "attachment",
      ),
    });
    expect(
      getMotionProgramIssues(withoutContact, { cv001Proof: true }).map(
        (issue) => issue.code,
      ),
    ).toEqual(["missing-prop-attachment"]);
  });

  it("contains continuous head-led articulated motion", () => {
    const early = evaluateMotionProgram(cv001LanternMotionProgram, 12);
    const torsoAtTwelve = early.bones.torso?.rotation ?? 0;
    const headAtTwelve = early.bones.head?.rotation ?? 0;
    expect(Math.abs(headAtTwelve)).toBeGreaterThan(Math.abs(torsoAtTwelve));
    expect(evaluateMotionProgram(cv001LanternMotionProgram, 70).phase).toBe(
      "overshoot",
    );
    expect(
      getMotionProgramIssues(cv001LanternMotionProgram, { cv001Proof: true }),
    ).toEqual([]);
  });
});
