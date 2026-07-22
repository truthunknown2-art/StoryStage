import { useRef, useState } from "react";
import {
  ArrowLeft,
  CircleAlert,
  FileText,
  FileUp,
  Lightbulb,
} from "lucide-react";
import olloCastArt from "../assets/ollo-friends-cast-v1.jpg";
import {
  countWords,
  estimateDurationSeconds,
  formatDuration,
} from "./beat-preview";
import { LOCAL_DEMO_BANNER } from "./demo-project";
import { AiDirectorControls } from "./AiDirectorControls";
import { ConnectAiDirector } from "./ConnectAiDirector";
import { ProposalReview } from "./ProposalReview";
import {
  AI_FIXTURE_LABEL,
  isAiConnected,
  type AiConnectionState,
} from "./ai-director-fixture";
import {
  CREATE_TEMPLATE_ART_LABEL,
  CREATE_TEMPLATE_GRAMMAR_LABEL,
  CREATE_TEMPLATE_LABEL,
  IDEA_DURATION_OPTIONS,
  IDEA_TONE_OPTIONS,
  buildIdeaProposal,
  buildPasteProposal,
  type CreateProposal,
  type IdeaDraft,
  type IdeaTone,
} from "./create-proposal";

export type CreatePath = "choice" | "paste" | "idea";

export interface CreateDraft {
  path: CreatePath;
  script: string;
  idea: IdeaDraft;
}

/**
 * F3-WP4 New Project: the single private-launch template **Ollo &
 * Friends — Kids Story** with exactly two entry paths — **Paste a
 * script** and **What's your idea?**. The old grammar-first hierarchy is
 * gone (no Weird History). Both paths converge on the same shared
 * `ProposalReview` surface and cannot bypass it; entering Studio remains
 * local demo navigation only.
 */
