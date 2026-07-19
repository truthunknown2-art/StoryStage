import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import capabilityAssetCatalog from "../../../packages/remotion-runtime/src/director/generated-capability-asset-catalog.json";
import { createBundledKidsCapabilityRegistry } from "@storystage/remotion-runtime/director";
import {
  compileDirectorProject,
  createCv002Project,
  type ExecutableEpisodePlan,
} from "@storystage/story-engine/director-alpha";
import { hashCanonical } from "@storystage/story-engine";
import { describe, expect, it } from "vitest";
import {
  verifyApprovedDirectorCapabilityAsset,
  verifyDirectorEpisodeCapabilityAssets,
} from "./director-capability-assets";

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

  it("validates every program that reuses an already verified atlas", async () => {
    const storyProject = createCv002Project(
      "Shared atlas authority",
      `Mara and Pip study a trail of glowing leaves beside the village garden before sunrise. A paper lantern swings beneath the old oak while the friends listen for the tiny bell hidden in the branches.

Mara ran across the clearing, jumped over a narrow stream, and carried the lantern toward a mossy stone gate. Pip follows behind and points when the light skips ahead, but both friends stay on the same visible path.

Behind the gate, Mara discovers a painted marker and reveals that the missing bell is tucked inside silver grass. She reaches toward it, pauses when the grass rustles, and smiles as a sleepy moth lifts the bell into the air.`,
      "kids-adventure",
    );
    const proxy = compileDirectorProject({ storyProject });
    const target = proxy.directorPlan.beats
      .flatMap((beat) => beat.performanceRequirements)
      .find((requirement) => requirement.source === "atlas-cycle")!;
    const registry = createBundledKidsCapabilityRegistry([
      {
        kind: "atlas-cycle",
        requirementId: target.id,
        entityId: target.entityId,
      },
    ]);
    const compiled = compileDirectorProject({
      storyProject,
      capabilities: registry,
    });
    const original = compiled.executableEpisodePlan.performancePrograms.find(
      (program) => program.execution?.kind === "atlas-cycle",
    )!;
    const secondIndex = compiled.executableEpisodePlan.performancePrograms.findIndex(
      (program) => program.id !== original.id,
    );
    expect(secondIndex).toBeGreaterThanOrEqual(0);
    const programs = structuredClone(
      compiled.executableEpisodePlan.performancePrograms,
    );
    const second = programs[secondIndex]!;
    const execution = {
      ...structuredClone(original.execution!),
      atlasWidth: original.execution!.kind === "atlas-cycle"
        ? original.execution!.atlasWidth - 1
        : 1,
    };
    const secondDraft = {
      ...second,
      kind: "atlas-cycle" as const,
      rendererId: original.rendererId,
      rendererVersion: original.rendererVersion,
      assetIds: [...original.assetIds],
      manifestContentHash: original.manifestContentHash,
      execution,
    };
    programs[secondIndex] = {
      ...secondDraft,
      contentHash: hashCanonical(
        Object.fromEntries(
          Object.entries(secondDraft).filter(([key]) => key !== "contentHash"),
        ),
      ),
    };
    const { contentHash: _oldHash, ...episodeDraft } =
      compiled.executableEpisodePlan;
    void _oldHash;
    const changedDraft = { ...episodeDraft, performancePrograms: programs };
    const changedEpisode = {
      ...changedDraft,
      contentHash: hashCanonical(changedDraft),
    } as ExecutableEpisodePlan;

    await expect(
      verifyDirectorEpisodeCapabilityAssets(
        changedEpisode,
        resolve(workspaceRoot, "packages/remotion-runtime/public"),
      ),
    ).rejects.toThrow(/dimensions no longer match its executable program/i);
  });
});
