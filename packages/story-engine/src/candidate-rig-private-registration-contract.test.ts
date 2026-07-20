import { describe, expect, it } from "vitest";
import { hashCanonical } from "./canonical-hash";
import { kidsBipedV1TopologyTemplate } from "./character-rig-acquisition";
import {
  applyCandidateRigRegistrationCorrectionPatchChain,
  candidateRigAllViewStaticGateOneBundleSchema,
  candidateRigExactAttachmentMeasurementReportSchema,
  candidateRigPrivateRegistrationDiagnosticReceiptSchema,
  candidateRigRegistrationCorrectionPatchSchema,
  candidateRigStaticGateOneDecisionSchema,
  candidateRigUnapprovedRegistrationProposalSchema,
  validateCandidateRigStaticGateOneBindings,
} from "./candidate-rig-private-registration-contract";

const hash = (character: string) => character.repeat(64);
const withHash = <Value extends Record<string, unknown>>(draft: Value) => ({
  ...draft,
  contentHash: hashCanonical(draft),
});

const mask = (width: number, height: number, pixels: number[]) => {
  const ordered = [...new Set(pixels)].sort((left, right) => left - right);
  const runs: Array<{ y: number; x: number; length: number }> = [];
  for (const pixel of ordered) {
    const y = Math.floor(pixel / width);
    const x = pixel % width;
    const previous = runs.at(-1);
    if (previous && previous.y === y && previous.x + previous.length === x)
      previous.length += 1;
    else runs.push({ y, x, length: 1 });
  }
  const xs = ordered.map((pixel) => pixel % width);
  const ys = ordered.map((pixel) => Math.floor(pixel / width));
  const bounds =
    ordered.length === 0
      ? null
      : {
          x: Math.min(...xs),
          y: Math.min(...ys),
          width: Math.max(...xs) - Math.min(...xs) + 1,
          height: Math.max(...ys) - Math.min(...ys) + 1,
        };
  return {
    width,
    height,
    runs,
    runLengthEncodingContentHash: hashCanonical(runs),
    pixelCount: ordered.length,
    bounds,
  };
};

const dilate = (source: ReturnType<typeof mask>, radius: number) => {
  const pixels: number[] = [];
  for (const run of source.runs)
    for (let sourceX = run.x; sourceX < run.x + run.length; sourceX += 1)
      for (
        let y = Math.max(0, run.y - radius);
        y <= Math.min(source.height - 1, run.y + radius);
        y += 1
      )
        for (
          let x = Math.max(0, sourceX - radius);
          x <= Math.min(source.width - 1, sourceX + radius);
          x += 1
        )
          pixels.push(y * source.width + x);
  return mask(source.width, source.height, pixels);
};

const component = (semanticRole: string, seed: string) => {
  const supportMask = mask(10, 10, [5 * 10 + 5]);
  const regionMask = dilate(supportMask, 4);
  const regionDraft = {
    algorithm: {
      id: "support-mask-chebyshev-dilation" as const,
      version: "1.0.0" as const,
      radiusPixels: 4,
    },
    sourceSupportRunLengthEncodingContentHash:
      supportMask.runLengthEncodingContentHash,
    mask: regionMask,
  };
  return {
    componentId: `component-${semanticRole}`,
    semanticRole,
    sourceCandidateId: `candidate-${semanticRole}`,
    sourceContentHash: hash(seed),
    sourceRgbaContentHash: hash(seed === "a" ? "b" : "c"),
    sourceRect: { x: 0, y: 0, width: 10, height: 10 },
    supportMask,
    coreMask: mask(10, 10, [0]),
    plausibilityRegion: {
      ...regionDraft,
      contentHash: hashCanonical(regionDraft),
    },
    candidates: [],
    rejectedCandidateReasons: [],
  };
};

