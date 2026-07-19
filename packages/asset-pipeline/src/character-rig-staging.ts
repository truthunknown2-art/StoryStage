import { createHash } from "node:crypto";
import { lstat, mkdir, readFile, realpath, writeFile } from "node:fs/promises";
import { isAbsolute, join, relative, resolve } from "node:path";
import sharp from "sharp";
import {
  characterRigAssetRequestSchema,
  characterRigCandidateBundleSchema,
  characterRigImportReceiptSchema,
  createCharacterRigStagingReport,
  hashCanonical,
  inspectCharacterRigCandidateBundle,
  validateCharacterRigCandidateBundle,
  validateCharacterRigStagingReport,
  type CharacterRigAssetRequest,
  type CharacterRigCandidateBundle,
  type CharacterRigImportReceipt,
  type CharacterRigStagingReport,
  type StagedCharacterRigCandidate,
} from "@storystage/story-engine";

const MAX_FILES = 32;
const MAX_FILE_BYTES = 50 * 1024 * 1024;
const MAX_TOTAL_BYTES = 256 * 1024 * 1024;
const MAX_DIMENSION = 8192;
const MAX_PIXELS = 64_000_000;

export class CharacterRigStagingError extends Error {
  public constructor(
    public readonly code:
      | "invalid-request"
      | "invalid-bundle"
      | "lineage-mismatch"
      | "network-share-rejected"
      | "unsafe-source"
      | "symlink-rejected"
      | "file-count-limit"
      | "file-too-large"
      | "bundle-too-large"
      | "byte-length-mismatch"
      | "hash-mismatch"
      | "invalid-png"
      | "animated-png-rejected"
      | "dimension-limit"
      | "dimension-mismatch"
      | "decode-failed"
      | "untrusted-staging-root"
      | "output-collision",
    message: string,
  ) {
    super(message);
    this.name = "CharacterRigStagingError";
  }
}

export type StageCharacterRigCandidateBundleInput = {
  request: CharacterRigAssetRequest | unknown;
  bundle: CharacterRigCandidateBundle | unknown;
  sourceRoot: string;
  trustedStagingRoot: string;
  stagingRoot: string;
  stagedAt?: string;
};

export type CreateVerifiedCharacterRigImportReceiptInput = {
  request: CharacterRigAssetRequest | unknown;
  bundle: CharacterRigCandidateBundle | unknown;
  report: CharacterRigStagingReport | unknown;
  trustedStagingRoot: string;
  stagingRoot: string;
  importId: string;
  importedAt: string;
};

const sha256 = (bytes: Uint8Array) =>
  createHash("sha256").update(bytes).digest("hex");

const isWithin = (root: string, candidate: string) => {
  const delta = relative(root, candidate);
  return delta === "" || (!delta.startsWith("..") && !isAbsolute(delta));
};

const ensureLocalRoot = async (root: string, label: string) => {
  const absolute = resolve(root);
  if (absolute.startsWith("\\\\"))
    throw new CharacterRigStagingError(
      "network-share-rejected",
      `${label} must use a local filesystem root.`,
    );
  const info = await lstat(absolute);
  if (info.isSymbolicLink() || !info.isDirectory())
    throw new CharacterRigStagingError(
      "symlink-rejected",
      `${label} must be a real local directory.`,
    );
  return { absolute, canonical: await realpath(absolute) };
};

const resolveSafeSource = async (sourceRoot: string, relativeFile: string) => {
  const root = await ensureLocalRoot(sourceRoot, "Character rig source folder");
  const parts = relativeFile.split("/");
  const target = resolve(root.absolute, ...parts);
  if (!isWithin(root.absolute, target))
    throw new CharacterRigStagingError(
      "unsafe-source",
      `Character rig candidate escapes its selected source folder: ${relativeFile}.`,
    );
  let cursor = root.absolute;
  for (const part of parts) {
    cursor = join(cursor, part);
    const info = await lstat(cursor);
    if (info.isSymbolicLink())
      throw new CharacterRigStagingError(
        "symlink-rejected",
        `Character rig candidate path contains a symbolic link or junction: ${relativeFile}.`,
      );
  }
  const info = await lstat(target);
  if (!info.isFile())
    throw new CharacterRigStagingError(
      "unsafe-source",
      `Character rig candidate is not a regular file: ${relativeFile}.`,
    );
  const canonical = await realpath(target);
  if (!isWithin(root.canonical, canonical))
    throw new CharacterRigStagingError(
      "unsafe-source",
      `Character rig candidate resolves outside its selected source folder: ${relativeFile}.`,
    );
  return { canonical, size: info.size };
};

