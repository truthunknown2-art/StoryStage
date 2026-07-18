import { describe, expect, it } from "vitest";
import {
  audioMixPlanSchema,
  approvedAudioAssetVersionSchema,
  createAudioMixPlan,
  frameToSample,
} from "./audio-director";

const hash = (value: string) => value.repeat(64).slice(0, 64);

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
        sourceProvider: "openai",
        sourceContentHash: hash("a"),
        canonicalContentHash: hash("b"),
        relativeFile: "audio/dialogue/line-v1.wav",
        mediaType: "audio/wav",
        sampleRate: 48_000,
        channels: 1,
        sampleCount: 96_000,
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
