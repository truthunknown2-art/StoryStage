import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { hashCanonical } from "./canonical-hash";
import {
  candidateRigReviewMotionProgramSchema,
  candidateRigReviewPerformanceInputSchema,
  candidateRigReviewRenderInputSchema,
  candidateRigReviewPacketConstructionStatus,
  candidateRigReviewVisualProgramSchema,
  compileCandidateRigReviewMotionProgram,
  compileCandidateRigReviewPerformanceInput,
  compileCandidateRigReviewRenderInput,
  evaluateCandidateRigReviewPerformance,
  genericCandidateRigReviewRendererContract,
} from "./candidate-rig-review";
import { candidateRigReviewImplementationReceipt } from "./candidate-rig-review-implementation-receipt.generated";
import { buildCandidateRigReviewImplementationReceipt } from "./candidate-rig-review-implementation-receipt";
import { evaluateCandidateRigReviewRuntimeFrame } from "./candidate-rig-review-runtime";
import {
  evaluateActorLocalPerformanceKernel,
  rigVisualProgramSchema,
} from "./director/visual-performance-contract";

const hash = (value: string) => hashCanonical(value);

const readImplementationSources = async () => {
  const sourceRoot = dirname(fileURLToPath(import.meta.url));
  const entries = {
    evaluatorSource: resolve(sourceRoot, "candidate-rig-review-evaluator.ts"),
    exerciseSource: resolve(sourceRoot, "candidate-rig-review-exercise.ts"),
    runtimeWrapperSource: resolve(
      sourceRoot,
      "candidate-rig-review-runtime.ts",
    ),
    publicBoundarySource: resolve(sourceRoot, "candidate-rig-review.ts"),
    actorLocalKernelSource: resolve(
      sourceRoot,
      "director/visual-performance-contract.ts",
    ),
    receiptBuilderSource: resolve(
      sourceRoot,
      "candidate-rig-review-implementation-receipt.ts",
    ),
    generatorSource: resolve(
      sourceRoot,
      "../../../scripts/generate-candidate-rig-review-implementation-receipt.ts",
    ),
  };
  return Object.fromEntries(
    await Promise.all(
      Object.entries(entries).map(async ([key, file]) => [
        key,
        await readFile(file, "utf8"),
      ]),
    ),
  ) as Record<keyof typeof entries, string>;
};

const createReviewProgram = (
  view: "front" | "profile-left" | "profile-right" = "front",
) => {
  const draft = {
    schemaVersion: "1.0" as const,
    programKind: "candidate-rig-review" as const,
    authorityDomain: "source-review-only" as const,
    id: `candidate-review-${view}-test`,
    requestContentHash: hash("request"),
    candidateBundleContentHash: hash("bundle"),
    stagingReportContentHash: hash("report"),
    importReceiptContentHash: hash("receipt"),
    preparationRecipeContentHash: hash(`recipe-${view}`),
    identityLockContentHash: hash("identity"),
    topologyTemplateContentHash: hash("template"),
    rendererContract: genericCandidateRigReviewRendererContract,
    rendererImplementationReceiptContentHash:
      genericCandidateRigReviewRendererContract.implementationReceiptContentHash,
    rendererEvaluatorSourceContentHash:
      genericCandidateRigReviewRendererContract.evaluatorSourceContentHash,
    rendererCanonicalBehaviorContentHash:
      genericCandidateRigReviewRendererContract.canonicalBehaviorContentHash,
    exerciseDefinitionContentHash:
      genericCandidateRigReviewRendererContract.exerciseDefinitionContentHash,
    view,
    sourceBindings: [
      { candidateId: "front-face-atlas", contentHash: hash("face") },
      { candidateId: "front-parts-atlas", contentHash: hash("parts") },
    ],
    semanticRoles: [
      { componentId: "part-head", semanticRole: "head", kind: "part" as const },
      {
        componentId: "part-torso",
        semanticRole: "torso",
        kind: "part" as const,
      },
      {
        componentId: "exposure-mouth-rest",
        semanticRole: "mouth-rest",
        kind: "exposure" as const,
      },
      {
        componentId: "exposure-viseme-ai",
        semanticRole: "viseme-ai",
        kind: "exposure" as const,
      },
    ],
    partIds: ["part-head", "part-torso"],
    socketIds: ["neck"],
    exposureIds: ["exposure-mouth-rest", "exposure-viseme-ai"],
    visemeIds: ["viseme-ai"],
    productionBindable: false as const,
  };
  return candidateRigReviewVisualProgramSchema.parse({
    ...draft,
    contentHash: hashCanonical(draft),
  });
};

