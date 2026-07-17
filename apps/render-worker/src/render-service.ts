import {createHash} from "node:crypto";
import {lstat, mkdir, readFile, realpath} from "node:fs/promises";
import {dirname, isAbsolute, relative, resolve} from "node:path";
import {bundle} from "@remotion/bundler";
import {getVideoMetadata, renderMedia, renderStill, selectComposition} from "@remotion/renderer";
import type {RenderJobEvent} from "@storystage/contracts";
import {sampleEpisodePlan} from "@storystage/fixtures";
import {STORY_STAGE_COMPOSITION_ID, STORY_STAGE_PRODUCTION_COMPOSITION_ID, STORY_STAGE_RIG_DIAGNOSTIC_COMPOSITION_ID} from "@storystage/remotion-runtime/manifest";
import {assetRigManifestSchema, productionBundleSchema, rigDiagnosticReportSchema, rigValidationReportSchema, verifyAssetRigManifestHash, verifyProductionBundleHash, verifyRigDiagnosticReportHash, verifyRigValidationReportHash, type ApprovedAssetVersion, type RigAssetBinding} from "@storystage/story-engine";
import type {PlaybackAsset, ProductionCompositionProps, RigDiagnosticCompositionProps} from "@storystage/remotion-runtime";

export type RenderSampleOptions = {
  jobId: string;
  onEvent?: (event: RenderJobEvent) => void;
  outputFileName?: string;
  simulateFailure?: boolean;
  workspaceRoot: string;
};

export type RenderProductionOptions = {
  assetsRoot: string;
  bundleContentHash: string;
  bundleFile: string;
  jobId: string;
  onEvent?: (event: RenderJobEvent) => void;
  outputRoot: string;
  trustedProductionRoot: string;
  workspaceRoot: string;
};
export type RenderRigDiagnosticOptions = {entityName: string; importRoot: string; jobId: string; manifestFile: string; onEvent?: (event: RenderJobEvent) => void; outputFile: string; workspaceRoot: string};

const emit = (listener: RenderSampleOptions["onEvent"], event: RenderJobEvent) => listener?.(event);

const isWithin = (root: string, candidate: string) => {const path = relative(root, candidate); return path === "" || (!path.startsWith("..") && !isAbsolute(path));};
async function trustedFile(root: string, file: string, maxBytes: number): Promise<Buffer> {
  const requestedRoot = resolve(root);
  const requestedFile = resolve(file);
  if (!isWithin(requestedRoot, requestedFile)) throw new Error("Render input escaped its trusted local root.");
  const rootInfo = await lstat(requestedRoot);
  if (rootInfo.isSymbolicLink() || !rootInfo.isDirectory()) throw new Error("Render input root is not a trusted directory.");
  let current = requestedRoot;
  for (const segment of relative(requestedRoot, requestedFile).split(/[\\/]/).filter(Boolean)) {
    current = resolve(current, segment);
    const segmentInfo = await lstat(current);
    if (segmentInfo.isSymbolicLink()) throw new Error("Render input path contains a symbolic link.");
  }
  const [canonicalRoot, canonicalFile] = await Promise.all([realpath(requestedRoot), realpath(requestedFile)]);
  if (!isWithin(canonicalRoot, canonicalFile)) throw new Error("Render input escaped its trusted local root.");
  const info = await lstat(canonicalFile);
  if (!info.isFile() || info.isSymbolicLink() || info.size > maxBytes) throw new Error("Render input is unavailable or exceeds its safety limit.");
  return readFile(canonicalFile);
}

function verifyPng(bytes: Buffer, binding: RigAssetBinding, requireAlpha: boolean): void {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  if (bytes.length < 33 || !bytes.subarray(0, 8).equals(signature) || bytes.toString("ascii", 12, 16) !== "IHDR") throw new Error(`Approved render asset ${binding.candidateId} is not a decoded PNG.`);
  const width = bytes.readUInt32BE(16);
  const height = bytes.readUInt32BE(20);
  const colorType = bytes[25];
  if (width !== binding.width || height !== binding.height) throw new Error(`Approved render asset ${binding.candidateId} no longer matches its validated dimensions.`);
  if (requireAlpha && colorType !== 4 && colorType !== 6) throw new Error(`Approved moving cutout ${binding.candidateId} no longer has an alpha channel.`);
}

