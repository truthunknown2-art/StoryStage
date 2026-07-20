import {
  candidateRigReviewRegistrationPlanSchema,
  characterRigPreparationRecipeSchema,
  hashCanonical,
  kidsBipedV1TopologyTemplate,
} from "@storystage/story-engine";
import {
  candidateRigExactAttachmentMeasurementReportSchema,
  candidateRigUnapprovedRegistrationProposalSchema,
  validateCandidateRigPrivateRegistrationProposalBindings,
  type CandidateRigExactAttachmentMeasurementReport,
  type CandidateRigUnapprovedRegistrationProposal,
} from "@storystage/story-engine/private-candidate-rig-registration";

const MICRO = 1_000_000;

const maskContainsPoint = (
  mask: CandidateRigExactAttachmentMeasurementReport["components"][number]["plausibilityRegion"]["mask"],
  pointMicropixels: { x: number; y: number },
) => {
  const x = Math.floor(pointMicropixels.x / MICRO);
  const y = Math.floor(pointMicropixels.y / MICRO);
  return mask.runs.some(
    (run) => run.y === y && x >= run.x && x < run.x + run.length,
  );
};

/**
 * Converts an authority-false guide plan into a partial, unapproved proposal.
 * Exact mechanical seams win. Guide points are retained only when they already
 * fall inside the worker-derived hashed plausibility region; this compiler
 * never clamps or manufactures a nearby point.
 */
