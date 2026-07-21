import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { runE1ProposalRoundTrip } from "./proposal-roundtrip";
import { verifyPinnedRuntime } from "./runtime";

const repositoryRoot = fileURLToPath(new URL("../../../", import.meta.url));
const receiptPath = join(
  repositoryRoot,
  "reports",
  "evidence",
  "E1-WP3",
  "live-roundtrip.json",
);

async function main(): Promise<void> {
  const runtime = await verifyPinnedRuntime();
  const result = await runE1ProposalRoundTrip({
    verifyRuntime: async () => runtime,
  });
  const receipt = {
    schemaVersion: 1,
    package: "E1-WP3",
    source: "live-pinned-runtime",
    observedAt: new Date().toISOString(),
    runtime: {
      packageVersion: runtime.packageVersion,
      cliVersion: runtime.cliVersion,
      nativeExecutableSha256: runtime.executableSha256,
      protocolSha256: runtime.protocolSha256,
    },
    state: result.state,
    scope: result.scope,
    proposal: result.proposal,
    eventTimeline: result.events.map((event) => ({
      sequence: event.sequence,
      kind: event.kind,
      ...(event.kind === "tool-started" || event.kind === "tool-completed"
        ? { tool: event.tool }
        : {}),
      ...(event.kind === "turn-completed" ? { status: event.status } : {}),
      ...(event.kind === "approval-blocked" ? { method: event.method } : {}),
      ...(event.kind === "error" ? { code: event.code } : {}),
    })),
    reviewAuthority: result.reviewAuthority,
    privacy: {
      rawJsonRpcPersisted: false,
      promptPersisted: false,
      agentTextPersisted: false,
      accountIdentifiersPersisted: false,
      threadIdentifiersPersisted: false,
      turnIdentifiersPersisted: false,
      tokensPersisted: false,
    },
  };
  await mkdir(dirname(receiptPath), { recursive: true });
  await writeFile(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`, "utf8");
  process.stdout.write(
    `Recorded sanitized E1-WP3 live receipt: ${receiptPath}\n`,
  );
}

void main().catch((error: unknown) => {
  process.stderr.write(
    `${error instanceof Error ? error.message : "E1-WP3 live round trip failed."}\n`,
  );
  process.exitCode = 1;
});
