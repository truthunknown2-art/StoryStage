import {
  createCv002ArtDirectionSelection,
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
  FileText,
  Layers,
  Play,
  Sparkles,
  Upload,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Cv001CreatorStudio } from "./Cv001CreatorStudio";
import { Cv002DraftReview } from "./Cv002DraftReview";
import { KidsShowcaseStudio } from "./KidsShowcaseStudio";
import artDirectionCollage from "./assets/art-direction-cut-paper-collage.jpg";
import artDirectionSoft2d from "./assets/art-direction-soft-2d-illustration.jpg";
import artDirectionStorybook from "./assets/art-direction-storybook-watercolor.jpg";
import olloFriendsCastArt from "./assets/ollo-friends-cast-v1.jpg";
import "./cv001-creator-studio.css";

type CreatorScreen =
  | "creator-create"
  | "creator-studio"
  | "draft-review"
  | "kids-showcase";
type StudioEntryMode = "new-first-cut" | "continue-saved";
type KidsArtDirection =
  | "storybook-watercolor"
  | "cut-paper-collage"
  | "soft-2d-illustration";

const KIDS_ART_DIRECTION_OPTION_IDS = {
  "storybook-watercolor": "storybook-watercolor-paper-cutout",
  "cut-paper-collage": "cut-paper-collage-mixed-media",
  "soft-2d-illustration": "soft-2d-digital-illustration",
} as const satisfies Record<KidsArtDirection, string>;

const CV002_DRAFT_STORAGE_KEY = "storystage.cv002.draft.v1";
const HISTORY_SAMPLE = `In 1867, Alaska was sold to the United States for 7.2 million dollars. Newspapers mocked the deal as a frozen mistake, because many editors imagined nothing but ice, fog, and very expensive polar bears. The purchase looked like a punchline waiting for history to finish it.

Then prospectors found gold, fishing fleets found enormous waters, and geologists found oil. The supposedly useless territory became strategically important as well. During the Second World War, Alaska sat on the shortest route between North America and Asia, which made the old bargain look far less ridiculous.

The strangest part is that Russia did not simply forget Alaska's value. Its treasury was strained, the colony was difficult to defend, and leaders feared Britain might seize it in another war. Selling to the United States turned a vulnerable outpost into cash - and accidentally created one of history's most famous real-estate jokes.`;
const OLLO_FRIENDS_SAMPLE = `Ollo bounces down the forest path, certain that today hides an adventure. Tix flutters beside him, asking him to slow down and look carefully. A soft golden glow drifts between the ferns, and Dot floats after it without a sound.

The glow slips under the roots of an old oak and becomes a tiny leaf-shaped lantern. Ollo gasps, then reaches for it with both paws before Tix can whisper a warning. The lantern flickers awake, and a gentle voice introduces itself as the Storylight, a guide who loves stories and lights the way.

Ollo gasps with delight, then promises to carry the Storylight carefully while Tix sighs with relief. The lantern glows brighter, drawing a warm trail through the trees. Dot lands on Ollo's scarf, and together the friends follow the light toward the oldest story in the Little Wood.`;

const HISTORY_STYLE_REFERENCE =
  "/show-packs/weird-history/rook/v1/identity-sheet.png";

const KIDS_ART_DIRECTIONS: Array<{
  id: KidsArtDirection;
  name: string;
  detail: string;
  image: string;
}> = [
  {
    id: "storybook-watercolor",
    name: "Storybook Watercolor & Paper Cutout",
    detail: "Warm light, gentle textures, layered-paper feel",
    image: artDirectionStorybook,
  },
  {
    id: "cut-paper-collage",
    name: "Cut Paper Collage & Mixed Media",
    detail: "Bold silhouettes, fabric and craft-paper texture",
    image: artDirectionCollage,
  },
  {
    id: "soft-2d-illustration",
    name: "Soft 2D Digital Illustration",
    detail: "Smooth shapes, warm pastels, clean and cozy",
    image: artDirectionSoft2d,
  },
];

