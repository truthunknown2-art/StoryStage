import { createHash } from "node:crypto";
import sharp from "sharp";
import {
  candidateRigRegistrationAnnotationMapSchema,
  candidateRigRegistrationMeasurementAlgorithmContract,
  candidateRigRegistrationMeasurementProgramSchema,
  candidateRigRegistrationMeasurementReportSchema,
  characterRigAssetRequestSchema,
  characterRigCandidateBundleSchema,
  characterRigImportReceiptSchema,
  characterRigStagingReportSchema,
  compileCandidateRigRegistrationMeasurementProgram,
  hashCanonical,
  kidsBipedV1TopologyTemplate,
  prestonCandidateRigRegistrationAnnotationReviewSchema,
  turnaroundViewCoverageEvidenceSchema,
  validateCandidateRigRegistrationMeasurementClaimBindings,
  validateCharacterRigImportReceipt,
  type CandidateRigRegistrationMeasurementReportClaim,
} from "@storystage/story-engine";
import { decodeCandidateRigReviewPng } from "./candidate-rig-review-raster";
import {
  isAcceptedPrestonCandidateRigRegistrationReviewReceipt,
  unwrapAcceptedPrestonCandidateRigRegistrationReview,
} from "./candidate-rig-registration-review-store";

const MICRO = 1_000_000;
const MAX_PIXELS = 64_000_000;

type View = "front" | "profile-left" | "profile-right";
type AtlasKind = "parts" | "face";
type Rect = { x: number; y: number; width: number; height: number };
type Point = { x: number; y: number };

export type CandidateRigRegistrationAtlasRaster = {
  candidateId: string;
  bytes: Uint8Array;
};

export type CreateTrustedCandidateRigRegistrationMeasurementInput = {
  request: unknown;
  bundle: unknown;
  stagingReport: unknown;
  importReceipt: unknown;
  measurementProgram: unknown;
  atlasRasters: CandidateRigRegistrationAtlasRaster[];
  turnaroundSourceBytes: Uint8Array;
  turnaroundCoverageEvidenceBytes: Uint8Array;
  annotationMap: unknown;
  prestonReviewReceipt: unknown;
};

export class CandidateRigRegistrationMeasurementError extends Error {
  public constructor(
    public readonly code:
      | "invalid-evidence"
      | "lineage-mismatch"
      | "hash-mismatch"
      | "dimension-mismatch"
      | "map-mismatch"
      | "selector-unavailable"
      | "empty-foreground"
      | "fit-failed"
      | "non-quantized"
      | "occlusion-invalid",
    message: string,
  ) {
    super(message);
    this.name = "CandidateRigRegistrationMeasurementError";
  }
}

const trustedMeasurements = new WeakSet<object>();
export type TrustedCandidateRigRegistrationMeasurement =
  CandidateRigRegistrationMeasurementReportClaim;

const deepFreeze = <Value>(value: Value): Value => {
  if (value === null || typeof value !== "object" || Object.isFrozen(value))
    return value;
  for (const child of Object.values(value as Record<string, unknown>))
    deepFreeze(child);
  return Object.freeze(value);
};

export const isTrustedCandidateRigRegistrationMeasurement = (
  value: CandidateRigRegistrationMeasurementReportClaim | unknown,
): value is TrustedCandidateRigRegistrationMeasurement =>
  value !== null && typeof value === "object" && trustedMeasurements.has(value);

const sha256 = (bytes: Uint8Array) =>
  createHash("sha256").update(bytes).digest("hex");

const isSafeRect = (rect: Rect, width: number, height: number) =>
  Number.isInteger(rect.x) &&
  Number.isInteger(rect.y) &&
  Number.isInteger(rect.width) &&
  Number.isInteger(rect.height) &&
  rect.x >= 0 &&
  rect.y >= 0 &&
  rect.width > 0 &&
  rect.height > 0 &&
  rect.x + rect.width <= width &&
  rect.y + rect.height <= height;

const roundHalfAway = (value: number) =>
  value < 0 ? -Math.floor(-value + 0.5) : Math.floor(value + 0.5);

const pointInside = (point: Point, width: number, height: number) =>
  point.x >= 0 && point.y >= 0 && point.x < width && point.y < height;

type DecodedAtlas = {
  candidateId: string;
  atlasKind: AtlasKind;
  width: number;
  height: number;
  pixels: Buffer;
};

type FeatureMeasurement = {
  featureId: string;
  kind:
    | "tab-roi"
    | "alpha-centroid"
    | "principal-axis-end"
    | "sealed-lower-face-anchor";
  supportBounds: Rect;
  pointMicropixels: { x: number; y: number };
};

const composeSimilarity = (
  parent: Similarity,
  local: Similarity,
): Similarity => {
  const translated = applySimilarity(parent, { x: local.x, y: local.y });
  return {
    scale: parent.scale * local.scale,
    rotation: parent.rotation + local.rotation,
    x: translated.x,
    y: translated.y,
    residualMicropixels: 0,
  };
};

type ComponentMeasurement = {
  role: string;
  output: { width: number; height: number; padding: 8 };
  supportMaskContentHash: string;
  coreMaskContentHash: string;
  supportBounds: Rect;
  supportPixels: Point[];
  corePixels: Point[];
};

