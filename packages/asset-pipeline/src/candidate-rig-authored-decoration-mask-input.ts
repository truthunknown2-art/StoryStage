import { createHash } from "node:crypto";
import { lstat, open, realpath } from "node:fs/promises";
import { isAbsolute, relative, resolve } from "node:path";
import sharp from "sharp";
import {
  characterRigPreparationRecipeSchema,
  hashCanonical,
} from "@storystage/story-engine";
import {
  candidateRigAuthoredDecorationMaskManifestSchema,
  candidateRigAuthoredIsolatedMaskEvidenceSchema,
  candidateRigExactAttachmentMeasurementReportSchema,
  type CandidateRigAuthoredDecorationMaskManifest,
  type CandidateRigAuthoredIsolatedMaskEvidence,
} from "@storystage/story-engine/private-candidate-rig-registration";
import type { CandidateRigAuthoredIsolatedMaskInput } from "./candidate-rig-authored-isolated-mask-measurement";
import {
  isVerifiedCandidateRigReviewRuntimeInput,
  type CandidateRigReviewRuntimeInput,
} from "./candidate-rig-review-input";

const MAX_MASK_BYTES = 2 * 1024 * 1024;
const MAX_PIXELS = 64_000_000;

type Mask = CandidateRigAuthoredIsolatedMaskEvidence["guideTabMask"];

const sha256 = (bytes: Uint8Array) =>
  createHash("sha256").update(bytes).digest("hex");

