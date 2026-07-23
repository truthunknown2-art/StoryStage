import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import { audioScopeLabel, type AudioTrackId } from "./audio-workspace";
import type { DemoScene } from "./demo-project";
import {
  DECLARED_DURATION_TRUTH,
  GAIN_BOUNDS,
  IMPORT_FIXTURES,
  NARRATION_PANEL_TRUTH_NOTE,
  NARRATION_PROTOTYPE_LABEL,
  UNSAVED_DIALOG_TITLE,
  auditionCopy,
  buildImportTake,
  buildWalkthroughTake,
  clampGain,
  clampTrimEnd,
  clampTrimStart,
  guardedActionLabel,
  importResultCopy,
  permittedRecordingEvents,
  recordingAfterScopeChange,
  recordingStateCopy,
  reduceRecording,
  resolveTakeSelection,
  takeDraftDirty,
  takeStatusCopy,
  takeValuesEqual,
  takesForScope,
  unsavedDialogBody,
  type GuardedAction,
  type ImportFixture,
  type ImportState,
  type PrototypeTake,
  type RecordingEvent,
  type RecordingState,
  type TakeValues,
} from "./narration-takes";

/**
 * F5-WP2 Narration take management: a deterministic, session-local
 * recording/import/take-management UX state model rendered inside the
 * accepted Audio workspace. Every state is a local UI walkthrough over
 * prototype metadata — no device, permission, file, audio bytes, playback,
 * waveform, or persistence exists, and every surface says so. The complete
 * permitted-transition table (`reduceRecording`) is the only way state
 * changes, so an impossible transition can never silently succeed.
 */

export interface NarrationTakesApi {
  recording: RecordingState;
  importState: ImportState;
  takes: readonly PrototypeTake[];
  visibleTakes: readonly PrototypeTake[];
  selectedTake: PrototypeTake | null;
  draft: TakeValues | null;
  draftDirty: boolean;
  pendingAction: GuardedAction | null;
  lastDecision: string | null;
  sendRecording: (event: RecordingEvent) => void;
  requestAction: (action: GuardedAction) => void;
  resolvePending: (decision: "stay" | "discard" | "keep") => void;
  guardedSelectScene: (sceneId: string) => void;
  guardedSelectBeat: (beatIndex: number) => void;
  guardedSelectTrack: (trackId: AudioTrackId, moveFocus: boolean) => void;
  pickImportFixture: (fixture: ImportFixture) => void;
  emptyImport: () => void;
  cancelImport: () => void;
  dismissImportResult: () => void;
  toggleAudition: (takeId: string) => void;
  keepTake: (takeId: string) => void;
  adjustDraft: (field: keyof TakeValues, delta: number) => void;
  keepDraft: () => void;
  restoreDraft: () => void;
}

/** Session-local narration prototype state. Lives inside the Audio
 * workspace, exactly like the accepted F5-WP1 card selection: it is honest
 * session-only metadata and never persists to a project, file, or device. */
