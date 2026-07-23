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
  const [view, setView] = useState<"proposal" | "failure-gate">("proposal");
  const [selectedFailureId, setSelectedFailureId] = useState(
    "runtime-not-installed",
  );
  const [previewing, setPreviewing] = useState(false);
  const [decision, setDecision] = useState<"pending" | "rejected">("pending");
  const toolEvents = model.timeline.filter((event) => event.tool);
  const selectedFailure =
    model.failureGate.cases.find((entry) => entry.id === selectedFailureId) ??
    model.failureGate.cases[0];

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
        <div className="run-status" aria-label="Lab evidence status">
          <span className="status-dot" />
          {view === "proposal"
            ? "Pinned runtime · complete"
            : "Failure fixtures · verified"}
        </div>
        <div className="authority-chip">Proposal only</div>
      </header>

      <p className="lab-boundary">
        {view === "proposal"
          ? "E1-WP3 ISOLATED SYNTHETIC LAB · LIVE RECORDED ROUND TRIP · NOTHING CAN BE APPLIED OR SAVED"
          : "E1-WP4 DETERMINISTIC FAILURE FIXTURES · PRODUCTION SERVICES ARE NOT CONNECTED · APPLY REMAINS DISABLED"}
      </p>

      <nav className="lab-view-switch" aria-label="E1 evidence view">
        <button
          className={view === "proposal" ? "is-active" : undefined}
          type="button"
          aria-pressed={view === "proposal"}
          onClick={() => setView("proposal")}
        >
          Proposal proof
        </button>
        <button
          className={view === "failure-gate" ? "is-active" : undefined}
          type="button"
          aria-pressed={view === "failure-gate"}
          onClick={() => setView("failure-gate")}
        >
          Failure &amp; recovery
        </button>
      </nav>

      {view === "proposal" ? (
        <>
          <section className="lab-heading">
            <div>
              <span className="section-kicker">Direction revision</span>
              <h1>Review the AI Director&apos;s proposal</h1>
              <p>
                A bounded idea travelled through the pinned Codex App Server and
                the fixed StoryStage MCP.
              </p>
            </div>
            <div className={`decision-state is-${decision}`}>
              <span>Review state</span>
              <strong>
                {decision === "pending"
                  ? "Awaiting creator"
                  : "Rejected locally"}
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
                <section
                  className="preview-panel"
                  aria-label="Proposal preview"
                >
                  <span>Read-only preview</span>
                  <strong>{model.proposal.summary}</strong>
                  <p>
                    This preview reflects only the validated direction proposal.
                    No project, shot graph, asset, render, or saved state
                    changed.
                  </p>
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
                    <strong>Isolation proved before prompting</strong>
                    <small>Exactly one bounded StoryStage MCP</small>
                  </div>
                </li>
                {toolEvents.map((event) => (
                  <li key={event.sequence}>
                    <span className="trace-check">✓</span>
                    <div>
                      <strong>
                        {event.kind === "tool-started"
                          ? "Started"
                          : "Completed"}{" "}
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
        </>
      ) : selectedFailure ? (
        <>
          <section className="lab-heading failure-heading">
            <div>
              <span className="section-kicker">
                E1-WP4 feasibility evidence
              </span>
              <h1>Failure &amp; recovery gate</h1>
              <p>
                {model.failureGate.cases.length} deterministic negative states
                and {model.failureGate.securityChecks.length} security
                boundaries, with no live production service connected.
              </p>
            </div>
            <div className="decision-state is-rejected">
              <span>Authority state</span>
              <strong>Apply disabled</strong>
            </div>
          </section>

          <section className="failure-grid">
            <aside
              className="failure-matrix panel"
              aria-label="Failure state matrix"
            >
              <header>
                <span className="section-kicker">
                  Selectable fixture matrix
                </span>
                <strong>Creator-visible states</strong>
              </header>
              <div className="failure-case-list">
                {model.failureGate.cases.map((failureCase) => (
                  <button
                    className={
                      selectedFailure.id === failureCase.id
                        ? "is-selected"
                        : undefined
                    }
                    data-testid="failure-case"
                    type="button"
                    aria-pressed={selectedFailure.id === failureCase.id}
                    key={failureCase.id}
                    onClick={() => setSelectedFailureId(failureCase.id)}
                  >
                    <span>{failureCase.title}</span>
                    <code>{failureCase.code}</code>
                  </button>
                ))}
              </div>
            </aside>

            <article
              className="failure-detail panel"
              aria-label="Selected failure recovery"
            >
              <header>
                <div>
                  <span className="section-kicker">Selected failure</span>
                  <h2>{selectedFailure.title}</h2>
                </div>
                <span className="validated-badge is-invalid">
                  {label(selectedFailure.state)}
                </span>
              </header>
              <div className="failure-code">
                <span>Stable code</span>
                <code>{selectedFailure.code}</code>
              </div>
              <section>
                <span>What the creator sees</span>
                <p>{selectedFailure.creatorMessage}</p>
              </section>
              <section>
                <span>Recovery</span>
                <p>{selectedFailure.recoveryAction}</p>
              </section>
              <section>
                <span>Verified outcome</span>
                <p>{selectedFailure.recoveryOutcome}</p>
              </section>
              <div
                className="authority-locks"
                aria-label="Fail-closed guarantees"
              >
                <span>No automatic retry</span>
                <span>No hidden fallback</span>
                <span>No credential access</span>
                <span>No project mutation</span>
                <span>Apply remains disabled</span>
              </div>
              <p className="fixture-notice">
                Deterministic failure fixture only. This surface demonstrates
                the required creator message and recovery contract; it does not
                claim a production connection or production security.
              </p>
            </article>

            <aside className="security-card panel">
              <header>
                <span className="section-kicker">
                  Executable evidence index
                </span>
                <strong>Security boundaries</strong>
              </header>
              <ol>
                {model.failureGate.securityChecks.map((check) => (
                  <li key={check.id}>
                    <span aria-hidden="true">✓</span>
                    {label(check.id)}
                  </li>
                ))}
              </ol>
              <div className="limitations">
                <span>Retained limitations</span>
                {model.failureGate.knownLimitations.map((limitation) => (
                  <p key={limitation}>{limitation}</p>
                ))}
              </div>
            </aside>
          </section>

          <footer className="review-actions failure-actions">
            <div>
              <strong>Failure is visible; authority stays closed</strong>
              <span>
                Fixture selection changes only this local review surface. No
                retry, fallback, credential access, project write, or production
                call occurs.
              </span>
            </div>
            <button
              className="secondary-action"
              type="button"
              onClick={() => setView("proposal")}
            >
              Return to proposal
            </button>
            <button className="apply-action" type="button" disabled>
              Apply disabled
            </button>
          </footer>
        </>
      ) : null}
    </main>
  );
}
