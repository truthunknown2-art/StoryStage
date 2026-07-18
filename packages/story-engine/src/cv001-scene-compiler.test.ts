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
    const roundTrip = JSON.parse(JSON.stringify(first)) as typeof first;
    expect(roundTrip).toEqual(first);
    expect(hashCanonical(roundTrip)).toBe(hashCanonical(first));
    expect(JSON.stringify(first)).not.toMatch(
      /createdAt|updatedAt|timestamp|uuid|filePath|random/i,
    );
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

  it("compiles every supported beat duration without collapsed phases or keyframes", () => {
    for (let duration = 24; duration <= 180; duration += 1) {
      const fixture = createCv001ThreeBeatProofFixture();
      let cursor = 0;
      for (const [index, shot] of fixture.renderPlan.shots.entries()) {
        shot.startFrame = cursor;
        shot.durationInFrames = duration;
        shot.actions = shot.actions.map((action) => ({
          ...action,
          startFrame: cursor,
          endFrame: cursor + duration,
        }));
        fixture.input.beats[index]!.durationInFrames = duration;
        cursor += duration;
      }
      fixture.renderPlan.durationInFrames = cursor;
      const { contentHash: _contentHash, ...planPayload } = fixture.renderPlan;
      void _contentHash;
      fixture.renderPlan.contentHash = hashCanonical(planPayload);
      fixture.input.planContentHash = fixture.renderPlan.contentHash;

      const compiled = compileCv001ThreeBeatScene(fixture);
      expect(
        compiled.bindings.every(
          (binding) => binding.program.durationInFrames === duration,
        ),
      ).toBe(true);
    }
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
    for (const boneId of ["upper-arm-right", "lower-arm-right", "hand-right"])
      expect(
        pickup!.tracks.some(
          (track) =>
            track.type === "bone" &&
            track.boneId === boneId &&
            new Set(track.keyframes.map((keyframe) => keyframe.value)).size > 1,
        ),
      ).toBe(true);
  });

  it("rejects malformed beat identity, order, intent, and scene input", () => {
    const fixture = createCv001ThreeBeatProofFixture();
    const repeatedId = structuredClone(fixture.input);
    repeatedId.beats[1].id = repeatedId.beats[0].id;
    expect(() =>
      compileCv001ThreeBeatScene({
        input: repeatedId,
        renderPlan: fixture.renderPlan,
      }),
    ).toThrow();

    const repeatedShot = structuredClone(fixture.input);
    repeatedShot.beats[1].shotId = repeatedShot.beats[0].shotId;
    expect(() =>
      compileCv001ThreeBeatScene({
        input: repeatedShot,
        renderPlan: fixture.renderPlan,
      }),
    ).toThrow();

    const outOfOrder = structuredClone(fixture.input) as unknown as Record<
      string,
      unknown
    >;
    outOfOrder.beats = (outOfOrder.beats as unknown[]).slice().reverse();
    expect(() =>
      compileCv001ThreeBeatScene({
        input: outOfOrder as never,
        renderPlan: fixture.renderPlan,
      }),
    ).toThrow();

    const unknownIntent = structuredClone(fixture.input) as unknown as {
      beats: Array<Record<string, unknown>>;
    };
    unknownIntent.beats[0]!.intent = "do-something-animated";
    expect(() =>
      compileCv001ThreeBeatScene({
        input: unknownIntent as never,
        renderPlan: fixture.renderPlan,
      }),
    ).toThrow();

    const wrongScene = structuredClone(fixture.input);
    wrongScene.beats[2].sceneId = "scene-elsewhere";
    expect(() =>
      compileCv001ThreeBeatScene({
        input: wrongScene,
        renderPlan: fixture.renderPlan,
      }),
    ).toThrow();
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

    const duplicatePlanShot = structuredClone(fixture.renderPlan);
    duplicatePlanShot.shots.push(structuredClone(duplicatePlanShot.shots[0]!));
    const { contentHash: _oldHash, ...duplicatePlanPayload } =
      duplicatePlanShot;
    void _oldHash;
    duplicatePlanShot.contentHash = hashCanonical(duplicatePlanPayload);
    const duplicatePlanInput = {
      ...fixture.input,
      planContentHash: duplicatePlanShot.contentHash,
    };
    expect(() =>
      compileCv001ThreeBeatScene({
        input: duplicatePlanInput,
        renderPlan: duplicatePlanShot,
      }),
    ).toThrow(/exactly once/);

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
    expect(
      cv001CompiledSceneMotionSchema.safeParse({
        ...compiled,
        rigContractId: "another-rig",
      }).success,
    ).toBe(false);
  });
});
