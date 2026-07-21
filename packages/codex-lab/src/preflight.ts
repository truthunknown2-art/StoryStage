import { mkdir, mkdtemp, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import type { ZodType } from "zod";
import { classifyAccountState, classifyFailure } from "./account-state";
import { launchAppServer, type AppServerClient } from "./app-server";
import { CodexLabError, type PreflightState } from "./errors";
import {
  accountResponseSchema,
  initializeResponseSchema,
  modelListResponseSchema,
  rateLimitsResponseSchema,
  threadStartResponseSchema,
  turnStartResponseSchema,
  turnStartedNotificationSchema,
  usageResponseSchema,
} from "./protocol-schemas";
import {
  assertReceiptContainsNoSensitiveFragments,
  redactForReceipt,
} from "./redaction";
import { runtimeManifest } from "./runtime-manifest";
import { verifyPinnedRuntime, type VerifiedRuntime } from "./runtime";

const repositoryRoot = fileURLToPath(new URL("../../../", import.meta.url));
const evidenceRoot = resolve(repositoryRoot, "reports", "evidence", "E1-WP1");
const defaultReceiptPath = join(evidenceRoot, "runtime-receipt.json");
const probePrompt =
  "Write a detailed ten-part explanation of animation timing. Begin immediately and do not use any tool.";

export type PreflightReceipt = {
  schemaVersion: 1;
  package: "E1-WP1";
  result: "action-required" | "fail" | "pass";
  observedAt: string;
  runtime: {
    platform: "windows-x64";
    packageVersion: string;
    cliVersion: string;
    nativeExecutableSha256: string;
    protocolSha256: string;
  };
  accountState: PreflightState;
  observations: {
    accountReadable: boolean;
    modelCatalogReadable: boolean;
    modelCount: number | null;
    rateLimitsReadable: boolean;
    usageReadable: boolean;
    usageLimited: boolean | null;
    ephemeralThreadStarted: boolean;
    turnStarted: boolean;
    turnInterruptAccepted: boolean;
    cleanShutdown: boolean;
    isolatedWorkspaceUnchanged: boolean;
    stderrObserved: boolean;
  };
  officialAuthLifecycle: {
    owner: "Codex";
    supportedMode: "Sign in with ChatGPT";
    schemaMethodsObserved: [
      "account/login/start",
      "account/login/cancel",
      "account/logout",
    ];
    currentSessionMutation: "not-performed-existing-session-preserved";
  };
  clientLifecycleTranscript: Array<{
    method: string;
    outcome: "error" | "ok" | "sent";
  }>;
  protocolTranscript: Array<{
    direction: "client-notification" | "client-request" | "server-notification";
    method: string;
    outcome: "error" | "observed" | "ok" | "sent";
  }>;
  privacy: {
    rawPayloadsPersisted: false;
    promptsPersisted: false;
    accountIdentifiersPersisted: false;
    tokensPersisted: false;
    localCodexStatePersisted: false;
  };
  risks: Array<{
    code: "APP_SERVER_COMMAND_EXPERIMENTAL";
    blocksProductionPackaging: true;
    summary: string;
  }>;
  failure: {
    code: string;
    state: PreflightState;
    reason: string | null;
    rpcCode: number | null;
  } | null;
};

type ObservationState = PreflightReceipt["observations"];

function emptyObservations(): ObservationState {
  return {
    accountReadable: false,
    modelCatalogReadable: false,
    modelCount: null,
    rateLimitsReadable: false,
    usageReadable: false,
    usageLimited: null,
    ephemeralThreadStarted: false,
    turnStarted: false,
    turnInterruptAccepted: false,
    cleanShutdown: false,
    isolatedWorkspaceUnchanged: false,
    stderrObserved: false,
  };
}

function parseResponse<T>(
  schema: ZodType<T>,
  value: unknown,
  method: string,
): T {
  const parsed = schema.safeParse(value);
  if (!parsed.success) {
    throw new CodexLabError(
      "PROTOCOL_INCOMPATIBLE",
      `The Codex App Server returned an incompatible ${method} response.`,
      "incompatible",
    );
  }
  return parsed.data;
}

function resolveReceiptPath(input?: string): string {
  const candidate = input ? resolve(repositoryRoot, input) : defaultReceiptPath;
  const fromEvidenceRoot = relative(evidenceRoot, candidate);
  if (
    isAbsolute(fromEvidenceRoot) ||
    fromEvidenceRoot === ".." ||
    fromEvidenceRoot.startsWith(`..${sep}`)
  ) {
    throw new CodexLabError(
      "WRITE_FAILED",
      "The receipt path must stay inside reports/evidence/E1-WP1.",
      "incompatible",
    );
  }
  return candidate;
}

function makeReceipt(input: {
  runtime: VerifiedRuntime | null;
  accountState: PreflightState;
  observations: ObservationState;
  client: AppServerClient | null;
  failure: CodexLabError | null;
  observedAt: string;
}): PreflightReceipt {
  const authenticated = input.accountState === "authenticated";
  const pass =
    authenticated &&
    input.observations.accountReadable &&
    input.observations.modelCatalogReadable &&
    input.observations.rateLimitsReadable &&
    input.observations.usageReadable &&
    input.observations.ephemeralThreadStarted &&
    input.observations.turnStarted &&
    input.observations.turnInterruptAccepted &&
    input.observations.cleanShutdown &&
    input.observations.isolatedWorkspaceUnchanged &&
    !input.failure;
  const actionRequired = input.accountState === "signed-out" && !input.failure;
  return {
    schemaVersion: 1,
    package: "E1-WP1",
    result: pass ? "pass" : actionRequired ? "action-required" : "fail",
    observedAt: input.observedAt,
    runtime: {
      platform: "windows-x64",
      packageVersion:
        input.runtime?.packageVersion ?? runtimeManifest.packageVersion,
      cliVersion: input.runtime?.cliVersion ?? runtimeManifest.cliVersion,
      nativeExecutableSha256:
        input.runtime?.executableSha256 ?? runtimeManifest.nativeBinarySha256,
      protocolSha256:
        input.runtime?.protocolSha256 ?? runtimeManifest.protocolSha256,
    },
    accountState: input.accountState,
    observations: input.observations,
    officialAuthLifecycle: {
      owner: "Codex",
      supportedMode: "Sign in with ChatGPT",
      schemaMethodsObserved: [
        "account/login/start",
        "account/login/cancel",
        "account/logout",
      ],
      currentSessionMutation: "not-performed-existing-session-preserved",
    },
    clientLifecycleTranscript: (input.client?.getTranscript() ?? [])
      .filter((entry) => entry.direction !== "server-notification")
      .map((entry) => ({
        method: entry.method,
        outcome: entry.outcome === "observed" ? "ok" : entry.outcome,
      })),
    protocolTranscript: [...(input.client?.getTranscript() ?? [])],
    privacy: {
      rawPayloadsPersisted: false,
      promptsPersisted: false,
      accountIdentifiersPersisted: false,
      tokensPersisted: false,
      localCodexStatePersisted: false,
    },
    risks: [
      {
        code: "APP_SERVER_COMMAND_EXPERIMENTAL",
        blocksProductionPackaging: true,
        summary: runtimeManifest.experimentalRisk,
      },
    ],
    failure: input.failure
      ? {
          code: input.failure.code,
          state: classifyFailure(input.failure),
          reason: input.failure.reason ?? null,
          rpcCode: input.failure.rpcCode ?? null,
        }
      : null,
  };
}

export async function runPreflight(
  options: {
    receiptPath?: string;
    observedAt?: string;
    verifyRuntime?: () => Promise<VerifiedRuntime>;
    launch?: (executablePath: string) => AppServerClient;
  } = {},
): Promise<{ receipt: PreflightReceipt; receiptPath: string }> {
  const receiptPath = resolveReceiptPath(options.receiptPath);
  const observations = emptyObservations();
  const sensitiveFragments = [probePrompt];
  let runtime: VerifiedRuntime | null = null;
  let client: AppServerClient | null = null;
  let isolatedWorkspace: string | null = null;
  let accountState: PreflightState = "incompatible";
  let failure: CodexLabError | null = null;

  try {
    runtime = await (options.verifyRuntime ?? verifyPinnedRuntime)();
    client = (options.launch ?? launchAppServer)(runtime.executablePath);

    const initialized = parseResponse(
      initializeResponseSchema,
      await client.request("initialize", {
        clientInfo: {
          name: "storystage-e1-wp1",
          title: "StoryStage E1 preflight",
          version: "0.1.0",
        },
        capabilities: {
          experimentalApi: false,
          requestAttestation: false,
          mcpServerOpenaiFormElicitation: false,
          optOutNotificationMethods: [],
        },
      }),
      "initialize",
    );
    sensitiveFragments.push(initialized.codexHome);
    client.notify("initialized", {});

    const account = parseResponse(
      accountResponseSchema,
      await client.request("account/read", { refreshToken: false }),
      "account/read",
    );
    observations.accountReadable = true;
    accountState = classifyAccountState(account);
    if (account.account?.type === "chatgpt" && account.account.email) {
      sensitiveFragments.push(account.account.email);
    }

    const models = parseResponse(
      modelListResponseSchema,
      await client.request("model/list", { limit: 100, includeHidden: false }),
      "model/list",
    );
    observations.modelCatalogReadable = true;
    observations.modelCount = models.data.length;

    if (accountState === "authenticated") {
      const rateLimits = parseResponse(
        rateLimitsResponseSchema,
        await client.request("account/rateLimits/read", {}),
        "account/rateLimits/read",
      );
      observations.rateLimitsReadable = true;
      observations.usageLimited =
        rateLimits.rateLimits.rateLimitReachedType !== null;

      parseResponse(
        usageResponseSchema,
        await client.request("account/usage/read", {}),
        "account/usage/read",
      );
      observations.usageReadable = true;

      isolatedWorkspace = await mkdtemp(
        join(tmpdir(), "storystage-e1-wp1-workspace-"),
      );
      sensitiveFragments.push(isolatedWorkspace);
      const thread = parseResponse(
        threadStartResponseSchema,
        await client.request("thread/start", {
          cwd: isolatedWorkspace,
          approvalPolicy: "never",
          sandbox: "read-only",
          ephemeral: true,
        }),
        "thread/start",
      );
      const threadId = thread.thread.id;
      sensitiveFragments.push(threadId);
      observations.ephemeralThreadStarted = true;

      const turnStartedNotification =
        client.waitForNotification("turn/started");
      const turnStartRequest = client.request("turn/start", {
        threadId,
        input: [{ type: "text", text: probePrompt, text_elements: [] }],
        cwd: isolatedWorkspace,
        approvalPolicy: "never",
        sandboxPolicy: { type: "readOnly", networkAccess: false },
      });
      const startedTurn = parseResponse(
        turnStartedNotificationSchema,
        await turnStartedNotification,
        "turn/started",
      );
      const turnId = startedTurn.turn.id;
      sensitiveFragments.push(turnId);
      observations.turnStarted = true;

      const turnInterrupt = client.request("turn/interrupt", {
        threadId,
        turnId,
      });
      const turn = parseResponse(
        turnStartResponseSchema,
        await turnStartRequest,
        "turn/start",
      );
      sensitiveFragments.push(turn.turn.id);
      await turnInterrupt;
      observations.turnInterruptAccepted = true;
      observations.isolatedWorkspaceUnchanged =
        (await readdir(isolatedWorkspace)).length === 0;
    }
  } catch (error) {
    failure =
      error instanceof CodexLabError
        ? error
        : new CodexLabError(
            "PROTOCOL_INCOMPATIBLE",
            "The E1 App Server preflight failed closed.",
            "incompatible",
          );
    accountState = classifyFailure(failure);
  } finally {
    if (client) {
      observations.stderrObserved = client.didObserveStderr();
      try {
        await client.close();
        observations.cleanShutdown = true;
      } catch (closeError) {
        if (!failure) {
          failure =
            closeError instanceof CodexLabError
              ? closeError
              : new CodexLabError(
                  "APP_SERVER_CRASHED",
                  "The E1 App Server did not shut down cleanly.",
                  "crashed",
                );
          accountState = classifyFailure(failure);
        }
      }
    }
    if (isolatedWorkspace) {
      observations.isolatedWorkspaceUnchanged =
        (await readdir(isolatedWorkspace)).length === 0;
      await rm(isolatedWorkspace, { recursive: true, force: true });
    }
  }

  const receipt = makeReceipt({
    runtime,
    accountState,
    observations,
    client,
    failure,
    observedAt: options.observedAt ?? new Date().toISOString(),
  });
  const redacted = redactForReceipt(receipt) as PreflightReceipt;
  assertReceiptContainsNoSensitiveFragments(redacted, sensitiveFragments);
  await mkdir(dirname(receiptPath), { recursive: true });
  await writeFile(
    receiptPath,
    `${JSON.stringify(redacted, null, 2)}\n`,
    "utf8",
  );
  return { receipt: redacted, receiptPath };
}
