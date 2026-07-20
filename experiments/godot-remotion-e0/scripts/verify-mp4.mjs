import { createHash } from "node:crypto";
import { existsSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const [frameReportArg, mp4Arg, outputArg] = process.argv.slice(2);
if (!frameReportArg || !mp4Arg || !outputArg) {
  throw new Error(
    "Usage: node verify-mp4.mjs <frame-report.json> <video.mp4> <output.json>",
  );
}

const frameReportPath = resolve(frameReportArg);
const mp4Path = resolve(mp4Arg);
const outputPath = resolve(outputArg);
const remotionRoot = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../remotion",
);
const frameReport = JSON.parse(readFileSync(frameReportPath, "utf8"));

const remotionCli = resolve(
  remotionRoot,
  "node_modules/@remotion/cli/remotion-cli.js",
);
const probe = spawnSync(
  process.execPath,
  [
    remotionCli,
    "ffprobe",
    mp4Path,
    "-v",
    "error",
    "-count_frames",
    "-select_streams",
    "v:0",
    "-show_entries",
    "stream=codec_name,width,height,r_frame_rate,nb_read_frames,duration:format=duration",
    "-of",
    "json",
  ],
  { cwd: remotionRoot, encoding: "utf8" },
);

if (probe.status !== 0) {
  throw new Error(
    `ffprobe failed: ${probe.error?.message || probe.stderr || probe.stdout || `status ${probe.status}`}`,
  );
}

const parsed = JSON.parse(probe.stdout);
const stream = parsed.streams?.[0];
if (!stream) throw new Error("No video stream in MP4");

const stillNames = [
  "composite-frame-0000.png",
  "composite-frame-0041.png",
  "composite-frame-0078.png",
  "composite-frame-0088.png",
  "composite-frame-0119.png",
];
const stills = stillNames.map((fileName) => {
  const path = join(dirname(mp4Path), "stills", fileName);
  if (!existsSync(path))
    throw new Error(`Missing representative still: ${path}`);
  const bytes = readFileSync(path);
  if (bytes.toString("ascii", 1, 4) !== "PNG")
    throw new Error(`Not a PNG: ${path}`);
  return {
    relativeFile: `evidence/stills/${fileName}`,
    sha256: createHash("sha256").update(bytes).digest("hex"),
    byteLength: statSync(path).size,
    width: bytes.readUInt32BE(16),
    height: bytes.readUInt32BE(20),
  };
});

const checks = {
  frameVerificationPassed:
    frameReport.deterministic === true &&
    frameReport.transparentRgbaVerified === true &&
    frameReport.runAFrameCount === 120 &&
    frameReport.runBFrameCount === 120 &&
    frameReport.failures.length === 0,
  codecIsH264: stream.codec_name === "h264",
  dimensionsAre1920x1080: stream.width === 1920 && stream.height === 1080,
  frameRateIs30: stream.r_frame_rate === "30/1",
  frameCountIs120: Number(stream.nb_read_frames) === 120,
  videoStreamDurationIsFourSeconds:
    Math.abs(Number(stream.duration) - 4) < 0.001,
  representativeStillsAre1920x1080: stills.every(
    (still) => still.width === 1920 && still.height === 1080,
  ),
};

const report = {
  schemaVersion: "1.0",
  passed: Object.values(checks).every(Boolean),
  checks,
  frames: {
    relativeManifest: "evidence/frame-verification.json",
    aggregateFrameSha256: frameReport.aggregateFrameSha256,
    deterministic: frameReport.deterministic,
    transparentRgbaVerified: frameReport.transparentRgbaVerified,
    runAFrameCount: frameReport.runAFrameCount,
    runBFrameCount: frameReport.runBFrameCount,
    mismatchCount: frameReport.mismatches.length,
    failures: frameReport.failures,
  },
  mp4: {
    relativeFile: "evidence/godot-remotion-e0.mp4",
    sha256: createHash("sha256").update(readFileSync(mp4Path)).digest("hex"),
    videoStreamDurationSeconds: Number(stream.duration),
    containerDurationSeconds: Number(parsed.format?.duration),
    probe: parsed,
  },
  stills,
};

writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`);
if (!report.passed) {
  throw new Error(`E0 verification failed: ${JSON.stringify(checks)}`);
}
process.stdout.write(
  `E0_VERIFIED mp4=${report.mp4.sha256} frames=${frameReport.aggregateFrameSha256}\n`,
);
