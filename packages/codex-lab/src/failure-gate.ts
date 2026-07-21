import {
  E1_MCP_FIXTURE_SHA256,
  E1_MCP_RESOURCE_URI,
} from "./mcp-scene-context";
import { E1_PROPOSAL_TOOLS } from "./proposal-roundtrip";
import { runtimeManifest } from "./runtime-manifest";

export const E1_WP4_FAILURE_CASE_IDS = [
  "runtime-not-installed",
  "signed-out",
  "auth-revoked-or-expired",
  "offline",
  "usage-limited",
  "protocol-incompatible",
  "mcp-startup-failed",
  "malformed-proposal",
  "adversarial-proposal",
  "prompt-injection-blocked",
  "operation-timeout",
  "operation-cancelled",
  "child-crashed",
  "restart-clean",
] as const;

export type E1Wp4FailureCaseId = (typeof E1_WP4_FAILURE_CASE_IDS)[number];

export type E1Wp4EvidenceRef = {
  path: string;
  test: string;
};

export type E1Wp4FailureCase = {
  id: E1Wp4FailureCaseId;
  title: string;
  state:
    | "not-installed"
    | "signed-out"
    | "revoked-or-expired"
    | "offline"
    | "usage-limited"
    | "incompatible"
    | "failed"
    | "cancelled"
    | "crashed"
    | "recovered";
  code: string;
  creatorMessage: string;
  recoveryAction: string;
  recoveryOutcome: string;
  evidenceClass: "deterministic-executable-fixture";
  automaticRetry: false;
  hiddenFallback: false;
  credentialAccessAllowed: false;
  projectMutationAllowed: false;
  evidence: readonly E1Wp4EvidenceRef[];
};

const ref = (path: string, test: string): E1Wp4EvidenceRef => ({ path, test });

