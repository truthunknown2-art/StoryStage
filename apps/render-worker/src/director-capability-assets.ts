import { createHash } from "node:crypto";
import { lstat, readFile, realpath } from "node:fs/promises";
import { isAbsolute, relative, resolve } from "node:path";
import {
  approvedAssetBindingSchema,
  executableEpisodePlanSchema,
  type ApprovedAssetBinding,
  type ExecutableEpisodePlan,
} from "@storystage/story-engine/director-alpha";

const isWithin = (root: string, candidate: string) => {
  const path = relative(root, candidate);
  return path === "" || (!path.startsWith("..") && !isAbsolute(path));
};

const pngDimensions = (bytes: Buffer, assetId: string) => {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  if (
    bytes.length < 33 ||
    !bytes.subarray(0, 8).equals(signature) ||
    bytes.toString("ascii", 12, 16) !== "IHDR"
  )
    throw new Error(`Approved Director asset ${assetId} is not a PNG.`);
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
};

export async function verifyApprovedDirectorCapabilityAsset(
  publicRoot: string,
  rawBinding: ApprovedAssetBinding,
  expectedDimensions?: { width: number; height: number },
) {
  const binding = approvedAssetBindingSchema.parse(rawBinding);
  if (
    binding.status !== "approved" ||
    !binding.relativeFile ||
    !binding.byteLength ||
    binding.immutableLocationId !== `sha256:${binding.contentHash}` ||
    !binding.relativeFile.includes(binding.contentHash)
  )
    throw new Error(
      `Director capability asset ${binding.assetId} is not content-addressed.`,
    );
  const requestedRoot = resolve(publicRoot);
  const requestedFile = resolve(
    requestedRoot,
    ...binding.relativeFile.split("/"),
  );
  if (!isWithin(requestedRoot, requestedFile))
    throw new Error(
      "Director capability asset escaped its trusted public root.",
    );
  const rootInfo = await lstat(requestedRoot);
  if (rootInfo.isSymbolicLink() || !rootInfo.isDirectory())
    throw new Error("Director capability public root is not trusted.");
  let current = requestedRoot;
  for (const segment of relative(requestedRoot, requestedFile)
    .split(/[\\/]/)
    .filter(Boolean)) {
    current = resolve(current, segment);
    const info = await lstat(current);
    if (info.isSymbolicLink())
      throw new Error(
        "Director capability asset path contains a symbolic link.",
      );
  }
  const [canonicalRoot, canonicalFile] = await Promise.all([
    realpath(requestedRoot),
    realpath(requestedFile),
  ]);
  if (!isWithin(canonicalRoot, canonicalFile))
    throw new Error("Director capability asset escaped its canonical root.");
  const info = await lstat(canonicalFile);
  if (
    !info.isFile() ||
    info.isSymbolicLink() ||
    info.size !== binding.byteLength ||
    info.size > 64 * 1024 * 1024
  )
    throw new Error(
      `Approved Director asset ${binding.assetId} failed its byte-length binding.`,
    );
  const bytes = await readFile(canonicalFile);
  if (createHash("sha256").update(bytes).digest("hex") !== binding.contentHash)
    throw new Error(
      `Approved Director asset ${binding.assetId} bytes failed their content hash.`,
    );
  const dimensions = pngDimensions(bytes, binding.assetId);
  if (
    expectedDimensions &&
    (dimensions.width !== expectedDimensions.width ||
      dimensions.height !== expectedDimensions.height)
  )
    throw new Error(
      `Approved Director asset ${binding.assetId} dimensions no longer match its executable program.`,
    );
  return {
    assetId: binding.assetId,
    contentHash: binding.contentHash,
    byteLength: bytes.byteLength,
    ...dimensions,
  };
}

export async function verifyDirectorEpisodeCapabilityAssets(
  rawEpisodePlan: ExecutableEpisodePlan,
  publicRoot: string,
) {
  const episode = executableEpisodePlanSchema.parse(rawEpisodePlan);
  const executablePrograms = episode.performancePrograms.filter(
    (program) => program.execution,
  );
  const verified = new Map<
    string,
    Awaited<ReturnType<typeof verifyApprovedDirectorCapabilityAsset>>
  >();
  for (const program of executablePrograms) {
    const execution = program.execution!;
    if (verified.has(execution.assetId)) continue;
    const binding = episode.approvedAssets.find(
      (asset) => asset.assetId === execution.assetId,
    );
    if (!binding)
      throw new Error(
        `Executable Director asset binding is missing: ${execution.assetId}`,
      );
    const expectedDimensions =
      execution.kind === "articulated-rig"
        ? { width: execution.sheetWidth, height: execution.sheetHeight }
        : { width: execution.atlasWidth, height: execution.atlasHeight };
    verified.set(
      execution.assetId,
      await verifyApprovedDirectorCapabilityAsset(
        publicRoot,
        binding,
        expectedDimensions,
      ),
    );
  }
  return [...verified.values()];
}
