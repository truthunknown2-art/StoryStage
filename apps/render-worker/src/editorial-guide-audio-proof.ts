import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, resolve } from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import type { ProductionCompositionProps } from "@storystage/remotion-runtime";
import { STORY_STAGE_PRODUCTION_COMPOSITION_ID } from "@storystage/remotion-runtime/manifest";
import {
  alphaCapabilityRegistry,
  grammarProfiles,
  kidsAdventureShowPack,
} from "@storystage/story-engine";
import {
  compileDirectorProject,
  createCv002ArtDirectionSelection,
  createCv002Project,
  hashCanonical,
  type DirectorTimingBasis,
} from "@storystage/story-engine/director-alpha";
import {
  createEditorialPlanningRequest,
  createEditorialTargets,
  createGuideBoundEditorialPlanningArtifacts,
  sealEstimatedEditorialTimingBudget,
  type EditorialGuideClauseOwnership,
  type EditorialPlanningRequestSources,
} from "@storystage/story-engine/editorial-planning";
import {
  guideVoiceClauseSchema,
  hashGuideAudioBytes,
  sealGuideVoiceClock,
  sealGuideVoiceTimingBasis,
  type GuideVoiceClause,
} from "@storystage/story-engine/guide-clock";
import ffprobeStatic from "ffprobe-static";

const workspaceRoot = resolve(
  fileURLToPath(new URL("../../..", import.meta.url)),
);
const proofRoot = resolve(
  workspaceRoot,
  "artifacts/EDI-001B/editorial-guide-audio-proof",
);
const execFileAsync = promisify(execFile);
const sha256 = (bytes: Uint8Array) =>
  createHash("sha256").update(bytes).digest("hex");

export type EditorialGuideAudioProofPaths = Readonly<{
  script: string;
  wav: string;
  clauses: string;
}>;

type ProbeStream = Readonly<{
  avg_frame_rate?: string;
  channels?: number;
  codec_name?: string;
  codec_type?: string;
  duration?: string;
  height?: number;
  nb_frames?: string;
  nb_read_frames?: string;
  sample_rate?: string;
  width?: number;
}>;

const decodeExactUtf8 = (bytes: Uint8Array, label: string) => {
  const text = Buffer.from(bytes).toString("utf8");
  if (!Buffer.from(text, "utf8").equals(Buffer.from(bytes)))
    throw new Error(
      `${label} must contain valid, exactly round-trippable UTF-8.`,
    );
  return text;
};

const clauseArrayFromUnknown = (value: unknown): unknown[] => {
  if (Array.isArray(value)) return value;
  if (
    value &&
    typeof value === "object" &&
    "clauses" in value &&
    Array.isArray((value as { clauses?: unknown }).clauses)
  )
    return (value as { clauses: unknown[] }).clauses;
  throw new Error(
    "Clause timings must be a JSON array or an object containing a clauses array.",
  );
};

export function parseGuideClauseTimings(
  serialized: string,
  script: string,
): GuideVoiceClause[] {
  const clauses = clauseArrayFromUnknown(JSON.parse(serialized) as unknown);
  return clauses.map((rawClause, index) => {
    if (!rawClause || typeof rawClause !== "object")
      throw new Error(`Guide clause ${index + 1} must be an object.`);
    const candidate = rawClause as Record<string, unknown>;
    const clause = guideVoiceClauseSchema.parse({
      clauseId: candidate.clauseId,
      sourceRange: candidate.sourceRange,
      speakerRef: candidate.speakerRef ?? null,
      startSample: candidate.startSample,
      endSampleExclusive: candidate.endSampleExclusive,
    });
    if (
      typeof candidate.text === "string" &&
      candidate.text !==
        script.slice(clause.sourceRange.start, clause.sourceRange.end)
    )
      throw new Error(
        `Guide clause ${clause.clauseId} text does not match its exact script range.`,
      );
    return clause;
  });
}

