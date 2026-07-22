import { useEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent, ReactNode } from "react";
import {
  ArrowLeft,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clapperboard,
  Film,
  LocateFixed,
  Redo2,
  Undo2,
} from "lucide-react";
import olloCastArt from "../assets/ollo-friends-cast-v1.jpg";
import { AiDirectorControls } from "./AiDirectorControls";
import { AiDirectorPanel } from "./AiDirectorPanel";
import type { AiConnectionState } from "./ai-director-fixture";
import {
  LOCAL_DEMO_BANNER,
  OLLO_DEMO_PROJECT,
  OLLO_DEMO_SCENES,
  OLLO_DEMO_TOTAL_SECONDS,
  type DemoScene,
} from "./demo-project";
import {
  applyDirectDraft,
  CAMERA_INTENT_OPTIONS,
  canRedoDirect,
  canUndoDirect,
  committedDirectDraft,
  COMPOSITION_FOCUS_MAX_LENGTH,
  directBeatKey,
  END_HOLD_OPTIONS,
  FRAMING_OPTIONS,
  hasCommittedVisualMotionDirection,
  hasUnappliedDirectChanges,
  initialBeatDirectState,
  PERFORMANCE_PACE_OPTIONS,
  redoDirect,
  undoDirect,
  updateDirectDraft,
  type BeatDirectState,
  type DirectDraft,
} from "./direct-history";

const formatClock = (totalSeconds: number) => {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
};

const sceneStart = (sceneId: string) => {
  let offset = 0;
  for (const scene of OLLO_DEMO_SCENES) {
    if (scene.id === sceneId) return offset;
    offset += scene.seconds;
  }
  return offset;
};

const toggle = (set: Set<string>, id: string) => {
  const next = new Set(set);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  return next;
};

const DIRECTOR_TABS = [
  {
    id: "direct",
    label: "Direct",
  },
  {
    id: "visual",
    label: "Visual",
  },
  {
    id: "motion",
    label: "Motion",
  },
] as const;

type DirectorTabId = (typeof DIRECTOR_TABS)[number]["id"];

const DIRECT_FIELDS: Array<{
  id: "beatPurpose" | "performanceDirection" | "continuityNote";
  label: string;
  placeholder: string;
}> = [
  {
    id: "beatPurpose",
    label: "Beat purpose",
    placeholder: "What this beat must do for the story",
  },
  {
    id: "performanceDirection",
    label: "Performance direction",
    placeholder: "How the moment should be played",
  },
  {
    id: "continuityNote",
    label: "Continuity note",
    placeholder: "What must stay consistent with neighboring beats",
  },
];

/* F3-WP3 Visual and Motion planning-intent fields. Every value is
 * direction intent only: no keyframes, no executable camera move, no
 * retiming, no rig animation, no imagery change, no rendered media. */
const INTENT_SELECT_FIELDS = {
  framing: {
    id: "framing",
    label: "Framing",
    options: FRAMING_OPTIONS,
  },
  cameraIntent: {
    id: "cameraIntent",
    label: "Camera intent",
    options: CAMERA_INTENT_OPTIONS,
  },
  performancePace: {
    id: "performancePace",
    label: "Performance pace",
    options: PERFORMANCE_PACE_OPTIONS,
  },
  endHold: {
    id: "endHold",
    label: "End hold",
    options: END_HOLD_OPTIONS,
  },
} as const satisfies Record<
  string,
  {
    id: "framing" | "cameraIntent" | "performancePace" | "endHold";
    label: string;
    options: readonly string[];
  }
>;

