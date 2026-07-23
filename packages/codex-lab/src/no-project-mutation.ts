import { createHash } from "node:crypto";
import {
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, relative } from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import type { AppServerClient } from "./app-server";
import { CodexLabError, type CodexLabErrorCode } from "./errors";
import {
  assertE1Wp4FailureGate,
  serializeE1Wp4FailureGateReceipt,
} from "./failure-gate";
import {
  E1_MCP_SERVER_NAME,
  createE1McpSceneContextServer,
} from "./mcp-scene-context";
import { runE1ProposalRoundTrip } from "./proposal-roundtrip";
import { redactForReceipt } from "./redaction";

const DECOY_FILES = {
  ".git/HEAD": "ref: refs/heads/private-launch\n",
  ".git/refs/heads/private-launch": "decoy-commit\n",
  "project.json": '{"id":"decoy-project","saved":true}\n',
  "scenes/scene.json": '{"id":"decoy-scene","revision":7}\n',
} as const;

type FailureClientMode =
  | "signed-out"
  | "auth-revoked"
  | "offline"
  | "usage-limited"
  | "protocol-incompatible"
  | "mcp-startup-failed"
  | "turn-start-failed";

type FailureExercise = {
  id: string;
  expectedCode: CodexLabErrorCode;
  observedCode: CodexLabErrorCode;
  clientClosed: boolean | null;
};

const verifiedRuntime = {
  executablePath: "pinned-codex.exe",
  executableSha256: "deterministic-e1-wp4-fixture",
  packageVersion: "0.144.1",
  cliVersion: "codex-cli 0.144.1",
  protocolSha256: "deterministic-e1-wp4-protocol",
};

async function listTreeEntries(
  root: string,
  current = root,
): Promise<string[]> {
  const entries: string[] = [];
  for (const entry of await readdir(current, { withFileTypes: true })) {
    const path = join(current, entry.name);
    const relativePath = relative(root, path).replaceAll("\\", "/");
    if (entry.isDirectory()) {
      entries.push(`${relativePath}/`);
      entries.push(...(await listTreeEntries(root, path)));
    } else if (entry.isFile()) entries.push(relativePath);
    else entries.push(`${relativePath}:non-file`);
  }
  return entries.sort();
}

export async function createE1Wp4TreeSnapshot(root: string): Promise<{
  sha256: string;
  entries: string[];
}> {
  const entries = await listTreeEntries(root);
  const hash = createHash("sha256");
  for (const relativePath of entries) {
    hash.update(relativePath);
    hash.update("\0");
    if (!relativePath.endsWith("/") && !relativePath.endsWith(":non-file")) {
      hash.update(await readFile(join(root, relativePath)));
    }
    hash.update("\0");
  }
  return { sha256: hash.digest("hex"), entries };
}

async function loadExactMcpStatus(): Promise<unknown> {
  const server = await createE1McpSceneContextServer();
  const client = new Client(
    { name: "storystage-e1-wp4-mutation-proof", version: "1.0.0" },
    { capabilities: {} },
  );
  const [clientTransport, serverTransport] =
    InMemoryTransport.createLinkedPair();
  await server.connect(serverTransport);
  await client.connect(clientTransport);
  try {
    const [{ tools }, { resources }, { resourceTemplates }] = await Promise.all(
      [
        client.listTools(),
        client.listResources(),
        client.listResourceTemplates(),
      ],
    );
    return {
      data: [
        {
          name: E1_MCP_SERVER_NAME,
          authStatus: "unsupported",
          serverInfo: {
            name: "storystage-e1-synthetic-scene",
            version: "1.0.0",
          },
          tools: Object.fromEntries(tools.map((tool) => [tool.name, tool])),
          resources,
          resourceTemplates,
        },
      ],
      nextCursor: null,
    };
  } finally {
    await client.close();
    await server.close();
  }
}

