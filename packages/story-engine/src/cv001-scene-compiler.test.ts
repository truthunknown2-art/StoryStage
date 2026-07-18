import { describe, expect, it } from "vitest";
import { hashCanonical } from "./canonical-hash";
import { createCv001ThreeBeatProofFixture } from "./cv001-proof-fixture";
import {
  compileCv001ThreeBeatScene,
  cv001CompiledSceneMotionSchema,
  directedShotMotionBindingSchema,
  getCv001CompiledBeatIssues,
  verifyCv001CompiledSceneMotion,
} from "./cv001-scene-compiler";
import {
  directedBeatProgramSchema,
  type DirectedBeatProgram,
} from "./motion-program";

const compileFixture = () => {
  const fixture = createCv001ThreeBeatProofFixture();
  return {
    ...fixture,
    compiled: compileCv001ThreeBeatScene({
      input: fixture.input,
      renderPlan: fixture.renderPlan,
    }),
  };
};

describe("CV-001 deterministic three-beat compiler", () => {
  it("compiles the three intent beats into strict rig-bound motion", () => {
    const { input, compiled } = compileFixture();

    expect(cv001CompiledSceneMotionSchema.parse(compiled)).toEqual(compiled);
    expect(verifyCv001CompiledSceneMotion(input, compiled)).toBe(true);
    expect(compiled.bindings).toHaveLength(3);
    compiled.bindings.forEach((binding, index) => {
      expect(directedShotMotionBindingSchema.parse(binding)).toEqual(binding);
      expect(directedBeatProgramSchema.parse(binding.program)).toEqual(
        binding.program,
      );
      expect(binding.program.durationInFrames).toBe(
        input.beats[index]!.durationInFrames,
      );
      expect(binding.program.fps).toBe(30);
      expect(
        getCv001CompiledBeatIssues(input.beats[index]!, binding.program),
      ).toEqual([]);
    });
  });

  it("is byte-deterministic for identical canonical input", () => {
    const fixture = createCv001ThreeBeatProofFixture();
    const first = compileCv001ThreeBeatScene({
      input: fixture.input,
      renderPlan: fixture.renderPlan,
    });
    const second = compileCv001ThreeBeatScene({
      input: structuredClone(fixture.input),
      renderPlan: structuredClone(fixture.renderPlan),
    });

    expect(second).toEqual(first);
    expect(hashCanonical(second)).toBe(hashCanonical(first));
  });

  it("isolates a beat-two edit to beat two and the scene hash", () => {
    const fixture = createCv001ThreeBeatProofFixture();
    const first = compileCv001ThreeBeatScene(fixture);
    const changedInput = structuredClone(fixture.input);
    changedInput.beats[1].text =
      "She pauses, reaches with both caution and purpose, then lifts it.";
    const second = compileCv001ThreeBeatScene({
      input: changedInput,
      renderPlan: fixture.renderPlan,
    });

    expect(second.bindings[0]).toEqual(first.bindings[0]);
    expect(second.bindings[2]).toEqual(first.bindings[2]);
    expect(second.bindings[1]).not.toEqual(first.bindings[1]);
    expect(second.bindings[1].programContentHash).not.toBe(
      first.bindings[1].programContentHash,
    );
    expect(second.contentHash).not.toBe(first.contentHash);
  });

  it("enforces the intended attachment and phase lifecycle", () => {
    const { compiled } = compileFixture();
    const [notice, pickup, present] = compiled.bindings.map(
      (binding) => binding.program,
    );
    const attachments = (program: DirectedBeatProgram) =>
      program.tracks.filter((track) => track.type === "attachment");

    expect(attachments(notice!)).toEqual([]);
    expect(attachments(pickup!)).toHaveLength(1);
    expect(attachments(pickup!)[0]!.startFrame).toBeGreaterThan(0);
    expect(attachments(pickup!)[0]!.endFrame).toBe(pickup!.durationInFrames);
    expect(attachments(present!)).toEqual([
      expect.objectContaining({
        startFrame: 0,
        endFrame: present!.durationInFrames,
      }),
    ]);
    for (const program of [notice!, pickup!, present!]) {
      expect(program.phases[0]!.startFrame).toBe(0);
      expect(program.phases.at(-1)!.endFrame).toBe(program.durationInFrames);
      program.phases
        .slice(1)
        .forEach((phase, index) =>
          expect(phase.startFrame).toBe(program.phases[index]!.endFrame),
        );
    }
    const finalHold = present!.phases.at(-1)!;
    expect(finalHold.endFrame - finalHold.startFrame).toBeGreaterThanOrEqual(
      12,
    );
  });

  it("rejects stale plans, duration mismatches, and tampered hashes", () => {
    const fixture = createCv001ThreeBeatProofFixture();
    expect(() =>
      compileCv001ThreeBeatScene({
        input: fixture.input,
        renderPlan: {
          ...fixture.renderPlan,
          contentHash: "0".repeat(64),
        },
      }),
    ).toThrow(/verified render plan hash/);

    const durationMismatch = structuredClone(fixture.input);
    durationMismatch.beats[1].durationInFrames += 1;
    expect(() =>
      compileCv001ThreeBeatScene({
        input: durationMismatch,
        renderPlan: fixture.renderPlan,
      }),
    ).toThrow(/duration does not match/);

    const compiled = compileCv001ThreeBeatScene(fixture);
    const tamperedBinding = {
      ...compiled.bindings[0],
      program: {
        ...compiled.bindings[0].program,
        id: "tampered-motion-program",
      },
    };
    expect(
      directedShotMotionBindingSchema.safeParse(tamperedBinding).success,
    ).toBe(false);
    expect(
      cv001CompiledSceneMotionSchema.safeParse({
        ...compiled,
        contentHash: "f".repeat(64),
      }).success,
    ).toBe(false);
  });
});
