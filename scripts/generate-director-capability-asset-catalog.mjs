import { createHash } from "node:crypto";
import { Buffer } from "node:buffer";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import process from "node:process";
import { fileURLToPath, URL } from "node:url";

const workspaceRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const publicRoot = resolve(workspaceRoot, "packages/remotion-runtime/public");
const catalogFile = resolve(
  workspaceRoot,
  "packages/remotion-runtime/src/director/generated-capability-asset-catalog.json",
);
const sources = [
  {
    assetId: "mara-performance-v1",
    sourceRelativeFile:
      "show-packs/kids/moonlit-ruins/v1/rigs/mara/performance-v1/atlas.png",
  },
  {
    assetId: "mara-run-right-v1",
    sourceRelativeFile:
      "show-packs/kids/moonlit-ruins/v1/rigs/mara/run-right-v1/atlas.png",
  },
  {
    assetId: "mara-payoff-puppet-v1",
    sourceRelativeFile:
      "show-packs/kids/moonlit-ruins/v1/rigs/mara/payoff-puppet-v1/puppet-parts.png",
  },
];

const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");

const pngDimensions = (bytes, assetId) => {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  if (
    bytes.length < 33 ||
    !bytes.subarray(0, 8).equals(signature) ||
    bytes.toString("ascii", 12, 16) !== "IHDR"
  )
    throw new Error(`${assetId} is not a valid PNG catalog source.`);
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
};

const sourceBytes = [];
const assets = [];
for (const source of sources) {
  const bytes = await readFile(resolve(publicRoot, source.sourceRelativeFile));
  sourceBytes.push(bytes);
  const contentHash = sha256(bytes);
  assets.push({
    assetId: source.assetId,
    contentHash,
    byteLength: bytes.byteLength,
    mediaType: "image/png",
    immutableLocationId: `sha256:${contentHash}`,
    relativeFile: `capability-assets/sha256/${contentHash}.png`,
    ...pngDimensions(bytes, source.assetId),
  });
}

const draft = { schemaVersion: "1.0", assets };
const catalog = {
  ...draft,
  contentHash: sha256(Buffer.from(JSON.stringify(draft))),
};
const expectedCatalog = `${JSON.stringify(catalog, null, 2)}\n`;
const checking = process.argv.includes("--check");

if (checking) {
  const actualCatalog = await readFile(catalogFile, "utf8");
  // GitHub's Windows runners may check text files out with CRLF even though the
  // generator deliberately emits LF. Line-ending conversion is not catalog
  // drift; every semantic byte binding below still has to match exactly.
  if (actualCatalog.replace(/\r\n/g, "\n") !== expectedCatalog)
    throw new Error(
      "Generated Director capability asset catalog is stale. Run pnpm generate:director-capability-assets.",
    );
  for (const entry of assets) {
    const bytes = await readFile(resolve(publicRoot, entry.relativeFile));
    if (
      bytes.byteLength !== entry.byteLength ||
      sha256(bytes) !== entry.contentHash
    )
      throw new Error(
        `Content-addressed Director capability asset failed byte verification: ${entry.assetId}`,
      );
  }
  process.stdout.write(
    `Verified ${assets.length} content-addressed Director capability assets.\n`,
  );
} else {
  await mkdir(dirname(catalogFile), { recursive: true });
  await writeFile(catalogFile, expectedCatalog, "utf8");
  for (const [index, entry] of assets.entries()) {
    const target = resolve(publicRoot, entry.relativeFile);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, sourceBytes[index]);
  }
  process.stdout.write(
    `Generated ${assets.length} content-addressed Director capability assets.\n`,
  );
}
