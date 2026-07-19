import type { ExecutableEpisodePlan } from "@storystage/story-engine/director-alpha";

type EntityProgram = NonNullable<
  ExecutableEpisodePlan["proxyEntityPrograms"]
>[number];

const interpolate = (
  frame: number,
  frames: number[],
  values: number[],
) => {
  if (frame <= frames[0]!) return values[0]!;
  if (frame >= frames.at(-1)!) return values.at(-1)!;
  const right = frames.findIndex((candidate) => candidate >= frame);
  const left = Math.max(0, right - 1);
  const progress =
    (frame - frames[left]!) / Math.max(1, frames[right]! - frames[left]!);
  return values[left]! + (values[right]! - values[left]!) * progress;
};

const entityTransformAt = (program: EntityProgram, frame: number) => {
  const frames = program.keyframes.map((keyframe) => keyframe.frame);
  return {
    x: interpolate(
      frame,
      frames,
      program.keyframes.map((keyframe) => keyframe.transform.x),
    ),
    y: interpolate(
      frame,
      frames,
      program.keyframes.map((keyframe) => keyframe.transform.y),
    ),
    scale: interpolate(
      frame,
      frames,
      program.keyframes.map((keyframe) => keyframe.transform.scale),
    ),
  };
};

/**
 * A lightweight still derived from the same sealed executable frame programs
 * as the authoritative Player. It never borrows unrelated Show Pack art.
 */
export function DirectorFrameThumbnail({
  episode,
  frame,
}: {
  episode: ExecutableEpisodePlan;
  frame: number;
}) {
  const clampedFrame = Math.max(
    0,
    Math.min(episode.format.durationInFrames - 1, frame),
  );
  const shot =
    episode.shots.find(
      (candidate) =>
        clampedFrame >= candidate.startFrame &&
        clampedFrame < candidate.endFrameExclusive,
    ) ?? episode.shots[0]!;
  const localFrame = clampedFrame - shot.startFrame;
  const stage = episode.proxyStagePrograms?.find(
    (program) => program.stageId === shot.stageKitId,
  );
  const camera = episode.proxyCameraPrograms?.find(
    (program) => program.shotId === shot.directorShotId,
  );
  const entities =
    episode.proxyEntityPrograms?.filter(
      (program) => program.shotId === shot.directorShotId,
    ) ?? [];
  const caption = episode.proxyCaptionPrograms?.find(
    (program) => program.shotId === shot.directorShotId,
  );

  if (!stage || !camera) return null;
  const cameraFrames = camera.keyframes.map((keyframe) => keyframe.frame);
  const cameraX = interpolate(
    localFrame,
    cameraFrames,
    camera.keyframes.map((keyframe) => keyframe.x),
  );
  const cameraY = interpolate(
    localFrame,
    cameraFrames,
    camera.keyframes.map((keyframe) => keyframe.y),
  );
  const cameraScale = interpolate(
    localFrame,
    cameraFrames,
    camera.keyframes.map((keyframe) => keyframe.scale),
  );

  return (
    <span
      aria-label={`Canonical frame ${clampedFrame}`}
      className="director-frame-thumbnail"
      data-episode-hash={episode.contentHash}
      data-frame={clampedFrame}
      data-shot-id={shot.directorShotId}
      role="img"
    >
      <span
        className="director-frame-thumbnail-world"
        style={{
          background: `linear-gradient(180deg, ${stage.palette.sky} 0 58%, ${stage.palette.ground} 58% 100%)`,
          transform: `translate(${cameraX * 0.2}%, ${cameraY * 0.2}%) scale(${cameraScale})`,
        }}
      >
        <i
          className="director-frame-thumbnail-sun"
          style={{ background: stage.palette.accent }}
        />
        <i
          className="director-frame-thumbnail-land"
          style={{ background: stage.palette.ink }}
        />
        {entities.map((entity) => {
          const transform = entityTransformAt(entity, localFrame);
          return (
            <i
              className={`director-frame-thumbnail-entity is-${entity.appearance.shape}`}
              key={entity.id}
              style={{
                background: entity.appearance.color,
                left: `${transform.x * 100}%`,
                top: `${transform.y * 100}%`,
                transform: `translate(-50%, -50%) scale(${transform.scale})`,
              }}
              title={entity.appearance.label}
            />
          );
        })}
      </span>
      {caption ? (
        <span className="director-frame-thumbnail-caption">
          {caption.text}
        </span>
      ) : null}
    </span>
  );
}
