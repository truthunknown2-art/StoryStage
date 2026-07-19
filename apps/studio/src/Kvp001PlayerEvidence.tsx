import { createBundledKidsCapabilityRegistry } from "@storystage/remotion-runtime/director";
import {
  compileDirectorProject,
  createDirectorWorkspaceState,
  createKvp001ProofFixture,
  KVP001_PROOF_LIMITATION,
  type CapabilityRegistry,
  type Cv002Project,
  type DirectorProject,
  type DirectorWorkspaceState,
} from "@storystage/story-engine/director-alpha";
import { useState } from "react";
import { DirectorAnimaticPreview } from "./director/DirectorPreview";

export type Kvp001PlayerEvidenceState = {
  capabilityRegistry: CapabilityRegistry;
  project: Cv002Project;
  directorProject: DirectorProject;
  workspace: DirectorWorkspaceState;
  proofShot: {
    shotId: string;
    startFrame: number;
    endFrameExclusive: number;
  };
};

const compileKvp001PlayerBuild = () => {
  const fixture = createKvp001ProofFixture();
  const proxy = compileDirectorProject({
    storyProject: fixture.storyProject,
    planner: fixture.planner,
  });
  const requirement = proxy.directorPlan.beats[0]?.performanceRequirements[0];
  if (!requirement || requirement.source !== "articulated-rig")
    throw new Error(
      "KVP-001 Player evidence requires the canonical articulated-rig requirement.",
    );

  const capabilityRegistry = createBundledKidsCapabilityRegistry([
    {
      kind: "articulated-rig",
      requirementId: requirement.id,
      entityId: requirement.entityId,
    },
  ]);
  const directorProject = compileDirectorProject({
    storyProject: fixture.storyProject,
    planner: fixture.planner,
    capabilities: capabilityRegistry,
  });
  return { capabilityRegistry, directorProject, fixture };
};

const canonicalBuildHashes = (
  build: ReturnType<typeof compileKvp001PlayerBuild>,
) => ({
  source: build.fixture.storyProject.contentHash,
  capabilityRegistry: build.capabilityRegistry.contentHash,
  project: build.directorProject.contentHash,
  planning: build.directorProject.planningArtifact.contentHash,
  directorPlan: build.directorProject.directorPlan.contentHash,
  timing: build.directorProject.timingSolution.contentHash,
  continuity:
    build.directorProject.executableEpisodePlan.continuitySequencePlan
      .contentHash,
  episode: build.directorProject.executableEpisodePlan.contentHash,
});

/**
 * Builds KVP-001 from the same upstream fixture, compiler, bundled capability
 * registry, executable episode plan, and production composition used by the
 * render-worker proof. This module is only reached by kvp001-player.html and is
 * intentionally absent from the normal StoryStage application entry point.
 */
export function createKvp001PlayerEvidenceState(): Kvp001PlayerEvidenceState {
  const first = compileKvp001PlayerBuild();
  const repeated = compileKvp001PlayerBuild();
  if (
    JSON.stringify(canonicalBuildHashes(first)) !==
    JSON.stringify(canonicalBuildHashes(repeated))
  )
    throw new Error(
      "KVP-001 Player evidence canonical rebuild hashes do not match.",
    );
  const { capabilityRegistry, directorProject, fixture } = first;
  const proofShot = directorProject.executableEpisodePlan.shots[0];
  if (
    !proofShot ||
    proofShot.startFrame !== 0 ||
    proofShot.endFrameExclusive !== 140
  )
    throw new Error(
      "KVP-001 Player evidence did not compile its exact 140-frame shot.",
    );

  return {
    capabilityRegistry,
    project: fixture.storyProject,
    directorProject,
    workspace: createDirectorWorkspaceState(
      directorProject,
      fixture.storyProject.graph.scenes[0]!.beats[0]!.id,
    ),
    proofShot: {
      shotId: proofShot.directorShotId,
      startFrame: proofShot.startFrame,
      endFrameExclusive: proofShot.endFrameExclusive,
    },
  };
}

export function Kvp001PlayerEvidence() {
  const [{ capabilityRegistry, directorProject, project, proofShot }] =
    useState(createKvp001PlayerEvidenceState);
  const [workspace, setWorkspace] = useState<DirectorWorkspaceState | null>(
    () =>
      createDirectorWorkspaceState(
        directorProject,
        project.graph.scenes[0]!.beats[0]!.id,
      ),
  );

  return (
    <main className="kvp-player-evidence">
      <header className="kvp-player-evidence__header">
        <div>
          <small>Development evidence · not part of production UX</small>
          <h1>KVP-001 · canonical Player path</h1>
          <p>
            The real Director Player is mounted below with the sealed executable
            episode plan. No proof-specific renderer or playback control is
            used.
          </p>
        </div>
        <dl aria-label="KVP-001 evidence identifiers">
          <div>
            <dt>Episode</dt>
            <dd>
              {directorProject.executableEpisodePlan.contentHash.slice(0, 12)}
            </dd>
          </div>
          <div>
            <dt>Proof shot</dt>
            <dd>
              {proofShot.startFrame}–{proofShot.endFrameExclusive - 1} · 140f
            </dd>
          </div>
          <div>
            <dt>Shot ID</dt>
            <dd>{proofShot.shotId}</dd>
          </div>
        </dl>
      </header>

      <DirectorAnimaticPreview
        capabilityRegistry={capabilityRegistry}
        compileError={null}
        onWorkspaceChange={setWorkspace}
        project={project}
        workspace={workspace}
      />

      <footer className="kvp-player-evidence__limitation">
        <strong>Proof boundary</strong>
        <span>{KVP001_PROOF_LIMITATION}</span>
      </footer>
    </main>
  );
}
