import { z } from "zod";
import { hashCanonical } from "./canonical-hash";
import {
  hashSchema,
  identifierSchema,
  preparedCandidateSchema,
  type GenerationBrief,
  type PreparedCandidate,
} from "./model";

export const rigAssetBindingSchema = z
  .object({
    candidateId: identifierSchema,
    fileRole: z.string().min(1),
    contentHash: hashSchema,
    relativeFile: z.string().min(1),
    width: z.number().int().positive(),
    height: z.number().int().positive(),
    registration: preparedCandidateSchema.shape.registration,
  })
  .strict();

const manifestIdentityFields = {
  schemaVersion: z.literal("1.0"),
  manifestId: identifierSchema,
  candidateSetId: identifierSchema,
  briefId: identifierSchema,
  requirementId: identifierSchema,
  entityId: identifierSchema.nullable(),
  entityName: z.string().min(1),
  createdAt: z.string().datetime(),
};

export const characterRigManifestDraftSchema = z
  .object({
    ...manifestIdentityFields,
    type: z.literal("character-rig"),
    animationMode: z.literal("pose-swap-2d"),
    identityReference: rigAssetBindingSchema,
    poses: z
      .object({
        neutral: rigAssetBindingSchema,
        talk: rigAssetBindingSchema,
        reaction: rigAssetBindingSchema,
      })
      .strict(),
  })
  .strict();

const rigLocalPointSchema = z
  .object({
    x: z.number().int().nonnegative(),
    y: z.number().int().nonnegative(),
  })
  .strict();

const rigLocalBoundsSchema = z
  .object({
    x: z.number().int().nonnegative(),
    y: z.number().int().nonnegative(),
    width: z.number().int().positive(),
    height: z.number().int().positive(),
  })
  .strict();

const articulatedRigPartSchema = z
  .object({
    id: identifierSchema,
    parentId: identifierSchema.nullable(),
    asset: rigAssetBindingSchema,
    bounds: rigLocalBoundsSchema,
    pivot: rigLocalPointSchema,
    sockets: z.array(
      z
        .object({ id: identifierSchema, position: rigLocalPointSchema })
        .strict(),
    ),
  })
  .strict();

const articulatedRigExposureSchema = z
  .object({
    id: identifierSchema,
    partId: identifierSchema,
    asset: rigAssetBindingSchema,
  })
  .strict();

const articulatedRigVisemeMappingSchema = z
  .object({
    visemeId: identifierSchema,
    exposureId: identifierSchema,
  })
  .strict();

const reservedWholeActorPartIds = new Set([
  "actor",
  "actor-root",
  "container",
  "entity",
  "global",
  "rig",
  "rig-root",
  "root",
  "scene",
  "stage",
  "top-level",
  "whole-actor",
  "whole-body",
]);

const reservedWholeActorPartIdPattern =
  /(^|-)(root|global|whole-actor|whole-body|top-level)(-|$)/;

const isReservedWholeActorPartId = (partId: string): boolean =>
  reservedWholeActorPartIds.has(partId) ||
  reservedWholeActorPartIdPattern.test(partId);

const pointIsInsideBounds = (
  point: { x: number; y: number },
  bounds: { x: number; y: number; width: number; height: number },
): boolean =>
  point.x >= bounds.x &&
  point.y >= bounds.y &&
  point.x < bounds.x + bounds.width &&
  point.y < bounds.y + bounds.height;

const sameRegistration = (
  left: RigAssetBinding,
  right: RigAssetBinding,
): boolean =>
  left.width === right.width &&
  left.height === right.height &&
  left.registration.anchorX === right.registration.anchorX &&
  left.registration.anchorY === right.registration.anchorY &&
  left.registration.pivotX === right.registration.pivotX &&
  left.registration.pivotY === right.registration.pivotY &&
  left.registration.groundY === right.registration.groundY;

