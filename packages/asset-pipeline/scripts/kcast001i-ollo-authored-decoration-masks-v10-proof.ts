import { createHash } from "node:crypto";
import {
  copyFile,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { format } from "prettier";
import sharp from "sharp";
import { hashCanonical } from "@storystage/story-engine";
import {
  candidateRigAuthoredDecorationMaskManifestSchema,
  type CandidateRigAuthoredIsolatedMaskEvidence,
} from "@storystage/story-engine/private-candidate-rig-registration";
import {
  createCandidateRigAuthoredDecorationMaskSourceInput,
  createCandidateRigAuthoredIsolatedMaskMeasurement,
  createCandidateRigExactAttachmentMeasurement,
  createCandidateRigUnapprovedRegistrationProposal,
} from "../src/candidate-rig-private-registration";
import {
  createCandidateRigReviewInput,
  type CandidateRigReviewRuntimeInput,
} from "../src/candidate-rig-review-input";
import type {
  OlloCandidateIReviewRecipeInput,
  OlloCandidateISourceReviewPlan,
} from "../src/ollo-candidate-i-review-recipes";

const workspaceRoot = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../..",
);
const evidenceRoot = resolve(workspaceRoot, "reports/evidence/KCAST-001");
const reportFile = resolve(
  evidenceRoot,
  "ollo-authored-decoration-mask-v10-hash-report.json",
);
const visualRoot = resolve(
  workspaceRoot,
  "artifacts/KCAST-001/authored-decoration-masks-v10/native-visuals",
);
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
  review: CandidateRigReviewRuntimeInput,
  sourceCandidateId: string,
  rect: { x: number; y: number; width: number; height: number },
) => {
  const atlas = review.atlases.find(
    (candidate) => candidate.candidateId === sourceCandidateId,
  );
  if (!atlas) throw new Error("Exact authored-mask atlas is unavailable.");
  const rgba = Buffer.alloc(rect.width * rect.height * 4);
  for (let y = 0; y < rect.height; y += 1) {
    const sourceStart = ((rect.y + y) * atlas.width + rect.x) * 4;
    atlas.rgbaPixels.copy(
      rgba,
      y * rect.width * 4,
      sourceStart,
      sourceStart + rect.width * 4,
    );
  }
  return rgba;
};

const encodeNativePng = (rgba: Uint8Array, width: number, height: number) =>
  sharp(rgba, { raw: { width, height, channels: 4 } })
    .png({ compressionLevel: 9, adaptiveFiltering: false, palette: false })
    .toBuffer();