const isWithin = (root: string, candidate: string) => {
  const delta = relative(root, candidate);
  return delta === "" || (!delta.startsWith("..") && !isAbsolute(delta));
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

const pointIndex = (point: { x: number; y: number }, width: number) =>
  point.y * width + point.x;

export class CandidateRigAuthoredDecorationMaskInputError extends Error {
  public constructor(
    public readonly code:
      | "unverified-input"
      | "invalid-manifest"
      | "unsafe-mask-root"
      | "lineage-mismatch"
      | "invalid-mask-png"
      | "invalid-mask-pixels"
      | "sentinel-mismatch",
    message: string,
  ) {
    super(message);
    this.name = "CandidateRigAuthoredDecorationMaskInputError";
  }
}

const stableMaskFile = async (root: string, relativeFile: string) => {
  const file = resolve(root, relativeFile);
  if (!isWithin(root, file))
    throw new CandidateRigAuthoredDecorationMaskInputError(
      "unsafe-mask-root",
      "Authored decoration mask escaped its fixed manifest root.",
    );
  const pathInfo = await lstat(file);
  if (pathInfo.isSymbolicLink())
    throw new CandidateRigAuthoredDecorationMaskInputError(
      "unsafe-mask-root",
      "Authored decoration masks cannot be symbolic links.",
    );
  const canonicalFile = await realpath(file);
  if (!isWithin(root, canonicalFile))
    throw new CandidateRigAuthoredDecorationMaskInputError(
      "unsafe-mask-root",
      "Authored decoration mask resolves outside its fixed manifest root.",
    );
  const handle = await open(canonicalFile, "r");
  try {
    const before = await handle.stat();
    if (!before.isFile() || before.size <= 0 || before.size > MAX_MASK_BYTES)
      throw new CandidateRigAuthoredDecorationMaskInputError(
        "invalid-mask-png",
        "Authored decoration mask must be a bounded non-empty regular PNG.",
      );
    const bytes = await handle.readFile();
    const after = await handle.stat();
    if (
      bytes.length !== before.size ||
      before.dev !== after.dev ||
      before.ino !== after.ino ||
      before.size !== after.size ||
      before.mtimeMs !== after.mtimeMs ||
      before.ctimeMs !== after.ctimeMs
    )
      throw new CandidateRigAuthoredDecorationMaskInputError(
        "invalid-mask-png",
        "Authored decoration mask changed while it was reopened.",
      );
    return bytes;
  } finally {
    await handle.close();
  }
};

const decodeBinaryMask = async (
  bytes: Buffer,
  entry: CandidateRigAuthoredDecorationMaskManifest["entries"][number],
) => {
  const image = sharp(bytes, { failOn: "error", limitInputPixels: MAX_PIXELS });
  const metadata = await image.metadata();
  if (
    metadata.format !== "png" ||
    (metadata.pages ?? 1) !== 1 ||
    metadata.width !== entry.maskWidth ||
    metadata.height !== entry.maskHeight ||
    metadata.isPalette !== true ||
    metadata.bitsPerSample !== entry.bitsPerSample ||
    (metadata as typeof metadata & { paletteBitDepth?: number })
      .paletteBitDepth !== entry.paletteBitDepth ||
    metadata.hasAlpha === true
  )
    throw new CandidateRigAuthoredDecorationMaskInputError(
      "invalid-mask-png",
      "Authored decoration guide mask must be an exact-size opaque 1-bit palette PNG.",
    );
  const { data, info } = await image
    .raw()
    .toBuffer({ resolveWithObject: true });
  if (
    info.width !== entry.maskWidth ||
    info.height !== entry.maskHeight ||
    (info.channels !== 3 && info.channels !== 1)
  )
    throw new CandidateRigAuthoredDecorationMaskInputError(
      "invalid-mask-png",
      "Authored decoration guide mask did not decode to exact native pixels.",
    );
  const selected = new Set<number>();
  for (let pixel = 0; pixel < info.width * info.height; pixel += 1) {
    const value = data[pixel * info.channels]!;
    if (
      (value !== entry.unselectedPixelValue &&
        value !== entry.selectedPixelValue) ||
      (info.channels === 3 &&
        (data[pixel * 3 + 1] !== value || data[pixel * 3 + 2] !== value))
    )
      throw new CandidateRigAuthoredDecorationMaskInputError(
        "invalid-mask-pixels",
        "Authored decoration guide mask contains a non-binary or colored pixel.",
      );
    if (value === entry.selectedPixelValue) selected.add(pixel);
  }
  return selected;
};

export type CandidateRigAuthoredDecorationMaskSourceInput = {
  manifest: CandidateRigAuthoredDecorationMaskManifest;
  view: "front" | "profile-left" | "profile-right";
  authoredMasks: CandidateRigAuthoredIsolatedMaskInput[];
  evidenceContentHashes: string[];
  maskPngContentHashes: string[];
  sourceMeasuredBeforeMasking: true;
  providerAuthority: false;
  approvalAuthority: false;
  capabilityAuthority: false;
  productionBindable: false;
};

/**
 * Reopens six fixed authored 1-bit guide masks as exact, authority-false v1.1
 * compiler inputs. The builder never infers pixels from color or connectivity.
 */
export const createCandidateRigAuthoredDecorationMaskSourceInput =
  async (input: {
    review: CandidateRigReviewRuntimeInput;
    recipe: unknown;
    baseMeasurement: unknown;
    sourceReviewInput: unknown;
    manifest: unknown;
    manifestRoot: string;
  }): Promise<CandidateRigAuthoredDecorationMaskSourceInput> => {
    if (!isVerifiedCandidateRigReviewRuntimeInput(input.review))
      throw new CandidateRigAuthoredDecorationMaskInputError(
        "unverified-input",
        "Authored decoration masks require mechanically reopened runtime input.",
      );
    let manifest: CandidateRigAuthoredDecorationMaskManifest;
    try {
      manifest = candidateRigAuthoredDecorationMaskManifestSchema.parse(
        input.manifest,
      );
    } catch (error) {
      throw new CandidateRigAuthoredDecorationMaskInputError(
        "invalid-manifest",
        `Authored decoration mask manifest is invalid: ${error instanceof Error ? error.message : "unknown schema failure"}`,
      );
    }
    const recipe = characterRigPreparationRecipeSchema.parse(input.recipe);
    const base = candidateRigExactAttachmentMeasurementReportSchema.parse(
      input.baseMeasurement,
    );
    if (
      manifest.sourceReviewInputContentHash !==
        hashCanonical(input.sourceReviewInput) ||
      base.schemaVersion !== "1.0" ||
      base.authoredMaskCompiler !== undefined ||
      input.review.view !== recipe.view ||
      base.view !== recipe.view ||
      input.review.preparationRecipeContentHash !== recipe.contentHash ||
      base.lineage.preparationRecipeContentHash !== recipe.contentHash
    )
      throw new CandidateRigAuthoredDecorationMaskInputError(
        "lineage-mismatch",
        "Authored decoration manifest, review input, recipe, and v1.0 measurement do not share exact lineage.",
      );
    const rootInfo = await lstat(resolve(input.manifestRoot));
    if (rootInfo.isSymbolicLink() || !rootInfo.isDirectory())
      throw new CandidateRigAuthoredDecorationMaskInputError(
        "unsafe-mask-root",
        "Authored decoration mask root must be a real directory.",
      );
    const manifestRoot = await realpath(resolve(input.manifestRoot));
    const entries = manifest.entries.filter(
      (entry) => entry.view === input.review.view,
    );
    if (entries.length !== 2)
      throw new CandidateRigAuthoredDecorationMaskInputError(
        "lineage-mismatch",
        "Authored decoration manifest must provide both exact roles for the native view.",
      );
    const atlasByCandidate = new Map(
      input.review.atlases.map((atlas) => [atlas.candidateId, atlas]),
    );
    const authoredMasks: CandidateRigAuthoredIsolatedMaskInput[] = [];
    const evidenceContentHashes: string[] = [];
    const maskPngContentHashes: string[] = [];
    for (const entry of entries) {
      const component = base.components.find(
        (candidate) => candidate.componentId === entry.componentId,
      );
      const recipePart = recipe.parts.find(
        (part) => part.id === entry.componentId,
      );
      const requirement = base.requirements.find(
        (candidate) =>
          candidate.requirementId ===
          `${entry.view}-${entry.componentRole}-mask`,
      );
      const atlas = atlasByCandidate.get(entry.sourceCandidateId);
      if (
        entry.baseMeasurementContentHash !== base.contentHash ||
        !component ||
        component.semanticRole !== entry.componentRole ||
        !recipePart ||
        recipePart.role !== entry.componentRole ||
        !requirement ||
        requirement.featureClass !== "mask-only" ||
        requirement.outcome.status !== "alpha-indistinguishable" ||
        !atlas ||
        component.sourceCandidateId !== entry.sourceCandidateId ||
        recipePart.source.candidateId !== entry.sourceCandidateId ||
        component.sourceContentHash !== entry.sourceContentHash ||
        recipePart.source.stagedContentHash !== entry.sourceContentHash ||
        atlas.contentHash !== entry.sourceContentHash ||
        component.sourceRgbaContentHash !== entry.sourceRgbaContentHash ||
        hashCanonical(component.sourceRect) !==
          hashCanonical(entry.sourceRect) ||
        hashCanonical(recipePart.source.rect) !==
          hashCanonical(entry.sourceRect)
      )
        throw new CandidateRigAuthoredDecorationMaskInputError(
          "lineage-mismatch",
          `Authored decoration entry ${entry.entryId} does not bind its exact unresolved component crop.`,
        );
      const original = exactCrop(atlas, entry.sourceRect);
      if (sha256(original) !== entry.sourceRgbaContentHash)
        throw new CandidateRigAuthoredDecorationMaskInputError(
          "lineage-mismatch",
          `Authored decoration entry ${entry.entryId} source RGBA changed.`,
        );
      const maskBytes = await stableMaskFile(
        manifestRoot,
        entry.maskRelativeFile,
      );
      if (sha256(maskBytes) !== entry.maskPngContentHash)
        throw new CandidateRigAuthoredDecorationMaskInputError(
          "invalid-mask-png",
          `Authored decoration entry ${entry.entryId} PNG hash changed.`,
        );
      const selected = await decodeBinaryMask(maskBytes, entry);
      const selectedMask = maskFor(selected, entry.maskWidth, entry.maskHeight);
      const withinAuthoredRegion = (pixel: number) => {
        const x = pixel % entry.maskWidth;
        const y = Math.floor(pixel / entry.maskWidth);
        return entry.authoredRegions.some(
          (rect) =>
            x >= rect.x &&
            y >= rect.y &&
            x < rect.x + rect.width &&
            y < rect.y + rect.height,
        );
      };
      if (
        selectedMask.pixelCount !== entry.selectedPixelCount ||
        hashCanonical(selectedMask.bounds) !==
          hashCanonical(entry.selectedBounds) ||
        [...selected].some(
          (pixel) =>
            !withinAuthoredRegion(pixel) || original[pixel * 4 + 3] === 0,
        ) ||
        entry.selectedGuideSeeds.length !== entry.authoredRegions.length ||
        entry.selectedGuideSeeds.some(
          (point, index) =>
            !selected.has(pointIndex(point, entry.maskWidth)) ||
            !(() => {
              const rect = entry.authoredRegions[index]!;
              return (
                point.x >= rect.x &&
                point.y >= rect.y &&
                point.x < rect.x + rect.width &&
                point.y < rect.y + rect.height
              );
            })(),
        )
      )
        throw new CandidateRigAuthoredDecorationMaskInputError(
          "invalid-mask-pixels",
          `Authored decoration entry ${entry.entryId} mask escaped its exact regions, source support, bounds, or seeds.`,
        );
      const retainedSentinelsValid = entry.retainedSemanticSentinels.every(
        (point) => {
          const pixel = pointIndex(point, entry.maskWidth);
          return original[pixel * 4 + 3]! > 0 && !selected.has(pixel);
        },
      );
      const transparentSentinelsValid = entry.transparentSentinels.every(
        (point) => {
          const pixel = pointIndex(point, entry.maskWidth);
          return original[pixel * 4 + 3] === 0 && !selected.has(pixel);
        },
      );
      if (!retainedSentinelsValid || !transparentSentinelsValid)
        throw new CandidateRigAuthoredDecorationMaskInputError(
          "sentinel-mismatch",
          `Authored decoration entry ${entry.entryId} semantic or transparent sentinel changed.`,
        );
      const retained = new Set<number>();
      const masked = Buffer.from(original);
      for (let pixel = 0; pixel < original.length / 4; pixel += 1) {
        if (original[pixel * 4 + 3] === 0) continue;
        if (selected.has(pixel)) masked.fill(0, pixel * 4, pixel * 4 + 4);
        else retained.add(pixel);
      }
      const evidenceDraft = {
        schemaVersion: "1.1" as const,
        evidenceKind: "candidate-rig-authored-isolated-mask-evidence" as const,
        authorityDomain: "private-source-review-registration" as const,
        evidenceId: entry.entryId,
        baseMeasurementContentHash: base.contentHash,
        view: entry.view,
        componentId: entry.componentId,
        componentRole: entry.componentRole,
        sourceCandidateId: entry.sourceCandidateId,
        sourceContentHash: entry.sourceContentHash,
        sourceRgbaContentHash: entry.sourceRgbaContentHash,
        sourceRect: entry.sourceRect,
        maskedRgbaContentHash: sha256(masked),
        guideTabMask: selectedMask,
        retainedSemanticSupportMask: maskFor(
          retained,
          entry.maskWidth,
          entry.maskHeight,
        ),
        sourceManifestContentHash: manifest.contentHash,
        guideMaskPngContentHash: entry.maskPngContentHash,
        authoredRegionsContentHash: hashCanonical(entry.authoredRegions),
        sentinelsContentHash: hashCanonical({
          selectedGuideSeeds: entry.selectedGuideSeeds,
          retainedSemanticSentinels: entry.retainedSemanticSentinels,
          transparentSentinels: entry.transparentSentinels,
        }),
        sourceMeasuredBeforeMasking: true as const,
        maskOnly: true as const,
        providerAuthority: false as const,
        approvalAuthority: false as const,
        capabilityAuthority: false as const,
        productionBindable: false as const,
      };
      const evidence = candidateRigAuthoredIsolatedMaskEvidenceSchema.parse({
        ...evidenceDraft,
        contentHash: hashCanonical(evidenceDraft),
      });
      authoredMasks.push({ evidence, maskedRgbaPixels: masked });
      evidenceContentHashes.push(evidence.contentHash);
      maskPngContentHashes.push(entry.maskPngContentHash);
    }
    authoredMasks.sort((left, right) => {
      const leftEvidence =
        left.evidence as CandidateRigAuthoredIsolatedMaskEvidence;
      const rightEvidence =
        right.evidence as CandidateRigAuthoredIsolatedMaskEvidence;
      return leftEvidence.evidenceId.localeCompare(rightEvidence.evidenceId);
    });
    return {
      manifest,
      view: input.review.view,
      authoredMasks,
      evidenceContentHashes: evidenceContentHashes.sort((left, right) =>
        left.localeCompare(right),
      ),
      maskPngContentHashes: maskPngContentHashes.sort((left, right) =>
        left.localeCompare(right),
      ),
      sourceMeasuredBeforeMasking: true,
      providerAuthority: false,
      approvalAuthority: false,
      capabilityAuthority: false,
      productionBindable: false,
    };
  };
