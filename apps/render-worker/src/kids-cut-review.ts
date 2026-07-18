import { execFile } from "node:child_process";
import { mkdir } from "node:fs/promises";
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
const outputRoot = resolve(workspaceRoot, "artifacts/CV-003/cut-review");

async function main() {
  if (!ffmpegPath) throw new Error("ffmpeg-static is unavailable.");
  await mkdir(outputRoot, { recursive: true });
  const project = createKidsShowcaseProject();
  const boundaries = project.program.renderPlan.shots
    .slice(1)
    .map((shot) => shot.startFrame);
  const proofOffsets = [-12, -8, -4, -2, -1, 0, 1, 2, 4, 8, 12];
  const reviewFrames = boundaries.flatMap((boundary) =>
    proofOffsets.map((offset) => boundary + offset),
  );
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
      output: resolve(outputRoot, `cut-${String(index).padStart(2, "0")}.png`),
      serveUrl,
    });
  }
  await execFileAsync(ffmpegPath, [
    "-y",
    "-framerate",
    "1",
    "-i",
    resolve(outputRoot, "cut-%02d.png"),
    "-vf",
    `scale=256:144,tile=${proofOffsets.length}x${boundaries.length}`,
    "-frames:v",
    "1",
    resolve(outputRoot, "directed-cut-boundaries.png"),
  ]);
  console.log(
    JSON.stringify(
      {
        boundaries,
        proofOffsets,
        contactSheet: resolve(outputRoot, "directed-cut-boundaries.png"),
      },
      null,
      2,
    ),
  );
}

await main();