export const createCandidateRigUnapprovedRegistrationProposal = (input: {
  measurement: unknown;
  registrationPlan: unknown;
  recipe: unknown;
}): CandidateRigUnapprovedRegistrationProposal => {
  const measurement = candidateRigExactAttachmentMeasurementReportSchema.parse(
    input.measurement,
  );
  const registrationPlan = candidateRigReviewRegistrationPlanSchema.parse(
    input.registrationPlan,
  );
  const recipe = characterRigPreparationRecipeSchema.parse(input.recipe);
  if (
    registrationPlan.view !== measurement.view ||
    recipe.view !== measurement.view ||
    recipe.contentHash !== measurement.lineage.preparationRecipeContentHash
  )
    throw new Error(
      "Unapproved registration proposal inputs do not share exact view/recipe lineage.",
    );
  const componentByRole = new Map(
    measurement.components.map((component) => [
      component.semanticRole,
      component,
    ]),
  );
  const planByRole = new Map<string, (typeof registrationPlan.parts)[number]>(
    registrationPlan.parts.map((part) => [part.role, part]),
  );
  const recipeByRole = new Map<string, (typeof recipe.parts)[number]>(
    recipe.parts.map((part) => [part.role, part]),
  );
  const candidateById = new Map(
    measurement.components.flatMap((component) =>
      component.candidates.map(
        (candidate) => [candidate.candidateId, candidate] as const,
      ),
    ),
  );
  const parts: CandidateRigUnapprovedRegistrationProposal["parts"] = [];
  const sockets: CandidateRigUnapprovedRegistrationProposal["sockets"] = [];
  const maskOnlySupports: CandidateRigUnapprovedRegistrationProposal["maskOnlySupports"] =
    [];
  const unresolvedRequirements: CandidateRigUnapprovedRegistrationProposal["unresolvedRequirements"] =
    [];

  const unresolved = (
    requirement: CandidateRigExactAttachmentMeasurementReport["requirements"][number],
    reason: string,
  ) => {
    unresolvedRequirements.push({
      requirementId: requirement.requirementId,
      componentRole: requirement.componentRole,
      reason,
      displayBasis: "unresolved-blocked",
    });
  };
  const pointFor = (
    requirement: CandidateRigExactAttachmentMeasurementReport["requirements"][number],
    guidePoint: { x: number; y: number } | null,
    rigid: boolean,
  ) => {
    const component = componentByRole.get(requirement.componentRole);
    if (!component) return null;
    if (
      requirement.outcome.status === "detected" &&
      requirement.outcome.candidateIds.length === 1
    ) {
      const candidate = candidateById.get(requirement.outcome.candidateIds[0]!);
      if (!candidate) return null;
      return {
        requirementId: requirement.requirementId,
        pointMicropixels: candidate.seam.midpointMicropixels,
        basis: "mechanical-seam" as const,
        sourceFeatureIds: [candidate.candidateId],
        plausibilityRegionContentHash: component.plausibilityRegion.contentHash,
      };
    }
    if (!guidePoint) return null;
    const pointMicropixels = {
      x: Math.round(guidePoint.x * MICRO),
      y: Math.round(guidePoint.y * MICRO),
    };
    if (!maskContainsPoint(component.plausibilityRegion.mask, pointMicropixels))
      return null;
    return {
      requirementId: requirement.requirementId,
      pointMicropixels,
      basis: rigid
        ? ("rigid-decoration" as const)
        : ("guide-proposed" as const),
      sourceFeatureIds: [],
      plausibilityRegionContentHash: component.plausibilityRegion.contentHash,
    };
  };

  for (const requirement of measurement.requirements) {
    const planPart = planByRole.get(requirement.componentRole);
    const recipePart = recipeByRole.get(requirement.componentRole);
    if (requirement.featureClass === "mask-only") {
      if (requirement.outcome.status !== "detected") {
        unresolved(
          requirement,
          "Exact alpha cannot isolate this mask-only support; Preston correction or regenerated source is required.",
        );
        continue;
      }
      maskOnlySupports.push({
        componentRole: requirement.componentRole,
        requirementIds: [requirement.requirementId],
        sourceFeatureIds: [...requirement.outcome.candidateIds],
        plausibilityRegionContentHash: componentByRole.get(
          requirement.componentRole,
        )!.plausibilityRegion.contentHash,
        transformAuthority: false,
        runtimeNodeCreated: false,
        motionChannelCreated: false,
      });
      continue;
    }
    if (!planPart || !recipePart) {
      unresolved(
        requirement,
        "The guide plan has no corresponding source role.",
      );
      continue;
    }
    if (requirement.featureClass === "articulation-distal") {
      const socketId = requirement.topologyEdge?.socketId;
      const planSocket = socketId
        ? planPart.sockets.find((socket) => socket.id === socketId)
        : undefined;
      const proposed = pointFor(
        requirement,
        planSocket
          ? {
              x: planSocket.position.x - recipePart.output.padding,
              y: planSocket.position.y - recipePart.output.padding,
            }
          : null,
        false,
      );
      if (!proposed || !socketId || !requirement.topologyEdge) {
        unresolved(
          requirement,
          "The distal guide point is missing or leaves exact hashed parent support; it was not clamped.",
        );
        continue;
      }
      const childPlan = planByRole.get(requirement.topologyEdge.childRole);
      sockets.push({
        parentRole: requirement.componentRole,
        childRole: requirement.topologyEdge.childRole,
        socketId,
        motionChannelId: `${requirement.topologyEdge.childRole}-${socketId}`,
        position: proposed,
        zIndex: childPlan?.zIndex ?? planPart.zIndex,
        sharedPivotGroupId: null,
      });
      continue;
    }
    const rigid = requirement.featureClass === "rigid-registration";
    const proposed = pointFor(
      requirement,
      {
        x: planPart.childPivot.x - recipePart.output.padding,
        y: planPart.childPivot.y - recipePart.output.padding,
      },
      rigid,
    );
    if (!proposed) {
      unresolved(
        requirement,
        "The child guide point leaves exact hashed source support; it was not clamped.",
      );
      continue;
    }
    parts.push({
      role: requirement.componentRole,
      childPivot: proposed,
      zIndex: planPart.zIndex,
      transformMode: rigid
        ? "translation-only-inherit-rotation-scale"
        : "articulated",
    });
  }

  const partByRole = new Map(parts.map((part) => [part.role, part]));
  const socketByKey = new Map(
    sockets.map((socket) => [
      `${socket.parentRole}:${socket.socketId}`,
      socket,
    ]),
  );
  const attachments: CandidateRigUnapprovedRegistrationProposal["attachments"] =
    [];
  for (const topology of kidsBipedV1TopologyTemplate.parts) {
    if (!topology.parentRole || !topology.parentSocketId) continue;
    const part = partByRole.get(topology.role);
    const socket = socketByKey.get(
      `${topology.parentRole}:${topology.parentSocketId}`,
    );
    if (!part || !socket || part.transformMode !== "articulated") continue;
    const basis =
      part.childPivot.basis === "mechanical-seam" &&
      socket.position.basis === "mechanical-seam"
        ? ("mechanical-seam" as const)
        : ("guide-proposed" as const);
    attachments.push({
      attachmentId: `${measurement.view}-${topology.parentRole}-${topology.role}`,
      parentRole: topology.parentRole,
      childRole: topology.role,
      socketId: topology.parentSocketId,
      attachmentClass: "articulation-proximal",
      basis,
    });
  }
  const draft = {
    schemaVersion: "1.0" as const,
    artifactKind: "candidate-rig-unapproved-registration-proposal" as const,
    authorityDomain: "private-source-review-registration" as const,
    proposalId: `candidate-i-${measurement.view}-unapproved-registration`,
    view: measurement.view,
    measurementReportContentHash: measurement.contentHash,
    guideProposalInputContentHash: registrationPlan.contentHash,
    guideCoordinatesAuthority: false as const,
    warningLabel:
      "Unapproved registration proposal for human correction" as const,
    parts: parts.sort((left, right) => left.role.localeCompare(right.role)),
    sockets: sockets.sort((left, right) =>
      `${left.parentRole}:${left.socketId}`.localeCompare(
        `${right.parentRole}:${right.socketId}`,
      ),
    ),
    attachments: attachments.sort((left, right) =>
      left.attachmentId.localeCompare(right.attachmentId),
    ),
    sharedPivotGroups: [],
    maskOnlySupports: maskOnlySupports.sort((left, right) =>
      left.componentRole.localeCompare(right.componentRole),
    ),
    attachmentClassDecisions: [],
    unresolvedRequirements: unresolvedRequirements.sort((left, right) =>
      left.requirementId.localeCompare(right.requirementId),
    ),
    proposalStatus:
      unresolvedRequirements.length === 0
        ? ("complete-unapproved" as const)
        : ("unresolved-unapproved" as const),
    reviewState: "unapproved" as const,
    providerAuthority: false as const,
    approvalAuthority: false as const,
    capabilityAuthority: false as const,
    productionBindable: false as const,
  };
  const proposal = candidateRigUnapprovedRegistrationProposalSchema.parse({
    ...draft,
    contentHash: hashCanonical(draft),
  });
  validateCandidateRigPrivateRegistrationProposalBindings(
    measurement,
    proposal,
  );
  return proposal;
};
