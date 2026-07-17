import {execFile} from "node:child_process";
import {createHash} from "node:crypto";
import {mkdir, readFile, writeFile} from "node:fs/promises";
import {arch, platform, release} from "node:os";
import {resolve} from "node:path";
import {promisify} from "node:util";
import ffmpegPath from "ffmpeg-static";
import ffprobeStatic from "ffprobe-static";
import {renderProofStills, renderSample, readSampleMetadata} from "./render-service";

const workspaceRoot = resolve(import.meta.dirname, "../../..");
const artifactRoot = resolve(workspaceRoot, "artifacts/SS-001");
const command = process.argv[2] ?? "sample";
const execFileAsync = promisify(execFile);

async function hashFiles(files: string[]) {
  return Object.fromEntries(await Promise.all(files.map(async (file) => [file, createHash("sha256").update(await readFile(file)).digest("hex")] as const)));
}

async function extractFrames(video: string, folder: string) {
  if (!ffmpegPath) throw new Error("ffmpeg-static did not provide an executable path.");
  await mkdir(folder, {recursive: true});
  const outputs: string[] = [];
  const commands: string[] = [];
  for (const frame of [0, 180, 330]) {
    const output = resolve(folder, `frame-${String(frame).padStart(3, "0")}.png`);
    const args = ["-y", "-i", video, "-vf", `select=eq(n\\,${frame})`, "-frames:v", "1", output];
    await execFileAsync(ffmpegPath, args, {maxBuffer: 10 * 1024 * 1024});
    commands.push(`"${ffmpegPath}" ${args.map((arg) => `"${arg}"`).join(" ")}`);
    outputs.push(output);
  }
  return {commands, outputs};
}

async function writeEnvironmentManifest() {
  const manifests = await Promise.all([
    readFile(resolve(workspaceRoot, "package.json"), "utf8"),
    readFile(resolve(workspaceRoot, "apps/desktop/package.json"), "utf8"),
    readFile(resolve(workspaceRoot, "packages/remotion-runtime/package.json"), "utf8"),
    readFile(resolve(workspaceRoot, "apps/render-worker/package.json"), "utf8"),
  ]).then((files) => files.map((file) => JSON.parse(file) as {packageManager?: string; dependencies?: Record<string, string>}));
  const rootPackage = manifests[0]!;
  const desktopPackage = manifests[1]!;
  const runtimePackage = manifests[2]!;
  const workerPackage = manifests[3]!;
  const manifest = {
    node: process.version,
    pnpm: rootPackage.packageManager,
    electron: desktopPackage.dependencies?.electron,
    remotion: runtimePackage.dependencies?.remotion,
    ffmpegStatic: workerPackage.dependencies?.["ffmpeg-static"],
    ffprobeStatic: workerPackage.dependencies?.["ffprobe-static"],
    os: {arch: arch(), platform: platform(), release: release()},
  };
  await writeFile(resolve(artifactRoot, "env.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
}

async function verifyAudio(video: string) {
  if (!ffmpegPath) throw new Error("ffmpeg-static did not provide an executable path.");
  const probeArgs = ["-v", "error", "-show_streams", "-of", "json", video];
  const probe = await execFileAsync(ffprobeStatic.path, probeArgs, {maxBuffer: 10 * 1024 * 1024});
  const streams = JSON.parse(probe.stdout) as {streams: Array<{codec_name?: string; codec_type?: string}>};
  const volumeArgs = ["-i", video, "-af", "volumedetect", "-f", "null", "NUL"];
  const volume = await execFileAsync(ffmpegPath, volumeArgs, {maxBuffer: 10 * 1024 * 1024});
  const commandLog = [
    `"${ffprobeStatic.path}" ${probeArgs.map((arg) => `"${arg}"`).join(" ")}`,
    probe.stdout.trim(),
    `"${ffmpegPath}" ${volumeArgs.map((arg) => `"${arg}"`).join(" ")}`,
    volume.stderr.trim(),
  ].join("\n\n");
  await writeFile(resolve(artifactRoot, "audio-verification.txt"), `${commandLog}\n`, "utf8");
  await writeFile(resolve(artifactRoot, "audio-streams.json"), `${JSON.stringify(streams, null, 2)}\n`, "utf8");
  return streams;
}

if (command === "sample") {
  console.info(await renderSample({jobId: "cli-sample", workspaceRoot}));
} else if (command === "proof") {
  console.info((await renderProofStills(workspaceRoot)).join("\n"));
} else if (command === "audio") {
  console.info(await verifyAudio(resolve(artifactRoot, "sample.mp4")));
} else if (command === "determinism") {
  const first = await renderSample({jobId: "determinism-a", workspaceRoot, outputFileName: "sample-pass-a.mp4"});
  const second = await renderSample({jobId: "determinism-b", workspaceRoot, outputFileName: "sample-pass-b.mp4"});
  const firstFrames = await extractFrames(first, resolve(artifactRoot, "frame-checks/pass-a"));
  const secondFrames = await extractFrames(second, resolve(artifactRoot, "frame-checks/pass-b"));
  const firstHashes = await hashFiles(firstFrames.outputs);
  const secondHashes = await hashFiles(secondFrames.outputs);
  const report = {
    first: {file: first, metadata: await readSampleMetadata(first), hashes: Object.values(firstHashes)},
    second: {file: second, metadata: await readSampleMetadata(second), hashes: Object.values(secondHashes)},
    extractionCommands: [...firstFrames.commands, ...secondFrames.commands],
    frameHashesMatch: Object.values(firstHashes).every((hash, index) => hash === Object.values(secondHashes)[index]),
    note: "Frames 0, 180, and 330 are decoded from both MP4 passes by exact frame-index selection; MP4 byte identity is intentionally not asserted.",
  };
  await mkdir(artifactRoot, {recursive: true});
  await writeFile(resolve(artifactRoot, "determinism.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
  await writeEnvironmentManifest();
  await verifyAudio(resolve(artifactRoot, "sample.mp4"));
  console.info(resolve(artifactRoot, "determinism.json"));
} else {
  throw new Error(`Unknown render-worker command: ${command}`);
}
