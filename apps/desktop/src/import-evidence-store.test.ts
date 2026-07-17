import {mkdtemp, readFile, readdir, rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {afterEach, describe, expect, it} from "vitest";
import {commitImportEvidenceDirectory, type ImportEvidenceCheckpoint} from "./import-evidence-store";

const roots: string[] = [];
const checkpoints: ImportEvidenceCheckpoint[] = [
  "candidate-bundle-written",
  "import-record-written",
  "validation-report-written",
  "evidence-committed",
];

const expectedContentHash = "a".repeat(64);
const files = {
  candidateBundle: '{"schemaVersion":"1.0"}\n',
  importRecord: `${JSON.stringify({contentHash: expectedContentHash})}\n`,
  validationReport: '{"schemaVersion":"1.0"}\n',
};
const readCommittedContentHash = async (evidenceRoot: string) => {
  const record = JSON.parse(await readFile(join(evidenceRoot, "import-record.json"), "utf8")) as {contentHash: string};
  return record.contentHash;
};

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, {recursive: true, force: true})));
});

describe("atomic import evidence directory", () => {
  for (const crashPoint of checkpoints) {
    it(`recovers idempotently after ${crashPoint}`, async () => {
      const stagingRoot = await mkdtemp(join(tmpdir(), "storystage-evidence-"));
      roots.push(stagingRoot);
      await expect(commitImportEvidenceDirectory({
        stagingRoot,
        expectedContentHash,
        files,
        readCommittedContentHash,
        transactionId: `crash-${crashPoint}`,
        onCheckpoint: (checkpoint) => {
          if (checkpoint === crashPoint) throw new Error(`simulated crash after ${checkpoint}`);
        },
      })).rejects.toThrow("simulated crash");

      await commitImportEvidenceDirectory({stagingRoot, expectedContentHash, files, readCommittedContentHash, transactionId: `retry-${crashPoint}`});
      expect(await readCommittedContentHash(join(stagingRoot, "evidence"))).toBe(expectedContentHash);
      expect(await readFile(join(stagingRoot, "evidence", "candidate-bundle.json"), "utf8")).toBe(files.candidateBundle);
      expect(await readFile(join(stagingRoot, "evidence", "validation-report.json"), "utf8")).toBe(files.validationReport);

      await commitImportEvidenceDirectory({stagingRoot, expectedContentHash, files, readCommittedContentHash, transactionId: `idempotent-${crashPoint}`});
      expect((await readdir(stagingRoot)).some((name) => name.includes(`idempotent-${crashPoint}`))).toBe(false);
    });
  }

  it("refuses an existing transaction with a different immutable content hash", async () => {
    const stagingRoot = await mkdtemp(join(tmpdir(), "storystage-evidence-"));
    roots.push(stagingRoot);
    await commitImportEvidenceDirectory({stagingRoot, expectedContentHash, files, readCommittedContentHash, transactionId: "original"});
    await expect(commitImportEvidenceDirectory({stagingRoot, expectedContentHash: "b".repeat(64), files, readCommittedContentHash, transactionId: "conflict"})).rejects.toThrow(/different candidate bytes/i);
  });
});
