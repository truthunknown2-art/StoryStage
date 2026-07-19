import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import {
  characterRigPreparationRecipeSchema,
  hashCanonical,
  kidsBipedV1TopologyTemplate,
} from "@storystage/story-engine";
import {
  candidateRigExactAttachmentMeasurementReportSchema,
  type CandidateRigExactAttachmentMeasurementReport,
} from "@storystage/story-engine/private-candidate-rig-registration";
import {
  isVerifiedCandidateRigReviewRuntimeInput,
  type CandidateRigReviewRuntimeInput,
} from "./candidate-rig-review-input";

const ALGORITHM_ID = "exact-alpha-edge-seam-measurement" as const;
const ALGORITHM_VERSION = "1.0.0" as const;
const CORE_ALPHA_THRESHOLD = 96;
const EDGE_SCAN_INSET = 1;
const MICRO = 1_000_000;
const MAX_PIXELS = 64_000_000;

type Side = "top" | "right" | "bottom" | "left";
type Point = { x: number; y: number };
type Run = { y: number; x: number; length: number };
type Mask = {
  width: number;
  height: number;
  runs: Run[];
  runLengthEncodingContentHash: string;
  pixelCount: number;
  bounds: { x: number; y: number; width: number; height: number } | null;
};
type RawCandidate = {
  id: string;
  side: Side;
  seed: Point;
  neckDepth: number;
  selected: Set<number>;
  retainedCore: Set<number>;
  semanticCoreOverlapPixelCount: number;
  seam: {
    side: Side;
    startMicropixels: Point;
    endMicropixels: Point;
    midpointMicropixels: Point;
    tangentMillionths: Point;
    outwardNormalMillionths: Point;
    widthMicropixels: number;
  };
};

const sha256 = (bytes: Uint8Array | string) =>
  createHash("sha256").update(bytes).digest("hex");

const alphaAt = (rgba: Buffer, width: number, x: number, y: number) =>
  rgba[(y * width + x) * 4 + 3]!;

const sideVectors: Record<Side, { outward: Point; tangent: Point }> = {
  top: { outward: { x: 0, y: -1 }, tangent: { x: 1, y: 0 } },
  right: { outward: { x: 1, y: 0 }, tangent: { x: 0, y: 1 } },
  bottom: { outward: { x: 0, y: 1 }, tangent: { x: -1, y: 0 } },
  left: { outward: { x: -1, y: 0 }, tangent: { x: 0, y: -1 } },
};

const boundsFor = (pixels: Set<number>, width: number) => {
  if (pixels.size === 0) return null;
  let left = width;
  let top = Number.MAX_SAFE_INTEGER;
  let right = -1;
  let bottom = -1;
  for (const pixel of pixels) {
    const x = pixel % width;
    const y = Math.floor(pixel / width);
    left = Math.min(left, x);
    top = Math.min(top, y);
    right = Math.max(right, x);
    bottom = Math.max(bottom, y);
  }
  return { x: left, y: top, width: right - left + 1, height: bottom - top + 1 };
};

const runsFor = (pixels: Set<number>, width: number, height: number): Run[] => {
  const runs: Run[] = [];
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
    }
  }
  return runs;
};

const maskFor = (pixels: Set<number>, width: number, height: number): Mask => {
  const runs = runsFor(pixels, width, height);
  return {
    width,
    height,
    runs,
    runLengthEncodingContentHash: hashCanonical(runs),
    pixelCount: pixels.size,
    bounds: boundsFor(pixels, width),
  };
};

const derivePlausibilityRegion = (
  support: Set<number>,
  width: number,
  height: number,
) => {
  const radiusPixels = Math.max(
    4,
    Math.min(16, Math.round(Math.max(width, height) * 0.02)),
  );
  const dilated = new Set<number>();
  for (const pixel of support) {
    const sourceX = pixel % width;
    const sourceY = Math.floor(pixel / width);
    for (
      let y = Math.max(0, sourceY - radiusPixels);
      y <= Math.min(height - 1, sourceY + radiusPixels);
      y += 1
    )
      for (
        let x = Math.max(0, sourceX - radiusPixels);
        x <= Math.min(width - 1, sourceX + radiusPixels);
        x += 1
      )
        dilated.add(y * width + x);
  }
  const supportMask = maskFor(support, width, height);
  const draft = {
    algorithm: {
      id: "support-mask-chebyshev-dilation" as const,
      version: "1.0.0" as const,
      radiusPixels,
    },
    sourceSupportRunLengthEncodingContentHash:
      supportMask.runLengthEncodingContentHash,
    mask: maskFor(dilated, width, height),
  };
  return { ...draft, contentHash: hashCanonical(draft) };
};

