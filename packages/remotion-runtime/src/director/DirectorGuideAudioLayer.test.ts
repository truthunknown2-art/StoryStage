import {
  sealGuideVoiceClock,
  sealGuideVoiceTimingBasis,
} from "@storystage/story-engine/guide-clock";
import type { ExecutableEpisodePlan } from "@storystage/story-engine/director-alpha";
import { Children, isValidElement, type ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { ProductionComposition } from "../ProductionComposition";
import {
  DirectorGuideAudioLayer,
  createDirectorGuideAudioRenderBinding,
  type DirectorGuideAudioPlayback,
} from "./DirectorGuideAudioLayer";
import { DirectorProductionComposition } from "./DirectorProductionComposition";

const writeAscii = (bytes: Uint8Array, offset: number, value: string) => {
  for (let index = 0; index < value.length; index += 1)
    bytes[offset + index] = value.charCodeAt(index);
};

const createSilentPcmWav = (durationSamples: number) => {
  const channels = 1;
  const bitsPerSample = 16;
  const sampleRate = 48_000;
  const blockAlign = (channels * bitsPerSample) / 8;
  const dataBytes = durationSamples * blockAlign;
  const bytes = new Uint8Array(44 + dataBytes);
  const view = new DataView(bytes.buffer);
  writeAscii(bytes, 0, "RIFF");
  view.setUint32(4, 36 + dataBytes, true);
  writeAscii(bytes, 8, "WAVE");
  writeAscii(bytes, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  writeAscii(bytes, 36, "data");
  view.setUint32(40, dataBytes, true);
  return bytes;
};

const fixture = () => {
  const script = "Ollo follows the glow.";
  const audioBytes = createSilentPcmWav(48_000);
  const clock = sealGuideVoiceClock(
    { script, audioBytes },
    [
      {
        clauseId: "clause-ollo-glow",
        sourceRange: { start: 0, end: script.length },
        speakerRef: null,
        startSample: 0,
        endSampleExclusive: 48_000,
      },
    ],
  );
  const timingBasis = sealGuideVoiceTimingBasis(
    clock,
    { script, audioBytes },
    30,
  );
  const playback: DirectorGuideAudioPlayback = {
    authority: "guide-timing-only",
    productionBindable: false,
    expectedGuideVoiceClockContentHash: clock.contentHash,
    expectedGuideVoiceTimingBasisContentHash: timingBasis.contentHash,
    clock,
    timingBasis,
    source: {
      contentHash: clock.audioContentHash,
      url: `data:audio/wav;hash=${clock.audioContentHash}`,
    },
    muted: false,
  };
  return {
    format: { fps: 30, durationInFrames: 30 },
    playback,
  };
};

describe("Director guide audio runtime", () => {
  it("locks the exact guide WAV to frame zero for the complete episode", () => {
    const { format, playback } = fixture();

    expect(createDirectorGuideAudioRenderBinding(format, playback)).toEqual({
      startFrame: 0,
      durationInFrames: 30,
      trimBefore: 0,
      trimAfter: 30,
      sourceUrl: playback.source.url,
      muted: false,
    });
  });

  it("preserves a real muted review mode without changing the guide binding", () => {
    const { format, playback } = fixture();

    expect(
      createDirectorGuideAudioRenderBinding(format, {
        ...playback,
        muted: true,
      }),
    ).toMatchObject({
      startFrame: 0,
      durationInFrames: 30,
      sourceUrl: playback.source.url,
      muted: true,
    });
  });

  it("uses the same guide layer in browser Player and worker composition entrypoints", () => {
    const { format, playback } = fixture();
    const episodePlan = { format } as ExecutableEpisodePlan;
    const browserElement = DirectorProductionComposition({
      episodePlan,
      guideAudio: playback,
    });
    if (!isValidElement<{ children?: ReactNode }>(browserElement))
      throw new Error("Browser Director entrypoint did not return an element.");
    const guideLayer = Children.toArray(browserElement.props.children).find(
      (child) => isValidElement(child) && child.type === DirectorGuideAudioLayer,
    );
    expect(
      isValidElement<{ playback: DirectorGuideAudioPlayback }>(guideLayer) &&
        guideLayer.props.playback,
    ).toBe(playback);

    const workerElement = ProductionComposition({
      mode: "director-episode",
      episodePlan,
      guideAudio: playback,
    });
    expect(
      isValidElement<{ guideAudio?: DirectorGuideAudioPlayback }>(
        workerElement,
      ) && workerElement.type === DirectorProductionComposition
        ? workerElement.props.guideAudio
        : null,
    ).toBe(playback);
  });

  it("rejects stale clock, basis, and WAV URL hashes", () => {
    const { format, playback } = fixture();

    expect(() =>
      createDirectorGuideAudioRenderBinding(format, {
        ...playback,
        expectedGuideVoiceClockContentHash: "f".repeat(64),
      }),
    ).toThrow(/frozen guide clock hash/i);
    expect(() =>
      createDirectorGuideAudioRenderBinding(format, {
        ...playback,
        expectedGuideVoiceTimingBasisContentHash: "e".repeat(64),
      }),
    ).toThrow(/frozen expected basis hash/i);
    expect(() =>
      createDirectorGuideAudioRenderBinding(format, {
        ...playback,
        source: { ...playback.source, contentHash: "d".repeat(64) },
      }),
    ).toThrow(/exact clock WAV hash/i);
  });

  it("rejects FPS and duration drift from the executable episode plan", () => {
    const { format, playback } = fixture();

    expect(() =>
      createDirectorGuideAudioRenderBinding(
        { ...format, fps: 24 },
        playback,
      ),
    ).toThrow(/FPS does not match/i);
    expect(() =>
      createDirectorGuideAudioRenderBinding(
        { ...format, durationInFrames: 31 },
        playback,
      ),
    ).toThrow(/duration does not match/i);
  });

  it("rejects any attempt to promote the guide input to production authority", () => {
    const { format, playback } = fixture();
    const promoted = {
      ...playback,
      authority: "final-voice",
      productionBindable: true,
    } as unknown as DirectorGuideAudioPlayback;

    expect(() =>
      createDirectorGuideAudioRenderBinding(format, promoted),
    ).toThrow(/guide-timing-only and non-production-bindable/i);
  });
});
