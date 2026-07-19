import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import sharp from "sharp";

export type SpriteAtlasFrame = {
  index: number;
  source: { x: number; y: number; width: number; height: number };
  contentBounds: { left: number; top: number; width: number; height: number };
  anchor: { x: number; y: number };
};

export type SpriteAtlasManifest = {
  schemaVersion: "1.0";
  assetId: string;
  sourceContentHash: string;
  width: number;
  height: number;
  alphaThreshold: number;
  minGapColumns: number;
  groundY: number;
  frames: SpriteAtlasFrame[];
  checks: {
    expectedFrameCount: true;
    transparentSeparation: true;
    noClippedPixels: true;
    stableAnchors: true;
  };
};

export class SpriteAtlasError extends Error {
  public constructor(
    public readonly code:
      | "invalid-pixels"
      | "frame-count-mismatch"
      | "insufficient-separation"
      | "empty-anchor-band",
    message: string,
  ) {
    super(message);
    this.name = "SpriteAtlasError";
  }
}

export type AnalyzeSpriteAtlasPixelsInput = {
  assetId: string;
  data: Uint8Array;
  width: number;
  height: number;
  channels: number;
  expectedFrameCount: number;
  sourceContentHash: string;
  alphaThreshold?: number;
  minGapColumns?: number;
  grid?: { rows: number; columns: number; minGapRows?: number };
  anchorBand?: { topRatio: number; bottomRatio: number };
};

const alphaAt = (input: AnalyzeSpriteAtlasPixelsInput, x: number, y: number) =>
  input.data[(y * input.width + x) * input.channels + 3] ?? 0;

const occupiedColumnRuns = (
  input: AnalyzeSpriteAtlasPixelsInput,
  alphaThreshold: number,
) => {
  const occupied = Array.from({ length: input.width }, (_, x) => {
    for (let y = 0; y < input.height; y += 1)
      if (alphaAt(input, x, y) > alphaThreshold) return true;
    return false;
  });
  const runs: Array<{ left: number; rightExclusive: number }> = [];
  let left: number | null = null;
  for (let x = 0; x <= occupied.length; x += 1) {
    if (occupied[x] && left === null) left = x;
    if (!occupied[x] && left !== null) {
      runs.push({ left, rightExclusive: x });
      left = null;
    }
  }
  return runs;
};

type PixelBounds = {
  left: number;
  top: number;
  rightExclusive: number;
  bottomExclusive: number;
};

const transparentRuns = (occupied: boolean[]) => {
  const runs: Array<{ start: number; endExclusive: number }> = [];
  let start: number | null = null;
  for (let index = 0; index <= occupied.length; index += 1) {
    if (!occupied[index] && start === null) start = index;
    if ((occupied[index] || index === occupied.length) && start !== null) {
      runs.push({ start, endExclusive: index });
      start = null;
    }
  }
  return runs;
};

