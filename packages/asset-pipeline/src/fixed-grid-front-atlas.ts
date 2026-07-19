import { createHash } from "node:crypto";
import sharp from "sharp";
import {
  kidsBipedV1FaceComponents,
  kidsBipedV1PartComponents,
} from "@storystage/story-engine";
import { removeBorderChromaKey } from "./chroma-key";

const MAX_PIXELS = 64_000_000;
const EXPECTED_KEY = { red: 255, green: 0, blue: 255 } as const;
const DEFAULT_MAX_KEY_DISTANCE = 24;
const MAX_ALLOWED_KEY_DISTANCE = 32;
const SOURCE_SAFETY_INSET = 4;
const ATLAS_GUTTER = 24;

const sha256 = (bytes: Uint8Array) =>
  createHash("sha256").update(bytes).digest("hex");

type DirectionalAtlasSourceInput<MaximumKeyDistance extends 24 | 32> = {
  bytes: Buffer;
  expectedContentHash: string;
  expectedDimensions: { width: number; height: number };
  sourceRects?: readonly FrontAtlasSourceRect[];
  maximumMeasuredKeyDistance?: MaximumKeyDistance;
};

export type FrontAtlasSourceInput = DirectionalAtlasSourceInput<24 | 32>;

export type ProfileAtlasSourceInput = Omit<
  DirectionalAtlasSourceInput<24 | 32>,
  "sourceRects"
> & {
  sourceRects: readonly FrontAtlasSourceRect[];
};

export type FrontAtlasSourceRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type KidsBipedV1FrontAtlasInput = {
  core: FrontAtlasSourceInput;
  limbs: FrontAtlasSourceInput;
  eyes: FrontAtlasSourceInput;
  mouths: FrontAtlasSourceInput;
  lowerFace: {
    base: FrontAtlasSourceInput;
    baseSourceRect: FrontAtlasSourceRect;
    pivot: { x: number; y: number };
    noseAnchor: { x: number; y: number };
    mouthChangeBounds: FrontAtlasSourceRect;
  };
};

export type KidsBipedV1AtlasView = "front" | "profile-left" | "profile-right";

export type KidsBipedV1ProfileAtlasView = Exclude<
  KidsBipedV1AtlasView,
  "front"
>;

export type KidsBipedV1ProfileAtlasInput = {
  core: ProfileAtlasSourceInput;
  limbs: ProfileAtlasSourceInput;
  eyes: ProfileAtlasSourceInput;
  mouths: ProfileAtlasSourceInput;
  lowerFace: {
    base: FrontAtlasSourceInput;
    baseSourceRect: FrontAtlasSourceRect;
    pivot: { x: number; y: number };
    noseAnchor: { x: number; y: number };
    mouthChangeBounds: FrontAtlasSourceRect;
  };
};

type KidsBipedV1DirectionalAtlasInput = KidsBipedV1FrontAtlasInput;

type PartComponent = (typeof kidsBipedV1PartComponents)[number];
type FaceComponent = (typeof kidsBipedV1FaceComponents)[number];
type FrontComponent = PartComponent | FaceComponent;
type AtlasKind = "parts-front" | "face-front";
type SheetId = "core" | "limbs" | "eyes" | "mouths";

type SheetPlan = {
  id: SheetId;
  atlas: AtlasKind;
  columns: number;
  rows: number;
  components: readonly FrontComponent[];
};

type FixedGridSourceEvidence<
  MaximumKeyDistance extends 24 | 32,
  Kind extends string,
> = {
  id: SheetId;
  atlas: Kind;
  sourceContentHash: string;
  keyedSourceContentHash: string;
  dimensions: { width: number; height: number };
  extraction: {
    mode: "equal-grid" | "sealed-source-rects";
    declaredGrid: { columns: number; rows: number };
    sourceRects: readonly FrontAtlasSourceRect[];
    manifestContentHash: string;
    maximumMeasuredKeyDistance: MaximumKeyDistance;
  };
  measuredKey: { red: number; green: number; blue: number; hex: string };
  alphaPixels: { transparent: number; partial: number; opaque: number };
  components: readonly FrontComponent[];
};

const SHEET_PLANS = [
  {
    id: "core",
    atlas: "parts-front",
    columns: 4,
    rows: 2,
    components: [
      "torso",
      "pelvis",
      "head",
      "tail",
      "ear-left",
      "ear-right",
      "secondary-front",
      "secondary-back",
    ],
  },
  {
    id: "limbs",
    atlas: "parts-front",
    columns: 6,
    rows: 2,
    components: [
      "upper-arm-left",
      "lower-arm-left",
      "hand-left",
      "upper-arm-right",
      "lower-arm-right",
      "hand-right",
      "upper-leg-left",
      "lower-leg-left",
      "foot-left",
      "upper-leg-right",
      "lower-leg-right",
      "foot-right",
    ],
  },
  {
    id: "eyes",
    atlas: "face-front",
    columns: 7,
    rows: 2,
    components: [
      "eye-white-left",
      "pupil-left",
      "lid-open-left",
      "lid-half-left",
      "lid-closed-left",
      "brow-neutral-left",
      "brow-raised-left",
      "eye-white-right",
      "pupil-right",
      "lid-open-right",
      "lid-half-right",
      "lid-closed-right",
      "brow-neutral-right",
      "brow-raised-right",
    ],
  },
  {
    id: "mouths",
    atlas: "face-front",
    columns: 4,
    rows: 2,
    components: [
      "mouth-rest",
      "viseme-ai",
      "viseme-e",
      "viseme-mbp",
      "viseme-oh",
      "viseme-fv",
      "viseme-l",
      "viseme-wq",
    ],
  },
] as const satisfies readonly SheetPlan[];

