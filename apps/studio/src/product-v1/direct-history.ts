/**
 * F3-WP2/F3-WP3 session-local direction drafts and per-beat immutable
 * history.
 *
 * Every selected beat owns one independent `BeatDirectState`: the visible
 * draft, the immutable list of committed snapshots, and a cursor marking
 * the current committed snapshot. Snapshots after the cursor are the redo
 * branch. Apply — from the Direct, Visual, or Motion tab — commits the
 * complete eight-field draft as one atomic step; applying an unchanged
 * draft is a no-op so it can never create a phantom undo step. Undo/Redo
 * move the cursor and synchronize the visible draft to the restored
 * committed snapshot. Applying a different draft after Undo truncates only
 * that beat's redo branch.
 *
 * The eight fields are the three accepted Direct fields (Beat purpose,
 * Performance direction, Continuity note) plus the five F3-WP3 planning
 * intents: Framing and Composition focus (Visual); Camera intent,
 * Performance pace, and End hold (Motion). Every value is direction intent
 * only — nothing here creates keyframes, executes a camera, retimes a
 * beat, animates a rig, modifies imagery, or renders media.
 *
 * The demo model has no durable beat ID, so state is keyed by a
 * deterministic UI-local identity derived from the authoritative scene ID
 * plus the beat index. This is session-local UI state only — nothing here
 * is a production schema, is persisted, or is interpreted by AI.
 */

export const FRAMING_OPTIONS = [
  "Unspecified",
  "Wide",
  "Medium",
  "Close-up",
] as const;
export type FramingIntent = (typeof FRAMING_OPTIONS)[number];

export const CAMERA_INTENT_OPTIONS = [
  "Unspecified",
  "Locked-off",
  "Gentle push",
  "Gentle pull",
  "Follow action",
] as const;
export type CameraIntent = (typeof CAMERA_INTENT_OPTIONS)[number];

export const PERFORMANCE_PACE_OPTIONS = [
  "Unspecified",
  "Gentle",
  "Measured",
  "Energetic",
] as const;
export type PerformancePace = (typeof PERFORMANCE_PACE_OPTIONS)[number];

export const END_HOLD_OPTIONS = [
  "Unspecified",
  "No hold",
  "Brief hold",
  "Full hold",
] as const;
export type EndHold = (typeof END_HOLD_OPTIONS)[number];

/** Composition focus is plain text bounded to 240 characters. */
export const COMPOSITION_FOCUS_MAX_LENGTH = 240;

export interface DirectDraft {
  beatPurpose: string;
  performanceDirection: string;
  continuityNote: string;
  framing: FramingIntent;
  compositionFocus: string;
  cameraIntent: CameraIntent;
  performancePace: PerformancePace;
  endHold: EndHold;
}

export interface BeatDirectState {
  /** The visible draft. After Apply/Undo/Redo it always equals the current
   * committed snapshot; between edits it may differ (unapplied changes). */
  draft: DirectDraft;
  /** Committed snapshots, oldest first. Never empty (index 0 is the
   * initial empty snapshot). */
  history: DirectDraft[];
  /** Index of the current committed snapshot in `history`. Entries after
   * the cursor form the redo branch. */
  cursor: number;
}

export const EMPTY_DIRECT_DRAFT: DirectDraft = {
  beatPurpose: "",
  performanceDirection: "",
  continuityNote: "",
  framing: "Unspecified",
  compositionFocus: "",
  cameraIntent: "Unspecified",
  performancePace: "Unspecified",
  endHold: "Unspecified",
};

/** Deterministic UI-local beat identity for the demo model: authoritative
 * scene ID plus beat index. Not a production schema. */
export const directBeatKey = (sceneId: string, beatIndex: number) =>
  `${sceneId}::beat-${beatIndex}`;

export const initialBeatDirectState = (): BeatDirectState => ({
  draft: { ...EMPTY_DIRECT_DRAFT },
  history: [{ ...EMPTY_DIRECT_DRAFT }],
  cursor: 0,
});

export const directDraftsEqual = (a: DirectDraft, b: DirectDraft) =>
  a.beatPurpose === b.beatPurpose &&
  a.performanceDirection === b.performanceDirection &&
  a.continuityNote === b.continuityNote &&
  a.framing === b.framing &&
  a.compositionFocus === b.compositionFocus &&
  a.cameraIntent === b.cameraIntent &&
  a.performancePace === b.performancePace &&
  a.endHold === b.endHold;

export const canUndoDirect = (state: BeatDirectState) => state.cursor > 0;

export const canRedoDirect = (state: BeatDirectState) =>
  state.cursor < state.history.length - 1;

export const committedDirectDraft = (state: BeatDirectState): DirectDraft =>
  state.history[state.cursor]!;

export const hasUnappliedDirectChanges = (state: BeatDirectState) =>
  !directDraftsEqual(state.draft, committedDirectDraft(state));

/** True when the committed snapshot carries at least one Visual or Motion
 * value, so the board summary lists values instead of its empty state. */
export const hasCommittedVisualMotionDirection = (state: BeatDirectState) => {
  const committed = committedDirectDraft(state);
  return (
    committed.framing !== "Unspecified" ||
    committed.compositionFocus !== "" ||
    committed.cameraIntent !== "Unspecified" ||
    committed.performancePace !== "Unspecified" ||
    committed.endHold !== "Unspecified"
  );
};

/** Edit the visible draft only; committed history is untouched. */
export const updateDirectDraft = (
  state: BeatDirectState,
  patch: Partial<DirectDraft>,
): BeatDirectState => ({ ...state, draft: { ...state.draft, ...patch } });

/** Commit the complete current draft as one atomic history step. An
 * unchanged draft returns the same state — no phantom undo step. A
 * distinct draft after Undo truncates only this beat's redo branch. */
export const applyDirectDraft = (
  state: BeatDirectState,
): BeatDirectState => {
  if (!hasUnappliedDirectChanges(state)) return state;
  const history = [
    ...state.history.slice(0, state.cursor + 1),
    { ...state.draft },
  ];
  return { ...state, history, cursor: history.length - 1 };
};

/** Restore the prior committed snapshot and sync the visible draft to it. */
export const undoDirect = (state: BeatDirectState): BeatDirectState => {
  if (!canUndoDirect(state)) return state;
  const cursor = state.cursor - 1;
  return { ...state, cursor, draft: { ...state.history[cursor]! } };
};

/** Restore the exact undone committed snapshot and sync the visible
 * draft to it. */
export const redoDirect = (state: BeatDirectState): BeatDirectState => {
  if (!canRedoDirect(state)) return state;
  const cursor = state.cursor + 1;
  return { ...state, cursor, draft: { ...state.history[cursor]! } };
};
