import { execFile } from "node:child_process";
import { lstat, realpath } from "node:fs/promises";
import { win32 } from "node:path";
import { promisify } from "node:util";
import { CodexLabError } from "./errors";

const execFileAsync = promisify(execFile);
const WINDOWS_ERROR = "The trusted Windows system boundary is unavailable.";
const TRUSTED_WINDOWS_ROOT = "C:\\Windows";

function systemError(): CodexLabError {
  return new CodexLabError(
    "PROTOCOL_INCOMPATIBLE",
    WINDOWS_ERROR,
    "incompatible",
  );
}

function sameWindowsPath(left: string, right: string): boolean {
  return (
    win32.normalize(left).toLowerCase() === win32.normalize(right).toLowerCase()
  );
}

export async function getTrustedWindowsPowerShell(): Promise<{
  executable: string;
  environment: NodeJS.ProcessEnv;
}> {
  const root = process.env.SystemRoot;
  const windir = process.env.WINDIR;
  if (
    process.platform !== "win32" ||
    !root ||
    !windir ||
    !win32.isAbsolute(root) ||
    /^(?:\\\\|\/\/)/.test(root) ||
    !sameWindowsPath(root, windir) ||
    !sameWindowsPath(root, TRUSTED_WINDOWS_ROOT)
  ) {
    throw systemError();
  }
  const canonicalRoot = await realpath(root).catch(() => {
    throw systemError();
  });
  if (
    !sameWindowsPath(canonicalRoot, root) ||
    !sameWindowsPath(canonicalRoot, TRUSTED_WINDOWS_ROOT)
  ) {
    throw systemError();
  }

  const executable = win32.join(
    canonicalRoot,
    "System32",
    "WindowsPowerShell",
    "v1.0",
    "powershell.exe",
  );
  const info = await lstat(executable).catch(() => {
    throw systemError();
  });
  if (!info.isFile() || info.isSymbolicLink()) throw systemError();
  if (!sameWindowsPath(await realpath(executable), executable)) {
    throw systemError();
  }
  return {
    executable,
    environment: {
      COMSPEC: win32.join(canonicalRoot, "System32", "cmd.exe"),
      PATH: win32.join(canonicalRoot, "System32"),
      SystemRoot: canonicalRoot,
      TEMP: process.env.TEMP,
      TMP: process.env.TMP,
      WINDIR: canonicalRoot,
    },
  };
}

export async function resolveLocalAppDataKnownFolder(): Promise<string> {
  const system = await getTrustedWindowsPowerShell();
  const { stdout } = await execFileAsync(
    system.executable,
    [
      "-NoLogo",
      "-NoProfile",
      "-NonInteractive",
      "-Command",
      "[Console]::Out.Write([Environment]::GetFolderPath([Environment+SpecialFolder]::LocalApplicationData))",
    ],
    {
      cwd: win32.dirname(system.executable),
      encoding: "utf8",
      env: system.environment,
      timeout: 10_000,
      windowsHide: true,
    },
  ).catch(() => {
    throw systemError();
  });
  if (!stdout || /[\r\n\0]/.test(stdout) || !win32.isAbsolute(stdout)) {
    throw systemError();
  }
  return stdout;
}
