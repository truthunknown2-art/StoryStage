/**
 * Development/test guide-audio fixture.
 *
 * Builds a valid `DirectorGuideAudioPlayback` (silent PCM WAV, sealed clock
 * and timing basis) that exactly matches a supplied episode format. This is
 * an explicit fixture for UI development, tests, and screenshot capture only
 * — it is never wired into the production path: the Studio only renders it
 * when the dev server runs with `?guide-audio-fixture=1`, and production
 * builds never invoke it.
 */
import {
  sealGuideVoiceClock,
  sealGuideVoiceTimingBasis,
} from "@storystage/story-engine/guide-clock";
import type { DirectorGuideAudioPlayback } from "@storystage/remotion-runtime/director";
import {
  createSilentPcmWav,
  GUIDE_FIXTURE_SAMPLE_RATE,
} from "./guide-fixture-wav";

export function createGuideAudioFixturePlayback(format: {
  fps: number;
  durationInFrames: number;
}): DirectorGuideAudioPlayback {
  const script = "Guide timing read fixture.";
  const samplesPerFrame = GUIDE_FIXTURE_SAMPLE_RATE / format.fps;
  if (!Number.isSafeInteger(samplesPerFrame))
    throw new Error("Fixture requires an integer samples-per-frame rate.");
  const durationSamples = samplesPerFrame * format.durationInFrames;
  const audioBytes = createSilentPcmWav(durationSamples);
  const clock = sealGuideVoiceClock({ script, audioBytes }, [
    {
      clauseId: "clause-guide-fixture",
      sourceRange: { start: 0, end: script.length },
      speakerRef: null,
      startSample: 0,
      endSampleExclusive: durationSamples,
    },
  ]);
  const timingBasis = sealGuideVoiceTimingBasis(
    clock,
    { script, audioBytes },
    format.fps,
  );
  return {
    authority: "guide-timing-only",
    productionBindable: false,
    expectedGuideVoiceClockContentHash: clock.contentHash,
    expectedGuideVoiceTimingBasisContentHash: timingBasis.contentHash,
    clock,
    timingBasis,
    source: {
      contentHash: clock.audioContentHash,
      // Same-origin dev endpoint serving the exact sealed bytes; see
      // vite.config.ts (development only).
      url: `/__guide-audio-fixture.wav?samples=${durationSamples}`,
    },
    muted: false,
  };
}