const fixture = (
  view: "front" | "profile-left" | "profile-right" = "front",
) => {
  const requirements = [
    {
      requirementId: "hand-left-proximal",
      featureClass: "articulation-proximal" as const,
      componentRole: "hand-left",
      topologyEdge: {
        parentRole: "lower-arm-left",
        childRole: "hand-left",
        socketId: "wrist-left",
      },
      outcome: {
        status: "missing" as const,
        reasonCode: "missing-feature" as const,
        detail: "No exact proximal tab is visible.",
      },
    },
    {
      requirementId: "lower-arm-left-distal",
      featureClass: "articulation-distal" as const,
      componentRole: "lower-arm-left",
      topologyEdge: {
        parentRole: "lower-arm-left",
        childRole: "hand-left",
        socketId: "wrist-left",
      },
      outcome: {
        status: "missing" as const,
        reasonCode: "missing-feature" as const,
        detail: "No exact distal socket tab is visible.",
      },
    },
  ];
  const measurementDraft = {
    schemaVersion: "1.0" as const,
    reportKind: "candidate-rig-exact-attachment-measurement" as const,
    authorityDomain: "private-source-review-registration" as const,
    reportId: `measurement-${view}`,
    view,
    status: "blocked-source-geometry" as const,
    lineage: {
      requestContentHash: hash("1"),
      candidateBundleContentHash: hash("2"),
      stagingReportContentHash: hash("3"),
      importReceiptContentHash: hash("4"),
      preparationRecipeContentHash: hash("5"),
      topologyTemplateContentHash: kidsBipedV1TopologyTemplate.contentHash,
    },
    atlases: [
      {
        kind: "parts-kit" as const,
        candidateId: `parts-${view}`,
        sourceContentHash: hash("6"),
        sourceRgbaContentHash: hash("7"),
        width: 10,
        height: 10,
        channels: 4 as const,
        decodedWithoutResampling: true as const,
      },
      {
        kind: "face-kit" as const,
        candidateId: `face-${view}`,
        sourceContentHash: hash("8"),
        sourceRgbaContentHash: hash("9"),
        width: 10,
        height: 10,
        channels: 4 as const,
        decodedWithoutResampling: true as const,
      },
    ],
    algorithm: {
      id: "exact-alpha-edge-seam-measurement" as const,
      version: "1.0.0" as const,
      implementationContentHash: hash("a"),
      classificationContractContentHash: hash("b"),
      decoderContractContentHash: hash("c"),
    },
    components: [component("hand-left", "d"), component("lower-arm-left", "e")],
    requirements,
    blockerRequirementIds: requirements
      .map((requirement) => requirement.requirementId)
      .sort(),
    sourceMeasuredBeforeMasking: true as const,
    guideCoordinatesUsedForMeasurement: false as const,
    proposedRegistrationAuthority: false as const,
    approvalAuthority: false as const,
    capabilityAuthority: false as const,
    productionBindable: false as const,
  };
  const measurement = candidateRigExactAttachmentMeasurementReportSchema.parse(
    withHash(measurementDraft),
  );
  const proposalDraft = {
    schemaVersion: "1.0" as const,
    artifactKind: "candidate-rig-unapproved-registration-proposal" as const,
    authorityDomain: "private-source-review-registration" as const,
    proposalId: `proposal-${view}`,
    view,
    measurementReportContentHash: measurement.contentHash,
    guideProposalInputContentHash: hash("d"),
    guideCoordinatesAuthority: false as const,
    warningLabel:
      "Unapproved registration proposal for human correction" as const,
    parts: [],
    sockets: [],
    attachments: [],
    sharedPivotGroups: [],
    maskOnlySupports: [],
    attachmentClassDecisions: [],
    unresolvedRequirements: requirements.map((requirement) => ({
      requirementId: requirement.requirementId,
      componentRole: requirement.componentRole,
      reason: "Preston must place the invisible joint.",
      displayBasis: "unresolved-blocked" as const,
    })),
    proposalStatus: "unresolved-unapproved" as const,
    reviewState: "unapproved" as const,
    providerAuthority: false as const,
    approvalAuthority: false as const,
    capabilityAuthority: false as const,
    productionBindable: false as const,
  };
  const proposal = candidateRigUnapprovedRegistrationProposalSchema.parse(
    withHash(proposalDraft),
  );
  return { measurement, proposal };
};

const artifacts = () =>
  (
    [
      "original",
      "masked",
      "seams",
      "rest",
      "zero",
      "minus-15",
      "plus-15",
      "gap-orbit",
      "z-order-near-far",
    ] as const
  ).map((artifactKind, index) => ({
    artifactKind,
    relativeFile: `${artifactKind}.png`,
    sha256: hash((index % 10).toString()),
    byteLength: 100 + index,
    mediaType: "image/png" as const,
    width: 1920,
    height: 1080,
  }));