async function imageDataUrl(versionRoot: string, binding: RigAssetBinding, requireAlpha: boolean): Promise<string> {
  const bytes = await trustedFile(versionRoot, resolve(versionRoot, ...binding.relativeFile.split("/")), 50 * 1024 * 1024);
  if (createHash("sha256").update(bytes).digest("hex") !== binding.contentHash) throw new Error("Approved render asset bytes failed their content hash.");
  verifyPng(bytes, binding, requireAlpha);
  return `data:image/png;base64,${bytes.toString("base64")}`;
}

async function playbackAsset(assetsRoot: string, approved: ApprovedAssetVersion): Promise<PlaybackAsset> {
  const manifestFile = resolve(assetsRoot, ...approved.relativeFile.split("/"));
  const manifestBytes = await trustedFile(assetsRoot, manifestFile, 2_000_000);
  const manifest = assetRigManifestSchema.parse(JSON.parse(manifestBytes.toString("utf8")));
  if (!verifyAssetRigManifestHash(manifest) || manifest.contentHash !== approved.contentHash) throw new Error("Approved rig manifest failed its content binding.");
  const versionRoot = dirname(manifestFile);
  const validationBytes = await trustedFile(versionRoot, resolve(versionRoot, "rig-validation.json"), 2_000_000);
  const validation = rigValidationReportSchema.parse(JSON.parse(validationBytes.toString("utf8")));
  if (!verifyRigValidationReportHash(validation) || validation.status !== "passed" || validation.manifestContentHash !== manifest.contentHash) throw new Error("Approved rig validation is missing, failed, or stale.");
  const diagnosticBytes = await trustedFile(versionRoot, resolve(versionRoot, "rig-diagnostic.json"), 2_000_000);
  const diagnostic = rigDiagnosticReportSchema.parse(JSON.parse(diagnosticBytes.toString("utf8")));
  if (!verifyRigDiagnosticReportHash(diagnostic) || diagnostic.candidateSetId !== manifest.candidateSetId || diagnostic.manifestContentHash !== manifest.contentHash || diagnostic.validationReportContentHash !== validation.contentHash || diagnostic.videoRelativeFile !== "rig-diagnostic.mp4") throw new Error("Approved moving diagnostic is missing or stale.");
  const diagnosticVideo = await trustedFile(versionRoot, resolve(versionRoot, diagnostic.videoRelativeFile), 18 * 1024 * 1024);
  if (createHash("sha256").update(diagnosticVideo).digest("hex") !== diagnostic.videoContentHash) throw new Error("Approved moving diagnostic bytes changed after human review.");
  if (manifest.type === "character-rig") {
    await imageDataUrl(versionRoot, manifest.identityReference, false);
    return {type: "character-rig", assetId: approved.assetId, neutral: await imageDataUrl(versionRoot, manifest.poses.neutral, true), talk: await imageDataUrl(versionRoot, manifest.poses.talk, true), reaction: await imageDataUrl(versionRoot, manifest.poses.reaction, true)};
  }
  if (manifest.type === "background-layers") return {type: "background-layers", assetId: approved.assetId, far: await imageDataUrl(versionRoot, manifest.layers[0].asset, false), midground: await imageDataUrl(versionRoot, manifest.layers[1].asset, true), foreground: await imageDataUrl(versionRoot, manifest.layers[2].asset, true)};
  return {type: "prop", assetId: approved.assetId, cutout: await imageDataUrl(versionRoot, manifest.cutout, true)};
}

