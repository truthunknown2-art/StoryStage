import { z } from "zod";
import { hashCanonical } from "./canonical-hash";
import {
  characterRigAssetRequestSchema,
  characterRigCandidateBundleSchema,
  kidsBipedV1TopologyTemplate,
} from "./character-rig-acquisition";
import {
  characterRigExposureRoleSchema,
  characterRigImportReceiptSchema,
  characterRigPartRoleSchema,
  characterRigStagingReportSchema,
  validateCharacterRigImportReceipt,
} from "./character-rig-preparation";
import { hashSchema, identifierSchema } from "./model";

const registrationViewSchema = z.enum([
  "front",
  "profile-left",
  "profile-right",
]);

const localPointSchema = z
  .object({
    x: z.number().int().nonnegative(),
    y: z.number().int().nonnegative(),
  })
  .strict();

const rectSchema = z
  .object({
    x: z.number().int().nonnegative(),
    y: z.number().int().nonnegative(),
    width: z.number().int().positive(),
    height: z.number().int().positive(),
  })
  .strict();

const atlasKindSchema = z.enum(["parts", "face"]);

const registrationSourceBindingSchema = z
  .object({
    requestItemId: identifierSchema,
    candidateId: identifierSchema,
    stagedContentHash: hashSchema,
    atlasKind: atlasKindSchema,
    atlasCell: rectSchema,
  })
  .strict();

const registrationLineageSchema = z
  .object({
    requestContentHash: hashSchema,
    candidateBundleContentHash: hashSchema,
    stagingReportContentHash: hashSchema,
    importReceiptContentHash: hashSchema,
    identityLockContentHash: hashSchema,
    topologyTemplateContentHash: z.literal(
      kidsBipedV1TopologyTemplate.contentHash,
    ),
  })
  .strict();

const turnaroundGuidanceSchema = z
  .object({
    candidateId: identifierSchema,
    candidateContentHash: hashSchema,
    coverageEvidenceContentHash: hashSchema,
    coverageEvidenceFileContentHash: hashSchema,
    derivedViewContentHash: hashSchema,
    width: z.literal(576),
    height: z.literal(832),
    targetCharacterHeight: z.literal(768),
    baselineY: z.literal(800),
    semanticDirection: z.enum([
      "neutral-front",
      "faces-screen-left",
      "faces-screen-right",
    ]),
    normalizationVerification: z.literal(
      "rederived-coverage-cell-alpha-bounds-v1",
    ),
    mirroringAllowed: z.literal(false),
  })
  .strict();

const tabRoiFeatureSelectorSchema = z
  .object({
    id: identifierSchema,
    kind: z.literal("tab-roi"),
    atlasKind: z.enum(["parts", "face"]),
    coordinateSpace: z.literal("component-local"),
    direction: z.enum(["north", "east", "south", "west"]),
    roi: rectSchema,
  })
  .strict();

const alphaCentroidFeatureSelectorSchema = z
  .object({
    id: identifierSchema,
    kind: z.literal("alpha-centroid"),
    atlasKind: z.enum(["parts", "face"]),
  })
  .strict();

const principalAxisFeatureSelectorSchema = z
  .object({
    id: identifierSchema,
    kind: z.literal("principal-axis-end"),
    atlasKind: z.enum(["parts", "face"]),
    end: z.enum(["start", "finish"]),
  })
  .strict();

const sealedLowerFaceFeatureSelectorSchema = z
  .object({
    id: identifierSchema,
    kind: z.literal("sealed-lower-face-anchor"),
    atlasKind: z.literal("face"),
    anchor: z.enum(["pivot", "nose"]),
    contractContentHash: hashSchema,
  })
  .strict();

export const candidateRigRegistrationFeatureSelectorSchema =
  z.discriminatedUnion("kind", [
    tabRoiFeatureSelectorSchema,
    alphaCentroidFeatureSelectorSchema,
    principalAxisFeatureSelectorSchema,
    sealedLowerFaceFeatureSelectorSchema,
  ]);

const guideLandmarkSchema = z
  .object({
    id: identifierSchema,
    point: localPointSchema,
    visibility: z.enum(["visible", "occluded-reviewed"]),
  })
  .strict();

const alignmentBindingSchema = z
  .object({
    sourceFeatureId: identifierSchema,
    guidanceLandmarkId: identifierSchema,
  })
  .strict();

const partAnnotationSchema = z
  .object({
    role: characterRigPartRoleSchema,
    parentRole: characterRigPartRoleSchema.nullable(),
    parentSocketId: identifierSchema.nullable(),
    source: registrationSourceBindingSchema,
    sourceFeatures: z
      .array(candidateRigRegistrationFeatureSelectorSchema)
      .min(1),
    childPivotFeatureId: identifierSchema,
    alignments: z.array(alignmentBindingSchema).min(1),
  })
  .strict();

const exposureAnnotationSchema = z
  .object({
    role: characterRigExposureRoleSchema,
    targetRole: characterRigPartRoleSchema,
    source: registrationSourceBindingSchema,
    sourceAnchor: candidateRigRegistrationFeatureSelectorSchema,
    targetAnchorFeatureId: identifierSchema,
    registrationMode: z.literal("inherit-target-registration"),
  })
  .strict();

const overlapPairSchema = z
  .object({
    leftRole: characterRigPartRoleSchema,
    rightRole: characterRigPartRoleSchema,
    disposition: z.enum(["can-overlap", "cannot-overlap"]),
  })
  .strict();

const occlusionEdgeSchema = z
  .object({
    behindRole: characterRigPartRoleSchema,
    inFrontOfRole: characterRigPartRoleSchema,
  })
  .strict();

const expectedSemanticDirection = {
  front: "neutral-front",
  "profile-left": "faces-screen-left",
  "profile-right": "faces-screen-right",
} as const;

const canonicalPartRoles = kidsBipedV1TopologyTemplate.parts.map(
  (part) => part.role,
);
const canonicalExposureRoles = kidsBipedV1TopologyTemplate.exposures.map(
  (exposure) => exposure.role,
);
const canonicalPartIndex = new Map<string, number>(
  canonicalPartRoles.map((role, index) => [role, index]),
);
const canonicalPartPairs = canonicalPartRoles.flatMap((leftRole, leftIndex) =>
  canonicalPartRoles.slice(leftIndex + 1).map((rightRole) => ({
    leftRole,
    rightRole,
  })),
);

const sameOrder = (left: string[], right: string[]) =>
  hashCanonical(left) === hashCanonical(right);

const assertCanonicalUniqueIds = (
  ids: string[],
  path: Array<string | number>,
  label: string,
  context: z.RefinementCtx,
) => {
  const sorted = [...ids].sort((left, right) => left.localeCompare(right));
  if (new Set(ids).size !== ids.length || !sameOrder(ids, sorted))
    context.addIssue({
      code: "custom",
      path,
      message: `${label} must be unique and canonically ordered.`,
    });
};

const directedGraphHasCycle = (
  nodes: string[],
  edges: Array<{ from: string; to: string }>,
) => {
  const next = new Map(nodes.map((node) => [node, [] as string[]]));
  for (const edge of edges) next.get(edge.from)?.push(edge.to);
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const visit = (node: string): boolean => {
    if (visiting.has(node)) return true;
    if (visited.has(node)) return false;
    visiting.add(node);
    for (const child of next.get(node) ?? []) if (visit(child)) return true;
    visiting.delete(node);
    visited.add(node);
    return false;
  };
  return nodes.some(visit);
};

