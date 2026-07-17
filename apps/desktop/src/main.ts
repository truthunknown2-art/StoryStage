import {randomUUID} from "node:crypto";
import {access, lstat, mkdir, readFile, realpath, writeFile} from "node:fs/promises";
import {join, resolve, sep} from "node:path";
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
  openRenderedFileResultSchema,
  renderJobEventSchema,
  renderWorkerCommandSchema,
  renderWorkerMessageSchema,
  startRenderRequestSchema,
  startRenderResponseSchema,
  stageCandidateBundleRequestSchema,
  stageCandidateBundleResultSchema,
  type RenderJobEvent,
} from "@storystage/contracts";
import {
  candidateBundleSchema,
  finalizeGenerationJob,
  generationJobDraftSchema,
  preparedCandidateSchema,
  type GenerationJob,
  type PreparedCandidate,
} from "@storystage/story-engine";

type JobRecord = {
  event: RenderJobEvent;
  phaseProgress: Partial<Record<"bundling" | "rendering", number>>;
};

let mainWindow: BrowserWindow | null = null;
let activeJobId: string | null = null;
const jobRegistry = new Map<string, JobRecord>();
const generationExchangeRegistry = new Map<string, {job: GenerationJob; jobFile: string}>();
const workspaceRoot = app.isPackaged ? app.getAppPath() : resolve(__dirname, "../../..");
const terminalStatuses = new Set<RenderJobEvent["status"]>(["completed", "failed"]);

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

function prepareCandidateBundleInWorker(sourceRoot: string, stagingRoot: string, bundle: unknown): Promise<PreparedCandidate[]> {
  return new Promise((resolvePreparation, rejectPreparation) => {
    const workerEntry = app.isPackaged
      ? resolve(process.resourcesPath, "asset-worker/asset-worker.cjs")
      : resolve(workspaceRoot, "apps/asset-worker/dist/asset-worker.cjs");
    const requestId = `prepare-${randomUUID().replaceAll("-", "").slice(0, 16)}`;
    const worker = utilityProcess.fork(workerEntry, [], {
      cwd: workspaceRoot,
      serviceName: "StoryStage Asset Preparation Worker",
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
    const timeout = setTimeout(() => finish(() => rejectPreparation(new Error("Asset preparation exceeded the 30-second safety timeout."))), 30_000);

    worker.on("spawn", () => {
      worker.postMessage(assetWorkerCommandSchema.parse({
        type: "prepare-candidate-bundle",
        requestId,
        sourceRoot,
        stagingRoot,
        serializedBundle: JSON.stringify(bundle),
      }));
    });
    worker.on("message", (rawMessage: unknown) => {
      const message = assetWorkerMessageSchema.safeParse(rawMessage);
      if (!message.success) {
        finish(() => rejectPreparation(new Error("The asset worker returned an invalid message envelope.")));
        return;
      }
      if (message.data.requestId !== requestId) {
        finish(() => rejectPreparation(new Error("The asset worker returned a mismatched request identity.")));
        return;
      }
      if (message.data.type === "failed") {
        const failure = message.data;
        finish(() => rejectPreparation(new Error(`${failure.error.code}: ${failure.error.message}`)));
        return;
      }
      try {
        const prepared = preparedCandidateSchema.array().parse(JSON.parse(message.data.serializedPreparedCandidates));
        finish(() => resolvePreparation(prepared));
      } catch {
        finish(() => rejectPreparation(new Error("The asset worker returned invalid prepared-candidate data.")));
      }
    });
    worker.on("error", (_type, location) => finish(() => rejectPreparation(new Error(`The asset worker crashed at ${location || "an unknown location"}.`))));
    worker.on("exit", (code) => {
      if (!settled) finish(() => rejectPreparation(new Error(`The asset worker exited unexpectedly with code ${code}.`)));
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
    generationExchangeRegistry.set(jobId, {job: generationJob, jobFile});
    shell.showItemInFolder(jobFile);
    return exportGenerationJobResultSchema.parse({ok: true, jobId, briefCount: generationJob.briefs.length});
  } catch (error) {
    return exportGenerationJobResultSchema.parse({
      ok: false,
      error: {code: "INVALID_GENERATION_JOB", message: error instanceof Error ? error.message : "The generation job could not be exported."},
    });
  }
});

ipcMain.handle(IPC_CHANNELS.stageCandidateBundle, async (_event, rawRequest: unknown) => {
  try {
    const request = stageCandidateBundleRequestSchema.parse(rawRequest);
    const exchange = generationExchangeRegistry.get(request.exchangeJobId);
    if (!exchange) throw new Error("This exchange job is unknown or belongs to a previous StoryStage session. Export a fresh immutable job before importing results.");
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
    const stagingRoot = join(
      app.getPath("userData"),
      ".storystage-local",
      "jobs",
      "inbox",
      exchange.job.production.id,
      `r${exchange.job.production.revision}`,
      importId,
    );
    const prepared = await prepareCandidateBundleInWorker(sourceRoot, stagingRoot, bundle);
    return stageCandidateBundleResultSchema.parse({
      status: "prepared",
      importId,
      preparedCount: prepared.length,
      needsManualMaskCount: prepared.filter((candidate) => candidate.preparationState === "needs-manual-mask").length,
      missingRoleCount,
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
  await createWindow();
  app.on("activate", async () => {
    if (BrowserWindow.getAllWindows().length === 0) await createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
