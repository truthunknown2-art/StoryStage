import { useRef, useState } from "react";
import { ArrowLeft, CircleAlert, FileUp, Sparkles } from "lucide-react";
import artDirectionCollage from "../assets/art-direction-cut-paper-collage.jpg";
import artDirectionSoft2d from "../assets/art-direction-soft-2d-illustration.jpg";
import artDirectionStorybook from "../assets/art-direction-storybook-watercolor.jpg";
import {
  beatCaption,
  countWords,
  estimateDurationSeconds,
  formatDuration,
  previewBeats,
} from "./beat-preview";
import { LOCAL_DEMO_BANNER } from "./demo-project";

export type ProjectGrammar = "kids-adventure" | "weird-history";
export type ArtStyle = "storybook-cutout" | "paper-collage" | "soft-2d";
export type NarrationMode = "guide-voice" | "silent";
export type EpisodeFormat = "16:9";
export type EpisodeLanguage = "english";

export interface CreateDraft {
  script: string;
  grammar: ProjectGrammar;
  artStyle: ArtStyle;
  narration: NarrationMode;
  format: EpisodeFormat;
  language: EpisodeLanguage;
}

export const GRAMMAR_LABELS: Record<ProjectGrammar, string> = {
  "kids-adventure": "Kids Adventure",
  "weird-history": "Weird History",
};

export const ART_STYLE_LABELS: Record<ArtStyle, string> = {
  "storybook-cutout": "Storybook Cutout",
  "paper-collage": "Paper Collage",
  "soft-2d": "Soft 2D",
};

const NARRATION_LABELS: Record<NarrationMode, string> = {
  "guide-voice": "Guide voice",
  silent: "Silent",
};

