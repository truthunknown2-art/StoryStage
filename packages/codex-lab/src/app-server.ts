import {
  execFile,
  spawn,
  type ChildProcessWithoutNullStreams,
} from "node:child_process";
import { join } from "node:path";
import type { Writable } from "node:stream";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { classifyRpcFailure } from "./account-state";
import { CodexLabError } from "./errors";
import { runtimeManifest } from "./runtime-manifest";

const repositoryRoot = fileURLToPath(new URL("../../../", import.meta.url));
const execFileAsync = promisify(execFile);

type JsonRpcId = number | string;
type PendingRequest = {
  method: string;
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
  timeout: NodeJS.Timeout;
};

type NotificationWaiter = {
  resolve: (params: unknown) => void;
  reject: (error: Error) => void;
  timeout: NodeJS.Timeout;
};

export type AppServerInboundMessage =
  | {
      kind: "notification";
      method: string;
      params: unknown;
    }
  | {
      kind: "blocked-request";
      id: JsonRpcId;
      method: string;
      params: unknown;
    };

export type AppServerInboundListener = (
  message: AppServerInboundMessage,
) => void;

export type TranscriptEntry = {
  direction: "client-notification" | "client-request" | "server-notification";
  method: string;
  outcome: "error" | "ok" | "observed" | "sent";
};

type ExitResult = { code: number | null; signal: NodeJS.Signals | null };

function allowlistedEnvironment(): NodeJS.ProcessEnv {
  const allowed = new Set([
    "appdata",
    "codex_home",
    "comspec",
    "homedrive",
    "homepath",
    "localappdata",
    "path",
    "pathext",
    "processor_architecture",
    "systemroot",
    "temp",
    "tmp",
    "username",
    "userprofile",
    "windir",
  ]);
  return Object.fromEntries(
    Object.entries(process.env).filter(([key]) =>
      allowed.has(key.toLowerCase()),
    ),
  );
}

function classifyRpcReason(rawError: unknown) {
  const text = JSON.stringify(rawError).toLowerCase();
  const code =
    rawError && typeof rawError === "object" && "code" in rawError
      ? (rawError as { code?: unknown }).code
      : null;
  if (code === -32602) return "invalid-params" as const;
  if (code === -32601) return "method-not-found" as const;
  if (
    /no active turn|turn.*(?:not active|not running|completed|finished|stopped|terminal)/.test(
      text,
    )
  ) {
    return "turn-not-active" as const;
  }
  if (/turn.*not found|unknown turn/.test(text))
    return "turn-not-found" as const;
  if (/invalid params|invalid request/.test(text))
    return "invalid-params" as const;
  if (/method not found|unknown method/.test(text))
    return "method-not-found" as const;
  return "unclassified" as const;
}

export class AppServerClient {
  private readonly pending = new Map<JsonRpcId, PendingRequest>();
  private readonly notificationWaiters = new Map<
    string,
    NotificationWaiter[]
  >();
  private readonly transcript: TranscriptEntry[] = [];
  private readonly inboundListeners = new Set<AppServerInboundListener>();
  private readonly exitPromise: Promise<ExitResult>;
  private nextId = 1;
  private stdoutBuffer = Buffer.alloc(0);
  private fatalError: CodexLabError | null = null;
  private exitResult: ExitResult | null = null;
  private stderrObserved = false;

