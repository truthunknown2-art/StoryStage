import { z } from "zod";
import { hashCanonical } from "./canonical-hash";
import {
  characterRigAssetRequestSchema,
  characterRigCandidateBundleSchema,
} from "./character-rig-acquisition";
import {
  characterRigImportReceiptSchema,
  characterRigPreparationRecipeSchema,
  characterRigStagingReportSchema,
  validateCharacterRigPreparationRecipe,
} from "./character-rig-preparation";
import {
  continuityActionPhaseSchema,
  continuityMotionModeSchema,
} from "./director/continuity-sequence-plan";
import {
  evaluateActorLocalPerformanceKernel,
  isReservedActorLocalPartId,
  localPerformanceFrameSchema,
} from "./director/visual-performance-contract";
import { hashSchema, identifierSchema } from "./model";

const candidateRigReviewViewSchema = z.enum([
  "front",
  "profile-left",
  "profile-right",
]);

const candidateRigReviewVisualProgramFields = {
  schemaVersion: z.literal("1.0"),
  programKind: z.literal("candidate-rig-review"),
  authorityDomain: z.literal("source-review-only"),
  id: identifierSchema,
  requestContentHash: hashSchema,
  candidateBundleContentHash: hashSchema,
  stagingReportContentHash: hashSchema,
  importReceiptContentHash: hashSchema,
  preparationRecipeContentHash: hashSchema,
  identityLockContentHash: hashSchema,
  topologyTemplateContentHash: hashSchema,
  view: candidateRigReviewViewSchema,
  sourceBindings: z
    .array(
      z
        .object({ candidateId: identifierSchema, contentHash: hashSchema })
        .strict(),
    )
    .min(1),
  semanticRoles: z
    .array(
      z
        .object({
          componentId: identifierSchema,
          semanticRole: identifierSchema,
          kind: z.enum(["part", "exposure"]),
        })
        .strict(),
    )
    .min(2),
  partIds: z.array(identifierSchema).min(2),
  socketIds: z.array(identifierSchema),
  exposureIds: z.array(identifierSchema),
  visemeIds: z.array(identifierSchema),
  productionBindable: z.literal(false),
};

export const candidateRigReviewVisualProgramSchema = z
  .object({ ...candidateRigReviewVisualProgramFields, contentHash: hashSchema })
  .strict()
  .superRefine((program, context) => {
    const { contentHash, ...draft } = program;
    if (hashCanonical(draft) !== contentHash)
      context.addIssue({
        code: "custom",
        path: ["contentHash"],
        message: "Candidate rig review visual program hash is invalid.",
      });
    for (const [key, values] of Object.entries({
      sourceBindings: program.sourceBindings.map(
        (binding) => binding.candidateId,
      ),
      semanticRoles: program.semanticRoles.map(
        (binding) => binding.componentId,
      ),
      partIds: program.partIds,
      socketIds: program.socketIds,
      exposureIds: program.exposureIds,
      visemeIds: program.visemeIds,
    }))
      if (new Set(values).size !== values.length)
        context.addIssue({
          code: "custom",
          path: [key],
          message: `Candidate rig review visual program ${key} must be unique.`,
        });
    const canonicalSourceBindingIds = [...program.sourceBindings]
      .map((binding) => binding.candidateId)
      .sort((left, right) => left.localeCompare(right));
    if (
      hashCanonical(
        program.sourceBindings.map((binding) => binding.candidateId),
      ) !== hashCanonical(canonicalSourceBindingIds)
    )
      context.addIssue({
        code: "custom",
        path: ["sourceBindings"],
        message:
          "Candidate rig review source bindings must use canonical candidate-id order.",
      });
    for (const [index, partId] of program.partIds.entries())
      if (isReservedActorLocalPartId(partId))
        context.addIssue({
          code: "custom",
          path: ["partIds", index],
          message: `Candidate rig review part ${partId} is reserved for continuity/root authority.`,
        });
    const semanticPartIds = program.semanticRoles
      .filter((binding) => binding.kind === "part")
      .map((binding) => binding.componentId)
      .sort();
    const semanticExposureIds = program.semanticRoles
      .filter((binding) => binding.kind === "exposure")
      .map((binding) => binding.componentId)
      .sort();
    if (
      hashCanonical(semanticPartIds) !==
        hashCanonical([...program.partIds].sort()) ||
      hashCanonical(semanticExposureIds) !==
        hashCanonical([...program.exposureIds].sort())
    )
      context.addIssue({
        code: "custom",
        path: ["semanticRoles"],
        message:
          "Candidate rig review semantic roles must exactly bind every part/exposure allowlist id.",
      });
  });

