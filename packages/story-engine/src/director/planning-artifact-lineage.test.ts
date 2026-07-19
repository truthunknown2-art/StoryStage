import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { compileAudioMixPlan, sealSpokenLine } from "../audio-director";
import { hashCanonical } from "../canonical-hash";
import { createCv002ArtDirectionSelection } from "../cv002-art-direction";
import { createCv002Project } from "../cv002-story-draft";
import { applyDirectorPatch } from "./apply-director-patch";
import { resolveDirectorCapabilities } from "./capability-report";
import { sealContinuitySequencePlan } from "./continuity-sequence-plan";
import { compileDirectorProject } from "./director-compiler";
import { sealDirectorPlan } from "./director-plan";
import { proposeDirectorPatch } from "./director-patch";
import {
  directorProductionBundleSchema,
  parseDirectorProductionBundleEnvelope,
  sealDirectorProductionBundle,
  verifyDirectorProductionBundle,
  verifyStoredDirectorProductionBundle,
} from "./director-production-bundle";
import {
  directorProjectSchema,
  sealDirectorProject,
  type DirectorProject,
} from "./director-project";
import { sealDirectorProposal } from "./director-proposal";
import {
  createDirectorWorkspaceState,
  recordDirectorWorkspaceRevision,
  restoreDirectorWorkspaceState,
  serializeDirectorWorkspaceState,
} from "./director-workspace";
import { sealExecutableEpisodePlan } from "./executable-episode-plan";
import { getGrammarProfile } from "./grammar-profile";
import {
  assertPlanningArtifactMatchesDirectorPlan,
  PLANNING_ARTIFACT_DIRECTOR_PLAN_LINEAGE_ERROR,
} from "./planning-artifact-lineage";
import { analyzeDirectorQuality } from "./quality-report";
import { sealTimingSolution } from "./timing-solution";

const sentence =
  "A curious traveler follows a bright clue and pauses when the hidden answer changes everything.";
const script = Array.from(
  { length: 9 },
  (_, index) => `${sentence.slice(0, -1)} ${index + 1}.`,
).join(" ");
const artDirection = createCv002ArtDirectionSelection(
  "kids-adventure",
  "cut-paper-collage-mixed-media",
);
const storyProject = createCv002Project(
  "Cross-artifact lineage containment",
  script,
  "kids-adventure",
  artDirection,
);

const workspaceRoot = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../../..",
);

const sourceFilesUnder = (root: string): string[] =>
  readdirSync(root).flatMap((entry) => {
    const path = resolve(root, entry);
    if (statSync(path).isDirectory())
      return entry === "node_modules" ? [] : sourceFilesUnder(path);
    return /\.[cm]?[jt]sx?$/.test(entry) ? [path] : [];
  });

const omitContentHash = <T extends { contentHash: string }>(value: T) => {
  const { contentHash: _contentHash, ...draft } = value;
  void _contentHash;
  return draft;
};

/** Reproduces the pre-fix exploit: every touched artifact is self-rehashed and
 * every ordinary hash binding is updated, while the Director plan retains the
 * original canonical beat lineage and the proposal substitutes another beat. */
const forgeCrossArtifactBeatSubstitution = (
  source: DirectorProject,
): DirectorProject => {
  const directions = structuredClone(source.planningArtifact.beatDirections);
  const directionDraft = {
    ...omitContentHash(directions[0]!),
    beatContentHash: directions[1]!.beatContentHash,
  };
  directions[0] = {
    ...directionDraft,
    contentHash: hashCanonical(directionDraft),
  };
  const planningArtifact = sealDirectorProposal({
    ...omitContentHash(source.planningArtifact),
    beatDirections: directions,
  });
  const directorPlan = sealDirectorPlan({
    ...omitContentHash(source.directorPlan),
    planningArtifactContentHash: planningArtifact.contentHash,
  });
  const timingSolution = sealTimingSolution(directorPlan, {
    ...omitContentHash(source.timingSolution),
    directorPlanContentHash: directorPlan.contentHash,
  });
  const continuitySequencePlan = sealContinuitySequencePlan({
    ...omitContentHash(source.executableEpisodePlan.continuitySequencePlan),
    directorPlanContentHash: directorPlan.contentHash,
    timingSolutionContentHash: timingSolution.contentHash,
  });
  const executableEpisodePlan = sealExecutableEpisodePlan(
    directorPlan,
    timingSolution,
    {
      ...omitContentHash(source.executableEpisodePlan),
      directorPlanContentHash: directorPlan.contentHash,
      timingSolutionContentHash: timingSolution.contentHash,
      continuitySequencePlan,
    },
  );
  const capabilityReport = resolveDirectorCapabilities(directorPlan);
  const qualityReport = analyzeDirectorQuality(
    directorPlan,
    getGrammarProfile(planningArtifact.grammar),
    timingSolution,
  );
  const projectDraft = {
    ...omitContentHash(source),
    planningArtifact,
    directorPlan,
    timingSolution,
    executableEpisodePlan,
    capabilityReport,
    qualityReport,
  };
  return {
    ...projectDraft,
    contentHash: hashCanonical(projectDraft),
  };
};

