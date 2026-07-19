import React from "react";
import { AbsoluteFill, Img } from "remotion";
import {
  characterRigPreparationRecipeSchema,
  hashCanonical,
  type CharacterRigPreparationRecipe,
} from "@storystage/story-engine";
import {
  candidateRigGapOrbitMeasurementReportSchema,
  validateCandidateRigPrivateRegistrationProposalBindings,
  type CandidateRigExactAttachmentMeasurementReport,
  type CandidateRigGapOrbitMeasurementReport,
  type CandidateRigUnapprovedRegistrationProposal,
} from "@storystage/story-engine/private-candidate-rig-registration";
import type { CandidateRigPrivateRegistrationComponentImage } from "@storystage/asset-pipeline/private-candidate-rig-registration";

export const CANDIDATE_RIG_PRIVATE_REGISTRATION_DIAGNOSTIC_ID =
  "CandidateRigPrivateRegistrationDiagnostic";

export const candidateRigPrivateRegistrationDiagnosticKinds = [
  "original",
  "masked",
  "seams",
  "rest",
  "zero",
  "minus-15",
  "plus-15",
  "gap-orbit",
  "z-order-near-far",
] as const;

export type CandidateRigPrivateRegistrationDiagnosticKind =
  (typeof candidateRigPrivateRegistrationDiagnosticKinds)[number];

export type CandidateRigPrivateRegistrationDiagnosticProps = {
  artifactKind: CandidateRigPrivateRegistrationDiagnosticKind;
  measurement: CandidateRigExactAttachmentMeasurementReport;
  proposal: CandidateRigUnapprovedRegistrationProposal;
  recipe: CharacterRigPreparationRecipe;
  componentImages: CandidateRigPrivateRegistrationComponentImage[];
  gapOrbitMeasurement: CandidateRigGapOrbitMeasurementReport;
};

type Matrix = [number, number, number, number, number, number];

const multiply = (left: Matrix, right: Matrix): Matrix => [
  left[0] * right[0] + left[2] * right[1],
  left[1] * right[0] + left[3] * right[1],
  left[0] * right[2] + left[2] * right[3],
  left[1] * right[2] + left[3] * right[3],
  left[0] * right[4] + left[2] * right[5] + left[4],
  left[1] * right[4] + left[3] * right[5] + left[5],
];

