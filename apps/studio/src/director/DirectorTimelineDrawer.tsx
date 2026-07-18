import { Camera, ChevronDown, Film, Zap } from "lucide-react";
import type { DirectorTimelineViewModel } from "./director-timeline-view-model";

const position = (frame: number, timeline: DirectorTimelineViewModel) =>
  `${((frame - timeline.startFrame) / Math.max(1, timeline.endFrameExclusive - timeline.startFrame)) * 100}%`;

const width = (
  startFrame: number,
  endFrameExclusive: number,
  timeline: DirectorTimelineViewModel,
) =>
  `${((endFrameExclusive - startFrame) / Math.max(1, timeline.endFrameExclusive - timeline.startFrame)) * 100}%`;

export function DirectorTimelineDrawer({
  activeFrame,
  onSeek,
  timeline,
}: {
  activeFrame: number;
  onSeek: (frame: number) => void;
  timeline: DirectorTimelineViewModel;
}) {
  return (
    <details
      aria-label="Selected-beat timeline"
      className="director-timeline-drawer"
      open
    >
      <summary>
        <span>
          <Film size={15} /> Selected-beat timeline
        </span>
        <small>
          {timeline.startFrame}–{timeline.endFrameExclusive - 1}f
        </small>
        <ChevronDown size={15} />
      </summary>
      <div className="director-timeline-grid">
        <div className="director-timeline-label">
          <Film size={14} /> Shots
        </div>
        <div className="director-timeline-lane is-shots">
          {timeline.shots.map((shot) => (
            <button
              className={
                activeFrame >= shot.startFrame &&
                activeFrame < shot.endFrameExclusive
                  ? "is-active"
                  : ""
              }
              key={shot.id}
              onClick={() => onSeek(shot.startFrame)}
              style={{
                left: position(shot.startFrame, timeline),
                width: width(shot.startFrame, shot.endFrameExclusive, timeline),
              }}
              title={`Seek to ${shot.label}, frame ${shot.startFrame}`}
              type="button"
            >
              <strong>{shot.label}</strong>
              <span>{shot.size}</span>
            </button>
          ))}
          <i
            className="director-timeline-playhead"
            style={{ left: position(activeFrame, timeline) }}
          />
        </div>

        <div className="director-timeline-label">
          <Zap size={14} /> Events
        </div>
        <div className="director-timeline-lane is-events">
          {timeline.events.map((event) => (
            <button
              className={
                Math.abs(activeFrame - event.frame) <= 1 ? "is-active" : ""
              }
              key={event.id}
              onClick={() => onSeek(event.frame)}
              style={{ left: position(event.frame, timeline) }}
              title={`Seek to ${event.label}, frame ${event.frame}`}
              type="button"
            >
              <span>{event.label}</span>
            </button>
          ))}
          <i
            className="director-timeline-playhead"
            style={{ left: position(activeFrame, timeline) }}
          />
        </div>

        <div className="director-timeline-label">
          <Camera size={14} /> Camera
        </div>
        <div className="director-timeline-lane is-camera">
          {timeline.cameras.map((camera) => (
            <button
              className={
                activeFrame >= camera.startFrame &&
                activeFrame < camera.endFrameExclusive
                  ? "is-active"
                  : ""
              }
              key={camera.id}
              onClick={() => onSeek(camera.startFrame)}
              style={{
                left: position(camera.startFrame, timeline),
                width: width(
                  camera.startFrame,
                  camera.endFrameExclusive,
                  timeline,
                ),
              }}
              title={`Seek to camera segment, frame ${camera.startFrame}`}
              type="button"
            >
              <strong>{camera.label}</strong>
              {camera.keyframes.map((frame) => (
                <i
                  key={frame}
                  style={{
                    left: `${((frame - camera.startFrame) / Math.max(1, camera.endFrameExclusive - camera.startFrame)) * 100}%`,
                  }}
                />
              ))}
            </button>
          ))}
          <i
            className="director-timeline-playhead"
            style={{ left: position(activeFrame, timeline) }}
          />
        </div>
      </div>
    </details>
  );
}
