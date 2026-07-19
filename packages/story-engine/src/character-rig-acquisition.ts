import { z } from "zod";
import { hashCanonical } from "./canonical-hash";
import { hashSchema, identifierSchema } from "./model";

export const characterRigSafeRelativePathSchema = z
  .string()
  .min(1)
  .refine(
    (value) =>
      !value.includes("\\") &&
      !value.includes(":") &&
      !value.startsWith("/") &&
      !value.split("/").includes(".."),
    "Path must be a safe forward-slash relative path.",
  );

const withoutContentHash = <T extends { contentHash: string }>(value: T) =>
  Object.fromEntries(
    Object.entries(value).filter(([key]) => key !== "contentHash"),
  ) as Omit<T, "contentHash">;

export const characterRigViewSchema = z.enum([
  "front",
  "three-quarter",
  "profile-left",
  "profile-right",
  "rear",
]);

export const kidsBipedV1RequiredTurnaroundViews = [
  "front",
  "three-quarter",
  "profile-left",
  "profile-right",
  "rear",
] as const satisfies readonly z.infer<typeof characterRigViewSchema>[];

export const characterRigComponentRoleSchema = z.enum([
  "torso",
  "pelvis",
  "head",
  "ear-left",
  "ear-right",
  "upper-arm-left",
  "lower-arm-left",
  "hand-left",
  "upper-arm-right",
  "lower-arm-right",
  "hand-right",
  "upper-leg-left",
  "lower-leg-left",
  "foot-left",
  "upper-leg-right",
  "lower-leg-right",
  "foot-right",
  "tail",
  "secondary-front",
  "secondary-back",
  "eye-white-left",
  "eye-white-right",
  "pupil-left",
  "pupil-right",
  "lid-open-left",
  "lid-open-right",
  "lid-half-left",
  "lid-half-right",
  "lid-closed-left",
  "lid-closed-right",
  "brow-neutral-left",
  "brow-neutral-right",
  "brow-raised-left",
  "brow-raised-right",
  "mouth-rest",
  "viseme-ai",
  "viseme-e",
  "viseme-mbp",
  "viseme-oh",
  "viseme-fv",
  "viseme-l",
  "viseme-wq",
]);

export const kidsBipedV1PartComponents = [
  "torso",
  "pelvis",
  "head",
  "ear-left",
  "ear-right",
  "upper-arm-left",
  "lower-arm-left",
  "hand-left",
  "upper-arm-right",
  "lower-arm-right",
  "hand-right",
  "upper-leg-left",
  "lower-leg-left",
  "foot-left",
  "upper-leg-right",
  "lower-leg-right",
  "foot-right",
  "tail",
  "secondary-front",
  "secondary-back",
] as const satisfies readonly z.infer<typeof characterRigComponentRoleSchema>[];

export const kidsBipedV1FaceComponents = [
  "eye-white-left",
  "eye-white-right",
  "pupil-left",
  "pupil-right",
  "lid-open-left",
  "lid-open-right",
  "lid-half-left",
  "lid-half-right",
  "lid-closed-left",
  "lid-closed-right",
  "brow-neutral-left",
  "brow-neutral-right",
  "brow-raised-left",
  "brow-raised-right",
  "mouth-rest",
  "viseme-ai",
  "viseme-e",
  "viseme-mbp",
  "viseme-oh",
  "viseme-fv",
  "viseme-l",
  "viseme-wq",
] as const satisfies readonly z.infer<typeof characterRigComponentRoleSchema>[];

export const kidsBipedV1TopologyPartRoles = [
  ...kidsBipedV1PartComponents,
  "eye-white-left",
  "eye-white-right",
  "pupil-left",
  "pupil-right",
  "lid-open-left",
  "lid-open-right",
  "brow-neutral-left",
  "brow-neutral-right",
  "mouth-rest",
] as const;

export const kidsBipedV1TopologyExposureRoles = [
  "lid-half-left",
  "lid-half-right",
  "lid-closed-left",
  "lid-closed-right",
  "brow-raised-left",
  "brow-raised-right",
  "viseme-ai",
  "viseme-e",
  "viseme-mbp",
  "viseme-oh",
  "viseme-fv",
  "viseme-l",
  "viseme-wq",
] as const;

