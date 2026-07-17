import {createHash, randomUUID} from "node:crypto";
import {dirname, isAbsolute, join, relative, resolve} from "node:path";
import {lstat, mkdir, readFile, realpath, rename, unlink, writeFile} from "node:fs/promises";
import {
  approvedAssetVersionSchema,
  assetRigManifestSchema,
  assetReviewRecordSchema,
  buildAnimaticSync,
  createAssetRigManifest,
  finalizeRigDiagnosticReport,
  hashCanonical,
  importRecordSchema,
  preparationReportSchema,
  productionBundleDraftSchema,
  rigDiagnosticReportSchema,
  rigValidationReportSchema,
  validateAssetRigManifest,
  verifyAssetRigManifestHash,
  verifyAssetReviewRecordHash,
  verifyImportRecordHash,
  verifyPreparationReportHash,
  verifyProductionBundleHash,
  verifyRigDiagnosticReportHash,
  verifyRigValidationReportHash,
  type ApprovedAssetVersion,
  type AssetReviewRecord,
  type AssetRigManifest,
  type AssetRigManifestDraft,
  type GenerationBrief,
  type ImportRecord,
  type PreparationReport,
  type ProductionBundle,
  type ProductionBundleDraft,
  type RigDiagnosticReport,
  type RigValidationReport,
} from "@storystage/story-engine";

const sha256 = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");
const isWithin = (root: string, candidate: string) => {
  const delta = relative(root, candidate);
  return delta === "" || (!delta.startsWith("..") && !isAbsolute(delta));
};

async function readJson(file: string, maxBytes: number): Promise<unknown> {
  const info = await lstat(file);
  if (info.isSymbolicLink() || !info.isFile() || info.size > maxBytes) throw new Error("Private workflow evidence is unavailable or unsafe.");
  return JSON.parse(await readFile(file, "utf8"));
}

async function readVerifiedBytes(root: string, relativeFile: string, expectedHash: string, maxBytes: number): Promise<Buffer> {
  const canonicalRoot = await realpath(root);
  const parts = relativeFile.split("/");
  const absoluteFile = resolve(canonicalRoot, ...parts);
  if (!isWithin(canonicalRoot, absoluteFile)) throw new Error("Private workflow evidence escaped its trusted root.");
  let cursor = canonicalRoot;
  for (const part of parts) {
    cursor = join(cursor, part);
    if ((await lstat(cursor)).isSymbolicLink()) throw new Error("Private workflow evidence contains a symbolic link.");
  }
  const info = await lstat(absoluteFile);
  if (!info.isFile() || info.size > maxBytes) throw new Error("Private workflow evidence exceeds its safe size envelope.");
  const canonicalFile = await realpath(absoluteFile);
  if (!isWithin(canonicalRoot, canonicalFile)) throw new Error("Private workflow evidence resolves outside its trusted root.");
  const bytes = await readFile(canonicalFile);
  if (sha256(bytes) !== expectedHash) throw new Error("Private workflow bytes changed after their evidence was recorded.");
  return bytes;
}

async function writeImmutable(file: string, bytes: Uint8Array, expectedHash?: string): Promise<void> {
  await mkdir(dirname(file), {recursive: true});
  try {
    await writeFile(file, bytes, {flag: "wx", mode: 0o600});
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
    const existing = await readFile(file);
    if (sha256(existing) !== (expectedHash ?? sha256(bytes))) throw new Error("An immutable workflow artifact already exists with different bytes.");
  }
}