  public constructor(
    private readonly child: ChildProcessWithoutNullStreams,
    private readonly options: {
      maxLineBytes?: number;
      requestTimeoutMs?: number;
    } = {},
  ) {
    child.stdout.on("data", (chunk: Buffer | string) => {
      this.consumeStdout(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    });
    child.stderr.on("data", () => {
      this.stderrObserved = true;
    });
    this.exitPromise = new Promise((resolve) => {
      child.once("exit", (code, signal) => {
        const result = { code, signal };
        this.exitResult = result;
        this.rejectAll(
          new CodexLabError(
            "APP_SERVER_CRASHED",
            "The Codex App Server exited before the lifecycle completed.",
            "crashed",
          ),
        );
        resolve(result);
      });
      child.once("error", () => {
        const result = { code: null, signal: null };
        this.exitResult = result;
        this.rejectAll(
          new CodexLabError(
            "APP_SERVER_CRASHED",
            "The Codex App Server process failed.",
            "crashed",
          ),
        );
        resolve(result);
      });
    });
  }

  public getTranscript(): readonly TranscriptEntry[] {
    return this.transcript;
  }

  public didObserveStderr(): boolean {
    return this.stderrObserved;
  }

  /**
   * Observes inbound messages in JSONL arrival order. The listener is registered
   * synchronously so callers can subscribe before starting a turn and cannot
   * miss early streaming notifications.
   */
  public subscribeInbound(listener: AppServerInboundListener): () => void {
    this.inboundListeners.add(listener);
    return () => this.inboundListeners.delete(listener);
  }

  public async request<T>(
    method: string,
    params: unknown,
    timeoutMs = this.options.requestTimeoutMs ?? 15_000,
  ): Promise<T> {
    if (this.fatalError) throw this.fatalError;
    if (this.exitResult) {
      throw new CodexLabError(
        "APP_SERVER_CRASHED",
        "The Codex App Server is not running.",
        "crashed",
      );
    }
    const id = this.nextId++;
    const response = new Promise<T>((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pending.delete(id);
        this.transcript.push({
          direction: "client-request",
          method,
          outcome: "error",
        });
        reject(
          new CodexLabError(
            "APP_SERVER_TIMEOUT",
            `The Codex App Server did not answer ${method} in time.`,
            "offline",
          ),
        );
      }, timeoutMs);
      this.pending.set(id, {
        method,
        resolve: resolve as (value: unknown) => void,
        reject,
        timeout,
      });
    });
    this.write({ jsonrpc: "2.0", id, method, params });
    return response;
  }

  public notify(method: string, params: unknown): void {
    if (this.fatalError) throw this.fatalError;
    this.write({ jsonrpc: "2.0", method, params });
    this.transcript.push({
      direction: "client-notification",
      method,
      outcome: "sent",
    });
  }

  public waitForNotification(
    method: string,
    timeoutMs = this.options.requestTimeoutMs ?? 15_000,
  ): Promise<unknown> {
    if (this.fatalError) return Promise.reject(this.fatalError);
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        const remaining = (this.notificationWaiters.get(method) ?? []).filter(
          (waiter) => waiter.resolve !== resolve,
        );
        if (remaining.length > 0)
          this.notificationWaiters.set(method, remaining);
        else this.notificationWaiters.delete(method);
        reject(
          new CodexLabError(
            "APP_SERVER_TIMEOUT",
            `The Codex App Server did not emit ${method} in time.`,
            "incompatible",
          ),
        );
      }, timeoutMs);
      const waiters = this.notificationWaiters.get(method) ?? [];
      waiters.push({ resolve, reject, timeout });
      this.notificationWaiters.set(method, waiters);
    });
  }

  public async close(timeoutMs = 5_000): Promise<void> {
    if (this.exitResult) {
      if (this.exitResult.code !== 0) {
        throw new CodexLabError(
          "APP_SERVER_CRASHED",
          "The Codex App Server exited unexpectedly.",
          "crashed",
        );
      }
      return;
    }
    this.child.stdin.end();
    const timedOut = Symbol("timeout");
    const result = await Promise.race([
      this.exitPromise,
      new Promise<typeof timedOut>((resolve) =>
        setTimeout(() => resolve(timedOut), timeoutMs),
      ),
    ]);
    if (result === timedOut) {
      this.child.kill();
      throw new CodexLabError(
        "APP_SERVER_TIMEOUT",
        "The Codex App Server did not shut down cleanly.",
        "crashed",
      );
    }
    if (result.code !== 0) {
      throw new CodexLabError(
        "APP_SERVER_CRASHED",
        "The Codex App Server returned a nonzero exit code.",
        "crashed",
      );
    }
  }

  private write(message: unknown): void {
    const accepted = this.child.stdin.write(`${JSON.stringify(message)}\n`);
    if (!accepted && (this.child.stdin as Writable).destroyed) {
      throw new CodexLabError(
        "APP_SERVER_CRASHED",
        "The Codex App Server input stream is closed.",
        "crashed",
      );
    }
  }

  private consumeStdout(chunk: Buffer): void {
    if (this.fatalError) return;
    this.stdoutBuffer = Buffer.concat([this.stdoutBuffer, chunk]);
    const limit = this.options.maxLineBytes ?? 2_000_000;
    while (true) {
      const newline = this.stdoutBuffer.indexOf(0x0a);
      if (newline < 0) {
        if (this.stdoutBuffer.length > limit) {
          this.failProtocol(
            new CodexLabError(
              "OUTPUT_LIMIT_EXCEEDED",
              "The Codex App Server emitted an oversized JSONL record.",
              "incompatible",
            ),
          );
        }
        return;
      }
      const line = this.stdoutBuffer.subarray(0, newline);
      this.stdoutBuffer = this.stdoutBuffer.subarray(newline + 1);
      if (line.length > limit) {
        this.failProtocol(
          new CodexLabError(
            "OUTPUT_LIMIT_EXCEEDED",
            "The Codex App Server emitted an oversized JSONL record.",
            "incompatible",
          ),
        );
        return;
      }
      if (line.length === 0) continue;
      this.consumeLine(line.toString("utf8"));
      if (this.fatalError) return;
    }
  }

  private consumeLine(line: string): void {
    let message: Record<string, unknown>;
    try {
      const parsed: unknown = JSON.parse(line);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        throw new Error("not an object");
      }
      message = parsed as Record<string, unknown>;
    } catch {
      this.failProtocol(
        new CodexLabError(
          "MALFORMED_JSON",
          "The Codex App Server emitted malformed JSONL.",
          "incompatible",
        ),
      );
      return;
    }

    if (
      (typeof message.id === "number" || typeof message.id === "string") &&
      ("result" in message || "error" in message)
    ) {
      const pending = this.pending.get(message.id);
      if (!pending) return;
      clearTimeout(pending.timeout);
      this.pending.delete(message.id);
      if ("error" in message) {
        this.transcript.push({
          direction: "client-request",
          method: pending.method,
          outcome: "error",
        });
        pending.reject(
          new CodexLabError(
            "PROTOCOL_REQUEST_FAILED",
            `The Codex App Server rejected ${pending.method}.`,
            classifyRpcFailure(pending.method, message.error),
            classifyRpcReason(message.error),
            message.error &&
              typeof message.error === "object" &&
              "code" in message.error &&
              typeof (message.error as { code?: unknown }).code === "number"
              ? (message.error as { code: number }).code
              : undefined,
          ),
        );
      } else {
        this.transcript.push({
          direction: "client-request",
          method: pending.method,
          outcome: "ok",
        });
        pending.resolve(message.result);
      }
      return;
    }

    if (typeof message.method === "string") {
      if (typeof message.id === "number" || typeof message.id === "string") {
        this.publishInbound({
          kind: "blocked-request",
          id: message.id,
          method: message.method,
          params: message.params,
        });
        this.write({
          jsonrpc: "2.0",
          id: message.id,
          error: { code: -32601, message: "Client request is not supported." },
        });
      } else {
        this.publishInbound({
          kind: "notification",
          method: message.method,
          params: message.params,
        });
        this.transcript.push({
          direction: "server-notification",
          method: message.method,
          outcome: "observed",
        });
        const waiter = this.notificationWaiters.get(message.method)?.shift();
        if (waiter) {
          clearTimeout(waiter.timeout);
          waiter.resolve(message.params);
          if (this.notificationWaiters.get(message.method)?.length === 0) {
            this.notificationWaiters.delete(message.method);
          }
        }
      }
      return;
    }

    this.failProtocol(
      new CodexLabError(
        "PROTOCOL_INCOMPATIBLE",
        "The Codex App Server emitted an unknown JSON-RPC message.",
        "incompatible",
      ),
    );
  }

  private publishInbound(message: AppServerInboundMessage): void {
    for (const listener of this.inboundListeners) listener(message);
  }

  private failProtocol(error: CodexLabError): void {
    this.fatalError = error;
    this.rejectAll(error);
    this.child.kill();
  }

  private rejectAll(error: CodexLabError): void {
    for (const pending of this.pending.values()) {
      clearTimeout(pending.timeout);
      pending.reject(error);
    }
    this.pending.clear();
    for (const waiters of this.notificationWaiters.values()) {
      for (const waiter of waiters) {
        clearTimeout(waiter.timeout);
        waiter.reject(error);
      }
    }
    this.notificationWaiters.clear();
  }
}

