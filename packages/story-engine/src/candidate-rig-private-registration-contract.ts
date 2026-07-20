import { z } from "zod";
import { hashCanonical } from "./canonical-hash";
import { kidsBipedV1TopologyTemplate } from "./character-rig-acquisition";
import { hashSchema, identifierSchema } from "./model";

const viewSchema = z.enum(["front", "profile-left", "profile-right"]);
const sideSchema = z.enum(["top", "right", "bottom", "left"]);
const featureClassSchema = z.enum([
  "articulation-proximal",
  "articulation-distal",
  "rigid-registration",
  "mask-only",
]);
const registrationPointBasisSchema = z.enum([
  "mechanical-seam",
  "guide-proposed",
  "shared-profile-coordinate",
  "rigid-decoration",
]);
const pointMicropixelsSchema = z
  .object({ x: z.number().int(), y: z.number().int() })
  .strict();
const rectSchema = z
  .object({
    x: z.number().int().nonnegative(),
    y: z.number().int().nonnegative(),
    width: z.number().int().positive(),
    height: z.number().int().positive(),
  })
  .strict();
const runSchema = z
  .object({
    y: z.number().int().nonnegative(),
    x: z.number().int().nonnegative(),
    length: z.number().int().positive(),
  })
  .strict();

const hashBound = <Shape extends z.ZodRawShape>(shape: Shape) =>
  z
    .object({ ...shape, contentHash: hashSchema })
    .strict()
    .superRefine((value, context) => {
      const { contentHash, ...draft } = value as Record<string, unknown> & {
        contentHash: string;
      };
      if (hashCanonical(draft) !== contentHash)
        context.addIssue({
          code: "custom",
          path: ["contentHash"],
          message: "Private registration artifact hash is invalid.",
        });
    });

const maskEvidenceSchema = z
  .object({
    width: z.number().int().positive().max(8192),
    height: z.number().int().positive().max(8192),
    runs: z.array(runSchema),
    runLengthEncodingContentHash: hashSchema,
    pixelCount: z.number().int().nonnegative(),
    bounds: rectSchema.nullable(),
  })
  .strict()
  .superRefine((mask, context) => {
    const occupied = new Set<number>();
    let pixelCount = 0;
    let left = mask.width;
    let top = mask.height;
    let right = -1;
    let bottom = -1;
    let previousKey = -1;
    for (const [index, run] of mask.runs.entries()) {
      const key = run.y * mask.width + run.x;
      if (
        run.y >= mask.height ||
        run.x + run.length > mask.width ||
        key <= previousKey
      )
        context.addIssue({
          code: "custom",
          path: ["runs", index],
          message:
            "Mask runs must be in-bounds, non-empty, and canonically ordered.",
        });
      previousKey = key;
      for (let x = run.x; x < run.x + run.length; x += 1) {
        const pixel = run.y * mask.width + x;
        if (occupied.has(pixel))
          context.addIssue({
            code: "custom",
            path: ["runs", index],
            message: "Mask runs cannot overlap.",
          });
        occupied.add(pixel);
        pixelCount += 1;
        left = Math.min(left, x);
        top = Math.min(top, run.y);
        right = Math.max(right, x);
        bottom = Math.max(bottom, run.y);
      }
    }
    const bounds =
      pixelCount === 0
        ? null
        : {
            x: left,
            y: top,
            width: right - left + 1,
            height: bottom - top + 1,
          };
    if (
      mask.runLengthEncodingContentHash !== hashCanonical(mask.runs) ||
      mask.pixelCount !== pixelCount ||
      hashCanonical(mask.bounds) !== hashCanonical(bounds)
    )
      context.addIssue({
        code: "custom",
        message: "Mask evidence does not match its exact canonical runs.",
      });
  });

export const candidateRigAuthoredIsolatedMaskEvidenceSchema = hashBound({
  schemaVersion: z.literal("1.0"),
  evidenceKind: z.literal("candidate-rig-authored-isolated-mask-evidence"),
  authorityDomain: z.literal("private-source-review-registration"),
  evidenceId: identifierSchema,
  baseMeasurementContentHash: hashSchema,
  view: viewSchema,
  componentId: identifierSchema,
  componentRole: z.enum(["secondary-front", "secondary-back"]),
  sourceCandidateId: identifierSchema,
  sourceContentHash: hashSchema,
  sourceRgbaContentHash: hashSchema,
  sourceRect: rectSchema,
  maskedRgbaContentHash: hashSchema,
  guideTabMask: maskEvidenceSchema,
  retainedSemanticSupportMask: maskEvidenceSchema,
  sourceMeasuredBeforeMasking: z.literal(true),
  maskOnly: z.literal(true),
  providerAuthority: z.literal(false),
  approvalAuthority: z.literal(false),
  capabilityAuthority: z.literal(false),
  productionBindable: z.literal(false),
}).superRefine((evidence, context) => {
  if (
    evidence.sourceRgbaContentHash === evidence.maskedRgbaContentHash ||
    evidence.guideTabMask.pixelCount === 0 ||
    evidence.retainedSemanticSupportMask.pixelCount === 0
  )
    context.addIssue({
      code: "custom",
      message:
        "Authored isolated-mask evidence must be non-empty and change the exact source RGBA.",
    });
  for (const [name, mask] of [
    ["guideTabMask", evidence.guideTabMask],
    ["retainedSemanticSupportMask", evidence.retainedSemanticSupportMask],
  ] as const)
    if (
      mask.width !== evidence.sourceRect.width ||
      mask.height !== evidence.sourceRect.height
    )
      context.addIssue({
        code: "custom",
        path: [name],
        message:
          "Authored isolated-mask evidence must use exact source-component dimensions.",
      });
});

export type CandidateRigAuthoredIsolatedMaskEvidence = z.infer<
  typeof candidateRigAuthoredIsolatedMaskEvidenceSchema
>;

const pixelSetForMask = (mask: z.infer<typeof maskEvidenceSchema>) => {
  const pixels = new Set<number>();
  for (const run of mask.runs)
    for (let x = run.x; x < run.x + run.length; x += 1)
      pixels.add(run.y * mask.width + x);
  return pixels;
};

const expectedDilatedMask = (
  source: z.infer<typeof maskEvidenceSchema>,
  radius: number,
) => {
  const pixels = new Set<number>();
  for (const pixel of pixelSetForMask(source)) {
    const sourceX = pixel % source.width;
    const sourceY = Math.floor(pixel / source.width);
    for (
      let y = Math.max(0, sourceY - radius);
      y <= Math.min(source.height - 1, sourceY + radius);
      y += 1
    )
      for (
        let x = Math.max(0, sourceX - radius);
        x <= Math.min(source.width - 1, sourceX + radius);
        x += 1
      )
        pixels.add(y * source.width + x);
  }
  const runs: Array<{ y: number; x: number; length: number }> = [];
  for (let y = 0; y < source.height; y += 1) {
    let x = 0;
    while (x < source.width) {
      if (!pixels.has(y * source.width + x)) {
        x += 1;
        continue;
      }
      const start = x;
      while (x < source.width && pixels.has(y * source.width + x)) x += 1;
      runs.push({ y, x: start, length: x - start });
    }
  }
  let left = source.width;
  let top = source.height;
  let right = -1;
  let bottom = -1;
  for (const pixel of pixels) {
    const x = pixel % source.width;
    const y = Math.floor(pixel / source.width);
    left = Math.min(left, x);
    top = Math.min(top, y);
    right = Math.max(right, x);
    bottom = Math.max(bottom, y);
  }
  return {
    width: source.width,
    height: source.height,
    runs,
    runLengthEncodingContentHash: hashCanonical(runs),
    pixelCount: pixels.size,
    bounds:
      pixels.size === 0
        ? null
        : {
            x: left,
            y: top,
            width: right - left + 1,
            height: bottom - top + 1,
          },
  };
};

const seamSchema = z
  .object({
    side: sideSchema,
    startMicropixels: pointMicropixelsSchema,
    endMicropixels: pointMicropixelsSchema,
    midpointMicropixels: pointMicropixelsSchema,
    tangentMillionths: pointMicropixelsSchema,
    outwardNormalMillionths: pointMicropixelsSchema,
    widthMicropixels: z.number().int().positive(),
  })
  .strict()
  .superRefine((seam, context) => {
    const midpoint = {
      x: Math.round((seam.startMicropixels.x + seam.endMicropixels.x) / 2),
      y: Math.round((seam.startMicropixels.y + seam.endMicropixels.y) / 2),
    };
    const dot =
      seam.tangentMillionths.x * seam.outwardNormalMillionths.x +
      seam.tangentMillionths.y * seam.outwardNormalMillionths.y;
    const tangentLength = Math.hypot(
      seam.tangentMillionths.x,
      seam.tangentMillionths.y,
    );
    const normalLength = Math.hypot(
      seam.outwardNormalMillionths.x,
      seam.outwardNormalMillionths.y,
    );
    const measuredWidth = Math.round(
      Math.hypot(
        seam.endMicropixels.x - seam.startMicropixels.x,
        seam.endMicropixels.y - seam.startMicropixels.y,
      ),
    );
    if (
      midpoint.x !== seam.midpointMicropixels.x ||
      midpoint.y !== seam.midpointMicropixels.y ||
      dot !== 0 ||
      tangentLength !== 1_000_000 ||
      normalLength !== 1_000_000 ||
      measuredWidth !== seam.widthMicropixels
    )
      context.addIssue({
        code: "custom",
        message:
          "Seam midpoint, tangent, normal, and width must be exact rational geometry.",
      });
  });

