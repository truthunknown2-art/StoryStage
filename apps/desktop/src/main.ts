import {createHash, randomUUID} from "node:crypto";
import {access, link, lstat, mkdir, readFile, readdir, realpath, rename, unlink, writeFile} from "node:fs/promises";
import {basename, dirname, isAbsolute, join, relative, resolve, sep} from "node:path";
import {pathToFileURL} from "node:url";
import {productionDraftPayload} from "./production-draft-payload";
import {assertApprovedPublicReviewLineage} from "./public-review-lineage";
import {app, BrowserWindow, dialog, ipcMain, net, protocol, shell, utilityProcess, type OpenDialogOptions} from "electron";
import {commitApprovalWorkflow} from "@storystage/asset-pipeline/approval-recovery";
import {buildApprovedProductionRevisionDraft, buildSelectedCandidateRigArtifacts, persistAssetReviewRecordSnapshot, promotePreparedCandidateSet} from "@storystage/asset-pipeline/approved-asset-workflow";
import {promotePublicShowPackCandidate, verifyPublicShowPackCandidate} from "@storystage/asset-pipeline/public-show-pack-promotion";
import {persistPublicShowPackReviewRecord, PublicShowPackReviewCoordinator, readPublicShowPackReviewRecord} from "@storystage/asset-pipeline/public-show-pack-review-store";
import {commitImportEvidenceDirectory} from "@storystage/asset-pipeline/import-evidence-store";
import {createImportRecordFromStagedCandidates} from "@storystage/asset-pipeline/import-record-builder";
import {
  IPC_CHANNELS,
  approveMusicTrackRequestSchema,
  approveMusicTrackResultSchema,
  approveSoundEffectRequestSchema,
  approveSoundEffectResultSchema,
  approveVoiceTrackRequestSchema,
  approveVoiceTrackResultSchema,
  assetWorkerCommandSchema,
  assetWorkerMessageSchema,
  canTransitionRenderJob,
  desktopCapabilitiesSchema,
  exportGenerationJobRequestSchema,
  exportGenerationJobResultSchema,
  finalizeLooseCandidateMappingRequestSchema,
  finalizeLooseCandidateMappingResultSchema,
  getGenerationExchangeRequestSchema,
  getGenerationExchangeResultSchema,
  importLooseCandidateFilesRequestSchema,
  importLooseCandidateFilesResultSchema,
  importMusicTrackRequestSchema,
  importMusicTrackResultSchema,
  importSoundEffectRequestSchema,
  importSoundEffectResultSchema,
  importVoiceTrackRequestSchema,
  importVoiceTrackResultSchema,
  listGenerationExchangesRequestSchema,
  listGenerationExchangesResultSchema,
  listProductionBundlesResultSchema,
  listPublicShowPackCandidatesRequestSchema,
  listPublicShowPackCandidatesResultSchema,
  loadProductionBundleRequestSchema,
  loadProductionBundleResultSchema,
  openRenderedFileResultSchema,
  prepareGenerationImportRequestSchema,
  prepareGenerationImportResultSchema,
  preparationReviewSchema,
  reviewCandidateSetRequestSchema,
  reviewCandidateSetResultSchema,
  reviewPublicShowPackCandidateRequestSchema,
  reviewPublicShowPackCandidateResultSchema,
  productionBundleSummarySchema,
  stagedCandidateSummarySchema,
  renderJobEventSchema,
  renderWorkerCommandSchema,
  renderWorkerMessageSchema,
  saveProductionBundleRequestSchema,
  saveProductionBundleResultSchema,
  startRenderRequestSchema,
  startRenderResponseSchema,
  startProductionRenderRequestSchema,
  stageCandidateBundleRequestSchema,
  stageCandidateBundleResultSchema,
  workerLooseStagedCandidateSchema,
  type RenderJobEvent,
  type WorkerLooseStagedCandidate,
  type ProductionBundleSummary,
  type PreparationReview,
} from "@storystage/contracts";
import {
  assetRigManifestSchema,
  assetReviewRecordSchema,
  canTransitionGenerationExchange,
  candidateBundleSchema,
  assertPublicShowPackReviewAttemptIsCompatible,
  createImportValidationReport,
  finalizeAssetReviewRecord,
  finalizePublicShowPackReviewRecord,
  finalizeProductionBundle,
  finalizeGenerationJob,
  generationExchangeStateSchema,
  generationBriefsMatchAuthoritativePlan,
  generationJobSchema,
  generationJobDraftSchema,
  getShowPack,
  hashCanonical,
  inspectPcmWav,
  musicTrackSchema,
  soundEffectAssetSchema,
  importRecordSchema,
  importValidationReportSchema,
  preparationReportSchema,
  publicShowPackCandidateMatchesRelease,
  prepareCandidateSetsRequestSchema,
  rigValidationReportSchema,
  rigDiagnosticReportSchema,
  stagedCandidateSchema,
  productionBundleSchema,
  productionBundleDraftSchema,
  verifyProductionBundleHash,
  verifyImportRecordHash,
  verifyImportEvidence,
  verifyGenerationJobHash,
  verifyShowPackHash,
  verifyPreparationReportHash,
  verifyAssetRigManifestHash,
  verifyAssetReviewRecordHash,
  verifyRigValidationReportHash,
  verifyRigDiagnosticReportHash,
  validateCandidateSets,
  voiceTrackSchema,
  type CandidateBundle,
  type ApprovedAssetVersion,
  type AssetReviewRecord,
  type AssetRigManifest,
  type RigDiagnosticReport,
  type RigValidationReport,
  type GenerationExchangeState,
  type GenerationJob,
  type GenerationJobDraft,
  type ImportRecord,
  type MusicTrack,
  type SoundEffectAsset,
  type PreparationReport,
  type ProductionBundle,
  type PublicShowPackReviewRecord,
  type ShowPack,
  type StagedCandidate,
  type VoiceTrack,
} from "@storystage/story-engine";

type JobRecord = {
  event: RenderJobEvent;
  phaseProgress: Partial<Record<"bundling" | "rendering", number>>;
  allowedOutputRoot: string;
};

let mainWindow: BrowserWindow | null = null;
let activeJobId: string | null = null;
const jobRegistry = new Map<string, JobRecord>();
type GenerationExchangeRecord = {job: GenerationJob; jobFile: string; stateFile: string; state: GenerationExchangeState};
const generationExchangeRegistry = new Map<string, GenerationExchangeRecord>();
const productionBundleRegistry = new Map<string, {bundle: ProductionBundle; bundleFile: string}>();
const voiceTrackRegistry = new Map<string, VoiceTrack>();
const musicTrackRegistry = new Map<string, MusicTrack>();
const soundEffectRegistry = new Map<string, SoundEffectAsset>();
const productionSaveQueues = new Map<string, Promise<ProductionBundle>>();
const publicShowPackReviewCoordinator = new PublicShowPackReviewCoordinator();
const looseImportRegistry = new Map<string, {
  exchange: GenerationExchangeRecord;
  trustedStagingRoot: string;
  stagingRoot: string;
  candidates: WorkerLooseStagedCandidate[];
}>();
const workspaceRoot = app.isPackaged ? app.getAppPath() : resolve(__dirname, "../../..");
const rookCandidateRelease = {
  candidateId: "weird-history-rook-v1",
  showPackId: "weird-history-editorial-v1",
  contentHash: "6c60b1fa633a4c3c7e9a32cbe475a52277f38b7d5cf2e239b0acee2ada85c691",
  relativeRoot: "packages/remotion-runtime/public/show-packs/weird-history/rook/v1",
  publicRoot: "/show-packs/weird-history/rook/v1",
} as const;
const terminalStatuses = new Set<RenderJobEvent["status"]>(["completed", "failed"]);
const renderedMediaScheme = "storystage-media";

protocol.registerSchemesAsPrivileged([{
  scheme: renderedMediaScheme,
  privileges: {standard: true, secure: true, supportFetchAPI: true, corsEnabled: true, stream: true},
}]);

function isWithinPath(root: string, candidate: string): boolean {
  const pathFromRoot = relative(root, candidate);
  return pathFromRoot === "" || (!pathFromRoot.startsWith("..") && !isAbsolute(pathFromRoot));
}

const localAssetsRoot = () => join(app.getPath("userData"), ".storystage-local", "assets");
const rookCandidateRoot = () => resolve(workspaceRoot, ...rookCandidateRelease.relativeRoot.split("/"));

async function readPublicShowPackReview(productionId: string, revision: number, candidateId: string): Promise<PublicShowPackReviewRecord | null> {
  const file = join(app.getPath("userData"), ".storystage-local", "show-pack-reviews", productionId, `r${revision}`, candidateId, "review.json");
  return readPublicShowPackReviewRecord(file);
}

async function persistPublicShowPackReview(record: ReturnType<typeof finalizePublicShowPackReviewRecord>): Promise<void> {
  const file = join(app.getPath("userData"), ".storystage-local", "show-pack-reviews", record.productionId, `r${record.sourceProductionRevision}`, record.candidateId, "review.json");
  await persistPublicShowPackReviewRecord({file, record});
}

const completedPublicReviewAcknowledgements = {identitySheet: true, neutralPose: true, talkPose: true, reactionPose: true, movingDiagnostic: true, identityConsistency: true, matteEdges: true, provenance: true} as const;
const publicCandidateAssetPrefix = (candidateId: string) => `approved-${candidateId}-`;
const publicCandidateAssetInBundle = (bundle: ProductionBundle, candidateId: string) => (bundle.approvedAssetVersions ?? []).find((asset) => asset.assetId.startsWith(publicCandidateAssetPrefix(candidateId))) ?? null;

async function resolvePublicShowPackReviewForBundle(bundle: ProductionBundle, candidate: {candidateId: string; contentHash: string}): Promise<PublicShowPackReviewRecord | null> {
  const exact = await readPublicShowPackReview(bundle.production.productionId, bundle.production.revision, candidate.candidateId);
  const currentAsset = publicCandidateAssetInBundle(bundle, candidate.candidateId);
  const next = productionBundleRegistry.get(productionBundleKey(bundle.production.productionId, bundle.production.revision + 1))?.bundle ?? null;
  const nextAsset = next ? publicCandidateAssetInBundle(next, candidate.candidateId) : null;
  if (exact) {
    if (exact.decision === "rejected" && (currentAsset || nextAsset)) throw new Error("The durable Rook decision contradicts an approved production lineage.");
    if (exact.decision === "approved") await verifyApprovedPublicReviewLineageOnDisk(exact);
    return exact;
  }

  if (currentAsset && bundle.production.revision > 1) {
    const sourceRevision = bundle.production.revision - 1;
    const source = productionBundleRegistry.get(productionBundleKey(bundle.production.productionId, sourceRevision))?.bundle ?? null;
    if (!source || !verifyProductionBundleHash(source)) throw new Error("The approved Rook target lost its authoritative source revision.");
    const sourceReview = await readPublicShowPackReview(bundle.production.productionId, sourceRevision, candidate.candidateId);
    if (sourceReview) {
      if (sourceReview.decision !== "approved" || sourceReview.targetProductionRevision !== bundle.production.revision) throw new Error("The Rook source review contradicts its approved target revision.");
      await verifyApprovedPublicReviewLineageOnDisk(sourceReview);
      return sourceReview;
    }
    const recovered = finalizePublicShowPackReviewRecord({schemaVersion: "1.0", candidateId: candidate.candidateId, candidateContentHash: candidate.contentHash, productionId: bundle.production.productionId, sourceProductionRevision: sourceRevision, sourceProductionBundleContentHash: source.contentHash, decision: "approved", acknowledgements: completedPublicReviewAcknowledgements, decidedAt: currentAsset.approvedAt, approvedAssetVersion: currentAsset, targetProductionRevision: bundle.production.revision, targetProductionBundleContentHash: bundle.contentHash});
    await persistPublicShowPackReview(recovered);
    return recovered;
  }

  if (next && nextAsset) {
    if (!verifyProductionBundleHash(next)) throw new Error("The recovered Rook target revision failed its content hash.");
    const recovered = finalizePublicShowPackReviewRecord({schemaVersion: "1.0", candidateId: candidate.candidateId, candidateContentHash: candidate.contentHash, productionId: bundle.production.productionId, sourceProductionRevision: bundle.production.revision, sourceProductionBundleContentHash: bundle.contentHash, decision: "approved", acknowledgements: completedPublicReviewAcknowledgements, decidedAt: nextAsset.approvedAt, approvedAssetVersion: nextAsset, targetProductionRevision: next.production.revision, targetProductionBundleContentHash: next.contentHash});
    await persistPublicShowPackReview(recovered);
    return recovered;
  }
  return null;
}

async function publishImmutableVoiceFile(targetFile: string, bytes: Buffer): Promise<void> {
  await mkdir(dirname(targetFile), {recursive: true});
  const temporaryFile = `${targetFile}.${randomUUID()}.tmp`;
  await writeFile(temporaryFile, bytes, {mode: 0o600, flag: "wx"});
  try {
    try {
      await link(temporaryFile, targetFile);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
      const existing = await readFile(targetFile);
      if (createHash("sha256").update(existing).digest("hex") !== createHash("sha256").update(bytes).digest("hex")) throw new Error("Voice asset filename collides with different bytes.");
    }
  } finally {
    await unlink(temporaryFile).catch(() => undefined);
  }
}

async function readVerifiedVoiceTrack(trackInput: VoiceTrack): Promise<{bytes: Buffer; file: string}> {
  const track = voiceTrackSchema.parse(trackInput);
  const root = localAssetsRoot();
  await mkdir(root, {recursive: true});
  const requestedFile = resolve(root, ...track.relativeFile.split("/"));
  if (!isWithinPath(root, requestedFile)) throw new Error("Voice asset escaped the private asset root.");
  const rootInfo = await lstat(root);
  if (rootInfo.isSymbolicLink() || !rootInfo.isDirectory()) throw new Error("Voice asset root is not a trusted directory.");
  let current = root;
  for (const segment of relative(root, requestedFile).split(/[\\/]/).filter(Boolean)) {
    current = resolve(current, segment);
    const segmentInfo = await lstat(current);
    if (segmentInfo.isSymbolicLink()) throw new Error("Voice asset path contains a symbolic link.");
  }
  const [canonicalRoot, canonicalFile] = await Promise.all([realpath(root), realpath(requestedFile)]);
  if (!isWithinPath(canonicalRoot, canonicalFile)) throw new Error("Voice asset escaped its canonical private root.");
  const info = await lstat(canonicalFile);
  if (!info.isFile() || info.isSymbolicLink() || info.size <= 0 || info.size > 256 * 1024 * 1024) throw new Error("Voice asset is missing or exceeds 256 MB.");
  const bytes = await readFile(canonicalFile);
  if (createHash("sha256").update(bytes).digest("hex") !== track.contentHash) throw new Error("Voice asset bytes no longer match the approved content hash.");
  const metadata = inspectPcmWav(bytes);
  if (metadata.codec !== track.codec || metadata.sampleRate !== track.sampleRate || metadata.channels !== track.channels || metadata.bitsPerSample !== track.bitsPerSample || metadata.durationInSeconds !== track.durationInSeconds) throw new Error("Voice asset metadata no longer matches the production binding.");
  return {bytes, file: canonicalFile};
}

async function readVerifiedMusicTrack(trackInput: MusicTrack): Promise<{bytes: Buffer; file: string}> {
  const track = musicTrackSchema.parse(trackInput);
  if (!track.relativeFile.startsWith("music/")) throw new Error("Music asset is outside its private media scope.");
  return readVerifiedVoiceTrack(track);
}

async function readVerifiedSoundEffect(trackInput: SoundEffectAsset): Promise<{bytes: Buffer; file: string}> {
  const track = soundEffectAssetSchema.parse(trackInput);
  if (!track.relativeFile.startsWith("sfx/")) throw new Error("Sound-effect asset is outside its private media scope.");
  return readVerifiedVoiceTrack(track);
}

function makeExchangeState(job: GenerationJob, status: GenerationExchangeState["status"], importId: string | null): GenerationExchangeState {
  return generationExchangeStateSchema.parse({
    schemaVersion: "1.0",
    exchangeJobId: job.exchangeJobId,
    generationJobContentHash: job.contentHash,
    production: {id: job.production.id, revision: job.production.revision},
    status,
    importId,
    updatedAt: new Date().toISOString(),
  });
}

