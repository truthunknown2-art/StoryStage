import { existsSync, readFileSync } from "node:fs";
import { dirname, extname, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const workspaceRoot = resolve(import.meta.dirname, "../../..");
const sourceExtensions = [".ts", ".tsx"];
const workspacePackages = new Map([
  ["@storystage/story-engine", "packages/story-engine"],
  ["@storystage/asset-pipeline", "packages/asset-pipeline"],
  ["@storystage/remotion-runtime", "packages/remotion-runtime"],
]);

const resolveSource = (fromFile: string, specifier: string) => {
  let base: string | null = null;
  if (specifier.startsWith(".")) base = resolve(dirname(fromFile), specifier);
  else {
    const packageName = [...workspacePackages.keys()].find(
      (name) => specifier === name || specifier.startsWith(`${name}/`),
    );
    if (packageName) {
      const packageRoot = resolve(
        workspaceRoot,
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
    const imports = source.matchAll(
      /(?:from\s+|import\s*(?:\(\s*)?)["']([^"']+)["']/g,
    );
    for (const match of imports) {
      const resolved = resolveSource(file, match[1]!);
      if (resolved) visit(resolved);
    }
  };
  visit(entry);
  return visited;
};

describe("candidate private registration browser boundary", () => {
  it("keeps private candidate rendering outside the Studio import graph", () => {
    const graph = collectImportGraph(resolve(import.meta.dirname, "App.tsx"));
    const forbidden = [...graph].filter((file) =>
      /candidate-rig-(?:source-review|private-registration)|CandidateRig(?:SourceReview|PrivateRegistration)/i.test(
        file,
      ),
    );
    expect(forbidden).toEqual([]);
    expect(
      existsSync(
        resolve(
          workspaceRoot,
          "packages/remotion-runtime/src/CandidateRigPrivateRegistrationDiagnostic.tsx",
        ),
      ),
    ).toBe(false);
  });
});
