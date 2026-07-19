import { describe, expect, it, vi } from "vitest";
import { hashCanonical } from "../canonical-hash";
import {
  evaluateLocalPerformance,
  localPerformanceInputSchema,
  rigVisualProgramSchema,
  type LocalPerformanceInput,
  type VisualPerformanceRenderer,
} from "./visual-performance-contract";

const hash = (value: string) => hashCanonical(value);

const createProgram = () => {
  const draft = {
    schemaVersion: "1.0" as const,
    id: "generic-kids-rig",
    sourcePerformanceProgramContentHash: hash("performance-program"),
    rigManifestContentHash: hash("rig-manifest"),
    partIds: ["torso", "head"],
    socketIds: ["right-hand"],
    exposureIds: ["mouth-rest", "mouth-open"],
    visemeIds: ["rest", "open"],
  };
  return rigVisualProgramSchema.parse({
    ...draft,
    contentHash: hashCanonical(draft),
  });
};

const createInput = (): LocalPerformanceInput => {
  const program = createProgram();
  return localPerformanceInputSchema.parse({
    schemaVersion: "1.0",
    episodePlanContentHash: hash("episode"),
    continuitySequencePlanContentHash: hash("continuity"),
    performanceProgramContentHash:
      program.sourcePerformanceProgramContentHash,
    rigVisualProgramContentHash: program.contentHash,
    rigManifestContentHash: program.rigManifestContentHash,
    entityId: "lead",
    shotId: "shot-001",
    localFrame: 12,
    fps: 30,
    motionMode: "idle",
    actionPhase: "hold",
    phaseProgress: 0.5,
    gaitPhase: null,
    facing: "three-quarter",
    gazeVectorLocal: { x: 0.2, y: -0.1 },
    visemeId: "open",
    microMotionSeed: hash("micro-motion"),
    program,
    assets: [
      {
        assetId: "lead-rig-atlas",
        contentHash: hash("asset"),
        byteLength: 1024,
        width: 512,
        height: 512,
        verifiedUrl: "verified://lead-rig-atlas",
      },
    ],
  });
};

const createOutput = () => ({
  parts: {
    torso: {
      x: 0,
      y: 0,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      opacity: 1,
      exposureId: null,
    },
    head: {
      x: 2,
      y: -12,
      rotation: 0.02,
      scaleX: 1,
      scaleY: 1,
      opacity: 1,
      exposureId: null,
    },
  },
  face: {
    eyeOpen: 1,
    pupilX: 0.2,
    pupilY: -0.1,
    brow: 0,
    mouthExposureId: "mouth-open",
  },
  sockets: {
    "right-hand": { x: 8, y: 2, rotation: 0, scale: 1 },
  },
  localEffects: [],
});

const rendererReturning = (output: unknown): VisualPerformanceRenderer => ({
  rendererId: "test-local-performance",
  rendererVersion: "1.0.0",
  evaluate: vi.fn(() => output),
});