type Rect = FrontAtlasSourceRect;

type ExtractedComponent = {
  id: FrontComponent;
  atlas: AtlasKind;
  sourceSheetId: SheetId;
  sourceContentHash: string;
  keyedSourceContentHash: string;
  sourceCellIndex: number;
  sourceCell: Rect;
  contentBoundsWithinCell: Rect;
  contentBytes: Buffer;
  contentPixels: Buffer;
  contentHash: string;
  width: number;
  height: number;
};

export type FixedGridFrontAtlasResult = {
  processor: {
    id: "kids-biped-v1-fixed-grid-front-atlas";
    version: "1.0.0";
    sourceSafetyInset: 4;
    atlasGutter: 24;
    extraction: "equal-grid-or-sealed-source-rects";
    expectedKey: "#ff00ff";
    maximumAllowedMeasuredKeyDistance: 32;
    imageLibrary: { id: "sharp"; version: string };
    png: {
      compressionLevel: 9;
      adaptiveFiltering: false;
      palette: false;
      effort: 10;
    };
  };
  sources: Array<FixedGridSourceEvidence<24 | 32, AtlasKind>>;
  atlases: {
    partsFront: ComposedFrontAtlas<PartComponent>;
    faceFront: ComposedFrontAtlas<FaceComponent>;
  };
  lowerFacePatches: ExclusiveLowerFacePatchResult<"front">;
  gate: {
    classification: "untrusted-source-candidate";
    declaredCanonicalFrontInventoryComplete: true;
    visualRoleAuditPassed: false;
    registrationReady: false;
    importReceiptCreated: false;
    preparedManifestCreated: false;
    providerAuthority: false;
    preparationAuthority: false;
    productionBindable: false;
    approvalRequired: true;
  };
};

export type FixedGridProfileAtlasResult<
  View extends KidsBipedV1ProfileAtlasView = KidsBipedV1ProfileAtlasView,
> = {
  view: View;
  processor: Omit<FixedGridFrontAtlasResult["processor"], "id"> & {
    id: "kids-biped-v1-fixed-grid-profile-atlas";
  };
  sources: Array<
    FixedGridSourceEvidence<24 | 32, `parts-${View}` | `face-${View}`>
  >;
  atlases: {
    partsProfile: ComposedFrontAtlas<PartComponent>;
    faceProfile: ComposedFrontAtlas<FaceComponent>;
  };
  lowerFacePatches: ExclusiveLowerFacePatchResult<View>;
  gate: {
    classification: "untrusted-source-candidate";
    previewClassification: "source-candidate-diagnostic-only";
    declaredCanonicalProfileInventoryComplete: true;
    visualRoleAuditPassed: false;
    registrationReady: false;
    importReceiptCreated: false;
    preparedManifestCreated: false;
    providerAuthority: false;
    preparationAuthority: false;
    productionBindable: false;
    approvalRequired: true;
  };
};

export type ExclusiveLowerFacePatchResult<
  View extends KidsBipedV1AtlasView = "front",
> = {
  contract: {
    replacementMode: "exclusive";
    ownedFeatures: readonly ["nose", "muzzle", "mouth"];
    registrationGroup: `ollo-${View}-lower-face-v1`;
    atomicReplacement: true;
    fixedZOrder: true;
    width: number;
    height: number;
    pivot: { x: number; y: number };
    noseAnchor: { x: number; y: number };
    mouthChangeBounds: FrontAtlasSourceRect;
    pairwiseOutsideMouthChangeDelta: 0;
    commonAlphaPlane: true;
    headLowerFaceArtRequiredAbsent: true;
  };
  base: {
    sourceContentHash: string;
    keyedSourceContentHash: string;
    sourceRect: FrontAtlasSourceRect;
    measuredKey: { red: number; green: number; blue: number; hex: string };
    manifestContentHash: string;
    alphaPlaneHash: string;
  };
  patches: Array<{
    id: Extract<FaceComponent, `mouth-${string}` | `viseme-${string}`>;
    contentHash: string;
    byteLength: number;
    width: number;
    height: number;
    pivot: { x: number; y: number };
    noseAnchor: { x: number; y: number };
    mouthChangeBounds: FrontAtlasSourceRect;
    alphaPlaneHash: string;
    outsideMouthChangeDeltaFromBase: 0;
    changedPixelsInsideMouthChange: number;
    overlaySourceContentHash: string;
    overlaySourceCell: Rect;
    overlayContentBoundsWithinCell: Rect;
    overlayPlacement: Rect;
  }>;
  diagnostic: {
    classification: "source-candidate-diagnostic-only";
    framesPerPose: 3;
    bytes: Buffer;
    contentHash: string;
    byteLength: number;
    width: number;
    height: number;
    sequence: readonly [
      "mouth-rest",
      "viseme-ai",
      "mouth-rest",
      "viseme-mbp",
      "mouth-rest",
      "viseme-oh",
    ];
    frames: Array<{
      id: Extract<FaceComponent, `mouth-${string}` | `viseme-${string}`>;
      startFrame: number;
      durationFrames: 3;
      contactSheetRect: Rect;
    }>;
  };
};

export type ComposedFrontAtlas<Component extends FrontComponent> = {
  bytes: Buffer;
  contentHash: string;
  byteLength: number;
  width: number;
  height: number;
  columns: number;
  rows: number;
  cellWidth: number;
  cellHeight: number;
  gutter: number;
  alphaClass: "mixed-alpha";
  components: Array<{
    id: Component;
    sourceSheetId: SheetId;
    sourceContentHash: string;
    keyedSourceContentHash: string;
    sourceCellIndex: number;
    sourceCell: Rect;
    contentBoundsWithinCell: Rect;
    contentHash: string;
    atlasCell: Rect;
    atlasContentBounds: Rect;
  }>;
};