export type CandidateRigReviewVisualProgram = z.infer<
  typeof candidateRigReviewVisualProgramSchema
>;

const sourceReviewRelativeFileSchema = z
  .string()
  .min(3)
  .max(500)
  .regex(
    /^(?!.*(?:^|\/)\.\.(?:\/|$))[a-z0-9][a-z0-9._/-]*$/,
    "Source-review render paths must be safe relative repository paths.",
  );

const sourceReviewRenderBindingFields = {
  candidateRigReviewVisualProgramContentHash: hashSchema,
  preparationRecipeContentHash: hashSchema,
  contentHash: hashSchema,
  byteLength: z
    .number()
    .int()
    .positive()
    .max(2 * 1024 * 1024 * 1024),
  width: z.number().int().positive().max(8192),
  height: z.number().int().positive().max(8192),
  relativeFile: sourceReviewRelativeFileSchema,
  rendererId: identifierSchema,
  rendererVersion: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9][a-z0-9._-]*$/),
  renderInputContentHash: hashSchema,
};

const sourceReviewStillRenderSchema = z
  .object({
    ...sourceReviewRenderBindingFields,
    mediaType: z.literal("image/png"),
    frameCount: z.literal(1),
    fps: z.null(),
  })
  .strict()
  .superRefine((render, context) => {
    if (!render.relativeFile.endsWith(".png"))
      context.addIssue({
        code: "custom",
        path: ["relativeFile"],
        message: "Source-review still renders must use a .png path.",
      });
  });

const sourceReviewMotionRenderSchema = z
  .object({
    ...sourceReviewRenderBindingFields,
    mediaType: z.literal("video/mp4"),
    motionProgramContentHash: hashSchema,
    frameCount: z.number().int().min(2).max(36_000),
    fps: z.number().int().positive().max(120),
  })
  .strict()
  .superRefine((render, context) => {
    if (!render.relativeFile.endsWith(".mp4"))
      context.addIssue({
        code: "custom",
        path: ["relativeFile"],
        message: "Source-review motion renders must use an .mp4 path.",
      });
  });

const reviewViewOrder = ["front", "profile-left", "profile-right"] as const;

const candidateRigReviewPointSchema = z
  .object({
    x: z.number().int().nonnegative(),
    y: z.number().int().nonnegative(),
  })
  .strict();

const candidateRigReviewRegistrationPlanFields = {
  schemaVersion: z.literal("1.0"),
  authorityDomain: z.literal("source-review-registration-input"),
  registrationState: z.literal("proposed"),
  view: candidateRigReviewViewSchema,
  requestContentHash: hashSchema,
  candidateBundleContentHash: hashSchema,
  stagingReportContentHash: hashSchema,
  importReceiptContentHash: hashSchema,
  identityLockContentHash: hashSchema,
  topologyTemplateContentHash: hashSchema,
  atlasMapContentHashes: z
    .object({ parts: hashSchema, face: hashSchema })
    .strict(),
  parts: z.array(
    z
      .object({
        role: identifierSchema,
        childPivot: candidateRigReviewPointSchema,
        parentJoint: candidateRigReviewPointSchema.nullable(),
        restTransform: z
          .object({
            x: z.number(),
            y: z.number(),
            rotation: z.number(),
            scaleX: z.number(),
            scaleY: z.number(),
          })
          .strict(),
        sockets: z.array(
          z
            .object({
              id: identifierSchema,
              position: candidateRigReviewPointSchema,
            })
            .strict(),
        ),
        zIndex: z.number().int(),
      })
      .strict(),
  ),
  exposures: z.array(
    z
      .object({
        role: identifierSchema,
        childPivot: candidateRigReviewPointSchema,
      })
      .strict(),
  ),
  approvalRequired: z.literal(true),
  productionBindable: z.literal(false),
};