const hash = (value: string) => value.repeat(64).slice(0, 64);

const audioFixtureFor = (directorProject: DirectorProject) => {
  const { directorPlan, timingSolution } = directorProject;
  const resolved = timingSolution.resolvedEvents.find(
    (candidate) => candidate.frame + 30 <= timingSolution.durationInFrames,
  )!;
  const event = directorPlan.events.find(
    (candidate) => candidate.id === resolved.eventId,
  )!;
  const productionId = "lineage-pass-proof";
  const approvedAsset = {
    schemaVersion: "1.0" as const,
    id: "lineage-guide-take-one",
    briefId: "lineage-guide-brief",
    sourceRoute: "recorded" as const,
    providerAdapterId: "owner-recorder-v1",
    sourceContentHash: hash("d"),
    canonicalContentHash: hash("c"),
    relativeFile: "audio/dialogue/lineage-guide-take-one.wav",
    mediaType: "audio/wav" as const,
    sampleRate: 48_000 as const,
    channels: 1 as const,
    sampleCount: 48_000,
    approvalStatus: "approved" as const,
    approvedAt: "2026-07-19T00:00:00.000Z",
    rightsEvidence: [
      {
        id: "creator-owned-audio",
        kind: "creator-owned" as const,
        note: "Recorded by the project owner.",
        capturedAt: "2026-07-19T00:00:00.000Z",
      },
    ],
  };
  const spokenLine = sealSpokenLine({
    schemaVersion: "1.0",
    lineId: "lineage-guide-line",
    productionId,
    sceneId: event.sceneId,
    beatId: event.beatId,
    speakerId: "guide",
    role: "narration",
    text: "Follow the bright clue.",
  });
  const mixPlan = compileAudioMixPlan({
    id: "lineage-audio-mix",
    productionId,
    directorPlan,
    timingSolution,
    directorPlanContentHash: directorPlan.contentHash,
    timingSolutionContentHash: timingSolution.contentHash,
    fps: 30,
    spokenLines: [spokenLine],
    cueIntents: [
      {
        schemaVersion: "1.0",
        id: "lineage-guide-cue",
        productionId,
        sceneId: event.sceneId,
        beatId: event.beatId,
        shotId: null,
        lineId: spokenLine.lineId,
        anchorEventId: event.id,
        offsetFrames: 0,
        approvedAssetVersionId: approvedAsset.id,
        approvedAssetContentHash: approvedAsset.canonicalContentHash,
        role: "narration",
        event: "on-action",
        trimStartSample: 0,
        trimEndSampleExclusive: null,
        bus: "dialogue",
        gainDb: -3,
        pan: 0,
        fadeInFrames: 2,
        fadeOutFrames: 2,
        duckingGroup: "dialogue",
      },
    ],
    approvedAssetVersions: [approvedAsset],
    target: {
      integratedLufs: -16,
      truePeakDbtp: -1,
      channels: 2,
    },
  });
  const selectedTake = {
    lineId: spokenLine.lineId,
    takeId: "lineage-take-one",
    dialoguePerformanceId: "lineage-guide-performance",
    approvedAssetVersionId: approvedAsset.id,
    assetContentHash: approvedAsset.canonicalContentHash,
  };
  return { approvedAsset, mixPlan, selectedTake };
};