/**
 * F2/F3 Studio shell: one selected scene identity drives the hierarchy
 * rail, center scene-board, transport, episode overview, and the
 * scene-relative playhead. Act/sequence groups expand and collapse; a
 * collapsed selected scene keeps an explicit reachable summary. The
 * playhead is local UI timing — never media playback.
 *
 * F3-WP1 adds the shared beat scope: the selected beat is one real Studio
 * state reflected by the rail beat buttons, the board beat card, the
 * permanent scope header, and the Direct/Visual/Motion Director tabs.
 * Changing scenes deterministically selects that scene's first beat
 * (render-time adjustment, no effect races).
 *
 * F3-WP2 makes the Direct tab real: each beat owns an independent
 * session-local three-field draft with atomic Apply and per-beat
 * Undo/Redo history (see `direct-history.ts`).
 *
 * F3-WP3 widens that same per-beat snapshot to eight fields: Visual adds
 * Framing and Composition focus; Motion adds Camera intent, Performance
 * pace, and End hold. Apply from any tab commits the complete eight-field
 * draft as one history step; Undo/Redo from any tab restores the exact
 * complete snapshot and synchronizes every draft. A committed-only
 * Selected direction summary on the reference board lists the selected
 * beat's five Visual/Motion values. All values are planning intent only —
 * nothing is saved, interpreted by AI, animated, rendered, or exported.
 *
 * F3-WP4 docks the right-side AI Director conversation/proposal panel
 * (local labelled fixtures only) and adds the truthful AI Director status
 * chip to the topbar. The panel reads the same selected scene/beat and
 * playhead as authoritative scope; its one bounded real transition is an
 * Apply that commits exactly one proposed `performanceDirection` change
 * to the immutable captured beat through the same session-local per-beat
 * history, failing closed on stale selection or unapplied manual drafts.
 */
