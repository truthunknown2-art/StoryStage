import { Camera, ChevronDown, Film, Minus, Plus, Zap } from "lucide-react";
import { useState } from "react";
import type { DirectorTimelineViewModel } from "./director-timeline-view-model";

const position = (frame: number, timeline: DirectorTimelineViewModel) =>
  `${((frame - timeline.startFrame) / Math.max(1, timeline.endFrameExclusive - timeline.startFrame)) * 100}%`;

const width = (
  startFrame: number,
  endFrameExclusive: number,
  timeline: DirectorTimelineViewModel,
) =>
  `${((endFrameExclusive - startFrame) / Math.max(1, timeline.endFrameExclusive - timeline.startFrame)) * 100}%`;

/** Whole-second ruler ticks inside the resolved beat range. */
const rulerTicks = (timeline: DirectorTimelineViewModel, fps: number) => {
  const ticks: number[] = [];
  const first = Math.ceil(timeline.startFrame / fps) * fps;
  for (
    let frame = first;
    frame < timeline.endFrameExclusive;
    frame += Math.max(1, Math.round(fps))
  )
    ticks.push(frame);
  return ticks;
};

export function DirectorTimelineDrawer({
  activeFrame,
  fps,
  onSeek,
  timeline,
}: {
  activeFrame: number;
  fps: number;
  onSeek: (frame: number) => void;
  timeline: DirectorTimelineViewModel;
}) {
  // Zoom only rescales the lanes visually (horizontal scroll); it never
  // alters timing data. Range kept coarse so labels stay legible.
  const [zoom, setZoom] = useState(1);
  const ticks = rulerTicks(timeline, fps);
  return (
    <details
      aria-label="Selected-beat timeline"
      className="director-timeline-drawer"
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
      <div className="director-timeline-tools">
        <span className="director-timeline-hint">
          Shots, events, and camera for the selected beat
        </span>
        <div
          aria-label="Timeline zoom"
          className="director-timeline-zoom"
          role="group"
        >
          <button
            aria-label="Zoom timeline out"
            disabled={zoom <= 0.6}
            onClick={() => setZoom((value) => Math.max(0.6, value - 0.2))}
            type="button"
          >
            <Minus size={13} />
          </button>
          <input
            aria-label="Timeline zoom level"
            max={2.5}
            min={0.6}
            onChange={(event) => setZoom(Number(event.target.value))}
            step={0.1}
            type="range"
            value={zoom}
          />
          <button
            aria-label="Zoom timeline in"
            disabled={zoom >= 2.5}
            onClick={() => setZoom((value) => Math.min(2.5, value + 0.2))}
            type="button"
          >
            <Plus size={13} />
          </button>
          <small>{Math.round(zoom * 100)}%</small>
        </div>
      </div>
      <div className="director-timeline-scroll">
        <div
          className="director-timeline-grid"
          style={{ minWidth: `${zoom * 100}%` }}
        >
          <div aria-hidden className="director-timeline-ruler-spacer" />
          <div className="director-timeline-lane is-ruler">
            {ticks.map((frame) => (
              <span key={frame} style={{ left: position(frame, timeline) }}>
                {Math.round(frame / fps)}s
              </span>
            ))}
            <i
              className="director-timeline-playhead"
              style={{ left: position(activeFrame, timeline) }}
            />
          </div>

          <div className="director-timeline-label">
            <i className="is-shots" />
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
                  width: width(
                    shot.startFrame,
                    shot.endFrameExclusive,
                    timeline,
                  ),
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
            <i className="is-events" />
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
            <i className="is-camera" />
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
      </div>
    </details>
  );
}