const refineArticulatedRig = (
  manifest: {
    parts: Array<z.infer<typeof articulatedRigPartSchema>>;
    exposures: Array<z.infer<typeof articulatedRigExposureSchema>>;
    visemeIds: string[];
    visemeMappings: Array<z.infer<typeof articulatedRigVisemeMappingSchema>>;
  },
  context: z.RefinementCtx,
): void => {
  const partById = new Map(manifest.parts.map((part) => [part.id, part]));
  if (partById.size !== manifest.parts.length)
    context.addIssue({
      code: "custom",
      path: ["parts"],
      message: "Articulated rig part ids must be unique.",
    });

  const roots = manifest.parts.filter((part) => part.parentId === null);
  if (roots.length !== 1 || roots[0]?.id !== "torso")
    context.addIssue({
      code: "custom",
      path: ["parts"],
      message:
        "Articulated rigs require exactly one internal root part named torso.",
    });

  const socketIds = new Set<string>();
  for (const [partIndex, part] of manifest.parts.entries()) {
    if (isReservedWholeActorPartId(part.id))
      context.addIssue({
        code: "custom",
        path: ["parts", partIndex, "id"],
        message: `Articulated rig part ${part.id} is reserved for whole-actor authority.`,
      });
    if (part.parentId !== null && !partById.has(part.parentId))
      context.addIssue({
        code: "custom",
        path: ["parts", partIndex, "parentId"],
        message: `Articulated rig part ${part.id} references missing parent ${part.parentId}.`,
      });
    if (
      part.bounds.x + part.bounds.width > part.asset.width ||
      part.bounds.y + part.bounds.height > part.asset.height
    )
      context.addIssue({
        code: "custom",
        path: ["parts", partIndex, "bounds"],
        message: `Articulated rig part ${part.id} bounds leave its asset canvas.`,
      });
    if (!pointIsInsideBounds(part.pivot, part.bounds))
      context.addIssue({
        code: "custom",
        path: ["parts", partIndex, "pivot"],
        message: `Articulated rig part ${part.id} pivot must stay inside its bounds.`,
      });
    for (const [socketIndex, socket] of part.sockets.entries()) {
      if (socketIds.has(socket.id))
        context.addIssue({
          code: "custom",
          path: ["parts", partIndex, "sockets", socketIndex, "id"],
          message: `Articulated rig socket id ${socket.id} must be unique.`,
        });
      socketIds.add(socket.id);
      if (!pointIsInsideBounds(socket.position, part.bounds))
        context.addIssue({
          code: "custom",
          path: ["parts", partIndex, "sockets", socketIndex, "position"],
          message: `Articulated rig socket ${socket.id} must stay inside part ${part.id} bounds.`,
        });
    }
  }

  for (const part of manifest.parts) {
    const visited = new Set<string>();
    let cursor: typeof part | undefined = part;
    while (cursor) {
      if (visited.has(cursor.id)) {
        context.addIssue({
          code: "custom",
          path: ["parts"],
          message: `Articulated rig hierarchy contains a cycle at ${cursor.id}.`,
        });
        break;
      }
      visited.add(cursor.id);
      cursor = cursor.parentId ? partById.get(cursor.parentId) : undefined;
    }
  }

  const exposureById = new Map(
    manifest.exposures.map((exposure) => [exposure.id, exposure]),
  );
  if (exposureById.size !== manifest.exposures.length)
    context.addIssue({
      code: "custom",
      path: ["exposures"],
      message: "Articulated rig exposure ids must be unique.",
    });
  for (const [exposureIndex, exposure] of manifest.exposures.entries()) {
    const part = partById.get(exposure.partId);
    if (!part)
      context.addIssue({
        code: "custom",
        path: ["exposures", exposureIndex, "partId"],
        message: `Articulated rig exposure ${exposure.id} references missing part ${exposure.partId}.`,
      });
    else if (!sameRegistration(exposure.asset, part.asset))
      context.addIssue({
        code: "custom",
        path: ["exposures", exposureIndex, "asset", "registration"],
        message: `Articulated rig exposure ${exposure.id} registration must match part ${part.id}.`,
      });
  }

  const declaredVisemes = new Set(manifest.visemeIds);
  if (declaredVisemes.size !== manifest.visemeIds.length)
    context.addIssue({
      code: "custom",
      path: ["visemeIds"],
      message: "Articulated rig viseme ids must be unique.",
    });
  const mappedVisemes = new Set<string>();
  for (const [mappingIndex, mapping] of manifest.visemeMappings.entries()) {
    if (!declaredVisemes.has(mapping.visemeId))
      context.addIssue({
        code: "custom",
        path: ["visemeMappings", mappingIndex, "visemeId"],
        message: `Articulated rig mapping references undeclared viseme ${mapping.visemeId}.`,
      });
    if (!exposureById.has(mapping.exposureId))
      context.addIssue({
        code: "custom",
        path: ["visemeMappings", mappingIndex, "exposureId"],
        message: `Articulated rig viseme ${mapping.visemeId} references undeclared exposure ${mapping.exposureId}.`,
      });
    if (mappedVisemes.has(mapping.visemeId))
      context.addIssue({
        code: "custom",
        path: ["visemeMappings", mappingIndex, "visemeId"],
        message: `Articulated rig viseme ${mapping.visemeId} must have exactly one mapping.`,
      });
    mappedVisemes.add(mapping.visemeId);
  }
  for (const visemeId of declaredVisemes)
    if (!mappedVisemes.has(visemeId))
      context.addIssue({
        code: "custom",
        path: ["visemeMappings"],
        message: `Articulated rig declared viseme ${visemeId} is not mapped.`,
      });
};