const kidsBipedV1CanonicalParentByRole = {
  torso: { parentRole: null, parentSocketId: null },
  pelvis: { parentRole: "torso", parentSocketId: "pelvis" },
  head: { parentRole: "torso", parentSocketId: "neck" },
  "ear-left": { parentRole: "head", parentSocketId: "ear-left" },
  "ear-right": { parentRole: "head", parentSocketId: "ear-right" },
  "upper-arm-left": { parentRole: "torso", parentSocketId: "shoulder-left" },
  "lower-arm-left": {
    parentRole: "upper-arm-left",
    parentSocketId: "elbow-left",
  },
  "hand-left": { parentRole: "lower-arm-left", parentSocketId: "wrist-left" },
  "upper-arm-right": { parentRole: "torso", parentSocketId: "shoulder-right" },
  "lower-arm-right": {
    parentRole: "upper-arm-right",
    parentSocketId: "elbow-right",
  },
  "hand-right": {
    parentRole: "lower-arm-right",
    parentSocketId: "wrist-right",
  },
  "upper-leg-left": { parentRole: "pelvis", parentSocketId: "hip-left" },
  "lower-leg-left": {
    parentRole: "upper-leg-left",
    parentSocketId: "knee-left",
  },
  "foot-left": { parentRole: "lower-leg-left", parentSocketId: "ankle-left" },
  "upper-leg-right": { parentRole: "pelvis", parentSocketId: "hip-right" },
  "lower-leg-right": {
    parentRole: "upper-leg-right",
    parentSocketId: "knee-right",
  },
  "foot-right": {
    parentRole: "lower-leg-right",
    parentSocketId: "ankle-right",
  },
  tail: { parentRole: "pelvis", parentSocketId: "tail-base" },
  "secondary-front": { parentRole: "torso", parentSocketId: "secondary-front" },
  "secondary-back": { parentRole: "torso", parentSocketId: "secondary-back" },
  "eye-white-left": { parentRole: "head", parentSocketId: "eye-left" },
  "eye-white-right": { parentRole: "head", parentSocketId: "eye-right" },
  "pupil-left": { parentRole: "eye-white-left", parentSocketId: "pupil-left" },
  "pupil-right": {
    parentRole: "eye-white-right",
    parentSocketId: "pupil-right",
  },
  "lid-open-left": { parentRole: "eye-white-left", parentSocketId: "lid-left" },
  "lid-open-right": {
    parentRole: "eye-white-right",
    parentSocketId: "lid-right",
  },
  "brow-neutral-left": { parentRole: "head", parentSocketId: "brow-left" },
  "brow-neutral-right": { parentRole: "head", parentSocketId: "brow-right" },
  "mouth-rest": { parentRole: "head", parentSocketId: "mouth" },
} as const;

const kidsBipedV1CanonicalExposureTargetByRole = {
  "lid-half-left": "lid-open-left",
  "lid-half-right": "lid-open-right",
  "lid-closed-left": "lid-open-left",
  "lid-closed-right": "lid-open-right",
  "brow-raised-left": "brow-neutral-left",
  "brow-raised-right": "brow-neutral-right",
  "viseme-ai": "mouth-rest",
  "viseme-e": "mouth-rest",
  "viseme-mbp": "mouth-rest",
  "viseme-oh": "mouth-rest",
  "viseme-fv": "mouth-rest",
  "viseme-l": "mouth-rest",
  "viseme-wq": "mouth-rest",
} as const;

const characterRigTopologyPartRuleSchema = z
  .object({
    role: characterRigComponentRoleSchema,
    parentRole: characterRigComponentRoleSchema.nullable(),
    parentSocketId: identifierSchema.nullable(),
  })
  .strict();

const characterRigTopologyExposureRuleSchema = z
  .object({
    role: characterRigComponentRoleSchema,
    targetRole: characterRigComponentRoleSchema,
  })
  .strict();

const characterRigTopologyTemplateFields = {
  schemaVersion: z.literal("1.0"),
  templateId: z.literal("kids-biped-v1"),
  profileVersion: z.literal("1.0.0"),
  authority: z.literal("local-articulated-parts"),
  parts: z.array(characterRigTopologyPartRuleSchema).length(29),
  exposures: z.array(characterRigTopologyExposureRuleSchema).length(13),
};

const refineCharacterRigTopologyTemplate = (
  template: {
    parts: Array<z.infer<typeof characterRigTopologyPartRuleSchema>>;
    exposures: Array<z.infer<typeof characterRigTopologyExposureRuleSchema>>;
  },
  context: z.RefinementCtx,
) => {
  const partRoles = template.parts.map((part) => part.role);
  if (
    new Set(partRoles).size !== partRoles.length ||
    hashCanonical([...partRoles].sort()) !==
      hashCanonical([...kidsBipedV1TopologyPartRoles].sort())
  )
    context.addIssue({
      code: "custom",
      path: ["parts"],
      message:
        "kids-biped-v1 topology must declare its exact canonical part roles.",
    });
  const partByRole = new Map(template.parts.map((part) => [part.role, part]));
  const roots = template.parts.filter((part) => part.parentRole === null);
  if (
    roots.length !== 1 ||
    roots[0]?.role !== "torso" ||
    roots[0]?.parentSocketId !== null
  )
    context.addIssue({
      code: "custom",
      path: ["parts"],
      message: "kids-biped-v1 topology requires one socketless torso root.",
    });
  for (const [index, part] of template.parts.entries()) {
    const canonical =
      kidsBipedV1CanonicalParentByRole[
        part.role as keyof typeof kidsBipedV1CanonicalParentByRole
      ];
    if (
      !canonical ||
      part.parentRole !== canonical.parentRole ||
      part.parentSocketId !== canonical.parentSocketId
    )
      context.addIssue({
        code: "custom",
        path: ["parts", index],
        message: `Topology part ${part.role} does not match canonical kids-biped-v1 parent/socket authority.`,
      });
    if (
      part.parentRole !== null &&
      (!partByRole.has(part.parentRole) || !part.parentSocketId)
    )
      context.addIssue({
        code: "custom",
        path: ["parts", index],
        message: `Topology part ${part.role} requires an existing parent role and canonical parent socket.`,
      });
    const visited = new Set<string>();
    let cursor: typeof part | undefined = part;
    while (cursor) {
      if (visited.has(cursor.role)) {
        context.addIssue({
          code: "custom",
          path: ["parts"],
          message: `Topology contains a cycle at ${cursor.role}.`,
        });
        break;
      }
      visited.add(cursor.role);
      cursor = cursor.parentRole
        ? partByRole.get(cursor.parentRole)
        : undefined;
    }
  }
  const exposureRoles = template.exposures.map((exposure) => exposure.role);
  if (
    new Set(exposureRoles).size !== exposureRoles.length ||
    hashCanonical([...exposureRoles].sort()) !==
      hashCanonical([...kidsBipedV1TopologyExposureRoles].sort())
  )
    context.addIssue({
      code: "custom",
      path: ["exposures"],
      message:
        "kids-biped-v1 topology must declare its exact canonical exposure roles.",
    });
  for (const [index, exposure] of template.exposures.entries())
    if (
      !partByRole.has(exposure.targetRole) ||
      exposure.targetRole !==
        kidsBipedV1CanonicalExposureTargetByRole[
          exposure.role as keyof typeof kidsBipedV1CanonicalExposureTargetByRole
        ]
    )
      context.addIssue({
        code: "custom",
        path: ["exposures", index, "targetRole"],
        message: `Exposure ${exposure.role} does not match canonical kids-biped-v1 target authority.`,
      });
};

