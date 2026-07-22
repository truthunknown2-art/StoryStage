/**
 * F3-WP4 AI Director conversation/proposal shell — deterministic local
 * fixture state model.
 *
 * Everything in this module is a labelled UI fixture: no Codex App Server,
 * no MCP, no network, no credentials, and no live AI session exist here.
 * The connection model carries six independent fixture states; Cancelled
 * and Error are turn/result states that never overwrite the connection
 * state. Tool-activity labels reuse only the accepted E1 vocabulary
 * (`get_scene_context`, `submit_direction_proposal`) as vocabulary — the
 * E1 lab is never imported, called, or implied to be running.
 *
 * The one real state transition this module can perform is bounded: Apply
 * commits exactly one proposed `performanceDirection` change to the
 * immutable captured beat through the accepted session-local per-beat
 * history (`direct-history.ts`), and Undo restores the exact prior
 * snapshot. Apply fails closed when the current selection differs from
 * the captured scope or the captured beat carries unapplied manual
 * drafts. Nothing here can call a host or production adapter, persist a
 * project, or touch another beat or scene.
 */

import {
  applyDirectDraft,
  canUndoDirect,
  committedDirectDraft,
  directDraftsEqual,
  hasUnappliedDirectChanges,
  undoDirect,
  updateDirectDraft,
  type BeatDirectState,
  type DirectDraft,
} from "./direct-history";

/* ------------------------------------------------------------------ */
/* Connection fixtures (independent of turn/result state)              */
/* ------------------------------------------------------------------ */

export type AiConnectionState =
  | "connected"
  | "signed-out"
  | "offline"
  | "usage-limit"
  | "update-required"
  | "crashed";

export const AI_CONNECTION_STATES: readonly AiConnectionState[] = [
  "connected",
  "signed-out",
  "offline",
  "usage-limit",
  "update-required",
  "crashed",
];

export const AI_CONNECTION_LABELS: Record<AiConnectionState, string> = {
  connected: "Connected",
  "signed-out": "Signed out",
  offline: "Offline",
  "usage-limit": "Usage limit",
  "update-required": "Update required",
  crashed: "Crashed",
};

/** The one mandatory honesty label on every AI surface. */
export const AI_FIXTURE_LABEL =
  "Local AI Director fixture — no service connected";

export const isAiConnected = (state: AiConnectionState) =>
  state === "connected";

/** Deterministic fixture result for the runtime-check action. No real
 * runtime is launched, probed, or inferred. */
export const AI_RUNTIME_CHECK_RESULT =
  "Runtime check (fixture): no runtime was contacted. This demo never launches, probes, or verifies a real Codex App Server.";

/** Deterministic redacted diagnostics fixture. No credential, cookie,
 * token, path, MCP URL/JSON, terminal command, or account detail exists
 * to display, so every line is a literal placeholder. */
export const aiRedactedDiagnostics = (
  connection: AiConnectionState,
): readonly string[] => [
  "source: local-fixture (never a live session)",
  `connection.fixture-state: ${connection}`,
  "credentials: <redacted — never accessed>",
  "app-server: not launched",
  "mcp: not connected",
];

/* ------------------------------------------------------------------ */
/* Turn/result fixtures (independent of connection state)              */
/* ------------------------------------------------------------------ */

export type AiTurnStatus = "streaming" | "complete" | "cancelled" | "error";

export const AI_TURN_STATUS_LABELS: Record<AiTurnStatus, string> = {
  streaming: "Streaming",
  complete: "Complete",
  cancelled: "Cancelled",
  error: "Error",
};

/** Bounded tool-activity labels — accepted E1 vocabulary only, shown as
 * fixture replay. The E1 lab is never imported or called. */
export const AI_TOOL_ACTIVITY_LABELS = [
  "get_scene_context",
  "submit_direction_proposal",
] as const;

/** Deterministic streamed-progress stages shown while a turn is in
 * flight. This is a labelled fixture replay, not a live stream. */
