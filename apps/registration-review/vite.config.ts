import type { IncomingMessage, ServerResponse } from "node:http";
import react from "@vitejs/plugin-react";
import { createReadStream, existsSync, statSync } from "node:fs";
import { extname, join, normalize } from "node:path";
import type { Connect, Plugin } from "vite";
import { defineConfig } from "vitest/config";

const DEV_EVIDENCE_DIR = process.env.KIMI_RR_EVIDENCE_DIR;

/**
 * Development-fixture evidence server. Serves host-supplied exact image
 * references from KIMI_RR_EVIDENCE_DIR only when that environment variable is
 * explicitly set for a development session. Never part of the app runtime:
 * the application only consumes the URLs the host model supplies, and any
 * missing reference renders the explicit unavailable state instead.
 */
const devEvidencePlugin = (): Plugin => ({
  name: "storystage-dev-evidence-static",
  configureServer(server) {
    server.middlewares.use(
      (
        request: IncomingMessage,
        response: ServerResponse,
        next: Connect.NextFunction,
      ) => {
      if (!DEV_EVIDENCE_DIR || !request.url?.startsWith("/evidence/")) {
        next();
        return;
      }
      const relative = normalize(request.url.slice("/evidence/".length));
      if (relative.startsWith("..")) {
        response.statusCode = 403;
        response.end("forbidden");
        return;
      }
      const file = join(DEV_EVIDENCE_DIR, relative);
      if (!existsSync(file) || !statSync(file).isFile()) {
        response.statusCode = 404;
        response.end("not found");
        return;
      }
      response.setHeader(
        "content-type",
        extname(file) === ".png" ? "image/png" : "application/octet-stream",
      );
      response.setHeader("cache-control", "no-store");
      createReadStream(file).pipe(response);
    });
  },
});

export default defineConfig({
  plugins: [react(), devEvidencePlugin()],
  server: {
    host: "127.0.0.1",
    port: 5175,
    strictPort: true,
  },
  test: {
    environment: "jsdom",
    setupFiles: "./src/test/setup.ts",
  },
});
