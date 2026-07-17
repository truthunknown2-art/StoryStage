import {randomUUID} from "node:crypto";
import {access, lstat, mkdir, readFile, readdir, realpath, rename, writeFile} from "node:fs/promises";
import {basename, isAbsolute, join, relative, resolve, sep} from "node:path";
import {pathToFileURL} from "node:url";
import {app, BrowserWindow, dialog, ipcMain, shell, utilityProcess, type OpenDialogOptions} from "electron";
import {
  IPC_CHANNELS,
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
  listGenerationExchangesRequestSchema,
  listGenerationExchangesResultSchema,
  listProductionBundlesResultSchema,
  loadProductionBundleRequestSchema,
  loadProductionBundleResultSchema,
  openRenderedFileResultSchema,
  productionBundleSummarySchema,
  stagedCandidateSummarySchema,
  renderJobEventSchema,
  renderWorkerCommandSchema,
  renderWorkerMessageSchema,
  saveProductionBundleRequestSchema,
  saveProductionBundleResultSchema,
  startRenderRequestSchema,
  startRenderResponseSchema,
  stageCandidateBundleRequestSchema,
  stageCandidateBundleResultSchema,
  workerLooseStagedCandidateSchema,
  type RenderJobEvent,
  type WorkerLooseStagedCandidate,
  type ProductionBundleSummary,
} from "@storystage/contracts";
import {
  canTransitionGenerationExchange,
  candidateBundleSchema,
  finalizeImportRecord,
  finalizeGenerationJob,
  generationExchangeStateSchema,
  generationJobSchema,
  generationJobDraftSchema,
  getShowPack,
  hashCanonical,
  importRecordSchema,
  stagedCandidateSchema,
  productionBundleSchema,
  verifyProductionBundleHash,
  verifyImportRecordHash,
  verifyGenerationJobHash,
  verifyShowPackHash,
  validateCandidateSets,
  type CandidateBundle,
  type GenerationExchangeState,
  type GenerationJob,
  type GenerationJobDraft,
  type ImportRecord,
  type ProductionBundle,
  type ShowPack,
  type StagedCandidate,
} from "@storystage/story-engine";

type JobRecord = {
  event: RenderJobEvent;
  phaseProgress: Partial<Record<"bundling" | "rendering", number>>;
};

let mainWindow: BrowserWindow | null = null;
let activeJobId: string | null = null;
const jobRegistry = new Map<string, JobRecord>();
type GenerationExchangeRecord = {job: GenerationJob; jobFile: string; stateFile: string; state: GenerationExchangeState};
const generationExchangeRegistry = new Map<string, GenerationExchangeRecord>();
const productionBundleRegistry = new Map<string, {bundle: ProductionBundle; bundleFile: string}>();
const looseImportRegistry = new Map<string, {
  exchange: GenerationExchangeRecord;
  trustedStagingRoot: string;
  stagingRoot: string;
  candidates: WorkerLooseStagedCandidate[];
}>();
const workspaceRoot = app.isPackaged ? app.getAppPath() : resolve(__dirname, "../../..");
const terminalStatuses = new Set<RenderJobEvent["status"]>(["completed", "failed"]);

function isWithinPath(root: string, candidate: string): boolean {
  const pathFromRoot = relative(root, candidate);
  return pathFromRoot === "" || (!pathFromRoot.startsWith("..") && !isAbsolute(pathFromRoot));
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
          generationExchangeRegistry.set(job.exchangeJobId, record);
          if (!stateWasRecovered) await persistExchangeState(record, state);
        } catch {
          // A malformed private job is quarantined by omission; it is never trusted for import.
        }
      }
    }
  }
}

const productionBundleKey = (productionId: string, revision: number) => `${productionId}:r${revision}`;

function summarizeProductionBundle(bundle: ProductionBundle): ProductionBundleSummary {
  return productionBundleSummarySchema.parse({productionId: bundle.production.productionId, revision: bundle.production.revision, title: bundle.production.title, projectType: bundle.production.projectType, showPackId: bundle.production.showPackId, savedAt: bundle.savedAt, contentHash: bundle.contentHash});
}

