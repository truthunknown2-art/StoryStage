import { useMemo, useState } from "react";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Clapperboard,
  Film,
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

/**
 * F2-WP1 Studio shell: one selected scene identity drives the hierarchy
 * rail, the center scene-board, the transport readout, and the episode
 * overview. Frontend-only; reference art is labelled honestly; Director
 * controls arrive in F3.
 */
export function StudioShell({
  onBackToProjects,
  projectTitle,
}: {
  onBackToProjects: () => void;
  projectTitle: string;
}) {
  const [selectedSceneId, setSelectedSceneId] = useState<string>(
    OLLO_DEMO_SCENES[0]!.id,
  );

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

  return (
    <main className="pv1-page" data-testid="pv1-studio">
      <header className="pv1-topbar">
        <span className="pv1-brand">StoryStage</span>
        <span className="pv1-topbar-context">{projectTitle}</span>
        <span className="pv1-studio-badges">
          <span className="pv1-badge">{OLLO_DEMO_PROJECT.grammar}</span>
          <span className="pv1-badge">{OLLO_DEMO_PROJECT.artStyle}</span>
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
        <nav aria-label="Episode hierarchy" className="pv1-studio-rail">
          {OLLO_DEMO_PROJECT.acts.map((act) => (
            <section className="pv1-rail-act" key={act.id}>
              <h2>{act.title}</h2>
              {act.sequences.map((sequence) => (
                <div className="pv1-rail-sequence" key={sequence.id}>
                  <h3>{sequence.title}</h3>
                  {sequence.scenes.map((scene) => {
                    const index = OLLO_DEMO_SCENES.indexOf(scene);
                    const isSelected = scene.id === selectedSceneId;
                    return (
                      <button
                        aria-current={isSelected ? "true" : undefined}
                        aria-label={`Scene ${index + 1} ${scene.title} — ${scene.seconds} seconds, not produced`}
                        className={`pv1-rail-scene ${isSelected ? "is-selected" : ""}`}
                        key={scene.id}
                        onClick={() => setSelectedSceneId(scene.id)}
                        type="button"
                      >
                        <span className="pv1-scene-index">{index + 1}</span>
                        <span className="pv1-rail-scene-body">
                          <strong>{scene.title}</strong>
                          <small>{scene.seconds}s · not produced</small>
                        </span>
                      </button>
                    );
                  })}
                </div>
              ))}
            </section>
          ))}
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
                <li key={beat.title}>
                  <strong>{beat.title}</strong>
                  <span>{beat.seconds}s</span>
                </li>
              ))}
            </ol>
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
            <small>A real preview arrives with the WP2 Studio playhead.</small>
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
