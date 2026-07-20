import { createHash } from "node:crypto";
import sharp from "sharp";
import {
  characterRigPreparationRecipeSchema,
  hashCanonical,
  type CharacterRigPreparationRecipe,
} from "@storystage/story-engine";
import {
  candidateRigExactAttachmentMeasurementReportSchema,
  candidateRigJointDerivationEvidenceSchema,
  validateCandidateRigPrivateRegistrationProposalBindings,
  type CandidateRigExactAttachmentMeasurementReport,
  type CandidateRigJointDerivationEvidence,
} from "@storystage/story-engine/private-candidate-rig-registration";
import {
  isVerifiedCandidateRigReviewRuntimeInput,
  type CandidateRigReviewRuntimeInput,
} from "./candidate-rig-review-input";

const MAX_PIXELS = 8192 * 8192;
const sha256 = (bytes: Uint8Array) =>
  createHash("sha256").update(bytes).digest("hex");

export type CandidateRigPrivateRegistrationComponentImage = {
  componentId: string;
  semanticRole: CharacterRigPreparationRecipe["parts"][number]["role"];
  sourceContentHash: string;
  sourceRgbaContentHash: string;
  originalPngContentHash: string;
  maskedPngContentHash: string;
  maskRunLengthEncodingContentHash: string;
  maskRuns: Array<{ y: number; x: number; length: number }>;
  maskedPixelCount: number;
  maskAuditRegion: {
    x: number;
    y: number;
    width: number;
    height: number;
  } | null;
  maskAuditOriginalPngContentHash: string | null;
  maskAuditMaskedPngContentHash: string | null;
  maskAuditEvidencePngContentHash: string | null;
  maskAuditOriginalDataUrl: string | null;
  maskAuditMaskedDataUrl: string | null;
  maskAuditEvidenceDataUrl: string | null;
  jointEvidence: Array<{
    candidateId: string;
    record: CandidateRigJointDerivationEvidence;
    selectedSupport: CandidateRigExactAttachmentMeasurementReport["components"][number]["candidates"][number]["selectedSupport"];
    originalDataUrl: string;
    maskedDataUrl: string;
    auditEvidenceDataUrl: string;
  }>;
  width: number;
  height: number;
  originalDataUrl: string;
  maskedDataUrl: string;
  sourceMeasuredBeforeMasking: true;
  maskAuthority: false;
  transformAuthority: false;
};

const unionRuns = (
  component: CandidateRigExactAttachmentMeasurementReport["components"][number],
) => {
  const pixels = new Set<number>();
  for (const candidate of component.candidates)
    for (const run of candidate.selectedSupport.runs)
      for (let x = run.x; x < run.x + run.length; x += 1)
        pixels.add(run.y * component.sourceRect.width + x);
  const runs: Array<{ y: number; x: number; length: number }> = [];
  for (let y = 0; y < component.sourceRect.height; y += 1) {
    let x = 0;
    while (x < component.sourceRect.width) {
      if (!pixels.has(y * component.sourceRect.width + x)) {
        x += 1;
        continue;
      }
      const start = x;
      while (
        x < component.sourceRect.width &&
        pixels.has(y * component.sourceRect.width + x)
      )
        x += 1;
      runs.push({ y, x: start, length: x - start });
    }
  }
  return { pixels, runs };
};

/**
 * Produces raw, unresampled component crops for the private static diagnostic.
 * It intentionally never invokes tab masking and cannot produce a runtime rig.
 */
