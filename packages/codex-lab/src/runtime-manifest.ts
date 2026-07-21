import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { z } from "zod";

const hashSchema = z.string().regex(/^[0-9a-f]{64}$/);

export const runtimeManifestSchema = z
  .object({
    schemaVersion: z.literal(1),
    platform: z.literal("windows-x64"),
    packageName: z.literal("@openai/codex"),
    packageVersion: z.string().min(1),
    cliVersion: z.string().min(1),
    nativeBinaryRelativePath: z.string().min(1),
    nativeBinarySha256: hashSchema,
    protocolArtifact: z.string().min(1),
    protocolSha256: hashSchema,
    schemaGenerationArgs: z.array(z.string()).min(3),
    serverArgs: z.array(z.string()).min(2),
    experimentalRisk: z.string().min(1),
  })
  .strict();

export type RuntimeManifest = z.infer<typeof runtimeManifestSchema>;

export const runtimeManifestPath = fileURLToPath(
  new URL("../runtime-manifest.json", import.meta.url),
);

export const runtimeManifest = runtimeManifestSchema.parse(
  JSON.parse(readFileSync(runtimeManifestPath, "utf8")),
);
