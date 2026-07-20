import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { describe, expect, it, vi } from "vitest";
import capabilityAssetCatalog from "./generated-capability-asset-catalog.json";
import {
  decodeVerifiedImageBlob,
  rasterAlternativeAttributes,
} from "./VerifiedRasterImage";

describe("verified Director raster contract", () => {
  it("keeps the approved 2098x750 atlas bound to exact valid PNG source bytes", async () => {
    const binding = capabilityAssetCatalog.assets.find(
      (asset) => asset.assetId === "mara-performance-v1",
    )!;
    const bytes = await readFile(
      new URL(`../../public/${binding.relativeFile}`, import.meta.url),
    );
    const decode = vi.fn(async (blob: Blob) => {
      const source = new Uint8Array(await blob.arrayBuffer());
      const view = new DataView(source.buffer);
      expect([...source.subarray(0, 8)]).toEqual([
        137, 80, 78, 71, 13, 10, 26, 10,
      ]);
      expect(view.getUint32(16)).toBe(2098);
      expect(view.getUint32(20)).toBe(750);
      return { close: vi.fn() };
    });

    expect(bytes.byteLength).toBe(binding.byteLength);
    expect(createHash("sha256").update(bytes).digest("hex")).toBe(
      binding.contentHash,
    );
    await expect(
      decodeVerifiedImageBlob(
        new Blob([bytes], { type: binding.mediaType }),
        binding.assetId,
        decode,
      ),
    ).resolves.toBeUndefined();
    expect(decode).toHaveBeenCalledOnce();
  });

  it("proves a blob is decodable and closes the decoded handle", async () => {
    const close = vi.fn();
    const decode = vi.fn(async () => ({ close }));
    const blob = new Blob([new Uint8Array([137, 80, 78, 71])], {
      type: "image/png",
    });

    await expect(
      decodeVerifiedImageBlob(blob, "approved-atlas", decode),
    ).resolves.toBeUndefined();
    expect(decode).toHaveBeenCalledWith(blob);
    expect(close).toHaveBeenCalledOnce();
  });

  it("fails closed before a browser URL is exposed when decode fails", async () => {
    const decode = vi.fn(async () => {
      throw new DOMException("bad image", "EncodingError");
    });

    await expect(
      decodeVerifiedImageBlob(
        new Blob([new Uint8Array([0])], { type: "image/png" }),
        "bad-atlas",
        decode,
      ),
    ).rejects.toThrow(
      "Approved Director asset bad-atlas failed browser decode.",
    );
  });

  it("keeps sprite fragments decorative and meaningful images named", () => {
    expect(rasterAlternativeAttributes({ kind: "decorative" })).toEqual({
      alt: "",
      ariaHidden: true,
    });
    expect(
      rasterAlternativeAttributes({
        kind: "meaningful",
        text: "  Ollo greets Tix in the Little Wood  ",
      }),
    ).toEqual({ alt: "Ollo greets Tix in the Little Wood" });
    expect(() =>
      rasterAlternativeAttributes({ kind: "meaningful", text: "   " }),
    ).toThrow(/requires alternative text/i);
  });
});
