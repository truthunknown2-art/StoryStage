import {createHash} from "node:crypto";
import {lstat, mkdir, readFile, realpath, writeFile} from "node:fs/promises";
import {basename, isAbsolute, join, relative, resolve} from "node:path";
import {
  candidateBundleSchema,
  stagedCandidateSchema,
  type CandidateBundle,
  type StagedCandidate,
} from "@storystage/story-engine";

const DEFAULT_MAX_FILES = 32;
const DEFAULT_MAX_FILE_BYTES = 50 * 1024 * 1024;
const DEFAULT_MAX_TOTAL_BYTES = 256 * 1024 * 1024;
const DEFAULT_MAX_DIMENSION = 8_192;
const DEFAULT_MAX_PIXELS = 64 * 1024 * 1024;

type SupportedMediaType = "image/png" | "image/jpeg" | "image/webp";

type DetectedImage = {
  mediaType: SupportedMediaType;
  extension: "png" | "jpg" | "webp";
  width: number;
  height: number;
  hasAlpha: boolean;
};

export type CandidateStagingLimits = {
  maxFiles?: number;
  maxFileBytes?: number;
  maxTotalBytes?: number;
  maxDimension?: number;
  maxPixels?: number;
};

export type StageCandidateBundleInput = {
  bundle: CandidateBundle | unknown;
  sourceRoot: string;
  trustedStagingRoot: string;
  stagingRoot: string;
  limits?: CandidateStagingLimits;
};

export type LooseCandidateFile = {candidateId: string; sourceFile: string};
export type LooseStagedCandidate = {
  candidate: StagedCandidate;
  originalName: string;
  mediaType: SupportedMediaType;
  width: number;
  height: number;
};

export type StageLooseCandidateFilesInput = {
  files: LooseCandidateFile[];
  trustedStagingRoot: string;
  stagingRoot: string;
  limits?: CandidateStagingLimits;
};

export class CandidateStagingError extends Error {
  public constructor(
    public readonly code:
      | "invalid-bundle"
      | "duplicate-candidate"
      | "unsafe-source"
      | "network-share-rejected"
      | "symlink-rejected"
      | "file-count-limit"
      | "file-too-large"
      | "bundle-too-large"
      | "dimension-limit"
      | "unsupported-media"
      | "media-mismatch"
      | "dimension-mismatch"
      | "hash-mismatch"
      | "untrusted-staging-root"
      | "output-collision",
    message: string,
  ) {
    super(message);
    this.name = "CandidateStagingError";
  }
}

