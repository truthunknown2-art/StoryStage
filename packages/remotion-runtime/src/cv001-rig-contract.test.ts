import {
  compileCv001ThreeBeatScene,
  createCv001ThreeBeatProofFixture,
  createDirectedShotMotionBinding,
  cv001LanternMotionProgram,
} from "@storystage/story-engine";
import { describe, expect, it } from "vitest";
import { getCv001AttachmentContinuity } from "./cv001-rig-kinematics";
import { assertDirectedShotMotionBindings } from "./production-motion-binding";

describe("CV-001 render contract", () => {
  it("keeps the lantern continuous across the attachment boundary", () => {
    const continuity = getCv001AttachmentContinuity(cv001LanternMotionProgram);
    expect(continuity.startFrame).toBe(48);
    expect(continuity.distance).toBeLessThan(0.001);
    expect(continuity.rotationDelta).toBeLessThan(0.001);
    expect(continuity.scaleDelta).toBeLessThan(0.001);
  });

  it("binds all compiled programs to exact non-truncated shots", () => {
    const fixture = createCv001ThreeBeatProofFixture();
    const compiled = compileCv001ThreeBeatScene(fixture);
    expect(
      assertDirectedShotMotionBindings(
        fixture.renderPlan,
        fixture.renderPlan.durationInFrames,
        [...compiled.bindings],
      ),
    ).toEqual(compiled.bindings);
    expect(() =>
      assertDirectedShotMotionBindings(fixture.renderPlan, 200, [
        compiled.bindings[1],
      ]),
    ).toThrow(/truncated/);
  });

  it("rejects duplicate, unknown, and stale bindings", () => {
    const fixture = createCv001ThreeBeatProofFixture();
    const compiled = compileCv001ThreeBeatScene(fixture);
    expect(() =>
      assertDirectedShotMotionBindings(
        fixture.renderPlan,
        fixture.renderPlan.durationInFrames,
        [compiled.bindings[0], compiled.bindings[0]],
      ),
    ).toThrow(/target a shot twice/);
    const unknownBinding = createDirectedShotMotionBinding(
      { ...fixture.input.beats[1], shotId: "missing-shot" },
      compiled.bindings[1].program,
    );
    expect(() =>
      assertDirectedShotMotionBindings(
        fixture.renderPlan,
        fixture.renderPlan.durationInFrames,
        [unknownBinding],
      ),
    ).toThrow(/does not exist/);
    expect(() =>
      assertDirectedShotMotionBindings(
        fixture.renderPlan,
        fixture.renderPlan.durationInFrames,
        [
          {
            ...compiled.bindings[0],
            beatContentHash: "0".repeat(64),
          },
        ],
      ),
    ).toThrow();
  });
});