async function persistExchangeState(record: GenerationExchangeRecord, state: GenerationExchangeState): Promise<void> {
  const temporaryFile = `${record.stateFile}.${randomUUID()}.tmp`;
  await writeFile(temporaryFile, `${JSON.stringify(state, null, 2)}\n`, {encoding: "utf8", mode: 0o600, flag: "wx"});
  await rename(temporaryFile, record.stateFile);
  record.state = state;
}

async function transitionExchangeState(record: GenerationExchangeRecord, status: GenerationExchangeState["status"], importId: string | null): Promise<void> {
  if (!canTransitionGenerationExchange(record.state.status, status)) throw new Error(`Exchange cannot transition from ${record.state.status} to ${status}.`);
  await persistExchangeState(record, makeExchangeState(record.job, status, importId));
}

async function realChildDirectories(parent: string, canonicalOutboxRoot: string): Promise<Array<{name: string; path: string}>> {
  const directories: Array<{name: string; path: string}> = [];
  for (const entry of await readdir(parent, {withFileTypes: true})) {
    if (!entry.isDirectory() || entry.isSymbolicLink()) continue;
    const childPath = join(parent, entry.name);
    try {
      const info = await lstat(childPath);
      if (info.isSymbolicLink() || !info.isDirectory()) continue;
      const canonicalChild = await realpath(childPath);
      if (!isWithinPath(canonicalOutboxRoot, canonicalChild)) continue;
      directories.push({name: entry.name, path: childPath});
    } catch {
      // Ignore malformed or concurrently removed private entries during rehydration.
    }
  }
  return directories;
}

async function rehydrateGenerationExchangeRegistry(): Promise<void> {
  generationExchangeRegistry.clear();
  const outboxRoot = join(app.getPath("userData"), ".storystage-local", "jobs", "outbox");
  await mkdir(outboxRoot, {recursive: true});
  const outboxInfo = await lstat(outboxRoot);
  if (outboxInfo.isSymbolicLink() || !outboxInfo.isDirectory()) throw new Error("The private generation outbox is not a trusted local directory.");
  const canonicalOutboxRoot = await realpath(outboxRoot);

  for (const productionDirectory of await realChildDirectories(outboxRoot, canonicalOutboxRoot)) {
    for (const revisionDirectory of await realChildDirectories(productionDirectory.path, canonicalOutboxRoot)) {
      for (const jobDirectory of await realChildDirectories(revisionDirectory.path, canonicalOutboxRoot)) {
        try {
          const jobFile = join(jobDirectory.path, "generation-job.json");
          const jobInfo = await lstat(jobFile);
          if (jobInfo.isSymbolicLink() || !jobInfo.isFile() || jobInfo.size > 2_000_000) continue;
          const job = generationJobSchema.parse(JSON.parse(await readFile(jobFile, "utf8")));
          if (!verifyGenerationJobHash(job)) continue;
          if (productionDirectory.name !== job.production.id || revisionDirectory.name !== `r${job.production.revision}` || jobDirectory.name !== job.exchangeJobId) continue;
          const authoritativeShowPack = getShowPack(job.showPack.id);
          if (!verifyShowPackHash(authoritativeShowPack) || authoritativeShowPack.version !== job.showPack.version || authoritativeShowPack.contentHash !== job.showPack.contentHash) continue;
          const storedProduction = productionBundleRegistry.get(productionBundleKey(job.production.id, job.production.revision));
          if (!storedProduction || !verifyGenerationDraftAgainstProduction(job, storedProduction.bundle)) continue;

          const stateFile = join(jobDirectory.path, "exchange-state.json");
          let state = makeExchangeState(job, "awaiting-results", null);
          let stateWasRecovered = false;
          try {
            const stateInfo = await lstat(stateFile);
            if (!stateInfo.isSymbolicLink() && stateInfo.isFile() && stateInfo.size <= 100_000) {
              const storedState = generationExchangeStateSchema.parse(JSON.parse(await readFile(stateFile, "utf8")));
              if (storedState.exchangeJobId === job.exchangeJobId && storedState.generationJobContentHash === job.contentHash && storedState.production.id === job.production.id && storedState.production.revision === job.production.revision) {
                state = storedState;
                stateWasRecovered = true;
              }
            }
          } catch (error) {
            if ((error as NodeJS.ErrnoException).code !== "ENOENT") continue;
          }
          const record: GenerationExchangeRecord = {job, jobFile, stateFile, state};
          if (!await validateRehydratedExchangeArtifacts(record)) continue;
          await reconcileApprovedExchange(record);
          if (!await validateRehydratedExchangeArtifacts(record)) continue;
          generationExchangeRegistry.set(job.exchangeJobId, record);
          if (!stateWasRecovered) await persistExchangeState(record, state);
        } catch {
          // A malformed private job is quarantined by omission; it is never trusted for import.
        }
      }
    }
  }
  for (const [jobId, record] of generationExchangeRegistry) {
    if (record.state.status === "superseded" && (!record.state.supersededBy || !generationExchangeRegistry.has(record.state.supersededBy))) generationExchangeRegistry.delete(jobId);
  }
}

const productionBundleKey = (productionId: string, revision: number) => `${productionId}:r${revision}`;

function summarizeProductionBundle(bundle: ProductionBundle): ProductionBundleSummary {
  return productionBundleSummarySchema.parse({productionId: bundle.production.productionId, revision: bundle.production.revision, title: bundle.production.title, projectType: bundle.production.projectType, showPackId: bundle.production.showPackId, savedAt: bundle.savedAt, contentHash: bundle.contentHash});
}

async function rehydrateProductionBundleRegistry(): Promise<void> {
  productionBundleRegistry.clear();
  voiceTrackRegistry.clear();
  musicTrackRegistry.clear();
  soundEffectRegistry.clear();
  const productionsRoot = join(app.getPath("userData"), ".storystage-local", "productions");
  await mkdir(productionsRoot, {recursive: true});
  const rootInfo = await lstat(productionsRoot);
  if (rootInfo.isSymbolicLink() || !rootInfo.isDirectory()) throw new Error("The private production root is not a trusted local directory.");
  const canonicalRoot = await realpath(productionsRoot);
  for (const productionDirectory of await realChildDirectories(productionsRoot, canonicalRoot)) {
    for (const revisionDirectory of await realChildDirectories(productionDirectory.path, canonicalRoot)) {
      try {
        const currentFile = join(revisionDirectory.path, "current.json");
        const currentInfo = await lstat(currentFile);
        if (currentInfo.isSymbolicLink() || !currentInfo.isFile() || currentInfo.size > 100_000) continue;
        const pointer = JSON.parse(await readFile(currentFile, "utf8")) as {contentHash?: unknown};
        if (typeof pointer.contentHash !== "string" || !/^[a-f0-9]{64}$/.test(pointer.contentHash)) continue;
        const bundleFile = join(revisionDirectory.path, "snapshots", `${pointer.contentHash}.json`);
        const bundleInfo = await lstat(bundleFile);
        if (bundleInfo.isSymbolicLink() || !bundleInfo.isFile() || bundleInfo.size > 10_000_000) continue;
        const bundle = productionBundleSchema.parse(JSON.parse(await readFile(bundleFile, "utf8")));
        if (!verifyProductionBundleHash(bundle) || bundle.contentHash !== pointer.contentHash) continue;
        if (productionDirectory.name !== bundle.production.productionId || revisionDirectory.name !== `r${bundle.production.revision}`) continue;
        const showPack = getShowPack(bundle.production.showPackId);
        if (!verifyShowPackHash(showPack) || bundle.resolvedPlan.showPack.contentHash !== showPack.contentHash) continue;
        productionBundleRegistry.set(productionBundleKey(bundle.production.productionId, bundle.production.revision), {bundle, bundleFile});
        if (bundle.voiceTrack) {
          try {
            await readVerifiedVoiceTrack(bundle.voiceTrack);
            voiceTrackRegistry.set(bundle.voiceTrack.contentHash, bundle.voiceTrack);
          } catch {
            // Keep the production visible, but never expose or render a missing/tampered voice asset.
          }
        }
        if (bundle.musicTrack) {
          try {
            await readVerifiedMusicTrack(bundle.musicTrack);
            musicTrackRegistry.set(bundle.musicTrack.contentHash, bundle.musicTrack);
          } catch {
            // Keep the production visible, but never expose or render a missing/tampered music asset.
          }
        }
        for (const soundEffect of bundle.soundEffectAssets ?? []) {
          try {
            await readVerifiedSoundEffect(soundEffect);
            soundEffectRegistry.set(soundEffect.contentHash, soundEffect);
          } catch {
            // Keep the production visible, but never expose or render a missing/tampered sound-effect asset.
          }
        }
      } catch {
        // Ignore malformed private production snapshots; never expose them to the renderer.
      }
    }
  }
}

async function persistProductionBundle(bundle: ProductionBundle): Promise<string> {
  const revisionRoot = join(app.getPath("userData"), ".storystage-local", "productions", bundle.production.productionId, `r${bundle.production.revision}`);
  const snapshotsRoot = join(revisionRoot, "snapshots");
  await mkdir(snapshotsRoot, {recursive: true});
  const bundleFile = join(snapshotsRoot, `${bundle.contentHash}.json`);
  try {
    await writeFile(bundleFile, `${JSON.stringify(bundle, null, 2)}\n`, {encoding: "utf8", mode: 0o600, flag: "wx"});
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
  }
  const pointer = {schemaVersion: "1.0", contentHash: bundle.contentHash, savedAt: bundle.savedAt};
  const currentFile = join(revisionRoot, "current.json");
  const temporaryFile = `${currentFile}.${randomUUID()}.tmp`;
  await writeFile(temporaryFile, `${JSON.stringify(pointer, null, 2)}\n`, {encoding: "utf8", mode: 0o600, flag: "wx"});
  await rename(temporaryFile, currentFile);
  productionBundleRegistry.set(productionBundleKey(bundle.production.productionId, bundle.production.revision), {bundle, bundleFile});
  return bundleFile;
}

