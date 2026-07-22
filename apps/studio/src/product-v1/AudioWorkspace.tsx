import { useState } from "react";
import type { KeyboardEvent } from "react";
import { OLLO_DEMO_SCENES, type DemoScene } from "./demo-project";
import {
  AUDIO_CARD_STATUS,
  AUDIO_EMPTY_STATE,
  AUDIO_FIXTURE_LABEL,
  AUDIO_TRACK_KIND_LABEL,
  AUDIO_TRACKS,
  AUDIO_TRUTH_NOTE,
  FINAL_TIMING_LABEL,
  GUIDE_TIMING_LABEL,
  audioCardsForScope,
  audioCountSummary,
  audioGuideTimingNote,
  audioOrientationActions,
  audioScopeLabel,
  audioTrack,
  resolveAudioCardSelection,
  type AudioTrackId,
} from "./audio-workspace";

/**
 * F5-WP1 Audio workspace: the Narration, Dialogue, SFX, and Music track
 * hierarchy over one shared scene/beat scope. The scope is the accepted
 * Studio selection owned by the shell — the selects here write through the
 * same authoritative callbacks, so the audio surface and the Scene board can
 * never disagree, and a scene or beat change deterministically re-resolves
 * the visible cards (render-time adjustment, no effect races).
 *
 * Every take and cue is a labelled local demo planning card: nothing here
 * records, imports, decodes, plays, mixes, persists, or sends media to an
 * engine. Guide timing is always paired with its provisional label; final
 * timing is always labelled unavailable.
 */