const pairKey = (left: string, right: string) =>
  [left, right]
    .sort(
      (a, b) =>
        (canonicalPartIndex.get(a) ?? -1) - (canonicalPartIndex.get(b) ?? -1),
    )
    .join(":");

const rectanglesOverlap = (
  left: z.infer<typeof rectSchema>,
  right: z.infer<typeof rectSchema>,
) =>
  left.x < right.x + right.width &&
  left.x + left.width > right.x &&
  left.y < right.y + right.height &&
  left.y + left.height > right.y;

const candidateRigRegistrationAnnotationMapFields = {
  schemaVersion: z.literal("1.0"),
  mapKind: z.literal("candidate-rig-registration-annotation"),
  authorityDomain: z.literal("source-review-registration-annotation"),
  annotationState: z.literal("proposed"),
  annotationId: identifierSchema,
  view: registrationViewSchema,
  lineage: registrationLineageSchema,
  turnaroundGuidance: turnaroundGuidanceSchema,
  guideLandmarks: z.array(guideLandmarkSchema).min(2),
  parts: z.array(partAnnotationSchema).length(canonicalPartRoles.length),
  exposures: z
    .array(exposureAnnotationSchema)
    .length(canonicalExposureRoles.length),
  pairDispositions: z
    .array(overlapPairSchema)
    .length(canonicalPartPairs.length),
  occlusionEdges: z.array(occlusionEdgeSchema),
  reviewStatus: z.literal("awaiting-preston-review"),
  prestonReviewRecordContentHash: z.null(),
  providerAuthority: z.literal(false),
  approvalAuthority: z.literal(false),
  approvalRequired: z.literal(true),
  productionBindable: z.literal(false),
};

const refineAnnotationMap = (
  map: {
    view: z.infer<typeof registrationViewSchema>;
    turnaroundGuidance: z.infer<typeof turnaroundGuidanceSchema>;
    guideLandmarks: Array<z.infer<typeof guideLandmarkSchema>>;
    parts: Array<z.infer<typeof partAnnotationSchema>>;
    exposures: Array<z.infer<typeof exposureAnnotationSchema>>;
    pairDispositions: Array<z.infer<typeof overlapPairSchema>>;
    occlusionEdges: Array<z.infer<typeof occlusionEdgeSchema>>;
  },
  context: z.RefinementCtx,
) => {
  if (
    map.turnaroundGuidance.semanticDirection !==
    expectedSemanticDirection[map.view]
  )
    context.addIssue({
      code: "custom",
      path: ["turnaroundGuidance", "semanticDirection"],
      message: "Turnaround guidance direction must match its declared view.",
    });

  assertCanonicalUniqueIds(
    map.guideLandmarks.map((landmark) => landmark.id),
    ["guideLandmarks"],
    "Guide landmark ids",
    context,
  );
  const landmarkIds = new Set(
    map.guideLandmarks.map((landmark) => landmark.id),
  );
  for (const [index, landmark] of map.guideLandmarks.entries())
    if (landmark.point.x >= 576 || landmark.point.y >= 832)
      context.addIssue({
        code: "custom",
        path: ["guideLandmarks", index, "point"],
        message: `Guide landmark ${landmark.id} leaves the normalized 576x832 turnaround canvas.`,
      });

  if (
    !sameOrder(
      map.parts.map((part) => part.role),
      canonicalPartRoles,
    )
  )
    context.addIssue({
      code: "custom",
      path: ["parts"],
      message:
        "Registration annotations must cover the exact canonical 29 part roles in topology order.",
    });
  for (const [index, part] of map.parts.entries()) {
    const topology = kidsBipedV1TopologyTemplate.parts[index];
    if (
      !topology ||
      part.role !== topology.role ||
      part.parentRole !== topology.parentRole ||
      part.parentSocketId !== topology.parentSocketId
    )
      context.addIssue({
        code: "custom",
        path: ["parts", index],
        message: `Registration annotation ${part.role} must preserve exact topology parent/socket ownership.`,
      });
    assertCanonicalUniqueIds(
      part.sourceFeatures.map((feature) => feature.id),
      ["parts", index, "sourceFeatures"],
      `Source feature ids for ${part.role}`,
      context,
    );
    const featureIds = new Set(
      part.sourceFeatures.map((feature) => feature.id),
    );
    if (
      part.sourceFeatures.filter(
        (feature) => feature.id === part.childPivotFeatureId,
      ).length !== 1
    )
      context.addIssue({
        code: "custom",
        path: ["parts", index, "childPivotFeatureId"],
        message: `Registration annotation ${part.role} must name exactly one declared child-pivot feature.`,
      });
    for (const [featureIndex, feature] of part.sourceFeatures.entries())
      if (feature.atlasKind !== part.source.atlasKind)
        context.addIssue({
          code: "custom",
          path: ["parts", index, "sourceFeatures", featureIndex, "atlasKind"],
          message: `Registration feature ${feature.id} must use ${part.role}'s exact bound atlas kind.`,
        });
    const alignmentKeys = part.alignments.map(
      (binding) => `${binding.sourceFeatureId}:${binding.guidanceLandmarkId}`,
    );
    assertCanonicalUniqueIds(
      alignmentKeys,
      ["parts", index, "alignments"],
      `Alignment bindings for ${part.role}`,
      context,
    );
    if (
      !sameOrder(
        part.alignments
          .map((binding) => binding.sourceFeatureId)
          .sort((left, right) => left.localeCompare(right)),
        [...featureIds].sort((left, right) => left.localeCompare(right)),
      )
    )
      context.addIssue({
        code: "custom",
        path: ["parts", index, "alignments"],
        message: `Registration annotation ${part.role} must align every declared source feature exactly once.`,
      });
    for (const [alignmentIndex, binding] of part.alignments.entries()) {
      if (!featureIds.has(binding.sourceFeatureId))
        context.addIssue({
          code: "custom",
          path: [
            "parts",
            index,
            "alignments",
            alignmentIndex,
            "sourceFeatureId",
          ],
          message: `Alignment references undeclared source feature ${binding.sourceFeatureId}.`,
        });
      if (!landmarkIds.has(binding.guidanceLandmarkId))
        context.addIssue({
          code: "custom",
          path: [
            "parts",
            index,
            "alignments",
            alignmentIndex,
            "guidanceLandmarkId",
          ],
          message: `Alignment references undeclared guide landmark ${binding.guidanceLandmarkId}.`,
        });
    }
  }
  const globalFeatureIds = map.parts.flatMap((part) =>
    part.sourceFeatures.map((feature) => feature.id),
  );
  if (new Set(globalFeatureIds).size !== globalFeatureIds.length)
    context.addIssue({
      code: "custom",
      path: ["parts"],
      message:
        "Registration source feature ids must be globally unique; one measured feature cannot own two semantic roles.",
    });

  if (
    !sameOrder(
      map.exposures.map((exposure) => exposure.role),
      canonicalExposureRoles,
    )
  )
    context.addIssue({
      code: "custom",
      path: ["exposures"],
      message:
        "Registration annotations must cover the exact canonical 13 exposure roles in topology order.",
    });
  for (const [index, exposure] of map.exposures.entries()) {
    const topology = kidsBipedV1TopologyTemplate.exposures[index];
    const targetPart = map.parts.find(
      (part) => part.role === exposure.targetRole,
    );
    if (
      !topology ||
      exposure.role !== topology.role ||
      exposure.targetRole !== topology.targetRole
    )
      context.addIssue({
        code: "custom",
        path: ["exposures", index],
        message: `Registration exposure ${exposure.role} must preserve its exact topology target.`,
      });
    if (exposure.sourceAnchor.atlasKind !== exposure.source.atlasKind)
      context.addIssue({
        code: "custom",
        path: ["exposures", index, "sourceAnchor", "atlasKind"],
        message: `Registration exposure ${exposure.role} anchor must use its exact bound atlas kind.`,
      });
    if (
      !targetPart ||
      exposure.targetAnchorFeatureId !== targetPart.childPivotFeatureId
    )
      context.addIssue({
        code: "custom",
        path: ["exposures", index, "targetAnchorFeatureId"],
        message: `Registration exposure ${exposure.role} must explicitly align to ${exposure.targetRole}'s reviewed child-pivot feature.`,
      });
  }

  const exposureAnchorIds = map.exposures.map(
    (exposure) => exposure.sourceAnchor.id,
  );
  if (
    new Set([...globalFeatureIds, ...exposureAnchorIds]).size !==
    globalFeatureIds.length + exposureAnchorIds.length
  )
    context.addIssue({
      code: "custom",
      path: ["exposures"],
      message:
        "Registration exposure anchor ids must be globally unique and cannot reuse part feature ids.",
    });

  const sourceCells = [
    ...map.parts.map((part, index) => ({
      path: ["parts", index, "source", "atlasCell"] as Array<string | number>,
      label: part.role,
      source: part.source,
    })),
    ...map.exposures.map((exposure, index) => ({
      path: ["exposures", index, "source", "atlasCell"] as Array<
        string | number
      >,
      label: exposure.role,
      source: exposure.source,
    })),
  ];
  for (const [index, current] of sourceCells.entries())
    for (const previous of sourceCells.slice(0, index))
      if (
        current.source.candidateId === previous.source.candidateId &&
        current.source.requestItemId === previous.source.requestItemId &&
        current.source.stagedContentHash ===
          previous.source.stagedContentHash &&
        current.source.atlasKind === previous.source.atlasKind &&
        rectanglesOverlap(current.source.atlasCell, previous.source.atlasCell)
      )
        context.addIssue({
          code: "custom",
          path: current.path,
          message: `Registration source cell ${current.label} overlaps ${previous.label} in the same exact source raster.`,
        });

  const actualPairKeys = map.pairDispositions.map((pair) =>
    pairKey(pair.leftRole, pair.rightRole),
  );
  const expectedPairKeys = canonicalPartPairs.map((pair) =>
    pairKey(pair.leftRole, pair.rightRole),
  );
  if (
    new Set(actualPairKeys).size !== actualPairKeys.length ||
    !sameOrder(actualPairKeys, expectedPairKeys)
  )
    context.addIssue({
      code: "custom",
      path: ["pairDispositions"],
      message:
        "Pair dispositions must cover every canonical unordered part pair exactly once in topology order.",
    });
  for (const [index, pair] of map.pairDispositions.entries())
    if (
      pair.leftRole === pair.rightRole ||
      (canonicalPartIndex.get(pair.leftRole) ?? -1) >=
        (canonicalPartIndex.get(pair.rightRole) ?? -1)
    )
      context.addIssue({
        code: "custom",
        path: ["pairDispositions", index],
        message:
          "Pair dispositions must use distinct roles in canonical topology order.",
      });

  const overlapKeys = map.pairDispositions
    .filter((pair) => pair.disposition === "can-overlap")
    .map((pair) => pairKey(pair.leftRole, pair.rightRole));

  const edgesByPair = new Map<string, number>();
  for (const [index, edge] of map.occlusionEdges.entries()) {
    if (edge.behindRole === edge.inFrontOfRole)
      context.addIssue({
        code: "custom",
        path: ["occlusionEdges", index],
        message: "A role cannot occlude itself.",
      });
    const key = pairKey(edge.behindRole, edge.inFrontOfRole);
    edgesByPair.set(key, (edgesByPair.get(key) ?? 0) + 1);
    if (!overlapKeys.includes(key))
      context.addIssue({
        code: "custom",
        path: ["occlusionEdges", index],
        message: "Occlusion edges may only order declared overlap pairs.",
      });
  }
  for (const [index, key] of overlapKeys.entries())
    if (edgesByPair.get(key) !== 1)
      context.addIssue({
        code: "custom",
        path: ["pairDispositions", index],
        message:
          "Every can-overlap disposition requires exactly one occlusion direction.",
      });
  if (
    directedGraphHasCycle(
      canonicalPartRoles,
      map.occlusionEdges.map((edge) => ({
        from: edge.behindRole,
        to: edge.inFrontOfRole,
      })),
    )
  )
    context.addIssue({
      code: "custom",
      path: ["occlusionEdges"],
      message: "Registration occlusion constraints must be acyclic.",
    });
};