const attachmentCandidateSchema = z
  .object({
    candidateId: identifierSchema,
    componentId: identifierSchema,
    semanticRole: identifierSchema,
    featureClass: featureClassSchema,
    sourceRgbaContentHash: hashSchema,
    physicalFeatureContentHash: hashSchema,
    sourceRect: rectSchema,
    seed: z
      .object({
        side: sideSchema,
        x: z.number().int().nonnegative(),
        y: z.number().int().nonnegative(),
        stableAlphaThreshold: z.literal(96),
        edgeScanInsetPixels: z.literal(1),
      })
      .strict(),
    seam: seamSchema,
    selectedSupport: maskEvidenceSchema,
    retainedSemanticCore: maskEvidenceSchema,
    semanticCoreOverlapPixelCount: z.literal(0),
    derivedBeforeMasking: z.literal(true),
    guideCoordinatesUsed: z.literal(false),
    transformAuthority: z.literal(false),
    authoredMaskEvidence: z
      .object({
        evidenceId: identifierSchema,
        evidenceContentHash: hashSchema,
        originalRgbaContentHash: hashSchema,
        maskedRgbaContentHash: hashSchema,
        guideTabMaskRunLengthEncodingContentHash: hashSchema,
        retainedSemanticSupportRunLengthEncodingContentHash: hashSchema,
        originalAndMaskedDistinct: z.literal(true),
        semanticSupportRetained: z.literal(true),
        guideTabPixelsRemoved: z.literal(true),
        maskAuthority: z.literal(false),
        transformAuthority: z.literal(false),
        runtimeNodeCreated: z.literal(false),
        motionChannelCreated: z.literal(false),
        approvalAuthority: z.literal(false),
        productionBindable: z.literal(false),
      })
      .strict()
      .optional(),
  })
  .strict()
  .superRefine((candidate, context) => {
    const selected = new Set<number>();
    const retained = new Set<number>();
    for (const run of candidate.selectedSupport.runs)
      for (let x = run.x; x < run.x + run.length; x += 1)
        selected.add(run.y * candidate.selectedSupport.width + x);
    for (const run of candidate.retainedSemanticCore.runs)
      for (let x = run.x; x < run.x + run.length; x += 1)
        retained.add(run.y * candidate.retainedSemanticCore.width + x);
    const overlap = [...selected].filter((pixel) => retained.has(pixel)).length;
    const expectedPhysicalFeatureContentHash = hashCanonical({
      componentId: candidate.componentId,
      sourceRgbaContentHash: candidate.sourceRgbaContentHash,
      seed: candidate.seed,
      seam: candidate.seam,
      selectedSupport: candidate.selectedSupport,
      ...(candidate.authoredMaskEvidence
        ? { authoredMaskEvidence: candidate.authoredMaskEvidence }
        : {}),
    });
    const seamPoints = [
      candidate.seam.startMicropixels,
      candidate.seam.endMicropixels,
      candidate.seam.midpointMicropixels,
    ];
    if (
      candidate.selectedSupport.width !==
        candidate.retainedSemanticCore.width ||
      candidate.selectedSupport.height !==
        candidate.retainedSemanticCore.height ||
      candidate.selectedSupport.width !== candidate.sourceRect.width ||
      candidate.selectedSupport.height !== candidate.sourceRect.height ||
      candidate.semanticCoreOverlapPixelCount !== overlap ||
      candidate.physicalFeatureContentHash !==
        expectedPhysicalFeatureContentHash ||
      (candidate.featureClass === "mask-only") !==
        (candidate.authoredMaskEvidence !== undefined) ||
      (candidate.authoredMaskEvidence !== undefined &&
        (candidate.authoredMaskEvidence.originalRgbaContentHash !==
          candidate.sourceRgbaContentHash ||
          candidate.authoredMaskEvidence
            .guideTabMaskRunLengthEncodingContentHash !==
            candidate.selectedSupport.runLengthEncodingContentHash)) ||
      candidate.seed.side !== candidate.seam.side ||
      candidate.seed.x >= candidate.sourceRect.width ||
      candidate.seed.y >= candidate.sourceRect.height ||
      seamPoints.some(
        (point) =>
          point.x < 0 ||
          point.y < 0 ||
          point.x > candidate.sourceRect.width * 1_000_000 ||
          point.y > candidate.sourceRect.height * 1_000_000,
      )
    )
      context.addIssue({
        code: "custom",
        message:
          "Attachment candidate semantic-core overlap must be recomputed from exact mask runs.",
      });
  });

const typedOutcomeSchema = z.discriminatedUnion("status", [
  z
    .object({
      status: z.literal("detected"),
      candidateIds: z.array(identifierSchema).min(1),
    })
    .strict(),
  z
    .object({
      status: z.literal("missing"),
      reasonCode: z.literal("missing-feature"),
      detail: z.string().min(1),
    })
    .strict(),
  z
    .object({
      status: z.literal("insufficient"),
      reasonCode: z.literal("insufficient-feature"),
      detail: z.string().min(1),
    })
    .strict(),
  z
    .object({
      status: z.literal("ambiguous"),
      reasonCode: z.literal("ambiguous-feature"),
      candidateIds: z.array(identifierSchema).min(2),
      detail: z.string().min(1),
    })
    .strict(),
  z
    .object({
      status: z.literal("alpha-indistinguishable"),
      reasonCode: z.literal("alpha-indistinguishable-mask"),
      detail: z.string().min(1),
    })
    .strict(),
]);

const componentMeasurementSchema = z
  .object({
    componentId: identifierSchema,
    semanticRole: identifierSchema,
    sourceCandidateId: identifierSchema,
    sourceContentHash: hashSchema,
    sourceRgbaContentHash: hashSchema,
    sourceRect: rectSchema,
    supportMask: maskEvidenceSchema,
    coreMask: maskEvidenceSchema,
    plausibilityRegion: z
      .object({
        algorithm: z
          .object({
            id: z.literal("support-mask-chebyshev-dilation"),
            version: z.literal("1.0.0"),
            radiusPixels: z.number().int().min(4).max(16),
          })
          .strict(),
        sourceSupportRunLengthEncodingContentHash: hashSchema,
        mask: maskEvidenceSchema,
        contentHash: hashSchema,
      })
      .strict()
      .superRefine((region, context) => {
        const { contentHash, ...draft } = region;
        if (hashCanonical(draft) !== contentHash)
          context.addIssue({
            code: "custom",
            path: ["contentHash"],
            message: "Plausibility-region hash is invalid.",
          });
      }),
    candidates: z.array(attachmentCandidateSchema),
    rejectedCandidateReasons: z.array(z.string().min(1)),
  })
  .strict();

const attachmentRequirementSchema = z
  .object({
    requirementId: identifierSchema,
    featureClass: featureClassSchema,
    componentRole: identifierSchema,
    topologyEdge: z
      .object({
        parentRole: identifierSchema,
        childRole: identifierSchema,
        socketId: identifierSchema,
      })
      .strict()
      .nullable(),
    outcome: typedOutcomeSchema,
  })
  .strict();

const measurementReportFields = {
  schemaVersion: z.enum(["1.0", "1.1"]),
  reportKind: z.literal("candidate-rig-exact-attachment-measurement"),
  authorityDomain: z.literal("private-source-review-registration"),
  reportId: identifierSchema,
  view: viewSchema,
  status: z.enum(["ready-for-unapproved-proposal", "blocked-source-geometry"]),
  lineage: z
    .object({
      requestContentHash: hashSchema,
      candidateBundleContentHash: hashSchema,
      stagingReportContentHash: hashSchema,
      importReceiptContentHash: hashSchema,
      preparationRecipeContentHash: hashSchema,
      topologyTemplateContentHash: z.literal(
        kidsBipedV1TopologyTemplate.contentHash,
      ),
    })
    .strict(),
  atlases: z
    .array(
      z
        .object({
          kind: z.enum(["parts-kit", "face-kit"]),
          candidateId: identifierSchema,
          sourceContentHash: hashSchema,
          sourceRgbaContentHash: hashSchema,
          width: z.number().int().positive(),
          height: z.number().int().positive(),
          channels: z.literal(4),
          decodedWithoutResampling: z.literal(true),
        })
        .strict(),
    )
    .length(2),
  algorithm: z
    .object({
      id: z.literal("exact-alpha-edge-seam-measurement"),
      version: z.literal("1.0.0"),
      implementationContentHash: hashSchema,
      classificationContractContentHash: hashSchema,
      decoderContractContentHash: hashSchema,
    })
    .strict(),
  components: z.array(componentMeasurementSchema).min(1),
  requirements: z.array(attachmentRequirementSchema).min(1),
  blockerRequirementIds: z.array(identifierSchema),
  authoredMaskCompiler: z
    .object({
      id: z.literal("authored-isolated-decoration-mask-compiler"),
      version: z.literal("1.0.0"),
      baseMeasurementContentHash: hashSchema,
      implementationContentHash: hashSchema,
      evidenceContentHashes: z.array(hashSchema).min(1),
      exactSourceRgbaVerified: z.literal(true),
      originalAndMaskedDistinct: z.literal(true),
      semanticSupportRetained: z.literal(true),
      guideTabPixelsRemoved: z.literal(true),
      providerAuthority: z.literal(false),
      approvalAuthority: z.literal(false),
      capabilityAuthority: z.literal(false),
      productionBindable: z.literal(false),
    })
    .strict()
    .optional(),
  sourceMeasuredBeforeMasking: z.literal(true),
  guideCoordinatesUsedForMeasurement: z.literal(false),
  proposedRegistrationAuthority: z.literal(false),
  approvalAuthority: z.literal(false),
  capabilityAuthority: z.literal(false),
  productionBindable: z.literal(false),
};

export const candidateRigExactAttachmentMeasurementReportSchema = hashBound(
  measurementReportFields,
).superRefine((report, context) => {
  const authoredEvidenceHashes = report.components
    .flatMap((component) => component.candidates)
    .flatMap((candidate) =>
      candidate.authoredMaskEvidence
        ? [candidate.authoredMaskEvidence.evidenceContentHash]
        : [],
    )
    .sort((left, right) => left.localeCompare(right));
  if (
    (report.schemaVersion === "1.1") !==
      (report.authoredMaskCompiler !== undefined) ||
    (report.authoredMaskCompiler !== undefined &&
      (new Set(report.authoredMaskCompiler.evidenceContentHashes).size !==
        report.authoredMaskCompiler.evidenceContentHashes.length ||
        hashCanonical(
          [...report.authoredMaskCompiler.evidenceContentHashes].sort(),
        ) !== hashCanonical(authoredEvidenceHashes)))
  )
    context.addIssue({
      code: "custom",
      path: ["authoredMaskCompiler"],
      message:
        "Version 1.1 measurement must bind every authored isolated-mask evidence hash exactly once.",
    });
  const blockers = report.requirements
    .filter((requirement) => requirement.outcome.status !== "detected")
    .map((requirement) => requirement.requirementId)
    .sort((left, right) => left.localeCompare(right));
  if (
    hashCanonical(blockers) !== hashCanonical(report.blockerRequirementIds) ||
    (blockers.length === 0) !==
      (report.status === "ready-for-unapproved-proposal")
  )
    context.addIssue({
      code: "custom",
      message:
        "Measurement status and blocker ids must match exact typed requirement outcomes.",
    });
  const componentIds = report.components.map(
    (component) => component.componentId,
  );
  const componentRoles = report.components.map(
    (component) => component.semanticRole,
  );
  const atlasKinds = report.atlases.map((atlas) => atlas.kind);
  const requirementIds = report.requirements.map(
    (requirement) => requirement.requirementId,
  );
  const candidateIds = report.components.flatMap((component) =>
    component.candidates.map((candidate) => candidate.candidateId),
  );
  if (
    new Set(componentIds).size !== componentIds.length ||
    new Set(componentRoles).size !== componentRoles.length ||
    new Set(atlasKinds).size !== atlasKinds.length ||
    new Set(requirementIds).size !== requirementIds.length ||
    new Set(candidateIds).size !== candidateIds.length
  )
    context.addIssue({
      code: "custom",
      message:
        "Atlas kinds, measured component ids/roles, requirement ids, and attachment candidate ids must be unique.",
    });
  const candidateById = new Map(
    report.components.flatMap((component) =>
      component.candidates.map(
        (candidate) => [candidate.candidateId, candidate] as const,
      ),
    ),
  );
  for (const [componentIndex, component] of report.components.entries()) {
    const expectedRadius = Math.max(
      4,
      Math.min(
        16,
        Math.round(
          Math.max(component.supportMask.width, component.supportMask.height) *
            0.02,
        ),
      ),
    );
    const expectedRegionMask = expectedDilatedMask(
      component.supportMask,
      expectedRadius,
    );
    if (
      component.plausibilityRegion.sourceSupportRunLengthEncodingContentHash !==
        component.supportMask.runLengthEncodingContentHash ||
      component.supportMask.width !== component.sourceRect.width ||
      component.supportMask.height !== component.sourceRect.height ||
      component.coreMask.width !== component.sourceRect.width ||
      component.coreMask.height !== component.sourceRect.height ||
      component.plausibilityRegion.mask.width !== component.sourceRect.width ||
      component.plausibilityRegion.mask.height !==
        component.sourceRect.height ||
      component.plausibilityRegion.algorithm.radiusPixels !== expectedRadius ||
      hashCanonical(component.plausibilityRegion.mask) !==
        hashCanonical(expectedRegionMask)
    )
      context.addIssue({
        code: "custom",
        path: ["components", componentIndex, "plausibilityRegion"],
        message: "Plausibility region must bind the exact support-mask runs.",
      });
    for (const [candidateIndex, candidate] of component.candidates.entries())
      if (
        candidate.componentId !== component.componentId ||
        candidate.semanticRole !== component.semanticRole ||
        candidate.sourceRgbaContentHash !== component.sourceRgbaContentHash ||
        hashCanonical(candidate.sourceRect) !==
          hashCanonical(component.sourceRect)
      )
        context.addIssue({
          code: "custom",
          path: ["components", componentIndex, "candidates", candidateIndex],
          message:
            "Attachment candidate must bind its exact enclosing component geometry.",
        });
  }
  const candidateIdSet = new Set(candidateIds);
  const detectedPhysicalUses = new Map<string, number>();
  for (const [index, requirement] of report.requirements.entries()) {
    const referenced =
      requirement.outcome.status === "detected" ||
      requirement.outcome.status === "ambiguous"
        ? requirement.outcome.candidateIds
        : [];
    if (
      requirement.outcome.status === "detected" &&
      requirement.outcome.candidateIds.length !== 1
    )
      context.addIssue({
        code: "custom",
        path: ["requirements", index, "outcome", "candidateIds"],
        message: "Detected attachment outcome must bind exactly one candidate.",
      });
    if (referenced.some((candidateId) => !candidateIdSet.has(candidateId)))
      context.addIssue({
        code: "custom",
        path: ["requirements", index, "outcome"],
        message: "Attachment outcome references an undeclared exact candidate.",
      });
    for (const candidateId of referenced) {
      const candidate = candidateById.get(candidateId);
      if (
        candidate &&
        (candidate.featureClass !== requirement.featureClass ||
          candidate.semanticRole !== requirement.componentRole)
      )
        context.addIssue({
          code: "custom",
          path: ["requirements", index, "outcome"],
          message:
            "Attachment outcome candidate does not match the required feature class and component role.",
        });
      if (candidate && requirement.outcome.status === "detected")
        detectedPhysicalUses.set(
          candidate.physicalFeatureContentHash,
          (detectedPhysicalUses.get(candidate.physicalFeatureContentHash) ??
            0) + 1,
        );
    }
  }
  if ([...detectedPhysicalUses.values()].some((count) => count > 1))
    context.addIssue({
      code: "custom",
      path: ["requirements"],
      message:
        "One physical attachment feature cannot mechanically satisfy multiple semantic requirements.",
    });
});