async function readProductionBundleSnapshot(productionId: string, revision: number, contentHash: string): Promise<ProductionBundle | null> {
  if (!/^[a-f0-9]{64}$/.test(contentHash)) throw new Error("Production snapshot hash is invalid.");
  const file = join(app.getPath("userData"), ".storystage-local", "productions", productionId, `r${revision}`, "snapshots", `${contentHash}.json`);
  try {
    const info = await lstat(file);
    if (info.isSymbolicLink() || !info.isFile() || info.size > 10_000_000) throw new Error("The production snapshot is unsafe.");
    const bundle = productionBundleSchema.parse(JSON.parse(await readFile(file, "utf8")));
    if (!verifyProductionBundleHash(bundle) || bundle.contentHash !== contentHash || bundle.production.productionId !== productionId || bundle.production.revision !== revision) throw new Error("The production snapshot failed its immutable identity.");
    return bundle;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

async function verifyApprovedPublicReviewLineageOnDisk(review: PublicShowPackReviewRecord): Promise<void> {
  if (review.decision !== "approved" || !review.targetProductionRevision || !review.targetProductionBundleContentHash) throw new Error("The Rook review is not an approved lineage binding.");
  const originalSource = await readProductionBundleSnapshot(review.productionId, review.sourceProductionRevision, review.sourceProductionBundleContentHash);
  const originalTarget = await readProductionBundleSnapshot(review.productionId, review.targetProductionRevision, review.targetProductionBundleContentHash);
  const currentTarget = productionBundleRegistry.get(productionBundleKey(review.productionId, review.targetProductionRevision))?.bundle ?? null;
  if (!originalSource || !originalTarget || !currentTarget) throw new Error("The approved Rook lineage lost an immutable source or target snapshot.");
  assertApprovedPublicReviewLineage({review, originalTarget, currentTarget});
}

function verifyAuthoritativeBriefData(draft: GenerationJobDraft, showPack: ShowPack): void {
  for (const brief of draft.briefs) {
    if (hashCanonical(brief.styleBible) !== hashCanonical(showPack.styleBible)) throw new Error(`Generation brief ${brief.id} alters the authoritative style bible.`);
    for (const reference of brief.referenceAssets) {
      const authoritativeAsset = showPack.assets.find((asset) => asset.id === reference.assetId);
      if (!authoritativeAsset || authoritativeAsset.contentHash !== reference.contentHash) throw new Error(`Generation brief ${brief.id} contains an unknown or stale reference asset.`);
    }
    if (brief.identityLock) {
      const identityAsset = showPack.assets.find((asset) => asset.id === brief.identityLock!.id);
      if (!identityAsset || identityAsset.contentHash !== brief.identityLock.contentHash) throw new Error(`Generation brief ${brief.id} contains an unknown or stale identity lock.`);
    }
  }
}

function verifyGenerationDraftAgainstProduction(draft: GenerationJobDraft, bundle: ProductionBundle): boolean {
  return verifyProductionBundleHash(bundle)
    && draft.productionBundleContentHash === bundle.contentHash
    && draft.production.id === bundle.production.productionId
    && draft.production.revision === bundle.production.revision
    && draft.production.title === bundle.production.title
    && draft.showPack.id === bundle.resolvedPlan.showPack.id
    && draft.showPack.version === bundle.resolvedPlan.showPack.version
    && draft.showPack.contentHash === bundle.resolvedPlan.showPack.contentHash
    && generationBriefsMatchAuthoritativePlan(draft.briefs, bundle.resolvedPlan.generationBriefs);
}

function createImportRecord(options: {exchange: GenerationExchangeRecord; importId: string; sourceMode: "structured-bundle" | "loose-files"; bundle: CandidateBundle; staged: StagedCandidate[]; originalNameById: Map<string, string>}): {record: ImportRecord; missingRoleCount: number} {
  return createImportRecordFromStagedCandidates({job: options.exchange.job, importId: options.importId, sourceMode: options.sourceMode, bundle: options.bundle, staged: options.staged, originalNames: Object.fromEntries(options.originalNameById)});
}

async function persistImportRecord(stagingRoot: string, record: ImportRecord): Promise<void> {
  const validationReport = createImportValidationReport(record, new Date().toISOString());
  await commitImportEvidenceDirectory({
    stagingRoot,
    expectedContentHash: record.contentHash,
    files: {
      candidateBundle: `${JSON.stringify(record.candidateBundle, null, 2)}\n`,
      importRecord: `${JSON.stringify(record, null, 2)}\n`,
      validationReport: `${JSON.stringify(validationReport, null, 2)}\n`,
    },
    readCommittedContentHash: async (evidenceRoot) => (await readImportEvidenceAt(evidenceRoot)).record.contentHash,
  });
}

function expectedRolesForJob(job: GenerationJob) {
  return job.briefs.flatMap((brief) => Array.from({length: brief.candidateCount}, (_, index) => ({candidateSetId: `set-${brief.id}-${index + 1}`, candidateSetNumber: index + 1})).flatMap((candidateSet) => brief.expectedFiles.map((fileRole) => ({briefId: brief.id, requirementId: brief.requirementId, candidateSetId: candidateSet.candidateSetId, candidateSetNumber: candidateSet.candidateSetNumber, entityName: brief.entity.name, fileRole}))));
}

function summarizeExchange(record: GenerationExchangeRecord) {
  return {exchangeJobId: record.job.exchangeJobId, productionId: record.job.production.id, revision: record.job.production.revision, title: record.job.production.title, status: record.state.status, briefCount: record.job.briefs.length, importId: record.state.importId, updatedAt: record.state.updatedAt};
}

async function persistLooseImportSession(importId: string, exchange: GenerationExchangeRecord, stagingRoot: string, candidates: WorkerLooseStagedCandidate[]): Promise<void> {
  const sessionBase = {schemaVersion: "1.0", importId, exchangeJobId: exchange.job.exchangeJobId, generationJobContentHash: exchange.job.contentHash, createdAt: new Date().toISOString(), candidates};
  const session = {...sessionBase, contentHash: hashCanonical(sessionBase)};
  await writeFile(join(stagingRoot, "loose-import-session.json"), `${JSON.stringify(session, null, 2)}\n`, {encoding: "utf8", mode: 0o600, flag: "wx"});
}

async function readVerifiedLooseImportSession(exchange: GenerationExchangeRecord): Promise<{exchange: GenerationExchangeRecord; trustedStagingRoot: string; stagingRoot: string; candidates: WorkerLooseStagedCandidate[]} | null> {
  if (exchange.state.status !== "files-imported" || !exchange.state.importId) return null;
  try {
    const trustedStagingRoot = join(app.getPath("userData"), ".storystage-local");
    const stagingRoot = join(trustedStagingRoot, "jobs", "inbox", exchange.job.production.id, `r${exchange.job.production.revision}`, exchange.state.importId);
    const sessionFile = join(stagingRoot, "loose-import-session.json");
    const sessionInfo = await lstat(sessionFile);
    if (sessionInfo.isSymbolicLink() || !sessionInfo.isFile() || sessionInfo.size > 2_000_000) return null;
    const raw = JSON.parse(await readFile(sessionFile, "utf8")) as Record<string, unknown>;
    const {contentHash, ...sessionBase} = raw;
    if (typeof contentHash !== "string" || hashCanonical(sessionBase) !== contentHash) return null;
    if (raw.importId !== exchange.state.importId || raw.exchangeJobId !== exchange.job.exchangeJobId || raw.generationJobContentHash !== exchange.job.contentHash) return null;
    const candidates = workerLooseStagedCandidateSchema.array().parse(raw.candidates);
    await verifyStagedCandidatesInWorker(candidates.map((entry) => entry.candidate), trustedStagingRoot, stagingRoot);
    return {exchange, trustedStagingRoot, stagingRoot, candidates};
  } catch {
    return null;
  }
}

async function rehydrateLooseImportRegistry(): Promise<void> {
  looseImportRegistry.clear();
  for (const exchange of generationExchangeRegistry.values()) {
    const recovered = await readVerifiedLooseImportSession(exchange);
    if (recovered && exchange.state.importId) looseImportRegistry.set(exchange.state.importId, recovered);
  }
}

async function readImportEvidenceAt(evidenceRoot: string): Promise<{record: ImportRecord; missingRoleCount: number}> {
  const [bundleRaw, recordRaw, reportRaw] = await Promise.all([
    readBoundJsonFile(join(evidenceRoot, "candidate-bundle.json"), 2_000_000),
    readBoundJsonFile(join(evidenceRoot, "import-record.json"), 10_000_000),
    readBoundJsonFile(join(evidenceRoot, "validation-report.json"), 10_000_000),
  ]);
  const bundle = candidateBundleSchema.parse(bundleRaw);
  const record = importRecordSchema.parse(recordRaw);
  const validationReport = importValidationReportSchema.parse(reportRaw);
  if (hashCanonical(bundle) !== record.manifestContentHash || hashCanonical(bundle) !== hashCanonical(record.candidateBundle) || !verifyImportEvidence(record, validationReport)) throw new Error("The import evidence transaction failed cross-file integrity checks.");
  return {record, missingRoleCount: validationReport.missingRoleCount};
}

async function readImportRecord(exchange: GenerationExchangeRecord): Promise<ImportRecord | null> {
  if (!exchange.state.importId) return null;
  try {
    const stagingRoot = importStagingRoot(exchange);
    let record: ImportRecord;
    try {
      record = (await readImportEvidenceAt(join(stagingRoot, "evidence"))).record;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      record = (await readImportEvidenceAt(stagingRoot)).record;
    }
    if (!verifyImportRecordHash(record) || record.exchangeJobId !== exchange.job.exchangeJobId || record.generationJobContentHash !== exchange.job.contentHash || record.importId !== exchange.state.importId) return null;
    return record;
  } catch {
    return null;
  }
}

function importStagingRoot(exchange: GenerationExchangeRecord): string {
  if (!exchange.state.importId) throw new Error("The exchange has no durable import identity.");
  return join(app.getPath("userData"), ".storystage-local", "jobs", "inbox", exchange.job.production.id, `r${exchange.job.production.revision}`, exchange.state.importId);
}

async function readBoundJsonFile(file: string, maxBytes: number): Promise<unknown> {
  const info = await lstat(file);
  if (info.isSymbolicLink() || !info.isFile() || info.size > maxBytes) throw new Error(`Private evidence file is unavailable or unsafe: ${basename(file)}`);
  return JSON.parse(await readFile(file, "utf8"));
}

async function readVerifiedPrivateBytes(root: string, relativeFile: string, expectedHash: string, maxBytes: number): Promise<Buffer> {
  const pathParts = relativeFile.split("/");
  const absoluteFile = resolve(root, ...pathParts);
  if (!isWithinPath(root, absoluteFile)) throw new Error("Private evidence path escaped its trusted import root.");
  let currentPath = root;
  for (const pathPart of pathParts) {
    currentPath = join(currentPath, pathPart);
    const info = await lstat(currentPath);
    if (info.isSymbolicLink()) throw new Error("Private evidence path contains a symbolic link.");
  }
  const info = await lstat(absoluteFile);
  if (!info.isFile() || info.size > maxBytes) throw new Error("Private evidence file exceeds its safe review envelope.");
  const bytes = await readFile(absoluteFile);
  if (createHash("sha256").update(bytes).digest("hex") !== expectedHash) throw new Error("Prepared image bytes changed after review evidence was created.");
  return bytes;
}

async function readRigDiagnosticEvidence(root: string, candidateSetId: string, manifest: AssetRigManifest, validation: RigValidationReport): Promise<{report: RigDiagnosticReport; videoBytes: Buffer}> {
  const reportRelativeFile = `prepared/rig-diagnostic-${candidateSetId}.json`;
  const expectedVideoRelativeFile = `prepared/rig-diagnostic-${candidateSetId}.mp4`;
  const report = rigDiagnosticReportSchema.parse(await readBoundJsonFile(join(root, ...reportRelativeFile.split("/")), 2_000_000));
  if (!verifyRigDiagnosticReportHash(report)
    || report.candidateSetId !== candidateSetId
    || report.manifestContentHash !== manifest.contentHash
    || report.validationReportContentHash !== validation.contentHash
    || report.videoRelativeFile !== expectedVideoRelativeFile) throw new Error("Rig diagnostic evidence failed its immutable bindings.");
  const videoBytes = await readVerifiedPrivateBytes(root, report.videoRelativeFile, report.videoContentHash, 18 * 1024 * 1024);
  return {report, videoBytes};
}

async function preparationReviewFromReport(exchange: GenerationExchangeRecord, report: PreparationReport): Promise<PreparationReview> {
  if (!exchange.state.importId || report.importId !== exchange.state.importId || report.exchangeJobId !== exchange.job.exchangeJobId || !verifyPreparationReportHash(report)) {
    throw new Error("Preparation evidence is stale or failed its integrity checks.");
  }
  const stagingRoot = importStagingRoot(exchange);
  const briefById = new Map(exchange.job.briefs.map((brief) => [brief.id, brief]));
  const candidateSets = await Promise.all(report.candidateSets.map(async (candidateSet) => {
    const brief = briefById.get(candidateSet.briefId);
    if (!brief || brief.requirementId !== candidateSet.requirementId || brief.outputRole !== candidateSet.outputRole) throw new Error("Preparation evidence does not match its authoritative generation brief.");
    let contactSheetDataUrl: string | null = null;
    if (candidateSet.contactSheet) {
      const contactBytes = await readVerifiedPrivateBytes(stagingRoot, candidateSet.contactSheet.relativeFile, candidateSet.contactSheet.contentHash, 3_000_000);
      contactSheetDataUrl = `data:image/png;base64,${contactBytes.toString("base64")}`;
    }
    const preparedCandidates = await Promise.all(candidateSet.preparedCandidates.map(async (candidate) => {
      await readVerifiedPrivateBytes(stagingRoot, candidate.relativeFile, candidate.preparedContentHash, 50 * 1024 * 1024);
      return {candidateId: candidate.candidateId, fileRole: candidate.fileRole, assetClass: candidate.assetClass, width: candidate.width, height: candidate.height};
    }));
    let rig: {type: "character-rig" | "background-layers" | "prop"; validationStatus: "passed" | "failed"; diagnosticVideoDataUrl: string} | null = null;
    if (candidateSet.status === "ready-for-review") {
      try {
        const manifest = assetRigManifestSchema.parse(await readBoundJsonFile(join(stagingRoot, "prepared", `rig-manifest-${candidateSet.candidateSetId}.json`), 2_000_000));
        const validation = rigValidationReportSchema.parse(await readBoundJsonFile(join(stagingRoot, "prepared", `rig-validation-${candidateSet.candidateSetId}.json`), 2_000_000));
        if (!verifyAssetRigManifestHash(manifest) || !verifyRigValidationReportHash(validation) || manifest.candidateSetId !== candidateSet.candidateSetId || validation.manifestContentHash !== manifest.contentHash) throw new Error("Rig evidence failed its integrity checks.");
        const diagnostic = await readRigDiagnosticEvidence(stagingRoot, candidateSet.candidateSetId, manifest, validation);
        rig = {type: manifest.type, validationStatus: validation.status, diagnosticVideoDataUrl: `data:video/mp4;base64,${diagnostic.videoBytes.toString("base64")}`};
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      }
    }
    return {
      candidateSetId: candidateSet.candidateSetId,
      briefId: candidateSet.briefId,
      requirementId: candidateSet.requirementId,
      entityName: brief.entity.name,
      outputRole: candidateSet.outputRole,
      status: candidateSet.status,
      preparedCandidates,
      failures: candidateSet.failures.map((failure) => ({candidateId: failure.candidateId, fileRole: failure.fileRole, status: failure.status, code: failure.code, message: failure.message})),
      contactSheetDataUrl,
      rig,
    };
  }));
  return preparationReviewSchema.parse({importId: report.importId, preparedAt: report.preparedAt, candidateSets});
}

async function readPreparationReview(exchange: GenerationExchangeRecord): Promise<PreparationReview | null> {
  if (!exchange.state.importId) return null;
  try {
    const report = preparationReportSchema.parse(await readBoundJsonFile(join(importStagingRoot(exchange), "preparation-report.json"), 8_000_000));
    return await preparationReviewFromReport(exchange, report);
  } catch {
    return null;
  }
}

async function readPreparationReport(exchange: GenerationExchangeRecord): Promise<PreparationReport | null> {
  if (!exchange.state.importId) return null;
  try {
    const report = preparationReportSchema.parse(await readBoundJsonFile(join(importStagingRoot(exchange), "preparation-report.json"), 8_000_000));
    if (!verifyPreparationReportHash(report) || report.importId !== exchange.state.importId || report.exchangeJobId !== exchange.job.exchangeJobId) return null;
    return report;
  } catch {
    return null;
  }
}

async function readAssetReviewRecord(exchange: GenerationExchangeRecord, preparationContentHash: string): Promise<AssetReviewRecord | null> {
  if (!exchange.state.importId) return null;
  try {
    const reviewsRoot = join(importStagingRoot(exchange), "reviews");
    const pointer = await readBoundJsonFile(join(reviewsRoot, "current.json"), 100_000) as {contentHash?: unknown};
    if (typeof pointer.contentHash !== "string" || !/^[a-f0-9]{64}$/.test(pointer.contentHash)) return null;
    const record = assetReviewRecordSchema.parse(await readBoundJsonFile(join(reviewsRoot, `${pointer.contentHash}.json`), 4_000_000));
    if (!verifyAssetReviewRecordHash(record) || record.contentHash !== pointer.contentHash || record.exchangeJobId !== exchange.job.exchangeJobId || record.importId !== exchange.state.importId || record.preparationReportContentHash !== preparationContentHash) return null;
    return record;
  } catch {
    return null;
  }
}

async function persistAssetReviewRecord(exchange: GenerationExchangeRecord, record: AssetReviewRecord): Promise<void> {
  const reviewsRoot = join(importStagingRoot(exchange), "reviews");
  await persistAssetReviewRecordSnapshot({reviewsRoot, record});
}

async function buildSelectedCandidateRig(exchange: GenerationExchangeRecord, report: PreparationReport, candidateSetId: string, createdAt: string): Promise<void> {
  const candidateSet = report.candidateSets.find((candidate) => candidate.candidateSetId === candidateSetId);
  const brief = exchange.job.briefs.find((candidate) => candidate.id === candidateSet?.briefId);
  if (!candidateSet || candidateSet.status !== "ready-for-review" || !brief) throw new Error("Only a prepared coherent candidate set can be selected for rigging.");
  const stagingRoot = importStagingRoot(exchange);
  await buildSelectedCandidateRigArtifacts({stagingRoot, report, brief, candidateSetId, createdAt, renderDiagnostic: async ({stagingRoot: root, manifestFile, outputFile, entityName}) => renderRigDiagnosticInWorker(root, manifestFile, outputFile, entityName)});
}

async function promoteCandidateSet(exchange: GenerationExchangeRecord, report: PreparationReport, importRecord: ImportRecord, candidateSetId: string, approvedAt: string): Promise<ApprovedAssetVersion> {
  const assetsRoot = join(app.getPath("userData"), ".storystage-local", "assets");
  return promotePreparedCandidateSet({stagingRoot: importStagingRoot(exchange), assetsRoot, report, importRecord, candidateSetId, approvedAt});
}

async function verifyApprovedAssetVersionOnDisk(approved: ApprovedAssetVersion): Promise<boolean> {
  try {
    const assetsRoot = join(app.getPath("userData"), ".storystage-local", "assets");
    const manifestFile = resolve(assetsRoot, ...approved.relativeFile.split("/"));
    if (!isWithinPath(assetsRoot, manifestFile)) return false;
    const versionRoot = dirname(manifestFile);
    const manifest = assetRigManifestSchema.parse(await readBoundJsonFile(manifestFile, 2_000_000));
    if (!verifyAssetRigManifestHash(manifest) || manifest.contentHash !== approved.contentHash) return false;
    const bindings = manifest.type === "character-rig" ? [manifest.identityReference, ...Object.values(manifest.poses)] : manifest.type === "background-layers" ? manifest.layers.map((layer) => layer.asset) : [manifest.cutout];
    for (const binding of bindings) await readVerifiedPrivateBytes(versionRoot, binding.relativeFile, binding.contentHash, 50 * 1024 * 1024);
    const validation = rigValidationReportSchema.parse(await readBoundJsonFile(join(versionRoot, "rig-validation.json"), 2_000_000));
    if (!verifyRigValidationReportHash(validation) || validation.status !== "passed" || validation.manifestContentHash !== manifest.contentHash) return false;
    const diagnostic = rigDiagnosticReportSchema.parse(await readBoundJsonFile(join(versionRoot, "rig-diagnostic.json"), 2_000_000));
    if (!verifyRigDiagnosticReportHash(diagnostic) || diagnostic.candidateSetId !== manifest.candidateSetId || diagnostic.manifestContentHash !== manifest.contentHash || diagnostic.validationReportContentHash !== validation.contentHash || diagnostic.videoRelativeFile !== "rig-diagnostic.mp4") return false;
    await readVerifiedPrivateBytes(versionRoot, diagnostic.videoRelativeFile, diagnostic.videoContentHash, 18 * 1024 * 1024);
    return true;
  } catch {
    return false;
  }
}

function approvedVersionsForExchange(exchange: GenerationExchangeRecord, reviewRecord: AssetReviewRecord): ApprovedAssetVersion[] | null {
  const versions: ApprovedAssetVersion[] = [];
  for (const brief of exchange.job.briefs) {
    const decision = reviewRecord.decisions.find((candidate) => candidate.requirementId === brief.requirementId && candidate.status === "approved" && candidate.approvedAssetVersion);
    if (!decision?.approvedAssetVersion) return null;
    versions.push(decision.approvedAssetVersion);
  }
  return versions;
}

async function ensureApprovedProductionRevision(exchange: GenerationExchangeRecord, reviewRecord: AssetReviewRecord): Promise<ProductionBundle> {
  const source = productionBundleRegistry.get(productionBundleKey(exchange.job.production.id, exchange.job.production.revision));
  if (!source || source.bundle.contentHash !== exchange.job.productionBundleContentHash || !verifyProductionBundleHash(source.bundle)) throw new Error("The approved exchange lost its authoritative source production.");
  const approved = approvedVersionsForExchange(exchange, reviewRecord);
  if (!approved) throw new Error("The review record does not approve every generation requirement.");
  if (!(await Promise.all(approved.map(verifyApprovedAssetVersionOnDisk))).every(Boolean)) throw new Error("An approved local asset failed recovery verification.");

  const nextDraft = buildApprovedProductionRevisionDraft({sourceBundle: source.bundle, approvedAssetVersions: approved});
  const targetKey = productionBundleKey(nextDraft.production.productionId, nextDraft.production.revision);
  const existing = productionBundleRegistry.get(targetKey);
  if (existing) {
    if (!verifyProductionBundleHash(existing.bundle) || hashCanonical(productionDraftPayload(existing.bundle)) !== hashCanonical(nextDraft)) throw new Error("The recovery target production revision already contains different decisions.");
    return existing.bundle;
  }
  const bundle = finalizeProductionBundle(nextDraft, reviewRecord.updatedAt);
  await persistProductionBundle(bundle);
  return bundle;
}

async function commitFullyApprovedExchange(exchange: GenerationExchangeRecord, reviewRecord: AssetReviewRecord): Promise<void> {
  await commitApprovalWorkflow({
    persistReview: () => persistAssetReviewRecord(exchange, reviewRecord),
    ensureProduction: async () => { await ensureApprovedProductionRevision(exchange, reviewRecord); },
    ensureApprovedState: async () => {
      if (exchange.state.status === "needs-review") await transitionExchangeState(exchange, "approved", exchange.state.importId);
      else if (exchange.state.status !== "approved") throw new Error(`A fully approved exchange cannot recover from ${exchange.state.status}.`);
    },
  });
}

async function reconcileApprovedExchange(exchange: GenerationExchangeRecord): Promise<void> {
  if (!["needs-review", "approved"].includes(exchange.state.status)) return;
  const preparationReport = await readPreparationReport(exchange);
  if (!preparationReport) return;
  const reviewRecord = await readAssetReviewRecord(exchange, preparationReport.contentHash);
  if (!reviewRecord || !approvedVersionsForExchange(exchange, reviewRecord)) return;
  await commitFullyApprovedExchange(exchange, reviewRecord);
}

async function validateRehydratedExchangeArtifacts(exchange: GenerationExchangeRecord): Promise<boolean> {
  if (exchange.state.status === "awaiting-results" || exchange.state.status === "superseded") return true;
  if (exchange.state.status === "files-imported") return (await readVerifiedLooseImportSession(exchange)) !== null;
  const importRecord = await readImportRecord(exchange);
  if (!importRecord) return false;
  const trustedStagingRoot = join(app.getPath("userData"), ".storystage-local");
  await verifyStagedCandidatesInWorker(importRecord.assets.map((asset) => asset.stagedCandidate), trustedStagingRoot, importStagingRoot(exchange));
  if (exchange.state.status === "staged") return true;
  const preparationReport = await readPreparationReport(exchange);
  const preparationReview = await readPreparationReview(exchange);
  if (!preparationReport || !preparationReview || preparationReview.candidateSets.some((candidateSet) => candidateSet.status !== "ready-for-review")) return false;
  if (exchange.state.status === "needs-review") return true;
  const reviewRecord = await readAssetReviewRecord(exchange, preparationReport.contentHash);
  if (!reviewRecord) return false;
  if (exchange.state.status === "approved") {
    const approved = reviewRecord.decisions.filter((decision) => decision.status === "approved" && decision.approvedAssetVersion).map((decision) => decision.approvedAssetVersion!);
    if (!exchange.job.briefs.every((brief) => approved.some((asset) => asset.requirementId === brief.requirementId))) return false;
    return (await Promise.all(approved.map(verifyApprovedAssetVersionOnDisk))).every(Boolean);
  }
  return exchange.job.briefs.some((brief) => {
    const candidateSetIds = preparationReport.candidateSets.filter((candidateSet) => candidateSet.briefId === brief.id).map((candidateSet) => candidateSet.candidateSetId);
    return candidateSetIds.length > 0 && candidateSetIds.every((candidateSetId) => reviewRecord.decisions.some((decision) => decision.candidateSetId === candidateSetId && decision.status === "rejected"));
  });
}

const emitJob = (event: RenderJobEvent) => {
  const parsed = renderJobEventSchema.parse(event);
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send(IPC_CHANNELS.renderEvent, parsed);
};

const failedEvent = (jobId: string, code: string, message: string): RenderJobEvent => ({
  jobId,
  status: "failed",
  progress: null,
  message,
  error: {code, message},
});

function registerJob(jobId: string, allowedOutputRoot: string) {
  const event = renderJobEventSchema.parse({jobId, status: "queued", progress: null, message: "Render queued"});
  jobRegistry.set(jobId, {event, phaseProgress: {}, allowedOutputRoot});
  activeJobId = jobId;
  emitJob(event);
}

function transitionJob(rawEvent: RenderJobEvent): boolean {
  const event = renderJobEventSchema.parse(rawEvent);
  const record = jobRegistry.get(event.jobId);
  if (!record || terminalStatuses.has(record.event.status)) return false;

  const sameProgressPhase = event.status === record.event.status && (event.status === "bundling" || event.status === "rendering");
  if (!sameProgressPhase && !canTransitionRenderJob(record.event.status, event.status)) return false;

  if (event.status === "bundling" || event.status === "rendering") {
    const previous = record.phaseProgress[event.status];
    if (previous !== undefined && event.progress < previous) return false;
    record.phaseProgress[event.status] = event.progress;
  }

  record.event = event;
  if (terminalStatuses.has(event.status) && activeJobId === event.jobId) activeJobId = null;
  emitJob(event);
  return true;
}

function failJob(jobId: string, code: string, message: string) {
  const record = jobRegistry.get(jobId);
  if (!record || terminalStatuses.has(record.event.status)) return;
  if (!transitionJob(failedEvent(jobId, code, message))) {
    record.event = failedEvent(jobId, code, message);
    if (activeJobId === jobId) activeJobId = null;
    emitJob(record.event);
  }
}

type ProductionRenderCommandInput = {trustedProductionRoot: string; bundleFile: string; assetsRoot: string; outputRoot: string; bundleContentHash: string; scope: "engineering-slice" | "full-production"};
function startRenderWorker(jobId: string, simulateFailure: boolean, production?: ProductionRenderCommandInput) {
  const workerEntry = app.isPackaged
    ? resolve(process.resourcesPath, "render-worker/render-worker.cjs")
    : resolve(workspaceRoot, "apps/render-worker/dist/render-worker.cjs");
  const worker = utilityProcess.fork(workerEntry, [], {cwd: workspaceRoot, serviceName: "StoryStage Render Worker", stdio: "inherit"});
  let stopped = false;
  const stop = () => {
    if (stopped) return;
    stopped = true;
    clearTimeout(timeout);
    worker.kill();
  };
  const timeoutMs = production?.scope === "full-production" ? 15 * 60_000 : 120_000;
  const timeout = setTimeout(() => {
    failJob(jobId, "TIMEOUT", `The render worker did not respond within ${production?.scope === "full-production" ? "fifteen minutes" : "two minutes"}.`);
    stop();
  }, timeoutMs);

  worker.on("spawn", () => {
    transitionJob({jobId, status: "bundling", progress: 0, message: "Starting render worker"});
    worker.postMessage(renderWorkerCommandSchema.parse(production ? {type: "start-production", workspaceRoot, trustedProductionRoot: production.trustedProductionRoot, bundleFile: production.bundleFile, assetsRoot: production.assetsRoot, outputRoot: production.outputRoot, request: {jobId, bundleContentHash: production.bundleContentHash, scope: production.scope}} : {type: "start", workspaceRoot, request: {jobId, simulateFailure}}));
  });

  worker.on("message", (rawMessage: unknown) => {
    const parsed = renderWorkerMessageSchema.safeParse(rawMessage);
    if (!parsed.success) {
      failJob(jobId, "INVALID_WORKER_MESSAGE", "The render worker returned an invalid message.");
      stop();
      return;
    }

    const event = parsed.data.payload;
    if (event.jobId !== jobId) {
      failJob(jobId, "JOB_ID_MISMATCH", "The render worker emitted an event for another job.");
      stop();
      return;
    }
    const record = jobRegistry.get(jobId);
    if (!record || terminalStatuses.has(record.event.status)) return;

    if (event.status === "completed") {
      void (async () => {
        try {
          const [canonicalOutput, canonicalRoot] = await Promise.all([
            realpath(event.outputPath),
            realpath(record.allowedOutputRoot),
          ]);
          if (!canonicalOutput.startsWith(`${canonicalRoot}${sep}`)) throw new Error("Output escaped the allowed artifact directory.");
          if (!transitionJob({...event, outputPath: canonicalOutput})) failJob(jobId, "INVALID_TRANSITION", "The worker completed from an invalid job state.");
        } catch {
          failJob(jobId, "UNSAFE_OUTPUT_PATH", "The worker returned an unavailable or unsafe output path.");
        } finally {
          stop();
        }
      })();
      return;
    }

    if (!transitionJob(event)) {
      failJob(jobId, "INVALID_TRANSITION", "The worker emitted an invalid or stale job transition.");
      stop();
      return;
    }
    if (event.status === "failed") stop();
  });

  worker.on("error", (_type, location) => {
    failJob(jobId, "WORKER_CRASH", `The render worker crashed at ${location || "an unknown location"}.`);
    stop();
  });
  worker.on("exit", (code) => {
    if (!stopped) failJob(jobId, "WORKER_EXITED", `The render worker exited unexpectedly with code ${code}.`);
    stopped = true;
    clearTimeout(timeout);
  });
}

function renderRigDiagnosticInWorker(importRoot: string, manifestFile: string, outputFile: string, entityName: string): Promise<void> {
  return new Promise((resolveDiagnostic, rejectDiagnostic) => {
    const workerEntry = app.isPackaged
      ? resolve(process.resourcesPath, "render-worker/render-worker.cjs")
      : resolve(workspaceRoot, "apps/render-worker/dist/render-worker.cjs");
    const jobId = `diagnostic-${randomUUID().replaceAll("-", "").slice(0, 16)}`;
    const worker = utilityProcess.fork(workerEntry, [], {
      cwd: workspaceRoot,
      serviceName: "StoryStage Rig Diagnostic Worker",
      stdio: "ignore",
      env: {
        NODE_OPTIONS: "--max-old-space-size=512",
        ...(process.env.SystemRoot ? {SystemRoot: process.env.SystemRoot} : {}),
        ...(process.env.TEMP ? {TEMP: process.env.TEMP} : {}),
        ...(process.env.TMP ? {TMP: process.env.TMP} : {}),
      },
    });
    let settled = false;
    const finish = (callback: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      worker.kill();
      callback();
    };
    const timeout = setTimeout(() => finish(() => rejectDiagnostic(new Error("Rig diagnostic rendering exceeded the three-minute safety timeout."))), 180_000);
    worker.on("spawn", () => worker.postMessage(renderWorkerCommandSchema.parse({type: "start-rig-diagnostic", workspaceRoot, importRoot, manifestFile, outputFile, request: {jobId, entityName}})));
    worker.on("message", (rawMessage: unknown) => {
      const parsed = renderWorkerMessageSchema.safeParse(rawMessage);
      if (!parsed.success || parsed.data.payload.jobId !== jobId) {
        finish(() => rejectDiagnostic(new Error("The rig diagnostic worker returned an invalid or mismatched message.")));
        return;
      }
      const event = parsed.data.payload;
      if (event.status === "failed") {
        finish(() => rejectDiagnostic(new Error(`${event.error.code}: ${event.error.message}`)));
        return;
      }
      if (event.status !== "completed") return;
      void (async () => {
        try {
          const [canonicalRoot, canonicalOutput, canonicalReportedOutput] = await Promise.all([realpath(importRoot), realpath(outputFile), realpath(event.outputPath)]);
          const info = await lstat(canonicalOutput);
          if (canonicalOutput !== canonicalReportedOutput || !isWithinPath(canonicalRoot, canonicalOutput) || info.isSymbolicLink() || !info.isFile() || info.size > 18 * 1024 * 1024) throw new Error("The rig diagnostic worker returned an unsafe or oversized MP4.");
          finish(resolveDiagnostic);
        } catch (error) {
          finish(() => rejectDiagnostic(error instanceof Error ? error : new Error("The rig diagnostic output could not be verified.")));
        }
      })();
    });
    worker.on("error", (_type, location) => finish(() => rejectDiagnostic(new Error(`The rig diagnostic worker crashed at ${location || "an unknown location"}.`))));
    worker.on("exit", (code) => {if (!settled) finish(() => rejectDiagnostic(new Error(`The rig diagnostic worker exited unexpectedly with code ${code}.`)));});
  });
}

function stageCandidateBundleInWorker(sourceRoot: string, trustedStagingRoot: string, stagingRoot: string, bundle: unknown): Promise<StagedCandidate[]> {
  return new Promise((resolveStaging, rejectStaging) => {
    const workerEntry = app.isPackaged
      ? resolve(process.resourcesPath, "asset-worker/asset-worker.cjs")
      : resolve(workspaceRoot, "apps/asset-worker/dist/asset-worker.cjs");
    const requestId = `stage-${randomUUID().replaceAll("-", "").slice(0, 16)}`;
    const worker = utilityProcess.fork(workerEntry, [], {
      cwd: workspaceRoot,
      serviceName: "StoryStage Asset Staging Worker",
      stdio: "ignore",
      env: {
        NODE_OPTIONS: "--max-old-space-size=256",
        ...(process.env.SystemRoot ? {SystemRoot: process.env.SystemRoot} : {}),
        ...(process.env.TEMP ? {TEMP: process.env.TEMP} : {}),
        ...(process.env.TMP ? {TMP: process.env.TMP} : {}),
      },
    });
    let settled = false;
    const finish = (callback: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      worker.kill();
      callback();
    };
    const timeout = setTimeout(() => finish(() => rejectStaging(new Error("Asset staging exceeded the 30-second safety timeout."))), 30_000);

    worker.on("spawn", () => {
      worker.postMessage(assetWorkerCommandSchema.parse({
        type: "stage-candidate-bundle",
        requestId,
        sourceRoot,
        trustedStagingRoot,
        stagingRoot,
        serializedBundle: JSON.stringify(bundle),
      }));
    });
    worker.on("message", (rawMessage: unknown) => {
      const message = assetWorkerMessageSchema.safeParse(rawMessage);
      if (!message.success) {
        finish(() => rejectStaging(new Error("The asset worker returned an invalid message envelope.")));
        return;
      }
      if (message.data.requestId !== requestId) {
        finish(() => rejectStaging(new Error("The asset worker returned a mismatched request identity.")));
        return;
      }
      if (message.data.type === "failed") {
        const failure = message.data;
        finish(() => rejectStaging(new Error(`${failure.error.code}: ${failure.error.message}`)));
        return;
      }
      if (message.data.type !== "staged") {
        finish(() => rejectStaging(new Error("The asset worker returned the wrong result type for a structured bundle request.")));
        return;
      }
      try {
        const staged = stagedCandidateSchema.array().parse(JSON.parse(message.data.serializedStagedCandidates));
        finish(() => resolveStaging(staged));
      } catch {
        finish(() => rejectStaging(new Error("The asset worker returned invalid staged-candidate data.")));
      }
    });
    worker.on("error", (_type, location) => finish(() => rejectStaging(new Error(`The asset worker crashed at ${location || "an unknown location"}.`))));
    worker.on("exit", (code) => {
      if (!settled) finish(() => rejectStaging(new Error(`The asset worker exited unexpectedly with code ${code}.`)));
    });
  });
}

function stageLooseCandidatesInWorker(files: Array<{candidateId: string; sourceFile: string}>, trustedStagingRoot: string, stagingRoot: string): Promise<WorkerLooseStagedCandidate[]> {
  return new Promise((resolveStaging, rejectStaging) => {
    const workerEntry = app.isPackaged
      ? resolve(process.resourcesPath, "asset-worker/asset-worker.cjs")
      : resolve(workspaceRoot, "apps/asset-worker/dist/asset-worker.cjs");
    const requestId = `stage-${randomUUID().replaceAll("-", "").slice(0, 16)}`;
    const worker = utilityProcess.fork(workerEntry, [], {
      cwd: workspaceRoot,
      serviceName: "StoryStage Loose Asset Staging Worker",
      stdio: "ignore",
      env: {
        NODE_OPTIONS: "--max-old-space-size=256",
        ...(process.env.SystemRoot ? {SystemRoot: process.env.SystemRoot} : {}),
        ...(process.env.TEMP ? {TEMP: process.env.TEMP} : {}),
        ...(process.env.TMP ? {TMP: process.env.TMP} : {}),
      },
    });
    let settled = false;
    const finish = (callback: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      worker.kill();
      callback();
    };
    const timeout = setTimeout(() => finish(() => rejectStaging(new Error("Loose candidate staging exceeded the 30-second safety timeout."))), 30_000);

    worker.on("spawn", () => worker.postMessage(assetWorkerCommandSchema.parse({type: "stage-loose-candidates", requestId, trustedStagingRoot, stagingRoot, files})));
    worker.on("message", (rawMessage: unknown) => {
      const message = assetWorkerMessageSchema.safeParse(rawMessage);
      if (!message.success || message.data.requestId !== requestId) {
        finish(() => rejectStaging(new Error("The asset worker returned an invalid or mismatched loose-candidate message.")));
        return;
      }
      if (message.data.type === "failed") {
        const failure = message.data;
        finish(() => rejectStaging(new Error(`${failure.error.code}: ${failure.error.message}`)));
        return;
      }
      if (message.data.type !== "loose-staged") {
        finish(() => rejectStaging(new Error("The asset worker returned structured candidates for a loose-file request.")));
        return;
      }
      try {
        const staged = workerLooseStagedCandidateSchema.array().parse(JSON.parse(message.data.serializedLooseCandidates));
        finish(() => resolveStaging(staged));
      } catch {
        finish(() => rejectStaging(new Error("The asset worker returned invalid loose-candidate data.")));
      }
    });
    worker.on("error", (_type, location) => finish(() => rejectStaging(new Error(`The loose asset worker crashed at ${location || "an unknown location"}.`))));
    worker.on("exit", (code) => {
      if (!settled) finish(() => rejectStaging(new Error(`The loose asset worker exited unexpectedly with code ${code}.`)));
    });
  });
}

function verifyStagedCandidatesInWorker(candidates: StagedCandidate[], trustedStagingRoot: string, stagingRoot: string): Promise<StagedCandidate[]> {
  return new Promise((resolveVerification, rejectVerification) => {
    const workerEntry = app.isPackaged ? resolve(process.resourcesPath, "asset-worker/asset-worker.cjs") : resolve(workspaceRoot, "apps/asset-worker/dist/asset-worker.cjs");
    const requestId = `verify-${randomUUID().replaceAll("-", "").slice(0, 16)}`;
    const worker = utilityProcess.fork(workerEntry, [], {
      cwd: workspaceRoot,
      serviceName: "StoryStage Staged Asset Verification Worker",
      stdio: "ignore",
      env: {NODE_OPTIONS: "--max-old-space-size=256", ...(process.env.SystemRoot ? {SystemRoot: process.env.SystemRoot} : {}), ...(process.env.TEMP ? {TEMP: process.env.TEMP} : {}), ...(process.env.TMP ? {TMP: process.env.TMP} : {})},
    });
    let settled = false;
    const finish = (callback: () => void) => {if (settled) return; settled = true; clearTimeout(timeout); worker.kill(); callback();};
    const timeout = setTimeout(() => finish(() => rejectVerification(new Error("Staged candidate verification exceeded the 30-second safety timeout."))), 30_000);
    worker.on("spawn", () => worker.postMessage(assetWorkerCommandSchema.parse({type: "verify-staged-candidates", requestId, trustedStagingRoot, stagingRoot, serializedStagedCandidates: JSON.stringify(candidates)})));
    worker.on("message", (rawMessage: unknown) => {
      const message = assetWorkerMessageSchema.safeParse(rawMessage);
      if (!message.success || message.data.requestId !== requestId) {finish(() => rejectVerification(new Error("The asset worker returned an invalid or mismatched verification message."))); return;}
      if (message.data.type === "failed") {
        const workerError = message.data.error;
        finish(() => rejectVerification(new Error(`${workerError.code}: ${workerError.message}`)));
        return;
      }
      if (message.data.type !== "verified") {finish(() => rejectVerification(new Error("The asset worker returned the wrong result type for verification."))); return;}
      try {
        const verified = stagedCandidateSchema.array().parse(JSON.parse(message.data.serializedStagedCandidates));
        finish(() => resolveVerification(verified));
      } catch {
        finish(() => rejectVerification(new Error("The asset worker returned invalid verification data.")));
      }
    });
    worker.on("error", (_type, location) => finish(() => rejectVerification(new Error(`The verification worker crashed at ${location || "an unknown location"}.`))));
    worker.on("exit", (code) => {if (!settled) finish(() => rejectVerification(new Error(`The verification worker exited unexpectedly with code ${code}.`)));});
  });
}

function prepareCandidateSetsInWorker(request: unknown, trustedStagingRoot: string, stagingRoot: string): Promise<PreparationReport> {
  return new Promise((resolvePreparation, rejectPreparation) => {
    const workerEntry = app.isPackaged ? resolve(process.resourcesPath, "asset-worker/asset-worker.cjs") : resolve(workspaceRoot, "apps/asset-worker/dist/asset-worker.cjs");
    const requestId = `prepare-${randomUUID().replaceAll("-", "").slice(0, 16)}`;
    const worker = utilityProcess.fork(workerEntry, [], {
      cwd: workspaceRoot,
      serviceName: "StoryStage Asset Preparation Worker",
      stdio: "ignore",
      env: {NODE_OPTIONS: "--max-old-space-size=512", ...(process.env.SystemRoot ? {SystemRoot: process.env.SystemRoot} : {}), ...(process.env.TEMP ? {TEMP: process.env.TEMP} : {}), ...(process.env.TMP ? {TMP: process.env.TMP} : {})},
    });
    let settled = false;
    const finish = (callback: () => void) => {if (settled) return; settled = true; clearTimeout(timeout); worker.kill(); callback();};
    const timeout = setTimeout(() => finish(() => rejectPreparation(new Error("Asset preparation exceeded the two-minute safety timeout."))), 120_000);
    worker.on("spawn", () => worker.postMessage(assetWorkerCommandSchema.parse({type: "prepare-candidate-sets", requestId, trustedStagingRoot, stagingRoot, serializedRequest: JSON.stringify(request)})));
    worker.on("message", (rawMessage: unknown) => {
      const message = assetWorkerMessageSchema.safeParse(rawMessage);
      if (!message.success || message.data.requestId !== requestId) {finish(() => rejectPreparation(new Error("The asset worker returned an invalid or mismatched preparation message."))); return;}
      if (message.data.type === "failed") {const workerError = message.data.error; finish(() => rejectPreparation(new Error(`${workerError.code}: ${workerError.message}`))); return;}
      if (message.data.type !== "prepared") {finish(() => rejectPreparation(new Error("The asset worker returned the wrong result type for preparation."))); return;}
      try {
        const report = preparationReportSchema.parse(JSON.parse(message.data.serializedPreparationReport));
        if (!verifyPreparationReportHash(report)) throw new Error("Preparation report hash mismatch.");
        finish(() => resolvePreparation(report));
      } catch {
        finish(() => rejectPreparation(new Error("The asset worker returned invalid preparation evidence.")));
      }
    });
    worker.on("error", (_type, location) => finish(() => rejectPreparation(new Error(`The preparation worker crashed at ${location || "an unknown location"}.`))));
    worker.on("exit", (code) => {if (!settled) finish(() => rejectPreparation(new Error(`The preparation worker exited unexpectedly with code ${code}.`)));});
  });
}

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1600,
    height: 980,
    minWidth: 1180,
    minHeight: 760,
    backgroundColor: "#101618",
    show: false,
    title: "StoryStage",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: resolve(__dirname, "preload.js"),
      sandbox: true,
      webSecurity: true,
    },
  });

  mainWindow.webContents.setWindowOpenHandler(() => ({action: "deny"}));
  mainWindow.webContents.on("will-navigate", (event, targetUrl) => {
    if (app.isPackaged) {
      const allowedUrl = pathToFileURL(resolve(__dirname, "../../studio/dist/index.html"));
      const requestedUrl = new URL(targetUrl);
      if (requestedUrl.protocol !== "file:" || requestedUrl.pathname !== allowedUrl.pathname) event.preventDefault();
      return;
    }
    const allowedOrigin = new URL(process.env.STORYSTAGE_DEV_URL ?? "http://127.0.0.1:5173").origin;
    if (new URL(targetUrl).origin !== allowedOrigin) event.preventDefault();
  });
  mainWindow.once("ready-to-show", () => mainWindow?.show());

  if (app.isPackaged) await mainWindow.loadFile(resolve(__dirname, "../../studio/dist/index.html"));
  else await mainWindow.loadURL(process.env.STORYSTAGE_DEV_URL ?? "http://127.0.0.1:5173");
}