const png = (image: sharp.Sharp) =>
  image
    .png({
      compressionLevel: 9,
      adaptiveFiltering: false,
      palette: false,
      effort: 10,
    })
    .toBuffer();

const expectedComponentSet = (atlas: AtlasKind): readonly FrontComponent[] =>
  atlas === "parts-front"
    ? kidsBipedV1PartComponents
    : kidsBipedV1FaceComponents;

const validateDeclaredInventory = () => {
  for (const atlas of ["parts-front", "face-front"] as const) {
    const actual = SHEET_PLANS.filter((sheet) => sheet.atlas === atlas).flatMap(
      (sheet) => [...sheet.components],
    );
    const expected = expectedComponentSet(atlas);
    if (
      actual.length !== expected.length ||
      new Set(actual).size !== actual.length ||
      expected.some((component) => !actual.includes(component))
    )
      throw new Error(
        `Fixed-grid ${atlas} plans do not cover the exact kids-biped-v1 inventory.`,
      );
  }
};

const inspectContentBounds = (
  pixels: Buffer,
  width: number,
  height: number,
  component: string,
): Rect => {
  let minimumX = width;
  let minimumY = height;
  let maximumX = -1;
  let maximumY = -1;
  for (let y = 0; y < height; y += 1)
    for (let x = 0; x < width; x += 1) {
      const alpha = pixels[(y * width + x) * 4 + 3]!;
      if (alpha === 0) continue;
      minimumX = Math.min(minimumX, x);
      minimumY = Math.min(minimumY, y);
      maximumX = Math.max(maximumX, x);
      maximumY = Math.max(maximumY, y);
    }
  if (maximumX < 0 || maximumY < 0)
    throw new Error(`Fixed-grid component ${component} has no foreground.`);
  if (
    minimumX < SOURCE_SAFETY_INSET ||
    minimumY < SOURCE_SAFETY_INSET ||
    maximumX >= width - SOURCE_SAFETY_INSET ||
    maximumY >= height - SOURCE_SAFETY_INSET
  )
    throw new Error(
      `Fixed-grid component ${component} violates the ${SOURCE_SAFETY_INSET}px source-cell safety inset (bounds ${minimumX},${minimumY}..${maximumX},${maximumY} in ${width}x${height}).`,
    );
  return {
    x: minimumX,
    y: minimumY,
    width: maximumX - minimumX + 1,
    height: maximumY - minimumY + 1,
  };
};

const assertTransparentOuterBoundary = (
  pixels: Buffer,
  width: number,
  height: number,
  sheetId: string,
) => {
  const alphaAt = (x: number, y: number) => pixels[(y * width + x) * 4 + 3]!;
  for (let x = 0; x < width; x += 1)
    if (alphaAt(x, 0) !== 0 || alphaAt(x, height - 1) !== 0)
      throw new Error(
        `Fixed-grid ${sheetId} background is not transparent at its outer boundary.`,
      );
  for (let y = 0; y < height; y += 1)
    if (alphaAt(0, y) !== 0 || alphaAt(width - 1, y) !== 0)
      throw new Error(
        `Fixed-grid ${sheetId} background is not transparent at its outer boundary.`,
      );
};

const isIntegerRect = (rect: FrontAtlasSourceRect) =>
  Number.isInteger(rect.x) &&
  Number.isInteger(rect.y) &&
  Number.isInteger(rect.width) &&
  Number.isInteger(rect.height) &&
  rect.x >= 0 &&
  rect.y >= 0 &&
  rect.width > 0 &&
  rect.height > 0;

const rectanglesOverlap = (left: Rect, right: Rect) =>
  left.x < right.x + right.width &&
  left.x + left.width > right.x &&
  left.y < right.y + right.height &&
  left.y + left.height > right.y;

const sourceRectsFor = (
  plan: SheetPlan,
  source: FrontAtlasSourceInput,
  width: number,
  height: number,
  maximumAllowedKeyDistance: 32,
) => {
  const mode = source.sourceRects ? "sealed-source-rects" : "equal-grid";
  const sourceRects = source.sourceRects
    ? [...source.sourceRects]
    : plan.components.map((_, index) => {
        const column = index % plan.columns;
        const row = Math.floor(index / plan.columns);
        const left = Math.floor((column * width) / plan.columns);
        const top = Math.floor((row * height) / plan.rows);
        const right = Math.floor(((column + 1) * width) / plan.columns);
        const bottom = Math.floor(((row + 1) * height) / plan.rows);
        return {
          x: left,
          y: top,
          width: right - left,
          height: bottom - top,
        };
      });
  if (
    sourceRects.length !== plan.components.length ||
    sourceRects.some(
      (rect) =>
        !isIntegerRect(rect) ||
        rect.x + rect.width > width ||
        rect.y + rect.height > height,
    )
  )
    throw new Error(
      `Fixed-grid ${plan.id} source-rectangle manifest is incomplete or outside its exact source raster.`,
    );
  for (let left = 0; left < sourceRects.length; left += 1)
    for (let right = left + 1; right < sourceRects.length; right += 1)
      if (rectanglesOverlap(sourceRects[left]!, sourceRects[right]!))
        throw new Error(
          `Fixed-grid ${plan.id} source-rectangle manifest overlaps roles ${plan.components[left]} and ${plan.components[right]}.`,
        );
  const maximumMeasuredKeyDistance =
    source.maximumMeasuredKeyDistance ?? DEFAULT_MAX_KEY_DISTANCE;
  if (
    maximumMeasuredKeyDistance !== DEFAULT_MAX_KEY_DISTANCE &&
    maximumMeasuredKeyDistance !== MAX_ALLOWED_KEY_DISTANCE
  )
    throw new Error(
      `Fixed-grid ${plan.id} source declared an unsupported measured-key distance ceiling.`,
    );
  if (maximumMeasuredKeyDistance > maximumAllowedKeyDistance)
    throw new Error(
      `Fixed-grid ${plan.id} source exceeded the ${maximumAllowedKeyDistance}px directional key-distance ceiling.`,
    );
  return { mode, sourceRects, maximumMeasuredKeyDistance } as const;
};

