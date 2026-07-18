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
import ffmpegPath from "ffmpeg-static";
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

const cutProofOffsets = [-12, -8, -4, -2, -1, 0, 1, 2, 4, 8, 12];

async function decodeCutProof(
  firstVideo: string,
  secondVideo: string,
  boundaries: number[],
) {
  const ffmpeg = ffmpegPath;
  if (!ffmpeg) throw new Error("ffmpeg-static is unavailable.");
  const frames = boundaries.flatMap((boundary) =>
    cutProofOffsets.map((offset) => boundary + offset),
  );
  const decode = async (video: string, pass: string) => {
    const directory = resolve(outputRoot, `decoded-${pass}`);
    await mkdir(directory, { recursive: true });
    const select = frames.map((frame) => `eq(n\\,${frame})`).join("+");
    await execFileAsync(
      ffmpeg,
      [
        "-y",
        "-i",
        video,
        "-vf",
        `select=${select}`,
        "-vsync",
        "0",
        resolve(directory, "cut-%03d.png"),
      ],
      { maxBuffer: 10 * 1024 * 1024 },
    );
    return Promise.all(
      frames.map(async (frame, index) => {
        const file = resolve(
          directory,
          `cut-${String(index + 1).padStart(3, "0")}.png`,
        );
        const bytes = await readFile(file);
        if (bytes.length < 20_000)
          throw new Error(`Decoded proof frame ${frame} is suspiciously small.`);
        return { frame, byteLength: bytes.length, hash: sha256(bytes) };
      }),
    );
  };
  const first = await decode(firstVideo, "pass-1");
  const second = await decode(secondVideo, "pass-2");
  if (first.length !== second.length)
    throw new Error("Decoded render passes produced different cut-frame counts.");
  const similarityResult = await execFileAsync(
    ffmpeg,
    [
      "-i",
      firstVideo,
      "-i",
      secondVideo,
      "-lavfi",
      "[0:v][1:v]ssim",
      "-f",
      "null",
      process.platform === "win32" ? "NUL" : "/dev/null",
    ],
    { maxBuffer: 10 * 1024 * 1024 },
  );
  const similarity = Number(
    /All:([0-9.]+)/.exec(similarityResult.stderr)?.[1] ?? 0,
  );
  if (similarity < 0.99)
    throw new Error(
      `Decoded H.264 render similarity ${similarity} is below the 0.99 floor.`,
    );
  const contactSheet = resolve(outputRoot, "decoded-cut-boundaries.png");
  await execFileAsync(ffmpeg, [
    "-y",
    "-framerate",
    "1",
    "-i",
    resolve(outputRoot, "decoded-pass-1/cut-%03d.png"),
    "-vf",
    `scale=256:144,tile=${cutProofOffsets.length}x${boundaries.length}`,
    "-frames:v",
    "1",
    contactSheet,
  ]);
  return {
    boundaries,
    offsets: cutProofOffsets,
    decodedFrameCount: first.length,
    contactSheet,
    decodedSimilarityAcrossPasses: similarity,
    similarityFloor: 0.99,
  };
}

async function main() {
  const stillsOnly = process.argv.includes("--stills-only");
  const validateExisting = process.argv.includes("--validate-existing");
  const project = createKidsShowcaseProject();
  await mkdir(outputRoot, { recursive: true });
  await mkdir(committedProofRoot, { recursive: true });
  const firstVideo = resolve(outputRoot, "moonlit-ruins-30s.mp4");
  const secondVideo = resolve(outputRoot, "moonlit-ruins-30s-pass-2.mp4");
  if (validateExisting) {
    const report = {
      schemaVersion: "1.0",
      status: "PASS",
      validationMode: "existing-render",
      productionCompositionId: STORY_STAGE_PRODUCTION_COMPOSITION_ID,
      sourceScriptHash: project.program.sourceScriptHash,
      programContentHash: project.program.contentHash,
      scenes: project.program.scenes.length,
      beats: project.program.beats.length,
      shots: project.program.renderPlan.shots.length,
      pass1: await probe(firstVideo),
      pass2: await probe(secondVideo),
      decodedCutProof: await decodeCutProof(
        firstVideo,
        secondVideo,
        project.program.directorTimeline.shots
          .slice(1)
          .map((shot) => shot.startFrame),
      ),
    };
    await writeFile(
      resolve(committedProofRoot, "proof-report.json"),
      `${JSON.stringify(report, null, 2)}\n`,
    );
    console.log(JSON.stringify(report, null, 2));
    return;
  }
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
    24, 69, 108, 119, 120, 121, 174, 209, 210, 211, 230,
    // Hall entrance, plant, guardian wake, and the first-frame exposure gate.
    258, 282, 310, 330, 341, 342, 343, 354, 369, 386, 397, 413,
    // Guardian close-up and child reaction.
    414, 415, 420, 426, 433, 445, 461, 462, 463, 470, 486, 508, 521, 533,
    // Sneeze, pivot, catch, and planted escape contact.
    534, 535, 550, 562, 582, 590, 612, 626, 642, 653,
    // Matched escape, physical portal, clearing deceleration, and payoff.
    654, 655, 666, 682, 698, 718, 735, 746, 764, 773, 774, 775, 790,
    802, 820, 838, 845, 846, 847, 852, 870, 888, 899,
  ];
  const committedFrames = new Set([
    24, 108, 174, 230, 310, 342, 386, 426, 486, 582, 626, 682, 718,
    774, 820, 870, 899,
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
    decodedCutProof: await decodeCutProof(
      firstVideo,
      secondVideo,
      project.program.directorTimeline.shots
        .slice(1)
        .map((shot) => shot.startFrame),
    ),
    stills,
  };
  await writeFile(
    resolve(committedProofRoot, "proof-report.json"),
    `${JSON.stringify(report, null, 2)}\n`,
  );
  console.log(JSON.stringify(report, null, 2));
}

await main();
