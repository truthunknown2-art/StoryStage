import { describe, expect, it } from "vitest";
import * as registration from "./candidate-rig-registration-measurement";
import { hashCanonical } from "./canonical-hash";
import {
  createCharacterRigAssetRequest,
  createCharacterRigCandidateBundle,
  createKidsBipedRigRequestItems,
  createTurnaroundViewCoverageEvidence,
  inspectCharacterRigCandidateBundle,
  kidsBipedV1RequiredTurnaroundViews,
  kidsBipedV1TopologyTemplate,
} from "./character-rig-acquisition";
import {
  characterRigImportReceiptSchema,
  createCharacterRigStagingReport,
} from "./character-rig-preparation";
import {
  candidateRigRegistrationAnnotationMapSchema,
  candidateRigRegistrationMeasurementAlgorithmContract,
  candidateRigRegistrationMeasurementProgramSchema,
  candidateRigRegistrationMeasurementReportSchema,
  compileCandidateRigRegistrationMeasurementProgram,
  createCandidateRigRegistrationAnnotationMap,
  createPrestonCandidateRigRegistrationAnnotationReview,
  validateCandidateRigRegistrationMeasurementClaimBindings,
} from "./candidate-rig-registration-measurement";

const hash = (label: string) => hashCanonical({ synthetic: label });
const partRoles = kidsBipedV1TopologyTemplate.parts.map((part) => part.role);

const pairDispositions = () =>
  partRoles.flatMap((leftRole, leftIndex) =>
    partRoles.slice(leftIndex + 1).map((rightRole) => ({
      leftRole,
      rightRole,
      disposition:
        leftRole === "torso" && rightRole === "head"
          ? ("can-overlap" as const)
          : ("cannot-overlap" as const),
    })),
  );