const articulatedCharacterRigManifestFields = {
  ...manifestIdentityFields,
  type: z.literal("character-rig"),
  animationMode: z.literal("articulated-2d"),
  identityReference: rigAssetBindingSchema,
  renderer: z
    .object({ id: identifierSchema, version: z.string().min(1) })
    .strict(),
  template: z
    .object({ id: identifierSchema, version: z.string().min(1) })
    .strict(),
  parts: z.array(articulatedRigPartSchema).min(2),
  exposures: z.array(articulatedRigExposureSchema),
  visemeIds: z.array(identifierSchema),
  visemeMappings: z.array(articulatedRigVisemeMappingSchema),
};

export const articulatedCharacterRigManifestDraftSchema = z
  .object(articulatedCharacterRigManifestFields)
  .strict()
  .superRefine(refineArticulatedRig);

export const articulatedCharacterRigManifestSchema = z
  .object({ ...articulatedCharacterRigManifestFields, contentHash: hashSchema })
  .strict()
  .superRefine((manifest, context) => {
    refineArticulatedRig(manifest, context);
    const { contentHash, ...draft } = manifest;
    if (hashCanonical(draft) !== contentHash)
      context.addIssue({
        code: "custom",
        path: ["contentHash"],
        message: "Articulated rig manifest hash is invalid.",
      });
  });

export const backgroundLayerManifestDraftSchema = z
  .object({
    ...manifestIdentityFields,
    type: z.literal("background-layers"),
    layers: z.tuple([
      z
        .object({
          role: z.literal("far"),
          parallax: z.number().min(0).max(1),
          asset: rigAssetBindingSchema,
        })
        .strict(),
      z
        .object({
          role: z.literal("midground"),
          parallax: z.number().min(0).max(1),
          asset: rigAssetBindingSchema,
        })
        .strict(),
      z
        .object({
          role: z.literal("foreground"),
          parallax: z.number().min(0).max(1),
          asset: rigAssetBindingSchema,
        })
        .strict(),
    ]),
  })
  .strict();

export const propManifestDraftSchema = z
  .object({
    ...manifestIdentityFields,
    type: z.literal("prop"),
    assetClass: z.enum([
      "prop",
      "editorial-visual",
      "diagram",
      "reconstruction",
    ]),
    cutout: rigAssetBindingSchema,
  })
  .strict();

export const assetRigManifestDraftSchema = z.union([
  characterRigManifestDraftSchema,
  articulatedCharacterRigManifestDraftSchema,
  backgroundLayerManifestDraftSchema,
  propManifestDraftSchema,
]);
export const assetRigManifestSchema = z.union([
  z
    .object({
      ...characterRigManifestDraftSchema.shape,
      contentHash: hashSchema,
    })
    .strict(),
  articulatedCharacterRigManifestSchema,
  z
    .object({
      ...backgroundLayerManifestDraftSchema.shape,
      contentHash: hashSchema,
    })
    .strict(),
  z
    .object({ ...propManifestDraftSchema.shape, contentHash: hashSchema })
    .strict(),
]);

const rigValidationFields = {
  schemaVersion: z.literal("1.0"),
  manifestId: identifierSchema,
  manifestContentHash: hashSchema,
  candidateSetId: identifierSchema,
  status: z.enum(["passed", "failed"]),
  checks: z
    .array(
      z
        .object({
          code: z.string().min(1),
          status: z.enum(["passed", "failed"]),
          message: z.string().min(1),
        })
        .strict(),
    )
    .min(1),
};
export const rigValidationReportDraftSchema = z
  .object(rigValidationFields)
  .strict()
  .superRefine((report, context) => {
    const failed = report.checks.some((check) => check.status === "failed");
    if ((report.status === "failed") !== failed)
      context.addIssue({
        code: "custom",
        message: "Rig validation status must reflect its checks.",
      });
  });
export const rigValidationReportSchema = z
  .object({
    ...rigValidationFields,
    validatedAt: z.string().datetime(),
    contentHash: hashSchema,
  })
  .strict()
  .superRefine((report, context) => {
    const failed = report.checks.some((check) => check.status === "failed");
    if ((report.status === "failed") !== failed)
      context.addIssue({
        code: "custom",
        message: "Rig validation status must reflect its checks.",
      });
  });