export const candidateRigRegistrationAnnotationMapDraftSchema = z
  .object(candidateRigRegistrationAnnotationMapFields)
  .strict()
  .superRefine(refineAnnotationMap);

export const candidateRigRegistrationAnnotationMapSchema = z
  .object({
    ...candidateRigRegistrationAnnotationMapFields,
    contentHash: hashSchema,
  })
  .strict()
  .superRefine((map, context) => {
    refineAnnotationMap(map, context);
    const { contentHash, ...draft } = map;
    if (hashCanonical(draft) !== contentHash)
      context.addIssue({
        code: "custom",
        path: ["contentHash"],
        message: "Registration annotation map hash is invalid.",
      });
  });

export const createCandidateRigRegistrationAnnotationMap = (
  rawDraft: unknown,
) => {
  const draft =
    candidateRigRegistrationAnnotationMapDraftSchema.parse(rawDraft);
  return candidateRigRegistrationAnnotationMapSchema.parse({
    ...draft,
    contentHash: hashCanonical(draft),
  });
};

const prestonAnnotationReviewFields = {
  schemaVersion: z.literal("1.0"),
  recordKind: z.literal("candidate-rig-registration-annotation-review"),
  authorityDomain: z.literal("source-review-registration-annotation"),
  reviewId: identifierSchema,
  reviewerId: z.literal("preston"),
  reviewScope: z.literal("measurement-input-only"),
  annotationMapContentHash: hashSchema,
  view: registrationViewSchema,
  decision: z.enum(["accepted-for-measurement", "rejected"]),
  checks: z
    .object({
      visualRoles: z.boolean(),
      semanticDirection: z.boolean(),
      featureSemantics: z.boolean(),
      guidanceLandmarks: z.boolean(),
      occlusionSemantics: z.boolean(),
    })
    .strict(),
  findings: z.array(z.string().trim().min(1).max(500)),
  machineOwned: z.literal(false),
  providerAuthority: z.literal(false),
  approvalAuthority: z.literal(false),
  approvalRequired: z.literal(true),
  productionBindable: z.literal(false),
};

const refinePrestonReview = (
  review: { decision: string; checks: Record<string, boolean> },
  context: z.RefinementCtx,
) => {
  const allPassed = Object.values(review.checks).every(Boolean);
  if (
    (review.decision === "accepted-for-measurement" && !allPassed) ||
    (review.decision === "rejected" && allPassed)
  )
    context.addIssue({
      code: "custom",
      path: ["checks"],
      message:
        "Preston annotation review decision must exactly reflect its semantic checks.",
    });
};

export const prestonCandidateRigRegistrationAnnotationReviewDraftSchema = z
  .object(prestonAnnotationReviewFields)
  .strict()
  .superRefine(refinePrestonReview);