function installRenderedMediaProtocol() {
  protocol.handle(renderedMediaScheme, async (request) => {
    try {
      const requestedUrl = new URL(request.url);
      if (requestedUrl.search || requestedUrl.hash) throw new Error("Unsupported media request.");
      if (["voice", "music", "sfx"].includes(requestedUrl.hostname)) {
        const contentHash = decodeURIComponent(requestedUrl.pathname.slice(1));
        if (!/^[a-f0-9]{64}$/.test(contentHash)) throw new Error("Audio asset hash is invalid.");
        const isMusic = requestedUrl.hostname === "music";
        const isSoundEffect = requestedUrl.hostname === "sfx";
        const track = isMusic ? musicTrackRegistry.get(contentHash) : isSoundEffect ? soundEffectRegistry.get(contentHash) : voiceTrackRegistry.get(contentHash);
        if (!track) throw new Error("Audio asset is unavailable.");
        const verified = isMusic ? await readVerifiedMusicTrack(track) : isSoundEffect ? await readVerifiedSoundEffect(track) : await readVerifiedVoiceTrack(track);
        return net.fetch(pathToFileURL(verified.file).toString(), {headers: request.headers});
      }
      if (requestedUrl.hostname !== "render") throw new Error("Unsupported media request.");
      const jobId = startRenderResponseSchema.shape.jobId.parse(decodeURIComponent(requestedUrl.pathname.slice(1)));
      const record = jobRegistry.get(jobId);
      if (!record || record.event.status !== "completed") throw new Error("Render output is unavailable.");
      const [canonicalRoot, canonicalOutput] = await Promise.all([realpath(record.allowedOutputRoot), realpath(record.event.outputPath)]);
      const outputInfo = await lstat(canonicalOutput);
      if (!isWithinPath(canonicalRoot, canonicalOutput) || outputInfo.isSymbolicLink() || !outputInfo.isFile() || outputInfo.size === 0 || !canonicalOutput.toLowerCase().endsWith(".mp4")) throw new Error("Render output failed media validation.");
      return net.fetch(pathToFileURL(canonicalOutput).toString(), {headers: request.headers});
    } catch {
      return new Response("Rendered media not found.", {status: 404, headers: {"content-type": "text/plain; charset=utf-8"}});
    }
  });
}

