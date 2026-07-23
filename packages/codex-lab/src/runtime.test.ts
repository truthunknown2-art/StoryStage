import { createHash } from "node:crypto";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { runtimeManifest, type RuntimeManifest } from "./runtime-manifest";
import { verifyRuntimeAtRoot } from "./runtime";

const roots: string[] = [];

afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});

async function makeRuntime(): Promise<{
  root: string;
  manifest: RuntimeManifest;
  executable: string;
}> {
  const root = await mkdtemp(join(tmpdir(), "storystage-runtime-test-"));
  roots.push(root);
  const packageJson = join(root, "@openai", "codex", "package.json");
  const executable = join(
    root,
    ...runtimeManifest.nativeBinaryRelativePath.split("/"),
  );
  await mkdir(dirname(executable), { recursive: true });
  await writeFile(
    packageJson,
    JSON.stringify({ version: runtimeManifest.packageVersion }),
    "utf8",
  );
  const bytes = Buffer.from("pinned-test-executable");
  await writeFile(executable, bytes);
  return {
    root,
    executable,
    manifest: {
      ...runtimeManifest,
      nativeBinarySha256: createHash("sha256").update(bytes).digest("hex"),
    },
  };
}

describe("E1 runtime pin", () => {
  it("accepts only the declared package, native bytes, and CLI version", async () => {
    const fixture = await makeRuntime();
    const verified = await verifyRuntimeAtRoot({
      globalModulesRoot: fixture.root,
      manifest: fixture.manifest,
      readVersion: async () => fixture.manifest.cliVersion,
    });
    expect(verified.executablePath).toBe(fixture.executable);
    expect(verified.executableSha256).toBe(fixture.manifest.nativeBinarySha256);
  });

  it("fails closed when executable bytes are substituted", async () => {
    const fixture = await makeRuntime();
    await writeFile(fixture.executable, "substituted");
    await expect(
      verifyRuntimeAtRoot({
        globalModulesRoot: fixture.root,
        manifest: fixture.manifest,
        readVersion: async () => fixture.manifest.cliVersion,
      }),
    ).rejects.toMatchObject({
      code: "RUNTIME_INCOMPATIBLE",
      stateHint: "incompatible",
    });
  });

  it("rejects either a different package version or CLI version", async () => {
    const wrongPackage = await makeRuntime();
    await expect(
      verifyRuntimeAtRoot({
        globalModulesRoot: wrongPackage.root,
        manifest: { ...wrongPackage.manifest, packageVersion: "0.145.0" },
        readVersion: async () => wrongPackage.manifest.cliVersion,
      }),
    ).rejects.toMatchObject({ code: "RUNTIME_INCOMPATIBLE" });

    const wrongCli = await makeRuntime();
    await expect(
      verifyRuntimeAtRoot({
        globalModulesRoot: wrongCli.root,
        manifest: wrongCli.manifest,
        readVersion: async () => "codex-cli 0.145.0",
      }),
    ).rejects.toMatchObject({ code: "RUNTIME_INCOMPATIBLE" });
  });

  it("reports a missing installation without probing credential storage", async () => {
    const root = await mkdtemp(join(tmpdir(), "storystage-runtime-missing-"));
    roots.push(root);
    await expect(
      verifyRuntimeAtRoot({ globalModulesRoot: root }),
    ).rejects.toMatchObject({
      code: "RUNTIME_NOT_INSTALLED",
      stateHint: "not-installed",
    });
  });
});