const buildLedger = () => {
  const request = createCharacterRigAssetRequest({
    schemaVersion: "1.0",
    requestId: "synthetic-registration-request",
    showPack: {
      id: "synthetic-show-pack",
      version: "1.0.0",
      contentHash: hash("show-pack"),
    },
    character: { id: "synthetic-character", displayName: "Synthetic" },
    identityLock: {
      assetId: "synthetic-identity-lock",
      contentHash: hash("identity-lock"),
    },
    rigProfile: {
      id: "kids-biped-v1",
      version: "1.0.0",
      templateContentHash: kidsBipedV1TopologyTemplate.contentHash,
    },
    acquisition: {
      mode: "manual-file-import",
      providerNeutral: true,
      acceptedMediaTypes: ["image/png"],
      credentialsRequired: false,
      accountSessionRequired: false,
    },
    controlledMatte: "#ff00ff",
    items: createKidsBipedRigRequestItems(),
    prohibitions: ["Synthetic contract fixture only."],
    approvalRequired: true,
  });
  const turnaroundItem = request.items.find(
    (item) => item.kind === "turnaround-sheet",
  )!;
  const turnaroundContentHash = hash("candidate-turnaround");
  const coverage = createTurnaroundViewCoverageEvidence({
    schemaVersion: "1.0",
    requestId: request.requestId,
    requestContentHash: request.contentHash,
    requestItemId: turnaroundItem.id,
    candidateId: `candidate-${turnaroundItem.id}`,
    candidateContentHash: turnaroundContentHash,
    requiredViews: [...kidsBipedV1RequiredTurnaroundViews],
    views: kidsBipedV1RequiredTurnaroundViews.map((view, index) => ({
      view,
      sourceContentHash: turnaroundContentHash,
      sourceRect: { x: index * 100, y: 0, width: 100, height: 100 },
      derivedContentHash: hash(`derived-${view}`),
      byteLength: 100,
      width: 100,
      height: 100,
      semanticDirection: {
        front: "neutral-front",
        "three-quarter": "three-quarter",
        "profile-left": "faces-screen-left",
        "profile-right": "faces-screen-right",
        rear: "neutral-rear",
      }[view] as
        | "neutral-front"
        | "three-quarter"
        | "faces-screen-left"
        | "faces-screen-right"
        | "neutral-rear",
      transform: "none" as const,
    })),
  });
  const bundle = createCharacterRigCandidateBundle({
    schemaVersion: "1.0",
    acquisitionMode: "manual-file-import",
    requestId: request.requestId,
    requestContentHash: request.contentHash,
    provenance: {
      sourceType: "generated",
      providerLabel: "synthetic-test",
      sourceReference: null,
      createdAt: "2026-07-19T00:00:00.000Z",
      rightsStatement: "Synthetic contract fixture only.",
    },
    assets: request.items.map((item) => {
      const contentHash =
        item.kind === "turnaround-sheet"
          ? turnaroundContentHash
          : hash(`candidate-${item.id}`);
      return {
        candidateId: `candidate-${item.id}`,
        requestItemId: item.id,
        relativeFile: `candidates/${item.id}.png`,
        contentHash,
        byteLength: 4096,
        mediaType: "image/png" as const,
        width: item.kind === "turnaround-sheet" ? 500 : 512,
        height: item.kind === "turnaround-sheet" ? 100 : 512,
        ...(item.kind === "turnaround-sheet"
          ? {
              turnaroundViewCoverageEvidence: {
                schemaVersion: "1.0" as const,
                relativeFile: "evidence/coverage.json",
                contentHash: coverage.contentHash,
                fileContentHash: hashCanonical(coverage),
                byteLength: 1024,
              },
            }
          : {}),
      };
    }),
  });
  const inspection = inspectCharacterRigCandidateBundle(request, bundle);
  const stagedCoverage = {
    schemaVersion: "1.0" as const,
    requestItemId: turnaroundItem.id,
    candidateId: `candidate-${turnaroundItem.id}`,
    candidateContentHash: turnaroundContentHash,
    evidenceContentHash: coverage.contentHash,
    evidenceFileContentHash: hashCanonical(coverage),
    sourceRelativeFile: "evidence/coverage.json",
    stagedRelativeFile: `character-rig/coverage-evidence/${hashCanonical(coverage)}.json`,
    requiredViews: [...kidsBipedV1RequiredTurnaroundViews] as [
      "front",
      "three-quarter",
      "profile-left",
      "profile-right",
      "rear",
    ],
    views: kidsBipedV1RequiredTurnaroundViews.map((view) => ({
      view,
      derivedContentHash: hash(`derived-${view}`),
      byteLength: 100,
      width: 100,
      height: 100,
      stagedRelativeFile: `character-rig/coverage-views/${hash(`derived-${view}`)}.png`,
    })),
    status: "complete" as const,
  };
  const stagingReport = createCharacterRigStagingReport({
    schemaVersion: "1.0",
    reportId: "synthetic-registration-staging",
    requestId: request.requestId,
    requestContentHash: request.contentHash,
    bundleContentHash: bundle.contentHash,
    identityLockContentHash: request.identityLock.contentHash,
    templateContentHash: request.rigProfile.templateContentHash,
    status: "complete",
    returnedItems: [...inspection.returnedItems, turnaroundItem.id].sort(),
    partialItems: [],
    missingItems: [],
    missingSubitems: [],
    unknownItems: [],
    turnaroundViewCoverageEvidence: [stagedCoverage],
    assets: bundle.assets.map((asset) => ({
      candidateId: asset.candidateId,
      requestItemId: asset.requestItemId,
      sourceContentHash: asset.contentHash,
      stagedContentHash: asset.contentHash,
      immutableLocationId: `sha256:${asset.contentHash}`,
      relativeFile: `character-rig/candidates/${asset.contentHash}.png`,
      byteLength: asset.byteLength,
      mediaType: "image/png" as const,
      width: asset.width,
      height: asset.height,
      alphaClass:
        asset.requestItemId === turnaroundItem.id
          ? ("opaque" as const)
          : ("mixed-alpha" as const),
      checks: {
        byteLength: true,
        contentHash: true,
        codec: true,
        dimensions: true,
        decodedSinglePage: true,
      },
    })),
    providerAuthority: false,
    approvalRequired: true,
    stagedAt: "2026-07-19T00:01:00.000Z",
  });
  const receiptDraft = {
    schemaVersion: "1.0" as const,
    importId: "synthetic-registration-import",
    requestContentHash: request.contentHash,
    candidateBundleContentHash: bundle.contentHash,
    stagingReportContentHash: stagingReport.contentHash,
    files: stagingReport.assets.map((asset) => ({
      requestItemId: asset.requestItemId,
      candidateId: asset.candidateId,
      sourceContentHash: asset.sourceContentHash,
      byteLength: asset.byteLength,
      mediaType: "image/png" as const,
      width: asset.width,
      height: asset.height,
      immutableLocationId: asset.immutableLocationId,
      stagedRelativeFile: asset.relativeFile,
    })),
    turnaroundViewCoverageEvidence: [stagedCoverage],
    providerAuthority: false as const,
    approvalRequired: true as const,
    importedAt: "2026-07-19T00:02:00.000Z",
  };
  const importReceipt = characterRigImportReceiptSchema.parse({
    ...receiptDraft,
    contentHash: hashCanonical(receiptDraft),
  });
  return { request, bundle, stagingReport, importReceipt };
};