const largestEightConnectedComponent = (points: Point[]) => {
  const byKey = new Map(
    points.map((point) => [`${point.x}:${point.y}`, point]),
  );
  const visited = new Set<string>();
  const components: Point[][] = [];
  for (const seed of points) {
    const seedKey = `${seed.x}:${seed.y}`;
    if (visited.has(seedKey)) continue;
    const component: Point[] = [];
    const queue = [seed];
    visited.add(seedKey);
    for (let cursor = 0; cursor < queue.length; cursor += 1) {
      const point = queue[cursor]!;
      component.push(point);
      for (let dy = -1; dy <= 1; dy += 1)
        for (let dx = -1; dx <= 1; dx += 1) {
          if (dx === 0 && dy === 0) continue;
          const key = `${point.x + dx}:${point.y + dy}`;
          const neighbor = byKey.get(key);
          if (neighbor && !visited.has(key)) {
            visited.add(key);
            queue.push(neighbor);
          }
        }
    }
    components.push(component);
  }
  return (
    components.sort(
      (left, right) =>
        right.length - left.length ||
        Math.min(...left.map((point) => point.y)) -
          Math.min(...right.map((point) => point.y)) ||
        Math.min(...left.map((point) => point.x)) -
          Math.min(...right.map((point) => point.x)),
    )[0] ?? []
  );
};

const measureComponent = (
  atlas: DecodedAtlas,
  rect: Rect,
  role: string,
): ComponentMeasurement => {
  const padding = 8;
  const outputWidth = rect.width + padding * 2;
  const outputHeight = rect.height + padding * 2;
  const supportMask = Buffer.alloc(outputWidth * outputHeight);
  const coreMask = Buffer.alloc(outputWidth * outputHeight);
  const allSupportPixels: Point[] = [];
  const allCorePixels: Point[] = [];
  let minX = outputWidth;
  let minY = outputHeight;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < rect.height; y += 1)
    for (let x = 0; x < rect.width; x += 1) {
      const alpha =
        atlas.pixels[((rect.y + y) * atlas.width + rect.x + x) * 4 + 3]!;
      const outputX = x + padding;
      const outputY = y + padding;
      if (alpha >= 1) {
        allSupportPixels.push({ x: outputX, y: outputY });
      }
      if (alpha >= 128) allCorePixels.push({ x: outputX, y: outputY });
    }
  const supportPixels = largestEightConnectedComponent(allSupportPixels);
  const corePixels = largestEightConnectedComponent(allCorePixels);
  if (supportPixels.length === 0 || corePixels.length === 0)
    throw new CandidateRigRegistrationMeasurementError(
      "empty-foreground",
      `Registration component ${role} has no alpha support/core foreground.`,
    );
  for (const point of supportPixels) {
    supportMask[point.y * outputWidth + point.x] = 255;
    minX = Math.min(minX, point.x);
    minY = Math.min(minY, point.y);
    maxX = Math.max(maxX, point.x);
    maxY = Math.max(maxY, point.y);
  }
  for (const point of corePixels)
    coreMask[point.y * outputWidth + point.x] = 255;
  return {
    role,
    output: { width: outputWidth, height: outputHeight, padding: 8 },
    supportMaskContentHash: sha256(supportMask),
    coreMaskContentHash: sha256(coreMask),
    supportBounds: {
      x: minX,
      y: minY,
      width: maxX - minX + 1,
      height: maxY - minY + 1,
    },
    supportPixels,
    corePixels,
  };
};

const centroidMicropixels = (points: Point[]) => ({
  x: roundHalfAway(
    (points.reduce((sum, point) => sum + point.x * MICRO, 0) +
      (points.length * MICRO) / 2) /
      points.length,
  ),
  y: roundHalfAway(
    (points.reduce((sum, point) => sum + point.y * MICRO, 0) +
      (points.length * MICRO) / 2) /
      points.length,
  ),
});

const principalAxisEndMicropixels = (
  points: Point[],
  end: "start" | "finish",
) => {
  const center = centroidMicropixels(points);
  const cx = center.x / MICRO;
  const cy = center.y / MICRO;
  let xx = 0;
  let xy = 0;
  let yy = 0;
  for (const point of points) {
    const dx = point.x + 0.5 - cx;
    const dy = point.y + 0.5 - cy;
    xx += dx * dx;
    xy += dx * dy;
    yy += dy * dy;
  }
  const angle = 0.5 * Math.atan2(2 * xy, xx - yy);
  const axisX = Math.cos(angle);
  const axisY = Math.sin(angle);
  const ordered = points
    .map((point) => ({
      point,
      projection: (point.x + 0.5 - cx) * axisX + (point.y + 0.5 - cy) * axisY,
    }))
    .sort(
      (left, right) =>
        left.projection - right.projection ||
        left.point.y - right.point.y ||
        left.point.x - right.point.x,
    );
  const selected = end === "start" ? ordered[0]!.point : ordered.at(-1)!.point;
  return {
    x: selected.x * MICRO + MICRO / 2,
    y: selected.y * MICRO + MICRO / 2,
  };
};