const diagnostic = (
  measurementHash: string,
  baseProposalHash: string,
  effectiveProposalHash: string,
  patchHash: string | null,
  view: "front" | "profile-left" | "profile-right" = "front",
) => {
  const boundBehavioralSourceFiles = (
    [
      "orchestrator",
      "entry-point",
      "composition",
      "gap-orbit-measurement",
      "exact-measurement",
      "mask-derivation",
      "proposal-compiler",
      "review-input",
      "review-raster",
      "review-recipes",
      "registration-guides",
      "registration-contract",
      "registration-schema",
      "preparation-schema",
      "topology-template",
      "canonical-hash",
    ] as const
  ).map((role, index) => ({
    role,
    workspaceRelativeFile: `private/${role}.ts`,
    sha256: hash(((index + 1) % 10).toString()),
  }));
  const jointDerivationEvidence = withHash({
    schemaVersion: "1.0" as const,
    artifactKind: "candidate-rig-joint-derivation-evidence" as const,
    candidateId: "candidate-mask-audit-joint",
    componentId: "component-mask-audit",
    semanticRole: "upper-arm-left",
    sourceRgbaContentHash: hash("a"),
    physicalFeatureContentHash: hash("1"),
    candidateMeasurementContentHash: hash("2"),
    measurementReportContentHash: measurementHash,
    effectiveProposalContentHash: effectiveProposalHash,
    auditRegion: { x: 1, y: 2, width: 8, height: 9 },
    componentOutputPadding: 2,
    selectedSupportRunLengthEncodingContentHash: hash("3"),
    selectedSupportPixelCount: 12,
    requirementIds: ["requirement-upper-arm-left-mechanical-seam"],
    proposalReferenceIds: [] as string[],
    proposalReferenceState: "unreferenced" as const,
    originalPngContentHash: hash("6"),
    maskedPngContentHash: hash("5"),
    auditEvidencePngContentHash: hash("4"),
    sourceMeasuredBeforeMasking: true as const,
    maskAuthority: false as const,
    transformAuthority: false as const,
    productionBindable: false as const,
  });
  const draft = {
    schemaVersion: "1.0" as const,
    receiptKind: "candidate-rig-private-registration-diagnostic" as const,
    authorityDomain: "private-source-review-registration" as const,
    receiptId: `diagnostic-${effectiveProposalHash.slice(0, 8)}`,
    view,
    measurementReportContentHash: measurementHash,
    baseProposalContentHash: baseProposalHash,
    effectiveProposalContentHash: effectiveProposalHash,
    correctionPatchContentHash: patchHash,
    warningLabel:
      "Unapproved registration proposal for human correction" as const,
    legendColors: {
      "mechanical-seam": "green" as const,
      "guide-proposed": "amber" as const,
      "shared-profile-coordinate": "purple" as const,
      "rigid-decoration": "blue" as const,
      "mask-only": "gray" as const,
      "unresolved-blocked": "red" as const,
    },
    maskDerivationEvidence: [
      {
        componentId: "component-mask-audit",
        semanticRole: "upper-arm-left",
        sourceRgbaContentHash: hash("a"),
        originalPngContentHash: hash("b"),
        maskedPngContentHash: hash("c"),
        maskRunLengthEncodingContentHash: hash("d"),
        maskedPixelCount: 12,
        auditRegion: { x: 1, y: 2, width: 8, height: 9 },
        auditOriginalPngContentHash: hash("e"),
        auditMaskedPngContentHash: hash("f"),
        auditEvidencePngContentHash: hash("9"),
        sourceMeasuredBeforeMasking: true as const,
        maskAuthority: false as const,
        transformAuthority: false as const,
      },
    ],
    jointDerivationEvidence: [jointDerivationEvidence],
    packetEvidence: {
      gapOrbitMeasurementReportContentHash: hash("8"),
      files: [
        ...(
          [
            "measurement-report",
            "base-proposal",
            "effective-proposal",
            "correction-patch-chain",
            "gap-orbit-measurements",
          ] as const
        ).map((evidenceKind, index) => ({
          evidenceKind,
          componentId: null,
          candidateId: null,
          relativeFile: `packet/${evidenceKind}.json`,
          sha256: hash(((index + 1) % 10).toString()),
          byteLength: 100 + index,
          mediaType: "application/json" as const,
        })),
        ...(
          [
            ["component-original", "b"],
            ["component-masked", "c"],
            ["component-mask-runs", "7"],
            ["component-audit-original", "e"],
            ["component-audit-masked", "f"],
            ["component-audit-evidence", "9"],
          ] as const
        ).map(([evidenceKind, seed], index) => ({
          evidenceKind,
          componentId: "component-mask-audit",
          candidateId: null,
          relativeFile: `packet/components/component-mask-audit/${evidenceKind}.png`,
          sha256: hash(seed),
          byteLength: 200 + index,
          mediaType:
            evidenceKind === "component-mask-runs"
              ? ("application/json" as const)
              : ("image/png" as const),
        })),
        ...(
          [
            ["joint-original-crop", "original.png", "6", "image/png"],
            ["joint-masked-crop", "masked.png", "5", "image/png"],
            [
              "joint-selected-support-runs",
              "selected-support.json",
              "3",
              "application/json",
            ],
            [
              "joint-audit-evidence",
              "audit-cleared-pixels.png",
              "4",
              "image/png",
            ],
            [
              "joint-evidence-record",
              "evidence-record.json",
              "2",
              "application/json",
            ],
          ] as const
        ).map(([evidenceKind, fileName, seed, mediaType], index) => ({
          evidenceKind,
          componentId: "component-mask-audit",
          candidateId: "candidate-mask-audit-joint",
          relativeFile: `packet/joint-evidence/candidate-mask-audit-joint/${fileName}`,
          sha256: hash(seed),
          byteLength: 300 + index,
          mediaType,
        })),
      ],
    },
    artifacts: artifacts(),
    boundBehavioralSources: {
      claim:
        "enumerated-local-behavioral-inputs-not-transitive-closure" as const,
      files: boundBehavioralSourceFiles,
      contentHash: hashCanonical(boundBehavioralSourceFiles),
    },
    toolchain: {
      renderer: "remotion" as const,
      remotionVersion: "4.0.490" as const,
      sharpVersion: "0.34.5" as const,
    },
    completedAt: "2026-07-19T20:00:00.000Z",
    motionArtifactIncluded: false as const,
    compactDiagnosticOnly: true as const,
    ordinaryPlayerReachable: false as const,
    exportReachable: false as const,
    preparationAuthority: false as const,
    approvalAuthority: false as const,
    capabilityAuthority: false as const,
    productionBindable: false as const,
  };
  return candidateRigPrivateRegistrationDiagnosticReceiptSchema.parse(
    withHash(draft),
  );
};

