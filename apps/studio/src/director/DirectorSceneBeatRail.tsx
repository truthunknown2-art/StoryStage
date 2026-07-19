import type {
  Cv002Project,
  DirectorProject,
} from "@storystage/story-engine/director-alpha";
import { DirectorFrameThumbnail } from "./DirectorFrameThumbnail";

const humanize = (value: string) => value.replaceAll("-", " ");

const firstFrameForBeat = (director: DirectorProject, beatId: string) => {
  const shotIds = new Set(
    director.directorPlan.shots
      .filter((shot) => shot.beatIds.includes(beatId))
      .map((shot) => shot.id),
  );
  return Math.min(
    ...director.timingSolution.resolvedShots
      .filter((shot) => shotIds.has(shot.shotId))
      .map((shot) => shot.startFrame),
  );
};

/** Real per-beat duration from the resolved timing solution, in seconds. */
const beatDurationSeconds = (director: DirectorProject, beatId: string) => {
  const shotIds = new Set(
    director.directorPlan.shots
      .filter((shot) => shot.beatIds.includes(beatId))
      .map((shot) => shot.id),
  );
  const frames = director.timingSolution.resolvedShots
    .filter((shot) => shotIds.has(shot.shotId))
    .reduce(
      (total, shot) => total + (shot.endFrameExclusive - shot.startFrame),
      0,
    );
  return frames / director.executableEpisodePlan.format.fps;
};

/** Honest capability state for the beat: performance-ready only when every
 * performance requirement resolved to a supported executable program. This is
 * performance-capability specific — ordinary rendering is still proxy-only,
 * so the creator-facing label must not imply full-beat render readiness. */
const beatIsPerformanceReady = (director: DirectorProject, beatId: string) => {
  const items = director.capabilityReport.items.filter(
    (item) => item.beatId === beatId,
  );
  return (
    items.length > 0 && items.every((item) => item.resolution === "supported")
  );
};

/** Accessible beat state suffix for the rail button name: the explicit
 * aria-label replaces descendant text, so duration and capability wording
 * must live in the name itself. */
const beatA11yMeta = (director: DirectorProject, beatId: string) =>
  `${beatDurationSeconds(director, beatId).toFixed(1)} seconds, ${
    beatIsPerformanceReady(director, beatId)
      ? "Performance ready"
      : "Proxy performance"
  }`;

/**
 * Boundary-safe scene rail for the Director Alpha surface. Mirrors the
 * creator-studio rail markup but imports only Director Alpha contracts, so the
 * Director import-boundary audit cannot reach legacy CV-001/showcase code.
 */
export function DirectorSceneRail({
  director,
  onSelectBeat,
  project,
  selectedBeatId,
}: {
  director: DirectorProject;
  onSelectBeat: (beatId: string) => void;
  project: Cv002Project;
  selectedBeatId: string;
}) {
  const episode = director.executableEpisodePlan;
  const beatCount = project.graph.scenes.flatMap((scene) => scene.beats).length;
  return (
    <aside className="cv2-direction-rail" aria-label="Studio scenes and beats">
      <header>
        <div>
          <small>Your story</small>
          <strong>Scenes</strong>
        </div>
        <span>{beatCount}</span>
      </header>
      <nav aria-label="Choose a scene or beat">
        {project.graph.scenes.map((scene, sceneIndex) => (
          <section key={scene.id}>
            <header>
              <span>Scene {sceneIndex + 1}</span>
              <small>{scene.beats.length} beats</small>
            </header>
            {scene.beats.map((beat, beatIndex) => {
              const frame = firstFrameForBeat(director, beat.id);
              const performanceReady = beatIsPerformanceReady(
                director,
                beat.id,
              );
              return (
                <button
                  aria-label={`${sceneIndex + 1}.${beatIndex + 1} ${humanize(beat.role)} — Scene ${sceneIndex + 1}, beat ${beatIndex + 1}: ${beat.text} · ${beatA11yMeta(director, beat.id)}`}
                  aria-pressed={beat.id === selectedBeatId}
                  key={beat.id}
                  onClick={() => onSelectBeat(beat.id)}
                  type="button"
                >
                  <span className="cv2-direction-rail-thumbnail">
                    <DirectorFrameThumbnail episode={episode} frame={frame} />
                    <i>
                      {sceneIndex + 1}.{beatIndex + 1}
                    </i>
                  </span>
                  <span className="cv2-direction-rail-copy">
                    <strong>{humanize(beat.role)}</strong>
                    <small>{beat.text}</small>
                    <span className="cv2-direction-rail-meta">
                      <em>
                        {beatDurationSeconds(director, beat.id).toFixed(1)}s
                      </em>
                      <i
                        className={
                          performanceReady ? "is-render-ready" : "is-proxy"
                        }
                      >
                        {performanceReady
                          ? "Performance ready"
                          : "Proxy performance"}
                      </i>
                    </span>
                  </span>
                </button>
              );
            })}
          </section>
        ))}
      </nav>
    </aside>
  );
}

/** Boundary-safe compact beat strip for the Director Alpha surface. */
export function DirectorBeatStrip({
  director,
  onSelectBeat,
  project,
  selectedBeatId,
}: {
  director: DirectorProject;
  onSelectBeat: (beatId: string) => void;
  project: Cv002Project;
  selectedBeatId: string;
}) {
  const episode = director.executableEpisodePlan;
  return (
    <nav className="cv2-beat-strip" aria-label="Compact beat strip">
      <header>
        <small>First cut</small>
        <strong>Beat strip</strong>
      </header>
      <div>
        {project.graph.scenes.flatMap((scene, sceneIndex) =>
          scene.beats.map((beat, beatIndex) => {
            const frame = firstFrameForBeat(director, beat.id);
            return (
              <button
                aria-label={`${sceneIndex + 1}.${beatIndex + 1} ${humanize(beat.role)} — Scene ${sceneIndex + 1}, beat ${beatIndex + 1}: ${beat.text} · ${beatDurationSeconds(director, beat.id).toFixed(1)} seconds`}
                aria-pressed={beat.id === selectedBeatId}
                key={beat.id}
                onClick={() => onSelectBeat(beat.id)}
                type="button"
              >
                <DirectorFrameThumbnail episode={episode} frame={frame} />
                <span>
                  {sceneIndex + 1}.{beatIndex + 1}
                </span>
                <small>{humanize(beat.role)}</small>
                <em className="cv2-beat-strip-duration">
                  {beatDurationSeconds(director, beat.id).toFixed(1)}s
                </em>
              </button>
            );
          }),
        )}
      </div>
    </nav>
  );
}
