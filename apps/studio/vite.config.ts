import react from "@vitejs/plugin-react";
import type { Connect, Plugin } from "vite";
import type { IncomingMessage, ServerResponse } from "node:http";
import {defineConfig} from "vitest/config";
import { createSilentPcmWav } from "./src/director/guide-fixture-wav";

/**
 * Development-only fixture endpoint for the explicit guide-audio review
 * fixture (`?guide-audio-fixture=1`). Serves a deterministic silent PCM WAV
 * for `/__guide-audio-fixture.wav?samples=N` so the review strip can bind an
 * exact same-origin URL whose bytes hash to the sealed clock hash. Never part
 * of the production build or runtime.
 */
const guideFixturePlugin = (): Plugin => ({
  name: "storystage-guide-audio-fixture",
  configureServer(server) {
    server.middlewares.use(
      (
        request: IncomingMessage,
        response: ServerResponse,
        next: Connect.NextFunction,
      ) => {
        if (!request.url?.startsWith("/__guide-audio-fixture.wav")) {
          next();
          return;
        }
        const samples = Number(
          new URL(request.url, "http://localhost").searchParams.get("samples"),
        );
        if (!Number.isSafeInteger(samples) || samples <= 0 || samples > 9_600_000) {
          response.statusCode = 400;
          response.end("invalid samples");
          return;
        }
        const bytes = Buffer.from(createSilentPcmWav(samples));
        response.setHeader("content-type", "audio/wav");
        response.setHeader("cache-control", "no-store");
        response.setHeader("accept-ranges", "bytes");
        const range = request.headers.range?.match(/^bytes=(\d+)-(\d*)$/);
        if (range) {
          const start = Number(range[1]);
          const end = range[2] ? Math.min(Number(range[2]), bytes.length - 1) : bytes.length - 1;
          if (start >= bytes.length || start > end) {
            response.statusCode = 416;
            response.setHeader("content-range", `bytes */${bytes.length}`);
            response.end();
            return;
          }
          response.statusCode = 206;
          response.setHeader("content-range", `bytes ${start}-${end}/${bytes.length}`);
          response.end(bytes.subarray(start, end + 1));
          return;
        }
        response.end(bytes);
      },
    );
  },
});

export default defineConfig({
  plugins: [react(), guideFixturePlugin()],
  publicDir: "../../packages/remotion-runtime/public",
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
