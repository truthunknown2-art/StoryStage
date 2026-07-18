import { describe, expect, it } from "vitest";
import { analyzeSpriteAtlasPixels, SpriteAtlasError } from "./sprite-atlas";

const atlas = (
  width: number,
  height: number,
  rectangles: Array<{
    left: number;
    top: number;
    right: number;
    bottom: number;
  }>,
) => {
  const data = new Uint8Array(width * height * 4);
  for (const rectangle of rectangles)
    for (let y = rectangle.top; y < rectangle.bottom; y += 1)
      for (let x = rectangle.left; x < rectangle.right; x += 1)
        data[(y * width + x) * 4 + 3] = 255;
  return data;
};

describe("sprite atlas analysis", () => {
  it("measures irregular pose cells instead of assuming equal widths", () => {
    const manifest = analyzeSpriteAtlasPixels({
      assetId: "irregular-run",
      data: atlas(90, 40, [
        { left: 2, top: 8, right: 27, bottom: 35 },
        { left: 38, top: 7, right: 51, bottom: 37 },
        { left: 63, top: 9, right: 88, bottom: 34 },
      ]),
      width: 90,
      height: 40,
      channels: 4,
      expectedFrameCount: 3,
      sourceContentHash: "a".repeat(64),
      minGapColumns: 8,
    });

    expect(manifest.frames.map((frame) => frame.source)).toEqual([
      { x: 2, y: 0, width: 25, height: 40 },
      { x: 38, y: 0, width: 13, height: 40 },
      { x: 63, y: 0, width: 25, height: 40 },
    ]);
    expect(manifest.groundY).toBe(37);
    expect(manifest.checks.noClippedPixels).toBe(true);
  });

  it("rejects atlases where the requested poses are not separated", () => {
    expect(() =>
      analyzeSpriteAtlasPixels({
        assetId: "leaking-run",
        data: atlas(50, 30, [
          { left: 2, top: 5, right: 20, bottom: 28 },
          { left: 24, top: 5, right: 45, bottom: 28 },
        ]),
        width: 50,
        height: 30,
        channels: 4,
        expectedFrameCount: 2,
        sourceContentHash: "b".repeat(64),
        minGapColumns: 8,
      }),
    ).toThrowError(SpriteAtlasError);
  });

  it("rejects a frame-count mismatch rather than leaking a neighbor", () => {
    expect(() =>
      analyzeSpriteAtlasPixels({
        assetId: "missing-pose",
        data: atlas(60, 30, [
          { left: 2, top: 5, right: 20, bottom: 28 },
          { left: 35, top: 5, right: 56, bottom: 28 },
        ]),
        width: 60,
        height: 30,
        channels: 4,
        expectedFrameCount: 3,
        sourceContentHash: "c".repeat(64),
      }),
    ).toThrow(/Expected 3 separated poses but measured 2/);
  });

  it("measures an irregular multi-row action sheet in row-major order", () => {
    const manifest = analyzeSpriteAtlasPixels({
      assetId: "guardian-sneeze",
      data: atlas(120, 80, [
        { left: 3, top: 4, right: 19, bottom: 31 },
        { left: 32, top: 6, right: 51, bottom: 33 },
        { left: 65, top: 3, right: 78, bottom: 32 },
        { left: 94, top: 7, right: 117, bottom: 34 },
        { left: 2, top: 47, right: 24, bottom: 77 },
        { left: 36, top: 45, right: 48, bottom: 75 },
        { left: 62, top: 49, right: 82, bottom: 78 },
        { left: 96, top: 46, right: 116, bottom: 76 },
      ]),
      width: 120,
      height: 80,
      channels: 4,
      expectedFrameCount: 8,
      sourceContentHash: "d".repeat(64),
      minGapColumns: 8,
      grid: { rows: 2, columns: 4, minGapRows: 8 },
    });

    expect(manifest.frames.map((frame) => frame.source)).toEqual([
      { x: 3, y: 4, width: 16, height: 27 },
      { x: 32, y: 6, width: 19, height: 27 },
      { x: 65, y: 3, width: 13, height: 29 },
      { x: 94, y: 7, width: 23, height: 27 },
      { x: 2, y: 47, width: 22, height: 30 },
      { x: 36, y: 45, width: 12, height: 30 },
      { x: 62, y: 49, width: 20, height: 29 },
      { x: 96, y: 46, width: 20, height: 30 },
    ]);
    expect(manifest.frames.every((frame) => frame.anchor.y > 0)).toBe(true);
    expect(manifest.groundY).toBe(30);
  });
});