function rebaseRigManifest(manifest: AssetRigManifest): AssetRigManifest {
  const rebaseBinding = <T extends {candidateId: string; relativeFile: string}>(binding: T): T => ({...binding, relativeFile: `files/${binding.candidateId}.png`});
  let draft: AssetRigManifestDraft;
  if (manifest.type === "character-rig") {
    const {contentHash: _contentHash, ...identity} = manifest;
    void _contentHash;
    draft = {...identity, identityReference: rebaseBinding(manifest.identityReference), poses: {neutral: rebaseBinding(manifest.poses.neutral), talk: rebaseBinding(manifest.poses.talk), reaction: rebaseBinding(manifest.poses.reaction)}};
  } else if (manifest.type === "background-layers") {
    const {contentHash: _contentHash, ...identity} = manifest;
    void _contentHash;
    draft = {...identity, layers: manifest.layers.map((layer) => ({...layer, asset: rebaseBinding(layer.asset)})) as typeof manifest.layers};
  } else {
    const {contentHash: _contentHash, ...identity} = manifest;
    void _contentHash;
    draft = {...identity, cutout: rebaseBinding(manifest.cutout)};
  }
  return assetRigManifestSchema.parse({...draft, contentHash: hashCanonical(draft)});
}

async function readDiagnostic(stagingRoot: string, candidateSetId: string, manifest: AssetRigManifest, validation: RigValidationReport): Promise<{report: RigDiagnosticReport; videoBytes: Buffer}> {
  const report = rigDiagnosticReportSchema.parse(await readJson(join(stagingRoot, "prepared", `rig-diagnostic-${candidateSetId}.json`), 2_000_000));
  const videoRelativeFile = `prepared/rig-diagnostic-${candidateSetId}.mp4`;
  if (!verifyRigDiagnosticReportHash(report) || report.candidateSetId !== candidateSetId || report.manifestContentHash !== manifest.contentHash || report.validationReportContentHash !== validation.contentHash || report.videoRelativeFile !== videoRelativeFile) throw new Error("Rig diagnostic evidence failed its immutable bindings.");
  return {report, videoBytes: await readVerifiedBytes(stagingRoot, videoRelativeFile, report.videoContentHash, 18 * 1024 * 1024)};
}

export type RenderRigDiagnostic = (input: {stagingRoot: string; manifestFile: string; outputFile: string; entityName: string}) => Promise<void>;

export function buildApprovedProductionRevisionDraft(input: {sourceBundle: ProductionBundle; approvedAssetVersions: ApprovedAssetVersion[]}): ProductionBundleDraft {
  if (!verifyProductionBundleHash(input.sourceBundle)) throw new Error("The authoritative source production failed its content hash.");
  const mergedByRequirement = new Map((input.sourceBundle.approvedAssetVersions ?? []).map((asset) => [asset.requirementId, asset]));
  for (const assetInput of input.approvedAssetVersions) {
    const asset = approvedAssetVersionSchema.parse(assetInput);
    mergedByRequirement.set(asset.requirementId, asset);
  }
  const approvedAssetVersions = [...mergedByRequirement.values()];
  const nextProduction = {...input.sourceBundle.production, revision: input.sourceBundle.production.revision + 1};
  const rebuilt = buildAnimaticSync({draft: nextProduction, overrides: input.sourceBundle.overrides, approvedAssetVersions});
  return productionBundleDraftSchema.parse({
    schemaVersion: "1.0",
    production: rebuilt.draft,
    overrides: input.sourceBundle.overrides,
    approvedAssetVersions,
    resolvedPlan: rebuilt.resolvedPlan,
    renderPlan: rebuilt.renderPlan,
    metrics: rebuilt.metrics,
    estimate: rebuilt.estimate,
  });
}

export async function persistAssetReviewRecordSnapshot(input: {reviewsRoot: string; record: AssetReviewRecord}): Promise<void> {
  const record = assetReviewRecordSchema.parse(input.record);
  if (!verifyAssetReviewRecordHash(record)) throw new Error("The asset review record failed its immutable content hash.");
  await mkdir(input.reviewsRoot, {recursive: true});
  await writeImmutable(join(input.reviewsRoot, `${record.contentHash}.json`), Buffer.from(`${JSON.stringify(record, null, 2)}\n`, "utf8"));
  const currentFile = join(input.reviewsRoot, "current.json");
  const temporaryFile = `${currentFile}.${randomUUID()}.tmp`;
  await writeFile(temporaryFile, `${JSON.stringify({schemaVersion: "1.0", contentHash: record.contentHash, updatedAt: record.updatedAt}, null, 2)}\n`, {encoding: "utf8", mode: 0o600, flag: "wx"});
  await rename(temporaryFile, currentFile);
}

