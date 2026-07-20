import { createHash } from "node:crypto";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { removeBorderChromaKey } from "./chroma-key";

const sha256 = (bytes: Uint8Array) =>
  createHash("sha256").update(bytes).digest("hex");

describe("deterministic border chroma removal", () => {
  it("measures the border, removes it, and retries byte-identically", async () => {
    const source = await sharp({
      create: {
        width: 64,
        height: 48,
        channels: 3,
        background: { r: 4, g: 248, b: 7 },
      },
    })
      .composite([
        {
          input: Buffer.from(
            '<svg width="24" height="24"><circle cx="12" cy="12" r="10" fill="#f4c26b"/></svg>',
          ),
          left: 20,
          top: 12,
        },
      ])
      .png()
      .toBuffer();

    const first = await removeBorderChromaKey(source);
    const retry = await removeBorderChromaKey(source);
    expect(first.measuredKey.hex).toBe("#04f807");
    expect(first.processor).toEqual(
      expect.objectContaining({
        id: "border-median-soft-distance-matte",
        version: "1.0.0",
        transparentRadius: 40,
        opaqueRadius: 225,
      }),
    );
    expect(first.alphaPixels.transparent).toBeGreaterThan(0);
    expect(first.alphaPixels.opaque).toBeGreaterThan(0);
    expect(sha256(retry.bytes)).toBe(sha256(first.bytes));
    const metadata = await sharp(first.bytes).metadata();
    expect(metadata).toEqual(
      expect.objectContaining({ width: 64, height: 48, channels: 4 }),
    );
  });

  it("rejects non-PNG source bytes", async () => {
    await expect(
      removeBorderChromaKey(Buffer.from("not a png")),
    ).rejects.toThrow(/one bounded PNG raster/i);
  });
});