ipcMain.handle(IPC_CHANNELS.capabilities, () => desktopCapabilitiesSchema.parse({localRendering: true, openRenderedFile: true, manualImageExchange: true, localAudioImport: true}));

ipcMain.handle(IPC_CHANNELS.saveProductionBundle, async (_event, rawRequest: unknown) => {
  try {
    const request = saveProductionBundleRequestSchema.parse(rawRequest);
    const draft = productionBundleDraftSchema.parse(JSON.parse(request.serializedDraft));
    const key = productionBundleKey(draft.production.productionId, draft.production.revision);
    const priorSave = productionSaveQueues.get(key);
    const currentSave = (priorSave ? priorSave.then(() => undefined, () => undefined) : Promise.resolve()).then(async () => {
      const showPack = getShowPack(draft.production.showPackId);
      if (!verifyShowPackHash(showPack) || draft.resolvedPlan.showPack.contentHash !== showPack.contentHash) throw new Error("Production bundle references a stale or non-authoritative Show Pack.");
      const existing = productionBundleRegistry.get(key);
      if (existing && verifyProductionBundleHash(existing.bundle) && hashCanonical(productionDraftPayload(existing.bundle)) === hashCanonical(draft)) return existing.bundle;
      const bundle = finalizeProductionBundle(draft, new Date().toISOString());
      await persistProductionBundle(bundle);
      return bundle;
    });
    productionSaveQueues.set(key, currentSave);
    try {
      const bundle = await currentSave;
      return saveProductionBundleResultSchema.parse({ok: true, productionId: bundle.production.productionId, revision: bundle.production.revision, contentHash: bundle.contentHash});
    } finally {
      if (productionSaveQueues.get(key) === currentSave) productionSaveQueues.delete(key);
    }
  } catch (error) {
    return saveProductionBundleResultSchema.parse({ok: false, error: {code: "INVALID_PRODUCTION_BUNDLE", message: error instanceof Error ? error.message : "Production bundle could not be persisted."}});
  }
});

ipcMain.handle(IPC_CHANNELS.listProductionBundles, () => listProductionBundlesResultSchema.parse({productions: [...productionBundleRegistry.values()].map(({bundle}) => summarizeProductionBundle(bundle)).sort((left, right) => right.savedAt.localeCompare(left.savedAt))}));

ipcMain.handle(IPC_CHANNELS.loadProductionBundle, (_event, rawRequest: unknown) => {
  try {
    const request = loadProductionBundleRequestSchema.parse(rawRequest);
    const stored = productionBundleRegistry.get(productionBundleKey(request.productionId, request.revision));
    if (!stored || !verifyProductionBundleHash(stored.bundle)) throw new Error("The requested production bundle is unavailable or failed integrity checks.");
    return loadProductionBundleResultSchema.parse({ok: true, serializedBundle: JSON.stringify(stored.bundle)});
  } catch (error) {
    return loadProductionBundleResultSchema.parse({ok: false, error: {code: "PRODUCTION_UNAVAILABLE", message: error instanceof Error ? error.message : "Production bundle could not be loaded."}});
  }
});

ipcMain.handle(IPC_CHANNELS.listPublicShowPackCandidates, async (_event, rawRequest: unknown) => {
  try {
    const request = listPublicShowPackCandidatesRequestSchema.parse(rawRequest);
    if (!request.productionBundleContentHash) throw new Error("A saved production snapshot is required before trusted candidate review.");
    const stored = productionBundleRegistry.get(productionBundleKey(request.productionId, request.revision));
    if (!stored || !verifyProductionBundleHash(stored.bundle) || stored.bundle.contentHash !== request.productionBundleContentHash) throw new Error("Candidate review status requires the current acknowledged production snapshot.");
    const showPack = getShowPack(stored.bundle.production.showPackId);
    const {candidate} = await verifyPublicShowPackCandidate({candidateRoot: rookCandidateRoot(), expectedCandidateId: rookCandidateRelease.candidateId, expectedCandidateContentHash: rookCandidateRelease.contentHash});
    if (!publicShowPackCandidateMatchesRelease(candidate, showPack)) throw new Error("Rook was not prepared for this exact authoritative Show Pack release.");
    const review = await resolvePublicShowPackReviewForBundle(stored.bundle, candidate);
    if (review?.decision === "approved") {
      if (!review.approvedAssetVersion || !(await verifyApprovedAssetVersionOnDisk(review.approvedAssetVersion))) throw new Error("The approved Rook review lost its private immutable asset.");
      await verifyApprovedPublicReviewLineageOnDisk(review);
    }
    const sourceByRole = new Map(candidate.files.map((file) => [file.role, file]));
    const preparedByRole = new Map(candidate.preparedFiles.map((file) => [file.role, file]));
    const previewFile = (role: "identity-sheet" | "neutral-pose" | "talk-pose" | "reaction-pose") => role === "identity-sheet" ? sourceByRole.get(role)! : preparedByRole.get(role)!;
    return listPublicShowPackCandidatesResultSchema.parse({candidates: [{
      candidateId: candidate.candidateId,
      version: candidate.version,
      showPackId: candidate.showPackId,
      displayName: candidate.displayName,
      status: candidate.status,
      contentHash: candidate.contentHash,
      identityLock: candidate.style.identityLock,
      provenance: {provider: candidate.rights.provider, usageNotes: candidate.rights.usageNotes},
      files: (["identity-sheet", "neutral-pose", "talk-pose", "reaction-pose"] as const).map((role) => {const file = previewFile(role); return {role, url: `${rookCandidateRelease.publicRoot}/${file.file}`, width: file.width, height: file.height};}),
      diagnosticUrl: `${rookCandidateRelease.publicRoot}/${candidate.evidence.diagnosticVideo.file}`,
      verifiedByHost: true,
      canReview: review === null,
      review: review === null ? {decision: "none"} : review.decision === "rejected" ? {decision: "rejected", decidedAt: review.decidedAt} : {decision: "approved", decidedAt: review.decidedAt, targetProductionRevision: review.targetProductionRevision!, targetProductionBundleContentHash: review.targetProductionBundleContentHash!},
    }]});
  } catch {
    return listPublicShowPackCandidatesResultSchema.parse({candidates: []});
  }
});

