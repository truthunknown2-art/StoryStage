import { useState } from "react";
import { PlugZap } from "lucide-react";
import {
  AI_CONNECTION_LABELS,
  AI_FIXTURE_LABEL,
  AI_RUNTIME_CHECK_RESULT,
  type AiConnectionState,
} from "./ai-director-fixture";

/**
 * F3-WP4: compact **Connect AI Director** surface shown when the creator
 * reaches an AI surface while signed out or disconnected. The runtime
 * check and **Sign in with ChatGPT** are labelled fixture actions that
 * transition only local demo state — no account, credential, cookie,
 * token, or real runtime is ever contacted.
 */
export function ConnectAiDirector({
  connection,
  onConnectionChange,
}: {
  connection: AiConnectionState;
  onConnectionChange: (next: AiConnectionState) => void;
}) {
  const [runtimeCheckShown, setRuntimeCheckShown] = useState(false);
  const signedOut = connection === "signed-out";

  return (
    <section aria-label="Connect AI Director" className="pv1-ai-connect">
      <h2>
        <PlugZap size={15} aria-hidden /> Connect AI Director
      </h2>
      <p className="pv1-ai-connect-state">
        Current state: <strong>{AI_CONNECTION_LABELS[connection]}</strong>
      </p>
      <p className="pv1-ai-fixture-note" role="note">
        {AI_FIXTURE_LABEL}
      </p>
      <div className="pv1-ai-connect-actions">
        {signedOut ? (
          <button
            className="pv1-primary"
            onClick={() => onConnectionChange("connected")}
            type="button"
          >
            Sign in with ChatGPT
          </button>
        ) : (
          <button
            className="pv1-primary"
            onClick={() => onConnectionChange("connected")}
            type="button"
          >
            Reconnect
          </button>
        )}
        <button
          className="pv1-secondary"
          onClick={() => setRuntimeCheckShown((current) => !current)}
          type="button"
        >
          Run runtime check
        </button>
      </div>
      <p className="pv1-ai-connect-truth">
        {signedOut
          ? "A local fixture action — no real ChatGPT account is contacted and no credential is requested or stored."
          : "A local fixture action — it changes only this demo's labelled state and contacts nothing."}
      </p>
      {runtimeCheckShown ? (
        <p className="pv1-ai-settings-result" role="status">
          {AI_RUNTIME_CHECK_RESULT}
        </p>
      ) : null}
    </section>
  );
}
