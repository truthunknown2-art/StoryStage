import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { classifyRpcFailure } from "./account-state";
import {
  E1_WP4_FAILURE_CASE_IDS,
  E1_WP4_FAILURE_CASES,
  E1_WP4_SECURITY_CHECKS,
  assertE1Wp4FailureGate,
  createE1Wp4FailureGateReceipt,
  serializeE1Wp4FailureGateReceipt,
  type E1Wp4EvidenceRef,
} from "./failure-gate";

const repositoryRoot = fileURLToPath(new URL("../../../", import.meta.url));

async function expectEvidenceAnchor(reference: E1Wp4EvidenceRef) {
  const source = await readFile(join(repositoryRoot, reference.path), "utf8");
  expect(source).toContain(`it("${reference.test}"`);
}

describe("E1-WP4 failure, security, and feasibility gate", () => {
  it("publishes every required state once with no retry, credential, mutation, or fallback authority", () => {
    expect(() => assertE1Wp4FailureGate()).not.toThrow();
    expect(E1_WP4_FAILURE_CASES.map((entry) => entry.id)).toEqual(
      E1_WP4_FAILURE_CASE_IDS,
    );
    expect(
      E1_WP4_FAILURE_CASES.every(
        (entry) =>
          !entry.automaticRetry &&
          !entry.hiddenFallback &&
          !entry.credentialAccessAllowed &&
          !entry.projectMutationAllowed &&
          entry.evidenceClass === "deterministic-executable-fixture" &&
          entry.recoveryOutcome.length > 0,
      ),
    ).toBe(true);
    expect(new Set(E1_WP4_FAILURE_CASES.map((entry) => entry.code)).size).toBe(
      E1_WP4_FAILURE_CASES.length,
    );
    expect(
      new Set(E1_WP4_FAILURE_CASES.map((entry) => entry.creatorMessage)).size,
    ).toBe(E1_WP4_FAILURE_CASES.length);
    expect(E1_WP4_FAILURE_CASES.map((entry) => entry.code)).toEqual([
      "RUNTIME_NOT_INSTALLED",
      "AUTH_REQUIRED",
      "AUTH_REVOKED",
      "OFFLINE",
      "USAGE_LIMITED",
      "PROTOCOL_INCOMPATIBLE",
      "MCP_STARTUP_FAILED",
      "PROPOSAL_REJECTED",
      "AUTHORITY_DENIED",
      "UNAPPROVED_ACTIVITY",
      "APP_SERVER_TIMEOUT",
      "OPERATION_CANCELLED",
      "APP_SERVER_CRASHED",
      "RESTART_CLEAN",
    ]);
  });

  it("binds every matrix and boundary claim to an existing executable test", async () => {
    const references = [
      ...E1_WP4_FAILURE_CASES.flatMap((entry) => entry.evidence),
      ...E1_WP4_SECURITY_CHECKS.map((entry) => entry.evidence),
    ];
    await Promise.all(references.map(expectEvidenceAnchor));
  });

  it("keeps revoked, offline, usage-limited, and incompatible failures distinguishable", () => {
    expect(classifyRpcFailure("account/read", { code: 401 })).toBe(
      "revoked-or-expired",
    );
    expect(
      classifyRpcFailure("model/list", { message: "network offline" }),
    ).toBe("offline");
    expect(classifyRpcFailure("account/usage/read", { code: 429 })).toBe(
      "usage-limited",
    );
    expect(classifyRpcFailure("thread/start", { code: -32601 })).toBe(
      "incompatible",
    );
  });

  it("serializes only a deterministic redacted evidence index with Apply disabled", () => {
    const receipt = createE1Wp4FailureGateReceipt();
    expect(receipt.authority).toEqual({
      credentialAccess: false,
      projectMutation: false,
      rendererAccess: false,
      assetApproval: false,
      hiddenFallback: false,
      automaticRetry: false,
      applyEnabled: false,
    });
    const serialized = serializeE1Wp4FailureGateReceipt();
    expect(serialized).not.toMatch(
      /access[_-]?token|refresh[_-]?token|authorization|cookie|threadId|turnId/i,
    );
    expect(JSON.parse(serialized)).toEqual(receipt);
  });
});
