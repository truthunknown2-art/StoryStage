import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ListChecks } from "lucide-react";
import { formatDuration } from "./beat-preview";
import { AI_FIXTURE_LABEL } from "./ai-director-fixture";
import type {
  CreateProposal,
  CreateProposalBeat,
  CreateProposalScene,
} from "./create-proposal";

/**
 * F3-WP4: the one shared pre-project **Review proposal** surface. Both
 * entry paths (**Paste a script** and **What's your idea?**) converge on
 * this component and cannot bypass it: the only way into Studio is the
 * plainly-labelled local-demo action at the bottom.
 *
 * The review is genuinely editable: proposed episode/scene/beat titles
 * and direction text are bounded local edits to this review's own
 * deterministic state — never AI generation, never a saved production
 * change, and never assets, media, rendering, or export. Revise input
 * stays a distinct action that returns to the source input rather than
 * touching the proposal.
 *
 * F3-WP5: arriving on the review focuses the episode-title field (the one
 * required editable field), and the blank-title gate moves focus back to
 * that invalid control so keyboard and assistive-technology users land
 * exactly where the correction belongs.
 */
export function ProposalReview({
  proposal,
  onDiscard,
  onEnterStudio,
  onProposalChange,
  onRevise,
}: {
  proposal: CreateProposal;
  onDiscard: () => void;
  onEnterStudio: () => void;
  onProposalChange: (next: CreateProposal) => void;
  onRevise: () => void;
}) {
  const [showTitleError, setShowTitleError] = useState(false);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const titleIsBlank = proposal.episodeTitle.trim().length === 0;

  useEffect(() => {
    titleInputRef.current?.focus();
  }, []);

  const enterStudio = () => {
    if (titleIsBlank) {
      setShowTitleError(true);
      titleInputRef.current?.focus();
      return;
    }
    onEnterStudio();
  };

  const updateScene = (
    sceneIndex: number,
    patch: Partial<CreateProposalScene>,
  ) =>
    onProposalChange({
      ...proposal,
      scenes: proposal.scenes.map((scene, index) =>
        index === sceneIndex ? { ...scene, ...patch } : scene,
      ),
    });

  const updateBeat = (
    sceneIndex: number,
    beatIndex: number,
    patch: Partial<CreateProposalBeat>,
  ) =>
    onProposalChange({
      ...proposal,
      scenes: proposal.scenes.map((scene, index) =>
        index === sceneIndex
          ? {
              ...scene,
              beats: scene.beats.map((beat, beatPosition) =>
                beatPosition === beatIndex ? { ...beat, ...patch } : beat,
              ),
            }
          : scene,
      ),
    });

  return (
    <article aria-label="Review proposal" className="pv1-proposal-review">
      <header className="pv1-proposal-review-heading">
        <div>
          <small>
            <ListChecks size={13} aria-hidden /> Review proposal ·{" "}
            {proposal.templateLabel}
          </small>
          <h1>
            <input
              aria-describedby={showTitleError ? "pv1-proposal-title-error" : undefined}
              aria-invalid={showTitleError && titleIsBlank}
              aria-label="Episode title"
              className="pv1-proposal-title-input"
              onChange={(event) => {
                if (event.target.value.trim().length > 0) {
                  setShowTitleError(false);
                }
                onProposalChange({
                  ...proposal,
                  episodeTitle: event.target.value,
                });
              }}
              ref={titleInputRef}
              required
              value={proposal.episodeTitle}
            />
            {showTitleError && titleIsBlank ? (
              <p id="pv1-proposal-title-error" role="alert">
                Add an episode title before entering Studio.
              </p>
            ) : null}
          </h1>
        </div>
        <span className="pv1-badge">
          {proposal.source === "paste" ? "From your script" : "From your idea"}
        </span>
      </header>
      <p className="pv1-ai-fixture-note" role="note">
        {AI_FIXTURE_LABEL} — this is a deterministic local proposal for your
        review, not a generated production screenplay.
      </p>
      <p className="pv1-muted">
        Edit the proposed titles and direction below — your edits change only
        this local review. They are not AI generation, and nothing is saved.
      </p>

      <section
        aria-label="Proposed episode hierarchy"
        className="pv1-proposal-hierarchy"
      >
        <h2>Proposed episode, scenes, and beats</h2>
        <ol>
          {proposal.scenes.map((scene, sceneIndex) => (
            <li className="pv1-proposal-scene" key={sceneIndex}>
              <div className="pv1-proposal-scene-heading">
                <input
                  aria-label={`Scene ${sceneIndex + 1} title`}
                  className="pv1-proposal-scene-title-input"
                  onChange={(event) =>
                    updateScene(sceneIndex, { title: event.target.value })
                  }
                  value={scene.title}
                />
                <small>{formatDuration(scene.seconds)}</small>
              </div>
              <textarea
                aria-label={`Scene ${sceneIndex + 1} direction`}
                className="pv1-proposal-direction-input"
                onChange={(event) =>
                  updateScene(sceneIndex, { direction: event.target.value })
                }
                rows={2}
                value={scene.direction}
              />
              <ol>
                {scene.beats.map((beat, beatIndex) => (
                  <li className="pv1-proposal-beat" key={beatIndex}>
                    <div className="pv1-proposal-scene-heading">
                      <input
                        aria-label={`Scene ${sceneIndex + 1} beat ${
                          beatIndex + 1
                        } title`}
                        className="pv1-proposal-scene-title-input"
                        onChange={(event) =>
                          updateBeat(sceneIndex, beatIndex, {
                            title: event.target.value,
                          })
                        }
                        value={beat.title}
                      />
                      <small>{formatDuration(beat.seconds)}</small>
                    </div>
                    <textarea
                      aria-label={`Scene ${sceneIndex + 1} beat ${
                        beatIndex + 1
                      } direction`}
                      className="pv1-proposal-direction-input"
                      onChange={(event) =>
                        updateBeat(sceneIndex, beatIndex, {
                          direction: event.target.value,
                        })
                      }
                      rows={2}
                      value={beat.direction}
                    />
                  </li>
                ))}
              </ol>
            </li>
          ))}
        </ol>
        {proposal.hiddenBeatCount > 0 ? (
          <p className="pv1-muted">
            and {proposal.hiddenBeatCount} more detected{" "}
            {proposal.hiddenBeatCount === 1 ? "beat" : "beats"} not listed
            individually in this review
          </p>
        ) : null}
      </section>

      <dl className="pv1-proposal-facts">
        <div>
          <dt>Direction summary</dt>
          <dd>
            <textarea
              aria-label="Direction summary"
              className="pv1-proposal-direction-input"
              onChange={(event) =>
                onProposalChange({
                  ...proposal,
                  directionSummary: event.target.value,
                })
              }
              rows={2}
              value={proposal.directionSummary}
            />
          </dd>
        </div>
        <div>
          <dt>Affected range</dt>
          <dd>{proposal.affectedRangeLabel}</dd>
        </div>
        <div>
          <dt>Asset impact</dt>
          <dd>{proposal.assetImpactLabel}</dd>
        </div>
      </dl>

      <p className="pv1-proposal-demo-note" role="note">
        Entering Studio is local demo navigation only — no production project,
        media, render, or export has been created. The demo Studio opens the
        fixed Ollo layout-demo episode under your reviewed episode title;
        reviewed scenes, beats, and direction stay in this review and are not
        carried into the demo Studio or saved.
      </p>
      <div className="pv1-proposal-actions">
        <button className="pv1-secondary" onClick={onRevise} type="button">
          <ArrowLeft size={14} aria-hidden /> Revise input
        </button>
        <button className="pv1-secondary" onClick={onDiscard} type="button">
          Start over
        </button>
        <button className="pv1-primary" onClick={enterStudio} type="button">
          Enter Studio — local demo only
        </button>
      </div>
    </article>
  );
}