describe("candidate rig source-review visual contract", () => {
  it("is mutually unparsable with production RigVisualProgram", () => {
    const review = createReviewProgram();
    expect(() => rigVisualProgramSchema.parse(review)).toThrow();
    const productionDraft = {
      schemaVersion: "1.0" as const,
      id: "production-rig-program",
      sourcePerformanceProgramContentHash: hash("performance"),
      rigManifestContentHash: hash("manifest"),
      partIds: ["part-head", "part-torso"],
      socketIds: ["neck"],
      exposureIds: [],
      visemeIds: [],
    };
    const production = rigVisualProgramSchema.parse({
      ...productionDraft,
      contentHash: hashCanonical(productionDraft),
    });
    expect(() =>
      candidateRigReviewVisualProgramSchema.parse(production),
    ).toThrow();
  });

  it("binds the exact module-owned renderer implementation and rejects copied identities", () => {
    const program = createReviewProgram();
    expect(Object.isFrozen(genericCandidateRigReviewRendererContract)).toBe(
      true,
    );
    expect(
      Object.isFrozen(
        genericCandidateRigReviewRendererContract.identitySpecializationIds,
      ),
    ).toBe(true);
    expect(() => {
      (
        genericCandidateRigReviewRendererContract as {
          rendererId: string;
        }
      ).rendererId = "ollo-hardcoded-cheat";
    }).toThrow(TypeError);
    expect(genericCandidateRigReviewRendererContract.rendererId).toBe(
      "candidate-rig-review-generic",
    );
    const copiedContractDraft = {
      ...program.rendererContract,
      implementationContentHash: hash("copied-liar"),
    } as Record<string, unknown>;
    delete copiedContractDraft.contentHash;
    const copiedContract = {
      ...copiedContractDraft,
      contentHash: hashCanonical(copiedContractDraft),
    };
    const copiedProgramDraft = {
      ...program,
      rendererContract: copiedContract,
    } as Record<string, unknown>;
    delete copiedProgramDraft.contentHash;
    expect(() =>
      candidateRigReviewVisualProgramSchema.parse({
        ...copiedProgramDraft,
        contentHash: hashCanonical(copiedProgramDraft),
      }),
    ).toThrow(/exact generic renderer contract/i);

    const copiedIdentityLiar = {
      rendererId: program.rendererContract.rendererId,
      rendererVersion: program.rendererContract.rendererVersion,
      implementationContentHash:
        program.rendererContract.implementationContentHash,
      evaluate: () => ({ rootTransform: { x: 999 } }),
    };
    const oldInjectionShape =
      evaluateCandidateRigReviewPerformance as unknown as (
        renderer: unknown,
        input: unknown,
      ) => unknown;
    expect(() => oldInjectionShape(copiedIdentityLiar, program)).toThrow();
  });

  it("seals exact evaluator source and canonical behavior into every dependent hash", async () => {
    const sources = await readImplementationSources();
    const exactReceipt = buildCandidateRigReviewImplementationReceipt(sources);
    expect(exactReceipt).toEqual(candidateRigReviewImplementationReceipt);
    expect(exactReceipt.evaluatedModes).toEqual(["clean", "overlay", "motion"]);
    expect(exactReceipt.evaluatedViews).toEqual([
      "front",
      "profile-left",
      "profile-right",
    ]);
    expect(exactReceipt.evaluatedMotionFramesPerView).toBe(180);
    expect(exactReceipt.evaluatedMotionFrameCount).toBe(540);
    expect(exactReceipt.renderedMediaReceipt).toBe(false);
    expect(exactReceipt.approvalAuthority).toBe(false);
    expect(exactReceipt.capabilityAuthority).toBe(false);
    expect(exactReceipt.productionBindable).toBe(false);

    const sourceDrift = buildCandidateRigReviewImplementationReceipt({
      ...sources,
      evaluatorSource: `${sources.evaluatorSource}\n// behavior-neutral source drift`,
    });
    expect(sourceDrift.evaluatorSourceContentHash).not.toBe(
      exactReceipt.evaluatorSourceContentHash,
    );
    expect(sourceDrift.contentHash).not.toBe(exactReceipt.contentHash);

    const behaviorDrift = buildCandidateRigReviewImplementationReceipt({
      ...sources,
      runtimeWrapperSource: `${sources.runtimeWrapperSource}\n// wrapper drift`,
    });
    expect(behaviorDrift.evaluatorSourceContentHash).toBe(
      exactReceipt.evaluatorSourceContentHash,
    );
    expect(behaviorDrift.runtimeWrapperSourceContentHash).not.toBe(
      exactReceipt.runtimeWrapperSourceContentHash,
    );
    expect(behaviorDrift.canonicalBehaviorContentHash).toBe(
      exactReceipt.canonicalBehaviorContentHash,
    );
    expect(behaviorDrift.contentHash).not.toBe(exactReceipt.contentHash);

    const exerciseDrift = buildCandidateRigReviewImplementationReceipt({
      ...sources,
      exerciseSource: sources.exerciseSource.replace(
        '"profile-left": "left"',
        '"profile-left": "right"',
      ),
    });
    expect(exerciseDrift.exerciseSourceContentHash).not.toBe(
      exactReceipt.exerciseSourceContentHash,
    );
    expect(exerciseDrift.contentHash).not.toBe(exactReceipt.contentHash);
    const publicBoundaryDrift = buildCandidateRigReviewImplementationReceipt({
      ...sources,
      publicBoundarySource: `${sources.publicBoundarySource}\n// public boundary drift`,
    });
    expect(publicBoundaryDrift.publicBoundarySourceContentHash).not.toBe(
      exactReceipt.publicBoundarySourceContentHash,
    );
    expect(publicBoundaryDrift.contentHash).not.toBe(exactReceipt.contentHash);
    expect(buildCandidateRigReviewImplementationReceipt.length).toBe(1);

    expect(
      compileCandidateRigReviewPerformanceInput(
        createReviewProgram("profile-left"),
        "motion",
        0,
      ).facing,
    ).toBe("left");
    expect(
      compileCandidateRigReviewPerformanceInput(
        createReviewProgram("profile-right"),
        "motion",
        0,
      ).facing,
    ).toBe("right");

    const program = createReviewProgram();
    const motion = compileCandidateRigReviewMotionProgram(program);
    const render = compileCandidateRigReviewRenderInput(
      "motion",
      program,
      motion,
    );
    for (const dependent of [program, motion, render]) {
      expect(dependent.rendererImplementationReceiptContentHash).toBe(
        exactReceipt.contentHash,
      );
      expect(dependent.rendererEvaluatorSourceContentHash).toBe(
        exactReceipt.evaluatorSourceContentHash,
      );
      expect(dependent.rendererCanonicalBehaviorContentHash).toBe(
        exactReceipt.canonicalBehaviorContentHash,
      );
      expect(dependent.exerciseDefinitionContentHash).toBe(
        exactReceipt.exerciseDefinitionContentHash,
      );
    }
    const driftedContractDraft = {
      ...genericCandidateRigReviewRendererContract,
      implementationContentHash: behaviorDrift.contentHash,
      implementationReceiptContentHash: behaviorDrift.contentHash,
      evaluatorSourceContentHash: behaviorDrift.evaluatorSourceContentHash,
      canonicalBehaviorContentHash: behaviorDrift.canonicalBehaviorContentHash,
      exerciseDefinitionContentHash:
        behaviorDrift.exerciseDefinitionContentHash,
    } as Record<string, unknown>;
    delete driftedContractDraft.contentHash;
    const driftedContract = {
      ...driftedContractDraft,
      contentHash: hashCanonical(driftedContractDraft),
    };
    const driftedProgramDraft = {
      ...program,
      rendererContract: driftedContract,
      rendererImplementationReceiptContentHash: behaviorDrift.contentHash,
      rendererEvaluatorSourceContentHash:
        behaviorDrift.evaluatorSourceContentHash,
      rendererCanonicalBehaviorContentHash:
        behaviorDrift.canonicalBehaviorContentHash,
      exerciseDefinitionContentHash:
        behaviorDrift.exerciseDefinitionContentHash,
    } as Record<string, unknown>;
    delete driftedProgramDraft.contentHash;
    const driftedProgramContentHash = hashCanonical(driftedProgramDraft);
    const driftedMotionDraft = {
      ...motion,
      candidateRigReviewVisualProgramContentHash: driftedProgramContentHash,
      rendererContractContentHash: driftedContract.contentHash,
      rendererImplementationContentHash: behaviorDrift.contentHash,
      rendererImplementationReceiptContentHash: behaviorDrift.contentHash,
      rendererEvaluatorSourceContentHash:
        behaviorDrift.evaluatorSourceContentHash,
      rendererCanonicalBehaviorContentHash:
        behaviorDrift.canonicalBehaviorContentHash,
      exerciseDefinitionContentHash:
        behaviorDrift.exerciseDefinitionContentHash,
    } as Record<string, unknown>;
    delete driftedMotionDraft.contentHash;
    const driftedMotionContentHash = hashCanonical(driftedMotionDraft);
    const driftedRenderDraft = {
      ...render,
      candidateRigReviewVisualProgramContentHash: driftedProgramContentHash,
      candidateRigReviewMotionProgramContentHash: driftedMotionContentHash,
      rendererContractContentHash: driftedContract.contentHash,
      rendererImplementationContentHash: behaviorDrift.contentHash,
      rendererImplementationReceiptContentHash: behaviorDrift.contentHash,
      rendererEvaluatorSourceContentHash:
        behaviorDrift.evaluatorSourceContentHash,
      rendererCanonicalBehaviorContentHash:
        behaviorDrift.canonicalBehaviorContentHash,
      exerciseDefinitionContentHash:
        behaviorDrift.exerciseDefinitionContentHash,
    } as Record<string, unknown>;
    delete driftedRenderDraft.contentHash;
    const driftedDependentHashes = [
      driftedProgramContentHash,
      driftedMotionContentHash,
      hashCanonical(driftedRenderDraft),
    ];
    expect(driftedDependentHashes).not.toEqual([
      program.contentHash,
      motion.contentHash,
      render.contentHash,
    ]);
  });

  it("keeps the exported public boundary exhaustively equivalent to the sealed runtime", () => {
    for (const view of ["front", "profile-left", "profile-right"] as const) {
      const program = createReviewProgram(view);
      for (const mode of ["clean", "overlay"] as const) {
        const input = compileCandidateRigReviewPerformanceInput(
          program,
          mode,
          0,
        );
        expect(evaluateCandidateRigReviewPerformance(program, mode, 0)).toEqual(
          evaluateCandidateRigReviewRuntimeFrame(input),
        );
      }
      for (let localFrame = 0; localFrame < 180; localFrame += 1) {
        const input = compileCandidateRigReviewPerformanceInput(
          program,
          "motion",
          localFrame,
        );
        expect(
          evaluateCandidateRigReviewPerformance(program, "motion", localFrame),
        ).toEqual(evaluateCandidateRigReviewRuntimeFrame(input));
      }
    }
  });

  it("derives every performance value from the exact motion program and local frame", () => {
    const program = createReviewProgram();
    const frames = Array.from({ length: 180 }, (_, localFrame) =>
      compileCandidateRigReviewPerformanceInput(program, "motion", localFrame),
    );
    expect(
      compileCandidateRigReviewPerformanceInput(program, "motion", 74),
    ).toEqual(frames[74]);
    expect(new Set(frames.map((frame) => frame.microMotionSeed)).size).toBe(
      180,
    );
    expect(frames[0]!.motionMode).toBe("idle");
    expect(frames[60]!.motionMode).toBe("walking");
    expect(frames[90]!.motionMode).toBe("reacting");
    expect(frames[120]!.visemeId).toBe("viseme-ai");

    const exact = frames[74]!;
    const mutations: Array<[keyof typeof exact, unknown]> = [
      ["motionMode", "running"],
      ["actionPhase", "impact"],
      ["phaseProgress", 0.123],
      ["gaitPhase", 0.999],
      ["facing", "away"],
      ["gazeVectorLocal", { x: 1, y: 1 }],
      ["visemeId", "viseme-ai"],
      ["microMotionSeed", hash("caller-seed")],
    ];
    for (const [key, value] of mutations)
      expect(() =>
        candidateRigReviewPerformanceInputSchema.parse({
          ...exact,
          [key]: value,
        }),
      ).toThrow(/must be derived/i);

    const substitutedMotionDraft = {
      ...exact.motionProgram!,
      programId: "attacker-self-rehashed-motion",
    } as Record<string, unknown>;
    delete substitutedMotionDraft.contentHash;
    const substitutedMotion = {
      ...substitutedMotionDraft,
      contentHash: hashCanonical(substitutedMotionDraft),
    };
    expect(() =>
      candidateRigReviewPerformanceInputSchema.parse({
        ...exact,
        motionProgram: substitutedMotion,
        candidateRigReviewMotionProgramContentHash:
          substitutedMotion.contentHash,
      }),
    ).toThrow(/exact compiled motion program/i);
  });

  it("evaluates only actor-local allowlisted output through the private renderer", () => {
    const program = createReviewProgram();
    const frame = evaluateCandidateRigReviewPerformance(program, "motion", 74);
    expect(Object.keys(frame.parts).sort()).toEqual(
      [...program.partIds].sort(),
    );
    expect(Object.keys(frame.sockets)).toEqual(program.socketIds);
    expect(frame).not.toHaveProperty("rootTransform");
    expect(frame).not.toHaveProperty("camera");
    expect(program.productionBindable).toBe(false);

    expect(() =>
      evaluateActorLocalPerformanceKernel(
        {
          evaluate: () => ({
            ...frame,
            parts: { root: frame.parts["part-head"] },
          }),
        },
        {},
        {
          partIds: ["root"],
          socketIds: [],
          exposureIds: [],
        },
      ),
    ).toThrow(/continuity\/root authority/i);
  });

  it("binds native front/left/right facing and never mirrors", () => {
    expect(
      compileCandidateRigReviewPerformanceInput(
        createReviewProgram("front"),
        "motion",
        1,
      ).facing,
    ).toBe("front");
    expect(
      compileCandidateRigReviewPerformanceInput(
        createReviewProgram("profile-left"),
        "motion",
        1,
      ).facing,
    ).toBe("left");
    expect(
      compileCandidateRigReviewPerformanceInput(
        createReviewProgram("profile-right"),
        "motion",
        1,
      ).facing,
    ).toBe("right");
  });

  it("compiles exact self-hashed motion and explicit-mode render inputs", () => {
    const program = createReviewProgram();
    const motion = compileCandidateRigReviewMotionProgram(program);
    const clean = compileCandidateRigReviewRenderInput("clean", program);
    const overlay = compileCandidateRigReviewRenderInput("overlay", program);
    const motionInput = compileCandidateRigReviewRenderInput(
      "motion",
      program,
      motion,
    );
    expect(motion.exerciseProfile.contentHash).toMatch(/^[a-f0-9]{64}$/);
    expect(
      new Set([clean.contentHash, overlay.contentHash, motionInput.contentHash])
        .size,
    ).toBe(3);
    expect(motionInput.candidateRigReviewMotionProgramContentHash).toBe(
      motion.contentHash,
    );

    const substitutedDraft = {
      ...motion,
      exerciseProfile: {
        ...motion.exerciseProfile,
        contentHash: hash("other-exercise"),
      },
    } as Record<string, unknown>;
    delete substitutedDraft.contentHash;
    expect(() =>
      candidateRigReviewMotionProgramSchema.parse({
        ...substitutedDraft,
        contentHash: hashCanonical(substitutedDraft),
      }),
    ).toThrow(/canonical 180-frame exercise/i);
    const copiedRendererMotionDraft = {
      ...motion,
      rendererImplementationContentHash: hash("copied-liar-renderer"),
    } as Record<string, unknown>;
    delete copiedRendererMotionDraft.contentHash;
    expect(() =>
      candidateRigReviewMotionProgramSchema.parse({
        ...copiedRendererMotionDraft,
        contentHash: hashCanonical(copiedRendererMotionDraft),
      }),
    ).toThrow(/module-owned renderer/i);
    expect(() =>
      candidateRigReviewRenderInputSchema.parse({
        ...clean,
        mode: "motion",
      }),
    ).toThrow();
    const copiedRendererInputDraft = {
      ...clean,
      rendererImplementationContentHash: hash("copied-liar-renderer"),
    } as Record<string, unknown>;
    delete copiedRendererInputDraft.contentHash;
    expect(() =>
      candidateRigReviewRenderInputSchema.parse({
        ...copiedRendererInputDraft,
        contentHash: hashCanonical(copiedRendererInputDraft),
      }),
    ).toThrow(/exact module-owned renderer implementation/i);
  });

  it("keeps packet construction explicitly blocked until bytes are verified", async () => {
    expect(candidateRigReviewPacketConstructionStatus).toEqual({
      status: "blocked",
      reason:
        "No source-review packet may exist until asset-pipeline verifies actual clean/overlay/motion artifact bytes and media metadata.",
      packetConstructorExported: false,
      providerAuthority: false,
      approvalAuthority: false,
      productionBindable: false,
    });
    const source = await readFile(
      resolve(
        dirname(fileURLToPath(import.meta.url)),
        "candidate-rig-review.ts",
      ),
      "utf8",
    );
    expect(source).not.toMatch(
      /export const createCharacterRigSourceReviewPacket/,
    );
    expect(source).not.toMatch(
      /export const characterRigSourceReviewPacketSchema/,
    );
    expect(source).not.toMatch(/Mara/);
  });
});
