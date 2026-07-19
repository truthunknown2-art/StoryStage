import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { analyzeSpriteAtlasFile } from "@storystage/asset-pipeline/sprite-atlas";

const workspaceRoot = resolve(process.cwd());
const atlases = [
  {
    assetId: "mara-run-right-v1",
    relativeRoot:
      "packages/remotion-runtime/public/show-packs/kids/moonlit-ruins/v1/rigs/mara/run-right-v1",
  },
  {
    assetId: "milo-run-right-v1",
    relativeRoot:
      "packages/remotion-runtime/public/show-packs/kids/moonlit-ruins/v1/rigs/milo/run-right-v1",
  },
  {
    assetId: "mara-performance-v1",
    relativeRoot:
      "packages/remotion-runtime/public/show-packs/kids/moonlit-ruins/v1/rigs/mara/performance-v1",
  },
  {
    assetId: "mara-sneak-v1",
    relativeRoot:
      "packages/remotion-runtime/public/show-packs/kids/moonlit-ruins/v1/rigs/mara/sneak-v1",
    grid: { rows: 2, columns: 4, minGapRows: 8 },
  },
  {
    assetId: "mara-reaction-v1",
    relativeRoot:
      "packages/remotion-runtime/public/show-packs/kids/moonlit-ruins/v1/rigs/mara/reaction-v1",
    grid: { rows: 2, columns: 4, minGapRows: 8 },
  },
  {
    assetId: "milo-performance-v1",
    relativeRoot:
      "packages/remotion-runtime/public/show-packs/kids/moonlit-ruins/v1/rigs/milo/performance-v1",
  },
  {
    assetId: "milo-sneak-v1",
    relativeRoot:
      "packages/remotion-runtime/public/show-packs/kids/moonlit-ruins/v1/rigs/milo/sneak-v1",
    grid: { rows: 2, columns: 4, minGapRows: 8 },
  },
  {
    assetId: "milo-reaction-v1",
    relativeRoot:
      "packages/remotion-runtime/public/show-packs/kids/moonlit-ruins/v1/rigs/milo/reaction-v1",
    grid: { rows: 2, columns: 4, minGapRows: 8 },
  },
  {
    assetId: "moss-guardian-performance-v1",
    relativeRoot:
      "packages/remotion-runtime/public/show-packs/kids/moonlit-ruins/v1/rigs/moss-guardian/performance-v1",
  },
  {
    assetId: "moss-guardian-chase-v1",
    relativeRoot:
      "packages/remotion-runtime/public/show-packs/kids/moonlit-ruins/v1/rigs/moss-guardian/chase-v1",
    grid: { rows: 2, columns: 4, minGapRows: 8 },
  },
  {
    assetId: "moss-guardian-closeup-v1",
    relativeRoot:
      "packages/remotion-runtime/public/show-packs/kids/moonlit-ruins/v1/rigs/moss-guardian/closeup-v1",
    grid: { rows: 2, columns: 4, minGapRows: 8 },
  },
  {
    assetId: "moss-guardian-sneeze-v1",
    relativeRoot:
      "packages/remotion-runtime/public/show-packs/kids/moonlit-ruins/v1/rigs/moss-guardian/sneeze-v1",
    grid: { rows: 2, columns: 4, minGapRows: 8 },
  },
];

async function main() {
  for (const atlas of atlases) {
    const root = resolve(workspaceRoot, atlas.relativeRoot);
    const manifest = await analyzeSpriteAtlasFile({
      assetId: atlas.assetId,
      inputFile: resolve(root, "atlas.png"),
      expectedFrameCount: 8,
      alphaThreshold: 16,
      minGapColumns: 8,
      grid: atlas.grid,
    });
    await writeFile(
      resolve(root, "atlas-manifest.json"),
      `${JSON.stringify(manifest, null, 2)}\n`,
    );
    console.log(
      `${atlas.assetId}: ${manifest.frames.length} poses, bounds and anchors verified`,
    );
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