export function StudioShell({
  aiConnection,
  artStyleLabel,
  grammarLabel,
  onAiConnectionChange,
  onBackToProjects,
  projectTitle,
  usesLayoutDemo = false,
}: {
  aiConnection: AiConnectionState;
  artStyleLabel: string;
  grammarLabel: string;
  onAiConnectionChange: (next: AiConnectionState) => void;
  onBackToProjects: () => void;
  projectTitle: string;
  /** True when the visible hierarchy is the bounded Ollo layout demo rather
   * than a plan derived from the creator's own script. */
  usesLayoutDemo?: boolean;
}) {
  const [selectedSceneId, setSelectedSceneId] = useState<string>(
    OLLO_DEMO_SCENES[0]!.id,
  );
  const [collapsedActs, setCollapsedActs] = useState<Set<string>>(new Set());
  const [collapsedSequences, setCollapsedSequences] = useState<Set<string>>(
    new Set(),
  );
  // Scene-relative playhead resets deterministically to zero on every scene
  // change (render-time adjustment, no effect races). The selected beat is
  // one shared Studio scope: it resets deterministically to the new scene's
  // first beat in the same adjustment, so no stale beat state can leak
  // across scenes.
  const [playheadSeconds, setPlayheadSeconds] = useState(0);
  const [selectedBeatIndex, setSelectedBeatIndex] = useState(0);
  const [lastSceneId, setLastSceneId] = useState(selectedSceneId);
  if (lastSceneId !== selectedSceneId) {
    setLastSceneId(selectedSceneId);
    setPlayheadSeconds(0);
    setSelectedBeatIndex(0);
  }
  const [selectedDirectorTab, setSelectedDirectorTab] =
    useState<DirectorTabId>("direct");

  /* F3-WP2/F3-WP3: session-local direction state keyed by deterministic
   * UI-local beat identity (scene ID + beat index). Each beat keeps its
   * own eight-field draft, committed history, and redo branch; switching
   * beats or scenes never shows another beat's state, and
   * leaving/returning preserves it. */
  const [directByBeat, setDirectByBeat] = useState<
    Record<string, BeatDirectState>
  >({});

  const selectedIndex = useMemo(
    () => OLLO_DEMO_SCENES.findIndex((scene) => scene.id === selectedSceneId),
    [selectedSceneId],
  );
  const selectedScene: DemoScene = OLLO_DEMO_SCENES[selectedIndex]!;
  const previousScene =
    selectedIndex > 0 ? OLLO_DEMO_SCENES[selectedIndex - 1]! : null;
  const nextScene =
    selectedIndex < OLLO_DEMO_SCENES.length - 1
      ? OLLO_DEMO_SCENES[selectedIndex + 1]!
      : null;

  const sceneLocation = useMemo(() => {
    for (const act of OLLO_DEMO_PROJECT.acts)
      for (const sequence of act.sequences)
        if (sequence.scenes.some((scene) => scene.id === selectedSceneId))
          return { actId: act.id, sequenceId: sequence.id };
    return null;
  }, [selectedSceneId]);

  const selectedSequence = useMemo(() => {
    for (const act of OLLO_DEMO_PROJECT.acts)
      for (const sequence of act.sequences)
        if (sequence.id === sceneLocation?.sequenceId) return sequence;
    return null;
  }, [sceneLocation]);

  const selectedBeat = selectedScene.beats[selectedBeatIndex]!;
  /** One authoritative beat selection path. Rail beat buttons render only
   * for the selected scene, so selecting a beat never changes the scene. */
  const selectBeat = (beatIndex: number) => {
    setSelectedBeatIndex(beatIndex);
  };

  /* Direct state for the currently selected beat only. Every mutation
   * goes through one updater that reads and writes only this beat's key,
   * so no edit, apply, undo, or redo can touch another beat or scene. */
  const selectedBeatDirectKey = directBeatKey(
    selectedSceneId,
    selectedBeatIndex,
  );
  const selectedBeatDirect =
    directByBeat[selectedBeatDirectKey] ?? initialBeatDirectState();
  const updateSelectedBeatDirect = (
    step: (state: BeatDirectState) => BeatDirectState,
  ) => {
    setDirectByBeat((current) => {
      const previous =
        current[selectedBeatDirectKey] ?? initialBeatDirectState();
      const next = step(previous);
      if (next === previous) return current;
      return { ...current, [selectedBeatDirectKey]: next };
    });
  };

  /* F3-WP3: the committed snapshot drives the board's Selected direction
   * summary. Draft values never appear there — only Apply commits them. */
  const committedSelectedBeat = committedDirectDraft(selectedBeatDirect);

  /* F3-WP4: the docked AI Director panel commits its one bounded proposal
   * Apply through this writer, which targets exactly the captured beat's
   * key — never another beat or scene. */
  const commitBeatDirect = (beatKey: string, next: BeatDirectState) => {
    setDirectByBeat((current) => ({ ...current, [beatKey]: next }));
  };

  /* F3-WP4: the panel's one honest recovery action returns selection to a
   * proposal's immutable captured scope. A same-scene return selects the
   * beat directly; a cross-scene return rides the accepted scene-change
   * adjustment (which resets to the first beat) and then applies the
   * captured beat exactly once, after the scene has settled. */
  const pendingCapturedBeatRef = useRef<number | null>(null);
  const returnToCapturedScope = (sceneId: string, beatIndex: number) => {
    if (sceneId === selectedSceneId) {
      setSelectedBeatIndex(beatIndex);
      return;
    }
    pendingCapturedBeatRef.current = beatIndex;
    selectScene(sceneId);
  };
  useEffect(() => {
    if (pendingCapturedBeatRef.current === null) return;
    const capturedBeat = pendingCapturedBeatRef.current;
    pendingCapturedBeatRef.current = null;
    setSelectedBeatIndex(capturedBeat);
  }, [selectedSceneId]);

  /** One bounded Visual/Motion intent select bound to the shared draft. */
  const intentSelect = (
    field: (typeof INTENT_SELECT_FIELDS)[keyof typeof INTENT_SELECT_FIELDS],
  ) => (
    <label className="pv1-direct-field" key={field.id}>
      <span>{field.label}</span>
      <select
        onChange={(event) =>
          updateSelectedBeatDirect((state) =>
            updateDirectDraft(state, {
              [field.id]: event.target.value,
            } as Partial<DirectDraft>),
          )
        }
        value={selectedBeatDirect.draft[field.id]}
      >
        {field.options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );

  /* One shared direction form rendered inside every Director tab: the
   * session-local boundary note, that tab's fields, and the same atomic
   * Apply/Undo/Redo for the complete eight-field draft. Tab switches
   * never commit; the status line keeps unapplied drafts visibly
   * distinguishable from the committed snapshot on every tab. */
  const renderDirectionForm = (fields: ReactNode) => (
    <form
      className="pv1-direct-form"
      onSubmit={(event) => {
        event.preventDefault();
        updateSelectedBeatDirect(applyDirectDraft);
      }}
    >
      <p className="pv1-direct-note" role="note">
        Session-local only — this direction and its undo history stay in this
        Studio session. They are not saved to the project, are not interpreted
        by AI, and are not used for animation, rendering, or export.
      </p>
      {fields}
      <div className="pv1-direct-actions">
        <button className="pv1-primary" type="submit">
          Apply
        </button>
        <button
          className="pv1-secondary"
          disabled={!canUndoDirect(selectedBeatDirect)}
          onClick={() => updateSelectedBeatDirect(undoDirect)}
          type="button"
        >
          <Undo2 size={14} aria-hidden /> Undo
        </button>
        <button
          className="pv1-secondary"
          disabled={!canRedoDirect(selectedBeatDirect)}
          onClick={() => updateSelectedBeatDirect(redoDirect)}
          type="button"
        >
          <Redo2 size={14} aria-hidden /> Redo
        </button>
      </div>
      <p aria-live="polite" className="pv1-direct-status">
        {hasUnappliedDirectChanges(selectedBeatDirect)
          ? "Unapplied draft changes — Apply commits them as one step in this beat's session history."
          : "Draft matches this beat's committed session direction."}
      </p>
    </form>
  );

  const revealScene = (sceneId: string) => {
    for (const act of OLLO_DEMO_PROJECT.acts)
      for (const sequence of act.sequences)
        if (sequence.scenes.some((scene) => scene.id === sceneId)) {
          setCollapsedActs((current) => {
            if (!current.has(act.id)) return current;
            const next = new Set(current);
            next.delete(act.id);
            return next;
          });
          setCollapsedSequences((current) => {
            if (!current.has(sequence.id)) return current;
            const next = new Set(current);
            next.delete(sequence.id);
            return next;
          });
          return;
        }
  };

  const revealSelectedScene = () => {
    if (!sceneLocation) return;
    revealScene(selectedSceneId);
  };

  const pendingRailFocusId = useRef<string | null>(null);

  /** One authoritative selection path for every surface. Keyboard-driven
   * changes also reveal collapsed ancestors and return rail focus. */
  const selectScene = (sceneId: string, returnRailFocus = false) => {
    setSelectedSceneId(sceneId);
    revealScene(sceneId);
    if (returnRailFocus) pendingRailFocusId.current = sceneId;
  };

  useEffect(() => {
    if (!pendingRailFocusId.current) return;
    const focusId = pendingRailFocusId.current;
    pendingRailFocusId.current = null;
    document.getElementById(`pv1-rail-scene-${focusId}`)?.focus();
  });

  /* Rail keyboard contract (documented): ArrowDown/ArrowRight selects the
   * next scene, ArrowUp/ArrowLeft the previous, Home/End the first/last.
   * Navigation crosses sequence and act boundaries, clamps at first/last,
   * reveals collapsed ancestors of the target, and moves focus with the
   * selection — always through the same authoritative scene state. */
  const onRailSceneKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>,
    index: number,
  ) => {
    let target: number | null = null;
    if (event.key === "ArrowDown" || event.key === "ArrowRight")
      target = Math.min(index + 1, OLLO_DEMO_SCENES.length - 1);
    else if (event.key === "ArrowUp" || event.key === "ArrowLeft")
      target = Math.max(index - 1, 0);
    else if (event.key === "Home") target = 0;
    else if (event.key === "End") target = OLLO_DEMO_SCENES.length - 1;
    if (target === null || target === index) return;
    event.preventDefault();
    selectScene(OLLO_DEMO_SCENES[target]!.id, true);
  };

  /* Director tab keyboard contract: ArrowRight/ArrowLeft move between the
   * Direct/Visual/Motion tabs (wrapping), Home/End jump to first/last, and
   * focus follows the selection — the same pattern as the rail contract. */
  const onDirectorTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    const ids = DIRECTOR_TABS.map((tab) => tab.id);
    const focusedTab = event.currentTarget.dataset.directorTab as
      | DirectorTabId
      | undefined;
    const current = focusedTab ? ids.indexOf(focusedTab) : -1;
    if (current < 0) return;
    let target: number | null = null;
    if (event.key === "ArrowRight") target = (current + 1) % ids.length;
    else if (event.key === "ArrowLeft")
      target = (current - 1 + ids.length) % ids.length;
    else if (event.key === "Home") target = 0;
    else if (event.key === "End") target = ids.length - 1;
    if (target === null) return;
    event.preventDefault();
    const nextId = ids[target]!;
    setSelectedDirectorTab(nextId);
    document.getElementById(`pv1-director-tab-${nextId}`)?.focus();
  };

  /* F3-WP5: entering the Studio moves focus deliberately to the primary
   * board heading — once, on arrival. Scene/beat selection afterwards keeps
   * the accepted rail keyboard contract (focus follows selection). */
  const boardHeadingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    boardHeadingRef.current?.focus();
  }, []);

  return (
    <main className="pv1-page" data-testid="pv1-studio">
      <header className="pv1-topbar">
        <span className="pv1-brand">StoryStage</span>
        <span className="pv1-topbar-context">{projectTitle}</span>
        <span className="pv1-studio-badges">
          <span className="pv1-badge">{grammarLabel}</span>
          <span className="pv1-badge">{artStyleLabel}</span>
        </span>
        <AiDirectorControls
          connection={aiConnection}
          onConnectionChange={onAiConnectionChange}
        />
        <span className="pv1-banner" role="note">
          {LOCAL_DEMO_BANNER}
        </span>
        <button
          className="pv1-secondary"
          onClick={onBackToProjects}
          type="button"
        >
          <ArrowLeft size={15} aria-hidden /> Back to projects
        </button>
      </header>

      {/* Permanent scope header: the one shared episode/sequence/scene/beat
       * scope every surface (rail, board, Director tabs) agrees on. */}
      <nav aria-label="Current scope" className="pv1-scope-header">
        <ol>
          <li>{projectTitle}</li>
          <li aria-hidden className="pv1-scope-separator">
            /
          </li>
          <li>{selectedSequence?.title ?? "Sequence not placed"}</li>
          <li aria-hidden className="pv1-scope-separator">
            /
          </li>
          <li>
            Scene {selectedIndex + 1} · {selectedScene.title}
          </li>
          <li aria-hidden className="pv1-scope-separator">
            /
          </li>
          <li aria-current="true" className="pv1-scope-current">
            Beat {selectedBeatIndex + 1} · {selectedBeat.title}
          </li>
        </ol>
      </nav>

      <div className="pv1-studio-layout">
        {usesLayoutDemo ? (
          <p className="pv1-layout-demo-note" role="note">
            Layout demo — the eight scenes below are the bounded Ollo demo plan,
            not scenes from your script. Script-specific scenes have not been
            planned or generated yet.
          </p>
        ) : null}
        <nav aria-label="Episode hierarchy" className="pv1-studio-rail">
          <p className="pv1-rail-hint">
            Arrow keys move between scenes · Home/End jump to first/last
          </p>
          {OLLO_DEMO_PROJECT.acts.map((act) => {
            const actCollapsed = collapsedActs.has(act.id);
            const actHidesSelected =
              sceneLocation?.actId === act.id && actCollapsed;
            return (
              <section className="pv1-rail-act" key={act.id}>
                <h2>
                  <button
                    aria-expanded={!actCollapsed}
                    className="pv1-group-toggle"
                    onClick={() =>
                      setCollapsedActs((current) => toggle(current, act.id))
                    }
                    type="button"
                  >
                    {actCollapsed ? (
                      <ChevronRight size={13} aria-hidden />
                    ) : (
                      <ChevronDown size={13} aria-hidden />
                    )}
                    {act.title}
                  </button>
                </h2>
                {actHidesSelected ? (
                  <p className="pv1-hidden-selection" role="note">
                    <span>
                      Selected scene {selectedIndex + 1} · {selectedScene.title}
                    </span>
                    <button onClick={revealSelectedScene} type="button">
                      <LocateFixed size={12} aria-hidden /> Reveal
                    </button>
                  </p>
                ) : null}
                {!actCollapsed
                  ? act.sequences.map((sequence) => {
                      const sequenceCollapsed = collapsedSequences.has(
                        sequence.id,
                      );
                      const sequenceHidesSelected =
                        sceneLocation?.sequenceId === sequence.id &&
                        sequenceCollapsed;
                      return (
                        <div className="pv1-rail-sequence" key={sequence.id}>
                          <h3>
                            <button
                              aria-expanded={!sequenceCollapsed}
                              className="pv1-group-toggle"
                              onClick={() =>
                                setCollapsedSequences((current) =>
                                  toggle(current, sequence.id),
                                )
                              }
                              type="button"
                            >
                              {sequenceCollapsed ? (
                                <ChevronRight size={12} aria-hidden />
                              ) : (
                                <ChevronDown size={12} aria-hidden />
                              )}
                              {sequence.title}
                            </button>
                          </h3>
                          {sequenceHidesSelected ? (
                            <p className="pv1-hidden-selection" role="note">
                              <span>
                                Selected scene {selectedIndex + 1} ·{" "}
                                {selectedScene.title}
                              </span>
                              <button
                                onClick={revealSelectedScene}
                                type="button"
                              >
                                <LocateFixed size={12} aria-hidden /> Reveal
                              </button>
                            </p>
                          ) : null}
                          {!sequenceCollapsed
                            ? sequence.scenes.map((scene) => {
                                const index = OLLO_DEMO_SCENES.indexOf(scene);
                                const isSelected = scene.id === selectedSceneId;
                                return (
                                  <div key={scene.id}>
                                    <button
                                      aria-current={
                                        isSelected ? "true" : undefined
                                      }
                                      aria-label={`Scene ${index + 1} ${scene.title} — ${scene.seconds} seconds, not produced`}
                                      className={`pv1-rail-scene ${isSelected ? "is-selected" : ""}`}
                                      id={`pv1-rail-scene-${scene.id}`}
                                      onClick={() => selectScene(scene.id)}
                                      onKeyDown={(event) =>
                                        onRailSceneKeyDown(event, index)
                                      }
                                      type="button"
                                    >
                                      <span className="pv1-scene-index">
                                        {index + 1}
                                      </span>
                                      <span className="pv1-rail-scene-body">
                                        <strong>{scene.title}</strong>
                                        <small>
                                          {scene.seconds}s · not produced
                                        </small>
                                      </span>
                                    </button>
                                    {isSelected ? (
                                      <ol
                                        aria-label={`Beats in ${scene.title}`}
                                        className="pv1-rail-beats"
                                      >
                                        {scene.beats.map((beat, beatIndex) => {
                                          const isBeatSelected =
                                            beatIndex === selectedBeatIndex;
                                          return (
                                            <li
                                              data-beat-for={scene.id}
                                              key={beat.title}
                                            >
                                              <button
                                                aria-current={
                                                  isBeatSelected
                                                    ? "true"
                                                    : undefined
                                                }
                                                aria-label={`Beat ${beatIndex + 1} ${beat.title} — ${beat.seconds} seconds`}
                                                className={`pv1-rail-beat ${isBeatSelected ? "is-selected" : ""}`}
                                                onClick={() =>
                                                  selectBeat(beatIndex)
                                                }
                                                type="button"
                                              >
                                                <span>{beat.title}</span>
                                                <small>{beat.seconds}s</small>
                                              </button>
                                            </li>
                                          );
                                        })}
                                      </ol>
                                    ) : null}
                                  </div>
                                );
                              })
                            : null}
                        </div>
                      );
                    })
                  : null}
              </section>
            );
          })}
        </nav>

        <section aria-label="Scene board" className="pv1-studio-board">
          <header className="pv1-board-heading">
            <div>
              <small>
                Scene {selectedIndex + 1} of {OLLO_DEMO_SCENES.length}
              </small>
              <h1 ref={boardHeadingRef} tabIndex={-1}>
                {selectedScene.title}
              </h1>
            </div>
            <span className="pv1-badge">Reference board — not animation</span>
          </header>
          <section aria-label="Selected beat" className="pv1-beat-card">
            <small>
              Beat {selectedBeatIndex + 1} of {selectedScene.beats.length} ·{" "}
              {selectedBeat.seconds}s
            </small>
            <h2>{selectedBeat.title}</h2>
            <p>
              Planning metadata only — no imagery, animation, or audio exists
              for this beat.
            </p>
          </section>
          {/* F3-WP3: committed-only direction summary for the selected
           * beat. It never shows unapplied draft values and never alters,
           * filters, or effects the reference image below. */}
          <section
            aria-label="Selected direction summary"
            className="pv1-direction-summary"
          >
            <h2>Selected direction summary</h2>
            {hasCommittedVisualMotionDirection(selectedBeatDirect) ? (
              <dl>
                <div>
                  <dt>Framing</dt>
                  <dd>{committedSelectedBeat.framing}</dd>
                </div>
                <div>
                  <dt>Composition focus</dt>
                  <dd>{committedSelectedBeat.compositionFocus}</dd>
                </div>
                <div>
                  <dt>Camera intent</dt>
                  <dd>{committedSelectedBeat.cameraIntent}</dd>
                </div>
                <div>
                  <dt>Performance pace</dt>
                  <dd>{committedSelectedBeat.performancePace}</dd>
                </div>
                <div>
                  <dt>End hold</dt>
                  <dd>{committedSelectedBeat.endHold}</dd>
                </div>
              </dl>
            ) : (
              <p className="pv1-direction-summary-empty">
                No Visual or Motion direction committed for this beat
              </p>
            )}
            <p className="pv1-direction-summary-note">
              Planning overlay — not animation or rendered output.
            </p>
          </section>
          <div className="pv1-board-canvas">
            {/* Reference art is ordinary browser UI, not a Remotion composition. */}
            {/* eslint-disable-next-line @remotion/warn-native-media-tag */}
            <img alt="Ollo & Friends cast reference art" src={olloCastArt} />
            <p className="pv1-board-note">
              Local reference art only — no imagery, animation, audio, or render
              exists for this scene.
            </p>
          </div>
          <div className="pv1-playhead">
            <label htmlFor="pv1-playhead-slider">
              Scene playhead <small>local UI timing — not media playback</small>
            </label>
            <input
              aria-label={`Scene playhead for ${selectedScene.title} — local UI timing, not media playback`}
              aria-valuetext={`${formatClock(playheadSeconds)} of ${formatClock(selectedScene.seconds)}`}
              id="pv1-playhead-slider"
              max={selectedScene.seconds}
              min={0}
              onChange={(event) =>
                setPlayheadSeconds(Number(event.target.value))
              }
              step={1}
              type="range"
              value={playheadSeconds}
            />
            <span aria-live="polite" className="pv1-playhead-readout">
              {formatClock(playheadSeconds)} /{" "}
              {formatClock(selectedScene.seconds)}
            </span>
          </div>
          <div
            aria-label="Scene transport"
            className="pv1-transport"
            role="group"
          >
            <button
              aria-label="Previous scene"
              disabled={!previousScene}
              onClick={() => previousScene && selectScene(previousScene.id)}
              type="button"
            >
              <ChevronLeft size={16} aria-hidden /> Previous
            </button>
            <span className="pv1-transport-readout" aria-live="polite">
              Scene {selectedIndex + 1} of {OLLO_DEMO_SCENES.length} ·{" "}
              {selectedScene.seconds}s · episode{" "}
              {formatClock(sceneStart(selectedScene.id))}–
              {formatClock(
                sceneStart(selectedScene.id) + selectedScene.seconds,
              )}{" "}
              of {formatClock(OLLO_DEMO_TOTAL_SECONDS)}
            </span>
            <button
              aria-label="Next scene"
              disabled={!nextScene}
              onClick={() => nextScene && selectScene(nextScene.id)}
              type="button"
            >
              Next <ChevronRight size={16} aria-hidden />
            </button>
          </div>
        </section>

        <aside aria-label="Studio inspector" className="pv1-studio-inspector">
          <div className="pv1-inspector-block">
            <h2>
              <Clapperboard size={15} aria-hidden /> Director
            </h2>
            <div
              aria-label="Director workspace"
              className="pv1-director-tabs"
              role="tablist"
            >
              {DIRECTOR_TABS.map((tab) => (
                <button
                  aria-controls={`pv1-director-panel-${tab.id}`}
                  aria-selected={selectedDirectorTab === tab.id}
                  className={`pv1-director-tab ${selectedDirectorTab === tab.id ? "is-selected" : ""}`}
                  data-director-tab={tab.id}
                  id={`pv1-director-tab-${tab.id}`}
                  key={tab.id}
                  onClick={() => setSelectedDirectorTab(tab.id)}
                  onKeyDown={onDirectorTabKeyDown}
                  role="tab"
                  tabIndex={selectedDirectorTab === tab.id ? 0 : -1}
                  type="button"
                >
                  {tab.label}
                </button>
              ))}
            </div>
            {DIRECTOR_TABS.map((tab) => (
              <div
                aria-labelledby={`pv1-director-tab-${tab.id}`}
                className="pv1-director-panel"
                hidden={selectedDirectorTab !== tab.id}
                id={`pv1-director-panel-${tab.id}`}
                key={tab.id}
                role="tabpanel"
              >
                <p className="pv1-director-scope">
                  Scope: Scene {selectedIndex + 1} · Beat{" "}
                  {selectedBeatIndex + 1} — {selectedBeat.title}
                </p>
                {tab.id === "direct"
                  ? renderDirectionForm(
                      DIRECT_FIELDS.map((field) => (
                        <label className="pv1-direct-field" key={field.id}>
                          <span>{field.label}</span>
                          <textarea
                            maxLength={500}
                            onChange={(event) =>
                              updateSelectedBeatDirect((state) =>
                                updateDirectDraft(state, {
                                  [field.id]: event.target.value,
                                } as Partial<DirectDraft>),
                              )
                            }
                            placeholder={field.placeholder}
                            rows={2}
                            value={selectedBeatDirect.draft[field.id]}
                          />
                        </label>
                      )),
                    )
                  : tab.id === "visual"
                    ? renderDirectionForm(
                        <>
                          {intentSelect(INTENT_SELECT_FIELDS.framing)}
                          <label className="pv1-direct-field">
                            <span>Composition focus</span>
                            <textarea
                              maxLength={COMPOSITION_FOCUS_MAX_LENGTH}
                              onChange={(event) =>
                                updateSelectedBeatDirect((state) =>
                                  updateDirectDraft(state, {
                                    compositionFocus: event.target.value,
                                  }),
                                )
                              }
                              placeholder="What the viewer's eye should land on first"
                              rows={2}
                              value={selectedBeatDirect.draft.compositionFocus}
                            />
                          </label>
                        </>,
                      )
                    : renderDirectionForm(
                        <>
                          {intentSelect(INTENT_SELECT_FIELDS.cameraIntent)}
                          {intentSelect(INTENT_SELECT_FIELDS.performancePace)}
                          {intentSelect(INTENT_SELECT_FIELDS.endHold)}
                        </>,
                      )}
              </div>
            ))}
          </div>
          <div className="pv1-inspector-block">
            <h2>
              <Film size={15} aria-hidden /> Preview &amp; export
            </h2>
            <button className="pv1-secondary" disabled type="button">
              Preview
            </button>
            <small>
              Preview stays disabled in F3-WP3 — direction intent is
              session-local planning only; there is still no media to preview.
            </small>
            <button className="pv1-primary" disabled type="button">
              Export
            </button>
            <small>Export unlocks when production services connect.</small>
          </div>
        </aside>

        {/* F3-WP4: docked right-side AI Director conversation/proposal
         * panel. The visual board remains the primary surface. */}
        <AiDirectorPanel
          connection={aiConnection}
          directByBeat={directByBeat}
          onCommitBeat={commitBeatDirect}
          onConnectionChange={onAiConnectionChange}
          onPlayheadChange={setPlayheadSeconds}
          onReturnToScope={returnToCapturedScope}
          playheadSeconds={playheadSeconds}
          selectedBeatIndex={selectedBeatIndex}
          selectedScene={selectedScene}
          selectedSceneIndex={selectedIndex}
        />
      </div>

      <nav aria-label="Episode overview" className="pv1-studio-overview">
        {OLLO_DEMO_SCENES.map((scene, index) => {
          const isSelected = scene.id === selectedSceneId;
          return (
            <button
              aria-current={isSelected ? "true" : undefined}
              aria-label={`Scene ${index + 1} ${scene.title} — ${scene.seconds} seconds`}
              className={`pv1-overview-scene ${isSelected ? "is-selected" : ""}`}
              key={scene.id}
              onClick={() => selectScene(scene.id)}
              type="button"
            >
              <span className="pv1-scene-index">{index + 1}</span>
              <strong>{scene.title}</strong>
              <small>{scene.seconds}s</small>
            </button>
          );
        })}
      </nav>
    </main>
  );
}
