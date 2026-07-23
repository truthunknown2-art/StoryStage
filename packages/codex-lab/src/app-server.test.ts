import { describe, expect, it, vi } from "vitest";
import {
  AppServerClient,
  getE1ProposalAppServerArgs,
  getE1ProposalEnvironment,
} from "./app-server";
import { FakeChild, answerRequests, asChild } from "./test-helpers";

describe("E1 JSONL App Server client", () => {
  it("records method outcomes without retaining request parameters or results", async () => {
    const child = new FakeChild();
    answerRequests(child, () => ({ account: "private-value" }));
    const client = new AppServerClient(asChild(child));
    await expect(
      client.request("account/read", { private: "prompt" }),
    ).resolves.toEqual({ account: "private-value" });
    expect(client.getTranscript()).toEqual([
      { direction: "client-request", method: "account/read", outcome: "ok" },
    ]);
    expect(JSON.stringify(client.getTranscript())).not.toContain("private");
    child.emit("exit", 0, null);
  });

  it("fails closed on malformed or oversized stdout records", async () => {
    const malformedChild = new FakeChild();
    const malformedClient = new AppServerClient(asChild(malformedChild));
    const malformedRequest = malformedClient.request("initialize", {});
    malformedChild.stdout.write("not-json\n");
    await expect(malformedRequest).rejects.toMatchObject({
      code: "MALFORMED_JSON",
    });

    const oversizedChild = new FakeChild();
    const oversizedClient = new AppServerClient(asChild(oversizedChild), {
      maxLineBytes: 8,
    });
    const oversizedRequest = oversizedClient.request("initialize", {});
    oversizedChild.stdout.write("123456789");
    await expect(oversizedRequest).rejects.toMatchObject({
      code: "OUTPUT_LIMIT_EXCEEDED",
    });
  });

  it("rejects invalid UTF-8 and malformed JSON-RPC envelopes", async () => {
    const invalidUtfChild = new FakeChild();
    const invalidUtfClient = new AppServerClient(asChild(invalidUtfChild));
    const invalidUtfRequest = invalidUtfClient.request("initialize", {});
    invalidUtfChild.stdout.write(Buffer.from([0xff, 0x0a]));
    await expect(invalidUtfRequest).rejects.toMatchObject({
      code: "MALFORMED_JSON",
    });

    for (const envelope of [
      { id: 1, result: {} },
      { jsonrpc: "1.0", id: 1, result: {} },
      { jsonrpc: "2.0", id: 1, result: {}, error: {} },
      { jsonrpc: "2.0", id: 1 },
    ]) {
      const child = new FakeChild();
      const client = new AppServerClient(asChild(child));
      const pending = client.request("initialize", {});
      child.stdout.write(`${JSON.stringify(envelope)}\n`);
      await expect(pending).rejects.toMatchObject({
        code: "PROTOCOL_INCOMPATIBLE",
      });
    }
  });

  it("rejects unknown and duplicate response IDs", async () => {
    const unknownChild = new FakeChild();
    const unknownClient = new AppServerClient(asChild(unknownChild));
    const pending = unknownClient.request("initialize", {});
    unknownChild.stdout.write(
      `${JSON.stringify({ jsonrpc: "2.0", id: 99, result: {} })}\n`,
    );
    await expect(pending).rejects.toMatchObject({
      code: "PROTOCOL_INCOMPATIBLE",
    });

    const duplicateChild = new FakeChild();
    const duplicateClient = new AppServerClient(asChild(duplicateChild));
    const first = duplicateClient.request("initialize", {});
    const response = `${JSON.stringify({ jsonrpc: "2.0", id: 1, result: {} })}\n`;
    duplicateChild.stdout.write(response);
    await expect(first).resolves.toEqual({});
    duplicateChild.stdout.write(response);
    await expect(
      duplicateClient.request("model/list", {}),
    ).rejects.toMatchObject({
      code: "PROTOCOL_INCOMPATIBLE",
    });
  });

  it("bounds cumulative stdout, notification count, and streamed text", async () => {
    const streamChild = new FakeChild();
    const streamClient = new AppServerClient(asChild(streamChild), {
      maxStreamBytes: 12,
    });
    const streamRequest = streamClient.request("initialize", {});
    streamChild.stdout.write("1234567890123");
    await expect(streamRequest).rejects.toMatchObject({
      code: "OUTPUT_LIMIT_EXCEEDED",
    });

    const countChild = new FakeChild();
    const countClient = new AppServerClient(asChild(countChild), {
      maxNotificationCount: 1,
    });
    const countRequest = countClient.request("initialize", {});
    const notification = `${JSON.stringify({
      jsonrpc: "2.0",
      method: "thread/status/changed",
      params: {},
    })}\n`;
    countChild.stdout.write(notification);
    countChild.stdout.write(notification);
    await expect(countRequest).rejects.toMatchObject({
      code: "OUTPUT_LIMIT_EXCEEDED",
    });

    const textChild = new FakeChild();
    const textClient = new AppServerClient(asChild(textChild), {
      maxNotificationTextBytes: 4,
    });
    const textRequest = textClient.request("initialize", {});
    textChild.stdout.write(
      `${JSON.stringify({
        jsonrpc: "2.0",
        method: "item/agentMessage/delta",
        params: { delta: "12345" },
      })}\n`,
    );
    await expect(textRequest).rejects.toMatchObject({
      code: "OUTPUT_LIMIT_EXCEEDED",
    });
  });

  it("turns premature child exit into a visible crashed state", async () => {
    const child = new FakeChild();
    const client = new AppServerClient(asChild(child));
    const pending = client.request("model/list", {});
    child.emit("exit", 2, null);
    await expect(pending).rejects.toMatchObject({
      code: "APP_SERVER_CRASHED",
      stateHint: "crashed",
    });
  });

  it("fails a silent server on a bounded request timeout", async () => {
    const child = new FakeChild();
    const client = new AppServerClient(asChild(child));
    await expect(client.request("account/read", {}, 5)).rejects.toMatchObject({
      code: "APP_SERVER_TIMEOUT",
      stateHint: "offline",
    });
    child.emit("exit", 0, null);
  });

  it("closes stdin and requires a zero child exit for clean shutdown", async () => {
    const child = new FakeChild();
    const client = new AppServerClient(asChild(child));
    child.stdin.once("finish", () => child.emit("exit", 0, null));
    await expect(client.close()).resolves.toBeUndefined();
  });

  it("waits for child termination after a shutdown timeout", async () => {
    vi.useFakeTimers();
    const child = new FakeChild();
    child.kill.mockImplementation(() => true);
    const client = new AppServerClient(asChild(child));
    try {
      const closing = client.close(5);
      let settled = false;
      void closing.then(
        () => {
          settled = true;
        },
        () => {
          settled = true;
        },
      );
      await vi.advanceTimersByTimeAsync(5);
      expect(child.kill).toHaveBeenCalledOnce();
      expect(settled).toBe(false);
      child.emit("exit", 1, "SIGTERM");
      await expect(closing).rejects.toMatchObject({
        code: "APP_SERVER_TIMEOUT",
        stateHint: "crashed",
      });
    } finally {
      vi.useRealTimers();
    }
  });

  it("delivers notifications and blocked server requests in arrival order", async () => {
    const child = new FakeChild();
    const client = new AppServerClient(asChild(child));
    const observed: Array<{ kind: string; method: string }> = [];
    const unsubscribe = client.subscribeInbound((message) => {
      observed.push({ kind: message.kind, method: message.method });
    });

    child.stdout.write(
      `${JSON.stringify({ jsonrpc: "2.0", method: "turn/started", params: {} })}\n`,
    );
    child.stdout.write(
      `${JSON.stringify({ jsonrpc: "2.0", id: "approval-1", method: "item/requestApproval", params: {} })}\n`,
    );

    expect(observed).toEqual([
      { kind: "notification", method: "turn/started" },
      { kind: "blocked-request", method: "item/requestApproval" },
    ]);
    expect(child.stdin.read()?.toString()).toContain('"code":-32601');

    unsubscribe();
    child.stdout.write(
      `${JSON.stringify({ jsonrpc: "2.0", method: "turn/completed", params: {} })}\n`,
    );
    expect(observed).toHaveLength(2);
    child.emit("exit", 0, null);
  });

  it("launches only the fixed StoryStage MCP from dedicated Codex state", () => {
    const args = getE1ProposalAppServerArgs();
    expect(args[0]).toBe("app-server");
    expect(args).toContain("apps");
    expect(args).toContain("hooks");
    expect(args).toContain("shell_tool");
    const fixedIndex = args.findIndex((arg) =>
      arg.startsWith("mcp_servers.storystage_e1.command="),
    );
    expect(fixedIndex).toBeGreaterThan(0);
    expect(args.join(" ")).toContain("mcp-cli.ts");
    expect(args).toContain('cli_auth_credentials_store="file"');
    expect(args).toContain('web_search="disabled"');
    expect(args.at(-1)).toBe("--stdio");
    expect(args.join(" ")).not.toContain("http://");
    expect(args.join(" ")).not.toContain("https://");
  });

  it("replaces inherited Codex state and never forwards credential variables", () => {
    const environment = getE1ProposalEnvironment("C:\\dedicated-codex", {
      CODEX_HOME: "C:\\global-codex",
      codex_home: "C:\\lowercase-global-codex",
      CODEX_ACCESS_TOKEN: "must-not-pass",
      OPENAI_API_KEY: "must-not-pass",
      PATH: "C:\\Windows",
    });

    expect(environment.CODEX_HOME).toBe("C:\\dedicated-codex");
    expect(environment.codex_home).toBeUndefined();
    expect(environment.CODEX_ACCESS_TOKEN).toBeUndefined();
    expect(environment.OPENAI_API_KEY).toBeUndefined();
    expect(environment.PATH).toBe("C:\\Windows");
  });
});
