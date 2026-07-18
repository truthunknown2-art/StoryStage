import {
  createCv001CreatorProject,
  parseCv001ThreeBeatScript,
  CV001_DEFAULT_SCRIPT,
  type Cv001CreatorProjectState,
} from "@storystage/story-engine";
import {Check, Clapperboard, Feather, Play, Sparkles, Trees} from "lucide-react";
import {useMemo, useState} from "react";
import {Cv001CreatorStudio} from "./Cv001CreatorStudio";
import "./cv001-creator-studio.css";

type CreatorScreen = "creator-create" | "creator-studio";

export function Cv001CreatorApp({onOpenLegacy}: {onOpenLegacy: () => void}) {
  const [screen, setScreen] = useState<CreatorScreen>("creator-create");
  const [title, setTitle] = useState("The Lantern Discovery");
  const [script, setScript] = useState(CV001_DEFAULT_SCRIPT);
  const [project, setProject] = useState<Cv001CreatorProjectState | null>(null);
  const scriptError = useMemo(() => {
    try {
      parseCv001ThreeBeatScript(script);
      return null;
    } catch (caught) {
      return caught instanceof Error ? caught.message : "Use exactly three paragraphs.";
    }
  }, [script]);

  const createFirstCut = () => {
    const next = createCv001CreatorProject({title, script});
    setProject(next);
    setScreen("creator-studio");
  };

  if (screen === "creator-studio" && project)
    return (
      <Cv001CreatorStudio
        autoPlay
        onExit={() => setScreen("creator-create")}
        onOpenLegacy={onOpenLegacy}
        onProjectChange={setProject}
        project={project}
      />
    );

  return (
    <main className="cv-create">
      <header className="cv-create-topbar">
        <div className="cv-create-brand">
          <span><Clapperboard size={18} /></span>
          <div><strong>StoryStage</strong><small>Stories you can direct</small></div>
        </div>
        <span className="cv-prototype-pill"><Sparkles size={13} />Three-beat animation prototype</span>
      </header>

      <div className="cv-create-layout">
        <section className="cv-create-copy">
          <p className="cv-kicker">New animated story</p>
          <h1>Start with the words.<br />Watch them move.</h1>
          <p>StoryStage turns this fixed lantern scene into a real articulated first cut. You can select each beat, play it, and direct its performance in plain language.</p>
          <div className="cv-create-proof">
            <span><Check size={14} /></span>
            <div><strong>Not a pose-swap slideshow</strong><small>Head, torso, arm, hand, face, camera and prop attachment move continuously.</small></div>
          </div>
        </section>

        <form className="cv-create-form" onSubmit={(event) => {event.preventDefault(); createFirstCut();}}>
          <header><p>Project setup</p><h2>Create your animated first cut</h2></header>

          <label className="cv-create-label" htmlFor="cv-title">Title</label>
          <input id="cv-title" onChange={(event) => setTitle(event.target.value)} value={title} />

          <label className="cv-create-label" htmlFor="cv-script">Script</label>
          <textarea aria-describedby="cv-script-help" id="cv-script" onChange={(event) => setScript(event.target.value)} rows={7} value={script} />
          <div className={scriptError ? "cv-script-help is-error" : "cv-script-help"} id="cv-script-help">
            <span>{scriptError ?? "3 of 3 story beats ready"}</span>
            <small>This prototype supports the fixed three-beat lantern scene. General script breakdown is not enabled yet.</small>
          </div>

          <fieldset>
            <legend>Project grammar</legend>
            <div className="cv-choice-grid is-two">
              <button aria-pressed="true" className="is-selected" type="button">
                <span><Trees size={18} /></span><strong>Kids Adventure</strong><small>Enabled</small><Check size={14} />
              </button>
              <button disabled type="button">
                <span><Feather size={18} /></span><strong>Weird History</strong><small>Next prototype</small>
              </button>
            </div>
          </fieldset>

          <fieldset>
            <legend>Art style</legend>
            <div className="cv-choice-grid is-three">
              <button aria-pressed="true" className="is-selected" type="button"><span className="cv-style-swatch is-cut-paper" /><strong>Cut-paper forest</strong><small>Enabled</small><Check size={14} /></button>
              <button disabled type="button"><span className="cv-style-swatch is-ink" /><strong>Storybook ink</strong><small>Coming later</small></button>
              <button disabled type="button"><span className="cv-style-swatch is-collage" /><strong>Editorial collage</strong><small>Coming later</small></button>
            </div>
          </fieldset>

          <button className="cv-create-action" disabled={Boolean(scriptError) || !title.trim()} type="submit">
            <Play fill="currentColor" size={16} />Create animated first cut
          </button>
          <p className="cv-create-boundary">Prototype art · real articulated motion · no voice or export yet</p>
        </form>
      </div>
    </main>
  );
}