const ensureTrustedStagingRoot = async (
  trustedStagingRoot: string,
  stagingRoot: string,
) => {
  const trusted = resolve(trustedStagingRoot);
  const target = resolve(stagingRoot);
  if (trusted.startsWith("\\\\") || target.startsWith("\\\\"))
    throw new CharacterRigStagingError(
      "network-share-rejected",
      "Character rig staging must use local filesystem roots.",
    );
  if (!isWithin(trusted, target))
    throw new CharacterRigStagingError(
      "untrusted-staging-root",
      "Character rig staging root is outside the host-owned trusted root.",
    );
  await mkdir(trusted, { recursive: true });
  const trustedInfo = await lstat(trusted);
  if (trustedInfo.isSymbolicLink() || !trustedInfo.isDirectory())
    throw new CharacterRigStagingError(
      "symlink-rejected",
      "Trusted character rig staging root must be a real local directory.",
    );
  const canonicalTrusted = await realpath(trusted);
  const parts = relative(trusted, target).split(/[\\/]+/).filter(Boolean);
  let cursor = trusted;
  for (const part of parts) {
    cursor = join(cursor, part);
    try {
      const info = await lstat(cursor);
      if (info.isSymbolicLink())
        throw new CharacterRigStagingError(
          "symlink-rejected",
          "Character rig staging path contains a symbolic link or junction.",
        );
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") break;
      throw error;
    }
  }
  await mkdir(target, { recursive: true });
  cursor = trusted;
  for (const part of parts) {
    cursor = join(cursor, part);
    const info = await lstat(cursor);
    if (info.isSymbolicLink() || !info.isDirectory())
      throw new CharacterRigStagingError(
        "symlink-rejected",
        "Character rig staging path must contain only real directories.",
      );
  }
  const canonicalTarget = await realpath(target);
  if (!isWithin(canonicalTrusted, canonicalTarget))
    throw new CharacterRigStagingError(
      "untrusted-staging-root",
      "Character rig staging root resolves outside the host-owned trusted root.",
    );
  return canonicalTarget;
};

const ensureRealDerivedDirectory = async (
  stagingRoot: string,
  segments: string[],
  createMissing: boolean,
) => {
  const canonicalRoot = await realpath(stagingRoot);
  let cursor = canonicalRoot;
  for (const segment of segments) {
    if (!/^[a-z0-9][a-z0-9-]*$/.test(segment))
      throw new CharacterRigStagingError(
        "untrusted-staging-root",
        "Character rig staging derived an unsafe directory name.",
      );
    const next = resolve(cursor, segment);
    if (!isWithin(canonicalRoot, next))
      throw new CharacterRigStagingError(
        "untrusted-staging-root",
        "Character rig staging derived a directory outside its staging root.",
      );
    if (createMissing) {
      try {
        await mkdir(next, { mode: 0o700 });
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
      }
    }
    const info = await lstat(next);
    if (info.isSymbolicLink() || !info.isDirectory())
      throw new CharacterRigStagingError(
        "symlink-rejected",
        "Character rig staging derived path contains a symbolic link, junction, or non-directory.",
      );
    const canonicalNext = await realpath(next);
    if (!isWithin(canonicalRoot, canonicalNext))
      throw new CharacterRigStagingError(
        "untrusted-staging-root",
        "Character rig staging derived directory resolves outside its staging root.",
      );
    cursor = canonicalNext;
  }
  return cursor;
};

const resolveSafePublicationTarget = async (
  stagingRoot: string,
  directorySegments: string[],
  fileName: string,
) => {
  const canonicalRoot = await realpath(stagingRoot);
  const canonicalParent = await ensureRealDerivedDirectory(
    canonicalRoot,
    directorySegments,
    false,
  );
  const target = resolve(canonicalParent, fileName);
  if (!isWithin(canonicalRoot, target))
    throw new CharacterRigStagingError(
      "untrusted-staging-root",
      "Character rig publication target escapes its staging root.",
    );
  return target;
};

