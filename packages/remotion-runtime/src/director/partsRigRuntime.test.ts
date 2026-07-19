import {
  compileDirectorProject,
  createCv002Project,
  evaluateContinuityFrame,
  hashCanonical,
  listArticulatedRigAssetReferences,
} from "@storystage/story-engine/director-alpha";
import {
  candidateRigReviewVisualProgramSchema,
  genericCandidateRigReviewRendererContract,
} from "@storystage/story-engine";
import { describe, expect, it } from "vitest";
import { createBundledKidsCapabilityRegistry } from "./bundledKidsCapabilities";
import {
  createHeadFaceOverlayGeometry,
  createPartsRigRenderTree,
  partsRigRuntime,
} from "./partsRigRuntime";

const sentence =
  "A curious traveler follows a bright clue and pauses when the hidden answer changes everything.";
const script = Array.from(
  { length: 9 },
  (_, index) => `${sentence.slice(0, -1)} ${index + 1}.`,
).join(" ");

const localPartsFixture = () => {
  const storyProject = createCv002Project(
    "Local parts runtime",
    script,
    "kids-adventure",
  );
  const proxy = compileDirectorProject({ storyProject });
  const requirement = proxy.directorPlan.beats
    .flatMap((beat) => beat.performanceRequirements)
    .find((candidate) => candidate.source === "articulated-rig");
  if (!requirement) throw new Error("Fixture has no articulated requirement.");
  const capabilities = createBundledKidsCapabilityRegistry([
    {
      kind: "articulated-rig",
      requirementId: requirement.id,
      entityId: requirement.entityId,
    },
  ]);
  const compiled = compileDirectorProject({ storyProject, capabilities });
  const episodePlan = compiled.executableEpisodePlan;
  const performance = episodePlan.performancePrograms.find(
    (program) =>
      program.execution?.kind === "articulated-rig" &&
      "mode" in program.execution &&
      program.execution.mode === "local-parts-v1",
  );
  if (
    !performance?.execution ||
    performance.execution.kind !== "articulated-rig" ||
    !("mode" in performance.execution) ||
    performance.execution.mode !== "local-parts-v1"
  )
    throw new Error("Fixture did not compile the local-parts capability.");
  const shot = episodePlan.shots.find((candidate) =>
    performance.sourceShotIds?.includes(candidate.directorShotId),
  );
  if (!shot) throw new Error("Fixture local-parts program has no source shot.");
  const canonical = evaluateContinuityFrame(episodePlan, shot.startFrame);
  const resolved = canonical.entities[performance.entityId];
  if (!resolved) throw new Error("Fixture has no resolved local-parts actor.");
  const references = listArticulatedRigAssetReferences(
    performance.execution.rigManifest,
  );
  const verifiedAssets = references.map((reference) => {
    const asset = episodePlan.approvedAssets.find(
      (candidate) => candidate.assetId === reference.candidateId,
    );
    if (!asset?.relativeFile || !asset.byteLength || !asset.immutableLocationId)
      throw new Error(
        `Fixture has no approved local-parts asset ${reference.candidateId}.`,
      );
    return {
      binding: {
        ...asset,
        relativeFile: asset.relativeFile,
        byteLength: asset.byteLength,
        immutableLocationId: asset.immutableLocationId,
      },
      verifiedUrl: `blob:verified-${asset.assetId}`,
    };
  });
  const input = partsRigRuntime.createInput({
    episodePlan,
    execution: performance.execution,
    localFrame: canonical.shotFrame,
    performance,
    resolved,
    shotId: canonical.shotId,
    verifiedAssets,
  });
  return {
    episodePlan,
    execution: performance.execution,
    input,
    performance,
    resolved,
    shot,
    verifiedAssets,
  };
};