const assertAllForegroundAssigned = (
  pixels: Buffer,
  width: number,
  height: number,
  sourceRects: readonly FrontAtlasSourceRect[],
  sheetId: string,
) => {
  for (let y = 0; y < height; y += 1)
    for (let x = 0; x < width; x += 1) {
      if (pixels[(y * width + x) * 4 + 3] === 0) continue;
      let ownerCount = 0;
      for (const rect of sourceRects)
        if (
          x >= rect.x &&
          x < rect.x + rect.width &&
          y >= rect.y &&
          y < rect.y + rect.height
        )
          ownerCount += 1;
      if (ownerCount !== 1)
        throw new Error(
          `Fixed-grid ${sheetId} foreground at ${x},${y} is not owned by exactly one declared source rectangle.`,
        );
    }
};

const extractSheet = async (
  plan: SheetPlan,
  source: FrontAtlasSourceInput,
  maximumAllowedKeyDistance: 32,
) => {
  const sourceContentHash = sha256(source.bytes);
  if (sourceContentHash !== source.expectedContentHash)
    throw new Error(`Fixed-grid ${plan.id} source bytes changed.`);
  const image = sharp(source.bytes, {
    limitInputPixels: MAX_PIXELS,
    animated: false,
  });
  const metadata = await image.metadata();
  if (
    metadata.format !== "png" ||
    (metadata.pages ?? 1) !== 1 ||
    metadata.width !== source.expectedDimensions.width ||
    metadata.height !== source.expectedDimensions.height ||
    !metadata.width ||
    !metadata.height ||
    metadata.width * metadata.height > MAX_PIXELS
  )
    throw new Error(
      `Fixed-grid ${plan.id} source dimensions or codec changed.`,
    );
  if (plan.components.length !== plan.columns * plan.rows)
    throw new Error(
      `Fixed-grid ${plan.id} declaration does not fill its grid.`,
    );
  const extraction = sourceRectsFor(
    plan,
    source,
    metadata.width,
    metadata.height,
    maximumAllowedKeyDistance,
  );

  const keyed = await removeBorderChromaKey(source.bytes);
  const keyDistance = Math.sqrt(
    (keyed.measuredKey.red - EXPECTED_KEY.red) ** 2 +
      (keyed.measuredKey.green - EXPECTED_KEY.green) ** 2 +
      (keyed.measuredKey.blue - EXPECTED_KEY.blue) ** 2,
  );
  if (keyDistance > extraction.maximumMeasuredKeyDistance)
    throw new Error(
      `Fixed-grid ${plan.id} measured ${keyed.measuredKey.hex}, not the declared #ff00ff background.`,
    );
  const decoded = await sharp(keyed.bytes, {
    limitInputPixels: MAX_PIXELS,
    animated: false,
  })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  if (
    decoded.info.width !== metadata.width ||
    decoded.info.height !== metadata.height ||
    decoded.info.channels !== 4
  )
    throw new Error(`Fixed-grid ${plan.id} keyed raster decoded unexpectedly.`);
  assertTransparentOuterBoundary(
    decoded.data,
    decoded.info.width,
    decoded.info.height,
    plan.id,
  );
  assertAllForegroundAssigned(
    decoded.data,
    decoded.info.width,
    decoded.info.height,
    extraction.sourceRects,
    plan.id,
  );

  const keyedSourceContentHash = sha256(keyed.bytes);
  const manifestContentHash = sha256(
    Buffer.from(
      JSON.stringify({
        sourceContentHash,
        dimensions: { width: metadata.width, height: metadata.height },
        components: plan.components,
        sourceRects: extraction.sourceRects,
      }),
      "utf8",
    ),
  );
  const components: ExtractedComponent[] = [];
  for (let index = 0; index < plan.components.length; index += 1) {
    const sourceCell = extraction.sourceRects[index]!;
    const cellPixels = Buffer.alloc(sourceCell.width * sourceCell.height * 4);
    for (let y = 0; y < sourceCell.height; y += 1) {
      const sourceStart =
        ((sourceCell.y + y) * metadata.width + sourceCell.x) * 4;
      const targetStart = y * sourceCell.width * 4;
      decoded.data.copy(
        cellPixels,
        targetStart,
        sourceStart,
        sourceStart + sourceCell.width * 4,
      );
    }
    const component = plan.components[index]!;
    const bounds = inspectContentBounds(
      cellPixels,
      sourceCell.width,
      sourceCell.height,
      component,
    );
    const contentPixels = Buffer.alloc(bounds.width * bounds.height * 4);
    for (let y = 0; y < bounds.height; y += 1) {
      const sourceStart = ((bounds.y + y) * sourceCell.width + bounds.x) * 4;
      cellPixels.copy(
        contentPixels,
        y * bounds.width * 4,
        sourceStart,
        sourceStart + bounds.width * 4,
      );
    }
    const contentBytes = await png(
      sharp(contentPixels, {
        raw: { width: bounds.width, height: bounds.height, channels: 4 },
      }),
    );
    components.push({
      id: component,
      atlas: plan.atlas,
      sourceSheetId: plan.id,
      sourceContentHash,
      keyedSourceContentHash,
      sourceCellIndex: index,
      sourceCell,
      contentBoundsWithinCell: bounds,
      contentBytes,
      contentPixels,
      contentHash: sha256(contentBytes),
      width: bounds.width,
      height: bounds.height,
    });
  }
  return {
    source: {
      id: plan.id,
      atlas: plan.atlas,
      sourceContentHash,
      keyedSourceContentHash,
      dimensions: { width: metadata.width, height: metadata.height },
      extraction: {
        mode: extraction.mode,
        declaredGrid: { columns: plan.columns, rows: plan.rows },
        sourceRects: extraction.sourceRects,
        manifestContentHash,
        maximumMeasuredKeyDistance: extraction.maximumMeasuredKeyDistance,
      },
      measuredKey: keyed.measuredKey,
      alphaPixels: keyed.alphaPixels,
      components: plan.components,
    },
    components,
  };
};

