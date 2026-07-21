import { lstat, mkdir, realpath } from "node:fs/promises";
import { win32 } from "node:path";
import { CodexLabError } from "./errors";
import { resolveLocalAppDataKnownFolder } from "./windows-system";

const STATE_COMPONENTS = ["StoryStage", "codex", "0.144.1"] as const;
const STATE_ERROR = "The dedicated Codex state root is unavailable.";

const forbiddenBaseComponent =
  /^(?:\.git|code|dev(?:elopment)?|git|github|projects?|repos?|repositories?|source|src|workspaces?|worktrees?|\.?temp|\.?tmp|temporary files?|program files(?: \(x86\))?|programdata|programs?|windows|install(?:ation|ed|s)?|applications?|packages?|onedrive(?:\s*-\s*.+)?|dropbox|google ?drive|icloud(?: ?drive)?|box|sharepoint|creative cloud files|nextcloud|pcloud(?: drive)?|mega|synology(?: drive)?|resilio sync|sync(?:ed)?)$/i;

function protocolError(): CodexLabError {
  return new CodexLabError(
    "PROTOCOL_INCOMPATIBLE",
    STATE_ERROR,
    "incompatible",
  );
}

function writeError(): CodexLabError {
  return new CodexLabError("WRITE_FAILED", STATE_ERROR, "incompatible");
}

function isMissing(error: unknown): boolean {
  return (error as NodeJS.ErrnoException).code === "ENOENT";
}

function sameWindowsPath(left: string, right: string): boolean {
  return (
    win32.normalize(left).toLowerCase() === win32.normalize(right).toLowerCase()
  );
}

function validateLocalAppData(value: string | undefined): string {
  if (
    process.platform !== "win32" ||
    !value ||
    !win32.isAbsolute(value) ||
    /^(?:\\\\|\/\/)/.test(value)
  ) {
    throw protocolError();
  }

  const base = win32.resolve(value);
  if (!/^[A-Za-z]:\\$/.test(win32.parse(base).root)) throw protocolError();

  const components = base
    .slice(win32.parse(base).root.length)
    .split(/[\\/]+/)
    .filter(Boolean);
  if (
    components.length < 2 ||
    components.some((component) => forbiddenBaseComponent.test(component))
  ) {
    throw protocolError();
  }
  return base;
}

async function metadata(
  path: string,
): Promise<Awaited<ReturnType<typeof lstat>> | null> {
  try {
    return await lstat(path);
  } catch (error) {
    if (isMissing(error)) return null;
    throw protocolError();
  }
}

function requireRealDirectory(
  info: Awaited<ReturnType<typeof lstat>> | null,
): void {
  if (!info || info.isSymbolicLink() || !info.isDirectory()) {
    throw protocolError();
  }
}

async function canonicalPath(path: string): Promise<string> {
  try {
    return await realpath(path);
  } catch {
    throw protocolError();
  }
}

/**
 * Selects and creates the one persistent E1 Codex-owned state root.
 * Child state is opaque: this routine never opens or enumerates its contents.
 */
export async function prepareE1CodexHome(): Promise<string> {
  const localAppData = validateLocalAppData(process.env.LOCALAPPDATA);
  const knownLocalAppData = validateLocalAppData(
    await resolveLocalAppDataKnownFolder(),
  );
  if (!sameWindowsPath(localAppData, knownLocalAppData)) {
    throw protocolError();
  }
  requireRealDirectory(await metadata(localAppData));
  if (!sameWindowsPath(await canonicalPath(localAppData), localAppData)) {
    throw protocolError();
  }

  const stateRoot = win32.join(localAppData, ...STATE_COMPONENTS);
  const relativeComponents = win32
    .relative(localAppData, stateRoot)
    .split(win32.sep);
  if (
    relativeComponents.length !== STATE_COMPONENTS.length ||
    relativeComponents.some(
      (component, index) => component !== STATE_COMPONENTS[index],
    )
  ) {
    throw protocolError();
  }

  let current = localAppData;
  for (const component of STATE_COMPONENTS) {
    current = win32.join(current, component);
    const info = await metadata(current);
    if (!info) break;
    requireRealDirectory(info);
  }

  try {
    await mkdir(stateRoot, { recursive: true });
  } catch {
    throw writeError();
  }

  current = localAppData;
  for (const component of STATE_COMPONENTS) {
    current = win32.join(current, component);
    requireRealDirectory(await metadata(current));
  }

  if (!sameWindowsPath(await canonicalPath(stateRoot), stateRoot)) {
    throw protocolError();
  }
  return stateRoot;
}
