import { Audio } from "@remotion/media";
import type { ExecutableEpisodePlan } from "@storystage/story-engine/director-alpha";
import {
  assertGuideVoiceTimingBasisMatchesClock,
  guideVoiceClockSchema,
  type GuideVoiceClockV1,
  type GuideVoiceTimingBasisV1,
} from "@storystage/story-engine/guide-clock";
import { Sequence } from "remotion";

export type DirectorGuideAudioPlayback = Readonly<{
  authority: "guide-timing-only";
  productionBindable: false;
  expectedGuideVoiceClockContentHash: string;
  expectedGuideVoiceTimingBasisContentHash: string;
  clock: GuideVoiceClockV1;
  timingBasis: GuideVoiceTimingBasisV1;
  source: Readonly<{
    contentHash: string;
    url: string;
  }>;
  muted: boolean;
}>;

export type DirectorGuideAudioRenderBinding = Readonly<{
  startFrame: 0;
  durationInFrames: number;
  trimBefore: 0;
  trimAfter: number;
  sourceUrl: string;
  muted: boolean;
}>;

type DirectorEpisodeFormat = Pick<
  ExecutableEpisodePlan["format"],
  "durationInFrames" | "fps"
>;

export function createDirectorGuideAudioRenderBinding(
  format: DirectorEpisodeFormat,
  playback: DirectorGuideAudioPlayback,
): DirectorGuideAudioRenderBinding {
  if (
    playback.authority !== "guide-timing-only" ||
    playback.productionBindable !== false
  )
    throw new Error(
      "Director guide audio must remain guide-timing-only and non-production-bindable.",
    );

  const clock = guideVoiceClockSchema.parse(playback.clock);
  if (clock.contentHash !== playback.expectedGuideVoiceClockContentHash)
    throw new Error(
      "Director guide audio does not match the frozen guide clock hash.",
    );
  const timingBasis = assertGuideVoiceTimingBasisMatchesClock(
    playback.timingBasis,
    clock,
    {
      expectedContentHash:
        playback.expectedGuideVoiceTimingBasisContentHash,
    },
  );
  if (timingBasis.fps !== format.fps)
    throw new Error(
      "Director guide audio FPS does not match the executable episode plan.",
    );

  const durationInFrames =
    timingBasis.durationSamples / timingBasis.samplesPerFrame;
  if (
    !Number.isSafeInteger(durationInFrames) ||
    durationInFrames !== format.durationInFrames
  )
    throw new Error(
      "Director guide audio duration does not match the executable episode plan.",
    );
  if (playback.source.contentHash !== clock.audioContentHash)
    throw new Error(
      "Director guide audio URL is not bound to the exact clock WAV hash.",
    );
  if (!playback.source.url.trim())
    throw new Error("Director guide audio requires a non-empty verified URL.");

  return {
    startFrame: 0,
    durationInFrames,
    trimBefore: 0,
    trimAfter: durationInFrames,
    sourceUrl: playback.source.url,
    muted: playback.muted,
  };
}

export const DirectorGuideAudioLayer: React.FC<{
  format: DirectorEpisodeFormat;
  playback: DirectorGuideAudioPlayback;
}> = ({ format, playback }) => {
  const binding = createDirectorGuideAudioRenderBinding(format, playback);
  return (
    <Sequence
      durationInFrames={binding.durationInFrames}
      from={binding.startFrame}
      layout="none"
      name="Guide voice (timing only)"
    >
      <Audio
        muted={binding.muted}
        src={binding.sourceUrl}
        trimAfter={binding.trimAfter}
        trimBefore={binding.trimBefore}
      />
    </Sequence>
  );
};