export const createCandidateRigPrivateRegistrationComponentImages =
  async (input: {
    review: CandidateRigReviewRuntimeInput;
    recipe: unknown;
    measurement: unknown;
    proposal: unknown;
  }): Promise<CandidateRigPrivateRegistrationComponentImage[]> => {
    const recipe = characterRigPreparationRecipeSchema.parse(input.recipe);
    const { measurement, proposal } =
      validateCandidateRigPrivateRegistrationProposalBindings(
        candidateRigExactAttachmentMeasurementReportSchema.parse(
          input.measurement,
        ),
        input.proposal,
      );
    if (
      !isVerifiedCandidateRigReviewRuntimeInput(input.review) ||
      input.review.authority !== "candidate-source-review" ||
      input.review.ephemeral !== true ||
      input.review.providerAuthority !== false ||
      input.review.approvalRequired !== true ||
      input.review.productionBindable !== false ||
      input.review.view !== recipe.view ||
      input.review.preparationRecipeContentHash !== recipe.contentHash ||
      measurement.view !== recipe.view ||
      measurement.lineage.preparationRecipeContentHash !== recipe.contentHash
    )
      throw new Error(
        "Private registration component extraction requires the exact verified ephemeral review input.",
      );
    const atlasByCandidate = new Map(
      input.review.atlases.map((atlas) => [atlas.candidateId, atlas]),
    );
    const measuredByRole = new Map(
      measurement.components.map((component) => [
        component.semanticRole,
        component,
      ]),
    );
    const images: CandidateRigPrivateRegistrationComponentImage[] = [];
    for (const component of recipe.parts) {
      const atlas = atlasByCandidate.get(component.source.candidateId);
      const measured = measuredByRole.get(component.role);
      if (
        !atlas ||
        !measured ||
        atlas.contentHash !== component.source.stagedContentHash ||
        sha256(atlas.rgbaPixels) !== atlas.rgbaContentHash ||
        measured.sourceContentHash !== atlas.contentHash ||
        hashCanonical(measured.sourceRect) !==
          hashCanonical(component.source.rect) ||
        component.output.width !==
          component.source.rect.width + component.output.padding * 2 ||
        component.output.height !==
          component.source.rect.height + component.output.padding * 2
      )
        throw new Error(
          `Private registration component ${component.id} lost exact atlas lineage.`,
        );
      const { data: crop, info: cropInfo } = await sharp(atlas.rgbaPixels, {
        raw: { width: atlas.width, height: atlas.height, channels: 4 },
        limitInputPixels: MAX_PIXELS,
      })
        .extract({
          left: component.source.rect.x,
          top: component.source.rect.y,
          width: component.source.rect.width,
          height: component.source.rect.height,
        })
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });
      if (
        cropInfo.width !== component.source.rect.width ||
        cropInfo.height !== component.source.rect.height ||
        cropInfo.channels !== 4
      )
        throw new Error(
          `Private registration component ${component.id} did not preserve exact source dimensions.`,
        );
      if (sha256(crop) !== measured.sourceRgbaContentHash)
        throw new Error(
          `Private registration component ${component.id} changed after exact pre-mask measurement.`,
        );
      const { pixels: maskedPixels, runs: maskRuns } = unionRuns(measured);
      const maskedCrop = Buffer.from(crop);
      const maskEvidenceCrop = Buffer.alloc(crop.length);
      for (const pixel of maskedPixels) {
        const offset = pixel * 4;
        maskedCrop[offset] = 0;
        maskedCrop[offset + 1] = 0;
        maskedCrop[offset + 2] = 0;
        maskedCrop[offset + 3] = 0;
        maskEvidenceCrop[offset] = 228;
        maskEvidenceCrop[offset + 1] = 86;
        maskEvidenceCrop[offset + 2] = 86;
        maskEvidenceCrop[offset + 3] = 255;
      }
      const padding = component.output.padding;
      const encode = (
        rgba: Uint8Array,
        width: number,
        height: number,
        outputPadding: number,
      ) =>
        sharp(rgba, {
          raw: {
            width,
            height,
            channels: 4,
          },
          limitInputPixels: MAX_PIXELS,
        })
          .extend({
            top: outputPadding,
            right: outputPadding,
            bottom: outputPadding,
            left: outputPadding,
            background: { r: 0, g: 0, b: 0, alpha: 0 },
          })
          .png({
            compressionLevel: 9,
            adaptiveFiltering: false,
            palette: false,
          })
          .toBuffer({ resolveWithObject: true });
      const maskAuditRegion =
        maskedPixels.size > 0
          ? (() => {
              const xs = [...maskedPixels].map(
                (pixel) => pixel % component.source.rect.width,
              );
              const ys = [...maskedPixels].map((pixel) =>
                Math.floor(pixel / component.source.rect.width),
              );
              const left = Math.max(0, Math.min(...xs) - 4);
              const top = Math.max(0, Math.min(...ys) - 4);
              const right = Math.min(
                component.source.rect.width,
                Math.max(...xs) + 5,
              );
              const bottom = Math.min(
                component.source.rect.height,
                Math.max(...ys) + 5,
              );
              return {
                x: left,
                y: top,
                width: right - left,
                height: bottom - top,
              };
            })()
          : null;
      const auditRaw = async (rgba: Uint8Array) =>
        maskAuditRegion
          ? sharp(rgba, {
              raw: {
                width: cropInfo.width,
                height: cropInfo.height,
                channels: 4,
              },
              limitInputPixels: MAX_PIXELS,
            })
              .extract({
                left: maskAuditRegion.x,
                top: maskAuditRegion.y,
                width: maskAuditRegion.width,
                height: maskAuditRegion.height,
              })
              .raw()
              .toBuffer()
          : null;
      const [auditOriginalRaw, auditMaskedRaw, auditEvidenceRaw] =
        await Promise.all([
          auditRaw(crop),
          auditRaw(maskedCrop),
          auditRaw(maskEvidenceCrop),
        ]);
      const [original, masked] = await Promise.all([
        encode(crop, cropInfo.width, cropInfo.height, padding),
        encode(maskedCrop, cropInfo.width, cropInfo.height, padding),
      ]);
      const [auditOriginal, auditMasked, auditEvidence] = maskAuditRegion
        ? await Promise.all([
            encode(
              auditOriginalRaw!,
              maskAuditRegion.width,
              maskAuditRegion.height,
              0,
            ),
            encode(
              auditMaskedRaw!,
              maskAuditRegion.width,
              maskAuditRegion.height,
              0,
            ),
            encode(
              auditEvidenceRaw!,
              maskAuditRegion.width,
              maskAuditRegion.height,
              0,
            ),
          ])
        : [null, null, null];
      const jointEvidence = await Promise.all(
        measured.candidates.map(async (candidate) => {
          const runPixels = candidate.selectedSupport.runs.flatMap((run) =>
            Array.from({ length: run.length }, (_, index) => ({
              x: run.x + index,
              y: run.y,
            })),
          );
          if (runPixels.length === 0)
            throw new Error(
              `Private registration joint ${candidate.candidateId} has no exact selected-support pixels.`,
            );
          const left = Math.max(
            0,
            Math.min(...runPixels.map((pixel) => pixel.x)) - 4,
          );
          const top = Math.max(
            0,
            Math.min(...runPixels.map((pixel) => pixel.y)) - 4,
          );
          const right = Math.min(
            cropInfo.width,
            Math.max(...runPixels.map((pixel) => pixel.x)) + 5,
          );
          const bottom = Math.min(
            cropInfo.height,
            Math.max(...runPixels.map((pixel) => pixel.y)) + 5,
          );
          const auditRegion = {
            x: left,
            y: top,
            width: right - left,
            height: bottom - top,
          };
          const originalRaw = await sharp(crop, {
            raw: {
              width: cropInfo.width,
              height: cropInfo.height,
              channels: 4,
            },
            limitInputPixels: MAX_PIXELS,
          })
            .extract({
              left: auditRegion.x,
              top: auditRegion.y,
              width: auditRegion.width,
              height: auditRegion.height,
            })
            .raw()
            .toBuffer();
          const maskedRaw = Buffer.from(originalRaw);
          const auditEvidenceRaw = Buffer.alloc(originalRaw.length);
          for (const run of candidate.selectedSupport.runs)
            for (let x = run.x; x < run.x + run.length; x += 1) {
              const localX = x - auditRegion.x;
              const localY = run.y - auditRegion.y;
              if (
                localX < 0 ||
                localY < 0 ||
                localX >= auditRegion.width ||
                localY >= auditRegion.height
              )
                throw new Error(
                  `Private registration joint ${candidate.candidateId} escaped its audit region.`,
                );
              const offset = (localY * auditRegion.width + localX) * 4;
              maskedRaw[offset] = 0;
              maskedRaw[offset + 1] = 0;
              maskedRaw[offset + 2] = 0;
              maskedRaw[offset + 3] = 0;
              auditEvidenceRaw[offset] = 228;
              auditEvidenceRaw[offset + 1] = 86;
              auditEvidenceRaw[offset + 2] = 86;
              auditEvidenceRaw[offset + 3] = 255;
            }
          const [originalJoint, maskedJoint, auditJoint] = await Promise.all([
            encode(originalRaw, auditRegion.width, auditRegion.height, 0),
            encode(maskedRaw, auditRegion.width, auditRegion.height, 0),
            encode(auditEvidenceRaw, auditRegion.width, auditRegion.height, 0),
          ]);
          const requirementIds = measurement.requirements
            .filter(
              (requirement) =>
                requirement.componentRole === candidate.semanticRole &&
                requirement.featureClass === candidate.featureClass,
            )
            .map((requirement) => requirement.requirementId)
            .sort();
          const proposalReferenceIds = [
            ...proposal.parts
              .filter((part) =>
                part.childPivot.sourceFeatureIds.includes(
                  candidate.candidateId,
                ),
              )
              .map(
                (part) => `part-${part.role}-${part.childPivot.requirementId}`,
              ),
            ...proposal.sockets
              .filter((socket) =>
                socket.position.sourceFeatureIds.includes(
                  candidate.candidateId,
                ),
              )
              .map(
                (socket) =>
                  `socket-${socket.parentRole}-${socket.socketId}-${socket.position.requirementId}`,
              ),
            ...proposal.maskOnlySupports
              .filter((support) =>
                support.sourceFeatureIds.includes(candidate.candidateId),
              )
              .map((support) => `mask-${support.componentRole}`),
            ...proposal.attachmentClassDecisions
              .filter((decision) =>
                decision.sourceFeatureIds.includes(candidate.candidateId),
              )
              .map((decision) => `class-${decision.requirementId}`),
          ].sort();
          const recordDraft = {
            schemaVersion: "1.0" as const,
            artifactKind: "candidate-rig-joint-derivation-evidence" as const,
            candidateId: candidate.candidateId,
            componentId: measured.componentId,
            semanticRole: measured.semanticRole,
            sourceRgbaContentHash: measured.sourceRgbaContentHash,
            physicalFeatureContentHash: candidate.physicalFeatureContentHash,
            candidateMeasurementContentHash: hashCanonical(candidate),
            measurementReportContentHash: measurement.contentHash,
            effectiveProposalContentHash: proposal.contentHash,
            auditRegion,
            componentOutputPadding: padding,
            selectedSupportRunLengthEncodingContentHash:
              candidate.selectedSupport.runLengthEncodingContentHash,
            selectedSupportPixelCount: candidate.selectedSupport.pixelCount,
            requirementIds,
            proposalReferenceIds,
            proposalReferenceState:
              proposalReferenceIds.length > 0
                ? ("referenced" as const)
                : ("unreferenced" as const),
            originalPngContentHash: sha256(originalJoint.data),
            maskedPngContentHash: sha256(maskedJoint.data),
            auditEvidencePngContentHash: sha256(auditJoint.data),
            sourceMeasuredBeforeMasking: true as const,
            maskAuthority: false as const,
            transformAuthority: false as const,
            productionBindable: false as const,
          };
          const record = candidateRigJointDerivationEvidenceSchema.parse({
            ...recordDraft,
            contentHash: hashCanonical(recordDraft),
          });
          return {
            candidateId: candidate.candidateId,
            record,
            selectedSupport: candidate.selectedSupport,
            originalDataUrl: `data:image/png;base64,${originalJoint.data.toString("base64")}`,
            maskedDataUrl: `data:image/png;base64,${maskedJoint.data.toString("base64")}`,
            auditEvidenceDataUrl: `data:image/png;base64,${auditJoint.data.toString("base64")}`,
          };
        }),
      );
      const { data: originalPng, info } = original;
      const { data: maskedPng, info: maskedInfo } = masked;
      if (
        info.format !== "png" ||
        info.width !== component.output.width ||
        info.height !== component.output.height ||
        info.channels !== 4 ||
        maskedInfo.format !== info.format ||
        maskedInfo.width !== info.width ||
        maskedInfo.height !== info.height ||
        maskedInfo.channels !== info.channels
      )
        throw new Error(
          `Private registration component ${component.id} did not produce its exact raw diagnostic canvas.`,
        );
      images.push({
        componentId: component.id,
        semanticRole: component.role,
        sourceContentHash: atlas.contentHash,
        sourceRgbaContentHash: measured.sourceRgbaContentHash,
        originalPngContentHash: sha256(originalPng),
        maskedPngContentHash: sha256(maskedPng),
        maskRunLengthEncodingContentHash: hashCanonical(maskRuns),
        maskRuns,
        maskedPixelCount: maskedPixels.size,
        maskAuditRegion,
        maskAuditOriginalPngContentHash: auditOriginal
          ? sha256(auditOriginal.data)
          : null,
        maskAuditMaskedPngContentHash: auditMasked
          ? sha256(auditMasked.data)
          : null,
        maskAuditEvidencePngContentHash: auditEvidence
          ? sha256(auditEvidence.data)
          : null,
        maskAuditOriginalDataUrl: auditOriginal
          ? `data:image/png;base64,${auditOriginal.data.toString("base64")}`
          : null,
        maskAuditMaskedDataUrl: auditMasked
          ? `data:image/png;base64,${auditMasked.data.toString("base64")}`
          : null,
        maskAuditEvidenceDataUrl: auditEvidence
          ? `data:image/png;base64,${auditEvidence.data.toString("base64")}`
          : null,
        jointEvidence,
        width: info.width,
        height: info.height,
        originalDataUrl: `data:image/png;base64,${originalPng.toString("base64")}`,
        maskedDataUrl: `data:image/png;base64,${maskedPng.toString("base64")}`,
        sourceMeasuredBeforeMasking: true,
        maskAuthority: false,
        transformAuthority: false,
      });
    }
    return images;
  };