export const AI_STREAM_STAGES: readonly string[] = [
  "Capturing the selected scene and beat scope",
  "get_scene_context (fixture tool activity)",
  "Drafting the direction proposal",
  "submit_direction_proposal (fixture tool activity)",
];

/* ------------------------------------------------------------------ */
/* Captured scope and proposal model                                   */
/* ------------------------------------------------------------------ */

/** Immutable request scope: captured once when the request is sent and
 * never retargeted by later selection changes. */
export interface AiCapturedScope {
  sceneId: string;
  /** 1-based scene position for display. */
  sceneIndex: number;
  sceneTitle: string;
  beatIndex: number;
  beatTitle: string;
  playheadSeconds: number;
  rangeStartSeconds: number;
  rangeEndSeconds: number;
}

export const captureAiScope = (scope: AiCapturedScope): AiCapturedScope => ({
  ...scope,
});

export interface AiProposalMarker {
  seconds: number;
  label: string;
}

/** One structured, time-anchored fixture direction proposal. The only
 * project-direction field it may ever change is `performanceDirection`
 * on the captured beat. */
export interface AiDirectionProposal {
  turnId: number;
  scope: AiCapturedScope;
  summary: string;
  performanceDirection: string;
  affectedRangeLabel: string;
  affectedAssets: readonly string[];
  markers: readonly AiProposalMarker[];
}

export const formatAiClock = (totalSeconds: number) => {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
};

const requestExcerpt = (text: string, maxWords = 12) => {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const excerpt = words.slice(0, maxWords).join(" ");
  return words.length > maxWords ? `${excerpt}…` : excerpt;
};

/** Deterministic local proposal builder: the same request and captured
 * scope always produce the same proposal. No generation occurs. */
export const buildFixtureProposal = (
  turnId: number,
  requestText: string,
  scope: AiCapturedScope,
): AiDirectionProposal => ({
  turnId,
  scope,
  summary: `Re-direct Beat ${scope.beatIndex + 1} “${scope.beatTitle}” around your request`,
  performanceDirection: `Play “${scope.beatTitle}” so the moment lands first: ${requestExcerpt(requestText)}`,
  affectedRangeLabel: `Beat ${scope.beatIndex + 1} only · ${formatAiClock(scope.rangeStartSeconds)}–${formatAiClock(scope.rangeEndSeconds)} of the scene`,
  affectedAssets: [
    `Scene ${scope.sceneIndex} · Beat ${scope.beatIndex + 1} session-local direction metadata`,
  ],
  markers: [
    { seconds: scope.rangeStartSeconds, label: "Beat start" },
    { seconds: scope.playheadSeconds, label: "Captured playhead" },
  ],
});

/* ------------------------------------------------------------------ */
/* Turn model and pure transitions                                     */
/* ------------------------------------------------------------------ */

export type AiProposalResolution =
  | "pending"
  | "applied"
  | "rejected"
  | "superseded";

export interface AiTurn {
  id: number;
  requestText: string;
  /** Immutable captured scope — selection changes never retarget it. */
  scope: AiCapturedScope;
  status: AiTurnStatus;
  /** Index into AI_STREAM_STAGES while streaming. */
  stageIndex: number;
  proposal: AiDirectionProposal | null;
  resolution: AiProposalResolution;
}

export const startAiTurn = (
  id: number,
  requestText: string,
  scope: AiCapturedScope,
): AiTurn => ({
  id,
  requestText,
  scope: captureAiScope(scope),
  status: "streaming",
  stageIndex: 0,
  proposal: null,
  resolution: "pending",
});

/** Advance the streamed-progress fixture by one stage. No-op unless the
 * turn is still streaming. */
export const advanceAiTurn = (turn: AiTurn): AiTurn => {
  if (turn.status !== "streaming") return turn;
  if (turn.stageIndex >= AI_STREAM_STAGES.length - 1) return turn;
  return { ...turn, stageIndex: turn.stageIndex + 1 };
};

