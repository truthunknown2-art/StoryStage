import {execFile} from "node:child_process";
import {createHash} from "node:crypto";
import {lstat, mkdir, readFile, realpath, rm, writeFile} from "node:fs/promises";
import {fileURLToPath} from "node:url";
import {isAbsolute, relative, resolve} from "node:path";
import {promisify} from "node:util";
import {bundle} from "@remotion/bundler";
import {renderMedia, selectComposition} from "@remotion/renderer";
import ffmpegPath from "ffmpeg-static";
import ffprobeStatic from "ffprobe-static";
import {STORY_STAGE_PRODUCTION_COMPOSITION_ID} from "@storystage/remotion-runtime/manifest";
import type {ProductionCompositionProps} from "@storystage/remotion-runtime";
import {
  buildAnimaticSync,
  createRookPilot001Fixture,
  hashCanonical,
  preparationReportSchema,
  verifyPreparationReportHash,
  type PreparedCandidate,
} from "@storystage/story-engine";
import {verifyRookMotionReviewLineage} from "./rook-pilot-motion-review-lineage";

const execFileAsync = promisify(execFile);
const workspaceRoot = resolve(fileURLToPath(new URL("../../..", import.meta.url)));
const packetRoot = resolve(workspaceRoot, "artifacts/SS-009/reconstruction-review-packet");
const stagingRoot = resolve(packetRoot, "private-staging/rook-pilot-import");
const motionRoot = resolve(packetRoot, "motion-review");
const sourceClipRoot = resolve(motionRoot, "source-clips");
const frameRoot = resolve(motionRoot, "review-frames");

const reviewGroups = [
  {shotNumber: "1.03", briefId: "brief-requirement-reconstruction-shot-shot-3-shot-3-reconstruction", candidateIds: ["rook-shot-1-03-dancing-alone-set-1", "rook-shot-1-03-dancing-alone-set-2"]},
  {shotNumber: "1.05", briefId: "brief-requirement-reconstruction-shot-shot-5-shot-5-reconstruction", candidateIds: ["rook-shot-1-05-public-emergency-set-1", "rook-shot-1-05-public-emergency-set-2"]},
  {shotNumber: "1.08", briefId: "brief-requirement-reconstruction-shot-shot-8-shot-8-reconstruction", candidateIds: ["rook-shot-1-08-exhaustion-theory-set-1", "rook-shot-1-08-exhaustion-theory-set-2"]},
] as const;

const sha256 = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");
const inside = (root: string, candidate: string) => {const path = relative(root, candidate); return path === "" || (!path.startsWith("..") && !isAbsolute(path));};

async function verifiedPreparedDataUrl(candidate: PreparedCandidate): Promise<string> {
  const absoluteFile = resolve(stagingRoot, ...candidate.relativeFile.split("/"));
  if (!inside(stagingRoot, absoluteFile)) throw new Error(`Prepared motion-review candidate escaped its packet: ${candidate.candidateId}`);
  const [canonicalRoot, canonicalFile, fileStats] = await Promise.all([realpath(stagingRoot), realpath(absoluteFile), lstat(absoluteFile)]);
  if (!inside(canonicalRoot, canonicalFile) || fileStats.isSymbolicLink()) throw new Error(`Prepared motion-review candidate is not a trusted local file: ${candidate.candidateId}`);
  const bytes = await readFile(canonicalFile);
  if (sha256(bytes) !== candidate.preparedContentHash) throw new Error(`Prepared motion-review candidate failed its content hash: ${candidate.candidateId}`);
  if (bytes.length < 26 || bytes.subarray(0, 8).toString("hex") !== "89504e470d0a1a0a" || bytes.readUInt32BE(16) !== 1920 || bytes.readUInt32BE(20) !== 1080) throw new Error(`Prepared motion-review candidate is not the canonical 1920x1080 PNG: ${candidate.candidateId}`);
  return `data:image/png;base64,${bytes.toString("base64")}`;
}

type ProbedVideo = {codec_name?: string; codec_type?: string; width?: number; height?: number; avg_frame_rate?: string; nb_frames?: string; duration?: string};
async function probeVideo(file: string, expected: {width: number; height: number; fps: number; frames: number}) {
  const {stdout} = await execFileAsync(ffprobeStatic.path, ["-v", "error", "-show_streams", "-of", "json", file], {maxBuffer: 10 * 1024 * 1024});
  const stream = ((JSON.parse(stdout) as {streams?: ProbedVideo[]}).streams ?? []).find((candidate) => candidate.codec_type === "video");
  if (!stream || stream.codec_name !== "h264" || stream.width !== expected.width || stream.height !== expected.height) throw new Error(`Motion-review output failed its H.264 dimensions: ${file}`);
  const [numerator, denominator] = (stream.avg_frame_rate ?? "0/1").split("/").map(Number);
  const fps = denominator ? numerator! / denominator : 0;
  const frames = Number(stream.nb_frames || Math.round(Number(stream.duration) * fps));
  if (fps !== expected.fps || frames !== expected.frames) throw new Error(`Motion-review output failed its exact frame contract: ${file}`);
  const bytes = await readFile(file);
  return {sha256: sha256(bytes), byteLength: bytes.length, codec: "h264" as const, width: stream.width, height: stream.height, fps, frameCount: frames, durationInSeconds: frames / fps};
}