const correctionPatch = (
  measurement: ReturnType<typeof fixture>["measurement"],
  proposal: ReturnType<typeof fixture>["proposal"],
  sourceDiagnosticHash: string,
) => {
  const regionByRole = new Map(
    measurement.components.map((entry) => [
      entry.semanticRole,
      entry.plausibilityRegion.contentHash,
    ]),
  );
  const draft = {
    schemaVersion: "1.0" as const,
    artifactKind: "candidate-rig-registration-correction-patch" as const,
    authorityDomain: "private-source-review-registration" as const,
    patchId: "preston-correction-1",
    reviewSessionId: "preston-session-1",
    baseProposalContentHash: proposal.contentHash,
    expectedTargetRevisionContentHash: proposal.contentHash,
    previousPatchContentHash: null,
    revision: 1,
    sourceDiagnosticReceiptContentHash: sourceDiagnosticHash,
    reviewer: "preston" as const,
    reason: "Place the unresolved wrist pivot and matching parent socket.",
    createdAt: "2026-07-19T20:00:00.000Z",
    operations: [
      {
        op: "set-child-pivot" as const,
        requirementId: "hand-left-proximal",
        role: "hand-left",
        pointMicropixels: { x: 5_000_000, y: 5_000_000 },
        basis: "guide-proposed" as const,
        sourceFeatureIds: [],
        plausibilityRegionContentHash: regionByRole.get("hand-left")!,
        zIndex: 10,
        transformMode: "articulated" as const,
      },
      {
        op: "set-parent-socket" as const,
        requirementId: "lower-arm-left-distal",
        parentRole: "lower-arm-left",
        childRole: "hand-left",
        socketId: "wrist-left",
        motionChannelId: "hand-left-wrist-left",
        zIndex: 10,
        pointMicropixels: { x: 5_000_000, y: 5_000_000 },
        basis: "guide-proposed" as const,
        sourceFeatureIds: [],
        plausibilityRegionContentHash: regionByRole.get("lower-arm-left")!,
      },
    ],
    immutablePatchOperations: true as const,
    providerAuthority: false as const,
    approvalAuthority: false as const,
    capabilityAuthority: false as const,
    productionBindable: false as const,
  };
  return candidateRigRegistrationCorrectionPatchSchema.parse(withHash(draft));
};