const expectLineageFailure = (operation: () => unknown) =>
  expect(operation).toThrow(PLANNING_ARTIFACT_DIRECTOR_PLAN_LINEAGE_ERROR);

describe("EDI-000b cross-artifact planning lineage containment", () => {
  it("keeps structural bundle parsing out of production authority consumers", () => {
    const bundleModule = resolve(
      workspaceRoot,
      "packages/story-engine/src/director/director-production-bundle.ts",
    );
    const violations = ["apps", "packages"].flatMap((directory) =>
      sourceFilesUnder(resolve(workspaceRoot, directory)).filter((file) => {
        if (file === bundleModule || /\.test\.[cm]?[jt]sx?$/.test(file))
          return false;
        const source = readFileSync(file, "utf8");
        return (
          source.includes("directorProductionBundleSchema") ||
          source.includes("serializedDirectorProductionBundleSchema") ||
          source.includes("directorProductionBundleDraftSchema") ||
          source.includes("parseDirectorProductionBundleEnvelope") ||
          source.includes("verifyDirectorProductionBundle")
        );
      }),
    );
    expect(violations.map((file) => file.replaceAll("\\", "/"))).toEqual([]);
  });

  it("preserves the successful canonical project, workspace, patch, and production-bundle path", () => {
    const firstCut = compileDirectorProject({ storyProject });
    expect(() =>
      assertPlanningArtifactMatchesDirectorPlan(
        firstCut.planningArtifact,
        firstCut.directorPlan,
      ),
    ).not.toThrow();
    expect(directorProjectSchema.parse(firstCut)).toEqual(firstCut);

    const selectedBeatId = firstCut.directorPlan.events.find(
      (event) => event.kind === "reaction",
    )!.beatId;
    const patch = proposeDirectorPatch({
      baseDirectorProject: firstCut,
      targetBeatId: selectedBeatId,
      command: "Make the reaction 6 frames later",
    });
    const revisedCut = applyDirectorPatch({
      storyProject,
      baseDirectorProject: firstCut,
      patch,
    });
    const workspace = recordDirectorWorkspaceRevision(
      createDirectorWorkspaceState(firstCut, selectedBeatId),
      patch,
      revisedCut,
    );
    expect(() =>
      restoreDirectorWorkspaceState(
        serializeDirectorWorkspaceState(workspace),
        storyProject,
      ),
    ).not.toThrow();

    const audio = audioFixtureFor(revisedCut);
    const bundle = sealDirectorProductionBundle({
      id: "lineage-production-bundle",
      directorProject: revisedCut,
      audioMixPlan: audio.mixPlan,
      approvedAudioAssetVersions: [audio.approvedAsset],
      selectedTakes: [audio.selectedTake],
    });
    expect(directorProductionBundleSchema.parse(bundle)).toEqual(bundle);
    expect(parseDirectorProductionBundleEnvelope(bundle)).toEqual(bundle);
    const verified = verifyDirectorProductionBundle({
      bundle,
      directorProject: revisedCut,
      audioMixPlan: audio.mixPlan,
      approvedAudioAssetVersions: [audio.approvedAsset],
    });
    expect(verified.bundle).toEqual(bundle);
    expect(Object.isFrozen(verified)).toBe(true);
    expect(Object.isFrozen(verified.bundle)).toBe(true);
    expect(Object.isFrozen(verified.directorProject.directorPlan.beats)).toBe(
      true,
    );
    expect(Object.getOwnPropertySymbols(verified)).toHaveLength(1);
    expect(
      Object.getOwnPropertySymbols(JSON.parse(JSON.stringify(verified))),
    ).toHaveLength(0);
    expect(() => {
      (verified.bundle as { productionId: string }).productionId = "mutated";
    }).toThrow(TypeError);
    expect(
      verifyStoredDirectorProductionBundle({
        rawBundle: bundle,
        resolveDirectorProjectByContentHash: (contentHash) => {
          expect(contentHash).toBe(revisedCut.contentHash);
          return revisedCut;
        },
        resolveAudioMixPlanByContentHash: (contentHash) => {
          expect(contentHash).toBe(audio.mixPlan.contentHash);
          return audio.mixPlan;
        },
        resolveApprovedAudioAssetVersion: (
          approvedAssetVersionId,
          assetContentHash,
        ) => {
          expect(approvedAssetVersionId).toBe(audio.approvedAsset.id);
          expect(assetContentHash).toBe(
            audio.approvedAsset.canonicalContentHash,
          );
          return audio.approvedAsset;
        },
      }).bundle,
    ).toEqual(bundle);
  });

  it("rejects the self-rehashed substitution at DirectorProject schema and sealing", () => {
    const forged = forgeCrossArtifactBeatSubstitution(
      compileDirectorProject({ storyProject }),
    );
    expectLineageFailure(() => directorProjectSchema.parse(forged));
    expectLineageFailure(() => sealDirectorProject(omitContentHash(forged)));
  });

  it("rejects every direct count, order, ID, and plan-side beat-lineage attack", () => {
    const firstCut = compileDirectorProject({ storyProject });
    const directions = firstCut.planningArtifact.beatDirections;
    const beats = firstCut.directorPlan.beats;
    const reorderedDirections = [...directions];
    [reorderedDirections[0], reorderedDirections[1]] = [
      reorderedDirections[1]!,
      reorderedDirections[0]!,
    ];
    const reorderedBeats = [...beats];
    [reorderedBeats[0], reorderedBeats[1]] = [
      reorderedBeats[1]!,
      reorderedBeats[0]!,
    ];
    const attacks = [
      { directions: directions.slice(1), beats },
      { directions: [...directions, directions.at(-1)!], beats },
      {
        directions: [directions[0]!, directions[0]!, ...directions.slice(2)],
        beats,
      },
      { directions: reorderedDirections, beats },
      {
        directions: [
          { ...directions[0]!, beatId: "foreign-beat" },
          ...directions.slice(1),
        ],
        beats,
      },
      { directions, beats: reorderedBeats },
    ];
    attacks.forEach((attack) =>
      expectLineageFailure(() =>
        assertPlanningArtifactMatchesDirectorPlan(
          { beatDirections: attack.directions },
          { beats: attack.beats },
        ),
      ),
    );
  });

  it("rejects the self-rehashed substitution at H0 workspace restore", () => {
    const forged = forgeCrossArtifactBeatSubstitution(
      compileDirectorProject({ storyProject }),
    );
    const serialized = JSON.stringify({
      schemaVersion: "1.0",
      storyProjectContentHash: storyProject.contentHash,
      history: {
        entries: [{ directorProject: forged, patch: null }],
        cursor: 0,
      },
      selectedBeatId: forged.directorPlan.beats[0]!.beatId,
    });
    expectLineageFailure(() =>
      restoreDirectorWorkspaceState(serialized, storyProject),
    );
  });

  it("rejects the self-rehashed substitution in a workspace revision", () => {
    const firstCut = compileDirectorProject({ storyProject });
    const selectedBeatId = firstCut.directorPlan.events.find(
      (event) => event.kind === "reaction",
    )!.beatId;
    const patch = proposeDirectorPatch({
      baseDirectorProject: firstCut,
      targetBeatId: selectedBeatId,
      command: "Make the reaction 6 frames later",
    });
    const revisedCut = applyDirectorPatch({
      storyProject,
      baseDirectorProject: firstCut,
      patch,
    });
    const forgedRevision = forgeCrossArtifactBeatSubstitution(revisedCut);
    const serialized = JSON.stringify({
      schemaVersion: "1.0",
      storyProjectContentHash: storyProject.contentHash,
      history: {
        entries: [
          { directorProject: firstCut, patch: null },
          { directorProject: forgedRevision, patch },
        ],
        cursor: 1,
      },
      selectedBeatId,
    });
    expectLineageFailure(() =>
      restoreDirectorWorkspaceState(serialized, storyProject),
    );
    expectLineageFailure(() =>
      recordDirectorWorkspaceRevision(
        createDirectorWorkspaceState(firstCut, selectedBeatId),
        patch,
        forgedRevision,
      ),
    );
  });

  it("rejects the self-rehashed substitution at patch application", () => {
    const firstCut = compileDirectorProject({ storyProject });
    const forged = forgeCrossArtifactBeatSubstitution(firstCut);
    const selectedBeatId = firstCut.directorPlan.events.find(
      (event) => event.kind === "reaction",
    )!.beatId;
    const patch = proposeDirectorPatch({
      baseDirectorProject: firstCut,
      targetBeatId: selectedBeatId,
      command: "Make the reaction 6 frames later",
    });
    expectLineageFailure(() =>
      applyDirectorPatch({
        storyProject,
        baseDirectorProject: forged,
        patch,
      }),
    );
  });

  it("rejects the self-rehashed substitution at production-bundle sealing", () => {
    const forged = forgeCrossArtifactBeatSubstitution(
      compileDirectorProject({ storyProject }),
    );
    expectLineageFailure(() =>
      sealDirectorProductionBundle({
        id: "forged-lineage-bundle",
        directorProject: forged,
        audioMixPlan: {} as never,
        approvedAudioAssetVersions: [],
        selectedTakes: [],
      }),
    );
  });

  it("keeps bare bundle parsing structural while source-aware verification rejects forged lineage", () => {
    const firstCut = compileDirectorProject({ storyProject });
    const audio = audioFixtureFor(firstCut);
    const validBundle = sealDirectorProductionBundle({
      id: "lineage-structural-envelope",
      directorProject: firstCut,
      audioMixPlan: audio.mixPlan,
      approvedAudioAssetVersions: [audio.approvedAsset],
      selectedTakes: [audio.selectedTake],
    });
    const forgedProject = forgeCrossArtifactBeatSubstitution(firstCut);
    const forgedBundleDraft = {
      ...omitContentHash(validBundle),
      directorProjectContentHash: forgedProject.contentHash,
      directorPlanContentHash: forgedProject.directorPlan.contentHash,
      timingSolutionContentHash: forgedProject.timingSolution.contentHash,
    };
    const forgedBundle = {
      ...forgedBundleDraft,
      contentHash: hashCanonical(forgedBundleDraft),
    };

    expect(parseDirectorProductionBundleEnvelope(forgedBundle)).toEqual(
      forgedBundle,
    );
    expectLineageFailure(() =>
      verifyDirectorProductionBundle({
        bundle: forgedBundle,
        directorProject: forgedProject,
        audioMixPlan: audio.mixPlan,
        approvedAudioAssetVersions: [audio.approvedAsset],
      }),
    );
  });

  it("rejects a different valid DirectorProject at source-aware verification", () => {
    const firstCut = compileDirectorProject({ storyProject });
    const audio = audioFixtureFor(firstCut);
    const bundle = sealDirectorProductionBundle({
      id: "lineage-project-substitution",
      directorProject: firstCut,
      audioMixPlan: audio.mixPlan,
      approvedAudioAssetVersions: [audio.approvedAsset],
      selectedTakes: [audio.selectedTake],
    });
    const differentProject = sealDirectorProject({
      ...omitContentHash(firstCut),
      id: "different-valid-director-project",
    });

    expect(() =>
      verifyDirectorProductionBundle({
        bundle,
        directorProject: differentProject,
        audioMixPlan: audio.mixPlan,
        approvedAudioAssetVersions: [audio.approvedAsset],
      }),
    ).toThrow(
      "Director production bundle does not match the exact Director project.",
    );
  });

  it("rejects self-rehashed audio duration, fps, cue, asset, and take attacks", () => {
    const firstCut = compileDirectorProject({ storyProject });
    const audio = audioFixtureFor(firstCut);
    const bundle = sealDirectorProductionBundle({
      id: "lineage-audio-attacks",
      directorProject: firstCut,
      audioMixPlan: audio.mixPlan,
      approvedAudioAssetVersions: [audio.approvedAsset],
      selectedTakes: [audio.selectedTake],
    });
    const sealMix = (
      changes: Partial<Omit<typeof audio.mixPlan, "contentHash">>,
    ) => {
      const draft = { ...omitContentHash(audio.mixPlan), ...changes };
      return { ...draft, contentHash: hashCanonical(draft) };
    };
    const bindMix = (mixPlan: typeof audio.mixPlan) => {
      const draft = {
        ...omitContentHash(bundle),
        audioMixPlanContentHash: mixPlan.contentHash,
      };
      return { ...draft, contentHash: hashCanonical(draft) };
    };
    const expectMixFailure = (mixPlan: typeof audio.mixPlan) => {
      const attackedBundle = bindMix(mixPlan);
      expect(parseDirectorProductionBundleEnvelope(attackedBundle)).toEqual(
        attackedBundle,
      );
      expect(() =>
        verifyDirectorProductionBundle({
          bundle: attackedBundle,
          directorProject: firstCut,
          audioMixPlan: mixPlan,
          approvedAudioAssetVersions: [audio.approvedAsset],
        }),
      ).toThrow();
      expect(() =>
        sealDirectorProductionBundle({
          id: "lineage-audio-attacked-seal",
          directorProject: firstCut,
          audioMixPlan: mixPlan,
          approvedAudioAssetVersions: [audio.approvedAsset],
          selectedTakes: [audio.selectedTake],
        }),
      ).toThrow();
    };

    expectMixFailure(
      sealMix({
        durationInFrames: audio.mixPlan.durationInFrames + 300,
      }),
    );
    expectMixFailure(
      sealMix({
        fps: audio.mixPlan.fps * 2,
        cues: audio.mixPlan.cues.map((cue) => ({
          ...cue,
          startSample:
            (cue.startSample * audio.mixPlan.fps) / (audio.mixPlan.fps * 2),
        })),
      }),
    );
    expectMixFailure(
      sealMix({
        cues: audio.mixPlan.cues.map((cue, index) =>
          index === 0 ? { ...cue, anchorEventId: "foreign-event" } : cue,
        ),
      }),
    );
    expectMixFailure(
      sealMix({
        cues: audio.mixPlan.cues.map((cue, index) =>
          index === 0 ? { ...cue, assetContentHash: hash("e") } : cue,
        ),
      }),
    );
    const anchoredCue = audio.mixPlan.cues[0]!;
    const wrongSameBeatShot = firstCut.directorPlan.shots.find((shot) => {
      const authoritativeEventIds = new Set([
        shot.entryEventId,
        shot.exitEventId,
        shot.timingEnvelope.earliestCutEventId,
        shot.timingEnvelope.preferredCutEventId,
        shot.timingEnvelope.latestCutEventId,
      ]);
      return (
        shot.sceneId === anchoredCue.sceneId &&
        shot.beatIds.includes(anchoredCue.beatId) &&
        !authoritativeEventIds.has(anchoredCue.anchorEventId)
      );
    });
    expect(wrongSameBeatShot).toBeDefined();
    expectMixFailure(
      sealMix({
        cues: audio.mixPlan.cues.map((cue, index) =>
          index === 0 ? { ...cue, shotId: wrongSameBeatShot!.id } : cue,
        ),
      }),
    );

    const missingTakeDraft = {
      ...omitContentHash(bundle),
      selectedTakes: [],
    };
    const missingTakeBundle = {
      ...missingTakeDraft,
      contentHash: hashCanonical(missingTakeDraft),
    };
    expect(parseDirectorProductionBundleEnvelope(missingTakeBundle)).toEqual(
      missingTakeBundle,
    );
    expect(() =>
      verifyDirectorProductionBundle({
        bundle: missingTakeBundle,
        directorProject: firstCut,
        audioMixPlan: audio.mixPlan,
        approvedAudioAssetVersions: [audio.approvedAsset],
      }),
    ).toThrow("does not use its selected take");
  });

  it("rejects wrong artifacts returned by trusted-store resolvers", () => {
    const firstCut = compileDirectorProject({ storyProject });
    const audio = audioFixtureFor(firstCut);
    const bundle = sealDirectorProductionBundle({
      id: "lineage-stored-substitution",
      directorProject: firstCut,
      audioMixPlan: audio.mixPlan,
      approvedAudioAssetVersions: [audio.approvedAsset],
      selectedTakes: [audio.selectedTake],
    });
    const differentProject = sealDirectorProject({
      ...omitContentHash(firstCut),
      id: "stored-foreign-director-project",
    });
    expect(() =>
      verifyStoredDirectorProductionBundle({
        rawBundle: bundle,
        resolveDirectorProjectByContentHash: () => differentProject,
        resolveAudioMixPlanByContentHash: () => audio.mixPlan,
        resolveApprovedAudioAssetVersion: () => audio.approvedAsset,
      }),
    ).toThrow(
      "Director production bundle does not match the exact Director project.",
    );
  });
});
