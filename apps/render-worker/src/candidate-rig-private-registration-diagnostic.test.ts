import { existsSync, readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, extname, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import sharp from "sharp";
import {
  isTrustedCandidateRigPrivateRegistrationDiagnostic,
  probeCandidateRigPrivateRegistrationDiagnosticPng,
} from "./candidate-rig-private-registration-diagnostic";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const sourceExtensions = [".ts", ".tsx"];
const workspacePackages = new Map([
  ["@storystage/story-engine", "packages/story-engine"],
  ["@storystage/asset-pipeline", "packages/asset-pipeline"],
  ["@storystage/remotion-runtime", "packages/remotion-runtime"],
]);

const resolveWorkspaceSource = (fromFile: string, specifier: string) => {
  let base: string | null = null;
  if (specifier.startsWith(".")) base = resolve(dirname(fromFile), specifier);
  else {
    const packageName = [...workspacePackages.keys()].find(
      (name) => specifier === name || specifier.startsWith(`${name}/`),
    );
    if (packageName) {
      const packageRoot = resolve(
        repoRoot,
        workspacePackages.get(packageName)!,
      );
      const packageJson = JSON.parse(
        readFileSync(resolve(packageRoot, "package.json"), "utf8"),
      ) as { exports?: Record<string, string> };
      const subpath = specifier.slice(packageName.length);
      const target = packageJson.exports?.[subpath ? `.${subpath}` : "."];
      if (target) base = resolve(packageRoot, target);
    }
  }
  if (!base) return null;
  const candidates = extname(base)
    ? [base]
    : [
        ...sourceExtensions.map((extension) => `${base}${extension}`),
        ...sourceExtensions.map((extension) =>
          resolve(base, `index${extension}`),
        ),
      ];
  return candidates.find(existsSync) ?? null;
};

const collectImportGraph = (entry: string) => {
  const visited = new Set<string>();
  const visit = (file: string) => {
    if (visited.has(file)) return;
    visited.add(file);
    const source = readFileSync(file, "utf8");
    for (const match of source.matchAll(
      /(?:from\s+|import\s*(?:\(\s*)?)["']([^"']+)["']/g,
    )) {
      const imported = resolveWorkspaceSource(file, match[1]!);
      if (imported) visit(imported);
    }
  };
  visit(entry);
  return visited;
};
const png = (width: number, height: number) =>
  sharp({
    create: {
      width,
      height,
      channels: 4,
      background: { r: 22, g: 40, b: 41, alpha: 1 },
    },
  })
    .png()
    .toBuffer();

describe("private Candidate-I registration static diagnostic boundary", () => {
  it("fully decodes only exact 1920x1080 PNG diagnostics", async () => {
    await expect(
      probeCandidateRigPrivateRegistrationDiagnosticPng(await png(1920, 1080)),
    ).resolves.toBeUndefined();
    await expect(
      probeCandidateRigPrivateRegistrationDiagnosticPng(await png(1280, 720)),
    ).rejects.toThrow(/1920x1080/i);
    await expect(
      probeCandidateRigPrivateRegistrationDiagnosticPng(
        Buffer.from("not a png"),
      ),
    ).rejects.toThrow(/not a PNG/i);
  });

  it("is not exported by the ordinary worker and contains no motion renderer", async () => {
    const [publicIndex, route, entry] = await Promise.all([
      readFile(resolve(repoRoot, "apps/render-worker/src/index.ts"), "utf8"),
      readFile(
        resolve(
          repoRoot,
          "apps/render-worker/src/candidate-rig-private-registration-diagnostic.ts",
        ),
        "utf8",
      ),
      readFile(
        resolve(
          repoRoot,
          "apps/render-worker/src/candidate-rig-private-registration-remotion-entry.tsx",
        ),
        "utf8",
      ),
    ]);
    expect(publicIndex).not.toMatch(/private-registration|source-review/i);
    expect(route).not.toMatch(/renderMedia|renderFrames|\.mp4|180/);
    expect(entry).toMatch(/<Still/);
    expect(entry).not.toMatch(/<Composition|durationInFrames|fps=/);
  });

  it("is unreachable through transitive relative and workspace imports from the ordinary worker entry", () => {
    const graph = collectImportGraph(
      resolve(repoRoot, "apps/render-worker/src/index.ts"),
    );
    expect(
      [...graph].filter((file) =>
        /candidate-rig-(?:private-registration|exact-attachment|gap-orbit|unapproved-registration)|CandidateRigPrivateRegistration/i.test(
          file,
        ),
      ),
    ).toEqual([]);
  });

  it("does not trust a merely parsed or cloned receipt-shaped object", () => {
    expect(isTrustedCandidateRigPrivateRegistrationDiagnostic({})).toBe(false);
    expect(
      isTrustedCandidateRigPrivateRegistrationDiagnostic(
        structuredClone({ contentHash: "0".repeat(64) }),
      ),
    ).toBe(false);
  });
});