export function launchAppServer(executablePath: string): AppServerClient {
  const child = spawn(executablePath, runtimeManifest.serverArgs, {
    env: allowlistedEnvironment(),
    stdio: "pipe",
    windowsHide: true,
  });
  return new AppServerClient(child);
}

function tomlString(value: string): string {
  return JSON.stringify(value.replaceAll("\\", "/"));
}

function tomlBareKey(value: string): string {
  if (!value || value.length > 128 || !/^[A-Za-z0-9_-]+$/.test(value)) {
    throw new CodexLabError(
      "PROTOCOL_INCOMPATIBLE",
      "The configured MCP inventory contained an invalid server name.",
      "incompatible",
    );
  }
  return value;
}

export function getE1ProposalAppServerArgs(
  configuredServerNames: readonly string[] = [],
): readonly string[] {
  return [
    "app-server",
    ...getE1DisabledCapabilityArgs(),
    ...getE1McpConfigArgs(configuredServerNames),
    "--stdio",
  ];
}

function getE1McpConfigArgs(
  configuredServerNames: readonly string[],
): readonly string[] {
  const tsxCli = join(repositoryRoot, "node_modules", "tsx", "dist", "cli.mjs");
  const mcpCli = join(
    repositoryRoot,
    "packages",
    "codex-lab",
    "src",
    "mcp-cli.ts",
  );
  const fixedStoryStage = [
    "-c",
    `mcp_servers.storystage_e1.command=${tomlString(process.execPath)}`,
    "-c",
    `mcp_servers.storystage_e1.args=[${tomlString(tsxCli)},${tomlString(mcpCli)}]`,
    "-c",
    `mcp_servers.storystage_e1.cwd=${tomlString(repositoryRoot)}`,
    "-c",
    "mcp_servers.storystage_e1.enabled=true",
  ];
  const disabledInherited = configuredServerNames
    .filter((name) => name !== "storystage_e1")
    .flatMap((name) => [
      "-c",
      `mcp_servers.${tomlBareKey(name)}.enabled=false`,
    ]);
  return [...fixedStoryStage, ...disabledInherited];
}