const pointWithin = (
  point: { x: number; y: number },
  rect: FrontAtlasSourceRect,
) =>
  point.x >= rect.x &&
  point.y >= rect.y &&
  point.x < rect.x + rect.width &&
  point.y < rect.y + rect.height;

const composeExclusiveLowerFacePatches = async <
  View extends KidsBipedV1AtlasView,
>(
  input: KidsBipedV1DirectionalAtlasInput["lowerFace"],
  overlays: ExtractedComponent[],
  view: View,
  maximumAllowedKeyDistance: 32,
) => {
  const registrationGroup = `ollo-${view}-lower-face-v1` as const;
  const source = input.base;
  const sourceContentHash = sha256(source.bytes);
  if (sourceContentHash !== source.expectedContentHash)
    throw new Error("Exclusive lower-face base source bytes changed.");
  const image = sharp(source.bytes, {
    limitInputPixels: MAX_PIXELS,
    animated: false,
  });
  const metadata = await image.metadata();
  if (
    metadata.format !== "png" ||
    (metadata.pages ?? 1) !== 1 ||
    metadata.width !== source.expectedDimensions.width ||
    metadata.height !== source.expectedDimensions.height ||
    !metadata.width ||
    !metadata.height ||
    metadata.width * metadata.height > MAX_PIXELS
  )
    throw new Error("Exclusive lower-face base dimensions or codec changed.");
  const sourceRect = input.baseSourceRect;
  if (
    !isIntegerRect(sourceRect) ||
    sourceRect.x + sourceRect.width > metadata.width ||
    sourceRect.y + sourceRect.height > metadata.height
  )
    throw new Error("Exclusive lower-face base source rectangle is unsafe.");
  const maximumMeasuredKeyDistance =
    source.maximumMeasuredKeyDistance ?? DEFAULT_MAX_KEY_DISTANCE;
  if (
    maximumMeasuredKeyDistance !== DEFAULT_MAX_KEY_DISTANCE &&
    maximumMeasuredKeyDistance !== MAX_ALLOWED_KEY_DISTANCE
  )
    throw new Error(
      "Exclusive lower-face base declared an unsupported measured-key distance ceiling.",
    );
  if (maximumMeasuredKeyDistance > maximumAllowedKeyDistance)
    throw new Error(
      `Exclusive lower-face base exceeded the ${maximumAllowedKeyDistance}px directional key-distance ceiling.`,
    );
  const keyed = await removeBorderChromaKey(source.bytes);
  const keyDistance = Math.sqrt(
    (keyed.measuredKey.red - EXPECTED_KEY.red) ** 2 +
      (keyed.measuredKey.green - EXPECTED_KEY.green) ** 2 +
      (keyed.measuredKey.blue - EXPECTED_KEY.blue) ** 2,
  );
  if (keyDistance > maximumMeasuredKeyDistance)
    throw new Error(
      `Exclusive lower-face base measured ${keyed.measuredKey.hex}, not the declared #ff00ff background.`,
    );
  const decoded = await sharp(keyed.bytes, {
    limitInputPixels: MAX_PIXELS,
    animated: false,
  })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  if (
    decoded.info.width !== metadata.width ||
    decoded.info.height !== metadata.height ||
    decoded.info.channels !== 4
  )
    throw new Error(
      "Exclusive lower-face base keyed raster decoded unexpectedly.",
    );
  assertTransparentOuterBoundary(
    decoded.data,
    metadata.width,
    metadata.height,
    "lower-face-base",
  );
  assertAllForegroundAssigned(
    decoded.data,
    metadata.width,
    metadata.height,
    [sourceRect],
    "lower-face-base",
  );
  const basePixels = Buffer.alloc(sourceRect.width * sourceRect.height * 4);
  for (let y = 0; y < sourceRect.height; y += 1) {
    const sourceStart =
      ((sourceRect.y + y) * metadata.width + sourceRect.x) * 4;
    decoded.data.copy(
      basePixels,
      y * sourceRect.width * 4,
      sourceStart,
      sourceStart + sourceRect.width * 4,
    );
  }
  inspectContentBounds(
    basePixels,
    sourceRect.width,
    sourceRect.height,
    "lower-face-base",
  );
  const change = input.mouthChangeBounds;
  if (
    !isIntegerRect(change) ||
    change.x + change.width > sourceRect.width ||
    change.y + change.height > sourceRect.height ||
    !pointWithin(input.noseAnchor, {
      x: 0,
      y: 0,
      width: sourceRect.width,
      height: sourceRect.height,
    }) ||
    !pointWithin(input.pivot, {
      x: 0,
      y: 0,
      width: sourceRect.width,
      height: sourceRect.height,
    }) ||
    change.y < input.noseAnchor.y
  )
    throw new Error(
      "Exclusive lower-face canvas, anchor, pivot, or mouth-change bounds are unsafe.",
    );
  for (let y = change.y; y < change.y + change.height; y += 1)
    for (let x = change.x; x < change.x + change.width; x += 1)
      if (basePixels[(y * sourceRect.width + x) * 4 + 3] !== 255)
        throw new Error(
          `Exclusive lower-face mouth-change bounds must remain inside one opaque base alpha plane (alpha ${basePixels[(y * sourceRect.width + x) * 4 + 3]} at ${x},${y}).`,
        );

  const alphaPlane = Buffer.alloc(sourceRect.width * sourceRect.height);
  for (let pixel = 0; pixel < alphaPlane.length; pixel += 1)
    alphaPlane[pixel] = basePixels[pixel * 4 + 3]!;
  const alphaPlaneHash = sha256(alphaPlane);
  const manifestContentHash = sha256(
    Buffer.from(
      JSON.stringify({
        sourceContentHash,
        dimensions: { width: metadata.width, height: metadata.height },
        sourceRect,
        replacementMode: "exclusive",
        ownedFeatures: ["nose", "muzzle", "mouth"],
        registrationGroup,
        pivot: input.pivot,
        noseAnchor: input.noseAnchor,
        mouthChangeBounds: change,
      }),
      "utf8",
    ),
  );
  const mouthIds = new Set([
    "mouth-rest",
    "viseme-ai",
    "viseme-e",
    "viseme-mbp",
    "viseme-oh",
    "viseme-fv",
    "viseme-l",
    "viseme-wq",
  ]);
  if (
    overlays.length !== mouthIds.size ||
    overlays.some(({ id }) => !mouthIds.has(id))
  )
    throw new Error(
      "Exclusive lower-face patches require the exact eight canonical mouth overlays.",
    );

  const components: ExtractedComponent[] = [];
  const patches: ExclusiveLowerFacePatchResult<View>["patches"] = [];
  for (const overlay of overlays) {
    if (
      overlay.width + SOURCE_SAFETY_INSET * 2 > change.width ||
      overlay.height + SOURCE_SAFETY_INSET * 2 > change.height
    )
      throw new Error(
        `Exclusive lower-face overlay ${overlay.id} does not fit its sealed mouth-change bounds.`,
      );
    const placement = {
      x: change.x + Math.floor((change.width - overlay.width) / 2),
      y: change.y + Math.floor((change.height - overlay.height) / 2),
      width: overlay.width,
      height: overlay.height,
    };
    const pixels = Buffer.from(basePixels);
    for (let y = 0; y < overlay.height; y += 1)
      for (let x = 0; x < overlay.width; x += 1) {
        const sourceOffset = (y * overlay.width + x) * 4;
        const alpha = overlay.contentPixels[sourceOffset + 3]!;
        if (alpha === 0) continue;
        const targetOffset =
          ((placement.y + y) * sourceRect.width + placement.x + x) * 4;
        for (let channel = 0; channel < 3; channel += 1)
          pixels[targetOffset + channel] = Math.round(
            (overlay.contentPixels[sourceOffset + channel]! * alpha +
              basePixels[targetOffset + channel]! * (255 - alpha)) /
              255,
          );
        pixels[targetOffset + 3] = basePixels[targetOffset + 3]!;
      }
    let changedPixelsInsideMouthChange = 0;
    let outsideDelta = 0;
    const patchAlphaPlane = Buffer.alloc(alphaPlane.length);
    for (let y = 0; y < sourceRect.height; y += 1)
      for (let x = 0; x < sourceRect.width; x += 1) {
        const offset = (y * sourceRect.width + x) * 4;
        const inside =
          x >= change.x &&
          x < change.x + change.width &&
          y >= change.y &&
          y < change.y + change.height;
        let changed = false;
        for (let channel = 0; channel < 4; channel += 1)
          if (pixels[offset + channel] !== basePixels[offset + channel])
            changed = true;
        if (inside && changed) changedPixelsInsideMouthChange += 1;
        if (!inside && changed) outsideDelta += 1;
        patchAlphaPlane[y * sourceRect.width + x] = pixels[offset + 3]!;
      }
    if (!changedPixelsInsideMouthChange || outsideDelta !== 0)
      throw new Error(
        `Exclusive lower-face patch ${overlay.id} changed no mouth pixels or escaped its change bounds.`,
      );
    if (!patchAlphaPlane.equals(alphaPlane))
      throw new Error(
        `Exclusive lower-face patch ${overlay.id} changed the shared muzzle alpha plane.`,
      );
    const contentBytes = await png(
      sharp(pixels, {
        raw: {
          width: sourceRect.width,
          height: sourceRect.height,
          channels: 4,
        },
      }),
    );
    const contentHash = sha256(contentBytes);
    components.push({
      id: overlay.id,
      atlas: "face-front",
      sourceSheetId: "mouths",
      sourceContentHash: overlay.sourceContentHash,
      keyedSourceContentHash: overlay.keyedSourceContentHash,
      sourceCellIndex: overlay.sourceCellIndex,
      sourceCell: overlay.sourceCell,
      contentBoundsWithinCell: overlay.contentBoundsWithinCell,
      contentBytes,
      contentPixels: pixels,
      contentHash,
      width: sourceRect.width,
      height: sourceRect.height,
    });
    patches.push({
      id: overlay.id as ExclusiveLowerFacePatchResult<View>["patches"][number]["id"],
      contentHash,
      byteLength: contentBytes.length,
      width: sourceRect.width,
      height: sourceRect.height,
      pivot: input.pivot,
      noseAnchor: input.noseAnchor,
      mouthChangeBounds: change,
      alphaPlaneHash,
      outsideMouthChangeDeltaFromBase: 0,
      changedPixelsInsideMouthChange,
      overlaySourceContentHash: overlay.sourceContentHash,
      overlaySourceCell: overlay.sourceCell,
      overlayContentBoundsWithinCell: overlay.contentBoundsWithinCell,
      overlayPlacement: placement,
    });
  }
  const diagnosticSequence = [
    "mouth-rest",
    "viseme-ai",
    "mouth-rest",
    "viseme-mbp",
    "mouth-rest",
    "viseme-oh",
  ] as const;
  const diagnosticWidth = sourceRect.width * diagnosticSequence.length;
  const diagnosticPixels = Buffer.alloc(
    diagnosticWidth * sourceRect.height * 4,
  );
  const byId = new Map(
    components.map((component) => [component.id, component]),
  );
  const diagnosticFrames: ExclusiveLowerFacePatchResult<View>["diagnostic"]["frames"] =
    [];
  for (let index = 0; index < diagnosticSequence.length; index += 1) {
    const id = diagnosticSequence[index]!;
    const component = byId.get(id);
    if (!component)
      throw new Error(`Exclusive lower-face diagnostic is missing ${id}.`);
    const x = index * sourceRect.width;
    for (let y = 0; y < sourceRect.height; y += 1)
      component.contentPixels.copy(
        diagnosticPixels,
        (y * diagnosticWidth + x) * 4,
        y * sourceRect.width * 4,
        (y + 1) * sourceRect.width * 4,
      );
    diagnosticFrames.push({
      id,
      startFrame: index * 3,
      durationFrames: 3,
      contactSheetRect: {
        x,
        y: 0,
        width: sourceRect.width,
        height: sourceRect.height,
      },
    });
  }
  const diagnosticBytes = await png(
    sharp(diagnosticPixels, {
      raw: {
        width: diagnosticWidth,
        height: sourceRect.height,
        channels: 4,
      },
    }),
  );

  const result: ExclusiveLowerFacePatchResult<View> = {
    contract: {
      replacementMode: "exclusive",
      ownedFeatures: ["nose", "muzzle", "mouth"],
      registrationGroup,
      atomicReplacement: true,
      fixedZOrder: true,
      width: sourceRect.width,
      height: sourceRect.height,
      pivot: input.pivot,
      noseAnchor: input.noseAnchor,
      mouthChangeBounds: change,
      pairwiseOutsideMouthChangeDelta: 0,
      commonAlphaPlane: true,
      headLowerFaceArtRequiredAbsent: true,
    },
    base: {
      sourceContentHash,
      keyedSourceContentHash: sha256(keyed.bytes),
      sourceRect,
      measuredKey: keyed.measuredKey,
      manifestContentHash,
      alphaPlaneHash,
    },
    patches,
    diagnostic: {
      classification: "source-candidate-diagnostic-only",
      framesPerPose: 3,
      bytes: diagnosticBytes,
      contentHash: sha256(diagnosticBytes),
      byteLength: diagnosticBytes.length,
      width: diagnosticWidth,
      height: sourceRect.height,
      sequence: diagnosticSequence,
      frames: diagnosticFrames,
    },
  };
  return { result, components };
};