async function pairReviewClips(left: string, right: string, output: string, frames: number): Promise<void> {
  if (!ffmpegPath) throw new Error("ffmpeg-static did not provide an executable path.");
  await execFileAsync(ffmpegPath, [
    "-loglevel", "error", "-y", "-i", left, "-i", right,
    "-filter_complex", "[0:v]scale=960:540:flags=lanczos[left];[1:v]scale=960:540:flags=lanczos[right];[left][right]hstack=inputs=2[stack];[stack]pad=1920:1080:0:270:color=0x0A0F10[out]",
    "-map", "[out]", "-r", "30", "-frames:v", String(frames), "-c:v", "libx264", "-preset", "medium", "-crf", "18", "-pix_fmt", "yuv420p", "-an", output,
  ], {maxBuffer: 10 * 1024 * 1024});
}

async function extractReviewFrame(video: string, frame: number, output: string): Promise<string> {
  if (!ffmpegPath) throw new Error("ffmpeg-static did not provide an executable path.");
  await execFileAsync(ffmpegPath, ["-loglevel", "error", "-y", "-i", video, "-vf", `select=eq(n\\,${frame})`, "-frames:v", "1", output], {maxBuffer: 10 * 1024 * 1024});
  return sha256(await readFile(output));
}

async function main(): Promise<void> {
  if (!inside(packetRoot, motionRoot)) throw new Error("Refusing to replace a motion-review folder outside its private packet.");
  const [report, exchangeStateInput, diagnostics, sourceProductionInput, generationJobInput] = await Promise.all([
    readFile(resolve(packetRoot, "technical/preparation-report.json"), "utf8").then((value) => preparationReportSchema.parse(JSON.parse(value))),
    readFile(resolve(packetRoot, "technical/generation-exchange-state.json"), "utf8").then((value) => JSON.parse(value) as unknown),
    readFile(resolve(packetRoot, "technical/technical-diagnostics.json"), "utf8").then((value) => JSON.parse(value) as {humanDecisions?: {selectedCandidateSetIds?: unknown[]; rejectedCandidateSetIds?: unknown[]; approvedAssetVersions?: unknown[]}}),
    readFile(resolve(packetRoot, "technical/source-production.json"), "utf8").then((value) => JSON.parse(value) as unknown),
    readFile(resolve(packetRoot, "technical/generation-job.json"), "utf8").then((value) => JSON.parse(value) as unknown),
  ]);
  const fixture = createRookPilot001Fixture();
  const build = buildAnimaticSync(fixture);
  const {sourceProduction, generationJob, exchangeState} = verifyRookMotionReviewLineage({sourceProduction: sourceProductionInput, generationJob: generationJobInput, exchangeState: exchangeStateInput, currentProduction: {id: build.draft.productionId, revision: build.draft.revision}, currentRenderPlanContentHash: build.renderPlan.contentHash});
  if (!verifyPreparationReportHash(report) || exchangeState.importId !== report.importId || exchangeState.exchangeJobId !== report.exchangeJobId) throw new Error("The reconstruction preparation packet is missing, stale, or no longer awaiting review.");
  const decisionCounts = [diagnostics.humanDecisions?.selectedCandidateSetIds?.length ?? -1, diagnostics.humanDecisions?.rejectedCandidateSetIds?.length ?? -1, diagnostics.humanDecisions?.approvedAssetVersions?.length ?? -1];
  if (decisionCounts.some((count) => count !== 0)) throw new Error("Motion review can only run before selection, rejection, or approval.");
  await rm(motionRoot, {recursive: true, force: true});
  await Promise.all([mkdir(sourceClipRoot, {recursive: true}), mkdir(frameRoot, {recursive: true})]);
  const serveUrl = await bundle({entryPoint: resolve(workspaceRoot, "packages/remotion-runtime/src/remotion-entry.ts"), publicDir: resolve(workspaceRoot, "packages/remotion-runtime/public")});

  const reviews = [];
  for (const group of reviewGroups) {
    const shot = build.renderPlan.shots.find((candidate) => candidate.number === group.shotNumber);
    const sets = report.candidateSets.filter((candidate) => candidate.briefId === group.briefId).sort((left, right) => left.candidateSetId.localeCompare(right.candidateSetId));
    if (!shot || sets.length !== 2 || sets.some((set) => set.status !== "ready-for-review" || set.preparedCandidates.length !== 1)) throw new Error(`Shot ${group.shotNumber} does not have two preparation-complete review sets.`);
    const candidates = sets.map((set) => set.preparedCandidates[0]!);
    if (hashCanonical(candidates.map((candidate) => candidate.candidateId)) !== hashCanonical([...group.candidateIds])) throw new Error(`Shot ${group.shotNumber} prepared candidates do not match the packet manifest.`);
    const brief = build.resolvedPlan.generationBriefs.find((candidate) => candidate.id === group.briefId);
    const binding = shot.visualBindings.find((candidate) => candidate.role === "reconstruction");
    if (!brief || !brief.consumingShotIds.includes(shot.id) || !binding || candidates.some((candidate) => candidate.requirementId !== brief.requirementId)) throw new Error(`Shot ${group.shotNumber} lost its exact reconstruction binding.`);

    const sourceClips = [];
    for (const [index, candidate] of candidates.entries()) {
      const setNumber = index + 1;
      const inputProps: ProductionCompositionProps = {
        plan: build.renderPlan,
        playbackAssets: {[binding.assetId]: {type: "prop", assetId: binding.assetId, assetClass: "reconstruction", cutout: await verifiedPreparedDataUrl(candidate)}},
        sliceDurationInFrames: build.renderPlan.durationInFrames,
        previewAssetStatus: "unapproved-candidate",
        previewWatermark: `UNAPPROVED CANDIDATE · SHOT ${group.shotNumber} · SET ${setNumber}`,
      };
      const composition = await selectComposition({serveUrl, id: STORY_STAGE_PRODUCTION_COMPOSITION_ID, inputProps});
      const relativeFile = `source-clips/shot-${group.shotNumber.replace(".", "-")}-set-${setNumber}.mp4`;
      const output = resolve(motionRoot, relativeFile);
      await renderMedia({codec: "h264", composition, frameRange: [shot.startFrame, shot.startFrame + shot.durationInFrames - 1], inputProps, outputLocation: output, serveUrl});
      sourceClips.push({setNumber, candidateId: candidate.candidateId, candidateSetId: candidate.candidateSetId, preparedContentHash: candidate.preparedContentHash, relativeFile, media: await probeVideo(output, {width: 1920, height: 1080, fps: build.renderPlan.fps, frames: shot.durationInFrames})});
    }

    const pairedRelativeFile = `shot-${group.shotNumber.replace(".", "-")}-ab.mp4`;
    const pairedFile = resolve(motionRoot, pairedRelativeFile);
    await pairReviewClips(resolve(motionRoot, sourceClips[0]!.relativeFile), resolve(motionRoot, sourceClips[1]!.relativeFile), pairedFile, shot.durationInFrames);
    const reviewFrames = [];
    for (const frame of [0, Math.floor(shot.durationInFrames / 2), shot.durationInFrames - 1]) {
      const position = frame === 0 ? "start" : frame === shot.durationInFrames - 1 ? "end" : "mid";
      const relativeFile = `review-frames/shot-${group.shotNumber.replace(".", "-")}-${position}.png`;
      reviewFrames.push({position, frame, relativeFile, sha256: await extractReviewFrame(pairedFile, frame, resolve(motionRoot, relativeFile))});
    }
    if (new Set(reviewFrames.map((frame) => frame.sha256)).size < 2) throw new Error(`Shot ${group.shotNumber} review reel did not preserve visible motion across its exact frame range.`);
    reviews.push({
      shotId: shot.id,
      shotNumber: shot.number,
      shotTitle: shot.title,
      startFrame: shot.startFrame,
      durationInFrames: shot.durationInFrames,
      caption: shot.caption ?? null,
      cameraActions: shot.actions.filter((action) => ["cameraPush", "pan", "reframe"].includes(action.detail.type)).map((action) => action.detail.type),
      disclosure: "Generated reconstruction",
      watermark: "UNAPPROVED CANDIDATE",
      sourceClips,
      pairedReview: {relativeFile: pairedRelativeFile, media: await probeVideo(pairedFile, {width: 1920, height: 1080, fps: build.renderPlan.fps, frames: shot.durationInFrames})},
      reviewFrames,
    });
    process.stdout.write(`Rendered watermarked A/B motion review for shot ${group.shotNumber}.\n`);
  }

  const manifestPayload = {
    schemaVersion: "1.0",
    status: "needs-review",
    production: exchangeState.production,
    renderPlanContentHash: build.renderPlan.contentHash,
    sourceProductionContentHash: sourceProduction.contentHash,
    generationJobContentHash: generationJob.contentHash,
    preparationReportContentHash: report.contentHash,
    preparationCompletedAt: report.preparedAt,
    reviews,
    humanDecisions: {selectedCandidateSetIds: [], rejectedCandidateSetIds: [], approvedAssetVersions: []},
  };
  const manifest = {...manifestPayload, contentHash: hashCanonical(manifestPayload)};
  await writeFile(resolve(motionRoot, "motion-review-manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, {encoding: "utf8", flag: "wx", mode: 0o600});
  process.stdout.write(`SS-009 motion-review packet: ${reviews.length} paired MP4s, needs-review, 0 human decisions.\n${motionRoot}\n`);
}

void main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