export const characterRigTopologyTemplateDraftSchema = z
  .object(characterRigTopologyTemplateFields)
  .strict()
  .superRefine(refineCharacterRigTopologyTemplate);

export const characterRigTopologyTemplateSchema = z
  .object({ ...characterRigTopologyTemplateFields, contentHash: hashSchema })
  .strict()
  .superRefine((template, context) => {
    refineCharacterRigTopologyTemplate(template, context);
    if (hashCanonical(withoutContentHash(template)) !== template.contentHash)
      context.addIssue({
        code: "custom",
        path: ["contentHash"],
        message: "Character rig topology template hash is invalid.",
      });
  });

export type CharacterRigTopologyTemplate = z.infer<
  typeof characterRigTopologyTemplateSchema
>;

const createCharacterRigTopologyTemplate = (
  rawDraft: z.infer<typeof characterRigTopologyTemplateDraftSchema>,
) => {
  const draft = characterRigTopologyTemplateDraftSchema.parse(rawDraft);
  const template = characterRigTopologyTemplateSchema.parse({
    ...draft,
    contentHash: hashCanonical(draft),
  });
  template.parts.forEach((part) => Object.freeze(part));
  template.exposures.forEach((exposure) => Object.freeze(exposure));
  Object.freeze(template.parts);
  Object.freeze(template.exposures);
  return Object.freeze(template);
};

export const kidsBipedV1TopologyTemplate = createCharacterRigTopologyTemplate({
  schemaVersion: "1.0",
  templateId: "kids-biped-v1",
  profileVersion: "1.0.0",
  authority: "local-articulated-parts",
  parts: kidsBipedV1TopologyPartRoles.map((role) => ({
    role,
    ...kidsBipedV1CanonicalParentByRole[role],
  })),
  exposures: kidsBipedV1TopologyExposureRoles.map((role) => ({
    role,
    targetRole: kidsBipedV1CanonicalExposureTargetByRole[role],
  })),
});

export const requirementsForRigProfile = (
  profileId: "kids-biped-v1",
  view: z.infer<typeof characterRigViewSchema> | null,
  itemKind: "turnaround-sheet" | "parts-kit" | "face-kit",
): readonly z.infer<typeof characterRigComponentRoleSchema>[] => {
  if (profileId !== "kids-biped-v1") return [];
  if (itemKind === "turnaround-sheet") return [];
  if (view !== "front" && view !== "profile-left" && view !== "profile-right")
    return [];
  return itemKind === "parts-kit"
    ? kidsBipedV1PartComponents
    : kidsBipedV1FaceComponents;
};

export const characterRigRequestItemSchema = z
  .object({
    id: identifierSchema,
    kind: z.enum(["turnaround-sheet", "parts-kit", "face-kit"]),
    view: characterRigViewSchema.nullable(),
    registrationGroup: identifierSchema,
    requiredComponents: z.array(characterRigComponentRoleSchema),
    instructions: z.array(z.string().trim().min(1).max(500)).min(1),
  })
  .strict()
  .superRefine((item, context) => {
    const unique = new Set(item.requiredComponents);
    if (unique.size !== item.requiredComponents.length)
      context.addIssue({
        code: "custom",
        path: ["requiredComponents"],
        message: "Rig request component roles must be unique within an item.",
      });
    if (item.kind === "turnaround-sheet") {
      if (item.view !== null)
        context.addIssue({
          code: "custom",
          path: ["view"],
          message:
            "A turnaround sheet covers the declared view set as a whole.",
        });
      if (item.requiredComponents.length !== 0)
        context.addIssue({
          code: "custom",
          path: ["requiredComponents"],
          message: "Turnaround sheets do not declare extracted rig components.",
        });
    } else {
      if (item.view === null)
        context.addIssue({
          code: "custom",
          path: ["view"],
          message: `${item.kind} requires an explicit character view.`,
        });
      if (item.requiredComponents.length === 0)
        context.addIssue({
          code: "custom",
          path: ["requiredComponents"],
          message: `${item.kind} requires named local components.`,
        });
    }
  });