const countWords = (value: string) =>
  value.trim().split(/\s+/).filter(Boolean).length;
const countParagraphs = (value: string) =>
  value.trim()
    ? value
        .trim()
        .split(/\r?\n[\t ]*\r?\n/)
        .filter((paragraph) => paragraph.trim()).length
    : 0;
/* Rough narration-pace estimate from the real word count (~150 words per minute). */
const estimateSeconds = (words: number) =>
  Math.max(10, Math.round(words / 2.5 / 5) * 5);
const beatCaption = (text: string) => {
  const words = text.split(/\s+/);
  return words.length > 7 ? `${words.slice(0, 7).join(" ")}…` : text;
};

const deriveTitleFromScript = (value: string) => {
  const firstLine = value
    .trim()
    .split(/(?:\r?\n)+|(?<=[.!?])\s+/)
    .find((line) => line.trim())
    ?.trim();
  if (!firstLine) return "";
  const proposed = firstLine
    .replace(/^(?:INT\.|EXT\.)\s*/i, "")
    .replace(/[.!?]+$/, "")
    .split(/\s+/)
    .slice(0, 8)
    .join(" ")
    .slice(0, 72)
    .trim();
  return proposed
    ? `${proposed.charAt(0).toUpperCase()}${proposed.slice(1)}`
    : "";
};