const rigDiagnosticReportFields = {
  schemaVersion: z.literal("1.0"),
  candidateSetId: identifierSchema,
  manifestContentHash: hashSchema,
  validationReportContentHash: hashSchema,
  videoContentHash: hashSchema,
  videoRelativeFile: z.string().min(1),
  fps: z.literal(30),
  frameCount: z.literal(120),
  width: z.literal(1280),
  height: z.literal(720),
  sourceDiagnosticContentHash: hashSchema.nullable(),
};
export const rigDiagnosticReportDraftSchema = z
  .object(rigDiagnosticReportFields)
  .strict();
export const rigDiagnosticReportSchema = z
  .object({
    ...rigDiagnosticReportFields,
    renderedAt: z.string().datetime(),
    contentHash: hashSchema,
  })
  .strict();

export type RigAssetBinding = z.infer<typeof rigAssetBindingSchema>;
export type AssetRigManifestDraft = z.infer<typeof assetRigManifestDraftSchema>;
export type AssetRigManifest = z.infer<typeof assetRigManifestSchema>;
export type RigValidationReport = z.infer<typeof rigValidationReportSchema>;
export type RigDiagnosticReportDraft = z.infer<
  typeof rigDiagnosticReportDraftSchema
>;
export type RigDiagnosticReport = z.infer<typeof rigDiagnosticReportSchema>;

const binding = (candidate: PreparedCandidate): RigAssetBinding =>
  rigAssetBindingSchema.parse({
    candidateId: candidate.candidateId,
    fileRole: candidate.fileRole,
    contentHash: candidate.preparedContentHash,
    relativeFile: candidate.relativeFile,
    width: candidate.width,
    height: candidate.height,
    registration: candidate.registration,
  });
const byRole = (
  prepared: PreparedCandidate[],
  role: string,
): PreparedCandidate => {
  const candidate = prepared.find((entry) => entry.fileRole === role);
  if (!candidate) throw new Error(`Prepared candidate set is missing ${role}.`);
  return candidate;
};

export function createAssetRigManifest(
  brief: GenerationBrief,
  candidateSetId: string,
  preparedInput: PreparedCandidate[],
  createdAt: string,
): AssetRigManifest {
  const prepared = preparedCandidateSchema.array().min(1).parse(preparedInput);
  if (
    prepared.some(
      (candidate) =>
        candidate.candidateSetId !== candidateSetId ||
        candidate.briefId !== brief.id ||
        candidate.requirementId !== brief.requirementId,
    )
  )
    throw new Error(
      "Rig manifest candidates must match the brief and candidate set.",
    );
  const identity = {
    schemaVersion: "1.0" as const,
    manifestId: `manifest-${candidateSetId}`,
    candidateSetId,
    briefId: brief.id,
    requirementId: brief.requirementId,
    entityId: brief.entity.id,
    entityName: brief.entity.name,
    createdAt,
  };
  let draft: AssetRigManifestDraft;
  if (
    brief.outputRole === "character-canonical-sheet" ||
    brief.outputRole === "character-parts"
  ) {
    draft = characterRigManifestDraftSchema.parse({
      ...identity,
      type: "character-rig",
      animationMode: "pose-swap-2d",
      identityReference: binding(byRole(prepared, "identity-sheet.png")),
      poses: {
        neutral: binding(byRole(prepared, "neutral-pose.png")),
        talk: binding(byRole(prepared, "talk-pose.png")),
        reaction: binding(byRole(prepared, "reaction-pose.png")),
      },
    });
  } else if (
    brief.outputRole === "background-master" ||
    brief.outputRole === "background-layers"
  ) {
    draft = backgroundLayerManifestDraftSchema.parse({
      ...identity,
      type: "background-layers",
      layers: [
        {
          role: "far",
          parallax: 0.04,
          asset: binding(byRole(prepared, "clean-plate.png")),
        },
        {
          role: "midground",
          parallax: 0.12,
          asset: binding(byRole(prepared, "midground.png")),
        },
        {
          role: "foreground",
          parallax: 0.22,
          asset: binding(byRole(prepared, "foreground-occluders.png")),
        },
      ],
    });
  } else {
    const assetClass =
      brief.outputRole === "diagram"
        ? "diagram"
        : brief.outputRole === "reconstruction"
          ? "reconstruction"
          : brief.outputRole === "editorial-illustration"
            ? "editorial-visual"
            : "prop";
    draft = propManifestDraftSchema.parse({
      ...identity,
      type: "prop",
      assetClass,
      cutout: binding(byRole(prepared, "candidate.png")),
    });
  }
  return assetRigManifestSchema.parse({
    ...draft,
    contentHash: hashCanonical(draft),
  });
}

