import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import {
  arch as osArch,
  platform as osPlatform,
  release as osRelease,
  version as osVersion,
} from "node:os";
import { basename, relative, resolve } from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import { bundle } from "@remotion/bundler";
import {
  ensureBrowser,
  openBrowser,
  renderFrames,
  renderStill,
  selectComposition,
  stitchFramesToVideo,
} from "@remotion/renderer";
import type { ProductionCompositionProps } from "@storystage/remotion-runtime";
import {
  createBundledKidsCapabilityRegistry,
  partsRigRuntime,
} from "@storystage/remotion-runtime/director";
import { STORY_STAGE_PRODUCTION_COMPOSITION_ID } from "@storystage/remotion-runtime/manifest";
import {
  compileDirectorProject,
  createCv002Project,
  createKvp001ProofFixture,
  evaluateContinuityFrame,
  hashCanonical,
  isLocalPartsV1Execution,
  KVP001_PROOF_LIMITATION,
  listArticulatedRigAssetReferences,
  type ExecutableEpisodePlan,
  type ResolvedContinuityFrame,
} from "@storystage/story-engine/director-alpha";
import ffmpegPath from "ffmpeg-static";
import ffprobeStatic from "ffprobe-static";
import { verifyDirectorEpisodeCapabilityAssets } from "./director-capability-assets";

const workspaceRoot = resolve(
  fileURLToPath(new URL("../../..", import.meta.url)),
);
const outputRoot = resolve(workspaceRoot, "artifacts/KVP-001");
const publicRoot = resolve(workspaceRoot, "packages/remotion-runtime/public");
const execFileAsync = promisify(execFile);
const require = createRequire(import.meta.url);
const sha256 = (bytes: Uint8Array) =>
  createHash("sha256").update(bytes).digest("hex");

const CHROME_MODE = "headless-shell" as const;
const CHROMIUM_OPTIONS = { darkMode: false, gl: null };
const DEVICE_SCALE_FACTOR = 1;

const packageVersion = (packageName: string) => {
  const manifest = require(`${packageName}/package.json`) as {
    version?: unknown;
  };
  if (typeof manifest.version !== "string")
    throw new Error(`${packageName} does not expose an exact version.`);
  return manifest.version;
};

const openPinnedBrowser = (browserExecutable: string) =>
  openBrowser("chrome", {
    browserExecutable,
    chromeMode: CHROME_MODE,
    chromiumOptions: CHROMIUM_OPTIONS,
    forceDeviceScaleFactor: DEVICE_SCALE_FACTOR,
    logLevel: "error",
  });

const selectedFrames = [0, 36, 61, 71, 72, 96, 101, 102, 109, 110, 139];
const selectedFrameOrders = {
  ascending: [...selectedFrames],
  descending: [...selectedFrames].reverse(),
  shuffled: [72, 0, 139, 36, 110, 61, 101, 71, 102, 96, 109],
} as const;

const hashFileReceipt = async (file: string) => {
  const bytes = await readFile(file);
  return {
    file: basename(file),
    byteLength: bytes.byteLength,
    sha256: sha256(bytes),
  };
};

const hashDirectoryReceipt = async (root: string) => {
  const files: Array<{
    relativeFile: string;
    byteLength: number;
    sha256: string;
  }> = [];
  const visit = async (directory: string): Promise<void> => {
    const entries = await readdir(directory, { withFileTypes: true });
    for (const entry of entries.sort((left, right) =>
      left.name.localeCompare(right.name),
    )) {
      const path = resolve(directory, entry.name);
      if (entry.isDirectory()) await visit(path);
      else if (entry.isFile()) {
        const bytes = await readFile(path);
        files.push({
          relativeFile: relative(root, path).replaceAll("\\", "/"),
          byteLength: bytes.byteLength,
          sha256: sha256(bytes),
        });
      }
    }
  };
  await visit(root);
  return { fileCount: files.length, contentHash: hashCanonical(files), files };
};

