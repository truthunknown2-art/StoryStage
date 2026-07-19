import {
  Player,
  type CallbackListener,
  type PlayerRef,
} from "@remotion/player";
import { ProductionComposition } from "@storystage/remotion-runtime";
import {
  commitCv001CreatorCommand,
  compileCv001CreatorScene,
  createCv001ThreeBeatProofFixture,
  parseCv001CreatorCommand,
  redoCv001CreatorEdit,
  undoCv001CreatorEdit,
  updateCv001CreatorSelection,
  type Cv001CreatorProjectState,
} from "@storystage/story-engine";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  BookOpen,
  Check,
  ChevronDown,
  Expand,
  Info,
  Pause,
  Play,
  Redo2,
  RotateCcw,
  Settings2,
  Sparkles,
  Trees,
  WandSparkles,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { CreatorStudioShell } from "./creator-studio-components";
import "./cv001-creator-studio.css";

const beatPresentation = [
  {
    title: "Notice the lantern",
    eyebrow: "Discovery",
    thumbnail: "/cv001/notice.png",
  },
  {
    title: "Pick up the lantern",
    eyebrow: "Action",
    thumbnail: "/cv001/pickup.png",
  },
  {
    title: "Show the lantern",
    eyebrow: "Reaction",
    thumbnail: "/cv001/present.png",
  },
] as const;

const formatTime = (frame: number, fps: number) => {
  const totalSeconds = Math.floor(frame / fps);
  return `${Math.floor(totalSeconds / 60)}:${String(totalSeconds % 60).padStart(2, "0")}`;
};

const directionSummary = (project: Cv001CreatorProjectState, index: number) => {
  const direction = project.directionState.beats[index]!;
  return `${direction.performance === "standard" ? project.baseInput.beats[index]!.emotion : direction.performance} · ${direction.tempo === "standard" ? "standard motion" : `${direction.tempo} motion`}`;
};

