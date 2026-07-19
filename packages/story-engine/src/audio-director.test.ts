import { describe, expect, it } from "vitest";
import {
  compileAudioMixPlan,
  audioMixPlanSchema,
  approvedAudioAssetVersionSchema,
  createAudioMixPlan,
  frameToSample,
  sealSpokenLine,
} from "./audio-director";
import { createCv002Project } from "./cv002-story-draft";
import { createCv002ArtDirectionSelection } from "./cv002-art-direction";
import { compileDirectorProject } from "./director/director-compiler";
import {
  directorProductionBundleSchema,
  sealDirectorProductionBundle,
} from "./director/director-production-bundle";

const hash = (value: string) => value.repeat(64).slice(0, 64);
const kidsArtDirection = createCv002ArtDirectionSelection(
  "kids-adventure",
  "cut-paper-collage-mixed-media",
);

describe("audio director contracts", () => {
  it("compiles picture frames to exact 48 kHz sample boundaries", () => {
    expect(frameToSample(30, 30)).toBe(48_000);
    expect(frameToSample(24, 24)).toBe(48_000);
    expect(() => frameToSample(1, 29)).toThrow(/integer 48000Hz sample/);
  });

  it("creates a deterministic frame-locked mix plan", () => {
    const draft = {
      schemaVersion: "1.0" as const,
      id: "moonlit-mix-v1",
      productionId: "moonlit-ruins",
      fps: 30,
      sampleRate: 48_000 as const,
      durationInFrames: 900,
      cues: [
        {
          schemaVersion: "1.0" as const,
          id: "guardian-sneeze",
          productionId: "moonlit-ruins",
          sceneId: "moon-hall",
          beatId: "spark-sneeze",
          shotId: "shot-spark-sneeze",
          approvedAssetVersionId: "sneeze-take-v1",
          role: "sfx" as const,
          event: "impact" as const,
          startFrame: 580,
          durationInFrames: 45,
          trimStartSample: 0,
          bus: "effects" as const,
          gainDb: -3,
          pan: 0,
          fadeInFrames: 0,
          fadeOutFrames: 8,
        },
      ],
      target: {
        integratedLufs: -16,
        truePeakDbtp: -1,
        channels: 2 as const,
      },
    };
    const first = createAudioMixPlan(draft);
    const second = createAudioMixPlan(draft);
    expect(first.contentHash).toBe(second.contentHash);
    expect(first.contentHash).toHaveLength(64);
    expect(() =>
      audioMixPlanSchema.parse({
        ...first,
        target: { ...first.target, integratedLufs: -12 },
      }),
    ).toThrow(/mix plan hash/i);
    expect(() =>
      createAudioMixPlan({
        ...draft,
        cues: [{ ...draft.cues[0]!, productionId: "another-production" }],
      }),
    ).toThrow(/Cue production must match/);
  });

  it("rejects stale or missing voice-consent evidence references", () => {
    expect(() =>
      approvedAudioAssetVersionSchema.parse({
        schemaVersion: "1.0",
        id: "character-line-v1",
        briefId: "character-line",
        sourceRoute: "api-generation",
        providerAdapterId: "synthetic-voice-adapter-v1",
        sourceContentHash: hash("a"),
        canonicalContentHash: hash("b"),
        relativeFile: "audio/dialogue/line-v1.wav",
        mediaType: "audio/wav",
        sampleRate: 48_000,
        channels: 1,
        sampleCount: 96_000,
        approvalStatus: "approved",
        approvedAt: "2026-07-18T00:00:00.000Z",
        rightsEvidence: [
          {
            id: "provider-terms",
            kind: "provider-terms",
            note: "Official provider terms captured at generation time.",
            capturedAt: "2026-07-18T00:00:00.000Z",
          },
        ],
        voiceConsentEvidenceId: "missing-consent",
      }),
    ).toThrow(/Voice consent/);
  });
});

const audioScript = Array.from(
  { length: 8 },
  (_, index) =>
    `A careful guide follows a bright clue and pauses for the answer ${index + 1}.`,
).join(" ");

const createCompilationFixture = () => {
  const directorProject = compileDirectorProject({
    storyProject: createCv002Project(
      "Audio contract proof",
      audioScript,
      "kids-adventure",
      kidsArtDirection,
    ),
  });
  const { directorPlan, timingSolution } = directorProject;
  const resolved = timingSolution.resolvedEvents.find(
    (candidate) => candidate.frame + 30 <= timingSolution.durationInFrames,
  )!;
  const event = directorPlan.events.find(
    (candidate) => candidate.id === resolved.eventId,
  )!;
  const productionId = "audio-contract-proof";
  const assetContentHash = hash("c");
  const spokenLine = sealSpokenLine({
    schemaVersion: "1.0",
    lineId: "guide-line-one",
    productionId,
    sceneId: event.sceneId,
    beatId: event.beatId,
    speakerId: "guide",
    role: "narration",
    text: "Follow the bright clue.",
  });
  const approvedAsset = {
    schemaVersion: "1.0" as const,
    id: "guide-line-one-take-one",
    briefId: "guide-line-one-brief",
    sourceRoute: "recorded" as const,
    providerAdapterId: "owner-recorder-v1",
    sourceContentHash: hash("d"),
    canonicalContentHash: assetContentHash,
    relativeFile: "audio/dialogue/guide-line-one-take-one.wav",
    mediaType: "audio/wav" as const,
    sampleRate: 48_000 as const,
    channels: 1 as const,
    sampleCount: 48_000,
    approvalStatus: "approved" as const,
    approvedAt: "2026-07-18T00:00:00.000Z",
    rightsEvidence: [
      {
        id: "creator-owned-audio",
        kind: "creator-owned" as const,
        note: "Recorded by the project owner.",
        capturedAt: "2026-07-18T00:00:00.000Z",
      },
    ],
  };
  const cueIntent = {
    schemaVersion: "1.0" as const,
    id: "guide-line-one-cue",
    productionId,
    sceneId: event.sceneId,
    beatId: event.beatId,
    shotId: null,
    lineId: spokenLine.lineId,
    anchorEventId: event.id,
    offsetFrames: 0,
    approvedAssetVersionId: approvedAsset.id,
    approvedAssetContentHash: assetContentHash,
    role: "narration" as const,
    event: "on-action" as const,
    trimStartSample: 0,
    trimEndSampleExclusive: null,
    bus: "dialogue" as const,
    gainDb: -3,
    pan: 0,
    fadeInFrames: 2,
    fadeOutFrames: 2,
    duckingGroup: "dialogue" as const,
  };
  const input = {
    id: "audio-contract-mix",
    productionId,
    directorPlan,
    timingSolution,
    directorPlanContentHash: directorPlan.contentHash,
    timingSolutionContentHash: timingSolution.contentHash,
    fps: 30,
    spokenLines: [spokenLine],
    cueIntents: [cueIntent],
    approvedAssetVersions: [approvedAsset],
    target: {
      integratedLufs: -16,
      truePeakDbtp: -1,
      channels: 2 as const,
    },
  };
  return { directorProject, spokenLine, approvedAsset, cueIntent, input };
};

