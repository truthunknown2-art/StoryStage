import {
  commitCv002Operation,
  redoCv002Operation,
  restoreCv002TemplateAssignment,
  undoCv002Operation,
  verifyCv002TemplateAssignment,
  CV002_TEMPLATE_ASSIGNMENT_STORAGE_KEY,
  type Cv002Beat,
  type Cv002BeatDirection,
  type Cv002BeatRole,
  type Cv002GraphOperation,
  type Cv002Project,
  type Cv002TemplateAssignment,
} from "@storystage/story-engine";
import {
  alphaCapabilityRegistry,
  compileDirectorProject,
  createDirectorWorkspaceState,
  currentDirectorWorkspaceProject,
  directorWorkspaceStorageKey,
  restoreDirectorWorkspaceState,
  selectDirectorWorkspaceBeat,
  serializeDirectorWorkspaceState,
  type CapabilityRegistry,
  type DirectorProject,
  type DirectorWorkspaceState,
} from "@storystage/story-engine/director-alpha";
import { createBundledKidsPilotCapabilityRegistry } from "@storystage/remotion-runtime/director";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronRight,
  Clapperboard,
  Feather,
  Merge,
  Redo2,
  RotateCcw,
  Scissors,
  Sparkles,
  Trees,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Cv002TemplateAssignmentPanel } from "./Cv002TemplateAssignmentPanel";
import { CreatorStudioShell } from "./creator-studio-components";

const GRAMMAR_LABEL: Record<Cv002Project["grammar"], string> = {
  "kids-adventure": "Kids Adventure",
  "weird-history": "Weird History",
};

/** Short creator-facing labels for the sealed art-direction option ids. */
const ART_DIRECTION_LABEL: Record<string, string> = {
  "storybook-watercolor-paper-cutout": "Storybook Cutout",
  "cut-paper-collage-mixed-media": "Cut Paper Collage",
  "soft-2d-digital-illustration": "Soft 2D",
  "weird-history-editorial-collage": "Editorial Collage",
};
import { DirectorAnimaticPreview } from "./director/DirectorPreview";
import "./cv002-draft-review.css";

type DraftScreen = "breakdown" | "direction";

const ROLE_OPTIONS: Array<{ value: Cv002BeatRole; label: string }> = [
  { value: "setup", label: "Setup" },
  { value: "action", label: "Action" },
  { value: "reaction", label: "Reaction" },
  { value: "reveal", label: "Reveal" },
  { value: "explanation", label: "Explanation" },
  { value: "punchline", label: "Punchline" },
  { value: "transition", label: "Transition" },
];

const humanize = (value: string) => value.replaceAll("-", " ");

const loadDirectorWorkspace = (
  storyProject: Cv002Project,
  directorProject: DirectorProject,
  selectedBeatId: string,
  capabilities: CapabilityRegistry,
) => {
  const storageKey = directorWorkspaceStorageKey(storyProject.contentHash);
  const serialized = window.localStorage.getItem(storageKey);
  if (serialized)
    try {
      return restoreDirectorWorkspaceState(
        serialized,
        storyProject,
        capabilities,
      );
    } catch {
      window.localStorage.removeItem(storageKey);
    }
  return createDirectorWorkspaceState(directorProject, selectedBeatId);
};

const operationLabel = (operation: Cv002GraphOperation) => {
  if (operation.type === "split-beat") return "Split beat";
  if (operation.type === "merge-beats") return "Merged beats";
  if (operation.type === "set-scene-boundary")
    return operation.enabled ? "Started scene" : "Removed scene break";
  return `Changed role to ${humanize(operation.role)}`;
};

const directionFields: Array<{ key: keyof Cv002BeatDirection; label: string }> =
  [
    { key: "staging", label: "Staging" },
    { key: "shotSize", label: "Shot" },
    { key: "treatment", label: "Visual treatment" },
    { key: "cameraIntent", label: "Camera" },
    { key: "transition", label: "Transition" },
    { key: "performanceIntent", label: "Performance" },
    { key: "textEmphasis", label: "On-screen text" },
    { key: "sfxIntent", label: "Sound effect" },
    { key: "musicIntent", label: "Music" },
  ];

