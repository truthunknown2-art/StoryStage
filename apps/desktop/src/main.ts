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
  importLooseCandidateFilesRequestSchema,
  importLooseCandidateFilesResultSchema,
  openRenderedFileResultSchema,
  stagedCandidateSummarySchema,
  renderJobEventSchema,
  renderWorkerCommandSchema,
  renderWorkerMessageSchema,
  startRenderRequestSchema,
  startRenderResponseSchema,
  stageCandidateBundleRequestSchema,
  stageCandidateBundleResultSchema,
  workerLooseStagedCandidateSchema,
  type RenderJobEvent,
  type WorkerLooseStagedCandidate,
} from "@storystage/contracts";
import {
  candidateBundleSchema,
  finalizeGenerationJob,
  generationExchangeStateSchema,
  generationJobSchema,
  generationJobDraftSchema,
  getShowPack,
  stagedCandidateSchema,
  verifyGenerationJobHash,
  verifyShowPackHash,
  type GenerationExchangeState,
  type GenerationJob,
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
const looseImportRegistry = new Map<string, {
  exchange: GenerationExchangeRecord;
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

async function writeExchangeState(record: GenerationExchangeRecord, status: GenerationExchangeState["status"], importId: string | null): Promise<void> {
  const state = makeExchangeState(record.job, status, importId);
  const temporaryFile = `${record.stateFile}.${randomUUID()}.tmp`;
  await writeFile(temporaryFile, `${JSON.stringify(state, null, 2)}\n`, {encoding: "utf8", mode: 0o600, flag: "wx"});
  await rename(temporaryFile, record.stateFile);
  record.state = state;
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
          if (!stateWasRecovered) await writeExchangeState(record, "awaiting-results", null);
        } catch {
          // A malformed private job is quarantined by omission; it is never trusted for import.
        }
      }
    }
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
      if (message.data.type === "loose-staged") {
        finish(() => rejectStaging(new Error("The asset worker returned loose candidates for a structured bundle request.")));
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

ipcMain.handle(IPC_CHANNELS.exportGenerationJob, async (_event, rawRequest: unknown) => {
  try {
    const request = exportGenerationJobRequestSchema.parse(rawRequest);
    const draft = generationJobDraftSchema.parse(JSON.parse(request.serializedJob));
    const authoritativeShowPack = getShowPack(draft.showPack.id);
    if (authoritativeShowPack.version !== draft.showPack.version || authoritativeShowPack.contentHash !== draft.showPack.contentHash || !verifyShowPackHash(authoritativeShowPack)) {
      throw new Error("The generation draft references a stale or non-authoritative Show Pack.");
    }
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
    await writeExchangeState(record, "awaiting-results", null);
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
    await writeExchangeState(exchange, "files-imported", importId);
    looseImportRegistry.set(importId, {exchange, stagingRoot, candidates});
    return importLooseCandidateFilesResultSchema.parse({
      status: "mapping-required",
      importId,
      candidates: candidates.map((entry) => stagedCandidateSummarySchema.parse({
        candidateId: entry.candidate.candidateId,
        originalName: entry.originalName,
        briefId: null,
        fileRole: null,
        mediaType: entry.mediaType,
        width: entry.width,
        height: entry.height,
        stagingState: entry.candidate.stagingState,
        checks: entry.candidate.checks,
      })),
      expectedRoles: exchange.job.briefs.flatMap((brief) => brief.expectedFiles.map((fileRole) => ({briefId: brief.id, requirementId: brief.requirementId, entityName: brief.entity.name, fileRole}))),
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
      const roleKey = `${assignment.briefId}:${assignment.fileRole}`;
      if (usedRoles.has(roleKey)) throw new Error(`Output role ${assignment.fileRole} was assigned more than once for ${brief.entity.name}.`);
      usedRoles.add(roleKey);
    }

    const assets = request.assignments.map((assignment) => {
      const entry = candidateById.get(assignment.candidateId)!;
      return {
        candidateId: entry.candidate.candidateId,
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
    await writeFile(join(looseImport.stagingRoot, "candidate-bundle.json"), `${JSON.stringify(bundle, null, 2)}\n`, {encoding: "utf8", mode: 0o600, flag: "wx"});
    const missingRoleCount = looseImport.exchange.job.briefs.reduce((count, brief) => count + brief.expectedFiles.filter((fileRole) => !usedRoles.has(`${brief.id}:${fileRole}`)).length, 0);
    const candidates = request.assignments.map((assignment) => {
      const entry = candidateById.get(assignment.candidateId)!;
      return stagedCandidateSummarySchema.parse({candidateId: entry.candidate.candidateId, originalName: entry.originalName, briefId: assignment.briefId, fileRole: assignment.fileRole, mediaType: entry.mediaType, width: entry.width, height: entry.height, stagingState: entry.candidate.stagingState, checks: entry.candidate.checks});
    });
    await writeExchangeState(looseImport.exchange, "staged", request.importId);
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
    const missingRoleCount = exchange.job.briefs.reduce((count, brief) => {
      const returnedRoles = new Set(bundle.assets.filter((asset) => asset.briefId === brief.id).map((asset) => asset.fileRole));
      return count + brief.expectedFiles.filter((role) => !returnedRoles.has(role)).length;
    }, 0);
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
    await writeExchangeState(exchange, "staged", importId);
    return stageCandidateBundleResultSchema.parse({
      status: "staged",
      importId,
      stagedCount: staged.length,
      needsManualMaskCount: staged.filter((candidate) => candidate.stagingState === "staged-needs-mask").length,
      missingRoleCount,
      candidates: staged.map((candidate) => {
        const asset = bundle.assets.find((entry) => entry.candidateId === candidate.candidateId);
        if (!asset) throw new Error(`Staged candidate ${candidate.candidateId} is missing from its bundle.`);
        return stagedCandidateSummarySchema.parse({candidateId: candidate.candidateId, originalName: basename(asset.relativeFile), briefId: asset.briefId, fileRole: asset.fileRole, mediaType: asset.mediaType, width: asset.width, height: asset.height, stagingState: candidate.stagingState, checks: candidate.checks});
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
  await rehydrateGenerationExchangeRegistry();
  await createWindow();
  app.on("activate", async () => {
    if (BrowserWindow.getAllWindows().length === 0) await createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