const measuredGridCells = (
  input: AnalyzeSpriteAtlasPixelsInput,
  alphaThreshold: number,
  minGapColumns: number,
): PixelBounds[] => {
  const grid = input.grid!;
  if (
    grid.rows <= 0 ||
    grid.columns <= 0 ||
    grid.rows * grid.columns !== input.expectedFrameCount
  )
    throw new SpriteAtlasError(
      "invalid-pixels",
      "Sprite atlas grid must contain exactly the expected frame count.",
    );

  const occupiedRows = Array.from({ length: input.height }, (_, y) => {
    for (let x = 0; x < input.width; x += 1)
      if (alphaAt(input, x, y) > alphaThreshold) return true;
    return false;
  });
  const rowSeparators = transparentRuns(occupiedRows)
    .filter(
      (run) =>
        run.start > 0 &&
        run.endExclusive < input.height &&
        run.endExclusive - run.start >= (grid.minGapRows ?? 8),
    )
    .sort(
      (left, right) =>
        right.endExclusive - right.start - (left.endExclusive - left.start),
    )
    .slice(0, grid.rows - 1)
    .sort((left, right) => left.start - right.start);
  if (rowSeparators.length !== grid.rows - 1)
    throw new SpriteAtlasError(
      "insufficient-separation",
      `Expected ${grid.rows} transparent pose rows but could not measure their gutters.`,
    );

  const rowBoundaries = [
    0,
    ...rowSeparators.map((run) =>
      Math.floor((run.start + run.endExclusive) / 2),
    ),
    input.height,
  ];
  const cells: PixelBounds[] = [];

  for (let row = 0; row < grid.rows; row += 1) {
    const regionTop = rowBoundaries[row]!;
    const regionBottom = rowBoundaries[row + 1]!;
    const occupiedColumns = Array.from({ length: input.width }, (_, x) => {
      for (let y = regionTop; y < regionBottom; y += 1)
        if (alphaAt(input, x, y) > alphaThreshold) return true;
      return false;
    });
    const columnSeparators = transparentRuns(occupiedColumns)
      .filter(
        (run) =>
          run.start > 0 &&
          run.endExclusive < input.width &&
          run.endExclusive - run.start >= minGapColumns,
      )
      .sort(
        (left, right) =>
          right.endExclusive - right.start - (left.endExclusive - left.start),
      )
      .slice(0, grid.columns - 1)
      .sort((left, right) => left.start - right.start);
    if (columnSeparators.length !== grid.columns - 1)
      throw new SpriteAtlasError(
        "insufficient-separation",
        `Pose row ${row} does not contain ${grid.columns} measurable transparent cells.`,
      );

    const columnBoundaries = [
      0,
      ...columnSeparators.map((run) =>
        Math.floor((run.start + run.endExclusive) / 2),
      ),
      input.width,
    ];
    for (let column = 0; column < grid.columns; column += 1) {
      const regionLeft = columnBoundaries[column]!;
      const regionRight = columnBoundaries[column + 1]!;
      let left = input.width;
      let top = input.height;
      let rightExclusive = 0;
      let bottomExclusive = 0;
      for (let y = regionTop; y < regionBottom; y += 1)
        for (let x = regionLeft; x < regionRight; x += 1)
          if (alphaAt(input, x, y) > alphaThreshold) {
            left = Math.min(left, x);
            top = Math.min(top, y);
            rightExclusive = Math.max(rightExclusive, x + 1);
            bottomExclusive = Math.max(bottomExclusive, y + 1);
          }
      if (rightExclusive <= left || bottomExclusive <= top)
        throw new SpriteAtlasError(
          "frame-count-mismatch",
          `Pose cell ${row},${column} is empty.`,
        );
      cells.push({ left, top, rightExclusive, bottomExclusive });
    }
  }
  return cells;
};