const createEnvironmentReceipt = async ({
  browserExecutable,
  bundleReceipt,
  composition,
}: {
  browserExecutable: string;
  bundleReceipt: Awaited<ReturnType<typeof hashDirectoryReceipt>>;
  composition: Awaited<ReturnType<typeof selectComposition>>;
}) => {
  const { stdout: chromiumVersion } = await execFileAsync(browserExecutable, [
    "--version",
  ]);
  const windowsRoot = process.env.WINDIR ?? "C:/Windows";
  const fontFiles = ["arial.ttf", "arialbd.ttf", "ariblk.ttf"];
  return {
    os: {
      platform: osPlatform(),
      release: osRelease(),
      version: osVersion(),
      arch: osArch(),
    },
    node: {
      version: process.versions.node,
      executable: await hashFileReceipt(process.execPath),
    },
    packages: {
      remotion: packageVersion("remotion"),
      renderer: packageVersion("@remotion/renderer"),
      bundler: packageVersion("@remotion/bundler"),
    },
    chromium: {
      version: chromiumVersion.trim(),
      executable: await hashFileReceipt(browserExecutable),
      chromeMode: CHROME_MODE,
      options: CHROMIUM_OPTIONS,
      forceDeviceScaleFactor: DEVICE_SCALE_FACTOR,
      concurrency: 1,
    },
    fonts: await Promise.all(
      fontFiles.map((file) =>
        hashFileReceipt(resolve(windowsRoot, "Fonts", file)),
      ),
    ),
    composition: {
      id: composition.id,
      width: composition.width,
      height: composition.height,
      fps: composition.fps,
      proofFrameRange: [0, 139],
    },
    bundle: bundleReceipt,
  };
};

const compileProofBuild = () => {
  const fixture = createKvp001ProofFixture();
  const proxy = compileDirectorProject({
    storyProject: fixture.storyProject,
    planner: fixture.planner,
  });
  const requirement = proxy.directorPlan.beats[0]!.performanceRequirements[0]!;
  if (requirement.source !== "articulated-rig")
    throw new Error("KVP source fixture did not request an articulated rig.");
  const capabilities = createBundledKidsCapabilityRegistry([
    {
      kind: "articulated-rig",
      requirementId: requirement.id,
      entityId: requirement.entityId,
    },
  ]);
  return {
    fixture,
    capabilities,
    proxyProject: proxy,
    project: compileDirectorProject({
      storyProject: fixture.storyProject,
      planner: fixture.planner,
      capabilities,
    }),
    requirement,
  };
};

const authorityProjection = (frame: ResolvedContinuityFrame) => ({
  episodePlanContentHash: frame.episodePlanContentHash,
  continuitySequencePlanContentHash: frame.continuitySequencePlanContentHash,
  absoluteFrame: frame.absoluteFrame,
  shotFrame: frame.shotFrame,
  fps: frame.fps,
  shotId: frame.shotId,
  sceneId: frame.sceneId,
  camera: frame.camera,
  transition: frame.transition,
  entities: Object.fromEntries(
    Object.entries(frame.entities).map(([entityId, entity]) => [
      entityId,
      {
        entityId: entity.entityId,
        visible: entity.visible,
        lifecycle: entity.lifecycle,
        rootTransform: entity.rootTransform,
        velocity: entity.velocity,
        facing: entity.facing,
        gazeVectorLocal: entity.gazeVectorLocal,
        motionMode: entity.motionMode,
        actionPhase: entity.actionPhase,
        phaseProgress: entity.phaseProgress,
        gaitPhase: entity.gaitPhase,
        visemeId: entity.visemeId,
        performanceProgramId: entity.performanceProgramId,
        performanceProgramContentHash: entity.performanceProgramContentHash,
      },
    ]),
  ),
  props: frame.props,
});

const crossCapabilityAuthorityProjection = (
  frame: ResolvedContinuityFrame,
) => ({
  absoluteFrame: frame.absoluteFrame,
  shotFrame: frame.shotFrame,
  fps: frame.fps,
  shotId: frame.shotId,
  sceneId: frame.sceneId,
  camera: frame.camera,
  transition: frame.transition,
  entities: Object.fromEntries(
    Object.entries(frame.entities).map(([entityId, entity]) => [
      entityId,
      {
        entityId: entity.entityId,
        visible: entity.visible,
        lifecycle: entity.lifecycle,
        rootTransform: entity.rootTransform,
        velocity: entity.velocity,
        facing: entity.facing,
        gazeVectorLocal: entity.gazeVectorLocal,
        motionMode: entity.motionMode,
        actionPhase: entity.actionPhase,
        phaseProgress: entity.phaseProgress,
        gaitPhase: entity.gaitPhase,
        visemeId: entity.visemeId,
      },
    ]),
  ),
  props: frame.props,
});

const crossCapabilityArtifactProjection = (
  project: ReturnType<typeof compileDirectorProject>,
) => ({
  storyProjectContentHash: project.storyProjectContentHash,
  planningArtifactContentHash: project.planningArtifact.contentHash,
  sceneWorldContentHashes: project.sceneWorlds.map((world) => world.contentHash),
  directorPlanContentHash: project.directorPlan.contentHash,
  timingSolutionContentHash: project.timingSolution.contentHash,
  executableShotsHash: hashCanonical(project.executableEpisodePlan.shots),
  resolvedEventFramesHash: hashCanonical(
    project.executableEpisodePlan.resolvedEventFrames ?? [],
  ),
  formatHash: hashCanonical(project.executableEpisodePlan.format),
});