const manualFileAcquisitionSchema = z
  .object({
    mode: z.literal("manual-file-import"),
    providerNeutral: z.literal(true),
    acceptedMediaTypes: z.tuple([z.literal("image/png")]),
    credentialsRequired: z.literal(false),
    accountSessionRequired: z.literal(false),
  })
  .strict();

const characterRigAssetRequestFields = {
  schemaVersion: z.literal("1.0"),
  requestId: identifierSchema,
  showPack: z
    .object({
      id: identifierSchema,
      version: z.string().trim().min(1).max(100),
      contentHash: hashSchema,
    })
    .strict(),
  character: z
    .object({ id: identifierSchema, displayName: z.string().trim().min(1) })
    .strict(),
  identityLock: z
    .object({ assetId: identifierSchema, contentHash: hashSchema })
    .strict(),
  rigProfile: z
    .object({
      id: z.literal("kids-biped-v1"),
      version: z.literal("1.0.0"),
      templateContentHash: z.literal(kidsBipedV1TopologyTemplate.contentHash),
    })
    .strict(),
  acquisition: manualFileAcquisitionSchema,
  controlledMatte: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .nullable(),
  items: z.array(characterRigRequestItemSchema).min(1),
  prohibitions: z.array(z.string().trim().min(1).max(500)).min(1),
  approvalRequired: z.literal(true),
};

const refineCharacterRigAssetRequest = (
  request: {
    items: Array<z.infer<typeof characterRigRequestItemSchema>>;
  },
  context: z.RefinementCtx,
) => {
  const itemIds = new Set<string>();
  const itemKeys = new Set<string>();
  for (const [index, item] of request.items.entries()) {
    if (itemIds.has(item.id))
      context.addIssue({
        code: "custom",
        path: ["items", index, "id"],
        message: `Duplicate rig request item id ${item.id}.`,
      });
    itemIds.add(item.id);
    const key = `${item.kind}:${item.view ?? "all"}`;
    if (itemKeys.has(key))
      context.addIssue({
        code: "custom",
        path: ["items", index],
        message: `Duplicate rig request item ${key}.`,
      });
    itemKeys.add(key);
  }

  const requiredKeys = [
    "turnaround-sheet:all",
    "parts-kit:front",
    "parts-kit:profile-left",
    "parts-kit:profile-right",
    "face-kit:front",
    "face-kit:profile-left",
    "face-kit:profile-right",
  ];
  for (const key of requiredKeys)
    if (!itemKeys.has(key))
      context.addIssue({
        code: "custom",
        path: ["items"],
        message: `kids-biped-v1 requires ${key}.`,
      });

  for (const [index, item] of request.items.entries()) {
    const expected = requirementsForRigProfile(
      "kids-biped-v1",
      item.view,
      item.kind,
    );
    const declared = new Set(item.requiredComponents);
    for (const role of expected)
      if (!declared.has(role))
        context.addIssue({
          code: "custom",
          path: ["items", index, "requiredComponents"],
          message: `${item.kind} ${item.view} is missing ${role}.`,
        });
    const expectedSet = new Set(expected);
    for (const role of declared)
      if (!expectedSet.has(role))
        context.addIssue({
          code: "custom",
          path: ["items", index, "requiredComponents"],
          message: `${item.kind} ${item.view} contains forbidden role ${role}.`,
        });
  }
};

export const characterRigAssetRequestDraftSchema = z
  .object(characterRigAssetRequestFields)
  .strict()
  .superRefine(refineCharacterRigAssetRequest);

export const characterRigAssetRequestSchema = z
  .object({ ...characterRigAssetRequestFields, contentHash: hashSchema })
  .strict()
  .superRefine((request, context) => {
    refineCharacterRigAssetRequest(request, context);
    const draft = withoutContentHash(request);
    if (hashCanonical(draft) !== request.contentHash)
      context.addIssue({
        code: "custom",
        path: ["contentHash"],
        message: "Character rig asset request hash is invalid.",
      });
  });

const turnaroundViewEvidenceFields = {
  view: characterRigViewSchema,
  sourceContentHash: hashSchema,
  sourceRect: z
    .object({
      x: z.number().int().nonnegative(),
      y: z.number().int().nonnegative(),
      width: z.number().int().positive(),
      height: z.number().int().positive(),
    })
    .strict(),
  derivedContentHash: hashSchema,
  byteLength: z
    .number()
    .int()
    .positive()
    .max(50 * 1024 * 1024),
  width: z.number().int().positive().max(8192),
  height: z.number().int().positive().max(8192),
  semanticDirection: z.enum([
    "neutral-front",
    "three-quarter",
    "faces-screen-left",
    "faces-screen-right",
    "neutral-rear",
  ]),
  transform: z.literal("none"),
};

