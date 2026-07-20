import { ArrowLeft, PencilLine } from "lucide-react";
import { beatCaption, countWords, previewBeats } from "./beat-preview";
import type { CreateDraft } from "./CreateProject";
import { ART_STYLE_LABELS, GRAMMAR_LABELS } from "./CreateProject";
import { LOCAL_DEMO_BANNER } from "./demo-project";

/**
 * F1 honest local Studio handoff. This is NOT a generation result: it shows
 * the creator's choices and the locally detected beats, and says plainly
 * that no imagery, animation, audio, or render was generated. F2 replaces
 * this with the long-form Studio shell.
 */
export function LocalStudioHandoff({
  draft,
  onBackToProjects,
  onEditScript,
  projectName,
}: {
  draft: CreateDraft;
  onBackToProjects: () => void;
  onEditScript: () => void;
  projectName: string;
}) {
  const beats = previewBeats(draft.script);
  const words = countWords(draft.script);

  return (
    <main className="pv1-page" data-testid="pv1-handoff">
      <header className="pv1-topbar">
        <span className="pv1-brand">StoryStage</span>
        <span className="pv1-topbar-context">{projectName}</span>
      </header>

      <section className="pv1-handoff" aria-label="Local Studio handoff">
        <p className="pv1-handoff-banner" role="note">
          {LOCAL_DEMO_BANNER}
        </p>
        <h1>{projectName}</h1>
        <p className="pv1-handoff-truth">
          Your first-cut plan is ready to review locally. No imagery,
          animation, audio, or render was generated — StoryStage only read
          your script on this device.
        </p>

        <div className="pv1-handoff-grid">
          <div className="pv1-card">
            <h2>Your choices</h2>
            <dl className="pv1-facts">
              <div>
                <dt>Grammar</dt>
                <dd>{GRAMMAR_LABELS[draft.grammar]}</dd>
              </div>
              <div>
                <dt>Art style</dt>
                <dd>{ART_STYLE_LABELS[draft.artStyle]}</dd>
              </div>
              <div>
                <dt>Narration</dt>
                <dd>
                  {draft.narration === "guide-voice" ? "Guide voice" : "Silent"}
                </dd>
              </div>
              <div>
                <dt>Format</dt>
                <dd>{draft.format}</dd>
              </div>
              <div>
                <dt>Language</dt>
                <dd>English</dd>
              </div>
              <div>
                <dt>Script</dt>
                <dd>{words} words</dd>
              </div>
            </dl>
          </div>

          <div className="pv1-card">
            <h2>Detected beats ({beats.beats.length})</h2>
            <ol className="pv1-beat-list">
              {beats.visible.map((beat, index) => (
                <li key={`${index}-${beat.slice(0, 12)}`}>
                  <span>{index + 1}.</span> {beatCaption(beat)}
                </li>
              ))}
              {beats.hidden > 0 ? <li>…and {beats.hidden} more</li> : null}
            </ol>
          </div>
        </div>

        <div className="pv1-handoff-actions">
          <button className="pv1-secondary" onClick={onBackToProjects} type="button">
            <ArrowLeft size={15} aria-hidden /> Back to projects
          </button>
          <button className="pv1-primary" onClick={onEditScript} type="button">
            <PencilLine size={15} aria-hidden /> Edit script
          </button>
        </div>
      </section>
    </main>
  );
}