const exactProofProgram = (episode: ExecutableEpisodePlan) => {
  const shot = episode.shots[0]!;
  const performance = episode.performancePrograms.find(
    (program) =>
      program.sourceShotIds?.includes(shot.directorShotId) &&
      program.execution &&
      isLocalPartsV1Execution(program.execution),
  );
  if (
    !performance?.contentHash ||
    !performance.execution ||
    !isLocalPartsV1Execution(performance.execution)
  )
    throw new Error("KVP first shot has no sealed local-parts performance.");
  return { performance, execution: performance.execution, shot };
};

const compileOrdinaryReactionSmoke = () => {
  const sentence =
    "A curious friend gasped when the silver lantern flashed, then watched the quiet garden answer with a warm glow.";
  const storyProject = createCv002Project(
    "Ordinary Kids local-parts reaction smoke",
    Array.from({ length: 8 }, (_, index) => `${sentence} ${index + 1}.`).join(
      " ",
    ),
    "kids-adventure",
  );
  const proxy = compileDirectorProject({ storyProject });
  const requirement = proxy.directorPlan.beats
    .flatMap((beat) => beat.performanceRequirements)
    .find((candidate) => candidate.source === "articulated-rig");
  if (!requirement)
    throw new Error("Ordinary Kids smoke has no articulated requirement.");
  const capabilities = createBundledKidsCapabilityRegistry([
    {
      kind: "articulated-rig",
      requirementId: requirement.id,
      entityId: requirement.entityId,
    },
  ]);
  return compileDirectorProject({ storyProject, capabilities });
};

const probeVideo = async (
  file: string,
  expected: { fps: number; frameCount: number; height: number; width: number },
) => {
  const { stdout } = await execFileAsync(
    ffprobeStatic.path,
    ["-v", "error", "-show_streams", "-of", "json", file],
    { maxBuffer: 10 * 1024 * 1024 },
  );
  const streams = (
    JSON.parse(stdout) as {
      streams?: Array<{
        avg_frame_rate?: string;
        codec_name?: string;
        codec_type?: string;
        height?: number;
        nb_frames?: string;
        width?: number;
      }>;
    }
  ).streams;
  const video = streams?.find((stream) => stream.codec_type === "video");
  const [numerator, denominator] = (video?.avg_frame_rate ?? "0/1")
    .split("/")
    .map(Number);
  const fps = denominator ? numerator! / denominator : 0;
  if (
    !video ||
    video.codec_name !== "h264" ||
    video.width !== expected.width ||
    video.height !== expected.height ||
    fps !== expected.fps ||
    Number(video.nb_frames) !== expected.frameCount
  )
    throw new Error(
      `Unexpected KVP proof video metadata: ${JSON.stringify({ video, fps })}`,
    );
  const bytes = await readFile(file);
  return { ...video, fps, byteLength: bytes.byteLength, sha256: sha256(bytes) };
};

const decodeSelectedFrames = async (video: string, directory: string) => {
  const ffmpeg = ffmpegPath;
  if (!ffmpeg) throw new Error("ffmpeg-static is unavailable.");
  await mkdir(directory, { recursive: true });
  const select = selectedFrames.map((frame) => `eq(n\\,${frame})`).join("+");
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
      resolve(directory, "frame-%02d.png"),
    ],
    { maxBuffer: 10 * 1024 * 1024 },
  );
  return Promise.all(
    selectedFrames.map(async (frame, index) => {
      const file = resolve(
        directory,
        `frame-${String(index + 1).padStart(2, "0")}.png`,
      );
      const bytes = await readFile(file);
      return {
        frame,
        file,
        byteLength: bytes.byteLength,
        sha256: sha256(bytes),
      };
    }),
  );
};

const createContactSheet = async (stillsRoot: string, output: string) => {
  const ffmpeg = ffmpegPath;
  if (!ffmpeg) throw new Error("ffmpeg-static is unavailable.");
  await execFileAsync(
    ffmpeg,
    [
      "-y",
      "-framerate",
      "1",
      "-start_number",
      "0",
      "-i",
      resolve(stillsRoot, "still-%02d.png"),
      "-vf",
      "scale=384:216,tile=4x3:padding=8:margin=8:color=white",
      "-frames:v",
      "1",
      output,
    ],
    { maxBuffer: 10 * 1024 * 1024 },
  );
};

