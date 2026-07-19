import {randomUUID} from "node:crypto";
import {mkdir, rename, writeFile} from "node:fs/promises";
import {join} from "node:path";

export type ImportEvidenceCheckpoint = "candidate-bundle-written" | "import-record-written" | "validation-report-written" | "evidence-committed";

type CommitImportEvidenceOptions = {
  stagingRoot: string;
  expectedContentHash: string;
  files: {candidateBundle: string; importRecord: string; validationReport: string};
  readCommittedContentHash: (evidenceRoot: string) => Promise<string>;
  onCheckpoint?: (checkpoint: ImportEvidenceCheckpoint) => void | Promise<void>;
  transactionId?: string;
};

const isMissing = (error: unknown) => (error as NodeJS.ErrnoException).code === "ENOENT";

export async function commitImportEvidenceDirectory(options: CommitImportEvidenceOptions): Promise<void> {
  const evidenceRoot = join(options.stagingRoot, "evidence");
  try {
    const existingContentHash = await options.readCommittedContentHash(evidenceRoot);
    if (existingContentHash !== options.expectedContentHash) throw new Error("An immutable import-evidence transaction already exists for different candidate bytes.");
    return;
  } catch (error) {
    if (!isMissing(error)) throw error;
  }

  const temporaryRoot = join(options.stagingRoot, `.evidence-${options.transactionId ?? randomUUID()}.tmp`);
  await mkdir(temporaryRoot, {recursive: false});
  await writeFile(join(temporaryRoot, "candidate-bundle.json"), options.files.candidateBundle, {encoding: "utf8", mode: 0o600, flag: "wx"});
  await options.onCheckpoint?.("candidate-bundle-written");
  await writeFile(join(temporaryRoot, "import-record.json"), options.files.importRecord, {encoding: "utf8", mode: 0o600, flag: "wx"});
  await options.onCheckpoint?.("import-record-written");
  await writeFile(join(temporaryRoot, "validation-report.json"), options.files.validationReport, {encoding: "utf8", mode: 0o600, flag: "wx"});
  await options.onCheckpoint?.("validation-report-written");
  try {
    await rename(temporaryRoot, evidenceRoot);
  } catch (error) {
    try {
      const existingContentHash = await options.readCommittedContentHash(evidenceRoot);
      if (existingContentHash === options.expectedContentHash) return;
    } catch {
      // Preserve the original commit failure when no valid concurrent transaction won.
    }
    throw error;
  }
  await options.onCheckpoint?.("evidence-committed");
}
