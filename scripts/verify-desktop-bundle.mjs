import {readFile} from "node:fs/promises";
import {resolve} from "node:path";
import process from "node:process";

const desktopDist = resolve(import.meta.dirname, "../apps/desktop/dist");
const bundlePaths = [resolve(desktopDist, "main.js"), resolve(desktopDist, "preload.js")];
const unresolvedWorkspaceImport = /(?:require\(|from\s+)["']@storystage\//;

for (const bundlePath of bundlePaths) {
  const source = await readFile(bundlePath, "utf8");
  if (unresolvedWorkspaceImport.test(source)) {
    throw new Error(
      `${bundlePath} still contains a runtime @storystage workspace import. ` +
      "Electron cannot execute the workspace TypeScript sources directly; add the package to tsup noExternal.",
    );
  }
}

process.stdout.write("Desktop bundle check passed: workspace packages are bundled for Electron.\n");