function GrammarBadge({ grammar }: { grammar: Cv002Project["grammar"] }) {
  return grammar === "kids-adventure" ? (
    <span className="cv2-grammar is-kids">
      <Trees size={15} /> Kids Adventure
    </span>
  ) : (
    <span className="cv2-grammar is-history">
      <Feather size={15} /> Weird History
    </span>
  );
}

export function Cv002DraftReview({
  onBack,
  onProjectChange,
  project,
}: {
  onBack: () => void;
  onProjectChange: (project: Cv002Project) => void;
  project: Cv002Project;
}) {
  const [screen, setScreen] = useState<DraftScreen>("breakdown");
  const allBeats = useMemo(
    () => project.graph.scenes.flatMap((scene) => scene.beats),
    [project.graph],
  );
  const firstBeatRole = allBeats[0]!.role;
  const capabilityRegistry = useMemo(() => {
    if (project.grammar !== "kids-adventure") return alphaCapabilityRegistry;
    const kind =
      firstBeatRole === "setup" || firstBeatRole === "explanation"
        ? "living-hold"
        : firstBeatRole === "action"
          ? "atlas-cycle"
          : "articulated-rig";
    return createBundledKidsPilotCapabilityRegistry(kind);
  }, [firstBeatRole, project.grammar]);
  const directorCompilation = useMemo<{
    directorProject: DirectorProject | null;
    error: string | null;
  }>(() => {
    try {
      return {
        directorProject: compileDirectorProject({
          storyProject: project,
          capabilities: capabilityRegistry,
        }),
        error: null,
      };
    } catch (caught) {
      return {
        directorProject: null,
        error:
          caught instanceof Error
            ? caught.message
            : "The Director could not compile this script.",
      };
    }
  }, [capabilityRegistry, project]);
  const [directorWorkspace, setDirectorWorkspace] =
    useState<DirectorWorkspaceState | null>(() =>
      directorCompilation.directorProject
        ? loadDirectorWorkspace(
            project,
            directorCompilation.directorProject,
            allBeats[0]!.id,
            capabilityRegistry,
          )
        : null,
    );
  const pendingSelectedBeatId = useRef<string | null>(null);
  const [splitCursor, setSplitCursor] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [assignment, setAssignment] = useState<Cv002TemplateAssignment | null>(
    () => {
      const serialized = window.localStorage.getItem(
        CV002_TEMPLATE_ASSIGNMENT_STORAGE_KEY,
      );
      if (!serialized) return null;
      try {
        return restoreCv002TemplateAssignment(serialized, project);
      } catch {
        window.localStorage.removeItem(CV002_TEMPLATE_ASSIGNMENT_STORAGE_KEY);
        return null;
      }
    },
  );
  useEffect(() => {
    const directorProject = directorCompilation.directorProject;
    if (!directorProject) {
      setDirectorWorkspace(null);
      return;
    }
    setDirectorWorkspace((current) => {
      if (current?.storyProjectContentHash === project.contentHash)
        return current;
      const requestedBeatId =
        pendingSelectedBeatId.current ??
        current?.selectedBeatId ??
        allBeats[0]!.id;
      pendingSelectedBeatId.current = null;
      const selectedBeatId = allBeats.some(
        (beat) => beat.id === requestedBeatId,
      )
        ? requestedBeatId
        : allBeats[0]!.id;
      return loadDirectorWorkspace(
        project,
        directorProject,
        selectedBeatId,
        capabilityRegistry,
      );
    });
  }, [
    allBeats,
    capabilityRegistry,
    directorCompilation.directorProject,
    project,
  ]);

  useEffect(() => {
    if (!directorWorkspace) return;
    window.localStorage.setItem(
      directorWorkspaceStorageKey(project.contentHash),
      serializeDirectorWorkspaceState(directorWorkspace),
    );
  }, [directorWorkspace, project.contentHash]);

  const selectedBeatId = directorWorkspace?.selectedBeatId ?? allBeats[0]!.id;
  const studioDirector = directorWorkspace
    ? currentDirectorWorkspaceProject(directorWorkspace)
    : directorCompilation.directorProject;
  const studioCapabilitySummary = studioDirector?.capabilityReport.summary;
  const setSelectedBeatId = (beatId: string) => {
    setDirectorWorkspace((current) => {
      if (
        !current ||
        !currentDirectorWorkspaceProject(current).directorPlan.beats.some(
          (beat) => beat.beatId === beatId,
        )
      ) {
        pendingSelectedBeatId.current = beatId;
        return current;
      }
      return selectDirectorWorkspaceBeat(current, beatId);
    });
  };
  const selectedBeat =
    allBeats.find((beat) => beat.id === selectedBeatId) ?? allBeats[0]!;
  const selectedIndex = allBeats.findIndex(
    (beat) => beat.id === selectedBeat.id,
  );
  const selectedSceneIndex = project.graph.scenes.findIndex((scene) =>
    scene.beats.some((beat) => beat.id === selectedBeat.id),
  );
  const isSceneStart = project.graph.scenes.some(
    (scene) => scene.beats[0]?.id === selectedBeat.id,
  );
  const sourceRef = useRef<HTMLTextAreaElement>(null);

  const saveAssignment = (next: Cv002TemplateAssignment | null) => {
    if (next)
      window.localStorage.setItem(
        CV002_TEMPLATE_ASSIGNMENT_STORAGE_KEY,
        JSON.stringify(next),
      );
    else window.localStorage.removeItem(CV002_TEMPLATE_ASSIGNMENT_STORAGE_KEY);
    setAssignment(next);
  };

  const invalidateAssignmentIfNeeded = (next: Cv002Project) => {
    if (!assignment) return false;
    try {
      verifyCv002TemplateAssignment(next, assignment);
      return false;
    } catch {
      saveAssignment(null);
      return true;
    }
  };

  const update = (
    operation: Cv002GraphOperation,
    nextSelection?: (next: Cv002Project) => string,
  ) => {
    try {
      const next = commitCv002Operation(project, operation);
      onProjectChange(next);
      setSelectedBeatId(
        nextSelection
          ? nextSelection(next)
          : (next.graph.scenes
              .flatMap((scene) => scene.beats)
              .find(
                (beat) =>
                  beat.sourceRange.start <= selectedBeat.sourceRange.start &&
                  beat.sourceRange.end >= selectedBeat.sourceRange.start,
              )?.id ?? next.graph.scenes[0]!.beats[0]!.id),
      );
      setSplitCursor(null);
      setError(null);
      setFeedback(
        invalidateAssignmentIfNeeded(next)
          ? "Story updated. The animation template assignment was invalidated and must be reviewed again."
          : operationLabel(operation),
      );
    } catch (caught) {
      setFeedback(null);
      setError(
        caught instanceof Error
          ? caught.message
          : "That edit could not be applied.",
      );
    }
  };

  const undo = () => {
    try {
      const next = undoCv002Operation(project);
      onProjectChange(next);
      setSelectedBeatId(
        next.graph.scenes
          .flatMap((scene) => scene.beats)
          .find(
            (beat) =>
              beat.sourceRange.start <= selectedBeat.sourceRange.start &&
              beat.sourceRange.end >= selectedBeat.sourceRange.start,
          )?.id ?? next.graph.scenes[0]!.beats[0]!.id,
      );
      setFeedback(
        invalidateAssignmentIfNeeded(next)
          ? "Undid story edit. The animation template assignment was invalidated and must be reviewed again."
          : "Undid story edit",
      );
      setError(null);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "There is nothing to undo.",
      );
    }
  };

  const redo = () => {
    try {
      const next = redoCv002Operation(project);
      onProjectChange(next);
      setSelectedBeatId(
        next.graph.scenes
          .flatMap((scene) => scene.beats)
          .find(
            (beat) =>
              beat.sourceRange.start <= selectedBeat.sourceRange.start &&
              beat.sourceRange.end >= selectedBeat.sourceRange.start,
          )?.id ?? next.graph.scenes[0]!.beats[0]!.id,
      );
      setFeedback(
        invalidateAssignmentIfNeeded(next)
          ? "Redid story edit. The animation template assignment was invalidated and must be reviewed again."
          : "Redid story edit",
      );
      setError(null);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "There is nothing to redo.",
      );
    }
  };

  const chooseBeat = (beat: Cv002Beat) => {
    setSelectedBeatId(beat.id);
    setSplitCursor(null);
    setFeedback(null);
    setError(null);
  };

  const captureCursor = () => {
    const cursor = sourceRef.current?.selectionStart ?? 0;
    setSplitCursor(
      cursor > 0 && cursor < selectedBeat.text.length
        ? selectedBeat.sourceRange.start + cursor
        : null,
    );
  };

  const directionByBeat = new Map(
    project.directionDraft.directions.map((direction) => [
      direction.beatId,
      direction,
    ]),
  );

  return (
    <main
      className={`cv2-review is-${project.grammar}${
        screen === "direction" ? " is-direction-screen" : ""
      }`}
    >
      <header className="cv2-topbar">
        <button className="cv2-back" onClick={onBack} type="button">
          <ArrowLeft size={17} /> Projects
        </button>
        <div className="cv2-brand">
          <span>
            <Clapperboard size={18} />
          </span>
          <div>
            <strong>StoryStage</strong>
            <small>{project.title}</small>
          </div>
        </div>
        <div aria-label="Project setup" className="cv2-project-tags">
          <span className="cv2-tag">
            {project.grammar === "kids-adventure" ? (
              <Trees size={13} />
            ) : (
              <Feather size={13} />
            )}
            {GRAMMAR_LABEL[project.grammar]}
          </span>
          <span className="cv2-tag">
            <Sparkles size={13} />
            {ART_DIRECTION_LABEL[project.artDirectionSelection.optionId] ??
              humanize(project.artDirectionSelection.optionId)}
          </span>
        </div>
        <div className="cv2-history-actions">
          <button
            aria-label="Undo story edit"
            disabled={project.historyCursor === 0}
            onClick={undo}
            type="button"
          >
            <RotateCcw size={17} />
          </button>
          <button
            aria-label="Redo story edit"
            disabled={project.historyCursor >= project.history.length}
            onClick={redo}
            type="button"
          >
            <Redo2 size={17} />
          </button>
          <span>Saved locally</span>
        </div>
      </header>

      <nav aria-label="Project steps" className="cv2-steps">
        <button onClick={onBack} type="button">
          <span>
            <Check size={13} />
          </span>
          <div>
            <small>Step 1</small>
            <strong>Script</strong>
          </div>
        </button>
        <ChevronRight size={15} />
        <button
          aria-current={screen === "breakdown" ? "step" : undefined}
          className={screen === "breakdown" ? "is-current" : "is-done"}
          onClick={() => setScreen("breakdown")}
          type="button"
        >
          <span>{screen === "direction" ? <Check size={13} /> : "2"}</span>
          <div>
            <small>Step 2</small>
            <strong>Scenes & beats</strong>
          </div>
        </button>
        <ChevronRight size={15} />
        <button
          aria-current={screen === "direction" ? "step" : undefined}
          className={screen === "direction" ? "is-current" : ""}
          onClick={() => setScreen("direction")}
          type="button"
        >
          <span>3</span>
          <div>
            <small>Step 3</small>
            <strong>Direction draft</strong>
          </div>
        </button>
      </nav>

      {screen === "breakdown" ? (
        <div className="cv2-workspace">
          <aside className="cv2-scene-rail" aria-label="Draft scenes">
            <header>
              <p>Draft breakdown</p>
              <strong>
                {project.graph.scenes.length} scenes · {allBeats.length} beats
              </strong>
            </header>
            <nav aria-label="Scenes and draft beats">
              {project.graph.scenes.map((scene, sceneIndex) => (
                <section key={scene.id}>
                  <header>
                    <span>Scene {String(sceneIndex + 1).padStart(2, "0")}</span>
                    <small>
                      {scene.beats.length}{" "}
                      {scene.beats.length === 1 ? "beat" : "beats"}
                    </small>
                  </header>
                  {scene.beats.map((beat, beatIndex) => (
                    <button
                      aria-current={
                        beat.id === selectedBeat.id ? "true" : undefined
                      }
                      onClick={() => chooseBeat(beat)}
                      key={beat.id}
                      type="button"
                    >
                      <span>
                        {sceneIndex + 1}.{beatIndex + 1}
                      </span>
                      <div>
                        <strong>{humanize(beat.role)}</strong>
                        <small>{beat.text}</small>
                      </div>
                    </button>
                  ))}
                </section>
              ))}
            </nav>
          </aside>

          <section className="cv2-breakdown-main">
            <header className="cv2-page-heading">
              <div>
                <p>Review scenes & beats</p>
                <h1>Shape the story before directing it.</h1>
                <span>
                  StoryStage found a first-pass structure. You decide where each
                  thought begins, ends, and changes purpose.
                </span>
              </div>
              <GrammarBadge grammar={project.grammar} />
            </header>

            <div className="cv2-breakdown-grid">
              <article className="cv2-source-card">
                <header>
                  <div>
                    <small>Selected beat</small>
                    <strong>
                      Scene {selectedSceneIndex + 1} · Beat {selectedIndex + 1}
                    </strong>
                  </div>
                  <span>
                    {selectedBeat.sourceRange.start}–
                    {selectedBeat.sourceRange.end}
                  </span>
                </header>
                <label htmlFor="cv2-beat-source">Source text</label>
                <textarea
                  id="cv2-beat-source"
                  onClick={captureCursor}
                  onKeyUp={captureCursor}
                  onSelect={captureCursor}
                  readOnly
                  ref={sourceRef}
                  value={selectedBeat.text}
                />
                <div className="cv2-cursor-help">
                  <Scissors size={14} />
                  <span>
                    Click between words, then use{" "}
                    <strong>Split at cursor</strong>. Your original script never
                    changes.
                  </span>
                </div>

                <label htmlFor="cv2-beat-role">
                  What job does this beat do?
                </label>
                <select
                  id="cv2-beat-role"
                  onChange={(event) =>
                    update({
                      type: "set-role",
                      beatId: selectedBeat.id,
                      role: event.target.value as Cv002BeatRole,
                    })
                  }
                  value={selectedBeat.role}
                >
                  {ROLE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>

                <div className="cv2-edit-actions">
                  <button
                    disabled={splitCursor === null}
                    onClick={() =>
                      splitCursor !== null &&
                      update(
                        {
                          type: "split-beat",
                          beatId: selectedBeat.id,
                          atOffset: splitCursor,
                        },
                        (next) =>
                          next.graph.scenes
                            .flatMap((scene) => scene.beats)
                            .find(
                              (beat) =>
                                beat.sourceRange.start ===
                                selectedBeat.sourceRange.start,
                            )!.id,
                      )
                    }
                    type="button"
                  >
                    <Scissors size={16} /> Split at cursor
                  </button>
                  <button
                    disabled={selectedIndex === 0}
                    onClick={() =>
                      selectedIndex > 0 &&
                      update({
                        type: "merge-beats",
                        leftBeatId: allBeats[selectedIndex - 1]!.id,
                        rightBeatId: selectedBeat.id,
                      })
                    }
                    type="button"
                  >
                    <Merge size={16} /> Merge with previous
                  </button>
                  <button
                    disabled={selectedIndex === 0}
                    onClick={() =>
                      selectedIndex > 0 &&
                      update({
                        type: "set-scene-boundary",
                        beatId: selectedBeat.id,
                        enabled: !isSceneStart,
                      })
                    }
                    type="button"
                  >
                    {isSceneStart ? "Remove scene break" : "Start new scene"}
                  </button>
                </div>
                {feedback ? (
                  <p className="cv2-feedback" role="status">
                    <Check size={14} />
                    {feedback}
                  </p>
                ) : null}
                {error ? (
                  <p className="cv2-error" role="alert">
                    {error}
                  </p>
                ) : null}
              </article>

              <aside className="cv2-why-card">
                <Sparkles size={18} />
                <h2>Why this beat?</h2>
                <p>
                  {selectedBeat.role === "setup"
                    ? "It establishes the people, place, or question the viewer needs before anything changes."
                    : selectedBeat.role === "action"
                      ? "A visible action should read clearly from anticipation through its result—not as a pose swap."
                      : selectedBeat.role === "reaction"
                        ? "The audience gets time to read how the character feels after the action."
                        : selectedBeat.role === "reveal"
                          ? "This is new information, so the direction draft will give it visual priority."
                          : selectedBeat.role === "explanation"
                            ? "This beat connects evidence and meaning without overloading one shot."
                            : selectedBeat.role === "punchline"
                              ? "The timing needs a clean setup, a decisive turn, and a hold for the joke to land."
                              : "This carries the viewer into a new place, time, or subject."}
                </p>
                <dl>
                  <div>
                    <dt>Exact source</dt>
                    <dd>Preserved</dd>
                  </div>
                  <div>
                    <dt>Source order</dt>
                    <dd>Locked</dd>
                  </div>
                  <div>
                    <dt>Draft ID</dt>
                    <dd>{selectedBeat.id.slice(-6)}</dd>
                  </div>
                </dl>
              </aside>
            </div>

            <footer className="cv2-review-footer">
              <div>
                <strong>Happy with the story rhythm?</strong>
                <span>You can come back and change it at any time.</span>
              </div>
              <button
                onClick={() => {
                  setScreen("direction");
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                type="button"
              >
                Review direction draft <ArrowRight size={17} />
              </button>
            </footer>
          </section>
        </div>
      ) : (
        <section className="cv2-direction-page">
          <header className="cv2-studio-heading">
            <div>
              <p>Director Studio</p>
              <h1>{project.title}</h1>
              <span>
                First cut · {project.graph.scenes.length} scenes ·{" "}
                {allBeats.length} beats · honest{" "}
                {studioCapabilitySummary?.supported
                  ? "hybrid animation"
                  : "proxy animation"}
              </span>
            </div>
            <GrammarBadge grammar={project.grammar} />
          </header>

          <div className="cv2-studio-status" role="status">
            <Check size={15} />
            <strong>Draft animatic ready</strong>
            <span>
              Real direction, timing, blocking, and camera intent
              {studioCapabilitySummary?.supported
                ? ` · ${studioCapabilitySummary.supported} approved performance ${studioCapabilitySummary.supported === 1 ? "is" : "are"} render-ready`
                : " · final art and motion still needed"}
            </span>
          </div>

          <CreatorStudioShell className="cv2-studio-workspace">
            <DirectorAnimaticPreview
              capabilityRegistry={capabilityRegistry}
              compileError={directorCompilation.error}
              onWorkspaceChange={setDirectorWorkspace}
              project={project}
              workspace={directorWorkspace}
            />
          </CreatorStudioShell>

          <details className="cv2-studio-advanced">
            <summary>Advanced production details</summary>
            <p>
              Technical shot intent, animation capability assignment, and the
              sealed plan live here—not in the creative workspace.
            </p>
            <details className="cv2-advanced-capabilities">
              <summary>Animation capability prototype</summary>
              <Cv002TemplateAssignmentPanel
                assignment={assignment}
                onAssignmentChange={saveAssignment}
                project={project}
              />
            </details>

            <div className="cv2-direction-scenes">
              {project.graph.scenes.map((scene, sceneIndex) => (
                <section key={scene.id}>
                  <header>
                    <div>
                      <small>
                        Scene {String(sceneIndex + 1).padStart(2, "0")}
                      </small>
                      <strong>
                        {scene.beats[0]!.text.slice(0, 72)}
                        {scene.beats[0]!.text.length > 72 ? "…" : ""}
                      </strong>
                    </div>
                    <span>
                      {assignment?.sceneId === scene.id
                        ? "Animated template assigned"
                        : "Direction only · template not assigned"}{" "}
                      · {scene.beats.length}{" "}
                      {scene.beats.length === 1 ? "beat" : "beats"}
                    </span>
                  </header>
                  <div className="cv2-direction-grid">
                    {scene.beats.map((beat, beatIndex) => {
                      const direction = directionByBeat.get(beat.id)!;
                      return (
                        <article
                          className={
                            beat.id === selectedBeatId
                              ? "is-selected"
                              : undefined
                          }
                          key={beat.id}
                        >
                          <button
                            aria-pressed={beat.id === selectedBeatId}
                            className="cv2-direction-beat-select"
                            onClick={() => setSelectedBeatId(beat.id)}
                            type="button"
                          >
                            <span>
                              {sceneIndex + 1}.{beatIndex + 1}
                            </span>
                            <div>
                              <small>{humanize(beat.role)}</small>
                              <strong>{beat.text}</strong>
                            </div>
                          </button>
                          <dl>
                            {directionFields.map((field) => (
                              <div key={field.key}>
                                <dt>{field.label}</dt>
                                <dd>
                                  {humanize(String(direction[field.key]))}
                                </dd>
                              </div>
                            ))}
                          </dl>
                        </article>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
          </details>

          <footer className="cv2-studio-footer">
            <button
              className="is-secondary"
              onClick={() => setScreen("breakdown")}
              type="button"
            >
              <ArrowLeft size={17} /> Edit scenes & beats
            </button>
            <div>
              <strong>First canonical cut compiled</strong>
              <span>
                Your next direction will revise only the selected beat.
              </span>
            </div>
          </footer>
        </section>
      )}
    </main>
  );
}
