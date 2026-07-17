import {resolve} from "node:path";
import react from "@vitejs/plugin-react";
import {defineConfig} from "vitest/config";

export default defineConfig({
  plugins: [react()],
  publicDir: resolve(__dirname, "../../packages/remotion-runtime/public"),
  server: {
    host: "127.0.0.1",
    port: 5173,
    strictPort: true,
  },
  test: {
    environment: "jsdom",
    setupFiles: "./src/test/setup.ts",
  },
});
