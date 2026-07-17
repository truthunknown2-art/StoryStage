import {mkdir} from "node:fs/promises";
import {dirname, resolve} from "node:path";
import {bundle} from "@remotion/bundler";
import {getVideoMetadata, renderMedia, renderStill, selectComposition} from "@remotion/renderer";
import type {RenderJobEvent} from "@storystage/contracts";
import {sampleEpisodePlan} from "@storystage/fixtures";
import {STORY_STAGE_COMPOSITION_ID} from "@storystage/remotion-runtime/manifest";

export type RenderSampleOptions = {
  jobId: string;
  onEvent?: (event: RenderJobEvent) => void;
  outputFileName?: string;
  simulateFailure?: boolean;
  workspaceRoot: string;
};

const emit = (listener: RenderSampleOptions["onEvent"], event: RenderJobEvent) => listener?.(event);

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
