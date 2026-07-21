import { readFile, rm } from "node:fs/promises";
import type { ChildProcessWithoutNullStreams } from "node:child_process";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { AppServerClient } from "./app-server";
import { runPreflight } from "./preflight";
import { runtimeManifest } from "./runtime-manifest";
import {
  FakeChild,
  FakeRpcError,
  answerRequests,
  asChild,
} from "./test-helpers";

const repositoryRoot = fileURLToPath(new URL("../../../", import.meta.url));
const receiptRelative = "reports/evidence/E1-WP1/test-runtime-receipt.json";
const receiptAbsolute = fileURLToPath(
  new URL(`../../../${receiptRelative}`, import.meta.url),
);

afterEach(async () => {
  await rm(receiptAbsolute, { force: true });
});

type LiveFixtureOptions = {
  completionStatus?: "completed" | "failed" | "inProgress" | "interrupted";
  emitCompletion?: boolean;
  omitOptionalResponseFields?: boolean;
  delayTurnStartResponse?: boolean;
  completionThreadId?: string;
  completionTurnId?: string;
  turnInterruptFails?: boolean;
  turnStartFails?: boolean;
  usageLimited?: boolean;
};

function makeLiveFixture(options: LiveFixtureOptions = {}): AppServerClient {
  const child = new FakeChild();
  answerRequests(child, (method) => {
    switch (method) {
      case "initialize":
        return {
          userAgent: "codex-test",
          codexHome: "C:\\Users\\private\\.codex",
          platformFamily: "windows",
          platformOs: "windows",
        };
      case "account/read":
        return {
          account: {
            type: "chatgpt",
            email: "creator@example.com",
            planType: "pro",
          },
          requiresOpenaiAuth: true,
        };
      case "model/list":
        return options.omitOptionalResponseFields
          ? { data: [{ id: "model-private" }] }
          : { data: [{ id: "model-private" }], nextCursor: null };
      case "account/rateLimits/read":
        if (options.omitOptionalResponseFields) {
          return { rateLimits: {} };
        }
        return {
          rateLimits: {
            rateLimitReachedType: options.usageLimited ? "primary" : null,
          },
          rateLimitsByLimitId: null,
          rateLimitResetCredits: null,
        };
      case "account/usage/read":
        return options.omitOptionalResponseFields
          ? { summary: { lifetimeTokens: 123 } }
          : { summary: { lifetimeTokens: 123 }, dailyUsageBuckets: null };
      case "thread/start":
        return {
          thread: { id: "018f1234-1234-7123-8123-123456789abc" },
        };
      case "turn/start": {
        if (options.turnStartFails) {
          return new FakeRpcError({
            code: -32602,
            message: "Invalid params",
          });
        }
        child.stdout.write(
          `${JSON.stringify({
            jsonrpc: "2.0",
            method: "turn/started",
            params: {
              threadId: "018f1234-1234-7123-8123-123456789abc",
              turn: {
                id: "018f1234-1234-7123-8123-abcdefabcdef",
                items: [],
                status: "inProgress",
              },
            },
          })}\n`,
        );
        const response = {
          turn: {
            id: "018f1234-1234-7123-8123-abcdefabcdef",
            items: [],
            status: "interrupted",
          },
        };
        return options.delayTurnStartResponse
          ? new Promise((resolve) => setTimeout(() => resolve(response), 20))
          : response;
      }
      case "turn/interrupt":
        if (options.turnInterruptFails) {
          return new FakeRpcError({ code: -32602, message: "Invalid params" });
        }
        if (options.emitCompletion !== false) {
          child.stdout.write(
            `${JSON.stringify({
              jsonrpc: "2.0",
              method: "turn/completed",
              params: {
                threadId:
                  options.completionThreadId ??
                  "018f1234-1234-7123-8123-123456789abc",
                turn: {
                  id:
                    options.completionTurnId ??
                    "018f1234-1234-7123-8123-abcdefabcdef",
                  items: [],
                  status: options.completionStatus ?? "interrupted",
                },
              },
            })}\n`,
          );
        }
        return {};
      default:
        throw new Error(`Unexpected method: ${method}`);
    }
  });
  child.stdin.once("finish", () => child.emit("exit", 0, null));
  return new AppServerClient(asChild(child) as ChildProcessWithoutNullStreams, {
    requestTimeoutMs: 100,
  });
}

const verifiedRuntime = async () => ({
  executablePath: "not-persisted",
  executableSha256: runtimeManifest.nativeBinarySha256,
  packageVersion: runtimeManifest.packageVersion,
  cliVersion: runtimeManifest.cliVersion,
  protocolSha256: runtimeManifest.protocolSha256,
});

