import { Player, type PlayerRef } from "@remotion/player";
import { DirectorProductionComposition } from "@storystage/remotion-runtime/director";
import type { DirectorGuideAudioPlayback } from "@storystage/remotion-runtime/director";
import {
  applyDirectorPatch,
  currentDirectorProject,
  canRedoDirectorWorkspace,
  canUndoDirectorWorkspace,
  listDirectorReactionDelayCandidates,
  proposeDirectorPatch,
  recordDirectorWorkspaceRevision,
  redoDirectorWorkspace,
  selectDirectorWorkspaceBeat,
  undoDirectorWorkspace,
  type Cv002Project,
  type CapabilityRegistry,
  type DirectorPatch,
  type DirectorProject,
  type DirectorWorkspaceState,
} from "@storystage/story-engine/director-alpha";
import {
  Activity,
  AlertTriangle,
  Clapperboard,
  Eye,
  Film,
  Redo2,
  ShieldCheck,
  Undo2,
} from "lucide-react";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import { DirectorBeatStrip, DirectorSceneRail } from "./DirectorSceneBeatRail";
import { DirectorChangePreview } from "./DirectorChangePreview";
import { DirectorCommandPanel } from "./DirectorCommandPanel";
import { DirectorMotionPanel } from "./DirectorMotionPanel";
import { DirectorTimelineDrawer } from "./DirectorTimelineDrawer";
import { DirectorVisualPanel } from "./DirectorVisualPanel";
import { GuideAudioReviewStrip } from "./GuideAudioReviewStrip";
import { createDirectorTimelineViewModel } from "./director-timeline-view-model";

const beatRange = (director: DirectorProject, beatId: string) => {
  const shotIds = new Set(
    director.directorPlan.shots
      .filter((shot) => shot.beatIds.includes(beatId))
      .map((shot) => shot.id),
  );
  const ranges = director.timingSolution.resolvedShots.filter((shot) =>
    shotIds.has(shot.shotId),
  );
  return ranges.length
    ? {
        startFrame: Math.min(...ranges.map((range) => range.startFrame)),
        endFrameExclusive: Math.max(
          ...ranges.map((range) => range.endFrameExclusive),
        ),
      }
    : null;
};

/**
 * The post-create Studio shell: scene/beat rail on the left, the authoritative
 * Director Player as the dominant center canvas, patch-backed Director
 * controls on the right, and a compact genuine timeline along the bottom.
 * Every visible frame and control is derived from the sealed episode plan.
 */