export const E1_WP4_FAILURE_CASES: readonly E1Wp4FailureCase[] = [
  {
    id: "runtime-not-installed",
    title: "Pinned runtime not installed",
    state: "not-installed",
    code: "RUNTIME_NOT_INSTALLED",
    creatorMessage:
      "The pinned Codex runtime is not installed on this computer.",
    recoveryAction:
      "Install or repair the pinned runtime, then run Runtime check again.",
    recoveryOutcome:
      "Prompting remains blocked until the pinned runtime check passes.",
    evidenceClass: "deterministic-executable-fixture",
    automaticRetry: false,
    hiddenFallback: false,
    credentialAccessAllowed: false,
    projectMutationAllowed: false,
    evidence: [
      ref(
        "packages/codex-lab/src/runtime.test.ts",
        "reports a missing installation without probing credential storage",
      ),
    ],
  },
  {
    id: "signed-out",
    title: "Signed out",
    state: "signed-out",
    code: "AUTH_REQUIRED",
    creatorMessage: "The AI Director is signed out of ChatGPT.",
    recoveryAction: "Use the official Sign in with ChatGPT flow, then retry.",
    recoveryOutcome:
      "Prompting remains blocked until official sign-in completes.",
    evidenceClass: "deterministic-executable-fixture",
    automaticRetry: false,
    hiddenFallback: false,
    credentialAccessAllowed: false,
    projectMutationAllowed: false,
    evidence: [
      ref(
        "packages/codex-lab/src/proposal-roundtrip.test.ts",
        "blocks signed-out state before a thread when no official sign-in opener is available",
      ),
    ],
  },
  {
    id: "auth-revoked-or-expired",
    title: "Session expired or revoked",
    state: "revoked-or-expired",
    code: "AUTH_REVOKED",
    creatorMessage: "The ChatGPT session is no longer valid.",
    recoveryAction:
      "Reconnect with the official sign-in flow; StoryStage will not reuse or copy credentials.",
    recoveryOutcome:
      "The failed request stops before thread creation and requires fresh official sign-in.",
    evidenceClass: "deterministic-executable-fixture",
    automaticRetry: false,
    hiddenFallback: false,
    credentialAccessAllowed: false,
    projectMutationAllowed: false,
    evidence: [
      ref(
        "packages/codex-lab/src/proposal-roundtrip.test.ts",
        "blocks account availability failures before any thread or turn starts",
      ),
    ],
  },
  {
    id: "offline",
    title: "Offline",
    state: "offline",
    code: "OFFLINE",
    creatorMessage: "The AI Director cannot reach the service.",
    recoveryAction: "Restore connectivity and retry the same bounded request.",
    recoveryOutcome:
      "The request stops before thread creation and can be retried explicitly after connectivity returns.",
    evidenceClass: "deterministic-executable-fixture",
    automaticRetry: false,
    hiddenFallback: false,
    credentialAccessAllowed: false,
    projectMutationAllowed: false,
    evidence: [
      ref(
        "packages/codex-lab/src/proposal-roundtrip.test.ts",
        "blocks account availability failures before any thread or turn starts",
      ),
    ],
  },
  {
    id: "usage-limited",
    title: "Usage limit reached",
    state: "usage-limited",
    code: "USAGE_LIMITED",
    creatorMessage: "The ChatGPT account has reached its current usage limit.",
    recoveryAction:
      "Wait for access to resume, then retry; no API-key fallback is available.",
    recoveryOutcome:
      "The request stops before thread creation with no alternate provider or API-key fallback.",
    evidenceClass: "deterministic-executable-fixture",
    automaticRetry: false,
    hiddenFallback: false,
    credentialAccessAllowed: false,
    projectMutationAllowed: false,
    evidence: [
      ref(
        "packages/codex-lab/src/proposal-roundtrip.test.ts",
        "blocks a reached usage limit before creating a thread or starting a turn",
      ),
    ],
  },
  {
    id: "protocol-incompatible",
    title: "Runtime update required",
    state: "incompatible",
    code: "PROTOCOL_INCOMPATIBLE",
    creatorMessage:
      "The Codex App Server protocol or bounded MCP schema does not match this StoryStage build.",
    recoveryAction:
      "Install the supported runtime or update StoryStage; prompting remains blocked.",
    recoveryOutcome:
      "Prompting remains blocked until the pinned protocol and schemas match.",
    evidenceClass: "deterministic-executable-fixture",
    automaticRetry: false,
    hiddenFallback: false,
    credentialAccessAllowed: false,
    projectMutationAllowed: false,
    evidence: [
      ref(
        "packages/codex-lab/src/proposal-roundtrip.test.ts",
        "accepts transport key reordering but rejects semantic schema drift",
      ),
    ],
  },
  {
    id: "mcp-startup-failed",
    title: "StoryStage context failed to start",
    state: "failed",
    code: "MCP_STARTUP_FAILED",
    creatorMessage:
      "The bounded StoryStage context server could not start safely.",
    recoveryAction:
      "Review redacted diagnostics, repair the fixed lab files, and retry.",
    recoveryOutcome:
      "The bounded context server never registers and the proposal turn never starts.",
    evidenceClass: "deterministic-executable-fixture",
    automaticRetry: false,
    hiddenFallback: false,
    credentialAccessAllowed: false,
    projectMutationAllowed: false,
    evidence: [
      ref(
        "packages/codex-lab/src/mcp-scene-context.test.ts",
        "fails closed before registration when fixture startup validation fails",
      ),
    ],
  },
  {
    id: "malformed-proposal",
    title: "Malformed proposal",
    state: "failed",
    code: "PROPOSAL_REJECTED",
    creatorMessage:
      "The AI Director returned a proposal that does not match the pinned schema.",
    recoveryAction:
      "Reject the response and retry from the same unchanged scene scope.",
    recoveryOutcome:
      "The malformed output is discarded and the selected scene remains unchanged.",
    evidenceClass: "deterministic-executable-fixture",
    automaticRetry: false,
    hiddenFallback: false,
    credentialAccessAllowed: false,
    projectMutationAllowed: false,
    evidence: [
      ref(
        "packages/codex-lab/src/proposal-roundtrip.test.ts",
        "blocks prompt-injection activity without widening tools or approval authority",
      ),
    ],
  },
  {
    id: "adversarial-proposal",
    title: "Proposal exceeds authority",
    state: "failed",
    code: "AUTHORITY_DENIED",
    creatorMessage:
      "The proposal requested an unknown ID, capability, item, or authority field.",
    recoveryAction: "Reject the proposal; the project remains unchanged.",
    recoveryOutcome:
      "The out-of-scope proposal is denied without project mutation.",
    evidenceClass: "deterministic-executable-fixture",
    automaticRetry: false,
    hiddenFallback: false,
    credentialAccessAllowed: false,
    projectMutationAllowed: false,
    evidence: [
      ref(
        "packages/codex-lab/src/mcp-scene-context.test.ts",
        "denies unknown IDs, capabilities, authority fields, bytes, and items",
      ),
    ],
  },
  {
    id: "prompt-injection-blocked",
    title: "Prompt injection blocked",
    state: "failed",
    code: "UNAPPROVED_ACTIVITY",
    creatorMessage:
      "The turn attempted work outside the two-tool proposal-only contract.",
    recoveryAction:
      "Stop the turn, discard its output, and keep Apply disabled.",
    recoveryOutcome:
      "The turn is interrupted once and all untrusted output is discarded.",
    evidenceClass: "deterministic-executable-fixture",
    automaticRetry: false,
    hiddenFallback: false,
    credentialAccessAllowed: false,
    projectMutationAllowed: false,
    evidence: [
      ref(
        "packages/codex-lab/src/proposal-roundtrip.test.ts",
        "fails closed on malformed output, forbidden work, and approval requests",
      ),
      ref(
        "packages/codex-lab/src/proposal-roundtrip.test.ts",
        "interrupts a late forbidden event exactly once and fails visibly",
      ),
    ],
  },
  {
    id: "operation-timeout",
    title: "Request timed out",
    state: "failed",
    code: "APP_SERVER_TIMEOUT",
    creatorMessage:
      "The bounded AI Director request did not finish before its deadline.",
    recoveryAction:
      "Stop the child process cleanly and retry from unchanged state.",
    recoveryOutcome:
      "The timed-out child is closed before an explicit clean retry.",
    evidenceClass: "deterministic-executable-fixture",
    automaticRetry: false,
    hiddenFallback: false,
    credentialAccessAllowed: false,
    projectMutationAllowed: false,
    evidence: [
      ref(
        "packages/codex-lab/src/app-server.test.ts",
        "fails a silent server on a bounded request timeout",
      ),
    ],
  },
  {
    id: "operation-cancelled",
    title: "Cancelled",
    state: "cancelled",
    code: "OPERATION_CANCELLED",
    creatorMessage: "The creator cancelled the proposal request.",
    recoveryAction:
      "Return to the unchanged scene and start a new bounded request when ready.",
    recoveryOutcome:
      "Cancellation stops the current request and retains no proposal.",
    evidenceClass: "deterministic-executable-fixture",
    automaticRetry: false,
    hiddenFallback: false,
    credentialAccessAllowed: false,
    projectMutationAllowed: false,
    evidence: [
      ref(
        "packages/codex-lab/src/proposal-roundtrip.test.ts",
        "represents cancellation before any tool starts",
      ),
    ],
  },
  {
    id: "child-crashed",
    title: "AI Director crashed",
    state: "crashed",
    code: "APP_SERVER_CRASHED",
    creatorMessage:
      "The Codex App Server stopped before the bounded request completed.",
    recoveryAction:
      "Close the failed child, preserve the original error, and offer a clean restart.",
    recoveryOutcome:
      "The crashed session is discarded before any new child starts.",
    evidenceClass: "deterministic-executable-fixture",
    automaticRetry: false,
    hiddenFallback: false,
    credentialAccessAllowed: false,
    projectMutationAllowed: false,
    evidence: [
      ref(
        "packages/codex-lab/src/app-server.test.ts",
        "turns premature child exit into a visible crashed state",
      ),
    ],
  },
  {
    id: "restart-clean",
    title: "Clean restart",
    state: "recovered",
    code: "RESTART_CLEAN",
    creatorMessage:
      "A new bounded session started without reusing the failed turn.",
    recoveryAction:
      "Review the new proposal independently; prior output remains discarded.",
    recoveryOutcome:
      "A new client starts at event sequence one with no prior turn or proposal state.",
    evidenceClass: "deterministic-executable-fixture",
    automaticRetry: false,
    hiddenFallback: false,
    credentialAccessAllowed: false,
    projectMutationAllowed: false,
    evidence: [
      ref(
        "packages/codex-lab/src/proposal-roundtrip.test.ts",
        "discards a crashed session before a clean new-client restart",
      ),
    ],
  },
] as const;

