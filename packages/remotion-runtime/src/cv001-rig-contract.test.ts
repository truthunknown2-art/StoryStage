import {
  compileCv001ThreeBeatScene,
  createCv001ThreeBeatProofFixture,
  createDirectedShotMotionBinding,
  cv001LanternMotionProgram,
  hashCanonical,
} from "@storystage/story-engine";
import { describe, expect, it } from "vitest";
import { getCv001AttachmentContinuity } from "./cv001-rig-kinematics";
import {
  assertDirectedSceneMotion,
  assertDirectedShotMotionBindings,
} from "./production-motion-binding";

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
    expect(
      assertDirectedSceneMotion(
        fixture.renderPlan,
        fixture.renderPlan.durationInFrames,
        compiled,
      ),
    ).toEqual(compiled);
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

    expect(() =>
      assertDirectedSceneMotion(
        fixture.renderPlan,
        fixture.renderPlan.durationInFrames,
        {
          ...compiled,
          bindings: compiled.bindings.slice(0, 2),
        } as never,
      ),
    ).toThrow();

    const newerPlan = structuredClone(fixture.renderPlan);
    newerPlan.title = "The Lantern Discovery — revised picture";
    const { contentHash: _newerHash, ...newerPayload } = newerPlan;
    void _newerHash;
    newerPlan.contentHash = hashCanonical(newerPayload);
    expect(() =>
      assertDirectedSceneMotion(
        newerPlan,
        newerPlan.durationInFrames,
        compiled,
      ),
    ).toThrow(/not active plan/);
  });

  it("leaves an unbound fourth shot alone and rejects fps or duration drift", () => {
    const fixture = createCv001ThreeBeatProofFixture();
    const compiled = compileCv001ThreeBeatScene(fixture);
    const fourthShotPlan = structuredClone(fixture.renderPlan);
    const sourceShot = fourthShotPlan.shots[2]!;
    fourthShotPlan.shots.push({
      ...sourceShot,
      id: "shot-cv001-unbound-fourth",
      number: "1.04",
      startFrame: 300,
      durationInFrames: 60,
      actions: sourceShot.actions.map((action, index) => ({
        ...action,
        id: `shot-cv001-unbound-fourth-action-${index + 1}`,
        startFrame: 300,
        endFrame: 360,
      })),
    });
    fourthShotPlan.durationInFrames = 360;
    const { contentHash: _fourthHash, ...fourthPayload } = fourthShotPlan;
    void _fourthHash;
    fourthShotPlan.contentHash = hashCanonical(fourthPayload);
    const { contentHash: _sceneHash, ...sceneDraft } = compiled;
    void _sceneHash;
    const fourthSceneDraft = {
      ...sceneDraft,
      planContentHash: fourthShotPlan.contentHash,
    };
    const fourthScene = {
      ...fourthSceneDraft,
      contentHash: hashCanonical(fourthSceneDraft),
    };
    expect(
      assertDirectedSceneMotion(fourthShotPlan, 360, fourthScene),
    ).toBeDefined();

    const fpsDrift = structuredClone(fixture.renderPlan);
    fpsDrift.fps = 24;
    const { contentHash: _fpsHash, ...fpsPayload } = fpsDrift;
    void _fpsHash;
    fpsDrift.contentHash = hashCanonical(fpsPayload);
    expect(() =>
      assertDirectedShotMotionBindings(fpsDrift, 300, [compiled.bindings[0]]),
    ).toThrow(/fps/);

    const durationDrift = structuredClone(fixture.renderPlan);
    durationDrift.shots[0]!.durationInFrames += 1;
    const { contentHash: _durationHash, ...durationPayload } = durationDrift;
    void _durationHash;
    durationDrift.contentHash = hashCanonical(durationPayload);
    expect(() =>
      assertDirectedShotMotionBindings(durationDrift, 300, [
        compiled.bindings[0],
      ]),
    ).toThrow(/duration/);
  });
});