ipcMain.handle(IPC_CHANNELS.reviewPublicShowPackCandidate, async (_event, rawRequest: unknown) => {
  try {
    const request = reviewPublicShowPackCandidateRequestSchema.parse(rawRequest);
    const queueKey = `${request.productionId}:r${request.revision}:${request.candidateId}`;
    return await publicShowPackReviewCoordinator.run(queueKey, async () => {
      if (request.candidateId !== rookCandidateRelease.candidateId) throw new Error("This packaged candidate is not allowlisted by the desktop host.");
      const stored = productionBundleRegistry.get(productionBundleKey(request.productionId, request.revision));
      if (!stored || !verifyProductionBundleHash(stored.bundle) || stored.bundle.contentHash !== request.productionBundleContentHash) throw new Error("Rook review requires the current acknowledged production snapshot.");
      if (stored.bundle.production.showPackId !== rookCandidateRelease.showPackId) throw new Error("Rook can only be reviewed for the Frankly Weird History Show Pack.");
      const {candidate} = await verifyPublicShowPackCandidate({candidateRoot: rookCandidateRoot(), expectedCandidateId: rookCandidateRelease.candidateId, expectedCandidateContentHash: rookCandidateRelease.contentHash});
      const authoritativeShowPack = getShowPack(stored.bundle.production.showPackId);
      if (!publicShowPackCandidateMatchesRelease(candidate, authoritativeShowPack)) throw new Error("Rook was not prepared for this exact authoritative Show Pack release.");
      const existingReview = await resolvePublicShowPackReviewForBundle(stored.bundle, candidate);
      if (existingReview) {
        if (existingReview.candidateContentHash !== candidate.contentHash) throw new Error("The final Rook review belongs to a different packaged candidate release.");
        assertPublicShowPackReviewAttemptIsCompatible(existingReview, request.revision, request.decision);
        if (existingReview.sourceProductionRevision === request.revision && existingReview.sourceProductionBundleContentHash !== stored.bundle.contentHash) throw new Error("The final Rook review no longer matches its source production snapshot.");
        if (existingReview.approvedAssetVersion && !(await verifyApprovedAssetVersionOnDisk(existingReview.approvedAssetVersion))) throw new Error("The previously approved Rook asset failed private integrity verification.");
        return reviewPublicShowPackCandidateResultSchema.parse({status: "reviewed", decision: existingReview.decision, approvedAssetVersion: existingReview.approvedAssetVersion, targetProductionRevision: existingReview.targetProductionRevision, targetProductionBundleContentHash: existingReview.targetProductionBundleContentHash});
      }
      if (publicCandidateAssetInBundle(stored.bundle, candidate.candidateId)) throw new Error("Rook is already bound in this production revision and cannot receive another review decision.");

      const decidedAt = new Date().toISOString();
      if (request.decision === "reject") {
        const record = finalizePublicShowPackReviewRecord({schemaVersion: "1.0", candidateId: candidate.candidateId, candidateContentHash: candidate.contentHash, productionId: request.productionId, sourceProductionRevision: request.revision, sourceProductionBundleContentHash: stored.bundle.contentHash, decision: "rejected", acknowledgements: request.acknowledgements, decidedAt, approvedAssetVersion: null, targetProductionRevision: null, targetProductionBundleContentHash: null});
        await persistPublicShowPackReview(record);
        return reviewPublicShowPackCandidateResultSchema.parse({status: "reviewed", decision: "rejected", approvedAssetVersion: null, targetProductionRevision: null, targetProductionBundleContentHash: null});
      }
      if (Object.values(request.acknowledgements).some((value) => !value)) throw new Error("Approve Rook only after reviewing every pose, the moving diagnostic, matte edges, identity consistency, and provenance.");

      const presenterAssetId = authoritativeShowPack.roleBindings.narrationPresenterAssetId;
      const presenter = stored.bundle.resolvedPlan.characters.find((character) => character.matchStrategy === "show-pack-role" && character.assetId === presenterAssetId);
      if (!presenter) throw new Error("The production has no unique Show Pack presenter binding for Rook.");
      const matchingRequirements = stored.bundle.resolvedPlan.requirements.filter((requirement) => requirement.role === "character" && requirement.entityId === presenter.entityId);
      if (matchingRequirements.length !== 1) throw new Error("Rook approval requires one unique presenter-character requirement.");
      const requirement = matchingRequirements[0]!;
      const approved = await promotePublicShowPackCandidate({candidateRoot: rookCandidateRoot(), assetsRoot: localAssetsRoot(), expectedCandidateId: candidate.candidateId, expectedCandidateContentHash: candidate.contentHash, requirementId: requirement.id, entityId: presenter.entityId, entityName: presenter.entityName, approvedAt: decidedAt});
      const nextDraft = buildApprovedProductionRevisionDraft({sourceBundle: stored.bundle, approvedAssetVersions: [approved]});
      const nextBundle = finalizeProductionBundle(nextDraft, approved.approvedAt);
      const targetKey = productionBundleKey(nextBundle.production.productionId, nextBundle.production.revision);
      const existingTarget = productionBundleRegistry.get(targetKey);
      if (existingTarget && existingTarget.bundle.contentHash !== nextBundle.contentHash) throw new Error("The target production revision already contains different creative decisions.");
      if (!existingTarget) await persistProductionBundle(nextBundle);
      const record = finalizePublicShowPackReviewRecord({schemaVersion: "1.0", candidateId: candidate.candidateId, candidateContentHash: candidate.contentHash, productionId: request.productionId, sourceProductionRevision: request.revision, sourceProductionBundleContentHash: stored.bundle.contentHash, decision: "approved", acknowledgements: request.acknowledgements, decidedAt: approved.approvedAt, approvedAssetVersion: approved, targetProductionRevision: nextBundle.production.revision, targetProductionBundleContentHash: nextBundle.contentHash});
      await persistPublicShowPackReview(record);
      return reviewPublicShowPackCandidateResultSchema.parse({status: "reviewed", decision: "approved", approvedAssetVersion: approved, targetProductionRevision: nextBundle.production.revision, targetProductionBundleContentHash: nextBundle.contentHash});
    });
  } catch (error) {
    return reviewPublicShowPackCandidateResultSchema.parse({status: "failed", error: {code: "SHOW_PACK_REVIEW_FAILED", message: error instanceof Error ? error.message : "Rook review could not be recorded."}});
  }
});

ipcMain.handle(IPC_CHANNELS.importVoiceTrack, async (_event, rawRequest: unknown) => {
  try {
    const request = importVoiceTrackRequestSchema.parse(rawRequest);
    const stored = productionBundleRegistry.get(productionBundleKey(request.productionId, request.revision));
    if (!stored || !verifyProductionBundleHash(stored.bundle) || stored.bundle.contentHash !== request.productionBundleContentHash) throw new Error("Voice import requires the current acknowledged production snapshot.");
    const selectionOptions: OpenDialogOptions = {title: "Import narration or dialogue master", properties: ["openFile"], filters: [{name: "Uncompressed WAV voice recording", extensions: ["wav"]}]};
    const selection = mainWindow ? await dialog.showOpenDialog(mainWindow, selectionOptions) : await dialog.showOpenDialog(selectionOptions);
    if (selection.canceled || selection.filePaths.length !== 1) return importVoiceTrackResultSchema.parse({status: "cancelled"});
    const sourceFile = selection.filePaths[0]!;
    const sourceInfo = await lstat(sourceFile);
    if (sourceInfo.isSymbolicLink() || !sourceInfo.isFile() || sourceInfo.size <= 0 || sourceInfo.size > 256 * 1024 * 1024) throw new Error("Voice recording must be a regular WAV file no larger than 256 MB.");
    const bytes = await readFile(sourceFile);
    const metadata = inspectPcmWav(bytes);
    const {dataBytes: _dataBytes, ...voiceMetadata} = metadata;
    void _dataBytes;
    const contentHash = createHash("sha256").update(bytes).digest("hex");
    const relativeFile = `voice/${request.productionId}/r${request.revision}/${contentHash}.wav`;
    const targetFile = resolve(localAssetsRoot(), ...relativeFile.split("/"));
    await publishImmutableVoiceFile(targetFile, bytes);
    const track = voiceTrackSchema.parse({id: `voice-${contentHash.slice(0, 20)}`, contentHash, relativeFile, sourceFileName: basename(sourceFile), ...voiceMetadata, importedAt: new Date().toISOString(), approvalStatus: "imported", approvedAt: null});
    await readVerifiedVoiceTrack(track);
    voiceTrackRegistry.set(track.contentHash, track);
    return importVoiceTrackResultSchema.parse({status: "imported", track});
  } catch (error) {
    return importVoiceTrackResultSchema.parse({status: "failed", error: {code: "VOICE_IMPORT_FAILED", message: error instanceof Error ? error.message : "Voice recording could not be imported."}});
  }
});

ipcMain.handle(IPC_CHANNELS.approveVoiceTrack, async (_event, rawRequest: unknown) => {
  try {
    const request = approveVoiceTrackRequestSchema.parse(rawRequest);
    const stored = productionBundleRegistry.get(productionBundleKey(request.productionId, request.revision));
    const track = stored?.bundle.voiceTrack;
    if (!stored || !track || !verifyProductionBundleHash(stored.bundle) || stored.bundle.contentHash !== request.productionBundleContentHash || track.contentHash !== request.voiceTrackContentHash) throw new Error("Voice approval requires the exact saved imported track.");
    await readVerifiedVoiceTrack(track);
    const approved = voiceTrackSchema.parse({...track, approvalStatus: "approved", approvedAt: new Date().toISOString()});
    voiceTrackRegistry.set(approved.contentHash, approved);
    return approveVoiceTrackResultSchema.parse({ok: true, track: approved});
  } catch (error) {
    return approveVoiceTrackResultSchema.parse({ok: false, error: {code: "VOICE_APPROVAL_FAILED", message: error instanceof Error ? error.message : "Voice recording could not be approved."}});
  }
});

ipcMain.handle(IPC_CHANNELS.importMusicTrack, async (_event, rawRequest: unknown) => {
  try {
    const request = importMusicTrackRequestSchema.parse(rawRequest);
    const stored = productionBundleRegistry.get(productionBundleKey(request.productionId, request.revision));
    if (!stored || !verifyProductionBundleHash(stored.bundle) || stored.bundle.contentHash !== request.productionBundleContentHash) throw new Error("Music import requires the current acknowledged production snapshot.");
    const selectionOptions: OpenDialogOptions = {title: "Import music master", properties: ["openFile"], filters: [{name: "Uncompressed WAV music master", extensions: ["wav"]}]};
    const selection = mainWindow ? await dialog.showOpenDialog(mainWindow, selectionOptions) : await dialog.showOpenDialog(selectionOptions);
    if (selection.canceled || selection.filePaths.length !== 1) return importMusicTrackResultSchema.parse({status: "cancelled"});
    const sourceFile = selection.filePaths[0]!;
    const sourceInfo = await lstat(sourceFile);
    if (sourceInfo.isSymbolicLink() || !sourceInfo.isFile() || sourceInfo.size <= 0 || sourceInfo.size > 256 * 1024 * 1024) throw new Error("Music master must be a regular WAV file no larger than 256 MB.");
    const bytes = await readFile(sourceFile);
    const metadata = inspectPcmWav(bytes);
    const {dataBytes: _dataBytes, ...musicMetadata} = metadata;
    void _dataBytes;
    const contentHash = createHash("sha256").update(bytes).digest("hex");
    const relativeFile = `music/${request.productionId}/r${request.revision}/${contentHash}.wav`;
    const targetFile = resolve(localAssetsRoot(), ...relativeFile.split("/"));
    await publishImmutableVoiceFile(targetFile, bytes);
    const track = musicTrackSchema.parse({id: `music-${contentHash.slice(0, 20)}`, contentHash, relativeFile, sourceFileName: basename(sourceFile), ...musicMetadata, importedAt: new Date().toISOString(), approvalStatus: "imported", approvedAt: null});
    await readVerifiedMusicTrack(track);
    musicTrackRegistry.set(track.contentHash, track);
    return importMusicTrackResultSchema.parse({status: "imported", track});
  } catch (error) {
    return importMusicTrackResultSchema.parse({status: "failed", error: {code: "MUSIC_IMPORT_FAILED", message: error instanceof Error ? error.message : "Music master could not be imported."}});
  }
});

ipcMain.handle(IPC_CHANNELS.approveMusicTrack, async (_event, rawRequest: unknown) => {
  try {
    const request = approveMusicTrackRequestSchema.parse(rawRequest);
    const stored = productionBundleRegistry.get(productionBundleKey(request.productionId, request.revision));
    const track = stored?.bundle.musicTrack;
    if (!stored || !track || !verifyProductionBundleHash(stored.bundle) || stored.bundle.contentHash !== request.productionBundleContentHash || track.contentHash !== request.musicTrackContentHash) throw new Error("Music approval requires the exact saved imported track.");
    await readVerifiedMusicTrack(track);
    const approved = musicTrackSchema.parse({...track, approvalStatus: "approved", approvedAt: new Date().toISOString()});
    musicTrackRegistry.set(approved.contentHash, approved);
    return approveMusicTrackResultSchema.parse({ok: true, track: approved});
  } catch (error) {
    return approveMusicTrackResultSchema.parse({ok: false, error: {code: "MUSIC_APPROVAL_FAILED", message: error instanceof Error ? error.message : "Music master could not be approved."}});
  }
});

ipcMain.handle(IPC_CHANNELS.importSoundEffect, async (_event, rawRequest: unknown) => {
  try {
    const request = importSoundEffectRequestSchema.parse(rawRequest);
    const stored = productionBundleRegistry.get(productionBundleKey(request.productionId, request.revision));
    if (!stored || !verifyProductionBundleHash(stored.bundle) || stored.bundle.contentHash !== request.productionBundleContentHash) throw new Error("Sound-effect import requires the current acknowledged production snapshot.");
    const selectionOptions: OpenDialogOptions = {title: "Import sound effect", properties: ["openFile"], filters: [{name: "Uncompressed WAV sound effect", extensions: ["wav"]}]};
    const selection = mainWindow ? await dialog.showOpenDialog(mainWindow, selectionOptions) : await dialog.showOpenDialog(selectionOptions);
    if (selection.canceled || selection.filePaths.length !== 1) return importSoundEffectResultSchema.parse({status: "cancelled"});
    const sourceFile = selection.filePaths[0]!;
    const sourceInfo = await lstat(sourceFile);
    if (sourceInfo.isSymbolicLink() || !sourceInfo.isFile() || sourceInfo.size <= 0 || sourceInfo.size > 64 * 1024 * 1024) throw new Error("Sound effect must be a regular WAV file no larger than 64 MB.");
    const bytes = await readFile(sourceFile);
    const metadata = inspectPcmWav(bytes);
    if (metadata.durationInSeconds > 300) throw new Error("A sound effect must be five minutes or shorter.");
    const {dataBytes: _dataBytes, ...soundEffectMetadata} = metadata;
    void _dataBytes;
    const contentHash = createHash("sha256").update(bytes).digest("hex");
    const relativeFile = `sfx/${request.productionId}/r${request.revision}/${contentHash}.wav`;
    const targetFile = resolve(localAssetsRoot(), ...relativeFile.split("/"));
    await publishImmutableVoiceFile(targetFile, bytes);
    const asset = soundEffectAssetSchema.parse({id: `sfx-${contentHash.slice(0, 20)}`, contentHash, relativeFile, sourceFileName: basename(sourceFile), ...soundEffectMetadata, importedAt: new Date().toISOString(), approvalStatus: "imported", approvedAt: null});
    await readVerifiedSoundEffect(asset);
    soundEffectRegistry.set(asset.contentHash, asset);
    return importSoundEffectResultSchema.parse({status: "imported", track: asset});
  } catch (error) {
    return importSoundEffectResultSchema.parse({status: "failed", error: {code: "SFX_IMPORT_FAILED", message: error instanceof Error ? error.message : "Sound effect could not be imported."}});
  }
});

