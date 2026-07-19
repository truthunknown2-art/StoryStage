import {createHash} from "node:crypto";
import {isAbsolute, join, relative, resolve} from "node:path";
import {lstat, readFile, realpath} from "node:fs/promises";
import {
  approvedAssetVersionSchema,
  assetRigManifestSchema,
  finalizeRigDiagnosticReport,
  hashCanonical,
  publicShowPackCandidateManifestSchema,
  rigDiagnosticReportSchema,
  rigValidationReportSchema,
  validateAssetRigManifest,
  verifyAssetRigManifestHash,
  verifyPublicShowPackCandidateManifestHash,
  verifyRigDiagnosticReportHash,
  verifyRigValidationReportHash,
  type ApprovedAssetVersion,
  type AssetRigManifest,
  type AssetRigManifestDraft,
  type PublicShowPackCandidateManifest,
} from "@storystage/story-engine";
import {writeImmutable} from "./approved-asset-workflow";

const sha256 = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");
const isWithin = (root: string, candidate: string) => {
  const delta = relative(root, candidate);
  return delta === "" || (!delta.startsWith("..") && !isAbsolute(delta));
};

async function readContainedBytes(rootInput: string, relativeFile: string, expectedHash: string, maxBytes: number): Promise<Buffer> {
  const root = await realpath(rootInput);
  const parts = relativeFile.split("/");
  const absoluteFile = resolve(root, ...parts);
  if (!isWithin(root, absoluteFile)) throw new Error("The packaged candidate escaped its allowlisted root.");
  let cursor = root;
  for (const part of parts) {
    cursor = join(cursor, part);
    if ((await lstat(cursor)).isSymbolicLink()) throw new Error("The packaged candidate contains a symbolic link.");
  }
  const info = await lstat(absoluteFile);
  if (!info.isFile() || info.size > maxBytes) throw new Error("The packaged candidate file exceeds its safe envelope.");
  const canonicalFile = await realpath(absoluteFile);
  if (!isWithin(root, canonicalFile)) throw new Error("The packaged candidate resolves outside its allowlisted root.");
  const bytes = await readFile(canonicalFile);
  if (sha256(bytes) !== expectedHash) throw new Error(`Packaged candidate evidence changed: ${relativeFile}`);
  return bytes;
}

