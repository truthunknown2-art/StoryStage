import { createHash } from "node:crypto";
import sharp from "sharp";
import { kidsBipedV1RequiredTurnaroundViews } from "@storystage/story-engine";
import { removeBorderChromaKey } from "./chroma-key";

const MAX_PIXELS = 64_000_000;
const EXPECTED_KEY = { red: 255, green: 0, blue: 255 } as const;
const MAXIMUM_KEY_DISTANCE = 32;
const CELL_WIDTH = 576;
const CELL_HEIGHT = 832;
const CHARACTER_HEIGHT = 768;
const FOOT_BASELINE = 800;
const HORIZONTAL_SAFETY_INSET = 32;

const sha256 = (bytes: Uint8Array) =>
  createHash("sha256").update(bytes).digest("hex");

export type TurnaroundSheetView =
  (typeof kidsBipedV1RequiredTurnaroundViews)[number];

export type TurnaroundSheetSource = {
  view: TurnaroundSheetView;
  bytes: Buffer;
  expectedContentHash: string;
  expectedDimensions: { width: number; height: number };
};

type Rect = { x: number; y: number; width: number; height: number };

export type TurnaroundSheetCompositionResult = {
  processor: {
    id: "kids-biped-v1-five-view-turnaround-compositor";
    version: "1.0.0";
    canonicalOrder: readonly TurnaroundSheetView[];
    expectedKey: "#ff00ff";
    maximumMeasuredKeyDistance: 32;
    registration: {
      cellWidth: 576;
      cellHeight: 832;
      characterHeight: 768;
      footBaseline: 800;
      horizontalSafetyInset: 32;
      horizontalAlignment: "content-bounds-center";
      verticalAlignment: "content-bounds-foot-baseline";
      transform: "scale-and-translate";
    };
    imageLibrary: { id: "sharp"; version: string };
    resizeKernel: "lanczos3";
    png: {
      compressionLevel: 9;
      adaptiveFiltering: false;
      palette: false;
      effort: 10;
    };
  };
  sources: Array<{
    view: TurnaroundSheetView;
    sourceContentHash: string;
    keyedSourceContentHash: string;
    dimensions: { width: number; height: number };
    measuredKey: { red: number; green: number; blue: number; hex: string };
    measuredKeyDistance: number;
    alphaPixels: { transparent: number; partial: number; opaque: number };
    sourceContentBounds: Rect;
  }>;
  sheet: {
    bytes: Buffer;
    contentHash: string;
    byteLength: number;
    width: 2880;
    height: 832;
    alphaClass: "mixed-alpha";
    views: Array<{
      view: TurnaroundSheetView;
      sourceContentHash: string;
      keyedSourceContentHash: string;
      sourceContentBounds: Rect;
      normalizedContentHash: string;
      normalizedByteLength: number;
      normalizedWidth: number;
      normalizedHeight: 768;
      targetCharacterHeight: 768;
      scale: number;
      translateX: number;
      translateY: 32;
      baselineY: 800;
      resampler: "lanczos3";
      processorVersion: "1.0.0";
      sheetSourceRect: Rect;
      sheetContentBounds: Rect;
      derivedBytes: Buffer;
      derivedContentHash: string;
      derivedByteLength: number;
      transform: "scale-and-translate";
    }>;
  };
  gate: {
    classification: "untrusted-source-candidate";
    exactFiveViewInventoryComplete: true;
    deterministicRegistrationComplete: true;
    identityConsistencyPassed: false;
    semanticViewAuditPassed: false;
    registrationReady: false;
    coverageEvidenceRequired: true;
    importReceiptCreated: false;
    preparedManifestCreated: false;
    providerAuthority: false;
    preparationAuthority: false;
    productionBindable: false;
    approvalRequired: true;
  };
};

const encodePng = (image: sharp.Sharp) =>
  image
    .png({
      compressionLevel: 9,
      adaptiveFiltering: false,
      palette: false,
      effort: 10,
    })
    .toBuffer();

const inspectContentBounds = (
  pixels: Buffer,
  width: number,
  height: number,
  view: TurnaroundSheetView,
): Rect => {
  let minimumX = width;
  let minimumY = height;
  let maximumX = -1;
  let maximumY = -1;
  for (let y = 0; y < height; y += 1)
    for (let x = 0; x < width; x += 1) {
      if (pixels[(y * width + x) * 4 + 3] === 0) continue;
      minimumX = Math.min(minimumX, x);
      minimumY = Math.min(minimumY, y);
      maximumX = Math.max(maximumX, x);
      maximumY = Math.max(maximumY, y);
    }
  if (maximumX < 0 || maximumY < 0)
    throw new Error(`Turnaround ${view} source has no foreground.`);
  if (
    minimumX === 0 ||
    minimumY === 0 ||
    maximumX === width - 1 ||
    maximumY === height - 1
  )
    throw new Error(
      `Turnaround ${view} foreground touches its source boundary.`,
    );
  return {
    x: minimumX,
    y: minimumY,
    width: maximumX - minimumX + 1,
    height: maximumY - minimumY + 1,
  };
};

