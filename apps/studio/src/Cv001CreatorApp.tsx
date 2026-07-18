import {
  createCv002Project,
  createCv001CreatorProject,
  createCv001ThreeBeatProofFixture,
  parseCv001ThreeBeatScript,
  restoreCv002Project,
  restoreCv001CreatorProject,
  CV001_CREATOR_STORAGE_KEY,
  CV001_DEFAULT_SCRIPT,
  type Cv001CreatorProjectState,
  type Cv002Grammar,
  type Cv002Project,
} from "@storystage/story-engine";
import {
  ArrowRight,
  Check,
  Clapperboard,
  Feather,
  FileText,
  Play,
  Sparkles,
  Trees,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Cv001CreatorStudio } from "./Cv001CreatorStudio";
import { Cv002DraftReview } from "./Cv002DraftReview";
import { KidsShowcaseStudio } from "./KidsShowcaseStudio";
import "./cv001-creator-studio.css";

type CreatorScreen =
  | "creator-create"
  | "creator-studio"
  | "draft-review"
  | "kids-showcase";
type StudioEntryMode = "new-first-cut" | "continue-saved";

const CV002_DRAFT_STORAGE_KEY = "storystage.cv002.draft.v1";
const HISTORY_SAMPLE = `In 1867, Alaska was sold to the United States for 7.2 million dollars. Newspapers mocked the deal as a frozen mistake, because many editors imagined nothing but ice, fog, and very expensive polar bears. The purchase looked like a punchline waiting for history to finish it.

Then prospectors found gold, fishing fleets found enormous waters, and geologists found oil. The supposedly useless territory became strategically important as well. During the Second World War, Alaska sat on the shortest route between North America and Asia, which made the old bargain look far less ridiculous.

The strangest part is that Russia did not simply forget Alaska's value. Its treasury was strained, the colony was difficult to defend, and leaders feared Britain might seize it in another war. Selling to the United States turned a vulnerable outpost into cash - and accidentally created one of history's most famous real-estate jokes.`;
const KIDS_TEMPLATE_SAMPLE = `Mara follows a trail of blue feathers until she reaches a quiet clearing. A small lantern hums beneath an old stump, and she freezes when its light follows her gaze. She kneels beside it and whispers that she has never seen anything glow like that before.

The handle is cold, so Mara tests it with one finger before reaching with both hands. She leans forward, lifts the lantern slowly, and steadies it against her chest. Tiny paper stars spill from the glass while the forest seems to hold its breath.

Mara gasps, then turns the lantern toward her friends at the edge of the clearing. She raises it proudly as the stars circle her head and the group cheers. The lantern settles into a warm golden glow, and Mara grins because their next path has appeared.`;

const countWords = (value: string) =>
  value.trim().split(/\s+/).filter(Boolean).length;
const countParagraphs = (value: string) =>
  value.trim()
    ? value
        .trim()
        .split(/\r?\n[\t ]*\r?\n/)
        .filter((paragraph) => paragraph.trim()).length
    : 0;