export const candidateRigReviewRegistrationPlanSchema = z
  .object({
    ...candidateRigReviewRegistrationPlanFields,
    contentHash: hashSchema,
  })
  .strict()
  .superRefine((plan, context) => {
    const { contentHash, ...draft } = plan;
    if (hashCanonical(draft) !== contentHash)
      context.addIssue({
        code: "custom",
        path: ["contentHash"],
        message: "Candidate rig review registration plan hash is invalid.",
      });
    const assertCanonicalUnique = (
      values: string[],
      path: Array<string | number>,
      label: string,
    ) => {
      const canonical = [...values].sort((left, right) =>
        left.localeCompare(right),
      );
      if (
        new Set(values).size !== values.length ||
        hashCanonical(values) !== hashCanonical(canonical)
      )
        context.addIssue({
          code: "custom",
          path,
          message: `Candidate rig review registration ${label} must be unique and canonically ordered.`,
        });
    };
    assertCanonicalUnique(
      plan.parts.map((part) => part.role),
      ["parts"],
      "part roles",
    );
    assertCanonicalUnique(
      plan.exposures.map((exposure) => exposure.role),
      ["exposures"],
      "exposure roles",
    );
    for (const [index, part] of plan.parts.entries())
      assertCanonicalUnique(
        part.sockets.map((socket) => socket.id),
        ["parts", index, "sockets"],
        `socket ids for ${part.role}`,
      );
  });

export type CandidateRigReviewRegistrationPlan = z.infer<
  typeof candidateRigReviewRegistrationPlanSchema
>;

const characterRigSourceReviewViewPacketSchema = z
  .object({
    view: candidateRigReviewViewSchema,
    program: candidateRigReviewVisualProgramSchema,
    cleanRender: sourceReviewStillRenderSchema,
    overlayRender: sourceReviewStillRenderSchema,
    motionRender: sourceReviewMotionRenderSchema,
  })
  .strict();

const characterRigSourceReviewPacketFields = {
  schemaVersion: z.literal("1.0"),
  packetKind: z.literal("character-rig-source-review"),
  authorityDomain: z.literal("source-review-only"),
  packetId: identifierSchema,
  requestContentHash: hashSchema,
  candidateBundleContentHash: hashSchema,
  stagingReportContentHash: hashSchema,
  importReceiptContentHash: hashSchema,
  identityLockContentHash: hashSchema,
  topologyTemplateContentHash: hashSchema,
  views: z.array(characterRigSourceReviewViewPacketSchema).length(3),
  reviewStatus: z.literal("awaiting-human-review"),
  machineOwned: z.literal(true),
  humanReviewRecordContentHash: z.null(),
  providerAuthority: z.literal(false),
  approvalAuthority: z.literal(false),
  approvalRequired: z.literal(true),
  productionBindable: z.literal(false),
  createdAt: z.string().datetime(),
};