describe("E1 live-receipt boundary", () => {
  it("proves the lifecycle while persisting no prompt, identity, IDs, usage values, or local Codex path", async () => {
    const { receipt, receiptPath } = await runPreflight({
      receiptPath: receiptRelative,
      observedAt: "2026-07-20T20:00:00.000Z",
      verifyRuntime: verifiedRuntime,
      launch: () => makeLiveFixture(),
    });
    expect(receiptPath.startsWith(repositoryRoot)).toBe(true);
    expect(receipt.result).toBe("pass");
    expect(receipt.accountState).toBe("authenticated");
    expect(
      receipt.clientLifecycleTranscript.map((entry) => entry.method),
    ).toEqual([
      "initialize",
      "initialized",
      "account/read",
      "model/list",
      "account/rateLimits/read",
      "account/usage/read",
      "thread/start",
      "turn/start",
      "turn/interrupt",
    ]);
    expect(receipt.observations.turnCompletedInterrupted).toBe(true);
    expect(
      receipt.protocolTranscript.some(
        (entry) =>
          entry.direction === "server-notification" &&
          entry.method === "turn/completed",
      ),
    ).toBe(true);

    const stored = await readFile(receiptAbsolute, "utf8");
    for (const forbidden of [
      "creator@example.com",
      "private story",
      "Write a detailed ten-part explanation",
      "model-private",
      "lifetimeTokens",
      ".codex",
      "018f1234",
      "not-persisted",
    ]) {
      expect(stored).not.toContain(forbidden);
    }
  });

  it("rejects receipt paths outside the bounded evidence directory", async () => {
    await expect(
      runPreflight({ receiptPath: "../outside.json" }),
    ).rejects.toMatchObject({ code: "WRITE_FAILED" });
  });

  it("fails closed before creating a thread when the successful usage snapshot is limited", async () => {
    const { receipt } = await runPreflight({
      receiptPath: receiptRelative,
      observedAt: "2026-07-20T20:00:00.000Z",
      verifyRuntime: verifiedRuntime,
      launch: () => makeLiveFixture({ usageLimited: true }),
    });

    expect(receipt.result).toBe("action-required");
    expect(receipt.accountState).toBe("usage-limited");
    expect(receipt.observations.usageLimited).toBe(true);
    expect(receipt.observations.ephemeralThreadStarted).toBe(false);
  });

  it("accepts exact protocol responses when optional fields are omitted", async () => {
    const { receipt } = await runPreflight({
      receiptPath: receiptRelative,
      observedAt: "2026-07-20T20:00:00.000Z",
      verifyRuntime: verifiedRuntime,
      launch: () => makeLiveFixture({ omitOptionalResponseFields: true }),
    });

    expect(receipt.result).toBe("pass");
  });

  it.each([
    ["turn/start", { turnStartFails: true }],
    [
      "turn/interrupt",
      { delayTurnStartResponse: true, turnInterruptFails: true },
    ],
  ] as const)(
    "writes a failed receipt without an unhandled rejection when %s rejects",
    async (_method, fixtureOptions) => {
      const unhandled: unknown[] = [];
      const onUnhandled = (error: unknown) => unhandled.push(error);
      process.on("unhandledRejection", onUnhandled);
      try {
        const { receipt } = await runPreflight({
          receiptPath: receiptRelative,
          observedAt: "2026-07-20T20:00:00.000Z",
          verifyRuntime: verifiedRuntime,
          launch: () => makeLiveFixture(fixtureOptions),
        });
        await new Promise<void>((resolve) => setImmediate(resolve));

        expect(receipt.result).toBe("fail");
        expect(receipt.failure?.state).toBe("incompatible");
        expect(unhandled).toEqual([]);
        await expect(readFile(receiptAbsolute, "utf8")).resolves.toContain(
          '"result": "fail"',
        );
      } finally {
        process.off("unhandledRejection", onUnhandled);
      }
    },
  );

  it.each([
    ["wrong status", { completionStatus: "completed" as const }],
    ["failed status", { completionStatus: "failed" as const }],
    ["non-terminal status", { completionStatus: "inProgress" as const }],
    ["missing notification", { emitCompletion: false }],
    [
      "wrong thread",
      { completionThreadId: "018f1234-1234-7123-8123-wrongthread0" },
    ],
    [
      "wrong turn",
      { completionTurnId: "018f1234-1234-7123-8123-wrongturn000" },
    ],
  ])("fails closed when turn completion has %s", async (_case, options) => {
    const { receipt } = await runPreflight({
      receiptPath: receiptRelative,
      observedAt: "2026-07-20T20:00:00.000Z",
      verifyRuntime: verifiedRuntime,
      launch: () => makeLiveFixture(options),
    });

    expect(receipt.result).toBe("fail");
    expect(receipt.observations.turnCompletedInterrupted).toBe(false);
  });
});
