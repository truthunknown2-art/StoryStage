import { useMemo, useState } from "react";
import {
  ArrowLeft,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clapperboard,
  Film,
  LocateFixed,
} from "lucide-react";
import olloCastArt from "../assets/ollo-friends-cast-v1.jpg";
import {
  LOCAL_DEMO_BANNER,
  OLLO_DEMO_PROJECT,
  OLLO_DEMO_SCENES,
  OLLO_DEMO_TOTAL_SECONDS,
  type DemoScene,
} from "./demo-project";

const formatClock = (totalSeconds: number) => {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
};

const sceneStart = (sceneId: string) => {
  let offset = 0;
  for (const scene of OLLO_DEMO_SCENES) {
    if (scene.id === sceneId) return offset;
    offset += scene.seconds;
  }
  return offset;
};

const toggle = (set: Set<string>, id: string) => {
  const next = new Set(set);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  return next;
};

/**
 * F2 Studio shell (WP1 + WP2): one selected scene identity drives the
 * hierarchy rail, center scene-board, transport, episode overview, and the
 * scene-relative playhead. Act/sequence groups expand and collapse; beat
 * rows render only for the selected scene; a collapsed selected scene keeps
 * an explicit reachable summary. The playhead is local UI timing — never
 * media playback. Director controls arrive in F3.
 */
