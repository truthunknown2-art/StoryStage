import { createHash } from "node:crypto";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import {
  serializeE1Wp4FailureGateReceipt,
  serializeE1Wp4ProcessCleanupReceipt,
} from "./failure-gate";
import { serializeE1Wp4NoProjectMutationReceipt } from "./no-project-mutation";

const evidenceRoot = fileURLToPath(
  new URL("../../../reports/evidence/E1-WP4/", import.meta.url),
);
const outputs = [
  ["failure-matrix.json", serializeE1Wp4FailureGateReceipt()],
  ["process-cleanup.json", serializeE1Wp4ProcessCleanupReceipt()],
  ["no-project-mutation.json", await serializeE1Wp4NoProjectMutationReceipt()],
] as const;

async function verifyCaptureEvidence(): Promise<void> {
  const capture = JSON.parse(
    await readFile(`${evidenceRoot}capture-receipt.json`, "utf8"),
  ) as {
    selectedCode: string;
    viewport: { width: number; height: number };
    authority: Record<string, boolean>;
    artifacts: Record<string, { path: string; sha256: string; bytes: number }>;
  };
  const fixedArtifacts = {
    screenshot: "failure-gate-1440x900.png",
    failureMatrix: "failure-matrix.json",
    noProjectMutation: "no-project-mutation.json",
    processCleanup: "process-cleanup.json",
  } as const;
  for (const [key, name] of Object.entries(fixedArtifacts)) {
    const bytes = await readFile(`${evidenceRoot}${name}`);
    const recorded = capture.artifacts[key];
    if (
      !recorded ||
      recorded.bytes !== bytes.length ||
      recorded.sha256 !== createHash("sha256").update(bytes).digest("hex")
    ) {
      throw new Error(`E1-WP4 capture evidence hash mismatch: ${name}`);
    }
  }
  const png = await readFile(`${evidenceRoot}failure-gate-1440x900.png`);
  if (
    png.readUInt32BE(16) !== 1440 ||
    png.readUInt32BE(20) !== 900 ||
    capture.viewport.width !== 1440 ||
    capture.viewport.height !== 900 ||
    capture.selectedCode !== "UNAPPROVED_ACTIVITY" ||
    Object.values(capture.authority).some(Boolean)
  ) {
    throw new Error("E1-WP4 capture evidence authority or viewport mismatch.");
  }
}

if (process.argv.includes("--check")) {
  for (const [name, expected] of outputs) {
    const actual = await readFile(`${evidenceRoot}${name}`, "utf8").catch(
      () => "",
    );
    if (actual !== expected) {
      throw new Error(`E1-WP4 evidence is missing or stale: ${name}`);
    }
  }
  await verifyCaptureEvidence();
  process.stdout.write("E1-WP4 failure/security evidence PASS.\n");
} else if (process.argv.includes("--write")) {
  await mkdir(evidenceRoot, { recursive: true });
  for (const [name, expected] of outputs) {
    await writeFile(`${evidenceRoot}${name}`, expected, "utf8");
  }
  process.stdout.write(`Wrote E1-WP4 evidence under ${evidenceRoot}\n`);
} else {
  throw new Error("Use --write or --check.");
}
