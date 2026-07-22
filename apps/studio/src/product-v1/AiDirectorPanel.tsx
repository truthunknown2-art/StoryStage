import { useEffect, useRef, useState } from "react";
import { Sparkles } from "lucide-react";
import {
  AI_FIXTURE_LABEL,
  AI_STREAM_STAGES,
  AI_TURN_STATUS_LABELS,
  AI_TOOL_ACTIVITY_LABELS,
  advanceAiTurn,
  aiApplyBlocker,
  applyProposalToBeatState,
  canApplyAiTurn,
  canUndoProposalApply,
  cancelAiTurn,
  completeAiTurn,
  formatAiClock,
  isAiConnected,
  rejectAiTurnProposal,
  startAiTurn,
  supersedePendingProposals,
  undoProposalApply,
  type AiAppliedRevision,
  type AiConnectionState,
  type AiTurn,
} from "./ai-director-fixture";
import { ConnectAiDirector } from "./ConnectAiDirector";
import type { DemoScene } from "./demo-project";
import {
  committedDirectDraft,
  directBeatKey,
  initialBeatDirectState,
  type BeatDirectState,
} from "./direct-history";

/** Deterministic fixture replay pacing for the streamed-progress states.
 * This is a labelled local replay, not a live stream. */
const STREAM_STAGE_MS = 200;

const beatStartSeconds = (scene: DemoScene, beatIndex: number) =>
  scene.beats.slice(0, beatIndex).reduce((sum, beat) => sum + beat.seconds, 0);

/**
 * F3-WP4: docked right-side **AI Director** conversation/proposal panel.
 * The visual board stays the primary surface; this panel keeps one
 * persistent local fixture thread with immutable captured scope, honest
 * streamed-progress and tool-activity fixture labels, and one clearly
 * scoped proposal. Preview/Revise/Reject never change direction. Apply
 * commits exactly one `performanceDirection` change to the captured beat
 * through the accepted session-local per-beat history and fails closed
 * on stale selection or unapplied manual drafts; Undo restores the exact
 * prior snapshot. It can never call a host or production adapter.
 */