/** Complete a streaming turn. Fails closed to the Error turn state when
 * the connection fixture is not Connected at completion time; Cancelled
 * turns and already-settled turns can never complete. */
export const completeAiTurn = (
  turn: AiTurn,
  connection: AiConnectionState,
): AiTurn => {
  if (turn.status !== "streaming") return turn;
  if (!isAiConnected(connection)) return { ...turn, status: "error" };
  return {
    ...turn,
    status: "complete",
    proposal: buildFixtureProposal(turn.id, turn.requestText, turn.scope),
  };
};

/** Cancel a streaming turn. The captured scope is preserved; no proposal
 * is produced and nothing can ever appear applied. */
export const cancelAiTurn = (turn: AiTurn): AiTurn =>
  turn.status === "streaming" ? { ...turn, status: "cancelled" } : turn;

/** Reject a completed, still-pending proposal. Rejection never changes
 * project direction. */
export const rejectAiTurnProposal = (turn: AiTurn): AiTurn =>
  turn.status === "complete" && turn.resolution === "pending"
    ? { ...turn, resolution: "rejected" }
    : turn;

/** A newer request supersedes every earlier still-pending proposal, so
 * only one clearly scoped proposal can be applied at a time. */
export const supersedePendingProposals = (turns: readonly AiTurn[]): AiTurn[] =>
  turns.map((turn) =>
    turn.status === "complete" && turn.resolution === "pending"
      ? { ...turn, resolution: "superseded" }
      : turn,
  );

/** Only a completed, still-pending turn with a proposal can be applied.
 * Rejected, cancelled, error, and superseded turns can never appear
 * applied. */
export const canApplyAiTurn = (turn: AiTurn) =>
  turn.status === "complete" &&
  turn.resolution === "pending" &&
  turn.proposal !== null;

/* ------------------------------------------------------------------ */
/* Bounded apply/undo through the accepted session-local history       */
/* ------------------------------------------------------------------ */

export type AiApplyBlocker = "stale-scope" | "unapplied-manual-draft" | null;

/** Fail-closed Apply guard: the current selection must still be the
 * captured scope, and the captured beat must not carry unapplied manual
 * drafts. */
export const aiApplyBlocker = (args: {
  scope: AiCapturedScope;
  selectedSceneId: string;
  selectedBeatIndex: number;
  beatState: BeatDirectState;
}): AiApplyBlocker => {
  if (
    args.scope.sceneId !== args.selectedSceneId ||
    args.scope.beatIndex !== args.selectedBeatIndex
  )
    return "stale-scope";
  if (hasUnappliedDirectChanges(args.beatState))
    return "unapplied-manual-draft";
  return null;
};

/** Commit exactly the proposed `performanceDirection` to the captured
 * beat through the accepted per-beat history. The guard above guarantees
 * the visible draft equals the committed snapshot, so the atomic commit
 * carries exactly one changed field; if the beat already carries exactly
 * this direction the commit is a truthful no-op (same state object). */
export const applyProposalToBeatState = (
  state: BeatDirectState,
  proposal: AiDirectionProposal,
): BeatDirectState =>
  applyDirectDraft(
    updateDirectDraft(state, {
      performanceDirection: proposal.performanceDirection,
    }),
  );

/** Fail-closed Undo guard for a proposal apply: the captured beat's
 * committed head must still be exactly the snapshot the apply produced,
 * with no unapplied manual drafts and a prior snapshot to restore. Any
 * later manual commit disables the panel Undo honestly. */
export const canUndoProposalApply = (
  beatState: BeatDirectState,
  appliedSnapshot: DirectDraft,
): boolean =>
  canUndoDirect(beatState) &&
  !hasUnappliedDirectChanges(beatState) &&
  directDraftsEqual(committedDirectDraft(beatState), appliedSnapshot);

/** Restore the exact prior committed snapshot of the captured beat. */
export const undoProposalApply = (state: BeatDirectState): BeatDirectState =>
  undoDirect(state);