export const turnaroundViewEvidenceSchema = z
  .object(turnaroundViewEvidenceFields)
  .strict()
  .superRefine((evidence, context) => {
    const expectedSemanticDirection = {
      front: "neutral-front",
      "three-quarter": "three-quarter",
      "profile-left": "faces-screen-left",
      "profile-right": "faces-screen-right",
      rear: "neutral-rear",
    } as const;
    if (evidence.semanticDirection !== expectedSemanticDirection[evidence.view])
      context.addIssue({
        code: "custom",
        path: ["semanticDirection"],
        message: "Turnaround semantic direction must equal its declared view.",
      });
    if (
      evidence.width !== evidence.sourceRect.width ||
      evidence.height !== evidence.sourceRect.height
    )
      context.addIssue({
        code: "custom",
        path: ["sourceRect"],
        message:
          "Turnaround derived dimensions must equal the source rectangle.",
      });
  });

const requiredTurnaroundViewsTupleSchema = z.tuple([
  z.literal("front"),
  z.literal("three-quarter"),
  z.literal("profile-left"),
  z.literal("profile-right"),
  z.literal("rear"),
]);

const turnaroundViewCoverageEvidenceFields = {
  schemaVersion: z.literal("1.0"),
  requestId: identifierSchema,
  requestContentHash: hashSchema,
  requestItemId: identifierSchema,
  candidateId: identifierSchema,
  candidateContentHash: hashSchema,
  requiredViews: requiredTurnaroundViewsTupleSchema,
  views: z.array(turnaroundViewEvidenceSchema).max(5),
};

const rectanglesOverlap = (
  left: z.infer<typeof turnaroundViewEvidenceSchema>["sourceRect"],
  right: z.infer<typeof turnaroundViewEvidenceSchema>["sourceRect"],
) =>
  left.x < right.x + right.width &&
  left.x + left.width > right.x &&
  left.y < right.y + right.height &&
  left.y + left.height > right.y;

const refineTurnaroundViewCoverageEvidence = (
  evidence: {
    candidateContentHash: string;
    views: Array<z.infer<typeof turnaroundViewEvidenceSchema>>;
  },
  context: z.RefinementCtx,
) => {
  const views = new Set<string>();
  const derivedContentHashes = new Set<string>();
  let lastRequiredViewIndex = -1;
  for (const [index, view] of evidence.views.entries()) {
    if (views.has(view.view))
      context.addIssue({
        code: "custom",
        path: ["views", index, "view"],
        message: `Duplicate turnaround view ${view.view}.`,
      });
    views.add(view.view);
    if (derivedContentHashes.has(view.derivedContentHash))
      context.addIssue({
        code: "custom",
        path: ["views", index, "derivedContentHash"],
        message:
          "Every turnaround view must have unique independently derived bytes.",
      });
    derivedContentHashes.add(view.derivedContentHash);
    const requiredViewIndex = kidsBipedV1RequiredTurnaroundViews.indexOf(
      view.view,
    );
    if (requiredViewIndex <= lastRequiredViewIndex)
      context.addIssue({
        code: "custom",
        path: ["views", index, "view"],
        message:
          "Turnaround views must be an order-preserving subsequence of the canonical required tuple.",
      });
    lastRequiredViewIndex = requiredViewIndex;
    if (view.sourceContentHash !== evidence.candidateContentHash)
      context.addIssue({
        code: "custom",
        path: ["views", index, "sourceContentHash"],
        message:
          "Turnaround view is not bound to the declared candidate bytes.",
      });
    for (let other = 0; other < index; other += 1)
      if (rectanglesOverlap(evidence.views[other]!.sourceRect, view.sourceRect))
        context.addIssue({
          code: "custom",
          path: ["views", index, "sourceRect"],
          message: `Turnaround view ${view.view} overlaps another declared source rectangle.`,
        });
  }
  const left = evidence.views.find((view) => view.view === "profile-left");
  const right = evidence.views.find((view) => view.view === "profile-right");
  if (left && right && left.derivedContentHash === right.derivedContentHash)
    context.addIssue({
      code: "custom",
      path: ["views"],
      message:
        "Profile-left and profile-right must not use identical derived bytes.",
    });
};

export const turnaroundViewCoverageEvidenceDraftSchema = z
  .object(turnaroundViewCoverageEvidenceFields)
  .strict()
  .superRefine(refineTurnaroundViewCoverageEvidence);

export const turnaroundViewCoverageEvidenceSchema = z
  .object({ ...turnaroundViewCoverageEvidenceFields, contentHash: hashSchema })
  .strict()
  .superRefine((evidence, context) => {
    refineTurnaroundViewCoverageEvidence(evidence, context);
    if (hashCanonical(withoutContentHash(evidence)) !== evidence.contentHash)
      context.addIssue({
        code: "custom",
        path: ["contentHash"],
        message: "Turnaround view coverage evidence hash is invalid.",
      });
  });

export type TurnaroundViewCoverageEvidence = z.infer<
  typeof turnaroundViewCoverageEvidenceSchema