export function CreateProject({
  draft,
  onBackToProjects,
  onCreateFirstCut,
  onDraftChange,
}: {
  draft: CreateDraft;
  onBackToProjects: () => void;
  onCreateFirstCut: () => void;
  onDraftChange: (draft: CreateDraft) => void;
}) {
  const [scriptError, setScriptError] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const words = countWords(draft.script);
  const beats = previewBeats(draft.script);
  const durationSeconds = estimateDurationSeconds(words);

  const update = (patch: Partial<CreateDraft>) => {
    onDraftChange({ ...draft, ...patch });
    if (patch.script !== undefined) setScriptError(null);
  };

  const importTxt = async (file: File | undefined) => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".txt")) {
      setImportError(
        `"${file.name}" is not a .txt file. Choose a plain-text .txt script.`,
      );
      return;
    }
    try {
      const text = await file.text();
      update({ script: text });
      setImportError(null);
    } catch {
      setImportError(`"${file.name}" could not be read. Try another file.`);
    }
  };

  const submit = () => {
    if (words === 0) {
      setScriptError("Add your script before creating the first cut.");
      return;
    }
    onCreateFirstCut();
  };

  return (
    <main className="pv1-page" data-testid="pv1-create">
      <header className="pv1-topbar">
        <span className="pv1-brand">StoryStage</span>
        <span className="pv1-topbar-context">New project</span>
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

      <div className="pv1-create-layout">
        <section className="pv1-create-main" aria-label="Script">
          <h1>Turn your script into an animated first cut</h1>
          <p className="pv1-lede">
            StoryStage will find the natural beats, direct each scene, and
            build an editable first cut.
          </p>

          <div className="pv1-card">
            <h2>
              <span className="pv1-step">1</span> Paste your script
            </h2>
            <textarea
              aria-label="Script"
              className="pv1-script-input"
              onChange={(event) => update({ script: event.target.value })}
              placeholder="Paste or write your story script here…"
              rows={9}
              value={draft.script}
            />
            {scriptError ? (
              <p className="pv1-error" role="alert">
                <CircleAlert size={14} aria-hidden /> {scriptError}
              </p>
            ) : null}
            {importError ? (
              <p className="pv1-error" role="alert">
                <CircleAlert size={14} aria-hidden /> {importError}
              </p>
            ) : null}
            <div className="pv1-script-footer">
              <span>
                {words} {words === 1 ? "word" : "words"}
                {words > 0 ? ` · ${formatDuration(durationSeconds)}` : ""}
              </span>
              <button
                className="pv1-secondary"
                onClick={() => fileInputRef.current?.click()}
                type="button"
              >
                <FileUp size={15} aria-hidden /> Import .txt
              </button>
              <input
                accept=".txt,text/plain"
                aria-label="Import .txt file"
                className="pv1-file-input"
                onChange={(event) => {
                  importTxt(event.target.files?.[0]);
                  event.target.value = "";
                }}
                ref={fileInputRef}
                type="file"
              />
            </div>
          </div>

          <div className="pv1-card">
            <h2>Preview of natural beats</h2>
            {beats.visible.length > 0 ? (
              <ol className="pv1-beats" aria-label="Detected beats">
                {beats.visible.map((beat, index) => (
                  <li className="pv1-beat" key={`${index}-${beat.slice(0, 12)}`}>
                    <span className="pv1-beat-index">{index + 1}</span>
                    <span className="pv1-beat-caption">
                      {beatCaption(beat)}
                    </span>
                  </li>
                ))}
                {beats.hidden > 0 ? (
                  <li className="pv1-beat pv1-beat-more">
                    <span className="pv1-beat-caption">
                      and {beats.hidden} more
                    </span>
                  </li>
                ) : null}
              </ol>
            ) : (
              <p className="pv1-muted">
                Beats appear here as you write — one card per paragraph (or
                per sentence for a single paragraph).
              </p>
            )}
          </div>
        </section>

        <aside className="pv1-create-side" aria-label="Project choices">
          <div className="pv1-card">
            <h2>
              <span className="pv1-step">2</span> Choose a project grammar
            </h2>
            <div className="pv1-choice-grid">
              <button
                aria-pressed={draft.grammar === "kids-adventure"}
                className="pv1-choice"
                onClick={() => update({ grammar: "kids-adventure" })}
                type="button"
              >
                {/* Reference art is ordinary browser UI, not a Remotion composition. */}
                {/* eslint-disable-next-line @remotion/warn-native-media-tag */}
                <img alt="" src={artDirectionStorybook} />
                <strong>{GRAMMAR_LABELS["kids-adventure"]}</strong>
                <span>Clear actions, expressive reactions, playful camera</span>
              </button>
              <button
                aria-pressed={draft.grammar === "weird-history"}
                className="pv1-choice"
                onClick={() => update({ grammar: "weird-history" })}
                type="button"
              >
                <span className="pv1-choice-text-art" aria-hidden>
                  WH
                </span>
                <strong>{GRAMMAR_LABELS["weird-history"]}</strong>
                <span>Fast cuts, evidence, deadpan punchlines</span>
              </button>
            </div>
          </div>

          <div className="pv1-card">
            <h2>
              <span className="pv1-step">3</span> Choose an art style
            </h2>
            <div className="pv1-choice-grid pv1-choice-grid-three">
              {(
                [
                  ["storybook-cutout", artDirectionStorybook],
                  ["paper-collage", artDirectionCollage],
                  ["soft-2d", artDirectionSoft2d],
                ] as const
              ).map(([style, art]) => (
                <button
                  aria-pressed={draft.artStyle === style}
                  className="pv1-choice"
                  key={style}
                  onClick={() => update({ artStyle: style })}
                  type="button"
                >
                  {/* Reference art is ordinary browser UI, not a Remotion composition. */}
                  {/* eslint-disable-next-line @remotion/warn-native-media-tag */}
                  <img alt="" src={art} />
                  <strong>{ART_STYLE_LABELS[style]}</strong>
                </button>
              ))}
            </div>
          </div>

          <div className="pv1-card">
            <h2>
              <span className="pv1-step">4</span> Voice &amp; format
            </h2>
            <div className="pv1-selects">
              <label>
                <span>Narration</span>
                <select
                  aria-label="Narration mode"
                  onChange={(event) =>
                    update({
                      narration: event.target.value as NarrationMode,
                    })
                  }
                  value={draft.narration}
                >
                  {(
                    Object.entries(NARRATION_LABELS) as Array<
                      [NarrationMode, string]
                    >
                  ).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>Format</span>
                <select
                  aria-label="Episode format"
                  onChange={(event) =>
                    update({ format: event.target.value as EpisodeFormat })
                  }
                  value={draft.format}
                >
                  <option value="16:9">16:9</option>
                  <option disabled value="1:1">
                    1:1 — arrives later
                  </option>
                  <option disabled value="9:16">
                    9:16 — arrives later
                  </option>
                </select>
              </label>
              <label>
                <span>Language</span>
                <select
                  aria-label="Language"
                  onChange={(event) =>
                    update({
                      language: event.target.value as EpisodeLanguage,
                    })
                  }
                  value={draft.language}
                >
                  <option value="english">English</option>
                  <option disabled value="more">
                    More languages — arrives later
                  </option>
                </select>
              </label>
            </div>
          </div>
        </aside>
      </div>

      <footer className="pv1-create-footer">
        <p>
          <Sparkles size={14} aria-hidden /> You&apos;ll review the script
          beats before any final media or export.
        </p>
        <button className="pv1-primary pv1-create-action" onClick={submit} type="button">
          Create first cut
        </button>
      </footer>
    </main>
  );
}
