import { Check, FlaskConical, Hash, Lock, TriangleAlert } from "lucide-react";
import type { RegistrationReviewPresentation } from "../presentation-model";

export function TopBar({
  aggregate,
  candidate,
}: {
  aggregate: RegistrationReviewPresentation["aggregate"];
  candidate: RegistrationReviewPresentation["candidate"];
}) {
  return (
    <header className="rr-topbar">
      <div className="rr-brand">
        <span className="rr-brand-mark">
          <FlaskConical size={18} />
        </span>
        <div>
          <strong>StoryStage</strong>
          <small>Private Rig Lab</small>
        </div>
      </div>
      <div className="rr-candidate">
        <strong>{candidate.label}</strong>
        <span className="rr-hash-chip" title={aggregate.contentHash}>
          <Hash size={12} />
          {aggregate.contentHash.slice(0, 12)}…
        </span>
      </div>
      <div className="rr-authority">
        <span className="rr-badge is-decision">
          <TriangleAlert size={13} />
          Needs registration correction
        </span>
        <span className="rr-badge is-locked">
          <Lock size={13} />
          Unapproved evidence
        </span>
        <span className="rr-badge is-locked">
          <Lock size={13} />
          Motion locked
        </span>
        {aggregate.allViewsAccepted ? (
          <span className="rr-badge is-note">
            <Check size={13} />
            Views accepted
          </span>
        ) : null}
      </div>
    </header>
  );
}
