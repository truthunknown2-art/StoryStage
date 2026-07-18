import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import { bundle } from "@remotion/bundler";
import {
  renderMedia,
  renderStill,
  selectComposition,
} from "@remotion/renderer";
import ffmpegPath from "ffmpeg-static";
import ffprobeStatic from "ffprobe-static";
import type { ProductionCompositionProps } from "@storystage/remotion-runtime";
import { STORY_STAGE_PRODUCTION_COMPOSITION_ID } from "@storystage/remotion-runtime/manifest";
import {
  compileCv001ThreeBeatScene,
  createCv001ThreeBeatProofFixture,
  evaluateMotionProgram,
  getCv001AttachmentContinuity,
  getCv001CompiledBeatIssues,
  verifyCv001CompiledSceneMotion,
} from "@storystage/story-engine";

const workspaceRoot = resolve(
  fileURLToPath(new URL("../../..", import.meta.url)),
);
const outputRoot = resolve(workspaceRoot, "artifacts/CV-001/three-beat-proof");
const execFileAsync = promisify(execFile);
const sha256 = (bytes: Uint8Array) =>
  createHash("sha256").update(bytes).digest("hex");

type ProbedVideoStream = {
  avg_frame_rate?: string;
  codec_name?: string;
  codec_type?: string;
  duration?: string;
  height?: number;
  nb_frames?: string;
  width?: number;
};

async function probeVideo(file: string) {
  const { stdout } = await execFileAsync(
    ffprobeStatic.path,
    ["-v", "error", "-show_streams", "-of", "json", file],
    { maxBuffer: 10 * 1024 * 1024 },
  );
  const stream = (
    (JSON.parse(stdout) as { streams?: ProbedVideoStream[] }).streams ?? []
  ).find((candidate) => candidate.codec_type === "video");
  if (
    !stream ||
    stream.codec_name !== "h264" ||
    stream.width !== 1920 ||
    stream.height !== 1080
  )
    throw new Error(`CV-001 proof is not H.264 at 1920x1080: ${file}`);
  const [numerator, denominator] = (stream.avg_frame_rate ?? "0/1")
    .split("/")
    .map(Number);
  const fps = denominator ? numerator! / denominator : 0;
  const frameCount = Number(
    stream.nb_frames || Math.round(Number(stream.duration) * fps),
  );
  if (fps !== 30 || frameCount !== 300)
    throw new Error(
      `CV-001 proof has ${frameCount} frames at ${fps} fps instead of 300 at 30 fps.`,
    );
  const bytes = await readFile(file);
  return {
    codec: stream.codec_name,
    width: stream.width,
    height: stream.height,
    fps,
    frameCount,
    durationInSeconds: frameCount / fps,
    byteLength: bytes.length,
    contentHash: sha256(bytes),
  };
}

async function extractDecodedFrame(
  video: string,
  frame: number,
  output: string,
): Promise<string> {
  if (!ffmpegPath)
    throw new Error("ffmpeg-static did not provide an executable path.");
  await execFileAsync(
    ffmpegPath,
    [
      "-loglevel",
      "error",
      "-y",
      "-i",
      video,
      "-vf",
      `select=eq(n\\,${frame})`,
      "-frames:v",
      "1",
      output,
    ],
    { maxBuffer: 10 * 1024 * 1024 },
  );
  return sha256(await readFile(output));
}