const stableAlphaBounds = (rgba: Buffer, width: number, height: number) => {
  let left = width;
  let top = height;
  let right = -1;
  let bottom = -1;
  for (let y = 0; y < height; y += 1)
    for (let x = 0; x < width; x += 1)
      if (alphaAt(rgba, width, x, y) >= CORE_ALPHA_THRESHOLD) {
        left = Math.min(left, x);
        top = Math.min(top, y);
        right = Math.max(right, x);
        bottom = Math.max(bottom, y);
      }
  return right < 0 ? null : { left, top, right, bottom };
};

const edgeSeeds = (
  rgba: Buffer,
  width: number,
  height: number,
): Array<{ side: Side; point: Point }> => {
  const bounds = stableAlphaBounds(rgba, width, height);
  if (!bounds) return [];
  const seeds: Array<{ side: Side; point: Point }> = [];
  for (const side of ["top", "right", "bottom", "left"] as const) {
    const horizontal = side === "top" || side === "bottom";
    const fixed = horizontal
      ? side === "top"
        ? Math.min(bounds.bottom, bounds.top + EDGE_SCAN_INSET)
        : Math.max(bounds.top, bounds.bottom - EDGE_SCAN_INSET)
      : side === "left"
        ? Math.min(bounds.right, bounds.left + EDGE_SCAN_INSET)
        : Math.max(bounds.left, bounds.right - EDGE_SCAN_INSET);
    const start = horizontal ? bounds.left : bounds.top;
    const end = horizontal ? bounds.right : bounds.bottom;
    let cursor = start;
    while (cursor <= end) {
      const alpha = (position: number) =>
        horizontal
          ? alphaAt(rgba, width, position, fixed)
          : alphaAt(rgba, width, fixed, position);
      while (cursor <= end && alpha(cursor) < CORE_ALPHA_THRESHOLD) cursor += 1;
      if (cursor > end) break;
      const runStart = cursor;
      while (cursor <= end && alpha(cursor) >= CORE_ALPHA_THRESHOLD)
        cursor += 1;
      const center = Math.round((runStart + cursor - 1) / 2);
      seeds.push({
        side,
        point: horizontal ? { x: center, y: fixed } : { x: fixed, y: center },
      });
    }
  }
  return seeds;
};

const flood = (input: {
  rgba: Buffer;
  width: number;
  height: number;
  seed: Point;
  cutBand: (x: number, y: number) => boolean;
}) => {
  const pixels = new Set<number>();
  const queue = [input.seed];
  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    const point = queue[cursor]!;
    if (
      point.x < 0 ||
      point.y < 0 ||
      point.x >= input.width ||
      point.y >= input.height
    )
      continue;
    const index = point.y * input.width + point.x;
    if (
      pixels.has(index) ||
      input.cutBand(point.x, point.y) ||
      alphaAt(input.rgba, input.width, point.x, point.y) === 0
    )
      continue;
    pixels.add(index);
    queue.push(
      { x: point.x - 1, y: point.y },
      { x: point.x + 1, y: point.y },
      { x: point.x, y: point.y - 1 },
      { x: point.x, y: point.y + 1 },
    );
  }
  return pixels;
};

const nearestAlphaSeed = (input: {
  rgba: Buffer;
  width: number;
  height: number;
  target: Point;
  accept: (x: number, y: number) => boolean;
}) => {
  const limit = Math.max(input.width, input.height);
  for (let distance = 0; distance <= limit; distance += 1)
    for (
      let y = Math.max(0, input.target.y - distance);
      y <= Math.min(input.height - 1, input.target.y + distance);
      y += 1
    )
      for (
        let x = Math.max(0, input.target.x - distance);
        x <= Math.min(input.width - 1, input.target.x + distance);
        x += 1
      )
        if (input.accept(x, y) && alphaAt(input.rgba, input.width, x, y) > 0)
          return { x, y };
  return null;
};