ipcMain.handle(IPC_CHANNELS.approveSoundEffect, async (_event, rawRequest: unknown) => {
  try {
    const request = approveSoundEffectRequestSchema.parse(rawRequest);
    const stored = productionBundleRegistry.get(productionBundleKey(request.productionId, request.revision));
    const asset = stored?.bundle.soundEffectAssets?.find((candidate) => candidate.contentHash === request.soundEffectContentHash);
    if (!stored || !asset || !verifyProductionBundleHash(stored.bundle) || stored.bundle.contentHash !== request.productionBundleContentHash) throw new Error("Sound-effect approval requires the exact saved imported asset.");
    await readVerifiedSoundEffect(asset);
    const approved = soundEffectAssetSchema.parse({...asset, approvalStatus: "approved", approvedAt: new Date().toISOString()});
    soundEffectRegistry.set(approved.contentHash, approved);
    return approveSoundEffectResultSchema.parse({ok: true, track: approved});
  } catch (error) {
    return approveSoundEffectResultSchema.parse({ok: false, error: {code: "SFX_APPROVAL_FAILED", message: error instanceof Error ? error.message : "Sound effect could not be approved."}});
  }
});

ipcMain.handle(IPC_CHANNELS.listGenerationExchanges, (_event, rawRequest: unknown) => {
  const request = listGenerationExchangesRequestSchema.parse(rawRequest);
  return listGenerationExchangesResultSchema.parse({exchanges: [...generationExchangeRegistry.values()].filter((record) => !request.productionId || record.job.production.id === request.productionId).map(summarizeExchange).sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))});
});

ipcMain.handle(IPC_CHANNELS.getGenerationExchange, async (_event, rawRequest: unknown) => {
  try {
    const request = getGenerationExchangeRequestSchema.parse(rawRequest);
    const exchange = generationExchangeRegistry.get(request.exchangeJobId);
    if (!exchange) throw new Error("The requested exchange is unavailable or failed integrity checks.");
    let looseMapping = null;
    let stagedCandidates: Array<ReturnType<typeof stagedCandidateSummarySchema.parse>> = [];
    let preparation: PreparationReview | null = null;
    let assetReviews: AssetReviewRecord["decisions"] = [];
    let missingRoleCount = 0;
    let findings: ImportRecord["findings"] = [];
    if (exchange.state.status === "files-imported") {
      const looseImport = exchange.state.importId ? looseImportRegistry.get(exchange.state.importId) : undefined;
      if (!looseImport) throw new Error("The loose import session could not be resumed safely.");
      await verifyStagedCandidatesInWorker(looseImport.candidates.map((entry) => entry.candidate), looseImport.trustedStagingRoot, looseImport.stagingRoot);
      looseMapping = {status: "mapping-required" as const, importId: exchange.state.importId!, candidates: looseImport.candidates.map((entry) => stagedCandidateSummarySchema.parse({candidateId: entry.candidate.candidateId, candidateSetId: null, originalName: entry.originalName, briefId: null, fileRole: null, mediaType: entry.mediaType, width: entry.width, height: entry.height, stagingState: entry.candidate.stagingState, checks: entry.candidate.checks})), expectedRoles: expectedRolesForJob(exchange.job)};
    }
    if (["staged", "needs-review", "approved", "rejected"].includes(exchange.state.status)) {
      const record = await readImportRecord(exchange);
      if (!record) throw new Error("The durable import record is unavailable or failed integrity checks.");
      missingRoleCount = record.missingRoleCount ?? record.candidateSets.reduce((sum, candidateSet) => sum + candidateSet.missingRoles.length, 0);
      findings = record.findings;
      stagedCandidates = record.assets.map((asset) => stagedCandidateSummarySchema.parse({candidateId: asset.candidateId, candidateSetId: asset.candidateSetId, originalName: asset.originalName, briefId: asset.briefId, fileRole: asset.fileRole, mediaType: asset.mediaType, width: asset.width, height: asset.height, stagingState: asset.stagedCandidate.stagingState, checks: asset.stagedCandidate.checks}));
      preparation = await readPreparationReview(exchange);
      const preparationReport = await readPreparationReport(exchange);
      if (preparationReport) assetReviews = (await readAssetReviewRecord(exchange, preparationReport.contentHash))?.decisions ?? [];
    }
    return getGenerationExchangeResultSchema.parse({ok: true, summary: summarizeExchange(exchange), looseMapping, stagedCandidates, preparation, assetReviews, missingRoleCount, findings});
  } catch (error) {
    return getGenerationExchangeResultSchema.parse({ok: false, error: {code: "EXCHANGE_UNAVAILABLE", message: error instanceof Error ? error.message : "Generation exchange could not be loaded."}});
  }
});

ipcMain.handle(IPC_CHANNELS.exportGenerationJob, async (_event, rawRequest: unknown) => {
  try {
    const request = exportGenerationJobRequestSchema.parse(rawRequest);
    const draft = generationJobDraftSchema.parse(JSON.parse(request.serializedJob));
    if (draft.productionBundleContentHash !== request.productionBundleContentHash) throw new Error("Generation export request does not match its declared production snapshot.");
    const storedProduction = productionBundleRegistry.get(productionBundleKey(draft.production.id, draft.production.revision));
    if (!storedProduction || storedProduction.bundle.contentHash !== request.productionBundleContentHash || !verifyGenerationDraftAgainstProduction(draft, storedProduction.bundle)) throw new Error("Generation export must exactly match the acknowledged authoritative production snapshot.");
    const authoritativeShowPack = getShowPack(draft.showPack.id);
    if (authoritativeShowPack.version !== draft.showPack.version || authoritativeShowPack.contentHash !== draft.showPack.contentHash || !verifyShowPackHash(authoritativeShowPack)) {
      throw new Error("The generation draft references a stale or non-authoritative Show Pack.");
    }
    verifyAuthoritativeBriefData(draft, authoritativeShowPack);
    const jobId = `job-${randomUUID().replaceAll("-", "").slice(0, 16)}`;
    const generationJob = finalizeGenerationJob(draft, {exchangeJobId: jobId, createdAt: new Date().toISOString()});
    const jobFolder = join(
      app.getPath("userData"),
      ".storystage-local",
      "jobs",
      "outbox",
      generationJob.production.id,
      `r${generationJob.production.revision}`,
      jobId,
    );
    await mkdir(jobFolder, {recursive: true});
    const jobFile = join(jobFolder, "generation-job.json");
    await writeFile(jobFile, `${JSON.stringify(generationJob, null, 2)}\n`, {encoding: "utf8", mode: 0o600, flag: "wx"});
    const record: GenerationExchangeRecord = {job: generationJob, jobFile, stateFile: join(jobFolder, "exchange-state.json"), state: makeExchangeState(generationJob, "awaiting-results", null)};
    await persistExchangeState(record, record.state);
    generationExchangeRegistry.set(jobId, record);
    shell.showItemInFolder(jobFile);
    return exportGenerationJobResultSchema.parse({ok: true, jobId, briefCount: generationJob.briefs.length});
  } catch (error) {
    return exportGenerationJobResultSchema.parse({
      ok: false,
      error: {code: "INVALID_GENERATION_JOB", message: error instanceof Error ? error.message : "The generation job could not be exported."},
    });
  }
});

ipcMain.handle(IPC_CHANNELS.importLooseCandidateFiles, async (_event, rawRequest: unknown) => {
  try {
    const request = importLooseCandidateFilesRequestSchema.parse(rawRequest);
    const exchange = generationExchangeRegistry.get(request.exchangeJobId);
    if (!exchange) throw new Error("This exchange job is unknown. Export a fresh immutable job before importing loose files.");
    if (exchange.state.status !== "awaiting-results") throw new Error(`This exchange is ${exchange.state.status}; create a new job revision before importing again.`);
    const selectionOptions: OpenDialogOptions = {
      title: "Select downloaded ChatGPT image candidates",
      properties: ["openFile", "multiSelections"],
      filters: [{name: "Supported images", extensions: ["png", "jpg", "jpeg", "webp"]}],
    };
    const selection = mainWindow ? await dialog.showOpenDialog(mainWindow, selectionOptions) : await dialog.showOpenDialog(selectionOptions);
    if (selection.canceled || selection.filePaths.length === 0) return importLooseCandidateFilesResultSchema.parse({status: "cancelled"});

    const importId = `import-${randomUUID().replaceAll("-", "").slice(0, 16)}`;
    const trustedStagingRoot = join(app.getPath("userData"), ".storystage-local");
    const stagingRoot = join(trustedStagingRoot, "jobs", "inbox", exchange.job.production.id, `r${exchange.job.production.revision}`, importId);
    const files = selection.filePaths.map((sourceFile) => ({candidateId: `loose-${randomUUID().replaceAll("-", "").slice(0, 16)}`, sourceFile}));
    const candidates = await stageLooseCandidatesInWorker(files, trustedStagingRoot, stagingRoot);
    await persistLooseImportSession(importId, exchange, stagingRoot, candidates);
    await transitionExchangeState(exchange, "files-imported", importId);
    looseImportRegistry.set(importId, {exchange, trustedStagingRoot, stagingRoot, candidates});
    return importLooseCandidateFilesResultSchema.parse({
      status: "mapping-required",
      importId,
      candidates: candidates.map((entry) => stagedCandidateSummarySchema.parse({
        candidateId: entry.candidate.candidateId,
        candidateSetId: null,
        originalName: entry.originalName,
        briefId: null,
        fileRole: null,
        mediaType: entry.mediaType,
        width: entry.width,
        height: entry.height,
        stagingState: entry.candidate.stagingState,
        checks: entry.candidate.checks,
      })),
      expectedRoles: expectedRolesForJob(exchange.job),
    });
  } catch (error) {
    return importLooseCandidateFilesResultSchema.parse({status: "failed", error: {code: "LOOSE_IMPORT_FAILED", message: error instanceof Error ? error.message : "Loose candidates could not be imported."}});
  }
});

ipcMain.handle(IPC_CHANNELS.finalizeLooseCandidateMapping, async (_event, rawRequest: unknown) => {
  try {
    const request = finalizeLooseCandidateMappingRequestSchema.parse(rawRequest);
    const looseImport = looseImportRegistry.get(request.importId);
    if (!looseImport) throw new Error("This loose-file import session is unknown or expired.");
    if (looseImport.exchange.state.status !== "files-imported") throw new Error(`This exchange cannot finalize mapping from ${looseImport.exchange.state.status}.`);
    await verifyStagedCandidatesInWorker(looseImport.candidates.map((entry) => entry.candidate), looseImport.trustedStagingRoot, looseImport.stagingRoot);
    const candidateById = new Map(looseImport.candidates.map((entry) => [entry.candidate.candidateId, entry]));
    const briefById = new Map(looseImport.exchange.job.briefs.map((brief) => [brief.id, brief]));
    const usedCandidates = new Set<string>();
    const usedRoles = new Set<string>();
    for (const assignment of request.assignments) {
      if (usedCandidates.has(assignment.candidateId)) throw new Error(`Loose candidate ${assignment.candidateId} was assigned more than once.`);
      usedCandidates.add(assignment.candidateId);
      if (!candidateById.has(assignment.candidateId)) throw new Error(`Loose candidate ${assignment.candidateId} is unknown.`);
      const brief = briefById.get(assignment.briefId);
      if (!brief || !brief.expectedFiles.includes(assignment.fileRole)) throw new Error(`Loose candidate assignment names an unexpected output role.`);
      const allowedCandidateSets = new Set(Array.from({length: brief.candidateCount}, (_, index) => `set-${brief.id}-${index + 1}`));
      if (!allowedCandidateSets.has(assignment.candidateSetId)) throw new Error(`Loose candidate assignment names an unexpected candidate set.`);
      const roleKey = `${assignment.briefId}:${assignment.candidateSetId}:${assignment.fileRole}`;
      if (usedRoles.has(roleKey)) throw new Error(`Output role ${assignment.fileRole} was assigned more than once for ${brief.entity.name}.`);
      usedRoles.add(roleKey);
    }

    const assets = request.assignments.map((assignment) => {
      const entry = candidateById.get(assignment.candidateId)!;
      return {
        candidateId: entry.candidate.candidateId,
        candidateSetId: assignment.candidateSetId,
        briefId: assignment.briefId,
        fileRole: assignment.fileRole,
        relativeFile: entry.candidate.relativeFile,
        contentHash: entry.candidate.sourceContentHash,
        mediaType: entry.mediaType,
        width: entry.width,
        height: entry.height,
        rights: {sourceType: "generated" as const, provider: "chatgpt-images", usageNotes: "User-mapped image downloaded from the manual ChatGPT Images exchange."},
      };
    });
    const bundle = candidateBundleSchema.parse({
      schemaVersion: "1.0",
      exchangeMode: "manual-chatgpt-images",
      exchangeJobId: looseImport.exchange.job.exchangeJobId,
      generationJobContentHash: looseImport.exchange.job.contentHash,
      production: {id: looseImport.exchange.job.production.id, revision: looseImport.exchange.job.production.revision},
      showPack: looseImport.exchange.job.showPack,
      providerMetadata: {provider: "chatgpt-images", generatedAt: new Date().toISOString(), conversationReference: null},
      assets,
    });
    const {record, missingRoleCount} = createImportRecord({exchange: looseImport.exchange, importId: request.importId, sourceMode: "loose-files", bundle, staged: request.assignments.map((assignment) => candidateById.get(assignment.candidateId)!.candidate), originalNameById: new Map(looseImport.candidates.map((entry) => [entry.candidate.candidateId, entry.originalName]))});
    await persistImportRecord(looseImport.stagingRoot, record);
    const candidates = request.assignments.map((assignment) => {
      const entry = candidateById.get(assignment.candidateId)!;
      return stagedCandidateSummarySchema.parse({candidateId: entry.candidate.candidateId, candidateSetId: assignment.candidateSetId, originalName: entry.originalName, briefId: assignment.briefId, fileRole: assignment.fileRole, mediaType: entry.mediaType, width: entry.width, height: entry.height, stagingState: entry.candidate.stagingState, checks: entry.candidate.checks});
    });
    await transitionExchangeState(looseImport.exchange, "staged", request.importId);
    looseImportRegistry.delete(request.importId);
    return finalizeLooseCandidateMappingResultSchema.parse({status: "staged", importId: request.importId, stagedCount: candidates.length, needsManualMaskCount: candidates.filter((candidate) => candidate.stagingState === "staged-needs-mask").length, missingRoleCount, candidates});
  } catch (error) {
    return finalizeLooseCandidateMappingResultSchema.parse({status: "failed", error: {code: "LOOSE_MAPPING_FAILED", message: error instanceof Error ? error.message : "Loose candidate mapping could not be finalized."}});
  }
});