const measureFeature = (
  selector: {
    id: string;
    kind: FeatureMeasurement["kind"];
    atlasKind: AtlasKind;
    end?: "start" | "finish";
    coordinateSpace?: "component-local";
    roi?: Rect;
  },
  component: ComponentMeasurement,
): FeatureMeasurement => {
  if (selector.kind === "sealed-lower-face-anchor")
    throw new CandidateRigRegistrationMeasurementError(
      "selector-unavailable",
      "Sealed lower-face anchors remain blocked until the compositor emits a schema-validated anchor artifact with exact raster lineage.",
    );
  let points = component.corePixels;
  if (selector.kind === "tab-roi") {
    const roi = selector.roi;
    if (
      selector.coordinateSpace !== "component-local" ||
      !roi ||
      !isSafeRect(
        roi,
        component.output.width - 16,
        component.output.height - 16,
      )
    )
      throw new CandidateRigRegistrationMeasurementError(
        "selector-unavailable",
        `Tab ROI ${selector.id} is not a safe component-local rectangle.`,
      );
    const componentWidth = component.output.width - 16;
    const componentHeight = component.output.height - 16;
    const direction = (selector as { direction?: string }).direction;
    const touchesDeclaredEdge =
      (direction === "north" && roi.y === 0) ||
      (direction === "south" && roi.y + roi.height === componentHeight) ||
      (direction === "west" && roi.x === 0) ||
      (direction === "east" && roi.x + roi.width === componentWidth);
    if (!touchesDeclaredEdge)
      throw new CandidateRigRegistrationMeasurementError(
        "selector-unavailable",
        `Tab ROI ${selector.id} must touch its declared component edge.`,
      );
    points = component.corePixels.filter(
      (point) =>
        point.x >= roi.x + 8 &&
        point.y >= roi.y + 8 &&
        point.x < roi.x + roi.width + 8 &&
        point.y < roi.y + roi.height + 8,
    );
    if (points.length === 0)
      throw new CandidateRigRegistrationMeasurementError(
        "selector-unavailable",
        `Tab ROI ${selector.id} contains no alpha-core pixels.`,
      );
  }
  const pointMicropixels =
    selector.kind === "principal-axis-end"
      ? principalAxisEndMicropixels(points, selector.end ?? "finish")
      : centroidMicropixels(points);
  return {
    featureId: selector.id,
    kind: selector.kind,
    supportBounds: component.supportBounds,
    pointMicropixels,
  };
};

type Similarity = {
  scale: number;
  rotation: number;
  x: number;
  y: number;
  residualMicropixels: number;
};

const applySimilarity = (fit: Similarity, point: Point) => ({
  x:
    fit.x +
    fit.scale *
      (Math.cos(fit.rotation) * point.x - Math.sin(fit.rotation) * point.y),
  y:
    fit.y +
    fit.scale *
      (Math.sin(fit.rotation) * point.x + Math.cos(fit.rotation) * point.y),
});

const inversePoint = (fit: Similarity, point: Point) => {
  const x = point.x - fit.x;
  const y = point.y - fit.y;
  return {
    x: (Math.cos(fit.rotation) * x + Math.sin(fit.rotation) * y) / fit.scale,
    y: (-Math.sin(fit.rotation) * x + Math.cos(fit.rotation) * y) / fit.scale,
  };
};

export const solveCandidateRigRegistrationSimilarity = (
  source: Point[],
  target: Point[],
  role: string,
): Similarity => {
  if (source.length < 2 || source.length !== target.length)
    throw new CandidateRigRegistrationMeasurementError(
      "fit-failed",
      `Registration ${role} needs at least two exact feature/landmark pairs.`,
    );
  const sourceMean = {
    x: source.reduce((sum, point) => sum + point.x, 0) / source.length,
    y: source.reduce((sum, point) => sum + point.y, 0) / source.length,
  };
  const targetMean = {
    x: target.reduce((sum, point) => sum + point.x, 0) / target.length,
    y: target.reduce((sum, point) => sum + point.y, 0) / target.length,
  };
  let a = 0;
  let b = 0;
  let denominator = 0;
  for (let index = 0; index < source.length; index += 1) {
    const sx = source[index]!.x - sourceMean.x;
    const sy = source[index]!.y - sourceMean.y;
    const tx = target[index]!.x - targetMean.x;
    const ty = target[index]!.y - targetMean.y;
    a += sx * tx + sy * ty;
    b += sx * ty - sy * tx;
    denominator += sx * sx + sy * sy;
  }
  if (denominator <= Number.EPSILON)
    throw new CandidateRigRegistrationMeasurementError(
      "fit-failed",
      `Registration ${role} source features are degenerate.`,
    );
  const scale = Math.hypot(a, b) / denominator;
  const rotation = Math.atan2(b, a);
  if (!Number.isFinite(scale) || scale <= 0 || scale > 10)
    throw new CandidateRigRegistrationMeasurementError(
      "fit-failed",
      `Registration ${role} produced an invalid uniform scale.`,
    );
  const x =
    targetMean.x -
    scale *
      (Math.cos(rotation) * sourceMean.x - Math.sin(rotation) * sourceMean.y);
  const y =
    targetMean.y -
    scale *
      (Math.sin(rotation) * sourceMean.x + Math.cos(rotation) * sourceMean.y);
  const residualMicropixels = Math.max(
    ...source.map((point, index) => {
      const projected = applySimilarity(
        { scale, rotation, x, y, residualMicropixels: 0 },
        point,
      );
      return roundHalfAway(
        Math.hypot(
          projected.x - target[index]!.x,
          projected.y - target[index]!.y,
        ) * MICRO,
      );
    }),
  );
  if (residualMicropixels > 500_000)
    throw new CandidateRigRegistrationMeasurementError(
      "fit-failed",
      `Registration ${role} exceeds the fixed 0.5px forward-fit ceiling.`,
    );
  return { scale, rotation, x, y, residualMicropixels };
};

