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
        <div className="run-status is-blocked" aria-label="Blocked run status">
          <span className="status-dot" />
          Pinned runtime · blocked
        </div>
        <div className="authority-chip">Security stop</div>
      </header>

      <p className="lab-boundary">
        E1-WP3 EVIDENCE INVALIDATED · CREDENTIAL BOUNDARY BLOCKER · NOTHING
        CAN BE APPLIED OR SAVED
      </p>

      <section className="lab-heading">
        <div>
          <span className="section-kicker">Feasibility result</span>
          <h1>AI Director round trip blocked</h1>
          <p>
            Codex 0.144.1 cannot isolate the StoryStage MCP without exposing
            unrelated MCP configuration to the host.
          </p>
        </div>
        <div className="decision-state is-rejected">
          <span>Gate state</span>
          <strong>Blocked / fail closed</strong>
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
                Historical unaccepted output
              </span>
              <h2>{model.proposal.summary}</h2>
            </div>
            <span className="validated-badge is-invalid">Invalidated</span>
          </header>
          <p className="rationale">{model.proposal.rationale}</p>

          <section
            className="preview-panel is-blocker"
            aria-label="Security blocker"
          >
            <span>Credential boundary violation</span>
            <strong>No credential-safe MCP inventory is available.</strong>
            <p>{model.invalidatedReason}</p>
          </section>

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

        </article>

        <aside className="trace-card panel">
          <header>
            <span className="section-kicker">Round-trip trace</span>
            <strong>Historical typed trace</strong>
          </header>
          <ol className="trace-list">
            <li>
              <span className="trace-check">!</span>
              <div>
                <strong>Unsafe preflight preceded thread</strong>
                <small>Trace retained for diagnosis only</small>
              </div>
            </li>
            {toolEvents.map((event) => (
              <li key={event.sequence}>
                <span className="trace-check">!</span>
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
              <span className="trace-check">!</span>
              <div>
                <strong>Proposal evidence invalidated</strong>
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
          <strong>WP3 stopped at the security boundary</strong>
          <span>{model.invalidatedReason}</span>
        </div>
        <button
          className="secondary-action"
          type="button"
          disabled
        >
          Preview unavailable
        </button>
        <button
          className="reject-action"
          type="button"
          disabled
        >
          Reject unavailable
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
