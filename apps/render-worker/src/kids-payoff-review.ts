import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import type { ProductionCompositionProps } from "@storystage/remotion-runtime";
import { STORY_STAGE_PRODUCTION_COMPOSITION_ID } from "@storystage/remotion-runtime/manifest";
import { createKidsShowcaseProject } from "@storystage/story-engine";
import ffmpegPath from "ffmpeg-static";

const execFileAsync = promisify(execFile);
const workspaceRoot = resolve(
  fileURLToPath(new URL("../../..", import.meta.url)),
);
const outputRoot = resolve(workspaceRoot, "artifacts/CV-003/payoff-review");
const reviewFrames = [750, 764, 790, 817, 827, 828, 842, 866, 888, 899];
const puppetFiles = [
  "mara/payoff-puppet-v1/puppet-parts.png",
  "milo/payoff-puppet-v1/puppet-parts.png",
  "moss-guardian/payoff-puppet-v1/puppet-parts.png",
] as const;

async function main() {
  if (!ffmpegPath) throw new Error("ffmpeg-static is unavailable.");
  await mkdir(outputRoot, { recursive: true });
  const project = createKidsShowcaseProject();
  const puppetHashes = await Promise.all(
    puppetFiles.map(async (relativeFile) =>
      createHash("sha256")
        .update(
          await readFile(
            resolve(
              workspaceRoot,
              "packages/remotion-runtime/public/show-packs/kids/moonlit-ruins/v1/rigs",
              relativeFile,
            ),
          ),
        )
        .digest("hex"),
    ),
  );
  if (
    puppetHashes.some(
      (hash, index) => hash !== project.program.payoffPuppetAssetHashes[index],
    )
  )
    throw new Error("Payoff puppet bytes do not match the directed program.");
  const serveUrl = await bundle({
    entryPoint: resolve(
      workspaceRoot,
      "packages/remotion-runtime/src/remotion-entry.ts",
    ),
    publicDir: resolve(workspaceRoot, "packages/remotion-runtime/public"),
  });
  const inputProps: ProductionCompositionProps = {
    plan: project.program.renderPlan,
    playbackAssets: {},
    sliceDurationInFrames: project.program.renderPlan.durationInFrames,
    kidsShowcaseProgram: project.program,
    kidsShowcaseDirection: project.direction,
  };
  const composition = await selectComposition({
    id: STORY_STAGE_PRODUCTION_COMPOSITION_ID,
    inputProps,
    serveUrl,
  });
  for (const [index, frame] of reviewFrames.entries()) {
    await renderStill({
      composition,
      frame,
      inputProps,
      output: resolve(
        outputRoot,
        `payoff-${String(index).padStart(2, "0")}.png`,
      ),
      serveUrl,
    });
  }
  await execFileAsync(ffmpegPath, [
    "-y",
    "-framerate",
    "1",
    "-i",
    resolve(outputRoot, "payoff-%02d.png"),
    "-vf",
    "scale=640:360,tile=5x2",
    "-frames:v",
    "1",
    resolve(outputRoot, "payoff-contact-sheet.png"),
  ]);
  console.log(
    JSON.stringify(
      {
        frames: reviewFrames,
        puppetHashes,
        contactSheet: resolve(outputRoot, "payoff-contact-sheet.png"),
      },
      null,
      2,
    ),
  );
}

await main();