export const prestonCandidateRigRegistrationAnnotationReviewSchema = z
  .object({ ...prestonAnnotationReviewFields, contentHash: hashSchema })
  .strict()
  .superRefine((review, context) => {
    refinePrestonReview(review, context);
    const { contentHash, ...draft } = review;
    if (hashCanonical(draft) !== contentHash)
      context.addIssue({
        code: "custom",
        path: ["contentHash"],
        message: "Preston registration annotation review hash is invalid.",
      });
  });

export const createPrestonCandidateRigRegistrationAnnotationReview = (
  rawDraft: unknown,
) => {
  const draft =
    prestonCandidateRigRegistrationAnnotationReviewDraftSchema.parse(rawDraft);
  return prestonCandidateRigRegistrationAnnotationReviewSchema.parse({
    ...draft,
    contentHash: hashCanonical(draft),
  });
};

const deepFreeze = <Value>(value: Value): Readonly<Value> => {
  if (value && typeof value === "object") {
    Object.values(value as Record<string, unknown>).forEach((child) =>
      deepFreeze(child),
    );
    Object.freeze(value);
  }
  return value;
};

const formulaDescriptorDraft = {
  schemaVersion: "1.0" as const,
  descriptorKind: "registration-similarity-formula" as const,
  descriptorId: "binary64-procrustes-similarity-v1" as const,
  numericModel:
    "ECMAScript Number (IEEE-754 binary64) with host Math transcendental functions" as const,
  orderedSteps: [
    "Compute source and target centroids with binary64 addition and division.",
    "Accumulate centered dot, cross, and squared-source terms in input order.",
    "Compute rotation with Math.atan2(cross,dot) and scale with Math.hypot(dot,cross)/squaredSource.",
    "Compute translation from target centroid minus the Math.cos/Math.sin rotated and scaled source centroid.",
    "Compute residuals with Math.hypot, then quantize published microunits by round-half-away-from-zero.",
  ] as const,
  degeneracyRule:
    "Reject fewer than two correspondences, non-finite intermediates, non-positive scale, or squaredSource <= Number.EPSILON." as const,
};

const exerciseDescriptorDraft = {
  schemaVersion: "1.0" as const,
  descriptorKind: "registration-similarity-exercises" as const,
  descriptorId: "binary64-procrustes-similarity-exercises-v1" as const,
  executionStatus: "pending" as const,
  exercises: [
    {
      id: "identity-two-point",
      source: [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
      ],
      target: [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
      ],
      expectedQuantized: {
        scaleMillionths: 1_000_000,
        rotationMicrodegrees: 0,
        xMicropixels: 0,
        yMicropixels: 0,
      },
    },
    {
      id: "quarter-turn-translate",
      source: [
        { x: 0, y: 0 },
        { x: 2, y: 0 },
      ],
      target: [
        { x: 4, y: 5 },
        { x: 4, y: 9 },
      ],
      expectedQuantized: {
        scaleMillionths: 2_000_000,
        rotationMicrodegrees: 90_000_000,
        xMicropixels: 4_000_000,
        yMicropixels: 5_000_000,
      },
    },
  ] as const,
};

const formulaDescriptor = {
  ...formulaDescriptorDraft,
  contentHash: hashCanonical(formulaDescriptorDraft),
};
const exerciseDescriptor = {
  ...exerciseDescriptorDraft,
  contentHash: hashCanonical(exerciseDescriptorDraft),
};
const measurementAlgorithmContractDraft = {
  schemaVersion: "1.0" as const,
  contractKind: "candidate-rig-registration-algorithm" as const,
  id: "alpha-tab-binary64-similarity-registration" as const,
  version: "2.0.0" as const,
  alphaSupportThreshold: 1 as const,
  alphaCoreThreshold: 128 as const,
  connectivity: 8 as const,
  outputPadding: 8 as const,
  solver: "ordered-binary64-procrustes-v1" as const,
  quantization: "round-half-away-from-zero-to-integer-microunits" as const,
  maxResidualMicropixels: 500_000 as const,
  crossRuntimeBitExact: false as const,
  sourceIdentityClaimed: false as const,
  behaviorSourceReceiptStatus: "pending" as const,
  formulaDescriptor,
  exerciseDescriptor,
};

export const candidateRigRegistrationMeasurementAlgorithmContract = deepFreeze({
  ...measurementAlgorithmContractDraft,
  contentHash: hashCanonical(measurementAlgorithmContractDraft),
});

const formulaDescriptorSchema = z
  .object({
    schemaVersion: z.literal(formulaDescriptor.schemaVersion),
    descriptorKind: z.literal(formulaDescriptor.descriptorKind),
    descriptorId: z.literal(formulaDescriptor.descriptorId),
    numericModel: z.literal(formulaDescriptor.numericModel),
    orderedSteps: z.tuple(
      formulaDescriptor.orderedSteps.map((step) => z.literal(step)) as [
        z.ZodLiteral<string>,
        z.ZodLiteral<string>,
        z.ZodLiteral<string>,
        z.ZodLiteral<string>,
        z.ZodLiteral<string>,
      ],
    ),
    degeneracyRule: z.literal(formulaDescriptor.degeneracyRule),
    contentHash: z.literal(formulaDescriptor.contentHash),
  })
  .strict();

const exercisePointSchema = z.object({ x: z.number(), y: z.number() }).strict();
const expectedQuantizedSchema = z
  .object({
    scaleMillionths: z.number().int(),
    rotationMicrodegrees: z.number().int(),
    xMicropixels: z.number().int(),
    yMicropixels: z.number().int(),
  })
  .strict();
const exerciseDescriptorSchema = z
  .object({
    schemaVersion: z.literal(exerciseDescriptor.schemaVersion),
    descriptorKind: z.literal(exerciseDescriptor.descriptorKind),
    descriptorId: z.literal(exerciseDescriptor.descriptorId),
    executionStatus: z.literal("pending"),
    exercises: z.tuple([
      z
        .object({
          id: z.literal("identity-two-point"),
          source: z.tuple([exercisePointSchema, exercisePointSchema]),
          target: z.tuple([exercisePointSchema, exercisePointSchema]),
          expectedQuantized: expectedQuantizedSchema,
        })
        .strict(),
      z
        .object({
          id: z.literal("quarter-turn-translate"),
          source: z.tuple([exercisePointSchema, exercisePointSchema]),
          target: z.tuple([exercisePointSchema, exercisePointSchema]),
          expectedQuantized: expectedQuantizedSchema,
        })
        .strict(),
    ]),
    contentHash: z.literal(exerciseDescriptor.contentHash),
  })
  .strict();

const measurementAlgorithmSchema = z
  .object({
    schemaVersion: z.literal("1.0"),
    contractKind: z.literal("candidate-rig-registration-algorithm"),
    id: z.literal("alpha-tab-binary64-similarity-registration"),
    version: z.literal("2.0.0"),
    alphaSupportThreshold: z.literal(1),
    alphaCoreThreshold: z.literal(128),
    connectivity: z.literal(8),
    outputPadding: z.literal(8),
    solver: z.literal("ordered-binary64-procrustes-v1"),
    quantization: z.literal("round-half-away-from-zero-to-integer-microunits"),
    maxResidualMicropixels: z.literal(500_000),
    crossRuntimeBitExact: z.literal(false),
    sourceIdentityClaimed: z.literal(false),
    behaviorSourceReceiptStatus: z.literal("pending"),
    formulaDescriptor: formulaDescriptorSchema,
    exerciseDescriptor: exerciseDescriptorSchema,
    contentHash: z.literal(
      candidateRigRegistrationMeasurementAlgorithmContract.contentHash,
    ),
  })
  .strict()
  .superRefine((contract, context) => {
    const { contentHash, ...draft } = contract;
    if (hashCanonical(draft) !== contentHash)
      context.addIssue({
        code: "custom",
        path: ["contentHash"],
        message: "Registration algorithm contract hash is invalid.",
      });
  });

