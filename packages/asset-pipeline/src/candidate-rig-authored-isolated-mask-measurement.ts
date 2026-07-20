import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  characterRigPreparationRecipeSchema,
  hashCanonical,
} from "@storystage/story-engine";
import {
  candidateRigAuthoredIsolatedMaskEvidenceSchema,
  candidateRigExactAttachmentMeasurementReportSchema,
  type CandidateRigAuthoredIsolatedMaskEvidence,
  type CandidateRigExactAttachmentMeasurementReport,
} from "@storystage/story-engine/private-candidate-rig-registration";
import {
  isVerifiedCandidateRigReviewRuntimeInput,
  type CandidateRigReviewRuntimeInput,
} from "./candidate-rig-review-input";

const COMPILER_ID = "authored-isolated-decoration-mask-compiler" as const;
const COMPILER_VERSION = "1.0.0" as const;
const MICRO = 1_000_000;

type Mask = CandidateRigAuthoredIsolatedMaskEvidence["guideTabMask"];

const sha256 = (bytes: Uint8Array | string) =>
  createHash("sha256").update(bytes).digest("hex");

const pixelsForMask = (mask: Mask) => {
  const pixels = new Set<number>();
  for (const run of mask.runs)
    for (let x = run.x; x < run.x + run.length; x += 1)
      pixels.add(run.y * mask.width + x);
  return pixels;
};

const maskFor = (pixels: Set<number>, width: number, height: number): Mask => {
  const runs: Mask["runs"] = [];
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
  const bounds =
    pixels.size === 0
      ? null
      : {
          x: left,
          y: top,
          width: right - left + 1,
          height: bottom - top + 1,
        };
  return {
    width,
    height,
    runs,
    runLengthEncodingContentHash: hashCanonical(runs),
    pixelCount: pixels.size,
    bounds,
  };
};