type Ledger = ReturnType<typeof buildLedger>;

const sourceCatalog = (ledger: Ledger) => {
  const partsItem = ledger.request.items.find(
    (item) => item.kind === "parts-kit" && item.view === "front",
  )!;
  const faceItem = ledger.request.items.find(
    (item) => item.kind === "face-kit" && item.view === "front",
  )!;
  const partsAsset = ledger.bundle.assets.find(
    (asset) => asset.requestItemId === partsItem.id,
  )!;
  const faceAsset = ledger.bundle.assets.find(
    (asset) => asset.requestItemId === faceItem.id,
  )!;
  const rolesByKind = {
    parts: [...partsItem.requiredComponents],
    face: [...faceItem.requiredComponents],
  };
  const bindings = new Map<
    string,
    {
      requestItemId: string;
      candidateId: string;
      stagedContentHash: string;
      atlasKind: "parts" | "face";
      atlasCell: { x: number; y: number; width: number; height: number };
    }
  >();
  for (const atlasKind of ["parts", "face"] as const) {
    const item = atlasKind === "parts" ? partsItem : faceItem;
    const asset = atlasKind === "parts" ? partsAsset : faceAsset;
    for (const [index, role] of rolesByKind[atlasKind].entries())
      bindings.set(role, {
        requestItemId: item.id,
        candidateId: asset.candidateId,
        stagedContentHash: asset.contentHash,
        atlasKind,
        atlasCell: {
          x: (index % 10) * 32,
          y: Math.floor(index / 10) * 32,
          width: 24,
          height: 24,
        },
      });
  }
  return bindings;
};