const sourceImportSchema = z
  .object({
    atlasKind: atlasKindSchema,
    requestItemId: identifierSchema,
    candidateId: identifierSchema,
    candidateContentHash: hashSchema,
    stagedContentHash: hashSchema,
    immutableLocationId: z.string().regex(/^sha256:[a-f0-9]{64}$/),
    stagedRelativeFile: z.string().trim().min(1),
    byteLength: z.number().int().positive(),
    width: z.number().int().positive().max(8192),
    height: z.number().int().positive().max(8192),
    allowedRoles: z.array(z.string().trim().min(1)).min(1),
  })
  .strict();

const programPartSourceSchema = z
  .object({
    role: characterRigPartRoleSchema,
    source: registrationSourceBindingSchema,
    childPivotFeatureId: identifierSchema,
  })
  .strict();
const programExposureSourceSchema = z
  .object({
    role: characterRigExposureRoleSchema,
    source: registrationSourceBindingSchema,
    sourceAnchor: candidateRigRegistrationFeatureSelectorSchema,
    targetAnchorFeatureId: identifierSchema,
  })
  .strict();

const candidateRigRegistrationMeasurementProgramFields = {
  schemaVersion: z.literal("1.0"),
  programKind: z.literal("candidate-rig-registration-measurement-program"),
  compiler: z
    .object({
      id: z.literal("story-engine-registration-program-compiler"),
      version: z.literal("1.0.0"),
    })
    .strict(),
  programId: identifierSchema,
  view: registrationViewSchema,
  lineage: registrationLineageSchema,
  annotationMapContentHash: hashSchema,
  prestonReviewRecordContentHash: hashSchema,
  sourceImports: z.tuple([sourceImportSchema, sourceImportSchema]),
  partSources: z
    .array(programPartSourceSchema)
    .length(canonicalPartRoles.length),
  exposureSources: z
    .array(programExposureSourceSchema)
    .length(canonicalExposureRoles.length),
  algorithm: measurementAlgorithmSchema,
  transformConvention: z.literal("parent-pivot-local-v1"),
  sourceMappingAuthority: z.literal("compiled-from-exact-reviewed-ledger"),
  behaviorSourceReceiptStatus: z.literal("pending"),
  providerAuthority: z.literal(false),
  approvalAuthority: z.literal(false),
  approvalRequired: z.literal(true),
  productionBindable: z.literal(false),
};

export const candidateRigRegistrationMeasurementProgramSchema = z
  .object({
    ...candidateRigRegistrationMeasurementProgramFields,
    contentHash: hashSchema,
  })
  .strict()
  .superRefine((program, context) => {
    const { contentHash, ...draft } = program;
    if (hashCanonical(draft) !== contentHash)
      context.addIssue({
        code: "custom",
        path: ["contentHash"],
        message: "Registration measurement program hash is invalid.",
      });
  });

const assertSourceBinding = (
  source: z.infer<typeof registrationSourceBindingSchema>,
  role: string,
  expectedView: z.infer<typeof registrationViewSchema>,
  requestItems: Map<
    string,
    z.infer<typeof characterRigAssetRequestSchema>["items"][number]
  >,
  candidates: Map<
    string,
    z.infer<typeof characterRigCandidateBundleSchema>["assets"][number]
  >,
  stagedAssets: Map<
    string,
    z.infer<typeof characterRigStagingReportSchema>["assets"][number]
  >,
  importedFiles: Map<
    string,
    z.infer<typeof characterRigImportReceiptSchema>["files"][number]
  >,
) => {
  const item = requestItems.get(source.requestItemId);
  const candidate = candidates.get(source.candidateId);
  const staged = stagedAssets.get(source.candidateId);
  const imported = importedFiles.get(source.candidateId);
  if (
    !item ||
    !candidate ||
    !staged ||
    !imported ||
    item.view !== expectedView ||
    item.kind !== `${source.atlasKind}-kit` ||
    !item.requiredComponents.includes(role as never) ||
    candidate.requestItemId !== item.id ||
    staged.requestItemId !== item.id ||
    imported.requestItemId !== item.id ||
    staged.stagedContentHash !== source.stagedContentHash ||
    candidate.contentHash !== source.stagedContentHash ||
    imported.sourceContentHash !== source.stagedContentHash ||
    staged.width !== candidate.width ||
    staged.height !== candidate.height ||
    imported.width !== staged.width ||
    imported.height !== staged.height ||
    source.atlasCell.x + source.atlasCell.width > staged.width ||
    source.atlasCell.y + source.atlasCell.height > staged.height
  )
    throw new Error(
      `Registration source ${role} is not bound to the exact allowed request, candidate, staging, and import ledger entry.`,
    );
};