async function readOptionalJson(file: string): Promise<unknown | null> {
  try {
    const info = await lstat(file);
    if (info.isSymbolicLink() || !info.isFile() || info.size > 2_000_000) throw new Error("Private promoted evidence is unsafe.");
    return JSON.parse(await readFile(file, "utf8"));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

function rebasePublicManifest(input: {manifest: AssetRigManifest; requirementId: string; entityId: string | null; entityName: string; candidateId: string}): AssetRigManifest {
  const binding = <T extends {candidateId: string; relativeFile: string}>(asset: T): T => ({...asset, relativeFile: `files/${asset.candidateId}.png`});
  const identity = {schemaVersion: "1.0" as const, manifestId: `manifest-${input.candidateId}-${input.requirementId}`, candidateSetId: input.manifest.candidateSetId, briefId: `brief-${input.candidateId}-${input.requirementId}`, requirementId: input.requirementId, entityId: input.entityId, entityName: input.entityName, createdAt: input.manifest.createdAt};
  let draft: AssetRigManifestDraft;
  if (input.manifest.type === "character-rig") draft = input.manifest.animationMode === "pose-swap-2d"
    ? {...identity, type: "character-rig", animationMode: "pose-swap-2d", identityReference: binding(input.manifest.identityReference), poses: {neutral: binding(input.manifest.poses.neutral), talk: binding(input.manifest.poses.talk), reaction: binding(input.manifest.poses.reaction)}}
    : {...identity, type: "character-rig", animationMode: "articulated-2d", identityReference: binding(input.manifest.identityReference), renderer: input.manifest.renderer, template: input.manifest.template, parts: input.manifest.parts.map((part) => ({...part, asset: binding(part.asset)})), exposures: input.manifest.exposures.map((exposure) => ({...exposure, asset: binding(exposure.asset)})), visemeIds: input.manifest.visemeIds, visemeMappings: input.manifest.visemeMappings};
  else if (input.manifest.type === "background-layers") draft = {...identity, type: "background-layers", layers: input.manifest.layers.map((layer) => ({...layer, asset: binding(layer.asset)})) as typeof input.manifest.layers};
  else draft = {...identity, type: "prop", assetClass: input.manifest.assetClass, cutout: binding(input.manifest.cutout)};
  return assetRigManifestSchema.parse({...draft, contentHash: hashCanonical(draft)});
}

const manifestBindings = (manifest: AssetRigManifest) => manifest.type === "character-rig"
  ? manifest.animationMode === "pose-swap-2d"
    ? [manifest.identityReference, ...Object.values(manifest.poses)]
    : [manifest.identityReference, ...manifest.parts.map((part) => part.asset), ...manifest.exposures.map((exposure) => exposure.asset)]
  : manifest.type === "background-layers"
    ? manifest.layers.map((layer) => layer.asset)
    : [manifest.cutout];

export type PromotePublicShowPackCandidateInput = {
  candidateRoot: string;
  assetsRoot: string;
  expectedCandidateId: string;
  expectedCandidateContentHash: string;
  requirementId: string;
  entityId: string | null;
  entityName: string;
  approvedAt: string;
};

export async function verifyPublicShowPackCandidate(input: Pick<PromotePublicShowPackCandidateInput, "candidateRoot" | "expectedCandidateId" | "expectedCandidateContentHash">): Promise<{candidate: PublicShowPackCandidateManifest; rigManifest: AssetRigManifest; diagnosticVideo: Buffer}> {
  const candidateRootInfo = await lstat(input.candidateRoot);
  if (candidateRootInfo.isSymbolicLink() || !candidateRootInfo.isDirectory()) throw new Error("The packaged candidate root is unsafe.");
  const manifestFile = resolve(input.candidateRoot, "candidate-manifest.json");
  const manifestInfo = await lstat(manifestFile);
  if (manifestInfo.isSymbolicLink() || !manifestInfo.isFile()) throw new Error("The packaged candidate manifest is unsafe.");
  const manifestBytes = await readFile(manifestFile);
  if (manifestBytes.byteLength > 2_000_000) throw new Error("The packaged candidate manifest is too large.");
  const candidate = publicShowPackCandidateManifestSchema.parse(JSON.parse(manifestBytes.toString("utf8")));
  if (candidate.candidateId !== input.expectedCandidateId || candidate.contentHash !== input.expectedCandidateContentHash || !verifyPublicShowPackCandidateManifestHash(candidate)) throw new Error("The packaged candidate is not the allowlisted release.");

  for (const file of candidate.files) await readContainedBytes(input.candidateRoot, file.file, file.contentHash, 50 * 1024 * 1024);
  for (const file of candidate.preparedFiles) await readContainedBytes(input.candidateRoot, file.file, file.contentHash, 50 * 1024 * 1024);
  await readContainedBytes(input.candidateRoot, candidate.evidence.prompts.file, candidate.evidence.prompts.fileContentHash, 2_000_000);
  await readContainedBytes(input.candidateRoot, candidate.evidence.contactSheet.file, candidate.evidence.contactSheet.fileContentHash, 20 * 1024 * 1024);

  const rigManifestBytes = await readContainedBytes(input.candidateRoot, candidate.evidence.rigManifest.file, candidate.evidence.rigManifest.fileContentHash, 2_000_000);
  const rigManifest = assetRigManifestSchema.parse(JSON.parse(rigManifestBytes.toString("utf8")));
  if (!verifyAssetRigManifestHash(rigManifest) || rigManifest.contentHash !== candidate.evidence.rigManifest.contentHash) throw new Error("The packaged rig manifest failed its domain hash.");
  const preparedByFile = new Map(candidate.preparedFiles.map((file) => [file.file, file]));
  const bindings = manifestBindings(rigManifest);
  if (bindings.some((binding) => preparedByFile.get(binding.relativeFile)?.contentHash !== binding.contentHash)) throw new Error("Prepared pixels do not match the packaged rig bindings.");

  const validationBytes = await readContainedBytes(input.candidateRoot, candidate.evidence.rigValidation.file, candidate.evidence.rigValidation.fileContentHash, 2_000_000);
  const validation = rigValidationReportSchema.parse(JSON.parse(validationBytes.toString("utf8")));
  if (!verifyRigValidationReportHash(validation) || validation.status !== "passed" || validation.contentHash !== candidate.evidence.rigValidation.contentHash || validation.manifestContentHash !== rigManifest.contentHash) throw new Error("The packaged rig validation failed its immutable bindings.");

  const diagnosticBytes = await readContainedBytes(input.candidateRoot, candidate.evidence.diagnosticReport.file, candidate.evidence.diagnosticReport.fileContentHash, 2_000_000);
  const diagnostic = rigDiagnosticReportSchema.parse(JSON.parse(diagnosticBytes.toString("utf8")));
  if (!verifyRigDiagnosticReportHash(diagnostic) || diagnostic.contentHash !== candidate.evidence.diagnosticReport.contentHash || diagnostic.manifestContentHash !== rigManifest.contentHash || diagnostic.validationReportContentHash !== validation.contentHash || diagnostic.videoRelativeFile !== candidate.evidence.diagnosticVideo.file) throw new Error("The packaged diagnostic report failed its immutable bindings.");
  const diagnosticVideo = await readContainedBytes(input.candidateRoot, candidate.evidence.diagnosticVideo.file, candidate.evidence.diagnosticVideo.fileContentHash, 18 * 1024 * 1024);
  if (diagnostic.videoContentHash !== candidate.evidence.diagnosticVideo.fileContentHash) throw new Error("The packaged diagnostic video is stale.");
  return {candidate, rigManifest, diagnosticVideo};
}

export async function promotePublicShowPackCandidate(input: PromotePublicShowPackCandidateInput): Promise<ApprovedAssetVersion> {
  const {candidate, rigManifest: publicManifest, diagnosticVideo} = await verifyPublicShowPackCandidate(input);
  const manifest = rebasePublicManifest({manifest: publicManifest, requirementId: input.requirementId, entityId: input.entityId, entityName: input.entityName, candidateId: candidate.candidateId});
  const assetId = `approved-${candidate.candidateId}-${input.requirementId}`;
  const version = `sha256-${manifest.contentHash.slice(0, 16)}`;
  const versionRoot = join(input.assetsRoot, assetId, version);
  const publicBindings = manifestBindings(publicManifest);
  for (const binding of publicBindings) {
    const bytes = await readContainedBytes(input.candidateRoot, binding.relativeFile, binding.contentHash, 50 * 1024 * 1024);
    await writeImmutable(join(versionRoot, "files", `${binding.candidateId}.png`), bytes, binding.contentHash);
  }
  await writeImmutable(join(versionRoot, "manifest.json"), Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`, "utf8"));

  const existingValidation = await readOptionalJson(join(versionRoot, "rig-validation.json"));
  const validation = existingValidation === null ? validateAssetRigManifest(manifest, input.approvedAt) : rigValidationReportSchema.parse(existingValidation);
  const expectedValidation = validateAssetRigManifest(manifest, validation.validatedAt);
  if (!verifyRigValidationReportHash(validation) || validation.status !== "passed" || hashCanonical(validation) !== hashCanonical(expectedValidation)) throw new Error("The promoted Rook validation is stale or mismatched.");
  await writeImmutable(join(versionRoot, "rig-validation.json"), Buffer.from(`${JSON.stringify(validation, null, 2)}\n`, "utf8"));
  await writeImmutable(join(versionRoot, "rig-diagnostic.mp4"), diagnosticVideo, candidate.evidence.diagnosticVideo.fileContentHash);

  const existingDiagnostic = await readOptionalJson(join(versionRoot, "rig-diagnostic.json"));
  const diagnosticDraft = {schemaVersion: "1.0" as const, candidateSetId: publicManifest.candidateSetId, manifestContentHash: manifest.contentHash, validationReportContentHash: validation.contentHash, videoContentHash: candidate.evidence.diagnosticVideo.fileContentHash, videoRelativeFile: "rig-diagnostic.mp4", fps: 30 as const, frameCount: 120 as const, width: 1280 as const, height: 720 as const, sourceDiagnosticContentHash: candidate.evidence.diagnosticReport.contentHash};
  const diagnostic = existingDiagnostic === null ? finalizeRigDiagnosticReport(diagnosticDraft, validation.validatedAt) : rigDiagnosticReportSchema.parse(existingDiagnostic);
  const expectedDiagnostic = finalizeRigDiagnosticReport(diagnosticDraft, diagnostic.renderedAt);
  if (!verifyRigDiagnosticReportHash(diagnostic) || hashCanonical(diagnostic) !== hashCanonical(expectedDiagnostic)) throw new Error("The promoted Rook diagnostic is stale or mismatched.");
  await writeImmutable(join(versionRoot, "rig-diagnostic.json"), Buffer.from(`${JSON.stringify(diagnostic, null, 2)}\n`, "utf8"));
  return approvedAssetVersionSchema.parse({assetId, version, requirementId: input.requirementId, contentHash: manifest.contentHash, relativeFile: `${assetId}/${version}/manifest.json`, provenance: candidate.rights, approvedAt: validation.validatedAt});
}
