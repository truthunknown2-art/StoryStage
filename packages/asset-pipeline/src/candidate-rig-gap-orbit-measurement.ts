import {
  characterRigPreparationRecipeSchema,
  hashCanonical,
  type CharacterRigPreparationRecipe,
} from "@storystage/story-engine";
import {
  candidateRigGapOrbitMeasurementReportSchema,
  validateCandidateRigPrivateRegistrationProposalBindings,
  type CandidateRigGapOrbitMeasurementReport,
} from "@storystage/story-engine/private-candidate-rig-registration";

type Matrix = [number, number, number, number, number, number];
const MICRO = 1_000_000;

const multiply = (left: Matrix, right: Matrix): Matrix => [
  left[0] * right[0] + left[2] * right[1],
  left[1] * right[0] + left[3] * right[1],
  left[0] * right[2] + left[2] * right[3],
  left[1] * right[2] + left[3] * right[3],
  left[0] * right[4] + left[2] * right[5] + left[4],
  left[1] * right[4] + left[3] * right[5] + left[5],
];

const localMatrix = (
  transform: CharacterRigPreparationRecipe["parts"][number]["restTransform"],
  extraRotation: number,
): Matrix => {
  const radians = ((transform.rotation + extraRotation) * Math.PI) / 180;
  const cosine = Math.cos(radians);
  const sine = Math.sin(radians);
  return [
    cosine * transform.scaleX,
    sine * transform.scaleX,
    -sine * transform.scaleY,
    cosine * transform.scaleY,
    transform.x,
    transform.y,
  ];
};

const transformPoint = (matrix: Matrix, point: { x: number; y: number }) => ({
  x: matrix[0] * point.x + matrix[2] * point.y + matrix[4],
  y: matrix[1] * point.x + matrix[3] * point.y + matrix[5],
});

const matricesFor = (
  recipe: CharacterRigPreparationRecipe,
  activeRole: string,
  angleDegrees: -15 | 0 | 15,
) => {
  const partById = new Map(recipe.parts.map((part) => [part.id, part]));
  const matrices = new Map<string, Matrix>();
  const visit = (partId: string): Matrix => {
    const cached = matrices.get(partId);
    if (cached) return cached;
    const part = partById.get(partId);
    if (!part) throw new Error(`Gap/orbit part ${partId} is unavailable.`);
    const local = localMatrix(
      part.restTransform,
      part.role === activeRole ? angleDegrees : 0,
    );
    const world = part.parentId ? multiply(visit(part.parentId), local) : local;
    matrices.set(partId, world);
    return world;
  };
  for (const part of recipe.parts) visit(part.id);
  return matrices;
};

const localRegistrationPoint = (
  part: CharacterRigPreparationRecipe["parts"][number],
  pointMicropixels: { x: number; y: number },
) => ({
  x: pointMicropixels.x / MICRO + part.output.padding - part.childPivot.x,
  y: pointMicropixels.y / MICRO + part.output.padding - part.childPivot.y,
});

export const createCandidateRigGapOrbitMeasurementReport = (input: {
  measurement: unknown;
  proposal: unknown;
  recipe: unknown;
}): CandidateRigGapOrbitMeasurementReport => {
  const { measurement, proposal } =
    validateCandidateRigPrivateRegistrationProposalBindings(
      input.measurement,
      input.proposal,
    );
  const recipe = characterRigPreparationRecipeSchema.parse(input.recipe);
  if (
    recipe.view !== measurement.view ||
    recipe.contentHash !== measurement.lineage.preparationRecipeContentHash
  )
    throw new Error(
      "Gap/orbit measurement requires the exact native-view preparation recipe.",
    );
  const partByRole = new Map<string, (typeof recipe.parts)[number]>(
    recipe.parts.map((part) => [part.role, part]),
  );
  const socketByEdge = new Map(
    proposal.sockets.map((socket) => [
      `${socket.parentRole}:${socket.childRole}:${socket.socketId}`,
      socket,
    ]),
  );
  const childPivotByRole = new Map(
    proposal.parts.map((part) => [part.role, part.childPivot]),
  );
  const samples: CandidateRigGapOrbitMeasurementReport["samples"] =
    proposal.attachments.map((attachment) => {
      const parentPart = partByRole.get(attachment.parentRole);
      const childPart = partByRole.get(attachment.childRole);
      const socket = socketByEdge.get(
        `${attachment.parentRole}:${attachment.childRole}:${attachment.socketId}`,
      );
      const childPivot = childPivotByRole.get(attachment.childRole);
      if (!parentPart || !childPart || !socket || !childPivot)
        throw new Error(
          `Gap/orbit attachment ${attachment.attachmentId} lost exact point lineage.`,
        );
      return {
        attachmentId: attachment.attachmentId,
        parentRole: attachment.parentRole,
        childRole: attachment.childRole,
        socketId: attachment.socketId,
        angles: ([-15, 0, 15] as const).map((angleDegrees) => {
          const matrices = matricesFor(
            recipe,
            attachment.childRole,
            angleDegrees,
          );
          const parentSocket = transformPoint(
            matrices.get(parentPart.id)!,
            localRegistrationPoint(
              parentPart,
              socket.position.pointMicropixels,
            ),
          );
          const childPivotPoint = transformPoint(
            matrices.get(childPart.id)!,
            localRegistrationPoint(childPart, childPivot.pointMicropixels),
          );
          const gap = Math.hypot(
            childPivotPoint.x - parentSocket.x,
            childPivotPoint.y - parentSocket.y,
          );
          return {
            angleDegrees,
            parentSocketMicropixels: {
              x: Math.round(parentSocket.x * MICRO),
              y: Math.round(parentSocket.y * MICRO),
            },
            childPivotMicropixels: {
              x: Math.round(childPivotPoint.x * MICRO),
              y: Math.round(childPivotPoint.y * MICRO),
            },
            gapMicropixels: Math.round(gap * MICRO),
            heat:
              gap <= 0.5
                ? ("pass" as const)
                : gap <= 4
                  ? ("review" as const)
                  : ("fail" as const),
          };
        }),
      };
    });
  const draft = {
    schemaVersion: "1.0" as const,
    artifactKind: "candidate-rig-gap-orbit-measurement-report" as const,
    authorityDomain: "private-source-review-registration" as const,
    view: measurement.view,
    measurementReportContentHash: measurement.contentHash,
    effectiveProposalContentHash: proposal.contentHash,
    samples,
    numericMeasurementOnly: true as const,
    motionArtifactIncluded: false as const,
    transformAuthority: false as const,
    productionBindable: false as const,
  };
  return candidateRigGapOrbitMeasurementReportSchema.parse({
    ...draft,
    contentHash: hashCanonical(draft),
  });
};