const deriveCandidate = (input: {
  id: string;
  side: Side;
  seed: Point;
  rgba: Buffer;
  width: number;
  height: number;
  supportCentroid: Point;
  supportPixelCount: number;
}): RawCandidate => {
  const vectors = sideVectors[input.side];
  const radius = Math.max(
    16,
    Math.min(160, Math.round(Math.min(input.width, input.height) * 0.45)),
  );
  const crossSection = (depth: number) => {
    let width = 0;
    for (let offset = -radius; offset <= radius; offset += 1) {
      const x =
        input.seed.x - vectors.outward.x * depth + vectors.tangent.x * offset;
      const y =
        input.seed.y - vectors.outward.y * depth + vectors.tangent.y * offset;
      if (
        x >= 0 &&
        y >= 0 &&
        x < input.width &&
        y < input.height &&
        alphaAt(input.rgba, input.width, x, y) > 0
      )
        width += 1;
    }
    return width;
  };
  const samples = Array.from({ length: radius + 1 }, (_, depth) => ({
    depth,
    width: crossSection(depth),
  }));
  const searchStart = Math.max(3, Math.round(radius * 0.1));
  const searchEnd = Math.max(searchStart + 1, Math.round(radius * 0.78));
  const growthWindow = Math.max(2, Math.min(6, Math.round(radius * 0.06)));
  const neck = samples
    .slice(searchStart, Math.max(searchStart, searchEnd - growthWindow) + 1)
    .map((sample) => ({
      sample,
      gain: samples[sample.depth + growthWindow]!.width - sample.width,
    }))
    .filter(
      (candidate) =>
        candidate.sample.width > 0 &&
        candidate.gain >= Math.max(4, Math.ceil(candidate.sample.width * 0.12)),
    )
    .sort((left, right) =>
      right.gain !== left.gain
        ? right.gain - left.gain
        : left.sample.depth - right.sample.depth,
    )[0]?.sample;
  if (!neck)
    throw new Error(
      `no abrupt alpha-neck growth (${samples.map((sample) => sample.width).join(",")})`,
    );
  const inward = (x: number, y: number) =>
    -(
      (x - input.seed.x) * vectors.outward.x +
      (y - input.seed.y) * vectors.outward.y
    );
  const cutBand = (x: number, y: number) =>
    inward(x, y) >= neck.depth - 1 && inward(x, y) <= neck.depth + 1;
  const distalSeed = nearestAlphaSeed({
    rgba: input.rgba,
    width: input.width,
    height: input.height,
    target: input.seed,
    accept: (x, y) => inward(x, y) < neck.depth - 1,
  });
  const coreSeed = nearestAlphaSeed({
    rgba: input.rgba,
    width: input.width,
    height: input.height,
    target: {
      x: Math.round(input.supportCentroid.x),
      y: Math.round(input.supportCentroid.y),
    },
    accept: (x, y) => !cutBand(x, y),
  });
  if (!distalSeed || !coreSeed)
    throw new Error("missing distal/core flood seed");
  const selected = flood({ ...input, seed: distalSeed, cutBand });
  const core = flood({ ...input, seed: coreSeed, cutBand });
  const overlap = [...selected].filter((pixel) => core.has(pixel)).length;
  if (
    overlap !== 0 ||
    selected.size < 4 ||
    selected.size >= core.size ||
    selected.size > input.supportPixelCount * 0.3
  )
    throw new Error("cut does not isolate a smaller distal support component");
  const selectedBounds = boundsFor(selected, input.width)!;
  const fillRatio =
    selected.size / (selectedBounds.width * selectedBounds.height);
  if (fillRatio < 0.55)
    throw new Error(
      `distal component fill ratio ${fillRatio.toFixed(4)} is not tab-like`,
    );
  const offsets: number[] = [];
  for (let offset = -radius; offset <= radius; offset += 1) {
    const x =
      input.seed.x -
      vectors.outward.x * neck.depth +
      vectors.tangent.x * offset;
    const y =
      input.seed.y -
      vectors.outward.y * neck.depth +
      vectors.tangent.y * offset;
    if (
      x >= 0 &&
      y >= 0 &&
      x < input.width &&
      y < input.height &&
      alphaAt(input.rgba, input.width, x, y) > 0
    )
      offsets.push(offset);
  }
  if (offsets.length === 0)
    throw new Error("derived seam has no alpha support");
  const runs: number[][] = [];
  for (const offset of offsets) {
    const current = runs.at(-1);
    if (!current || offset !== current.at(-1)! + 1) runs.push([offset]);
    else current.push(offset);
  }
  const seamOffsets = [...runs].sort((left, right) => {
    const leftDistance = Math.min(...left.map(Math.abs));
    const rightDistance = Math.min(...right.map(Math.abs));
    return leftDistance - rightDistance || right.length - left.length;
  })[0]!;
  const minimum = seamOffsets[0]! - 0.5;
  const maximum = seamOffsets.at(-1)! + 0.5;
  const center = {
    x: input.seed.x - vectors.outward.x * neck.depth,
    y: input.seed.y - vectors.outward.y * neck.depth,
  };
  const pointAt = (offset: number) => ({
    x: Math.round((center.x + vectors.tangent.x * offset) * MICRO),
    y: Math.round((center.y + vectors.tangent.y * offset) * MICRO),
  });
  const startMicropixels = pointAt(minimum);
  const endMicropixels = pointAt(maximum);
  return {
    id: input.id,
    side: input.side,
    seed: input.seed,
    neckDepth: neck.depth,
    selected,
    retainedCore: core,
    semanticCoreOverlapPixelCount: overlap,
    seam: {
      side: input.side,
      startMicropixels,
      endMicropixels,
      midpointMicropixels: {
        x: Math.round((startMicropixels.x + endMicropixels.x) / 2),
        y: Math.round((startMicropixels.y + endMicropixels.y) / 2),
      },
      tangentMillionths: {
        x: vectors.tangent.x * MICRO,
        y: vectors.tangent.y * MICRO,
      },
      outwardNormalMillionths: {
        x: vectors.outward.x * MICRO,
        y: vectors.outward.y * MICRO,
      },
      widthMicropixels: seamOffsets.length * MICRO,
    },
  };
};

