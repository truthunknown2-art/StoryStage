import { ArrowLeft } from "lucide-react";
import olloCastArt from "../assets/ollo-friends-cast-v1.jpg";
import { LOCAL_DEMO_BANNER, OLLO_DEMO_PROJECT } from "./demo-project";

/**
 * Bounded long-form local demo: a 20-minute episode represented by concise
 * scene metadata so later phases can exercise long-form information
 * architecture. No imagery, animation, audio, or render exists for it.
 */
export function LongFormDemo({
  onBackToProjects,
}: {
  onBackToProjects: () => void;
}) {
  const totalSeconds = OLLO_DEMO_PROJECT.scenes.reduce(
    (sum, scene) => sum + scene.seconds,
    0,
  );

  return (
    <main className="pv1-page" data-testid="pv1-demo">
      <header className="pv1-topbar">
        <span className="pv1-brand">StoryStage</span>
        <span className="pv1-topbar-context">{OLLO_DEMO_PROJECT.title}</span>
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

      <section className="pv1-demo" aria-label="Local demo project">
        <div className="pv1-demo-hero">
          {/* Reference art is ordinary browser UI, not a Remotion composition. */}
          {/* eslint-disable-next-line @remotion/warn-native-media-tag */}
          <img alt="Ollo & Friends cast reference art" src={olloCastArt} />
          <div>
            <h1>{OLLO_DEMO_PROJECT.title}</h1>
            <p className="pv1-project-meta">
              {OLLO_DEMO_PROJECT.grammar} · {OLLO_DEMO_PROJECT.artStyle} ·{" "}
              {OLLO_DEMO_PROJECT.durationLabel}
            </p>
            <p className="pv1-handoff-truth">
              This local demo holds scene metadata only — no imagery,
              animation, audio, or render exists for it yet.
            </p>
          </div>
        </div>

        <div className="pv1-card">
          <h2>
            Scenes · {OLLO_DEMO_PROJECT.scenes.length} ·{" "}
            {Math.round(totalSeconds / 60)} min planned
          </h2>
          <ol className="pv1-scene-list">
            {OLLO_DEMO_PROJECT.scenes.map((scene, index) => (
              <li key={scene.title}>
                <span className="pv1-scene-index">{index + 1}</span>
                <strong>{scene.title}</strong>
                <span className="pv1-scene-meta">
                  {scene.seconds}s · not produced
                </span>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </main>
  );
}