export const characterRigSourceReviewPacketSchema = z
  .object({ ...characterRigSourceReviewPacketFields, contentHash: hashSchema })
  .strict()
  .superRefine((packet, context) => {
    const { contentHash, ...draft } = packet;
    if (hashCanonical(draft) !== contentHash)
      context.addIssue({
        code: "custom",
        path: ["contentHash"],
        message: "Character rig source-review packet hash is invalid.",
      });
    const requiredViews = [...reviewViewOrder];
    if (
      hashCanonical(packet.views.map((entry) => entry.view)) !==
      hashCanonical(requiredViews)
    )
      context.addIssue({
        code: "custom",
        path: ["views"],
        message:
          "Character rig source-review packet requires canonical front/left/right view order.",
      });
    const renderPaths = packet.views.flatMap((entry) => [
      entry.cleanRender.relativeFile,
      entry.overlayRender.relativeFile,
      entry.motionRender.relativeFile,
    ]);
    if (new Set(renderPaths).size !== renderPaths.length)
      context.addIssue({
        code: "custom",
        path: ["views"],
        message: "Source-review packet render paths must be globally unique.",
      });
    const renderContentHashes = packet.views.flatMap((entry) => [
      entry.cleanRender.contentHash,
      entry.overlayRender.contentHash,
      entry.motionRender.contentHash,
    ]);
    if (new Set(renderContentHashes).size !== renderContentHashes.length)
      context.addIssue({
        code: "custom",
        path: ["views"],
        message:
          "Source-review packet render artifacts must have globally unique content hashes.",
      });
    for (const [index, entry] of packet.views.entries()) {
      const program = entry.program;
      if (
        entry.view !== program.view ||
        program.requestContentHash !== packet.requestContentHash ||
        program.candidateBundleContentHash !==
          packet.candidateBundleContentHash ||
        program.stagingReportContentHash !== packet.stagingReportContentHash ||
        program.importReceiptContentHash !== packet.importReceiptContentHash ||
        program.identityLockContentHash !== packet.identityLockContentHash ||
        program.topologyTemplateContentHash !==
          packet.topologyTemplateContentHash
      )
        context.addIssue({
          code: "custom",
          path: ["views", index, "program"],
          message:
            "Source-review view program does not match the packet lineage/view.",
        });
      for (const [renderName, render] of Object.entries({
        cleanRender: entry.cleanRender,
        overlayRender: entry.overlayRender,
        motionRender: entry.motionRender,
      }))
        if (
          render.candidateRigReviewVisualProgramContentHash !==
            program.contentHash ||
          render.preparationRecipeContentHash !==
            program.preparationRecipeContentHash
        )
          context.addIssue({
            code: "custom",
            path: ["views", index, renderName],
            message:
              "Source-review render is not bound to its exact review program/recipe.",
          });
    }
  });

export type CharacterRigSourceReviewPacket = z.infer<
  typeof characterRigSourceReviewPacketSchema
>;

/**
 * Compiles a source-review-only allowlist from one exact proposed preparation
 * recipe. This is not a RigVisualProgram and cannot be production-bound.
 */
export const compileCandidateRigReviewVisualProgram = (
  rawRequest: unknown,
  rawBundle: unknown,
  rawReport: unknown,
  rawReceipt: unknown,
  rawRecipe: unknown,
): CandidateRigReviewVisualProgram => {
  const request = characterRigAssetRequestSchema.parse(rawRequest);
  const bundle = characterRigCandidateBundleSchema.parse(rawBundle);
  const report = characterRigStagingReportSchema.parse(rawReport);
  const receipt = characterRigImportReceiptSchema.parse(rawReceipt);
  const recipe = characterRigPreparationRecipeSchema.parse(rawRecipe);
  validateCharacterRigPreparationRecipe(
    request,
    bundle,
    report,
    receipt,
    recipe,
  );
  const sourceCandidateIds = [
    ...new Set(
      [...recipe.parts, ...recipe.exposures].map(
        (component) => component.source.candidateId,
      ),
    ),
  ].sort();
  const receiptByCandidate = new Map(
    receipt.files.map((file) => [file.candidateId, file]),
  );
  const sourceBindings = sourceCandidateIds
    .map((candidateId) => {
      const imported = receiptByCandidate.get(candidateId);
      if (!imported)
        throw new Error(
          `Candidate rig review program source ${candidateId} is absent from the import receipt.`,
        );
      return { candidateId, contentHash: imported.sourceContentHash };
    })
    .sort((left, right) => left.candidateId.localeCompare(right.candidateId));
  const draft = {
    schemaVersion: "1.0" as const,
    programKind: "candidate-rig-review" as const,
    authorityDomain: "source-review-only" as const,
    id: `candidate-review-${recipe.view}-${recipe.contentHash.slice(0, 20)}`,
    requestContentHash: request.contentHash,
    candidateBundleContentHash: bundle.contentHash,
    stagingReportContentHash: report.contentHash,
    importReceiptContentHash: receipt.contentHash,
    preparationRecipeContentHash: recipe.contentHash,
    identityLockContentHash: request.identityLock.contentHash,
    topologyTemplateContentHash: request.rigProfile.templateContentHash,
    view: recipe.view,
    sourceBindings,
    semanticRoles: [
      ...recipe.parts.map((part) => ({
        componentId: part.id,
        semanticRole: part.role,
        kind: "part" as const,
      })),
      ...recipe.exposures.map((exposure) => ({
        componentId: exposure.id,
        semanticRole: exposure.role,
        kind: "exposure" as const,
      })),
    ],
    partIds: recipe.parts.map((part) => part.id),
    socketIds: recipe.parts.flatMap((part) =>
      part.sockets.map((socket) => socket.id),
    ),
    exposureIds: recipe.exposures.map((exposure) => exposure.id),
    visemeIds: recipe.exposures
      .filter((exposure) => exposure.role.startsWith("viseme-"))
      .map((exposure) => exposure.role),
    productionBindable: false as const,
  };
  return candidateRigReviewVisualProgramSchema.parse({
    ...draft,
    contentHash: hashCanonical(draft),
  });
};

