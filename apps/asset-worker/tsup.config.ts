import {defineConfig} from "tsup";

export default defineConfig({
  clean: true,
  entry: ["src/asset-worker.ts"],
  external: [],
  format: ["cjs"],
  noExternal: ["@storystage/asset-pipeline", "@storystage/contracts", "@storystage/story-engine", "@noble/hashes", "zod"],
  outDir: "dist",
});
