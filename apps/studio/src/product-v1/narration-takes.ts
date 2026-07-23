/**
 * F5-WP2 Narration recording, import, and take management — a deterministic,
 * typed, session-local UX state model over prototype metadata only.
 *
 * Everything in this module is a local UI walkthrough: no microphone,
 * permission prompt, device enumeration, stream, timer tied to real capture,
 * audio buffer, file dialog, file/path/blob read, decoded media, playback,
 * waveform, lip sync, mixing, persistence, provider, worker, backend, Godot,
 * Remotion, render, or export exists here, and nothing in this module can
 * create one. Permission-denied and missing-device states are deterministic
 * simulations for workflow review — they are not evidence that the browser
 * requested device access. A completed walkthrough is only a completed UI
 * state change, never a recording or import success claim.
 *
 * Scope truth: every prototype take is bound to the exact scene/beat scope in
 * which it was created, is visible only in that scope, and can never leak
 * into another track, scene, or beat. A scope or track change abandons any
 * unfinished walkthrough deterministically — nothing is lost, because no
 * audio ever exists.
 */

import type { AudioTrackId } from "./audio-workspace";
import type { DemoScene } from "./demo-project";

/* ------------------------------------------------------------------ */
/* Persistent truth vocabulary                                         */
/* ------------------------------------------------------------------ */

/** The one mandatory label, visible on every workflow state in the panel. */
export const NARRATION_PROTOTYPE_LABEL =
  "Local prototype — no audio is captured, imported, or played";

/** Panel-level truth note, always visible without hover. */
export const NARRATION_PANEL_TRUTH_NOTE =
  "Every recording, import, and take state in this panel is a deterministic local UI walkthrough over session-only prototype metadata: no microphone, permission prompt, device, file, audio bytes, playback, waveform, or persistence exists.";

/** Exact truth shown wherever a take's duration appears: it is declared
 * planning metadata, never a decoded or measured length. */
export const DECLARED_DURATION_TRUTH =
  "Declared planning duration — no audio was decoded or measured";

/* ------------------------------------------------------------------ */
/* Recording walkthrough state machine                                 */
/* ------------------------------------------------------------------ */

export const RECORDING_STATES = [
  "idle",
  "armed",
  "recording",
  "stopped",
  "cancelled",
  "interrupted",
  "permission-denied",
  "missing-device",
] as const;

export type RecordingState = (typeof RECORDING_STATES)[number];

export const RECORDING_EVENTS = [
  "arm",
  "start",
  "stop",
  "cancel",
  "interrupt",
  "simulate-permission-denied",
  "simulate-missing-device",
  "disarm",
  "keep",
  "retake",
  "discard-walkthrough",
  "arm-again",
  "dismiss",
] as const;

export type RecordingEvent = (typeof RECORDING_EVENTS)[number];

/** The complete permitted-transition table. Every recording path ends in an
 * explicit success (stopped → keep/discard), error (permission-denied,
 * missing-device, interrupted), or cancel (cancelled/dismissed) state. */
const RECORDING_TRANSITIONS: Record<
  RecordingState,
  Partial<Record<RecordingEvent, RecordingState>>
> = {
  idle: { arm: "armed" },
  armed: {
    start: "recording",
    "simulate-permission-denied": "permission-denied",
    "simulate-missing-device": "missing-device",
    disarm: "idle",
  },
  recording: {
    stop: "stopped",
    cancel: "cancelled",
    interrupt: "interrupted",
  },
  stopped: {
    keep: "idle",
    retake: "armed",
    "discard-walkthrough": "idle",
  },
  cancelled: { "arm-again": "armed", dismiss: "idle" },
  interrupted: { "arm-again": "armed", dismiss: "idle" },
  "permission-denied": { "arm-again": "armed", dismiss: "idle" },
  "missing-device": { "arm-again": "armed", dismiss: "idle" },
};

/** One deterministic reducer: returns the next state for a permitted
 * transition, or `null` for any event the current state does not permit, so
 * an impossible transition can never silently succeed. */
export const reduceRecording = (
  state: RecordingState,
  event: RecordingEvent,
): RecordingState | null => RECORDING_TRANSITIONS[state][event] ?? null;

