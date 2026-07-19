import { readFileSync, realpathSync } from "node:fs";
import { dirname, extname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import { describe, expect, it } from "vitest";

const workspaceRoot = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../../..",
);
const entrypoints = [
  "packages/story-engine/src/director/director-project.ts",
  "packages/story-engine/src/director/director-proposal.ts",
  "packages/story-engine/src/director/director-compiler.ts",
  "packages/remotion-runtime/src/director/DirectorEpisodeRenderer.tsx",
  "packages/remotion-runtime/src/director/DirectorProductionComposition.tsx",
  "apps/studio/src/director/DirectorPreview.tsx",
].map((file) => resolve(workspaceRoot, file));

const forbiddenPaths = [
  /\/cv001-/,
  /\/cv002-template-assignment\.ts$/,
  /\/kids-showcase/,
  /\/src\/director\.ts$/,
  /\/src\/pipeline\.ts$/,
  /\/src\/animation-compiler\.ts$/,
  /\/Cv002TemplateAssignmentPanel\.tsx$/,
  /\/KidsShowcaseStudio\.tsx$/,
];
const forbiddenSymbols = [
  "createCv001ThreeBeatProofFixture",
  "compileCv002AssignedScenePreview",
  "directEpisode",
  "buildAnimaticSync",
  "compileAnimation",
  "KidsShowcaseProgram",
  "FrameAccurateRenderPlan",
];

const compilerOptions: ts.CompilerOptions = {
  allowSyntheticDefaultImports: true,
  jsx: ts.JsxEmit.ReactJSX,
  module: ts.ModuleKind.ESNext,
  moduleResolution: ts.ModuleResolutionKind.Bundler,
  resolveJsonModule: true,
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

function collectTransitiveSources() {
  const visited = new Set<string>();
  const queue = entrypoints.map(canonical);
  while (queue.length > 0) {
    const file = queue.shift()!;
    if (visited.has(file)) continue;
    visited.add(file);
    const source = readFileSync(file, "utf8");
    const imports = ts
      .preProcessFile(source, true, true)
      .importedFiles.map((item) => item.fileName);
    imports.forEach((specifier) => {
      const resolved = ts.resolveModuleName(
        specifier,
        file,
        compilerOptions,
        ts.sys,
      ).resolvedModule?.resolvedFileName;
      if (resolved && isWorkspaceSource(resolved))
        queue.push(canonical(resolved));
    });
  }
  return [...visited].sort();
}

describe("Director Alpha import boundary", () => {
  it("cannot reach legacy directing, preview, showcase, or CV-001 code transitively", () => {
    const visited = collectTransitiveSources();
    const pathViolations = visited.filter((file) =>
      forbiddenPaths.some((pattern) => pattern.test(normalized(file))),
    );
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
    expect(pathViolations.map(normalized)).toEqual([]);
    expect(symbolViolations).toEqual([]);
  });
});
