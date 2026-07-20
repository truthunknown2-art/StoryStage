import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const readSources = (dir: string): string[] => {
  const entries: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) entries.push(...readSources(path));
    else if (/\.(ts|tsx)$/.test(entry.name)) entries.push(path);
  }
  return entries;
};

const APP_DIR = join(__dirname, "..");
const STUDIO_DIR = join(__dirname, "../../studio/src");

const FORBIDDEN_APP_IMPORTS = [
  /@remotion\/player/,
  /@storystage\/remotion-runtime/,
  /apps\/studio/,
  /\.\.\/\.\.\/studio/,
  /Cv00\d/,
  /ProductionComposition/,
  /DirectorProductionComposition/,
];

describe("private rig lab boundary", () => {
  it("never imports ordinary Studio screens, the ordinary Player, or runtime compositions", () => {
    const sources = readSources(APP_DIR).filter(
      (path) => !path.includes(".test.") && !path.includes("boundary.test"),
    );
    for (const path of sources) {
      const content = readFileSync(path, "utf8");
      for (const pattern of FORBIDDEN_APP_IMPORTS) {
        expect(
          pattern.test(content),
          `${path} must not contain ${pattern}`,
        ).toBe(false);
      }
    }
  });

  it("is never imported by ordinary Studio", () => {
    const sources = readSources(STUDIO_DIR);
    for (const path of sources) {
      const content = readFileSync(path, "utf8");
      expect(
        content.includes("registration-review"),
        `${path} must not reference the private review app`,
      ).toBe(false);
    }
  });
});