/** The events a state permits, in display order, so the UI renders exactly
 * the controls that have a bounded state transition and nothing else. */
export const permittedRecordingEvents = (
  state: RecordingState,
): readonly RecordingEvent[] =>
  RECORDING_EVENTS.filter((event) => reduceRecording(state, event) !== null);

/** A scene, beat, or track change resolves any unfinished walkthrough
 * deterministically: it is abandoned and returns to idle. Nothing is lost —
 * the walkthrough never had a device, stream, or audio to lose. */
export const recordingAfterScopeChange = (): RecordingState => "idle";

export interface RecordingStateCopy {
  badge: string;
  detail: string;
}

/** Exact visible copy per state. Every state states that no audio is
 * captured and no media exists; failure states state they are deterministic
 * simulations for workflow review. */
export const recordingStateCopy = (
  state: RecordingState,
): RecordingStateCopy => {
  switch (state) {
    case "idle":
      return {
        badge: "No recording walkthrough in progress",
        detail:
          "Arm starts a deterministic local UI walkthrough. No microphone, permission prompt, device, stream, or audio buffer exists.",
      };
    case "armed":
      return {
        badge: "Armed — local UI walkthrough only",
        detail:
          "The walkthrough is armed. Arming never touches a microphone or a permission: there is no device to arm and no audio to capture.",
      };
    case "recording":
      return {
        badge: "Recording walkthrough in progress — no audio is captured",
        detail:
          "This is only a UI-state walkthrough: there is no microphone, stream, capture timer, or audio buffer, and nothing is recorded.",
      };
    case "stopped":
      return {
        badge: "Walkthrough stopped — review the prototype result",
        detail:
          "A stopped walkthrough is a completed UI state change only: no audio was captured and no media exists. Keep stores session-only prototype metadata; it never saves audio.",
      };
    case "cancelled":
      return {
        badge: "Recording walkthrough cancelled",
        detail:
          "The walkthrough was cancelled before completion — no audio was captured and nothing was created.",
      };
    case "interrupted":
      return {
        badge: "Recording walkthrough interrupted — simulated failure",
        detail:
          "A deterministic simulated interruption for workflow review. No stream existed, so no partial audio was captured and nothing needs cleanup.",
      };
    case "permission-denied":
      return {
        badge: "Microphone permission denied — simulated",
        detail:
          "A deterministic simulation for workflow review. The browser was never asked for device access and no permission prompt exists in this package.",
      };
    case "missing-device":
      return {
        badge: "No microphone found — simulated",
        detail:
          "A deterministic simulation for workflow review. No device was enumerated, because device access does not exist in this package.",
      };
  }
};

/* ------------------------------------------------------------------ */
/* Import walkthrough (fixture metadata only)                          */
/* ------------------------------------------------------------------ */

export interface ImportFixture {
  id: string;
  /** Declared fixture file name — metadata only, never a path that is
   * opened or read. */
  fileName: string;
  declaredFormat: string;
  declaredDurationSeconds: number;
  valid: boolean;
  description: string;
}

/** The deterministic chooser candidates. Two stand in for usable audio
 * files; one stands in for a file that is not audio, so the invalid-file
 * path is exercisable without any file API. */
export const IMPORT_FIXTURES: readonly ImportFixture[] = [
  {
    id: "fixture-welcome-wav",
    fileName: "morning-welcome-read.wav",
    declaredFormat: "WAV (declared fixture metadata)",
    declaredDurationSeconds: 12,
    valid: true,
    description:
      "A fixture entry standing in for a recorded read of the morning welcome.",
  },
  {
    id: "fixture-welcome-alt-mp3",
    fileName: "morning-welcome-alt-take.mp3",
    declaredFormat: "MP3 (declared fixture metadata)",
    declaredDurationSeconds: 15,
    valid: true,
    description:
      "A fixture entry standing in for an alternate, slower read of the welcome.",
  },
  {
    id: "fixture-notes-txt",
    fileName: "narration-notes.txt",
    declaredFormat: "Plain text (declared fixture metadata)",
    declaredDurationSeconds: 0,
    valid: false,
    description:
      "A fixture entry standing in for a file that is not audio, so the invalid-file result is reviewable.",
  },
];