export function AiDirectorPanel({
  connection,
  directByBeat,
  onCommitBeat,
  onConnectionChange,
  onPlayheadChange,
  onReturnToScope,
  playheadSeconds,
  selectedBeatIndex,
  selectedScene,
  selectedSceneIndex,
}: {
  connection: AiConnectionState;
  directByBeat: Record<string, BeatDirectState>;
  onCommitBeat: (beatKey: string, next: BeatDirectState) => void;
  onConnectionChange: (next: AiConnectionState) => void;
  onPlayheadChange: (seconds: number) => void;
  onReturnToScope: (sceneId: string, beatIndex: number) => void;
  playheadSeconds: number;
  selectedBeatIndex: number;
  selectedScene: DemoScene;
  selectedSceneIndex: number;
}) {
  const [turns, setTurns] = useState<AiTurn[]>([]);
  const [requestText, setRequestText] = useState("");
  const [nextTurnId, setNextTurnId] = useState(1);
  const [appliedSnapshots, setAppliedSnapshots] = useState<
    Record<number, AiAppliedRevision>
  >({});
  const [previewTurnId, setPreviewTurnId] = useState<number | null>(null);
  const timersRef = useRef<number[]>([]);
  const connectionRef = useRef(connection);
  useEffect(() => {
    connectionRef.current = connection;
  }, [connection]);
  useEffect(
    () => () => {
      timersRef.current.forEach((timer) => window.clearTimeout(timer));
    },
    [],
  );

  const selectedBeat = selectedScene.beats[selectedBeatIndex]!;
  const connected = isAiConnected(connection);

  const scheduleTurnReplay = (turnId: number) => {
    AI_STREAM_STAGES.forEach((_, index) => {
      timersRef.current.push(
        window.setTimeout(
          () =>
            setTurns((current) =>
              current.map((turn) =>
                turn.id === turnId ? advanceAiTurn(turn) : turn,
              ),
            ),
          STREAM_STAGE_MS * (index + 1),
        ),
      );
    });
    // Completion settles against the connection fixture at completion
    // time: a disconnected drop resolves to the Error turn state, never
    // to a phantom applied result.
    timersRef.current.push(
      window.setTimeout(
        () =>
          setTurns((current) =>
            current.map((turn) =>
              turn.id === turnId
                ? completeAiTurn(turn, connectionRef.current)
                : turn,
            ),
          ),
        STREAM_STAGE_MS * (AI_STREAM_STAGES.length + 1),
      ),
    );
  };

  const sendRequest = () => {
    const text = requestText.trim();
    if (!connected || text.length === 0) return;
    const start = beatStartSeconds(selectedScene, selectedBeatIndex);
    const turnId = nextTurnId;
    // Request scope is captured immutably here; later selection changes
    // can never retarget this request or its proposal.
    const turn = startAiTurn(turnId, text, {
      sceneId: selectedScene.id,
      sceneIndex: selectedSceneIndex + 1,
      sceneTitle: selectedScene.title,
      beatIndex: selectedBeatIndex,
      beatTitle: selectedBeat.title,
      playheadSeconds,
      rangeStartSeconds: start,
      rangeEndSeconds: start + selectedBeat.seconds,
    });
    setTurns((current) => [...supersedePendingProposals(current), turn]);
    setNextTurnId((id) => id + 1);
    setRequestText("");
    setPreviewTurnId(null);
    scheduleTurnReplay(turnId);
  };

  const settleTurn = (turnId: number, step: (turn: AiTurn) => AiTurn) =>
    setTurns((current) =>
      current.map((turn) => (turn.id === turnId ? step(turn) : turn)),
    );

  const beatStateFor = (turn: AiTurn): BeatDirectState =>
    directByBeat[directBeatKey(turn.scope.sceneId, turn.scope.beatIndex)] ??
    initialBeatDirectState();

  const applyTurn = (turn: AiTurn) => {
    if (!canApplyAiTurn(turn) || !turn.proposal) return;
    const beatState = beatStateFor(turn);
    const blocker = aiApplyBlocker({
      scope: turn.scope,
      selectedSceneId: selectedScene.id,
      selectedBeatIndex,
      beatState,
    });
    if (blocker !== null) return;
    const next = applyProposalToBeatState(beatState, turn.proposal);
    if (next === beatState) return; // already carries exactly this direction
    onCommitBeat(directBeatKey(turn.scope.sceneId, turn.scope.beatIndex), next);
    // Bind later Undo to the exact history revision this apply created —
    // never to field equality with a later, different commit.
    setAppliedSnapshots((current) => ({
      ...current,
      [turn.id]: { revision: next.cursor, node: committedDirectDraft(next) },
    }));
    settleTurn(turn.id, (current) => ({ ...current, resolution: "applied" }));
  };

  const undoTurnApply = (turn: AiTurn) => {
    const applied = appliedSnapshots[turn.id];
    if (!applied) return;
    const beatState = beatStateFor(turn);
    if (!canUndoProposalApply(beatState, applied)) return;
    onCommitBeat(
      directBeatKey(turn.scope.sceneId, turn.scope.beatIndex),
      undoProposalApply(beatState),
    );
    setAppliedSnapshots((current) => {
      const next = { ...current };
      delete next[turn.id];
      return next;
    });
    settleTurn(turn.id, (current) => ({ ...current, resolution: "pending" }));
  };

  const renderProposal = (turn: AiTurn) => {
    const proposal = turn.proposal;
    if (!proposal) return null;
    const beatState = beatStateFor(turn);
    const blocker = aiApplyBlocker({
      scope: turn.scope,
      selectedSceneId: selectedScene.id,
      selectedBeatIndex,
      beatState,
    });
    const alreadyMatches =
      committedDirectDraft(beatState).performanceDirection ===
      proposal.performanceDirection;
    const applicable = canApplyAiTurn(turn);
    const appliedRevision = appliedSnapshots[turn.id];
    const undoable =
      turn.resolution === "applied" &&
      appliedRevision !== undefined &&
      canUndoProposalApply(beatState, appliedRevision);

    return (
      <div
        className="pv1-ai-proposal"
        data-testid={`pv1-ai-proposal-${turn.id}`}
      >
        <h3>{proposal.summary}</h3>
        <dl className="pv1-ai-proposal-facts">
          <div>
            <dt>Proposed performance direction</dt>
            <dd>{proposal.performanceDirection}</dd>
          </div>
          <div>
            <dt>Affected range</dt>
            <dd>{proposal.affectedRangeLabel}</dd>
          </div>
          <div>
            <dt>Affected assets</dt>
            <dd>
              {proposal.affectedAssets.join("; ")} — no production assets exist
              to touch.
            </dd>
          </div>
          <div>
            <dt>Tool activity (fixture replay)</dt>
            <dd>{AI_TOOL_ACTIVITY_LABELS.join(" · ")}</dd>
          </div>
        </dl>
        <ul aria-label="Proposal markers" className="pv1-ai-markers">
          {proposal.markers.map((marker) => (
            <li key={marker.label}>
              {formatAiClock(marker.seconds)} · {marker.label}
            </li>
          ))}
        </ul>
        {previewTurnId === turn.id ? (
          <div className="pv1-ai-preview" role="note">
            <p>
              <strong>Current committed direction:</strong>{" "}
              {committedDirectDraft(beatState).performanceDirection ||
                "(empty)"}
            </p>
            <p>
              <strong>Proposed direction:</strong>{" "}
              {proposal.performanceDirection}
            </p>
            <p>Preview only — no direction has changed.</p>
          </div>
        ) : null}
        <div className="pv1-ai-proposal-actions">
          <button
            className="pv1-secondary"
            onClick={() =>
              setPreviewTurnId((current) =>
                current === turn.id ? null : turn.id,
              )
            }
            type="button"
          >
            Preview proposal
          </button>
          <button
            className="pv1-secondary"
            disabled={turn.resolution !== "pending"}
            onClick={() => setRequestText(turn.requestText)}
            type="button"
          >
            Revise request
          </button>
          <button
            className="pv1-secondary"
            disabled={turn.resolution !== "pending"}
            onClick={() => settleTurn(turn.id, rejectAiTurnProposal)}
            type="button"
          >
            Reject proposal
          </button>
          <button
            className="pv1-primary"
            disabled={!applicable || blocker !== null || alreadyMatches}
            onClick={() => applyTurn(turn)}
            type="button"
          >
            Apply proposal
          </button>
          {turn.resolution === "applied" ? (
            <button
              className="pv1-secondary"
              disabled={!undoable}
              onClick={() => undoTurnApply(turn)}
              type="button"
            >
              Undo proposal apply
            </button>
          ) : null}
        </div>
        <p aria-live="polite" className="pv1-ai-proposal-status">
          {turn.resolution === "applied"
            ? undoable
              ? "Applied to the captured beat's session-local direction — Undo restores the exact prior snapshot."
              : "Applied. This beat's history changed afterwards, so panel Undo is closed — use the Director workspace Undo."
            : turn.resolution === "rejected"
              ? "Rejected — no direction was changed."
              : turn.resolution === "superseded"
                ? "Superseded by a newer request — it can no longer be applied."
                : blocker === "stale-scope"
                  ? "Apply is closed: the current selection differs from the captured scope."
                  : blocker === "unapplied-manual-draft"
                    ? "Apply is closed: the captured beat has unapplied manual drafts. Apply or undo them in the Director workspace first."
                    : alreadyMatches
                      ? "This beat's committed direction already matches the proposal — nothing to apply."
                      : "Pending — Preview, Revise, and Reject change no direction."}
        </p>
        {applicable && blocker === "stale-scope" ? (
          <button
            className="pv1-secondary"
            onClick={() =>
              onReturnToScope(turn.scope.sceneId, turn.scope.beatIndex)
            }
            type="button"
          >
            Return to captured scope
          </button>
        ) : null}
      </div>
    );
  };

  return (
    <aside
      aria-label="AI Director"
      className="pv1-ai-panel"
      data-testid="pv1-ai-director"
    >
      <header className="pv1-ai-panel-heading">
        <h2>
          <Sparkles size={15} aria-hidden /> AI Director
        </h2>
        <p className="pv1-ai-fixture-note" role="note">
          {AI_FIXTURE_LABEL}
        </p>
      </header>

      <p className="pv1-ai-scope">
        Scope: Scene {selectedSceneIndex + 1} · Beat {selectedBeatIndex + 1} —{" "}
        {selectedBeat.title}
      </p>
      <dl className="pv1-ai-labels">
        <div>
          <dt>Shot</dt>
          <dd>No shots planned — beat scope only</dd>
        </div>
        <div>
          <dt>Characters</dt>
          <dd>Ollo · Tix · Dot (fixture cast labels)</dd>
        </div>
      </dl>
      <div className="pv1-ai-scrubber">
        <label htmlFor="pv1-ai-scrubber-slider">
          Scene duration scrubber{" "}
          <small>local UI timing — not media playback</small>
        </label>
        <input
          aria-label={`AI Director scene scrubber for ${selectedScene.title} — local UI timing, not media playback`}
          aria-valuetext={`${formatAiClock(playheadSeconds)} of ${formatAiClock(selectedScene.seconds)}`}
          id="pv1-ai-scrubber-slider"
          max={selectedScene.seconds}
          min={0}
          onChange={(event) => onPlayheadChange(Number(event.target.value))}
          step={1}
          type="range"
          value={playheadSeconds}
        />
        <span className="pv1-playhead-readout">
          {formatAiClock(playheadSeconds)} /{" "}
          {formatAiClock(selectedScene.seconds)}
        </span>
      </div>

      <ol
        aria-label="AI Director conversation thread"
        className="pv1-ai-thread"
      >
        {turns.length === 0 ? (
          <li className="pv1-ai-thread-empty">
            No requests yet — this session's fixture conversation appears here
            and stays when you change scenes or beats.
          </li>
        ) : (
          turns.map((turn) => (
            <li className="pv1-ai-turn" key={turn.id}>
              <p className="pv1-ai-turn-request">“{turn.requestText}”</p>
              <p className={`pv1-ai-turn-status is-${turn.status}`}>
                {AI_TURN_STATUS_LABELS[turn.status]} (fixture turn)
              </p>
              {turn.status === "streaming" ? (
                <>
                  <ul
                    aria-label="Streamed progress (fixture replay)"
                    className="pv1-ai-stages"
                  >
                    {AI_STREAM_STAGES.map((stage, index) => (
                      <li
                        className={index <= turn.stageIndex ? "is-done" : ""}
                        key={stage}
                      >
                        {stage}
                      </li>
                    ))}
                  </ul>
                  {turn.resolution === "superseded" ? (
                    <p className="pv1-ai-turn-note">
                      Superseded by a newer request — finishing its fixture
                      replay; it can never become applicable, applied, or
                      undoable.
                    </p>
                  ) : (
                    <button
                      className="pv1-secondary"
                      onClick={() => settleTurn(turn.id, cancelAiTurn)}
                      type="button"
                    >
                      Cancel request
                    </button>
                  )}
                </>
              ) : null}
              {turn.status === "complete" &&
              turn.resolution === "superseded" &&
              turn.proposal === null ? (
                <p className="pv1-ai-turn-note">
                  Superseded by a newer request before a proposal was produced —
                  nothing was applied.
                </p>
              ) : null}
              {turn.status === "cancelled" ? (
                <p className="pv1-ai-turn-note">
                  Cancelled before a proposal was produced — the captured scope
                  below is preserved and nothing was applied.
                </p>
              ) : null}
              {turn.status === "error" ? (
                <p className="pv1-ai-turn-note">
                  The fixture connection was not Connected when the turn settled
                  — no proposal was produced and nothing was applied.
                </p>
              ) : null}
              <ul aria-label="Captured scope" className="pv1-ai-captured-scope">
                <li>
                  Scene {turn.scope.sceneIndex} · {turn.scope.sceneTitle}
                </li>
                <li>
                  Beat {turn.scope.beatIndex + 1} · {turn.scope.beatTitle}
                </li>
                <li>Playhead {formatAiClock(turn.scope.playheadSeconds)}</li>
                <li>
                  Range {formatAiClock(turn.scope.rangeStartSeconds)}–
                  {formatAiClock(turn.scope.rangeEndSeconds)}
                </li>
              </ul>
              {turn.status === "cancelled" || turn.status === "error" ? (
                <button
                  className="pv1-secondary"
                  onClick={() => setRequestText(turn.requestText)}
                  type="button"
                >
                  Revise and resend
                </button>
              ) : null}
              {renderProposal(turn)}
            </li>
          ))
        )}
      </ol>

      {connected ? (
        <form
          className="pv1-ai-composer"
          onSubmit={(event) => {
            event.preventDefault();
            sendRequest();
          }}
        >
          <label>
            <span>Ask the AI Director about the selected beat</span>
            <textarea
              aria-label="AI Director request"
              onChange={(event) => setRequestText(event.target.value)}
              placeholder="Describe the direction change you want — a labelled local fixture answers."
              rows={2}
              value={requestText}
            />
          </label>
          <button
            className="pv1-primary"
            disabled={requestText.trim().length === 0}
            type="submit"
          >
            Send request
          </button>
        </form>
      ) : (
        <ConnectAiDirector
          connection={connection}
          onConnectionChange={onConnectionChange}
        />
      )}
    </aside>
  );
}
