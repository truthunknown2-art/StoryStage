import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it, vi } from "vitest";
import { hashCanonical } from "./canonical-hash";
import {
  candidateRigReviewPerformanceInputSchema,
  candidateRigReviewVisualProgramSchema,
  characterRigSourceReviewPacketSchema,
  evaluateCandidateRigReviewPerformance,
  type CandidateRigReviewPerformanceInput,
  type CandidateRigReviewVisualRenderer,
} from "./candidate-rig-review";
import {
  evaluateActorLocalPerformanceKernel,
  rigVisualProgramSchema,
} from "./director/visual-performance-contract";

const hash = (value: string) => hashCanonical(value);

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
    view,
    sourceBindings: [
      { candidateId: "front-face-atlas", contentHash: hash("face") },
      { candidateId: "front-parts-atlas", contentHash: hash("parts") },
    ],
    semanticRoles: [
      {
        componentId: "part-torso",
        semanticRole: "torso",
        kind: "part" as const,
      },
      { componentId: "part-head", semanticRole: "head", kind: "part" as const },
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
    partIds: ["part-torso", "part-head"],
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

const createReviewInput = (): CandidateRigReviewPerformanceInput => {
  const program = createReviewProgram();
  return candidateRigReviewPerformanceInputSchema.parse({
    schemaVersion: "1.0",
    authority: "candidate-source-review",
    candidateRigReviewVisualProgramContentHash: program.contentHash,
    preparationRecipeContentHash: program.preparationRecipeContentHash,
    view: program.view,
    localFrame: 12,
    fps: 30,
    motionMode: "idle",
    actionPhase: "hold",
    phaseProgress: 0.5,
    gaitPhase: null,
    facing: "front",
    gazeVectorLocal: { x: 0, y: 0 },
    visemeId: "viseme-ai",
    microMotionSeed: hash("review-motion"),
    program,
  });
};

const createProfileReviewInput = (
  view: "profile-left" | "profile-right",
): CandidateRigReviewPerformanceInput => {
  const program = createReviewProgram(view);
  return candidateRigReviewPerformanceInputSchema.parse({
    ...createReviewInput(),
    candidateRigReviewVisualProgramContentHash: program.contentHash,
    preparationRecipeContentHash: program.preparationRecipeContentHash,
    view,
    facing: view === "profile-left" ? "left" : "right",
    program,
  });
};

const createOutput = () => ({
  parts: {
    "part-torso": {
      x: 0,
      y: 0,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      opacity: 1,
      exposureId: null,
    },
    "part-head": {
      x: 0,
      y: -10,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      opacity: 1,
      exposureId: null,
    },
  },
  face: {
    eyeOpen: 1,
    pupilX: 0,
    pupilY: 0,
    brow: 0,
    mouthExposureId: "exposure-viseme-ai",
  },
  sockets: { neck: { x: 0, y: -10, rotation: 0, scale: 1 } },
  localEffects: [],
});

const rendererReturning = (
  output: unknown,
): CandidateRigReviewVisualRenderer => ({
  rendererId: "candidate-review-test",
  rendererVersion: "1.0.0",
  evaluate: vi.fn(() => output),
});

describe("candidate rig source-review visual contract", () => {
  it("is mutually unparsable with production RigVisualProgram", () => {
    const review = createReviewProgram();
    expect(() => rigVisualProgramSchema.parse(review)).toThrow();
    const productionDraft = {
      schemaVersion: "1.0" as const,
      id: "production-rig-program",
      sourcePerformanceProgramContentHash: hash("performance"),
      rigManifestContentHash: hash("manifest"),
      partIds: ["part-torso", "part-head"],
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

  it("shares exact actor-local output validation without production authority", () => {
    expect(
      evaluateCandidateRigReviewPerformance(
        rendererReturning(createOutput()),
        createReviewInput(),
      ),
    ).toEqual(createOutput());
    expect(createReviewInput()).not.toHaveProperty("episodePlanContentHash");
    expect(createReviewInput()).not.toHaveProperty(
      "capabilityReportContentHash",
    );
    expect(createReviewInput().program.productionBindable).toBe(false);
  });

  it("rejects reserved actor-root ids and noncanonical source bindings", () => {
    const program = createReviewProgram();
    const rootDraft = {
      ...program,
      semanticRoles: program.semanticRoles.map((binding) =>
        binding.componentId === "part-torso"
          ? { ...binding, componentId: "root" }
          : binding,
      ),
      partIds: ["root", "part-head"],
    };
    delete (rootDraft as Partial<typeof rootDraft>).contentHash;
    expect(() =>
      candidateRigReviewVisualProgramSchema.parse({
        ...rootDraft,
        contentHash: hashCanonical(rootDraft),
      }),
    ).toThrow(/reserved for continuity\/root authority/i);

    const reversedDraft = {
      ...program,
      sourceBindings: [...program.sourceBindings].reverse(),
    };
    delete (reversedDraft as Partial<typeof reversedDraft>).contentHash;
    expect(() =>
      candidateRigReviewVisualProgramSchema.parse({
        ...reversedDraft,
        contentHash: hashCanonical(reversedDraft),
      }),
    ).toThrow(/canonical candidate-id order/i);

    expect(() =>
      evaluateActorLocalPerformanceKernel(
        {
          evaluate: () => ({
            ...createOutput(),
            parts: {
              root: createOutput().parts["part-torso"],
              "part-head": createOutput().parts["part-head"],
            },
          }),
        },
        {},
        {
          partIds: ["root", "part-head"],
          socketIds: ["neck"],
          exposureIds: ["exposure-viseme-ai"],
        },
      ),
    ).toThrow(/cannot admit continuity\/root authority parts: root/i);
  });

  it("rejects stale view/program bindings and whole-actor output authority", () => {
    expect(() =>
      evaluateCandidateRigReviewPerformance(rendererReturning(createOutput()), {
        ...createReviewInput(),
        view: "profile-left",
        facing: "left",
      }),
    ).toThrow(/recipe view lineage/i);
    expect(() =>
      evaluateCandidateRigReviewPerformance(rendererReturning(createOutput()), {
        ...createReviewInput(),
        candidateRigReviewVisualProgramContentHash: hash("stale"),
      }),
    ).toThrow(/stale or forged/i);
    expect(() =>
      evaluateCandidateRigReviewPerformance(
        rendererReturning({ ...createOutput(), rootTransform: {} }),
        createReviewInput(),
      ),
    ).toThrow();
  });

  it("binds profile review views to their exact facing without mirroring", () => {
    expect(
      evaluateCandidateRigReviewPerformance(
        rendererReturning(createOutput()),
        createProfileReviewInput("profile-left"),
      ),
    ).toEqual(createOutput());
    expect(() =>
      evaluateCandidateRigReviewPerformance(rendererReturning(createOutput()), {
        ...createProfileReviewInput("profile-left"),
        facing: "right",
      }),
    ).toThrow(/must face left; automatic mirroring is forbidden/i);
    expect(() =>
      evaluateCandidateRigReviewPerformance(rendererReturning(createOutput()), {
        ...createProfileReviewInput("profile-right"),
        facing: "left",
      }),
    ).toThrow(/must face right; automatic mirroring is forbidden/i);
  });

  it("self-hashes the machine-owned three-view packet and requires every render", () => {
    const programs = [
      createReviewProgram("front"),
      createReviewProgram("profile-left"),
      createReviewProgram("profile-right"),
    ];
    const still = (
      program: (typeof programs)[number],
      kind: "clean" | "overlay",
    ) => ({
      candidateRigReviewVisualProgramContentHash: program.contentHash,
      preparationRecipeContentHash: program.preparationRecipeContentHash,
      contentHash: hash(`${program.view}-${kind}`),
      byteLength: 1024,
      width: 1920,
      height: 1080,
      relativeFile: `reports/source-review/${program.view}-${kind}.png`,
      mediaType: "image/png" as const,
      frameCount: 1 as const,
      fps: null,
      rendererId: "candidate-review-renderer",
      rendererVersion: "1.0.0",
      renderInputContentHash: hash(`${program.view}-${kind}-input`),
    });
    const draft = {
      schemaVersion: "1.0" as const,
      packetKind: "character-rig-source-review" as const,
      authorityDomain: "source-review-only" as const,
      packetId: "candidate-i-source-review-contract-fixture",
      requestContentHash: programs[0]!.requestContentHash,
      candidateBundleContentHash: programs[0]!.candidateBundleContentHash,
      stagingReportContentHash: programs[0]!.stagingReportContentHash,
      importReceiptContentHash: programs[0]!.importReceiptContentHash,
      identityLockContentHash: programs[0]!.identityLockContentHash,
      topologyTemplateContentHash: programs[0]!.topologyTemplateContentHash,
      views: programs.map((program) => ({
        view: program.view,
        program,
        cleanRender: still(program, "clean"),
        overlayRender: still(program, "overlay"),
        motionRender: {
          candidateRigReviewVisualProgramContentHash: program.contentHash,
          preparationRecipeContentHash: program.preparationRecipeContentHash,
          contentHash: hash(`${program.view}-motion`),
          byteLength: 4096,
          width: 1920,
          height: 1080,
          relativeFile: `reports/source-review/${program.view}-motion.mp4`,
          mediaType: "video/mp4" as const,
          rendererId: "candidate-review-renderer",
          rendererVersion: "1.0.0",
          renderInputContentHash: hash(`${program.view}-motion-input`),
          motionProgramContentHash: hash(`${program.view}-motion-program`),
          frameCount: 90,
          fps: 30,
        },
      })),
      reviewStatus: "awaiting-human-review" as const,
      machineOwned: true as const,
      humanReviewRecordContentHash: null,
      providerAuthority: false as const,
      approvalAuthority: false as const,
      approvalRequired: true as const,
      productionBindable: false as const,
      createdAt: "2026-07-19T15:00:00.000Z",
    };
    const packet = characterRigSourceReviewPacketSchema.parse({
      ...draft,
      contentHash: hashCanonical(draft),
    });
    expect(packet.reviewStatus).toBe("awaiting-human-review");
    expect(packet.humanReviewRecordContentHash).toBeNull();
    expect(() =>
      characterRigSourceReviewPacketSchema.parse({
        ...packet,
        contentHash: hash("tampered-packet"),
      }),
    ).toThrow(/packet hash/i);
    const reordered = structuredClone(draft);
    reordered.views.reverse();
    expect(() =>
      characterRigSourceReviewPacketSchema.parse({
        ...reordered,
        contentHash: hashCanonical(reordered),
      }),
    ).toThrow(/canonical front\/left\/right view order/i);
    const repeatedPath = structuredClone(draft);
    repeatedPath.views[0]!.overlayRender.relativeFile =
      repeatedPath.views[0]!.cleanRender.relativeFile;
    expect(() =>
      characterRigSourceReviewPacketSchema.parse({
        ...repeatedPath,
        contentHash: hashCanonical(repeatedPath),
      }),
    ).toThrow(/render paths must be globally unique/i);
    const repeatedContent = structuredClone(draft);
    repeatedContent.views[0]!.overlayRender.contentHash =
      repeatedContent.views[0]!.cleanRender.contentHash;
    expect(() =>
      characterRigSourceReviewPacketSchema.parse({
        ...repeatedContent,
        contentHash: hashCanonical(repeatedContent),
      }),
    ).toThrow(/render artifacts must have globally unique content hashes/i);
    const incomplete = structuredClone(draft);
    delete (incomplete.views[0] as Partial<(typeof incomplete.views)[number]>)
      .overlayRender;
    expect(() =>
      characterRigSourceReviewPacketSchema.parse({
        ...incomplete,
        contentHash: hashCanonical(incomplete),
      }),
    ).toThrow();
  });

  it("keeps the review contract free of Mara and capability dependencies", async () => {
    const source = await readFile(
      resolve(
        dirname(fileURLToPath(import.meta.url)),
        "candidate-rig-review.ts",
      ),
      "utf8",
    );
    const imports = source
      .split(/\r?\n/)
      .filter((line) => line.startsWith("import "))
      .join("\n");
    expect(imports).not.toMatch(/mara/i);
    expect(imports).not.toMatch(/capability/i);
  });
});
