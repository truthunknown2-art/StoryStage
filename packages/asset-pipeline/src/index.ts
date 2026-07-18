import {createHash} from "node:crypto";
import {lstat, mkdir, readFile, realpath, writeFile} from "node:fs/promises";
import {basename, isAbsolute, join, relative, resolve} from "node:path";
import sharp from "sharp";
export * from "./import-evidence-store";
export * from "./sprite-atlas";
import {
  candidateBundleSchema,
  candidateSetContactSheetSchema,
  finalizePreparationReport,
  hashCanonical,
  importRecordSchema,
  importValidationReportSchema,
  prepareCandidateSetsRequestSchema,
  preparationReportSchema,
  preparedCandidateSchema,
  stagedCandidateSchema,
  verifyImportEvidence,
  verifyPreparationReportHash,
  type CandidateBundle,
  type CandidatePreparationInput,
  type CandidateSetContactSheet,
  type CandidateSetPreparation,
  type ImportRecord,
  type ImportValidationReport,
  type PreparationReport,
  type PrepareCandidateSetsRequest,
  type PreparedCandidate,
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

export type VerifyStagedCandidatesInput = {
  candidates: StagedCandidate[] | unknown;
  trustedStagingRoot: string;
  stagingRoot: string;
};

export type PrepareCandidateSetsInput = {
  request: PrepareCandidateSetsRequest | unknown;
  trustedStagingRoot: string;
  stagingRoot: string;
};

export type VerifyPreparationEvidenceInput = {
  candidateBundle: unknown;
  importRecord: unknown;
  validationReport: unknown;
  preparationReport: unknown;
  trustedStagingRoot: string;
  stagingRoot: string;
};

export type VerifiedPreparationEvidence = {
  candidateBundle: CandidateBundle;
  importRecord: ImportRecord;
  validationReport: ImportValidationReport;
  preparationReport: PreparationReport;
};

export type PreparedCandidateComparisonSheet = {
  briefId: string;
  relativeFile: string;
  contentHash: string;
  width: number;
  height: number;
  cells: Array<{candidateId: string; candidateSetId: string; left: number; top: number; width: number; height: number}>;
};

export type LoggedCandidateVerification = {
  contentHash: string;
  mediaType: SupportedMediaType;
  width: number;
  height: number;
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

export function verifyLoggedCandidateBytes(input: {candidateId: string; bytes: Uint8Array; expectedContentHash: string; expectedMediaType: SupportedMediaType; expectedWidth: number; expectedHeight: number}): LoggedCandidateVerification {
  const detected = detectImage(input.bytes);
  if (detected.mediaType !== input.expectedMediaType) throw new CandidateStagingError("media-mismatch", `Logged candidate codec does not match its provenance record: ${input.candidateId}`);
  if (detected.width !== input.expectedWidth || detected.height !== input.expectedHeight) throw new CandidateStagingError("dimension-mismatch", `Logged candidate dimensions do not match its provenance record: ${input.candidateId}`);
  const contentHash = sha256(input.bytes);
  if (contentHash !== input.expectedContentHash) throw new CandidateStagingError("hash-mismatch", `Logged candidate bytes do not match their provenance record: ${input.candidateId}`);
  return {contentHash, mediaType: detected.mediaType, width: detected.width, height: detected.height};
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

type VerifiedStagedCandidate = {candidate: StagedCandidate; bytes: Buffer; detected: DetectedImage};

async function readVerifiedStagedCandidateBytes(input: VerifyStagedCandidatesInput): Promise<VerifiedStagedCandidate[]> {
  const candidates = stagedCandidateSchema.array().min(1).parse(input.candidates);
  const stagingRoot = await ensureTrustedStagingRoot(input.trustedStagingRoot, input.stagingRoot);
  const verified: VerifiedStagedCandidate[] = [];
  for (const candidate of candidates) {
    const pathParts = candidate.relativeFile.split("/");
    const absoluteFile = resolve(stagingRoot, ...pathParts);
    if (!isWithin(stagingRoot, absoluteFile)) throw new CandidateStagingError("untrusted-staging-root", `Staged candidate escaped its trusted import root: ${candidate.candidateId}`);
    let currentPath = stagingRoot;
    for (const pathPart of pathParts) {
      currentPath = join(currentPath, pathPart);
      const info = await lstat(currentPath);
      if (info.isSymbolicLink()) throw new CandidateStagingError("symlink-rejected", `Staged candidate path contains a symbolic link: ${candidate.candidateId}`);
    }
    const info = await lstat(absoluteFile);
    if (!info.isFile()) throw new CandidateStagingError("unsafe-source", `Staged candidate is no longer a regular file: ${candidate.candidateId}`);
    const canonicalFile = await realpath(absoluteFile);
    if (!isWithin(stagingRoot, canonicalFile)) throw new CandidateStagingError("untrusted-staging-root", `Staged candidate resolves outside its trusted import root: ${candidate.candidateId}`);
    const bytes = await readFile(canonicalFile);
    const currentHash = sha256(bytes);
    if (currentHash !== candidate.sourceContentHash || currentHash !== candidate.stagedContentHash) throw new CandidateStagingError("hash-mismatch", `Staged candidate bytes changed after import: ${candidate.candidateId}`);
    const detected = detectImage(bytes);
    if (candidate.checks.alphaOrMatte !== detected.hasAlpha || (candidate.stagingState === "staged-byte-verified") !== detected.hasAlpha) {
      throw new CandidateStagingError("media-mismatch", `Staged candidate alpha state changed after import: ${candidate.candidateId}`);
    }
    verified.push({candidate, bytes, detected});
  }
  return verified;
}

export async function verifyStagedCandidates(input: VerifyStagedCandidatesInput): Promise<StagedCandidate[]> {
  return (await readVerifiedStagedCandidateBytes(input)).map(({candidate}) => candidate);
}

type PreparationSpec = {
  assetClass: PreparedCandidate["assetClass"];
  width: number;
  height: number;
  requiresTransparency: boolean;
  trimAndGround: boolean;
  fit: "contain" | "cover";
  anchorX: number;
  anchorY: number;
};

function preparationSpec(input: CandidatePreparationInput): PreparationSpec {
  if (input.outputRole === "character-canonical-sheet" || input.outputRole === "character-parts") {
    if (input.fileRole === "identity-sheet.png") return {assetClass: "reference-sheet", width: 1600, height: 1800, requiresTransparency: false, trimAndGround: false, fit: "contain", anchorX: 0.5, anchorY: 0.98};
    return {assetClass: "character-pose", width: 1600, height: 1800, requiresTransparency: true, trimAndGround: true, fit: "contain", anchorX: 0.5, anchorY: 0.98};
  }
  if (input.outputRole === "background-master" || input.outputRole === "background-layers") {
    const isPlate = input.fileRole === "clean-plate.png";
    return {assetClass: isPlate ? "background-plate" : "background-layer", width: 1920, height: 1080, requiresTransparency: !isPlate, trimAndGround: false, fit: isPlate ? "cover" : "contain", anchorX: 0.5, anchorY: 0.5};
  }
  if (input.outputRole === "prop-cutout") return {assetClass: "prop-cutout", width: 1024, height: 1024, requiresTransparency: true, trimAndGround: true, fit: "contain", anchorX: 0.5, anchorY: 0.96};
  return {assetClass: "editorial-visual", width: 1920, height: 1080, requiresTransparency: false, trimAndGround: false, fit: "contain", anchorX: 0.5, anchorY: 0.5};
}

function containedDimensions(sourceWidth: number, sourceHeight: number, targetWidth: number, targetHeight: number, fit: "contain" | "cover"): {width: number; height: number} {
  const scale = fit === "cover" ? Math.max(targetWidth / sourceWidth, targetHeight / sourceHeight) : Math.min(targetWidth / sourceWidth, targetHeight / sourceHeight);
  return {width: Math.max(1, Math.round(sourceWidth * scale)), height: Math.max(1, Math.round(sourceHeight * scale))};
}

async function deriveNormalizedCandidate(input: CandidatePreparationInput, sourceBytes: Buffer, detected: DetectedImage): Promise<{candidate: PreparedCandidate; bytes: Buffer}> {
  const spec = preparationSpec(input);
  if (detected.mediaType !== input.expectedMediaType || detected.width !== input.expectedWidth || detected.height !== input.expectedHeight) throw new CandidateStagingError("media-mismatch", `${input.fileRole} no longer matches its imported codec or dimensions.`);
  const oriented = await sharp(sourceBytes, {limitInputPixels: DEFAULT_MAX_PIXELS, sequentialRead: true}).rotate().toBuffer();
  const stats = await sharp(oriented, {limitInputPixels: DEFAULT_MAX_PIXELS}).stats();
  if (spec.requiresTransparency && stats.isOpaque) throw new CandidateStagingError("media-mismatch", `${input.fileRole} needs a real transparent background or reviewed matte before preparation.`);

  let output: Buffer;
  let contentBounds: PreparedCandidate["contentBounds"];
  let groundY: number;
  if (spec.trimAndGround) {
    const trimmed = await sharp(oriented, {limitInputPixels: DEFAULT_MAX_PIXELS}).trim({background: {r: 0, g: 0, b: 0, alpha: 0}, threshold: 6}).ensureAlpha().png().toBuffer({resolveWithObject: true});
    const maxWidth = Math.round(spec.width * 0.84);
    const maxHeight = Math.round(spec.height * 0.9);
    const dimensions = containedDimensions(trimmed.info.width, trimmed.info.height, maxWidth, maxHeight, "contain");
    const left = Math.floor((spec.width - dimensions.width) / 2);
    const bottomPadding = Math.max(1, Math.round(spec.height * (1 - spec.anchorY)));
    const top = Math.max(0, spec.height - bottomPadding - dimensions.height);
    const right = spec.width - left - dimensions.width;
    const bottom = spec.height - top - dimensions.height;
    output = await sharp(trimmed.data).resize(dimensions.width, dimensions.height, {fit: "fill"}).extend({top, bottom, left, right, background: {r: 0, g: 0, b: 0, alpha: 0}}).ensureAlpha().png({compressionLevel: 9, adaptiveFiltering: true}).toBuffer();
    contentBounds = {left, top, width: dimensions.width, height: dimensions.height};
    groundY = top + dimensions.height - 1;
  } else {
    const metadata = await sharp(oriented, {limitInputPixels: DEFAULT_MAX_PIXELS}).metadata();
    if (!metadata.width || !metadata.height) throw new CandidateStagingError("unsupported-media", `Could not decode dimensions for ${input.fileRole}.`);
    const dimensions = containedDimensions(metadata.width, metadata.height, spec.width, spec.height, spec.fit);
    output = await sharp(oriented, {limitInputPixels: DEFAULT_MAX_PIXELS}).resize(spec.width, spec.height, {fit: spec.fit, position: "centre", background: {r: 0, g: 0, b: 0, alpha: 0}}).ensureAlpha().png({compressionLevel: 9, adaptiveFiltering: true}).toBuffer();
    const visibleWidth = spec.fit === "cover" ? spec.width : Math.min(spec.width, dimensions.width);
    const visibleHeight = spec.fit === "cover" ? spec.height : Math.min(spec.height, dimensions.height);
    contentBounds = {left: Math.floor((spec.width - visibleWidth) / 2), top: Math.floor((spec.height - visibleHeight) / 2), width: visibleWidth, height: visibleHeight};
    groundY = Math.min(spec.height - 1, contentBounds.top + contentBounds.height - 1);
  }

  const relativeFile = `prepared/${input.stagedCandidate.candidateId}.png`;
  const candidate = preparedCandidateSchema.parse({schemaVersion: "1.0", candidateId: input.stagedCandidate.candidateId, candidateSetId: input.candidateSetId, briefId: input.briefId, requirementId: input.requirementId, fileRole: input.fileRole, assetClass: spec.assetClass, sourceContentHash: input.stagedCandidate.sourceContentHash, preparedContentHash: sha256(output), relativeFile, mediaType: "image/png", width: spec.width, height: spec.height, contentBounds, registration: {anchorX: spec.anchorX, anchorY: spec.anchorY, pivotX: Math.round(spec.width * spec.anchorX), pivotY: groundY, groundY}, processor: {id: "sharp", version: sharp.versions.sharp}, preparationState: "prepared", checks: {dimensions: true, mediaType: true, alphaOrMatte: true, registration: true, metadataStripped: true}});
  return {candidate, bytes: output};
}

async function normalizeCandidate(input: CandidatePreparationInput, stagingRoot: string, sourceBytes: Buffer, detected: DetectedImage): Promise<{candidate: PreparedCandidate; bytes: Buffer}> {
  const normalized = await deriveNormalizedCandidate(input, sourceBytes, detected);
  const destination = resolve(stagingRoot, ...normalized.candidate.relativeFile.split("/"));
  try {
    await writeFile(destination, normalized.bytes, {flag: "wx", mode: 0o600});
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "EEXIST") throw new CandidateStagingError("output-collision", `Prepared candidate already exists: ${input.stagedCandidate.candidateId}`);
    throw error;
  }
  return normalized;
}

export async function verifyPreparationReportAgainstImportEvidence(input: VerifyPreparationEvidenceInput): Promise<VerifiedPreparationEvidence> {
  const candidateBundle = candidateBundleSchema.parse(input.candidateBundle);
  const importRecord = importRecordSchema.parse(input.importRecord);
  const validationReport = importValidationReportSchema.parse(input.validationReport);
  const preparationReport = preparationReportSchema.parse(input.preparationReport);
  if (!verifyImportEvidence(importRecord, validationReport)) throw new CandidateStagingError("invalid-bundle", "Prepared candidate import evidence failed its immutable three-file verification.");
  if (!verifyPreparationReportHash(preparationReport)) throw new CandidateStagingError("invalid-bundle", "Preparation report failed its immutable content hash.");
  if (hashCanonical(candidateBundle) !== importRecord.manifestContentHash || hashCanonical(candidateBundle) !== hashCanonical(importRecord.candidateBundle)) throw new CandidateStagingError("invalid-bundle", "Candidate bundle does not match the verified import record.");
  if (preparationReport.importRecordContentHash !== importRecord.contentHash || preparationReport.importId !== importRecord.importId || preparationReport.exchangeJobId !== importRecord.exchangeJobId) throw new CandidateStagingError("invalid-bundle", "Preparation report is not bound to the verified import record.");

  const preparedCandidates = preparationReport.candidateSets.flatMap((set) => set.preparedCandidates);
  const preparedById = new Map(preparedCandidates.map((candidate) => [candidate.candidateId, candidate]));
  if (preparedById.size !== preparedCandidates.length || preparedById.size !== importRecord.assets.length || preparationReport.candidateSets.some((set) => set.status !== "ready-for-review" || set.failures.length > 0)) throw new CandidateStagingError("invalid-bundle", "Preparation report must preserve every imported candidate exactly once before motion review.");
  const setById = new Map(preparationReport.candidateSets.map((set) => [set.candidateSetId, set]));
  const verifiedSources = await readVerifiedStagedCandidateBytes({candidates: importRecord.assets.map((asset) => asset.stagedCandidate), trustedStagingRoot: input.trustedStagingRoot, stagingRoot: input.stagingRoot});
  const sourceById = new Map(verifiedSources.map((entry) => [entry.candidate.candidateId, entry]));
  const stagingRoot = await ensureTrustedStagingRoot(input.trustedStagingRoot, input.stagingRoot);

  for (const asset of importRecord.assets) {
    const set = setById.get(asset.candidateSetId);
    const prepared = preparedById.get(asset.candidateId);
    const source = sourceById.get(asset.candidateId);
    if (!set || !prepared || !source || set.briefId !== asset.briefId || set.requirementId !== asset.requirementId
      || prepared.candidateSetId !== asset.candidateSetId || prepared.briefId !== asset.briefId || prepared.requirementId !== asset.requirementId
      || prepared.fileRole !== asset.fileRole || prepared.sourceContentHash !== asset.stagedCandidate.sourceContentHash) throw new CandidateStagingError("invalid-bundle", `Prepared candidate lost its verified import identity: ${asset.candidateId}`);
    const derived = await deriveNormalizedCandidate({candidateSetId: asset.candidateSetId, briefId: asset.briefId, requirementId: asset.requirementId, fileRole: asset.fileRole, expectedMediaType: asset.mediaType, expectedWidth: asset.width, expectedHeight: asset.height, outputRole: set.outputRole, stagedCandidate: asset.stagedCandidate}, source.bytes, source.detected);
    if (hashCanonical(derived.candidate) !== hashCanonical(prepared)) throw new CandidateStagingError("hash-mismatch", `Prepared candidate does not derive from its verified imported source: ${asset.candidateId}`);

    const pathParts = prepared.relativeFile.split("/");
    const absoluteFile = resolve(stagingRoot, ...pathParts);
    if (!isWithin(stagingRoot, absoluteFile)) throw new CandidateStagingError("untrusted-staging-root", `Prepared candidate escaped its trusted import root: ${asset.candidateId}`);
    let currentPath = stagingRoot;
    for (const part of pathParts) {
      currentPath = join(currentPath, part);
      if ((await lstat(currentPath)).isSymbolicLink()) throw new CandidateStagingError("symlink-rejected", `Prepared candidate path contains a symbolic link: ${asset.candidateId}`);
    }
    const actualBytes = await readFile(absoluteFile);
    if (sha256(actualBytes) !== derived.candidate.preparedContentHash) throw new CandidateStagingError("hash-mismatch", `Prepared candidate bytes do not derive from their verified imported source: ${asset.candidateId}`);
  }
  return {candidateBundle, importRecord, validationReport, preparationReport};
}

async function createContactSheet(candidateSetId: string, entries: Array<{candidate: PreparedCandidate; bytes: Buffer}>, stagingRoot: string): Promise<CandidateSetContactSheet | null> {
  if (entries.length === 0) return null;
  const cellWidth = 340;
  const cellHeight = 220;
  const columns = 2;
  const rows = Math.ceil(entries.length / columns);
  const width = columns * cellWidth;
  const height = rows * cellHeight;
  const cells: CandidateSetContactSheet["cells"] = [];
  const overlays: Array<{input: Buffer; left: number; top: number}> = [];
  for (const [index, entry] of entries.entries()) {
    const column = index % columns;
    const row = Math.floor(index / columns);
    const left = column * cellWidth + 10;
    const top = row * cellHeight + 10;
    const thumbnail = await sharp(entry.bytes).resize(320, 180, {fit: "contain", background: {r: 17, g: 23, b: 23, alpha: 1}}).png().toBuffer();
    overlays.push({input: thumbnail, left, top});
    cells.push({candidateId: entry.candidate.candidateId, fileRole: entry.candidate.fileRole, left, top, width: 320, height: 180});
  }
  const bytes = await sharp({create: {width, height, channels: 4, background: {r: 13, g: 19, b: 19, alpha: 1}}}).composite(overlays).png({compressionLevel: 9}).toBuffer();
  const relativeFile = `prepared/contact-sheet-${candidateSetId}.png`;
  await writeFile(resolve(stagingRoot, ...relativeFile.split("/")), bytes, {flag: "wx", mode: 0o600});
  return candidateSetContactSheetSchema.parse({candidateSetId, relativeFile, contentHash: sha256(bytes), width, height, cells});
}

export async function createPreparedCandidateComparisonSheet(input: {trustedStagingRoot: string; stagingRoot: string; candidates: PreparedCandidate[] | unknown}): Promise<PreparedCandidateComparisonSheet> {
  const candidates = preparedCandidateSchema.array().length(2).parse(input.candidates);
  const [leftCandidate, rightCandidate] = candidates;
  if (!leftCandidate || !rightCandidate) throw new CandidateStagingError("invalid-bundle", "A comparison sheet requires exactly two prepared candidates.");
  if (leftCandidate.briefId !== rightCandidate.briefId || leftCandidate.requirementId !== rightCandidate.requirementId) throw new CandidateStagingError("invalid-bundle", "A comparison sheet cannot mix unrelated production requirements.");
  if (leftCandidate.candidateSetId === rightCandidate.candidateSetId) throw new CandidateStagingError("invalid-bundle", "A comparison sheet requires two distinct candidate sets.");

  const stagingRoot = await ensureTrustedStagingRoot(input.trustedStagingRoot, input.stagingRoot);
  const verified = await Promise.all(candidates.map(async (candidate) => {
    const relativeParts = candidate.relativeFile.split("/");
    const absoluteFile = resolve(stagingRoot, ...relativeParts);
    if (!isWithin(stagingRoot, absoluteFile)) throw new CandidateStagingError("untrusted-staging-root", `Prepared candidate escaped its trusted import root: ${candidate.candidateId}`);
    let currentPath = stagingRoot;
    for (const part of relativeParts) {
      currentPath = join(currentPath, part);
      if ((await lstat(currentPath)).isSymbolicLink()) throw new CandidateStagingError("symlink-rejected", `Prepared candidate path contains a symbolic link: ${candidate.candidateId}`);
    }
    const bytes = await readFile(absoluteFile);
    if (sha256(bytes) !== candidate.preparedContentHash) throw new CandidateStagingError("hash-mismatch", `Prepared candidate bytes changed before comparison: ${candidate.candidateId}`);
    const metadata = await sharp(bytes, {limitInputPixels: DEFAULT_MAX_PIXELS}).metadata();
    if (metadata.width !== candidate.width || metadata.height !== candidate.height) throw new CandidateStagingError("dimension-mismatch", `Prepared candidate dimensions changed before comparison: ${candidate.candidateId}`);
    return {candidate, bytes};
  }));

  const width = 1320;
  const height = 450;
  const cellWidth = 630;
  const cellHeight = 354;
  const top = 72;
  const cells = verified.map(({candidate}, index) => ({candidateId: candidate.candidateId, candidateSetId: candidate.candidateSetId, left: 20 + index * 650, top, width: cellWidth, height: cellHeight}));
  const imageOverlays = await Promise.all(verified.map(async ({bytes}, index) => ({input: await sharp(bytes).resize(cellWidth, cellHeight, {fit: "contain", background: {r: 16, g: 21, b: 22, alpha: 1}}).png().toBuffer(), left: cells[index]!.left, top})));
  const labelOverlay = Buffer.from(`<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg"><style>.label{font-family:Arial,sans-serif;font-size:18px;font-weight:700;letter-spacing:2px;fill:#f3ead7}.id{font-family:Arial,sans-serif;font-size:12px;fill:#9cb0aa}</style><text class="label" x="20" y="31">CANDIDATE SET 1</text><text class="id" x="20" y="53">${leftCandidate.candidateSetId}</text><text class="label" x="670" y="31">CANDIDATE SET 2</text><text class="id" x="670" y="53">${rightCandidate.candidateSetId}</text></svg>`);
  const bytes = await sharp({create: {width, height, channels: 4, background: {r: 10, g: 15, b: 16, alpha: 1}}}).composite([...imageOverlays, {input: labelOverlay, left: 0, top: 0}]).png({compressionLevel: 9}).toBuffer();
  const relativeFile = `prepared/comparison-sheet-${leftCandidate.briefId}.png`;
  try {
    await writeFile(resolve(stagingRoot, ...relativeFile.split("/")), bytes, {flag: "wx", mode: 0o600});
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "EEXIST") throw new CandidateStagingError("output-collision", `Prepared comparison sheet already exists: ${leftCandidate.briefId}`);
    throw error;
  }
  return {briefId: leftCandidate.briefId, relativeFile, contentHash: sha256(bytes), width, height, cells};
}

export async function prepareCandidateSets(input: PrepareCandidateSetsInput): Promise<PreparationReport> {
  const request = prepareCandidateSetsRequestSchema.parse(input.request);
  const stagingRoot = await ensureTrustedStagingRoot(input.trustedStagingRoot, input.stagingRoot);
  const verifiedCandidates = await readVerifiedStagedCandidateBytes({candidates: request.candidates.map((candidate) => candidate.stagedCandidate), trustedStagingRoot: input.trustedStagingRoot, stagingRoot});
  const verifiedById = new Map(verifiedCandidates.map((verified) => [verified.candidate.candidateId, verified]));
  await mkdir(resolve(stagingRoot, "prepared"), {recursive: true});
  const grouped = new Map<string, CandidatePreparationInput[]>();
  for (const candidate of request.candidates) grouped.set(candidate.candidateSetId, [...(grouped.get(candidate.candidateSetId) ?? []), candidate]);
  const candidateSets: CandidateSetPreparation[] = [];
  for (const [candidateSetId, candidates] of grouped) {
    const first = candidates[0]!;
    if (candidates.some((candidate) => candidate.briefId !== first.briefId || candidate.requirementId !== first.requirementId || candidate.outputRole !== first.outputRole)) throw new CandidateStagingError("invalid-bundle", `Candidate set ${candidateSetId} mixes unrelated production requirements.`);
    const preparedEntries: Array<{candidate: PreparedCandidate; bytes: Buffer}> = [];
    const failures: CandidateSetPreparation["failures"] = [];
    for (const candidate of candidates) {
      try {
        const verified = verifiedById.get(candidate.stagedCandidate.candidateId);
        if (!verified) throw new CandidateStagingError("hash-mismatch", `No securely verified bytes remain for ${candidate.stagedCandidate.candidateId}.`);
        preparedEntries.push(await normalizeCandidate(candidate, stagingRoot, verified.bytes, verified.detected));
      } catch (error) {
        const needsMask = error instanceof CandidateStagingError && error.code === "media-mismatch" && /transparent background|matte/i.test(error.message);
        failures.push({candidateId: candidate.stagedCandidate.candidateId, candidateSetId, briefId: candidate.briefId, fileRole: candidate.fileRole, status: needsMask ? "needs-manual-mask" : "failed", code: needsMask ? "MANUAL_MASK_REQUIRED" : error instanceof CandidateStagingError ? error.code.toUpperCase().replaceAll("-", "_") : "PREPARATION_FAILED", message: error instanceof Error ? error.message : "Candidate preparation failed."});
      }
    }
    const contactSheet = await createContactSheet(candidateSetId, preparedEntries, stagingRoot);
    candidateSets.push({candidateSetId, briefId: first.briefId, requirementId: first.requirementId, outputRole: first.outputRole, status: failures.length === 0 && preparedEntries.length > 0 ? "ready-for-review" : "needs-attention", preparedCandidates: preparedEntries.map((entry) => entry.candidate), failures, contactSheet});
  }
  return finalizePreparationReport({schemaVersion: "1.0", importId: request.importId, importRecordContentHash: request.importRecordContentHash, exchangeJobId: request.exchangeJobId, processor: {id: "sharp", version: sharp.versions.sharp}, candidateSets}, new Date().toISOString());
}