ipcMain.handle(IPC_CHANNELS.stageCandidateBundle, async (_event, rawRequest: unknown) => {
  try {
    const request = stageCandidateBundleRequestSchema.parse(rawRequest);
    const exchange = generationExchangeRegistry.get(request.exchangeJobId);
    if (!exchange) throw new Error("This exchange job is unknown or failed durable integrity checks. Export a fresh immutable job before importing results.");
    if (exchange.state.status !== "awaiting-results") throw new Error(`This exchange is ${exchange.state.status}; create a new job revision before importing again.`);
    const selectionOptions: OpenDialogOptions = {title: "Select the generated candidate bundle folder", properties: ["openDirectory"]};
    const selection = mainWindow
      ? await dialog.showOpenDialog(mainWindow, selectionOptions)
      : await dialog.showOpenDialog(selectionOptions);
    if (selection.canceled || !selection.filePaths[0]) return stageCandidateBundleResultSchema.parse({status: "cancelled"});

    const sourceRoot = selection.filePaths[0];
    const manifestPath = join(sourceRoot, "candidate-bundle.json");
    const manifestInfo = await lstat(manifestPath);
    if (manifestInfo.isSymbolicLink() || !manifestInfo.isFile() || manifestInfo.size > 2_000_000) {
      throw new Error("candidate-bundle.json must be a regular file smaller than 2 MB.");
    }
    const bundle = candidateBundleSchema.parse(JSON.parse(await readFile(manifestPath, "utf8")));
    if (bundle.exchangeJobId !== exchange.job.exchangeJobId || bundle.generationJobContentHash !== exchange.job.contentHash) {
      throw new Error("The candidate bundle was created for a different or stale generation job.");
    }
    if (bundle.production.id !== exchange.job.production.id || bundle.production.revision !== exchange.job.production.revision) {
      throw new Error("The candidate bundle production identity does not match the exported job.");
    }
    if (bundle.showPack.id !== exchange.job.showPack.id || bundle.showPack.version !== exchange.job.showPack.version || bundle.showPack.contentHash !== exchange.job.showPack.contentHash) {
      throw new Error("The candidate bundle Show Pack identity is stale or mismatched.");
    }
    const briefById = new Map(exchange.job.briefs.map((brief) => [brief.id, brief]));
    for (const asset of bundle.assets) {
      const brief = briefById.get(asset.briefId);
      if (!brief) throw new Error(`Candidate ${asset.candidateId} names an unknown generation brief.`);
      if (!brief.expectedFiles.includes(asset.fileRole)) throw new Error(`Candidate ${asset.candidateId} has unexpected role ${asset.fileRole}.`);
    }
    validateCandidateSets(exchange.job, bundle);
    const importId = `import-${randomUUID().replaceAll("-", "").slice(0, 16)}`;
    const trustedStagingRoot = join(app.getPath("userData"), ".storystage-local");
    const stagingRoot = join(
      trustedStagingRoot,
      "jobs",
      "inbox",
      exchange.job.production.id,
      `r${exchange.job.production.revision}`,
      importId,
    );
    const staged = await stageCandidateBundleInWorker(sourceRoot, trustedStagingRoot, stagingRoot, bundle);
    const {record, missingRoleCount} = createImportRecord({exchange, importId, sourceMode: "structured-bundle", bundle, staged, originalNameById: new Map(bundle.assets.map((asset) => [asset.candidateId, basename(asset.relativeFile)]))});
    await persistImportRecord(stagingRoot, record);
    await transitionExchangeState(exchange, "staged", importId);
    return stageCandidateBundleResultSchema.parse({
      status: "staged",
      importId,
      stagedCount: staged.length,
      needsManualMaskCount: staged.filter((candidate) => candidate.stagingState === "staged-needs-mask").length,
      missingRoleCount,
      candidates: staged.map((candidate) => {
        const asset = bundle.assets.find((entry) => entry.candidateId === candidate.candidateId);
        if (!asset) throw new Error(`Staged candidate ${candidate.candidateId} is missing from its bundle.`);
        return stagedCandidateSummarySchema.parse({candidateId: candidate.candidateId, candidateSetId: asset.candidateSetId, originalName: basename(asset.relativeFile), briefId: asset.briefId, fileRole: asset.fileRole, mediaType: asset.mediaType, width: asset.width, height: asset.height, stagingState: candidate.stagingState, checks: candidate.checks});
      }),
    });
  } catch (error) {
    return stageCandidateBundleResultSchema.parse({
      status: "failed",
      error: {
        code: "CANDIDATE_IMPORT_FAILED",
        message: error instanceof Error ? error.message : "The candidate bundle could not be staged.",
      },
    });
  }
});

ipcMain.handle(IPC_CHANNELS.prepareGenerationImport, async (_event, rawRequest: unknown) => {
  try {
    const request = prepareGenerationImportRequestSchema.parse(rawRequest);
    const exchange = generationExchangeRegistry.get(request.exchangeJobId);
    if (!exchange) throw new Error("This generation exchange is unknown or failed durable integrity checks.");
    if (!["staged", "needs-review"].includes(exchange.state.status)) throw new Error(`This exchange cannot prepare assets from ${exchange.state.status}.`);

    const existingReview = await readPreparationReview(exchange);
    if (existingReview) {
      const fullyReady = existingReview.candidateSets.every((candidateSet) => candidateSet.status === "ready-for-review");
      if (fullyReady && exchange.state.status === "staged") await transitionExchangeState(exchange, "needs-review", exchange.state.importId);
      return prepareGenerationImportResultSchema.parse({status: "prepared", review: existingReview});
    }

    if (exchange.state.status !== "staged") throw new Error("Review evidence is missing for an exchange already marked as needing review.");
    const record = await readImportRecord(exchange);
    if (!record || !exchange.state.importId) throw new Error("The durable import record is unavailable or failed integrity checks.");
    for (const brief of exchange.job.briefs) {
      const sets = record.candidateSets.filter((candidateSet) => candidateSet.briefId === brief.id);
      if (sets.length !== brief.candidateCount || sets.some((candidateSet) => !candidateSet.complete)) throw new Error(`${brief.entity.name} does not have ${brief.candidateCount} complete coherent candidate set${brief.candidateCount === 1 ? "" : "s"}. Finish the required file roles before preparation.`);
    }
    const briefById = new Map(exchange.job.briefs.map((brief) => [brief.id, brief]));
    const preparationRequest = prepareCandidateSetsRequestSchema.parse({
      importId: record.importId,
      importRecordContentHash: record.contentHash,
      exchangeJobId: exchange.job.exchangeJobId,
      candidates: record.assets.map((asset) => {
        const brief = briefById.get(asset.briefId);
        if (!brief || brief.requirementId !== asset.requirementId) throw new Error(`Imported candidate ${asset.candidateId} no longer matches an authoritative brief.`);
        return {candidateSetId: asset.candidateSetId, briefId: asset.briefId, requirementId: asset.requirementId, fileRole: asset.fileRole, expectedMediaType: asset.mediaType, expectedWidth: asset.width, expectedHeight: asset.height, outputRole: brief.outputRole, stagedCandidate: asset.stagedCandidate};
      }),
    });
    const trustedStagingRoot = join(app.getPath("userData"), ".storystage-local");
    const stagingRoot = importStagingRoot(exchange);
    const report = await prepareCandidateSetsInWorker(preparationRequest, trustedStagingRoot, stagingRoot);
    if (report.importRecordContentHash !== record.contentHash || report.importId !== record.importId || report.exchangeJobId !== exchange.job.exchangeJobId) throw new Error("The preparation report is not bound to the active import record.");

    await writeFile(join(stagingRoot, "preparation-report.json"), `${JSON.stringify(report, null, 2)}\n`, {encoding: "utf8", mode: 0o600, flag: "wx"});
    const review = await preparationReviewFromReport(exchange, report);
    const fullyReady = review.candidateSets.every((candidateSet) => candidateSet.status === "ready-for-review");
    if (fullyReady) await transitionExchangeState(exchange, "needs-review", record.importId);
    return prepareGenerationImportResultSchema.parse({status: "prepared", review});
  } catch (error) {
    return prepareGenerationImportResultSchema.parse({status: "failed", error: {code: "ASSET_PREPARATION_FAILED", message: error instanceof Error ? error.message : "Imported candidates could not be prepared."}});
  }
});

ipcMain.handle(IPC_CHANNELS.reviewCandidateSet, async (_event, rawRequest: unknown) => {
  try {
    const request = reviewCandidateSetRequestSchema.parse(rawRequest);
    const exchange = generationExchangeRegistry.get(request.exchangeJobId);
    if (!exchange) throw new Error("This generation exchange is unknown or failed durable integrity checks.");
    const isApprovedRetry = request.decision === "approve" && exchange.state.status === "approved";
    if (exchange.state.status !== "needs-review" && !isApprovedRetry) throw new Error(`Candidate review cannot change an exchange in ${exchange.state.status}.`);
    const report = await readPreparationReport(exchange);
    const importRecord = await readImportRecord(exchange);
    if (!report || !importRecord || !exchange.state.importId) throw new Error("The preparation or import evidence is unavailable.");
    const candidateSet = report.candidateSets.find((candidate) => candidate.candidateSetId === request.candidateSetId);
    if (!candidateSet || candidateSet.status !== "ready-for-review") throw new Error("The selected candidate set is not ready for human review.");
    const existing = await readAssetReviewRecord(exchange, report.contentHash);
    const decidedAt = new Date().toISOString();
    const existingDecision = existing?.decisions.find((decision) => decision.candidateSetId === candidateSet.candidateSetId);
    if (request.decision === "approve" && existingDecision?.status === "approved" && existingDecision.approvedAssetVersion && existing) {
      const allRequirementsApproved = Boolean(approvedVersionsForExchange(exchange, existing));
      if (allRequirementsApproved) await commitFullyApprovedExchange(exchange, existing);
      return reviewCandidateSetResultSchema.parse({status: "reviewed", exchangeStatus: allRequirementsApproved ? "approved" : "needs-review", decisions: existing.decisions, approvedAssetVersion: existingDecision.approvedAssetVersion});
    }
    if (isApprovedRetry) throw new Error("The approved exchange is missing its durable approval decision and cannot be changed.");
    if (request.decision === "approve" && existingDecision?.status !== "selected") throw new Error("Select and technically validate this coherent set before final approval.");
    if (request.decision === "select") await buildSelectedCandidateRig(exchange, report, candidateSet.candidateSetId, decidedAt);
    const approvedAssetVersion = request.decision === "approve" ? await promoteCandidateSet(exchange, report, importRecord, candidateSet.candidateSetId, decidedAt) : null;
    let decisions = (existing?.decisions ?? []).filter((decision) => decision.candidateSetId !== candidateSet.candidateSetId);
    if (request.decision === "select") {
      const siblingIds = new Set(report.candidateSets.filter((set) => set.briefId === candidateSet.briefId && set.candidateSetId !== candidateSet.candidateSetId).map((set) => set.candidateSetId));
      decisions = decisions.filter((decision) => !siblingIds.has(decision.candidateSetId));
      decisions.push(...report.candidateSets.filter((set) => siblingIds.has(set.candidateSetId)).map((set) => ({candidateSetId: set.candidateSetId, briefId: set.briefId, requirementId: set.requirementId, status: "rejected" as const, notes: "Not selected after coherent-kit comparison.", decidedAt, approvedAssetVersion: null})));
    }
    decisions.push({candidateSetId: candidateSet.candidateSetId, briefId: candidateSet.briefId, requirementId: candidateSet.requirementId, status: request.decision === "select" ? "selected" : request.decision === "approve" ? "approved" : "rejected", notes: request.notes, decidedAt, approvedAssetVersion});
    const reviewRecord = finalizeAssetReviewRecord({schemaVersion: "1.0", exchangeJobId: exchange.job.exchangeJobId, importId: exchange.state.importId, preparationReportContentHash: report.contentHash, decisions}, decidedAt);

    const allRequirementsApproved = Boolean(approvedVersionsForExchange(exchange, reviewRecord));
    const selectedBriefSets = report.candidateSets.filter((set) => set.briefId === candidateSet.briefId);
    const selectedBriefRejected = selectedBriefSets.every((set) => reviewRecord.decisions.some((decision) => decision.candidateSetId === set.candidateSetId && decision.status === "rejected"));
    let exchangeStatus: "needs-review" | "approved" | "rejected" = "needs-review";
    if (allRequirementsApproved) {
      await commitFullyApprovedExchange(exchange, reviewRecord);
      exchangeStatus = "approved";
    } else {
      await persistAssetReviewRecord(exchange, reviewRecord);
      if (selectedBriefRejected) {
        await transitionExchangeState(exchange, "rejected", exchange.state.importId);
        exchangeStatus = "rejected";
      }
    }
    return reviewCandidateSetResultSchema.parse({status: "reviewed", exchangeStatus, decisions: reviewRecord.decisions, approvedAssetVersion});
  } catch (error) {
    return reviewCandidateSetResultSchema.parse({status: "failed", error: {code: "ASSET_REVIEW_FAILED", message: error instanceof Error ? error.message : "Candidate review could not be recorded."}});
  }
});

ipcMain.handle(IPC_CHANNELS.renderStart, (_event, payload: unknown) => {
  const request = startRenderRequestSchema.parse(payload);
  if (activeJobId) throw new Error("A render is already running.");
  const jobId = randomUUID();
  const outputRoot = resolve(workspaceRoot, "artifacts/SS-001");
  registerJob(jobId, outputRoot);
  try {
    startRenderWorker(jobId, request.simulateFailure);
  } catch {
    failJob(jobId, "WORKER_START_FAILED", "The render worker could not be started.");
  }
  return startRenderResponseSchema.parse({jobId});
});

ipcMain.handle(IPC_CHANNELS.productionRenderStart, async (_event, payload: unknown) => {
  const request = startProductionRenderRequestSchema.parse(payload);
  if (activeJobId) throw new Error("A render is already running.");
  const stored = productionBundleRegistry.get(productionBundleKey(request.productionId, request.revision));
  if (!stored || !verifyProductionBundleHash(stored.bundle) || (stored.bundle.approvedAssetVersions ?? []).length === 0) throw new Error("The selected production has no verified approved assets to render.");
  const approvedVersions = stored.bundle.approvedAssetVersions ?? [];
  if (!(await Promise.all(approvedVersions.map(verifyApprovedAssetVersionOnDisk))).every(Boolean)) throw new Error("An approved asset or its watched diagnostic changed after final approval. Rendering is blocked.");
  if (stored.bundle.voiceTrack?.approvalStatus === "approved") await readVerifiedVoiceTrack(stored.bundle.voiceTrack);
  if (stored.bundle.musicTrack?.approvalStatus === "approved") await readVerifiedMusicTrack(stored.bundle.musicTrack);
  await Promise.all((stored.bundle.soundEffectAssets ?? []).filter((asset) => asset.approvalStatus === "approved").map(readVerifiedSoundEffect));
  const jobId = randomUUID();
  const localRoot = join(app.getPath("userData"), ".storystage-local");
  const outputRoot = join(localRoot, "renders", request.productionId, `r${request.revision}`);
  await mkdir(outputRoot, {recursive: true});
  registerJob(jobId, outputRoot);
  try {
    startRenderWorker(jobId, false, {trustedProductionRoot: join(localRoot, "productions"), bundleFile: stored.bundleFile, assetsRoot: join(localRoot, "assets"), outputRoot, bundleContentHash: stored.bundle.contentHash, scope: request.scope});
  } catch {
    failJob(jobId, "WORKER_START_FAILED", "The production render worker could not be started.");
  }
  return startRenderResponseSchema.parse({jobId});
});

ipcMain.handle(IPC_CHANNELS.openRenderedFile, async (_event, rawJobId: unknown) => {
  const jobId = startRenderResponseSchema.shape.jobId.parse(rawJobId);
  const record = jobRegistry.get(jobId);
  if (!record || record.event.status !== "completed") {
    return openRenderedFileResultSchema.parse({ok: false, error: {code: "OUTPUT_UNAVAILABLE", message: "No completed output exists for this job."}});
  }
  try {
    await access(record.event.outputPath);
    shell.showItemInFolder(record.event.outputPath);
    return openRenderedFileResultSchema.parse({ok: true});
  } catch {
    return openRenderedFileResultSchema.parse({ok: false, error: {code: "OUTPUT_MISSING", message: "The rendered file could not be found."}});
  }
});

app.whenReady().then(async () => {
  installRenderedMediaProtocol();
  await rehydrateProductionBundleRegistry();
  await rehydrateGenerationExchangeRegistry();
  await rehydrateLooseImportRegistry();
  await createWindow();
  app.on("activate", async () => {
    if (BrowserWindow.getAllWindows().length === 0) await createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
