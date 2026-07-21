import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const packageRoot = join(root, "packages", "codex-lab");
const manifest = JSON.parse(
  readFileSync(join(packageRoot, "runtime-manifest.json"), "utf8"),
);
const artifact = join(packageRoot, manifest.protocolArtifact);
const mode = process.argv[2] ?? "--check-artifact";

function sha256Bytes(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function sha256(path) {
  return sha256Bytes(readFileSync(path));
}

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, canonicalize(value[key])]),
    );
  }
  return value;
}

function canonicalJson(path) {
  return `${JSON.stringify(canonicalize(JSON.parse(readFileSync(path, "utf8"))), null, 2)}\n`;
}

function verifyArtifact(path) {
  const text = readFileSync(path, "utf8").replaceAll("\r\n", "\n");
  const canonical = canonicalJson(path);
  if (text !== canonical) {
    throw new Error("Pinned protocol artifact is not canonical JSON.");
  }
  const actual = sha256Bytes(canonical);
  if (actual !== manifest.protocolSha256) {
    throw new Error(
      `Pinned protocol artifact hash mismatch: expected ${manifest.protocolSha256}, received ${actual}.`,
    );
  }
  const schema = JSON.parse(text);
  if (schema.title !== "CodexAppServerProtocolV2" || !schema.definitions) {
    throw new Error(
      "Pinned protocol artifact is not the expected v2 schema bundle.",
    );
  }
  for (const method of [
    "initialize",
    "account/read",
    "account/login/start",
    "account/login/cancel",
    "account/logout",
    "account/rateLimits/read",
    "account/usage/read",
    "model/list",
    "thread/start",
    "turn/start",
    "turn/interrupt",
  ]) {
    if (!text.includes(`"${method}"`)) {
      throw new Error(`Pinned protocol artifact is missing ${method}.`);
    }
  }
}

function resolveInstalledRuntime() {
  const globalRoot =
    process.platform === "win32" && process.env.APPDATA
      ? join(process.env.APPDATA, "npm", "node_modules")
      : execFileSync("npm", ["root", "-g"], {
          encoding: "utf8",
          windowsHide: true,
        }).trim();
  const packageJson = join(globalRoot, "@openai", "codex", "package.json");
  const packageData = JSON.parse(readFileSync(packageJson, "utf8"));
  if (packageData.version !== manifest.packageVersion) {
    throw new Error(
      `Installed Codex package is ${packageData.version}; expected ${manifest.packageVersion}.`,
    );
  }
  const executable = join(
    globalRoot,
    ...manifest.nativeBinaryRelativePath.split("/"),
  );
  if (!statSync(executable).isFile()) {
    throw new Error("Pinned Codex native executable is not a file.");
  }
  const executableHash = sha256(executable);
  if (executableHash !== manifest.nativeBinarySha256) {
    throw new Error(
      `Installed Codex executable hash mismatch: expected ${manifest.nativeBinarySha256}, received ${executableHash}.`,
    );
  }
  const version = spawnSync(executable, ["--version"], {
    encoding: "utf8",
    windowsHide: true,
  });
  if (version.status !== 0 || version.stdout.trim() !== manifest.cliVersion) {
    throw new Error(
      "Installed Codex CLI version output does not match the pin.",
    );
  }
  return executable;
}

function generate(executable) {
  const tempRoot = mkdtempSync(join(tmpdir(), "storystage-e1-schema-"));
  try {
    const result = spawnSync(
      executable,
      [...manifest.schemaGenerationArgs, tempRoot],
      { encoding: "utf8", windowsHide: true },
    );
    if (result.status !== 0) {
      throw new Error("Pinned Codex schema generation failed.");
    }
    const generated = join(
      tempRoot,
      "codex_app_server_protocol.v2.schemas.json",
    );
    const generatedCanonical = canonicalJson(generated);
    if (sha256Bytes(generatedCanonical) !== manifest.protocolSha256) {
      throw new Error(
        "Installed Codex generated a different stable protocol schema.",
      );
    }
    return { generatedCanonical, tempRoot };
  } catch (error) {
    rmSync(tempRoot, { recursive: true, force: true });
    throw error;
  }
}

if (mode === "--check-artifact") {
  verifyArtifact(artifact);
  process.stdout.write(
    `E1 App Server schema artifact PASS: ${manifest.packageVersion} / ${manifest.protocolSha256}\n`,
  );
} else if (mode === "--check-installed" || mode === "--write") {
  const executable = resolveInstalledRuntime();
  const { generatedCanonical, tempRoot } = generate(executable);
  try {
    if (mode === "--write") {
      mkdirSync(dirname(artifact), { recursive: true });
      writeFileSync(artifact, generatedCanonical, "utf8");
      verifyArtifact(artifact);
    } else if (sha256Bytes(generatedCanonical) !== manifest.protocolSha256) {
      throw new Error(
        "Installed Codex generated a different stable protocol schema.",
      );
    }
    process.stdout.write(
      `E1 installed App Server schema PASS: ${manifest.packageVersion} / ${manifest.protocolSha256}\n`,
    );
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
} else {
  throw new Error(`Unknown mode: ${mode}`);
}