async function rehydrateProductionBundleRegistry(): Promise<void> {
  productionBundleRegistry.clear();
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

function createImportRecord(options: {exchange: GenerationExchangeRecord; importId: string; sourceMode: "structured-bundle" | "loose-files"; bundle: CandidateBundle; staged: StagedCandidate[]; originalNameById: Map<string, string>}): {record: ImportRecord; missingRoleCount: number} {
  const {candidateSets, findings, missingRoleCount} = validateCandidateSets(options.exchange.job, options.bundle);
  const briefById = new Map(options.exchange.job.briefs.map((brief) => [brief.id, brief]));
  const bundleAssetById = new Map(options.bundle.assets.map((asset) => [asset.candidateId, asset]));
  const assets = options.staged.map((stagedCandidate) => {
    const asset = bundleAssetById.get(stagedCandidate.candidateId);
    if (!asset) throw new Error(`Staged candidate ${stagedCandidate.candidateId} is absent from its immutable manifest.`);
    const brief = briefById.get(asset.briefId);
    if (!brief) throw new Error(`Staged candidate ${stagedCandidate.candidateId} names an unknown brief.`);
    if (!stagedCandidate.checks.alphaOrMatte) findings.push({severity: "warning", code: "MANUAL_MASK_REQUIRED", candidateId: stagedCandidate.candidateId, message: `${options.originalNameById.get(stagedCandidate.candidateId) ?? stagedCandidate.candidateId} needs matte or alpha cleanup.`});
    return {candidateId: stagedCandidate.candidateId, candidateSetId: asset.candidateSetId, briefId: asset.briefId, requirementId: brief.requirementId, fileRole: asset.fileRole, originalName: options.originalNameById.get(stagedCandidate.candidateId) ?? basename(asset.relativeFile), mediaType: asset.mediaType, width: asset.width, height: asset.height, rights: asset.rights, stagedCandidate};
  });
  findings.unshift({severity: "info", code: "BYTE_STAGING_COMPLETE", candidateId: null, message: `${assets.length} candidates were byte-verified; ${missingRoleCount} expected roles remain missing.`});
  return {record: finalizeImportRecord({schemaVersion: "1.0", importId: options.importId, sourceMode: options.sourceMode, exchangeJobId: options.exchange.job.exchangeJobId, generationJobContentHash: options.exchange.job.contentHash, production: {id: options.exchange.job.production.id, revision: options.exchange.job.production.revision}, manifestContentHash: hashCanonical(options.bundle), candidateBundle: options.bundle, assets, candidateSets, findings}, new Date().toISOString()), missingRoleCount};
}

async function persistImportRecord(stagingRoot: string, record: ImportRecord): Promise<void> {
  const reportBase = {schemaVersion: "1.0", importId: record.importId, importRecordContentHash: record.contentHash, candidateSets: record.candidateSets, findings: record.findings};
  const validationReport = {...reportBase, contentHash: hashCanonical(reportBase)};
  await writeFile(join(stagingRoot, "candidate-bundle.json"), `${JSON.stringify(record.candidateBundle, null, 2)}\n`, {encoding: "utf8", mode: 0o600, flag: "wx"});
  await writeFile(join(stagingRoot, "import-record.json"), `${JSON.stringify(record, null, 2)}\n`, {encoding: "utf8", mode: 0o600, flag: "wx"});
  await writeFile(join(stagingRoot, "validation-report.json"), `${JSON.stringify(validationReport, null, 2)}\n`, {encoding: "utf8", mode: 0o600, flag: "wx"});
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

async function rehydrateLooseImportRegistry(): Promise<void> {
  looseImportRegistry.clear();
  const trustedStagingRoot = join(app.getPath("userData"), ".storystage-local");
  for (const exchange of generationExchangeRegistry.values()) {
    if (exchange.state.status !== "files-imported" || !exchange.state.importId) continue;
    try {
      const stagingRoot = join(trustedStagingRoot, "jobs", "inbox", exchange.job.production.id, `r${exchange.job.production.revision}`, exchange.state.importId);
      const sessionFile = join(stagingRoot, "loose-import-session.json");
      const sessionInfo = await lstat(sessionFile);
      if (sessionInfo.isSymbolicLink() || !sessionInfo.isFile() || sessionInfo.size > 2_000_000) continue;
      const raw = JSON.parse(await readFile(sessionFile, "utf8")) as Record<string, unknown>;
      const {contentHash, ...sessionBase} = raw;
      if (typeof contentHash !== "string" || hashCanonical(sessionBase) !== contentHash) continue;
      if (raw.importId !== exchange.state.importId || raw.exchangeJobId !== exchange.job.exchangeJobId || raw.generationJobContentHash !== exchange.job.contentHash) continue;
      const candidates = workerLooseStagedCandidateSchema.array().parse(raw.candidates);
      looseImportRegistry.set(exchange.state.importId, {exchange, trustedStagingRoot, stagingRoot, candidates});
    } catch {
      // A corrupt loose session remains quarantined and cannot be resumed.
    }
  }
}

async function readImportRecord(exchange: GenerationExchangeRecord): Promise<ImportRecord | null> {
  if (!exchange.state.importId) return null;
  const recordFile = join(app.getPath("userData"), ".storystage-local", "jobs", "inbox", exchange.job.production.id, `r${exchange.job.production.revision}`, exchange.state.importId, "import-record.json");
  try {
    const info = await lstat(recordFile);
    if (info.isSymbolicLink() || !info.isFile() || info.size > 10_000_000) return null;
    const record = importRecordSchema.parse(JSON.parse(await readFile(recordFile, "utf8")));
    if (!verifyImportRecordHash(record) || record.exchangeJobId !== exchange.job.exchangeJobId || record.generationJobContentHash !== exchange.job.contentHash || record.importId !== exchange.state.importId) return null;
    return record;
  } catch {
    return null;
  }
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

function registerJob(jobId: string) {
  const event = renderJobEventSchema.parse({jobId, status: "queued", progress: null, message: "Render queued"});
  jobRegistry.set(jobId, {event, phaseProgress: {}});
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

function startRenderWorker(jobId: string, simulateFailure: boolean) {
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
  const timeout = setTimeout(() => {
    failJob(jobId, "TIMEOUT", "The render worker did not respond within two minutes.");
    stop();
  }, 120_000);

  worker.on("spawn", () => {
    transitionJob({jobId, status: "bundling", progress: 0, message: "Starting render worker"});
    worker.postMessage(renderWorkerCommandSchema.parse({type: "start", workspaceRoot, request: {jobId, simulateFailure}}));
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
            realpath(resolve(workspaceRoot, "artifacts/SS-001")),
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

ipcMain.handle(IPC_CHANNELS.capabilities, () => desktopCapabilitiesSchema.parse({localRendering: true, openRenderedFile: true, manualImageExchange: true}));

ipcMain.handle(IPC_CHANNELS.saveProductionBundle, async (_event, rawRequest: unknown) => {
  try {
    const request = saveProductionBundleRequestSchema.parse(rawRequest);
    const bundle = productionBundleSchema.parse(JSON.parse(request.serializedBundle));
    if (!verifyProductionBundleHash(bundle)) throw new Error("Production bundle content hash is invalid.");
    const showPack = getShowPack(bundle.production.showPackId);
    if (!verifyShowPackHash(showPack) || bundle.resolvedPlan.showPack.contentHash !== showPack.contentHash) throw new Error("Production bundle references a stale or non-authoritative Show Pack.");
    await persistProductionBundle(bundle);
    return saveProductionBundleResultSchema.parse({ok: true, productionId: bundle.production.productionId, revision: bundle.production.revision, contentHash: bundle.contentHash});
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
    if (exchange.state.status === "files-imported") {
      const looseImport = exchange.state.importId ? looseImportRegistry.get(exchange.state.importId) : undefined;
      if (!looseImport) throw new Error("The loose import session could not be resumed safely.");
      await verifyStagedCandidatesInWorker(looseImport.candidates.map((entry) => entry.candidate), looseImport.trustedStagingRoot, looseImport.stagingRoot);
      looseMapping = {status: "mapping-required" as const, importId: exchange.state.importId!, candidates: looseImport.candidates.map((entry) => stagedCandidateSummarySchema.parse({candidateId: entry.candidate.candidateId, candidateSetId: null, originalName: entry.originalName, briefId: null, fileRole: null, mediaType: entry.mediaType, width: entry.width, height: entry.height, stagingState: entry.candidate.stagingState, checks: entry.candidate.checks})), expectedRoles: expectedRolesForJob(exchange.job)};
    }
    if (["staged", "needs-review", "approved", "rejected"].includes(exchange.state.status)) {
      const record = await readImportRecord(exchange);
      if (!record) throw new Error("The durable import record is unavailable or failed integrity checks.");
      stagedCandidates = record.assets.map((asset) => stagedCandidateSummarySchema.parse({candidateId: asset.candidateId, candidateSetId: asset.candidateSetId, originalName: asset.originalName, briefId: asset.briefId, fileRole: asset.fileRole, mediaType: asset.mediaType, width: asset.width, height: asset.height, stagingState: asset.stagedCandidate.stagingState, checks: asset.stagedCandidate.checks}));
    }
    return getGenerationExchangeResultSchema.parse({ok: true, summary: summarizeExchange(exchange), looseMapping, stagedCandidates});
  } catch (error) {
    return getGenerationExchangeResultSchema.parse({ok: false, error: {code: "EXCHANGE_UNAVAILABLE", message: error instanceof Error ? error.message : "Generation exchange could not be loaded."}});
  }
});

ipcMain.handle(IPC_CHANNELS.exportGenerationJob, async (_event, rawRequest: unknown) => {
  try {
    const request = exportGenerationJobRequestSchema.parse(rawRequest);
    const draft = generationJobDraftSchema.parse(JSON.parse(request.serializedJob));
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

ipcMain.handle(IPC_CHANNELS.renderStart, (_event, payload: unknown) => {
  const request = startRenderRequestSchema.parse(payload);
  if (activeJobId) throw new Error("A render is already running.");
  const jobId = randomUUID();
  registerJob(jobId);
  try {
    startRenderWorker(jobId, request.simulateFailure);
  } catch {
    failJob(jobId, "WORKER_START_FAILED", "The render worker could not be started.");
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
