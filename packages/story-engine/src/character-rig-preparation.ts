import { z } from "zod";
import { hashCanonical } from "./canonical-hash";
import {
  characterRigAssetRequestSchema,
  characterRigCandidateBundleSchema,
  characterRigSafeRelativePathSchema,
  inspectCharacterRigCandidateBundle,
  type CharacterRigAssetRequest,
  type CharacterRigCandidateBundle,
} from "./character-rig-acquisition";
import { hashSchema, identifierSchema } from "./model";

const withoutContentHash = <T extends { contentHash: string }>(value: T) =>
  Object.fromEntries(
    Object.entries(value).filter(([key]) => key !== "contentHash"),
  ) as Omit<T, "contentHash">;

export const characterRigAlphaClassSchema = z.enum([
  "opaque",
  "mixed-alpha",
]);

export const stagedCharacterRigCandidateSchema = z
  .object({
    candidateId: identifierSchema,
    requestItemId: identifierSchema,
    sourceContentHash: hashSchema,
    stagedContentHash: hashSchema,
    immutableLocationId: z.string().regex(/^sha256:[a-f0-9]{64}$/),
    relativeFile: characterRigSafeRelativePathSchema,
    byteLength: z.number().int().positive().max(50 * 1024 * 1024),
    mediaType: z.literal("image/png"),
    width: z.number().int().positive().max(8192),
    height: z.number().int().positive().max(8192),
    alphaClass: characterRigAlphaClassSchema,
    checks: z
      .object({
        byteLength: z.literal(true),
        contentHash: z.literal(true),
        codec: z.literal(true),
        dimensions: z.literal(true),
        decodedSinglePage: z.literal(true),
      })
      .strict(),
  })
  .strict();

const characterRigStagingReportFields = {
  schemaVersion: z.literal("1.0"),
  reportId: identifierSchema,
  requestId: identifierSchema,
  requestContentHash: hashSchema,
  bundleContentHash: hashSchema,
  identityLockContentHash: hashSchema,
  templateContentHash: hashSchema,
  status: z.enum(["complete", "incomplete"]),
  returnedItems: z.array(identifierSchema),
  missingItems: z.array(identifierSchema),
  unknownItems: z.array(identifierSchema),
  assets: z.array(stagedCharacterRigCandidateSchema).min(1).max(32),
  providerAuthority: z.literal(false),
  approvalRequired: z.literal(true),
  stagedAt: z.string().datetime(),
};

const refineStagingReport = (
  report: {
    status: "complete" | "incomplete";
    returnedItems: string[];
    missingItems: string[];
    unknownItems: string[];
    assets: Array<z.infer<typeof stagedCharacterRigCandidateSchema>>;
  },
  context: z.RefinementCtx,
) => {
  const candidateIds = new Set<string>();
  const requestItemIds = new Set<string>();
  const relativeFiles = new Set<string>();
  for (const [index, asset] of report.assets.entries()) {
    if (candidateIds.has(asset.candidateId))
      context.addIssue({
        code: "custom",
        path: ["assets", index, "candidateId"],
        message: `Staged candidate id is duplicated: ${asset.candidateId}.`,
      });
    if (requestItemIds.has(asset.requestItemId))
      context.addIssue({
        code: "custom",
        path: ["assets", index, "requestItemId"],
        message: `Staged request item is duplicated: ${asset.requestItemId}.`,
      });
    if (relativeFiles.has(asset.relativeFile))
      context.addIssue({
        code: "custom",
        path: ["assets", index, "relativeFile"],
        message: `Staged output path is duplicated: ${asset.relativeFile}.`,
      });
    candidateIds.add(asset.candidateId);
    requestItemIds.add(asset.requestItemId);
    relativeFiles.add(asset.relativeFile);
  }
  const unique = (values: string[]) => new Set(values).size === values.length;
  if (
    !unique(report.returnedItems) ||
    !unique(report.missingItems) ||
    !unique(report.unknownItems)
  )
    context.addIssue({
      code: "custom",
      message: "Staging inspection item lists must be unique.",
    });
  const complete =
    report.missingItems.length === 0 && report.unknownItems.length === 0;
  if ((report.status === "complete") !== complete)
    context.addIssue({
      code: "custom",
      path: ["status"],
      message: "Staging status must reflect missing and unknown request items.",
    });
};