const assertCanonicalSources = (sources: readonly TurnaroundSheetSource[]) => {
  if (sources.length !== kidsBipedV1RequiredTurnaroundViews.length)
    throw new Error("Turnaround composition requires exactly five sources.");
  for (const [
    index,
    expectedView,
  ] of kidsBipedV1RequiredTurnaroundViews.entries())
    if (sources[index]?.view !== expectedView)
      throw new Error(
        "Turnaround sources must use the exact canonical front, three-quarter, profile-left, profile-right, rear order.",
      );
};

export const composeKidsBipedV1TurnaroundSheet = async (
  sources: readonly TurnaroundSheetSource[],
): Promise<TurnaroundSheetCompositionResult> => {
  assertCanonicalSources(sources);

  const sourceEvidence: TurnaroundSheetCompositionResult["sources"] = [];
  const normalized: Array<{
    view: TurnaroundSheetView;
    sourceContentHash: string;
    keyedSourceContentHash: string;
    sourceContentBounds: Rect;
    bytes: Buffer;
    width: number;
  }> = [];

  for (const source of sources) {
    const sourceContentHash = sha256(source.bytes);
    if (sourceContentHash !== source.expectedContentHash)
      throw new Error(`Turnaround ${source.view} source bytes changed.`);
    const metadata = await sharp(source.bytes, {
      limitInputPixels: MAX_PIXELS,
      animated: false,
    }).metadata();
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
        `Turnaround ${source.view} source dimensions or codec changed.`,
      );

    const keyed = await removeBorderChromaKey(source.bytes);
    const measuredKeyDistance = Math.sqrt(
      (keyed.measuredKey.red - EXPECTED_KEY.red) ** 2 +
        (keyed.measuredKey.green - EXPECTED_KEY.green) ** 2 +
        (keyed.measuredKey.blue - EXPECTED_KEY.blue) ** 2,
    );
    if (measuredKeyDistance > MAXIMUM_KEY_DISTANCE)
      throw new Error(
        `Turnaround ${source.view} measured ${keyed.measuredKey.hex}, outside the 32px #ff00ff key gate.`,
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
      throw new Error(`Turnaround ${source.view} keyed raster changed shape.`);
    const sourceContentBounds = inspectContentBounds(
      decoded.data,
      decoded.info.width,
      decoded.info.height,
      source.view,
    );
    const extracted = await encodePng(
      sharp(keyed.bytes, {
        limitInputPixels: MAX_PIXELS,
        animated: false,
      }).extract({
        left: sourceContentBounds.x,
        top: sourceContentBounds.y,
        width: sourceContentBounds.width,
        height: sourceContentBounds.height,
      }),
    );
    const normalizedBytes = await encodePng(
      sharp(extracted, {
        limitInputPixels: MAX_PIXELS,
        animated: false,
      }).resize({
        height: CHARACTER_HEIGHT,
        kernel: sharp.kernel.lanczos3,
      }),
    );
    const normalizedMetadata = await sharp(normalizedBytes).metadata();
    if (
      normalizedMetadata.width === undefined ||
      normalizedMetadata.height !== CHARACTER_HEIGHT ||
      normalizedMetadata.width > CELL_WIDTH - HORIZONTAL_SAFETY_INSET * 2
    )
      throw new Error(
        `Turnaround ${source.view} cannot fit the sealed registration cell.`,
      );
    sourceEvidence.push({
      view: source.view,
      sourceContentHash,
      keyedSourceContentHash: sha256(keyed.bytes),
      dimensions: { width: metadata.width, height: metadata.height },
      measuredKey: keyed.measuredKey,
      measuredKeyDistance,
      alphaPixels: keyed.alphaPixels,
      sourceContentBounds,
    });
    normalized.push({
      view: source.view,
      sourceContentHash,
      keyedSourceContentHash: sha256(keyed.bytes),
      sourceContentBounds,
      bytes: normalizedBytes,
      width: normalizedMetadata.width,
    });
  }

  const composites = normalized.map((view, index) => ({
    input: view.bytes,
    left: index * CELL_WIDTH + Math.floor((CELL_WIDTH - view.width) / 2),
    top: FOOT_BASELINE - CHARACTER_HEIGHT,
  }));
  const sheetBytes = await encodePng(
    sharp({
      create: {
        width: CELL_WIDTH * kidsBipedV1RequiredTurnaroundViews.length,
        height: CELL_HEIGHT,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
    }).composite(composites),
  );
  const sheetHash = sha256(sheetBytes);
  const sheetViews: TurnaroundSheetCompositionResult["sheet"]["views"] = [];
  const derivedHashes = new Set<string>();
  for (const [index, view] of normalized.entries()) {
    const sheetSourceRect = {
      x: index * CELL_WIDTH,
      y: 0,
      width: CELL_WIDTH,
      height: CELL_HEIGHT,
    };
    const derivedBytes = await encodePng(
      sharp(sheetBytes, { limitInputPixels: MAX_PIXELS, animated: false })
        .extract({
          left: sheetSourceRect.x,
          top: sheetSourceRect.y,
          width: sheetSourceRect.width,
          height: sheetSourceRect.height,
        })
        .ensureAlpha(),
    );
    const derived = await sharp(derivedBytes)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    const localBounds = inspectContentBounds(
      derived.data,
      derived.info.width,
      derived.info.height,
      view.view,
    );
    if (
      localBounds.height !== CHARACTER_HEIGHT ||
      localBounds.y + localBounds.height - 1 !== FOOT_BASELINE - 1 ||
      Math.abs(localBounds.x * 2 + localBounds.width - CELL_WIDTH) > 1
    )
      throw new Error(
        `Turnaround ${view.view} registration is not centered on the common height and baseline.`,
      );
    const derivedContentHash = sha256(derivedBytes);
    if (derivedHashes.has(derivedContentHash))
      throw new Error(
        "Every turnaround view must have independently derived bytes.",
      );
    derivedHashes.add(derivedContentHash);
    sheetViews.push({
      view: view.view,
      sourceContentHash: view.sourceContentHash,
      keyedSourceContentHash: view.keyedSourceContentHash,
      sourceContentBounds: view.sourceContentBounds,
      normalizedContentHash: sha256(view.bytes),
      normalizedByteLength: view.bytes.length,
      normalizedWidth: view.width,
      normalizedHeight: CHARACTER_HEIGHT,
      targetCharacterHeight: CHARACTER_HEIGHT,
      scale: CHARACTER_HEIGHT / view.sourceContentBounds.height,
      translateX: sheetSourceRect.x + Math.floor((CELL_WIDTH - view.width) / 2),
      translateY: 32,
      baselineY: FOOT_BASELINE,
      resampler: "lanczos3",
      processorVersion: "1.0.0",
      sheetSourceRect,
      sheetContentBounds: {
        x: sheetSourceRect.x + localBounds.x,
        y: localBounds.y,
        width: localBounds.width,
        height: localBounds.height,
      },
      derivedBytes,
      derivedContentHash,
      derivedByteLength: derivedBytes.length,
      transform: "scale-and-translate",
    });
  }

  return {
    processor: {
      id: "kids-biped-v1-five-view-turnaround-compositor",
      version: "1.0.0",
      canonicalOrder: [...kidsBipedV1RequiredTurnaroundViews],
      expectedKey: "#ff00ff",
      maximumMeasuredKeyDistance: 32,
      registration: {
        cellWidth: CELL_WIDTH,
        cellHeight: CELL_HEIGHT,
        characterHeight: CHARACTER_HEIGHT,
        footBaseline: FOOT_BASELINE,
        horizontalSafetyInset: HORIZONTAL_SAFETY_INSET,
        horizontalAlignment: "content-bounds-center",
        verticalAlignment: "content-bounds-foot-baseline",
        transform: "scale-and-translate",
      },
      imageLibrary: { id: "sharp", version: sharp.versions.sharp },
      resizeKernel: "lanczos3",
      png: {
        compressionLevel: 9,
        adaptiveFiltering: false,
        palette: false,
        effort: 10,
      },
    },
    sources: sourceEvidence,
    sheet: {
      bytes: sheetBytes,
      contentHash: sheetHash,
      byteLength: sheetBytes.length,
      width: 2880,
      height: 832,
      alphaClass: "mixed-alpha",
      views: sheetViews,
    },
    gate: {
      classification: "untrusted-source-candidate",
      exactFiveViewInventoryComplete: true,
      deterministicRegistrationComplete: true,
      identityConsistencyPassed: false,
      semanticViewAuditPassed: false,
      registrationReady: false,
      coverageEvidenceRequired: true,
      importReceiptCreated: false,
      preparedManifestCreated: false,
      providerAuthority: false,
      preparationAuthority: false,
      productionBindable: false,
      approvalRequired: true,
    },
  };
};