type PngHeader = {
  width: number;
  height: number;
};

const parsePngHeader = (bytes: Buffer): PngHeader => {
  const signature = "89504e470d0a1a0a";
  if (
    bytes.length < 45 ||
    bytes.subarray(0, 8).toString("hex") !== signature ||
    bytes.readUInt32BE(8) !== 13 ||
    bytes.toString("ascii", 12, 16) !== "IHDR"
  )
    throw new CharacterRigStagingError(
      "invalid-png",
      "Character rig candidate is not a structurally valid PNG.",
    );
  const width = bytes.readUInt32BE(16);
  const height = bytes.readUInt32BE(20);
  const colorType = bytes[25];
  if (!width || !height || colorType === undefined)
    throw new CharacterRigStagingError(
      "invalid-png",
      "Character rig candidate PNG has an invalid IHDR.",
    );
  let offset = 8;
  let sawIend = false;
  while (offset + 12 <= bytes.length) {
    const length = bytes.readUInt32BE(offset);
    const type = bytes.toString("ascii", offset + 4, offset + 8);
    const next = offset + 12 + length;
    if (next > bytes.length)
      throw new CharacterRigStagingError(
        "invalid-png",
        "Character rig candidate PNG is truncated.",
      );
    if (type === "acTL")
      throw new CharacterRigStagingError(
        "animated-png-rejected",
        "Animated PNG candidates are not accepted as rig source sheets.",
      );
    if (type === "IEND") {
      sawIend = true;
      if (next !== bytes.length)
        throw new CharacterRigStagingError(
          "invalid-png",
          "Character rig candidate PNG contains trailing bytes.",
        );
      break;
    }
    offset = next;
  }
  if (!sawIend)
    throw new CharacterRigStagingError(
      "invalid-png",
      "Character rig candidate PNG has no terminal IEND chunk.",
    );
  return { width, height };
};

const decodeSinglePagePng = async (bytes: Buffer, candidateId: string) => {
  try {
    const image = sharp(bytes, {
      limitInputPixels: MAX_PIXELS,
      sequentialRead: true,
      pages: 1,
    });
    const metadata = await image.metadata();
    if (
      metadata.format !== "png" ||
      (metadata.pages ?? 1) !== 1 ||
      !metadata.width ||
      !metadata.height
    )
      throw new Error("PNG did not decode as one raster page.");
    const decoded = await image.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    let hasTransparentPixel = false;
    for (let offset = 3; offset < decoded.data.length; offset += decoded.info.channels)
      if (decoded.data[offset] !== 255) {
        hasTransparentPixel = true;
        break;
      }
    return {
      width: metadata.width,
      height: metadata.height,
      alphaClass: hasTransparentPixel ? ("mixed-alpha" as const) : ("opaque" as const),
    };
  } catch (error) {
    throw new CharacterRigStagingError(
      "decode-failed",
      `Character rig candidate failed bounded single-page decode: ${candidateId}. ${error instanceof Error ? error.message : ""}`,
    );
  }
};

const writeImmutable = async (
  output: string,
  bytes: Buffer,
  collisionMessage: string,
) => {
  try {
    await writeFile(output, bytes, { flag: "wx", mode: 0o600 });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
    const existingInfo = await lstat(output);
    if (existingInfo.isSymbolicLink() || !existingInfo.isFile())
      throw new CharacterRigStagingError("output-collision", collisionMessage);
    const existing = await readFile(output);
    if (!existing.equals(bytes))
      throw new CharacterRigStagingError("output-collision", collisionMessage);
  }
};