export async function renderRigDiagnostic(options: RenderRigDiagnosticOptions): Promise<string> {
  emit(options.onEvent, {jobId: options.jobId, status: "bundling", progress: 0, message: "Bundling selected rig diagnostic"});
  const manifestBytes = await trustedFile(options.importRoot, options.manifestFile, 2_000_000);
  const manifest = assetRigManifestSchema.parse(JSON.parse(manifestBytes.toString("utf8")));
  if (!verifyAssetRigManifestHash(manifest)) throw new Error("Selected rig manifest failed its content hash.");
  let asset: PlaybackAsset;
  if (manifest.type === "character-rig") {
    await imageDataUrl(options.importRoot, manifest.identityReference, false);
    asset = {type: "character-rig", assetId: manifest.requirementId, neutral: await imageDataUrl(options.importRoot, manifest.poses.neutral, true), talk: await imageDataUrl(options.importRoot, manifest.poses.talk, true), reaction: await imageDataUrl(options.importRoot, manifest.poses.reaction, true)};
  }
  else if (manifest.type === "background-layers") asset = {type: "background-layers", assetId: manifest.requirementId, far: await imageDataUrl(options.importRoot, manifest.layers[0].asset, false), midground: await imageDataUrl(options.importRoot, manifest.layers[1].asset, true), foreground: await imageDataUrl(options.importRoot, manifest.layers[2].asset, true)};
  else asset = {type: "prop", assetId: manifest.requirementId, cutout: await imageDataUrl(options.importRoot, manifest.cutout, true)};
  const inputProps: RigDiagnosticCompositionProps = {asset, entityName: options.entityName};
  await mkdir(dirname(options.outputFile), {recursive: true});
  const serveUrl = await bundle({entryPoint: resolve(options.workspaceRoot, "packages/remotion-runtime/src/remotion-entry.ts"), publicDir: resolve(options.workspaceRoot, "packages/remotion-runtime/public")});
  const composition = await selectComposition({serveUrl, id: STORY_STAGE_RIG_DIAGNOSTIC_COMPOSITION_ID, inputProps});
  await renderMedia({codec: "h264", composition, inputProps, outputLocation: options.outputFile, serveUrl, onProgress: ({progress}) => emit(options.onEvent, {jobId: options.jobId, status: "rendering", progress, message: `Rendering diagnostic frame ${Math.round(progress * 120)} of 120`})});
  emit(options.onEvent, {jobId: options.jobId, status: "encoding", progress: null, message: "Finalizing rig diagnostic"});
  emit(options.onEvent, {jobId: options.jobId, status: "completed", progress: null, message: "Rig diagnostic complete", outputPath: options.outputFile});
  return options.outputFile;
}

export async function renderProduction(options: RenderProductionOptions): Promise<string> {
  emit(options.onEvent, {jobId: options.jobId, status: "bundling", progress: 0, message: "Verifying approved production assets"});
  const bundleBytes = await trustedFile(options.trustedProductionRoot, options.bundleFile, 10_000_000);
  const productionBundle = productionBundleSchema.parse(JSON.parse(bundleBytes.toString("utf8")));
  if (!verifyProductionBundleHash(productionBundle) || productionBundle.contentHash !== options.bundleContentHash) throw new Error("Production render snapshot failed exact derivation or content-hash verification.");
  const approvedVersions = productionBundle.approvedAssetVersions ?? [];
  if (approvedVersions.length === 0) throw new Error("A production render requires at least one human-approved asset version.");
  const playbackEntries = await Promise.all(approvedVersions.map(async (approved) => [approved.assetId, await playbackAsset(options.assetsRoot, approved)] as const));
  const inputProps: ProductionCompositionProps = {plan: productionBundle.renderPlan, playbackAssets: Object.fromEntries(playbackEntries), sliceDurationInFrames: Math.min(productionBundle.renderPlan.durationInFrames, productionBundle.renderPlan.fps * 24)};
  const outputPath = resolve(options.outputRoot, `${options.jobId}.mp4`);
  await mkdir(options.outputRoot, {recursive: true});
  const serveUrl = await bundle({entryPoint: resolve(options.workspaceRoot, "packages/remotion-runtime/src/remotion-entry.ts"), publicDir: resolve(options.workspaceRoot, "packages/remotion-runtime/public"), onProgress: (progress) => emit(options.onEvent, {jobId: options.jobId, status: "bundling", progress: Math.min(.18, progress / 100 * .18), message: "Bundling the plan-driven production slice"})});
  const composition = await selectComposition({serveUrl, id: STORY_STAGE_PRODUCTION_COMPOSITION_ID, inputProps});
  await renderMedia({codec: "h264", composition, inputProps, outputLocation: outputPath, serveUrl, onProgress: ({progress}) => emit(options.onEvent, {jobId: options.jobId, status: "rendering", progress: .18 + progress * .76, message: `Rendering approved frames ${Math.round(progress * inputProps.sliceDurationInFrames)} of ${inputProps.sliceDurationInFrames}`})});
  emit(options.onEvent, {jobId: options.jobId, status: "encoding", progress: null, message: "Finalizing the approved H.264 production slice"});
  emit(options.onEvent, {jobId: options.jobId, status: "completed", progress: null, message: "Approved production slice complete", outputPath});
  return outputPath;
}

