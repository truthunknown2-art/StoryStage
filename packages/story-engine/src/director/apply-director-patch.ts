import { cv002ProjectSchema, type Cv002Project } from "../cv002-story-draft";
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
});

export function applyDirectorPatch(input: {
  storyProject: Cv002Project;
  baseDirectorProject: DirectorProject;
  patch: DirectorPatch;
}): DirectorProject {
  const storyProject = cv002ProjectSchema.parse(input.storyProject);
  const base = directorProjectSchema.parse(input.baseDirectorProject);
  const patch = directorPatchSchema.parse(input.patch);
  if (patch.baseDirectorProjectContentHash !== base.contentHash)
    throw new Error("Director patch is stale for the selected first cut.");
  if (base.storyProjectContentHash !== storyProject.contentHash)
    throw new Error(
      "Director patch story source does not match its first cut.",
    );

  const adjustments = base.planningArtifact.eventTimingAdjustments.map(
    (adjustment) => ({ ...adjustment }),
  );
  patch.operations.forEach((operation) => {
    const event = base.directorPlan.events.find(
      (candidate) => candidate.id === operation.eventId,
    );
    const shot = base.directorPlan.shots.find(
      (candidate) => candidate.id === operation.sourceShotId,
    );
    if (
      operation.kind !== "delay-event" ||
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
  });
  const next = compileDirectorProject({
    storyProject,
    planner: new FixedDirectorProposalPlanner(planningArtifact),
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