const proposedPointSchema = z
  .object({
    requirementId: identifierSchema,
    pointMicropixels: pointMicropixelsSchema,
    basis: registrationPointBasisSchema,
    sourceFeatureIds: z.array(identifierSchema),
    plausibilityRegionContentHash: hashSchema,
  })
  .strict();

const registrationProposalFields = {
  schemaVersion: z.literal("1.0"),
  artifactKind: z.literal("candidate-rig-unapproved-registration-proposal"),
  authorityDomain: z.literal("private-source-review-registration"),
  proposalId: identifierSchema,
  view: viewSchema,
  measurementReportContentHash: hashSchema,
  guideProposalInputContentHash: hashSchema,
  guideCoordinatesAuthority: z.literal(false),
  warningLabel: z.literal(
    "Unapproved registration proposal for human correction",
  ),
  parts: z.array(
    z
      .object({
        role: identifierSchema,
        childPivot: proposedPointSchema,
        zIndex: z.number().int(),
        transformMode: z.enum([
          "articulated",
          "translation-only-inherit-rotation-scale",
        ]),
      })
      .strict(),
  ),
  sockets: z.array(
    z
      .object({
        parentRole: identifierSchema,
        childRole: identifierSchema,
        socketId: identifierSchema,
        motionChannelId: identifierSchema,
        position: proposedPointSchema,
        zIndex: z.number().int(),
        sharedPivotGroupId: identifierSchema.nullable(),
      })
      .strict(),
  ),
  attachments: z.array(
    z
      .object({
        attachmentId: identifierSchema,
        parentRole: identifierSchema,
        childRole: identifierSchema,
        socketId: identifierSchema,
        attachmentClass: z.enum([
          "articulation-proximal",
          "articulation-distal",
          "rigid-registration",
        ]),
        basis: registrationPointBasisSchema,
      })
      .strict(),
  ),
  sharedPivotGroups: z.array(
    z
      .object({
        groupId: identifierSchema,
        pointMicropixels: pointMicropixelsSchema,
        members: z
          .array(
            z
              .object({
                parentRole: identifierSchema,
                childRole: identifierSchema,
                socketId: identifierSchema,
                motionChannelId: identifierSchema,
                zIndex: z.number().int(),
              })
              .strict(),
          )
          .min(2),
      })
      .strict(),
  ),
  maskOnlySupports: z.array(
    z
      .object({
        componentRole: identifierSchema,
        requirementIds: z.array(identifierSchema).min(1),
        sourceFeatureIds: z.array(identifierSchema).min(1),
        plausibilityRegionContentHash: hashSchema,
        transformAuthority: z.literal(false),
        runtimeNodeCreated: z.literal(false),
        motionChannelCreated: z.literal(false),
      })
      .strict(),
  ),
  attachmentClassDecisions: z.array(
    z
      .object({
        requirementId: identifierSchema,
        componentRole: identifierSchema,
        measuredClass: featureClassSchema,
        decidedClass: featureClassSchema,
        basis: z.enum([
          "guide-proposed",
          "shared-profile-coordinate",
          "rigid-decoration",
          "mask-only",
        ]),
        sourceFeatureIds: z.array(identifierSchema),
        transformAuthority: z.literal(false),
      })
      .strict(),
  ),
  unresolvedRequirements: z.array(
    z
      .object({
        requirementId: identifierSchema,
        componentRole: identifierSchema,
        reason: z.string().min(1),
        displayBasis: z.literal("unresolved-blocked"),
      })
      .strict(),
  ),
  proposalStatus: z.enum(["complete-unapproved", "unresolved-unapproved"]),
  reviewState: z.literal("unapproved"),
  providerAuthority: z.literal(false),
  approvalAuthority: z.literal(false),
  capabilityAuthority: z.literal(false),
  productionBindable: z.literal(false),
};

export const candidateRigUnapprovedRegistrationProposalSchema = hashBound(
  registrationProposalFields,
).superRefine((proposal, context) => {
  const unresolvedIds = proposal.unresolvedRequirements.map(
    (requirement) => requirement.requirementId,
  );
  if (
    new Set(unresolvedIds).size !== unresolvedIds.length ||
    (unresolvedIds.length === 0) !==
      (proposal.proposalStatus === "complete-unapproved")
  )
    context.addIssue({
      code: "custom",
      path: ["unresolvedRequirements"],
      message:
        "Proposal status must exactly match unique unresolved requirement blockers.",
    });
});

const patchOperationSchema = z.discriminatedUnion("op", [
  z
    .object({
      op: z.literal("set-child-pivot"),
      requirementId: identifierSchema,
      role: identifierSchema,
      pointMicropixels: pointMicropixelsSchema,
      basis: z.enum([
        "guide-proposed",
        "shared-profile-coordinate",
        "rigid-decoration",
      ]),
      sourceFeatureIds: z.array(identifierSchema),
      plausibilityRegionContentHash: hashSchema,
      zIndex: z.number().int(),
      transformMode: z.enum([
        "articulated",
        "translation-only-inherit-rotation-scale",
      ]),
    })
    .strict(),
  z
    .object({
      op: z.literal("set-parent-socket"),
      requirementId: identifierSchema,
      parentRole: identifierSchema,
      childRole: identifierSchema,
      socketId: identifierSchema,
      motionChannelId: identifierSchema,
      zIndex: z.number().int(),
      pointMicropixels: pointMicropixelsSchema,
      basis: z.enum(["guide-proposed", "shared-profile-coordinate"]),
      sourceFeatureIds: z.array(identifierSchema),
      plausibilityRegionContentHash: hashSchema,
    })
    .strict(),
  z
    .object({
      op: z.literal("set-shared-pivot-group"),
      groupId: identifierSchema,
      pointMicropixels: pointMicropixelsSchema,
      plausibilityRegionContentHash: hashSchema,
      members: z
        .array(
          z
            .object({
              parentRole: identifierSchema,
              childRole: identifierSchema,
              socketId: identifierSchema,
              requirementId: identifierSchema,
              motionChannelId: identifierSchema,
              zIndex: z.number().int(),
            })
            .strict(),
        )
        .min(2),
    })
    .strict(),
  z
    .object({
      op: z.literal("set-attachment-class"),
      requirementId: identifierSchema,
      componentRole: identifierSchema,
      attachmentId: identifierSchema.nullable(),
      attachmentClass: featureClassSchema,
      basis: z.enum([
        "guide-proposed",
        "shared-profile-coordinate",
        "rigid-decoration",
        "mask-only",
      ]),
      sourceFeatureIds: z.array(identifierSchema),
    })
    .strict(),
]);

export const candidateRigRegistrationCorrectionPatchSchema = hashBound({
  schemaVersion: z.literal("1.0"),
  artifactKind: z.literal("candidate-rig-registration-correction-patch"),
  authorityDomain: z.literal("private-source-review-registration"),
  patchId: identifierSchema,
  reviewSessionId: identifierSchema,
  baseProposalContentHash: hashSchema,
  expectedTargetRevisionContentHash: hashSchema,
  previousPatchContentHash: hashSchema.nullable(),
  revision: z.number().int().positive(),
  sourceDiagnosticReceiptContentHash: hashSchema,
  reviewer: z.literal("preston"),
  reason: z.string().trim().min(1).max(2_000),
  createdAt: z.string().datetime(),
  operations: z.array(patchOperationSchema).min(1),
  immutablePatchOperations: z.literal(true),
  providerAuthority: z.literal(false),
  approvalAuthority: z.literal(false),
  capabilityAuthority: z.literal(false),
  productionBindable: z.literal(false),
}).superRefine((patch, context) => {
  const operationTargets = patch.operations.flatMap((operation) =>
    operation.op === "set-shared-pivot-group"
      ? operation.members.map((member) => `point:${member.requirementId}`)
      : [
          `${operation.op === "set-attachment-class" ? "class" : "point"}:${operation.requirementId}`,
        ],
  );
  const pointRoleTargets = patch.operations.flatMap((operation) =>
    operation.op === "set-child-pivot" ? [operation.role] : [],
  );
  const classRoleTargets = patch.operations.flatMap((operation) =>
    operation.op === "set-attachment-class" ? [operation.componentRole] : [],
  );
  const socketTargets = patch.operations.flatMap((operation) =>
    operation.op === "set-parent-socket"
      ? [`${operation.parentRole}:${operation.socketId}`]
      : operation.op === "set-shared-pivot-group"
        ? operation.members.map(
            (member) => `${member.parentRole}:${member.socketId}`,
          )
        : [],
  );
  if (
    new Set(operationTargets).size !== operationTargets.length ||
    new Set(pointRoleTargets).size !== pointRoleTargets.length ||
    new Set(classRoleTargets).size !== classRoleTargets.length ||
    new Set(socketTargets).size !== socketTargets.length
  )
    context.addIssue({
      code: "custom",
      path: ["operations"],
      message:
        "One immutable patch cannot repeat the same class/point target, role, or socket; one class correction and its dependent point correction may be atomic.",
    });
});