function createFailureClient(
  mode: FailureClientMode,
  codexHome: string,
  exactMcpStatus: unknown,
): { client: AppServerClient; wasClosed: () => boolean } {
  let closed = false;
  const notificationRejectors = new Set<(error: Error) => void>();
  const request = async (method: string): Promise<unknown> => {
    if (method === "initialize") {
      if (mode === "protocol-incompatible") return { userAgent: "test" };
      return {
        userAgent: "test",
        codexHome,
        platformFamily: "windows",
        platformOs: "windows",
      };
    }
    if (method === "account/read") {
      if (mode === "signed-out") {
        return { account: null, requiresOpenaiAuth: true };
      }
      if (mode === "auth-revoked") {
        throw new CodexLabError(
          "AUTH_REVOKED",
          "The official ChatGPT sign-in has expired or was revoked.",
          "revoked-or-expired",
        );
      }
      if (mode === "offline") {
        throw new CodexLabError(
          "OFFLINE",
          "The Codex App Server could not reach the account service.",
          "offline",
        );
      }
      return {
        account: { type: "chatgpt", email: null, planType: "pro" },
        requiresOpenaiAuth: false,
      };
    }
    if (method === "account/rateLimits/read") {
      return {
        rateLimits: {
          rateLimitReachedType: mode === "usage-limited" ? "primary" : null,
        },
        rateLimitsByLimitId: null,
      };
    }
    if (method === "mcpServerStatus/list") {
      if (mode === "mcp-startup-failed") {
        throw new CodexLabError(
          "MCP_STARTUP_FAILED",
          "The bounded StoryStage MCP server did not start.",
        );
      }
      return exactMcpStatus;
    }
    if (method === "thread/start") return { thread: { id: "thread-wp4" } };
    if (method === "turn/start") {
      throw new CodexLabError(
        "PROTOCOL_REQUEST_FAILED",
        "The deterministic turn-start failure fixture stopped visibly.",
      );
    }
    throw new Error(`Unexpected E1-WP4 mutation-proof request: ${method}`);
  };
  const client = {
    request,
    notify: () => undefined,
    subscribeInbound: () => () => undefined,
    waitForNotification: () =>
      new Promise<never>((_resolve, reject) => {
        notificationRejectors.add(reject);
      }),
    waitForExit: () => new Promise<never>(() => undefined),
    close: async () => {
      closed = true;
      const error = new CodexLabError(
        "APP_SERVER_CRASHED",
        "The deterministic fixture closed before a notification arrived.",
        "crashed",
      );
      for (const reject of notificationRejectors) reject(error);
      notificationRejectors.clear();
    },
  } as unknown as AppServerClient;
  return { client, wasClosed: () => closed };
}

function observedCode(error: unknown): CodexLabErrorCode {
  if (error instanceof CodexLabError) return error.code;
  throw error;
}