export function useNarrationTakes({
  scene,
  beatIndex,
  onSelectScene,
  onSelectBeat,
  onSelectTrack,
}: {
  scene: DemoScene;
  beatIndex: number;
  onSelectScene: (sceneId: string) => void;
  onSelectBeat: (beatIndex: number) => void;
  onSelectTrack: (trackId: AudioTrackId, moveFocus: boolean) => void;
}): NarrationTakesApi {
  const [recording, setRecording] = useState<RecordingState>("idle");
  const [importState, setImportState] = useState<ImportState>({
    kind: "closed",
  });
  const [takes, setTakes] = useState<readonly PrototypeTake[]>([]);
  const [counter, setCounter] = useState(0);
  const [selectedTakeId, setSelectedTakeId] = useState<string | null>(null);
  const [draftState, setDraftState] = useState<{
    takeId: string;
    values: TakeValues;
  } | null>(null);
  const [pendingAction, setPendingAction] = useState<GuardedAction | null>(
    null,
  );
  const [lastDecision, setLastDecision] = useState<string | null>(null);
  const pendingTriggerRef = useRef<HTMLElement | null>(null);

  /* A scope change deterministically abandons any unfinished walkthrough and
   * closes the import chooser — nothing is lost, because no audio ever
   * exists. Render-time adjustment, same accepted pattern as card
   * selection. */
  const scopeKey = `${scene.id}:${beatIndex}`;
  const [lastScopeKey, setLastScopeKey] = useState(scopeKey);
  if (lastScopeKey !== scopeKey) {
    setLastScopeKey(scopeKey);
    setRecording(recordingAfterScopeChange());
    setImportState({ kind: "closed" });
    /* A decision note names the take it acted on; it must never linger into
     * another scope and look like a cross-scope take leak. */
    setLastDecision(null);
  }

  /* One deterministic selection identity shared by the take list and the
   * review section: a scope change can never keep a hidden stale take
   * selected, and a take can never leak across scopes. */
  const visibleTakes = takesForScope(takes, scene.id, beatIndex);
  const resolvedTakeId = resolveTakeSelection(visibleTakes, selectedTakeId);
  if (resolvedTakeId !== selectedTakeId) {
    setSelectedTakeId(resolvedTakeId);
  }
  const selectedTake =
    visibleTakes.find((take) => take.id === resolvedTakeId) ?? null;

  /* The trim/gain draft is keyed to the selected take: re-selecting a take
   * re-keys the draft to that take's kept session values. */
  if ((draftState?.takeId ?? null) !== resolvedTakeId) {
    setDraftState(
      selectedTake
        ? { takeId: selectedTake.id, values: selectedTake.keptValues }
        : null,
    );
  }

  const draft = draftState?.values ?? null;
  const draftDirty =
    draftState !== null &&
    selectedTake !== null &&
    draftState.takeId === selectedTake.id &&
    takeDraftDirty(draftState.values, selectedTake);

  const runAction = (action: GuardedAction) => {
    switch (action.kind) {
      case "select-take":
        setSelectedTakeId(action.takeId);
        return;
      case "discard-take": {
        const discarded = takes.find((take) => take.id === action.takeId);
        setTakes(takes.filter((take) => take.id !== action.takeId));
        setLastDecision(
          `${discarded?.name ?? "Prototype take"} discarded — it was only session metadata; no file or audio was deleted.`,
        );
        return;
      }
      case "retake-take":
        setRecording("armed");
        setLastDecision(
          "Retake walkthrough armed — the existing take stays unchanged unless a new walkthrough take is kept. No audio exists either way.",
        );
        return;
      case "select-scene":
        onSelectScene(action.sceneId);
        return;
      case "select-beat":
        onSelectBeat(action.beatIndex);
        return;
      case "select-track":
        onSelectTrack(action.trackId, action.moveFocus ?? false);
        return;
      case "start-recording":
        setRecording("armed");
        return;
      case "start-import":
        setImportState({ kind: "chooser" });
        return;
    }
  };

  /* The unsaved-change guard: any action that would leave or replace the
   * active prototype take while its draft is dirty must pass an explicit
   * stay/discard/keep decision. State is never silently dropped. While a
   * decision is pending, further guarded actions are ignored fail-closed —
   * the pending decision must be resolved first. */
  const requestAction = (action: GuardedAction) => {
    if (draftDirty) {
      if (pendingAction === null) {
        pendingTriggerRef.current =
          document.activeElement as HTMLElement | null;
        setPendingAction(action);
      }
      return;
    }
    runAction(action);
  };

  const resolvePending = (decision: "stay" | "discard" | "keep") => {
    const action = pendingAction;
    setPendingAction(null);
    if (decision === "stay") {
      pendingTriggerRef.current?.focus();
      pendingTriggerRef.current = null;
      return;
    }
    if (!action) return;
    if (decision === "discard") {
      if (selectedTake)
        setDraftState({
          takeId: selectedTake.id,
          values: selectedTake.keptValues,
        });
    } else if (selectedTake && draftState) {
      keepDraftValues(selectedTake.id, draftState.values);
    }
    runAction(action);
  };

  const guardedSelectScene = (sceneId: string) =>
    requestAction({ kind: "select-scene", sceneId });
  const guardedSelectBeat = (nextBeatIndex: number) =>
    requestAction({ kind: "select-beat", beatIndex: nextBeatIndex });
  const guardedSelectTrack = (trackId: AudioTrackId, moveFocus: boolean) => {
    if (draftDirty) {
      if (pendingAction === null) {
        pendingTriggerRef.current =
          document.activeElement as HTMLElement | null;
        setPendingAction({ kind: "select-track", trackId, moveFocus });
      }
      return;
    }
    onSelectTrack(trackId, moveFocus);
  };

  const sendRecording = (event: RecordingEvent) => {
    const next = reduceRecording(recording, event);
    /* Fail closed: an event the current state does not permit is a no-op,
     * and the UI only renders permitted events. */
    if (next === null) return;
    if (event === "keep") {
      const nextCounter = counter + 1;
      setCounter(nextCounter);
      const take = buildWalkthroughTake(nextCounter, scene, beatIndex);
      setTakes([...takes, take]);
      setSelectedTakeId(take.id);
      setLastDecision(
        `${take.name} kept as session-only prototype metadata — no audio was captured or saved.`,
      );
    }
    setRecording(next);
  };

  const pickImportFixture = (fixture: ImportFixture) => {
    if (!fixture.valid) {
      setImportState({ kind: "result", outcome: "invalid", fixture });
      return;
    }
    const nextCounter = counter + 1;
    setCounter(nextCounter);
    const take = buildImportTake(nextCounter, scene, beatIndex, fixture);
    setTakes([...takes, take]);
    setSelectedTakeId(take.id);
    setImportState({ kind: "result", outcome: "picked", fixture });
    setLastDecision(
      `${take.name} added as session-only prototype metadata — no file was opened, read, or stored.`,
    );
  };

  const emptyImport = () =>
    setImportState({ kind: "result", outcome: "empty", fixture: null });
  const cancelImport = () =>
    setImportState({ kind: "result", outcome: "cancelled", fixture: null });
  const dismissImportResult = () => setImportState({ kind: "closed" });

  const toggleAudition = (takeId: string) => {
    const target = takes.find((take) => take.id === takeId);
    if (!target) return;
    const next = !target.auditioning;
    setTakes(
      takes.map((take) =>
        take.id === takeId ? { ...take, auditioning: next } : take,
      ),
    );
    setLastDecision(
      next
        ? `${target.name} is in audition review — a comparison mark only; no audio plays, because no audio exists.`
        : `${target.name} left audition review — nothing played, because no audio exists.`,
    );
  };

  const keepTake = (takeId: string) => {
    const target = takes.find((take) => take.id === takeId);
    if (!target || target.status === "kept") return;
    setTakes(
      takes.map((take) =>
        take.id === takeId ? { ...take, status: "kept" } : take,
      ),
    );
    setLastDecision(
      `${target.name} kept as session-only prototype metadata — still no audio exists, and nothing was saved to a project, file, or device.`,
    );
  };

  const adjustDraft = (field: keyof TakeValues, delta: number) => {
    if (!draftState || !selectedTake) return;
    const current = draftState.values;
    let values: TakeValues = current;
    if (field === "startSeconds")
      values = {
        ...current,
        startSeconds: clampTrimStart(current.startSeconds + delta, current),
      };
    else if (field === "endSeconds")
      values = {
        ...current,
        endSeconds: clampTrimEnd(
          current.endSeconds + delta,
          current,
          selectedTake.declaredDurationSeconds,
        ),
      };
    else values = { ...current, gainDb: clampGain(current.gainDb + delta) };
    setDraftState({ takeId: draftState.takeId, values });
  };

  const keepDraftValues = (takeId: string, values: TakeValues) => {
    setTakes((current) =>
      current.map((take) =>
        take.id === takeId ? { ...take, keptValues: values } : take,
      ),
    );
  };

  const keepDraft = () => {
    if (!draftState || !selectedTake || !draftDirty) return;
    keepDraftValues(selectedTake.id, draftState.values);
    setLastDecision(
      `${selectedTake.name}: draft edits kept as session-only prototype metadata — nothing was saved to a project, file, or device.`,
    );
  };

  const restoreDraft = () => {
    if (!draftState || !selectedTake) return;
    if (takeValuesEqual(draftState.values, selectedTake.restoreValues)) return;
    setDraftState({
      takeId: draftState.takeId,
      values: selectedTake.restoreValues,
    });
    setLastDecision(
      `${selectedTake.name}: draft restored to the declared prototype values (trim 0s–${selectedTake.declaredDurationSeconds}s, gain 0 dB).`,
    );
  };

  return {
    recording,
    importState,
    takes,
    visibleTakes,
    selectedTake,
    draft,
    draftDirty,
    pendingAction,
    lastDecision,
    sendRecording,
    requestAction,
    resolvePending,
    guardedSelectScene,
    guardedSelectBeat,
    guardedSelectTrack,
    pickImportFixture,
    emptyImport,
    cancelImport,
    dismissImportResult,
    toggleAudition,
    keepTake,
    adjustDraft,
    keepDraft,
    restoreDraft,
  };
}