export function validateAssetRigManifest(
  manifestInput: AssetRigManifest,
  validatedAt: string,
): RigValidationReport {
  const manifest = assetRigManifestSchema.parse(manifestInput);
  const checks: Array<{
    code: string;
    status: "passed" | "failed";
    message: string;
  }> = [
    {
      code: "MANIFEST_HASH",
      status:
        hashCanonical(
          Object.fromEntries(
            Object.entries(manifest).filter(([key]) => key !== "contentHash"),
          ),
        ) === manifest.contentHash
          ? "passed"
          : "failed",
      message: "Manifest canonical hash matches its bindings.",
    },
  ];
  if (manifest.type === "character-rig") {
    if (manifest.animationMode === "pose-swap-2d") {
      const poses = Object.values(manifest.poses);
      const sameCanvas = poses.every(
        (pose) =>
          pose.width === poses[0]!.width && pose.height === poses[0]!.height,
      );
      const sameGround = poses.every(
        (pose) =>
          Math.abs(
            pose.registration.groundY - poses[0]!.registration.groundY,
          ) <= 2,
      );
      checks.push(
        {
          code: "CHARACTER_CANVAS",
          status: sameCanvas ? "passed" : "failed",
          message: "Character pose canvases share exact dimensions.",
        },
        {
          code: "CHARACTER_GROUND",
          status: sameGround ? "passed" : "failed",
          message:
            "Character pose ground registration stays within two pixels.",
        },
        {
          code: "CHARACTER_POSES",
          status: poses.length === 3 ? "passed" : "failed",
          message: "Neutral, talk, and reaction poses are bound.",
        },
      );
    } else {
      checks.push(
        {
          code: "ARTICULATED_HIERARCHY",
          status: "passed",
          message:
            "Articulated character has one validated torso-rooted local hierarchy.",
        },
        {
          code: "ARTICULATED_REGISTRATION",
          status: "passed",
          message:
            "Articulated part, socket, and exposure registration is valid.",
        },
        {
          code: "ARTICULATED_VISEMES",
          status: "passed",
          message:
            "Articulated viseme mappings reference sealed local exposures.",
        },
      );
    }
  } else if (manifest.type === "background-layers") {
    const layers = manifest.layers.map((layer) => layer.asset);
    const sameCanvas = layers.every(
      (layer) =>
        layer.width === layers[0]!.width && layer.height === layers[0]!.height,
    );
    checks.push(
      {
        code: "BACKGROUND_CANVAS",
        status: sameCanvas ? "passed" : "failed",
        message: "Background layers share exact dimensions.",
      },
      {
        code: "BACKGROUND_DEPTH",
        status:
          manifest.layers[0].parallax < manifest.layers[1].parallax &&
          manifest.layers[1].parallax < manifest.layers[2].parallax
            ? "passed"
            : "failed",
        message: "Parallax increases from far to foreground.",
      },
    );
  } else {
    checks.push({
      code: "PROP_REGISTRATION",
      status:
        manifest.cutout.registration.groundY < manifest.cutout.height
          ? "passed"
          : "failed",
      message: "Prop registration stays inside the prepared canvas.",
    });
  }
  const draft = rigValidationReportDraftSchema.parse({
    schemaVersion: "1.0",
    manifestId: manifest.manifestId,
    manifestContentHash: manifest.contentHash,
    candidateSetId: manifest.candidateSetId,
    status: checks.some((check) => check.status === "failed")
      ? "failed"
      : "passed",
    checks,
  });
  const unhashed = { ...draft, validatedAt };
  return rigValidationReportSchema.parse({
    ...unhashed,
    contentHash: hashCanonical(unhashed),
  });
}

export function verifyAssetRigManifestHash(
  manifest: AssetRigManifest,
): boolean {
  const { contentHash, ...unhashed } = manifest;
  return hashCanonical(unhashed) === contentHash;
}

export function verifyRigValidationReportHash(
  report: RigValidationReport,
): boolean {
  const { contentHash, ...unhashed } = report;
  return hashCanonical(unhashed) === contentHash;
}

export function finalizeRigDiagnosticReport(
  draftInput: RigDiagnosticReportDraft,
  renderedAt: string,
): RigDiagnosticReport {
  const draft = rigDiagnosticReportDraftSchema.parse(draftInput);
  const unhashed = { ...draft, renderedAt };
  return rigDiagnosticReportSchema.parse({
    ...unhashed,
    contentHash: hashCanonical(unhashed),
  });
}

export function verifyRigDiagnosticReportHash(
  report: RigDiagnosticReport,
): boolean {
  const { contentHash, ...unhashed } = report;
  return hashCanonical(unhashed) === contentHash;
}