export async function renderSample({
  jobId,
  onEvent,
  outputFileName = "sample.mp4",
  simulateFailure = false,
  workspaceRoot,
}: RenderSampleOptions): Promise<string> {
  const outputPath = resolve(workspaceRoot, "artifacts/SS-001", outputFileName);
  const entryPoint = resolve(workspaceRoot, "packages/remotion-runtime/src/remotion-entry.ts");
  const publicDir = resolve(workspaceRoot, "packages/remotion-runtime/public");

  emit(onEvent, {jobId, status: "bundling", progress: 0, message: "Bundling the approved episode plan"});
  if (simulateFailure) throw new Error("Simulated render-worker failure");

  await mkdir(dirname(outputPath), {recursive: true});
  const serveUrl = await bundle({
    entryPoint,
    publicDir,
    onProgress: (progress) => emit(onEvent, {
      jobId,
      status: "bundling",
      progress: Math.min(0.18, (progress / 100) * 0.18),
      message: "Bundling the approved episode plan",
    }),
  });

  const composition = await selectComposition({serveUrl, id: STORY_STAGE_COMPOSITION_ID, inputProps: {plan: sampleEpisodePlan}});
  await renderMedia({
    codec: "h264",
    composition,
    inputProps: {plan: sampleEpisodePlan},
    outputLocation: outputPath,
    serveUrl,
    onProgress: ({progress}) => emit(onEvent, {
      jobId,
      status: "rendering",
      progress: 0.18 + progress * 0.76,
      message: `Rendering frame ${Math.round(progress * sampleEpisodePlan.durationInFrames)} of ${sampleEpisodePlan.durationInFrames}`,
    }),
  });

  emit(onEvent, {jobId, status: "encoding", progress: null, message: "Finalizing the H.264 file"});
  emit(onEvent, {jobId, status: "completed", progress: null, message: "Preview render complete", outputPath});
  return outputPath;
}

export async function renderProofStills(workspaceRoot: string, folder = "frame-checks"): Promise<string[]> {
  const entryPoint = resolve(workspaceRoot, "packages/remotion-runtime/src/remotion-entry.ts");
  const publicDir = resolve(workspaceRoot, "packages/remotion-runtime/public");
  const outputDir = resolve(workspaceRoot, "artifacts/SS-001", folder);
  const frames = [0, 180, 330];
  await mkdir(outputDir, {recursive: true});

  const serveUrl = await bundle({entryPoint, publicDir});
  const composition = await selectComposition({serveUrl, id: STORY_STAGE_COMPOSITION_ID, inputProps: {plan: sampleEpisodePlan}});
  const outputs: string[] = [];
  for (const frame of frames) {
    const output = resolve(outputDir, `frame-${String(frame).padStart(3, "0")}.png`);
    await renderStill({composition, frame, inputProps: {plan: sampleEpisodePlan}, output, serveUrl});
    outputs.push(output);
  }
  return outputs;
}

export async function readSampleMetadata(file: string) {
  const metadata = await getVideoMetadata(file);
  return {
    codec: metadata.codec,
    audioCodec: metadata.audioCodec,
    durationInSeconds: metadata.durationInSeconds,
    fps: metadata.fps,
    frameCount: metadata.durationInSeconds === null ? null : Math.round(metadata.durationInSeconds * metadata.fps),
    height: metadata.height,
    width: metadata.width,
  };
}