const localMatrix = (transform: {
  x: number;
  y: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
}): Matrix => {
  const radians = (transform.rotation * Math.PI) / 180;
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

const cssMatrix = (matrix: Matrix) => `matrix(${matrix.join(",")})`;

const parsedProps = (raw: CandidateRigPrivateRegistrationDiagnosticProps) => {
  if (
    !candidateRigPrivateRegistrationDiagnosticKinds.includes(raw.artifactKind)
  )
    throw new Error("Private registration diagnostic kind is invalid.");
  const recipe = characterRigPreparationRecipeSchema.parse(raw.recipe);
  const { measurement, proposal } =
    validateCandidateRigPrivateRegistrationProposalBindings(
      raw.measurement,
      raw.proposal,
    );
  const gapOrbitMeasurement = candidateRigGapOrbitMeasurementReportSchema.parse(
    raw.gapOrbitMeasurement,
  );
  if (
    gapOrbitMeasurement.view !== measurement.view ||
    gapOrbitMeasurement.measurementReportContentHash !==
      measurement.contentHash ||
    gapOrbitMeasurement.effectiveProposalContentHash !== proposal.contentHash ||
    gapOrbitMeasurement.motionArtifactIncluded !== false ||
    gapOrbitMeasurement.transformAuthority !== false ||
    gapOrbitMeasurement.productionBindable !== false ||
    hashCanonical(
      gapOrbitMeasurement.samples.map((sample) => sample.attachmentId).sort(),
    ) !==
      hashCanonical(
        proposal.attachments
          .map((attachment) => attachment.attachmentId)
          .sort(),
      )
  )
    throw new Error(
      "Private registration gap/orbit measurement lost exact static proposal lineage.",
    );
  if (
    recipe.view !== measurement.view ||
    recipe.contentHash !== measurement.lineage.preparationRecipeContentHash ||
    raw.componentImages.length !== recipe.parts.length
  )
    throw new Error(
      "Private registration diagnostic props do not share exact view, recipe, and component coverage.",
    );
  const imageById = new Map(
    raw.componentImages.map((image) => [image.componentId, image]),
  );
  const measuredByRole = new Map(
    measurement.components.map((component) => [
      component.semanticRole,
      component,
    ]),
  );
  if (
    imageById.size !== raw.componentImages.length ||
    recipe.parts.some((part) => {
      const image = imageById.get(part.id);
      const measured = measuredByRole.get(part.role);
      return (
        !image ||
        !measured ||
        image.semanticRole !== part.role ||
        image.sourceRgbaContentHash !== measured.sourceRgbaContentHash ||
        image.width !== part.output.width ||
        image.height !== part.output.height ||
        image.sourceMeasuredBeforeMasking !== true ||
        image.maskAuthority !== false ||
        image.transformAuthority !== false ||
        !/^data:image\/png;base64,[A-Za-z0-9+/]+=*$/.test(
          image.originalDataUrl,
        ) ||
        !/^data:image\/png;base64,[A-Za-z0-9+/]+=*$/.test(
          image.maskedDataUrl,
        ) ||
        (image.maskedPixelCount > 0
          ? !image.maskAuditRegion ||
            !image.maskAuditOriginalPngContentHash ||
            !image.maskAuditMaskedPngContentHash ||
            !image.maskAuditEvidencePngContentHash ||
            !image.maskAuditOriginalDataUrl ||
            !image.maskAuditMaskedDataUrl ||
            !image.maskAuditEvidenceDataUrl ||
            !/^data:image\/png;base64,[A-Za-z0-9+/]+=*$/.test(
              image.maskAuditOriginalDataUrl,
            ) ||
            !/^data:image\/png;base64,[A-Za-z0-9+/]+=*$/.test(
              image.maskAuditMaskedDataUrl,
            ) ||
            !/^data:image\/png;base64,[A-Za-z0-9+/]+=*$/.test(
              image.maskAuditEvidenceDataUrl,
            ) ||
            image.maskAuditOriginalPngContentHash ===
              image.maskAuditMaskedPngContentHash
          : image.maskAuditRegion !== null ||
            image.maskAuditOriginalPngContentHash !== null ||
            image.maskAuditMaskedPngContentHash !== null ||
            image.maskAuditEvidencePngContentHash !== null ||
            image.maskAuditOriginalDataUrl !== null ||
            image.maskAuditMaskedDataUrl !== null ||
            image.maskAuditEvidenceDataUrl !== null) ||
        image.maskedPixelCount > 0 !==
          (image.originalPngContentHash !== image.maskedPngContentHash)
      );
    }) ||
    raw.componentImages.every((image) => image.maskedPixelCount === 0)
  )
    throw new Error(
      "Private registration diagnostic component images were substituted.",
    );
  return {
    artifactKind: raw.artifactKind,
    measurement,
    proposal,
    recipe,
    imageById,
    gapOrbitMeasurement,
  };
};

const partMatrices = (
  recipe: CharacterRigPreparationRecipe,
  proposal: CandidateRigUnapprovedRegistrationProposal,
  angle: number,
  activeRole: string | null = null,
) => {
  const partById = new Map(recipe.parts.map((part) => [part.id, part]));
  const articulatedRoles = new Set(
    proposal.parts
      .filter((part) => part.transformMode === "articulated")
      .map((part) => part.role),
  );
  const matrices = new Map<string, Matrix>();
  const visit = (partId: string): Matrix => {
    const cached = matrices.get(partId);
    if (cached) return cached;
    const part = partById.get(partId);
    if (!part)
      throw new Error(`Private registration part ${partId} is unavailable.`);
    const rest = part.restTransform;
    const local = localMatrix({
      x: rest.x,
      y: rest.y,
      rotation:
        rest.rotation +
        (articulatedRoles.has(part.role) &&
        (activeRole === null || activeRole === part.role)
          ? angle
          : 0),
      scaleX: rest.scaleX,
      scaleY: rest.scaleY,
    });
    const world = part.parentId ? multiply(visit(part.parentId), local) : local;
    matrices.set(partId, world);
    return world;
  };
  for (const part of recipe.parts) visit(part.id);
  return matrices;
};

const stageMatrix = (
  recipe: CharacterRigPreparationRecipe,
  matrices: Map<string, Matrix>,
  options: {
    centerX?: number;
    centerY?: number;
    targetWidth?: number;
    targetHeight?: number;
    roles?: Set<string>;
  } = {},
): Matrix => {
  const selectedParts = options.roles
    ? recipe.parts.filter((part) => options.roles!.has(part.role))
    : recipe.parts;
  const points = selectedParts.flatMap((part) => {
    const matrix = matrices.get(part.id)!;
    const left = -part.childPivot.x;
    const top = -part.childPivot.y;
    return [
      transformPoint(matrix, { x: left, y: top }),
      transformPoint(matrix, { x: left + part.output.width, y: top }),
      transformPoint(matrix, { x: left, y: top + part.output.height }),
      transformPoint(matrix, {
        x: left + part.output.width,
        y: top + part.output.height,
      }),
    ];
  });
  const left = Math.min(...points.map((point) => point.x));
  const right = Math.max(...points.map((point) => point.x));
  const top = Math.min(...points.map((point) => point.y));
  const bottom = Math.max(...points.map((point) => point.y));
  const scale = Math.min(
    1.15,
    (options.targetWidth ?? 1380) / Math.max(1, right - left),
    (options.targetHeight ?? 760) / Math.max(1, bottom - top),
  );
  return [
    scale,
    0,
    0,
    scale,
    (options.centerX ?? 960) - ((left + right) / 2) * scale,
    (options.centerY ?? 548) - ((top + bottom) / 2) * scale,
  ];
};

const basisColor = {
  "mechanical-seam": "#59d38c",
  "guide-proposed": "#ffbd59",
  "shared-profile-coordinate": "#b895ff",
  "rigid-decoration": "#59a9ff",
} as const;

export const CandidateRigPrivateRegistrationDiagnostic: React.FC<
  CandidateRigPrivateRegistrationDiagnosticProps
> = (rawProps) => {
  const {
    artifactKind,
    measurement,
    proposal,
    recipe,
    imageById,
    gapOrbitMeasurement,
  } = parsedProps(rawProps);
  const angle =
    artifactKind === "minus-15" ? -15 : artifactKind === "plus-15" ? 15 : 0;
  const matrices = partMatrices(recipe, proposal, angle);
  const stage = stageMatrix(recipe, partMatrices(recipe, proposal, 0));
  const recipeByRole = new Map<
    string,
    CharacterRigPreparationRecipe["parts"][number]
  >(recipe.parts.map((part) => [part.role, part]));
  const orderedParts = [...recipe.parts].sort(
    (left, right) => left.zIndex - right.zIndex,
  );
  const showRegistration = artifactKind === "zero";
  const jointContactSheet =
    artifactKind === "minus-15" ||
    artifactKind === "plus-15" ||
    artifactKind === "gap-orbit";

  const proposalPoints = [
    ...proposal.parts.map((part) => ({
      id: part.childPivot.requirementId,
      role: part.role,
      point: part.childPivot.pointMicropixels,
      basis: part.childPivot.basis,
      kind: "child pivot",
    })),
    ...proposal.sockets.map((socket) => ({
      id: socket.position.requirementId,
      role: socket.parentRole,
      point: socket.position.pointMicropixels,
      basis: socket.position.basis,
      kind: `socket ${socket.socketId}`,
    })),
  ];
  const partByRole = new Map<
    string,
    CharacterRigPreparationRecipe["parts"][number]
  >(recipe.parts.map((part) => [part.role, part]));
  const socketByEdge = new Map(
    proposal.sockets.map((socket) => [
      `${socket.parentRole}:${socket.childRole}:${socket.socketId}`,
      socket,
    ]),
  );
  const gapByAttachment = new Map(
    gapOrbitMeasurement.samples.map((sample) => [sample.attachmentId, sample]),
  );
  const jointPanels = proposal.attachments
    .slice(0, 16)
    .map((attachment, index) => ({
      attachment,
      index,
      x: 56 + (index % 4) * 466,
      y: 156 + Math.floor(index / 4) * 204,
      width: 442,
      height: 184,
    }));
  const maskedImages = [...imageById.values()].filter(
    (image) => image.maskedPixelCount > 0,
  );
  const maskRows = Math.max(1, Math.ceil(maskedImages.length / 4));
  const maskPanelHeight = Math.floor(780 / maskRows) - 8;
  const seamEntries = measurement.components.flatMap((component) =>
    component.candidates.map((candidate) => ({
      candidate,
      semanticRole: component.semanticRole,
    })),
  );
  const seamRows = Math.max(1, Math.ceil(seamEntries.length / 3));
  const seamPanelHeight = Math.floor(780 / seamRows) - 6;
  const siblingsByParent = new Map<
    string,
    CandidateRigUnapprovedRegistrationProposal["attachments"]
  >();
  for (const attachment of proposal.attachments)
    siblingsByParent.set(attachment.parentRole, [
      ...(siblingsByParent.get(attachment.parentRole) ?? []),
      attachment,
    ]);
  const zOrderPairs = [...siblingsByParent.values()]
    .flatMap((siblings) =>
      siblings.slice(0, -1).map((left, index) => ({
        left,
        right: siblings[index + 1]!,
      })),
    )
    .slice(0, 6);
  const renderPartSet = (input: {
    keyPrefix: string;
    roles: Set<string>;
    matrices: Map<string, Matrix>;
    stage: Matrix;
    opacity?: number;
    zOverrides?: Map<string, number>;
  }) =>
    orderedParts
      .filter((part) => input.roles.has(part.role))
      .map((part) => {
        const image = imageById.get(part.id)!;
        return (
          <div
            key={`${input.keyPrefix}-${part.id}`}
            style={{
              left: 0,
              position: "absolute",
              top: 0,
              transform: cssMatrix(
                multiply(input.stage, input.matrices.get(part.id)!),
              ),
              transformOrigin: "0 0",
              zIndex: input.zOverrides?.get(part.role) ?? part.zIndex,
            }}
          >
            <Img
              src={image.originalDataUrl}
              style={{
                height: image.height,
                left: -part.childPivot.x,
                maxWidth: "none",
                opacity: input.opacity ?? 1,
                position: "absolute",
                top: -part.childPivot.y,
                width: image.width,
              }}
            />
          </div>
        );
      });

  return (
    <AbsoluteFill
      data-private-registration-diagnostic={artifactKind}
      style={{
        background:
          "radial-gradient(circle at 50% 42%, #fffdf7 0%, #eee7d8 64%, #d8cdbb 100%)",
        color: "#15383a",
        fontFamily: "Arial, sans-serif",
        overflow: "hidden",
      }}
    >
      {artifactKind === "z-order-near-far" ? (
        <AbsoluteFill
          style={{
            backgroundImage:
              "linear-gradient(rgba(34,90,91,.12) 2px, transparent 2px), linear-gradient(90deg, rgba(34,90,91,.12) 2px, transparent 2px)",
            backgroundSize: "72px 72px",
          }}
        />
      ) : null}
      {!jointContactSheet &&
      artifactKind !== "z-order-near-far" &&
      artifactKind !== "masked" &&
      artifactKind !== "seams"
        ? orderedParts.map((part) => {
            const image = imageById.get(part.id)!;
            const world = multiply(stage, matrices.get(part.id)!);
            return (
              <div
                data-private-registration-part={part.id}
                key={part.id}
                style={{
                  left: 0,
                  position: "absolute",
                  top: 0,
                  transform: cssMatrix(world),
                  transformOrigin: "0 0",
                  zIndex: part.zIndex,
                }}
              >
                <Img
                  src={image.originalDataUrl}
                  style={{
                    height: image.height,
                    left: -part.childPivot.x,
                    maxWidth: "none",
                    opacity: 1,
                    position: "absolute",
                    top: -part.childPivot.y,
                    width: image.width,
                  }}
                />
              </div>
            );
          })
        : null}
      {artifactKind === "masked"
        ? maskedImages.map((image, index) => {
            const x = 56 + (index % 4) * 466;
            const y = 150 + Math.floor(index / 4) * (maskPanelHeight + 8);
            const panelWidth = 442;
            const auditRegion = image.maskAuditRegion!;
            const cells = [
              {
                label: "measured original",
                src: image.maskAuditOriginalDataUrl!,
                hash: image.maskAuditOriginalPngContentHash!,
              },
              {
                label: "actual masked",
                src: image.maskAuditMaskedDataUrl!,
                hash: image.maskAuditMaskedPngContentHash!,
              },
              {
                label: "cleared pixels",
                src: image.maskAuditEvidenceDataUrl!,
                hash: image.maskAuditEvidencePngContentHash!,
              },
            ];
            return (
              <div
                key={`mask-${image.componentId}`}
                style={{
                  background: "rgba(255,255,255,.74)",
                  border: "2px solid rgba(34,90,91,.28)",
                  borderRadius: 12,
                  height: maskPanelHeight,
                  left: x,
                  position: "absolute",
                  top: y,
                  width: panelWidth,
                }}
              >
                <div
                  style={{
                    color: "#173b3d",
                    fontSize: 14,
                    fontWeight: 800,
                    left: 10,
                    position: "absolute",
                    right: 10,
                    top: 7,
                  }}
                >
                  {image.semanticRole} · {image.maskedPixelCount}px · crop (
                  {auditRegion.x},{auditRegion.y}) {auditRegion.width}×
                  {auditRegion.height}
                </div>
                {cells.map((cell, cellIndex) => (
                  <div
                    key={cell.label}
                    style={{
                      backgroundImage:
                        "linear-gradient(45deg,#e6e1d5 25%,transparent 25%),linear-gradient(-45deg,#e6e1d5 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#e6e1d5 75%),linear-gradient(-45deg,transparent 75%,#e6e1d5 75%)",
                      backgroundPosition: "0 0,0 5px,5px -5px,-5px 0px",
                      backgroundSize: "10px 10px",
                      border: "1px solid rgba(34,90,91,.28)",
                      bottom: 9,
                      left: 10 + cellIndex * 142,
                      position: "absolute",
                      top: 29,
                      width: 132,
                    }}
                  >
                    <Img
                      src={cell.src}
                      style={{
                        height: "calc(100% - 28px)",
                        imageRendering: "pixelated",
                        objectFit: "contain",
                        width: "100%",
                      }}
                    />
                    <div
                      style={{
                        background: "rgba(15,42,43,.88)",
                        bottom: 0,
                        color: "white",
                        fontFamily: "monospace",
                        fontSize: 9,
                        left: 0,
                        lineHeight: "12px",
                        padding: "2px 3px",
                        position: "absolute",
                        right: 0,
                        textAlign: "center",
                      }}
                    >
                      {cell.label} · {cell.hash.slice(0, 8)}
                    </div>
                  </div>
                ))}
              </div>
            );
          })
        : null}
      {jointContactSheet
        ? jointPanels.map((panel) => {
            const { attachment } = panel;
            const roles = new Set([
              attachment.parentRole,
              attachment.childRole,
            ]);
            const restMatrices = partMatrices(recipe, proposal, 0);
            const panelStage = stageMatrix(recipe, restMatrices, {
              centerX: panel.x + panel.width / 2,
              centerY: panel.y + panel.height / 2 + 12,
              targetWidth: panel.width - 36,
              targetHeight: panel.height - 54,
              roles,
            });
            const socket = socketByEdge.get(
              `${attachment.parentRole}:${attachment.childRole}:${attachment.socketId}`,
            );
            const parentPart = partByRole.get(attachment.parentRole);
            const socketPoint =
              socket && parentPart
                ? transformPoint(
                    multiply(panelStage, restMatrices.get(parentPart.id)!),
                    {
                      x:
                        socket.position.pointMicropixels.x / 1_000_000 +
                        parentPart.output.padding -
                        parentPart.childPivot.x,
                      y:
                        socket.position.pointMicropixels.y / 1_000_000 +
                        parentPart.output.padding -
                        parentPart.childPivot.y,
                    },
                  )
                : null;
            const activeMatrices = partMatrices(
              recipe,
              proposal,
              angle,
              attachment.childRole,
            );
            const gapSample = gapByAttachment.get(attachment.attachmentId);
            return (
              <React.Fragment
                key={`${artifactKind}-${attachment.attachmentId}`}
              >
                <div
                  style={{
                    background: "rgba(255,255,255,.66)",
                    border: "2px solid rgba(34,90,91,.28)",
                    borderRadius: 14,
                    height: panel.height,
                    left: panel.x,
                    position: "absolute",
                    top: panel.y,
                    width: panel.width,
                  }}
                />
                {artifactKind === "gap-orbit" ? (
                  <>
                    {renderPartSet({
                      keyPrefix: `${panel.index}-measured-rest`,
                      roles,
                      matrices: restMatrices,
                      stage: panelStage,
                    })}
                    {gapSample?.angles.map((sample, sampleIndex) => {
                      const parentPoint = transformPoint(panelStage, {
                        x: sample.parentSocketMicropixels.x / 1_000_000,
                        y: sample.parentSocketMicropixels.y / 1_000_000,
                      });
                      const childPoint = transformPoint(panelStage, {
                        x: sample.childPivotMicropixels.x / 1_000_000,
                        y: sample.childPivotMicropixels.y / 1_000_000,
                      });
                      const dx = childPoint.x - parentPoint.x;
                      const dy = childPoint.y - parentPoint.y;
                      const length = Math.hypot(dx, dy);
                      const rotation = (Math.atan2(dy, dx) * 180) / Math.PI;
                      const heatColor = {
                        pass: "#24a36a",
                        review: "#e4a11b",
                        fail: "#e45656",
                      }[sample.heat];
                      return (
                        <React.Fragment
                          key={`${attachment.attachmentId}-${sample.angleDegrees}`}
                        >
                          <div
                            style={{
                              background: heatColor,
                              height: 5,
                              left: parentPoint.x,
                              position: "absolute",
                              rotate: `${rotation}deg`,
                              top: parentPoint.y - 2,
                              transformOrigin: "0 50%",
                              width: Math.max(3, length),
                              zIndex: 20_010 + sampleIndex,
                            }}
                          />
                          <div
                            style={{
                              background: heatColor,
                              border: "2px solid white",
                              borderRadius: 999,
                              height: 14,
                              left: childPoint.x - 7,
                              position: "absolute",
                              top: childPoint.y - 7,
                              width: 14,
                              zIndex: 20_020 + sampleIndex,
                            }}
                          />
                          <div
                            style={{
                              background: heatColor,
                              borderRadius: 5,
                              color: "white",
                              fontFamily: "monospace",
                              fontSize: 11,
                              fontWeight: 800,
                              left: panel.x + 12 + sampleIndex * 137,
                              padding: "3px 5px",
                              position: "absolute",
                              top: panel.y + panel.height - 27,
                              zIndex: 30_001,
                            }}
                          >
                            {sample.angleDegrees > 0 ? "+" : ""}
                            {sample.angleDegrees}°{" "}
                            {(sample.gapMicropixels / 1_000_000).toFixed(2)}
                            px
                          </div>
                        </React.Fragment>
                      );
                    })}
                  </>
                ) : (
                  renderPartSet({
                    keyPrefix: `${panel.index}-${angle}`,
                    roles,
                    matrices: activeMatrices,
                    stage: panelStage,
                  })
                )}
                {socketPoint ? (
                  <div
                    style={{
                      background: basisColor[attachment.basis],
                      border: "3px solid white",
                      borderRadius: 999,
                      height: 16,
                      left: socketPoint.x - 8,
                      position: "absolute",
                      top: socketPoint.y - 8,
                      width: 16,
                      zIndex: 20_000,
                    }}
                  />
                ) : null}
                <div
                  style={{
                    color: "#173b3d",
                    fontSize: 15,
                    fontWeight: 800,
                    left: panel.x + 14,
                    lineHeight: "17px",
                    position: "absolute",
                    right: 14,
                    top: panel.y + 8,
                    zIndex: 30_000,
                  }}
                >
                  <div>
                    {attachment.parentRole} → {attachment.childRole}
                  </div>
                  <div style={{ color: "#8b3f23", fontFamily: "monospace" }}>
                    socket: {attachment.socketId}
                  </div>
                </div>
              </React.Fragment>
            );
          })
        : null}
      {artifactKind === "z-order-near-far"
        ? zOrderPairs.map((pair, index) => {
            const x = 60 + (index % 2) * 930;
            const y = 164 + Math.floor(index / 2) * 266;
            const width = 870;
            const height = 236;
            const roles = new Set([
              pair.left.parentRole,
              pair.left.childRole,
              pair.right.childRole,
            ]);
            const restMatrices = partMatrices(recipe, proposal, 0);
            const leftStage = stageMatrix(recipe, restMatrices, {
              centerX: x + width * 0.25,
              centerY: y + height * 0.57,
              targetWidth: width * 0.44,
              targetHeight: height * 0.64,
              roles,
            });
            const rightStage = stageMatrix(recipe, restMatrices, {
              centerX: x + width * 0.75,
              centerY: y + height * 0.57,
              targetWidth: width * 0.44,
              targetHeight: height * 0.64,
              roles,
            });
            const parentZ = partByRole.get(pair.left.parentRole)?.zIndex ?? 0;
            return (
              <React.Fragment
                key={`${pair.left.attachmentId}-${pair.right.attachmentId}`}
              >
                <div
                  style={{
                    background: "rgba(255,255,255,.7)",
                    border: "2px solid rgba(34,90,91,.3)",
                    borderRadius: 16,
                    height,
                    left: x,
                    position: "absolute",
                    top: y,
                    width,
                  }}
                />
                <div
                  style={{
                    background: "rgba(34,90,91,.14)",
                    height: height - 20,
                    left: x + width / 2 - 1,
                    position: "absolute",
                    top: y + 10,
                    width: 2,
                  }}
                />
                {renderPartSet({
                  keyPrefix: `${index}-left-near`,
                  roles,
                  matrices: restMatrices,
                  stage: leftStage,
                  zOverrides: new Map([
                    [pair.left.childRole, parentZ + 2],
                    [pair.right.childRole, parentZ - 2],
                  ]),
                })}
                {renderPartSet({
                  keyPrefix: `${index}-right-near`,
                  roles,
                  matrices: restMatrices,
                  stage: rightStage,
                  zOverrides: new Map([
                    [pair.left.childRole, parentZ - 2],
                    [pair.right.childRole, parentZ + 2],
                  ]),
                })}
                <div
                  style={{
                    color: "#173b3d",
                    fontSize: 19,
                    fontWeight: 800,
                    left: x + 16,
                    position: "absolute",
                    top: y + 12,
                    zIndex: 30_000,
                  }}
                >
                  {pair.left.parentRole}: {pair.left.childRole} near
                </div>
                <div
                  style={{
                    color: "#173b3d",
                    fontSize: 19,
                    fontWeight: 800,
                    left: x + width / 2 + 16,
                    position: "absolute",
                    top: y + 12,
                    zIndex: 30_000,
                  }}
                >
                  {pair.left.parentRole}: {pair.right.childRole} near
                </div>
              </React.Fragment>
            );
          })
        : null}
      {showRegistration
        ? proposalPoints.map((entry) => {
            const recipePart = recipeByRole.get(entry.role);
            if (!recipePart) return null;
            const localPoint = {
              x:
                entry.point.x / 1_000_000 +
                recipePart.output.padding -
                recipePart.childPivot.x,
              y:
                entry.point.y / 1_000_000 +
                recipePart.output.padding -
                recipePart.childPivot.y,
            };
            const point = transformPoint(
              multiply(stage, matrices.get(recipePart.id)!),
              localPoint,
            );
            return (
              <div
                data-private-registration-point={entry.id}
                key={`${entry.kind}-${entry.id}`}
                style={{
                  alignItems: "center",
                  background: basisColor[entry.basis],
                  border: "3px solid #fffdf7",
                  borderRadius: 999,
                  boxShadow: "0 2px 10px rgba(0,0,0,.28)",
                  display: "flex",
                  height: 24,
                  justifyContent: "center",
                  left: point.x - 12,
                  position: "absolute",
                  top: point.y - 12,
                  width: 24,
                  zIndex: 10_000,
                }}
              />
            );
          })
        : null}
      {artifactKind === "seams"
        ? seamEntries.map(({ candidate, semanticRole }, index) => {
            const recipePart = recipeByRole.get(semanticRole)!;
            const panelX = 48 + (index % 3) * 624;
            const panelY = 150 + Math.floor(index / 3) * (seamPanelHeight + 6);
            const restMatrices = partMatrices(recipe, proposal, 0);
            const panelStage = stageMatrix(recipe, restMatrices, {
              centerX: panelX + 84,
              centerY: panelY + seamPanelHeight / 2 + 5,
              targetWidth: 148,
              targetHeight: seamPanelHeight - 22,
              roles: new Set([semanticRole]),
            });
            const world = multiply(
              panelStage,
              restMatrices.get(recipePart.id)!,
            );
            const local = (point: { x: number; y: number }) => ({
              x:
                point.x / 1_000_000 +
                recipePart.output.padding -
                recipePart.childPivot.x,
              y:
                point.y / 1_000_000 +
                recipePart.output.padding -
                recipePart.childPivot.y,
            });
            const start = transformPoint(
              world,
              local(candidate.seam.startMicropixels),
            );
            const end = transformPoint(
              world,
              local(candidate.seam.endMicropixels),
            );
            const midpointLocal = local(candidate.seam.midpointMicropixels);
            const midpoint = transformPoint(world, midpointLocal);
            const normalEnd = transformPoint(world, {
              x:
                midpointLocal.x +
                (candidate.seam.outwardNormalMillionths.x / 1_000_000) * 34,
              y:
                midpointLocal.y +
                (candidate.seam.outwardNormalMillionths.y / 1_000_000) * 34,
            });
            const segmentDx = end.x - start.x;
            const segmentDy = end.y - start.y;
            const segmentLength = Math.hypot(segmentDx, segmentDy);
            const segmentAngle =
              (Math.atan2(segmentDy, segmentDx) * 180) / Math.PI;
            const normalDx = normalEnd.x - midpoint.x;
            const normalDy = normalEnd.y - midpoint.y;
            const normalLength = Math.hypot(normalDx, normalDy);
            const normalAngle =
              (Math.atan2(normalDy, normalDx) * 180) / Math.PI;
            const color =
              candidate.featureClass === "rigid-registration"
                ? "#59a9ff"
                : candidate.featureClass === "mask-only"
                  ? "#7d8585"
                  : "#59d38c";
            const coordinates = (point: { x: number; y: number }) =>
              `${(point.x / 1_000_000).toFixed(1)},${(
                point.y / 1_000_000
              ).toFixed(1)}`;
            return (
              <React.Fragment key={candidate.candidateId}>
                <div
                  style={{
                    background: "rgba(255,255,255,.75)",
                    border: "2px solid rgba(34,90,91,.28)",
                    borderRadius: 10,
                    height: seamPanelHeight,
                    left: panelX,
                    position: "absolute",
                    top: panelY,
                    width: 600,
                  }}
                />
                {renderPartSet({
                  keyPrefix: `seam-${index}`,
                  roles: new Set([semanticRole]),
                  matrices: restMatrices,
                  stage: panelStage,
                  opacity: 0.76,
                })}
                <div
                  style={{
                    background: color,
                    boxShadow: "0 0 0 2px white",
                    height: 6,
                    left: start.x,
                    position: "absolute",
                    rotate: `${segmentAngle}deg`,
                    top: start.y - 3,
                    transformOrigin: "0 50%",
                    width: segmentLength,
                    zIndex: 10_001,
                  }}
                />
                <div
                  style={{
                    background: "#e45656",
                    height: 4,
                    left: midpoint.x,
                    position: "absolute",
                    rotate: `${normalAngle}deg`,
                    top: midpoint.y - 2,
                    transformOrigin: "0 50%",
                    width: normalLength,
                    zIndex: 10_002,
                  }}
                />
                <div
                  style={{
                    background: color,
                    border: "3px solid white",
                    borderRadius: 999,
                    height: 18,
                    left: midpoint.x - 9,
                    position: "absolute",
                    top: midpoint.y - 9,
                    width: 18,
                    zIndex: 10_003,
                  }}
                />
                <div
                  style={{
                    background: "rgba(15,42,43,.86)",
                    borderRadius: 6,
                    color: "white",
                    fontSize: 11,
                    fontWeight: 800,
                    left: midpoint.x + 8,
                    padding: "2px 4px",
                    position: "absolute",
                    top: midpoint.y + 8,
                    zIndex: 10_004,
                  }}
                >
                  {candidate.seam.widthMicropixels}µpx
                </div>
                <div
                  style={{
                    color: "#173b3d",
                    fontFamily: "monospace",
                    fontSize: 10,
                    fontWeight: 800,
                    left: panelX + 174,
                    lineHeight: "13px",
                    position: "absolute",
                    right: 10,
                    top: panelY + 7,
                    zIndex: 20_000,
                  }}
                >
                  <div style={{ fontSize: 11 }}>{candidate.candidateId}</div>
                  <div>
                    {semanticRole} · {candidate.featureClass}
                  </div>
                  <div>
                    width {candidate.seam.widthMicropixels}µpx ={" "}
                    {(candidate.seam.widthMicropixels / 1_000_000).toFixed(1)}
                    px
                  </div>
                  <div>
                    seam {coordinates(candidate.seam.startMicropixels)} →{" "}
                    {coordinates(candidate.seam.endMicropixels)} · normal{" "}
                    {coordinates(candidate.seam.outwardNormalMillionths)}
                  </div>
                </div>
              </React.Fragment>
            );
          })
        : null}
      <div
        style={{
          alignItems: "center",
          background: "rgba(15,42,43,.93)",
          borderRadius: 18,
          color: "#fffaf0",
          display: "flex",
          fontSize: 34,
          fontWeight: 800,
          gap: 24,
          left: 64,
          letterSpacing: 1.5,
          padding: "18px 24px",
          position: "absolute",
          top: 52,
        }}
      >
        <span style={{ color: "#8ce3ba" }}>Candidate I</span>
        <span>{measurement.view}</span>
        <span style={{ color: "#ffbd59" }}>{artifactKind}</span>
      </div>
      <div
        style={{
          background: "rgba(119,28,28,.94)",
          borderRadius: 16,
          bottom: 52,
          color: "white",
          fontSize: 30,
          fontWeight: 800,
          left: 64,
          padding: "16px 22px",
          position: "absolute",
        }}
      >
        Unapproved registration proposal for human correction
      </div>
      <div
        style={{
          bottom: 64,
          color: "#315153",
          fontSize: 28,
          fontWeight: 700,
          position: "absolute",
          right: 64,
        }}
      >
        {proposal.unresolvedRequirements.length} unresolved · no motion · no
        export
      </div>
    </AbsoluteFill>
  );
};