function sha256(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function isWithin(root: string, candidate: string): boolean {
  const pathFromRoot = relative(root, candidate);
  return pathFromRoot === "" || (!pathFromRoot.startsWith("..") && !isAbsolute(pathFromRoot));
}

async function resolveSafeSource(sourceRoot: string, relativeFile: string): Promise<string> {
  const absoluteRoot = resolve(sourceRoot);
  if (absoluteRoot.startsWith("\\\\")) {
    throw new CandidateStagingError("network-share-rejected", "Network candidate folders are disabled for this release.");
  }
  const rootInfo = await lstat(absoluteRoot);
  if (rootInfo.isSymbolicLink()) {
    throw new CandidateStagingError("symlink-rejected", "The selected candidate source folder cannot be a symbolic link.");
  }

  const pathParts = relativeFile.split("/");
  const absoluteSource = resolve(absoluteRoot, ...pathParts);
  if (!isWithin(absoluteRoot, absoluteSource)) {
    throw new CandidateStagingError("unsafe-source", `Candidate source escapes the selected folder: ${relativeFile}`);
  }

  let currentPath = absoluteRoot;
  for (const pathPart of pathParts) {
    currentPath = join(currentPath, pathPart);
    const pathInfo = await lstat(currentPath);
    if (pathInfo.isSymbolicLink()) {
      throw new CandidateStagingError("symlink-rejected", `Candidate source contains a symbolic link: ${relativeFile}`);
    }
  }

  const [realRoot, realSource] = await Promise.all([realpath(absoluteRoot), realpath(absoluteSource)]);
  if (!isWithin(realRoot, realSource)) {
    throw new CandidateStagingError("unsafe-source", `Candidate source resolves outside the selected folder: ${relativeFile}`);
  }
  return realSource;
}

async function ensureTrustedStagingRoot(trustedStagingRoot: string, stagingRoot: string): Promise<string> {
  const trustedRoot = resolve(trustedStagingRoot);
  const targetRoot = resolve(stagingRoot);
  if (trustedRoot.startsWith("\\\\") || targetRoot.startsWith("\\\\")) {
    throw new CandidateStagingError("network-share-rejected", "Private candidate staging must use a local filesystem root.");
  }
  if (!isWithin(trustedRoot, targetRoot)) {
    throw new CandidateStagingError("untrusted-staging-root", "The candidate staging folder is outside the main-process trusted root.");
  }

  await mkdir(trustedRoot, {recursive: true});
  const trustedInfo = await lstat(trustedRoot);
  if (trustedInfo.isSymbolicLink() || !trustedInfo.isDirectory()) {
    throw new CandidateStagingError("symlink-rejected", "The trusted candidate root must be a real local directory.");
  }
  const canonicalTrustedRoot = await realpath(trustedRoot);
  const pathParts = relative(trustedRoot, targetRoot).split(/[\\/]+/).filter(Boolean);
  let currentPath = trustedRoot;
  for (const pathPart of pathParts) {
    currentPath = join(currentPath, pathPart);
    try {
      const pathInfo = await lstat(currentPath);
      if (pathInfo.isSymbolicLink()) {
        throw new CandidateStagingError("symlink-rejected", "The private candidate path contains a symbolic link or junction.");
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") break;
      throw error;
    }
  }

  await mkdir(targetRoot, {recursive: true});
  currentPath = trustedRoot;
  for (const pathPart of pathParts) {
    currentPath = join(currentPath, pathPart);
    const pathInfo = await lstat(currentPath);
    if (pathInfo.isSymbolicLink() || !pathInfo.isDirectory()) {
      throw new CandidateStagingError("symlink-rejected", "The private candidate path must contain only real directories.");
    }
  }
  const canonicalTargetRoot = await realpath(targetRoot);
  if (!isWithin(canonicalTrustedRoot, canonicalTargetRoot)) {
    throw new CandidateStagingError("untrusted-staging-root", "The candidate staging folder resolves outside the trusted root.");
  }
  return canonicalTargetRoot;
}

function detectPng(bytes: Uint8Array): DetectedImage | null {
  const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (bytes.length < 26 || !signature.every((value, index) => bytes[index] === value)) return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const width = view.getUint32(16);
  const height = view.getUint32(20);
  const colorType = bytes[25];
  if (width === 0 || height === 0 || colorType === undefined) return null;
  return {mediaType: "image/png", extension: "png", width, height, hasAlpha: colorType === 4 || colorType === 6};
}

function detectJpeg(bytes: Uint8Array): DetectedImage | null {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return null;
  let offset = 2;
  while (offset + 9 < bytes.length) {
    if (bytes[offset] !== 0xff) return null;
    const marker = bytes[offset + 1];
    if (marker === undefined) return null;
    if (marker === 0xd9 || marker === 0xda) break;
    if (marker >= 0xd0 && marker <= 0xd7) {
      offset += 2;
      continue;
    }
    const segmentLength = ((bytes[offset + 2] ?? 0) << 8) | (bytes[offset + 3] ?? 0);
    if (segmentLength < 2 || offset + 2 + segmentLength > bytes.length) return null;
    const isStartOfFrame = (marker >= 0xc0 && marker <= 0xc3) || (marker >= 0xc5 && marker <= 0xc7) || (marker >= 0xc9 && marker <= 0xcb) || (marker >= 0xcd && marker <= 0xcf);
    if (isStartOfFrame) {
      const height = ((bytes[offset + 5] ?? 0) << 8) | (bytes[offset + 6] ?? 0);
      const width = ((bytes[offset + 7] ?? 0) << 8) | (bytes[offset + 8] ?? 0);
      if (width === 0 || height === 0) return null;
      return {mediaType: "image/jpeg", extension: "jpg", width, height, hasAlpha: false};
    }
    offset += 2 + segmentLength;
  }
  return null;
}

function ascii(bytes: Uint8Array, start: number, length: number): string {
  return String.fromCharCode(...bytes.slice(start, start + length));
}

function uint24LittleEndian(bytes: Uint8Array, offset: number): number {
  return (bytes[offset] ?? 0) | ((bytes[offset + 1] ?? 0) << 8) | ((bytes[offset + 2] ?? 0) << 16);
}

function detectWebp(bytes: Uint8Array): DetectedImage | null {
  if (bytes.length < 30 || ascii(bytes, 0, 4) !== "RIFF" || ascii(bytes, 8, 4) !== "WEBP") return null;
  const chunk = ascii(bytes, 12, 4);
  if (chunk === "VP8X") {
    const width = uint24LittleEndian(bytes, 24) + 1;
    const height = uint24LittleEndian(bytes, 27) + 1;
    return {mediaType: "image/webp", extension: "webp", width, height, hasAlpha: ((bytes[20] ?? 0) & 0x10) !== 0};
  }
  if (chunk === "VP8L" && bytes[20] === 0x2f) {
    const byteOne = bytes[21] ?? 0;
    const byteTwo = bytes[22] ?? 0;
    const byteThree = bytes[23] ?? 0;
    const byteFour = bytes[24] ?? 0;
    const width = 1 + (((byteTwo & 0x3f) << 8) | byteOne);
    const height = 1 + ((byteFour & 0x0f) << 10) + (byteThree << 2) + ((byteTwo & 0xc0) >> 6);
    return {mediaType: "image/webp", extension: "webp", width, height, hasAlpha: true};
  }
  if (chunk === "VP8 " && bytes[23] === 0x9d && bytes[24] === 0x01 && bytes[25] === 0x2a) {
    const width = (((bytes[27] ?? 0) << 8) | (bytes[26] ?? 0)) & 0x3fff;
    const height = (((bytes[29] ?? 0) << 8) | (bytes[28] ?? 0)) & 0x3fff;
    if (width === 0 || height === 0) return null;
    return {mediaType: "image/webp", extension: "webp", width, height, hasAlpha: false};
  }
  return null;
}

function detectImage(bytes: Uint8Array): DetectedImage {
  const detected = detectPng(bytes) ?? detectJpeg(bytes) ?? detectWebp(bytes);
  if (!detected) throw new CandidateStagingError("unsupported-media", "Candidate bytes are not a supported PNG, JPEG, or WebP image.");
  return detected;
}

export async function stageCandidateBundle(input: StageCandidateBundleInput): Promise<StagedCandidate[]> {
  const parsedBundle = candidateBundleSchema.safeParse(input.bundle);
  if (!parsedBundle.success) {
    throw new CandidateStagingError("invalid-bundle", parsedBundle.error.issues.map((issue) => issue.message).join("; "));
  }

  const limits = {
    maxFiles: input.limits?.maxFiles ?? DEFAULT_MAX_FILES,
    maxFileBytes: input.limits?.maxFileBytes ?? DEFAULT_MAX_FILE_BYTES,
    maxTotalBytes: input.limits?.maxTotalBytes ?? DEFAULT_MAX_TOTAL_BYTES,
    maxDimension: input.limits?.maxDimension ?? DEFAULT_MAX_DIMENSION,
    maxPixels: input.limits?.maxPixels ?? DEFAULT_MAX_PIXELS,
  };
  if (parsedBundle.data.assets.length > limits.maxFiles) {
    throw new CandidateStagingError("file-count-limit", `Candidate bundle exceeds the ${limits.maxFiles}-file limit.`);
  }

  const candidateIds = new Set<string>();
  const validated: Array<{candidateId: string; bytes: Uint8Array; detected: DetectedImage; hash: string}> = [];
  let totalBytes = 0;

  for (const asset of parsedBundle.data.assets) {
    if (candidateIds.has(asset.candidateId)) {
      throw new CandidateStagingError("duplicate-candidate", `Candidate ID is repeated: ${asset.candidateId}`);
    }
    candidateIds.add(asset.candidateId);

    const source = await resolveSafeSource(input.sourceRoot, asset.relativeFile);
    const sourceInfo = await lstat(source);
    if (!sourceInfo.isFile()) throw new CandidateStagingError("unsafe-source", `Candidate is not a regular file: ${asset.relativeFile}`);
    if (sourceInfo.size > limits.maxFileBytes) {
      throw new CandidateStagingError("file-too-large", `Candidate exceeds the per-file byte limit: ${asset.candidateId}`);
    }
    totalBytes += sourceInfo.size;
    if (totalBytes > limits.maxTotalBytes) {
      throw new CandidateStagingError("bundle-too-large", "Candidate bundle exceeds the total byte limit.");
    }

    const bytes = await readFile(source);
    const detected = detectImage(bytes);
    if (detected.width > limits.maxDimension || detected.height > limits.maxDimension || detected.width * detected.height > limits.maxPixels) {
      throw new CandidateStagingError("dimension-limit", `Candidate dimensions exceed the safe decode limits: ${asset.candidateId}`);
    }
    if (detected.mediaType !== asset.mediaType) {
      throw new CandidateStagingError("media-mismatch", `Candidate media type does not match its bytes: ${asset.candidateId}`);
    }
    if (detected.width !== asset.width || detected.height !== asset.height) {
      throw new CandidateStagingError("dimension-mismatch", `Candidate dimensions do not match its bytes: ${asset.candidateId}`);
    }
    const hash = sha256(bytes);
    if (hash !== asset.contentHash) {
      throw new CandidateStagingError("hash-mismatch", `Candidate content hash does not match its bytes: ${asset.candidateId}`);
    }
    validated.push({candidateId: asset.candidateId, bytes, detected, hash});
  }

  const stagingRoot = await ensureTrustedStagingRoot(input.trustedStagingRoot, input.stagingRoot);
  const candidateOutputRoot = resolve(stagingRoot, "candidates");
  await mkdir(candidateOutputRoot, {recursive: true});

  const staged: StagedCandidate[] = [];
  for (const candidate of validated) {
    const relativeFile = `candidates/${candidate.candidateId}.${candidate.detected.extension}`;
    const destination = resolve(stagingRoot, ...relativeFile.split("/"));
    if (!isWithin(stagingRoot, destination)) {
      throw new CandidateStagingError("unsafe-source", `Derived staging path escaped its root: ${candidate.candidateId}`);
    }
    try {
      await writeFile(destination, candidate.bytes, {flag: "wx"});
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "EEXIST") {
        throw new CandidateStagingError("output-collision", `A staged candidate already exists: ${candidate.candidateId}`);
      }
      throw error;
    }

    staged.push(stagedCandidateSchema.parse({
      candidateId: candidate.candidateId,
      sourceContentHash: candidate.hash,
      stagedContentHash: candidate.hash,
      relativeFile,
      stagingState: candidate.detected.hasAlpha ? "staged-byte-verified" : "staged-needs-mask",
      checks: {
        dimensions: true,
        mediaType: true,
        alphaOrMatte: candidate.detected.hasAlpha,
        registration: false,
      },
    }));
  }
  return staged;
}

export async function stageLooseCandidateFiles(input: StageLooseCandidateFilesInput): Promise<LooseStagedCandidate[]> {
  const limits = {
    maxFiles: input.limits?.maxFiles ?? DEFAULT_MAX_FILES,
    maxFileBytes: input.limits?.maxFileBytes ?? DEFAULT_MAX_FILE_BYTES,
    maxTotalBytes: input.limits?.maxTotalBytes ?? DEFAULT_MAX_TOTAL_BYTES,
    maxDimension: input.limits?.maxDimension ?? DEFAULT_MAX_DIMENSION,
    maxPixels: input.limits?.maxPixels ?? DEFAULT_MAX_PIXELS,
  };
  if (input.files.length === 0 || input.files.length > limits.maxFiles) {
    throw new CandidateStagingError("file-count-limit", `Select between 1 and ${limits.maxFiles} candidate files.`);
  }

  const candidateIds = new Set<string>();
  const validated: Array<{candidateId: string; originalName: string; bytes: Uint8Array; detected: DetectedImage; hash: string}> = [];
  let totalBytes = 0;
  for (const file of input.files) {
    if (!/^[a-z0-9][a-z0-9-]*$/.test(file.candidateId) || candidateIds.has(file.candidateId)) {
      throw new CandidateStagingError("duplicate-candidate", `Loose candidate identity is invalid or repeated: ${file.candidateId}`);
    }
    candidateIds.add(file.candidateId);
    const absoluteSource = resolve(file.sourceFile);
    if (absoluteSource.startsWith("\\\\")) {
      throw new CandidateStagingError("network-share-rejected", "Network candidate files are disabled for this release.");
    }
    const sourceInfo = await lstat(absoluteSource);
    if (sourceInfo.isSymbolicLink()) throw new CandidateStagingError("symlink-rejected", `Loose candidate is a symbolic link: ${basename(absoluteSource)}`);
    if (!sourceInfo.isFile()) throw new CandidateStagingError("unsafe-source", `Loose candidate is not a regular file: ${basename(absoluteSource)}`);
    if (sourceInfo.size > limits.maxFileBytes) throw new CandidateStagingError("file-too-large", `Loose candidate exceeds the per-file byte limit: ${basename(absoluteSource)}`);
    totalBytes += sourceInfo.size;
    if (totalBytes > limits.maxTotalBytes) throw new CandidateStagingError("bundle-too-large", "Loose candidates exceed the total byte limit.");

    const bytes = await readFile(absoluteSource);
    const detected = detectImage(bytes);
    if (detected.width > limits.maxDimension || detected.height > limits.maxDimension || detected.width * detected.height > limits.maxPixels) {
      throw new CandidateStagingError("dimension-limit", `Loose candidate dimensions exceed the safe decode limits: ${basename(absoluteSource)}`);
    }
    validated.push({candidateId: file.candidateId, originalName: basename(absoluteSource), bytes, detected, hash: sha256(bytes)});
  }

  const stagingRoot = await ensureTrustedStagingRoot(input.trustedStagingRoot, input.stagingRoot);
  await mkdir(resolve(stagingRoot, "candidates"), {recursive: true});

  const staged: LooseStagedCandidate[] = [];
  for (const candidate of validated) {
    const relativeFile = `candidates/${candidate.candidateId}.${candidate.detected.extension}`;
    const destination = resolve(stagingRoot, ...relativeFile.split("/"));
    try {
      await writeFile(destination, candidate.bytes, {flag: "wx"});
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "EEXIST") throw new CandidateStagingError("output-collision", `A staged candidate already exists: ${candidate.candidateId}`);
      throw error;
    }
    const stagedCandidate = stagedCandidateSchema.parse({
      candidateId: candidate.candidateId,
      sourceContentHash: candidate.hash,
      stagedContentHash: candidate.hash,
      relativeFile,
      stagingState: candidate.detected.hasAlpha ? "staged-byte-verified" : "staged-needs-mask",
      checks: {dimensions: true, mediaType: true, alphaOrMatte: candidate.detected.hasAlpha, registration: false},
    });
    staged.push({candidate: stagedCandidate, originalName: candidate.originalName, mediaType: candidate.detected.mediaType, width: candidate.detected.width, height: candidate.detected.height});
  }
  return staged;
}
