import {defineConfig} from "tsup";

export default defineConfig({
  clean: true,
  entry: ["src/render-worker.ts"],
  external: ["@remotion/bundler", "@remotion/renderer"],
  format: ["cjs"],
  noExternal: ["@storystage/contracts", "@storystage/fixtures", "zod"],
  outDir: "dist",
});