const COMMON_CHILD_PROXIMAL_SIDE: Record<string, Side> = {
  pelvis: "top",
  head: "bottom",
  "ear-left": "bottom",
  "ear-right": "bottom",
  "upper-arm-left": "top",
  "lower-arm-left": "top",
  "hand-left": "top",
  "upper-arm-right": "top",
  "lower-arm-right": "top",
  "hand-right": "top",
  "upper-leg-left": "top",
  "lower-leg-left": "top",
  "foot-left": "top",
  "upper-leg-right": "top",
  "lower-leg-right": "top",
  "foot-right": "top",
  tail: "bottom",
};

const CHILD_PROXIMAL_SIDE_BY_VIEW: Record<
  "front" | "profile-left" | "profile-right",
  Record<string, Side>
> = {
  front: { ...COMMON_CHILD_PROXIMAL_SIDE },
  "profile-left": { ...COMMON_CHILD_PROXIMAL_SIDE },
  "profile-right": { ...COMMON_CHILD_PROXIMAL_SIDE },
};

const COMMON_CHAIN_PARENT_SOCKET_SIDE: Record<string, Side> = {
  "elbow-left": "bottom",
  "wrist-left": "bottom",
  "elbow-right": "bottom",
  "wrist-right": "bottom",
  "knee-left": "bottom",
  "ankle-left": "bottom",
  "knee-right": "bottom",
  "ankle-right": "bottom",
};

const PARENT_SOCKET_SIDE_BY_VIEW: Record<
  "front" | "profile-left" | "profile-right",
  Record<string, Side>
> = {
  front: {
    ...COMMON_CHAIN_PARENT_SOCKET_SIDE,
    pelvis: "bottom",
    neck: "top",
    "ear-left": "left",
    "ear-right": "right",
    "shoulder-left": "left",
    "shoulder-right": "right",
    "hip-left": "bottom",
    "hip-right": "bottom",
    "tail-base": "right",
  },
  "profile-left": {
    ...COMMON_CHAIN_PARENT_SOCKET_SIDE,
    pelvis: "bottom",
    neck: "top",
    "ear-left": "right",
    "ear-right": "right",
    "shoulder-left": "right",
    "shoulder-right": "right",
    "hip-left": "bottom",
    "hip-right": "bottom",
    "tail-base": "right",
  },
  "profile-right": {
    ...COMMON_CHAIN_PARENT_SOCKET_SIDE,
    pelvis: "bottom",
    neck: "top",
    "ear-left": "left",
    "ear-right": "left",
    "shoulder-left": "left",
    "shoulder-right": "left",
    "hip-left": "bottom",
    "hip-right": "bottom",
    "tail-base": "left",
  },
};

const ARTICULATED_ROLES = new Set(
  Object.keys(COMMON_CHILD_PROXIMAL_SIDE).concat("torso"),
);
const DECORATION_ROLES = new Set(["secondary-front", "secondary-back"]);