>;

export const createTurnaroundViewCoverageEvidence = (
  rawDraft: z.infer<typeof turnaroundViewCoverageEvidenceDraftSchema>,
): TurnaroundViewCoverageEvidence => {
  const draft = turnaroundViewCoverageEvidenceDraftSchema.parse(rawDraft);
  return turnaroundViewCoverageEvidenceSchema.parse({
    ...draft,
    contentHash: hashCanonical(draft),
  });
};

const turnaroundNormalizationSourceBoundsSchema = z
  .object({
    x: z.number().int().nonnegative(),
    y: z.number().int().nonnegative(),
    width: z.number().int().positive(),
    height: z.number().int().positive(),
  })
  .strict();

export const turnaroundNormalizationReceiptViewSchema = z
  .object({
    view: characterRigViewSchema,
    sourceContentHash: hashSchema,
    sourceContentBounds: turnaroundNormalizationSourceBoundsSchema,
    normalizedContentHash: hashSchema,
    targetCharacterHeight: z.number().int().positive().max(8192),
    scale: z.number().finite().positive(),
    translateX: z.number().finite(),
    translateY: z.number().finite(),
    baselineY: z.number().finite(),
    resampler: z.literal("lanczos3"),
    processorVersion: z.literal("1.0.0"),
    transform: z.literal("scale-and-translate"),
  })
  .strict();

const turnaroundNormalizationReceiptFields = {
  schemaVersion: z.literal("1.0"),
  requestId: identifierSchema,
  requestContentHash: hashSchema,
  requestItemId: z.literal("turnaround-sheet"),
  candidateId: identifierSchema,
  candidateContentHash: hashSchema,
  views: z.array(turnaroundNormalizationReceiptViewSchema).length(5),
  review: z
    .object({
      identityConsistencyPassed: z.literal(false),
      semanticViewAuditPassed: z.literal(false),
      registrationReady: z.literal(false),
    })
    .strict(),
};

const refineTurnaroundNormalizationReceipt = (
  receipt: {
    views: Array<z.infer<typeof turnaroundNormalizationReceiptViewSchema>>;
  },
  context: z.RefinementCtx,
) => {
  const sourceContentHashes = new Set<string>();
  const normalizedContentHashes = new Set<string>();
  const targetCharacterHeight = receipt.views[0]?.targetCharacterHeight;
  const baselineY = receipt.views[0]?.baselineY;
  for (const [index, view] of receipt.views.entries()) {
    const expectedView = kidsBipedV1RequiredTurnaroundViews[index];
    if (view.view !== expectedView)
      context.addIssue({
        code: "custom",
        path: ["views", index, "view"],
        message:
          "Turnaround normalization receipt views must match the exact canonical five-view order.",
      });
    if (sourceContentHashes.has(view.sourceContentHash))
      context.addIssue({
        code: "custom",
        path: ["views", index, "sourceContentHash"],
        message:
          "Turnaround normalization receipt source hashes must be unique.",
      });
    sourceContentHashes.add(view.sourceContentHash);
    if (normalizedContentHashes.has(view.normalizedContentHash))
      context.addIssue({
        code: "custom",
        path: ["views", index, "normalizedContentHash"],
        message:
          "Turnaround normalization receipt normalized hashes must be unique.",
      });
    normalizedContentHashes.add(view.normalizedContentHash);
    if (view.targetCharacterHeight !== targetCharacterHeight)
      context.addIssue({
        code: "custom",
        path: ["views", index, "targetCharacterHeight"],
        message:
          "Every turnaround normalization view must share one target character height.",
      });
    if (view.baselineY !== baselineY)
      context.addIssue({
        code: "custom",
        path: ["views", index, "baselineY"],
        message: "Every turnaround normalization view must share one baseline.",
      });
    if (
      view.scale !==
      view.targetCharacterHeight / view.sourceContentBounds.height
    )
      context.addIssue({
        code: "custom",
        path: ["views", index, "scale"],
        message:
          "Turnaround normalization scale must equal target height divided by source content height.",
      });
    if (view.translateY + view.targetCharacterHeight !== view.baselineY)
      context.addIssue({
        code: "custom",
        path: ["views", index, "translateY"],
        message:
          "Turnaround normalization vertical translation must land on the declared baseline.",
      });
  }
};

export const turnaroundNormalizationReceiptDraftSchema = z
  .object(turnaroundNormalizationReceiptFields)
  .strict()
  .superRefine(refineTurnaroundNormalizationReceipt);

export const turnaroundNormalizationReceiptSchema = z
  .object({ ...turnaroundNormalizationReceiptFields, contentHash: hashSchema })
  .strict()
  .superRefine((receipt, context) => {
    refineTurnaroundNormalizationReceipt(receipt, context);
    if (hashCanonical(withoutContentHash(receipt)) !== receipt.contentHash)
      context.addIssue({
        code: "custom",
        path: ["contentHash"],
        message: "Turnaround normalization receipt hash is invalid.",
      });
  });

export type TurnaroundNormalizationReceipt = z.infer<
  typeof turnaroundNormalizationReceiptSchema
