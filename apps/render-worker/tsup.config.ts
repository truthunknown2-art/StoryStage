import {defineConfig} from "tsup";

export default defineConfig({
  clean: true,
  entry: ["src/render-worker.ts"],
  external: ["@remotion/bundler", "@remotion/renderer"],
  format: ["cjs"],
  noExternal: ["@storystage/contracts", "@storystage/fixtures", "@storystage/story-engine", "@noble/hashes", "zod"],
  outDir: "dist",
});
