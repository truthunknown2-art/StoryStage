import type { DirectorProject } from "@storystage/story-engine/director-alpha";
import { Activity, Sparkles } from "lucide-react";

const humanize = (value: string) => value.replaceAll("-", " ");

export function DirectorMotionPanel({
  beatId,
  command,
  director,
  error,
  onCommandChange,
  onPreview,
}: {
  beatId: string;
  command: string;
  director: DirectorProject;
  error: string | null;
  onCommandChange: (value: string) => void;
  onPreview: () => void;
}) {
  const beat = director.directorPlan.beats.find(
    (candidate) => candidate.beatId === beatId,
  )!;
  const reaction = director.directorPlan.events.find(
    (event) => event.beatId === beatId && event.kind === "reaction",
  );
  const capability = director.capabilityReport.items.find(
    (item) => item.beatId === beatId,
  );
  const requested = beat.performanceRequirements[0]?.source ?? "living-hold";

  return (
    <section className="director-department-panel" aria-label="Motion controls">
      <header>
        <span>
          <Activity size={17} />
        </span>
        <div>
          <small>Motion</small>
          <strong>Performance and reaction timing</strong>
        </div>
      </header>
      <dl className="director-motion-facts">
        <div>
          <dt>Performance requested</dt>
          <dd>{humanize(requested)}</dd>
        </div>
        <div>
          <dt>First-cut status</dt>
          <dd>{humanize(capability?.resolution ?? "proxy-only")}</dd>
        </div>
        <div>
          <dt>Reaction event</dt>
          <dd>{reaction ? reaction.id : "none on this beat"}</dd>
        </div>
        <div>
          <dt>Reaction delay</dt>
          <dd>{beat.reactionDelayFrames} frames</dd>
        </div>
      </dl>
      {reaction ? (
        <div className="director-motion-command">
          <label htmlFor="director-motion-note">Direction</label>
          <input
            aria-label="Direction for selected beat"
            id="director-motion-note"
            onChange={(event) => onCommandChange(event.target.value)}
            placeholder="Make the reaction 6 frames later"
            value={command}
          />
          <button
            aria-label="Preview change"
            disabled={!command.trim()}
            onClick={onPreview}
            type="button"
          >
            <Sparkles size={16} /> Preview motion change
          </button>
        </div>
      ) : (
        <p>
          This beat has no unique reaction event, so delay editing is
          unavailable.
        </p>
      )}
      <p>
        Requested: {humanize(requested)} · Current first cut:{" "}
        {humanize(capability?.resolution ?? "proxy-only")}
      </p>
      {error ? <p role="alert">{error}</p> : null}
    </section>
  );
}