function getE1DisabledCapabilityArgs(): readonly string[] {
  return [
    "apps",
    "browser_use",
    "computer_use",
    "goals",
    "image_generation",
    "memories",
    "multi_agent",
    "plugins",
    "shell_tool",
  ].flatMap((feature) => ["--disable", feature]);
}

type ConfiguredMcpServer = { name: string; enabled: boolean };

async function readConfiguredMcpServers(
  executablePath: string,
  configArgs: readonly string[] = [],
): Promise<readonly ConfiguredMcpServer[]> {
  let stdout: string;
  try {
    const result = await execFileAsync(
      executablePath,
      [...configArgs, "mcp", "list", "--json"],
      {
        encoding: "utf8",
        env: allowlistedEnvironment(),
        maxBuffer: 256 * 1024,
        timeout: 10_000,
        windowsHide: true,
      },
    );
    stdout = result.stdout;
  } catch {
    throw new CodexLabError(
      "PROTOCOL_INCOMPATIBLE",
      "The pinned Codex runtime could not enumerate MCP isolation inputs.",
      "incompatible",
    );
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(stdout);
  } catch {
    throw new CodexLabError(
      "PROTOCOL_INCOMPATIBLE",
      "The pinned Codex runtime returned an invalid MCP inventory.",
      "incompatible",
    );
  }
  if (
    !Array.isArray(parsed) ||
    !parsed.every(
      (entry) =>
        entry &&
        typeof entry === "object" &&
        "name" in entry &&
        typeof entry.name === "string" &&
        "enabled" in entry &&
        typeof entry.enabled === "boolean",
    )
  ) {
    throw new CodexLabError(
      "PROTOCOL_INCOMPATIBLE",
      "The pinned Codex runtime returned an incompatible MCP inventory.",
      "incompatible",
    );
  }
  return parsed.map((entry) => ({
    name: entry.name,
    enabled: entry.enabled,
  }));
}

export async function listConfiguredMcpServerNames(
  executablePath: string,
): Promise<readonly string[]> {
  return (
    await readConfiguredMcpServers(
      executablePath,
      getE1DisabledCapabilityArgs(),
    )
  ).map((entry) => entry.name);
}

export async function verifyE1McpIsolation(
  executablePath: string,
  configuredServerNames: readonly string[],
): Promise<void> {
  const effective = await readConfiguredMcpServers(executablePath, [
    ...getE1DisabledCapabilityArgs(),
    ...getE1McpConfigArgs(configuredServerNames),
  ]);
  const enabled = effective.filter((entry) => entry.enabled);
  if (
    enabled.length !== 1 ||
    enabled[0]?.name !== "storystage_e1" ||
    effective.some(
      (entry) =>
        entry.name !== "storystage_e1" &&
        !configuredServerNames.includes(entry.name),
    )
  ) {
    throw new CodexLabError(
      "PROTOCOL_INCOMPATIBLE",
      "The pinned Codex runtime could not prove an isolated StoryStage MCP inventory.",
      "incompatible",
    );
  }
}

/** Launches the pinned App Server with one replacement MCP inventory. */
export function launchE1ProposalAppServer(
  executablePath: string,
  configuredServerNames: readonly string[] = [],
): AppServerClient {
  const child = spawn(
    executablePath,
    getE1ProposalAppServerArgs(configuredServerNames),
    {
      env: allowlistedEnvironment(),
      stdio: "pipe",
      windowsHide: true,
    },
  );
  return new AppServerClient(child);
}
