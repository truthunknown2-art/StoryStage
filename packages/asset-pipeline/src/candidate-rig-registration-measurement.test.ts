import { createHash } from "node:crypto";
import { lstat, mkdtemp, rename, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";
import { afterEach, describe, expect, it } from "vitest";
import {
  candidateRigRegistrationMeasurementAlgorithmContract,
  candidateRigRegistrationMeasurementProgramSchema,
  characterRigImportReceiptSchema,
  compileCandidateRigRegistrationMeasurementProgram,
  createCandidateRigRegistrationAnnotationMap,
  createCharacterRigAssetRequest,
  createCharacterRigCandidateBundle,
  createCharacterRigStagingReport,
  createKidsBipedRigRequestItems,
  createPrestonCandidateRigRegistrationAnnotationReview,
  createTurnaroundViewCoverageEvidence,
  hashCanonical,
  inspectCharacterRigCandidateBundle,
  kidsBipedV1RequiredTurnaroundViews,
  kidsBipedV1TopologyTemplate,
} from "@storystage/story-engine";
import {
  CandidateRigRegistrationMeasurementError,
  createTrustedCandidateRigRegistrationMeasurement,
  isTrustedCandidateRigRegistrationMeasurement,
  solveCandidateRigRegistrationSimilarity,
} from "./candidate-rig-registration-measurement";
import {
  persistAcceptedPrestonCandidateRigRegistrationReview,
  readPrivateCandidateRigRegistrationReviewFileSnapshot,
} from "./candidate-rig-registration-review-store";

const temporaryRoots: string[] = [];
afterEach(async () => {
  await Promise.all(
    temporaryRoots
      .splice(0)
      .map((root) => rm(root, { recursive: true, force: true })),
  );
});

const sha256 = (bytes: Uint8Array) =>
  createHash("sha256").update(bytes).digest("hex");

const png = async (width: number, height: number, pixels: Buffer) =>
  sharp(pixels, { raw: { width, height, channels: 4 } })
    .png({
      compressionLevel: 9,
      adaptiveFiltering: false,
      palette: false,
      effort: 10,
    })
    .toBuffer();

const solidPng = async (width: number, height: number, red: number) => {
  const pixels = Buffer.alloc(width * height * 4);
  for (let index = 0; index < width * height; index += 1) {
    pixels[index * 4] = red;
    pixels[index * 4 + 1] = 40;
    pixels[index * 4 + 2] = 80;
    pixels[index * 4 + 3] = 255;
  }
  return png(width, height, pixels);
};

const makeTurnaround = async () => {
  const width = 2880;
  const height = 832;
  const cellWidth = 576;
  const foregroundWidths = [240, 264, 288, 312, 336] as const;
  const colors = [
    [241, 97, 72],
    [40, 164, 154],
    [72, 105, 196],
    [234, 176, 52],
    [151, 91, 185],
  ] as const;
  const pixels = Buffer.alloc(width * height * 4);
  for (let viewIndex = 0; viewIndex < foregroundWidths.length; viewIndex += 1) {
    const foregroundWidth = foregroundWidths[viewIndex]!;
    const minimumX = viewIndex * cellWidth + (cellWidth - foregroundWidth) / 2;
    const color = colors[viewIndex]!;
    for (let y = 32; y < 800; y += 1)
      for (let x = minimumX; x < minimumX + foregroundWidth; x += 1) {
        const offset = (y * width + x) * 4;
        pixels[offset] = color[0];
        pixels[offset + 1] = color[1];
        pixels[offset + 2] = color[2];
        pixels[offset + 3] = 255;
      }
  }
  const bytes = await png(width, height, pixels);
  const derivedByView = new Map<
    (typeof kidsBipedV1RequiredTurnaroundViews)[number],
    Buffer
  >();
  for (const [index, view] of kidsBipedV1RequiredTurnaroundViews.entries()) {
    const derived = await sharp(bytes)
      .extract({ left: index * cellWidth, top: 0, width: cellWidth, height })
      .ensureAlpha()
      .png({
        compressionLevel: 9,
        adaptiveFiltering: false,
        palette: false,
        effort: 10,
      })
      .toBuffer();
    derivedByView.set(view, derived);
  }
  return { width, height, bytes, derivedByView };
};

const makeAtlas = async (roles: readonly string[], shiftedRole?: string) => {
  const columns = 8;
  const cell = 20;
  const width = columns * cell;
  const height = Math.ceil(roles.length / columns) * cell;
  const pixels = Buffer.alloc(width * height * 4);
  const components = roles.map((role, index) => {
    const x = (index % columns) * cell;
    const y = Math.floor(index / columns) * cell;
    const shiftX = role === shiftedRole ? 2 : 0;
    for (let py = 6; py < 14; py += 1)
      for (let px = 4 + shiftX; px < 16 + shiftX; px += 1) {
        const offset = ((y + py) * width + x + px) * 4;
        pixels[offset] = 120 + ((index * 17) % 120);
        pixels[offset + 1] = 80 + ((index * 23) % 150);
        pixels[offset + 2] = 60 + ((index * 29) % 170);
        pixels[offset + 3] = 255;
      }
    return { role, atlasCell: { x, y, width: cell, height: cell } };
  });
  return { width, height, bytes: await png(width, height, pixels), components };
};

const pairDispositions = () => {
  const roles = kidsBipedV1TopologyTemplate.parts.map((part) => part.role);
  return roles.flatMap((leftRole, leftIndex) =>
    roles.slice(leftIndex + 1).map((rightRole) => ({
      leftRole,
      rightRole,
      disposition:
        leftRole === "torso" && rightRole === "head"
          ? ("can-overlap" as const)
          : ("cannot-overlap" as const),
    })),
  );
};

const buildFixture = async (options?: { shiftedExposureRole?: string }) => {
  const request = createCharacterRigAssetRequest({
    schemaVersion: "1.0",
    requestId: "synthetic-registration-request",
    showPack: {
      id: "synthetic-show-pack",
      version: "1.0.0",
      contentHash: hashCanonical({ show: "synthetic" }),
    },
    character: { id: "synthetic-actor", displayName: "Synthetic Actor" },
    identityLock: {
      assetId: "synthetic-identity-lock",
      contentHash: hashCanonical({ identity: "synthetic" }),
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
    prohibitions: ["Synthetic fixture only."],
    approvalRequired: true,
  });

  const frontParts = request.items.find((item) => item.id === "parts-front")!;
  const frontFace = request.items.find((item) => item.id === "face-front")!;
  const partsAtlas = await makeAtlas(
    frontParts.requiredComponents,
    options?.shiftedExposureRole,
  );
  const faceAtlas = await makeAtlas(
    frontFace.requiredComponents,
    options?.shiftedExposureRole,
  );
  const turnaround = await makeTurnaround();
  const bytesByItem = new Map<string, Buffer>();
  for (const [index, item] of request.items.entries())
    bytesByItem.set(
      item.id,
      item.id === "parts-front"
        ? partsAtlas.bytes
        : item.id === "face-front"
          ? faceAtlas.bytes
          : item.id === "turnaround-sheet"
            ? turnaround.bytes
            : await solidPng(8, 8, 30 + index),
    );

  const turnaroundHash = sha256(turnaround.bytes);
  const coverage = createTurnaroundViewCoverageEvidence({
    schemaVersion: "1.0",
    requestId: request.requestId,
    requestContentHash: request.contentHash,
    requestItemId: "turnaround-sheet",
    candidateId: "candidate-turnaround-sheet",
    candidateContentHash: turnaroundHash,
    requiredViews: [...kidsBipedV1RequiredTurnaroundViews],
    views: kidsBipedV1RequiredTurnaroundViews.map((view, index) => {
      const derived = turnaround.derivedByView.get(view)!;
      return {
        view,
        sourceContentHash: turnaroundHash,
        sourceRect: { x: index * 576, y: 0, width: 576, height: 832 },
        derivedContentHash: sha256(derived),
        byteLength: derived.length,
        width: 576,
        height: 832,
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
      };
    }),
  });
  const coverageBytes = Buffer.from(
    `${JSON.stringify(coverage, null, 2)}\n`,
    "utf8",
  );
  const coverageFileHash = sha256(coverageBytes);

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
      rightsStatement: "Synthetic test pixels.",
    },
    assets: request.items.map((item) => {
      const bytes = bytesByItem.get(item.id)!;
      const isTurnaround = item.id === "turnaround-sheet";
      const isParts = item.id === "parts-front";
      const isFace = item.id === "face-front";
      return {
        candidateId: `candidate-${item.id}`,
        requestItemId: item.id,
        relativeFile: `candidates/${item.id}.png`,
        contentHash: sha256(bytes),
        byteLength: bytes.length,
        mediaType: "image/png" as const,
        width: isTurnaround
          ? turnaround.width
          : isParts
            ? partsAtlas.width
            : isFace
              ? faceAtlas.width
              : 8,
        height: isTurnaround
          ? turnaround.height
          : isParts
            ? partsAtlas.height
            : isFace
              ? faceAtlas.height
              : 8,
        ...(isTurnaround
          ? {
              turnaroundViewCoverageEvidence: {
                schemaVersion: "1.0" as const,
                relativeFile: "evidence/coverage.json",
                contentHash: coverage.contentHash,
                fileContentHash: coverageFileHash,
                byteLength: coverageBytes.length,
              },
            }
          : {}),
      };
    }),
  });
  const inspection = inspectCharacterRigCandidateBundle(request, bundle);
  const stagedCoverage = {
    schemaVersion: "1.0" as const,
    requestItemId: "turnaround-sheet",
    candidateId: "candidate-turnaround-sheet",
    candidateContentHash: turnaroundHash,
    evidenceContentHash: coverage.contentHash,
    evidenceFileContentHash: coverageFileHash,
    sourceRelativeFile: "evidence/coverage.json",
    stagedRelativeFile: `character-rig/coverage-evidence/${coverageFileHash}.json`,
    requiredViews: [...kidsBipedV1RequiredTurnaroundViews] as [
      "front",
      "three-quarter",
      "profile-left",
      "profile-right",
      "rear",
    ],
    views: kidsBipedV1RequiredTurnaroundViews.map((view) => {
      const derived = turnaround.derivedByView.get(view)!;
      return {
        view,
        derivedContentHash: sha256(derived),
        byteLength: derived.length,
        width: 576,
        height: 832,
        stagedRelativeFile: `character-rig/coverage-views/${sha256(derived)}.png`,
      };
    }),
    status: "complete" as const,
  };
  const report = createCharacterRigStagingReport({
    schemaVersion: "1.0",
    reportId: "synthetic-registration-staging",
    requestId: request.requestId,
    requestContentHash: request.contentHash,
    bundleContentHash: bundle.contentHash,
    identityLockContentHash: request.identityLock.contentHash,
    templateContentHash: request.rigProfile.templateContentHash,
    status: "complete",
    returnedItems: [
      ...new Set([...inspection.returnedItems, "turnaround-sheet"]),
    ].sort(),
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
      alphaClass: ["turnaround-sheet", "parts-front", "face-front"].includes(
        asset.requestItemId,
      )
        ? ("mixed-alpha" as const)
        : ("opaque" as const),
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
    stagingReportContentHash: report.contentHash,
    files: report.assets.map((asset) => ({
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
  const receipt = characterRigImportReceiptSchema.parse({
    ...receiptDraft,
    contentHash: hashCanonical(receiptDraft),
  });

  const partsRoles = new Set<string>(frontParts.requiredComponents);
  const partCells = new Map(
    partsAtlas.components.map((component) => [
      component.role,
      component.atlasCell,
    ]),
  );
  const faceCells = new Map(
    faceAtlas.components.map((component) => [
      component.role,
      component.atlasCell,
    ]),
  );
  const sourceFor = (role: string) => {
    const atlasKind = partsRoles.has(role)
      ? ("parts" as const)
      : ("face" as const);
    const atlasCell = (atlasKind === "parts" ? partCells : faceCells).get(role);
    if (!atlasCell)
      throw new Error(`Missing synthetic atlas cell for ${role}.`);
    return {
      requestItemId: atlasKind === "parts" ? "parts-front" : "face-front",
      candidateId:
        atlasKind === "parts"
          ? "candidate-parts-front"
          : "candidate-face-front",
      stagedContentHash:
        atlasKind === "parts"
          ? sha256(partsAtlas.bytes)
          : sha256(faceAtlas.bytes),
      atlasKind,
      atlasCell,
    };
  };
  const guideLandmarks = kidsBipedV1TopologyTemplate.parts
    .flatMap((part) => [
      {
        id: `landmark-${part.role}-a`,
        point: { x: 200, y: 300 },
        visibility: "visible" as const,
      },
      {
        id: `landmark-${part.role}-b`,
        point: { x: 211, y: 307 },
        visibility: "visible" as const,
      },
    ])
    .sort((left, right) => left.id.localeCompare(right.id));
  const annotation = createCandidateRigRegistrationAnnotationMap({
    schemaVersion: "1.0",
    mapKind: "candidate-rig-registration-annotation",
    authorityDomain: "source-review-registration-annotation",
    annotationState: "proposed",
    annotationId: "synthetic-front-annotation",
    view: "front",
    lineage: {
      requestContentHash: request.contentHash,
      candidateBundleContentHash: bundle.contentHash,
      stagingReportContentHash: report.contentHash,
      importReceiptContentHash: receipt.contentHash,
      identityLockContentHash: request.identityLock.contentHash,
      topologyTemplateContentHash: kidsBipedV1TopologyTemplate.contentHash,
    },
    turnaroundGuidance: {
      candidateId: "candidate-turnaround-sheet",
      candidateContentHash: turnaroundHash,
      coverageEvidenceContentHash: coverage.contentHash,
      coverageEvidenceFileContentHash: coverageFileHash,
      derivedViewContentHash: sha256(turnaround.derivedByView.get("front")!),
      width: 576,
      height: 832,
      targetCharacterHeight: 768,
      baselineY: 800,
      semanticDirection: "neutral-front",
      normalizationVerification: "rederived-coverage-cell-alpha-bounds-v1",
      mirroringAllowed: false,
    },
    guideLandmarks,
    parts: kidsBipedV1TopologyTemplate.parts.map((part) => {
      const source = sourceFor(part.role);
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
      source: sourceFor(exposure.role),
      sourceAnchor: {
        id: `exposure-anchor-${exposure.role}`,
        kind: "principal-axis-end" as const,
        atlasKind: sourceFor(exposure.role).atlasKind,
        end: "finish" as const,
      },
      targetAnchorFeatureId: `feature-${exposure.targetRole}-b`,
      registrationMode: "inherit-target-registration" as const,
    })),
    pairDispositions: pairDispositions(),
    occlusionEdges: [
      { behindRole: "torso" as const, inFrontOfRole: "head" as const },
    ],
    reviewStatus: "awaiting-preston-review",
    prestonReviewRecordContentHash: null,
    providerAuthority: false,
    approvalAuthority: false,
    approvalRequired: true,
    productionBindable: false,
  });
  const review = createPrestonCandidateRigRegistrationAnnotationReview({
    schemaVersion: "1.0",
    recordKind: "candidate-rig-registration-annotation-review",
    authorityDomain: "source-review-registration-annotation",
    reviewId: "synthetic-preston-review",
    reviewerId: "preston",
    reviewScope: "measurement-input-only",
    annotationMapContentHash: annotation.contentHash,
    view: "front",
    decision: "accepted-for-measurement",
    checks: {
      visualRoles: true,
      semanticDirection: true,
      featureSemantics: true,
      guidanceLandmarks: true,
      occlusionSemantics: true,
    },
    findings: ["Synthetic fixture only."],
    machineOwned: false,
    providerAuthority: false,
    approvalAuthority: false,
    approvalRequired: true,
    productionBindable: false,
  });
  const program = compileCandidateRigRegistrationMeasurementProgram({
    request,
    bundle,
    stagingReport: report,
    importReceipt: receipt,
    annotationMap: annotation,
    prestonReview: review,
  });
  return {
    request,
    bundle,
    report,
    receipt,
    coverage,
    coverageBytes,
    coverageFileHash,
    turnaround,
    annotation,
    review,
    program,
    partsAtlas,
    faceAtlas,
  };
};

const acceptReview = async (
  review: ReturnType<
    typeof createPrestonCandidateRigRegistrationAnnotationReview
  >,
) => {
  const root = await mkdtemp(join(tmpdir(), "storystage-registration-review-"));
  temporaryRoots.push(root);
  return persistAcceptedPrestonCandidateRigRegistrationReview({
    file: join(root, "preston-review.json"),
    review,
  });
};

const boundaryInput = async (options?: { shiftedExposureRole?: string }) => {
  const fixture = await buildFixture(options);
  const prestonReviewReceipt = await acceptReview(fixture.review);
  return {
    fixture,
    input: {
      request: fixture.request,
      bundle: fixture.bundle,
      stagingReport: fixture.report,
      importReceipt: fixture.receipt,
      measurementProgram: fixture.program,
      atlasRasters: [
        {
          candidateId: "candidate-parts-front",
          bytes: fixture.partsAtlas.bytes,
        },
        { candidateId: "candidate-face-front", bytes: fixture.faceAtlas.bytes },
      ],
      turnaroundSourceBytes: fixture.turnaround.bytes,
      turnaroundCoverageEvidenceBytes: fixture.coverageBytes,
      annotationMap: fixture.annotation,
      prestonReviewReceipt,
    },
  };
};

const resealReview = (
  fixture: Awaited<ReturnType<typeof buildFixture>>,
  annotation: ReturnType<typeof createCandidateRigRegistrationAnnotationMap>,
  reviewId: string,
) => {
  const { contentHash: ignored, ...reviewDraft } = fixture.review;
  void ignored;
  return createPrestonCandidateRigRegistrationAnnotationReview({
    ...reviewDraft,
    reviewId,
    annotationMapContentHash: annotation.contentHash,
  });
};

const compileFor = (
  fixture: Awaited<ReturnType<typeof buildFixture>>,
  annotation: ReturnType<typeof createCandidateRigRegistrationAnnotationMap>,
  review: ReturnType<
    typeof createPrestonCandidateRigRegistrationAnnotationReview
  >,
) =>
  compileCandidateRigRegistrationMeasurementProgram({
    request: fixture.request,
    bundle: fixture.bundle,
    stagingReport: fixture.report,
    importReceipt: fixture.receipt,
    annotationMap: annotation,
    prestonReview: review,
  });

describe("trusted candidate rig registration measurement boundary", () => {
  it("derives a deterministic report from exact source, coverage, program, and atlas bytes", async () => {
    const { input } = await boundaryInput();
    const first = await createTrustedCandidateRigRegistrationMeasurement(input);
    const second =
      await createTrustedCandidateRigRegistrationMeasurement(input);
    expect(first).toEqual(second);
    expect(first.parts).toHaveLength(29);
    expect(first.exposures).toHaveLength(13);
    expect(first.productionBindable).toBe(false);
    expect(isTrustedCandidateRigRegistrationMeasurement(first)).toBe(true);
  });

  it("reports the honest binary64 algorithm contract without a source-identity claim", async () => {
    const { input, fixture } = await boundaryInput();
    const measured =
      await createTrustedCandidateRigRegistrationMeasurement(input);
    expect(fixture.program.algorithm).toEqual(
      candidateRigRegistrationMeasurementAlgorithmContract,
    );
    expect(measured.algorithm).toEqual(
      candidateRigRegistrationMeasurementAlgorithmContract,
    );
    expect(measured.algorithm.solver).toBe("ordered-binary64-procrustes-v1");
    expect(measured.algorithm.crossRuntimeBitExact).toBe(false);
    expect(measured.algorithm.sourceIdentityClaimed).toBe(false);
    expect(measured.repeatabilityScope).toBe(
      "same-runtime-and-engine-build-only",
    );
    expect(measured.behaviorSourceReceiptStatus).toBe("pending");
  });

  it("keeps trusted identity private and recursively immutable", async () => {
    const { input } = await boundaryInput();
    const measured =
      await createTrustedCandidateRigRegistrationMeasurement(input);
    const originalZ = measured.parts[0]!.zIndex;
    expect(Object.isFrozen(measured)).toBe(true);
    expect(Object.isFrozen(measured.parts)).toBe(true);
    expect(Object.isFrozen(measured.parts[0])).toBe(true);
    expect(() => {
      (measured.parts[0] as { zIndex: number }).zIndex = originalZ + 1;
    }).toThrow();
    expect(measured.parts[0]!.zIndex).toBe(originalZ);
    expect(
      isTrustedCandidateRigRegistrationMeasurement(structuredClone(measured)),
    ).toBe(false);
    expect(Object.getOwnPropertySymbols(measured)).toEqual([]);
  });

  it("rejects a raw caller-resealed all-true Preston review without a persisted receipt capability", async () => {
    const { fixture, input } = await boundaryInput();
    const forgedReceipt = {
      schemaVersion: "1.0",
      receiptKind: "persisted-preston-registration-review",
      reviewerId: "preston",
      decision: "accepted-for-measurement",
      annotationMapContentHash: fixture.annotation.contentHash,
      reviewRecordContentHash: fixture.review.contentHash,
      reviewFileContentHash: sha256(
        Buffer.from(JSON.stringify(fixture.review), "utf8"),
      ),
      review: fixture.review,
    };
    await expect(
      createTrustedCandidateRigRegistrationMeasurement({
        ...input,
        prestonReviewReceipt: forgedReceipt,
      }),
    ).rejects.toMatchObject({ code: "invalid-evidence" });
  });

  it("rejects a cloned persisted review receipt because the capability brand is process-local", async () => {
    const { input } = await boundaryInput();
    await expect(
      createTrustedCandidateRigRegistrationMeasurement({
        ...input,
        prestonReviewReceipt: structuredClone(input.prestonReviewReceipt),
      }),
    ).rejects.toMatchObject({ code: "invalid-evidence" });
  });

  it("rejects a regular-file replacement between path inspection and handle validation", async () => {
    const root = await mkdtemp(
      join(tmpdir(), "storystage-registration-review-swap-"),
    );
    temporaryRoots.push(root);
    const reviewFile = join(root, "preston-review.json");
    await writeFile(reviewFile, "original", "utf8");
    const inspected = await lstat(reviewFile);
    await rename(reviewFile, join(root, "original-review.json"));
    await writeFile(reviewFile, "replacement", "utf8");
    await expect(
      readPrivateCandidateRigRegistrationReviewFileSnapshot({
        file: reviewFile,
        inspected: {
          dev: inspected.dev,
          ino: inspected.ino,
          size: inspected.size,
          birthtimeMs: inspected.birthtimeMs,
          ctimeMs: inspected.ctimeMs,
        },
      }),
    ).rejects.toThrow(/changed after path inspection/i);
  });

  it("binds the opened review handle to the exact inspected byte length", async () => {
    const root = await mkdtemp(
      join(tmpdir(), "storystage-registration-review-size-"),
    );
    temporaryRoots.push(root);
    const reviewFile = join(root, "preston-review.json");
    await writeFile(reviewFile, "review-bytes", "utf8");
    const inspected = await lstat(reviewFile);
    await expect(
      readPrivateCandidateRigRegistrationReviewFileSnapshot({
        file: reviewFile,
        inspected: {
          dev: inspected.dev,
          ino: inspected.ino,
          size: inspected.size + 1,
          birthtimeMs: inspected.birthtimeMs,
          ctimeMs: inspected.ctimeMs,
        },
      }),
    ).rejects.toThrow(/changed after path inspection/i);
  });

  it("rejects exact imported-ledger substitution", async () => {
    const { fixture, input } = await boundaryInput();
    const { contentHash: ignored, ...receiptDraft } = fixture.receipt;
    void ignored;
    const substitutedDraft = {
      ...receiptDraft,
      importId: "synthetic-registration-import-substituted",
    };
    const substitutedReceipt = characterRigImportReceiptSchema.parse({
      ...substitutedDraft,
      contentHash: hashCanonical(substitutedDraft),
    });
    await expect(
      createTrustedCandidateRigRegistrationMeasurement({
        ...input,
        importReceipt: substitutedReceipt,
      }),
    ).rejects.toThrow(/hash|lineage|invalid|ledger/i);
  });

  it("rejects a validly resealed substituted measurement program", async () => {
    const { fixture, input } = await boundaryInput();
    const raw = structuredClone(fixture.program);
    raw.partSources[0]!.source.atlasCell.x += 1;
    const { contentHash: ignored, ...draft } = raw;
    void ignored;
    const substituted = candidateRigRegistrationMeasurementProgramSchema.parse({
      ...draft,
      contentHash: hashCanonical(draft),
    });
    await expect(
      createTrustedCandidateRigRegistrationMeasurement({
        ...input,
        measurementProgram: substituted,
      }),
    ).rejects.toThrow(/exact recompiled registration measurement program/i);
  });

  it("rejects crosswired explicit role-source bindings during compilation", async () => {
    const { fixture } = await boundaryInput();
    const raw = structuredClone(fixture.annotation);
    const torso = raw.parts.find((part) => part.role === "torso")!;
    const faceSource = raw.parts.find(
      (part) => part.source.atlasKind === "face",
    )!.source;
    torso.source = {
      ...faceSource,
      atlasCell: { x: 140, y: 40, width: 20, height: 20 },
    };
    torso.sourceFeatures = torso.sourceFeatures.map((feature) => ({
      ...feature,
      atlasKind: "face" as const,
    }));
    const { contentHash: ignored, ...draft } = raw;
    void ignored;
    const annotation = createCandidateRigRegistrationAnnotationMap(draft);
    const review = resealReview(fixture, annotation, "crosswire-review");
    expect(() => compileFor(fixture, annotation, review)).toThrow(
      /exact allowed request|source mapping|ledger entry/i,
    );
  });

  it("rejects turnaround source byte mutation", async () => {
    const { input } = await boundaryInput();
    const mutated = Buffer.from(input.turnaroundSourceBytes);
    mutated[Math.floor(mutated.length / 2)]! ^= 1;
    await expect(
      createTrustedCandidateRigRegistrationMeasurement({
        ...input,
        turnaroundSourceBytes: mutated,
      }),
    ).rejects.toThrow(/hash|exact|turnaround/i);
  });

  it("rejects an exact-length coverage file-hash mismatch", async () => {
    const { input } = await boundaryInput();
    const mutated = Buffer.from(input.turnaroundCoverageEvidenceBytes);
    const newline = mutated.indexOf(10);
    expect(newline).toBeGreaterThan(0);
    mutated[newline] = 32;
    await expect(
      createTrustedCandidateRigRegistrationMeasurement({
        ...input,
        turnaroundCoverageEvidenceBytes: mutated,
      }),
    ).rejects.toThrow(/file hash|coverage|lineage/i);
  });

  it("rejects atlas byte mutation by exact candidate id", async () => {
    const { input } = await boundaryInput();
    const mutated = Buffer.from(input.atlasRasters[0]!.bytes);
    mutated[Math.floor(mutated.length / 2)]! ^= 1;
    await expect(
      createTrustedCandidateRigRegistrationMeasurement({
        ...input,
        atlasRasters: [
          { ...input.atlasRasters[0]!, bytes: mutated },
          input.atlasRasters[1]!,
        ],
      }),
    ).rejects.toThrow(/hash|atlas|candidate/i);
  });

  it("uses explicit pivot ids independent of feature order and rejects a stale wrong-pivot program", async () => {
    const { fixture, input } = await boundaryInput();
    const original =
      await createTrustedCandidateRigRegistrationMeasurement(input);
    const raw = structuredClone(fixture.annotation);
    const torso = raw.parts.find((part) => part.role === "torso")!;
    const centroid = torso.sourceFeatures[0]!;
    const principal = torso.sourceFeatures[1]!;
    torso.sourceFeatures = [
      { ...principal, id: centroid.id },
      { ...centroid, id: principal.id },
    ];
    torso.childPivotFeatureId = centroid.id;
    const centroidLandmark = torso.alignments[0]!.guidanceLandmarkId;
    const principalLandmark = torso.alignments[1]!.guidanceLandmarkId;
    torso.alignments = [
      {
        sourceFeatureId: centroid.id,
        guidanceLandmarkId: principalLandmark,
      },
      {
        sourceFeatureId: principal.id,
        guidanceLandmarkId: centroidLandmark,
      },
    ];
    const { contentHash: ignored, ...draft } = raw;
    void ignored;
    const annotation = createCandidateRigRegistrationAnnotationMap(draft);
    const review = resealReview(fixture, annotation, "pivot-order-review");
    const program = compileFor(fixture, annotation, review);
    const prestonReviewReceipt = await acceptReview(review);
    const reordered = await createTrustedCandidateRigRegistrationMeasurement({
      ...input,
      measurementProgram: program,
      annotationMap: annotation,
      prestonReviewReceipt,
    });
    expect(reordered.parts[0]!.childPivotFeatureId).toBe(centroid.id);
    expect(reordered.parts[0]!.childPivot).toEqual(
      original.parts[0]!.childPivot,
    );

    const wrongRaw = structuredClone(fixture.annotation);
    wrongRaw.parts[0]!.childPivotFeatureId =
      wrongRaw.parts[0]!.sourceFeatures[0]!.id;
    const { contentHash: wrongHash, ...wrongDraft } = wrongRaw;
    void wrongHash;
    const wrongAnnotation =
      createCandidateRigRegistrationAnnotationMap(wrongDraft);
    const wrongReview = resealReview(
      fixture,
      wrongAnnotation,
      "wrong-pivot-review",
    );
    const wrongReviewReceipt = await acceptReview(wrongReview);
    await expect(
      createTrustedCandidateRigRegistrationMeasurement({
        ...input,
        annotationMap: wrongAnnotation,
        prestonReviewReceipt: wrongReviewReceipt,
      }),
    ).rejects.toThrow(/exact recompiled registration measurement program/i);
  });

  it("preserves reviewed z semantics and accepts no caller-owned report geometry", async () => {
    const { input } = await boundaryInput();
    const measured =
      await createTrustedCandidateRigRegistrationMeasurement(input);
    const torso = measured.parts.find((part) => part.role === "torso")!;
    const head = measured.parts.find((part) => part.role === "head")!;
    expect(torso.zIndex).toBeLessThan(head.zIndex);
    expect(Number.isInteger(torso.restTransform.xMicropixels)).toBe(true);
    expect(Number.isInteger(torso.fit.absoluteScaleMillionths)).toBe(true);
    expect(createTrustedCandidateRigRegistrationMeasurement.length).toBe(1);
  });

  it("rejects a shifted same-canvas exposure instead of inheriting registration from dimensions alone", async () => {
    const shiftedExposureRole = kidsBipedV1TopologyTemplate.exposures[0]!.role;
    const { input } = await boundaryInput({ shiftedExposureRole });
    await expect(
      createTrustedCandidateRigRegistrationMeasurement(input),
    ).rejects.toThrow(/pixel-derived source\/target anchor match/i);
  });

  it("executes the published Math.hypot known answer and Number.EPSILON degeneracy rule", () => {
    const quarterTurn = solveCandidateRigRegistrationSimilarity(
      [
        { x: 0, y: 0 },
        { x: 2, y: 0 },
      ],
      [
        { x: 4, y: 5 },
        { x: 4, y: 9 },
      ],
      "known-answer",
    );
    expect(quarterTurn.scale).toBe(2);
    expect(quarterTurn.rotation).toBeCloseTo(Math.PI / 2, 15);
    expect(quarterTurn.x).toBeCloseTo(4, 15);
    expect(quarterTurn.y).toBeCloseTo(5, 15);
    expect(quarterTurn.residualMicropixels).toBe(0);
    expect(() =>
      solveCandidateRigRegistrationSimilarity(
        [
          { x: 0, y: 0 },
          { x: Number.EPSILON / 4, y: 0 },
        ],
        [
          { x: 0, y: 0 },
          { x: 1, y: 0 },
        ],
        "epsilon-degenerate",
      ),
    ).toThrow(/degenerate/i);
  });

  it("fails closed on sealed lower-face selectors until exact anchors exist", async () => {
    const { fixture, input } = await boundaryInput();
    const raw = structuredClone(fixture.annotation);
    const mouth = raw.parts.find((part) => part.role === "mouth-rest")!;
    mouth.sourceFeatures[0] = {
      id: mouth.sourceFeatures[0]!.id,
      kind: "sealed-lower-face-anchor",
      atlasKind: "face",
      anchor: "pivot",
      contractContentHash: hashCanonical({ synthetic: "not-sealed" }),
    };
    const { contentHash: ignored, ...draft } = raw;
    void ignored;
    const annotation = createCandidateRigRegistrationAnnotationMap(draft);
    const review = resealReview(fixture, annotation, "lower-face-review");
    const program = compileFor(fixture, annotation, review);
    const prestonReviewReceipt = await acceptReview(review);
    await expect(
      createTrustedCandidateRigRegistrationMeasurement({
        ...input,
        measurementProgram: program,
        annotationMap: annotation,
        prestonReviewReceipt,
      }),
    ).rejects.toEqual(
      expect.objectContaining<
        Partial<CandidateRigRegistrationMeasurementError>
      >({
        code: "selector-unavailable",
      }),
    );
  });
});