/* ------------------------------------------------------------------ */
/* Panel view                                                          */
/* ------------------------------------------------------------------ */

const RECORDING_EVENT_LABELS: Record<RecordingEvent, string> = {
  arm: "Arm take walkthrough",
  start: "Start recording walkthrough",
  stop: "Stop walkthrough",
  cancel: "Cancel walkthrough",
  interrupt: "Simulate interruption",
  "simulate-permission-denied": "Simulate permission denied",
  "simulate-missing-device": "Simulate missing device",
  disarm: "Disarm",
  keep: "Keep as prototype take",
  retake: "Retake walkthrough",
  "discard-walkthrough": "Discard walkthrough",
  "arm-again": "Arm again",
  dismiss: "Dismiss",
};

const PRIMARY_RECORDING_EVENTS: readonly RecordingEvent[] = [
  "arm",
  "start",
  "stop",
  "keep",
  "arm-again",
];

const gainLabel = (gainDb: number): string =>
  gainDb > 0 ? `+${gainDb} dB` : gainDb < 0 ? `−${Math.abs(gainDb)} dB` : "0 dB";

export function NarrationTakePanel({
  narration,
  scene,
  beatIndex,
  trackId,
}: {
  narration: NarrationTakesApi;
  scene: DemoScene;
  beatIndex: number;
  trackId: AudioTrackId;
}) {
  const scopeLabel = audioScopeLabel(scene, beatIndex);
  const stateCopy = recordingStateCopy(narration.recording);
  const chooserRef = useRef<HTMLDivElement>(null);
  const importButtonRef = useRef<HTMLButtonElement>(null);
  const stayButtonRef = useRef<HTMLButtonElement>(null);
  const wasChooserOpenRef = useRef(false);
  const importOpen = narration.importState.kind === "chooser";
  const importResult =
    narration.importState.kind === "result" ? narration.importState : null;

  /* Focus the first chooser candidate when the dialog opens and return
   * focus to the Import button when it closes. */
  useEffect(() => {
    if (importOpen) {
      wasChooserOpenRef.current = true;
      chooserRef.current?.querySelector("button")?.focus();
    } else if (wasChooserOpenRef.current) {
      wasChooserOpenRef.current = false;
      importButtonRef.current?.focus();
    }
  }, [importOpen]);

  /* Focus the Stay button when the unsaved-change dialog opens. */
  const pendingOpen = narration.pendingAction !== null;
  useEffect(() => {
    if (pendingOpen) stayButtonRef.current?.focus();
  }, [pendingOpen]);

  const onChooserKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      narration.cancelImport();
    }
  };

  const onUnsavedKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      narration.resolvePending("stay");
    }
  };

  const take = narration.selectedTake;
  const draft = narration.draft;
  const restoreMatchesDraft =
    take !== null &&
    draft !== null &&
    takeValuesEqual(draft, take.restoreValues);

  return (
    <section
      aria-label="Narration take management"
      className="pv1-takes"
      data-testid="pv1-takes"
      hidden={trackId !== "narration"}
    >
      <header className="pv1-takes-header">
        <div>
          <small>Narration</small>
          <h2>Take management — recording, import, and takes</h2>
        </div>
        <span className="pv1-badge">{NARRATION_PROTOTYPE_LABEL}</span>
      </header>
      <p className="pv1-takes-truth" role="note">
        {NARRATION_PANEL_TRUTH_NOTE}
      </p>

      <div className="pv1-takes-columns">
        <section
          aria-label="Recording walkthrough"
          className="pv1-takes-recorder"
        >
          <h3>Record a take — walkthrough</h3>
          <p className="pv1-takes-state" data-testid="pv1-takes-state">
            {stateCopy.badge}
          </p>
          <p className="pv1-takes-detail">{stateCopy.detail}</p>
          <div className="pv1-takes-controls">
            {permittedRecordingEvents(narration.recording).map((event) => (
              <button
                className={
                  PRIMARY_RECORDING_EVENTS.includes(event)
                    ? "pv1-primary"
                    : "pv1-secondary"
                }
                key={event}
                onClick={() => {
                  if (event === "arm")
                    narration.requestAction({ kind: "start-recording" });
                  else narration.sendRecording(event);
                }}
                type="button"
              >
                {RECORDING_EVENT_LABELS[event]}
              </button>
            ))}
          </div>

          <h3>Import a take — walkthrough</h3>
          <p className="pv1-takes-detail">
            The chooser lists declared fixture metadata only. It never opens a
            file picker, reads a path or file, inspects bytes, or creates
            media.
          </p>
          <div className="pv1-takes-controls">
            <button
              className="pv1-primary"
              onClick={() => narration.requestAction({ kind: "start-import" })}
              ref={importButtonRef}
              type="button"
            >
              Open import chooser
            </button>
          </div>
          {importResult ? (
            <div className="pv1-takes-result" role="note">
              <p>
                {importResultCopy(importResult.outcome, importResult.fixture)}
              </p>
              <button
                className="pv1-secondary"
                onClick={narration.dismissImportResult}
                type="button"
              >
                Dismiss result
              </button>
            </div>
          ) : null}
        </section>

        <section
          aria-label="Prototype takes in scope"
          className="pv1-takes-list"
        >
          <h3>Prototype takes</h3>
          <p className="pv1-takes-count">
            {narration.visibleTakes.length === 0
              ? "No prototype takes in this scene/beat scope"
              : `${narration.visibleTakes.length} prototype take${narration.visibleTakes.length === 1 ? "" : "s"} in this scene/beat scope — none is audio`}
          </p>
          {narration.visibleTakes.length === 0 ? (
            <p className="pv1-takes-empty" role="note">
              No prototype takes for {scopeLabel}. Arm a recording walkthrough
              or open the import chooser — either way only session-only
              prototype metadata is created, and no audio ever exists.
            </p>
          ) : (
            <ul>
              {narration.visibleTakes.map((entry) => {
                const isSelected = entry.id === take?.id;
                return (
                  <li key={entry.id}>
                    <button
                      aria-current={isSelected ? "true" : undefined}
                      className={`pv1-takes-card ${isSelected ? "is-selected" : ""}`}
                      onClick={() =>
                        narration.requestAction({
                          kind: "select-take",
                          takeId: entry.id,
                        })
                      }
                      type="button"
                    >
                      <strong>{entry.name}</strong>
                      <small>{takeStatusCopy(entry)}</small>
                      <small>
                        Declared {entry.declaredDurationSeconds}s — no audio
                        decoded · {entry.originTruth}
                      </small>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          {narration.lastDecision ? (
            <p className="pv1-takes-decision" role="status">
              {narration.lastDecision}
            </p>
          ) : null}
        </section>

        <section
          aria-label="Selected prototype take"
          className="pv1-takes-review"
        >
          <h3>Selected take review</h3>
          {take === null ? (
            <p className="pv1-takes-empty" role="note">
              No prototype take selected — this scope has no prototype takes.
              Nothing here is audio, and nothing can be reviewed.
            </p>
          ) : (
            <>
              <dl>
                <div>
                  <dt>Take</dt>
                  <dd>{take.name}</dd>
                </div>
                <div>
                  <dt>Scope</dt>
                  <dd>{scopeLabel}</dd>
                </div>
                <div>
                  <dt>Origin</dt>
                  <dd>{take.originTruth}</dd>
                </div>
                <div>
                  <dt>Status</dt>
                  <dd>{takeStatusCopy(take)}</dd>
                </div>
                <div>
                  <dt>Audition</dt>
                  <dd>{auditionCopy(take)}</dd>
                </div>
                <div>
                  <dt>Duration</dt>
                  <dd>
                    Declared {take.declaredDurationSeconds}s —{" "}
                    {DECLARED_DURATION_TRUTH}.
                  </dd>
                </div>
              </dl>
              <div className="pv1-takes-controls">
                <button
                  className="pv1-secondary"
                  onClick={() => narration.toggleAudition(take.id)}
                  type="button"
                >
                  {take.auditioning
                    ? "End audition review"
                    : "Audition — review only, no playback"}
                </button>
                {take.status === "review" ? (
                  <button
                    className="pv1-secondary"
                    onClick={() => narration.keepTake(take.id)}
                    type="button"
                  >
                    Keep as session metadata
                  </button>
                ) : null}
                <button
                  className="pv1-secondary"
                  onClick={() =>
                    narration.requestAction({
                      kind: "retake-take",
                      takeId: take.id,
                    })
                  }
                  type="button"
                >
                  Retake walkthrough
                </button>
                <button
                  className="pv1-secondary"
                  onClick={() =>
                    narration.requestAction({
                      kind: "discard-take",
                      takeId: take.id,
                    })
                  }
                  type="button"
                >
                  Discard take
                </button>
              </div>

              <div
                aria-label="Trim and gain — prototype metadata"
                className="pv1-takes-editor"
                role="group"
              >
                <h4>Trim and gain — prototype metadata only</h4>
                {draft ? (
                  <>
                    <p className="pv1-takes-values">
                      Current draft: trim {draft.startSeconds}s–
                      {draft.endSeconds}s of a declared{" "}
                      {take.declaredDurationSeconds}s, gain{" "}
                      {gainLabel(draft.gainDb)}. {DECLARED_DURATION_TRUTH}.
                    </p>
                    <div className="pv1-takes-stepper">
                      <span>Trim start: {draft.startSeconds}s</span>
                      <button
                        aria-label="Decrease trim start by 1 second"
                        className="pv1-secondary"
                        onClick={() =>
                          narration.adjustDraft("startSeconds", -1)
                        }
                        type="button"
                      >
                        −1s
                      </button>
                      <button
                        aria-label="Increase trim start by 1 second"
                        className="pv1-secondary"
                        onClick={() =>
                          narration.adjustDraft("startSeconds", 1)
                        }
                        type="button"
                      >
                        +1s
                      </button>
                      <small>
                        Bounds 0s–{draft.endSeconds - 1}s; stays before trim
                        end.
                      </small>
                    </div>
                    <div className="pv1-takes-stepper">
                      <span>Trim end: {draft.endSeconds}s</span>
                      <button
                        aria-label="Decrease trim end by 1 second"
                        className="pv1-secondary"
                        onClick={() => narration.adjustDraft("endSeconds", -1)}
                        type="button"
                      >
                        −1s
                      </button>
                      <button
                        aria-label="Increase trim end by 1 second"
                        className="pv1-secondary"
                        onClick={() => narration.adjustDraft("endSeconds", 1)}
                        type="button"
                      >
                        +1s
                      </button>
                      <small>
                        Bounds {draft.startSeconds + 1}s–
                        {take.declaredDurationSeconds}s (declared duration).
                      </small>
                    </div>
                    <div className="pv1-takes-stepper">
                      <span>Gain: {gainLabel(draft.gainDb)}</span>
                      <button
                        aria-label="Decrease gain by 1 decibel"
                        className="pv1-secondary"
                        onClick={() => narration.adjustDraft("gainDb", -1)}
                        type="button"
                      >
                        −1 dB
                      </button>
                      <button
                        aria-label="Increase gain by 1 decibel"
                        className="pv1-secondary"
                        onClick={() => narration.adjustDraft("gainDb", 1)}
                        type="button"
                      >
                        +1 dB
                      </button>
                      <small>
                        Bounds {GAIN_BOUNDS.minDb} dB–+{GAIN_BOUNDS.maxDb} dB.
                      </small>
                    </div>
                    {narration.draftDirty ? (
                      <p className="pv1-takes-dirty" role="note">
                        Unsaved prototype edits — Keep draft edits stores this
                        draft as session-only metadata; nothing is saved to a
                        project or file.
                      </p>
                    ) : (
                      <p className="pv1-takes-clean" role="note">
                        Draft matches the kept session values.
                      </p>
                    )}
                    <div className="pv1-takes-controls">
                      {narration.draftDirty ? (
                        <button
                          className="pv1-primary"
                          onClick={narration.keepDraft}
                          type="button"
                        >
                          Keep draft edits
                        </button>
                      ) : null}
                      {restoreMatchesDraft ? (
                        <small className="pv1-takes-restore-note">
                          Draft already matches the declared values (trim 0s–
                          {take.declaredDurationSeconds}s, gain 0 dB).
                        </small>
                      ) : (
                        <button
                          className="pv1-secondary"
                          onClick={narration.restoreDraft}
                          type="button"
                        >
                          Restore declared values
                        </button>
                      )}
                    </div>
                  </>
                ) : null}
              </div>
            </>
          )}
        </section>
      </div>

      {importOpen ? (
        <div
          aria-label="Import take — fixture chooser (local prototype)"
          className="pv1-takes-dialog"
          onKeyDown={onChooserKeyDown}
          ref={chooserRef}
          role="dialog"
        >
          <p>
            <strong>Import take — local prototype chooser</strong>
          </p>
          <p>
            {NARRATION_PROTOTYPE_LABEL}. This chooser lists declared fixture
            metadata only; it never opens a file picker, reads a path or file,
            inspects bytes, or creates media. Escape cancels the import.
          </p>
          <ul>
            {IMPORT_FIXTURES.map((fixture) => (
              <li key={fixture.id}>
                <button
                  className="pv1-takes-fixture"
                  onClick={() => narration.pickImportFixture(fixture)}
                  type="button"
                >
                  <strong>{fixture.fileName}</strong>
                  <small>
                    {fixture.declaredFormat} · declared{" "}
                    {fixture.declaredDurationSeconds}s · {fixture.description}
                  </small>
                </button>
              </li>
            ))}
            <li>
              <button
                className="pv1-secondary"
                onClick={narration.emptyImport}
                type="button"
              >
                None of these — close with nothing chosen
              </button>
            </li>
          </ul>
          <button
            className="pv1-secondary"
            onClick={narration.cancelImport}
            type="button"
          >
            Cancel import
          </button>
        </div>
      ) : null}

      {narration.pendingAction ? (
        <div
          aria-label={UNSAVED_DIALOG_TITLE}
          className="pv1-takes-dialog pv1-takes-unsaved"
          onKeyDown={onUnsavedKeyDown}
          role="alertdialog"
        >
          <p>
            <strong>{UNSAVED_DIALOG_TITLE}</strong>
          </p>
          <p>{unsavedDialogBody(narration.pendingAction)}</p>
          <p>
            Pending change: {guardedActionLabel(narration.pendingAction)}.
          </p>
          <div className="pv1-takes-controls">
            <button
              className="pv1-primary"
              onClick={() => narration.resolvePending("stay")}
              ref={stayButtonRef}
              type="button"
            >
              Stay — keep editing
            </button>
            <button
              className="pv1-secondary"
              onClick={() => narration.resolvePending("discard")}
              type="button"
            >
              Discard draft edits
            </button>
            <button
              className="pv1-secondary"
              onClick={() => narration.resolvePending("keep")}
              type="button"
            >
              Keep edits as session metadata
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
