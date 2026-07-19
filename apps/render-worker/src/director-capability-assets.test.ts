import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import capabilityAssetCatalog from "../../../packages/remotion-runtime/src/director/generated-capability-asset-catalog.json";
import { describe, expect, it } from "vitest";
import { verifyApprovedDirectorCapabilityAsset } from "./director-capability-assets";

const workspaceRoot = resolve(
  fileURLToPath(new URL("../../..", import.meta.url)),
);

describe("Director capability asset authority", () => {
  it("rejects a different same-size PNG before rendering", async () => {
    const entry = capabilityAssetCatalog.assets.find(
      (asset) => asset.assetId === "mara-run-right-v1",
    )!;
    const source = resolve(
      workspaceRoot,
      "packages/remotion-runtime/public",
      ...entry.relativeFile.split("/"),
    );
    const bytes = await readFile(source);
    const publicRoot = await mkdtemp(
      resolve(tmpdir(), "storystage-director-assets-"),
    );
    const target = resolve(publicRoot, ...entry.relativeFile.split("/"));
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, bytes);
    const binding = {
      assetId: entry.assetId,
      version: "1.0.0",
      contentHash: entry.contentHash,
      status: "approved" as const,
      relativeFile: entry.relativeFile,
      byteLength: entry.byteLength,
      immutableLocationId: entry.immutableLocationId,
    };

    try {
      await expect(
        verifyApprovedDirectorCapabilityAsset(publicRoot, binding, {
          width: entry.width,
          height: entry.height,
        }),
      ).resolves.toMatchObject({
        assetId: entry.assetId,
        contentHash: entry.contentHash,
        byteLength: entry.byteLength,
      });

      const replacement = Buffer.from(bytes);
      const lastIndex = replacement.length - 1;
      replacement[lastIndex] = replacement[lastIndex]! ^ 1;
      expect(replacement.byteLength).toBe(bytes.byteLength);
      await writeFile(target, replacement);

      await expect(
        verifyApprovedDirectorCapabilityAsset(publicRoot, binding, {
          width: entry.width,
          height: entry.height,
        }),
      ).rejects.toThrow(/bytes failed their content hash/i);
    } finally {
      await rm(publicRoot, { recursive: true, force: true });
    }
  });
});
