import type { Cv002Project } from "@storystage/story-engine";
import type { DirectorProject } from "@storystage/story-engine/director-alpha";
import type { ReactNode } from "react";
import { DirectorFrameThumbnail } from "./director/DirectorFrameThumbnail";

const humanize = (value: string) => value.replaceAll("-", " ");

export function CreatorStudioShell({
  children,
  className,
}: {
  children: ReactNode;
  className: string;
}) {
  return <div className={className}>{children}</div>;
}

export const firstFrameForBeat = (
  director: DirectorProject,
  beatId: string,
) => {
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

export function CreatorSceneRail({
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
              return (
                <button
                  aria-label={`${sceneIndex + 1}.${beatIndex + 1} ${humanize(beat.role)} — Scene ${sceneIndex + 1}, beat ${beatIndex + 1}: ${beat.text}`}
                  aria-pressed={beat.id === selectedBeatId}
                  key={beat.id}
                  onClick={() => onSelectBeat(beat.id)}
                  type="button"
                >
                  <span className="cv2-direction-rail-thumbnail">
                    <DirectorFrameThumbnail episode={episode} frame={frame} />
                    <i>{sceneIndex + 1}.{beatIndex + 1}</i>
                  </span>
                  <span className="cv2-direction-rail-copy">
                    <strong>{humanize(beat.role)}</strong>
                    <small>{beat.text}</small>
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

export function CreatorBeatStrip({
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
                aria-label={`${sceneIndex + 1}.${beatIndex + 1} ${humanize(beat.role)} — Scene ${sceneIndex + 1}, beat ${beatIndex + 1}: ${beat.text}`}
                aria-pressed={beat.id === selectedBeatId}
                key={beat.id}
                onClick={() => onSelectBeat(beat.id)}
                type="button"
              >
                <DirectorFrameThumbnail episode={episode} frame={frame} />
                <span>{sceneIndex + 1}.{beatIndex + 1}</span>
                <small>{humanize(beat.role)}</small>
              </button>
            );
          }),
        )}
      </div>
    </nav>
  );
}