export function createEditorialGuideEpisodeContext(
  script: string,
  timingBasis?: DirectorTimingBasis,
) {
  const storyProject = createCv002Project(
    "Private guide-audio Director proof",
    script,
    "kids-adventure",
    createCv002ArtDirectionSelection(
      "kids-adventure",
      "cut-paper-collage-mixed-media",
    ),
  );
  const directorProject = compileDirectorProject({ storyProject, timingBasis });
  const repeatedDirectorProject = compileDirectorProject({
    storyProject,
    timingBasis,
  });
  if (directorProject.contentHash !== repeatedDirectorProject.contentHash)
    throw new Error(
      "Director project changed across identical guide-proof compiles.",
    );
  const episodePlan = directorProject.executableEpisodePlan;
  const output = {
    width: episodePlan.format.width,
    height: episodePlan.format.height,
    fps: episodePlan.format.fps,
  };
  const rangeByShotId = new Map(
    directorProject.timingSolution.resolvedShots.map((range) => [
      range.shotId,
      range,
    ]),
  );
  const sceneDurationFrames = storyProject.graph.scenes.map((sourceScene) => {
    const directorScene = directorProject.directorPlan.scenes.find(
      (scene) => scene.sceneId === sourceScene.id,
    );
    if (!directorScene)
      throw new Error(`Director plan omitted source scene ${sourceScene.id}.`);
    return directorScene.shotIds.reduce((duration, shotId) => {
      const range = rangeByShotId.get(shotId);
      if (!range)
        throw new Error(`Timing solution omitted Director shot ${shotId}.`);
      return duration + range.endFrameExclusive - range.startFrame;
    }, 0);
  });
  const editorialTargets = createEditorialTargets({
    showPack: kidsAdventureShowPack,
    grammarProfile: grammarProfiles.kidsAdventure,
    referenceStudyContentHashes: [
      hashCanonical({ study: "editorial-guide-audio-proof-v1" }),
    ],
    fps: output.fps,
  });
  const timingBudget = sealEstimatedEditorialTimingBudget({
    storyProject,
    output,
    sceneDurationFrames,
  });
  if (
    timingBudget.episodeDurationInFrames !== episodePlan.format.durationInFrames
  )
    throw new Error(
      "Editorial scene budgets do not cover the executable episode duration.",
    );
  const planningSources: EditorialPlanningRequestSources = {
    pilotId: "editorial-guide-audio-proof",
    storyProject,
    showPack: kidsAdventureShowPack,
    grammarProfile: grammarProfiles.kidsAdventure,
    sceneWorlds: directorProject.sceneWorlds,
    capabilityRegistry: alphaCapabilityRegistry,
    editorialTargets,
    timingBudget,
    output,
  };
  const estimatedRequest = createEditorialPlanningRequest(planningSources);
  return {
    storyProject,
    directorProject,
    episodePlan,
    planningSources,
    estimatedRequest,
  };
}

export function prepareEditorialGuideAudioProof(
  context: ReturnType<typeof createEditorialGuideEpisodeContext>,
  audioBytes: Uint8Array,
  clauses: readonly GuideVoiceClause[],
) {
  const frozenAudioBytes = audioBytes.slice();
  const guideVoiceSources = {
    script: context.storyProject.sourceText,
    audioBytes: frozenAudioBytes,
  };
  const guideVoiceClock = sealGuideVoiceClock(guideVoiceSources, clauses);
  if (guideVoiceClock.sampleRate !== 48_000)
    throw new Error(
      `Guide WAV must be exactly 48 kHz PCM; received ${guideVoiceClock.sampleRate} Hz.`,
    );
  const guideContext = createEditorialGuideEpisodeContext(
    context.storyProject.sourceText,
    {
      kind: "guide-audio",
      contentHash: guideVoiceClock.contentHash,
    },
  );
  const guideVoiceTimingBasis = sealGuideVoiceTimingBasis(
    guideVoiceClock,
    guideVoiceSources,
    guideContext.episodePlan.format.fps,
  );
  const guideDurationInFrames =
    guideVoiceTimingBasis.durationSamples /
    guideVoiceTimingBasis.samplesPerFrame;
  if (
    guideDurationInFrames !== guideContext.episodePlan.format.durationInFrames
  )
    throw new Error(
      `Guide WAV resolves to ${guideDurationInFrames} frames, but the Director episode requires ${guideContext.episodePlan.format.durationInFrames} frames (${guideContext.episodePlan.format.durationInFrames * guideVoiceTimingBasis.samplesPerFrame} samples at ${guideVoiceTimingBasis.sampleRate} Hz).`,
    );

  const sceneRefBySourceId = new Map(
    guideContext.estimatedRequest.episode.sequences[0]!.scenes.map(
      (scene) => [scene.sourceSceneId, scene.sceneRef] as const,
    ),
  );
  const clauseOwnership: EditorialGuideClauseOwnership =
    guideVoiceClock.clauses.map((clause) => {
      const matchingScenes = guideContext.storyProject.graph.scenes.filter(
        (scene) =>
          scene.sourceRange.start <= clause.sourceRange.start &&
          clause.sourceRange.end <= scene.sourceRange.end,
      );
      if (matchingScenes.length !== 1)
        throw new Error(
          `Guide clause ${clause.clauseId} crosses or falls outside a source scene.`,
        );
      const sourceScene = matchingScenes[0]!;
      const ownerSceneRef = sceneRefBySourceId.get(sourceScene.id);
      if (!ownerSceneRef)
        throw new Error(
          `Editorial request omitted source scene ${sourceScene.id}.`,
        );
      return {
        sourceGuideClauseId: clause.clauseId,
        ownerSceneRef,
      };
    });
  const editorialArtifacts = createGuideBoundEditorialPlanningArtifacts({
    ...guideContext.planningSources,
    guideVoiceClock,
    guideVoiceTimingBasis,
    guideVoiceSources,
    guideBindingExpectation: {
      expectedGuideVoiceClockContentHash: guideVoiceClock.contentHash,
      expectedGuideVoiceTimingBasisContentHash:
        guideVoiceTimingBasis.contentHash,
    },
    clauseOwnership,
  });
  return {
    ...guideContext,
    guideVoiceClock,
    guideVoiceTimingBasis,
    editorialArtifacts,
  };
}