export type ImportOutcome = "picked" | "invalid" | "empty" | "cancelled";

export type ImportState =
  | { kind: "closed" }
  | { kind: "chooser" }
  | { kind: "result"; outcome: ImportOutcome; fixture: ImportFixture | null };

/** Exact visible copy for every import result. Each states that no file was
 * opened, read, decoded, or stored. */
export const importResultCopy = (
  outcome: ImportOutcome,
  fixture: ImportFixture | null,
): string => {
  switch (outcome) {
    case "picked":
      return `Import walkthrough result — “${fixture?.fileName ?? "unknown"}” became session-only prototype take metadata. No file was opened, read, decoded, or stored; the name, format, and duration are declared fixture values.`;
    case "invalid":
      return `Import walkthrough result — “${fixture?.fileName ?? "unknown"}” is not an audio file StoryStage can plan with (${fixture?.declaredFormat ?? "unknown format"}). Nothing was imported, opened, or read.`;
    case "empty":
      return "Import walkthrough result — no file was chosen. Nothing was imported, opened, or read.";
    case "cancelled":
      return "Import walkthrough cancelled — nothing was chosen, imported, opened, or read.";
  }
};

/* ------------------------------------------------------------------ */
/* Prototype takes                                                     */
/* ------------------------------------------------------------------ */

export interface TakeValues {
  startSeconds: number;
  endSeconds: number;
  gainDb: number;
}

export interface PrototypeTake {
  id: string;
  sceneId: string;
  /** Zero-based beat index inside the scene, matching the Studio shell. */
  beatIndex: number;
  name: string;
  origin: "recording-walkthrough" | "import-fixture";
  /** One plain sentence proving the take is session metadata, not media. */
  originTruth: string;
  /** Declared planning duration in seconds — fixture/beat metadata, never a
   * decoded or measured audio length. */
  declaredDurationSeconds: number;
  status: "review" | "kept";
  /** Audition is a review mark only; it never plays audio. */
  auditioning: boolean;
  /** The declared values Restore returns the draft to. */
  restoreValues: TakeValues;
  /** The values last kept as session-only prototype metadata. */
  keptValues: TakeValues;
}

export const GAIN_BOUNDS = { minDb: -12, maxDb: 12 } as const;

export const initialTakeValues = (
  declaredDurationSeconds: number,
): TakeValues => ({
  startSeconds: 0,
  endSeconds: declaredDurationSeconds,
  gainDb: 0,
});

/** Deterministic trim/gain bounds over bounded numeric metadata only. Trim
 * start stays inside [0, trim end − 1]; trim end stays inside
 * [trim start + 1, declared duration]; gain stays inside ±12 dB. */
export const clampTrimStart = (value: number, current: TakeValues): number =>
  Math.min(Math.max(0, value), current.endSeconds - 1);

export const clampTrimEnd = (
  value: number,
  current: TakeValues,
  declaredDurationSeconds: number,
): number =>
  Math.max(current.startSeconds + 1, Math.min(value, declaredDurationSeconds));

export const clampGain = (value: number): number =>
  Math.max(GAIN_BOUNDS.minDb, Math.min(GAIN_BOUNDS.maxDb, value));

export const takeValuesEqual = (a: TakeValues, b: TakeValues): boolean =>
  a.startSeconds === b.startSeconds &&
  a.endSeconds === b.endSeconds &&
  a.gainDb === b.gainDb;

/** Dirty means the visible draft differs from the values last kept as
 * session metadata. */
export const takeDraftDirty = (
  draft: TakeValues,
  take: PrototypeTake,
): boolean => !takeValuesEqual(draft, take.keptValues);

/** The visible prototype takes for one exact scene/beat scope, in creation
 * order. A take can never leak across scopes. */
export const takesForScope = (
  takes: readonly PrototypeTake[],
  sceneId: string,
  beatIndex: number,
): readonly PrototypeTake[] =>
  takes.filter(
    (take) => take.sceneId === sceneId && take.beatIndex === beatIndex,
  );

/** One deterministic selection rule, mirroring the accepted planning-card
 * rule: keep the selected take while it is visible in the current scope;
 * otherwise fall to the first visible take, or to none. */
