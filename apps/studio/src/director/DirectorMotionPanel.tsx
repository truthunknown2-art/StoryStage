import { listDirectorReactionDelayCandidates } from "@storystage/story-engine/director-alpha";
import type { DirectorProject } from "@storystage/story-engine/director-alpha";
import { Activity } from "lucide-react";

const humanize = (value: string) => value.replaceAll("-", " ");

export function DirectorMotionPanel({
  beatId,
  director,
}: {
  beatId: string;
  director: DirectorProject;
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
  // Same shared exact (event, shot) pair count that gates the command
  // control, so this panel never points at a control that is absent.
  const reactionCandidateCount = listDirectorReactionDelayCandidates(
    director,
    beatId,
  ).length;

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
      <p>
        Requested: {humanize(requested)} · Current first cut:{" "}
        {humanize(capability?.resolution ?? "proxy-only")}.
        {reactionCandidateCount === 1
          ? " Use “Direct this beat” above to retime the reaction."
          : reactionCandidateCount === 0
            ? " No editable reaction target exists on this beat, so delay editing is unavailable."
            : " Multiple reaction targets exist on this beat, and explicit target selection is not supported yet."}
      </p>
    </section>
  );
}