export function assertReopenedGuideAudioMatches(
  prepared: ReturnType<typeof prepareEditorialGuideAudioProof>,
  reopenedAudioBytes: Uint8Array,
) {
  const contentHash = hashGuideAudioBytes(reopenedAudioBytes);
  if (contentHash !== prepared.guideVoiceClock.audioContentHash)
    throw new Error(
      "Reopened guide WAV does not match the exact bytes sealed into the guide clock.",
    );
  return contentHash;
}

export function createEditorialGuideRenderProps(
  prepared: ReturnType<typeof prepareEditorialGuideAudioProof>,
  reopenedAudioBytes: Uint8Array,
  muted: boolean,
): ProductionCompositionProps {
  assertReopenedGuideAudioMatches(prepared, reopenedAudioBytes);
  return {
    mode: "director-episode",
    episodePlan: prepared.episodePlan,
    guideAudio: {
      authority: "guide-timing-only",
      productionBindable: false,
      expectedGuideVoiceClockContentHash: prepared.guideVoiceClock.contentHash,
      expectedGuideVoiceTimingBasisContentHash:
        prepared.guideVoiceTimingBasis.contentHash,
      clock: prepared.guideVoiceClock,
      timingBasis: prepared.guideVoiceTimingBasis,
      source: {
        contentHash: prepared.guideVoiceClock.audioContentHash,
        url: `data:audio/wav;base64,${Buffer.from(reopenedAudioBytes).toString("base64")}`,
      },
      muted,
    },
  };
}

export function assertIdenticalPictureAndEpisodeProps(
  audioOn: ProductionCompositionProps,
  muted: ProductionCompositionProps,
) {
  if (audioOn.mode !== "director-episode" || muted.mode !== "director-episode")
    throw new Error("Guide proof renders must both use Director episode mode.");
  const audioOnHash = hashCanonical({
    mode: audioOn.mode,
    episodePlan: audioOn.episodePlan,
  });
  const mutedHash = hashCanonical({
    mode: muted.mode,
    episodePlan: muted.episodePlan,
  });
  if (audioOnHash !== mutedHash)
    throw new Error("Audio-on and muted renders do not share picture props.");
  return audioOnHash;
}

async function probeRenderedMedia(
  file: string,
  format: {
    width: number;
    height: number;
    fps: number;
    durationInFrames: number;
  },
  expectedAudio: "aac" | "none",
) {
  const { stdout } = await execFileAsync(
    ffprobeStatic.path,
    ["-v", "error", "-count_frames", "-show_streams", "-of", "json", file],
    { maxBuffer: 10 * 1024 * 1024 },
  );
  const streams =
    (JSON.parse(stdout) as { streams?: ProbeStream[] }).streams ?? [];
  const videoStreams = streams.filter(
    (stream) => stream.codec_type === "video",
  );
  const audioStreams = streams.filter(
    (stream) => stream.codec_type === "audio",
  );
  const video = videoStreams[0];
  const [numerator, denominator] = (video?.avg_frame_rate ?? "0/1")
    .split("/")
    .map(Number);
  const fps = denominator ? numerator! / denominator : 0;
  const frameCount = Number(
    video?.nb_read_frames ??
      video?.nb_frames ??
      Math.round(Number(video?.duration) * fps),
  );
  if (
    videoStreams.length !== 1 ||
    video?.codec_name !== "h264" ||
    video.width !== format.width ||
    video.height !== format.height ||
    fps !== format.fps ||
    frameCount !== format.durationInFrames
  )
    throw new Error(
      `Rendered video metadata diverged from the Director episode: ${JSON.stringify({ videoStreams, fps, frameCount })}`,
    );
  if (
    (expectedAudio === "aac" &&
      (audioStreams.length !== 1 || audioStreams[0]!.codec_name !== "aac")) ||
    (expectedAudio === "none" && audioStreams.length !== 0)
  )
    throw new Error(
      `Unexpected ${expectedAudio} audio-stream result: ${JSON.stringify(audioStreams)}.`,
    );
  return {
    video: {
      codec: video.codec_name,
      width: video.width,
      height: video.height,
      fps,
      frameCount,
    },
    audio: audioStreams.map((stream) => ({
      codec: stream.codec_name,
      channels: stream.channels,
      sampleRate: stream.sample_rate ? Number(stream.sample_rate) : undefined,
    })),
  };
}