export const E1_WP4_SECURITY_CHECKS = [
  {
    id: "spawn-arguments-environment",
    evidence: ref(
      "packages/codex-lab/src/app-server.test.ts",
      "replaces inherited Codex state and never forwards credential variables",
    ),
  },
  {
    id: "stdio-parsing",
    evidence: ref(
      "packages/codex-lab/src/mcp-stdio-transport.test.ts",
      "fails once on oversized, invalid UTF-8, malformed, or batched input",
    ),
  },
  {
    id: "lab-root-containment",
    evidence: ref(
      "packages/codex-lab/src/lab-workspace.test.ts",
      "rejects a junction component before creating a workspace through it",
    ),
  },
  {
    id: "tool-allowlist-approval-routing",
    evidence: ref(
      "packages/codex-lab/src/proposal-roundtrip.test.ts",
      "fails closed on malformed output, forbidden work, and approval requests",
    ),
  },
  {
    id: "receipt-redaction",
    evidence: ref(
      "packages/codex-lab/src/redaction.test.ts",
      "removes account, prompt, token, identifier, and local-state shapes before persistence",
    ),
  },
  {
    id: "process-workspace-cleanup",
    evidence: ref(
      "packages/codex-lab/src/proposal-roundtrip.test.ts",
      "preserves both the primary failure and a cleanup failure",
    ),
  },
  {
    id: "no-project-mutation-surface",
    evidence: ref(
      "packages/codex-lab/src/no-project-mutation.test.ts",
      "leaves the decoy project byte-identical across the failure gate",
    ),
  },
] as const;

