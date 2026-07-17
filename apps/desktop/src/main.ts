import {randomUUID} from "node:crypto";
import {access, realpath} from "node:fs/promises";
import {resolve, sep} from "node:path";
import {pathToFileURL} from "node:url";
import {app, BrowserWindow, ipcMain, shell, utilityProcess} from "electron";
import {
  IPC_CHANNELS,
  canTransitionRenderJob,
  desktopCapabilitiesSchema,
  openRenderedFileResultSchema,
  renderJobEventSchema,
  renderWorkerCommandSchema,
  renderWorkerMessageSchema,
  startRenderRequestSchema,
  startRenderResponseSchema,
  type RenderJobEvent,
} from "@storystage/contracts";

type JobRecord = {
  event: RenderJobEvent;
  phaseProgress: Partial<Record<"bundling" | "rendering", number>>;
};

let mainWindow: BrowserWindow | null = null;
let activeJobId: string | null = null;
const jobRegistry = new Map<string, JobRecord>();
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

ipcMain.handle(IPC_CHANNELS.capabilities, () => desktopCapabilitiesSchema.parse({localRendering: true, openRenderedFile: true}));

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