export function AudioWorkspace({
  onSelectBeat,
  onSelectScene,
  selectedBeatIndex,
  selectedScene,
  usesLayoutDemo = false,
}: {
  onSelectBeat: (beatIndex: number) => void;
  onSelectScene: (sceneId: string) => void;
  selectedBeatIndex: number;
  selectedScene: DemoScene;
  usesLayoutDemo?: boolean;
}) {
  const [trackId, setTrackId] = useState<AudioTrackId>("narration");
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);

  const track = audioTrack(trackId);
  const visibleCards = audioCardsForScope(
    trackId,
    selectedScene.id,
    selectedBeatIndex,
  );
  /* One deterministic selection identity shared by the cards and the
   * inspector: a track, scene, or beat change can never keep a hidden stale
   * card selected. */
  const resolvedCardId = resolveAudioCardSelection(visibleCards, selectedCardId);
  if (resolvedCardId !== selectedCardId) {
    setSelectedCardId(resolvedCardId);
  }
  const selectedCard =
    visibleCards.find((card) => card.id === resolvedCardId) ?? null;

  const scopeLabel = audioScopeLabel(selectedScene, selectedBeatIndex);
  const cardNoun = track.cardNoun;
  const statusLabel = AUDIO_CARD_STATUS[track.kind === "voice" ? "take" : "cue"];

  /* Track tab keyboard contract (same as the accepted Director tabs):
   * ArrowRight/ArrowLeft move between the four track tabs (wrapping),
   * Home/End jump to first/last, and focus follows the selection. */
  const onTrackTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    const ids = AUDIO_TRACKS.map((entry) => entry.id);
    const focusedTab = event.currentTarget.dataset.audioTrack as
      | AudioTrackId
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
    setTrackId(nextId);
    document.getElementById(`pv1-audio-tab-${nextId}`)?.focus();
  };

  return (
    <section
      aria-label="Audio workspace"
      className="pv1-audio"
      data-testid="pv1-audio"
    >
      <header className="pv1-audio-header">
        <div>
          <small>Audio workspace</small>
          <h1>{track.label}</h1>
        </div>
        <span className="pv1-badge">Planning cards — no audio exists</span>
      </header>

      <p className="pv1-audio-truth" role="note">
        {AUDIO_TRUTH_NOTE}
      </p>
      {usesLayoutDemo ? (
        <p className="pv1-layout-demo-note" role="note">
          Layout demo — these planning cards describe the bounded Ollo demo
          plan, not audio from your script. Script-specific narration, sound
          effects, and music have not been planned, recorded, or imported.
        </p>
      ) : null}

      <div className="pv1-audio-controls">
        <div
          aria-label="Audio tracks"
          className="pv1-audio-tracks"
          role="tablist"
        >
          {AUDIO_TRACKS.map((entry) => (
            <button
              aria-controls={`pv1-audio-panel-${entry.id}`}
              aria-selected={trackId === entry.id}
              className={`pv1-audio-track ${trackId === entry.id ? "is-selected" : ""}`}
              data-audio-track={entry.id}
              id={`pv1-audio-tab-${entry.id}`}
              key={entry.id}
              onClick={() => setTrackId(entry.id)}
              onKeyDown={onTrackTabKeyDown}
              role="tab"
              tabIndex={trackId === entry.id ? 0 : -1}
              type="button"
            >
              {entry.label}
            </button>
          ))}
        </div>
        <div className="pv1-audio-scope-controls">
          <label>
            <span>Scene</span>
            <select
              aria-label="Audio scene scope"
              onChange={(event) => onSelectScene(event.target.value)}
              value={selectedScene.id}
            >
              {OLLO_DEMO_SCENES.map((scene) => {
                const index = OLLO_DEMO_SCENES.indexOf(scene);
                return (
                  <option key={scene.id} value={scene.id}>
                    Scene {index + 1} · {scene.title}
                  </option>
                );
              })}
            </select>
          </label>
          <label>
            <span>Beat</span>
            <select
              aria-label="Audio beat scope"
              onChange={(event) => onSelectBeat(Number(event.target.value))}
              value={selectedBeatIndex}
            >
              {selectedScene.beats.map((beat, index) => (
                <option key={beat.title} value={index}>
                  Beat {index + 1} · {beat.title}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>
      <p className="pv1-audio-scope-note" role="note">
        Shared scope — this is the same selected scene and beat as the Scene
        board and the scope header; changing it here changes it everywhere.
      </p>

      <div className="pv1-audio-columns">
        {AUDIO_TRACKS.map((entry) => {
          const isActive = entry.id === trackId;
          /* Each panel renders only its own track's cards for the shared
           * scope, so a take or cue can never appear under another track. */
          const panelCards = audioCardsForScope(
            entry.id,
            selectedScene.id,
            selectedBeatIndex,
          );
          return (
            <section
              aria-labelledby={`pv1-audio-tab-${entry.id}`}
              className="pv1-audio-list"
              hidden={!isActive}
              id={`pv1-audio-panel-${entry.id}`}
              key={entry.id}
              role="tabpanel"
            >
              <h2>{scopeLabel}</h2>
              <p
                aria-label={`${entry.label} count summary`}
                className="pv1-audio-count"
              >
                {audioCountSummary(entry.id, panelCards.length)}
              </p>
              {panelCards.length === 0 ? (
                <p className="pv1-audio-empty" role="note">
                  No {entry.label.toLowerCase()} planning {entry.cardNoun}s for{" "}
                  {scopeLabel}. Nothing is hidden — this scope honestly has no
                  planning {entry.cardNoun}s yet. {AUDIO_EMPTY_STATE[entry.id]}
                </p>
              ) : (
                <ul>
                  {panelCards.map((card) => {
                    const isSelected = isActive && card.id === resolvedCardId;
                    return (
                      <li key={card.id}>
                        <button
                          aria-current={isSelected ? "true" : undefined}
                          className={`pv1-audio-card ${isSelected ? "is-selected" : ""}`}
                          onClick={() => setSelectedCardId(card.id)}
                          type="button"
                        >
                          <strong>{card.name}</strong>
                          <small>
                            {AUDIO_CARD_STATUS[
                              entry.kind === "voice" ? "take" : "cue"
                            ]}{" "}
                            · {AUDIO_FIXTURE_LABEL}
                          </small>
                          <small>
                            {audioGuideTimingNote(card)} — {GUIDE_TIMING_LABEL}
                          </small>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          );
        })}

        <section
          aria-label="Selected track inspector"
          className="pv1-audio-inspector"
        >
          <header>
            <h2>Track inspector</h2>
            <p className="pv1-audio-inspector-label" role="note">
              {AUDIO_FIXTURE_LABEL}
            </p>
          </header>
          <dl>
            <div>
              <dt>Track</dt>
              <dd>
                {track.label} — {AUDIO_TRACK_KIND_LABEL[track.kind]}
              </dd>
            </div>
            <div>
              <dt>Scope</dt>
              <dd>{scopeLabel}</dd>
            </div>
            <div>
              <dt>Selected {cardNoun}</dt>
              <dd>
                {selectedCard
                  ? selectedCard.name
                  : `No ${cardNoun} selected — this scope has no ${track.label.toLowerCase()} planning ${cardNoun}s.`}
              </dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd>
                {statusLabel} — {AUDIO_FIXTURE_LABEL}.
              </dd>
            </div>
            <div>
              <dt>Timing basis</dt>
              <dd>
                {selectedCard
                  ? `${audioGuideTimingNote(selectedCard)}. `
                  : ""}
                {GUIDE_TIMING_LABEL}. {FINAL_TIMING_LABEL}.
              </dd>
            </div>
            {selectedCard ? (
              <div>
                <dt>Intent</dt>
                <dd>{selectedCard.intent}</dd>
              </div>
            ) : null}
          </dl>
          <div className="pv1-audio-actions">
            {audioOrientationActions(trackId).map((action) => (
              <p className="pv1-audio-action" key={action.action}>
                <button className="pv1-secondary" disabled type="button">
                  {action.action}
                </button>
                <span>{action.unavailableReason}</span>
              </p>
            ))}
          </div>
        </section>
      </div>
    </section>
  );
}