export function assertE1Wp4FailureGate(): void {
  const expected = new Set<string>(E1_WP4_FAILURE_CASE_IDS);
  const observed = new Set<string>();
  const codes = new Set<string>();
  const messages = new Set<string>();
  for (const failureCase of E1_WP4_FAILURE_CASES) {
    if (!expected.has(failureCase.id) || observed.has(failureCase.id)) {
      throw new Error(
        `Unexpected or duplicate E1-WP4 failure case: ${failureCase.id}`,
      );
    }
    if (
      failureCase.automaticRetry !== false ||
      failureCase.hiddenFallback !== false ||
      failureCase.credentialAccessAllowed !== false ||
      failureCase.projectMutationAllowed !== false ||
      failureCase.recoveryOutcome.length === 0 ||
      failureCase.evidenceClass !== "deterministic-executable-fixture" ||
      failureCase.evidence.length === 0
    ) {
      throw new Error(
        `Unsafe or incomplete E1-WP4 failure case: ${failureCase.id}`,
      );
    }
    if (
      codes.has(failureCase.code) ||
      messages.has(failureCase.creatorMessage)
    ) {
      throw new Error(
        `Ambiguous E1-WP4 presentation mapping: ${failureCase.id}`,
      );
    }
    codes.add(failureCase.code);
    messages.add(failureCase.creatorMessage);
    observed.add(failureCase.id);
  }
  if (observed.size !== expected.size) {
    throw new Error("The E1-WP4 failure matrix is incomplete.");
  }
}

export function createE1Wp4FailureGateReceipt() {
  assertE1Wp4FailureGate();
  return {
    schemaVersion: 1,
    package: "E1-WP4",
    evidenceClass: "deterministic-negative-state-and-boundary-index",
    runtime: {
      platform: runtimeManifest.platform,
      packageVersion: runtimeManifest.packageVersion,
      cliVersion: runtimeManifest.cliVersion,
      nativeBinarySha256: runtimeManifest.nativeBinarySha256,
      protocolSha256: runtimeManifest.protocolSha256,
      appServerExperimental: true,
    },
    boundedMcp: {
      resource: E1_MCP_RESOURCE_URI,
      fixtureSha256: E1_MCP_FIXTURE_SHA256,
      tools: E1_PROPOSAL_TOOLS,
    },
    authority: {
      credentialAccess: false,
      projectMutation: false,
      rendererAccess: false,
      assetApproval: false,
      hiddenFallback: false,
      automaticRetry: false,
      applyEnabled: false,
    },
    cases: E1_WP4_FAILURE_CASES,
    securityChecks: E1_WP4_SECURITY_CHECKS,
    knownLimitations: [
      "This is isolated feasibility evidence, not a production-security claim.",
      "Codex CLI 0.144.1 labels app-server experimental.",
      "Distribution, packaging, support, and update policy remain release-gate work.",
    ],
  } as const;
}

export function serializeE1Wp4FailureGateReceipt(): string {
  return `${JSON.stringify(createE1Wp4FailureGateReceipt(), null, 2)}\n`;
}

export function serializeE1Wp4ProcessCleanupReceipt(): string {
  return `${JSON.stringify(
    {
      schemaVersion: 1,
      package: "E1-WP4",
      evidenceClass: "deterministic-process-cleanup-index",
      checks: [
        {
          state: "clean-shutdown",
          test: "packages/codex-lab/src/app-server.test.ts :: closes stdin and requires a zero child exit for clean shutdown",
        },
        {
          state: "shutdown-timeout",
          test: "packages/codex-lab/src/app-server.test.ts :: waits for child termination after a shutdown timeout",
        },
        {
          state: "crash-restart",
          test: "packages/codex-lab/src/proposal-roundtrip.test.ts :: discards a crashed session before a clean new-client restart",
        },
        {
          state: "primary-and-cleanup-failure",
          test: "packages/codex-lab/src/proposal-roundtrip.test.ts :: preserves both the primary failure and a cleanup failure",
        },
        {
          state: "workspace-removal",
          test: "packages/codex-lab/src/proposal-roundtrip.test.ts :: removes the isolated workspace even when shutdown fails",
        },
      ],
      ownedProcessBoundary:
        "The lab proves App Server lifecycle closure and isolated workspace removal. Production-grade Windows job-object containment remains R2.",
      productionReady: false,
    },
    null,
    2,
  )}\n`;
}