export const resolveTakeSelection = (
  visible: readonly PrototypeTake[],
  selectedId: string | null,
): string | null => {
  if (selectedId && visible.some((take) => take.id === selectedId))
    return selectedId;
  return visible[0]?.id ?? null;
};

export const buildWalkthroughTake = (
  counter: number,
  scene: DemoScene,
  beatIndex: number,
): PrototypeTake => {
  const declaredDurationSeconds = scene.beats[beatIndex]?.seconds ?? 0;
  return {
    id: `prototype-take-${counter}`,
    sceneId: scene.id,
    beatIndex,
    name: `Prototype take ${counter} · recording walkthrough`,
    origin: "recording-walkthrough",
    originTruth:
      "Created by a local UI recording walkthrough — no microphone, stream, or audio was used or captured.",
    declaredDurationSeconds,
    status: "review",
    auditioning: false,
    restoreValues: initialTakeValues(declaredDurationSeconds),
    keptValues: initialTakeValues(declaredDurationSeconds),
  };
};

export const buildImportTake = (
  counter: number,
  scene: DemoScene,
  beatIndex: number,
  fixture: ImportFixture,
): PrototypeTake => ({
  id: `prototype-take-${counter}`,
  sceneId: scene.id,
  beatIndex,
  name: `Prototype take ${counter} · import fixture “${fixture.fileName}”`,
  origin: "import-fixture",
  originTruth:
    "Created from declared fixture metadata only — no file was opened, read, decoded, or stored.",
  declaredDurationSeconds: fixture.declaredDurationSeconds,
  status: "review",
  auditioning: false,
  restoreValues: initialTakeValues(fixture.declaredDurationSeconds),
  keptValues: initialTakeValues(fixture.declaredDurationSeconds),
});

/** Exact status copy. “Kept” is limited to session prototype metadata and
 * always restates that no audio exists. */
export const takeStatusCopy = (take: PrototypeTake): string =>
  take.status === "kept"
    ? "Kept as session-only prototype metadata — still no audio exists"
    : "In review — session-only prototype metadata, no audio exists";

/** Exact audition copy. Audition marks the take for comparison review; it
 * never plays, and the copy says so. */
export const auditionCopy = (take: PrototypeTake): string =>
  take.auditioning
    ? "In audition review — marked for comparison only; no audio plays, because no audio exists."
    : "Not in audition review — auditioning only marks the take; it never plays audio.";

/* ------------------------------------------------------------------ */
/* Unsaved-change guard                                                */
/* ------------------------------------------------------------------ */

/** Every action that can leave or replace the active prototype take while a
 * dirty trim/gain draft exists. */
export type GuardedAction =
  | { kind: "select-take"; takeId: string }
  | { kind: "discard-take"; takeId: string }
  | { kind: "retake-take"; takeId: string }
  | { kind: "select-scene"; sceneId: string }
  | { kind: "select-beat"; beatIndex: number }
  | { kind: "select-track"; trackId: AudioTrackId; moveFocus?: boolean }
  | { kind: "start-recording" }
  | { kind: "start-import" };

/** Human wording for the pending action, used by the unsaved-change
 * dialog. */
export const guardedActionLabel = (action: GuardedAction): string => {
  switch (action.kind) {
    case "select-take":
      return "Switching the selected take";
    case "discard-take":
      return "Discarding this take";
    case "retake-take":
      return "Retaking this take";
    case "select-scene":
      return "Changing the scene scope";
    case "select-beat":
      return "Changing the beat scope";
    case "select-track":
      return "Switching tracks";
    case "start-recording":
      return "Starting a new recording walkthrough";
    case "start-import":
      return "Starting an import walkthrough";
  }
};

export const UNSAVED_DIALOG_TITLE = "Unsaved prototype edits";

export const unsavedDialogBody = (action: GuardedAction): string =>
  `${guardedActionLabel(action)} would leave this take while its trim/gain draft has unkept edits. The draft is session-only prototype metadata: Keep edits stores it for this Studio session, Discard draft edits drops only the draft, and Stay cancels the change. Nothing is ever saved to a project, file, or device.`;
