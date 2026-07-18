import { Player, type PlayerRef } from "@remotion/player";
import { DirectorProductionComposition } from "@storystage/remotion-runtime/director";
import {
  applyDirectorPatch,
  canRedoDirectorHistory,
  canUndoDirectorHistory,
  compileDirectorProject,
  createDirectorHistory,
  currentDirectorProject,
  proposeDirectorPatch,
  recordDirectorRevision,
  redoDirectorHistory,
  undoDirectorHistory,
  type Cv002Project,
  type DirectorHistory,
  type DirectorPatch,
  type DirectorProject,
} from "@storystage/story-engine/director-alpha";
import {
  AlertTriangle,
  Check,
  Clapperboard,
  Film,
  Redo2,
  ShieldCheck,
  Undo2,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { DirectorChangePreview } from "./DirectorChangePreview";
import { DirectorCommandPanel } from "./DirectorCommandPanel";

type CompileResult =
  | { directorProject: DirectorProject; error: null }
  | { directorProject: null; error: string };

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

export function DirectorAnimaticPreview({
  project,
  selectedBeatId,
}: {
  project: Cv002Project;
  selectedBeatId: string;
}) {
  const compiled = useMemo<CompileResult>(() => {
    try {
      return {
        directorProject: compileDirectorProject({ storyProject: project }),
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
  }, [project]);
  const [history, setHistory] = useState<DirectorHistory | null>(null);
  const [command, setCommand] = useState("");
  const [proposal, setProposal] = useState<DirectorPatch | null>(null);
  const [commandError, setCommandError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const playerRef = useRef<PlayerRef>(null);
  const replayEndFrame = useRef<number | null>(null);
  const replayOnNextPlan = useRef(false);

  useEffect(() => {
    if (!compiled.directorProject) return;
    setHistory(createDirectorHistory(compiled.directorProject));
    setProposal(null);
    setCommandError(null);
    setFeedback(null);
  }, [compiled.directorProject]);

  const director = history
    ? currentDirectorProject(history)
    : compiled.directorProject;

  useEffect(() => {
    const player = playerRef.current;
    if (!player || !director) return;
    const range = beatRange(director, selectedBeatId);
    if (!range) return;
    player.seekTo(range.startFrame);
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
    const stopAtBeatEnd = (event: { detail: { frame: number } }) => {
      const end = replayEndFrame.current;
      if (end !== null && event.detail.frame >= end - 1) {
        player.pause();
        replayEndFrame.current = null;
      }
    };
    player.addEventListener("frameupdate", stopAtBeatEnd);
    return () => player.removeEventListener("frameupdate", stopAtBeatEnd);
  }, [director]);

  useEffect(() => {
    setProposal(null);
    setCommandError(null);
    setFeedback(null);
  }, [selectedBeatId]);

  if (!director)
    return (
      <section className="cv2-director-blocked" role="alert">
        <AlertTriangle size={20} />
        <div>
          <strong>Director animatic needs attention</strong>
          <span>{compiled.error}</span>
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

  const applyProposal = () => {
    if (!proposal || !history) return;
    try {
      const next = applyDirectorPatch({
        storyProject: project,
        baseDirectorProject: director,
        patch: proposal,
      });
      replayOnNextPlan.current = true;
      setHistory(recordDirectorRevision(history, proposal, next));
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
    if (!history) return;
    replayOnNextPlan.current = true;
    const next =
      direction === "undo"
        ? undoDirectorHistory(history)
        : redoDirectorHistory(history);
    setHistory(next);
    setProposal(null);
    setCommandError(null);
    setFeedback(
      `${direction === "undo" ? "Restored" : "Reapplied"} canonical cut ${currentDirectorProject(next).contentHash.slice(0, 10)}.`,
    );
  };

  return (
    <section
      className="cv2-director-preview"
      data-episode-hash={episode.contentHash}
      aria-label="Directed animatic draft"
    >
      <header>
        <div className="cv2-director-preview-title">
          <span>
            <Clapperboard size={20} />
          </span>
          <div>
            <small>Director Studio Alpha</small>
            <h2>Directed animatic draft</h2>
          </div>
        </div>
        <div className="cv2-director-ready">
          <Check size={15} />
          <span>Canonical plan ready</span>
        </div>
      </header>
      <div className="cv2-director-player">
        <Player
          acknowledgeRemotionLicense
          allowFullscreen
          component={DirectorProductionComposition}
          compositionHeight={episode.format.height}
          compositionWidth={episode.format.width}
          controls
          durationInFrames={episode.format.durationInFrames}
          fps={episode.format.fps}
          inputProps={{ episodePlan: episode }}
          loop
          ref={playerRef}
          style={{
            aspectRatio: `${episode.format.width} / ${episode.format.height}`,
            width: "100%",
          }}
        />
      </div>
      <div className="director-revision-bar">
        <div>
          <small>Selected beat</small>
          <strong>Beat {selectedBeatIndex + 1}</strong>
        </div>
        <code title={director.contentHash}>
          {director.contentHash.slice(0, 12)}
        </code>
        <div className="director-history-actions">
          <button
            disabled={!history || !canUndoDirectorHistory(history)}
            onClick={() => moveHistory("undo")}
            type="button"
          >
            <Undo2 size={15} /> Undo direction
          </button>
          <button
            disabled={!history || !canRedoDirectorHistory(history)}
            onClick={() => moveHistory("redo")}
            type="button"
          >
            <Redo2 size={15} /> Redo
          </button>
        </div>
      </div>
      <DirectorCommandPanel
        beatLabel={`${selectedBeatIndex + 1}`}
        beatText={selectedBeat.text}
        command={command}
        error={commandError}
        onCommandChange={setCommand}
        onPreview={previewCommand}
      />
      {proposal ? (
        <DirectorChangePreview
          patch={proposal}
          onApply={applyProposal}
          onCancel={() => setProposal(null)}
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
            <strong>{shots}</strong> motivated shots
          </span>
          <span>
            <strong>
              {Math.ceil(episode.format.durationInFrames / episode.format.fps)}s
            </strong>{" "}
            estimated
          </span>
        </div>
        <div className="cv2-director-capability">
          <ShieldCheck size={16} />
          <div>
            <strong>
              {capabilities.supported} final-ready · {capabilities.proxyOnly}{" "}
              proxy-only
            </strong>
            <span>Final animation capabilities are not fully assigned.</span>
          </div>
        </div>
      </footer>
      <details className="cv2-plan-proof">
        <summary>Advanced plan proof</summary>
        <span>Browser episode plan</span>
        <code>{episode.contentHash}</code>
        {director.revision ? (
          <span>
            Revision from{" "}
            {director.revision.baseDirectorProjectContentHash.slice(0, 12)}
          </span>
        ) : null}
      </details>
    </section>
  );
}