describe("ADR-001 deterministic audio compilation", () => {
  it("resolves event-relative intent and hash-binds exact Director authority", () => {
    const fixture = createCompilationFixture();
    const first = compileAudioMixPlan(fixture.input);
    const repeated = compileAudioMixPlan(fixture.input);
    const resolvedAnchor = fixture.input.timingSolution.resolvedEvents.find(
      (event) => event.eventId === fixture.cueIntent.anchorEventId,
    )!;

    expect(first).toEqual(repeated);
    expect(first.directorPlanContentHash).toBe(
      fixture.input.directorPlan.contentHash,
    );
    expect(first.timingSolutionContentHash).toBe(
      fixture.input.timingSolution.contentHash,
    );
    expect(first.cues[0]).toMatchObject({
      lineId: fixture.spokenLine.lineId,
      anchorEventId: fixture.cueIntent.anchorEventId,
      resolvedStartFrame: resolvedAnchor.frame,
      startSample: frameToSample(resolvedAnchor.frame, 30),
      durationFrames: 30,
      assetContentHash: fixture.approvedAsset.canonicalContentHash,
    });
  });

  it("fails closed for stale authority and missing or invalid assets", () => {
    const fixture = createCompilationFixture();
    expect(() =>
      compileAudioMixPlan({
        ...fixture.input,
        directorPlanContentHash: hash("e"),
      }),
    ).toThrow(/stale Director plan hash/);
    expect(() =>
      compileAudioMixPlan({ ...fixture.input, approvedAssetVersions: [] }),
    ).toThrow(/missing approved audio asset version/);
    expect(() =>
      compileAudioMixPlan({
        ...fixture.input,
        approvedAssetVersions: [
          { ...fixture.approvedAsset, approvalStatus: "pending" },
        ] as never,
      }),
    ).toThrow(/not an approved asset version/);
    expect(() =>
      compileAudioMixPlan({
        ...fixture.input,
        approvedAssetVersions: [
          { ...fixture.approvedAsset, sampleRate: 44_100 },
        ] as never,
      }),
    ).toThrow(/wrong sample rate/);
    expect(() =>
      compileAudioMixPlan({
        ...fixture.input,
        cueIntents: [
          { ...fixture.cueIntent, approvedAssetContentHash: hash("f") },
        ],
      }),
    ).toThrow(/wrong hash/);
    expect(() =>
      compileAudioMixPlan({
        ...fixture.input,
        cueIntents: [
          {
            ...fixture.cueIntent,
            offsetFrames: fixture.input.timingSolution.durationInFrames,
          },
        ],
      }),
    ).toThrow(/out of bounds for the production/);
  });

  it("seals approved versions and selected takes beside DirectorProject", () => {
    const fixture = createCompilationFixture();
    const mixPlan = compileAudioMixPlan(fixture.input);
    const selectedTake = {
      lineId: fixture.spokenLine.lineId,
      takeId: "take-one",
      dialoguePerformanceId: "guide-line-one-performance",
      approvedAssetVersionId: fixture.approvedAsset.id,
      assetContentHash: fixture.approvedAsset.canonicalContentHash,
    };
    const first = sealDirectorProductionBundle({
      id: "audio-contract-bundle",
      directorProject: fixture.directorProject,
      audioMixPlan: mixPlan,
      approvedAudioAssetVersions: [fixture.approvedAsset],
      selectedTakes: [selectedTake],
    });
    const repeated = sealDirectorProductionBundle({
      id: "audio-contract-bundle",
      directorProject: fixture.directorProject,
      audioMixPlan: mixPlan,
      approvedAudioAssetVersions: [fixture.approvedAsset],
      selectedTakes: [selectedTake],
    });
    expect(first).toEqual(repeated);
    expect(first.directorProjectContentHash).toBe(
      fixture.directorProject.contentHash,
    );
    expect(first.audioMixPlanContentHash).toBe(mixPlan.contentHash);
    expect(() =>
      directorProductionBundleSchema.parse({
        ...first,
        audioMixPlanContentHash: hash("a"),
      }),
    ).toThrow(/bundle hash/i);
    expect(fixture.directorProject).not.toHaveProperty(
      "audioMixPlanContentHash",
    );
  });
});