export const inspectKidsBipedV1FrontSourceSheet = async (
  sheetId: SheetId,
  source: FrontAtlasSourceInput,
) => {
  const plan = SHEET_PLANS.find(({ id }) => id === sheetId);
  if (!plan)
    throw new Error(`Unknown fixed-grid front source sheet: ${sheetId}.`);
  return extractSheet(plan, source, MAX_ALLOWED_KEY_DISTANCE);
};

const composeAtlas = async <Component extends FrontComponent>(
  components: ExtractedComponent[],
  order: readonly Component[],
  columns: number,
): Promise<ComposedFrontAtlas<Component>> => {
  const byId = new Map(
    components.map((component) => [component.id, component]),
  );
  if (
    components.length !== order.length ||
    byId.size !== order.length ||
    order.some((component) => !byId.has(component))
  )
    throw new Error(
      "Front atlas input does not match its canonical inventory.",
    );
  const maximumWidth = Math.max(...components.map(({ width }) => width));
  const maximumHeight = Math.max(...components.map(({ height }) => height));
  const cellWidth = maximumWidth + ATLAS_GUTTER * 2;
  const cellHeight = maximumHeight + ATLAS_GUTTER * 2;
  const rows = Math.ceil(order.length / columns);
  const width = cellWidth * columns;
  const height = cellHeight * rows;
  if (width * height > MAX_PIXELS)
    throw new Error("Composed front atlas exceeds the bounded raster limit.");
  const atlasPixels = Buffer.alloc(width * height * 4);
  const lineage: ComposedFrontAtlas<Component>["components"] = [];
  for (let index = 0; index < order.length; index += 1) {
    const id = order[index]!;
    const component = byId.get(id)!;
    const column = index % columns;
    const row = Math.floor(index / columns);
    const cellX = column * cellWidth;
    const cellY = row * cellHeight;
    const x =
      cellX + ATLAS_GUTTER + Math.floor((maximumWidth - component.width) / 2);
    const y =
      cellY + ATLAS_GUTTER + Math.floor((maximumHeight - component.height) / 2);
    for (let sourceY = 0; sourceY < component.height; sourceY += 1) {
      const sourceStart = sourceY * component.width * 4;
      const targetStart = ((y + sourceY) * width + x) * 4;
      component.contentPixels.copy(
        atlasPixels,
        targetStart,
        sourceStart,
        sourceStart + component.width * 4,
      );
    }
    lineage.push({
      id,
      sourceSheetId: component.sourceSheetId,
      sourceContentHash: component.sourceContentHash,
      keyedSourceContentHash: component.keyedSourceContentHash,
      sourceCellIndex: component.sourceCellIndex,
      sourceCell: component.sourceCell,
      contentBoundsWithinCell: component.contentBoundsWithinCell,
      contentHash: component.contentHash,
      atlasCell: { x: cellX, y: cellY, width: cellWidth, height: cellHeight },
      atlasContentBounds: {
        x,
        y,
        width: component.width,
        height: component.height,
      },
    });
  }
  const bytes = await png(
    sharp(atlasPixels, { raw: { width, height, channels: 4 } }),
  );
  return {
    bytes,
    contentHash: sha256(bytes),
    byteLength: bytes.length,
    width,
    height,
    columns,
    rows,
    cellWidth,
    cellHeight,
    gutter: ATLAS_GUTTER,
    alphaClass: "mixed-alpha",
    components: lineage,
  };
};

