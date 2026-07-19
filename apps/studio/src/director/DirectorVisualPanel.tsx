import {
  proposeDirectorVisualPatch,
  type DirectorPatch,
  type DirectorProject,
} from "@storystage/story-engine/director-alpha";
import { Camera, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

const SHOT_SIZES = [
  "extreme-wide",
  "wide",
  "medium",
  "close-up",
  "insert",
] as const;
const CAMERA_MOVEMENTS = [
  "locked",
  "pan",
  "track",
  "push",
  "pull",
  "reframe",
] as const;
const humanize = (value: string) => value.replaceAll("-", " ");

export function DirectorVisualPanel({
  beatId,
  director,
  onPreview,
}: {
  beatId: string;
  director: DirectorProject;
  onPreview: (patch: DirectorPatch) => void;
}) {
  const shots = useMemo(
    () =>
      director.directorPlan.shots.filter((shot) =>
        shot.beatIds.includes(beatId),
      ),
    [beatId, director.directorPlan.shots],
  );
  const [shotId, setShotId] = useState(shots[0]?.id ?? "");
  const selectedShot =
    shots.find((shot) => shot.id === shotId) ?? shots[0] ?? null;
  const [shotSize, setShotSize] = useState(selectedShot?.camera.size ?? "wide");
  const [cameraMovement, setCameraMovement] = useState(
    selectedShot?.camera.movement ?? "locked",
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const next = shots[0] ?? null;
    setShotId(next?.id ?? "");
    setShotSize(next?.camera.size ?? "wide");
    setCameraMovement(next?.camera.movement ?? "locked");
    setError(null);
  }, [beatId, director.contentHash, shots]);

  const selectShot = (nextShotId: string) => {
    const next = shots.find((shot) => shot.id === nextShotId);
    if (!next) return;
    setShotId(next.id);
    setShotSize(next.camera.size);
    setCameraMovement(next.camera.movement);
    setError(null);
  };

  const preview = () => {
    if (!selectedShot) return;
    try {
      onPreview(
        proposeDirectorVisualPatch({
          baseDirectorProject: director,
          targetBeatId: beatId,
          shotId: selectedShot.id,
          shotSize,
          cameraMovement,
        }),
      );
      setError(null);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "That visual change is not ready.",
      );
    }
  };

  if (!selectedShot) return <p>No shot is available on this beat.</p>;
  const changed =
    shotSize !== selectedShot.camera.size ||
    cameraMovement !== selectedShot.camera.movement;

  return (
    <section className="director-department-panel" aria-label="Visual controls">
      <header>
        <span>
          <Camera size={17} />
        </span>
        <div>
          <small>Visual</small>
          <strong>Frame the selected shot</strong>
        </div>
      </header>
      <label>
        Shot
        <select
          value={selectedShot.id}
          onChange={(event) => selectShot(event.target.value)}
        >
          {shots.map((shot, index) => (
            <option key={shot.id} value={shot.id}>
              {index + 1} · {humanize(shot.storyFunction)}
            </option>
          ))}
        </select>
      </label>
      <div className="director-control-pair">
        <label>
          Shot size
          <select
            aria-label="Shot size"
            value={shotSize}
            onChange={(event) =>
              setShotSize(event.target.value as (typeof SHOT_SIZES)[number])
            }
          >
            {SHOT_SIZES.map((size) => (
              <option key={size} value={size}>
                {humanize(size)}
              </option>
            ))}
          </select>
        </label>
        <label>
          Camera movement
          <select
            aria-label="Camera movement"
            value={cameraMovement}
            onChange={(event) =>
              setCameraMovement(
                event.target.value as (typeof CAMERA_MOVEMENTS)[number],
              )
            }
          >
            {CAMERA_MOVEMENTS.map((movement) => (
              <option key={movement} value={movement}>
                {humanize(movement)}
              </option>
            ))}
          </select>
        </label>
      </div>
      <p>
        These controls create a sealed Director patch and fully recompile the
        canonical cut.
      </p>
      {error ? <p role="alert">{error}</p> : null}
      <button disabled={!changed} onClick={preview} type="button">
        <Sparkles size={16} /> Preview visual change
      </button>
    </section>
  );
}
