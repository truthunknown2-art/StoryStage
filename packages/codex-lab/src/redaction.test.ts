import { describe, expect, it } from "vitest";
import {
  assertReceiptContainsNoSensitiveFragments,
  redactForReceipt,
} from "./redaction";

describe("E1 receipt redaction", () => {
  it("removes account, prompt, token, identifier, and local-state shapes before persistence", () => {
    const source = {
      accountId: "workspace-private",
      email: "creator@example.com",
      prompt: "private story",
      token: "eyJheader.payload.signature",
      nested: {
        threadId: "018f1234-1234-7123-8123-123456789abc",
        note: `Bearer ${"x".repeat(32)}`,
        path: "C:\\Users\\private\\.codex\\auth.json",
      },
    };
    const redacted = redactForReceipt(source);
    const serialized = JSON.stringify(redacted);

    expect(serialized).not.toContain("creator@example.com");
    expect(serialized).not.toContain("private story");
    expect(serialized).not.toContain("workspace-private");
    expect(serialized).not.toContain(".codex");
    expect(() =>
      assertReceiptContainsNoSensitiveFragments(redacted, ["private story"]),
    ).not.toThrow();
  });

  it("fails a receipt that bypasses structured redaction", () => {
    expect(() =>
      assertReceiptContainsNoSensitiveFragments(
        { status: "ok", note: "creator@example.com" },
        [],
      ),
    ).toThrow(/sensitive data shape/i);
  });
});