const composeKidsBipedV1DirectionalAtlases = async <
  View extends KidsBipedV1AtlasView,
>(
  input: KidsBipedV1DirectionalAtlasInput,
  view: View,
) => {
  const maximumAllowedKeyDistance = MAX_ALLOWED_KEY_DISTANCE;
  validateDeclaredInventory();
  const extracted = [];
  for (const plan of SHEET_PLANS)
    extracted.push(
      await extractSheet(plan, input[plan.id], maximumAllowedKeyDistance),
    );
  const parts = extracted.flatMap(({ components }) =>
    components.filter(({ atlas }) => atlas === "parts-front"),
  );
  const mouthOverlays = extracted.flatMap(({ components }) =>
    components.filter(
      ({ sourceSheetId, atlas }) =>
        sourceSheetId === "mouths" && atlas === "face-front",
    ),
  );
  const lowerFacePatches = await composeExclusiveLowerFacePatches(
    input.lowerFace,
    mouthOverlays,
    view,
    maximumAllowedKeyDistance,
  );
  const face = extracted
    .flatMap(({ components }) =>
      components.filter(
        ({ sourceSheetId, atlas }) =>
          sourceSheetId !== "mouths" && atlas === "face-front",
      ),
    )
    .concat(lowerFacePatches.components);
  return {
    extracted,
    parts: await composeAtlas(parts, kidsBipedV1PartComponents, 5),
    face: await composeAtlas(face, kidsBipedV1FaceComponents, 6),
    lowerFacePatches: lowerFacePatches.result,
  };
};

