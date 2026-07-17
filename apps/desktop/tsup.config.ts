import {defineConfig} from "tsup";

export default defineConfig({
  clean: true,
  entry: ["src/main.ts", "src/preload.ts"],
  external: ["electron"],
  format: ["cjs"],
  noExternal: [
    "@storystage/asset-pipeline",
    "@storystage/contracts",
    "@storystage/story-engine",
    "@noble/hashes",
    "zod",
  ],
  outDir: "dist",
});
