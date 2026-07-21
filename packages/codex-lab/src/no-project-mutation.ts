import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  assertE1Wp4FailureGate,
  serializeE1Wp4FailureGateReceipt,
} from "./failure-gate";
import { redactForReceipt } from "./redaction";

const DECOY_FILES = {
  "project.json": '{"id":"decoy-project","saved":true}\n',
  "scenes/scene.json": '{"id":"decoy-scene","revision":7}\n',
} as const;

async function snapshot(root: string): Promise<string> {
  const hash = createHash("sha256");
  for (const relative of Object.keys(DECOY_FILES).sort()) {
    hash.update(relative);
    hash.update("\0");
    hash.update(await readFile(join(root, relative)));
    hash.update("\0");
  }
  return hash.digest("hex");
}

export async function createE1Wp4NoProjectMutationReceipt() {
  const root = await mkdtemp(join(tmpdir(), "storystage-e1-wp4-decoy-"));
  try {
    for (const [relative, content] of Object.entries(DECOY_FILES)) {
      const path = join(root, relative);
      await mkdir(join(path, ".."), { recursive: true });
      await writeFile(path, content, "utf8");
    }
    const beforeSha256 = await snapshot(root);

    assertE1Wp4FailureGate();
    serializeE1Wp4FailureGateReceipt();
    redactForReceipt({
      prompt: "hostile decoy text",
      projectId: "decoy-project",
    });

    const afterSha256 = await snapshot(root);
    if (beforeSha256 !== afterSha256) {
      throw new Error("The E1-WP4 decoy project mutation tripwire changed.");
    }
    return {
      schemaVersion: 1,
      package: "E1-WP4",
      evidenceClass: "deterministic-decoy-project-tripwire",
      scope: "temporary-decoy-files-only",
      decoyFileCount: Object.keys(DECOY_FILES).length,
      beforeSha256,
      afterSha256,
      unchanged: true,
      projectMutationAllowed: false,
      persistedPath: false,
      executableTest:
        "packages/codex-lab/src/no-project-mutation.test.ts :: leaves the decoy project byte-identical across the failure gate",
      limitation:
        "This proves the isolated WP4 evidence path against a decoy project; production project integration remains outside E1.",
    } as const;
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

export async function serializeE1Wp4NoProjectMutationReceipt(): Promise<string> {
  return `${JSON.stringify(await createE1Wp4NoProjectMutationReceipt(), null, 2)}\n`;
}
