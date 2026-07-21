import { randomUUID } from "node:crypto";
import { lstat, mkdir, rm, symlink, writeFile } from "node:fs/promises";
import { win32 } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { prepareE1CodexHome } from "./e1-codex-state";

const forbiddenChildAccess = vi.hoisted(() => ({
  readFile: vi.fn(() => Promise.reject(new Error("child read forbidden"))),
  readdir: vi.fn(() =>
    Promise.reject(new Error("child enumeration forbidden")),
  ),
}));

vi.mock("node:fs/promises", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs/promises")>();
  return {
    ...actual,
    readFile: forbiddenChildAccess.readFile,
    readdir: forbiddenChildAccess.readdir,
  };
});

vi.mock("./windows-system", () => ({
  resolveLocalAppDataKnownFolder: async () => process.env.LOCALAPPDATA,
}));

const cleanupPaths: string[] = [];
const realLocalAppData = process.env.LOCALAPPDATA;

afterEach(async () => {
  vi.unstubAllEnvs();
  forbiddenChildAccess.readFile.mockClear();
  forbiddenChildAccess.readdir.mockClear();
  await Promise.all(
    cleanupPaths
      .splice(0)
      .map((path) => rm(path, { force: true, recursive: true })),
  );
});

async function makeLocalAppData(): Promise<string> {
  if (!realLocalAppData) throw new Error("Windows LOCALAPPDATA is required");
  const root = win32.join(
    realLocalAppData,
    `storystage-e1-state-tests-${randomUUID()}`,
  );
  cleanupPaths.push(root);
  await mkdir(root, { recursive: true });
  return root;
}

function stubLocalAppData(value: string): void {
  vi.stubEnv("LOCALAPPDATA", value);
}

describe("E1 dedicated Codex state root", () => {
  it("selects only the fixed persistent versioned path", async () => {
    const localAppData = await makeLocalAppData();
    stubLocalAppData(localAppData);

    const expected = win32.join(localAppData, "StoryStage", "codex", "0.144.1");
    expect(await prepareE1CodexHome()).toBe(expected);
    stubLocalAppData(`${localAppData}\\`);
    expect(await prepareE1CodexHome()).toBe(expected);

    for (const path of [
      win32.join(localAppData, "StoryStage"),
      win32.join(localAppData, "StoryStage", "codex"),
      expected,
    ]) {
      expect((await lstat(path)).isDirectory()).toBe(true);
    }
  });

  it("rejects a missing, relative, UNC, or device-style base", async () => {
    const missing = await makeLocalAppData();
    await rm(missing, { recursive: true });

    for (const value of [
      "",
      "relative\\local",
      "\\\\server\\share\\local",
      "\\\\?\\C:\\Users\\test\\AppData\\Local",
      missing,
    ]) {
      stubLocalAppData(value);
      await expect(prepareE1CodexHome()).rejects.toMatchObject({
        code: "PROTOCOL_INCOMPATIBLE",
        message: "The dedicated Codex state root is unavailable.",
      });
    }
  });

  it.each([
    ["project", "C:\\Projects\\StoryStage"],
    ["repo", "D:\\repos\\StoryStage"],
    ["temporary", "C:\\Users\\test\\AppData\\Local\\Temp"],
    ["installation", "C:\\Program Files\\StoryStage"],
    ["synced", "C:\\Users\\test\\OneDrive - Example"],
  ])("rejects a %s-style base", async (_kind, localAppData) => {
    stubLocalAppData(localAppData);
    await expect(prepareE1CodexHome()).rejects.toMatchObject({
      code: "PROTOCOL_INCOMPATIBLE",
      message: "The dedicated Codex state root is unavailable.",
    });
  });

  it("rejects a file planted at the dedicated leaf without leaking its path", async () => {
    const localAppData = await makeLocalAppData();
    const leaf = win32.join(localAppData, "StoryStage", "codex", "0.144.1");
    await mkdir(win32.dirname(leaf), { recursive: true });
    await writeFile(leaf, "not a state directory", "utf8");
    stubLocalAppData(localAppData);

    const error = await prepareE1CodexHome().catch((caught) => caught);
    expect(error).toMatchObject({
      code: "PROTOCOL_INCOMPATIBLE",
      message: "The dedicated Codex state root is unavailable.",
    });
    expect(error.message).not.toContain(localAppData);
    expect(error.message).not.toContain(leaf);
  });

  it("rejects a junction component before writing through it", async () => {
    const localAppData = await makeLocalAppData();
    const outside = win32.join(
      realLocalAppData!,
      `storystage-e1-state-junction-${randomUUID()}`,
    );
    cleanupPaths.push(outside);
    await mkdir(win32.join(localAppData, "StoryStage"), { recursive: true });
    await mkdir(outside, { recursive: true });
    await symlink(
      outside,
      win32.join(localAppData, "StoryStage", "codex"),
      "junction",
    );
    stubLocalAppData(localAppData);

    const error = await prepareE1CodexHome().catch((caught) => caught);
    expect(error).toMatchObject({
      code: "PROTOCOL_INCOMPATIBLE",
      message: "The dedicated Codex state root is unavailable.",
    });
    expect(error.message).not.toContain(outside);
    await expect(lstat(win32.join(outside, "0.144.1"))).rejects.toMatchObject({
      code: "ENOENT",
    });
  });

  it("never enumerates or reads opaque Codex child state", async () => {
    const localAppData = await makeLocalAppData();
    stubLocalAppData(localAppData);

    await prepareE1CodexHome();

    expect(forbiddenChildAccess.readdir).not.toHaveBeenCalled();
    expect(forbiddenChildAccess.readFile).not.toHaveBeenCalled();
  });
});