describe("partsRigRuntime", () => {
  it("rejects a source-review candidate program at every production rig boundary", () => {
    const fixture = localPartsFixture();
    const draft = {
      schemaVersion: "1.0" as const,
      programKind: "candidate-rig-review" as const,
      authorityDomain: "source-review-only" as const,
      id: "candidate-review-front-runtime-negative",
      requestContentHash: hashCanonical("candidate-request"),
      candidateBundleContentHash: hashCanonical("candidate-bundle"),
      stagingReportContentHash: hashCanonical("candidate-report"),
      importReceiptContentHash: hashCanonical("candidate-receipt"),
      preparationRecipeContentHash: hashCanonical("candidate-recipe"),
      identityLockContentHash: hashCanonical("candidate-identity"),
      topologyTemplateContentHash: hashCanonical("candidate-template"),
      rendererContract: genericCandidateRigReviewRendererContract,
      view: "front" as const,
      sourceBindings: [
        {
          candidateId: "candidate-front-atlas",
          contentHash: hashCanonical("candidate-atlas"),
        },
      ],
      semanticRoles: [
        {
          componentId: "part-torso",
          semanticRole: "torso",
          kind: "part" as const,
        },
        {
          componentId: "part-head",
          semanticRole: "head",
          kind: "part" as const,
        },
      ],
      partIds: ["part-torso", "part-head"],
      socketIds: [],
      exposureIds: [],
      visemeIds: [],
      productionBindable: false as const,
    };
    const candidate = candidateRigReviewVisualProgramSchema.parse({
      ...draft,
      contentHash: hashCanonical(draft),
    });
    expect(() => createPartsRigRenderTree(candidate)).toThrow();
    expect(() =>
      partsRigRuntime.createInput({
        episodePlan: fixture.episodePlan,
        execution: {
          ...fixture.execution,
          rigManifest: candidate,
        } as unknown as typeof fixture.execution,
        localFrame: fixture.input.localFrame,
        performance: fixture.performance,
        resolved: fixture.resolved,
        shotId: fixture.input.shotId,
        verifiedAssets: fixture.verifiedAssets,
      }),
    ).toThrow();
  });

  it("binds continuity, performance, rig program, manifest, and asset identities", () => {
    const { input, performance } = localPartsFixture();

    expect(input.performanceProgramContentHash).toBe(performance.contentHash);
    expect(input.performanceProgramContentHash).toBe(
      input.program.sourcePerformanceProgramContentHash,
    );
    expect(input.rigVisualProgramContentHash).toBe(input.program.contentHash);
    expect(input.rigManifestContentHash).toBe(
      input.program.rigManifestContentHash,
    );
    expect(input.assets).toHaveLength(17);
    expect(input.assets).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          assetId: "mara-payoff-puppet-v1",
          verifiedUrl: "blob:verified-mara-payoff-puppet-v1",
        }),
        expect.objectContaining({
          assetId: "mara-local-head-v1",
          verifiedUrl: "blob:verified-mara-local-head-v1",
        }),
        expect.objectContaining({ assetId: "mara-local-mouth-open-v1" }),
        expect.objectContaining({ assetId: "mara-local-eyes-open-v1" }),
        expect.objectContaining({ assetId: "mara-local-pupils-v1" }),
      ]),
    );
    expect(input.microMotionSeed).toBe(
      hashCanonical({
        episodePlanContentHash: input.episodePlanContentHash,
        continuitySequencePlanContentHash:
          input.continuitySequencePlanContentHash,
        performanceProgramContentHash: input.performanceProgramContentHash,
        entityId: input.entityId,
        shotId: input.shotId,
      }),
    );
    expect(input.microMotionSeed).not.toBe(
      hashCanonical({
        episodePlanContentHash: input.episodePlanContentHash,
        continuitySequencePlanContentHash:
          input.continuitySequencePlanContentHash,
        performanceProgramContentHash: input.performanceProgramContentHash,
        entityId: input.entityId,
        shotId: `${input.shotId}-other`,
      }),
    );
  });

  it("evaluates every manifest part and socket deterministically without root authority", () => {
    const { execution, input } = localPartsFixture();
    const first = partsRigRuntime.evaluate(input);
    const repeated = partsRigRuntime.evaluate(structuredClone(input));

    expect(repeated).toEqual(first);
    expect(Object.keys(first.parts).sort()).toEqual(
      [...input.program.partIds].sort(),
    );
    expect(Object.keys(first.sockets).sort()).toEqual(
      [...input.program.socketIds].sort(),
    );
    expect(first).not.toHaveProperty("rootTransform");
    expect(Object.values(first.parts).every((part) => part.opacity === 1)).toBe(
      true,
    );
    const tree = createPartsRigRenderTree(execution.rigManifest);
    expect(tree.map((node) => node.partId)).toEqual(["torso"]);
    const torso = tree[0]!;
    const upperArm = torso.children.find(
      (node) => node.partId === "upper-arm-right",
    )!;
    expect(upperArm.children.map((node) => node.partId)).toContain(
      "lower-arm-right",
    );
    expect(JSON.stringify(tree)).not.toMatch(/rootTransform|actor-root/);
  });

  it("uses forward gait phase and exact visemes while stale bindings fail closed", () => {
    const { input } = localPartsFixture();
    const early = partsRigRuntime.evaluate({
      ...input,
      gaitPhase: 0.125,
      visemeId: "rest",
    });
    const later = partsRigRuntime.evaluate({
      ...input,
      gaitPhase: 0.625,
      visemeId: "open",
    });

    expect(early.parts["leg-left"]!.rotation).not.toBe(
      later.parts["leg-left"]!.rotation,
    );
    expect(early.face.mouthExposureId).toBe("mouth-rest");
    expect(later.face.mouthExposureId).toBe("mouth-open");
    expect(() =>
      partsRigRuntime.evaluate({
        ...input,
        rigVisualProgramContentHash: input.rigManifestContentHash,
      }),
    ).toThrow(/rig visual program hash/);
  });

  it("keeps mouth, blink, and gaze geometry in head-local coordinates", () => {
    const { input } = localPartsFixture();
    const frame = partsRigRuntime.evaluate({
      ...input,
      gazeVectorLocal: { x: 0.75, y: -0.5 },
      visemeId: "open",
    });
    const geometry = createHeadFaceOverlayGeometry(frame);

    expect(geometry.eyes).toEqual([
      { id: "left", left: -38, top: -238 },
      { id: "right", left: 72, top: -238 },
    ]);
    expect(geometry.mouth).toEqual({
      source: { x: 620, y: 835, width: 105, height: 65 },
      target: { left: 18, top: -116 },
    });
    expect(frame.face.pupilX).toBe(0.75);
    expect(frame.face.pupilY).toBe(-0.5);
  });

  it("rejects a different execution object and a frame outside the canonical shot", () => {
    const fixture = localPartsFixture();
    const forgedExecution = structuredClone(fixture.execution);
    forgedExecution.displayScale += 0.01;

    expect(() =>
      partsRigRuntime.createInput({
        episodePlan: fixture.episodePlan,
        execution: forgedExecution,
        localFrame: fixture.input.localFrame,
        performance: fixture.performance,
        resolved: fixture.resolved,
        shotId: fixture.input.shotId,
        verifiedAssets: fixture.verifiedAssets,
      }),
    ).toThrow(/exact sealed rig execution/i);

    expect(() =>
      partsRigRuntime.createInput({
        episodePlan: fixture.episodePlan,
        execution: fixture.execution,
        localFrame: fixture.shot.endFrameExclusive - fixture.shot.startFrame,
        performance: fixture.performance,
        resolved: fixture.resolved,
        shotId: fixture.input.shotId,
        verifiedAssets: fixture.verifiedAssets,
      }),
    ).toThrow(/not authorized for canonical shot/i);
  });

  it("rejects missing, stale, and duplicate individual part handles", () => {
    const fixture = localPartsFixture();
    const create = (verifiedAssets: typeof fixture.verifiedAssets) =>
      partsRigRuntime.createInput({
        episodePlan: fixture.episodePlan,
        execution: fixture.execution,
        localFrame: fixture.input.localFrame,
        performance: fixture.performance,
        resolved: fixture.resolved,
        shotId: fixture.input.shotId,
        verifiedAssets,
      });

    expect(() => create(fixture.verifiedAssets.slice(1))).toThrow(
      /one exact verified handle/i,
    );
    expect(() =>
      create(
        fixture.verifiedAssets.map((asset, index) =>
          index === 1
            ? {
                ...asset,
                binding: { ...asset.binding, contentHash: "f".repeat(64) },
              }
            : asset,
        ),
      ),
    ).toThrow(/exact approved manifest binding/i);
    expect(() =>
      create([...fixture.verifiedAssets, fixture.verifiedAssets[0]!]),
    ).toThrow(/one exact verified handle/i);
  });

  it("evaluates a 140-frame local motion sample when canonical values are supplied", () => {
    const { input } = localPartsFixture();
    const sample = Array.from({ length: 140 }, (_, localFrame) => {
      const running = localFrame < 72;
      const decelerating = localFrame >= 72 && localFrame < 102;
      const planted = localFrame >= 102 && localFrame < 110;
      return partsRigRuntime.evaluate({
        ...input,
        localFrame,
        motionMode: running
          ? "running"
          : decelerating
            ? "decelerating"
            : "idle",
        actionPhase:
          running || decelerating ? "action" : planted ? "impact" : "settle",
        phaseProgress: running
          ? localFrame / 71
          : decelerating
            ? (localFrame - 72) / 29
            : planted
              ? 1
              : (localFrame - 110) / 29,
        gaitPhase:
          running || decelerating ? (((localFrame / 12) % 1) + 1) % 1 : null,
        visemeId: localFrame % 12 < 6 ? "open" : "rest",
      });
    });

    expect(
      new Set(
        sample
          .slice(0, 102)
          .map((frame) => frame.parts["leg-left"]!.rotation.toFixed(3)),
      ).size,
    ).toBeGreaterThan(5);
    expect(sample[101]!.parts["leg-left"]!.rotation).not.toBe(0);
    expect(sample[102]!.parts["leg-left"]!.rotation).toBe(0);
    expect(
      Math.abs(sample[110]!.parts["upper-arm-right"]!.rotation),
    ).toBeGreaterThan(
      Math.abs(sample[139]!.parts["upper-arm-right"]!.rotation),
    );
    expect(sample[0]!.face.mouthExposureId).toBe("mouth-open");
    expect(sample[6]!.face.mouthExposureId).toBe("mouth-rest");
  });
});
