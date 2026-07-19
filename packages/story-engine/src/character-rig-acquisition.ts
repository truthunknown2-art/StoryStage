import { z } from "zod";
import { hashCanonical } from "./canonical-hash";
import {
  hashSchema,
  identifierSchema,
} from "./model";

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
          message: "A turnaround sheet covers the declared view set as a whole.",
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
      templateContentHash: hashSchema,
    })
    .strict(),
  acquisition: manualFileAcquisitionSchema,
  controlledMatte: z.string().regex(/^#[0-9a-fA-F]{6}$/).nullable(),
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

export const characterRigCandidateAssetSchema = z
  .object({
    candidateId: identifierSchema,
    requestItemId: identifierSchema,
    relativeFile: characterRigSafeRelativePathSchema,
    contentHash: hashSchema,
    byteLength: z.number().int().positive().max(50 * 1024 * 1024),
    mediaType: z.literal("image/png"),
    width: z.number().int().positive().max(8192),
    height: z.number().int().positive().max(8192),
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
  const { returnedItems, unknownItems: unknown, missingItems: missing } = inspection;
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
  const requested = new Set(request.items.map((item) => item.id));
  const returned = new Set(bundle.assets.map((asset) => asset.requestItemId));
  const returnedItems = [...returned].filter((id) => requested.has(id)).sort();
  const unknownItems = [...returned].filter((id) => !requested.has(id)).sort();
  const missingItems = [...requested].filter((id) => !returned.has(id)).sort();
  return {
    requestContentHash: request.contentHash,
    bundleContentHash: bundle.contentHash,
    status:
      missingItems.length === 0 && unknownItems.length === 0
        ? ("complete" as const)
        : ("incomplete" as const),
    returnedItems,
    missingItems,
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
  ...(["front", "profile-left", "profile-right"] as const).flatMap(
    (view) => [
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
    ],
  ),
];
