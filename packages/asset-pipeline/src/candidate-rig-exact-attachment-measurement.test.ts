import { createHash } from "node:crypto";
import { copyFile, mkdir, mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { hashCanonical } from "@storystage/story-engine";
import {
  candidateRigAuthoredIsolatedMaskEvidenceSchema,
  candidateRigExactAttachmentMeasurementReportSchema,
  type CandidateRigAuthoredIsolatedMaskEvidence,
} from "@storystage/story-engine/private-candidate-rig-registration";
import {
  CandidateRigAuthoredIsolatedMaskMeasurementError,
  createCandidateRigAuthoredIsolatedMaskMeasurement,
} from "./candidate-rig-authored-isolated-mask-measurement";
import { createCandidateRigReviewInput } from "./candidate-rig-review-input";
import { createCandidateRigExactAttachmentMeasurement } from "./candidate-rig-exact-attachment-measurement";
import { createCandidateRigGapOrbitMeasurementReport } from "./candidate-rig-gap-orbit-measurement";
import { createCandidateRigPrivateRegistrationComponentImages } from "./candidate-rig-private-registration-images";
import { createCandidateRigUnapprovedRegistrationProposal } from "./candidate-rig-unapproved-registration-proposal";
import type {
  OlloCandidateIReviewRecipeInput,
  OlloCandidateISourceReviewPlan,
} from "./ollo-candidate-i-review-recipes";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

const exactSources: Record<string, string> = {
  "ollo-parts-front-source-set-f-alpha":
    "ollo-parts-front-source-set-f-alpha.png",
  "ollo-face-front-source-set-f-alpha":
    "ollo-face-front-source-set-f-alpha.png",
  "ollo-parts-profile-left-source-set-i-alpha":
    "ollo-parts-profile-left-source-set-i-alpha.png",
  "ollo-face-profile-left-source-set-i-alpha":
    "ollo-face-profile-left-source-set-i-alpha.png",
  "ollo-parts-profile-right-source-set-i-alpha":
    "ollo-parts-profile-right-source-set-i-alpha.png",
  "ollo-face-profile-right-source-set-i-alpha":
    "ollo-face-profile-right-source-set-i-alpha.png",
};

const sha256 = (bytes: Uint8Array) =>
  createHash("sha256").update(bytes).digest("hex");

const exactCrop = (
  atlas: { width: number; rgbaPixels: Buffer },
  rect: { x: number; y: number; width: number; height: number },
) => {
  const rgba = Buffer.alloc(rect.width * rect.height * 4);
  for (let y = 0; y < rect.height; y += 1) {
    const sourceStart = ((rect.y + y) * atlas.width + rect.x) * 4;
    const targetStart = y * rect.width * 4;
    atlas.rgbaPixels.copy(
      rgba,
      targetStart,
      sourceStart,
      sourceStart + rect.width * 4,
    );
  }
  return rgba;
};

const maskFor = (pixels: Set<number>, width: number, height: number) => {
  const runs: Array<{ y: number; x: number; length: number }> = [];
  let left = width;
  let top = height;
  let right = -1;
  let bottom = -1;
  for (let y = 0; y < height; y += 1) {
    let x = 0;
    while (x < width) {
      if (!pixels.has(y * width + x)) {
        x += 1;
        continue;
      }
      const start = x;
      while (x < width && pixels.has(y * width + x)) x += 1;
      runs.push({ y, x: start, length: x - start });
      left = Math.min(left, start);
      top = Math.min(top, y);
      right = Math.max(right, x - 1);
      bottom = Math.max(bottom, y);
    }
  }
  return {
    width,
    height,
    runs,
    runLengthEncodingContentHash: hashCanonical(runs),
    pixelCount: pixels.size,
    bounds:
      pixels.size === 0
        ? null
        : {
            x: left,
            y: top,
            width: right - left + 1,
            height: bottom - top + 1,
          },
  };
};

const rehashEvidence = (evidence: CandidateRigAuthoredIsolatedMaskEvidence) => {
  const { contentHash: ignored, ...draft } = evidence;
  void ignored;
  return candidateRigAuthoredIsolatedMaskEvidenceSchema.parse({
    ...draft,
    contentHash: hashCanonical(draft),
  });
};

describe("exact Candidate-I attachment measurement", () => {
  let root = "";
  let stagingRoot = "";
  let input: {
    evidence: OlloCandidateIReviewRecipeInput;
    sourceReviewPlan: OlloCandidateISourceReviewPlan;
  };

  beforeAll(async () => {
    root = await mkdtemp(join(tmpdir(), "storystage-exact-attachment-"));
    stagingRoot = join(root, "staging");
    input = JSON.parse(
      await readFile(
        join(
          repoRoot,
          "reports/evidence/KCAST-001/ollo-candidate-i-source-review-render-input.json",
        ),
        "utf8",
      ),
    ) as typeof input;
    const imported = input.evidence.importReceipt as {
      files: Array<{ candidateId: string; stagedRelativeFile: string }>;
    };
    for (const file of imported.files) {
      const exactSource = exactSources[file.candidateId];
      if (!exactSource) continue;
      const target = join(stagingRoot, file.stagedRelativeFile);
      await mkdir(dirname(target), { recursive: true });
      await copyFile(
        join(repoRoot, "reports/evidence/KCAST-001/derived", exactSource),
        target,
      );
    }
  }, 30_000);

  afterAll(async () => {
    if (root) await rm(root, { recursive: true, force: true });
  });

  const authoredMaskFixture = async () => {
    const view = input.sourceReviewPlan.views.find(
      (candidate) => candidate.view === "front",
    )!;
    const runtime = await createCandidateRigReviewInput({
      request: input.evidence.request,
      bundle: input.evidence.bundle,
      stagingReport: input.evidence.stagingReport,
      importReceipt: input.evidence.importReceipt,
      recipe: view.recipe,
      reviewProgram: view.program,
      registrationPlan: view.registrationPlan,
      trustedStagingRoot: root,
      stagingRoot,
    });
    const baseMeasurement = await createCandidateRigExactAttachmentMeasurement({
      review: runtime,
      recipe: view.recipe,
    });
    const component = baseMeasurement.components.find(
      (candidate) => candidate.semanticRole === "secondary-front",
    )!;
    const atlas = runtime.atlases.find(
      (candidate) => candidate.candidateId === component.sourceCandidateId,
    )!;
    const original = exactCrop(atlas, component.sourceRect);
    const support = new Set<number>();
    for (let pixel = 0; pixel < original.length / 4; pixel += 1)
      if (original[pixel * 4 + 3]! > 0) support.add(pixel);
    const guide = new Set([...support].slice(0, 2));
    const retained = new Set([...support].filter((pixel) => !guide.has(pixel)));
    const masked = Buffer.from(original);
    for (const pixel of guide) masked.fill(0, pixel * 4, pixel * 4 + 4);
    const draft = {
      schemaVersion: "1.0" as const,
      evidenceKind: "candidate-rig-authored-isolated-mask-evidence" as const,
      authorityDomain: "private-source-review-registration" as const,
      evidenceId: "front-secondary-front-authored-mask-v1",
      baseMeasurementContentHash: baseMeasurement.contentHash,
      view: "front" as const,
      componentId: component.componentId,
      componentRole: "secondary-front" as const,
      sourceCandidateId: component.sourceCandidateId,
      sourceContentHash: component.sourceContentHash,
      sourceRgbaContentHash: component.sourceRgbaContentHash,
      sourceRect: component.sourceRect,
      maskedRgbaContentHash: sha256(masked),
      guideTabMask: maskFor(
        guide,
        component.sourceRect.width,
        component.sourceRect.height,
      ),
      retainedSemanticSupportMask: maskFor(
        retained,
        component.sourceRect.width,
        component.sourceRect.height,
      ),
      sourceMeasuredBeforeMasking: true as const,
      maskOnly: true as const,
      providerAuthority: false as const,
      approvalAuthority: false as const,
      capabilityAuthority: false as const,
      productionBindable: false as const,
    };
    const evidence = candidateRigAuthoredIsolatedMaskEvidenceSchema.parse({
      ...draft,
      contentHash: hashCanonical(draft),
    });
    return {
      view,
      runtime,
      baseMeasurement,
      component,
      original,
      masked,
      guide,
      retained,
      evidence,
    };
  };

  it("reopens all six exact atlases and reproduces typed fail-closed geometry outcomes", async () => {
    const expected = {
      front: {
        candidates: 32,
        blockers: 18,
        contentHash:
          "6f414199449e0497a0979648e57c62bbf2ba5bd3d5b0ddd4630e10bdaaaeb7ed",
      },
      "profile-left": {
        candidates: 29,
        blockers: 22,
        contentHash:
          "23fed70343ba54625728c31b41220c2cdb1ed4630a8dcd138a7b2d9b43bb74bf",
      },
      "profile-right": {
        candidates: 29,
        blockers: 22,
        contentHash:
          "c755e5d22674041281aac737ef75ce069455705d9af4c9bc9aa91df4c15efeab",
      },
    } as const;
    const reports = [];
    for (const view of input.sourceReviewPlan.views) {
      const runtime = await createCandidateRigReviewInput({
        request: input.evidence.request,
        bundle: input.evidence.bundle,
        stagingReport: input.evidence.stagingReport,
        importReceipt: input.evidence.importReceipt,
        recipe: view.recipe,
        reviewProgram: view.program,
        registrationPlan: view.registrationPlan,
        trustedStagingRoot: root,
        stagingRoot,
      });
      const report = await createCandidateRigExactAttachmentMeasurement({
        review: runtime,
        recipe: view.recipe,
      });
      reports.push(report);
      expect(report.atlases).toHaveLength(2);
      expect(
        report.atlases.every((atlas) => atlas.decodedWithoutResampling),
      ).toBe(true);
      expect(report.status).toBe("blocked-source-geometry");
      expect(
        report.components.reduce(
          (sum, component) => sum + component.candidates.length,
          0,
        ),
      ).toBe(expected[view.view].candidates);
      expect(report.blockerRequirementIds).toHaveLength(
        expected[view.view].blockers,
      );
      expect(report.contentHash).toBe(expected[view.view].contentHash);
      expect(
        report.components
          .flatMap((component) => component.candidates)
          .every(
            (candidate) =>
              candidate.semanticCoreOverlapPixelCount === 0 &&
              candidate.derivedBeforeMasking &&
              !candidate.guideCoordinatesUsed &&
              !candidate.transformAuthority,
          ),
      ).toBe(true);
      const proposal = createCandidateRigUnapprovedRegistrationProposal({
        measurement: report,
        registrationPlan: view.registrationPlan,
        recipe: view.recipe,
      });
      expect(proposal.view).toBe(view.view);
      expect(proposal.measurementReportContentHash).toBe(report.contentHash);
      expect(proposal.providerAuthority).toBe(false);
      expect(proposal.approvalAuthority).toBe(false);
      expect(proposal.productionBindable).toBe(false);
      const gapReport = createCandidateRigGapOrbitMeasurementReport({
        measurement: report,
        proposal,
        recipe: view.recipe,
      });
      expect(gapReport.view).toBe(view.view);
      expect(gapReport.measurementReportContentHash).toBe(report.contentHash);
      expect(gapReport.effectiveProposalContentHash).toBe(proposal.contentHash);
      expect(
        gapReport.samples.map((sample) => sample.attachmentId).sort(),
      ).toEqual(
        proposal.attachments
          .map((attachment) => attachment.attachmentId)
          .sort(),
      );
      expect(gapReport.motionArtifactIncluded).toBe(false);
      expect(gapReport.transformAuthority).toBe(false);

      const images = await createCandidateRigPrivateRegistrationComponentImages(
        {
          review: runtime,
          recipe: view.recipe,
          measurement: report,
          proposal,
        },
      );
      expect(images).toHaveLength(view.recipe.parts.length);
      expect(images.some((image) => image.maskedPixelCount > 0)).toBe(true);
      expect(
        images.every((image) => {
          const measuredComponent = report.components.find(
            (component) => component.componentId === image.componentId,
          )!;
          expect(
            image.jointEvidence.map((joint) => joint.candidateId).sort(),
          ).toEqual(
            measuredComponent.candidates
              .map((candidate) => candidate.candidateId)
              .sort(),
          );
          expect(
            image.jointEvidence.every(
              (joint) =>
                joint.record.measurementReportContentHash ===
                  report.contentHash &&
                joint.record.effectiveProposalContentHash ===
                  proposal.contentHash &&
                joint.record.originalPngContentHash !==
                  joint.record.maskedPngContentHash &&
                joint.record.selectedSupportPixelCount ===
                  joint.selectedSupport.pixelCount &&
                joint.record.selectedSupportRunLengthEncodingContentHash ===
                  joint.selectedSupport.runLengthEncodingContentHash &&
                !joint.record.maskAuthority &&
                !joint.record.transformAuthority &&
                !joint.record.productionBindable,
            ),
          ).toBe(true);
          return (
            image.sourceMeasuredBeforeMasking &&
            !image.maskAuthority &&
            !image.transformAuthority &&
            ((image.maskedPixelCount > 0 &&
              image.originalPngContentHash !== image.maskedPngContentHash &&
              image.maskAuditRegion !== null &&
              image.maskAuditOriginalDataUrl !== null &&
              image.maskAuditMaskedDataUrl !== null &&
              image.maskAuditEvidenceDataUrl !== null &&
              image.maskAuditOriginalPngContentHash !== null &&
              image.maskAuditMaskedPngContentHash !== null &&
              image.maskAuditEvidencePngContentHash !== null &&
              image.maskAuditOriginalPngContentHash !==
                image.maskAuditMaskedPngContentHash) ||
              (image.maskedPixelCount === 0 &&
                image.originalPngContentHash === image.maskedPngContentHash &&
                image.maskAuditRegion === null &&
                image.maskAuditOriginalDataUrl === null &&
                image.maskAuditMaskedDataUrl === null &&
                image.maskAuditEvidenceDataUrl === null))
          );
        }),
      ).toBe(true);
    }
    expect(reports.flatMap((report) => report.atlases)).toHaveLength(6);
    for (const report of reports) {
      const detectedPhysical = report.requirements.flatMap((requirement) =>
        requirement.outcome.status === "detected"
          ? requirement.outcome.candidateIds.map((candidateId) => {
              const candidate = report.components
                .flatMap((component) => component.candidates)
                .find((entry) => entry.candidateId === candidateId)!;
              return candidate.physicalFeatureContentHash;
            })
          : [],
      );
      expect(new Set(detectedPhysical).size).toBe(detectedPhysical.length);
    }
  }, 180_000);

  it("rejects a caller-rehashed overlap claim and physical-feature reuse", async () => {
    const view = input.sourceReviewPlan.views[0]!;
    const runtime = await createCandidateRigReviewInput({
      request: input.evidence.request,
      bundle: input.evidence.bundle,
      stagingReport: input.evidence.stagingReport,
      importReceipt: input.evidence.importReceipt,
      recipe: view.recipe,
      reviewProgram: view.program,
      registrationPlan: view.registrationPlan,
      trustedStagingRoot: root,
      stagingRoot,
    });
    const report = await createCandidateRigExactAttachmentMeasurement({
      review: runtime,
      recipe: view.recipe,
    });
    const componentIndex = report.components.findIndex(
      (component) => component.candidates.length > 0,
    );
    const candidateIndex = 0;
    const tampered = structuredClone(report);
    tampered.components[componentIndex]!.candidates[
      candidateIndex
    ]!.semanticCoreOverlapPixelCount = 1 as 0;
    const { contentHash: ignored, ...draft } = tampered;
    void ignored;
    expect(() =>
      candidateRigExactAttachmentMeasurementReportSchema.parse({
        ...draft,
        contentHash: hashCanonical(draft),
      }),
    ).toThrow();

    const substitutedPhysicalFeature = structuredClone(report);
    substitutedPhysicalFeature.components[componentIndex]!.candidates[
      candidateIndex
    ]!.physicalFeatureContentHash = "f".repeat(64);
    const {
      contentHash: ignoredPhysicalHash,
      ...substitutedPhysicalFeatureDraft
    } = substitutedPhysicalFeature;
    void ignoredPhysicalHash;
    expect(() =>
      candidateRigExactAttachmentMeasurementReportSchema.parse({
        ...substitutedPhysicalFeatureDraft,
        contentHash: hashCanonical(substitutedPhysicalFeatureDraft),
      }),
    ).toThrow(/semantic-core overlap/i);

    const detected = report.requirements.find(
      (requirement) => requirement.outcome.status === "detected",
    )!;
    const reused = structuredClone(report);
    reused.requirements.push({
      ...structuredClone(detected),
      requirementId: `${detected.requirementId}-reuse`,
    });
    const { contentHash: ignoredHash, ...reusedDraft } = reused;
    void ignoredHash;
    expect(() =>
      candidateRigExactAttachmentMeasurementReportSchema.parse({
        ...reusedDraft,
        contentHash: hashCanonical(reusedDraft),
      }),
    ).toThrow(/physical attachment feature/i);
  }, 30_000);

  it("accepts exact authored guide-tab removal while preserving authority-false mask-only provenance", async () => {
    const fixture = await authoredMaskFixture();
    const measurement = createCandidateRigAuthoredIsolatedMaskMeasurement({
      review: fixture.runtime,
      recipe: fixture.view.recipe,
      baseMeasurement: fixture.baseMeasurement,
      authoredMasks: [
        {
          evidence: fixture.evidence,
          maskedRgbaPixels: fixture.masked,
        },
      ],
    });
    expect(measurement.schemaVersion).toBe("1.1");
    expect(measurement.authoredMaskCompiler).toMatchObject({
      baseMeasurementContentHash: fixture.baseMeasurement.contentHash,
      evidenceContentHashes: [fixture.evidence.contentHash],
      exactSourceRgbaVerified: true,
      originalAndMaskedDistinct: true,
      semanticSupportRetained: true,
      guideTabPixelsRemoved: true,
      providerAuthority: false,
      approvalAuthority: false,
      capabilityAuthority: false,
      productionBindable: false,
    });
    const requirement = measurement.requirements.find(
      (candidate) => candidate.requirementId === "front-secondary-front-mask",
    )!;
    expect(requirement.outcome.status).toBe("detected");
    const candidateId =
      requirement.outcome.status === "detected"
        ? requirement.outcome.candidateIds[0]!
        : "";
    const candidate = measurement.components
      .flatMap((component) => component.candidates)
      .find((entry) => entry.candidateId === candidateId)!;
    expect(candidate).toMatchObject({
      featureClass: "mask-only",
      transformAuthority: false,
      authoredMaskEvidence: {
        evidenceContentHash: fixture.evidence.contentHash,
        originalRgbaContentHash: fixture.evidence.sourceRgbaContentHash,
        maskedRgbaContentHash: fixture.evidence.maskedRgbaContentHash,
        originalAndMaskedDistinct: true,
        semanticSupportRetained: true,
        guideTabPixelsRemoved: true,
        maskAuthority: false,
        transformAuthority: false,
        runtimeNodeCreated: false,
        motionChannelCreated: false,
        approvalAuthority: false,
        productionBindable: false,
      },
    });
    const proposal = createCandidateRigUnapprovedRegistrationProposal({
      measurement,
      registrationPlan: fixture.view.registrationPlan,
      recipe: fixture.view.recipe,
    });
    expect(proposal.maskOnlySupports).toContainEqual({
      componentRole: "secondary-front",
      requirementIds: ["front-secondary-front-mask"],
      sourceFeatureIds: [candidateId],
      plausibilityRegionContentHash:
        fixture.component.plausibilityRegion.contentHash,
      transformAuthority: false,
      runtimeNodeCreated: false,
      motionChannelCreated: false,
    });
    expect(proposal.providerAuthority).toBe(false);
    expect(proposal.approvalAuthority).toBe(false);
    expect(proposal.capabilityAuthority).toBe(false);
    expect(proposal.productionBindable).toBe(false);
    const images = await createCandidateRigPrivateRegistrationComponentImages({
      review: fixture.runtime,
      recipe: fixture.view.recipe,
      measurement,
      proposal,
    });
    const maskedImage = images.find(
      (image) => image.componentId === fixture.component.componentId,
    )!;
    expect(maskedImage.maskedPixelCount).toBe(fixture.guide.size);
    expect(maskedImage.originalPngContentHash).not.toBe(
      maskedImage.maskedPngContentHash,
    );
    expect(maskedImage.maskAuthority).toBe(false);
    expect(maskedImage.transformAuthority).toBe(false);
  }, 90_000);

  it("rejects stale, substituted, identity-drifted, no-op, semantic-loss, and tab-retention evidence", async () => {
    const fixture = await authoredMaskFixture();
    const compile = (
      evidence: unknown,
      maskedRgbaPixels: Uint8Array = fixture.masked,
    ) =>
      createCandidateRigAuthoredIsolatedMaskMeasurement({
        review: fixture.runtime,
        recipe: fixture.view.recipe,
        baseMeasurement: fixture.baseMeasurement,
        authoredMasks: [{ evidence, maskedRgbaPixels }],
      });

    const stale = rehashEvidence({
      ...fixture.evidence,
      baseMeasurementContentHash: "a".repeat(64),
    });
    expect(() => compile(stale)).toThrow(
      CandidateRigAuthoredIsolatedMaskMeasurementError,
    );

    const substituted = rehashEvidence({
      ...fixture.evidence,
      componentRole: "secondary-back",
    });
    expect(() => compile(substituted)).toThrow(
      CandidateRigAuthoredIsolatedMaskMeasurementError,
    );

    const identityDrifted = {
      ...fixture.evidence,
      evidenceId: "identity-drifted-without-rehash",
    };
    expect(() => compile(identityDrifted)).toThrow(/hash/i);

    const noOpDraft = {
      ...fixture.evidence,
      maskedRgbaContentHash: fixture.evidence.sourceRgbaContentHash,
    };
    const { contentHash: ignoredNoOpHash, ...noOpWithoutHash } = noOpDraft;
    void ignoredNoOpHash;
    const noOp = {
      ...noOpWithoutHash,
      contentHash: hashCanonical(noOpWithoutHash),
    };
    expect(() => compile(noOp, fixture.original)).toThrow(/change/i);

    const semanticLossPixels = Buffer.from(fixture.masked);
    const lostPixel = [...fixture.retained][0]!;
    semanticLossPixels.fill(0, lostPixel * 4, lostPixel * 4 + 4);
    const semanticLoss = rehashEvidence({
      ...fixture.evidence,
      maskedRgbaContentHash: sha256(semanticLossPixels),
    });
    expect(() => compile(semanticLoss, semanticLossPixels)).toThrow(
      /semantic-support pixel/i,
    );

    const tabRetentionPixels = Buffer.from(fixture.masked);
    const retainedTabPixel = [...fixture.guide][0]!;
    fixture.original.copy(
      tabRetentionPixels,
      retainedTabPixel * 4,
      retainedTabPixel * 4,
      retainedTabPixel * 4 + 4,
    );
    const tabRetention = rehashEvidence({
      ...fixture.evidence,
      maskedRgbaContentHash: sha256(tabRetentionPixels),
    });
    expect(() => compile(tabRetention, tabRetentionPixels)).toThrow(
      /guide-tab pixel/i,
    );
  }, 90_000);
});
