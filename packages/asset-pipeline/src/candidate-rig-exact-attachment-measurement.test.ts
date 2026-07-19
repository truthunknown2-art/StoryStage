import { copyFile, mkdir, mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { hashCanonical } from "@storystage/story-engine";
import { candidateRigExactAttachmentMeasurementReportSchema } from "@storystage/story-engine/private-candidate-rig-registration";
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
  }, 120_000);

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
});