const diagnosticArtifactSchema = z
  .object({
    artifactKind: z.enum([
      "original",
      "masked",
      "seams",
      "rest",
      "zero",
      "minus-15",
      "plus-15",
      "gap-orbit",
      "z-order-near-far",
    ]),
    relativeFile: z.string().min(1),
    sha256: hashSchema,
    byteLength: z.number().int().positive(),
    mediaType: z.literal("image/png"),
    width: z.number().int().positive(),
    height: z.number().int().positive(),
  })
  .strict();

const maskDerivationEvidenceSchema = z
  .object({
    componentId: identifierSchema,
    semanticRole: z.string().min(1),
    sourceRgbaContentHash: hashSchema,
    originalPngContentHash: hashSchema,
    maskedPngContentHash: hashSchema,
    maskRunLengthEncodingContentHash: hashSchema,
    maskedPixelCount: z.number().int().positive(),
    auditRegion: z
      .object({
        x: z.number().int().nonnegative(),
        y: z.number().int().nonnegative(),
        width: z.number().int().positive(),
        height: z.number().int().positive(),
      })
      .strict(),
    auditOriginalPngContentHash: hashSchema,
    auditMaskedPngContentHash: hashSchema,
    auditEvidencePngContentHash: hashSchema,
    sourceMeasuredBeforeMasking: z.literal(true),
    maskAuthority: z.literal(false),
    transformAuthority: z.literal(false),
  })
  .strict();

export const candidateRigJointDerivationEvidenceSchema = hashBound({
  schemaVersion: z.literal("1.0"),
  artifactKind: z.literal("candidate-rig-joint-derivation-evidence"),
  candidateId: identifierSchema,
  componentId: identifierSchema,
  semanticRole: identifierSchema,
  sourceRgbaContentHash: hashSchema,
  physicalFeatureContentHash: hashSchema,
  candidateMeasurementContentHash: hashSchema,
  measurementReportContentHash: hashSchema,
  effectiveProposalContentHash: hashSchema,
  auditRegion: rectSchema,
  componentOutputPadding: z.number().int().nonnegative(),
  selectedSupportRunLengthEncodingContentHash: hashSchema,
  selectedSupportPixelCount: z.number().int().positive(),
  requirementIds: z.array(identifierSchema).min(1),
  proposalReferenceIds: z.array(identifierSchema),
  proposalReferenceState: z.enum(["referenced", "unreferenced"]),
  originalPngContentHash: hashSchema,
  maskedPngContentHash: hashSchema,
  auditEvidencePngContentHash: hashSchema,
  sourceMeasuredBeforeMasking: z.literal(true),
  maskAuthority: z.literal(false),
  transformAuthority: z.literal(false),
  productionBindable: z.literal(false),
}).superRefine((evidence, context) => {
  if (
    evidence.proposalReferenceIds.length > 0 !==
      (evidence.proposalReferenceState === "referenced") ||
    new Set(evidence.requirementIds).size !== evidence.requirementIds.length ||
    new Set(evidence.proposalReferenceIds).size !==
      evidence.proposalReferenceIds.length ||
    evidence.originalPngContentHash === evidence.maskedPngContentHash
  )
    context.addIssue({
      code: "custom",
      message:
        "Joint evidence must bind unique requirements/references and a changed candidate-specific mask derivation.",
    });
});

const persistedPacketEvidenceFileSchema = z
  .object({
    evidenceKind: z.enum([
      "measurement-report",
      "base-proposal",
      "effective-proposal",
      "correction-patch-chain",
      "gap-orbit-measurements",
      "component-original",
      "component-masked",
      "component-mask-runs",
      "component-audit-original",
      "component-audit-masked",
      "component-audit-evidence",
      "joint-original-crop",
      "joint-masked-crop",
      "joint-selected-support-runs",
      "joint-audit-evidence",
      "joint-evidence-record",
    ]),
    componentId: identifierSchema.nullable(),
    candidateId: identifierSchema.nullable(),
    relativeFile: z.string().min(1),
    sha256: hashSchema,
    byteLength: z.number().int().positive(),
    mediaType: z.enum(["image/png", "application/json"]),
  })
  .strict();

export const candidateRigGapOrbitMeasurementReportSchema = hashBound({
  schemaVersion: z.literal("1.0"),
  artifactKind: z.literal("candidate-rig-gap-orbit-measurement-report"),
  authorityDomain: z.literal("private-source-review-registration"),
  view: viewSchema,
  measurementReportContentHash: hashSchema,
  effectiveProposalContentHash: hashSchema,
  samples: z.array(
    z
      .object({
        attachmentId: identifierSchema,
        parentRole: identifierSchema,
        childRole: identifierSchema,
        socketId: identifierSchema,
        angles: z
          .array(
            z
              .object({
                angleDegrees: z.union([
                  z.literal(-15),
                  z.literal(0),
                  z.literal(15),
                ]),
                parentSocketMicropixels: pointMicropixelsSchema,
                childPivotMicropixels: pointMicropixelsSchema,
                gapMicropixels: z.number().int().nonnegative(),
                heat: z.enum(["pass", "review", "fail"]),
              })
              .strict(),
          )
          .length(3),
      })
      .strict(),
  ),
  numericMeasurementOnly: z.literal(true),
  motionArtifactIncluded: z.literal(false),
  transformAuthority: z.literal(false),
  productionBindable: z.literal(false),
}).superRefine((report, context) => {
  if (
    new Set(report.samples.map((sample) => sample.attachmentId)).size !==
      report.samples.length ||
    report.samples.some(
      (sample) =>
        hashCanonical(sample.angles.map((angle) => angle.angleDegrees)) !==
        hashCanonical([-15, 0, 15]),
    )
  )
    context.addIssue({
      code: "custom",
      path: ["samples"],
      message:
        "Gap/orbit measurement must bind one canonical -15/0/+15 numeric sample set per attachment.",
    });
});

export const candidateRigPrivateRegistrationDiagnosticReceiptSchema = hashBound(
  {
    schemaVersion: z.literal("1.0"),
    receiptKind: z.literal("candidate-rig-private-registration-diagnostic"),
    authorityDomain: z.literal("private-source-review-registration"),
    receiptId: identifierSchema,
    view: viewSchema,
    measurementReportContentHash: hashSchema,
    baseProposalContentHash: hashSchema,
    effectiveProposalContentHash: hashSchema,
    correctionPatchContentHash: hashSchema.nullable(),
    warningLabel: z.literal(
      "Unapproved registration proposal for human correction",
    ),
    legendColors: z
      .object({
        "mechanical-seam": z.literal("green"),
        "guide-proposed": z.literal("amber"),
        "shared-profile-coordinate": z.literal("purple"),
        "rigid-decoration": z.literal("blue"),
        "mask-only": z.literal("gray"),
        "unresolved-blocked": z.literal("red"),
      })
      .strict(),
    maskDerivationEvidence: z.array(maskDerivationEvidenceSchema).min(1),
    jointDerivationEvidence: z
      .array(candidateRigJointDerivationEvidenceSchema)
      .min(1),
    packetEvidence: z
      .object({
        gapOrbitMeasurementReportContentHash: hashSchema,
        files: z.array(persistedPacketEvidenceFileSchema).min(1),
      })
      .strict(),
    artifacts: z.array(diagnosticArtifactSchema).length(9),
    boundBehavioralSources: z
      .object({
        claim: z.literal(
          "enumerated-local-behavioral-inputs-not-transitive-closure",
        ),
        files: z
          .array(
            z
              .object({
                role: identifierSchema,
                workspaceRelativeFile: z.string().min(1),
                sha256: hashSchema,
              })
              .strict(),
          )
          .min(12),
        contentHash: hashSchema,
      })
      .strict(),
    toolchain: z
      .object({
        renderer: z.literal("remotion"),
        remotionVersion: z.literal("4.0.490"),
        sharpVersion: z.literal("0.34.5"),
      })
      .strict(),
    completedAt: z.string().datetime(),
    motionArtifactIncluded: z.literal(false),
    compactDiagnosticOnly: z.literal(true),
    ordinaryPlayerReachable: z.literal(false),
    exportReachable: z.literal(false),
    preparationAuthority: z.literal(false),
    approvalAuthority: z.literal(false),
    capabilityAuthority: z.literal(false),
    productionBindable: z.literal(false),
  },
).superRefine((receipt, context) => {
  const evidenceFiles = receipt.packetEvidence.files;
  const requiredSingletonEvidenceKinds = [
    "measurement-report",
    "base-proposal",
    "effective-proposal",
    "correction-patch-chain",
    "gap-orbit-measurements",
  ] as const;
  if (
    new Set(evidenceFiles.map((file) => file.relativeFile)).size !==
      evidenceFiles.length ||
    requiredSingletonEvidenceKinds.some(
      (kind) =>
        evidenceFiles.filter((file) => file.evidenceKind === kind).length !== 1,
    ) ||
    receipt.maskDerivationEvidence.some((mask) => {
      const componentKinds = new Set<string>(
        evidenceFiles
          .filter((file) => file.componentId === mask.componentId)
          .map((file) => file.evidenceKind),
      );
      return [
        "component-original",
        "component-masked",
        "component-mask-runs",
        "component-audit-original",
        "component-audit-masked",
        "component-audit-evidence",
      ].some((kind) => !componentKinds.has(kind));
    })
  )
    context.addIssue({
      code: "custom",
      path: ["packetEvidence"],
      message:
        "Private diagnostic packet must persist unique core JSON evidence and complete component mask-audit bytes.",
    });
  if (
    new Set(receipt.jointDerivationEvidence.map((entry) => entry.candidateId))
      .size !== receipt.jointDerivationEvidence.length ||
    receipt.jointDerivationEvidence.some((joint) => {
      const files = evidenceFiles.filter(
        (file) => file.candidateId === joint.candidateId,
      );
      const byKind = new Map(files.map((file) => [file.evidenceKind, file]));
      const requiredKinds = [
        "joint-original-crop",
        "joint-masked-crop",
        "joint-selected-support-runs",
        "joint-audit-evidence",
        "joint-evidence-record",
      ] as const;
      return (
        files.length !== requiredKinds.length ||
        requiredKinds.some(
          (kind) =>
            files.filter((file) => file.evidenceKind === kind).length !== 1,
        ) ||
        files.some((file) => file.componentId !== joint.componentId) ||
        byKind.get("joint-original-crop")?.sha256 !==
          joint.originalPngContentHash ||
        byKind.get("joint-masked-crop")?.sha256 !==
          joint.maskedPngContentHash ||
        byKind.get("joint-audit-evidence")?.sha256 !==
          joint.auditEvidencePngContentHash ||
        byKind.get("joint-original-crop")?.mediaType !== "image/png" ||
        byKind.get("joint-masked-crop")?.mediaType !== "image/png" ||
        byKind.get("joint-audit-evidence")?.mediaType !== "image/png" ||
        byKind.get("joint-selected-support-runs")?.mediaType !==
          "application/json" ||
        byKind.get("joint-evidence-record")?.mediaType !== "application/json"
      );
    })
  )
    context.addIssue({
      code: "custom",
      path: ["jointDerivationEvidence"],
      message:
        "Every measured joint must bind one complete candidate-specific original/masked/support/audit/record evidence set.",
    });
  if (
    new Set(receipt.maskDerivationEvidence.map((entry) => entry.componentId))
      .size !== receipt.maskDerivationEvidence.length ||
    receipt.maskDerivationEvidence.some(
      (entry) =>
        entry.originalPngContentHash === entry.maskedPngContentHash ||
        entry.auditOriginalPngContentHash === entry.auditMaskedPngContentHash,
    )
  )
    context.addIssue({
      code: "custom",
      path: ["maskDerivationEvidence"],
      message:
        "Private diagnostic mask evidence must bind one changed, measured-before-mask byte derivation per affected component.",
    });
  const expected = [
    "original",
    "masked",
    "seams",
    "rest",
    "zero",
    "minus-15",
    "plus-15",
    "gap-orbit",
    "z-order-near-far",
  ].sort();
  const actual = receipt.artifacts
    .map((artifact) => artifact.artifactKind)
    .sort();
  if (
    new Set(actual).size !== expected.length ||
    hashCanonical(actual) !== hashCanonical(expected) ||
    new Set(receipt.artifacts.map((artifact) => artifact.sha256)).size !==
      expected.length
  )
    context.addIssue({
      code: "custom",
      path: ["artifacts"],
      message:
        "Private diagnostic must bind each exact, visually distinct static artifact kind once.",
    });
  const expectedBoundRoles = [
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
  ].sort();
  const actualBoundRoles = receipt.boundBehavioralSources.files
    .map((file) => file.role)
    .sort();
  if (
    new Set(actualBoundRoles).size !== actualBoundRoles.length ||
    expectedBoundRoles.some((role) => !actualBoundRoles.includes(role)) ||
    receipt.boundBehavioralSources.contentHash !==
      hashCanonical(receipt.boundBehavioralSources.files)
  )
    context.addIssue({
      code: "custom",
      path: ["boundBehavioralSources"],
      message:
        "Private diagnostic must truthfully bind the enumerated local behavioral inputs without claiming a transitive closure.",
    });
});