export const stageCharacterRigCandidateBundle = async (
  input: StageCharacterRigCandidateBundleInput,
): Promise<CharacterRigStagingReport> => {
  const requestResult = characterRigAssetRequestSchema.safeParse(input.request);
  if (!requestResult.success)
    throw new CharacterRigStagingError(
      "invalid-request",
      requestResult.error.issues.map((issue) => issue.message).join("; "),
    );
  const bundleResult = characterRigCandidateBundleSchema.safeParse(input.bundle);
  if (!bundleResult.success)
    throw new CharacterRigStagingError(
      "invalid-bundle",
      bundleResult.error.issues.map((issue) => issue.message).join("; "),
    );
  const request = requestResult.data;
  const bundle = bundleResult.data;
  let inspection;
  try {
    inspection = inspectCharacterRigCandidateBundle(request, bundle);
  } catch (error) {
    throw new CharacterRigStagingError(
      "lineage-mismatch",
      error instanceof Error ? error.message : "Character rig lineage mismatch.",
    );
  }
  if (bundle.assets.length > MAX_FILES)
    throw new CharacterRigStagingError(
      "file-count-limit",
      `Character rig bundle exceeds ${MAX_FILES} files.`,
    );

  const validated: Array<{
    asset: (typeof bundle.assets)[number];
    bytes: Buffer;
    header: PngHeader;
    alphaClass: "opaque" | "mixed-alpha";
  }> = [];
  const contentHashes = new Set<string>();
  let totalBytes = 0;
  for (const asset of bundle.assets) {
    if (contentHashes.has(asset.contentHash))
      throw new CharacterRigStagingError(
        "invalid-bundle",
        `Character rig source bytes are reused across request items: ${asset.candidateId}.`,
      );
    contentHashes.add(asset.contentHash);
    const source = await resolveSafeSource(input.sourceRoot, asset.relativeFile);
    if (source.size > MAX_FILE_BYTES)
      throw new CharacterRigStagingError(
        "file-too-large",
        `Character rig candidate exceeds 50 MB: ${asset.candidateId}.`,
      );
    if (source.size !== asset.byteLength)
      throw new CharacterRigStagingError(
        "byte-length-mismatch",
        `Character rig candidate byte length changed: ${asset.candidateId}.`,
      );
    totalBytes += source.size;
    if (totalBytes > MAX_TOTAL_BYTES)
      throw new CharacterRigStagingError(
        "bundle-too-large",
        "Character rig candidate bundle exceeds 256 MB.",
      );
    const bytes = await readFile(source.canonical);
    if (sha256(bytes) !== asset.contentHash)
      throw new CharacterRigStagingError(
        "hash-mismatch",
        `Character rig candidate bytes changed: ${asset.candidateId}.`,
      );
    const header = parsePngHeader(bytes);
    if (
      header.width > MAX_DIMENSION ||
      header.height > MAX_DIMENSION ||
      header.width * header.height > MAX_PIXELS
    )
      throw new CharacterRigStagingError(
        "dimension-limit",
        `Character rig candidate exceeds safe decode dimensions: ${asset.candidateId}.`,
      );
    if (header.width !== asset.width || header.height !== asset.height)
      throw new CharacterRigStagingError(
        "dimension-mismatch",
        `Character rig candidate dimensions changed: ${asset.candidateId}.`,
      );
    const decoded = await decodeSinglePagePng(bytes, asset.candidateId);
    if (decoded.width !== header.width || decoded.height !== header.height)
      throw new CharacterRigStagingError(
        "dimension-mismatch",
        `Decoded character rig dimensions disagree with IHDR: ${asset.candidateId}.`,
      );
    validated.push({ asset, bytes, header, alphaClass: decoded.alphaClass });
  }

  const stagingRoot = await ensureTrustedStagingRoot(
    input.trustedStagingRoot,
    input.stagingRoot,
  );
  await ensureRealDerivedDirectory(stagingRoot, ["character-rig"], true);
  await ensureRealDerivedDirectory(
    stagingRoot,
    ["character-rig", "candidates"],
    true,
  );
  const requestFile = await resolveSafePublicationTarget(
    stagingRoot,
    ["character-rig"],
    `request-${request.contentHash}.json`,
  );
  await writeImmutable(
    requestFile,
    Buffer.from(`${JSON.stringify(request, null, 2)}\n`, "utf8"),
    "Character rig request evidence path contains conflicting bytes.",
  );
  const bundleFile = await resolveSafePublicationTarget(
    stagingRoot,
    ["character-rig"],
    `candidate-bundle-${bundle.contentHash}.json`,
  );
  await writeImmutable(
    bundleFile,
    Buffer.from(`${JSON.stringify(bundle, null, 2)}\n`, "utf8"),
    "Character rig candidate bundle evidence path contains conflicting bytes.",
  );
  const stagedAssets: StagedCharacterRigCandidate[] = [];
  for (const entry of validated) {
    const relativeFile = `character-rig/candidates/${entry.asset.contentHash}.png`;
    const output = await resolveSafePublicationTarget(
      stagingRoot,
      ["character-rig", "candidates"],
      `${entry.asset.contentHash}.png`,
    );
    await writeImmutable(
      output,
      entry.bytes,
      `Character rig staged path contains conflicting bytes: ${entry.asset.candidateId}.`,
    );
    stagedAssets.push({
      candidateId: entry.asset.candidateId,
      requestItemId: entry.asset.requestItemId,
      sourceContentHash: entry.asset.contentHash,
      stagedContentHash: entry.asset.contentHash,
      immutableLocationId: `sha256:${entry.asset.contentHash}`,
      relativeFile,
      byteLength: entry.asset.byteLength,
      mediaType: "image/png",
      width: entry.asset.width,
      height: entry.asset.height,
      alphaClass: entry.alphaClass,
      checks: {
        byteLength: true,
        contentHash: true,
        codec: true,
        dimensions: true,
        decodedSinglePage: true,
      },
    });
  }

  const report = createCharacterRigStagingReport({
    schemaVersion: "1.0",
    reportId: `rig-staging-${bundle.contentHash.slice(0, 20)}`,
    requestId: request.requestId,
    requestContentHash: request.contentHash,
    bundleContentHash: bundle.contentHash,
    identityLockContentHash: request.identityLock.contentHash,
    templateContentHash: request.rigProfile.templateContentHash,
    status: inspection.status,
    returnedItems: inspection.returnedItems,
    missingItems: inspection.missingItems,
    unknownItems: inspection.unknownItems,
    assets: stagedAssets,
    providerAuthority: false,
    approvalRequired: true,
    stagedAt: input.stagedAt ?? new Date().toISOString(),
  });
  const reportFile = await resolveSafePublicationTarget(
    stagingRoot,
    ["character-rig"],
    `staging-report-${report.contentHash}.json`,
  );
  await writeImmutable(
    reportFile,
    Buffer.from(`${JSON.stringify(report, null, 2)}\n`, "utf8"),
    "Character rig staging report path contains conflicting bytes.",
  );
  return report;
};