export function CreateProject({
  aiConnection,
  draft,
  onAiConnectionChange,
  onBackToProjects,
  onDraftChange,
  onEnterStudio,
}: {
  aiConnection: AiConnectionState;
  draft: CreateDraft;
  onAiConnectionChange: (next: AiConnectionState) => void;
  onBackToProjects: () => void;
  onDraftChange: (draft: CreateDraft) => void;
  onEnterStudio: (proposal: CreateProposal) => void;
}) {
  const [reviewing, setReviewing] = useState(false);
  const [reviewProposal, setReviewProposal] = useState<CreateProposal | null>(
    null,
  );
  const [scriptError, setScriptError] = useState<string | null>(null);
  const [ideaError, setIdeaError] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const words = countWords(draft.script);
  const durationSeconds = estimateDurationSeconds(words);

  const update = (patch: Partial<CreateDraft>) => {
    onDraftChange({ ...draft, ...patch });
    if (patch.script !== undefined) setScriptError(null);
  };

  const updateIdea = (patch: Partial<IdeaDraft>) => {
    onDraftChange({ ...draft, idea: { ...draft.idea, ...patch } });
    setIdeaError(null);
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

  const choosePath = (path: CreatePath) => {
    setReviewing(false);
    setReviewProposal(null);
    setScriptError(null);
    setIdeaError(null);
    setImportError(null);
    onDraftChange({ ...draft, path });
  };

  const submitPaste = () => {
    const built = buildPasteProposal(draft.script);
    if (built === null) {
      setScriptError("Add your script before creating a proposal.");
      return;
    }
    setReviewProposal(built);
    setReviewing(true);
  };

  const submitIdea = () => {
    const built = buildIdeaProposal(draft.idea);
    if (built === null) {
      setIdeaError(
        "Tell StoryStage your story idea before creating a proposal.",
      );
      return;
    }
    setReviewProposal(built);
    setReviewing(true);
  };

  const topbar = (
    <header className="pv1-topbar">
      <span className="pv1-brand">StoryStage</span>
      <span className="pv1-topbar-context">New project</span>
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
  );

  // Both entry paths converge here: one shared, genuinely editable review,
  // no bypass. The review is only reachable after path validation produced
  // a deterministic local proposal; edits live in this review's own state
  // and re-submitting either path rebuilds deterministically from the
  // source input.
  if (reviewing && reviewProposal) {
    return (
      <main className="pv1-page" data-testid="pv1-create">
        {topbar}
        <div className="pv1-create-review">
          <ProposalReview
            onDiscard={() => choosePath("choice")}
            onEnterStudio={() => onEnterStudio(reviewProposal)}
            onProposalChange={setReviewProposal}
            onRevise={() => setReviewing(false)}
            proposal={reviewProposal}
          />
        </div>
      </main>
    );
  }

  if (draft.path === "paste") {
    return (
      <main className="pv1-page" data-testid="pv1-create">
        {topbar}
        <div className="pv1-create-narrow">
          <nav aria-label="Create path" className="pv1-create-crumb">
            <button
              className="pv1-quiet"
              onClick={() => choosePath("choice")}
              type="button"
            >
              <ArrowLeft size={13} aria-hidden /> Choose a different path
            </button>
            <span>Paste a script</span>
          </nav>
          <section aria-label="Paste a script" className="pv1-card">
            <h1>Paste a script</h1>
            <p className="pv1-lede">
              Your words stay on this device. StoryStage drafts a deterministic
              local screenplay proposal for your review — nothing is generated
              by a service.
            </p>
            <textarea
              aria-label="Script"
              className="pv1-script-input"
              onChange={(event) => update({ script: event.target.value })}
              placeholder="Paste or write your story script here…"
              rows={10}
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
            <div className="pv1-create-submit-row">
              <p className="pv1-muted">
                You will review the proposed scenes and beats before anything
                enters Studio.
              </p>
              <button
                className="pv1-primary"
                onClick={submitPaste}
                type="button"
              >
                Create proposal
              </button>
            </div>
          </section>
        </div>
      </main>
    );
  }

  if (draft.path === "idea") {
    return (
      <main className="pv1-page" data-testid="pv1-create">
        {topbar}
        <div className="pv1-create-narrow">
          <nav aria-label="Create path" className="pv1-create-crumb">
            <button
              className="pv1-quiet"
              onClick={() => choosePath("choice")}
              type="button"
            >
              <ArrowLeft size={13} aria-hidden /> Choose a different path
            </button>
            <span>What&apos;s your idea?</span>
          </nav>
          {isAiConnected(aiConnection) ? (
            <section aria-label="What's your idea?" className="pv1-card">
              <h1>What&apos;s your idea?</h1>
              <p className="pv1-lede">
                Describe your story and the AI Director drafts a proposal for
                your review. {AI_FIXTURE_LABEL}
              </p>
              <form
                className="pv1-idea-form"
                onSubmit={(event) => {
                  event.preventDefault();
                  submitIdea();
                }}
              >
                <label className="pv1-idea-field">
                  <span>Story idea</span>
                  <textarea
                    aria-label="Story idea"
                    onChange={(event) =>
                      updateIdea({ storyIdea: event.target.value })
                    }
                    placeholder="A curious lantern leads three friends beyond the little wood…"
                    rows={3}
                    value={draft.idea.storyIdea}
                  />
                </label>
                <div className="pv1-idea-grid">
                  <label className="pv1-idea-field">
                    <span>Target duration</span>
                    <select
                      aria-label="Target duration"
                      onChange={(event) =>
                        updateIdea({
                          targetDurationSeconds: Number(event.target.value),
                        })
                      }
                      value={draft.idea.targetDurationSeconds}
                    >
                      {IDEA_DURATION_OPTIONS.map((option) => (
                        <option key={option.seconds} value={option.seconds}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="pv1-idea-field">
                    <span>Tone</span>
                    <select
                      aria-label="Tone"
                      onChange={(event) =>
                        updateIdea({ tone: event.target.value as IdeaTone })
                      }
                      value={draft.idea.tone}
                    >
                      {IDEA_TONE_OPTIONS.map((tone) => (
                        <option key={tone} value={tone}>
                          {tone}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <label className="pv1-idea-field">
                  <span>Cast (optional)</span>
                  <input
                    aria-label="Cast"
                    onChange={(event) =>
                      updateIdea({ cast: event.target.value })
                    }
                    placeholder="Ollo, Tix, and Dot"
                    type="text"
                    value={draft.idea.cast}
                  />
                </label>
                <label className="pv1-idea-field">
                  <span>Constraints (optional)</span>
                  <input
                    aria-label="Constraints"
                    onChange={(event) =>
                      updateIdea({ constraints: event.target.value })
                    }
                    placeholder="No scary moments; keep every scene gentle"
                    type="text"
                    value={draft.idea.constraints}
                  />
                </label>
                {ideaError ? (
                  <p className="pv1-error" role="alert">
                    <CircleAlert size={14} aria-hidden /> {ideaError}
                  </p>
                ) : null}
                <div className="pv1-create-submit-row">
                  <p className="pv1-muted">
                    You will review the proposed episode before anything enters
                    Studio.
                  </p>
                  <button className="pv1-primary" type="submit">
                    Create proposal
                  </button>
                </div>
              </form>
            </section>
          ) : (
            <ConnectAiDirector
              connection={aiConnection}
              onConnectionChange={onAiConnectionChange}
            />
          )}
        </div>
      </main>
    );
  }

  return (
    <main className="pv1-page" data-testid="pv1-create">
      {topbar}
      <div className="pv1-create-narrow">
        <section aria-label="Choose how to start" className="pv1-create-choice">
          <h1>Start a new Kids Story</h1>
          <p className="pv1-lede">
            One private-launch template, two ways in. You review the proposal
            before anything enters Studio.
          </p>
          <div className="pv1-template-card">
            {/* Reference art is ordinary browser UI, not a Remotion composition. */}
            {/* eslint-disable-next-line @remotion/warn-native-media-tag */}
            <img alt="Ollo & Friends cast reference art" src={olloCastArt} />
            <div>
              <strong>{CREATE_TEMPLATE_LABEL}</strong>
              <span>
                The one private-launch template ·{" "}
                {CREATE_TEMPLATE_GRAMMAR_LABEL} grammar ·{" "}
                {CREATE_TEMPLATE_ART_LABEL} style
              </span>
            </div>
          </div>
          <div className="pv1-path-grid">
            <button
              className="pv1-path-card"
              onClick={() => choosePath("paste")}
              type="button"
            >
              <FileText size={18} aria-hidden />
              <strong>Paste a script</strong>
              <span>
                Bring your own words — StoryStage drafts a local screenplay
                proposal for your review.
              </span>
            </button>
            <button
              className="pv1-path-card"
              onClick={() => choosePath("idea")}
              type="button"
            >
              <Lightbulb size={18} aria-hidden />
              <strong>What&apos;s your idea?</strong>
              <span>
                Describe your story to the AI Director and review its proposal.{" "}
                {AI_FIXTURE_LABEL}
              </span>
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}