const annotationDraft = (ledger: Ledger) => {
  const sources = sourceCatalog(ledger);
  return {
    schemaVersion: "1.0" as const,
    mapKind: "candidate-rig-registration-annotation" as const,
    authorityDomain: "source-review-registration-annotation" as const,
    annotationState: "proposed" as const,
    annotationId: "synthetic-annotation",
    view: "front" as const,
    lineage: {
      requestContentHash: ledger.request.contentHash,
      candidateBundleContentHash: ledger.bundle.contentHash,
      stagingReportContentHash: ledger.stagingReport.contentHash,
      importReceiptContentHash: ledger.importReceipt.contentHash,
      identityLockContentHash: ledger.request.identityLock.contentHash,
      topologyTemplateContentHash: kidsBipedV1TopologyTemplate.contentHash,
    },
    turnaroundGuidance: {
      candidateId: "candidate-turnaround-sheet",
      candidateContentHash: hash("candidate-turnaround"),
      coverageEvidenceContentHash: hash("coverage"),
      coverageEvidenceFileContentHash: hash("coverage-file"),
      derivedViewContentHash: hash("derived-front"),
      width: 576 as const,
      height: 832 as const,
      targetCharacterHeight: 768 as const,
      baselineY: 800 as const,
      semanticDirection: "neutral-front" as const,
      normalizationVerification:
        "rederived-coverage-cell-alpha-bounds-v1" as const,
      mirroringAllowed: false as const,
    },
    guideLandmarks: kidsBipedV1TopologyTemplate.parts
      .flatMap((part, index) => [
        {
          id: `landmark-${part.role}-a`,
          point: { x: 40 + index, y: 80 + index },
          visibility: "visible" as const,
        },
        {
          id: `landmark-${part.role}-b`,
          point: { x: 50 + index, y: 80 + index },
          visibility: "visible" as const,
        },
      ])
      .sort((left, right) => left.id.localeCompare(right.id)),
    parts: kidsBipedV1TopologyTemplate.parts.map((part) => {
      const source = sources.get(part.role)!;
      return {
        role: part.role,
        parentRole: part.parentRole,
        parentSocketId: part.parentSocketId,
        source,
        sourceFeatures: [
          {
            id: `feature-${part.role}-a`,
            kind: "alpha-centroid" as const,
            atlasKind: source.atlasKind,
          },
          {
            id: `feature-${part.role}-b`,
            kind: "principal-axis-end" as const,
            atlasKind: source.atlasKind,
            end: "finish" as const,
          },
        ],
        childPivotFeatureId: `feature-${part.role}-b`,
        alignments: [
          {
            sourceFeatureId: `feature-${part.role}-a`,
            guidanceLandmarkId: `landmark-${part.role}-a`,
          },
          {
            sourceFeatureId: `feature-${part.role}-b`,
            guidanceLandmarkId: `landmark-${part.role}-b`,
          },
        ],
      };
    }),
    exposures: kidsBipedV1TopologyTemplate.exposures.map((exposure) => ({
      role: exposure.role,
      targetRole: exposure.targetRole,
      source: sources.get(exposure.role)!,
      sourceAnchor: {
        id: `exposure-anchor-${exposure.role}`,
        kind: "principal-axis-end" as const,
        atlasKind: sources.get(exposure.role)!.atlasKind,
        end: "finish" as const,
      },
      targetAnchorFeatureId: `feature-${exposure.targetRole}-b`,
      registrationMode: "inherit-target-registration" as const,
    })),
    pairDispositions: pairDispositions(),
    occlusionEdges: [
      { behindRole: "torso" as const, inFrontOfRole: "head" as const },
    ],
    reviewStatus: "awaiting-preston-review" as const,
    prestonReviewRecordContentHash: null,
    providerAuthority: false as const,
    approvalAuthority: false as const,
    approvalRequired: true as const,
    productionBindable: false as const,
  };
};

const reviewDraft = (annotationMapContentHash: string) => ({
  schemaVersion: "1.0" as const,
  recordKind: "candidate-rig-registration-annotation-review" as const,
  authorityDomain: "source-review-registration-annotation" as const,
  reviewId: "synthetic-preston-review",
  reviewerId: "preston" as const,
  reviewScope: "measurement-input-only" as const,
  annotationMapContentHash,
  view: "front" as const,
  decision: "accepted-for-measurement" as const,
  checks: {
    visualRoles: true,
    semanticDirection: true,
    featureSemantics: true,
    guidanceLandmarks: true,
    occlusionSemantics: true,
  },
  findings: ["Synthetic contract fixture only."],
  machineOwned: false as const,
  providerAuthority: false as const,
  approvalAuthority: false as const,
  approvalRequired: true as const,
  productionBindable: false as const,
});