export function DirectorAnimaticPreview({
  capabilityRegistry,
  compileError,
  guideAudio,
  onWorkspaceChange,
  project,
  workspace,
}: {
  capabilityRegistry: CapabilityRegistry;
  compileError: string | null;
  guideAudio?: DirectorGuideAudioPlayback | null;
  onWorkspaceChange: Dispatch<SetStateAction<DirectorWorkspaceState | null>>;
  project: Cv002Project;
  workspace: DirectorWorkspaceState | null;
}) {
  const [command, setCommand] = useState("");
  const [proposal, setProposal] = useState<DirectorPatch | null>(null);
  const [commandError, setCommandError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [guideMuted, setGuideMuted] = useState(false);
  const [activeDepartment, setActiveDepartment] = useState<"visual" | "motion">(
    "visual",
  );
  const [frame, setFrame] = useState(0);
  // Read-only Director proof surface: reflects the actual PlayerRef state via
  // real Player events, independent of the optimistic timeline `frame` state
  // used for styling. Exposed as stable data attributes so browser proofs can
  // assert the Player's exact frame and paused state.
  const [playerObservation, setPlayerObservation] = useState<{
    frame: number | null;
    playing: boolean;
  }>({ frame: null, playing: false });
  const playerRef = useRef<PlayerRef>(null);
  const replayEndFrame = useRef<number | null>(null);
  const replayOnNextPlan = useRef(false);

  const director = workspace ? currentDirectorProject(workspace.history) : null;
  const selectedBeatId = workspace?.selectedBeatId ?? "";

  useEffect(() => {
    const player = playerRef.current;
    if (!player) return;
    const observe = () =>
      setPlayerObservation({
        frame: player.getCurrentFrame(),
        playing: player.isPlaying(),
      });
    observe();
    player.addEventListener("seeked", observe);
    player.addEventListener("frameupdate", observe);
    player.addEventListener("play", observe);
    player.addEventListener("pause", observe);
    player.addEventListener("ended", observe);
    return () => {
      player.removeEventListener("seeked", observe);
      player.removeEventListener("frameupdate", observe);
      player.removeEventListener("play", observe);
      player.removeEventListener("pause", observe);
      player.removeEventListener("ended", observe);
    };
  }, []);

  useEffect(() => {
    const player = playerRef.current;
    if (!player || !director) return;
    const range = beatRange(director, selectedBeatId);
    if (!range) return;
    player.seekTo(range.startFrame);
    setFrame(range.startFrame);
    if (replayOnNextPlan.current) {
      replayOnNextPlan.current = false;
      replayEndFrame.current = range.endFrameExclusive;
      player.play();
    } else {
      replayEndFrame.current = null;
    }
  }, [director, selectedBeatId]);

  useEffect(() => {
    const player = playerRef.current;
    if (!player) return;
    const syncPlaybackState = (event: { detail: { frame: number } }) => {
      setFrame(event.detail.frame);
      const end = replayEndFrame.current;
      if (end !== null && event.detail.frame >= end - 1) {
        player.pause();
        replayEndFrame.current = null;
      }
      if (!director || !workspace) return;
      const resolvedShot = director.timingSolution.resolvedShots.find(
        (shot) =>
          event.detail.frame >= shot.startFrame &&
          event.detail.frame < shot.endFrameExclusive,
      );
      const activeBeatId = director.directorPlan.shots.find(
        (shot) => shot.id === resolvedShot?.shotId,
      )?.beatIds[0];
      if (!activeBeatId || activeBeatId === selectedBeatId) return;
      onWorkspaceChange((current) =>
        current &&
        current.storyProjectContentHash === workspace.storyProjectContentHash
          ? selectDirectorWorkspaceBeat(current, activeBeatId)
          : current,
      );
    };
    player.addEventListener("frameupdate", syncPlaybackState);
    return () => player.removeEventListener("frameupdate", syncPlaybackState);
  }, [director, onWorkspaceChange, selectedBeatId, workspace]);

  useEffect(() => {
    setCommand("");
    setProposal(null);
    setCommandError(null);
    setFeedback(null);
  }, [selectedBeatId]);

  const timeline = useMemo(
    () =>
      director
        ? createDirectorTimelineViewModel(director, selectedBeatId)
        : null,
    [director, selectedBeatId],
  );

  if (!director)
    return (
      <section className="cv2-director-blocked" role="alert">
        <AlertTriangle size={20} />
        <div>
          <strong>Director animatic needs attention</strong>
          <span>{compileError}</span>
        </div>
      </section>
    );

  const episode = director.executableEpisodePlan;
  const shots = director.directorPlan.shots.length;
  const beats = director.directorPlan.beats.length;
  const scenes = director.directorPlan.scenes.length;
  const capabilities = director.capabilityReport.summary;
  const selectedBeat = project.graph.scenes
    .flatMap((scene) => scene.beats)
    .find((beat) => beat.id === selectedBeatId)!;
  const selectedBeatIndex = project.graph.scenes
    .flatMap((scene) => scene.beats)
    .findIndex((beat) => beat.id === selectedBeatId);
  const selectedSceneIndex = project.graph.scenes.findIndex((scene) =>
    scene.beats.some((beat) => beat.id === selectedBeatId),
  );
  const selectedScene = project.graph.scenes[selectedSceneIndex]!;
  const selectedSceneBeatIndex = selectedScene.beats.findIndex(
    (beat) => beat.id === selectedBeatId,
  );
  const selectedBeatTitle =
    selectedBeat.text.length > 54
      ? `${selectedBeat.text.slice(0, 54).trimEnd()}…`
      : selectedBeat.text;
  const selectedCapabilityItems = director.capabilityReport.items.filter(
    (item) => item.beatId === selectedBeatId,
  );
  // Shared with the Alpha interpreter via
  // listDirectorReactionDelayCandidates (packages/story-engine
  // director-patch.ts): creator-facing command copy derives from the exact
  // (reaction event, eligible shot) pair count — 0 (no editable target),
  // 1 (real command available), 2+ (ambiguous; explicit target selection is
  // not supported yet) — the exact cardinality the interpreter accepts.
  const reactionCandidateCount = listDirectorReactionDelayCandidates(
    director,
    selectedBeatId,
  ).length;
  const selectedBeatRenderReady =
    selectedCapabilityItems.length > 0 &&
    selectedCapabilityItems.every((item) => item.resolution === "supported");
  const selectedCapabilityMessage = selectedCapabilityItems.find(
    (item) => item.resolution === "supported",
  )?.creatorMessage;

  const selectBeat = (beatId: string) => {
    onWorkspaceChange((current) =>
      current ? selectDirectorWorkspaceBeat(current, beatId) : current,
    );
  };

  const seekTo = (nextFrame: number) => {
    playerRef.current?.seekTo(nextFrame);
    setFrame(nextFrame);
  };

  const previewCommand = () => {
    try {
      setProposal(
        proposeDirectorPatch({
          baseDirectorProject: director,
          targetBeatId: selectedBeatId,
          command,
        }),
      );
      setCommandError(null);
    } catch (caught) {
      setProposal(null);
      setCommandError(
        caught instanceof Error
          ? caught.message
          : "That direction is not ready.",
      );
    }
  };

  const previewPatch = (patch: DirectorPatch) => {
    setProposal(patch);
    setCommandError(null);
  };

  const applyProposal = () => {
    if (!proposal || !workspace) return;
    try {
      const next = applyDirectorPatch({
        storyProject: project,
        baseDirectorProject: director,
        patch: proposal,
        capabilities: capabilityRegistry,
      });
      replayOnNextPlan.current = true;
      onWorkspaceChange(
        recordDirectorWorkspaceRevision(workspace, proposal, next),
      );
      setProposal(null);
      setCommand("");
      setCommandError(null);
      setFeedback(
        `Beat updated. New canonical cut ${next.contentHash.slice(0, 10)}.`,
      );
    } catch (caught) {
      setCommandError(
        caught instanceof Error
          ? caught.message
          : "That change could not be applied.",
      );
    }
  };

  const moveHistory = (direction: "undo" | "redo") => {
    if (!workspace) return;
    replayOnNextPlan.current = true;
    const next =
      direction === "undo"
        ? undoDirectorWorkspace(workspace)
        : redoDirectorWorkspace(workspace);
    onWorkspaceChange(next);
    setProposal(null);
    setCommandError(null);
    setFeedback(
      `${direction === "undo" ? "Restored" : "Reapplied"} canonical cut ${currentDirectorProject(next.history).contentHash.slice(0, 10)}.`,
    );
  };

  return (
    <section
      aria-label="Directed animatic draft"
      className="cv2-director-preview"
      data-episode-hash={episode.contentHash}
    >
      <DirectorSceneRail
        director={director}
        onSelectBeat={selectBeat}
        project={project}
        selectedBeatId={selectedBeatId}
      />

      <div className="cv2-director-stage">
        <header className="cv2-stage-heading">
          <div className="cv2-director-preview-title">
            <span>
              <Clapperboard size={20} />
            </span>
            <div>
              <small>
                Scene {selectedSceneIndex + 1} · Beat{" "}
                {selectedSceneBeatIndex + 1}
              </small>
              <h2>{selectedBeatTitle}</h2>
            </div>
          </div>
          <span className="cv2-stage-format">
            <Film size={13} />
            Draft animatic
          </span>
        </header>
        <div
          className="cv2-director-player"
          data-proof-frame={playerObservation.frame ?? undefined}
          data-proof-playing={playerObservation.playing}
          data-testid="director-player-proof"
        >
          <Player
            acknowledgeRemotionLicense
            allowFullscreen
            component={DirectorProductionComposition}
            compositionHeight={episode.format.height}
            compositionWidth={episode.format.width}
            controls
            durationInFrames={episode.format.durationInFrames}
            fps={episode.format.fps}
            inputProps={{
              episodePlan: episode,
              // Guide mute is a review-only Player prop: the episode plan
              // object and picture timing never change.
              ...(guideAudio
                ? { guideAudio: { ...guideAudio, muted: guideMuted } }
                : {}),
            }}
            loop
            ref={playerRef}
            style={{
              aspectRatio: `${episode.format.width} / ${episode.format.height}`,
              maxHeight: "100%",
              width: "100%",
            }}
          />
        </div>
        <GuideAudioReviewStrip
          muted={guideMuted}
          onToggleMuted={() => setGuideMuted((current) => !current)}
          playback={guideAudio}
        />
        <div className="director-stage-caption">
          <div>
            <small>Now directing</small>
            <strong>Beat {selectedBeatIndex + 1}</strong>
          </div>
          <span>
            Draft animatic · {shots} shots ·{" "}
            {Math.ceil(episode.format.durationInFrames / episode.format.fps)}s
          </span>
        </div>
      </div>

      <aside aria-label="Director controls" className="director-control-panel">
        <div className="director-revision-bar">
          <div>
            <small>Director</small>
            <strong>Beat {selectedBeatIndex + 1}</strong>
          </div>
          <code title={director.contentHash}>
            {director.contentHash.slice(0, 12)}
          </code>
          <div className="director-history-actions">
            <button
              aria-label="Undo direction"
              disabled={!workspace || !canUndoDirectorWorkspace(workspace)}
              onClick={() => moveHistory("undo")}
              title="Undo direction"
              type="button"
            >
              <Undo2 size={15} />
            </button>
            <button
              aria-label="Redo direction"
              disabled={!workspace || !canRedoDirectorWorkspace(workspace)}
              onClick={() => moveHistory("redo")}
              title="Redo direction"
              type="button"
            >
              <Redo2 size={15} />
            </button>
          </div>
        </div>
        <p className="director-selected-beat-copy">{selectedBeat.text}</p>
        {reactionCandidateCount === 1 ? (
          <DirectorCommandPanel
            beatLabel={`Beat ${selectedBeatIndex + 1}`}
            beatText={selectedBeatTitle}
            command={command}
            error={commandError}
            onCommandChange={setCommand}
            onPreview={previewCommand}
          />
        ) : reactionCandidateCount === 0 ? (
          <p className="director-command-unavailable">
            <strong>Structured direction unavailable on this beat.</strong>
            No editable reaction target exists here — shape the beat with the
            Visual and Motion controls below.
          </p>
        ) : (
          <p className="director-command-unavailable">
            <strong>Multiple reaction targets on this beat.</strong>
            More than one eligible reaction target — a reaction event and shot
            pair — could be retimed, and explicit target selection is not
            supported yet.
          </p>
        )}
        <div
          aria-label="Director departments"
          className="director-department-tabs"
          role="tablist"
        >
          <button
            aria-selected={activeDepartment === "visual"}
            className={activeDepartment === "visual" ? "is-active" : ""}
            onClick={() => setActiveDepartment("visual")}
            role="tab"
            type="button"
          >
            <Eye size={15} /> Visual
          </button>
          <button
            aria-selected={activeDepartment === "motion"}
            className={activeDepartment === "motion" ? "is-active" : ""}
            onClick={() => setActiveDepartment("motion")}
            role="tab"
            type="button"
          >
            <Activity size={15} /> Motion
          </button>
        </div>
        {activeDepartment === "visual" ? (
          <DirectorVisualPanel
            beatId={selectedBeatId}
            director={director}
            onPreview={previewPatch}
          />
        ) : (
          <DirectorMotionPanel beatId={selectedBeatId} director={director} />
        )}
        {proposal ? (
          <DirectorChangePreview
            onApply={applyProposal}
            onCancel={() => setProposal(null)}
            patch={proposal}
          />
        ) : null}
        {feedback ? (
          <p className="director-revision-feedback" role="status">
            {feedback}
          </p>
        ) : null}
        <footer>
          <div className="cv2-director-metrics">
            <span>
              <Film size={15} />
              <strong>{scenes}</strong> scenes
            </span>
            <span>
              <strong>{beats}</strong> beats
            </span>
            <span>
              <strong>{shots}</strong> shots
            </span>
          </div>
          <div className="cv2-director-capability">
            <ShieldCheck size={16} />
            <div>
              <strong>
                {selectedBeatRenderReady
                  ? "Render-ready performance"
                  : "Proxy performance"}
              </strong>
              <span>
                {selectedBeatRenderReady
                  ? (selectedCapabilityMessage ??
                    "A final performance capability is assigned and render-ready.")
                  : "Final character rig unavailable — this beat plays a proxy until a final rig is assigned."}
              </span>
            </div>
          </div>
        </footer>
        <details className="cv2-plan-proof">
          <summary>Advanced / Preflight</summary>
          <span>Browser episode plan</span>
          <code>{episode.contentHash}</code>
          {director.revision ? (
            <span>
              Revision from{" "}
              {director.revision.baseDirectorProjectContentHash.slice(0, 12)}
            </span>
          ) : null}
          <span>
            {capabilities.supported} render-ready · {capabilities.proxyOnly}{" "}
            proxy-only of {director.capabilityReport.items.length} performance
            requirements
          </span>
        </details>
      </aside>

      <div className="cv2-shell-timeline">
        <DirectorBeatStrip
          director={director}
          onSelectBeat={selectBeat}
          project={project}
          selectedBeatId={selectedBeatId}
        />
        {timeline ? (
          <DirectorTimelineDrawer
            activeFrame={frame}
            fps={episode.format.fps}
            onSeek={seekTo}
            timeline={timeline}
          />
        ) : null}
      </div>
    </section>
  );
}