const sealCharacterRigImportReceipt = (
  report: CharacterRigStagingReport,
  importId: string,
  importedAt: string,
): CharacterRigImportReceipt => {
  const draft = {
    schemaVersion: "1.0" as const,
    importId,
    requestContentHash: report.requestContentHash,
    candidateBundleContentHash: report.bundleContentHash,
    stagingReportContentHash: report.contentHash,
    files: report.assets.map((asset) => ({
      requestItemId: asset.requestItemId,
      candidateId: asset.candidateId,
      sourceContentHash: asset.sourceContentHash,
      byteLength: asset.byteLength,
      mediaType: asset.mediaType,
      width: asset.width,
      height: asset.height,
      immutableLocationId: asset.immutableLocationId,
      stagedRelativeFile: asset.relativeFile,
    })),
    providerAuthority: false as const,
    approvalRequired: true as const,
    importedAt,
  };
  return characterRigImportReceiptSchema.parse({
    ...draft,
    contentHash: hashCanonical(draft),
  });
};

const readVerifiedPublishedFile = async (
  stagingRoot: string,
  directorySegments: string[],
  fileName: string,
  maximumBytes: number,
) => {
  const target = await resolveSafePublicationTarget(
    stagingRoot,
    directorySegments,
    fileName,
  );
  const info = await lstat(target);
  if (info.isSymbolicLink() || !info.isFile())
    throw new CharacterRigStagingError(
      "symlink-rejected",
      "Character rig published evidence must be a real regular file.",
    );
  if (info.size > maximumBytes)
    throw new CharacterRigStagingError(
      "file-too-large",
      "Character rig published evidence exceeds its size limit.",
    );
  const canonicalRoot = await realpath(stagingRoot);
  const canonicalTarget = await realpath(target);
  if (!isWithin(canonicalRoot, canonicalTarget))
    throw new CharacterRigStagingError(
      "untrusted-staging-root",
      "Character rig published evidence resolves outside its staging root.",
    );
  return readFile(canonicalTarget);
};