const exactCrop = (
  atlas: CandidateRigReviewRuntimeInput["atlases"][number],
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

const exactSupport = (rgba: Uint8Array) => {
  const support = new Set<number>();
  for (let pixel = 0; pixel < rgba.length / 4; pixel += 1)
    if (rgba[pixel * 4 + 3]! > 0) support.add(pixel);
  return support;
};

const sameSet = (left: Set<number>, right: Set<number>) =>
  left.size === right.size && [...left].every((pixel) => right.has(pixel));

const locatorForMask = (mask: Mask) => {
  const bounds = mask.bounds;
  if (!bounds)
    throw new CandidateRigAuthoredIsolatedMaskMeasurementError(
      "invalid-authored-mask-evidence",
      "Authored guide-tab evidence has no exact pixel bounds.",
    );
  if (bounds.width >= bounds.height) {
    const startMicropixels = {
      x: bounds.x * MICRO,
      y: bounds.y * MICRO,
    };
    const endMicropixels = {
      x: (bounds.x + bounds.width) * MICRO,
      y: bounds.y * MICRO,
    };
    return {
      seed: { side: "top" as const, x: bounds.x, y: bounds.y },
      seam: {
        side: "top" as const,
        startMicropixels,
        endMicropixels,
        midpointMicropixels: {
          x: Math.round((startMicropixels.x + endMicropixels.x) / 2),
          y: startMicropixels.y,
        },
        tangentMillionths: { x: MICRO, y: 0 },
        outwardNormalMillionths: { x: 0, y: -MICRO },
        widthMicropixels: bounds.width * MICRO,
      },
    };
  }
  const startMicropixels = {
    x: (bounds.x + bounds.width) * MICRO,
    y: bounds.y * MICRO,
  };
  const endMicropixels = {
    x: (bounds.x + bounds.width) * MICRO,
    y: (bounds.y + bounds.height) * MICRO,
  };
  return {
    seed: { side: "right" as const, x: bounds.x, y: bounds.y },
    seam: {
      side: "right" as const,
      startMicropixels,
      endMicropixels,
      midpointMicropixels: {
        x: startMicropixels.x,
        y: Math.round((startMicropixels.y + endMicropixels.y) / 2),
      },
      tangentMillionths: { x: 0, y: MICRO },
      outwardNormalMillionths: { x: MICRO, y: 0 },
      widthMicropixels: bounds.height * MICRO,
    },
  };
};

export class CandidateRigAuthoredIsolatedMaskMeasurementError extends Error {
  public constructor(
    public readonly code:
      | "unverified-input"
      | "lineage-mismatch"
      | "invalid-authored-mask-evidence",
    message: string,
  ) {
    super(message);
    this.name = "CandidateRigAuthoredIsolatedMaskMeasurementError";
  }
}

export type CandidateRigAuthoredIsolatedMaskInput = {
  evidence: unknown;
  maskedRgbaPixels: Uint8Array;
};

/**
 * Overlays explicit authored guide-tab removal evidence onto an immutable v1.0
 * exact measurement. This compiler only resolves mask-only requirements. It
 * creates no transform, runtime, motion, approval, capability, or production
 * authority.
 */
export const createCandidateRigAuthoredIsolatedMaskMeasurement = (input: {
  review: CandidateRigReviewRuntimeInput;
  recipe: unknown;
  baseMeasurement: unknown;
  authoredMasks: CandidateRigAuthoredIsolatedMaskInput[];
}): CandidateRigExactAttachmentMeasurementReport => {
  if (!isVerifiedCandidateRigReviewRuntimeInput(input.review))
    throw new CandidateRigAuthoredIsolatedMaskMeasurementError(
      "unverified-input",
      "Authored isolated-mask measurement requires mechanically reopened runtime input.",
    );
  const recipe = characterRigPreparationRecipeSchema.parse(input.recipe);
  const base = candidateRigExactAttachmentMeasurementReportSchema.parse(
    input.baseMeasurement,
  );
  if (
    base.schemaVersion !== "1.0" ||
    base.authoredMaskCompiler !== undefined ||
    recipe.view !== input.review.view ||
    base.view !== input.review.view ||
    recipe.contentHash !== input.review.preparationRecipeContentHash ||
    base.lineage.preparationRecipeContentHash !== recipe.contentHash
  )
    throw new CandidateRigAuthoredIsolatedMaskMeasurementError(
      "lineage-mismatch",
      "Authored isolated-mask inputs do not share immutable v1.0 measurement lineage.",
    );
  const atlasByCandidate = new Map(
    input.review.atlases.map((atlas) => [atlas.candidateId, atlas]),
  );
  if (
    base.atlases.some((entry) => {
      const atlas = atlasByCandidate.get(entry.candidateId);
      return (
        !atlas ||
        atlas.kind !== entry.kind ||
        atlas.contentHash !== entry.sourceContentHash ||
        atlas.rgbaContentHash !== entry.sourceRgbaContentHash ||
        atlas.width !== entry.width ||
        atlas.height !== entry.height
      );
    })
  )
    throw new CandidateRigAuthoredIsolatedMaskMeasurementError(
      "lineage-mismatch",
      "Reopened atlas bytes drifted from the base measurement.",
    );
  if (input.authoredMasks.length === 0)
    throw new CandidateRigAuthoredIsolatedMaskMeasurementError(
      "invalid-authored-mask-evidence",
      "At least one authored isolated-mask evidence item is required.",
    );

  const components = structuredClone(base.components);
  const requirements = structuredClone(base.requirements);
  const evidenceHashes: string[] = [];
  const seenComponents = new Set<string>();

  for (const authored of input.authoredMasks) {
    const evidence = candidateRigAuthoredIsolatedMaskEvidenceSchema.parse(
      authored.evidence,
    );
    const component = components.find(
      (candidate) => candidate.componentId === evidence.componentId,
    );
    const recipePart = recipe.parts.find(
      (part) => part.id === evidence.componentId,
    );
    const requirement = requirements.find(
      (candidate) =>
        candidate.requirementId ===
        `${base.view}-${evidence.componentRole}-mask`,
    );
    if (
      evidence.baseMeasurementContentHash !== base.contentHash ||
      evidence.view !== base.view ||
      !component ||
      component.semanticRole !== evidence.componentRole ||
      !recipePart ||
      recipePart.role !== evidence.componentRole ||
      !requirement ||
      requirement.featureClass !== "mask-only" ||
      requirement.outcome.status !== "alpha-indistinguishable" ||
      seenComponents.has(evidence.componentId)
    )
      throw new CandidateRigAuthoredIsolatedMaskMeasurementError(
        "lineage-mismatch",
        "Authored mask evidence is stale, substituted, duplicated, or targets no unresolved decoration mask.",
      );
    const atlas = atlasByCandidate.get(component.sourceCandidateId);
    if (
      !atlas ||
      evidence.sourceCandidateId !== component.sourceCandidateId ||
      evidence.sourceCandidateId !== recipePart.source.candidateId ||
      evidence.sourceContentHash !== component.sourceContentHash ||
      evidence.sourceContentHash !== recipePart.source.stagedContentHash ||
      hashCanonical(evidence.sourceRect) !==
        hashCanonical(component.sourceRect) ||
      hashCanonical(evidence.sourceRect) !==
        hashCanonical(recipePart.source.rect)
    )
      throw new CandidateRigAuthoredIsolatedMaskMeasurementError(
        "lineage-mismatch",
        "Authored mask evidence does not bind the exact source component crop.",
      );

    const original = exactCrop(atlas, component.sourceRect);
    const masked = Buffer.from(authored.maskedRgbaPixels);
    const expectedByteLength =
      component.sourceRect.width * component.sourceRect.height * 4;
    if (
      original.length !== expectedByteLength ||
      masked.length !== expectedByteLength ||
      sha256(original) !== component.sourceRgbaContentHash ||
      sha256(original) !== evidence.sourceRgbaContentHash ||
      sha256(masked) !== evidence.maskedRgbaContentHash ||
      evidence.sourceRgbaContentHash === evidence.maskedRgbaContentHash
    )
      throw new CandidateRigAuthoredIsolatedMaskMeasurementError(
        "invalid-authored-mask-evidence",
        "Authored original/masked RGBA bytes or dimensions do not match their exact hashes.",
      );

    const guide = pixelsForMask(evidence.guideTabMask);
    const retained = pixelsForMask(evidence.retainedSemanticSupportMask);
    const originalSupport = exactSupport(original);
    const maskedSupport = exactSupport(masked);
    const partition = new Set([...guide, ...retained]);
    const guideRetainedOverlap = [...guide].some((pixel) =>
      retained.has(pixel),
    );
    let pixelsOutsideGuideUnchanged = true;
    let guidePixelsRemoved = true;
    for (let pixel = 0; pixel < expectedByteLength / 4; pixel += 1) {
      const byte = pixel * 4;
      if (guide.has(pixel)) {
        for (let channel = 0; channel < 4; channel += 1)
          if (masked[byte + channel] !== 0) guidePixelsRemoved = false;
      } else
        for (let channel = 0; channel < 4; channel += 1)
          if (masked[byte + channel] !== original[byte + channel])
            pixelsOutsideGuideUnchanged = false;
    }
    if (
      guideRetainedOverlap ||
      !sameSet(partition, originalSupport) ||
      !sameSet(retained, maskedSupport) ||
      !pixelsOutsideGuideUnchanged ||
      !guidePixelsRemoved
    )
      throw new CandidateRigAuthoredIsolatedMaskMeasurementError(
        "invalid-authored-mask-evidence",
        "Authored mask must remove every guide-tab pixel, retain every semantic-support pixel unchanged, and change nothing else.",
      );

    const core = pixelsForMask(component.coreMask);
    for (const pixel of guide) core.delete(pixel);
    const locator = locatorForMask(evidence.guideTabMask);
    const authoredMaskEvidence = {
      evidenceId: evidence.evidenceId,
      evidenceContentHash: evidence.contentHash,
      originalRgbaContentHash: evidence.sourceRgbaContentHash,
      maskedRgbaContentHash: evidence.maskedRgbaContentHash,
      guideTabMaskRunLengthEncodingContentHash:
        evidence.guideTabMask.runLengthEncodingContentHash,
      retainedSemanticSupportRunLengthEncodingContentHash:
        evidence.retainedSemanticSupportMask.runLengthEncodingContentHash,
      originalAndMaskedDistinct: true as const,
      semanticSupportRetained: true as const,
      guideTabPixelsRemoved: true as const,
      maskAuthority: false as const,
      transformAuthority: false as const,
      runtimeNodeCreated: false as const,
      motionChannelCreated: false as const,
      approvalAuthority: false as const,
      productionBindable: false as const,
    };
    const seed = {
      ...locator.seed,
      stableAlphaThreshold: 96 as const,
      edgeScanInsetPixels: 1 as const,
    };
    const selectedSupport = evidence.guideTabMask;
    const physicalFeatureContentHash = hashCanonical({
      componentId: component.componentId,
      sourceRgbaContentHash: component.sourceRgbaContentHash,
      seed,
      seam: locator.seam,
      selectedSupport,
      authoredMaskEvidence,
    });
    const candidateId = `${component.componentId}-authored-isolated-mask-only`;
    component.candidates.push({
      candidateId,
      componentId: component.componentId,
      semanticRole: component.semanticRole,
      featureClass: "mask-only",
      sourceRgbaContentHash: component.sourceRgbaContentHash,
      physicalFeatureContentHash,
      sourceRect: component.sourceRect,
      seed,
      seam: locator.seam,
      selectedSupport,
      retainedSemanticCore: maskFor(
        core,
        component.sourceRect.width,
        component.sourceRect.height,
      ),
      semanticCoreOverlapPixelCount: 0,
      derivedBeforeMasking: true,
      guideCoordinatesUsed: false,
      transformAuthority: false,
      authoredMaskEvidence,
    });
    component.candidates.sort((left, right) =>
      left.candidateId.localeCompare(right.candidateId),
    );
    requirement.outcome = { status: "detected", candidateIds: [candidateId] };
    evidenceHashes.push(evidence.contentHash);
    seenComponents.add(evidence.componentId);
  }

  const blockerRequirementIds = requirements
    .filter((requirement) => requirement.outcome.status !== "detected")
    .map((requirement) => requirement.requirementId)
    .sort((left, right) => left.localeCompare(right));
  const draft = {
    ...base,
    schemaVersion: "1.1" as const,
    status:
      blockerRequirementIds.length === 0
        ? ("ready-for-unapproved-proposal" as const)
        : ("blocked-source-geometry" as const),
    components,
    requirements: requirements.sort((left, right) =>
      left.requirementId.localeCompare(right.requirementId),
    ),
    blockerRequirementIds,
    authoredMaskCompiler: {
      id: COMPILER_ID,
      version: COMPILER_VERSION,
      baseMeasurementContentHash: base.contentHash,
      implementationContentHash: compilerImplementationContentHash,
      evidenceContentHashes: evidenceHashes.sort((left, right) =>
        left.localeCompare(right),
      ),
      exactSourceRgbaVerified: true as const,
      originalAndMaskedDistinct: true as const,
      semanticSupportRetained: true as const,
      guideTabPixelsRemoved: true as const,
      providerAuthority: false as const,
      approvalAuthority: false as const,
      capabilityAuthority: false as const,
      productionBindable: false as const,
    },
  };
  const { contentHash: _baseContentHash, ...withoutBaseHash } = draft;
  return candidateRigExactAttachmentMeasurementReportSchema.parse({
    ...withoutBaseHash,
    contentHash: hashCanonical(withoutBaseHash),
  });
};

const compilerImplementationContentHash = sha256(
  [
    readFileSync(fileURLToPath(import.meta.url), "utf8")
      .replaceAll("\r\n", "\n")
      .replaceAll("\r", "\n"),
    "source-kind:typescript-esm-lf-v1",
    COMPILER_ID,
    COMPILER_VERSION,
  ].join("\n"),
);