async function main(): Promise<void> {
  const fixture = createCv001ThreeBeatProofFixture();
  const compiled = compileCv001ThreeBeatScene(fixture);
  if (!verifyCv001CompiledSceneMotion(fixture.input, compiled))
    throw new Error(
      "Compiled CV-001 scene motion failed canonical verification.",
    );
  const validatorIssues = compiled.bindings.flatMap((binding, index) =>
    getCv001CompiledBeatIssues(
      fixture.input.beats[index]!,
      binding.program,
    ).map((issue) => `${binding.beatId}: ${issue}`),
  );
  if (validatorIssues.length > 0)
    throw new Error(
      `Compiled CV-001 motion failed: ${validatorIssues.join(" ")}`,
    );

  await mkdir(outputRoot, { recursive: true });
  const repeatRoot = resolve(outputRoot, "repeat-audit");
  await mkdir(repeatRoot, { recursive: true });
  const serveUrl = await bundle({
    entryPoint: resolve(
      workspaceRoot,
      "packages/remotion-runtime/src/remotion-entry.ts",
    ),
    publicDir: resolve(workspaceRoot, "packages/remotion-runtime/public"),
  });
  const inputProps: ProductionCompositionProps = {
    plan: fixture.renderPlan,
    playbackAssets: {},
    sliceDurationInFrames: fixture.renderPlan.durationInFrames,
    directedSceneMotion: compiled,
  };
  const composition = await selectComposition({
    serveUrl,
    id: STORY_STAGE_PRODUCTION_COMPOSITION_ID,
    inputProps,
  });
  if (composition.durationInFrames !== 300 || composition.fps !== 30)
    throw new Error(
      `Expected a 300-frame 30fps proof, got ${composition.durationInFrames} frames at ${composition.fps}fps.`,
    );

  const auditFrames = [
    { beatIndex: 0, frame: 0 },
    { beatIndex: 0, frame: 30 },
    { beatIndex: 0, frame: 60 },
    { beatIndex: 0, frame: 89 },
    { beatIndex: 1, frame: 90 },
    { beatIndex: 1, frame: 120 },
    { beatIndex: 1, frame: 150 },
    { beatIndex: 1, frame: 180 },
    { beatIndex: 1, frame: 209 },
    { beatIndex: 2, frame: 210 },
    { beatIndex: 2, frame: 240 },
    { beatIndex: 2, frame: 270 },
    { beatIndex: 2, frame: 299 },
  ] as const;
  const stills = [];
  for (const audit of auditFrames) {
    const filename = `frame-${String(audit.frame).padStart(3, "0")}.png`;
    const output = resolve(outputRoot, filename);
    const repeatOutput = resolve(repeatRoot, filename);
    await renderStill({
      composition,
      frame: audit.frame,
      inputProps,
      output,
      serveUrl,
    });
    await renderStill({
      composition,
      frame: audit.frame,
      inputProps,
      output: repeatOutput,
      serveUrl,
    });
    const contentHash = sha256(await readFile(output));
    const repeatContentHash = sha256(await readFile(repeatOutput));
    if (contentHash !== repeatContentHash)
      throw new Error(`Frame ${audit.frame} changed across identical renders.`);
    const binding = compiled.bindings[audit.beatIndex];
    const shot = fixture.renderPlan.shots[audit.beatIndex]!;
    stills.push({
      frame: audit.frame,
      localFrame: audit.frame - shot.startFrame,
      beatId: binding.beatId,
      shotId: binding.shotId,
      relativeFile: filename,
      contentHash,
      repeatContentHash,
      evaluated: evaluateMotionProgram(
        binding.program,
        audit.frame - shot.startFrame,
      ),
    });
  }

  const video = resolve(outputRoot, "cv001-three-beat-proof.mp4");
  const repeatVideo = resolve(outputRoot, "cv001-three-beat-proof-pass-2.mp4");
  await renderMedia({
    codec: "h264",
    composition,
    inputProps,
    outputLocation: video,
    serveUrl,
  });
  await renderMedia({
    codec: "h264",
    composition,
    inputProps,
    outputLocation: repeatVideo,
    serveUrl,
  });
  const [videoProbe, repeatVideoProbe] = await Promise.all([
    probeVideo(video),
    probeVideo(repeatVideo),
  ]);
  const decodedPassOneRoot = resolve(outputRoot, "decoded-pass-1");
  const decodedPassTwoRoot = resolve(outputRoot, "decoded-pass-2");
  await Promise.all([
    mkdir(decodedPassOneRoot, { recursive: true }),
    mkdir(decodedPassTwoRoot, { recursive: true }),
  ]);
  const decodedFrameComparisons = [];
  for (const audit of auditFrames) {
    const filename = `frame-${String(audit.frame).padStart(3, "0")}.png`;
    const [passOneHash, passTwoHash] = await Promise.all([
      extractDecodedFrame(
        video,
        audit.frame,
        resolve(decodedPassOneRoot, filename),
      ),
      extractDecodedFrame(
        repeatVideo,
        audit.frame,
        resolve(decodedPassTwoRoot, filename),
      ),
    ]);
    if (passOneHash !== passTwoHash)
      throw new Error(
        `Decoded frame ${audit.frame} changed across identical H.264 renders.`,
      );
    decodedFrameComparisons.push({
      beatIndex: audit.beatIndex,
      frame: audit.frame,
      passOneHash,
      passTwoHash,
      matches: true,
    });
  }
  for (const beatIndex of [0, 1, 2] as const) {
    const uniqueFrames = new Set(
      decodedFrameComparisons
        .filter((comparison) => comparison.beatIndex === beatIndex)
        .map((comparison) => comparison.passOneHash),
    );
    if (uniqueFrames.size < 3)
      throw new Error(
        `Beat ${beatIndex + 1} lacks visible variation across decoded audit frames.`,
      );
  }
  const pickupContinuity = getCv001AttachmentContinuity(
    compiled.bindings[1].program,
  );
  if (
    pickupContinuity.distance >= 0.001 ||
    pickupContinuity.rotationDelta >= 0.001 ||
    pickupContinuity.scaleDelta >= 0.001
  )
    throw new Error(
      "The compiled pickup attachment transform is discontinuous.",
    );
  const report = {
    schemaVersion: "1.0",
    status: "integrated-three-beat-motion-proof",
    compositionId: STORY_STAGE_PRODUCTION_COMPOSITION_ID,
    compiler: compiled.compiler,
    sceneId: compiled.sceneId,
    sceneContentHash: compiled.contentHash,
    planContentHash: compiled.planContentHash,
    rigContractId: compiled.rigContractId,
    fps: composition.fps,
    durationInFrames: composition.durationInFrames,
    durationInSeconds: composition.durationInFrames / composition.fps,
    width: composition.width,
    height: composition.height,
    validatorIssues,
    deterministicFixedFrameAudit: {
      h264RenderCount: 2,
      decodedFrameCountPerRender: decodedFrameComparisons.length,
      allHashesMatch:
        stills.every(
          (still) => still.contentHash === still.repeatContentHash,
        ) && decodedFrameComparisons.every((comparison) => comparison.matches),
      decodedFrameComparisons,
    },
    beats: compiled.bindings.map((binding, index) => ({
      beatId: binding.beatId,
      beatContentHash: binding.beatContentHash,
      intent: fixture.input.beats[index]!.intent,
      shotId: binding.shotId,
      programId: binding.program.id,
      programContentHash: binding.programContentHash,
      bindingContentHash: binding.contentHash,
      durationInFrames: binding.program.durationInFrames,
      phases: binding.program.phases,
    })),
    pickupAttachmentContinuity: pickupContinuity,
    video: {
      relativeFile: "cv001-three-beat-proof.mp4",
      ...videoProbe,
    },
    repeatVideo: {
      relativeFile: "cv001-three-beat-proof-pass-2.mp4",
      ...repeatVideoProbe,
    },
    stills,
  };
  await writeFile(
    resolve(outputRoot, "proof-report.json"),
    `${JSON.stringify(report, null, 2)}\n`,
    "utf8",
  );
  process.stdout.write(`Rendered CV-001 three-beat proof to ${outputRoot}\n`);
}

void main().catch((error: unknown) => {
  process.stderr.write(
    `${error instanceof Error ? (error.stack ?? error.message) : String(error)}\n`,
  );
  process.exitCode = 1;
});