export function Cv001CreatorStudio({
  entryMode,
  onExit,
  onOpenLegacy,
  onProjectChange,
  project,
}: {
  entryMode: "new-first-cut" | "continue-saved";
  onExit: () => void;
  onOpenLegacy: () => void;
  onProjectChange: (project: Cv001CreatorProjectState) => void;
  project: Cv001CreatorProjectState;
}) {
  const fixture = useMemo(createCv001ThreeBeatProofFixture, []);
  const compiled = useMemo(
    () =>
      compileCv001CreatorScene({
        baseInput: project.baseInput,
        directionState: project.directionState,
        renderPlan: fixture.renderPlan,
      }),
    [fixture.renderPlan, project.baseInput, project.directionState],
  );
  const selectedIndex = Math.max(
    0,
    project.baseInput.beats.findIndex(
      (beat) => beat.id === project.selectedBeatId,
    ),
  );
  const selectedBeat = project.baseInput.beats[selectedIndex]!;
  const selectedShot = fixture.renderPlan.shots[selectedIndex]!;
  const [frame, setFrame] = useState(
    entryMode === "new-first-cut" ? 0 : selectedShot.startFrame,
  );
  const [playing, setPlaying] = useState(false);
  const [playOnlyBeat, setPlayOnlyBeat] = useState<number | null>(null);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [directorOpen, setDirectorOpen] = useState(false);
  const [instruction, setInstruction] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const playerRef = useRef<PlayerRef>(null);
  const previewHeadingRef = useRef<HTMLHeadingElement>(null);
  const statusRef = useRef<HTMLParagraphElement>(null);
  const initialPlayback = useRef({
    entryMode,
    selectedStartFrame: selectedShot.startFrame,
  });

  useEffect(() => {
    previewHeadingRef.current?.focus({ preventScroll: true });
    const { entryMode: initialEntryMode, selectedStartFrame } =
      initialPlayback.current;
    const initialFrame =
      initialEntryMode === "new-first-cut" ? 0 : selectedStartFrame;
    playerRef.current?.seekTo(initialFrame);
    setFrame(initialFrame);
    if (initialEntryMode === "continue-saved") return;
    const timer = window.setTimeout(() => {
      setPlayOnlyBeat(null);
      playerRef.current?.seekTo(initialFrame);
      playerRef.current?.play();
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const player = playerRef.current;
    if (!player) return;
    const onFrame: CallbackListener<"frameupdate"> = ({ detail }) => {
      setFrame(detail.frame);
      if (playOnlyBeat !== null) {
        const shot = fixture.renderPlan.shots[playOnlyBeat]!;
        // Remotion can emit `ended` before the final frameupdate. Stop one tick
        // early, then pin the playhead to the exact final frame of the beat.
        if (detail.frame >= shot.startFrame + shot.durationInFrames - 2) {
          player.pause();
          player.seekTo(shot.startFrame + shot.durationInFrames - 1);
          setPlayOnlyBeat(null);
        }
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
  }, [fixture.renderPlan.shots, playOnlyBeat]);

  const activeIndex = Math.max(
    0,
    fixture.renderPlan.shots.findIndex(
      (shot) =>
        frame >= shot.startFrame &&
        frame < shot.startFrame + shot.durationInFrames,
    ),
  );
  const seekTo = (nextFrame: number) => {
    const clamped = Math.max(
      0,
      Math.min(fixture.renderPlan.durationInFrames - 1, nextFrame),
    );
    playerRef.current?.seekTo(clamped);
    setFrame(clamped);
  };
  const selectBeat = (index: number) => {
    const beat = project.baseInput.beats[index]!;
    const shot = fixture.renderPlan.shots[index]!;
    onProjectChange(updateCv001CreatorSelection(project, beat.id));
    setStatus(`Selected “${beatPresentation[index]!.title}”.`);
    setError(null);
    setPlayOnlyBeat(index);
    seekTo(shot.startFrame);
    playerRef.current?.play();
  };
  const moveBeat = (delta: number) =>
    selectBeat(Math.max(0, Math.min(2, selectedIndex + delta)));
  const togglePlayback = () => {
    const player = playerRef.current;
    if (!player) return;
    setPlayOnlyBeat(null);
    if (player.isPlaying()) player.pause();
    else {
      if (frame >= fixture.renderPlan.durationInFrames - 1) seekTo(0);
      player.play();
    }
  };
  const replaySelected = () => {
    setPlayOnlyBeat(selectedIndex);
    seekTo(selectedShot.startFrame);
    playerRef.current?.play();
  };

  const replayBeatAfterStateChange = (index: number) => {
    const shot = fixture.renderPlan.shots[index]!;
    window.setTimeout(() => {
      setPlayOnlyBeat(index);
      playerRef.current?.seekTo(shot.startFrame);
      setFrame(shot.startFrame);
      playerRef.current?.play();
      statusRef.current?.focus({ preventScroll: true });
    }, 0);
  };

  const applyDirection = () => {
    try {
      const command = parseCv001CreatorCommand(selectedBeat.id, instruction);
      const result = commitCv001CreatorCommand({
        project,
        command,
        renderPlan: fixture.renderPlan,
      });
      onProjectChange(result.project);
      setInstruction("");
      setError(null);
      setStatus(`Updated “${beatPresentation[selectedIndex]!.title}”.`);
      replayBeatAfterStateChange(selectedIndex);
    } catch (caught) {
      setStatus(null);
      setError(
        caught instanceof Error
          ? caught.message
          : "That direction could not be applied.",
      );
    }
  };

  const undo = () => {
    if (project.historyCursor === 0) return;
    const next = undoCv001CreatorEdit(project, fixture.renderPlan);
    onProjectChange(next);
    setError(null);
    setStatus("Undid direction change.");
    replayBeatAfterStateChange(
      next.baseInput.beats.findIndex((beat) => beat.id === next.selectedBeatId),
    );
  };

  const redo = () => {
    if (project.historyCursor >= project.history.length) return;
    const next = redoCv001CreatorEdit(project, fixture.renderPlan);
    onProjectChange(next);
    setError(null);
    setStatus("Redid direction change.");
    replayBeatAfterStateChange(
      next.baseInput.beats.findIndex((beat) => beat.id === next.selectedBeatId),
    );
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement
      )
        return;
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") {
        event.preventDefault();
        if (event.shiftKey) redo();
        else undo();
        return;
      }
      if (event.code === "Space") {
        event.preventDefault();
        togglePlayback();
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        moveBeat(-1);
      }
      if (event.key === "ArrowDown") {
        event.preventDefault();
        moveBeat(1);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  return (
    <div className="cv-creator">
      <header className="cv-topbar">
        <button className="cv-back" onClick={onExit} type="button">
          <ArrowLeft size={17} />
          Back to Create
        </button>
        <div className="cv-project-title">
          <div>
            <strong>{project.title}</strong>
            <small>Three-beat animation prototype</small>
          </div>
          <span className="cv-project-tag">
            <Trees size={13} />
            Kids Adventure
          </span>
          <span className="cv-project-tag">
            <BookOpen size={13} />
            Storybook Cutout
          </span>
        </div>
        <div className="cv-top-actions">
          <span className="cv-prototype-badge">
            <Sparkles size={13} />
            Engineering demo
          </span>
          <button
            aria-label="Undo direction"
            disabled={project.historyCursor === 0}
            onClick={undo}
            type="button"
          >
            <RotateCcw size={15} />
          </button>
          <button
            aria-label="Redo direction"
            disabled={project.historyCursor >= project.history.length}
            onClick={redo}
            type="button"
          >
            <Redo2 size={15} />
          </button>
          <button
            className="cv-direct-beat"
            onClick={() => setDirectorOpen(true)}
            type="button"
          >
            <WandSparkles size={15} />
            Direct beat
          </button>
          <button
            aria-expanded={advancedOpen}
            onClick={() => setAdvancedOpen((open) => !open)}
            type="button"
          >
            <Settings2 size={15} />
            Advanced
          </button>
        </div>
      </header>

      <CreatorStudioShell className="cv-workspace">
        <nav aria-label="Scenes and beats" className="cv-beats-panel">
          <details open>
            <summary>
              <div>
                <p>Scene 1</p>
                <h1>Forest path</h1>
              </div>
              <span>3 beats</span>
              <ChevronDown size={14} />
            </summary>
            <p className="cv-panel-intro">
              Choose a moment to play and direct.
            </p>
            <div className="cv-beat-list">
              {project.baseInput.beats.map((beat, index) => {
                const presentation = beatPresentation[index]!;
                const isSelected = index === selectedIndex;
                const isActive = index === activeIndex;
                const isPlaying = playing && isActive;
                return (
                  <button
                    aria-current={isActive ? "true" : undefined}
                    aria-pressed={isSelected}
                    className={`${isSelected ? "is-selected" : ""} ${isPlaying ? "is-playing" : ""}`}
                    data-binding-hash={
                      compiled.sceneMotion.bindings[index]!.contentHash
                    }
                    key={beat.id}
                    onClick={() => selectBeat(index)}
                    type="button"
                  >
                    <span className="cv-beat-thumb">
                      <Player
                        acknowledgeRemotionLicense
                        clickToPlay={false}
                        component={ProductionComposition}
                        compositionHeight={fixture.renderPlan.height}
                        compositionWidth={fixture.renderPlan.width}
                        controls={false}
                        durationInFrames={fixture.renderPlan.durationInFrames}
                        fps={fixture.renderPlan.fps}
                        initialFrame={[30, 150, 240][index]}
                        inputProps={{
                          plan: fixture.renderPlan,
                          playbackAssets: {},
                          sliceDurationInFrames:
                            fixture.renderPlan.durationInFrames,
                          directedSceneMotion: compiled.sceneMotion,
                          showMotionDiagnostics: false,
                        }}
                        style={{ height: "100%", width: "100%" }}
                      />
                    </span>
                    <span className="cv-beat-copy">
                      <small>
                        0{index + 1} · {presentation.eyebrow}
                      </small>
                      <strong>{presentation.title}</strong>
                      <q>{beat.text}</q>
                      <span>
                        {(beat.durationInFrames / 30).toFixed(1)} sec ·{" "}
                        {directionSummary(project, index)}
                      </span>
                    </span>
                    {isPlaying ? (
                      <i>Playing</i>
                    ) : isSelected ? (
                      <i>Selected</i>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </details>
          <div className="cv-scene-note">
            <Info size={15} />
            <p>
              <strong>Prototype art · real articulated motion</strong>
              <span>Every frame comes from the production composition.</span>
            </p>
          </div>
        </nav>

        <main aria-label="Animated preview" className="cv-stage">
          <header className="cv-stage-heading">
            <div>
              <p>Animated preview · Beat {activeIndex + 1}</p>
              <h2 ref={previewHeadingRef} tabIndex={-1}>
                {beatPresentation[activeIndex]!.title}
              </h2>
            </div>
            <span className="cv-real-badge">
              <Sparkles size={13} />
              Prototype art · real articulated motion
            </span>
          </header>
          <div className="cv-player-frame">
            <Player
              acknowledgeRemotionLicense
              allowFullscreen
              clickToPlay={false}
              component={ProductionComposition}
              compositionHeight={fixture.renderPlan.height}
              compositionWidth={fixture.renderPlan.width}
              controls={false}
              durationInFrames={fixture.renderPlan.durationInFrames}
              fps={fixture.renderPlan.fps}
              inputProps={{
                plan: fixture.renderPlan,
                playbackAssets: {},
                sliceDurationInFrames: fixture.renderPlan.durationInFrames,
                directedSceneMotion: compiled.sceneMotion,
                showMotionDiagnostics: false,
              }}
              ref={playerRef}
              style={{ aspectRatio: "16 / 9", width: "100%" }}
            />
          </div>
          <div className="cv-player-controls">
            <button
              aria-label={playing ? "Pause scene" : "Play scene"}
              className="cv-play"
              onClick={togglePlayback}
              type="button"
            >
              {playing ? (
                <Pause fill="currentColor" size={17} />
              ) : (
                <Play fill="currentColor" size={17} />
              )}
            </button>
            <button
              aria-label="Previous beat"
              disabled={selectedIndex === 0}
              onClick={() => moveBeat(-1)}
              type="button"
            >
              <ArrowUp size={16} />
            </button>
            <button
              aria-label="Next beat"
              disabled={selectedIndex === 2}
              onClick={() => moveBeat(1)}
              type="button"
            >
              <ArrowDown size={16} />
            </button>
            <button
              aria-label="Restart selected beat"
              onClick={replaySelected}
              type="button"
            >
              <Redo2 size={16} />
            </button>
            <span>{formatTime(frame, 30)}</span>
            <input
              aria-label="Scene playhead"
              max={299}
              min={0}
              onChange={(event) => {
                setPlayOnlyBeat(null);
                seekTo(Number(event.target.value));
              }}
              step={1}
              type="range"
              value={Math.min(frame, 299)}
            />
            <span>{formatTime(300, 30)}</span>
            <button
              aria-label="View fullscreen"
              onClick={() => playerRef.current?.requestFullscreen()}
              type="button"
            >
              <Expand size={16} />
            </button>
          </div>
          <div aria-label="Beat timeline" className="cv-timeline">
            {fixture.renderPlan.shots.map((shot, index) => (
              <button
                className={index === activeIndex ? "is-active" : ""}
                key={shot.id}
                onClick={() => selectBeat(index)}
                style={{ flexGrow: shot.durationInFrames }}
                type="button"
              >
                <span>0{index + 1}</span>
                <strong>{beatPresentation[index]!.title}</strong>
                <small>{(shot.durationInFrames / 30).toFixed(1)}s</small>
              </button>
            ))}
          </div>
        </main>

        <aside
          aria-label="Director"
          className={`cv-director ${directorOpen ? "is-open" : ""}`}
        >
          <header>
            <span>
              <WandSparkles size={17} />
            </span>
            <div>
              <p>Director</p>
              <h2>Direct this beat</h2>
            </div>
            <button
              aria-label="Close Director"
              className="cv-close-director"
              onClick={() => setDirectorOpen(false)}
              type="button"
            >
              ×
            </button>
          </header>
          <div className="cv-selected-summary">
            <span>Selected beat</span>
            <strong>{beatPresentation[selectedIndex]!.title}</strong>
            <p>{selectedBeat.text}</p>
          </div>
          <label htmlFor="cv-direction">What should change?</label>
          <textarea
            id="cv-direction"
            onChange={(event) => setInstruction(event.target.value)}
            onKeyDown={(event) => {
              if (
                (event.ctrlKey || event.metaKey) &&
                event.key === "Enter" &&
                instruction.trim()
              ) {
                event.preventDefault();
                applyDirection();
              }
            }}
            placeholder={
              selectedIndex === 2
                ? "Try: Make the reaction bigger and hold it longer."
                : "Try: Make it bigger and snappier."
            }
            rows={4}
            value={instruction}
          />
          <div className="cv-suggestions" aria-label="Direction examples">
            <button
              onClick={() => setInstruction("Make it bigger")}
              type="button"
            >
              Bigger
            </button>
            <button
              onClick={() => setInstruction("Hold it longer")}
              type="button"
            >
              Longer hold
            </button>
            <button
              onClick={() => setInstruction("Make it snappier")}
              type="button"
            >
              Snappier
            </button>
            <button
              onClick={() => setInstruction("Push in more")}
              type="button"
            >
              Stronger camera
            </button>
          </div>
          <p className="cv-prototype-note">
            This prototype understands a small set of directing phrases. No AI
            call or fake free-form interpretation.
          </p>
          {status ? (
            <p
              aria-live="polite"
              className="cv-feedback"
              ref={statusRef}
              role="status"
              tabIndex={-1}
            >
              <Check size={14} />
              {status}
            </p>
          ) : null}
          {error ? (
            <p aria-live="polite" className="cv-error" role="alert">
              {error}
            </p>
          ) : null}
          <button
            className="cv-apply"
            disabled={!instruction.trim()}
            onClick={applyDirection}
            type="button"
          >
            <WandSparkles size={16} />
            Update beat
          </button>
          <dl className="cv-beat-facts">
            <div>
              <dt>Performance</dt>
              <dd>
                {project.directionState.beats[selectedIndex]!.performance}
              </dd>
            </div>
            <div>
              <dt>Tempo</dt>
              <dd>{project.directionState.beats[selectedIndex]!.tempo}</dd>
            </div>
            <div>
              <dt>Hold</dt>
              <dd>{project.directionState.beats[selectedIndex]!.hold}</dd>
            </div>
            <div>
              <dt>Camera</dt>
              <dd>{project.directionState.beats[selectedIndex]!.camera}</dd>
            </div>
          </dl>
          <section className="cv-edit-history" aria-label="Direction history">
            <header>
              <span>Recent changes</span>
              <small>
                {project.historyCursor}/{project.history.length}
              </small>
            </header>
            {project.history.length === 0 ? (
              <p>No direction changes yet.</p>
            ) : (
              <ol>
                {project.history
                  .slice(
                    Math.max(0, project.historyCursor - 3),
                    project.historyCursor,
                  )
                  .map((transaction) => (
                    <li key={transaction.id}>
                      <span>{transaction.id.replace("edit-", "")}</span>
                      <p>{transaction.command.normalizedText}</p>
                    </li>
                  ))}
              </ol>
            )}
          </section>
        </aside>
      </CreatorStudioShell>

      {advancedOpen ? (
        <aside aria-label="Advanced" className="cv-advanced-drawer">
          <header>
            <div>
              <p>Technical evidence</p>
              <h2>Advanced</h2>
            </div>
            <button
              aria-label="Close Advanced"
              onClick={() => setAdvancedOpen(false)}
              type="button"
            >
              ×
            </button>
          </header>
          <dl>
            <div>
              <dt>Compiler</dt>
              <dd>
                {compiled.sceneMotion.compiler.id} ·{" "}
                {compiled.sceneMotion.compiler.version}
              </dd>
            </div>
            <div>
              <dt>Rig contract</dt>
              <dd>{compiled.sceneMotion.rigContractId}</dd>
            </div>
            <div>
              <dt>Render-plan hash</dt>
              <dd>{fixture.renderPlan.contentHash}</dd>
            </div>
            <div>
              <dt>Compiled-scene hash</dt>
              <dd>{compiled.sceneMotion.contentHash}</dd>
            </div>
            <div>
              <dt>Selected binding</dt>
              <dd>
                {compiled.sceneMotion.bindings[selectedIndex]!.contentHash}
              </dd>
            </div>
            <div>
              <dt>Format</dt>
              <dd>10 seconds · 30 fps · 1920 × 1080</dd>
            </div>
            <div>
              <dt>Validator</dt>
              <dd>
                <Check size={13} />
                Passed
              </dd>
            </div>
            <div>
              <dt>Composition</dt>
              <dd>StoryStageProduction</dd>
            </div>
          </dl>
          <button
            className="cv-open-legacy"
            onClick={onOpenLegacy}
            type="button"
          >
            Open engineering production tools
          </button>
        </aside>
      ) : null}
    </div>
  );
}
