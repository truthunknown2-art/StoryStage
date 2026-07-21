import { readFile, rm } from "node:fs/promises";
import type { ChildProcessWithoutNullStreams } from "node:child_process";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { AppServerClient } from "./app-server";
import { runPreflight } from "./preflight";
import { runtimeManifest } from "./runtime-manifest";
import { FakeChild, answerRequests, asChild } from "./test-helpers";

const repositoryRoot = fileURLToPath(new URL("../../../", import.meta.url));
const receiptRelative = "reports/evidence/E1-WP1/test-runtime-receipt.json";
const receiptAbsolute = fileURLToPath(
  new URL(`../../../${receiptRelative}`, import.meta.url),
);

afterEach(async () => {
  await rm(receiptAbsolute, { force: true });
});

function makeLiveFixture(): AppServerClient {
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
        return { data: [{ id: "model-private" }], nextCursor: null };
      case "account/rateLimits/read":
        return {
          rateLimits: { rateLimitReachedType: null },
          rateLimitsByLimitId: null,
          rateLimitResetCredits: null,
        };
      case "account/usage/read":
        return { summary: { lifetimeTokens: 123 }, dailyUsageBuckets: null };
      case "thread/start":
        return {
          thread: { id: "018f1234-1234-7123-8123-123456789abc" },
        };
      case "turn/start":
        child.stdout.write(
          `${JSON.stringify({
            jsonrpc: "2.0",
            method: "turn/started",
            params: {
              threadId: "018f1234-1234-7123-8123-123456789abc",
              turn: { id: "018f1234-1234-7123-8123-abcdefabcdef" },
            },
          })}\n`,
        );
        return { turn: { id: "018f1234-1234-7123-8123-abcdefabcdef" } };
      case "turn/interrupt":
        return {};
      default:
        throw new Error(`Unexpected method: ${method}`);
    }
  });
  child.stdin.once("finish", () => child.emit("exit", 0, null));
  return new AppServerClient(asChild(child) as ChildProcessWithoutNullStreams);
}

describe("E1 live-receipt boundary", () => {
  it("proves the lifecycle while persisting no prompt, identity, IDs, usage values, or local Codex path", async () => {
    const { receipt, receiptPath } = await runPreflight({
      receiptPath: receiptRelative,
      observedAt: "2026-07-20T20:00:00.000Z",
      verifyRuntime: async () => ({
        executablePath: "not-persisted",
        executableSha256: runtimeManifest.nativeBinarySha256,
        packageVersion: runtimeManifest.packageVersion,
        cliVersion: runtimeManifest.cliVersion,
        protocolSha256: runtimeManifest.protocolSha256,
      }),
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
});
