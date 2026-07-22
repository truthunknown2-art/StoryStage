import { useState } from "react";
import { ChevronDown, ChevronUp, CircleDot } from "lucide-react";
import {
  AI_CONNECTION_LABELS,
  AI_CONNECTION_STATES,
  AI_FIXTURE_LABEL,
  AI_RUNTIME_CHECK_RESULT,
  aiRedactedDiagnostics,
  isAiConnected,
  type AiConnectionState,
} from "./ai-director-fixture";

/**
 * F3-WP4: the one truthful AI Director status chip rendered in Create and
 * Studio, plus the compact **Settings → AI Director** surface. Every
 * action is a deterministic local fixture action: it transitions only
 * local demo state, contacts nothing, and never exposes credentials,
 * tokens, URLs, terminal commands, or diagnostics detail.
 */
export function AiDirectorControls({
  connection,
  onConnectionChange,
}: {
  connection: AiConnectionState;
  onConnectionChange: (next: AiConnectionState) => void;
}) {
  const [open, setOpen] = useState(false);
  const [runtimeCheckShown, setRuntimeCheckShown] = useState(false);
  const [diagnosticsShown, setDiagnosticsShown] = useState(false);

  return (
    <div className="pv1-ai-controls">
      <button
        aria-expanded={open}
        aria-label={`AI Director status: ${AI_CONNECTION_LABELS[connection]} — open AI Director settings`}
        className={`pv1-ai-chip ${isAiConnected(connection) ? "is-connected" : ""}`}
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        <CircleDot size={12} aria-hidden />
        AI Director: {AI_CONNECTION_LABELS[connection]}
        {open ? (
          <ChevronUp size={12} aria-hidden />
        ) : (
          <ChevronDown size={12} aria-hidden />
        )}
      </button>
      {open ? (
        <section aria-label="AI Director settings" className="pv1-ai-settings">
          <h2>Settings → AI Director</h2>
          <p className="pv1-ai-fixture-note" role="note">
            {AI_FIXTURE_LABEL}
          </p>
          <label className="pv1-ai-settings-field">
            <span>Connection fixture state</span>
            <select
              aria-label="Connection fixture state"
              onChange={(event) =>
                onConnectionChange(event.target.value as AiConnectionState)
              }
              value={connection}
            >
              {AI_CONNECTION_STATES.map((state) => (
                <option key={state} value={state}>
                  {AI_CONNECTION_LABELS[state]}
                </option>
              ))}
            </select>
          </label>
          <div className="pv1-ai-settings-actions">
            <button
              className="pv1-secondary"
              disabled={isAiConnected(connection)}
              onClick={() => onConnectionChange("connected")}
              type="button"
            >
              Reconnect
            </button>
            <button
              className="pv1-secondary"
              disabled={connection === "signed-out"}
              onClick={() => onConnectionChange("signed-out")}
              type="button"
            >
              Sign out
            </button>
            <button
              className="pv1-secondary"
              onClick={() => setRuntimeCheckShown((current) => !current)}
              type="button"
            >
              Run runtime check
            </button>
            <button
              className="pv1-secondary"
              onClick={() => setDiagnosticsShown((current) => !current)}
              type="button"
            >
              View redacted diagnostics
            </button>
          </div>
          <p className="pv1-ai-settings-truth">
            These are local fixture actions — they change only this demo's
            labelled state and contact nothing.
          </p>
          {runtimeCheckShown ? (
            <p className="pv1-ai-settings-result" role="status">
              {AI_RUNTIME_CHECK_RESULT}
            </p>
          ) : null}
          {diagnosticsShown ? (
            <ul
              aria-label="Redacted diagnostics (fixture)"
              className="pv1-ai-diagnostics"
            >
              {aiRedactedDiagnostics(connection).map((line) => (
                <li key={line}>
                  <code>{line}</code>
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