const renderSelectedStills = async ({
  browserExecutable,
  composition,
  directory,
  frameOrder,
  inputProps,
  isolation,
  serveUrl,
}: {
  browserExecutable: string;
  composition: Awaited<ReturnType<typeof selectComposition>>;
  directory: string;
  frameOrder: readonly number[];
  inputProps: ProductionCompositionProps;
  isolation: "fresh-browser-per-frame" | "shared-browser";
  serveUrl: string;
}) => {
  await rm(directory, {
    force: true,
    maxRetries: 12,
    recursive: true,
    retryDelay: 100,
  });
  await mkdir(directory, { recursive: true });
  const stills = [];
  const sharedBrowser =
    isolation === "shared-browser"
      ? await openPinnedBrowser(browserExecutable)
      : null;
  try {
    for (const [index, frame] of frameOrder.entries()) {
      const output = resolve(
        directory,
        `still-${String(index).padStart(2, "0")}.png`,
      );
      const browser =
        sharedBrowser ?? (await openPinnedBrowser(browserExecutable));
      try {
        await renderStill({
          composition,
          frame,
          inputProps,
          output,
          puppeteerInstance: browser,
          serveUrl,
        });
      } finally {
        if (!sharedBrowser) await browser.close({ silent: true });
      }
      const bytes = await readFile(output);
      stills.push({
        frame,
        output,
        byteLength: bytes.length,
        sha256: sha256(bytes),
      });
    }
  } finally {
    if (sharedBrowser) await sharedBrowser.close({ silent: true });
  }
  return stills;
};

const deterministicFfmpegOverride = ({
  args,
  type,
}: {
  args: string[];
  type: "pre-stitcher" | "stitcher";
}) => {
  if (type !== "stitcher") return args;
  return [...args.slice(0, -1), "-threads", "1", args.at(-1)!];
};

const renderDeterministicFrameSequence = async ({
  browserExecutable,
  composition,
  directory,
  inputProps,
  serveUrl,
}: {
  browserExecutable: string;
  composition: Awaited<ReturnType<typeof selectComposition>>;
  directory: string;
  inputProps: ProductionCompositionProps;
  serveUrl: string;
}) => {
  await rm(directory, {
    force: true,
    maxRetries: 12,
    recursive: true,
    retryDelay: 100,
  });
  await mkdir(directory, { recursive: true });
  const browser = await openPinnedBrowser(browserExecutable);
  const result = await (async () => {
    try {
      return await renderFrames({
        composition,
        concurrency: 1,
        frameRange: [0, 139],
        imageFormat: "png",
        imageSequencePattern: "frame-[frame].[ext]",
        inputProps,
        muted: true,
        onFrameUpdate: () => undefined,
        onStart: () => undefined,
        outputDir: directory,
        puppeteerInstance: browser,
        serveUrl,
      });
    } finally {
      await browser.close({ silent: true });
    }
  })();
  const files = (await readdir(directory))
    .filter((file) => file.endsWith(".png"))
    .sort();
  if (files.length !== 140)
    throw new Error(
      `KVP frame sequence contains ${files.length} PNGs instead of 140.`,
    );
  const frames = await Promise.all(
    files.map(async (file, frame) => {
      const path = resolve(directory, file);
      const bytes = await readFile(path);
      return {
        frame,
        file: path,
        byteLength: bytes.byteLength,
        sha256: sha256(bytes),
      };
    }),
  );
  return { assetsInfo: result.assetsInfo, frames };
};

