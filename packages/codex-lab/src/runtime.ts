import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { createReadStream, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { promisify } from "node:util";
import { CodexLabError } from "./errors";
import { runtimeManifest, type RuntimeManifest } from "./runtime-manifest";

const execFileAsync = promisify(execFile);

export type VerifiedRuntime = {
  executablePath: string;
  executableSha256: string;
  packageVersion: string;
  cliVersion: string;
  protocolSha256: string;
};

export async function sha256File(path: string): Promise<string> {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(path)) hash.update(chunk);
  return hash.digest("hex");
}

function getDefaultGlobalModulesRoot(): string {
  if (process.platform !== "win32" || !process.env.APPDATA) {
    throw new CodexLabError(
      "RUNTIME_NOT_INSTALLED",
      "The pinned Windows Codex runtime could not be located.",
      "not-installed",
    );
  }
  return join(process.env.APPDATA, "npm", "node_modules");
}

export async function verifyRuntimeAtRoot(options: {
  globalModulesRoot: string;
  manifest?: RuntimeManifest;
  readVersion?: (executablePath: string) => Promise<string>;
}): Promise<VerifiedRuntime> {
  const manifest = options.manifest ?? runtimeManifest;
  const packageJsonPath = join(
    options.globalModulesRoot,
    "@openai",
    "codex",
    "package.json",
  );
  const executablePath = join(
    options.globalModulesRoot,
    ...manifest.nativeBinaryRelativePath.split("/"),
  );

  let packageVersion: string;
  try {
    const packageData = JSON.parse(readFileSync(packageJsonPath, "utf8")) as {
      version?: unknown;
    };
    packageVersion =
      typeof packageData.version === "string" ? packageData.version : "";
    if (!statSync(executablePath).isFile()) throw new Error("not a file");
  } catch {
    throw new CodexLabError(
      "RUNTIME_NOT_INSTALLED",
      "The pinned Codex runtime is not installed.",
      "not-installed",
    );
  }

  if (packageVersion !== manifest.packageVersion) {
    throw new CodexLabError(
      "RUNTIME_INCOMPATIBLE",
      "The installed Codex package version does not match the pin.",
      "incompatible",
    );
  }

  const executableSha256 = await sha256File(executablePath);
  if (executableSha256 !== manifest.nativeBinarySha256) {
    throw new CodexLabError(
      "RUNTIME_INCOMPATIBLE",
      "The installed Codex native executable does not match the pin.",
      "incompatible",
    );
  }

  const readVersion =
    options.readVersion ??
    (async (path: string) => {
      const result = await execFileAsync(path, ["--version"], {
        encoding: "utf8",
        windowsHide: true,
        timeout: 10_000,
      });
      return result.stdout.trim();
    });
  let cliVersion: string;
  try {
    cliVersion = await readVersion(executablePath);
  } catch {
    throw new CodexLabError(
      "RUNTIME_INCOMPATIBLE",
      "The pinned Codex native executable could not report its version.",
      "incompatible",
    );
  }
  if (cliVersion !== manifest.cliVersion) {
    throw new CodexLabError(
      "RUNTIME_INCOMPATIBLE",
      "The installed Codex CLI version does not match the pin.",
      "incompatible",
    );
  }

  return {
    executablePath,
    executableSha256,
    packageVersion,
    cliVersion,
    protocolSha256: manifest.protocolSha256,
  };
}

export async function verifyPinnedRuntime(): Promise<VerifiedRuntime> {
  return verifyRuntimeAtRoot({
    globalModulesRoot: getDefaultGlobalModulesRoot(),
  });
}
