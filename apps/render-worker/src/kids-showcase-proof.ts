import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import { bundle } from "@remotion/bundler";
import {
  renderMedia,
  renderStill,
  selectComposition,
} from "@remotion/renderer";
import type { ProductionCompositionProps } from "@storystage/remotion-runtime";
import { STORY_STAGE_PRODUCTION_COMPOSITION_ID } from "@storystage/remotion-runtime/manifest";
import { createKidsShowcaseProject } from "@storystage/story-engine";
import ffprobeStatic from "ffprobe-static";

const workspaceRoot = resolve(
  fileURLToPath(new URL("../../..", import.meta.url)),
);
const outputRoot = resolve(workspaceRoot, "artifacts/CV-003/kids-showcase");
const committedProofRoot = resolve(
  workspaceRoot,
  "docs/design/kids-showcase-proof",
);
const execFileAsync = promisify(execFile);
const sha256 = (bytes: Uint8Array) =>
  createHash("sha256").update(bytes).digest("hex");

type ProbeStream = {
  avg_frame_rate?: string;
  channels?: number;
  codec_name?: string;
  codec_type?: string;
  duration?: string;
  height?: number;
  nb_frames?: string;
  width?: number;
};

async function probe(file: string) {
  const { stdout } = await execFileAsync(
    ffprobeStatic.path,
    ["-v", "error", "-show_streams", "-of", "json", file],
    { maxBuffer: 10 * 1024 * 1024 },
  );
  const streams =
    (JSON.parse(stdout) as { streams?: ProbeStream[] }).streams ?? [];
  const video = streams.find((stream) => stream.codec_type === "video");
  const audio = streams.find((stream) => stream.codec_type === "audio");
  const [numerator, denominator] = (video?.avg_frame_rate ?? "0/1")
    .split("/")
    .map(Number);
  const fps = denominator ? numerator! / denominator : 0;
  const frameCount = Number(
    video?.nb_frames || Math.round(Number(video?.duration) * fps),
  );
  if (
    !video ||
    video.codec_name !== "h264" ||
    video.width !== 1920 ||
    video.height !== 1080 ||
    fps !== 30 ||
    frameCount !== 900
  )
    throw new Error(
      `Unexpected video proof metadata for ${file}: ${JSON.stringify({ video, fps, frameCount })}`,
    );
  if (!audio || audio.codec_name !== "aac" || audio.channels !== 2)
    throw new Error(
      `Expected stereo AAC guide audio in ${file}: ${JSON.stringify(audio)}`,
    );
  return {
    codec: video.codec_name,
    width: video.width,
    height: video.height,
    fps,
    frameCount,
    audioCodec: audio.codec_name,
    audioChannels: audio.channels,
    byteLength: (await readFile(file)).length,
  };
}

async function main() {
  const stillsOnly = process.argv.includes("--stills-only");
  const project = createKidsShowcaseProject();
  await mkdir(outputRoot, { recursive: true });
  await mkdir(committedProofRoot, { recursive: true });
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
    serveUrl,
    id: STORY_STAGE_PRODUCTION_COMPOSITION_ID,
    inputProps,
  });
  if (
    composition.durationInFrames !== 900 ||
    composition.fps !== 30 ||
    composition.width !== 1920 ||
    composition.height !== 1080
  )
    throw new Error(
      `Production composition metadata is wrong: ${JSON.stringify(composition)}`,
    );

  const auditFrames = [
    24, 51, 69, 108, 174, 230,
    // One complete Mara/Milo sneak cycle.
    270, 273, 276, 279, 282, 285, 288, 291, 310, 370,
    // High-resolution guardian eye-track, blink, recoil, and settle.
    402, 408, 414, 420, 424, 426, 428, 433, 442,
    // Complete child anticipation/recoil/recovery performance.
    450, 458, 466, 474, 480, 482, 487, 495, 508,
    // Every authored guardian sneeze exposure.
    540, 552, 565, 580, 581, 585, 591, 593, 604,
    // One complete guardian chase cycle.
    687, 690, 693, 696, 699, 702, 705, 708, 711, 715, 820, 880,
  ];
  const committedFrames = new Set([
    24, 51, 69, 108, 174, 230, 310, 370, 426, 482, 581, 593, 687, 715,
    820, 880,
  ]);
  const stills = [];
  for (const frame of auditFrames) {
    const filename = `frame-${String(frame).padStart(3, "0")}.png`;
    const first = resolve(outputRoot, `audit-${filename}`);
    const repeat = resolve(outputRoot, `repeat-${filename}`);
    await renderStill({
      composition,
      frame,
      inputProps,
      output: first,
      serveUrl,
    });
    await renderStill({
      composition,
      frame,
      inputProps,
      output: repeat,
      serveUrl,
    });
    const contentHash = sha256(await readFile(first));
    const repeatHash = sha256(await readFile(repeat));
    if (contentHash !== repeatHash)
      throw new Error(
        `Frame ${frame} changed across deterministic still renders.`,
      );
    if (committedFrames.has(frame))
      await copyFile(first, resolve(committedProofRoot, filename));
    const shot = project.program.renderPlan.shots.find(
      (candidate) =>
        frame >= candidate.startFrame &&
        frame < candidate.startFrame + candidate.durationInFrames,
    )!;
    const lineage = project.program.shotBindings.find(
      (binding) => binding.shotId === shot.id,
    )!;
    stills.push({
      frame,
      relativeFile: committedFrames.has(frame)
        ? filename
        : `artifacts/CV-003/kids-showcase/audit-${filename}`,
      contentHash,
      repeatHash,
      shotId: shot.id,
      beatId: lineage.beatId,
      motionChannels: lineage.motionChannels,
    });
    console.log(`Verified still ${frame}/899`);
  }

  if (stillsOnly) {
    console.log(
      JSON.stringify({ status: "PASS", mode: "stills-only", stills }, null, 2),
    );
    return;
  }

  const firstVideo = resolve(outputRoot, "moonlit-ruins-30s.mp4");
  const secondVideo = resolve(outputRoot, "moonlit-ruins-30s-pass-2.mp4");
  await renderMedia({
    codec: "h264",
    audioCodec: "aac",
    composition,
    inputProps,
    outputLocation: firstVideo,
    serveUrl,
    onProgress: ({ progress }) => {
      if (Math.round(progress * 100) % 10 === 0)
        console.log(`Render pass 1: ${Math.round(progress * 100)}%`);
    },
  });
  await renderMedia({
    codec: "h264",
    audioCodec: "aac",
    composition,
    inputProps,
    outputLocation: secondVideo,
    serveUrl,
    onProgress: ({ progress }) => {
      if (Math.round(progress * 100) % 10 === 0)
        console.log(`Render pass 2: ${Math.round(progress * 100)}%`);
    },
  });

  const report = {
    schemaVersion: "1.0",
    status: "PASS",
    productionCompositionId: STORY_STAGE_PRODUCTION_COMPOSITION_ID,
    sourceScriptHash: project.program.sourceScriptHash,
    programContentHash: project.program.contentHash,
    scenes: project.program.scenes.length,
    beats: project.program.beats.length,
    shots: project.program.renderPlan.shots.length,
    templateId: project.program.shotBindings[0]!.templateId,
    rigAssets: project.program.rigAssets,
    audioCueCount: project.program.audioCues.length,
    pass1: await probe(firstVideo),
    pass2: await probe(secondVideo),
    stills,
  };
  await writeFile(
    resolve(committedProofRoot, "proof-report.json"),
    `${JSON.stringify(report, null, 2)}\n`,
  );
  console.log(JSON.stringify(report, null, 2));
}

await main();