export const candidateRigStaticGateOneDecisionSchema = hashBound({
  schemaVersion: z.literal("1.0"),
  artifactKind: z.literal("candidate-rig-static-gate-one-decision"),
  authorityDomain: z.literal("private-source-review-registration"),
  gateId: identifierSchema,
  reviewer: z.literal("preston"),
  view: viewSchema,
  measurementReportContentHash: hashSchema,
  baseProposalContentHash: hashSchema,
  effectiveProposalContentHash: hashSchema,
  patchChainContentHashes: z.array(hashSchema),
  diagnosticReceiptContentHash: hashSchema,
  unresolvedRequirementCount: z.number().int().nonnegative(),
  humanDecisionRecorded: z.boolean(),
  decision: z.enum([
    "accepted-static-gate-one",
    "needs-registration-correction",
    "regenerate-source",
  ]),
  staticDiagnosticOnly: z.literal(true),
  futureMotionDiagnosticEligible: z.boolean(),
  motionDiagnosticAuthorized: z.literal(false),
  ordinaryPlayerReachable: z.literal(false),
  exportReachable: z.literal(false),
  preparationAuthority: z.literal(false),
  approvalAuthority: z.literal(false),
  capabilityAuthority: z.literal(false),
  productionBindable: z.literal(false),
}).superRefine((gate, context) => {
  const accepted = gate.decision === "accepted-static-gate-one";
  if (
    accepted !== gate.futureMotionDiagnosticEligible ||
    (accepted &&
      (!gate.humanDecisionRecorded || gate.unresolvedRequirementCount !== 0))
  )
    context.addIssue({
      code: "custom",
      message:
        "Static Gate 1 can mark future motion diagnostics eligible only after a recorded human acceptance with zero unresolved requirements.",
    });
});

export const candidateRigAllViewStaticGateOneBundleSchema = hashBound({
  schemaVersion: z.literal("1.0"),
  artifactKind: z.literal("candidate-rig-all-view-static-gate-one-bundle"),
  authorityDomain: z.literal("private-source-review-registration"),
  bundleId: identifierSchema,
  views: z
    .array(
      z
        .object({
          view: viewSchema,
          measurementReportContentHash: hashSchema,
          baseProposalContentHash: hashSchema,
          effectiveProposalContentHash: hashSchema,
          patchChainContentHashes: z.array(hashSchema),
          diagnosticReceiptContentHash: hashSchema,
          gateContentHash: hashSchema,
          decision: z.enum([
            "accepted-static-gate-one",
            "needs-registration-correction",
            "regenerate-source",
          ]),
          unresolvedRequirementCount: z.number().int().nonnegative(),
        })
        .strict(),
    )
    .length(3),
  allViewsAccepted: z.boolean(),
  futureMotionDiagnosticEligible: z.boolean(),
  motionDiagnosticAuthorized: z.literal(false),
  staticGateOneOnly: z.literal(true),
  ordinaryPlayerReachable: z.literal(false),
  exportReachable: z.literal(false),
  preparationAuthority: z.literal(false),
  approvalAuthority: z.literal(false),
  capabilityAuthority: z.literal(false),
  productionBindable: z.literal(false),
}).superRefine((bundle, context) => {
  const exactViews = bundle.views.map((entry) => entry.view).sort();
  const allAccepted = bundle.views.every(
    (entry) =>
      entry.decision === "accepted-static-gate-one" &&
      entry.unresolvedRequirementCount === 0,
  );
  if (
    hashCanonical(exactViews) !==
      hashCanonical(["front", "profile-left", "profile-right"]) ||
    new Set(exactViews).size !== 3 ||
    bundle.allViewsAccepted !== allAccepted ||
    bundle.futureMotionDiagnosticEligible !== allAccepted
  )
    context.addIssue({
      code: "custom",
      message:
        "Aggregate static Gate 1 must bind exactly three native views and cannot make future motion diagnostics eligible until every view is resolved and accepted.",
    });
});

const maskContainsPoint = (
  mask: z.infer<typeof maskEvidenceSchema>,
  point: z.infer<typeof pointMicropixelsSchema>,
) => {
  const x = Math.floor(point.x / 1_000_000);
  const y = Math.floor(point.y / 1_000_000);
  return mask.runs.some(
    (run) => run.y === y && x >= run.x && x < run.x + run.length,
  );
};

/**
 * Cross-artifact gate for guide proposals. This never grants authority; it
 * only proves that proposed invisible joints remain adjacent to exact source
 * support and that mechanical seams were not substituted by guide points.
 */