export const compileCandidateRigRegistrationMeasurementProgram = (raw: {
  request: unknown;
  bundle: unknown;
  stagingReport: unknown;
  importReceipt: unknown;
  annotationMap: unknown;
  prestonReview: unknown;
}) => {
  const request = characterRigAssetRequestSchema.parse(raw.request);
  const bundle = characterRigCandidateBundleSchema.parse(raw.bundle);
  const stagingReport = characterRigStagingReportSchema.parse(
    raw.stagingReport,
  );
  const importReceipt = characterRigImportReceiptSchema.parse(
    raw.importReceipt,
  );
  validateCharacterRigImportReceipt(
    request,
    bundle,
    stagingReport,
    importReceipt,
  );
  const annotation = candidateRigRegistrationAnnotationMapSchema.parse(
    raw.annotationMap,
  );
  const review = prestonCandidateRigRegistrationAnnotationReviewSchema.parse(
    raw.prestonReview,
  );
  if (
    annotation.lineage.requestContentHash !== request.contentHash ||
    annotation.lineage.candidateBundleContentHash !== bundle.contentHash ||
    annotation.lineage.stagingReportContentHash !== stagingReport.contentHash ||
    annotation.lineage.importReceiptContentHash !== importReceipt.contentHash ||
    annotation.lineage.identityLockContentHash !==
      request.identityLock.contentHash ||
    annotation.lineage.topologyTemplateContentHash !==
      request.rigProfile.templateContentHash ||
    review.annotationMapContentHash !== annotation.contentHash ||
    review.view !== annotation.view ||
    review.decision !== "accepted-for-measurement"
  )
    throw new Error(
      "Registration program compilation requires the exact imported ledger and Preston-accepted annotation.",
    );

  const requestItems = new Map(request.items.map((item) => [item.id, item]));
  const candidates = new Map(
    bundle.assets.map((asset) => [asset.candidateId, asset]),
  );
  const stagedAssets = new Map(
    stagingReport.assets.map((asset) => [asset.candidateId, asset]),
  );
  const importedFiles = new Map(
    importReceipt.files.map((file) => [file.candidateId, file]),
  );
  for (const part of annotation.parts)
    assertSourceBinding(
      part.source,
      part.role,
      annotation.view,
      requestItems,
      candidates,
      stagedAssets,
      importedFiles,
    );
  for (const exposure of annotation.exposures)
    assertSourceBinding(
      exposure.source,
      exposure.role,
      annotation.view,
      requestItems,
      candidates,
      stagedAssets,
      importedFiles,
    );

  const sourceImports = (["parts", "face"] as const).map((atlasKind) => {
    const item = request.items.find(
      (candidate) =>
        candidate.view === annotation.view &&
        candidate.kind === `${atlasKind}-kit`,
    );
    const candidate = item
      ? bundle.assets.find((asset) => asset.requestItemId === item.id)
      : undefined;
    const staged = candidate
      ? stagingReport.assets.find(
          (asset) => asset.candidateId === candidate.candidateId,
        )
      : undefined;
    const imported = candidate
      ? importReceipt.files.find(
          (file) => file.candidateId === candidate.candidateId,
        )
      : undefined;
    if (!item || !candidate || !staged || !imported)
      throw new Error(
        `Registration program is missing the exact ${atlasKind} import ledger entry.`,
      );
    const mappedRoles = [
      ...annotation.parts
        .filter((part) => part.source.atlasKind === atlasKind)
        .map((part) => part.role),
      ...annotation.exposures
        .filter((exposure) => exposure.source.atlasKind === atlasKind)
        .map((exposure) => exposure.role),
    ].sort((left, right) => left.localeCompare(right));
    const allowedRoles = [...item.requiredComponents].sort((left, right) =>
      left.localeCompare(right),
    );
    if (!sameOrder(mappedRoles, allowedRoles))
      throw new Error(
        `Registration ${atlasKind} source mapping must cover the exact request-item role allowlist once.`,
      );
    return {
      atlasKind,
      requestItemId: item.id,
      candidateId: candidate.candidateId,
      candidateContentHash: candidate.contentHash,
      stagedContentHash: staged.stagedContentHash,
      immutableLocationId: imported.immutableLocationId,
      stagedRelativeFile: imported.stagedRelativeFile,
      byteLength: imported.byteLength,
      width: imported.width,
      height: imported.height,
      allowedRoles,
    };
  }) as [
    z.infer<typeof sourceImportSchema>,
    z.infer<typeof sourceImportSchema>,
  ];

  const draft = {
    schemaVersion: "1.0" as const,
    programKind: "candidate-rig-registration-measurement-program" as const,
    compiler: {
      id: "story-engine-registration-program-compiler" as const,
      version: "1.0.0" as const,
    },
    programId: `registration-program-${annotation.view}-${annotation.contentHash.slice(0, 20)}`,
    view: annotation.view,
    lineage: annotation.lineage,
    annotationMapContentHash: annotation.contentHash,
    prestonReviewRecordContentHash: review.contentHash,
    sourceImports,
    partSources: annotation.parts.map((part) => ({
      role: part.role,
      source: part.source,
      childPivotFeatureId: part.childPivotFeatureId,
    })),
    exposureSources: annotation.exposures.map((exposure) => ({
      role: exposure.role,
      source: exposure.source,
      sourceAnchor: exposure.sourceAnchor,
      targetAnchorFeatureId: exposure.targetAnchorFeatureId,
    })),
    algorithm: candidateRigRegistrationMeasurementAlgorithmContract,
    transformConvention: "parent-pivot-local-v1" as const,
    sourceMappingAuthority: "compiled-from-exact-reviewed-ledger" as const,
    behaviorSourceReceiptStatus: "pending" as const,
    providerAuthority: false as const,
    approvalAuthority: false as const,
    approvalRequired: true as const,
    productionBindable: false as const,
  };
  return candidateRigRegistrationMeasurementProgramSchema.parse({
    ...draft,
    contentHash: hashCanonical(draft),
  });
};

const transformConventionSchema = z.literal("parent-pivot-local-v1");

const outputCanvasSchema = z
  .object({
    width: z.number().int().positive().max(8192),
    height: z.number().int().positive().max(8192),
    padding: z.literal(8),
  })
  .strict();

const selectedFeatureMeasurementSchema = z
  .object({
    featureId: identifierSchema,
    kind: z.enum([
      "tab-roi",
      "alpha-centroid",
      "principal-axis-end",
      "sealed-lower-face-anchor",
    ]),
    supportBounds: rectSchema,
    pointMicropixels: z
      .object({
        x: z.number().int(),
        y: z.number().int(),
      })
      .strict(),
  })
  .strict();

const fitSchema = z
  .object({
    anchorCount: z.number().int().positive(),
    absoluteScaleMillionths: z.number().int().positive().max(10_000_000),
    absoluteRotationMicrodegrees: z
      .number()
      .int()
      .min(-360_000_000)
      .max(360_000_000),
    residualMicropixels: z.number().int().nonnegative(),
    reflected: z.literal(false),
    mirrored: z.literal(false),
    shear: z.literal(0),
  })
  .strict();

const measuredPartSchema = z
  .object({
    role: characterRigPartRoleSchema,
    parentRole: characterRigPartRoleSchema.nullable(),
    parentSocketId: identifierSchema.nullable(),
    output: outputCanvasSchema,
    supportMaskContentHash: hashSchema,
    coreMaskContentHash: hashSchema,
    selectedFeatures: z.array(selectedFeatureMeasurementSchema).min(1),
    childPivotFeatureId: identifierSchema,
    childPivot: localPointSchema,
    parentJoint: localPointSchema.nullable(),
    restTransform: z
      .object({
        xMicropixels: z.number().int(),
        yMicropixels: z.number().int(),
        rotationMicrodegrees: z
          .number()
          .int()
          .min(-360_000_000)
          .max(360_000_000),
        scaleXMillionths: z.number().int().positive().max(10_000_000),
        scaleYMillionths: z.number().int().positive().max(10_000_000),
      })
      .strict(),
    sockets: z.array(
      z.object({ id: identifierSchema, position: localPointSchema }).strict(),
    ),
    zIndex: z.number().int().min(-128).max(128),
    fit: fitSchema,
  })
  .strict();

const measuredExposureSchema = z
  .object({
    role: characterRigExposureRoleSchema,
    targetRole: characterRigPartRoleSchema,
    output: outputCanvasSchema,
    supportMaskContentHash: hashSchema,
    coreMaskContentHash: hashSchema,
    sourceAnchor: selectedFeatureMeasurementSchema,
    targetAnchorFeatureId: identifierSchema,
    childPivot: localPointSchema,
    registrationMode: z.literal("inherit-target-registration"),
  })
  .strict();

const candidateRigRegistrationMeasurementReportFields = {
  schemaVersion: z.literal("1.0"),
  reportKind: z.literal("candidate-rig-registration-measurement"),
  authorityDomain: z.literal("source-review-registration-measurement"),
  reportId: identifierSchema,
  view: registrationViewSchema,
  lineage: registrationLineageSchema,
  turnaroundGuidance: turnaroundGuidanceSchema,
  annotationMapContentHash: hashSchema,
  prestonReviewRecordContentHash: hashSchema,
  measurementProgramContentHash: hashSchema,
  algorithm: measurementAlgorithmSchema,
  transformConvention: transformConventionSchema,
  zConvention: z.literal("larger-z-index-renders-in-front"),
  parts: z.array(measuredPartSchema).length(canonicalPartRoles.length),
  exposures: z
    .array(measuredExposureSchema)
    .length(canonicalExposureRoles.length),
  resolvedOcclusions: z.array(occlusionEdgeSchema),
  repeatabilityScope: z.literal("same-runtime-and-engine-build-only"),
  crossRuntimeBitExact: z.literal(false),
  behaviorSourceReceiptStatus: z.literal("pending"),
  machineGeneratedClaim: z.literal(true),
  providerAuthority: z.literal(false),
  approvalAuthority: z.literal(false),
  approvalRequired: z.literal(true),
  productionBindable: z.literal(false),
};