describe("private Candidate-I registration correction contract", () => {
  it("compiles a gap-free patch into a complete authority-false effective proposal and Gate 1", () => {
    const { measurement, proposal } = fixture();
    const sourceDiagnostic = diagnostic(
      measurement.contentHash,
      proposal.contentHash,
      proposal.contentHash,
      null,
    );
    const patch = correctionPatch(
      measurement,
      proposal,
      sourceDiagnostic.contentHash,
    );
    const { effectiveProposal } =
      applyCandidateRigRegistrationCorrectionPatchChain(measurement, proposal, [
        patch,
      ]);
    expect(effectiveProposal.proposalStatus).toBe("complete-unapproved");
    expect(effectiveProposal.unresolvedRequirements).toEqual([]);
    expect(effectiveProposal.attachments).toHaveLength(1);
    expect(effectiveProposal.productionBindable).toBe(false);
    const effectiveDiagnostic = diagnostic(
      measurement.contentHash,
      proposal.contentHash,
      effectiveProposal.contentHash,
      patch.contentHash,
    );
    const gateDraft = {
      schemaVersion: "1.0" as const,
      artifactKind: "candidate-rig-static-gate-one-decision" as const,
      authorityDomain: "private-source-review-registration" as const,
      gateId: "gate-1",
      reviewer: "preston" as const,
      view: "front" as const,
      measurementReportContentHash: measurement.contentHash,
      baseProposalContentHash: proposal.contentHash,
      effectiveProposalContentHash: effectiveProposal.contentHash,
      patchChainContentHashes: [patch.contentHash],
      diagnosticReceiptContentHash: effectiveDiagnostic.contentHash,
      unresolvedRequirementCount: 0,
      humanDecisionRecorded: true,
      decision: "accepted-static-gate-one" as const,
      staticDiagnosticOnly: true as const,
      futureMotionDiagnosticEligible: true,
      motionDiagnosticAuthorized: false as const,
      ordinaryPlayerReachable: false as const,
      exportReachable: false as const,
      preparationAuthority: false as const,
      approvalAuthority: false as const,
      capabilityAuthority: false as const,
      productionBindable: false as const,
    };
    const gate = candidateRigStaticGateOneDecisionSchema.parse(
      withHash(gateDraft),
    );
    expect(
      validateCandidateRigStaticGateOneBindings(
        measurement,
        proposal,
        sourceDiagnostic,
        [patch],
        effectiveDiagnostic,
        gate,
      ).effectiveProposal.contentHash,
    ).toBe(effectiveProposal.contentHash);
  });

  it("rejects mechanical patch authority, chain gaps, and out-of-region correction", () => {
    const { measurement, proposal } = fixture();
    const sourceDiagnostic = diagnostic(
      measurement.contentHash,
      proposal.contentHash,
      proposal.contentHash,
      null,
    );
    const patch = correctionPatch(
      measurement,
      proposal,
      sourceDiagnostic.contentHash,
    );
    const mechanical = structuredClone(patch);
    if (mechanical.operations[0]?.op !== "set-child-pivot")
      throw new Error("Fixture must begin with the child-pivot correction.");
    mechanical.operations[0]!.basis = "mechanical-seam" as "guide-proposed";
    const { contentHash: _mechanicalHash, ...mechanicalDraft } = mechanical;
    void _mechanicalHash;
    expect(() =>
      candidateRigRegistrationCorrectionPatchSchema.parse(
        withHash(mechanicalDraft),
      ),
    ).toThrow();

    const gap = structuredClone(patch);
    gap.revision = 2;
    const { contentHash: _gapHash, ...gapDraft } = gap;
    void _gapHash;
    expect(() =>
      applyCandidateRigRegistrationCorrectionPatchChain(measurement, proposal, [
        withHash(gapDraft),
      ]),
    ).toThrow(/gap-free/i);

    const outside = structuredClone(patch);
    if (outside.operations[0]?.op !== "set-child-pivot")
      throw new Error("Fixture must begin with the child-pivot correction.");
    outside.operations[0]!.pointMicropixels = { x: 99_000_000, y: 99_000_000 };
    const { contentHash: _outsideHash, ...outsideDraft } = outside;
    void _outsideHash;
    expect(() =>
      applyCandidateRigRegistrationCorrectionPatchChain(measurement, proposal, [
        withHash(outsideDraft),
      ]),
    ).toThrow(/plausibility region/i);

    const duplicateTarget = structuredClone(patch);
    duplicateTarget.operations.push(
      structuredClone(duplicateTarget.operations[0]!),
    );
    const { contentHash: _duplicateTargetHash, ...duplicateTargetDraft } =
      duplicateTarget;
    void _duplicateTargetHash;
    expect(() =>
      candidateRigRegistrationCorrectionPatchSchema.parse(
        withHash(duplicateTargetDraft),
      ),
    ).toThrow(/same class\/point target, role, or socket/i);

    const wrongTarget = structuredClone(patch);
    wrongTarget.expectedTargetRevisionContentHash = hash("f");
    const { contentHash: _wrongTargetHash, ...wrongTargetDraft } = wrongTarget;
    void _wrongTargetHash;
    expect(() =>
      applyCandidateRigRegistrationCorrectionPatchChain(measurement, proposal, [
        withHash(wrongTargetDraft),
      ]),
    ).toThrow(/target revision/i);
  });

  it("rejects duplicate static artifacts and a Gate 1 acceptance with unresolved requirements", () => {
    const { measurement, proposal } = fixture();
    const sourceDiagnostic = diagnostic(
      measurement.contentHash,
      proposal.contentHash,
      proposal.contentHash,
      null,
    );
    const duplicate = structuredClone(sourceDiagnostic);
    duplicate.artifacts[1]!.artifactKind = duplicate.artifacts[0]!.artifactKind;
    const { contentHash: _duplicateHash, ...duplicateDraft } = duplicate;
    void _duplicateHash;
    expect(() =>
      candidateRigPrivateRegistrationDiagnosticReceiptSchema.parse(
        withHash(duplicateDraft),
      ),
    ).toThrow(/each exact.*static artifact/i);

    const gateDraft = {
      schemaVersion: "1.0" as const,
      artifactKind: "candidate-rig-static-gate-one-decision" as const,
      authorityDomain: "private-source-review-registration" as const,
      gateId: "bad-unresolved-gate",
      reviewer: "preston" as const,
      view: "front" as const,
      measurementReportContentHash: measurement.contentHash,
      baseProposalContentHash: proposal.contentHash,
      effectiveProposalContentHash: proposal.contentHash,
      patchChainContentHashes: [],
      diagnosticReceiptContentHash: sourceDiagnostic.contentHash,
      unresolvedRequirementCount: 0,
      humanDecisionRecorded: true,
      decision: "accepted-static-gate-one" as const,
      staticDiagnosticOnly: true as const,
      futureMotionDiagnosticEligible: true,
      motionDiagnosticAuthorized: false as const,
      ordinaryPlayerReachable: false as const,
      exportReachable: false as const,
      preparationAuthority: false as const,
      approvalAuthority: false as const,
      capabilityAuthority: false as const,
      productionBindable: false as const,
    };
    const gate = candidateRigStaticGateOneDecisionSchema.parse(
      withHash(gateDraft),
    );
    expect(() =>
      validateCandidateRigStaticGateOneBindings(
        measurement,
        proposal,
        sourceDiagnostic,
        [],
        sourceDiagnostic,
        gate,
      ),
    ).toThrow(/unresolved/i);
  });

  it("allows an atomic class-and-point revision, rejects duplicate class targets, and reverts to the measured class", () => {
    const { measurement, proposal } = fixture();
    const sourceDiagnostic = diagnostic(
      measurement.contentHash,
      proposal.contentHash,
      proposal.contentHash,
      null,
    );
    const handRegion = measurement.components.find(
      (component) => component.semanticRole === "hand-left",
    )!.plausibilityRegion.contentHash;
    const classOperation = {
      op: "set-attachment-class" as const,
      requirementId: "hand-left-proximal",
      componentRole: "hand-left",
      attachmentId: null,
      attachmentClass: "rigid-registration" as const,
      basis: "rigid-decoration" as const,
      sourceFeatureIds: [],
    };
    const pointOperation = {
      op: "set-child-pivot" as const,
      requirementId: "hand-left-proximal",
      role: "hand-left",
      pointMicropixels: { x: 5_000_000, y: 5_000_000 },
      basis: "rigid-decoration" as const,
      sourceFeatureIds: [],
      plausibilityRegionContentHash: handRegion,
      zIndex: 10,
      transformMode: "translation-only-inherit-rotation-scale" as const,
    };
    const revisionOneDraft = {
      schemaVersion: "1.0" as const,
      artifactKind: "candidate-rig-registration-correction-patch" as const,
      authorityDomain: "private-source-review-registration" as const,
      patchId: "atomic-class-point-1",
      reviewSessionId: "atomic-class-point-session",
      baseProposalContentHash: proposal.contentHash,
      expectedTargetRevisionContentHash: proposal.contentHash,
      previousPatchContentHash: null,
      revision: 1,
      sourceDiagnosticReceiptContentHash: sourceDiagnostic.contentHash,
      reviewer: "preston" as const,
      reason: "Change the class and place its compatible point atomically.",
      createdAt: "2026-07-19T20:00:00.000Z",
      operations: [pointOperation, classOperation],
      immutablePatchOperations: true as const,
      providerAuthority: false as const,
      approvalAuthority: false as const,
      capabilityAuthority: false as const,
      productionBindable: false as const,
    };
    const revisionOne = candidateRigRegistrationCorrectionPatchSchema.parse(
      withHash(revisionOneDraft),
    );
    const afterRevisionOne = applyCandidateRigRegistrationCorrectionPatchChain(
      measurement,
      proposal,
      [revisionOne],
    ).effectiveProposal;
    expect(afterRevisionOne.attachmentClassDecisions).toMatchObject([
      {
        requirementId: "hand-left-proximal",
        measuredClass: "articulation-proximal",
        decidedClass: "rigid-registration",
      },
    ]);
    expect(afterRevisionOne.parts[0]?.transformMode).toBe(
      "translation-only-inherit-rotation-scale",
    );

    expect(() =>
      candidateRigRegistrationCorrectionPatchSchema.parse(
        withHash({
          ...revisionOneDraft,
          patchId: "duplicate-class-target",
          operations: [classOperation, structuredClone(classOperation)],
        }),
      ),
    ).toThrow(/same class\/point target, role, or socket/i);

    const revisionTwoDraft = {
      ...revisionOneDraft,
      patchId: "revert-measured-class-2",
      expectedTargetRevisionContentHash: afterRevisionOne.contentHash,
      previousPatchContentHash: revisionOne.contentHash,
      revision: 2,
      reason: "Revert the experimental rigid class to the measured class.",
      createdAt: "2026-07-19T20:01:00.000Z",
      operations: [
        {
          ...classOperation,
          attachmentClass: "articulation-proximal" as const,
          basis: "guide-proposed" as const,
        },
      ],
    };
    const revisionTwo = candidateRigRegistrationCorrectionPatchSchema.parse(
      withHash(revisionTwoDraft),
    );
    const reverted = applyCandidateRigRegistrationCorrectionPatchChain(
      measurement,
      proposal,
      [revisionOne, revisionTwo],
    ).effectiveProposal;
    expect(reverted.attachmentClassDecisions).toEqual([]);
    expect(reverted.parts).toEqual(proposal.parts);
    expect(
      reverted.unresolvedRequirements.map((entry) => entry.requirementId),
    ).toContain("hand-left-proximal");
  });

  it("cannot aggregate static Gate 1 as eligible until all three native views are accepted", () => {
    const views = ["front", "profile-left", "profile-right"] as const;
    const entries = views.map((view, index) => ({
      view,
      measurementReportContentHash: hash(`${index + 1}`),
      baseProposalContentHash: hash(`${index + 2}`),
      effectiveProposalContentHash: hash(`${index + 3}`),
      patchChainContentHashes: [],
      diagnosticReceiptContentHash: hash(`${index + 4}`),
      gateContentHash: hash(`${index + 5}`),
      decision:
        view === "profile-right"
          ? ("needs-registration-correction" as const)
          : ("accepted-static-gate-one" as const),
      unresolvedRequirementCount: view === "profile-right" ? 1 : 0,
    }));
    const blockedDraft = {
      schemaVersion: "1.0" as const,
      artifactKind: "candidate-rig-all-view-static-gate-one-bundle" as const,
      authorityDomain: "private-source-review-registration" as const,
      bundleId: "all-view-static-gate-one",
      views: entries,
      allViewsAccepted: false,
      futureMotionDiagnosticEligible: false,
      motionDiagnosticAuthorized: false as const,
      staticGateOneOnly: true as const,
      ordinaryPlayerReachable: false as const,
      exportReachable: false as const,
      preparationAuthority: false as const,
      approvalAuthority: false as const,
      capabilityAuthority: false as const,
      productionBindable: false as const,
    };
    expect(
      candidateRigAllViewStaticGateOneBundleSchema.parse(withHash(blockedDraft))
        .futureMotionDiagnosticEligible,
    ).toBe(false);
    expect(() =>
      candidateRigAllViewStaticGateOneBundleSchema.parse(
        withHash({
          ...blockedDraft,
          allViewsAccepted: true,
          futureMotionDiagnosticEligible: true,
        }),
      ),
    ).toThrow(/every view/i);
    expect(() =>
      candidateRigAllViewStaticGateOneBundleSchema.parse(
        withHash({
          ...blockedDraft,
          views: entries.slice(0, 2),
        }),
      ),
    ).toThrow();
  });

  it("forbids front shared-coordinate aliases and cross-parent profile aliases", () => {
    for (const view of ["front", "profile-left"] as const) {
      const { measurement, proposal } = fixture(view);
      const sourceDiagnostic = diagnostic(
        measurement.contentHash,
        proposal.contentHash,
        proposal.contentHash,
        null,
      );
      const sharedDraft = {
        schemaVersion: "1.0" as const,
        artifactKind: "candidate-rig-registration-correction-patch" as const,
        authorityDomain: "private-source-review-registration" as const,
        patchId: `bad-shared-${view}`,
        reviewSessionId: `preston-session-${view}`,
        baseProposalContentHash: proposal.contentHash,
        expectedTargetRevisionContentHash: proposal.contentHash,
        previousPatchContentHash: null,
        revision: 1,
        sourceDiagnosticReceiptContentHash: sourceDiagnostic.contentHash,
        reviewer: "preston" as const,
        reason: "Attempt an invalid coordinate alias for adversarial coverage.",
        createdAt: "2026-07-19T20:00:00.000Z",
        operations: [
          {
            op: "set-shared-pivot-group" as const,
            groupId: "bad-shared",
            pointMicropixels: { x: 5_000_000, y: 5_000_000 },
            plausibilityRegionContentHash:
              measurement.components[1]!.plausibilityRegion.contentHash,
            members: [
              {
                parentRole: "lower-arm-left",
                childRole: "hand-left",
                socketId: "wrist-left",
                requirementId: "lower-arm-left-distal",
                motionChannelId: "channel-a",
                zIndex: 1,
              },
              {
                parentRole: view === "front" ? "lower-arm-left" : "hand-left",
                childRole: "tail",
                socketId: "tail-base",
                requirementId: "hand-left-proximal",
                motionChannelId: "channel-b",
                zIndex: 2,
              },
            ],
          },
        ],
        immutablePatchOperations: true as const,
        providerAuthority: false as const,
        approvalAuthority: false as const,
        capabilityAuthority: false as const,
        productionBindable: false as const,
      };
      expect(() =>
        applyCandidateRigRegistrationCorrectionPatchChain(
          measurement,
          proposal,
          [withHash(sharedDraft)],
        ),
      ).toThrow(view === "front" ? /front registration/i : /one parent/i);
    }
  });
});
