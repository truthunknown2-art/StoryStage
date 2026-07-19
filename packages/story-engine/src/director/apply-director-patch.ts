import { cv002ProjectSchema, type Cv002Project } from "../cv002-story-draft";
import {
  alphaCapabilityRegistry,
  capabilityRegistrySchema,
  type CapabilityRegistry,
} from "./capability-report";
import { compileDirectorProject } from "./director-compiler";
import { directorPatchSchema, type DirectorPatch } from "./director-patch";
import {
  directorProjectSchema,
  type DirectorProject,
} from "./director-project";
import {
  sealDirectorProposal,
  type DirectorPlanner,
  type DirectorProposal,
  type DirectorProposalDraft,
} from "./director-proposal";

class FixedDirectorProposalPlanner implements DirectorPlanner {
  constructor(private readonly artifact: DirectorProposal) {}

  propose(): DirectorProposalDraft {
    return proposalDraftFrom(this.artifact);
  }
}

const proposalDraftFrom = (
  artifact: DirectorProposal,
): DirectorProposalDraft => ({
  schemaVersion: artifact.schemaVersion,
  plannerId: artifact.plannerId,
  plannerVersion: artifact.plannerVersion,
  storyGraphContentHash: artifact.storyGraphContentHash,
  grammar: artifact.grammar,
  beatDirections: structuredClone(artifact.beatDirections),
  eventTimingAdjustments: structuredClone(artifact.eventTimingAdjustments),
  shotOverrides: structuredClone(artifact.shotOverrides),
});

export function applyDirectorPatch(input: {
  storyProject: Cv002Project;
  baseDirectorProject: DirectorProject;
  patch: DirectorPatch;
  capabilities?: CapabilityRegistry;
}): DirectorProject {
  const storyProject = cv002ProjectSchema.parse(input.storyProject);
  const base = directorProjectSchema.parse(input.baseDirectorProject);
  const patch = directorPatchSchema.parse(input.patch);
  const capabilityRegistry = capabilityRegistrySchema.parse(
    input.capabilities ?? alphaCapabilityRegistry,
  );
  if (patch.baseDirectorProjectContentHash !== base.contentHash)
    throw new Error("Director patch is stale for the selected first cut.");
  if (base.storyProjectContentHash !== storyProject.contentHash)
    throw new Error(
      "Director patch story source does not match its first cut.",
    );
  if (
    base.capabilityReport.registryContentHash !== capabilityRegistry.contentHash
  )
    throw new Error(
      "Director patch capability registry changed without an explicit migration artifact.",
    );

  const adjustments = base.planningArtifact.eventTimingAdjustments.map(
    (adjustment) => ({ ...adjustment }),
  );
  const shotOverrides = base.planningArtifact.shotOverrides.map((override) => ({
    ...override,
  }));
  patch.operations.forEach((operation) => {
    if (operation.kind !== "delay-event") {
      const shot = base.directorPlan.shots.find(
        (candidate) => candidate.id === operation.shotId,
      );
      if (!shot || !shot.beatIds.includes(operation.beatId))
        throw new Error(
          "Director visual patch is stale or targets a shot on another beat.",
        );
      if (
        (operation.kind === "set-shot-size" &&
          operation.shotSize === shot.camera.size) ||
        (operation.kind === "set-camera-movement" &&
          operation.movement === shot.camera.movement)
      )
        throw new Error("Director visual patch would not change the shot.");
      const existingIndex = shotOverrides.findIndex(
        (override) => override.shotId === shot.id,
      );
      const nextOverride = {
        beatId: operation.beatId,
        shotId: shot.id,
        shotSize:
          operation.kind === "set-shot-size"
            ? operation.shotSize
            : (shotOverrides[existingIndex]?.shotSize ?? null),
        cameraMovement:
          operation.kind === "set-camera-movement"
            ? operation.movement
            : (shotOverrides[existingIndex]?.cameraMovement ?? null),
        ...(shotOverrides[existingIndex]?.locomotion
          ? { locomotion: shotOverrides[existingIndex]!.locomotion }
          : {}),
      };
      if (existingIndex >= 0) shotOverrides[existingIndex] = nextOverride;
      else shotOverrides.push(nextOverride);
      return;
    }
    const event = base.directorPlan.events.find(
      (candidate) => candidate.id === operation.eventId,
    );
    const shot = base.directorPlan.shots.find(
      (candidate) => candidate.id === operation.sourceShotId,
    );
    if (
      !event ||
      event.kind !== "reaction" ||
      event.beatId !== operation.beatId ||
      !shot ||
      !shot.beatIds.includes(operation.beatId) ||
      ![
        shot.entryEventId,
        shot.exitEventId,
        shot.timingEnvelope.earliestCutEventId,
        shot.timingEnvelope.preferredCutEventId,
        shot.timingEnvelope.latestCutEventId,
      ].includes(operation.eventId)
    )
      throw new Error(
        "Director patch reaction event is stale or does not match its source shot.",
      );
    const existingIndex = adjustments.findIndex(
      (adjustment) =>
        adjustment.eventId === operation.eventId &&
        adjustment.sourceShotId === operation.sourceShotId,
    );
    const accumulatedFrames =
      (existingIndex >= 0 ? adjustments[existingIndex]!.frames : 0) +
      operation.frames;
    if (accumulatedFrames > 30)
      throw new Error("Accumulated reaction delay cannot exceed 30 frames.");
    const nextAdjustment = {
      beatId: operation.beatId,
      eventId: operation.eventId,
      sourceShotId: operation.sourceShotId,
      frames: accumulatedFrames,
    };
    if (existingIndex >= 0) adjustments[existingIndex] = nextAdjustment;
    else adjustments.push(nextAdjustment);
  });

  const baseProposalDraft = proposalDraftFrom(base.planningArtifact);
  const planningArtifact = sealDirectorProposal({
    ...baseProposalDraft,
    eventTimingAdjustments: adjustments,
    shotOverrides,
  });
  const next = compileDirectorProject({
    storyProject,
    planner: new FixedDirectorProposalPlanner(planningArtifact),
    capabilities: capabilityRegistry,
    revision: {
      baseDirectorProjectContentHash: base.contentHash,
      directorPatchContentHash: patch.contentHash,
    },
  });
  if (next.planningArtifact.contentHash !== planningArtifact.contentHash)
    throw new Error(
      "Director patch compile did not preserve its exact planning artifact.",
    );
  return next;
}