const pointInside = (
  point: { x: number; y: number },
  output: { width: number; height: number },
) => point.x < output.width && point.y < output.height;

const refineMeasurementReport = (
  report: {
    view: z.infer<typeof registrationViewSchema>;
    turnaroundGuidance: z.infer<typeof turnaroundGuidanceSchema>;
    parts: Array<z.infer<typeof measuredPartSchema>>;
    exposures: Array<z.infer<typeof measuredExposureSchema>>;
    resolvedOcclusions: Array<z.infer<typeof occlusionEdgeSchema>>;
  },
  context: z.RefinementCtx,
) => {
  if (
    report.turnaroundGuidance.semanticDirection !==
    expectedSemanticDirection[report.view]
  )
    context.addIssue({
      code: "custom",
      path: ["turnaroundGuidance", "semanticDirection"],
      message: "Measured turnaround direction must match its declared view.",
    });
  if (
    !sameOrder(
      report.parts.map((part) => part.role),
      canonicalPartRoles,
    )
  )
    context.addIssue({
      code: "custom",
      path: ["parts"],
      message:
        "Registration measurements must cover the exact canonical 29 parts in topology order.",
    });

  const partByRole = new Map(report.parts.map((part) => [part.role, part]));
  const zIndexes = report.parts.map((part) => part.zIndex);
  if (new Set(zIndexes).size !== zIndexes.length)
    context.addIssue({
      code: "custom",
      path: ["parts"],
      message: "Measured part z-order must be unique.",
    });

  for (const [index, part] of report.parts.entries()) {
    const topology = kidsBipedV1TopologyTemplate.parts[index];
    if (
      !topology ||
      part.role !== topology.role ||
      part.parentRole !== topology.parentRole ||
      part.parentSocketId !== topology.parentSocketId
    )
      context.addIssue({
        code: "custom",
        path: ["parts", index],
        message: `Measured part ${part.role} must preserve exact topology parent/socket ownership.`,
      });
    if (
      !pointInside(part.childPivot, part.output) ||
      part.selectedFeatures.some(
        (feature) =>
          feature.pointMicropixels.x < 0 ||
          feature.pointMicropixels.y < 0 ||
          feature.pointMicropixels.x >= part.output.width * 1_000_000 ||
          feature.pointMicropixels.y >= part.output.height * 1_000_000 ||
          feature.supportBounds.x + feature.supportBounds.width >
            part.output.width ||
          feature.supportBounds.y + feature.supportBounds.height >
            part.output.height,
      )
    )
      context.addIssue({
        code: "custom",
        path: ["parts", index],
        message: `Measured part ${part.role} has geometry outside its output canvas.`,
      });
    if (
      part.restTransform.scaleXMillionths !==
      part.restTransform.scaleYMillionths
    )
      context.addIssue({
        code: "custom",
        path: ["parts", index],
        message: `Measured part ${part.role} must use reflection-free uniform scale.`,
      });
    if (part.fit.anchorCount !== part.selectedFeatures.length)
      context.addIssue({
        code: "custom",
        path: ["parts", index, "fit", "anchorCount"],
        message: `Measured part ${part.role} fit must account for every selected feature exactly once.`,
      });
    if (
      part.selectedFeatures.filter(
        (feature) => feature.featureId === part.childPivotFeatureId,
      ).length !== 1
    )
      context.addIssue({
        code: "custom",
        path: ["parts", index, "childPivotFeatureId"],
        message: `Measured part ${part.role} must name exactly one measured child-pivot feature.`,
      });
    assertCanonicalUniqueIds(
      part.selectedFeatures.map((feature) => feature.featureId),
      ["parts", index, "selectedFeatures"],
      `Measured feature ids for ${part.role}`,
      context,
    );
    const expectedSockets = kidsBipedV1TopologyTemplate.parts
      .filter((candidate) => candidate.parentRole === part.role)
      .map((candidate) => candidate.parentSocketId!)
      .sort((left, right) => left.localeCompare(right));
    const actualSockets = part.sockets
      .map((socket) => socket.id)
      .sort((left, right) => left.localeCompare(right));
    if (!sameOrder(actualSockets, expectedSockets))
      context.addIssue({
        code: "custom",
        path: ["parts", index, "sockets"],
        message: `Measured part ${part.role} must expose its exact canonical child sockets.`,
      });
    if (
      !sameOrder(
        part.sockets.map((socket) => socket.id),
        actualSockets,
      )
    )
      context.addIssue({
        code: "custom",
        path: ["parts", index, "sockets"],
        message: `Measured sockets for ${part.role} must use canonical id order.`,
      });
    for (const [socketIndex, socket] of part.sockets.entries())
      if (!pointInside(socket.position, part.output))
        context.addIssue({
          code: "custom",
          path: ["parts", index, "sockets", socketIndex, "position"],
          message: `Measured socket ${socket.id} leaves ${part.role}.`,
        });
    if (part.parentRole === null) {
      if (part.parentJoint !== null)
        context.addIssue({
          code: "custom",
          path: ["parts", index, "parentJoint"],
          message: "Measured torso root cannot declare a parent joint.",
        });
    } else {
      const parent = partByRole.get(part.parentRole);
      const socket = parent?.sockets.find(
        (candidate) => candidate.id === part.parentSocketId,
      );
      if (
        !socket ||
        !part.parentJoint ||
        part.parentJoint.x !== socket.position.x ||
        part.parentJoint.y !== socket.position.y
      )
        context.addIssue({
          code: "custom",
          path: ["parts", index, "parentJoint"],
          message: `Measured part ${part.role} parent joint must equal its parent-owned socket.`,
        });
    }
  }

  const resolvedOcclusionKeys = report.resolvedOcclusions.map(
    (edge) => `${edge.behindRole}:${edge.inFrontOfRole}`,
  );
  if (
    new Set(resolvedOcclusionKeys).size !== resolvedOcclusionKeys.length ||
    report.resolvedOcclusions.some(
      (edge) => edge.behindRole === edge.inFrontOfRole,
    )
  )
    context.addIssue({
      code: "custom",
      path: ["resolvedOcclusions"],
      message:
        "Measured occlusion edges must be unique and cannot order a role against itself.",
    });
  if (
    !sameOrder(
      report.exposures.map((exposure) => exposure.role),
      canonicalExposureRoles,
    )
  )
    context.addIssue({
      code: "custom",
      path: ["exposures"],
      message:
        "Registration measurements must cover the exact canonical 13 exposures in topology order.",
    });
  for (const [index, exposure] of report.exposures.entries()) {
    const topology = kidsBipedV1TopologyTemplate.exposures[index];
    const target = partByRole.get(exposure.targetRole);
    const targetAnchor = target?.selectedFeatures.find(
      (feature) => feature.featureId === exposure.targetAnchorFeatureId,
    );
    if (
      !topology ||
      exposure.role !== topology.role ||
      exposure.targetRole !== topology.targetRole
    )
      context.addIssue({
        code: "custom",
        path: ["exposures", index],
        message: `Measured exposure ${exposure.role} must preserve its exact topology target.`,
      });
    if (
      !target ||
      exposure.output.width !== target.output.width ||
      exposure.output.height !== target.output.height ||
      exposure.targetAnchorFeatureId !== target.childPivotFeatureId ||
      !targetAnchor ||
      exposure.sourceAnchor.pointMicropixels.x !==
        targetAnchor.pointMicropixels.x ||
      exposure.sourceAnchor.pointMicropixels.y !==
        targetAnchor.pointMicropixels.y ||
      exposure.childPivot.x !== target.childPivot.x ||
      exposure.childPivot.y !== target.childPivot.y
    )
      context.addIssue({
        code: "custom",
        path: ["exposures", index],
        message: `Measured exposure ${exposure.role} must inherit exact target registration.`,
      });
    if (
      exposure.sourceAnchor.pointMicropixels.x < 0 ||
      exposure.sourceAnchor.pointMicropixels.y < 0 ||
      exposure.sourceAnchor.pointMicropixels.x >=
        exposure.output.width * 1_000_000 ||
      exposure.sourceAnchor.pointMicropixels.y >=
        exposure.output.height * 1_000_000 ||
      exposure.sourceAnchor.supportBounds.x +
        exposure.sourceAnchor.supportBounds.width >
        exposure.output.width ||
      exposure.sourceAnchor.supportBounds.y +
        exposure.sourceAnchor.supportBounds.height >
        exposure.output.height
    )
      context.addIssue({
        code: "custom",
        path: ["exposures", index, "sourceAnchor"],
        message: `Measured exposure ${exposure.role} anchor leaves its output canvas.`,
      });
  }

  if (
    directedGraphHasCycle(
      canonicalPartRoles,
      report.resolvedOcclusions.map((edge) => ({
        from: edge.behindRole,
        to: edge.inFrontOfRole,
      })),
    )
  )
    context.addIssue({
      code: "custom",
      path: ["resolvedOcclusions"],
      message: "Measured occlusion order must be acyclic.",
    });
  for (const [index, edge] of report.resolvedOcclusions.entries()) {
    const behind = partByRole.get(edge.behindRole);
    const inFront = partByRole.get(edge.inFrontOfRole);
    if (!behind || !inFront || behind.zIndex >= inFront.zIndex)
      context.addIssue({
        code: "custom",
        path: ["resolvedOcclusions", index],
        message:
          "Measured occlusion must obey the larger-z-index-renders-in-front convention.",
      });
  }
};