export const candidateRigReviewPerformanceInputSchema = z
  .object({
    schemaVersion: z.literal("1.0"),
    authority: z.literal("candidate-source-review"),
    candidateRigReviewVisualProgramContentHash: hashSchema,
    preparationRecipeContentHash: hashSchema,
    view: candidateRigReviewViewSchema,
    localFrame: z.number().int().nonnegative(),
    fps: z.number().int().positive(),
    motionMode: continuityMotionModeSchema,
    actionPhase: continuityActionPhaseSchema,
    phaseProgress: z.number().min(0).max(1),
    gaitPhase: z.number().min(0).max(1).nullable(),
    facing: z.enum(["left", "right", "front", "three-quarter", "away"]),
    gazeVectorLocal: z
      .object({ x: z.number(), y: z.number() })
      .strict()
      .nullable(),
    visemeId: identifierSchema.nullable(),
    microMotionSeed: hashSchema,
    program: candidateRigReviewVisualProgramSchema,
  })
  .strict()
  .superRefine((input, context) => {
    const expectedFacing = {
      front: "front",
      "profile-left": "left",
      "profile-right": "right",
    }[input.view];
    if (input.facing !== expectedFacing)
      context.addIssue({
        code: "custom",
        path: ["facing"],
        message: `Candidate rig review ${input.view} must face ${expectedFacing}; automatic mirroring is forbidden.`,
      });
  });

export type CandidateRigReviewPerformanceInput = z.infer<
  typeof candidateRigReviewPerformanceInputSchema
>;
export type CandidateRigReviewPerformanceFrame = z.infer<
  typeof localPerformanceFrameSchema
>;

export interface CandidateRigReviewVisualRenderer {
  readonly rendererId: string;
  readonly rendererVersion: string;
  evaluate(input: CandidateRigReviewPerformanceInput): unknown;
}

/**
 * Review-only wrapper around the shared actor-local performance kernel. It has
 * no episode, capability, approved-asset, renderer-manifest, or production
 * binding surface.
 */
export const evaluateCandidateRigReviewPerformance = (
  renderer: CandidateRigReviewVisualRenderer,
  rawInput: unknown,
): CandidateRigReviewPerformanceFrame => {
  const input = candidateRigReviewPerformanceInputSchema.parse(rawInput);
  if (
    input.candidateRigReviewVisualProgramContentHash !==
    input.program.contentHash
  )
    throw new Error(
      "Candidate rig review input visual-program hash is stale or forged.",
    );
  if (
    input.preparationRecipeContentHash !==
      input.program.preparationRecipeContentHash ||
    input.view !== input.program.view
  )
    throw new Error(
      "Candidate rig review input does not match its exact recipe view lineage.",
    );
  if (
    input.visemeId !== null &&
    !input.program.visemeIds.includes(input.visemeId)
  )
    throw new Error(
      `Candidate rig review viseme ${input.visemeId} is not allowlisted.`,
    );
  return evaluateActorLocalPerformanceKernel(renderer, input, input.program);
};
