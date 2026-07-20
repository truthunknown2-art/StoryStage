import { describe, expect, it } from "vitest";
import type { GuideVoiceClause } from "@storystage/story-engine/guide-clock";
import {
  assertIdenticalPictureAndEpisodeProps,
  assertReopenedGuideAudioMatches,
  bindApprovedOlloEnvironment,
  createEditorialGuideEpisodeContext,
  createEditorialGuideRenderProps,
  parseGuideClauseTimings,
  prepareEditorialGuideAudioProof,
} from "./editorial-guide-audio-proof";

const script = `Ollo follows a warm golden spark through the Little Wood, pausing when it trembles beneath a fern. He leans closer, but the spark darts away, and Ollo hurries after it beneath the low branches.

At an old log, the light stops beside a quiet hollow. Something rustles inside, so Ollo listens, gathers his courage, and reaches forward with one careful paw.

A tiny acorn rolls out and settles in Ollo's paw. The Storylight glows warmly as Ollo smiles, tucks the little treasure into his scarf, and carries it safely home. Along the path, he imagines the tall tree it might become and waves goodnight to every sleepy firefly.`;

const makePcmWav = (durationSamples: number, sampleRate = 48_000) => {
  const dataLength = durationSamples * 2;
  const bytes = new Uint8Array(44 + dataLength);
  const view = new DataView(bytes.buffer);
  const writeAscii = (offset: number, value: string) =>
    [...value].forEach((character, index) => {
      bytes[offset + index] = character.charCodeAt(0);
    });
  writeAscii(0, "RIFF");
  view.setUint32(4, bytes.length - 8, true);
  writeAscii(8, "WAVE");
  writeAscii(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeAscii(36, "data");
  view.setUint32(40, dataLength, true);
  return bytes;
};

const clausesFor = (
  context: ReturnType<typeof createEditorialGuideEpisodeContext>,
  samplesPerFrame: number,
): GuideVoiceClause[] => {
  let startFrame = 0;
  return context.storyProject.graph.scenes.map((scene, index) => {
    const durationInFrames =
      context.planningSources.timingBudget.scenes[index]!.durationInFrames;
    const endFrame = startFrame + durationInFrames;
    const clause = {
      clauseId: `guide-clause-${index + 1}`,
      sourceRange: scene.sourceRange,
      speakerRef: "narrator-guide",
      startSample: startFrame * samplesPerFrame,
      endSampleExclusive: endFrame * samplesPerFrame,
    };
    startFrame = endFrame;
    return clause;
  });
};

describe("editorial guide-audio proof", () => {
  it("binds the exact creator-approved Little Wood plates to every stage", () => {
    const context = createEditorialGuideEpisodeContext(script);
    const rebound = bindApprovedOlloEnvironment(context.episodePlan);

    expect(rebound.contentHash).toBe(context.episodePlan.contentHash);
    expect(rebound.stageKits.every((stage) => stage.assetIds.length >= 2)).toBe(
      true,
    );
    expect(
      rebound.stageKits.every(
        (stage) =>
          stage.assetIds[0] === "little-wood-hollow-log-background-v1" &&
          stage.assetIds.at(-1) === "little-wood-hollow-log-foreground-v1",
      ),
    ).toBe(true);
    expect(
      rebound.approvedAssets.filter((asset) =>
        asset.assetId.startsWith("little-wood-hollow-log-"),
      ),
    ).toHaveLength(2);
  });

  it("seals one exact guide clock into identical Director picture props", () => {
    const context = createEditorialGuideEpisodeContext(script);
    const durationSamples = context.episodePlan.format.durationInFrames * 1_600;
    const audioBytes = makePcmWav(durationSamples);
    const prepared = prepareEditorialGuideAudioProof(
      context,
      audioBytes,
      clausesFor(context, 1_600),
    );

    const audioOn = createEditorialGuideRenderProps(
      prepared,
      audioBytes,
      false,
    );
    const muted = createEditorialGuideRenderProps(prepared, audioBytes, true);

    expect(assertIdenticalPictureAndEpisodeProps(audioOn, muted)).toMatch(
      /^[a-f0-9]{64}$/,
    );
    expect(prepared.guideVoiceClock.sampleRate).toBe(48_000);
    expect(prepared.guideVoiceClock.productionBindable).toBe(false);
    expect(prepared.directorProject.timingSolution.timingBasis).toEqual({
      kind: "guide-audio",
      contentHash: prepared.guideVoiceClock.contentHash,
    });
    expect(prepared.editorialArtifacts.timingBinding.kind).toBe("guide-audio");
    expect(prepared.editorialArtifacts.request.timingBinding).toEqual(
      prepared.editorialArtifacts.timingBinding,
    );
    expect(audioOn.mode).toBe("director-episode");
    if (
      audioOn.mode === "director-episode" &&
      muted.mode === "director-episode"
    ) {
      expect(audioOn.guideAudio?.muted).toBe(false);
      expect(muted.guideAudio?.muted).toBe(true);
      expect(audioOn.episodePlan.contentHash).toBe(
        muted.episodePlan.contentHash,
      );
    }
  });

  it("rejects reopened WAV bytes that differ from the sealed guide clock", () => {
    const context = createEditorialGuideEpisodeContext(script);
    const audioBytes = makePcmWav(
      context.episodePlan.format.durationInFrames * 1_600,
    );
    const prepared = prepareEditorialGuideAudioProof(
      context,
      audioBytes,
      clausesFor(context, 1_600),
    );
    const changed = audioBytes.slice();
    changed[changed.length - 1] = changed[changed.length - 1]! ^ 1;

    expect(() => assertReopenedGuideAudioMatches(prepared, changed)).toThrow(
      "Reopened guide WAV does not match",
    );
  });

  it("rejects PCM WAV input that is not exactly 48 kHz", () => {
    const context = createEditorialGuideEpisodeContext(script);
    const samplesPerFrame = 44_100 / context.episodePlan.format.fps;
    const audioBytes = makePcmWav(
      context.episodePlan.format.durationInFrames * samplesPerFrame,
      44_100,
    );

    expect(() =>
      prepareEditorialGuideAudioProof(
        context,
        audioBytes,
        clausesFor(context, samplesPerFrame),
      ),
    ).toThrow("Guide WAV must be exactly 48 kHz PCM");
  });

  it("accepts synthesis metadata envelopes but verifies embedded clause text", () => {
    const raw = {
      schemaVersion: "1.0",
      voice: "offline-test",
      clauses: [
        {
          clauseId: "guide-clause-1",
          sourceRange: { start: 0, end: 4 },
          speakerRef: "narrator-guide",
          startSample: 0,
          endSampleExclusive: 1_600,
          text: "Ollo",
        },
      ],
    };
    expect(parseGuideClauseTimings(JSON.stringify(raw), "Ollo")).toEqual([
      {
        clauseId: "guide-clause-1",
        sourceRange: { start: 0, end: 4 },
        speakerRef: "narrator-guide",
        startSample: 0,
        endSampleExclusive: 1_600,
      },
    ]);
    raw.clauses[0]!.text = "Nope";
    expect(() => parseGuideClauseTimings(JSON.stringify(raw), "Ollo")).toThrow(
      "text does not match",
    );
  });
});