export const characterRigStagingReportDraftSchema = z
  .object(characterRigStagingReportFields)
  .strict()
  .superRefine(refineStagingReport);

export const characterRigStagingReportSchema = z
  .object({ ...characterRigStagingReportFields, contentHash: hashSchema })
  .strict()
  .superRefine((report, context) => {
    refineStagingReport(report, context);
    if (hashCanonical(withoutContentHash(report)) !== report.contentHash)
      context.addIssue({
        code: "custom",
        path: ["contentHash"],
        message: "Character rig staging report hash is invalid.",
      });
  });

const characterRigImportReceiptFields = {
  schemaVersion: z.literal("1.0"),
  importId: identifierSchema,
  requestContentHash: hashSchema,
  candidateBundleContentHash: hashSchema,
  stagingReportContentHash: hashSchema,
  files: z
    .array(
      z
        .object({
          requestItemId: identifierSchema,
          candidateId: identifierSchema,
          sourceContentHash: hashSchema,
          byteLength: z.number().int().positive().max(50 * 1024 * 1024),
          mediaType: z.literal("image/png"),
          width: z.number().int().positive().max(8192),
          height: z.number().int().positive().max(8192),
          immutableLocationId: z.string().regex(/^sha256:[a-f0-9]{64}$/),
          stagedRelativeFile: characterRigSafeRelativePathSchema,
        })
        .strict(),
    )
    .length(7),
  providerAuthority: z.literal(false),
  approvalRequired: z.literal(true),
  importedAt: z.string().datetime(),
};

const refineCharacterRigImportReceipt = (
  receipt: { files: Array<{ requestItemId: string; candidateId: string; sourceContentHash: string; immutableLocationId: string; stagedRelativeFile: string }> },
  context: z.RefinementCtx,
) => {
  for (const key of ["requestItemId", "candidateId", "sourceContentHash", "immutableLocationId", "stagedRelativeFile"] as const)
    if (new Set(receipt.files.map((file) => file[key])).size !== receipt.files.length)
      context.addIssue({ code: "custom", path: ["files"], message: `Character rig import receipt ${key} values must be unique.` });
};

export const characterRigImportReceiptDraftSchema = z
  .object(characterRigImportReceiptFields)
  .strict()
  .superRefine(refineCharacterRigImportReceipt);

export const characterRigImportReceiptSchema = z
  .object({ ...characterRigImportReceiptFields, contentHash: hashSchema })
  .strict()
  .superRefine((receipt, context) => {
    refineCharacterRigImportReceipt(receipt, context);
    if (hashCanonical(withoutContentHash(receipt)) !== receipt.contentHash)
      context.addIssue({ code: "custom", path: ["contentHash"], message: "Character rig import receipt hash is invalid." });
  });

const sourceRectSchema = z
  .object({
    x: z.number().int().nonnegative(),
    y: z.number().int().nonnegative(),
    width: z.number().int().positive(),
    height: z.number().int().positive(),
  })
  .strict();

const localPointSchema = z
  .object({ x: z.number().int().nonnegative(), y: z.number().int().nonnegative() })
  .strict();