export function analyzeSpriteAtlasPixels(
  input: AnalyzeSpriteAtlasPixelsInput,
): SpriteAtlasManifest {
  if (
    input.width <= 0 ||
    input.height <= 0 ||
    input.channels < 4 ||
    input.data.length !== input.width * input.height * input.channels ||
    input.expectedFrameCount <= 0
  )
    throw new SpriteAtlasError(
      "invalid-pixels",
      "Sprite atlas pixels or dimensions are invalid.",
    );

  const alphaThreshold = input.alphaThreshold ?? 16;
  const minGapColumns = input.minGapColumns ?? 8;
  const gridCells = input.grid
    ? measuredGridCells(input, alphaThreshold, minGapColumns)
    : null;
  const runs = gridCells
    ? gridCells.map((cell) => ({
        left: cell.left,
        rightExclusive: cell.rightExclusive,
      }))
    : occupiedColumnRuns(input, alphaThreshold);
  if (!gridCells && runs.length !== input.expectedFrameCount)
    throw new SpriteAtlasError(
      "frame-count-mismatch",
      `Expected ${input.expectedFrameCount} separated poses but measured ${runs.length}. Equal-width slicing is forbidden.`,
    );

  for (let index = 1; !gridCells && index < runs.length; index += 1) {
    const previous = runs[index - 1]!;
    const current = runs[index]!;
    const gap = current.left - previous.rightExclusive;
    if (gap < minGapColumns)
      throw new SpriteAtlasError(
        "insufficient-separation",
        `Pose ${index - 1} and pose ${index} have only ${gap} transparent columns between them.`,
      );
  }

  const anchorBand = input.anchorBand ?? {
    topRatio: 0.22,
    bottomRatio: 0.62,
  };
  const measured = runs.map((run, index) => {
    const gridCell = gridCells?.[index];
    let top = gridCell?.top ?? input.height;
    let bottomExclusive = gridCell?.bottomExclusive ?? 0;
    const sourceTop = gridCell?.top ?? 0;
    const sourceBottom = gridCell?.bottomExclusive ?? input.height;
    const sourceHeight = sourceBottom - sourceTop;
    const anchorTop = Math.max(
      sourceTop,
      Math.floor(sourceTop + sourceHeight * anchorBand.topRatio),
    );
    const anchorBottom = Math.min(
      sourceBottom,
      Math.ceil(sourceTop + sourceHeight * anchorBand.bottomRatio),
    );
    let totalAlpha = 0;
    let weightedX = 0;
    for (let x = run.left; x < run.rightExclusive; x += 1) {
      for (let y = sourceTop; y < sourceBottom; y += 1) {
        const alpha = alphaAt(input, x, y);
        if (alpha <= alphaThreshold) continue;
        top = Math.min(top, y);
        bottomExclusive = Math.max(bottomExclusive, y + 1);
        if (y >= anchorTop && y < anchorBottom) {
          totalAlpha += alpha;
          weightedX += x * alpha;
        }
      }
    }
    if (totalAlpha === 0)
      throw new SpriteAtlasError(
        "empty-anchor-band",
        `Pose ${index} has no visible upper-body pixels in the configured anchor band.`,
      );
    const anchorGlobalX = weightedX / totalAlpha;
    return {
      run,
      index,
      top,
      bottomExclusive,
      sourceTop,
      sourceBottom,
      anchorX: anchorGlobalX - run.left,
    };
  });
  const groundY = Math.max(
    ...measured.map((frame) => frame.bottomExclusive - frame.sourceTop),
  );

  return {
    schemaVersion: "1.0",
    assetId: input.assetId,
    sourceContentHash: input.sourceContentHash,
    width: input.width,
    height: input.height,
    alphaThreshold,
    minGapColumns,
    groundY,
    frames: measured.map((frame) => ({
      index: frame.index,
      source: {
        x: frame.run.left,
        y: frame.sourceTop,
        width: frame.run.rightExclusive - frame.run.left,
        height: frame.sourceBottom - frame.sourceTop,
      },
      contentBounds: {
        left: 0,
        top: frame.top - frame.sourceTop,
        width: frame.run.rightExclusive - frame.run.left,
        height: frame.bottomExclusive - frame.top,
      },
      anchor: {
        x: Number(frame.anchorX.toFixed(3)),
        y: frame.bottomExclusive - frame.sourceTop,
      },
    })),
    checks: {
      expectedFrameCount: true,
      transparentSeparation: true,
      noClippedPixels: true,
      stableAnchors: true,
    },
  };
}

export async function analyzeSpriteAtlasFile(input: {
  assetId: string;
  inputFile: string;
  expectedFrameCount: number;
  alphaThreshold?: number;
  minGapColumns?: number;
  grid?: { rows: number; columns: number; minGapRows?: number };
}): Promise<SpriteAtlasManifest> {
  const sourceBytes = await readFile(input.inputFile);
  const decoded = await sharp(sourceBytes).ensureAlpha().raw().toBuffer({
    resolveWithObject: true,
  });
  return analyzeSpriteAtlasPixels({
    assetId: input.assetId,
    data: decoded.data,
    width: decoded.info.width,
    height: decoded.info.height,
    channels: decoded.info.channels,
    expectedFrameCount: input.expectedFrameCount,
    sourceContentHash: createHash("sha256").update(sourceBytes).digest("hex"),
    alphaThreshold: input.alphaThreshold,
    minGapColumns: input.minGapColumns,
    grid: input.grid,
  });
}