const topologicalZOrder = (
  edges: Array<{ behindRole: string; inFrontOfRole: string }>,
) => {
  const roles: string[] = kidsBipedV1TopologyTemplate.parts.map(
    (part) => part.role,
  );
  const indegree = new Map<string, number>(roles.map((role) => [role, 0]));
  const next = new Map<string, string[]>(
    roles.map((role) => [role, [] as string[]]),
  );
  for (const edge of edges) {
    next.get(edge.behindRole)?.push(edge.inFrontOfRole);
    indegree.set(
      edge.inFrontOfRole,
      (indegree.get(edge.inFrontOfRole) ?? 0) + 1,
    );
  }
  const remaining = new Set(roles);
  const order: string[] = [];
  while (remaining.size > 0) {
    const role = roles.find(
      (candidate) => remaining.has(candidate) && indegree.get(candidate) === 0,
    );
    if (!role)
      throw new CandidateRigRegistrationMeasurementError(
        "occlusion-invalid",
        "Registration occlusion constraints contain a cycle.",
      );
    remaining.delete(role);
    order.push(role);
    for (const child of next.get(role) ?? [])
      indegree.set(child, (indegree.get(child) ?? 0) - 1);
  }
  return new Map(order.map((role, index) => [role, index]));
};

const deriveCoverageCrop = async (sourceBytes: Uint8Array, rect: Rect) =>
  sharp(Buffer.from(sourceBytes), {
    limitInputPixels: MAX_PIXELS,
    animated: false,
  })
    .extract({
      left: rect.x,
      top: rect.y,
      width: rect.width,
      height: rect.height,
    })
    .ensureAlpha()
    .png({
      compressionLevel: 9,
      adaptiveFiltering: false,
      palette: false,
      effort: 10,
    })
    .toBuffer();

const inspectRegistrationCell = async (bytes: Uint8Array, view: View) => {
  const decoded = await decodeCandidateRigReviewPng(
    Buffer.from(bytes),
    { width: 576, height: 832 },
    MAX_PIXELS,
  );
  let minimumX = decoded.info.width;
  let minimumY = decoded.info.height;
  let maximumX = -1;
  let maximumY = -1;
  for (let y = 0; y < decoded.info.height; y += 1)
    for (let x = 0; x < decoded.info.width; x += 1) {
      const alpha = decoded.data[(y * decoded.info.width + x) * 4 + 3]!;
      if (alpha === 0) continue;
      minimumX = Math.min(minimumX, x);
      minimumY = Math.min(minimumY, y);
      maximumX = Math.max(maximumX, x);
      maximumY = Math.max(maximumY, y);
    }
  if (maximumX < 0 || maximumY < 0)
    throw new CandidateRigRegistrationMeasurementError(
      "empty-foreground",
      `Turnaround registration cell ${view} has no foreground.`,
    );
  const width = maximumX - minimumX + 1;
  const height = maximumY - minimumY + 1;
  if (
    height !== 768 ||
    maximumY + 1 !== 800 ||
    Math.abs(minimumX * 2 + width - decoded.info.width) > 1 ||
    minimumX === 0 ||
    maximumX === decoded.info.width - 1
  )
    throw new CandidateRigRegistrationMeasurementError(
      "dimension-mismatch",
      `Turnaround registration cell ${view} is not a rederived centered 768px character on the 800px baseline.`,
    );
  return decoded;
};

/**
 * Trusted registration measurement boundary. Unlike the public report schema,
 * this function establishes pixel provenance: it reparses every sealed ledger,
 * verifies exact bytes/dimensions, derives masks/features/fits itself, and only
 * then brands the report for in-process trusted use.
 */
