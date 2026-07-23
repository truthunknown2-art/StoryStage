import { mkdir, mkdtemp, realpath, rm, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { prepareE1LabWorkspace } from "./lab-workspace";

describe("E1 lab workspace containment", () => {
  it("creates a disposable workspace under the fixed StoryStage lab root", async () => {
    const root = await realpath(
      await mkdtemp(join(tmpdir(), "storystage-e1-lab-root-")),
    );
    const codexHome = join(root, "StoryStage", "codex", "0.144.1");
    await mkdir(codexHome, { recursive: true });
    try {
      const workspace = await prepareE1LabWorkspace(codexHome);
      expect(workspace).toContain(
        join("StoryStage", "labs", "E1-WP4", "workspaces", "request-"),
      );
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("rejects a junction component before creating a workspace through it", async () => {
    const root = await realpath(
      await mkdtemp(join(tmpdir(), "storystage-e1-lab-junction-")),
    );
    const outside = await realpath(
      await mkdtemp(join(tmpdir(), "storystage-e1-lab-outside-")),
    );
    const storyStageRoot = join(root, "StoryStage");
    const codexHome = join(storyStageRoot, "codex", "0.144.1");
    await mkdir(codexHome, { recursive: true });
    await symlink(outside, join(storyStageRoot, "labs"), "junction");
    try {
      await expect(prepareE1LabWorkspace(codexHome)).rejects.toMatchObject({
        code: "PROTOCOL_INCOMPATIBLE",
      });
    } finally {
      await rm(root, { recursive: true, force: true });
      await rm(outside, { recursive: true, force: true });
    }
  });
});