export class CandidateRigExactAttachmentMeasurementError extends Error {
  public constructor(
    public readonly code:
      | "unverified-input"
      | "lineage-mismatch"
      | "source-geometry-mismatch"
      | "invalid-report",
    message: string,
  ) {
    super(message);
    this.name = "CandidateRigExactAttachmentMeasurementError";
  }
}

/**
 * Measures exact, unresampled atlas RGBA before any mask or guide proposal.
 * Missing source geometry is represented by typed outcomes in the sealed
 * report; it never falls back to a bounding-box center or caller coordinate.
 */
export const createCandidateRigExactAttachmentMeasurement = async (input: {
  review: CandidateRigReviewRuntimeInput;
  recipe: unknown;
}): Promise<CandidateRigExactAttachmentMeasurementReport> => {
  if (!isVerifiedCandidateRigReviewRuntimeInput(input.review))
    throw new CandidateRigExactAttachmentMeasurementError(
      "unverified-input",
      "Exact attachment measurement requires the mechanically reopened runtime input.",
    );
  const recipe = characterRigPreparationRecipeSchema.parse(input.recipe);
  if (
    recipe.view !== input.review.view ||
    recipe.contentHash !== input.review.preparationRecipeContentHash
  )
    throw new CandidateRigExactAttachmentMeasurementError(
      "lineage-mismatch",
      "Exact attachment measurement recipe drifted from reopened atlas lineage.",
    );
  const atlasByCandidate = new Map(
    input.review.atlases.map((atlas) => [atlas.candidateId, atlas]),
  );
  const measuredComponents: Array<{
    component: (typeof recipe.parts)[number];
    sourceRgbaContentHash: string;
    supportMask: Mask;
    coreMask: Mask;
    plausibilityRegion: ReturnType<typeof derivePlausibilityRegion>;
    rawCandidates: RawCandidate[];
    rejectedCandidateReasons: string[];
  }> = [];
  for (const component of recipe.parts) {
    const atlas = atlasByCandidate.get(component.source.candidateId);
    if (!atlas || atlas.contentHash !== component.source.stagedContentHash)
      throw new CandidateRigExactAttachmentMeasurementError(
        "lineage-mismatch",
        `Exact source atlas is unavailable for ${component.role}.`,
      );
    const { data: rgba, info } = await sharp(atlas.rgbaPixels, {
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
      info.width !== component.source.rect.width ||
      info.height !== component.source.rect.height ||
      info.channels !== 4
    )
      throw new CandidateRigExactAttachmentMeasurementError(
        "source-geometry-mismatch",
        `Exact RGBA crop drifted for ${component.role}.`,
      );
    const support = new Set<number>();
    const core = new Set<number>();
    let centroidX = 0;
    let centroidY = 0;
    for (let y = 0; y < info.height; y += 1)
      for (let x = 0; x < info.width; x += 1) {
        const alpha = alphaAt(rgba, info.width, x, y);
        if (alpha > 0) {
          support.add(y * info.width + x);
          centroidX += x;
          centroidY += y;
        }
        if (alpha >= CORE_ALPHA_THRESHOLD) core.add(y * info.width + x);
      }
    if (support.size === 0 || core.size === 0)
      throw new CandidateRigExactAttachmentMeasurementError(
        "source-geometry-mismatch",
        `Exact RGBA crop for ${component.role} has no alpha support/core.`,
      );
    const rawCandidates: RawCandidate[] = [];
    const rejectedCandidateReasons: string[] = [];
    const exactMaskHashes = new Set<string>();
    for (const [index, seed] of edgeSeeds(
      rgba,
      info.width,
      info.height,
    ).entries()) {
      try {
        const candidate = deriveCandidate({
          id: `${component.id}-${seed.side}-${String(index + 1).padStart(2, "0")}`,
          side: seed.side,
          seed: seed.point,
          rgba,
          width: info.width,
          height: info.height,
          supportCentroid: {
            x: centroidX / support.size,
            y: centroidY / support.size,
          },
          supportPixelCount: support.size,
        });
        const maskHash = hashCanonical(
          [...candidate.selected].sort((left, right) => left - right),
        );
        if (!exactMaskHashes.has(maskHash)) {
          exactMaskHashes.add(maskHash);
          rawCandidates.push(candidate);
        }
      } catch (error) {
        rejectedCandidateReasons.push(
          `${component.id}:${seed.side}:${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }
    measuredComponents.push({
      component,
      sourceRgbaContentHash: sha256(rgba),
      supportMask: maskFor(support, info.width, info.height),
      coreMask: maskFor(core, info.width, info.height),
      plausibilityRegion: derivePlausibilityRegion(
        support,
        info.width,
        info.height,
      ),
      rawCandidates,
      rejectedCandidateReasons: rejectedCandidateReasons.sort(),
    });
  }

  const classified = new Map<string, Map<string, RawCandidate>>();
  const physicalCandidateIdByClassified = new Map<string, string>();
  const requirements: CandidateRigExactAttachmentMeasurementReport["requirements"] =
    [];
  const classify = (
    measured: (typeof measuredComponents)[number],
    raw: RawCandidate,
    featureClass:
      | "articulation-proximal"
      | "articulation-distal"
      | "rigid-registration"
      | "mask-only",
  ) => {
    const id = `${raw.id}-${featureClass}`;
    const byId =
      classified.get(measured.component.id) ?? new Map<string, RawCandidate>();
    byId.set(id, raw);
    classified.set(measured.component.id, byId);
    physicalCandidateIdByClassified.set(id, raw.id);
    return id;
  };
  const measuredByRole = new Map<string, (typeof measuredComponents)[number]>(
    measuredComponents.map((measured) => [measured.component.role, measured]),
  );
  const outcomeFor = (
    measured: (typeof measuredComponents)[number] | undefined,
    side: Side | undefined,
    featureClass:
      | "articulation-proximal"
      | "articulation-distal"
      | "rigid-registration"
      | "mask-only",
    detail: string,
  ) => {
    if (!measured)
      return {
        status: "missing" as const,
        reasonCode: "missing-feature" as const,
        detail,
      };
    const matches = side
      ? measured.rawCandidates.filter((candidate) => candidate.side === side)
      : measured.rawCandidates;
    if (matches.length === 0)
      return {
        status: "missing" as const,
        reasonCode: "missing-feature" as const,
        detail,
      };
    const candidateIds = matches.map((candidate) =>
      classify(measured, candidate, featureClass),
    );
    return candidateIds.length === 1
      ? { status: "detected" as const, candidateIds }
      : {
          status: "ambiguous" as const,
          reasonCode: "ambiguous-feature" as const,
          candidateIds,
          detail,
        };
  };

  for (const topology of kidsBipedV1TopologyTemplate.parts) {
    if (!ARTICULATED_ROLES.has(topology.role) || topology.parentRole === null)
      continue;
    const edge = {
      parentRole: topology.parentRole,
      childRole: topology.role,
      socketId: topology.parentSocketId!,
    };
    requirements.push({
      requirementId: `${recipe.view}-${topology.role}-proximal`,
      featureClass: "articulation-proximal",
      componentRole: topology.role,
      topologyEdge: edge,
      outcome: outcomeFor(
        measuredByRole.get(topology.role),
        CHILD_PROXIMAL_SIDE_BY_VIEW[recipe.view][topology.role],
        "articulation-proximal",
        `No unique coordinate-free proximal seam is present for ${topology.role}.`,
      ),
    });
    requirements.push({
      requirementId: `${recipe.view}-${topology.parentRole}-${topology.parentSocketId}-distal`,
      featureClass: "articulation-distal",
      componentRole: topology.parentRole,
      topologyEdge: edge,
      outcome: outcomeFor(
        measuredByRole.get(topology.parentRole),
        PARENT_SOCKET_SIDE_BY_VIEW[recipe.view][topology.parentSocketId!],
        "articulation-distal",
        `No unique coordinate-free parent seam is present for ${topology.parentRole}:${topology.parentSocketId}.`,
      ),
    });
  }

  requirements.push({
    requirementId: `${recipe.view}-torso-rigid-root`,
    featureClass: "rigid-registration",
    componentRole: "torso",
    topologyEdge: null,
    outcome: {
      status: "insufficient",
      reasonCode: "insufficient-feature",
      detail:
        "Root translation requires an explicit unapproved rigid proposal; alpha centroid has no registration authority.",
    },
  });
  for (const role of DECORATION_ROLES) {
    const measured = measuredByRole.get(role);
    requirements.push({
      requirementId: `${recipe.view}-${role}-rigid`,
      featureClass: "rigid-registration",
      componentRole: role,
      topologyEdge: null,
      outcome: {
        status: "insufficient",
        reasonCode: "insufficient-feature",
        detail:
          "Rigid decoration needs an authority-false translation proposal and must inherit parent rotation/scale.",
      },
    });
    requirements.push({
      requirementId: `${recipe.view}-${role}-mask`,
      featureClass: "mask-only",
      componentRole: role,
      topologyEdge: null,
      outcome: measured
        ? {
            status: "alpha-indistinguishable",
            reasonCode: "alpha-indistinguishable-mask",
            detail:
              "Decorative scarf support blends into semantic artwork; alpha alone cannot authorize a hinge or complete mask.",
          }
        : {
            status: "missing",
            reasonCode: "missing-feature",
            detail: "Decoration source component is missing.",
          },
    });
  }
  for (const measured of measuredComponents)
    if (
      !ARTICULATED_ROLES.has(measured.component.role) &&
      !DECORATION_ROLES.has(measured.component.role)
    )
      requirements.push({
        requirementId: `${recipe.view}-${measured.component.role}-rigid`,
        featureClass: "rigid-registration",
        componentRole: measured.component.role,
        topologyEdge: null,
        outcome: {
          status: "insufficient",
          reasonCode: "insufficient-feature",
          detail:
            "Rigid overlay requires an authority-false registration proposal; alpha centroid cannot grant transform authority.",
        },
      });

  const mechanicallyDetectedUses = new Map<
    string,
    CandidateRigExactAttachmentMeasurementReport["requirements"]
  >();
  for (const requirement of requirements) {
    if (requirement.outcome.status !== "detected") continue;
    for (const candidateId of requirement.outcome.candidateIds) {
      const physicalId = physicalCandidateIdByClassified.get(candidateId);
      if (!physicalId) continue;
      const uses = mechanicallyDetectedUses.get(physicalId) ?? [];
      uses.push(requirement);
      mechanicallyDetectedUses.set(physicalId, uses);
    }
  }
  for (const [physicalId, uses] of mechanicallyDetectedUses)
    if (uses.length > 1)
      for (const requirement of uses)
        requirement.outcome = {
          status: "insufficient",
          reasonCode: "insufficient-feature",
          detail: `Exact feature ${physicalId} cannot mechanically own multiple semantic attachment requirements; a reviewed shared-profile-coordinate proposal is required.`,
        };

  const components = measuredComponents
    .map((measured) => ({
      componentId: measured.component.id,
      semanticRole: measured.component.role,
      sourceCandidateId: measured.component.source.candidateId,
      sourceContentHash: measured.component.source.stagedContentHash,
      sourceRgbaContentHash: measured.sourceRgbaContentHash,
      sourceRect: { ...measured.component.source.rect },
      supportMask: measured.supportMask,
      coreMask: measured.coreMask,
      plausibilityRegion: measured.plausibilityRegion,
      candidates: [...(classified.get(measured.component.id) ?? new Map())]
        .map(([candidateId, raw]) => ({
          candidateId,
          componentId: measured.component.id,
          semanticRole: measured.component.role,
          featureClass: candidateId.endsWith("articulation-proximal")
            ? ("articulation-proximal" as const)
            : candidateId.endsWith("articulation-distal")
              ? ("articulation-distal" as const)
              : candidateId.endsWith("rigid-registration")
                ? ("rigid-registration" as const)
                : ("mask-only" as const),
          sourceRgbaContentHash: measured.sourceRgbaContentHash,
          physicalFeatureContentHash: hashCanonical({
            componentId: measured.component.id,
            sourceRgbaContentHash: measured.sourceRgbaContentHash,
            seed: {
              side: raw.side,
              x: raw.seed.x,
              y: raw.seed.y,
              stableAlphaThreshold: CORE_ALPHA_THRESHOLD,
              edgeScanInsetPixels: EDGE_SCAN_INSET,
            },
            seam: raw.seam,
            selectedSupport: maskFor(
              raw.selected,
              measured.component.source.rect.width,
              measured.component.source.rect.height,
            ),
          }),
          sourceRect: { ...measured.component.source.rect },
          seed: {
            side: raw.side,
            x: raw.seed.x,
            y: raw.seed.y,
            stableAlphaThreshold: CORE_ALPHA_THRESHOLD as 96,
            edgeScanInsetPixels: EDGE_SCAN_INSET as 1,
          },
          seam: raw.seam,
          selectedSupport: maskFor(
            raw.selected,
            measured.component.source.rect.width,
            measured.component.source.rect.height,
          ),
          retainedSemanticCore: maskFor(
            raw.retainedCore,
            measured.component.source.rect.width,
            measured.component.source.rect.height,
          ),
          semanticCoreOverlapPixelCount: raw.semanticCoreOverlapPixelCount,
          derivedBeforeMasking: true as const,
          guideCoordinatesUsed: false as const,
          transformAuthority: false as const,
        }))
        .sort((left, right) =>
          left.candidateId.localeCompare(right.candidateId),
        ),
      rejectedCandidateReasons: measured.rejectedCandidateReasons,
    }))
    .sort((left, right) => left.componentId.localeCompare(right.componentId));
  const blockerRequirementIds = requirements
    .filter((requirement) => requirement.outcome.status !== "detected")
    .map((requirement) => requirement.requirementId)
    .sort((left, right) => left.localeCompare(right));
  const firstProgram = input.review.program;
  const draft = {
    schemaVersion: "1.0" as const,
    reportKind: "candidate-rig-exact-attachment-measurement" as const,
    authorityDomain: "private-source-review-registration" as const,
    reportId: `candidate-i-${recipe.view}-exact-attachment`,
    view: recipe.view,
    status:
      blockerRequirementIds.length === 0
        ? ("ready-for-unapproved-proposal" as const)
        : ("blocked-source-geometry" as const),
    lineage: {
      requestContentHash: firstProgram.requestContentHash,
      candidateBundleContentHash: firstProgram.candidateBundleContentHash,
      stagingReportContentHash: firstProgram.stagingReportContentHash,
      importReceiptContentHash: firstProgram.importReceiptContentHash,
      preparationRecipeContentHash: recipe.contentHash,
      topologyTemplateContentHash: kidsBipedV1TopologyTemplate.contentHash,
    },
    atlases: input.review.atlases
      .map((atlas) => ({
        kind: atlas.kind,
        candidateId: atlas.candidateId,
        sourceContentHash: atlas.contentHash,
        sourceRgbaContentHash: atlas.rgbaContentHash,
        width: atlas.width,
        height: atlas.height,
        channels: 4 as const,
        decodedWithoutResampling: true as const,
      }))
      .sort((left, right) => left.kind.localeCompare(right.kind)),
    algorithm: {
      id: ALGORITHM_ID,
      version: ALGORITHM_VERSION,
      implementationContentHash: algorithmImplementationContentHash,
      classificationContractContentHash,
      decoderContractContentHash,
    },
    components,
    requirements: requirements.sort((left, right) =>
      left.requirementId.localeCompare(right.requirementId),
    ),
    blockerRequirementIds,
    sourceMeasuredBeforeMasking: true as const,
    guideCoordinatesUsedForMeasurement: false as const,
    proposedRegistrationAuthority: false as const,
    approvalAuthority: false as const,
    capabilityAuthority: false as const,
    productionBindable: false as const,
  };
  return candidateRigExactAttachmentMeasurementReportSchema.parse({
    ...draft,
    contentHash: hashCanonical(draft),
  });
};

const classificationContractContentHash = hashCanonical({
  id: "candidate-rig-attachment-classification-contract",
  version: "1.0.0",
  topologyTemplateContentHash: kidsBipedV1TopologyTemplate.contentHash,
  childProximalSidesByView: CHILD_PROXIMAL_SIDE_BY_VIEW,
  parentSocketSidesByView: PARENT_SOCKET_SIDE_BY_VIEW,
  articulatedRoles: [...ARTICULATED_ROLES].sort(),
  decorationRoles: [...DECORATION_ROLES].sort(),
  physicalFeatureAssignment:
    "injective-unless-reviewed-shared-profile-coordinate",
  guideCoordinatesUsed: false,
});

const decoderContractContentHash = hashCanonical({
  id: "candidate-rig-exact-rgba-decoder-contract",
  version: "1.0.0",
  sharpVersion: "0.34.5",
  input: "exact-png-bytes",
  decode: "sharp-ensure-alpha-raw-rgba",
  animated: false,
  resize: false,
  transform: false,
  channels: 4,
});

const algorithmImplementationContentHash = sha256(
  [
    readFileSync(fileURLToPath(import.meta.url), "utf8")
      .replaceAll("\r\n", "\n")
      .replaceAll("\r", "\n"),
    "source-kind:typescript-esm-lf-v1",
    ALGORITHM_ID,
    ALGORITHM_VERSION,
    classificationContractContentHash,
    decoderContractContentHash,
  ].join("\n"),
);
