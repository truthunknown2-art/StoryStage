import { describe, expect, it } from "vitest";
import { AppServerClient, getE1ProposalAppServerArgs } from "./app-server";
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

  it("replaces inherited MCP configuration with the fixed StoryStage server", () => {
    const args = getE1ProposalAppServerArgs(["inherited.one"]);
    expect(args[0]).toBe("app-server");
    expect(args).toContain("apps");
    expect(args).toContain("shell_tool");
    expect(args).toContain('mcp_servers."inherited.one".enabled=false');
    expect(args.at(-2)).toContain("mcp_servers={storystage_e1=");
    expect(args.at(-2)).toContain("mcp-cli.ts");
    expect(args.at(-1)).toBe("--stdio");
    expect(args.join(" ")).not.toContain("http://");
    expect(args.join(" ")).not.toContain("https://");
  });
});
