import { describe, expect, it } from "vitest";
import { mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  createE1Wp4NoProjectMutationReceipt,
  createE1Wp4TreeSnapshot,
} from "./no-project-mutation";

describe("E1-WP4 no-project-mutation tripwire", () => {
  it("runs real round-trip failures beside a byte-identical decoy project", async () => {
    const receipt = await createE1Wp4NoProjectMutationReceipt();
    expect(receipt).toMatchObject({
      schemaVersion: 3,
      unchanged: true,
      unexpectedFileDetection: true,
      decoyDirectoryCount: 4,
      decoyFileCount: 4,
      failurePathCount: 9,
      projectMutationAllowed: false,
      beforeSha256: receipt.afterSha256,
      persistedPath: false,
    });
    expect(
      receipt.failureExercises.map(({ observedCode }) => observedCode),
    ).toEqual([
      "RUNTIME_NOT_INSTALLED",
      "OPERATION_CANCELLED",
      "AUTH_REQUIRED",
      "AUTH_REVOKED",
      "OFFLINE",
      "USAGE_LIMITED",
      "PROTOCOL_INCOMPATIBLE",
      "MCP_STARTUP_FAILED",
      "PROTOCOL_REQUEST_FAILED",
    ]);
    expect(
      receipt.failureExercises
        .filter(({ clientClosed }) => clientClosed !== null)
        .every(({ clientClosed }) => clientClosed),
    ).toBe(true);
  });

  it("detects added, removed, changed, empty-directory, and non-file entries", async () => {
    const root = await mkdtemp(join(tmpdir(), "storystage-e1-wp4-empty-dir-"));
    const outside = await mkdtemp(
      join(tmpdir(), "storystage-e1-wp4-non-file-target-"),
    );
    try {
      await mkdir(join(root, "existing-empty"));
      await writeFile(join(root, "project.json"), "original\n", "utf8");
      const baseline = await createE1Wp4TreeSnapshot(root);

      await writeFile(join(root, "project.json"), "changed\n", "utf8");
      expect((await createE1Wp4TreeSnapshot(root)).sha256).not.toBe(
        baseline.sha256,
      );
      await writeFile(join(root, "project.json"), "original\n", "utf8");

      await mkdir(join(root, "added-empty"));
      const withAddedDirectory = await createE1Wp4TreeSnapshot(root);
      expect(withAddedDirectory.sha256).not.toBe(baseline.sha256);
      expect(withAddedDirectory.entries).toContain("added-empty/");
      await rm(join(root, "added-empty"), { recursive: true, force: true });

      await rm(join(root, "existing-empty"), { recursive: true, force: true });
      expect((await createE1Wp4TreeSnapshot(root)).sha256).not.toBe(
        baseline.sha256,
      );
      await mkdir(join(root, "existing-empty"));

      await writeFile(join(root, "added.json"), "added\n", "utf8");
      expect((await createE1Wp4TreeSnapshot(root)).sha256).not.toBe(
        baseline.sha256,
      );
      await rm(join(root, "added.json"), { force: true });

      await symlink(outside, join(root, "linked-entry"), "junction");
      const withNonFile = await createE1Wp4TreeSnapshot(root);
      expect(withNonFile.sha256).not.toBe(baseline.sha256);
      expect(withNonFile.entries).toContain("linked-entry:non-file");
    } finally {
      await rm(root, { recursive: true, force: true });
      await rm(outside, { recursive: true, force: true });
    }
  });
});