export const candidateRigRegistrationMeasurementReportSchema = z
  .object({
    ...candidateRigRegistrationMeasurementReportFields,
    contentHash: hashSchema,
  })
  .strict()
  .superRefine((report, context) => {
    refineMeasurementReport(report, context);
    const { contentHash, ...draft } = report;
    if (hashCanonical(draft) !== contentHash)
      context.addIssue({
        code: "custom",
        path: ["contentHash"],
        message: "Registration measurement report hash is invalid.",
      });
  });

/**
 * Validates the internal consistency of a serialized machine-generated claim.
 * It does not establish that pixels were measured. Only the asset-pipeline
 * trusted measurement boundary may establish that fact from exact raster
 * bytes and sealed evidence.
 */
export const validateCandidateRigRegistrationMeasurementClaimBindings = (
  rawAnnotationMap: unknown,
  rawPrestonReview: unknown,
  rawMeasurementProgram: unknown,
  rawMeasurementReport: unknown,
) => {
  const annotationMap =
    candidateRigRegistrationAnnotationMapSchema.parse(rawAnnotationMap);
  const review =
    prestonCandidateRigRegistrationAnnotationReviewSchema.parse(
      rawPrestonReview,
    );
  const program = candidateRigRegistrationMeasurementProgramSchema.parse(
    rawMeasurementProgram,
  );
  const report =
    candidateRigRegistrationMeasurementReportSchema.parse(rawMeasurementReport);
  if (
    review.annotationMapContentHash !== annotationMap.contentHash ||
    review.view !== annotationMap.view ||
    review.decision !== "accepted-for-measurement"
  )
    throw new Error(
      "Registration measurement requires Preston's exact accepted annotation review.",
    );
  if (
    program.annotationMapContentHash !== annotationMap.contentHash ||
    program.prestonReviewRecordContentHash !== review.contentHash ||
    program.view !== annotationMap.view ||
    hashCanonical(program.lineage) !== hashCanonical(annotationMap.lineage) ||
    report.measurementProgramContentHash !== program.contentHash ||
    report.annotationMapContentHash !== annotationMap.contentHash ||
    report.prestonReviewRecordContentHash !== review.contentHash ||
    report.view !== annotationMap.view ||
    hashCanonical(report.lineage) !== hashCanonical(annotationMap.lineage) ||
    hashCanonical(report.turnaroundGuidance) !==
      hashCanonical(annotationMap.turnaroundGuidance)
  )
    throw new Error(
      "Registration measurement report does not match its exact reviewed annotation lineage.",
    );
  const annotationFeatureIds = new Map(
    annotationMap.parts.map((part) => [
      part.role,
      part.sourceFeatures.map((feature) => `${feature.id}:${feature.kind}`),
    ]),
  );
  const annotationPivotFeatureIds = new Map(
    annotationMap.parts.map((part) => [part.role, part.childPivotFeatureId]),
  );
  for (const measured of report.parts)
    if (
      !sameOrder(
        measured.selectedFeatures.map(
          (feature) => `${feature.featureId}:${feature.kind}`,
        ),
        annotationFeatureIds.get(measured.role) ?? [],
      )
    )
      throw new Error(
        `Registration measurement ${measured.role} does not account for every reviewed source feature exactly once.`,
      );
    else if (
      measured.childPivotFeatureId !==
      annotationPivotFeatureIds.get(measured.role)
    )
      throw new Error(
        `Registration measurement ${measured.role} does not use its explicitly reviewed child-pivot feature.`,
      );
  const annotationExposureAnchors = new Map(
    annotationMap.exposures.map((exposure) => [
      exposure.role,
      {
        sourceAnchor: `${exposure.sourceAnchor.id}:${exposure.sourceAnchor.kind}`,
        targetAnchorFeatureId: exposure.targetAnchorFeatureId,
      },
    ]),
  );
  for (const measured of report.exposures) {
    const expected = annotationExposureAnchors.get(measured.role);
    if (
      !expected ||
      `${measured.sourceAnchor.featureId}:${measured.sourceAnchor.kind}` !==
        expected.sourceAnchor ||
      measured.targetAnchorFeatureId !== expected.targetAnchorFeatureId
    )
      throw new Error(
        `Registration exposure ${measured.role} does not use its explicitly reviewed source/target anchor binding.`,
      );
  }
  if (
    hashCanonical(report.resolvedOcclusions) !==
    hashCanonical(annotationMap.occlusionEdges)
  )
    throw new Error(
      "Registration measurement occlusion order does not match the reviewed annotation map.",
    );
  return { annotationMap, review, program, report };
};

export type CandidateRigRegistrationAnnotationMap = z.infer<
  typeof candidateRigRegistrationAnnotationMapSchema
>;
export type PrestonCandidateRigRegistrationAnnotationReview = z.infer<
  typeof prestonCandidateRigRegistrationAnnotationReviewSchema
>;
export type CandidateRigRegistrationMeasurementReport = z.infer<
  typeof candidateRigRegistrationMeasurementReportSchema
>;
export type CandidateRigRegistrationMeasurementProgram = z.infer<
  typeof candidateRigRegistrationMeasurementProgramSchema
>;
export type CandidateRigRegistrationMeasurementReportClaim =
  CandidateRigRegistrationMeasurementReport;
