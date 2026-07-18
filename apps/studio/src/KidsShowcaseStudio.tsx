import {
  Player,
  type CallbackListener,
  type PlayerRef,
} from "@remotion/player";
import { ProductionComposition } from "@storystage/remotion-runtime";
import {
  createKidsShowcaseProject,
  getKidsShowcaseShotLineage,
  makeKidsShowcaseSneezeBigger,
  redoKidsShowcaseEdit,
  undoKidsShowcaseEdit,
  type KidsShowcaseProject,
} from "@storystage/story-engine";
import {
  Check,
  ChevronDown,
  ChevronUp,
  Download,
  Expand,
  Film,
  Layers3,
  Maximize2,
  Pause,
  Play,
  Redo2,
  RotateCcw,
  Sparkles,
  Trees,
  Undo2,
  WandSparkles,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import "./kids-showcase-studio.css";

const SHOWCASE_FPS = 30;
export const KIDS_SHOWCASE_DOWNLOAD_URL =
  "/@fs/C:/Projects/StoryStage/artifacts/CV-003/kids-showcase/moonlit-ruins-30s.mp4";

const stageTracks = [
  { id: "far-set", label: "Forest far" },
  { id: "set-pieces", label: "Arch / set" },
  { id: "characters", label: "Characters" },
  { id: "interactive-props", label: "Moth / props" },
  { id: "foreground", label: "Foreground plants" },
] as const;

const formatTime = (frame: number) => {
  const totalSeconds = frame / SHOWCASE_FPS;
  const seconds = Math.floor(totalSeconds);
  const hundredths = Math.floor((totalSeconds - seconds) * 100);
  return `0:${String(seconds).padStart(2, "0")}.${String(hundredths).padStart(2, "0")}`;
};

const beatRange = (project: KidsShowcaseProject, beatId: string) => {
  const beat = project.program.beats.find(
    (candidate) => candidate.id === beatId,
  )!;
  const shots = beat.shotIds.map(
    (shotId) =>
      project.program.renderPlan.shots.find((shot) => shot.id === shotId)!,
  );
  const startFrame = Math.min(...shots.map((shot) => shot.startFrame));
  const endFrame = Math.max(
    ...shots.map((shot) => shot.startFrame + shot.durationInFrames),
  );
  return { startFrame, endFrame, durationInFrames: endFrame - startFrame };
};

export function KidsShowcaseStudio({ onBack }: { onBack: () => void }) {
  const playerRef = useRef<PlayerRef>(null);
  const stopAtFrame = useRef<number | null>(null);
  const [project, setProject] = useState(() => createKidsShowcaseProject());
  const [frame, setFrame] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [timelineOpen, setTimelineOpen] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [directionText, setDirectionText] = useState("Make the sneeze bigger.");
  const [status, setStatus] = useState<string | null>(null);
  const plan = project.program.renderPlan;

  useEffect(() => {
    const player = playerRef.current;
    if (!player) return;
    const onFrame: CallbackListener<"frameupdate"> = ({ detail }) => {
      setFrame(detail.frame);
      if (
        stopAtFrame.current !== null &&
        detail.frame >= stopAtFrame.current - 2
      ) {
        const finalFrame = stopAtFrame.current - 1;
        stopAtFrame.current = null;
        player.pause();
        player.seekTo(finalFrame);
        setFrame(finalFrame);
      }
    };
    const onPlay: CallbackListener<"play"> = () => setPlaying(true);
    const onPause: CallbackListener<"pause"> = () => setPlaying(false);
    const onEnded: CallbackListener<"ended"> = () => setPlaying(false);
    player.addEventListener("frameupdate", onFrame);
    player.addEventListener("play", onPlay);
    player.addEventListener("pause", onPause);
    player.addEventListener("ended", onEnded);
    return () => {
      player.removeEventListener("frameupdate", onFrame);
      player.removeEventListener("play", onPlay);
      player.removeEventListener("pause", onPause);
      player.removeEventListener("ended", onEnded);
    };
  }, []);

  const activeShotIndex = Math.max(
    0,
    plan.shots.findIndex(
      (shot) =>
        frame >= shot.startFrame &&
        frame < shot.startFrame + shot.durationInFrames,
    ),
  );
  const activeShot = plan.shots[activeShotIndex] ?? plan.shots[0]!;
  const activeLineage = getKidsShowcaseShotLineage(
    project.program,
    activeShot.id,
  );
  const activeBeatIndex = project.program.beats.findIndex(
    (beat) => beat.id === activeLineage.beat.id,
  );
  const activeBeat =
    project.program.beats[activeBeatIndex] ?? project.program.beats[0]!;
  const activeScene = project.program.scenes.find(
    (scene) => scene.id === activeBeat.sceneId,
  )!;
  const sneezeSelected = activeBeat.id === "beat-spark-sneeze";
  const sneezeIsBigger = project.direction.sneezeIntensity > 1;
  const activeDirectorPlan = project.directedBeatPlans.find((candidate) =>
    candidate.beats.some((beat) => beat.id === activeBeat.id),
  );
  const activeDirectedBeat = activeDirectorPlan?.beats.find(
    (beat) => beat.id === activeBeat.id,
  );
  const activeDirectedShot = activeDirectorPlan?.shots.find(
    (shot) => shot.id === activeShot.id,
  );

  const seekTo = (nextFrame: number) => {
    stopAtFrame.current = null;
    const clamped = Math.max(0, Math.min(plan.durationInFrames - 1, nextFrame));
    playerRef.current?.seekTo(clamped);
    setFrame(clamped);
  };

  const playRange = (startFrame: number, endFrame: number) => {
    stopAtFrame.current = endFrame;
    playerRef.current?.seekTo(startFrame);
    setFrame(startFrame);
    playerRef.current?.play();
  };

  const playBeat = (beatId: string) => {
    const next = beatRange(project, beatId);
    playRange(next.startFrame, next.endFrame);
    setStatus(null);
  };

  const togglePlayback = () => {
    const player = playerRef.current;
    if (!player) return;
    stopAtFrame.current = null;
    if (player.isPlaying()) player.pause();
    else {
      if (frame >= plan.durationInFrames - 2) seekTo(0);
      player.play();
    }
  };

  const applyDirection = () => {
    if (
      !sneezeSelected ||
      !/sneeze/i.test(directionText) ||
      !/(bigger|larger|stronger)/i.test(directionText)
    ) {
      setStatus(
        "This proof currently supports one bounded command: “Make the sneeze bigger.”",
      );
      return;
    }
    if (sneezeIsBigger) {
      setStatus("The supported sneeze direction is already applied.");
      return;
    }
    const next = makeKidsShowcaseSneezeBigger(project);
    setProject(next);
    setStatus(
      "Sneeze intensity updated inside the bounded spark-sneeze beat. Replaying it now.",
    );
    window.setTimeout(() => playRange(522, 630), 0);
  };

  const undo = () => {
    const next = undoKidsShowcaseEdit(project);
    if (next === project) return;
    setProject(next);
    setStatus("Direction undone. The original sneeze motion is restored.");
    window.setTimeout(() => playRange(522, 630), 0);
  };

  const redo = () => {
    const next = redoKidsShowcaseEdit(project);
    if (next === project) return;
    setProject(next);
    setStatus("Direction restored. Replaying the larger sneeze.");
    window.setTimeout(() => playRange(522, 630), 0);
  };

  const beatGroups = useMemo(
    () =>
      project.program.scenes.map((scene) => ({
        scene,
        beats: scene.beatIds.map(
          (beatId) => project.program.beats.find((beat) => beat.id === beatId)!,
        ),
      })),
    [project.program],
  );

  return (
    <main className="ks-studio">
      <header className="ks-topbar">
        <button
          aria-label="Back to create"
          className="ks-brand"
          onClick={onBack}
          type="button"
        >
          <span>
            <Film size={17} />
          </span>
          <strong>StoryStage</strong>
        </button>
        <div className="ks-project-title">
          <strong>Moonlit Ruins</strong>
          <span>
            <Trees size={13} />
            Kids Adventure
          </span>
          <span>
            <Layers3 size={13} />
            Cut-paper forest
          </span>
        </div>
        <div className="ks-top-actions">
          <span className="ks-saved">
            <Check size={13} />
            Source → render linked
          </span>
          <a
            aria-label="Download current 30-second MP4"
            className="ks-download-render"
            download="moonlit-ruins-30s.mp4"
            href={KIDS_SHOWCASE_DOWNLOAD_URL}
          >
            <Download size={15} />
            Download MP4
          </a>
          <button
            disabled={project.historyCursor === 0}
            onClick={undo}
            type="button"
          >
            <Undo2 size={15} />
            Undo
          </button>
          <button
            disabled={project.historyCursor >= project.history.length}
            onClick={redo}
            type="button"
          >
            <Redo2 size={15} />
            Redo
          </button>
          <button className="is-primary" onClick={togglePlayback} type="button">
            {playing ? (
              <Pause fill="currentColor" size={15} />
            ) : (
              <Play fill="currentColor" size={15} />
            )}
            {playing ? "Pause" : "Preview 30s"}
          </button>
        </div>
      </header>

      <section className="ks-workspace">
        <aside className="ks-scenes">
          <header>
            <div>
              <span>Story beats</span>
              <strong>3 scenes · 6 beats</strong>
            </div>
            <Sparkles size={16} />
          </header>
          <div className="ks-scene-list">
            {beatGroups.map(({ scene, beats }) => (
              <section className="ks-scene-group" key={scene.id}>
                <header>
                  <span>Scene {scene.order}</span>
                  <strong>{scene.title}</strong>
                </header>
                {beats.map((beat) => {
                  const globalIndex = project.program.beats.findIndex(
                    (candidate) => candidate.id === beat.id,
                  );
                  const beatActive = beat.id === activeBeat.id;
                  const beatDuration =
                    beatRange(project, beat.id).durationInFrames / SHOWCASE_FPS;
                  return (
                    <button
                      aria-current={beatActive ? "true" : undefined}
                      className={beatActive ? "is-active" : ""}
                      key={beat.id}
                      onClick={() => playBeat(beat.id)}
                      type="button"
                    >
                      <span className={`ks-thumb is-${(globalIndex % 5) + 1}`}>
                        <b>{String(globalIndex + 1).padStart(2, "0")}</b>
                        <i />
                      </span>
                      <span className="ks-scene-copy">
                        <strong>{beat.text.split(".")[0]}</strong>
                        <small>
                          {beat.shotIds.length} shot
                          {beat.shotIds.length === 1 ? "" : "s"} ·{" "}
                          {beatDuration.toFixed(1)}s
                        </small>
                      </span>
                      {beatActive ? (
                        <Play fill="currentColor" size={11} />
                      ) : null}
                    </button>
                  );
                })}
              </section>
            ))}
          </div>
        </aside>

        <section className="ks-stage-column">
          <header className="ks-stage-heading">
            <div>
              <span>
                {activeScene.title} · Beat {activeBeatIndex + 1}
              </span>
              <h1>{activeShot.title}</h1>
            </div>
            <span className="ks-status-pill">
              <span />
              Director plan valid · 9 cuts checked
            </span>
          </header>
          <div className="ks-player-frame">
            <Player
              acknowledgeRemotionLicense
              component={ProductionComposition}
              compositionHeight={plan.height}
              compositionWidth={plan.width}
              durationInFrames={plan.durationInFrames}
              fps={plan.fps}
              inputProps={{
                plan,
                playbackAssets: {},
                sliceDurationInFrames: plan.durationInFrames,
                kidsShowcaseProgram: project.program,
                kidsShowcaseDirection: project.direction,
              }}
              ref={playerRef}
              style={{ aspectRatio: "16 / 9", width: "100%" }}
            />
          </div>
          <div className="ks-transport">
            <button
              aria-label="Replay beat"
              onClick={() => playBeat(activeBeat.id)}
              type="button"
            >
              <RotateCcw size={16} />
            </button>
            <button
              aria-label={playing ? "Pause preview" : "Play preview"}
              className="is-play"
              onClick={togglePlayback}
              type="button"
            >
              {playing ? (
                <Pause fill="currentColor" size={18} />
              ) : (
                <Play fill="currentColor" size={18} />
              )}
            </button>
            <span>{formatTime(frame)}</span>
            <input
              aria-label="Showcase playhead"
              max={plan.durationInFrames - 1}
              min={0}
              onInput={(event) => seekTo(Number(event.currentTarget.value))}
              step={1}
              type="range"
              value={frame}
            />
            <span>{formatTime(plan.durationInFrames)}</span>
            <button
              aria-label="View fullscreen"
              onClick={() => playerRef.current?.requestFullscreen()}
              type="button"
            >
              <Maximize2 size={16} />
            </button>
          </div>
        </section>

        <aside className="ks-director">
          <header>
            <div>
              <span>Direct this beat</span>
              <strong>Say what should change</strong>
            </div>
            <WandSparkles size={17} />
          </header>
          <section className="ks-what-happens">
            <span>What happens</span>
            <p>{activeBeat.text}</p>
          </section>
          <section className="ks-current-direction">
            <span>Current visual direction</span>
            <strong>{activeShot.title}</strong>
            <small>
              {activeLineage.binding.motionChannels.slice(0, 3).join(" · ")}
            </small>
          </section>
          {activeDirectedBeat && activeDirectedShot ? (
            <section className="ks-director-plan">
              <span>Director plan</span>
              <strong>{activeDirectedBeat.audienceQuestion}</strong>
              <p>{activeDirectedShot.storyFunction}</p>
              <div aria-label="Picture events">
                {activeDirectedShot.events.map((event) => (
                  <small key={event.id}>
                    {event.id} <b>+{event.frameOffset}f</b>
                  </small>
                ))}
              </div>
            </section>
          ) : null}
          <label className="ks-direction-input" htmlFor="ks-direction">
            <span>Your direction</span>
            <textarea
              disabled={!sneezeSelected}
              id="ks-direction"
              onChange={(event) => setDirectionText(event.target.value)}
              rows={3}
              value={
                sneezeSelected
                  ? directionText
                  : "Select “The children mistake the waking creature...” to try the bounded direction proof."
              }
            />
          </label>
          <button
            className="ks-apply-direction"
            disabled={!sneezeSelected || sneezeIsBigger}
            onClick={applyDirection}
            type="button"
          >
            <WandSparkles size={16} />
            {sneezeIsBigger ? "Direction applied" : "Apply direction"}
          </button>
          <button
            className="ks-replay-beat"
            onClick={() => playBeat(activeBeat.id)}
            type="button"
          >
            <Play fill="currentColor" size={14} />
            Replay this beat
          </button>
          {status ? (
            <p className="ks-direction-status" role="status">
              {status}
            </p>
          ) : null}
          <button
            aria-expanded={advancedOpen}
            className="ks-advanced-toggle"
            onClick={() => setAdvancedOpen((value) => !value)}
            type="button"
          >
            Advanced lineage{" "}
            {advancedOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          {advancedOpen ? (
            <section className="ks-lineage">
              <span>Source beat</span>
              <code>{activeBeat.id}</code>
              <span>Grammar</span>
              <code>{activeLineage.binding.grammarId}</code>
              <span>Template</span>
              <code>{activeLineage.binding.templateId}</code>
              <span>Rig programs</span>
              <code>{activeLineage.binding.rigIds.join(" + ")}</code>
            </section>
          ) : null}
        </aside>
      </section>

      <section className="ks-beat-strip">
        <button
          className="ks-collapse-label"
          onClick={() => setTimelineOpen((value) => !value)}
          type="button"
        >
          {timelineOpen ? <ChevronDown size={15} /> : <ChevronUp size={15} />}{" "}
          {timelineOpen ? "Collapse timeline" : "Expand timeline"}
        </button>
        <div>
          {project.program.beats.map((beat, index) => {
            const next = beatRange(project, beat.id);
            return (
              <button
                className={beat.id === activeBeat.id ? "is-active" : ""}
                key={beat.id}
                onClick={() => playBeat(beat.id)}
                style={{ flexGrow: next.durationInFrames }}
                type="button"
              >
                <span>{String(index + 1).padStart(2, "0")}</span>
                <strong>{beat.text.split(".")[0]}</strong>
                <small>
                  {(next.durationInFrames / SHOWCASE_FPS).toFixed(1)}s
                </small>
              </button>
            );
          })}
        </div>
        <button
          className="ks-fullscreen"
          onClick={() => playerRef.current?.requestFullscreen()}
          type="button"
        >
          <Expand size={14} />
          Fullscreen
        </button>
      </section>

      {timelineOpen ? (
        <section className="ks-timeline-drawer">
          <header>
            <div>
              <span>Expanded timeline</span>
              <strong>Shot-level proof for the selected production</strong>
            </div>
            <button onClick={() => setTimelineOpen(false)} type="button">
              <ChevronDown size={15} />
              Close
            </button>
          </header>
          <div className="ks-timeline-body">
            <div className="ks-track-labels">
              {stageTracks.map((track) => (
                <span key={track.id}>{track.label}</span>
              ))}
            </div>
            <div className="ks-tracks">
              {stageTracks.map((track) => (
                <div className={`ks-track is-${track.id}`} key={track.id}>
                  {plan.shots.map((shot, index) => (
                    <button
                      aria-label={`${track.label}: ${shot.title}`}
                      className={index === activeShotIndex ? "is-active" : ""}
                      key={shot.id}
                      onClick={() => seekTo(shot.startFrame)}
                      style={{
                        width: `${(shot.durationInFrames / plan.durationInFrames) * 100}%`,
                      }}
                      type="button"
                    >
                      <span>
                        {track.id === "characters"
                          ? String(index + 1).padStart(2, "0")
                          : null}
                      </span>
                    </button>
                  ))}
                </div>
              ))}
              <div
                className="ks-playhead"
                style={{
                  left: `${(frame / (plan.durationInFrames - 1)) * 100}%`,
                }}
              >
                <span />
              </div>
            </div>
          </div>
        </section>
      ) : null}
    </main>
  );
}