const reviewedFixture = () => {
  const ledger = buildLedger();
  const annotation = createCandidateRigRegistrationAnnotationMap(
    annotationDraft(ledger),
  );
  const review = createPrestonCandidateRigRegistrationAnnotationReview(
    reviewDraft(annotation.contentHash),
  );
  const program = compileCandidateRigRegistrationMeasurementProgram({
    ...ledger,
    annotationMap: annotation,
    prestonReview: review,
  });
  return { ledger, annotation, review, program };
};

const claim = (fixture: ReturnType<typeof reviewedFixture>) => {
  const parts = kidsBipedV1TopologyTemplate.parts.map((part, index) => ({
    role: part.role,
    parentRole: part.parentRole,
    parentSocketId: part.parentSocketId,
    output: { width: 100, height: 100, padding: 8 as const },
    supportMaskContentHash: hash(`support-${part.role}`),
    coreMaskContentHash: hash(`core-${part.role}`),
    selectedFeatures: [
      {
        featureId: `feature-${part.role}-a`,
        kind: "alpha-centroid" as const,
        supportBounds: { x: 20, y: 20, width: 60, height: 60 },
        pointMicropixels: { x: 50_000_000, y: 50_000_000 },
      },
      {
        featureId: `feature-${part.role}-b`,
        kind: "principal-axis-end" as const,
        supportBounds: { x: 20, y: 20, width: 60, height: 60 },
        pointMicropixels: { x: 60_000_000, y: 50_000_000 },
      },
    ],
    childPivotFeatureId: `feature-${part.role}-b`,
    childPivot: { x: 60, y: 50 },
    parentJoint: part.parentRole ? { x: 50, y: 50 } : null,
    restTransform: {
      xMicropixels: 0,
      yMicropixels: 0,
      rotationMicrodegrees: 0,
      scaleXMillionths: 1_000_000,
      scaleYMillionths: 1_000_000,
    },
    sockets: kidsBipedV1TopologyTemplate.parts
      .filter((candidate) => candidate.parentRole === part.role)
      .map((candidate) => ({
        id: candidate.parentSocketId!,
        position: { x: 50, y: 50 },
      }))
      .sort((left, right) => left.id.localeCompare(right.id)),
    zIndex: index,
    fit: {
      anchorCount: 2,
      absoluteScaleMillionths: 1_000_000,
      absoluteRotationMicrodegrees: 0,
      residualMicropixels: 0,
      reflected: false as const,
      mirrored: false as const,
      shear: 0 as const,
    },
  }));
  const partByRole = new Map(parts.map((part) => [part.role, part]));
  const draft = {
    schemaVersion: "1.0" as const,
    reportKind: "candidate-rig-registration-measurement" as const,
    authorityDomain: "source-review-registration-measurement" as const,
    reportId: "synthetic-measurement-claim",
    view: "front" as const,
    lineage: fixture.annotation.lineage,
    turnaroundGuidance: fixture.annotation.turnaroundGuidance,
    annotationMapContentHash: fixture.annotation.contentHash,
    prestonReviewRecordContentHash: fixture.review.contentHash,
    measurementProgramContentHash: fixture.program.contentHash,
    algorithm: candidateRigRegistrationMeasurementAlgorithmContract,
    transformConvention: "parent-pivot-local-v1" as const,
    zConvention: "larger-z-index-renders-in-front" as const,
    parts,
    exposures: kidsBipedV1TopologyTemplate.exposures.map((exposure) => {
      const target = partByRole.get(exposure.targetRole)!;
      return {
        role: exposure.role,
        targetRole: exposure.targetRole,
        output: target.output,
        supportMaskContentHash: hash(`support-${exposure.role}`),
        coreMaskContentHash: hash(`core-${exposure.role}`),
        sourceAnchor: {
          featureId: `exposure-anchor-${exposure.role}`,
          kind: "principal-axis-end" as const,
          supportBounds: { x: 20, y: 20, width: 60, height: 60 },
          pointMicropixels: { x: 60_000_000, y: 50_000_000 },
        },
        targetAnchorFeatureId: `feature-${exposure.targetRole}-b`,
        childPivot: target.childPivot,
        registrationMode: "inherit-target-registration" as const,
      };
    }),
    resolvedOcclusions: fixture.annotation.occlusionEdges,
    repeatabilityScope: "same-runtime-and-engine-build-only" as const,
    crossRuntimeBitExact: false as const,
    behaviorSourceReceiptStatus: "pending" as const,
    machineGeneratedClaim: true as const,
    providerAuthority: false as const,
    approvalAuthority: false as const,
    approvalRequired: true as const,
    productionBindable: false as const,
  };
  return candidateRigRegistrationMeasurementReportSchema.parse({
    ...draft,
    contentHash: hashCanonical(draft),
  });
};

