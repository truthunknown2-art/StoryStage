import { Ear, Volume2, VolumeX } from "lucide-react";
import type { DirectorGuideAudioPlayback } from "@storystage/remotion-runtime/director";

/**
 * Product-facing guide-audio review strip for the Director Studio workspace.
 *
 * The guide read is private timing/scoring audio only — never final character
 * voice, never production-bindable. The strip only reflects the host-supplied
 * `DirectorGuideAudioPlayback` (the runtime validates its hashes); it never
 * imports, generates, approves, or persists audio, and the mute control
 * changes only the Player input props, never the episode plan or picture
 * timing.
 */
export function GuideAudioReviewStrip({
  incompatible = false,
  muted,
  onToggleMuted,
  playback,
}: {
  incompatible?: boolean;
  muted: boolean;
  onToggleMuted: () => void;
  playback: DirectorGuideAudioPlayback | null | undefined;
}) {
  if (!playback) {
    return (
      <div className="guide-audio-strip is-silent" data-testid="guide-audio-strip">
        <Ear size={14} aria-hidden />
        <p>
          <strong>No guide read attached.</strong>
          <span>
            Silent preview — guide audio is private timing/scoring only and
            never final voice. No Studio authoring bridge exists yet.
          </span>
        </p>
      </div>
    );
  }

  const frames =
    playback.timingBasis.durationSamples / playback.timingBasis.samplesPerFrame;
  const seconds = frames / playback.timingBasis.fps;

  if (incompatible) {
    return (
      <div
        className="guide-audio-strip is-stale"
        data-testid="guide-audio-strip"
        role="status"
      >
        <div className="guide-audio-strip-heading">
          <Ear size={14} aria-hidden />
          <div>
            <strong>Guide read detached — stale for the revised cut</strong>
            <span>Not final voice · not production-bindable</span>
          </div>
        </div>
        <p className="guide-audio-stale-note">
          This guide&apos;s timing basis no longer matches the current
          episode&apos;s fps or frame count, so it was removed from playback.
          It was not retimed, stretched, regenerated, or resealed — a fresh
          host guide is required before the read can play again.
        </p>
        <dl className="guide-audio-facts">
          <div>
            <dt>Clock</dt>
            <dd>
              <code title={playback.clock.contentHash}>
                {playback.clock.contentHash}
              </code>
            </dd>
          </div>
          <div>
            <dt>Timing basis</dt>
            <dd>
              <code title={playback.timingBasis.contentHash}>
                {playback.timingBasis.contentHash}
              </code>
            </dd>
          </div>
          <div>
            <dt>Guide WAV</dt>
            <dd>
              <code title={playback.source.contentHash}>
                {playback.source.contentHash}
              </code>
            </dd>
          </div>
          <div>
            <dt>Supplied timing</dt>
            <dd>
              {playback.timingBasis.fps} fps · {seconds.toFixed(1)}s (
              {frames} frames)
            </dd>
          </div>
        </dl>
      </div>
    );
  }

  return (
    <div className="guide-audio-strip" data-testid="guide-audio-strip">
      <div className="guide-audio-strip-heading">
        <Ear size={14} aria-hidden />
        <div>
          <strong>Guide read · private timing/scoring only</strong>
          <span>Not final voice · not production-bindable</span>
        </div>
        <button
          aria-label={muted ? "Unmute guide read" : "Mute guide read"}
          aria-pressed={muted}
          className="guide-audio-mute"
          onClick={onToggleMuted}
          type="button"
        >
          {muted ? (
            <VolumeX size={15} aria-hidden />
          ) : (
            <Volume2 size={15} aria-hidden />
          )}
          {muted ? "Unmute" : "Mute"}
        </button>
      </div>
      <dl className="guide-audio-facts">
        <div>
          <dt>Clock</dt>
          <dd>
            <code title={playback.clock.contentHash}>
              {playback.clock.contentHash}
            </code>
          </dd>
        </div>
        <div>
          <dt>Timing basis</dt>
          <dd>
            <code title={playback.timingBasis.contentHash}>
              {playback.timingBasis.contentHash}
            </code>
          </dd>
        </div>
        <div>
          <dt>Guide WAV</dt>
          <dd>
            <code title={playback.source.contentHash}>
              {playback.source.contentHash}
            </code>
          </dd>
        </div>
        <div>
          <dt>Playback</dt>
          <dd>
            {playback.timingBasis.fps} fps · {seconds.toFixed(1)}s (
            {frames} frames)
          </dd>
        </div>
      </dl>
    </div>
  );
}
