import {
  mkdtemp,
  mkdir,
  readFile,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import capabilityAssetCatalog from "../../../packages/remotion-runtime/src/director/generated-capability-asset-catalog.json";
import {
  bundledMaraPuppetAsset,
  createBundledKidsCapabilityRegistry,
  createBundledMaraLocalPartsRigManifest,
} from "@storystage/remotion-runtime/director";
import {
  articulatedCharacterRigManifestSchema,
  compileDirectorProject,
  createCapabilityRegistry,
  createCv002Project,
  type PerformanceCapabilityDraft,
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
const publicRoot = resolve(workspaceRoot, "packages/remotion-runtime/public");

const localPartsFixture = () => {
  const firstSentence = [
    ...Array.from({ length: 43 }, (_, index) => `wonder${index}`),
    "shocked!",
  ].join(" ");
  const remainder = Array.from(
    { length: 5 },
    (_, sentenceIndex) =>
      `${Array.from(
        { length: 12 },
        (_, wordIndex) => `detail${sentenceIndex}x${wordIndex}`,
      ).join(" ")}.`,
  ).join(" ");
  const storyProject = createCv002Project(
    "Local-parts asset verification",
    `${firstSentence} ${remainder}`,
    "kids-adventure",
  );
  const proxy = compileDirectorProject({ storyProject });
  const requirement = proxy.directorPlan.beats[0]!.performanceRequirements[0]!;
  const target = {
    kind: "articulated-rig" as const,
    requirementId: requirement.id,
    entityId: requirement.entityId,
  };
  return { storyProject, target };
};

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
    const secondIndex =
      compiled.executableEpisodePlan.performancePrograms.findIndex(
        (program) => program.id !== original.id,
      );
    expect(secondIndex).toBeGreaterThanOrEqual(0);
    const programs = structuredClone(
      compiled.executableEpisodePlan.performancePrograms,
    );
    const second = programs[secondIndex]!;
    const execution = {
      ...structuredClone(original.execution!),
      atlasWidth:
        original.execution!.kind === "atlas-cycle"
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

  it("verifies every local-parts manifest reference against the immutable sheet", async () => {
    const fixture = localPartsFixture();
    const registry = createBundledKidsCapabilityRegistry([fixture.target]);
    const compiled = compileDirectorProject({
      storyProject: fixture.storyProject,
      capabilities: registry,
    });

    await expect(
      verifyDirectorEpisodeCapabilityAssets(
        compiled.executableEpisodePlan,
        publicRoot,
      ),
    ).resolves.toEqual([
      expect.objectContaining({
        assetId: bundledMaraPuppetAsset.assetId,
        contentHash: bundledMaraPuppetAsset.contentHash,
        width: bundledMaraPuppetAsset.width,
        height: bundledMaraPuppetAsset.height,
      }),
    ]);
  });

  it("rejects local-parts manifest dimension drift before rendering", async () => {
    const fixture = localPartsFixture();
    const sealed = createBundledMaraLocalPartsRigManifest(fixture.target);
    const { contentHash: _oldHash, ...manifestDraft } = structuredClone(sealed);
    void _oldHash;
    manifestDraft.identityReference.width += 1;
    const rigManifest = articulatedCharacterRigManifestSchema.parse({
      ...manifestDraft,
      contentHash: hashCanonical(manifestDraft),
    });
    const capability: PerformanceCapabilityDraft = {
      id: `dimension-drift-${fixture.target.requirementId}`,
      ...fixture.target,
      rendererId: rigManifest.renderer.id,
      rendererVersion: rigManifest.renderer.version,
      assets: [
        {
          assetId: bundledMaraPuppetAsset.assetId,
          contentHash: bundledMaraPuppetAsset.contentHash,
          byteLength: bundledMaraPuppetAsset.byteLength,
          immutableLocationId: bundledMaraPuppetAsset.immutableLocationId,
          relativeFile: bundledMaraPuppetAsset.relativeFile,
          version: "1.0.0",
          status: "approved",
        },
      ],
      execution: {
        kind: "articulated-rig",
        mode: "local-parts-v1",
        assetId: bundledMaraPuppetAsset.assetId,
        displayScale: 0.36,
        rigManifest,
      },
    };
    const compiled = compileDirectorProject({
      storyProject: fixture.storyProject,
      capabilities: createCapabilityRegistry({
        version: "dimension-drift-v1",
        capabilities: [capability],
      }),
    });

    await expect(
      verifyDirectorEpisodeCapabilityAssets(
        compiled.executableEpisodePlan,
        publicRoot,
      ),
    ).rejects.toThrow(/dimensions no longer match its sealed manifest/i);
  });

  it("rejects a content-addressed file reached through a junction", async () => {
    const entry = capabilityAssetCatalog.assets.find(
      (asset) => asset.assetId === "mara-run-right-v1",
    )!;
    const bytes = await readFile(
      resolve(publicRoot, ...entry.relativeFile.split("/")),
    );
    const trustedRoot = await mkdtemp(
      resolve(tmpdir(), "storystage-director-symlink-root-"),
    );
    const outsideRoot = await mkdtemp(
      resolve(tmpdir(), "storystage-director-symlink-target-"),
    );
    const segments = entry.relativeFile.split("/");
    const hashDirectory = segments.slice(0, -1).join("/");
    const outsideDirectory = resolve(outsideRoot, "asset");
    await mkdir(outsideDirectory, { recursive: true });
    await writeFile(resolve(outsideDirectory, segments.at(-1)!), bytes);
    await mkdir(dirname(resolve(trustedRoot, hashDirectory)), {
      recursive: true,
    });

    try {
      await symlink(
        outsideDirectory,
        resolve(trustedRoot, hashDirectory),
        "junction",
      );
      await expect(
        verifyApprovedDirectorCapabilityAsset(trustedRoot, {
          assetId: entry.assetId,
          version: "1.0.0",
          contentHash: entry.contentHash,
          status: "approved",
          relativeFile: entry.relativeFile,
          byteLength: entry.byteLength,
          immutableLocationId: entry.immutableLocationId,
        }),
      ).rejects.toThrow(/symbolic link/i);
    } finally {
      await rm(trustedRoot, { recursive: true, force: true });
      await rm(outsideRoot, { recursive: true, force: true });
    }
  });
});