const processorContract = () => ({
  version: "1.0.0" as const,
  sourceSafetyInset: SOURCE_SAFETY_INSET as 4,
  atlasGutter: ATLAS_GUTTER as 24,
  extraction: "equal-grid-or-sealed-source-rects" as const,
  expectedKey: "#ff00ff" as const,
  maximumAllowedMeasuredKeyDistance: MAX_ALLOWED_KEY_DISTANCE as 32,
  imageLibrary: { id: "sharp" as const, version: sharp.versions.sharp },
  png: {
    compressionLevel: 9 as const,
    adaptiveFiltering: false as const,
    palette: false as const,
    effort: 10 as const,
  },
});

export const composeKidsBipedV1FrontAtlases = async (
  input: KidsBipedV1FrontAtlasInput,
): Promise<FixedGridFrontAtlasResult> => {
  const composed = await composeKidsBipedV1DirectionalAtlases(input, "front");
  return {
    processor: {
      id: "kids-biped-v1-fixed-grid-front-atlas",
      ...processorContract(),
    },
    sources: composed.extracted.map(({ source }) => source),
    atlases: {
      partsFront: composed.parts,
      faceFront: composed.face,
    },
    lowerFacePatches: composed.lowerFacePatches,
    gate: {
      classification: "untrusted-source-candidate",
      declaredCanonicalFrontInventoryComplete: true,
      visualRoleAuditPassed: false,
      registrationReady: false,
      importReceiptCreated: false,
      preparedManifestCreated: false,
      providerAuthority: false,
      preparationAuthority: false,
      productionBindable: false,
      approvalRequired: true,
    },
  };
};

export const composeKidsBipedV1ProfileAtlases = async <
  View extends KidsBipedV1ProfileAtlasView,
>(
  view: View,
  input: KidsBipedV1ProfileAtlasInput,
): Promise<FixedGridProfileAtlasResult<View>> => {
  for (const sheetId of ["core", "limbs", "eyes", "mouths"] as const)
    if (!input[sheetId].sourceRects)
      throw new Error(
        `Profile ${view} ${sheetId} requires sealed source rectangles.`,
      );
  const composed = await composeKidsBipedV1DirectionalAtlases(input, view);
  return {
    view,
    processor: {
      id: "kids-biped-v1-fixed-grid-profile-atlas",
      ...processorContract(),
    },
    sources: composed.extracted.map(({ source }) => ({
      ...source,
      atlas:
        `${source.atlas.startsWith("parts-") ? "parts" : "face"}-${view}` as
          | `parts-${View}`
          | `face-${View}`,
    })),
    atlases: {
      partsProfile: composed.parts,
      faceProfile: composed.face,
    },
    lowerFacePatches: composed.lowerFacePatches,
    gate: {
      classification: "untrusted-source-candidate",
      previewClassification: "source-candidate-diagnostic-only",
      declaredCanonicalProfileInventoryComplete: true,
      visualRoleAuditPassed: false,
      registrationReady: false,
      importReceiptCreated: false,
      preparedManifestCreated: false,
      providerAuthority: false,
      preparationAuthority: false,
      productionBindable: false,
      approvalRequired: true,
    },
  };
};