export function Cv001CreatorApp({
  onOpenLegacy,
}: {
  onOpenLegacy: () => void;
}) {
  const [screen, setScreen] = useState<CreatorScreen>("creator-create");
  const [title, setTitle] = useState("The Lantern Discovery");
  const [script, setScript] = useState(CV001_DEFAULT_SCRIPT);
  const [grammar, setGrammar] = useState<Cv002Grammar>("kids-adventure");
  const restored = useMemo(() => {
    const serialized = window.localStorage.getItem(CV001_CREATOR_STORAGE_KEY);
    if (!serialized) return { project: null, notice: null };
    try {
      return {
        project: restoreCv001CreatorProject(
          serialized,
          createCv001ThreeBeatProofFixture().renderPlan,
        ),
        notice: null,
      };
    } catch {
      window.localStorage.removeItem(CV001_CREATOR_STORAGE_KEY);
      return {
        project: null,
        notice:
          "The saved prototype could not be verified, so StoryStage restored the original lantern scene.",
      };
    }
  }, []);
  const [project, setProjectState] = useState<Cv001CreatorProjectState | null>(
    restored.project,
  );
  const restoredDraft = useMemo(() => {
    const serialized = window.localStorage.getItem(CV002_DRAFT_STORAGE_KEY);
    if (!serialized) return { project: null, notice: null };
    try {
      return { project: restoreCv002Project(serialized), notice: null };
    } catch {
      window.localStorage.removeItem(CV002_DRAFT_STORAGE_KEY);
      return {
        project: null,
        notice:
          "The saved script breakdown could not be verified, so StoryStage removed it.",
      };
    }
  }, []);
  const [draftProject, setDraftProjectState] = useState<Cv002Project | null>(
    restoredDraft.project,
  );
  const [studioEntryMode, setStudioEntryMode] =
    useState<StudioEntryMode>("new-first-cut");
  const [notice, setNotice] = useState<string | null>(
    restored.notice ?? restoredDraft.notice,
  );
  const [replaceConfirmOpen, setReplaceConfirmOpen] = useState(false);
  const isLanternRoute =
    grammar === "kids-adventure" &&
    script.trim() === CV001_DEFAULT_SCRIPT.trim();
  const lanternScriptError = useMemo(() => {
    try {
      parseCv001ThreeBeatScript(script);
      return null;
    } catch (caught) {
      return caught instanceof Error
        ? caught.message
        : "Use exactly three paragraphs.";
    }
  }, [script]);
  const scriptWords = countWords(script);
  const scriptParagraphs = countParagraphs(script);
  const draftScriptError = useMemo(() => {
    if (scriptWords < 80 || scriptWords > 400)
      return `Paste 80 to 400 words for a direction draft. This script has ${scriptWords}.`;
    if (scriptParagraphs < 1 || scriptParagraphs > 6)
      return `Use one to six non-empty paragraphs. This script has ${scriptParagraphs}.`;
    return null;
  }, [scriptParagraphs, scriptWords]);
  const scriptError = isLanternRoute ? lanternScriptError : draftScriptError;

  const saveProject = (next: Cv001CreatorProjectState) => {
    window.localStorage.setItem(
      CV001_CREATOR_STORAGE_KEY,
      JSON.stringify(next),
    );
    setProjectState(next);
  };

  const saveDraftProject = (next: Cv002Project) => {
    window.localStorage.setItem(CV002_DRAFT_STORAGE_KEY, JSON.stringify(next));
    setDraftProjectState(next);
  };

  const createFirstCut = (confirmed = false) => {
    if (!confirmed && project && project.history.length > 0) {
      setReplaceConfirmOpen(true);
      return;
    }
    const next = createCv001CreatorProject({ title, script });
    saveProject(next);
    setReplaceConfirmOpen(false);
    setNotice(null);
    setStudioEntryMode("new-first-cut");
    setScreen("creator-studio");
  };

  const createDraft = () => {
    try {
      const next = createCv002Project(title, script, grammar);
      saveDraftProject(next);
      setNotice(null);
      setScreen("draft-review");
    } catch (caught) {
      setNotice(
        caught instanceof Error
          ? caught.message
          : "StoryStage could not create this draft breakdown.",
      );
    }
  };

  const submitProject = () =>
    isLanternRoute ? createFirstCut() : createDraft();

  if (screen === "kids-showcase")
    return <KidsShowcaseStudio onBack={() => setScreen("creator-create")} />;

  if (screen === "creator-studio" && project)
    return (
      <Cv001CreatorStudio
        entryMode={studioEntryMode}
        onExit={() => setScreen("creator-create")}
        onOpenLegacy={onOpenLegacy}
        onProjectChange={saveProject}
        project={project}
      />
    );

  if (screen === "draft-review" && draftProject)
    return (
      <Cv002DraftReview
        onBack={() => setScreen("creator-create")}
        onProjectChange={saveDraftProject}
        project={draftProject}
      />
    );

  return (
    <main className="cv-create">
      <header className="cv-create-topbar">
        <div className="cv-create-brand">
          <span>
            <Clapperboard size={18} />
          </span>
          <div>
            <strong>StoryStage</strong>
            <small>Stories you can direct</small>
          </div>
        </div>
        <div className="cv-create-top-actions">
          <span className="cv-prototype-pill">
            <Sparkles size={13} />
            Script-to-direction beta
          </span>
          <button
            className="cv-open-showcase"
            onClick={() => setScreen("kids-showcase")}
            type="button"
          >
            <Play fill="currentColor" size={13} />
            Open 30-second showcase
          </button>
        </div>
      </header>

      <div className="cv-create-layout">
        <section className="cv-create-copy">
          <p className="cv-kicker">New production</p>
          <h1>
            Start with the words.
            <br />
            Find the story.
          </h1>
          <p>
            Paste a script, choose how it should tell its story, then review the
            scenes, beats, shots, performance, sound, and editorial rhythm
            before production begins.
          </p>
          <div className="cv-create-proof">
            <span>
              <Check size={14} />
            </span>
            <div>
              <strong>Animation starts with readable beats</strong>
              <small>
                The lantern demo proves articulated motion. New scripts first
                get an honest, editable direction plan.
              </small>
            </div>
          </div>
        </section>

        <form
          className="cv-create-form"
          onSubmit={(event) => {
            event.preventDefault();
            submitProject();
          }}
        >
          <header>
            <p>Project setup</p>
            <h2>What are we making?</h2>
          </header>

          <label className="cv-create-label" htmlFor="cv-title">
            Title
          </label>
          <input
            id="cv-title"
            onChange={(event) => setTitle(event.target.value)}
            value={title}
          />

          <label className="cv-create-label" htmlFor="cv-script">
            Script
          </label>
          <textarea
            aria-describedby="cv-script-help"
            id="cv-script"
            onChange={(event) => setScript(event.target.value)}
            rows={7}
            value={script}
          />
          <div
            className={
              scriptError ? "cv-script-help is-error" : "cv-script-help"
            }
            id="cv-script-help"
          >
            <span>
              {scriptError ??
                (isLanternRoute
                  ? "Animated lantern demo · 3 beats ready"
                  : `${scriptWords} words · ${scriptParagraphs} paragraphs · ready for breakdown`)}
            </span>
            <small>
              {isLanternRoute
                ? "This exact scene has an assigned rig and motion template."
                : "New scripts stop at an editable direction draft until animation templates are assigned."}
            </small>
          </div>
          {grammar === "weird-history" && script === CV001_DEFAULT_SCRIPT ? (
            <button
              className="cv-load-sample"
              onClick={() => {
                setTitle("The Alaska Bargain");
                setScript(HISTORY_SAMPLE);
              }}
              type="button"
            >
              <FileText size={15} />
              Load a Weird History sample
            </button>
          ) : null}
          {grammar === "kids-adventure" && isLanternRoute ? (
            <button
              className="cv-load-sample"
              onClick={() => {
                setTitle("The Blue Lantern Trail");
                setScript(KIDS_TEMPLATE_SAMPLE);
              }}
              type="button"
            >
              <FileText size={15} />
              Load a longer Kids script sample
            </button>
          ) : null}

          <fieldset>
            <legend>Project grammar</legend>
            <div className="cv-choice-grid is-two">
              <button
                aria-pressed={grammar === "kids-adventure"}
                className={grammar === "kids-adventure" ? "is-selected" : ""}
                onClick={() => setGrammar("kids-adventure")}
                type="button"
              >
                <span>
                  <Trees size={18} />
                </span>
                <strong>Kids Adventure</strong>
                <small>Character-led · warm holds</small>
                {grammar === "kids-adventure" ? <Check size={14} /> : null}
              </button>
              <button
                aria-pressed={grammar === "weird-history"}
                className={grammar === "weird-history" ? "is-selected" : ""}
                onClick={() => setGrammar("weird-history")}
                type="button"
              >
                <span>
                  <Feather size={18} />
                </span>
                <strong>Weird History</strong>
                <small>Evidence-led · fast cuts</small>
                {grammar === "weird-history" ? <Check size={14} /> : null}
              </button>
            </div>
          </fieldset>

          <fieldset>
            <legend>Art style</legend>
            <div className="cv-choice-grid is-three">
              <button
                aria-pressed={grammar === "kids-adventure"}
                className={grammar === "kids-adventure" ? "is-selected" : ""}
                disabled={grammar !== "kids-adventure"}
                type="button"
              >
                <span className="cv-style-swatch is-cut-paper" />
                <strong>Cut-paper forest</strong>
                <small>
                  {isLanternRoute ? "Animated demo" : "Direction reference"}
                </small>
                {grammar === "kids-adventure" ? <Check size={14} /> : null}
              </button>
              <button disabled type="button">
                <span className="cv-style-swatch is-ink" />
                <strong>Storybook ink</strong>
                <small>Coming later</small>
              </button>
              <button
                aria-pressed={grammar === "weird-history"}
                className={grammar === "weird-history" ? "is-selected" : ""}
                disabled={grammar !== "weird-history"}
                type="button"
              >
                <span className="cv-style-swatch is-collage" />
                <strong>Editorial collage</strong>
                <small>Direction reference</small>
                {grammar === "weird-history" ? <Check size={14} /> : null}
              </button>
            </div>
          </fieldset>

          <button
            className="cv-create-action"
            disabled={Boolean(scriptError) || !title.trim()}
            type="submit"
          >
            {isLanternRoute ? (
              <>
                <Play fill="currentColor" size={16} />
                Create animated first cut
              </>
            ) : (
              <>
                <ArrowRight size={17} />
                Break script into scenes
              </>
            )}
          </button>
          <p className="cv-create-boundary">
            {isLanternRoute
              ? "Prototype art · real articulated motion · no voice or export yet"
              : "Draft breakdown only · no generated art, voice, animation, or export"}
          </p>
          {replaceConfirmOpen ? (
            <div
              className="cv-replace-confirm"
              role="alertdialog"
              aria-label="Replace edited prototype"
            >
              <p>
                <strong>Replace your edited prototype?</strong>
                <span>
                  Creating a new first cut clears its direction history.
                </span>
              </p>
              <button
                onClick={() => setReplaceConfirmOpen(false)}
                type="button"
              >
                Keep editing
              </button>
              <button onClick={() => createFirstCut(true)} type="button">
                Replace and create
              </button>
            </div>
          ) : null}
        </form>
      </div>
      {project ? (
        <button
          className="cv-continue-card"
          onClick={() => {
            setStudioEntryMode("continue-saved");
            setScreen("creator-studio");
          }}
          type="button"
        >
          <span>Continue</span>
          <strong>{project.title}</strong>
          <small>
            3 beats · last selected:{" "}
            {project.baseInput.beats.find(
              (beat) => beat.id === project.selectedBeatId,
            )?.text ?? "Lantern scene"}
          </small>
        </button>
      ) : null}
      {draftProject ? (
        <button
          className={`cv-continue-card cv-continue-draft ${project ? "has-animation-card" : ""}`}
          onClick={() => setScreen("draft-review")}
          type="button"
        >
          <span>Continue direction draft</span>
          <strong>{draftProject.title}</strong>
          <small>
            {draftProject.graph.scenes.length} scenes ·{" "}
            {draftProject.graph.scenes.flatMap((scene) => scene.beats).length}{" "}
            beats ·{" "}
            {draftProject.grammar === "kids-adventure"
              ? "Kids Adventure"
              : "Weird History"}
          </small>
        </button>
      ) : null}
      {notice ? (
        <p className="cv-restore-notice" role="status">
          {notice}
        </p>
      ) : null}
    </main>
  );
}