>;

export const createTurnaroundNormalizationReceipt = (
  rawDraft: z.infer<typeof turnaroundNormalizationReceiptDraftSchema>,
): TurnaroundNormalizationReceipt => {
  const draft = turnaroundNormalizationReceiptDraftSchema.parse(rawDraft);
  return turnaroundNormalizationReceiptSchema.parse({
    ...draft,
    contentHash: hashCanonical(draft),
  });
};

const turnaroundViewCoverageEvidenceReferenceSchema = z
  .object({
    schemaVersion: z.literal("1.0"),
    relativeFile: characterRigSafeRelativePathSchema,
    contentHash: hashSchema,
    fileContentHash: hashSchema,
    byteLength: z.number().int().positive().max(8_000_000),
  })
  .strict();

export const characterRigCandidateAssetSchema = z
  .object({
    candidateId: identifierSchema,
    requestItemId: identifierSchema,
    relativeFile: characterRigSafeRelativePathSchema,
    contentHash: hashSchema,
    byteLength: z
      .number()
      .int()
      .positive()
      .max(50 * 1024 * 1024),
    mediaType: z.literal("image/png"),
    width: z.number().int().positive().max(8192),
    height: z.number().int().positive().max(8192),
    turnaroundViewCoverageEvidence:
      turnaroundViewCoverageEvidenceReferenceSchema.optional(),
  })
  .strict()
  .refine((asset) => asset.width * asset.height <= 64_000_000, {
    message: "Candidate rig images may not exceed 64 megapixels.",
    path: ["width"],
  });

const characterRigCandidateBundleFields = {
  schemaVersion: z.literal("1.0"),
  acquisitionMode: z.literal("manual-file-import"),
  requestId: identifierSchema,
  requestContentHash: hashSchema,
  provenance: z
    .object({
      sourceType: z.enum([
        "generated",
        "user-authored",
        "licensed",
        "project-owned",
      ]),
      providerLabel: z.string().trim().min(1).max(120).nullable(),
      sourceReference: z.string().trim().min(1).max(500).nullable(),
      createdAt: z.string().datetime(),
      rightsStatement: z.string().trim().min(1).max(500),
    })
    .strict(),
  assets: z.array(characterRigCandidateAssetSchema).min(1).max(32),
};

const refineCharacterRigCandidateBundle = (
  bundle: { assets: Array<z.infer<typeof characterRigCandidateAssetSchema>> },
  context: z.RefinementCtx,
) => {
  const candidateIds = new Set<string>();
  const requestItemIds = new Set<string>();
  let totalBytes = 0;
  for (const [index, asset] of bundle.assets.entries()) {
    totalBytes += asset.byteLength;
    if (candidateIds.has(asset.candidateId))
      context.addIssue({
        code: "custom",
        path: ["assets", index, "candidateId"],
        message: `Duplicate candidate id ${asset.candidateId}.`,
      });
    if (requestItemIds.has(asset.requestItemId))
      context.addIssue({
        code: "custom",
        path: ["assets", index, "requestItemId"],
        message: `Duplicate response for rig request item ${asset.requestItemId}.`,
      });
    candidateIds.add(asset.candidateId);
    requestItemIds.add(asset.requestItemId);
  }
  if (totalBytes > 256 * 1024 * 1024)
    context.addIssue({
      code: "custom",
      path: ["assets"],
      message: "Candidate rig bundle may not exceed 256 MB.",
    });
};

export const characterRigCandidateBundleDraftSchema = z
  .object(characterRigCandidateBundleFields)
  .strict()
  .superRefine(refineCharacterRigCandidateBundle);

export const characterRigCandidateBundleSchema = z
  .object({ ...characterRigCandidateBundleFields, contentHash: hashSchema })
  .strict()
  .superRefine((bundle, context) => {
    refineCharacterRigCandidateBundle(bundle, context);
    const draft = withoutContentHash(bundle);
    if (hashCanonical(draft) !== bundle.contentHash)
      context.addIssue({
        code: "custom",
        path: ["contentHash"],
        message: "Character rig candidate bundle hash is invalid.",
      });
  });

export type CharacterRigAssetRequestDraft = z.infer<
  typeof characterRigAssetRequestDraftSchema
>;
export type CharacterRigAssetRequest = z.infer<
  typeof characterRigAssetRequestSchema
>;
export type CharacterRigCandidateBundleDraft = z.infer<
  typeof characterRigCandidateBundleDraftSchema
>;
export type CharacterRigCandidateBundle = z.infer<
  typeof characterRigCandidateBundleSchema
>;
export type CharacterRigCandidateAsset = z.infer<
  typeof characterRigCandidateAssetSchema
>;

export const createCharacterRigAssetRequest = (
  rawDraft: CharacterRigAssetRequestDraft,
): CharacterRigAssetRequest => {
  const draft = characterRigAssetRequestDraftSchema.parse(rawDraft);
  return characterRigAssetRequestSchema.parse({
    ...draft,
    contentHash: hashCanonical(draft),
  });
};