async function runFailureExercises(root: string): Promise<FailureExercise[]> {
  const codexHome = join(root, "codex-home");
  const workspaceRoot = join(root, "lab-workspaces");
  await mkdir(codexHome, { recursive: true });
  await mkdir(workspaceRoot, { recursive: true });
  const exactMcpStatus = await loadExactMcpStatus();
  const cases: Array<{
    id: string;
    expectedCode: CodexLabErrorCode;
    mode?: FailureClientMode;
    aborted?: boolean;
    runtimeFailure?: boolean;
  }> = [
    {
      id: "runtime-not-installed",
      expectedCode: "RUNTIME_NOT_INSTALLED",
      runtimeFailure: true,
    },
    {
      id: "operation-cancelled",
      expectedCode: "OPERATION_CANCELLED",
      aborted: true,
    },
    { id: "signed-out", expectedCode: "AUTH_REQUIRED", mode: "signed-out" },
    { id: "auth-revoked", expectedCode: "AUTH_REVOKED", mode: "auth-revoked" },
    { id: "offline", expectedCode: "OFFLINE", mode: "offline" },
    {
      id: "usage-limited",
      expectedCode: "USAGE_LIMITED",
      mode: "usage-limited",
    },
    {
      id: "protocol-incompatible",
      expectedCode: "PROTOCOL_INCOMPATIBLE",
      mode: "protocol-incompatible",
    },
    {
      id: "mcp-startup-failed",
      expectedCode: "MCP_STARTUP_FAILED",
      mode: "mcp-startup-failed",
    },
    {
      id: "turn-start-failed",
      expectedCode: "PROTOCOL_REQUEST_FAILED",
      mode: "turn-start-failed",
    },
  ];
  const exercises: FailureExercise[] = [];
  for (const scenario of cases) {
    const controller = new AbortController();
    if (scenario.aborted) controller.abort();
    const launchedFixtures: Array<ReturnType<typeof createFailureClient>> = [];
    try {
      await runE1ProposalRoundTrip({
        signal: controller.signal,
        verifyRuntime: async () => {
          if (scenario.runtimeFailure) {
            throw new CodexLabError(
              "RUNTIME_NOT_INSTALLED",
              "The pinned Codex runtime is not installed.",
              "not-installed",
            );
          }
          return verifiedRuntime;
        },
        prepareCodexHome: async () => codexHome,
        createWorkspace: async () => mkdtemp(join(workspaceRoot, "run-")),
        launch: (_executablePath, launchedCodexHome) => {
          if (!scenario.mode) throw new Error("This scenario must not launch.");
          const fixture = createFailureClient(
            scenario.mode,
            launchedCodexHome,
            exactMcpStatus,
          );
          launchedFixtures.push(fixture);
          return fixture.client;
        },
      });
      throw new Error(`Failure exercise unexpectedly passed: ${scenario.id}`);
    } catch (error) {
      const code = observedCode(error);
      if (code !== scenario.expectedCode) {
        throw new Error(
          `${scenario.id} returned ${code}; expected ${scenario.expectedCode}.`,
        );
      }
      const fixture = launchedFixtures[0];
      if (fixture && !fixture.wasClosed()) {
        throw new Error(`${scenario.id} did not close its App Server client.`);
      }
      exercises.push({
        id: scenario.id,
        expectedCode: scenario.expectedCode,
        observedCode: code,
        clientClosed: fixture ? fixture.wasClosed() : null,
      });
    }
  }
  return exercises;
}

export async function createE1Wp4NoProjectMutationReceipt() {
  const root = await mkdtemp(join(tmpdir(), "storystage-e1-wp4-tripwire-"));
  const decoyRoot = join(root, "decoy-project");
  try {
    for (const [relativePath, content] of Object.entries(DECOY_FILES)) {
      const path = join(decoyRoot, relativePath);
      await mkdir(dirname(path), { recursive: true });
      await writeFile(path, content, "utf8");
    }
    const before = await createE1Wp4TreeSnapshot(decoyRoot);

    assertE1Wp4FailureGate();
    serializeE1Wp4FailureGateReceipt();
    redactForReceipt({
      prompt: "hostile decoy text",
      projectId: "decoy-project",
    });
    const failureExercises = await runFailureExercises(root);

    const after = await createE1Wp4TreeSnapshot(decoyRoot);
    if (
      before.sha256 !== after.sha256 ||
      before.entries.join("\0") !== after.entries.join("\0")
    ) {
      throw new Error("The E1-WP4 decoy project mutation tripwire changed.");
    }
    return {
      schemaVersion: 3,
      package: "E1-WP4",
      evidenceClass: "deterministic-roundtrip-decoy-project-tripwire",
      scope: "actual-roundtrip-failure-seams-with-sibling-decoy-project",
      decoyEntryCount: before.entries.length,
      decoyDirectoryCount: before.entries.filter((entry) => entry.endsWith("/"))
        .length,
      decoyFileCount: before.entries.filter(
        (entry) => !entry.endsWith("/") && !entry.endsWith(":non-file"),
      ).length,
      decoyEntries: before.entries,
      beforeSha256: before.sha256,
      afterSha256: after.sha256,
      unchanged: true,
      unexpectedFileDetection: true,
      failurePathCount: failureExercises.length,
      failureExercises,
      projectMutationAllowed: false,
      persistedPath: false,
      executableTest:
        "packages/codex-lab/src/no-project-mutation.test.ts :: runs real proposal-roundtrip failure seams beside a byte-identical decoy project",
      limitation:
        "This proves isolated E1 failure seams against a sibling decoy tree; durable production project integration remains outside E1.",
    } as const;
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

export async function serializeE1Wp4NoProjectMutationReceipt(): Promise<string> {
  return `${JSON.stringify(await createE1Wp4NoProjectMutationReceipt(), null, 2)}\n`;
}
