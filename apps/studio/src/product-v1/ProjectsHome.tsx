import { Plus } from "lucide-react";
import olloCastArt from "../assets/ollo-friends-cast-v1.jpg";
import { LOCAL_DEMO_BANNER, OLLO_DEMO_PROJECT } from "./demo-project";

/**
 * F1 Projects home: the default creator entry. Calm project list with a real
 * New project action, the labelled local Ollo demo card, and an
 * understandable empty state — no accounts, analytics, or production
 * bureaucracy.
 */
export function ProjectsHome({
  showDemoProject,
  onNewProject,
  onOpenDemo,
}: {
  showDemoProject: boolean;
  onNewProject: () => void;
  onOpenDemo: () => void;
}) {
  return (
    <main className="pv1-page" data-testid="pv1-projects">
      <header className="pv1-topbar">
        <span className="pv1-brand">
          StoryStage
        </span>
        <span className="pv1-banner" role="note">
          {LOCAL_DEMO_BANNER}
        </span>
      </header>

      <section className="pv1-projects-body" aria-label="Projects">
        <div className="pv1-projects-heading">
          <div>
            <h1>Projects</h1>
            <p>Your stories live here.</p>
          </div>
          <button className="pv1-primary" onClick={onNewProject} type="button">
            <Plus size={17} aria-hidden /> New project
          </button>
        </div>

        <div className="pv1-project-grid">
          {showDemoProject ? (
            <button
              aria-label={`Open local demo project ${OLLO_DEMO_PROJECT.title}`}
              className="pv1-project-card"
              onClick={onOpenDemo}
              type="button"
            >
              {/* Reference art is ordinary browser UI, not a Remotion composition. */}
              {/* eslint-disable-next-line @remotion/warn-native-media-tag */}
              <img
                alt="Ollo & Friends cast reference art"
                className="pv1-project-art"
                src={olloCastArt}
              />
              <span className="pv1-project-card-body">
                <strong>{OLLO_DEMO_PROJECT.title}</strong>
                <span className="pv1-project-meta">
                  {OLLO_DEMO_PROJECT.grammar} · {OLLO_DEMO_PROJECT.artStyle} ·{" "}
                  {OLLO_DEMO_PROJECT.durationLabel}
                </span>
                <span className="pv1-demo-badge">
                  {OLLO_DEMO_PROJECT.status}
                </span>
              </span>
            </button>
          ) : (
            <div className="pv1-empty" role="status">
              <strong>No projects yet</strong>
              <p>
                Create your first story — paste a script and StoryStage will
                find its natural beats.
              </p>
              <button
                className="pv1-primary"
                onClick={onNewProject}
                type="button"
              >
                <Plus size={17} aria-hidden /> New project
              </button>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