export const createTrustedCandidateRigRegistrationMeasurement = async (
  input: CreateTrustedCandidateRigRegistrationMeasurementInput,
): Promise<TrustedCandidateRigRegistrationMeasurement> => {
  const request = characterRigAssetRequestSchema.parse(input.request);
  const bundle = characterRigCandidateBundleSchema.parse(input.bundle);
  const report = characterRigStagingReportSchema.parse(input.stagingReport);
  const receipt = characterRigImportReceiptSchema.parse(input.importReceipt);
  validateCharacterRigImportReceipt(request, bundle, report, receipt);
  const annotation = candidateRigRegistrationAnnotationMapSchema.parse(
    input.annotationMap,
  );
  if (
    !isAcceptedPrestonCandidateRigRegistrationReviewReceipt(
      input.prestonReviewReceipt,
    )
  )
    throw new CandidateRigRegistrationMeasurementError(
      "invalid-evidence",
      "Trusted registration measurement requires a persisted Preston review receipt.",
    );
  const review = prestonCandidateRigRegistrationAnnotationReviewSchema.parse(
    unwrapAcceptedPrestonCandidateRigRegistrationReview(
      input.prestonReviewReceipt,
    ),
  );
  if (
    input.prestonReviewReceipt.annotationMapContentHash !==
      annotation.contentHash ||
    input.prestonReviewReceipt.reviewRecordContentHash !== review.contentHash
  )
    throw new CandidateRigRegistrationMeasurementError(
      "lineage-mismatch",
      "Persisted Preston review receipt does not bind the exact annotation and review record.",
    );
  const expectedProgram = compileCandidateRigRegistrationMeasurementProgram({
    request,
    bundle,
    stagingReport: report,
    importReceipt: receipt,
    annotationMap: annotation,
    prestonReview: review,
  });
  const program = candidateRigRegistrationMeasurementProgramSchema.parse(
    input.measurementProgram,
  );
  if (hashCanonical(program) !== hashCanonical(expectedProgram))
    throw new CandidateRigRegistrationMeasurementError(
      "lineage-mismatch",
      "Trusted measurement requires the exact recompiled registration measurement program.",
    );

  const turnaroundAsset = bundle.assets.find(
    (asset) => asset.requestItemId === "turnaround-sheet",
  );
  const turnaroundStaged = turnaroundAsset
    ? report.assets.find(
        (asset) => asset.candidateId === turnaroundAsset.candidateId,
      )
    : undefined;
  const turnaroundImported = turnaroundAsset
    ? receipt.files.find(
        (file) => file.candidateId === turnaroundAsset.candidateId,
      )
    : undefined;
  const coverageReference = turnaroundAsset?.turnaroundViewCoverageEvidence;
  const coverageBytes = Buffer.from(input.turnaroundCoverageEvidenceBytes);
  let coverage: ReturnType<typeof turnaroundViewCoverageEvidenceSchema.parse>;
  try {
    coverage = turnaroundViewCoverageEvidenceSchema.parse(
      JSON.parse(coverageBytes.toString("utf8")) as unknown,
    );
  } catch (error) {
    throw new CandidateRigRegistrationMeasurementError(
      "invalid-evidence",
      `Turnaround coverage evidence bytes are not the exact valid JSON artifact. ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  const stagedCoverage = turnaroundAsset
    ? report.turnaroundViewCoverageEvidence.find(
        (entry) => entry.candidateId === turnaroundAsset.candidateId,
      )
    : undefined;
  const importedCoverage = turnaroundAsset
    ? receipt.turnaroundViewCoverageEvidence.find(
        (entry) => entry.candidateId === turnaroundAsset.candidateId,
      )
    : undefined;
  if (
    !turnaroundAsset ||
    !turnaroundStaged ||
    !turnaroundImported ||
    !coverageReference ||
    !stagedCoverage ||
    !importedCoverage ||
    coverageBytes.length !== coverageReference.byteLength ||
    sha256(coverageBytes) !== coverageReference.fileContentHash ||
    coverage.contentHash !== coverageReference.contentHash ||
    coverage.contentHash !== stagedCoverage.evidenceContentHash ||
    coverage.contentHash !== importedCoverage.evidenceContentHash ||
    sha256(coverageBytes) !== stagedCoverage.evidenceFileContentHash ||
    sha256(coverageBytes) !== importedCoverage.evidenceFileContentHash ||
    hashCanonical(stagedCoverage) !== hashCanonical(importedCoverage) ||
    coverage.requestContentHash !== request.contentHash ||
    coverage.candidateId !== turnaroundAsset.candidateId ||
    coverage.candidateContentHash !== turnaroundAsset.contentHash ||
    turnaroundStaged.stagedContentHash !== turnaroundAsset.contentHash ||
    turnaroundImported.sourceContentHash !== turnaroundAsset.contentHash ||
    input.turnaroundSourceBytes.length !== turnaroundStaged.byteLength ||
    input.turnaroundSourceBytes.length !== turnaroundImported.byteLength ||
    sha256(input.turnaroundSourceBytes) !== turnaroundAsset.contentHash
  )
    throw new CandidateRigRegistrationMeasurementError(
      "lineage-mismatch",
      "Turnaround source and coverage JSON do not match the exact bundle, staging, and import evidence.",
    );
  const sourceRaster = await decodeCandidateRigReviewPng(
    Buffer.from(input.turnaroundSourceBytes),
    { width: turnaroundAsset.width, height: turnaroundAsset.height },
    MAX_PIXELS,
  );
  if (
    sourceRaster.info.width !== turnaroundAsset.width ||
    sourceRaster.info.height !== turnaroundAsset.height
  )
    throw new CandidateRigRegistrationMeasurementError(
      "dimension-mismatch",
      "Turnaround source raster dimensions changed after import.",
    );

  const rederivedViews = new Map<
    (typeof coverage.views)[number]["view"],
    Buffer
  >();
  for (const coverageView of coverage.views) {
    const stagedView = stagedCoverage.views.find(
      (entry) => entry.view === coverageView.view,
    );
    const importedView = importedCoverage.views.find(
      (entry) => entry.view === coverageView.view,
    );
    if (
      coverageView.sourceContentHash !== turnaroundAsset.contentHash ||
      coverageView.sourceRect.x + coverageView.sourceRect.width >
        turnaroundAsset.width ||
      coverageView.sourceRect.y + coverageView.sourceRect.height >
        turnaroundAsset.height ||
      !stagedView ||
      !importedView ||
      stagedView.derivedContentHash !== coverageView.derivedContentHash ||
      importedView.derivedContentHash !== coverageView.derivedContentHash ||
      stagedView.byteLength !== coverageView.byteLength ||
      importedView.byteLength !== coverageView.byteLength ||
      stagedView.width !== coverageView.width ||
      stagedView.height !== coverageView.height ||
      importedView.width !== coverageView.width ||
      importedView.height !== coverageView.height
    )
      throw new CandidateRigRegistrationMeasurementError(
        "lineage-mismatch",
        `Turnaround ${coverageView.view} coverage entry changed across the exact evidence ledger.`,
      );
    const derived = await deriveCoverageCrop(
      input.turnaroundSourceBytes,
      coverageView.sourceRect,
    );
    if (
      derived.length !== coverageView.byteLength ||
      sha256(derived) !== coverageView.derivedContentHash
    )
      throw new CandidateRigRegistrationMeasurementError(
        "hash-mismatch",
        `Turnaround ${coverageView.view} crop does not rederive byte-identically from the imported source raster.`,
      );
    rederivedViews.set(coverageView.view, derived);
  }
  const coverageView = coverage.views.find(
    (view) => view.view === annotation.view,
  );
  const registrationViewBytes = rederivedViews.get(annotation.view);
  if (
    !coverageView ||
    !registrationViewBytes ||
    annotation.turnaroundGuidance.candidateId !== turnaroundAsset.candidateId ||
    annotation.turnaroundGuidance.candidateContentHash !==
      turnaroundAsset.contentHash ||
    annotation.turnaroundGuidance.coverageEvidenceContentHash !==
      coverage.contentHash ||
    annotation.turnaroundGuidance.coverageEvidenceFileContentHash !==
      sha256(coverageBytes) ||
    annotation.turnaroundGuidance.derivedViewContentHash !==
      coverageView.derivedContentHash ||
    coverageView.width !== annotation.turnaroundGuidance.width ||
    coverageView.height !== annotation.turnaroundGuidance.height
  )
    throw new CandidateRigRegistrationMeasurementError(
      "lineage-mismatch",
      "Turnaround guidance does not bind the exact rederived coverage-cell bytes.",
    );
  await inspectRegistrationCell(registrationViewBytes, annotation.view);

  if (
    input.atlasRasters.length !== program.sourceImports.length ||
    new Set(input.atlasRasters.map((atlas) => atlas.candidateId)).size !==
      input.atlasRasters.length
  )
    throw new CandidateRigRegistrationMeasurementError(
      "invalid-evidence",
      "Trusted measurement requires one exact raster for each compiled source import.",
    );
  const decodedAtlases = new Map<AtlasKind, DecodedAtlas>();
  for (const sourceImport of program.sourceImports) {
    const rawAtlas = input.atlasRasters.find(
      (atlas) => atlas.candidateId === sourceImport.candidateId,
    );
    if (
      !rawAtlas ||
      decodedAtlases.has(sourceImport.atlasKind) ||
      rawAtlas.bytes.length !== sourceImport.byteLength ||
      sha256(rawAtlas.bytes) !== sourceImport.stagedContentHash
    )
      throw new CandidateRigRegistrationMeasurementError(
        "lineage-mismatch",
        "Atlas raster does not match its exact compiled source import.",
      );
    const decoded = await decodeCandidateRigReviewPng(
      Buffer.from(rawAtlas.bytes),
      { width: sourceImport.width, height: sourceImport.height },
      MAX_PIXELS,
    );
    if (
      decoded.info.width !== sourceImport.width ||
      decoded.info.height !== sourceImport.height
    )
      throw new CandidateRigRegistrationMeasurementError(
        "dimension-mismatch",
        "Atlas decoded dimensions changed.",
      );
    decodedAtlases.set(sourceImport.atlasKind, {
      candidateId: sourceImport.candidateId,
      atlasKind: sourceImport.atlasKind,
      width: sourceImport.width,
      height: sourceImport.height,
      pixels: decoded.data,
    });
  }

  const componentByRole = new Map<
    string,
    { atlas: DecodedAtlas; rect: Rect }
  >();
  for (const component of [
    ...program.partSources,
    ...program.exposureSources,
  ]) {
    const atlas = decodedAtlases.get(component.source.atlasKind);
    if (
      !atlas ||
      atlas.candidateId !== component.source.candidateId ||
      componentByRole.has(component.role) ||
      !isSafeRect(component.source.atlasCell, atlas.width, atlas.height)
    )
      throw new CandidateRigRegistrationMeasurementError(
        "map-mismatch",
        `Compiled source mapping for ${component.role} does not match the exact decoded atlas.`,
      );
    componentByRole.set(component.role, {
      atlas,
      rect: component.source.atlasCell,
    });
  }

  const landmarks = new Map(
    annotation.guideLandmarks.map((landmark) => [landmark.id, landmark.point]),
  );
  const measurements = new Map<string, ComponentMeasurement>();
  const features = new Map<string, FeatureMeasurement[]>();
  const globalFits = new Map<string, Similarity>();
  for (const part of annotation.parts) {
    const source = componentByRole.get(part.role);
    if (!source)
      throw new CandidateRigRegistrationMeasurementError(
        "map-mismatch",
        `Atlas maps are missing annotated role ${part.role}.`,
      );
    const component = measureComponent(source.atlas, source.rect, part.role);
    if (
      part.sourceFeatures.some(
        (selector) => selector.atlasKind !== source.atlas.atlasKind,
      )
    )
      throw new CandidateRigRegistrationMeasurementError(
        "map-mismatch",
        `Registration ${part.role} selector names the wrong exact atlas.`,
      );
    const selected = part.sourceFeatures.map((selector) =>
      measureFeature(selector, component),
    );
    const selectedById = new Map(
      selected.map((feature) => [feature.featureId, feature]),
    );
    const sourcePoints: Point[] = [];
    const targetPoints: Point[] = [];
    for (const alignment of part.alignments) {
      const feature = selectedById.get(alignment.sourceFeatureId);
      const landmark = landmarks.get(alignment.guidanceLandmarkId);
      if (!feature || !landmark)
        throw new CandidateRigRegistrationMeasurementError(
          "invalid-evidence",
          `Registration ${part.role} contains an unresolved feature/landmark binding.`,
        );
      sourcePoints.push({
        x: feature.pointMicropixels.x / MICRO,
        y: feature.pointMicropixels.y / MICRO,
      });
      targetPoints.push(landmark);
    }
    measurements.set(part.role, component);
    features.set(part.role, selected);
    globalFits.set(
      part.role,
      solveCandidateRigRegistrationSimilarity(
        sourcePoints,
        targetPoints,
        part.role,
      ),
    );
  }

  const zOrder = topologicalZOrder(annotation.occlusionEdges);
  const childPivotByRole = new Map(
    annotation.parts.map((part) => {
      const point = features
        .get(part.role)!
        .find(
          (feature) => feature.featureId === part.childPivotFeatureId,
        )!.pointMicropixels;
      return [
        part.role,
        {
          x: roundHalfAway(point.x / MICRO),
          y: roundHalfAway(point.y / MICRO),
        },
      ];
    }),
  );
  const socketsByRole = new Map(
    annotation.parts.map((part) => [
      part.role,
      [] as Array<{ id: string; position: Point }>,
    ]),
  );
  for (const child of annotation.parts) {
    if (!child.parentRole || !child.parentSocketId) continue;
    const childFit = globalFits.get(child.role)!;
    const parentFit = globalFits.get(child.parentRole)!;
    const globalPivot = applySimilarity(
      childFit,
      childPivotByRole.get(child.role)!,
    );
    const parentLocal = inversePoint(parentFit, globalPivot);
    const position = {
      x: roundHalfAway(parentLocal.x),
      y: roundHalfAway(parentLocal.y),
    };
    const parentOutput = measurements.get(child.parentRole)!.output;
    if (!pointInside(position, parentOutput.width, parentOutput.height))
      throw new CandidateRigRegistrationMeasurementError(
        "fit-failed",
        `Measured socket ${child.parentSocketId} leaves ${child.parentRole}.`,
      );
    socketsByRole.get(child.parentRole)!.push({
      id: child.parentSocketId,
      position,
    });
  }

  const measuredParts = annotation.parts.map((part) => {
    const fit = globalFits.get(part.role)!;
    const parentFit = part.parentRole ? globalFits.get(part.parentRole)! : null;
    const localScale = parentFit ? fit.scale / parentFit.scale : fit.scale;
    const localRotation = parentFit
      ? fit.rotation - parentFit.rotation
      : fit.rotation;
    const localTranslation = parentFit
      ? inversePoint(parentFit, { x: fit.x, y: fit.y })
      : { x: fit.x, y: fit.y };
    const scaleMillionths = roundHalfAway(localScale * MICRO);
    const absoluteScaleMillionths = roundHalfAway(fit.scale * MICRO);
    if (scaleMillionths <= 0 || absoluteScaleMillionths <= 0)
      throw new CandidateRigRegistrationMeasurementError(
        "non-quantized",
        `Registration ${part.role} produced a non-positive quantized scale.`,
      );
    const parentJoint = part.parentRole
      ? socketsByRole
          .get(part.parentRole)!
          .find((socket) => socket.id === part.parentSocketId)!.position
      : null;
    return {
      role: part.role,
      parentRole: part.parentRole,
      parentSocketId: part.parentSocketId,
      output: measurements.get(part.role)!.output,
      supportMaskContentHash: measurements.get(part.role)!
        .supportMaskContentHash,
      coreMaskContentHash: measurements.get(part.role)!.coreMaskContentHash,
      selectedFeatures: features.get(part.role)!,
      childPivotFeatureId: part.childPivotFeatureId,
      childPivot: childPivotByRole.get(part.role)!,
      parentJoint,
      restTransform: {
        xMicropixels: roundHalfAway(localTranslation.x * MICRO),
        yMicropixels: roundHalfAway(localTranslation.y * MICRO),
        rotationMicrodegrees: roundHalfAway(
          (localRotation * 180 * MICRO) / Math.PI,
        ),
        scaleXMillionths: scaleMillionths,
        scaleYMillionths: scaleMillionths,
      },
      sockets: socketsByRole
        .get(part.role)!
        .sort((left, right) => left.id.localeCompare(right.id)),
      zIndex: zOrder.get(part.role)!,
      fit: {
        anchorCount: features.get(part.role)!.length,
        absoluteScaleMillionths,
        absoluteRotationMicrodegrees: roundHalfAway(
          (fit.rotation * 180 * MICRO) / Math.PI,
        ),
        residualMicropixels: fit.residualMicropixels,
        reflected: false as const,
        mirrored: false as const,
        shear: 0 as const,
      },
    };
  });
  const measuredByRole = new Map(
    measuredParts.map((part) => [part.role, part]),
  );
  const recomposed = new Map<string, Similarity>();
  for (const part of measuredParts) {
    const local: Similarity = {
      scale: part.restTransform.scaleXMillionths / MICRO,
      rotation:
        (part.restTransform.rotationMicrodegrees * Math.PI) / (180 * MICRO),
      x: part.restTransform.xMicropixels / MICRO,
      y: part.restTransform.yMicropixels / MICRO,
      residualMicropixels: 0,
    };
    const parent = part.parentRole ? recomposed.get(part.parentRole) : null;
    if (part.parentRole && !parent)
      throw new CandidateRigRegistrationMeasurementError(
        "fit-failed",
        `Registration hierarchy could not recompose parent ${part.parentRole}.`,
      );
    const global = parent ? composeSimilarity(parent, local) : local;
    recomposed.set(part.role, global);
    const annotationPart = annotation.parts.find(
      (candidate) => candidate.role === part.role,
    )!;
    const featureById = new Map(
      part.selectedFeatures.map((feature) => [feature.featureId, feature]),
    );
    for (const alignment of annotationPart.alignments) {
      const feature = featureById.get(alignment.sourceFeatureId)!;
      const target = landmarks.get(alignment.guidanceLandmarkId)!;
      const projected = applySimilarity(global, {
        x: feature.pointMicropixels.x / MICRO,
        y: feature.pointMicropixels.y / MICRO,
      });
      if (
        roundHalfAway(
          Math.hypot(projected.x - target.x, projected.y - target.y) * MICRO,
        ) > 500_000
      )
        throw new CandidateRigRegistrationMeasurementError(
          "non-quantized",
          `Registration ${part.role} fails forward validation after published microunit quantization.`,
        );
    }
    if (parent && part.parentJoint) {
      const projectedLocalPivot = applySimilarity(local, part.childPivot);
      if (
        roundHalfAway(
          Math.hypot(
            projectedLocalPivot.x - part.parentJoint.x,
            projectedLocalPivot.y - part.parentJoint.y,
          ) * MICRO,
        ) > 500_000
      )
        throw new CandidateRigRegistrationMeasurementError(
          "non-quantized",
          `Registration ${part.role} child pivot does not forward-fit its parent socket.`,
        );
    }
  }
  const measuredExposures = annotation.exposures.map((exposure) => {
    const source = componentByRole.get(exposure.role);
    const target = measuredByRole.get(exposure.targetRole)!;
    if (!source)
      throw new CandidateRigRegistrationMeasurementError(
        "map-mismatch",
        `Atlas maps are missing exposure ${exposure.role}.`,
      );
    const measured = measureComponent(source.atlas, source.rect, exposure.role);
    if (exposure.sourceAnchor.atlasKind !== source.atlas.atlasKind)
      throw new CandidateRigRegistrationMeasurementError(
        "map-mismatch",
        `Exposure ${exposure.role} anchor names the wrong exact atlas.`,
      );
    const sourceAnchor = measureFeature(exposure.sourceAnchor, measured);
    const targetAnchor = target.selectedFeatures.find(
      (feature) => feature.featureId === exposure.targetAnchorFeatureId,
    );
    if (
      measured.output.width !== target.output.width ||
      measured.output.height !== target.output.height ||
      exposure.targetAnchorFeatureId !== target.childPivotFeatureId ||
      !targetAnchor ||
      sourceAnchor.pointMicropixels.x !== targetAnchor.pointMicropixels.x ||
      sourceAnchor.pointMicropixels.y !== targetAnchor.pointMicropixels.y
    )
      throw new CandidateRigRegistrationMeasurementError(
        "fit-failed",
        `Exposure ${exposure.role} cannot inherit ${exposure.targetRole} without an exact pixel-derived source/target anchor match.`,
      );
    return {
      role: exposure.role,
      targetRole: exposure.targetRole,
      output: target.output,
      supportMaskContentHash: measured.supportMaskContentHash,
      coreMaskContentHash: measured.coreMaskContentHash,
      sourceAnchor,
      targetAnchorFeatureId: exposure.targetAnchorFeatureId,
      childPivot: target.childPivot,
      registrationMode: "inherit-target-registration" as const,
    };
  });

  const draft = {
    schemaVersion: "1.0" as const,
    reportKind: "candidate-rig-registration-measurement" as const,
    authorityDomain: "source-review-registration-measurement" as const,
    reportId: `registration-measurement-${annotation.view}-${annotation.contentHash.slice(0, 20)}`,
    view: annotation.view,
    lineage: annotation.lineage,
    turnaroundGuidance: annotation.turnaroundGuidance,
    annotationMapContentHash: annotation.contentHash,
    prestonReviewRecordContentHash: review.contentHash,
    measurementProgramContentHash: program.contentHash,
    algorithm: candidateRigRegistrationMeasurementAlgorithmContract,
    transformConvention: "parent-pivot-local-v1" as const,
    zConvention: "larger-z-index-renders-in-front" as const,
    parts: measuredParts,
    exposures: measuredExposures,
    resolvedOcclusions: annotation.occlusionEdges,
    repeatabilityScope: "same-runtime-and-engine-build-only" as const,
    crossRuntimeBitExact: false as const,
    behaviorSourceReceiptStatus: "pending" as const,
    machineGeneratedClaim: true as const,
    providerAuthority: false as const,
    approvalAuthority: false as const,
    approvalRequired: true as const,
    productionBindable: false as const,
  };
  const measured = candidateRigRegistrationMeasurementReportSchema.parse({
    ...draft,
    contentHash: hashCanonical(draft),
  });
  validateCandidateRigRegistrationMeasurementClaimBindings(
    annotation,
    review,
    program,
    measured,
  );
  const trusted = deepFreeze(measured);
  trustedMeasurements.add(trusted);
  return trusted;
};