async function main() {
  await mkdir(outputRoot, { recursive: true });
  const firstBuild = compileProofBuild();
  const secondBuild = compileProofBuild();
  const canonicalHashes = {
    storyProject: firstBuild.fixture.storyProject.contentHash,
    capabilityRegistry: firstBuild.capabilities.contentHash,
    directorProject: firstBuild.project.contentHash,
    directorProposal: firstBuild.project.planningArtifact.contentHash,
    directorPlan: firstBuild.project.directorPlan.contentHash,
    timingSolution: firstBuild.project.timingSolution.contentHash,
    continuitySequencePlan:
      firstBuild.project.executableEpisodePlan.continuitySequencePlan
        .contentHash,
    executableEpisodePlan: firstBuild.project.executableEpisodePlan.contentHash,
  };
  const repeatedCanonicalHashes = {
    storyProject: secondBuild.fixture.storyProject.contentHash,
    capabilityRegistry: secondBuild.capabilities.contentHash,
    directorProject: secondBuild.project.contentHash,
    directorProposal: secondBuild.project.planningArtifact.contentHash,
    directorPlan: secondBuild.project.directorPlan.contentHash,
    timingSolution: secondBuild.project.timingSolution.contentHash,
    continuitySequencePlan:
      secondBuild.project.executableEpisodePlan.continuitySequencePlan
        .contentHash,
    executableEpisodePlan:
      secondBuild.project.executableEpisodePlan.contentHash,
  };
  if (hashCanonical(canonicalHashes) !== hashCanonical(repeatedCanonicalHashes))
    throw new Error("KVP canonical source rebuilds are not identical.");

  const episodePlan = firstBuild.project.executableEpisodePlan;
  const proxyEpisodePlan = firstBuild.proxyProject.executableEpisodePlan;
  const proxyAuthorityArtifacts = crossCapabilityArtifactProjection(
    firstBuild.proxyProject,
  );
  const rigAuthorityArtifacts = crossCapabilityArtifactProjection(
    firstBuild.project,
  );
  if (
    hashCanonical(proxyAuthorityArtifacts) !==
    hashCanonical(rigAuthorityArtifacts)
  )
    throw new Error(
      "Enabling the KVP capability changed canonical planning, timing, shots, events, scene worlds, or format.",
    );
  const proxyVsRigAuthorityFrames = Array.from(
    { length: 140 },
    (_, absoluteFrame) => {
      const proxy = crossCapabilityAuthorityProjection(
        evaluateContinuityFrame(proxyEpisodePlan, absoluteFrame),
      );
      const rig = crossCapabilityAuthorityProjection(
        evaluateContinuityFrame(episodePlan, absoluteFrame),
      );
      const proxyHash = hashCanonical(proxy);
      const rigHash = hashCanonical(rig);
      return {
        absoluteFrame,
        proxyHash,
        rigHash,
        matches: proxyHash === rigHash,
      };
    },
  );
  if (proxyVsRigAuthorityFrames.some((frame) => !frame.matches))
    throw new Error(
      "Enabling the KVP capability changed canonical frame authority.",
    );
  const { performance, execution, shot } = exactProofProgram(episodePlan);
  if (shot.startFrame !== 0 || shot.endFrameExclusive !== 140)
    throw new Error("KVP proof is not the exact canonical 0..140 shot.");
  const verifiedAssets = await verifyDirectorEpisodeCapabilityAssets(
    episodePlan,
    publicRoot,
  );
  const verifiedPartsRigAssets = listArticulatedRigAssetReferences(
    execution.rigManifest,
  ).map((reference) => {
    const verified = verifiedAssets.find(
      (asset) => asset.assetId === reference.candidateId,
    );
    const approved = episodePlan.approvedAssets.find(
      (asset) => asset.assetId === reference.candidateId,
    );
    if (
      !verified ||
      !approved?.relativeFile ||
      !approved.byteLength ||
      !approved.immutableLocationId
    )
      throw new Error(
        `KVP proof asset ${reference.candidateId} is not verified and renderable.`,
      );
    return {
      binding: {
        ...approved,
        relativeFile: approved.relativeFile,
        byteLength: approved.byteLength,
        immutableLocationId: approved.immutableLocationId,
      },
      verifiedUrl: `verified://${verified.contentHash}`,
    };
  });

  const localEvaluations = selectedFrames.map((absoluteFrame) => {
    const before = evaluateContinuityFrame(episodePlan, absoluteFrame);
    const resolved = before.entities[performance.entityId];
    if (!resolved)
      throw new Error(`KVP actor is missing at frame ${absoluteFrame}.`);
    const authorityHashBefore = hashCanonical(authorityProjection(before));
    const input = partsRigRuntime.createInput({
      episodePlan,
      execution,
      localFrame: before.shotFrame,
      performance,
      resolved,
      shotId: before.shotId,
      verifiedAssets: verifiedPartsRigAssets,
    });
    const local = partsRigRuntime.evaluate(input);
    const after = evaluateContinuityFrame(episodePlan, absoluteFrame);
    const authorityHashAfter = hashCanonical(authorityProjection(after));
    if (authorityHashBefore !== authorityHashAfter)
      throw new Error(
        `Local rig evaluation changed canonical authority at frame ${absoluteFrame}.`,
      );
    if (
      "rootTransform" in local ||
      "camera" in local ||
      "visibility" in local ||
      "propOwnership" in local
    )
      throw new Error("Local rig renderer returned forbidden root authority.");
    return {
      absoluteFrame,
      authorityHash: authorityHashBefore,
      canonical: {
        rootTransform: resolved.rootTransform,
        velocity: resolved.velocity,
        visible: resolved.visible,
        facing: resolved.facing,
        motionMode: resolved.motionMode,
        actionPhase: resolved.actionPhase,
        phaseProgress: resolved.phaseProgress,
        gaitPhase: resolved.gaitPhase,
        visemeId: resolved.visemeId,
        camera: before.camera,
        transition: before.transition,
        props: before.props,
      },
      localPerformance: local,
    };
  });

  const serveUrl = await bundle({
    entryPoint: resolve(
      workspaceRoot,
      "packages/remotion-runtime/src/remotion-entry.ts",
    ),
    publicDir: publicRoot,
  });
  const browserStatus = await ensureBrowser({
    chromeMode: CHROME_MODE,
    logLevel: "error",
  });
  if (!("path" in browserStatus))
    throw new Error(
      `Pinned Chromium is unavailable: ${JSON.stringify(browserStatus)}`,
    );
  const browserExecutable = browserStatus.path;
  const bundleReceipt = await hashDirectoryReceipt(serveUrl);
  const inputProps: ProductionCompositionProps = {
    mode: "director-episode",
    episodePlan,
  };
  const proxyInputProps: ProductionCompositionProps = {
    mode: "director-episode",
    episodePlan: proxyEpisodePlan,
  };
  const metadataBrowser = await openPinnedBrowser(browserExecutable);
  const composition = await (async () => {
    try {
      return await selectComposition({
        serveUrl,
        id: STORY_STAGE_PRODUCTION_COMPOSITION_ID,
        inputProps,
        puppeteerInstance: metadataBrowser,
      });
    } finally {
      await metadataBrowser.close({ silent: true });
    }
  })();
  const proxyMetadataBrowser = await openPinnedBrowser(browserExecutable);
  const proxyComposition = await (async () => {
    try {
      return await selectComposition({
        serveUrl,
        id: STORY_STAGE_PRODUCTION_COMPOSITION_ID,
        inputProps: proxyInputProps,
        puppeteerInstance: proxyMetadataBrowser,
      });
    } finally {
      await proxyMetadataBrowser.close({ silent: true });
    }
  })();
  if (
    hashCanonical({
      width: proxyComposition.width,
      height: proxyComposition.height,
      fps: proxyComposition.fps,
      durationInFrames: proxyComposition.durationInFrames,
    }) !==
    hashCanonical({
      width: composition.width,
      height: composition.height,
      fps: composition.fps,
      durationInFrames: composition.durationInFrames,
    })
  )
    throw new Error("Proxy and rig compositions do not share exact metadata.");
  const environment = await createEnvironmentReceipt({
    browserExecutable,
    bundleReceipt,
    composition,
  });
  const passOne = resolve(outputRoot, "kvp001-pass-1.mp4");
  const passTwo = resolve(outputRoot, "kvp001-pass-2.mp4");
  const sequenceOne = await renderDeterministicFrameSequence({
    browserExecutable,
    composition,
    directory: resolve(outputRoot, "frames-pass-1"),
    inputProps,
    serveUrl,
  });
  const sequenceTwo = await renderDeterministicFrameSequence({
    browserExecutable,
    composition,
    directory: resolve(outputRoot, "frames-pass-2"),
    inputProps,
    serveUrl,
  });
  const frameSequenceComparisons = sequenceOne.frames.map((first, index) => ({
    frame: first.frame,
    first: first.sha256,
    second: sequenceTwo.frames[index]!.sha256,
    matches: first.sha256 === sequenceTwo.frames[index]!.sha256,
  }));
  if (frameSequenceComparisons.some((comparison) => !comparison.matches))
    throw new Error("KVP lossless frame sequences differ across passes.");

  for (const [assetsInfo, outputLocation] of [
    [sequenceOne.assetsInfo, passOne],
    [sequenceTwo.assetsInfo, passTwo],
  ] as const)
    await stitchFramesToVideo({
      assetsInfo,
      codec: "h264",
      crf: 18,
      ffmpegOverride: deterministicFfmpegOverride,
      force: true,
      fps: composition.fps,
      hardwareAcceleration: "disable",
      height: composition.height,
      muted: true,
      outputLocation,
      pixelFormat: "yuv420p",
      width: composition.width,
      x264Preset: "veryslow",
    });

  const stillsRoot = resolve(outputRoot, "stills-isolated");
  const stills = await renderSelectedStills({
    browserExecutable,
    composition,
    directory: stillsRoot,
    frameOrder: selectedFrameOrders.ascending,
    inputProps,
    isolation: "fresh-browser-per-frame",
    serveUrl,
  });
  const proxyStills = await renderSelectedStills({
    browserExecutable,
    composition: proxyComposition,
    directory: resolve(outputRoot, "stills-proxy"),
    frameOrder: selectedFrameOrders.ascending,
    inputProps: proxyInputProps,
    isolation: "fresh-browser-per-frame",
    serveUrl,
  });
  const proxyVsRigVisualComparisons = stills.map((rig, index) => {
    const proxy = proxyStills[index]!;
    return {
      frame: rig.frame,
      proxy: proxy.sha256,
      rig: rig.sha256,
      differs: proxy.sha256 !== rig.sha256,
    };
  });
  const proxyVsRigDifferingFrames = proxyVsRigVisualComparisons
    .filter((comparison) => comparison.differs)
    .map((comparison) => comparison.frame);
  if (proxyVsRigDifferingFrames.length === 0)
    throw new Error(
      "The KVP rig capability produced no visible difference from the proxy renderer.",
    );
  const ascendingStills = await renderSelectedStills({
    browserExecutable,
    composition,
    directory: resolve(outputRoot, "stills-ascending"),
    frameOrder: selectedFrameOrders.ascending,
    inputProps,
    isolation: "shared-browser",
    serveUrl,
  });
  const descendingStills = await renderSelectedStills({
    browserExecutable,
    composition,
    directory: resolve(outputRoot, "stills-descending"),
    frameOrder: selectedFrameOrders.descending,
    inputProps,
    isolation: "shared-browser",
    serveUrl,
  });
  const shuffledStills = await renderSelectedStills({
    browserExecutable,
    composition,
    directory: resolve(outputRoot, "stills-shuffled"),
    frameOrder: selectedFrameOrders.shuffled,
    inputProps,
    isolation: "shared-browser",
    serveUrl,
  });
  const serialByFrame = new Map(
    sequenceOne.frames.map((frame) => [frame.frame, frame.sha256]),
  );
  const compareFrameOrder = (label: string, frames: typeof stills) =>
    frames.map((candidate, orderIndex) => ({
      label,
      orderIndex,
      frame: candidate.frame,
      expected: serialByFrame.get(candidate.frame),
      actual: candidate.sha256,
      matches: serialByFrame.get(candidate.frame) === candidate.sha256,
    }));
  const frameOrderComparisons = {
    isolated: compareFrameOrder("isolated", stills),
    ascending: compareFrameOrder("ascending", ascendingStills),
    descending: compareFrameOrder("descending", descendingStills),
    shuffled: compareFrameOrder("shuffled", shuffledStills),
  };
  const rawStillComparisons = Object.values(frameOrderComparisons).flat();
  if (rawStillComparisons.some((comparison) => !comparison.matches))
    throw new Error(
      "KVP selected frames depend on browser isolation or evaluation order.",
    );
  const contactSheet = resolve(outputRoot, "contact-sheet.png");
  await createContactSheet(stillsRoot, contactSheet);

  const decodedPassOne = await decodeSelectedFrames(
    passOne,
    resolve(outputRoot, "decoded-pass-1"),
  );
  const decodedPassTwo = await decodeSelectedFrames(
    passTwo,
    resolve(outputRoot, "decoded-pass-2"),
  );
  const decodedComparisons = decodedPassOne.map((first, index) => ({
    frame: first.frame,
    first: first.sha256,
    second: decodedPassTwo[index]!.sha256,
    matches: first.sha256 === decodedPassTwo[index]!.sha256,
  }));
  if (decodedComparisons.some((comparison) => !comparison.matches))
    throw new Error("KVP decoded frames differ across encoded passes.");
  if (new Set(decodedPassOne.map((frame) => frame.sha256)).size < 8)
    throw new Error(
      "KVP proof lacks visible variation across selected frames.",
    );

  const arbitraryProject = compileOrdinaryReactionSmoke();
  const arbitrary = exactProofProgram(arbitraryProject.executableEpisodePlan);
  const arbitraryFrame = Array.from(
    {
      length: arbitrary.shot.endFrameExclusive - arbitrary.shot.startFrame,
    },
    (_, offset) => arbitrary.shot.startFrame + offset,
  ).find((frame) => {
    const resolved = evaluateContinuityFrame(
      arbitraryProject.executableEpisodePlan,
      frame,
    ).entities[arbitrary.performance.entityId];
    return resolved?.visemeId !== null;
  });
  if (arbitraryFrame === undefined)
    throw new Error("Ordinary reaction smoke has no canonical viseme.");
  await verifyDirectorEpisodeCapabilityAssets(
    arbitraryProject.executableEpisodePlan,
    publicRoot,
  );
  const arbitraryInputProps: ProductionCompositionProps = {
    mode: "director-episode",
    episodePlan: arbitraryProject.executableEpisodePlan,
  };
  const arbitraryStill = resolve(outputRoot, "arbitrary-reaction-smoke.png");
  const arbitraryBrowser = await openPinnedBrowser(browserExecutable);
  await (async () => {
    try {
      const selected = await selectComposition({
        serveUrl,
        id: STORY_STAGE_PRODUCTION_COMPOSITION_ID,
        inputProps: arbitraryInputProps,
        puppeteerInstance: arbitraryBrowser,
      });
      await renderStill({
        composition: selected,
        frame: arbitraryFrame,
        inputProps: arbitraryInputProps,
        output: arbitraryStill,
        puppeteerInstance: arbitraryBrowser,
        serveUrl,
      });
      return selected;
    } finally {
      await arbitraryBrowser.close({ silent: true });
    }
  })();

  const report = {
    proof: "KVP-001 canonical local-parts execution and authority isolation",
    verdict: "PASS",
    verified: "canonical local-parts execution and authority isolation",
    notYetVerified:
      "general arbitrary-script synthesis of compound locomotion → plant → acting performances",
    fixtureLimitation: KVP001_PROOF_LIMITATION,
    environment,
    canonicalRebuildsMatch: true,
    canonicalHashes,
    repeatedCanonicalHashes,
    firstShot: {
      id: shot.directorShotId,
      startFrame: shot.startFrame,
      endFrameExclusive: shot.endFrameExclusive,
      performanceProgramId: performance.id,
      performanceProgramContentHash: performance.contentHash,
    },
    localEvaluations,
    proxyVsRigAuthority: {
      proxyArtifacts: proxyAuthorityArtifacts,
      rigArtifacts: rigAuthorityArtifacts,
      artifactsMatch: true,
      frameComparisons: proxyVsRigAuthorityFrames,
      matchedFrames: proxyVsRigAuthorityFrames.filter((frame) => frame.matches)
        .length,
      totalFrames: proxyVsRigAuthorityFrames.length,
      exact: true,
    },
    proxyVsRigVisualDifference: {
      proxyEpisodePlanContentHash: proxyEpisodePlan.contentHash,
      rigEpisodePlanContentHash: episodePlan.contentHash,
      comparisons: proxyVsRigVisualComparisons,
      differingFrames: proxyVsRigDifferingFrames,
      verdict: "PASS",
    },
    verifiedAssets,
    encoded: {
      passOne: {
        file: passOne,
        ...(await probeVideo(passOne, {
          width: composition.width,
          height: composition.height,
          fps: composition.fps,
          frameCount: sequenceOne.frames.length,
        })),
      },
      passTwo: {
        file: passTwo,
        ...(await probeVideo(passTwo, {
          width: composition.width,
          height: composition.height,
          fps: composition.fps,
          frameCount: sequenceTwo.frames.length,
        })),
      },
      decodedComparisons,
    },
    losslessFrameSequences: {
      firstAggregateHash: hashCanonical(
        sequenceOne.frames.map((frame) => frame.sha256),
      ),
      secondAggregateHash: hashCanonical(
        sequenceTwo.frames.map((frame) => frame.sha256),
      ),
      frameSequenceComparisons,
    },
    selectedFrameOrderEvidence: {
      orders: selectedFrameOrders,
      isolated: stills,
      ascending: ascendingStills,
      descending: descendingStills,
      shuffled: shuffledStills,
      comparisons: frameOrderComparisons,
    },
    contactSheet,
    arbitraryScriptSmoke: {
      episodePlanContentHash:
        arbitraryProject.executableEpisodePlan.contentHash,
      performanceProgramId: arbitrary.performance.id,
      sourceShotId: arbitrary.shot.directorShotId,
      frame: arbitraryFrame,
      still: arbitraryStill,
      limitation:
        "Ordinary planner emits the local-parts articulated reaction without authored locomotion.",
    },
    rendererPath:
      "canonical Director inputs → DirectorPlan → TimingSolution → ContinuitySequencePlan → ExecutableEpisodePlan → StoryStageProduction → DirectorEpisodeRenderer",
  };
  await writeFile(
    resolve(outputRoot, "proof-report.json"),
    `${JSON.stringify(report, null, 2)}\n`,
    "utf8",
  );
  process.stdout.write(
    `${JSON.stringify({
      outputRoot,
      episodePlanContentHash: episodePlan.contentHash,
      decodedFramesMatch: true,
      selectedFrames: selectedFrames.length,
    })}\n`,
  );
}

await main();