export const validateCandidateRigPrivateRegistrationProposalBindings = (
  rawMeasurement: unknown,
  rawProposal: unknown,
) => {
  const measurement =
    candidateRigExactAttachmentMeasurementReportSchema.parse(rawMeasurement);
  const proposal =
    candidateRigUnapprovedRegistrationProposalSchema.parse(rawProposal);
  if (
    proposal.measurementReportContentHash !== measurement.contentHash ||
    proposal.view !== measurement.view
  )
    throw new Error(
      "Registration proposal does not bind the exact attachment measurement report.",
    );
  const componentByRole = new Map(
    measurement.components.map((component) => [
      component.semanticRole,
      component,
    ]),
  );
  const candidateById = new Map(
    measurement.components.flatMap((component) =>
      component.candidates.map(
        (candidate) => [candidate.candidateId, candidate] as const,
      ),
    ),
  );
  const requirementById = new Map(
    measurement.requirements.map((requirement) => [
      requirement.requirementId,
      requirement,
    ]),
  );
  const classDecisionByRequirement = new Map(
    proposal.attachmentClassDecisions.map((decision) => [
      decision.requirementId,
      decision,
    ]),
  );
  if (
    classDecisionByRequirement.size !== proposal.attachmentClassDecisions.length
  )
    throw new Error(
      "Each measured requirement can have at most one effective attachment-class decision.",
    );
  const assertPoint = (
    role: string,
    proposed: z.infer<typeof proposedPointSchema>,
  ) => {
    const component = componentByRole.get(role);
    if (!component)
      throw new Error(`Registration proposal references unknown role ${role}.`);
    const requirement = requirementById.get(proposed.requirementId);
    if (!requirement || requirement.componentRole !== role)
      throw new Error(
        `Registration proposal point for ${role} does not bind its exact measurement requirement.`,
      );
    if (
      proposed.plausibilityRegionContentHash !==
      component.plausibilityRegion.contentHash
    )
      throw new Error(
        `Registration proposal for ${role} does not bind its worker-derived plausibility region.`,
      );
    if (proposed.basis === "mechanical-seam") {
      if (proposed.sourceFeatureIds.length !== 1)
        throw new Error("Mechanical seam proposals require one exact feature.");
      const feature = candidateById.get(proposed.sourceFeatureIds[0]!);
      if (
        !feature ||
        feature.semanticRole !== role ||
        feature.featureClass !== requirement.featureClass ||
        requirement.outcome.status !== "detected" ||
        !requirement.outcome.candidateIds.includes(feature.candidateId) ||
        feature.seam.midpointMicropixels.x !== proposed.pointMicropixels.x ||
        feature.seam.midpointMicropixels.y !== proposed.pointMicropixels.y
      )
        throw new Error("Mechanical seam midpoint was substituted.");
    } else if (
      proposed.basis === "guide-proposed" ||
      proposed.basis === "shared-profile-coordinate" ||
      proposed.basis === "rigid-decoration"
    ) {
      if (proposed.sourceFeatureIds.length !== 0)
        throw new Error(
          `Non-mechanical proposal for ${role} cannot claim measured seam features.`,
        );
      if (
        !maskContainsPoint(
          component.plausibilityRegion.mask,
          proposed.pointMicropixels,
        )
      )
        throw new Error(
          `Guide proposal for ${role} leaves its exact dilated support plausibility region.`,
        );
    }
  };
  for (const part of proposal.parts) {
    assertPoint(part.role, part.childPivot);
    const measuredRequirement = requirementById.get(
      part.childPivot.requirementId,
    );
    const effectiveClass =
      classDecisionByRequirement.get(part.childPivot.requirementId)
        ?.decidedClass ?? measuredRequirement?.featureClass;
    if (
      part.transformMode === "translation-only-inherit-rotation-scale" &&
      (part.childPivot.basis !== "rigid-decoration" ||
        effectiveClass !== "rigid-registration")
    )
      throw new Error("Rigid decoration must use its explicit rigid basis.");
    if (
      part.transformMode === "articulated" &&
      (part.childPivot.basis === "rigid-decoration" ||
        effectiveClass !== "articulation-proximal")
    )
      throw new Error(
        "Articulated nodes cannot use rigid-decoration or mask-only pivots.",
      );
  }
  for (const socket of proposal.sockets) {
    assertPoint(socket.parentRole, socket.position);
    const measuredRequirement = requirementById.get(
      socket.position.requirementId,
    );
    const effectiveClass =
      classDecisionByRequirement.get(socket.position.requirementId)
        ?.decidedClass ?? measuredRequirement?.featureClass;
    if (effectiveClass !== "articulation-distal")
      throw new Error(
        `Socket ${socket.parentRole}:${socket.socketId} is not backed by an effective distal requirement.`,
      );
  }
  const partRoles = proposal.parts.map((part) => part.role);
  const socketKeys = proposal.sockets.map(
    (socket) => `${socket.parentRole}:${socket.socketId}`,
  );
  const motionChannels = proposal.sockets.map(
    (socket) => socket.motionChannelId,
  );
  const attachmentIds = proposal.attachments.map(
    (attachment) => attachment.attachmentId,
  );
  if (
    new Set(partRoles).size !== partRoles.length ||
    new Set(socketKeys).size !== socketKeys.length ||
    new Set(motionChannels).size !== motionChannels.length ||
    new Set(attachmentIds).size !== attachmentIds.length
  )
    throw new Error(
      "Proposal part roles, parent sockets, motion channels, and attachment ids must be unique.",
    );
  const socketById = new Map(
    proposal.sockets.map((socket) => [
      `${socket.parentRole}:${socket.socketId}`,
      socket,
    ]),
  );
  const partByRole = new Map(proposal.parts.map((part) => [part.role, part]));
  for (const group of proposal.sharedPivotGroups) {
    const members = group.members.map((member) =>
      socketById.get(`${member.parentRole}:${member.socketId}`),
    );
    const parentRoles = new Set(
      group.members.map((member) => member.parentRole),
    );
    if (
      members.some((member) => !member) ||
      parentRoles.size !== 1 ||
      new Set(
        group.members.map(
          (member) => `${member.parentRole}:${member.socketId}`,
        ),
      ).size !== group.members.length ||
      new Set(members.map((member) => member!.motionChannelId)).size !==
        members.length ||
      new Set(members.map((member) => member!.zIndex)).size !==
        members.length ||
      members.some(
        (member, index) =>
          member!.sharedPivotGroupId !== group.groupId ||
          member!.position.basis !== "shared-profile-coordinate" ||
          member!.parentRole !== group.members[index]!.parentRole ||
          member!.childRole !== group.members[index]!.childRole ||
          member!.motionChannelId !== group.members[index]!.motionChannelId ||
          member!.zIndex !== group.members[index]!.zIndex ||
          member!.position.pointMicropixels.x !== group.pointMicropixels.x ||
          member!.position.pointMicropixels.y !== group.pointMicropixels.y,
      )
    )
      throw new Error(
        `Shared profile group ${group.groupId} must alias one coordinate while preserving distinct semantic channels and z-order.`,
      );
  }
  if (proposal.view === "front" && proposal.sharedPivotGroups.length > 0)
    throw new Error(
      "Shared profile coordinates are forbidden in the front view.",
    );
  for (const attachment of proposal.attachments) {
    const topology = kidsBipedV1TopologyTemplate.parts.find(
      (part) =>
        part.role === attachment.childRole &&
        part.parentRole === attachment.parentRole &&
        part.parentSocketId === attachment.socketId,
    );
    const child = partByRole.get(attachment.childRole);
    const socket = socketById.get(
      `${attachment.parentRole}:${attachment.socketId}`,
    );
    const validBasis =
      attachment.attachmentClass === "articulation-proximal" ||
      attachment.attachmentClass === "articulation-distal"
        ? attachment.basis === "mechanical-seam" ||
          attachment.basis === "guide-proposed" ||
          attachment.basis === "shared-profile-coordinate"
        : attachment.attachmentClass === "rigid-registration"
          ? attachment.basis === "rigid-decoration"
          : attachment.basis === "rigid-decoration";
    const expectedBasis =
      child?.childPivot.basis === "shared-profile-coordinate" ||
      socket?.position.basis === "shared-profile-coordinate"
        ? "shared-profile-coordinate"
        : child?.childPivot.basis === "mechanical-seam" &&
            socket?.position.basis === "mechanical-seam"
          ? "mechanical-seam"
          : child?.transformMode === "translation-only-inherit-rotation-scale"
            ? "rigid-decoration"
            : "guide-proposed";
    if (
      !validBasis ||
      !topology ||
      !child ||
      !socket ||
      socket.childRole !== attachment.childRole ||
      attachment.basis !== expectedBasis
    )
      throw new Error(
        "Attachment must bind an exact existing topology parent/child/socket with the effective point basis.",
      );
  }
  const attachmentKeys = new Set(
    proposal.attachments.map(
      (attachment) =>
        `${attachment.parentRole}:${attachment.childRole}:${attachment.socketId}`,
    ),
  );
  for (const socket of proposal.sockets) {
    const child = partByRole.get(socket.childRole);
    const key = `${socket.parentRole}:${socket.childRole}:${socket.socketId}`;
    if (child?.transformMode === "articulated" && !attachmentKeys.has(key))
      throw new Error(
        `Resolved articulated topology edge ${key} is missing its proposal attachment.`,
      );
  }
  for (const support of proposal.maskOnlySupports) {
    const component = componentByRole.get(support.componentRole);
    if (
      !component ||
      support.plausibilityRegionContentHash !==
        component.plausibilityRegion.contentHash
    )
      throw new Error(
        `Mask-only support for ${support.componentRole} does not bind exact measured evidence.`,
      );
    for (const featureId of support.sourceFeatureIds) {
      const feature = candidateById.get(featureId);
      const reclassifiedEvidence = support.requirementIds.some(
        (requirementId) => {
          const decision = classDecisionByRequirement.get(requirementId);
          const requirement = requirementById.get(requirementId);
          return (
            decision?.decidedClass === "mask-only" &&
            decision.sourceFeatureIds.includes(featureId) &&
            requirement?.outcome.status === "detected" &&
            requirement.outcome.candidateIds.includes(featureId)
          );
        },
      );
      if (
        !feature ||
        feature.semanticRole !== support.componentRole ||
        (feature.featureClass !== "mask-only" && !reclassifiedEvidence)
      )
        throw new Error(
          `Mask-only support ${featureId} was promoted or substituted.`,
        );
    }
  }
  for (const decision of proposal.attachmentClassDecisions) {
    const requirement = requirementById.get(decision.requirementId);
    if (
      !requirement ||
      requirement.componentRole !== decision.componentRole ||
      requirement.featureClass !== decision.measuredClass ||
      decision.decidedClass === decision.measuredClass
    )
      throw new Error(
        `Attachment class decision ${decision.requirementId} does not bind the measured requirement.`,
      );
    const validBasis =
      decision.decidedClass === "mask-only"
        ? decision.basis === "mask-only" && decision.sourceFeatureIds.length > 0
        : decision.decidedClass === "rigid-registration"
          ? decision.basis === "rigid-decoration" &&
            decision.sourceFeatureIds.length === 0
          : decision.basis === "guide-proposed" ||
            decision.basis === "shared-profile-coordinate";
    if (!validBasis)
      throw new Error(
        `Attachment class decision ${decision.requirementId} has inconsistent evidence/basis.`,
      );
    for (const featureId of decision.sourceFeatureIds) {
      const feature = candidateById.get(featureId);
      if (
        !feature ||
        feature.semanticRole !== decision.componentRole ||
        requirement.outcome.status !== "detected" ||
        !requirement.outcome.candidateIds.includes(feature.candidateId)
      )
        throw new Error(
          `Attachment class decision ${decision.requirementId} references substituted feature evidence.`,
        );
    }
  }
  const coveredRequirementIds = [
    ...proposal.parts.map((part) => part.childPivot.requirementId),
    ...proposal.sockets.map((socket) => socket.position.requirementId),
    ...proposal.maskOnlySupports.flatMap((support) => support.requirementIds),
    ...proposal.unresolvedRequirements.map(
      (requirement) => requirement.requirementId,
    ),
  ];
  const expectedRequirementIds = measurement.requirements
    .map((requirement) => requirement.requirementId)
    .sort();
  if (
    new Set(coveredRequirementIds).size !== coveredRequirementIds.length ||
    hashCanonical([...coveredRequirementIds].sort()) !==
      hashCanonical(expectedRequirementIds)
  )
    throw new Error(
      "Unapproved proposal must account for every exact measurement requirement once as a point, mask-only support, or unresolved blocker.",
    );
  return { measurement, proposal };
};

/**
 * Applies Preston's immutable correction operations to the unapproved base
 * proposal. This is deliberately a pure compiler: it can correct guide points
 * and semantic classes, but it cannot manufacture mechanical evidence or grant
 * runtime/production authority.
 */