async function loadInputs(paths: EditorialGuideAudioProofPaths) {
  const [scriptBytes, audioBytes, clauseBytes] = await Promise.all([
    readFile(paths.script),
    readFile(paths.wav),
    readFile(paths.clauses),
  ]);
  const script = decodeExactUtf8(scriptBytes, "Frozen script");
  const serializedClauses = decodeExactUtf8(clauseBytes, "Clause timings");
  const clauses = parseGuideClauseTimings(serializedClauses, script);
  return {
    script,
    audioBytes,
    clauses,
    fileEvidence: {
      script: {
        file: basename(paths.script),
        byteLength: scriptBytes.byteLength,
        contentHash: sha256(scriptBytes),
      },
      wav: {
        file: basename(paths.wav),
        byteLength: audioBytes.byteLength,
        contentHash: sha256(audioBytes),
      },
      clauses: {
        file: basename(paths.clauses),
        byteLength: clauseBytes.byteLength,
        contentHash: sha256(clauseBytes),
        count: clauses.length,
      },
    },
  };
}

export async function runEditorialGuideAudioProof(
  paths: EditorialGuideAudioProofPaths,
) {
  const loaded = await loadInputs(paths);
  const context = createEditorialGuideEpisodeContext(loaded.script);
  const prepared = prepareEditorialGuideAudioProof(
    context,
    loaded.audioBytes,
    loaded.clauses,
  );
  const outputRoot = resolve(
    proofRoot,
    prepared.guideVoiceClock.contentHash.slice(0, 20),
  );
  await mkdir(outputRoot, { recursive: true });

  const reopenedAudioBytes = await readFile(paths.wav);
  const reopenedAudioContentHash = assertReopenedGuideAudioMatches(
    prepared,
    reopenedAudioBytes,
  );
  const audioOnProps = createEditorialGuideRenderProps(
    prepared,
    reopenedAudioBytes,
    false,
  );
  const mutedProps = createEditorialGuideRenderProps(
    prepared,
    reopenedAudioBytes,
    true,
  );
  const picturePropsContentHash = assertIdenticalPictureAndEpisodeProps(
    audioOnProps,
    mutedProps,
  );

  const serveUrl = await bundle({
    entryPoint: resolve(
      workspaceRoot,
      "packages/remotion-runtime/src/remotion-entry.ts",
    ),
    publicDir: resolve(workspaceRoot, "packages/remotion-runtime/public"),
  });
  const composition = await selectComposition({
    serveUrl,
    id: STORY_STAGE_PRODUCTION_COMPOSITION_ID,
    inputProps: audioOnProps,
  });
  if (
    composition.durationInFrames !==
      prepared.episodePlan.format.durationInFrames ||
    composition.fps !== prepared.episodePlan.format.fps ||
    composition.width !== prepared.episodePlan.format.width ||
    composition.height !== prepared.episodePlan.format.height
  )
    throw new Error(
      "Worker composition metadata diverged from the executable episode plan.",
    );

  const audioOnFile = resolve(outputRoot, "audio-on.mp4");
  const mutedFile = resolve(outputRoot, "muted.mp4");
  await renderMedia({
    codec: "h264",
    audioCodec: "aac",
    composition,
    inputProps: audioOnProps,
    muted: false,
    outputLocation: audioOnFile,
    serveUrl,
  });
  await renderMedia({
    codec: "h264",
    audioCodec: "aac",
    composition,
    inputProps: mutedProps,
    muted: true,
    outputLocation: mutedFile,
    serveUrl,
  });
  const [audioOnProbe, mutedProbe, audioOnBytes, mutedBytes] =
    await Promise.all([
      probeRenderedMedia(audioOnFile, prepared.episodePlan.format, "aac"),
      probeRenderedMedia(mutedFile, prepared.episodePlan.format, "none"),
      readFile(audioOnFile),
      readFile(mutedFile),
    ]);

  const durationSeconds =
    prepared.episodePlan.format.durationInFrames /
    prepared.episodePlan.format.fps;
  const report = {
    schemaVersion: "1.0",
    status: "pass",
    authority: "private-guide-audio-proof-only",
    productionBindable: false,
    privacy: {
      rawScriptCopied: false,
      rawGuideWavCopied: false,
      rawClauseFileCopied: false,
      reportContainsBasenamesAndContentHashesOnly: true,
    },
    inputs: loaded.fileEvidence,
    guide: {
      reopenedAudioContentHash,
      guideVoiceClockContentHash: prepared.guideVoiceClock.contentHash,
      guideVoiceTimingBasisContentHash:
        prepared.guideVoiceTimingBasis.contentHash,
      scriptContentHash: prepared.guideVoiceClock.scriptContentHash,
      audioContentHash: prepared.guideVoiceClock.audioContentHash,
      sampleRate: prepared.guideVoiceClock.sampleRate,
      channels: prepared.guideVoiceClock.channels,
      durationSamples: prepared.guideVoiceClock.durationSamples,
      clauseCount: prepared.guideVoiceClock.clauses.length,
      directorTimingBasis: prepared.directorProject.timingSolution.timingBasis,
    },
    lineage: {
      storyProjectContentHash: prepared.storyProject.contentHash,
      directorProjectContentHash: prepared.directorProject.contentHash,
      directorPlanContentHash:
        prepared.directorProject.directorPlan.contentHash,
      timingSolutionContentHash:
        prepared.directorProject.timingSolution.contentHash,
      executableEpisodePlanContentHash: prepared.episodePlan.contentHash,
      editorialPlanningRequestContentHash:
        prepared.editorialArtifacts.request.contentHash,
      editorialTimingBindingContentHash:
        prepared.editorialArtifacts.timingBinding.contentHash,
      editorialClauseRegistryContentHash:
        prepared.editorialArtifacts.clauseRegistry.contentHash,
      editorialFrameGridContentHash:
        prepared.editorialArtifacts.frameGrid.contentHash,
    },
    visualScope: {
      capabilitySummary: prepared.directorProject.capabilityReport.summary,
      approvedOlloAssetBound: false,
      limitation:
        "This proves guide-bound Director timing and paired render transport; it does not claim an approved Ollo rig or final character performance.",
    },
    timingScope: {
      guideBoundEditorialArtifactsCreated: true,
      episodeTotalDurationMatchesGuide: true,
      acceptedEditorialProposalBound: false,
      pictureCutTimingSource: "existing-deterministic-director-plan",
      limitation:
        "This proof binds the guide clock to editorial artifacts and the episode total duration; it does not claim that an accepted editorial proposal has retimed individual picture cuts.",
    },
    renderContract: {
      compositionId: STORY_STAGE_PRODUCTION_COMPOSITION_ID,
      mode: "director-episode",
      picturePropsContentHash,
      identicalPictureAndEpisodeProps: true,
      rendererMutedOptionUsed: true,
      format: prepared.episodePlan.format,
      durationSeconds,
      isExactlyThirtySeconds: durationSeconds === 30,
    },
    renders: {
      audioOn: {
        file: basename(audioOnFile),
        contentHash: sha256(audioOnBytes),
        byteLength: audioOnBytes.byteLength,
        probe: audioOnProbe,
      },
      muted: {
        file: basename(mutedFile),
        contentHash: sha256(mutedBytes),
        byteLength: mutedBytes.byteLength,
        probe: mutedProbe,
      },
    },
  } as const;

  const artifacts = {
    "guide-voice-clock.json": prepared.guideVoiceClock,
    "guide-voice-timing-basis.json": prepared.guideVoiceTimingBasis,
    "editorial-planning-request.json": prepared.editorialArtifacts.request,
    "editorial-timing-binding.json": prepared.editorialArtifacts.timingBinding,
    "editorial-clause-registry.json":
      prepared.editorialArtifacts.clauseRegistry,
    "editorial-frame-grid.json": prepared.editorialArtifacts.frameGrid,
    "executable-episode-plan.json": prepared.episodePlan,
    "proof-report.json": report,
  } as const;
  await Promise.all(
    Object.entries(artifacts).map(([file, artifact]) =>
      writeFile(
        resolve(outputRoot, file),
        `${JSON.stringify(artifact, null, 2)}\n`,
        "utf8",
      ),
    ),
  );
  return {
    outputRoot,
    reportPath: resolve(outputRoot, "proof-report.json"),
    report,
  };
}
