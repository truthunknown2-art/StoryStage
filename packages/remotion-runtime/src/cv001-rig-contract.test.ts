import type { FrameAccurateRenderPlan } from "@storystage/story-engine";
import { cv001LanternMotionProgram } from "@storystage/story-engine";
import { describe, expect, it } from "vitest";
import { getCv001AttachmentContinuity } from "./cv001-rig-kinematics";
import { assertDirectedShotMotionBinding } from "./production-motion-binding";

const singleShotPlan = {
  id: "cv001-single-shot-plan",
  fps: 30,
  durationInFrames: 120,
  shots: [
    {
      id: "cv001-shot",
      startFrame: 0,
      durationInFrames: 120,
    },
  ],
} as FrameAccurateRenderPlan;

describe("CV-001 render contract", () => {
  it("keeps the lantern continuous across the attachment boundary", () => {
    const continuity = getCv001AttachmentContinuity(cv001LanternMotionProgram);
    expect(continuity.startFrame).toBe(48);
    expect(continuity.distance).toBeLessThan(0.001);
    expect(continuity.rotationDelta).toBeLessThan(0.001);
    expect(continuity.scaleDelta).toBeLessThan(0.001);
  });

  it("binds the program to an exact non-truncated shot", () => {
    expect(
      assertDirectedShotMotionBinding(singleShotPlan, 120, {
        shotId: "cv001-shot",
        program: cv001LanternMotionProgram,
      }),
    ).toEqual({
      shotId: "cv001-shot",
      program: cv001LanternMotionProgram,
    });
    expect(() =>
      assertDirectedShotMotionBinding(singleShotPlan, 100, {
        shotId: "cv001-shot",
        program: cv001LanternMotionProgram,
      }),
    ).toThrow(/truncated/);
    expect(() =>
      assertDirectedShotMotionBinding(singleShotPlan, 120, {
        shotId: "missing-shot",
        program: cv001LanternMotionProgram,
      }),
    ).toThrow(/does not exist/);
  });
});