export async function buildSelectedCandidateRigArtifacts(input: {stagingRoot: string; report: PreparationReport; brief: GenerationBrief; candidateSetId: string; createdAt: string; renderDiagnostic: RenderRigDiagnostic}): Promise<{manifest: AssetRigManifest; validation: RigValidationReport; diagnostic: RigDiagnosticReport}> {
  const report = preparationReportSchema.parse(input.report);
  if (!verifyPreparationReportHash(report)) throw new Error("Selected-rig preparation evidence failed its hash.");
  const candidateSet = report.candidateSets.find((candidate) => candidate.candidateSetId === input.candidateSetId);
  if (!candidateSet || candidateSet.status !== "ready-for-review" || candidateSet.briefId !== input.brief.id || candidateSet.requirementId !== input.brief.requirementId) throw new Error("Only a prepared coherent candidate set can be selected for rigging.");
  for (const candidate of candidateSet.preparedCandidates) await readVerifiedBytes(input.stagingRoot, candidate.relativeFile, candidate.preparedContentHash, 50 * 1024 * 1024);
  const preparedRoot = join(input.stagingRoot, "prepared");
  const manifestFile = join(preparedRoot, `rig-manifest-${input.candidateSetId}.json`);
  const validationFile = join(preparedRoot, `rig-validation-${input.candidateSetId}.json`);
  const manifest = createAssetRigManifest(input.brief, input.candidateSetId, candidateSet.preparedCandidates, input.createdAt);
  const validation = validateAssetRigManifest(manifest, input.createdAt);
  if (validation.status !== "passed") throw new Error("The selected candidate set failed technical rig validation.");
  await writeImmutable(manifestFile, Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`, "utf8"));
  await writeImmutable(validationFile, Buffer.from(`${JSON.stringify(validation, null, 2)}\n`, "utf8"));
  try {
    const existing = await readDiagnostic(input.stagingRoot, input.candidateSetId, manifest, validation);
    return {manifest, validation, diagnostic: existing.report};
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  const videoRelativeFile = `prepared/rig-diagnostic-${input.candidateSetId}.mp4`;
  const finalVideoFile = join(input.stagingRoot, ...videoRelativeFile.split("/"));
  const temporaryVideoFile = join(preparedRoot, `.rig-diagnostic-${input.candidateSetId}-${randomUUID()}.tmp.mp4`);
  try {
    await input.renderDiagnostic({stagingRoot: input.stagingRoot, manifestFile, outputFile: temporaryVideoFile, entityName: input.brief.entity.name});
    const videoBytes = await readFile(temporaryVideoFile);
    await writeImmutable(finalVideoFile, videoBytes);
    const diagnostic = finalizeRigDiagnosticReport({schemaVersion: "1.0", candidateSetId: input.candidateSetId, manifestContentHash: manifest.contentHash, validationReportContentHash: validation.contentHash, videoContentHash: sha256(videoBytes), videoRelativeFile, fps: 30, frameCount: 120, width: 1280, height: 720, sourceDiagnosticContentHash: null}, input.createdAt);
    await writeImmutable(join(preparedRoot, `rig-diagnostic-${input.candidateSetId}.json`), Buffer.from(`${JSON.stringify(diagnostic, null, 2)}\n`, "utf8"));
    return {manifest, validation, diagnostic};
  } finally {
    await unlink(temporaryVideoFile).catch(() => undefined);
  }
}

export async function promotePreparedCandidateSet(input: {stagingRoot: string; assetsRoot: string; report: PreparationReport; importRecord: ImportRecord; candidateSetId: string; approvedAt: string}): Promise<ApprovedAssetVersion> {
  const report = preparationReportSchema.parse(input.report);
  const importRecord = importRecordSchema.parse(input.importRecord);
  if (!verifyPreparationReportHash(report) || !verifyImportRecordHash(importRecord) || report.importId !== importRecord.importId || report.importRecordContentHash !== importRecord.contentHash) throw new Error("Approval evidence is stale or mismatched.");
  const candidateSet = report.candidateSets.find((candidate) => candidate.candidateSetId === input.candidateSetId);
  if (!candidateSet || candidateSet.status !== "ready-for-review") throw new Error("Only a complete, review-ready candidate set can be approved.");
  const originalManifest = assetRigManifestSchema.parse(await readJson(join(input.stagingRoot, "prepared", `rig-manifest-${input.candidateSetId}.json`), 2_000_000));
  const originalValidation = rigValidationReportSchema.parse(await readJson(join(input.stagingRoot, "prepared", `rig-validation-${input.candidateSetId}.json`), 2_000_000));
  if (!verifyAssetRigManifestHash(originalManifest) || !verifyRigValidationReportHash(originalValidation) || originalValidation.status !== "passed" || originalValidation.manifestContentHash !== originalManifest.contentHash) throw new Error("Candidate rig validation is missing, failed, or stale.");
  const selectedDiagnostic = await readDiagnostic(input.stagingRoot, input.candidateSetId, originalManifest, originalValidation);
  const manifest = rebaseRigManifest(originalManifest);
  const validation = validateAssetRigManifest(manifest, input.approvedAt);
  if (validation.status !== "passed") throw new Error("Promoted rig failed validation after local-library rebasing.");
  const diagnostic = finalizeRigDiagnosticReport({schemaVersion: "1.0", candidateSetId: input.candidateSetId, manifestContentHash: manifest.contentHash, validationReportContentHash: validation.contentHash, videoContentHash: selectedDiagnostic.report.videoContentHash, videoRelativeFile: "rig-diagnostic.mp4", fps: 30, frameCount: 120, width: 1280, height: 720, sourceDiagnosticContentHash: selectedDiagnostic.report.contentHash}, input.approvedAt);
  const assetId = `approved-${candidateSet.requirementId}`;
  const version = `sha256-${manifest.contentHash.slice(0, 16)}`;
  const versionRoot = join(input.assetsRoot, assetId, version);
  for (const candidate of candidateSet.preparedCandidates) {
    const bytes = await readVerifiedBytes(input.stagingRoot, candidate.relativeFile, candidate.preparedContentHash, 50 * 1024 * 1024);
    await writeImmutable(join(versionRoot, "files", `${candidate.candidateId}.png`), bytes, candidate.preparedContentHash);
  }
  await writeImmutable(join(versionRoot, "manifest.json"), Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`, "utf8"));
  await writeImmutable(join(versionRoot, "rig-validation.json"), Buffer.from(`${JSON.stringify(validation, null, 2)}\n`, "utf8"));
  await writeImmutable(join(versionRoot, "rig-diagnostic.mp4"), selectedDiagnostic.videoBytes, selectedDiagnostic.report.videoContentHash);
  await writeImmutable(join(versionRoot, "rig-diagnostic.json"), Buffer.from(`${JSON.stringify(diagnostic, null, 2)}\n`, "utf8"));
  const importedAssets = importRecord.assets.filter((asset) => asset.candidateSetId === input.candidateSetId);
  const provenance = importedAssets[0]?.rights;
  if (!provenance || importedAssets.some((asset) => hashCanonical(asset.rights) !== hashCanonical(provenance))) throw new Error("Candidate set provenance is missing or inconsistent.");
  return approvedAssetVersionSchema.parse({assetId, version, requirementId: candidateSet.requirementId, contentHash: manifest.contentHash, relativeFile: `${assetId}/${version}/manifest.json`, provenance, approvedAt: input.approvedAt});
}