export function StudioShell({
  artStyleLabel,
  grammarLabel,
  onBackToProjects,
  projectTitle,
  usesLayoutDemo = false,
}: {
  artStyleLabel: string;
  grammarLabel: string;
  onBackToProjects: () => void;
  projectTitle: string;
  /** True when the visible hierarchy is the bounded Ollo layout demo rather
   * than a plan derived from the creator's own script. */
  usesLayoutDemo?: boolean;
}) {
  const [selectedSceneId, setSelectedSceneId] = useState<string>(
    OLLO_DEMO_SCENES[0]!.id,
  );
  const [collapsedActs, setCollapsedActs] = useState<Set<string>>(new Set());
  const [collapsedSequences, setCollapsedSequences] = useState<Set<string>>(
    new Set(),
  );
  // Scene-relative playhead resets deterministically to zero on every scene
  // change (render-time adjustment, no effect races).
  const [playheadSeconds, setPlayheadSeconds] = useState(0);
  const [lastSceneId, setLastSceneId] = useState(selectedSceneId);
  if (lastSceneId !== selectedSceneId) {
    setLastSceneId(selectedSceneId);
    setPlayheadSeconds(0);
  }

  const selectedIndex = useMemo(
    () => OLLO_DEMO_SCENES.findIndex((scene) => scene.id === selectedSceneId),
    [selectedSceneId],
  );
  const selectedScene: DemoScene = OLLO_DEMO_SCENES[selectedIndex]!;
  const previousScene = selectedIndex > 0 ? OLLO_DEMO_SCENES[selectedIndex - 1]! : null;
  const nextScene =
    selectedIndex < OLLO_DEMO_SCENES.length - 1
      ? OLLO_DEMO_SCENES[selectedIndex + 1]!
      : null;

  const sceneLocation = useMemo(() => {
    for (const act of OLLO_DEMO_PROJECT.acts)
      for (const sequence of act.sequences)
        if (sequence.scenes.some((scene) => scene.id === selectedSceneId))
          return { actId: act.id, sequenceId: sequence.id };
    return null;
  }, [selectedSceneId]);

  const revealSelectedScene = () => {
    if (!sceneLocation) return;
    setCollapsedActs((current) => {
      const next = new Set(current);
      next.delete(sceneLocation.actId);
      return next;
    });
    setCollapsedSequences((current) => {
      const next = new Set(current);
      next.delete(sceneLocation.sequenceId);
      return next;
    });
  };

  return (
    <main className="pv1-page" data-testid="pv1-studio">
      <header className="pv1-topbar">
        <span className="pv1-brand">StoryStage</span>
        <span className="pv1-topbar-context">{projectTitle}</span>
        <span className="pv1-studio-badges">
          <span className="pv1-badge">{grammarLabel}</span>
          <span className="pv1-badge">{artStyleLabel}</span>
        </span>
        <span className="pv1-banner" role="note">
          {LOCAL_DEMO_BANNER}
        </span>
        <button
          className="pv1-secondary"
          onClick={onBackToProjects}
          type="button"
        >
          <ArrowLeft size={15} aria-hidden /> Back to projects
        </button>
      </header>

      <div className="pv1-studio-layout">
        {usesLayoutDemo ? (
          <p className="pv1-layout-demo-note" role="note">
            Layout demo — the eight scenes below are the bounded Ollo demo
            plan, not scenes from your script. Script-specific scenes have
            not been planned or generated yet.
          </p>
        ) : null}
        <nav aria-label="Episode hierarchy" className="pv1-studio-rail">
          {OLLO_DEMO_PROJECT.acts.map((act) => {
            const actCollapsed = collapsedActs.has(act.id);
            const actHidesSelected =
              sceneLocation?.actId === act.id && actCollapsed;
            return (
              <section className="pv1-rail-act" key={act.id}>
                <h2>
                  <button
                    aria-expanded={!actCollapsed}
                    className="pv1-group-toggle"
                    onClick={() =>
                      setCollapsedActs((current) => toggle(current, act.id))
                    }
                    type="button"
                  >
                    {actCollapsed ? (
                      <ChevronRight size={13} aria-hidden />
                    ) : (
                      <ChevronDown size={13} aria-hidden />
                    )}
                    {act.title}
                  </button>
                </h2>
                {actHidesSelected ? (
                  <p className="pv1-hidden-selection" role="note">
                    <span>
                      Selected scene {selectedIndex + 1} · {selectedScene.title}
                    </span>
                    <button onClick={revealSelectedScene} type="button">
                      <LocateFixed size={12} aria-hidden /> Reveal
                    </button>
                  </p>
                ) : null}
                {!actCollapsed
                  ? act.sequences.map((sequence) => {
                      const sequenceCollapsed = collapsedSequences.has(
                        sequence.id,
                      );
                      const sequenceHidesSelected =
                        sceneLocation?.sequenceId === sequence.id &&
                        sequenceCollapsed;
                      return (
                        <div className="pv1-rail-sequence" key={sequence.id}>
                          <h3>
                            <button
                              aria-expanded={!sequenceCollapsed}
                              className="pv1-group-toggle"
                              onClick={() =>
                                setCollapsedSequences((current) =>
                                  toggle(current, sequence.id),
                                )
                              }
                              type="button"
                            >
                              {sequenceCollapsed ? (
                                <ChevronRight size={12} aria-hidden />
                              ) : (
                                <ChevronDown size={12} aria-hidden />
                              )}
                              {sequence.title}
                            </button>
                          </h3>
                          {sequenceHidesSelected ? (
                            <p className="pv1-hidden-selection" role="note">
                              <span>
                                Selected scene {selectedIndex + 1} ·{" "}
                                {selectedScene.title}
                              </span>
                              <button onClick={revealSelectedScene} type="button">
                                <LocateFixed size={12} aria-hidden /> Reveal
                              </button>
                            </p>
                          ) : null}
                          {!sequenceCollapsed
                            ? sequence.scenes.map((scene) => {
                                const index = OLLO_DEMO_SCENES.indexOf(scene);
                                const isSelected = scene.id === selectedSceneId;
                                return (
                                  <div key={scene.id}>
                                    <button
                                      aria-current={
                                        isSelected ? "true" : undefined
                                      }
                                      aria-label={`Scene ${index + 1} ${scene.title} — ${scene.seconds} seconds, not produced`}
                                      className={`pv1-rail-scene ${isSelected ? "is-selected" : ""}`}
                                      onClick={() =>
                                        setSelectedSceneId(scene.id)
                                      }
                                      type="button"
                                    >
                                      <span className="pv1-scene-index">
                                        {index + 1}
                                      </span>
                                      <span className="pv1-rail-scene-body">
                                        <strong>{scene.title}</strong>
                                        <small>
                                          {scene.seconds}s · not produced
                                        </small>
                                      </span>
                                    </button>
                                    {isSelected ? (
                                      <ol
                                        aria-label={`Beats in ${scene.title}`}
                                        className="pv1-rail-beats"
                                      >
                                        {scene.beats.map((beat) => (
                                          <li
                                            data-beat-for={scene.id}
                                            key={beat.title}
                                          >
                                            <span>{beat.title}</span>
                                            <small>{beat.seconds}s</small>
                                          </li>
                                        ))}
                                      </ol>
                                    ) : null}
                                  </div>
                                );
                              })
                            : null}
                        </div>
                      );
                    })
                  : null}
              </section>
            );
          })}
        </nav>

        <section aria-label="Scene board" className="pv1-studio-board">
          <header className="pv1-board-heading">
            <div>
              <small>
                Scene {selectedIndex + 1} of {OLLO_DEMO_SCENES.length}
              </small>
              <h1>{selectedScene.title}</h1>
            </div>
            <span className="pv1-badge">Reference board — not animation</span>
          </header>
          <div className="pv1-board-canvas">
            {/* Reference art is ordinary browser UI, not a Remotion composition. */}
            {/* eslint-disable-next-line @remotion/warn-native-media-tag */}
            <img
              alt="Ollo & Friends cast reference art"
              src={olloCastArt}
            />
            <p className="pv1-board-note">
              Local reference art only — no imagery, animation, audio, or
              render exists for this scene.
            </p>
          </div>
          <div className="pv1-board-beats">
            <h2>Beats in this scene</h2>
            <ol>
              {selectedScene.beats.map((beat) => (
                <li data-beat-for={selectedScene.id} key={beat.title}>
                  <strong>{beat.title}</strong>
                  <span>{beat.seconds}s</span>
                </li>
              ))}
            </ol>
          </div>
          <div className="pv1-playhead">
            <label htmlFor="pv1-playhead-slider">
              Scene playhead{" "}
              <small>local UI timing — not media playback</small>
            </label>
            <input
              aria-label={`Scene playhead for ${selectedScene.title} — local UI timing, not media playback`}
              aria-valuetext={`${formatClock(playheadSeconds)} of ${formatClock(selectedScene.seconds)}`}
              id="pv1-playhead-slider"
              max={selectedScene.seconds}
              min={0}
              onChange={(event) =>
                setPlayheadSeconds(Number(event.target.value))
              }
              step={1}
              type="range"
              value={playheadSeconds}
            />
            <span aria-live="polite" className="pv1-playhead-readout">
              {formatClock(playheadSeconds)} /{" "}
              {formatClock(selectedScene.seconds)}
            </span>
          </div>
          <div
            aria-label="Scene transport"
            className="pv1-transport"
            role="group"
          >
            <button
              aria-label="Previous scene"
              disabled={!previousScene}
              onClick={() =>
                previousScene && setSelectedSceneId(previousScene.id)
              }
              type="button"
            >
              <ChevronLeft size={16} aria-hidden /> Previous
            </button>
            <span className="pv1-transport-readout" aria-live="polite">
              Scene {selectedIndex + 1} of {OLLO_DEMO_SCENES.length} ·{" "}
              {selectedScene.seconds}s · episode {formatClock(sceneStart(selectedScene.id))}–
              {formatClock(sceneStart(selectedScene.id) + selectedScene.seconds)} of{" "}
              {formatClock(OLLO_DEMO_TOTAL_SECONDS)}
            </span>
            <button
              aria-label="Next scene"
              disabled={!nextScene}
              onClick={() => nextScene && setSelectedSceneId(nextScene.id)}
              type="button"
            >
              Next <ChevronRight size={16} aria-hidden />
            </button>
          </div>
        </section>

        <aside aria-label="Studio inspector" className="pv1-studio-inspector">
          <div className="pv1-inspector-block">
            <h2>
              <Clapperboard size={15} aria-hidden /> Director
            </h2>
            <p>
              Director controls arrive in F3. This shell is a local scene
              review: you can move through the episode plan, but shot,
              action, camera, and audio editing are not here yet.
            </p>
          </div>
          <div className="pv1-inspector-block">
            <h2>
              <Film size={15} aria-hidden /> Preview &amp; export
            </h2>
            <button className="pv1-secondary" disabled type="button">
              Preview
            </button>
            <small>
              A real preview arrives after the WP2 Studio playhead work.
            </small>
            <button className="pv1-primary" disabled type="button">
              Export
            </button>
            <small>Export unlocks when production services connect.</small>
          </div>
        </aside>
      </div>

      <nav aria-label="Episode overview" className="pv1-studio-overview">
        {OLLO_DEMO_SCENES.map((scene, index) => {
          const isSelected = scene.id === selectedSceneId;
          return (
            <button
              aria-current={isSelected ? "true" : undefined}
              aria-label={`Scene ${index + 1} ${scene.title} — ${scene.seconds} seconds`}
              className={`pv1-overview-scene ${isSelected ? "is-selected" : ""}`}
              key={scene.id}
              onClick={() => setSelectedSceneId(scene.id)}
              type="button"
            >
              <span className="pv1-scene-index">{index + 1}</span>
              <strong>{scene.title}</strong>
              <small>{scene.seconds}s</small>
            </button>
          );
        })}
      </nav>
    </main>
  );
}