describe("fail-closed local performance evaluation", () => {
  it("parses both sides and returns manifest-bound local performance", () => {
    expect(
      evaluateLocalPerformance(
        rendererReturning(createOutput()),
        createInput(),
      ),
    ).toEqual(createOutput());
  });

  it("rejects unknown input authority before calling the renderer", () => {
    const renderer = rendererReturning(createOutput());
    expect(() =>
      evaluateLocalPerformance(renderer, {
        ...createInput(),
        absoluteFrame: 42,
      }),
    ).toThrow();
    expect(renderer.evaluate).not.toHaveBeenCalled();
  });

  it.each(["rootTransform", "offset", "opacity", "camera"])(
    "rejects output top-level %s authority",
    (key) => {
      expect(() =>
        evaluateLocalPerformance(
          rendererReturning({
            ...createOutput(),
            [key]: key === "opacity" ? 0.5 : {},
          }),
          createInput(),
        ),
      ).toThrow();
    },
  );

  it("requires the exact declared part and socket manifests", () => {
    const undeclaredPart = createOutput();
    Object.assign(undeclaredPart.parts, {
      cape: {
        x: 0,
        y: 0,
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
        opacity: 1,
        exposureId: null,
      },
    });
    expect(() =>
      evaluateLocalPerformance(
        rendererReturning(undeclaredPart),
        createInput(),
      ),
    ).toThrow(/undeclared: cape/);

    const missingPart = createOutput();
    delete (missingPart.parts as Partial<typeof missingPart.parts>).head;
    expect(() =>
      evaluateLocalPerformance(rendererReturning(missingPart), createInput()),
    ).toThrow(/missing: head/);

    const missingSocket = createOutput();
    delete (missingSocket.sockets as Partial<typeof missingSocket.sockets>)[
      "right-hand"
    ];
    expect(() =>
      evaluateLocalPerformance(rendererReturning(missingSocket), createInput()),
    ).toThrow(/missing: right-hand/);
  });

  it("holds an immutable authority snapshot across renderer mutation", () => {
    const forgedOutput = createOutput();
    Object.assign(forgedOutput.parts, {
      cape: {
        x: 0,
        y: 0,
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
        opacity: 1,
        exposureId: null,
      },
    });
    const renderer: VisualPerformanceRenderer = {
      rendererId: "mutating-renderer",
      rendererVersion: "1.0.0",
      evaluate: (input) => {
        input.program.partIds.push("cape");
        return forgedOutput;
      },
    };
    expect(() => evaluateLocalPerformance(renderer, createInput())).toThrow(
      /undeclared: cape/,
    );
  });

  it("rejects undeclared exposures and visemes", () => {
    const output = createOutput();
    (output.parts.head as { exposureId: unknown }).exposureId =
      "unknown-exposure";
    expect(() =>
      evaluateLocalPerformance(rendererReturning(output), createInput()),
    ).toThrow(/undeclared exposure/);

    expect(() =>
      evaluateLocalPerformance(rendererReturning(createOutput()), {
        ...createInput(),
        visemeId: "unknown-viseme",
      }),
    ).toThrow(/not declared/);
  });

  it("rejects stale bindings before invoking renderer code", () => {
    const renderer = rendererReturning(createOutput());
    expect(() =>
      evaluateLocalPerformance(renderer, {
        ...createInput(),
        rigManifestContentHash: hash("stale-manifest"),
      }),
    ).toThrow(/manifest hash/);
    expect(renderer.evaluate).not.toHaveBeenCalled();

    expect(() =>
      evaluateLocalPerformance(renderer, {
        ...createInput(),
        performanceProgramContentHash: hash("stale-program"),
      }),
    ).toThrow(/performance program hash/);
    expect(renderer.evaluate).not.toHaveBeenCalled();

    expect(() =>
      evaluateLocalPerformance(renderer, {
        ...createInput(),
        rigVisualProgramContentHash: hash("stale-rig-visual-program"),
      }),
    ).toThrow(/rig visual program hash/);
    expect(renderer.evaluate).not.toHaveBeenCalled();
  });

  it("never accepts a hash from a different artifact domain", () => {
    const input = createInput();
    expect(input.performanceProgramContentHash).not.toBe(
      input.rigVisualProgramContentHash,
    );
    expect(input.rigVisualProgramContentHash).not.toBe(
      input.rigManifestContentHash,
    );

    expect(() =>
      evaluateLocalPerformance(rendererReturning(createOutput()), {
        ...input,
        performanceProgramContentHash: input.rigVisualProgramContentHash,
      }),
    ).toThrow(/performance program hash/);
    expect(() =>
      evaluateLocalPerformance(rendererReturning(createOutput()), {
        ...input,
        rigVisualProgramContentHash: input.rigManifestContentHash,
      }),
    ).toThrow(/rig visual program hash/);
    expect(() =>
      evaluateLocalPerformance(rendererReturning(createOutput()), {
        ...input,
        rigManifestContentHash: input.rigVisualProgramContentHash,
      }),
    ).toThrow(/rig manifest hash/);
  });

  it("rejects reserved root parts and whole-actor opacity", () => {
    const program = createProgram();
    const { contentHash, ...draft } = program;
    expect(contentHash).toHaveLength(64);
    expect(() =>
      rigVisualProgramSchema.parse({
        ...draft,
        partIds: ["actor-root", "head"],
        contentHash: hashCanonical({
          ...draft,
          partIds: ["actor-root", "head"],
        }),
      }),
    ).toThrow(/reserved/);

    const output = createOutput();
    output.parts.torso.opacity = 0.5;
    output.parts.head.opacity = 0.5;
    expect(() =>
      evaluateLocalPerformance(rendererReturning(output), createInput()),
    ).toThrow(/whole-actor opacity/);
  });

  it("rejects duplicate verified asset ids", () => {
    const input = createInput();
    expect(() =>
      evaluateLocalPerformance(rendererReturning(createOutput()), {
        ...input,
        assets: [input.assets[0], input.assets[0]],
      }),
    ).toThrow(/asset ids must be unique/);
  });
});
