import { describe, expect, it } from "vitest";
import { AppServerClient } from "./app-server";
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
});