describe("candidate rig registration measurement contracts", () => {
  it("compiles a self-hashed exact source program from the validated import ledger", () => {
    const fixture = reviewedFixture();
    const recompiled = compileCandidateRigRegistrationMeasurementProgram({
      ...fixture.ledger,
      annotationMap: fixture.annotation,
      prestonReview: fixture.review,
    });
    expect(recompiled).toEqual(fixture.program);
    expect(
      fixture.program.sourceImports.map((source) => source.atlasKind),
    ).toEqual(["parts", "face"]);
    expect(fixture.program.productionBindable).toBe(false);
  });

  it("rejects source cross-wiring and overlapping cells before a program exists", () => {
    const ledger = buildLedger();
    const crossWiredDraft = annotationDraft(ledger);
    crossWiredDraft.parts[0]!.source = {
      ...crossWiredDraft.parts[0]!.source,
      candidateId: crossWiredDraft.exposures[0]!.source.candidateId,
    };
    const crossWired =
      createCandidateRigRegistrationAnnotationMap(crossWiredDraft);
    const review = createPrestonCandidateRigRegistrationAnnotationReview(
      reviewDraft(crossWired.contentHash),
    );
    expect(() =>
      compileCandidateRigRegistrationMeasurementProgram({
        ...ledger,
        annotationMap: crossWired,
        prestonReview: review,
      }),
    ).toThrow(/exact allowed request.*ledger/i);

    const overlap = annotationDraft(ledger);
    const sameSourceIndex = overlap.parts.findIndex(
      (part, index) =>
        index > 0 &&
        part.source.candidateId === overlap.parts[0]!.source.candidateId,
    );
    overlap.parts[sameSourceIndex]!.source.atlasCell = {
      ...overlap.parts[0]!.source.atlasCell,
    };
    expect(() => createCandidateRigRegistrationAnnotationMap(overlap)).toThrow(
      /overlaps/i,
    );
  });

  it("binds reports to the exact compiled program and rejects substitution", () => {
    const fixture = reviewedFixture();
    const report = claim(fixture);
    expect(
      validateCandidateRigRegistrationMeasurementClaimBindings(
        fixture.annotation,
        fixture.review,
        fixture.program,
        report,
      ).program.contentHash,
    ).toBe(fixture.program.contentHash);

    const forgedProgram = structuredClone(fixture.program);
    forgedProgram.partSources[0]!.source.atlasCell.x += 1;
    expect(() =>
      candidateRigRegistrationMeasurementProgramSchema.parse(forgedProgram),
    ).toThrow(/hash/i);

    const changedDraft = annotationDraft(fixture.ledger);
    changedDraft.parts[0]!.childPivotFeatureId =
      changedDraft.parts[0]!.sourceFeatures[0]!.id;
    const changedAnnotation =
      createCandidateRigRegistrationAnnotationMap(changedDraft);
    const changedReview = createPrestonCandidateRigRegistrationAnnotationReview(
      reviewDraft(changedAnnotation.contentHash),
    );
    const changedProgram = compileCandidateRigRegistrationMeasurementProgram({
      ...fixture.ledger,
      annotationMap: changedAnnotation,
      prestonReview: changedReview,
    });
    expect(changedProgram.contentHash).not.toBe(fixture.program.contentHash);
    expect(() =>
      validateCandidateRigRegistrationMeasurementClaimBindings(
        changedAnnotation,
        changedReview,
        changedProgram,
        report,
      ),
    ).toThrow(/reviewed annotation lineage/i);
  });

  it("uses an explicit child-pivot selector rather than feature array position", () => {
    const fixture = reviewedFixture();
    const report = claim(fixture);
    expect(fixture.annotation.parts[0]!.childPivotFeatureId).toBe(
      fixture.annotation.parts[0]!.sourceFeatures[1]!.id,
    );
    expect(report.parts[0]!.childPivotFeatureId).toBe(
      fixture.annotation.parts[0]!.childPivotFeatureId,
    );
    const wrong = structuredClone(report);
    wrong.parts[0]!.childPivotFeatureId =
      fixture.annotation.parts[0]!.sourceFeatures[0]!.id;
    const { contentHash: ignored, ...draft } = wrong;
    void ignored;
    const resealed = candidateRigRegistrationMeasurementReportSchema.parse({
      ...draft,
      contentHash: hashCanonical(draft),
    });
    expect(() =>
      validateCandidateRigRegistrationMeasurementClaimBindings(
        fixture.annotation,
        fixture.review,
        fixture.program,
        resealed,
      ),
    ).toThrow(/explicitly reviewed child-pivot/i);
  });

  it("truthfully declares binary64 behavior and pending source/exercise receipts", () => {
    const contract = candidateRigRegistrationMeasurementAlgorithmContract;
    expect(contract.solver).toBe("ordered-binary64-procrustes-v1");
    expect(contract.formulaDescriptor.numericModel).toMatch(/binary64/i);
    expect(contract.crossRuntimeBitExact).toBe(false);
    expect(contract.sourceIdentityClaimed).toBe(false);
    expect(contract.behaviorSourceReceiptStatus).toBe("pending");
    expect(contract.exerciseDescriptor.executionStatus).toBe("pending");
    const { contentHash, ...formulaDraft } = contract.formulaDescriptor;
    expect(hashCanonical(formulaDraft)).toBe(contentHash);
    expect(() =>
      candidateRigRegistrationMeasurementReportSchema.parse({
        ...claim(reviewedFixture()),
        algorithm: {
          ...contract,
          solver: "fixed-point-similarity-v1",
        },
      }),
    ).toThrow();
  });

  it("exports no raw trusted report constructor and preserves authority false", () => {
    expect(registration).not.toHaveProperty(
      "createCandidateRigRegistrationMeasurementReport",
    );
    const report = claim(reviewedFixture());
    expect(report.machineGeneratedClaim).toBe(true);
    expect(report.providerAuthority).toBe(false);
    expect(report.approvalAuthority).toBe(false);
    expect(report.productionBindable).toBe(false);
  });

  it("rejects forged annotation hashes and caller-supplied atlas map authority", () => {
    const ledger = buildLedger();
    const annotation = createCandidateRigRegistrationAnnotationMap(
      annotationDraft(ledger),
    );
    expect(() =>
      candidateRigRegistrationAnnotationMapSchema.parse({
        ...annotation,
        contentHash: hash("forged"),
      }),
    ).toThrow(/hash/i);
    expect(() =>
      createCandidateRigRegistrationAnnotationMap({
        ...annotationDraft(ledger),
        lineage: {
          ...annotationDraft(ledger).lineage,
          atlasMapContentHashes: { parts: hash("p"), face: hash("f") },
        },
      }),
    ).toThrow();
  });
});