export const createCharacterRigCandidateBundle = (
  rawDraft: CharacterRigCandidateBundleDraft,
): CharacterRigCandidateBundle => {
  const draft = characterRigCandidateBundleDraftSchema.parse(rawDraft);
  return characterRigCandidateBundleSchema.parse({
    ...draft,
    contentHash: hashCanonical(draft),
  });
};

export const validateCharacterRigCandidateBundle = (
  rawRequest: CharacterRigAssetRequest,
  rawBundle: CharacterRigCandidateBundle,
) => {
  const request = characterRigAssetRequestSchema.parse(rawRequest);
  const bundle = characterRigCandidateBundleSchema.parse(rawBundle);
  if (
    bundle.requestId !== request.requestId ||
    bundle.requestContentHash !== request.contentHash
  )
    throw new Error("Candidate rig bundle is not bound to this exact request.");
  const inspection = inspectCharacterRigCandidateBundle(request, bundle);
  const {
    returnedItems,
    partialItems,
    unknownItems: unknown,
    missingItems: missing,
  } = inspection;
  if (unknown.length)
    throw new Error(
      `Candidate rig bundle contains unknown request items: ${unknown.join(", ")}.`,
    );
  if (missing.length)
    throw new Error(
      `Candidate rig bundle is missing request items: ${missing.join(", ")}.`,
    );
  return {
    requestContentHash: request.contentHash,
    bundleContentHash: bundle.contentHash,
    returnedItems: returnedItems.length,
    partialItems: partialItems.length,
    providerAuthority: false as const,
    approvalRequired: true as const,
  };
};

export const inspectCharacterRigCandidateBundle = (
  rawRequest: CharacterRigAssetRequest,
  rawBundle: CharacterRigCandidateBundle,
) => {
  const request = characterRigAssetRequestSchema.parse(rawRequest);
  const bundle = characterRigCandidateBundleSchema.parse(rawBundle);
  if (
    bundle.requestId !== request.requestId ||
    bundle.requestContentHash !== request.contentHash
  )
    throw new Error("Candidate rig bundle is not bound to this exact request.");
  const requestedItems = new Map(request.items.map((item) => [item.id, item]));
  const returnedAssets = new Map(
    bundle.assets.map((asset) => [asset.requestItemId, asset]),
  );
  const requested = new Set(requestedItems.keys());
  const returned = new Set(returnedAssets.keys());
  const unknownItems = [...returned].filter((id) => !requested.has(id)).sort();
  for (const asset of bundle.assets) {
    const item = requestedItems.get(asset.requestItemId);
    if (
      item &&
      item.kind !== "turnaround-sheet" &&
      asset.turnaroundViewCoverageEvidence !== undefined
    )
      throw new Error(
        `Candidate ${asset.candidateId} declares turnaround view coverage for ${item.kind}.`,
      );
  }
  const returnedItems = request.items
    .filter((item) => returned.has(item.id) && item.kind !== "turnaround-sheet")
    .map((item) => item.id)
    .sort();
  const partialItems = request.items
    .filter((item) => returned.has(item.id) && item.kind === "turnaround-sheet")
    .map((item) => item.id)
    .sort();
  const missingItems = [...requested].filter((id) => !returned.has(id)).sort();
  const missingSubitems = partialItems.flatMap((requestItemId) =>
    kidsBipedV1RequiredTurnaroundViews.map((view) => ({
      requestItemId,
      view,
    })),
  );
  return {
    requestContentHash: request.contentHash,
    bundleContentHash: bundle.contentHash,
    status:
      missingItems.length === 0 &&
      partialItems.length === 0 &&
      unknownItems.length === 0
        ? ("complete" as const)
        : ("incomplete" as const),
    returnedItems,
    partialItems,
    missingItems,
    missingSubitems,
    unknownItems,
    providerAuthority: false as const,
    approvalRequired: true as const,
  };
};

export const createKidsBipedRigRequestItems = () => [
  {
    id: "turnaround-sheet",
    kind: "turnaround-sheet" as const,
    view: null,
    registrationGroup: "identity-turnaround",
    requiredComponents: [],
    instructions: [
      "Provide front, three-quarter, profile-left, profile-right, and rear views.",
      "Preserve the approved identity, scale, palette, and asymmetric details.",
    ],
  },
  ...(["front", "profile-left", "profile-right"] as const).flatMap((view) => [
    {
      id: `parts-${view}`,
      kind: "parts-kit" as const,
      view,
      registrationGroup: `rig-${view}`,
      requiredComponents: [
        ...requirementsForRigProfile("kids-biped-v1", view, "parts-kit"),
      ],
      instructions: [
        "Provide independently separated transparent parts with safety gutters.",
        "Upper and lower arms and legs must be distinct; whole-limb substitutes are invalid.",
      ],
    },
    {
      id: `face-${view}`,
      kind: "face-kit" as const,
      view,
      registrationGroup: `rig-${view}`,
      requiredComponents: [
        ...requirementsForRigProfile("kids-biped-v1", view, "face-kit"),
      ],
      instructions: [
        "Provide registration-consistent eyes, lids, brows, and mouth exposures.",
        "Mouth exposures are guide visemes and require later dialogue-specific timing.",
      ],
    },
  ]),
];