export function Cv001CreatorApp({
  onOpenLegacy,
}: {
  onOpenLegacy: () => void;
}) {
  const [screen, setScreen] = useState<CreatorScreen>("creator-create");
  const [title, setTitle] = useState("The Storylight in the Little Wood");
  const [titleIsAutomatic, setTitleIsAutomatic] = useState(true);
  const [script, setScript] = useState(OLLO_FRIENDS_SAMPLE);
  const [grammar, setGrammar] = useState<Cv002Grammar>("kids-adventure");
  const [artDirection, setArtDirection] = useState<KidsArtDirection>(
    "storybook-watercolor",
  );
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [savedSetupFingerprint, setSavedSetupFingerprint] = useState<
    string | null
  >(null);
  const [setupChanged, setSetupChanged] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
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

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [screen]);

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
    if (scriptWords < 100 || scriptWords > 300)
      return `Paste 100 to 300 words for a directed animatic. This script has ${scriptWords}.`;
    if (scriptParagraphs < 1 || scriptParagraphs > 6)
      return `Use one to six non-empty paragraphs. This script has ${scriptParagraphs}.`;
    return null;
  }, [scriptParagraphs, scriptWords]);
  const scriptError = isLanternRoute ? lanternScriptError : draftScriptError;
  const draftPreviewProject = useMemo(() => {
    if (isLanternRoute || draftScriptError) return null;
    try {
      return createCv002Project(
        title,
        script,
        grammar,
        createCv002ArtDirectionSelection(
          grammar,
          grammar === "kids-adventure"
            ? KIDS_ART_DIRECTION_OPTION_IDS[artDirection]
            : "weird-history-editorial-collage",
        ),
      );
    } catch {
      return null;
    }
  }, [artDirection, draftScriptError, grammar, isLanternRoute, script, title]);
  const allDraftBeats = useMemo(
    () =>
      draftPreviewProject?.graph.scenes.flatMap((scene) => scene.beats) ?? [],
    [draftPreviewProject],
  );
  const beatPreview = isLanternRoute
    ? parseCv001ThreeBeatScript(script).map((text, index) => ({
        id: null as string | null,
        text,
        ordinal: index + 1,
      }))
    : allDraftBeats.slice(0, 4).map((beat, index) => ({
        id: beat.id,
        text: beat.text,
        ordinal: index + 1,
      }));
  const totalBeatCount = isLanternRoute
    ? beatPreview.length
    : allDraftBeats.length;
  const setupFingerprint = JSON.stringify({
    artDirection,
    grammar,
    script,
    title,
  });
  const hasUnsavedSetupChanges =
    setupChanged ||
    (savedSetupFingerprint !== null
      ? savedSetupFingerprint !== setupFingerprint
      : Boolean(project || draftProject));

  const updateScript = (nextScript: string) => {
    setScript(nextScript);
    if (titleIsAutomatic) setTitle(deriveTitleFromScript(nextScript));
    setSetupChanged(true);
  };

  const loadSetup = (
    nextTitle: string,
    nextScript: string,
    nextGrammar: Cv002Grammar,
  ) => {
    setTitle(nextTitle);
    setTitleIsAutomatic(true);
    setScript(nextScript);
    setGrammar(nextGrammar);
    setSetupChanged(true);
    setNotice(null);
  };

  const saveProject = (next: Cv001CreatorProjectState) => {
    window.localStorage.setItem(
      CV001_CREATOR_STORAGE_KEY,
      JSON.stringify(next),
    );
    setProjectState(next);
    setLastSavedAt(new Date());
  };

  const saveDraftProject = (next: Cv002Project) => {
    window.localStorage.setItem(CV002_DRAFT_STORAGE_KEY, JSON.stringify(next));
    setDraftProjectState(next);
    setLastSavedAt(new Date());
  };

  const createFirstCut = (confirmed = false) => {
    if (!confirmed && project && project.history.length > 0) {
      setReplaceConfirmOpen(true);
      return;
    }
    const next = createCv001CreatorProject({ title, script });
    saveProject(next);
    setSavedSetupFingerprint(setupFingerprint);
    setSetupChanged(false);
    setReplaceConfirmOpen(false);
    setNotice(null);
    setStudioEntryMode("new-first-cut");
    setScreen("creator-studio");
  };

  const createDraft = () => {
    try {
      const next = createCv002Project(
        title,
        script,
        grammar,
        createCv002ArtDirectionSelection(
          grammar,
          grammar === "kids-adventure"
            ? KIDS_ART_DIRECTION_OPTION_IDS[artDirection]
            : "weird-history-editorial-collage",
        ),
      );
      saveDraftProject(next);
      setSavedSetupFingerprint(setupFingerprint);
      setSetupChanged(false);
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

  const openEngineeringAnimationDemo = () => {
    const demoTitle = "The Lantern Discovery";
    setTitle(demoTitle);
    setTitleIsAutomatic(true);
    setScript(CV001_DEFAULT_SCRIPT);
    setGrammar("kids-adventure");
    setArtDirection("storybook-watercolor");
    if (project && project.history.length > 0) {
      setSetupChanged(true);
      setReplaceConfirmOpen(true);
      return;
    }
    const next = createCv001CreatorProject({
      title: demoTitle,
      script: CV001_DEFAULT_SCRIPT,
    });
    saveProject(next);
    setSavedSetupFingerprint(
      JSON.stringify({
        artDirection: "storybook-watercolor",
        grammar: "kids-adventure",
        script: CV001_DEFAULT_SCRIPT,
        title: demoTitle,
      }),
    );
    setSetupChanged(false);
    setReplaceConfirmOpen(false);
    setNotice(null);
    setStudioEntryMode("new-first-cut");
    setScreen("creator-studio");
  };

  const importScriptFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== "string") {
        setNotice("StoryStage could not read that file as plain text.");
        return;
      }
      setScript(reader.result);
      const baseName = file.name.replace(/\.[^.]+$/, "").trim();
      setTitle(baseName || deriveTitleFromScript(reader.result));
      setTitleIsAutomatic(true);
      setSetupChanged(true);
      setNotice(null);
    };
    reader.onerror = () =>
      setNotice("StoryStage could not read that file. Try a plain .txt file.");
    reader.readAsText(file);
  };

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

  const createDisabled = Boolean(scriptError) || !title.trim();
  const createDisabledReason = scriptError
    ? scriptError
    : !title.trim()
      ? "Add a project title to continue."
      : null;

  return (
    <main className="cv-create">
      <header className="cv-create-topbar">
        <div className="cv-create-brand">
          <span>
            <Clapperboard size={18} />
          </span>
          <strong>StoryStage</strong>
          <em>New project</em>
        </div>
        <div className="cv-create-top-actions">
          {hasUnsavedSetupChanges ? (
            <span className="cv-create-save-state is-unsaved">
              Unsaved setup changes
            </span>
          ) : lastSavedAt && savedSetupFingerprint === setupFingerprint ? (
            <span className="cv-create-save-state">
              <Check size={13} />
              Saved just now
            </span>
          ) : null}
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

      <div className="cv-create-layout is-mock-layout">
        <section className="cv-create-copy">
          <h1>Turn your script into an animated first cut</h1>
          <p>
            StoryStage finds the natural beats in your script, directs each
            scene, and builds an editable first cut you review before any final
            media.
          </p>
        </section>

        <form
          className="cv-create-form is-mock-layout"
          onSubmit={(event) => {
            event.preventDefault();
            submitProject();
          }}
        >
          <section className="cv-create-script-column">
            <header className="cv-create-step-heading">
              <span>1</span>
              <div>
                <h2>Paste your script</h2>
                <p>The words stay editable throughout production.</p>
              </div>
            </header>

            <label className="cv-create-label" htmlFor="cv-title">
              Title
            </label>
            <input
              id="cv-title"
              onChange={(event) => {
                setTitle(event.target.value);
                setTitleIsAutomatic(false);
                setSetupChanged(true);
              }}
              value={title}
            />
            <label className="cv-create-label" htmlFor="cv-script">
              Script
            </label>
            <textarea
              aria-describedby="cv-script-help"
              id="cv-script"
              onChange={(event) => updateScript(event.target.value)}
              rows={11}
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
                    ? "3 beats · 10-second animated demo"
                    : `${scriptWords} words · about ${estimateSeconds(scriptWords)} seconds · ${totalBeatCount} beats found`)}
              </span>
              <small>
                {isLanternRoute
                  ? "Demo scene with Mara engineering proof art and an assigned rig — not Ollo & Friends channel branding."
                  : "New scripts compile into an honest directed animatic draft before final art, voice, or export."}
              </small>
            </div>
            <div className="cv-script-tools">
              <input
                accept=".txt,text/plain"
                aria-label="Import a .txt script file"
                className="cv-script-file-input"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  event.target.value = "";
                  if (file) importScriptFile(file);
                }}
                ref={fileInputRef}
                type="file"
              />
              <button
                className="cv-import-script"
                onClick={() => fileInputRef.current?.click()}
                type="button"
              >
                <Upload size={14} />
                Import .txt
              </button>
              {grammar === "weird-history" && script !== HISTORY_SAMPLE ? (
                <button
                  className="cv-load-sample"
                  onClick={() => {
                    loadSetup(
                      "The Alaska Bargain",
                      HISTORY_SAMPLE,
                      "weird-history",
                    );
                  }}
                  type="button"
                >
                  <FileText size={14} />
                  Load a Weird History sample
                </button>
              ) : null}
              {grammar === "kids-adventure" &&
              script !== OLLO_FRIENDS_SAMPLE ? (
                <button
                  className="cv-load-sample"
                  onClick={() => {
                    loadSetup(
                      "The Storylight in the Little Wood",
                      OLLO_FRIENDS_SAMPLE,
                      "kids-adventure",
                    );
                  }}
                  type="button"
                >
                  <FileText size={14} />
                  Load an Ollo & Friends sample script
                </button>
              ) : null}
              <button
                className="cv-load-sample"
                onClick={openEngineeringAnimationDemo}
                type="button"
              >
                <Clapperboard size={14} />
                Open engineering animation demo
              </button>
            </div>

            <section
              aria-label="Preview of natural beats"
              className="cv-beat-preview"
            >
              <header>
                <strong>Preview of natural beats</strong>
                <span>
                  {scriptError
                    ? "Waiting for a valid script"
                    : `${totalBeatCount} ${totalBeatCount === 1 ? "beat" : "beats"} found${totalBeatCount > beatPreview.length ? ` · first ${beatPreview.length} shown` : ""}`}
                </span>
              </header>
              {beatPreview.length > 0 && !scriptError ? (
                <ol className="cv-beat-chips">
                  {beatPreview.map((beat) => (
                    <li key={`${beat.ordinal}-${beat.text}`}>
                      {beat.ordinal > 1 ? (
                        <ArrowRight
                          aria-hidden
                          className="cv-beat-arrow"
                          size={14}
                        />
                      ) : null}
                      <span
                        className="cv-beat-chip"
                        data-beat-id={beat.id ?? undefined}
                      >
                        <em>{beat.ordinal}</em>
                        <strong>{beatCaption(beat.text)}</strong>
                      </span>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="cv-beat-empty">
                  Add a valid script and StoryStage will outline its natural
                  beats here.
                </p>
              )}
            </section>
          </section>

          <aside className="cv-create-options-column">
            <fieldset className="cv-create-choice-panel cv-grammar-panel">
              <legend>
                <span>2</span> Choose a project grammar
              </legend>
              <div className="cv-choice-grid is-two">
                <button
                  aria-pressed={grammar === "kids-adventure"}
                  className={grammar === "kids-adventure" ? "is-selected" : ""}
                  onClick={() => {
                    if (grammar === "kids-adventure") return;
                    setGrammar("kids-adventure");
                    setSetupChanged(true);
                  }}
                  type="button"
                >
                  {/* Creator-workspace thumbnail, not Remotion composition media. */}
                  {/* eslint-disable-next-line @remotion/warn-native-media-tag */}
                  <img
                    alt="Ollo, Tix, Dot, and the Storylight — approved Ollo & Friends cast identity"
                    src={olloFriendsCastArt}
                  />
                  <strong>Kids Adventure</strong>
                  <small>
                    Ollo & Friends · clear actions, expressive reactions,
                    playful camera
                  </small>
                  <em className="cv-cast-status">
                    Cast identity approved · character rigs in progress
                  </em>
                  {grammar === "kids-adventure" ? <Check size={14} /> : null}
                </button>
                <button
                  aria-pressed={grammar === "weird-history"}
                  className={grammar === "weird-history" ? "is-selected" : ""}
                  onClick={() => {
                    if (grammar === "weird-history") return;
                    setGrammar("weird-history");
                    setSetupChanged(true);
                  }}
                  type="button"
                >
                  {/* Creator-workspace thumbnail, not Remotion composition media. */}
                  {/* eslint-disable-next-line @remotion/warn-native-media-tag */}
                  <img alt="" src={HISTORY_STYLE_REFERENCE} />
                  <strong>Weird History Explainer</strong>
                  <small>Fast cuts, evidence, deadpan punchlines</small>
                  {grammar === "weird-history" ? <Check size={14} /> : null}
                </button>
              </div>
            </fieldset>

            <fieldset className="cv-create-choice-panel cv-style-panel">
              <legend>
                <span>3</span> Choose an art direction
              </legend>
              {grammar === "kids-adventure" ? (
                <div className="cv-choice-grid is-three">
                  {KIDS_ART_DIRECTIONS.map((direction) => (
                    <button
                      aria-pressed={artDirection === direction.id}
                      className={
                        artDirection === direction.id ? "is-selected" : ""
                      }
                      key={direction.id}
                      onClick={() => {
                        if (artDirection === direction.id) return;
                        setArtDirection(direction.id);
                        setSetupChanged(true);
                      }}
                      type="button"
                    >
                      {/* Creator-workspace thumbnail, not Remotion composition media. */}
                      {/* eslint-disable-next-line @remotion/warn-native-media-tag */}
                      <img alt="" src={direction.image} />
                      <strong>{direction.name}</strong>
                      <small>{direction.detail}</small>
                      {artDirection === direction.id ? (
                        <Check size={14} />
                      ) : null}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="cv-static-choice" aria-label="Art direction">
                  {/* Creator-workspace thumbnail, not Remotion composition media. */}
                  {/* eslint-disable-next-line @remotion/warn-native-media-tag */}
                  <img alt="" src={HISTORY_STYLE_REFERENCE} />
                  <strong>Editorial collage</strong>
                  <small>The approved Weird History reference</small>
                </div>
              )}
              <p className="cv-art-honest">
                Your choice guides the asset step — final art is generated
                later, after you review the beats.
              </p>
              <p className="cv-layer-line">
                <Layers size={13} />
                <span>Scenes are staged in layers when art is generated:</span>
                <b>Background</b>
                <b>Midground</b>
                <b>Characters</b>
                <b>Foreground</b>
              </p>
            </fieldset>

            <section className="cv-create-format-panel">
              <header>
                <span>4</span>
                <strong>Voice & format</strong>
              </header>
              <div>
                <label>
                  <span>Voice</span>
                  <select aria-label="Voice plan" disabled value="later">
                    <option value="later">Add after first cut</option>
                  </select>
                </label>
                <label>
                  <span>Frame</span>
                  <select aria-label="Output frame" disabled value="16:9">
                    <option value="16:9">16:9 · 1080p</option>
                  </select>
                </label>
                <label>
                  <span>Language</span>
                  <select aria-label="Project language" disabled value="en">
                    <option value="en">English</option>
                  </select>
                </label>
              </div>
              <small>
                Voice generation arrives in a later milestone. This build
                renders one format — 16:9 · 1080p, English.
              </small>
            </section>

            <p className="cv-create-boundary">
              {isLanternRoute
                ? "Engineering prototype art · articulated motion demo · no voice or export"
                : "Draft breakdown only · no generated art, voice, animation, or export"}
            </p>
          </aside>

          <footer className="cv-create-footer">
            <p>
              <Sparkles size={15} />
              You’ll review the script beats before any final media or export.
            </p>
            <div>
              {createDisabledReason ? (
                <span className="cv-create-action-reason">
                  {createDisabledReason}
                </span>
              ) : null}
              <button
                className="cv-create-action"
                disabled={createDisabled}
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
                    Create first cut
                  </>
                )}
              </button>
            </div>
          </footer>

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
      {project || draftProject ? (
        <section className="cv-saved-projects" aria-label="Saved projects">
          <header>
            <span>Saved work</span>
            <small>Stored privately in this browser</small>
          </header>
          <div>
            {project ? (
              <button
                className="cv-continue-card"
                onClick={() => {
                  setStudioEntryMode("continue-saved");
                  setScreen("creator-studio");
                }}
                type="button"
              >
                <span>Continue animated prototype</span>
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
                className="cv-continue-card cv-continue-draft"
                onClick={() => setScreen("draft-review")}
                type="button"
              >
                <span>Continue direction draft</span>
                <strong>{draftProject.title}</strong>
                <small>
                  {draftProject.graph.scenes.length} scenes ·{" "}
                  {
                    draftProject.graph.scenes.flatMap((scene) => scene.beats)
                      .length
                  }{" "}
                  beats ·{" "}
                  {draftProject.grammar === "kids-adventure"
                    ? "Kids Adventure"
                    : "Weird History"}
                </small>
              </button>
            ) : null}
          </div>
        </section>
      ) : null}
      {notice ? (
        <p className="cv-restore-notice" role="status">
          {notice}
        </p>
      ) : null}
    </main>
  );
}
