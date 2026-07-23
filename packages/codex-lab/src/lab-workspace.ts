import { lstat, mkdir, mkdtemp, realpath } from "node:fs/promises";
import { win32 } from "node:path";
import { CodexLabError } from "./errors";

const WORKSPACE_COMPONENTS = ["labs", "E1-WP4", "workspaces"] as const;

function containmentError(): CodexLabError {
  return new CodexLabError(
    "PROTOCOL_INCOMPATIBLE",
    "The isolated E1 lab workspace root is unavailable.",
    "incompatible",
  );
}

function samePath(left: string, right: string): boolean {
  return (
    win32.normalize(left).toLowerCase() === win32.normalize(right).toLowerCase()
  );
}

async function requireCanonicalDirectory(path: string): Promise<void> {
  try {
    const info = await lstat(path);
    if (info.isSymbolicLink() || !info.isDirectory()) throw containmentError();
    if (!samePath(await realpath(path), path)) throw containmentError();
  } catch (error) {
    if (error instanceof CodexLabError) throw error;
    throw containmentError();
  }
}

/**
 * Creates one disposable proposal workspace under the already-validated
 * StoryStage LocalAppData root. No TEMP/TMP value participates in its path.
 */
export async function prepareE1LabWorkspace(
  codexHome: string,
): Promise<string> {
  const normalizedHome = win32.resolve(codexHome);
  if (
    win32.basename(normalizedHome) !== "0.144.1" ||
    win32.basename(win32.dirname(normalizedHome)).toLowerCase() !== "codex"
  ) {
    throw containmentError();
  }

  const storyStageRoot = win32.dirname(win32.dirname(normalizedHome));
  await requireCanonicalDirectory(storyStageRoot);

  let current = storyStageRoot;
  for (const component of WORKSPACE_COMPONENTS) {
    current = win32.join(current, component);
    try {
      await mkdir(current);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") {
        throw containmentError();
      }
    }
    await requireCanonicalDirectory(current);
  }

  const workspace = await mkdtemp(win32.join(current, "request-"));
  await requireCanonicalDirectory(workspace);
  if (win32.dirname(workspace).toLowerCase() !== current.toLowerCase()) {
    throw containmentError();
  }
  return workspace;
}