export const applyCandidateRigRegistrationCorrectionPatchChain = (
  rawMeasurement: unknown,
  rawBaseProposal: unknown,
  rawPatches: unknown[],
) => {
  const { measurement, proposal: baseProposal } =
    validateCandidateRigPrivateRegistrationProposalBindings(
      rawMeasurement,
      rawBaseProposal,
    );
  const patches = rawPatches.map((patch) =>
    candidateRigRegistrationCorrectionPatchSchema.parse(patch),
  );
  const componentByRole = new Map(
    measurement.components.map((component) => [
      component.semanticRole,
      component,
    ]),
  );
  const requirementById = new Map(
    measurement.requirements.map((requirement) => [
      requirement.requirementId,
      requirement,
    ]),
  );
  let effectiveProposal = structuredClone(baseProposal);

  const assertPatchedPoint = (
    role: string,
    pointMicropixels: z.infer<typeof pointMicropixelsSchema>,
    plausibilityRegionContentHash: string,
  ) => {
    const component = componentByRole.get(role);
    if (
      !component ||
      plausibilityRegionContentHash !==
        component.plausibilityRegion.contentHash ||
      !maskContainsPoint(component.plausibilityRegion.mask, pointMicropixels)
    )
      throw new Error(
        `Registration patch point for ${role} leaves its exact hashed plausibility region.`,
      );
  };
  const effectiveClassFor = (requirementId: string) =>
    effectiveProposal.attachmentClassDecisions.find(
      (decision) => decision.requirementId === requirementId,
    )?.decidedClass ?? requirementById.get(requirementId)?.featureClass;

  for (const [index, patch] of patches.entries()) {
    const previous = patches[index - 1];
    if (
      patch.baseProposalContentHash !== baseProposal.contentHash ||
      patch.revision !== index + 1 ||
      patch.previousPatchContentHash !== (previous?.contentHash ?? null) ||
      patch.expectedTargetRevisionContentHash !==
        effectiveProposal.contentHash ||
      (previous !== undefined &&
        (patch.reviewSessionId !== previous.reviewSessionId ||
          Date.parse(patch.createdAt) < Date.parse(previous.createdAt)))
    )
      throw new Error(
        "Registration correction patches must form one immutable, gap-free, monotonically dated review-session chain over the exact effective target revision.",
      );

    const orderedOperations = [
      ...patch.operations.filter(
        (operation) => operation.op === "set-attachment-class",
      ),
      ...patch.operations.filter(
        (operation) => operation.op !== "set-attachment-class",
      ),
    ];
    for (const operation of orderedOperations) {
      const operationRequirementId =
        "requirementId" in operation ? operation.requirementId : null;
      const requirement = operationRequirementId
        ? requirementById.get(operationRequirementId)
        : undefined;
      if (operationRequirementId && !requirement)
        throw new Error(
          `Registration patch targets unknown requirement ${operationRequirementId}.`,
        );

      if (operation.op === "set-attachment-class") {
        const boundRequirement = requirement!;
        const targetAttachment = operation.attachmentId
          ? effectiveProposal.attachments.find(
              (attachment) =>
                attachment.attachmentId === operation.attachmentId,
            )
          : null;
        if (
          boundRequirement.componentRole !== operation.componentRole ||
          effectiveClassFor(operation.requirementId) ===
            operation.attachmentClass ||
          (operation.attachmentId !== null &&
            (!targetAttachment ||
              (targetAttachment.parentRole !== operation.componentRole &&
                targetAttachment.childRole !== operation.componentRole)))
        )
          throw new Error(
            `Attachment-class patch ${operation.requirementId} must change its current effective class while binding its exact measured requirement.`,
          );
        const validBasis =
          operation.attachmentClass === "articulation-proximal" ||
          operation.attachmentClass === "articulation-distal"
            ? operation.basis === "guide-proposed" ||
              operation.basis === "shared-profile-coordinate"
            : operation.attachmentClass === "rigid-registration"
              ? operation.basis === "rigid-decoration"
              : operation.basis === "mask-only";
        const measuredCandidateIds =
          boundRequirement.outcome.status === "detected"
            ? boundRequirement.outcome.candidateIds
            : [];
        if (
          !validBasis ||
          (operation.attachmentClass === "mask-only"
            ? operation.sourceFeatureIds.length === 0 ||
              operation.sourceFeatureIds.some(
                (featureId) => !measuredCandidateIds.includes(featureId),
              )
            : operation.sourceFeatureIds.length !== 0)
        )
          throw new Error(
            `Attachment-class patch ${operation.requirementId} has substituted evidence or an invalid basis.`,
          );
        const retainedClassDecisions =
          effectiveProposal.attachmentClassDecisions.filter(
            (decision) => decision.requirementId !== operation.requirementId,
          );
        effectiveProposal.attachmentClassDecisions =
          operation.attachmentClass === boundRequirement.featureClass
            ? retainedClassDecisions
            : [
                ...retainedClassDecisions,
                {
                  requirementId: operation.requirementId,
                  componentRole: operation.componentRole,
                  measuredClass: boundRequirement.featureClass,
                  decidedClass: operation.attachmentClass,
                  basis: operation.basis,
                  sourceFeatureIds: [...operation.sourceFeatureIds],
                  transformAuthority: false,
                },
              ];
        effectiveProposal.parts = effectiveProposal.parts.filter(
          (part) => part.childPivot.requirementId !== operation.requirementId,
        );
        effectiveProposal.sockets = effectiveProposal.sockets.filter(
          (socket) => socket.position.requirementId !== operation.requirementId,
        );
        effectiveProposal.maskOnlySupports =
          effectiveProposal.maskOnlySupports.filter(
            (support) =>
              !support.requirementIds.includes(operation.requirementId),
          );
        if (operation.attachmentClass === "mask-only") {
          const component = componentByRole.get(operation.componentRole)!;
          effectiveProposal.maskOnlySupports.push({
            componentRole: operation.componentRole,
            requirementIds: [operation.requirementId],
            sourceFeatureIds: [...operation.sourceFeatureIds],
            plausibilityRegionContentHash:
              component.plausibilityRegion.contentHash,
            transformAuthority: false,
            runtimeNodeCreated: false,
            motionChannelCreated: false,
          });
        } else if (
          operation.attachmentClass === boundRequirement.featureClass
        ) {
          const originalPart = baseProposal.parts.find(
            (part) => part.childPivot.requirementId === operation.requirementId,
          );
          const originalSocket = baseProposal.sockets.find(
            (socket) =>
              socket.position.requirementId === operation.requirementId,
          );
          const originalMaskSupport = baseProposal.maskOnlySupports.find(
            (support) =>
              support.requirementIds.includes(operation.requirementId),
          );
          if (originalPart)
            effectiveProposal.parts = [
              ...effectiveProposal.parts.filter(
                (part) => part.role !== originalPart.role,
              ),
              structuredClone(originalPart),
            ];
          if (originalSocket)
            effectiveProposal.sockets = [
              ...effectiveProposal.sockets.filter(
                (socket) =>
                  `${socket.parentRole}:${socket.socketId}` !==
                  `${originalSocket.parentRole}:${originalSocket.socketId}`,
              ),
              structuredClone(originalSocket),
            ];
          if (originalMaskSupport)
            effectiveProposal.maskOnlySupports.push(
              structuredClone(originalMaskSupport),
            );
        }
        continue;
      }

      if (
        operation.op !== "set-shared-pivot-group" &&
        operation.sourceFeatureIds.length !== 0
      )
        throw new Error(
          "Preston guide corrections cannot claim worker-measured mechanical feature ids.",
        );

      if (operation.op === "set-child-pivot") {
        const boundRequirement = requirement!;
        if (
          boundRequirement.componentRole !== operation.role ||
          (effectiveClassFor(operation.requirementId) !==
            "articulation-proximal" &&
            effectiveClassFor(operation.requirementId) !== "rigid-registration")
        )
          throw new Error(
            `Child-pivot patch ${operation.requirementId} does not bind a proximal or rigid role.`,
          );
        if (
          (operation.transformMode ===
            "translation-only-inherit-rotation-scale") !==
            (effectiveClassFor(operation.requirementId) ===
              "rigid-registration") ||
          (operation.basis === "rigid-decoration") !==
            (effectiveClassFor(operation.requirementId) ===
              "rigid-registration") ||
          (operation.basis === "shared-profile-coordinate" &&
            measurement.view === "front")
        )
          throw new Error(
            `Child-pivot patch ${operation.requirementId} has inconsistent transform semantics.`,
          );
        assertPatchedPoint(
          operation.role,
          operation.pointMicropixels,
          operation.plausibilityRegionContentHash,
        );
        const part = {
          role: operation.role,
          childPivot: {
            requirementId: operation.requirementId,
            pointMicropixels: operation.pointMicropixels,
            basis: operation.basis,
            sourceFeatureIds: [],
            plausibilityRegionContentHash:
              operation.plausibilityRegionContentHash,
          },
          zIndex: operation.zIndex,
          transformMode: operation.transformMode,
        };
        effectiveProposal.parts = [
          ...effectiveProposal.parts.filter(
            (candidate) => candidate.role !== operation.role,
          ),
          part,
        ];
      } else if (operation.op === "set-parent-socket") {
        const boundRequirement = requirement!;
        if (
          boundRequirement.componentRole !== operation.parentRole ||
          effectiveClassFor(operation.requirementId) !==
            "articulation-distal" ||
          boundRequirement.topologyEdge?.parentRole !== operation.parentRole ||
          boundRequirement.topologyEdge.childRole !== operation.childRole ||
          boundRequirement.topologyEdge.socketId !== operation.socketId ||
          (operation.basis === "shared-profile-coordinate" &&
            measurement.view === "front")
        )
          throw new Error(
            `Parent-socket patch ${operation.requirementId} does not bind its exact distal topology edge.`,
          );
        assertPatchedPoint(
          operation.parentRole,
          operation.pointMicropixels,
          operation.plausibilityRegionContentHash,
        );
        const socket = {
          parentRole: operation.parentRole,
          childRole: operation.childRole,
          socketId: operation.socketId,
          motionChannelId: operation.motionChannelId,
          position: {
            requirementId: operation.requirementId,
            pointMicropixels: operation.pointMicropixels,
            basis: operation.basis,
            sourceFeatureIds: [],
            plausibilityRegionContentHash:
              operation.plausibilityRegionContentHash,
          },
          zIndex: operation.zIndex,
          sharedPivotGroupId: null,
        };
        effectiveProposal.sockets = [
          ...effectiveProposal.sockets.filter(
            (candidate) =>
              `${candidate.parentRole}:${candidate.socketId}` !==
              `${operation.parentRole}:${operation.socketId}`,
          ),
          socket,
        ];
      } else {
        if (measurement.view === "front")
          throw new Error(
            "Front registration cannot create a shared profile pivot group.",
          );
        const parents = new Set(
          operation.members.map((member) => member.parentRole),
        );
        const memberKeys = operation.members.map(
          (member) => `${member.parentRole}:${member.socketId}`,
        );
        if (
          parents.size !== 1 ||
          new Set(memberKeys).size !== memberKeys.length ||
          new Set(operation.members.map((member) => member.childRole)).size !==
            operation.members.length ||
          new Set(operation.members.map((member) => member.motionChannelId))
            .size !== operation.members.length ||
          new Set(operation.members.map((member) => member.zIndex)).size !==
            operation.members.length
        )
          throw new Error(
            "Shared profile patch members must preserve distinct semantic channels and z-order on one parent.",
          );
        const parentRole = operation.members[0]!.parentRole;
        assertPatchedPoint(
          parentRole,
          operation.pointMicropixels,
          operation.plausibilityRegionContentHash,
        );
        for (const member of operation.members) {
          const memberRequirement = requirementById.get(member.requirementId);
          if (
            !memberRequirement ||
            memberRequirement.componentRole !== member.parentRole ||
            effectiveClassFor(member.requirementId) !== "articulation-distal" ||
            memberRequirement.topologyEdge?.parentRole !== member.parentRole ||
            memberRequirement.topologyEdge.childRole !== member.childRole ||
            memberRequirement.topologyEdge.socketId !== member.socketId
          )
            throw new Error(
              `Shared profile member ${member.requirementId} does not bind its exact distal topology edge.`,
            );
          effectiveProposal.sockets = [
            ...effectiveProposal.sockets.filter(
              (candidate) =>
                `${candidate.parentRole}:${candidate.socketId}` !==
                `${member.parentRole}:${member.socketId}`,
            ),
            {
              parentRole: member.parentRole,
              childRole: member.childRole,
              socketId: member.socketId,
              motionChannelId: member.motionChannelId,
              position: {
                requirementId: member.requirementId,
                pointMicropixels: operation.pointMicropixels,
                basis: "shared-profile-coordinate",
                sourceFeatureIds: [],
                plausibilityRegionContentHash:
                  operation.plausibilityRegionContentHash,
              },
              zIndex: member.zIndex,
              sharedPivotGroupId: operation.groupId,
            },
          ];
        }
        const memberKeySet = new Set(memberKeys);
        effectiveProposal.sharedPivotGroups = [
          ...effectiveProposal.sharedPivotGroups.filter(
            (group) =>
              group.groupId !== operation.groupId &&
              group.members.every(
                (member) =>
                  !memberKeySet.has(`${member.parentRole}:${member.socketId}`),
              ),
          ),
          {
            groupId: operation.groupId,
            pointMicropixels: operation.pointMicropixels,
            members: operation.members.map((member) => ({
              parentRole: member.parentRole,
              childRole: member.childRole,
              socketId: member.socketId,
              motionChannelId: member.motionChannelId,
              zIndex: member.zIndex,
            })),
          },
        ];
      }
    }

    const partByRole = new Map(
      effectiveProposal.parts.map((part) => [part.role, part]),
    );
    const socketByKey = new Map(
      effectiveProposal.sockets.map((socket) => [
        `${socket.parentRole}:${socket.socketId}`,
        socket,
      ]),
    );
    effectiveProposal.attachments = kidsBipedV1TopologyTemplate.parts.flatMap(
      (topology) => {
        if (!topology.parentRole || !topology.parentSocketId) return [];
        const child = partByRole.get(topology.role);
        const socket = socketByKey.get(
          `${topology.parentRole}:${topology.parentSocketId}`,
        );
        if (
          !child ||
          !socket ||
          child.transformMode !== "articulated" ||
          effectiveClassFor(child.childPivot.requirementId) !==
            "articulation-proximal"
        )
          return [];
        const basis =
          child.childPivot.basis === "shared-profile-coordinate" ||
          socket.position.basis === "shared-profile-coordinate"
            ? ("shared-profile-coordinate" as const)
            : child.childPivot.basis === "mechanical-seam" &&
                socket.position.basis === "mechanical-seam"
              ? ("mechanical-seam" as const)
              : ("guide-proposed" as const);
        return [
          {
            attachmentId: `${measurement.view}-${topology.parentRole}-${topology.role}`,
            parentRole: topology.parentRole,
            childRole: topology.role,
            socketId: topology.parentSocketId,
            attachmentClass: "articulation-proximal" as const,
            basis,
          },
        ];
      },
    );
    const resolvedRequirementIds = new Set([
      ...effectiveProposal.parts.map((part) => part.childPivot.requirementId),
      ...effectiveProposal.sockets.map(
        (socket) => socket.position.requirementId,
      ),
      ...effectiveProposal.maskOnlySupports.flatMap(
        (support) => support.requirementIds,
      ),
    ]);
    const baseUnresolvedByRequirement = new Map(
      baseProposal.unresolvedRequirements.map((unresolved) => [
        unresolved.requirementId,
        unresolved,
      ]),
    );
    effectiveProposal.unresolvedRequirements = measurement.requirements
      .filter(
        (requirement) => !resolvedRequirementIds.has(requirement.requirementId),
      )
      .map((requirement) =>
        structuredClone(
          baseUnresolvedByRequirement.get(requirement.requirementId) ?? {
            requirementId: requirement.requirementId,
            componentRole: requirement.componentRole,
            reason:
              "The effective attachment class has no corrected point or exact measured support in this revision.",
            displayBasis: "unresolved-blocked" as const,
          },
        ),
      );
    effectiveProposal.parts.sort((left, right) =>
      left.role.localeCompare(right.role),
    );
    effectiveProposal.sockets.sort((left, right) =>
      `${left.parentRole}:${left.socketId}`.localeCompare(
        `${right.parentRole}:${right.socketId}`,
      ),
    );
    effectiveProposal.attachments.sort((left, right) =>
      left.attachmentId.localeCompare(right.attachmentId),
    );
    effectiveProposal.sharedPivotGroups.sort((left, right) =>
      left.groupId.localeCompare(right.groupId),
    );
    effectiveProposal.maskOnlySupports.sort((left, right) =>
      left.componentRole.localeCompare(right.componentRole),
    );
    effectiveProposal.attachmentClassDecisions.sort((left, right) =>
      left.requirementId.localeCompare(right.requirementId),
    );
    effectiveProposal.proposalId = `${baseProposal.proposalId}-effective-r${patch.revision}`;
    effectiveProposal.proposalStatus =
      effectiveProposal.unresolvedRequirements.length === 0
        ? "complete-unapproved"
        : "unresolved-unapproved";
    const { contentHash: _staleContentHash, ...effectiveDraft } =
      effectiveProposal;
    void _staleContentHash;
    effectiveProposal = candidateRigUnapprovedRegistrationProposalSchema.parse({
      ...effectiveDraft,
      contentHash: hashCanonical(effectiveDraft),
    });
    validateCandidateRigPrivateRegistrationProposalBindings(
      measurement,
      effectiveProposal,
    );
  }

  return { measurement, baseProposal, patches, effectiveProposal };
};

