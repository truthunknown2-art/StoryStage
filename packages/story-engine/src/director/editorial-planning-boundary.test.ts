import { readFileSync, realpathSync } from "node:fs";
import { dirname, extname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import { describe, expect, it } from "vitest";

const workspaceRoot = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../../..",
);
const entrypoint = resolve(
  workspaceRoot,
  "packages/story-engine/src/editorial-planning.ts",
);
const forbiddenPaths = [
  /\/apps\//,
  /\/packages\/remotion-runtime\//,
  /\/director\/director-compiler\.ts$/,
  /\/director\/director-project\.ts$/,
  /\/director\/director-production-bundle\.ts$/,
  /\/audio-director\.ts$/,
  /\/delivery\.ts$/,
  /\/pipeline\.ts$/,
  /\/production-bundle\.ts$/,
  /\/production-readiness\.ts$/,
];
const forbiddenSymbols = [
  "compileDirectorProject",
  "sealDirectorProject",
  "sealDirectorProductionBundle",
  "DirectorProject",
  "DirectorProductionBundle",
];
const compilerOptions: ts.CompilerOptions = {
  module: ts.ModuleKind.ESNext,
  moduleResolution: ts.ModuleResolutionKind.Bundler,
  target: ts.ScriptTarget.ES2022,
};
const canonical = (file: string) => {
  try {
    return realpathSync(file);
  } catch {
    return file;
  }
};
const normalized = (file: string) => canonical(file).replaceAll("\\", "/");
const isWorkspaceSource = (file: string) => {
  const path = normalized(file);
  return (
    path.startsWith(normalized(workspaceRoot)) &&
    !path.includes("/node_modules/") &&
    [".ts", ".tsx"].includes(extname(path))
  );
};

const collectTransitiveSources = () => {
  const visited = new Set<string>();
  const queue = [canonical(entrypoint)];
  while (queue.length > 0) {
    const file = queue.shift()!;
    if (visited.has(file)) continue;
    visited.add(file);
    const source = readFileSync(file, "utf8");
    ts.preProcessFile(source, true, true).importedFiles.forEach((item) => {
      const resolved = ts.resolveModuleName(
        item.fileName,
        file,
        compilerOptions,
        ts.sys,
      ).resolvedModule?.resolvedFileName;
      if (resolved && isWorkspaceSource(resolved))
        queue.push(canonical(resolved));
    });
  }
  return [...visited].sort();
};

describe("Editorial planning entrypoint boundary", () => {
  it("cannot reach production, runtime, worker, Studio, audio, or delivery authority", () => {
    const visited = collectTransitiveSources();
    expect(
      visited.filter((file) =>
        forbiddenPaths.some((pattern) => pattern.test(normalized(file))),
      ),
    ).toEqual([]);
    const symbolViolations = visited.flatMap((file) => {
      const source = readFileSync(file, "utf8");
      const parsed = ts.createSourceFile(
        file,
        source,
        ts.ScriptTarget.ES2022,
        true,
      );
      const dependencyStatements = parsed.statements
        .filter(
          (statement) =>
            ts.isImportDeclaration(statement) ||
            ts.isExportDeclaration(statement),
        )
        .map((statement) => statement.getText(parsed));
      return forbiddenSymbols
        .filter((symbol) =>
          dependencyStatements.some((statement) => statement.includes(symbol)),
        )
        .map((symbol) => `${normalized(file)} -> ${symbol}`);
    });
    expect(symbolViolations).toEqual([]);
  });
});
