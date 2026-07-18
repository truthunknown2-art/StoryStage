import { Player } from "@remotion/player";
import { DirectorProductionComposition } from "@storystage/remotion-runtime/director";
import {
  compileDirectorProject,
  type Cv002Project,
  type DirectorProject,
} from "@storystage/story-engine/director-alpha";
import {
  AlertTriangle,
  Check,
  Clapperboard,
  Film,
  ShieldCheck,
} from "lucide-react";
import { useMemo } from "react";

type CompileResult =
  | { directorProject: DirectorProject; error: null }
  | { directorProject: null; error: string };

export function DirectorAnimaticPreview({
  project,
}: {
  project: Cv002Project;
}) {
  const compiled = useMemo<CompileResult>(() => {
    try {
      return {
        directorProject: compileDirectorProject({ storyProject: project }),
        error: null,
      };
    } catch (caught) {
      return {
        directorProject: null,
        error:
          caught instanceof Error
            ? caught.message
            : "The Director could not compile this script.",
      };
    }
  }, [project]);

  if (!compiled.directorProject)
    return (
      <section className="cv2-director-blocked" role="alert">
        <AlertTriangle size={20} />
        <div>
          <strong>Director animatic needs attention</strong>
          <span>{compiled.error}</span>
        </div>
      </section>
    );

  const director = compiled.directorProject;
  const episode = director.executableEpisodePlan;
  const shots = director.directorPlan.shots.length;
  const beats = director.directorPlan.beats.length;
  const scenes = director.directorPlan.scenes.length;
  const capabilities = director.capabilityReport.summary;
  return (
    <section
      className="cv2-director-preview"
      data-episode-hash={episode.contentHash}
      aria-label="Directed animatic draft"
    >
      <header>
        <div className="cv2-director-preview-title">
          <span>
            <Clapperboard size={20} />
          </span>
          <div>
            <small>Director Studio Alpha</small>
            <h2>Directed animatic draft</h2>
          </div>
        </div>
        <div className="cv2-director-ready">
          <Check size={15} />
          <span>Canonical plan ready</span>
        </div>
      </header>
      <div className="cv2-director-player">
        <Player
          acknowledgeRemotionLicense
          allowFullscreen
          autoPlay
          component={DirectorProductionComposition}
          compositionHeight={episode.format.height}
          compositionWidth={episode.format.width}
          controls
          durationInFrames={episode.format.durationInFrames}
          fps={episode.format.fps}
          inputProps={{ episodePlan: episode }}
          loop
          style={{
            aspectRatio: `${episode.format.width} / ${episode.format.height}`,
            width: "100%",
          }}
        />
      </div>
      <footer>
        <div className="cv2-director-metrics">
          <span>
            <Film size={15} />
            <strong>{scenes}</strong> scenes
          </span>
          <span>
            <strong>{beats}</strong> beats
          </span>
          <span>
            <strong>{shots}</strong> motivated shots
          </span>
          <span>
            <strong>
              {Math.ceil(episode.format.durationInFrames / episode.format.fps)}s
            </strong>{" "}
            estimated
          </span>
        </div>
        <div className="cv2-director-capability">
          <ShieldCheck size={16} />
          <div>
            <strong>
              {capabilities.supported} final-ready · {capabilities.proxyOnly}{" "}
              proxy-only
            </strong>
            <span>Final animation capabilities are not fully assigned.</span>
          </div>
        </div>
      </footer>
      <details className="cv2-plan-proof">
        <summary>Advanced plan proof</summary>
        <span>Browser episode plan</span>
        <code>{episode.contentHash}</code>
      </details>
    </section>
  );
}