export const validateCandidateRigRegistrationCorrectionPatchChain = (
  rawMeasurement: unknown,
  rawBaseProposal: unknown,
  rawSourceDiagnosticReceipt: unknown,
  rawPatches: unknown[],
  rawEffectiveDiagnosticReceipt: unknown,
) => {
  const { measurement, baseProposal, patches, effectiveProposal } =
    applyCandidateRigRegistrationCorrectionPatchChain(
      rawMeasurement,
      rawBaseProposal,
      rawPatches,
    );
  const sourceDiagnostic =
    candidateRigPrivateRegistrationDiagnosticReceiptSchema.parse(
      rawSourceDiagnosticReceipt,
    );
  const effectiveDiagnostic =
    candidateRigPrivateRegistrationDiagnosticReceiptSchema.parse(
      rawEffectiveDiagnosticReceipt,
    );
  if (
    sourceDiagnostic.measurementReportContentHash !== measurement.contentHash ||
    sourceDiagnostic.baseProposalContentHash !== baseProposal.contentHash ||
    sourceDiagnostic.effectiveProposalContentHash !==
      baseProposal.contentHash ||
    sourceDiagnostic.correctionPatchContentHash !== null
  )
    throw new Error(
      "Registration correction patches must cite the exact unpatched source diagnostic.",
    );
  for (const patch of patches)
    if (
      patch.sourceDiagnosticReceiptContentHash !== sourceDiagnostic.contentHash
    )
      throw new Error(
        "Registration correction patches must bind their immutable source diagnostic receipt.",
      );
  if (
    effectiveDiagnostic.measurementReportContentHash !==
      measurement.contentHash ||
    effectiveDiagnostic.baseProposalContentHash !== baseProposal.contentHash ||
    effectiveDiagnostic.effectiveProposalContentHash !==
      effectiveProposal.contentHash ||
    effectiveDiagnostic.correctionPatchContentHash !==
      (patches.at(-1)?.contentHash ?? null)
  )
    throw new Error(
      "Effective private diagnostic does not bind the exact post-chain proposal and latest immutable patch.",
    );
  return {
    measurement,
    baseProposal,
    sourceDiagnostic,
    patches,
    effectiveProposal,
    effectiveDiagnostic,
  };
};

export const validateCandidateRigStaticGateOneBindings = (
  rawMeasurement: unknown,
  rawBaseProposal: unknown,
  rawSourceDiagnosticReceipt: unknown,
  rawPatches: unknown[],
  rawEffectiveDiagnosticReceipt: unknown,
  rawGate: unknown,
) => {
  const {
    measurement,
    baseProposal,
    sourceDiagnostic,
    patches,
    effectiveProposal,
    effectiveDiagnostic,
  } = validateCandidateRigRegistrationCorrectionPatchChain(
    rawMeasurement,
    rawBaseProposal,
    rawSourceDiagnosticReceipt,
    rawPatches,
    rawEffectiveDiagnosticReceipt,
  );
  const gate = candidateRigStaticGateOneDecisionSchema.parse(rawGate);
  if (
    gate.view !== measurement.view ||
    gate.measurementReportContentHash !== measurement.contentHash ||
    gate.baseProposalContentHash !== baseProposal.contentHash ||
    gate.effectiveProposalContentHash !== effectiveProposal.contentHash ||
    gate.diagnosticReceiptContentHash !== effectiveDiagnostic.contentHash ||
    hashCanonical(gate.patchChainContentHashes) !==
      hashCanonical(patches.map((patch) => patch.contentHash))
  )
    throw new Error(
      "Static Gate 1 does not bind the exact native view, measurement, base/effective proposal, patch chain, and reopened static diagnostic.",
    );
  if (
    gate.unresolvedRequirementCount !==
      effectiveProposal.unresolvedRequirements.length ||
    (gate.decision === "accepted-static-gate-one" &&
      effectiveProposal.unresolvedRequirements.length > 0)
  )
    throw new Error(
      "Static Gate 1 cannot be accepted while effective registration requirements remain unresolved.",
    );
  return {
    measurement,
    baseProposal,
    sourceDiagnostic,
    patches,
    effectiveProposal,
    effectiveDiagnostic,
    gate,
  };
};

export const validateCandidateRigAllViewStaticGateOneBundleBindings = (
  rawViews: Array<{
    measurement: unknown;
    baseProposal: unknown;
    sourceDiagnosticReceipt: unknown;
    patches: unknown[];
    effectiveDiagnosticReceipt: unknown;
    gate: unknown;
  }>,
  rawBundle: unknown,
) => {
  const views = rawViews.map((view) =>
    validateCandidateRigStaticGateOneBindings(
      view.measurement,
      view.baseProposal,
      view.sourceDiagnosticReceipt,
      view.patches,
      view.effectiveDiagnosticReceipt,
      view.gate,
    ),
  );
  const bundle = candidateRigAllViewStaticGateOneBundleSchema.parse(rawBundle);
  const expected = views
    .map((view) => ({
      view: view.measurement.view,
      measurementReportContentHash: view.measurement.contentHash,
      baseProposalContentHash: view.baseProposal.contentHash,
      effectiveProposalContentHash: view.effectiveProposal.contentHash,
      patchChainContentHashes: view.patches.map((patch) => patch.contentHash),
      diagnosticReceiptContentHash: view.effectiveDiagnostic.contentHash,
      gateContentHash: view.gate.contentHash,
      decision: view.gate.decision,
      unresolvedRequirementCount:
        view.effectiveProposal.unresolvedRequirements.length,
    }))
    .sort((left, right) => left.view.localeCompare(right.view));
  const actual = [...bundle.views].sort((left, right) =>
    left.view.localeCompare(right.view),
  );
  if (hashCanonical(actual) !== hashCanonical(expected))
    throw new Error(
      "Aggregate static Gate 1 bundle does not bind all three exact reopened native-view decisions.",
    );
  return { views, bundle };
};

export type CandidateRigExactAttachmentMeasurementReport = z.infer<
  typeof candidateRigExactAttachmentMeasurementReportSchema
>;
export type CandidateRigUnapprovedRegistrationProposal = z.infer<
  typeof candidateRigUnapprovedRegistrationProposalSchema
>;
export type CandidateRigRegistrationCorrectionPatch = z.infer<
  typeof candidateRigRegistrationCorrectionPatchSchema
>;
export type CandidateRigPrivateRegistrationDiagnosticReceipt = z.infer<
  typeof candidateRigPrivateRegistrationDiagnosticReceiptSchema
>;
export type CandidateRigGapOrbitMeasurementReport = z.infer<
  typeof candidateRigGapOrbitMeasurementReportSchema
>;
export type CandidateRigJointDerivationEvidence = z.infer<
  typeof candidateRigJointDerivationEvidenceSchema
>;
export type CandidateRigStaticGateOneDecision = z.infer<
  typeof candidateRigStaticGateOneDecisionSchema
>;
export type CandidateRigAllViewStaticGateOneBundle = z.infer<
  typeof candidateRigAllViewStaticGateOneBundleSchema
>;
