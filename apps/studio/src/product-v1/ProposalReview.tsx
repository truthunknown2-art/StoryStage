import { ArrowLeft, ListChecks } from "lucide-react";
import { formatDuration } from "./beat-preview";
import { AI_FIXTURE_LABEL } from "./ai-director-fixture";
import type { CreateProposal } from "./create-proposal";

/**
 * F3-WP4: the one shared pre-project **Review proposal** surface. Both
 * entry paths (**Paste a script** and **What's your idea?**) converge on
 * this component and cannot bypass it: the only way into Studio is the
 * plainly-labelled local-demo action at the bottom.
 */
export function ProposalReview({
  proposal,
  onDiscard,
  onEnterStudio,
  onRevise,
}: {
  proposal: CreateProposal;
  onDiscard: () => void;
  onEnterStudio: () => void;
  onRevise: () => void;
}) {
  return (
    <article aria-label="Review proposal" className="pv1-proposal-review">
      <header className="pv1-proposal-review-heading">
        <div>
          <small>
            <ListChecks size={13} aria-hidden /> Review proposal ·{" "}
            {proposal.templateLabel}
          </small>
          <h1>{proposal.episodeTitle}</h1>
        </div>
        <span className="pv1-badge">
          {proposal.source === "paste" ? "From your script" : "From your idea"}
        </span>
      </header>
      <p className="pv1-ai-fixture-note" role="note">
        {AI_FIXTURE_LABEL} — this is a deterministic local proposal for your
        review, not a generated production screenplay.
      </p>

      <section
        aria-label="Proposed episode hierarchy"
        className="pv1-proposal-hierarchy"
      >
        <h2>Proposed episode, scenes, and beats</h2>
        <ol>
          {proposal.scenes.map((scene) => (
            <li className="pv1-proposal-scene" key={scene.title}>
              <div className="pv1-proposal-scene-heading">
                <strong>{scene.title}</strong>
                <small>{formatDuration(scene.seconds)}</small>
              </div>
              <p className="pv1-proposal-direction">{scene.direction}</p>
              <ol>
                {scene.beats.map((beat) => (
                  <li className="pv1-proposal-beat" key={beat.title}>
                    <div className="pv1-proposal-scene-heading">
                      <span>{beat.title}</span>
                      <small>{formatDuration(beat.seconds)}</small>
                    </div>
                    <p className="pv1-proposal-direction">{beat.direction}</p>
                  </li>
                ))}
              </ol>
            </li>
          ))}
        </ol>
        {proposal.hiddenBeatCount > 0 ? (
          <p className="pv1-muted">
            and {proposal.hiddenBeatCount} more detected{" "}
            {proposal.hiddenBeatCount === 1 ? "beat" : "beats"} not listed
            individually in this review
          </p>
        ) : null}
      </section>

      <dl className="pv1-proposal-facts">
        <div>
          <dt>Direction summary</dt>
          <dd>{proposal.directionSummary}</dd>
        </div>
        <div>
          <dt>Affected range</dt>
          <dd>{proposal.affectedRangeLabel}</dd>
        </div>
        <div>
          <dt>Asset impact</dt>
          <dd>{proposal.assetImpactLabel}</dd>
        </div>
      </dl>

      <p className="pv1-proposal-demo-note" role="note">
        Entering Studio is local demo navigation only — no production project,
        media, render, or export has been created.
      </p>
      <div className="pv1-proposal-actions">
        <button className="pv1-secondary" onClick={onRevise} type="button">
          <ArrowLeft size={14} aria-hidden /> Revise input
        </button>
        <button className="pv1-secondary" onClick={onDiscard} type="button">
          Start over
        </button>
        <button className="pv1-primary" onClick={onEnterStudio} type="button">
          Enter Studio — local demo only
        </button>
      </div>
    </article>
  );
}