export const createVerifiedCharacterRigImportReceipt = async (
  input: CreateVerifiedCharacterRigImportReceiptInput,
): Promise<CharacterRigImportReceipt> => {
  const request = characterRigAssetRequestSchema.parse(input.request);
  const bundle = characterRigCandidateBundleSchema.parse(input.bundle);
  validateCharacterRigCandidateBundle(request, bundle);
  const report = validateCharacterRigStagingReport(
    request,
    bundle,
    input.report as CharacterRigStagingReport,
  );
  if (
    report.status !== "complete" ||
    report.missingItems.length ||
    report.unknownItems.length
  )
    throw new Error(
      "A character rig import receipt requires exact request-item coverage.",
    );

  const stagingRoot = await ensureTrustedStagingRoot(
    input.trustedStagingRoot,
    input.stagingRoot,
  );
  const persistedReportBytes = await readVerifiedPublishedFile(
    stagingRoot,
    ["character-rig"],
    `staging-report-${report.contentHash}.json`,
    8_000_000,
  );
  const persistedReport = validateCharacterRigStagingReport(
    request,
    bundle,
    JSON.parse(persistedReportBytes.toString("utf8")) as CharacterRigStagingReport,
  );
  if (hashCanonical(persistedReport) !== hashCanonical(report))
    throw new Error(
      "Character rig import receipt requires the exact persisted staging report.",
    );

  const sources = new Map(
    bundle.assets.map((asset) => [asset.candidateId, asset]),
  );
  for (const asset of report.assets) {
    const source = sources.get(asset.candidateId);
    if (!source)
      throw new Error(
        `Character rig staging report names an unknown candidate: ${asset.candidateId}.`,
      );
    const expectedRelativeFile = `character-rig/candidates/${source.contentHash}.png`;
    if (asset.relativeFile !== expectedRelativeFile)
      throw new Error(
        `Character rig staged candidate is not at its content-addressed path: ${asset.candidateId}.`,
      );
    const bytes = await readVerifiedPublishedFile(
      stagingRoot,
      ["character-rig", "candidates"],
      `${source.contentHash}.png`,
      MAX_FILE_BYTES,
    );
    if (bytes.length !== source.byteLength || bytes.length !== asset.byteLength)
      throw new CharacterRigStagingError(
        "byte-length-mismatch",
        `Character rig staged bytes changed: ${asset.candidateId}.`,
      );
    const contentHash = sha256(bytes);
    if (
      contentHash !== source.contentHash ||
      contentHash !== asset.sourceContentHash ||
      contentHash !== asset.stagedContentHash
    )
      throw new CharacterRigStagingError(
        "hash-mismatch",
        `Character rig staged bytes changed: ${asset.candidateId}.`,
      );
    const header = parsePngHeader(bytes);
    if (
      header.width !== source.width ||
      header.height !== source.height ||
      header.width !== asset.width ||
      header.height !== asset.height
    )
      throw new CharacterRigStagingError(
        "dimension-mismatch",
        `Character rig staged dimensions changed: ${asset.candidateId}.`,
      );
    const decoded = await decodeSinglePagePng(bytes, asset.candidateId);
    if (
      decoded.width !== header.width ||
      decoded.height !== header.height ||
      decoded.alphaClass !== asset.alphaClass
    )
      throw new CharacterRigStagingError(
        "dimension-mismatch",
        `Character rig staged decode evidence changed: ${asset.candidateId}.`,
      );
  }

  const receipt = sealCharacterRigImportReceipt(
    report,
    input.importId,
    input.importedAt,
  );
  const receiptFile = await resolveSafePublicationTarget(
    stagingRoot,
    ["character-rig"],
    `import-receipt-${receipt.contentHash}.json`,
  );
  await writeImmutable(
    receiptFile,
    Buffer.from(`${JSON.stringify(receipt, null, 2)}\n`, "utf8"),
    "Character rig import receipt path contains conflicting bytes.",
  );
  return receipt;
};