const matteSchema = z.discriminatedUnion("mode", [
  z.object({ mode: z.literal("existing-alpha") }).strict(),
  z
    .object({
      mode: z.literal("chroma-key"),
      color: z.string().regex(/^#[0-9a-f]{6}$/),
      tolerance: z.number().int().min(0).max(255),
      softness: z.number().int().min(0).max(255),
      spillSuppression: z.number().min(0).max(1),
    })
    .strict(),
]);

const extractionSourceSchema = z
  .object({
    candidateId: identifierSchema,
    requestItemId: identifierSchema,
    stagedContentHash: hashSchema,
    rect: sourceRectSchema,
    matte: matteSchema,
  })
  .strict();

const extractionOutputSchema = z
  .object({
    relativeFile: characterRigSafeRelativePathSchema,
    width: z.number().int().positive().max(8192),
    height: z.number().int().positive().max(8192),
    padding: z.number().int().min(1).max(512),
  })
  .strict();

export const characterRigPartRoleSchema = z.enum([
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
  "brow-neutral-left",
  "brow-neutral-right",
  "mouth-rest",
]);

export const characterRigExposureRoleSchema = z.enum([
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
]);

const characterRigRecipePartSchema = z
  .object({
    id: identifierSchema,
    role: characterRigPartRoleSchema,
    source: extractionSourceSchema,
    output: extractionOutputSchema,
    parentId: identifierSchema.nullable(),
    parentSocketId: identifierSchema.nullable(),
    childPivot: localPointSchema,
    parentJoint: localPointSchema.nullable(),
    restTransform: z
      .object({
        x: z.number(),
        y: z.number(),
        rotation: z.number().min(-360).max(360),
        scaleX: z.number().positive().max(10),
        scaleY: z.number().positive().max(10),
      })
      .strict(),
    sockets: z.array(
      z.object({ id: identifierSchema, position: localPointSchema }).strict(),
    ),
    zIndex: z.number().int().min(-128).max(128),
  })
  .strict();

const characterRigRecipeExposureSchema = z
  .object({
    id: identifierSchema,
    role: characterRigExposureRoleSchema,
    targetPartId: identifierSchema,
    source: extractionSourceSchema,
    output: extractionOutputSchema,
    childPivot: localPointSchema,
  })
  .strict();

const characterRigPreparationRecipeFields = {
  schemaVersion: z.literal("1.0"),
  recipeId: identifierSchema,
  requestId: identifierSchema,
  requestContentHash: hashSchema,
  bundleContentHash: hashSchema,
  stagingReportContentHash: hashSchema,
  identityLockContentHash: hashSchema,
  templateContentHash: hashSchema,
  processor: z
    .object({
      extractionAlgorithm: z
        .object({ id: identifierSchema, version: z.string().min(1) })
        .strict(),
      imageLibrary: z
        .object({ id: z.literal("sharp"), version: z.string().min(1) })
        .strict(),
    })
    .strict(),
  view: z.enum(["front", "profile-left", "profile-right"]),
  state: z.literal("proposed"),
  parts: z.array(characterRigRecipePartSchema).min(2).max(40),
  exposures: z.array(characterRigRecipeExposureSchema).max(40),
  approvalRequired: z.literal(true),
};

const pointInsideOutput = (
  point: { x: number; y: number },
  output: { width: number; height: number },
) => point.x < output.width && point.y < output.height;

const rectsOverlap = (
  left: z.infer<typeof sourceRectSchema>,
  right: z.infer<typeof sourceRectSchema>,
) =>
  left.x < right.x + right.width &&
  left.x + left.width > right.x &&
  left.y < right.y + right.height &&
  left.y + left.height > right.y;

const refinePreparationRecipe = (
  recipe: {
    parts: Array<z.infer<typeof characterRigRecipePartSchema>>;
    exposures: Array<z.infer<typeof characterRigRecipeExposureSchema>>;
  },
  context: z.RefinementCtx,
) => {
  const partById = new Map(recipe.parts.map((part) => [part.id, part]));
  if (partById.size !== recipe.parts.length)
    context.addIssue({ code: "custom", path: ["parts"], message: "Recipe part ids must be unique." });
  const roles = [...recipe.parts.map((part) => part.role), ...recipe.exposures.map((exposure) => exposure.role)];
  if (new Set(roles).size !== roles.length)
    context.addIssue({ code: "custom", message: "Recipe component roles must be unique within a view." });
  const outputFiles = [...recipe.parts.map((part) => part.output.relativeFile), ...recipe.exposures.map((exposure) => exposure.output.relativeFile)];
  if (new Set(outputFiles).size !== outputFiles.length)
    context.addIssue({ code: "custom", message: "Recipe output files must be unique." });
  const zIndexes = recipe.parts.map((part) => part.zIndex);
  if (new Set(zIndexes).size !== zIndexes.length)
    context.addIssue({ code: "custom", path: ["parts"], message: "Recipe z-order values must be unique and deterministic." });

  const roots = recipe.parts.filter((part) => part.parentId === null);
  if (roots.length !== 1 || roots[0]?.role !== "torso")
    context.addIssue({ code: "custom", path: ["parts"], message: "Recipe must have exactly one torso root." });

  for (const [index, part] of recipe.parts.entries()) {
    if (!pointInsideOutput(part.childPivot, part.output))
      context.addIssue({ code: "custom", path: ["parts", index, "childPivot"], message: `Part ${part.id} child pivot leaves its output canvas.` });
    const socketIds = new Set<string>();
    for (const [socketIndex, socket] of part.sockets.entries()) {
      if (socketIds.has(socket.id))
        context.addIssue({ code: "custom", path: ["parts", index, "sockets", socketIndex, "id"], message: `Part ${part.id} repeats socket ${socket.id}.` });
      if (!pointInsideOutput(socket.position, part.output))
        context.addIssue({ code: "custom", path: ["parts", index, "sockets", socketIndex, "position"], message: `Socket ${socket.id} leaves part ${part.id}.` });
      socketIds.add(socket.id);
    }
    if (part.parentId === null) {
      if (part.parentSocketId !== null || part.parentJoint !== null)
        context.addIssue({ code: "custom", path: ["parts", index], message: "The torso root cannot name a parent socket or joint." });
    } else {
      const parent = partById.get(part.parentId);
      if (!parent)
        context.addIssue({ code: "custom", path: ["parts", index, "parentId"], message: `Part ${part.id} references missing parent ${part.parentId}.` });
      else {
        const socket = parent.sockets.find((candidate) => candidate.id === part.parentSocketId);
        if (!socket)
          context.addIssue({ code: "custom", path: ["parts", index, "parentSocketId"], message: `Part ${part.id} must bind a socket owned by ${parent.id}.` });
        else if (!part.parentJoint || part.parentJoint.x !== socket.position.x || part.parentJoint.y !== socket.position.y)
          context.addIssue({ code: "custom", path: ["parts", index, "parentJoint"], message: `Part ${part.id} parent joint must match ${part.parentSocketId}.` });
      }
    }
  }

  for (const part of recipe.parts) {
    const visited = new Set<string>();
    let cursor: typeof part | undefined = part;
    while (cursor) {
      if (visited.has(cursor.id)) {
        context.addIssue({ code: "custom", path: ["parts"], message: `Recipe hierarchy contains a cycle at ${cursor.id}.` });
        break;
      }
      visited.add(cursor.id);
      cursor = cursor.parentId ? partById.get(cursor.parentId) : undefined;
    }
  }

  const exposureIds = new Set<string>();
  for (const [index, exposure] of recipe.exposures.entries()) {
    if (exposureIds.has(exposure.id))
      context.addIssue({ code: "custom", path: ["exposures", index, "id"], message: `Recipe exposure id is duplicated: ${exposure.id}.` });
    exposureIds.add(exposure.id);
    const target = partById.get(exposure.targetPartId);
    if (!target)
      context.addIssue({ code: "custom", path: ["exposures", index, "targetPartId"], message: `Exposure ${exposure.id} references missing target part.` });
    else if (
      target.output.width !== exposure.output.width ||
      target.output.height !== exposure.output.height ||
      target.childPivot.x !== exposure.childPivot.x ||
      target.childPivot.y !== exposure.childPivot.y
    )
      context.addIssue({ code: "custom", path: ["exposures", index], message: `Exposure ${exposure.id} registration must exactly match target ${target.id}.` });
    if (!pointInsideOutput(exposure.childPivot, exposure.output))
      context.addIssue({ code: "custom", path: ["exposures", index, "childPivot"], message: `Exposure ${exposure.id} child pivot leaves its output canvas.` });
  }

  const sources = [
    ...recipe.parts.map((part) => ({ id: part.id, source: part.source })),
    ...recipe.exposures.map((exposure) => ({ id: exposure.id, source: exposure.source })),
  ];
  for (let leftIndex = 0; leftIndex < sources.length; leftIndex += 1)
    for (let rightIndex = leftIndex + 1; rightIndex < sources.length; rightIndex += 1) {
      const left = sources[leftIndex]!;
      const right = sources[rightIndex]!;
      if (
        left.source.candidateId === right.source.candidateId &&
        rectsOverlap(left.source.rect, right.source.rect)
      )
        context.addIssue({ code: "custom", message: `Source crops overlap for ${left.id} and ${right.id}.` });
    }
};

export const characterRigPreparationRecipeDraftSchema = z
  .object(characterRigPreparationRecipeFields)
  .strict()
  .superRefine(refinePreparationRecipe);

export const characterRigPreparationRecipeSchema = z
  .object({ ...characterRigPreparationRecipeFields, contentHash: hashSchema })
  .strict()
  .superRefine((recipe, context) => {
    refinePreparationRecipe(recipe, context);
    if (hashCanonical(withoutContentHash(recipe)) !== recipe.contentHash)
      context.addIssue({ code: "custom", path: ["contentHash"], message: "Character rig preparation recipe hash is invalid." });
  });

export type StagedCharacterRigCandidate = z.infer<typeof stagedCharacterRigCandidateSchema>;
export type CharacterRigStagingReportDraft = z.infer<typeof characterRigStagingReportDraftSchema>;
export type CharacterRigStagingReport = z.infer<typeof characterRigStagingReportSchema>;
export type CharacterRigImportReceipt = z.infer<typeof characterRigImportReceiptSchema>;
export type CharacterRigPreparationRecipeDraft = z.infer<typeof characterRigPreparationRecipeDraftSchema>;
export type CharacterRigPreparationRecipe = z.infer<typeof characterRigPreparationRecipeSchema>;

export const createCharacterRigStagingReport = (
  rawDraft: CharacterRigStagingReportDraft,
): CharacterRigStagingReport => {
  const draft = characterRigStagingReportDraftSchema.parse(rawDraft);
  return characterRigStagingReportSchema.parse({
    ...draft,
    contentHash: hashCanonical(draft),
  });
};

export const createCharacterRigImportReceipt = (
  rawReport: CharacterRigStagingReport,
  importId: string,
  importedAt: string,
): CharacterRigImportReceipt => {
  const report = characterRigStagingReportSchema.parse(rawReport);
  if (report.status !== "complete" || report.missingItems.length || report.unknownItems.length)
    throw new Error("A character rig import receipt requires exact request-item coverage.");
  const draft = characterRigImportReceiptDraftSchema.parse({
    schemaVersion: "1.0",
    importId,
    requestContentHash: report.requestContentHash,
    candidateBundleContentHash: report.bundleContentHash,
    stagingReportContentHash: report.contentHash,
    files: report.assets.map((asset) => ({
      requestItemId: asset.requestItemId,
      candidateId: asset.candidateId,
      sourceContentHash: asset.sourceContentHash,
      byteLength: asset.byteLength,
      mediaType: asset.mediaType,
      width: asset.width,
      height: asset.height,
      immutableLocationId: asset.immutableLocationId,
      stagedRelativeFile: asset.relativeFile,
    })),
    providerAuthority: false,
    approvalRequired: true,
    importedAt,
  });
  return characterRigImportReceiptSchema.parse({
    ...draft,
    contentHash: hashCanonical(draft),
  });
};

export const createCharacterRigPreparationRecipe = (
  rawDraft: CharacterRigPreparationRecipeDraft,
): CharacterRigPreparationRecipe => {
  const draft = characterRigPreparationRecipeDraftSchema.parse(rawDraft);
  return characterRigPreparationRecipeSchema.parse({
    ...draft,
    contentHash: hashCanonical(draft),
  });
};

export const validateCharacterRigStagingReport = (
  rawRequest: CharacterRigAssetRequest,
  rawBundle: CharacterRigCandidateBundle,
  rawReport: CharacterRigStagingReport,
) => {
  const request = characterRigAssetRequestSchema.parse(rawRequest);
  const bundle = characterRigCandidateBundleSchema.parse(rawBundle);
  const report = characterRigStagingReportSchema.parse(rawReport);
  const inspection = inspectCharacterRigCandidateBundle(request, bundle);
  if (
    report.requestId !== request.requestId ||
    report.requestContentHash !== request.contentHash ||
    report.bundleContentHash !== bundle.contentHash ||
    report.identityLockContentHash !== request.identityLock.contentHash ||
    report.templateContentHash !== request.rigProfile.templateContentHash
  )
    throw new Error("Character rig staging report is not bound to the exact request, bundle, identity, and template.");
  if (
    report.status !== inspection.status ||
    hashCanonical(report.returnedItems) !== hashCanonical(inspection.returnedItems) ||
    hashCanonical(report.missingItems) !== hashCanonical(inspection.missingItems) ||
    hashCanonical(report.unknownItems) !== hashCanonical(inspection.unknownItems)
  )
    throw new Error("Character rig staging report does not match candidate-bundle inspection.");
  const assets = new Map(bundle.assets.map((asset) => [asset.candidateId, asset]));
  for (const staged of report.assets) {
    const source = assets.get(staged.candidateId);
    if (
      !source ||
      staged.requestItemId !== source.requestItemId ||
      staged.sourceContentHash !== source.contentHash ||
      staged.stagedContentHash !== source.contentHash ||
      staged.immutableLocationId !== `sha256:${source.contentHash}` ||
      staged.byteLength !== source.byteLength ||
      staged.width !== source.width ||
      staged.height !== source.height
    )
      throw new Error(`Staged candidate ${staged.candidateId} is not bound to its declared source asset.`);
  }
  if (report.assets.length !== bundle.assets.length)
    throw new Error("Character rig staging report must account for every bundle asset exactly once.");
  return report;
};

export const validateCharacterRigPreparationRecipe = (
  rawRequest: CharacterRigAssetRequest,
  rawBundle: CharacterRigCandidateBundle,
  rawReport: CharacterRigStagingReport,
  rawRecipe: CharacterRigPreparationRecipe,
) => {
  const request = characterRigAssetRequestSchema.parse(rawRequest);
  const bundle = characterRigCandidateBundleSchema.parse(rawBundle);
  const report = validateCharacterRigStagingReport(request, bundle, rawReport);
  const recipe = characterRigPreparationRecipeSchema.parse(rawRecipe);
  if (
    recipe.requestId !== request.requestId ||
    recipe.requestContentHash !== request.contentHash ||
    recipe.bundleContentHash !== bundle.contentHash ||
    recipe.stagingReportContentHash !== report.contentHash ||
    recipe.identityLockContentHash !== request.identityLock.contentHash ||
    recipe.templateContentHash !== request.rigProfile.templateContentHash
  )
    throw new Error("Character rig recipe is not bound to the exact staged lineage.");

  const stagedByCandidate = new Map(report.assets.map((asset) => [asset.candidateId, asset]));
  const requestItems = new Map(request.items.map((item) => [item.id, item]));
  const components = [
    ...recipe.parts.map((part) => ({ id: part.id, role: part.role, source: part.source })),
    ...recipe.exposures.map((exposure) => ({ id: exposure.id, role: exposure.role, source: exposure.source })),
  ];
  for (const component of components) {
    const staged = stagedByCandidate.get(component.source.candidateId);
    const item = requestItems.get(component.source.requestItemId);
    if (!staged || staged.requestItemId !== component.source.requestItemId)
      throw new Error(`Recipe component ${component.id} names an unstaged candidate.`);
    if (component.source.stagedContentHash !== staged.stagedContentHash)
      throw new Error(`Recipe component ${component.id} names stale staged bytes.`);
    if (!item || item.kind === "turnaround-sheet")
      throw new Error(`Recipe component ${component.id} cannot use a turnaround sheet as separated rig art.`);
    if (item.view !== recipe.view || !item.requiredComponents.includes(component.role))
      throw new Error(`Recipe component ${component.id} is not declared for ${recipe.view}.`);
    if (
      component.source.rect.x + component.source.rect.width > staged.width ||
      component.source.rect.y + component.source.rect.height > staged.height
    )
      throw new Error(`Recipe component ${component.id} crop leaves its staged source.`);
    if (component.source.matte.mode === "existing-alpha" && staged.alphaClass === "opaque")
      throw new Error(`Opaque component ${component.id} cannot claim existing-alpha preparation.`);
    if (
      component.source.matte.mode === "chroma-key" &&
      request.controlledMatte !== component.source.matte.color
    )
      throw new Error(`Component ${component.id} matte does not match the request-controlled color.`);
  }

  const expectedItems = request.items.filter(
    (item) => item.view === recipe.view && item.kind !== "turnaround-sheet",
  );
  const expectedRoles = expectedItems.flatMap((item) => item.requiredComponents).sort();
  const actualRoles = components.map((component) => component.role).sort();
  if (hashCanonical(expectedRoles) !== hashCanonical(actualRoles))
    throw new Error(`Recipe for ${recipe.view} must account for every requested component exactly once.`);
  return {
    recipeContentHash: recipe.contentHash,
    componentCount: components.length,
    providerAuthority: false as const,
    approvalRequired: true as const,
    state: "proposed" as const,
  };
};