const main = async () => {
  const sourceReviewInput = JSON.parse(
    await readFile(
      resolve(evidenceRoot, "ollo-candidate-i-source-review-render-input.json"),
      "utf8",
    ),
  ) as {
    evidence: OlloCandidateIReviewRecipeInput;
    sourceReviewPlan: OlloCandidateISourceReviewPlan;
  };
  const manifest = candidateRigAuthoredDecorationMaskManifestSchema.parse(
    JSON.parse(
      await readFile(
        resolve(
          evidenceRoot,
          "ollo-authored-decoration-mask-manifest-v10.json",
        ),
        "utf8",
      ),
    ),
  );
  const root = await mkdtemp(
    join(tmpdir(), "storystage-ollo-authored-masks-v10-"),
  );
  const stagingRoot = join(root, "staging");
  try {
    for (const file of (
      sourceReviewInput.evidence.importReceipt as {
        files: Array<{ candidateId: string; stagedRelativeFile: string }>;
      }
    ).files) {
      const source = exactSources[file.candidateId];
      if (!source) continue;
      const target = join(stagingRoot, file.stagedRelativeFile);
      await mkdir(dirname(target), { recursive: true });
      await copyFile(resolve(evidenceRoot, "derived", source), target);
    }
    await mkdir(visualRoot, { recursive: true });
    const views = [];
    const visualEvidence = [];
    for (const view of sourceReviewInput.sourceReviewPlan.views) {
      const review = await createCandidateRigReviewInput({
        request: sourceReviewInput.evidence.request,
        bundle: sourceReviewInput.evidence.bundle,
        stagingReport: sourceReviewInput.evidence.stagingReport,
        importReceipt: sourceReviewInput.evidence.importReceipt,
        recipe: view.recipe,
        reviewProgram: view.program,
        registrationPlan: view.registrationPlan,
        trustedStagingRoot: root,
        stagingRoot,
      });
      const baseMeasurement =
        await createCandidateRigExactAttachmentMeasurement({
          review,
          recipe: view.recipe,
        });
      const firstSource =
        await createCandidateRigAuthoredDecorationMaskSourceInput({
          review,
          recipe: view.recipe,
          baseMeasurement,
          sourceReviewInput,
          manifest,
          manifestRoot: evidenceRoot,
        });
      const secondSource =
        await createCandidateRigAuthoredDecorationMaskSourceInput({
          review,
          recipe: view.recipe,
          baseMeasurement,
          sourceReviewInput,
          manifest,
          manifestRoot: evidenceRoot,
        });
      const firstMeasurement =
        createCandidateRigAuthoredIsolatedMaskMeasurement({
          review,
          recipe: view.recipe,
          baseMeasurement,
          authoredMasks: firstSource.authoredMasks,
        });
      const secondMeasurement =
        createCandidateRigAuthoredIsolatedMaskMeasurement({
          review,
          recipe: view.recipe,
          baseMeasurement,
          authoredMasks: secondSource.authoredMasks,
        });
      const unapprovedProposal =
        createCandidateRigUnapprovedRegistrationProposal({
          measurement: firstMeasurement,
          registrationPlan: view.registrationPlan,
          recipe: view.recipe,
        });
      if (
        firstMeasurement.contentHash !== secondMeasurement.contentHash ||
        hashCanonical(firstSource.evidenceContentHashes) !==
          hashCanonical(secondSource.evidenceContentHashes)
      )
        throw new Error(
          `Authored decoration-mask ${view.view} two-run hashes diverged.`,
        );
      const detectedMaskRequirementIds = firstMeasurement.requirements
        .filter(
          (requirement) =>
            requirement.featureClass === "mask-only" &&
            requirement.outcome.status === "detected",
        )
        .map((requirement) => requirement.requirementId)
        .sort();
      if (detectedMaskRequirementIds.length !== 2)
        throw new Error(
          `Authored decoration-mask ${view.view} did not resolve exactly two mask-only requirements.`,
        );
      for (const authored of firstSource.authoredMasks) {
        const evidence =
          authored.evidence as CandidateRigAuthoredIsolatedMaskEvidence;
        const originalRgba = exactCrop(
          review,
          evidence.sourceCandidateId,
          evidence.sourceRect,
        );
        let changedOutsideMaskPixelCount = 0;
        const selected = new Set(
          evidence.guideTabMask.runs.flatMap((run) =>
            Array.from(
              { length: run.length },
              (_, offset) =>
                run.y * evidence.guideTabMask.width + run.x + offset,
            ),
          ),
        );
        for (let pixel = 0; pixel < originalRgba.length / 4; pixel += 1) {
          const differs = [0, 1, 2, 3].some(
            (channel) =>
              originalRgba[pixel * 4 + channel] !==
              authored.maskedRgbaPixels[pixel * 4 + channel],
          );
          if (differs && !selected.has(pixel))
            changedOutsideMaskPixelCount += 1;
        }
        if (changedOutsideMaskPixelCount !== 0)
          throw new Error(
            `Authored decoration-mask ${evidence.evidenceId} changed semantic RGBA outside its exact mask.`,
          );
        const [originalPng, maskedPng] = await Promise.all([
          encodeNativePng(
            originalRgba,
            evidence.sourceRect.width,
            evidence.sourceRect.height,
          ),
          encodeNativePng(
            authored.maskedRgbaPixels,
            evidence.sourceRect.width,
            evidence.sourceRect.height,
          ),
        ]);
        const originalRelativeFile = `${evidence.view}-${evidence.componentRole}-original.png`;
        const maskedRelativeFile = `${evidence.view}-${evidence.componentRole}-masked.png`;
        await Promise.all([
          writeFile(resolve(visualRoot, originalRelativeFile), originalPng),
          writeFile(resolve(visualRoot, maskedRelativeFile), maskedPng),
        ]);
        visualEvidence.push({
          view: evidence.view,
          componentRole: evidence.componentRole,
          width: evidence.sourceRect.width,
          height: evidence.sourceRect.height,
          selectedPixelCount: evidence.guideTabMask.pixelCount,
          changedOutsideMaskPixelCount,
          originalPngSha256: sha256(originalPng),
          maskedPngSha256: sha256(maskedPng),
          originalRelativeFile,
          maskedRelativeFile,
        });
      }
      views.push({
        view: view.view,
        baseMeasurementContentHash: baseMeasurement.contentHash,
        firstMeasurementContentHash: firstMeasurement.contentHash,
        secondMeasurementContentHash: secondMeasurement.contentHash,
        evidenceContentHashes: firstSource.evidenceContentHashes,
        maskPngContentHashes: firstSource.maskPngContentHashes,
        detectedMaskRequirementIds,
        measurementRemainingBlockerRequirementIds:
          firstMeasurement.blockerRequirementIds,
        unapprovedProposalContentHash: unapprovedProposal.contentHash,
        proposalStatus: unapprovedProposal.proposalStatus,
        proposalUnresolvedRequirementIds:
          unapprovedProposal.unresolvedRequirements
            .map((requirement) => requirement.requirementId)
            .sort((left, right) => left.localeCompare(right)),
        proposalUnresolvedRequirementCount:
          unapprovedProposal.unresolvedRequirements.length,
        twoRunContentHashEquality: true,
        sourceMeasuredBeforeMasking: true,
        proposedRegistrationAuthority: false,
        approvalAuthority: false,
        capabilityAuthority: false,
        productionBindable: false,
      });
    }
    const draft = {
      schemaVersion: "1.0" as const,
      reportKind: "ollo-authored-decoration-mask-v10-hash-report" as const,
      authorityDomain: "private-source-review-registration" as const,
      acceptedUpstreamCommit:
        "275915204caefcad2f3b773ac6eb8a4f3b904b60" as const,
      sourceReviewInputContentHash: hashCanonical(sourceReviewInput),
      manifestContentHash: manifest.contentHash,
      compilerId: "authored-isolated-decoration-mask-compiler" as const,
      compilerVersion: "1.1.0" as const,
      masks: manifest.entries.map((entry) => ({
        entryId: entry.entryId,
        view: entry.view,
        componentRole: entry.componentRole,
        maskRelativeFile: entry.maskRelativeFile,
        maskPngContentHash: entry.maskPngContentHash,
        width: entry.maskWidth,
        height: entry.maskHeight,
        bitsPerSample: entry.bitsPerSample,
        paletteBitDepth: entry.paletteBitDepth,
        selectedPixelCount: entry.selectedPixelCount,
      })),
      views,
      visualEvidence,
      allSixActualArtMasksVerified: true as const,
      deterministicTwoRunHashEquality: true as const,
      semanticRgbaOutsideMasksByteIdentical: true as const,
      nativeResolutionVisualEvidenceWrittenToIgnoredArtifacts: true as const,
      motionArtifactIncluded: false as const,
      ordinaryPlayerReachable: false as const,
      exportReachable: false as const,
      preparationAuthority: false as const,
      approvalAuthority: false as const,
      capabilityAuthority: false as const,
      productionBindable: false as const,
    };
    const report = { ...draft, contentHash: hashCanonical(draft) };
    const bytes = await format(JSON.stringify(report), { parser: "json" });
    if (process.argv.includes("--check")) {
      const existing = await readFile(reportFile, "utf8");
      if (existing !== bytes)
        throw new Error(
          "Committed Ollo authored decoration-mask v10 hash report is stale.",
        );
      process.stdout.write(
        `${JSON.stringify({ status: "verified", contentHash: report.contentHash, views: views.map((view) => ({ view: view.view, measurementContentHash: view.firstMeasurementContentHash, measurementRemainingBlockerCount: view.measurementRemainingBlockerRequirementIds.length, proposalUnresolvedRequirementCount: view.proposalUnresolvedRequirementCount, proposalUnresolvedRequirementIds: view.proposalUnresolvedRequirementIds })) }, null, 2)}\n`,
      );
      return;
    }
    await writeFile(reportFile, bytes, { encoding: "utf8", mode: 0o600 });
    process.stdout.write(
      `${JSON.stringify({ status: "written", file: reportFile, contentHash: report.contentHash }, null, 2)}\n`,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
};

await main();
