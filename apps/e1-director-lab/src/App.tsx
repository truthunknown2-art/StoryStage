import { useState } from "react";
import type { E1DirectorLabHost } from "./host";
import type { ProposalChange } from "./model";
import "./director-lab.css";

function label(value: string): string {
  return value
    .split("-")
    .map((word) => word[0]?.toUpperCase() + word.slice(1))
    .join(" ");
}

function describeChange(change: ProposalChange): {
  eyebrow: string;
  title: string;
  detail: string;
} {
  if (change.kind === "camera-intent") {
    return {
      eyebrow: "Camera",
      title: label(change.intent),
      detail: "Shot-local framing intent",
    };
  }
  if (change.kind === "layer-emphasis") {
    return {
      eyebrow: "Set layer",
      title: label(change.emphasis),
      detail: label(change.layerId),
    };
  }
  return {
    eyebrow: "Performance",
    title: label(change.cue),
    detail: `${label(change.entityId)} · ${label(change.capability)}`,
  };
}

export function E1DirectorLabApp({ host }: { host: E1DirectorLabHost }) {
  const { model } = host;
  const [previewing, setPreviewing] = useState(false);
  const [decision, setDecision] = useState<"pending" | "rejected">("pending");
  const toolEvents = model.timeline.filter((event) => event.tool);

  return (
    <main className="director-lab-shell">
      <header className="lab-topbar">
        <div className="brand-lockup">
          <span className="brand-mark" aria-hidden="true">
            S
          </span>
          <div>
            <strong>StoryStage</strong>
            <span>AI Director feasibility lab</span>
          </div>
        </div>
        <div className="run-status" aria-label="Live run status">
          <span className="status-dot" />
          Pinned runtime · complete
        </div>
        <div className="authority-chip">Proposal only</div>
      </header>

      <p className="lab-boundary">
        E1-WP3 ISOLATED SYNTHETIC LAB · LIVE RECORDED ROUND TRIP · NOTHING CAN
        BE APPLIED OR SAVED
      </p>

      <section className="lab-heading">
        <div>
          <span className="section-kicker">Direction revision</span>
          <h1>Review the AI Director’s proposal</h1>
          <p>
            A bounded idea travelled through the pinned Codex App Server and the
            fixed StoryStage MCP.
          </p>
        </div>
        <div className={`decision-state is-${decision}`}>
          <span>Review state</span>
          <strong>
            {decision === "pending" ? "Awaiting creator" : "Rejected locally"}
          </strong>
        </div>
      </section>

      <section className="lab-grid">
        <aside className="scope-card panel">
          <header>
            <span className="section-kicker">Selected scope</span>
            <strong>Cloud Garden</strong>
          </header>
          <dl>
            <div>
              <dt>Project</dt>
              <dd>Ollo &amp; Friends</dd>
              <code>{model.scope.projectId}</code>
            </div>
            <div>
              <dt>Scene</dt>
              <dd>The Cloud Garden Wakes</dd>
              <code>{model.scope.sceneId}</code>
            </div>
            <div>
              <dt>Beat</dt>
              <dd>Wind bell discovery</dd>
              <code>{model.scope.beatId}</code>
            </div>
          </dl>
          <div className="continuity-note">
            <span>Continuity guardrail</span>
            <p>
              The wind bell remains behind the silver fern until its first
              chime.
            </p>
          </div>
        </aside>

        <article className="proposal-card panel">
          <header className="proposal-header">
            <div>
              <span className="section-kicker">
                Validated ephemeral proposal
              </span>
              <h2>{model.proposal.summary}</h2>
            </div>
            <span className="validated-badge">Validated</span>
          </header>
          <p className="rationale">{model.proposal.rationale}</p>

          <div className="change-heading">
            <strong>Affected direction items</strong>
            <span>{model.proposal.changes.length} scoped changes</span>
          </div>
          <div className="change-list">
            {model.proposal.changes.map((change, index) => {
              const description = describeChange(change);
              return (
                <div className="change-row" key={`${change.kind}-${index}`}>
                  <span className="change-index">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <small>{description.eyebrow}</small>
                    <strong>{description.title}</strong>
                  </div>
                  <span>{description.detail}</span>
                </div>
              );
            })}
          </div>

          {previewing ? (
            <section className="preview-panel" aria-label="Proposal preview">
              <span>Read-only preview</span>
              <strong>{model.proposal.summary}</strong>
              <p>{model.proposal.rationale} No shot graph was changed.</p>
            </section>
          ) : null}
        </article>

        <aside className="trace-card panel">
          <header>
            <span className="section-kicker">Round-trip trace</span>
            <strong>Typed event stream</strong>
          </header>
          <ol className="trace-list">
            <li>
              <span className="trace-check">✓</span>
              <div>
                <strong>Project thread opened</strong>
                <small>Ephemeral · read-only</small>
              </div>
            </li>
            {toolEvents.map((event) => (
              <li key={event.sequence}>
                <span className="trace-check">✓</span>
                <div>
                  <strong>
                    {event.kind === "tool-started" ? "Started" : "Completed"}{" "}
                    {event.tool}
                  </strong>
                  <small>Event {event.sequence}</small>
                </div>
              </li>
            ))}
            <li>
              <span className="trace-check">✓</span>
              <div>
                <strong>Proposal validated</strong>
                <small>
                  {model.streamFragmentCount} streamed text fragments
                </small>
              </div>
            </li>
          </ol>
          <div className="runtime-note">
            <span>Runtime</span>
            <code>{model.runtimeVersion}</code>
            <small>{model.observedAt}</small>
          </div>
        </aside>
      </section>

      <footer className="review-actions">
        <div>
          <strong>Creator authority is preserved</strong>
          <span>{model.applyReason}</span>
        </div>
        <button
          className="secondary-action"
          type="button"
          disabled={decision === "rejected"}
          onClick={() => setPreviewing((value) => !value)}
        >
          {previewing ? "Close preview" : "Preview proposal"}
        </button>
        <button
          className="reject-action"
          type="button"
          disabled={decision === "rejected"}
          onClick={() => {
            setPreviewing(false);
            setDecision("rejected");
          }}
        >
          {decision === "rejected" ? "Rejected" : "Reject"}
        </button>
        <button
          className="apply-action"
          type="button"
          disabled
          title={model.applyReason}
        >
          Apply disabled
        </button>
      </footer>
    </main>
  );
}
