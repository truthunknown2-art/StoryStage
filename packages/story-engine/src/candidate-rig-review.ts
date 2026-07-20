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
  isReservedActorLocalPartId,
  localPerformanceFrameSchema,
} from "./director/visual-performance-contract";
import { hashSchema, identifierSchema } from "./model";
import {
  candidateRigReviewExerciseDefinitionContentHash,
  deriveCandidateRigReviewExerciseState as deriveCanonicalCandidateRigReviewExerciseState,
} from "./candidate-rig-review-exercise";
import { candidateRigReviewImplementationReceipt } from "./candidate-rig-review-implementation-receipt.generated";
import { evaluateCandidateRigReviewRuntimeFrame } from "./candidate-rig-review-runtime";

const candidateRigReviewViewSchema = z.enum([
  "front",
  "profile-left",
  "profile-right",
]);

const candidateRigReviewModeSchema = z.enum(["clean", "overlay", "motion"]);

const deepFreezeCandidateRigReviewValue = <T>(value: T): T => {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    for (const nested of Object.values(value as Record<string, unknown>))
      deepFreezeCandidateRigReviewValue(nested);
    Object.freeze(value);
  }
  return value;
};

const candidateRigReviewRendererContractFields = {
  schemaVersion: z.literal("1.0"),
  contractKind: z.literal("candidate-rig-review-renderer"),
  authorityDomain: z.literal("source-review-only"),
  contractId: identifierSchema,
  rendererId: identifierSchema,
  rendererVersion: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9][a-z0-9._-]*$/),
  implementationModel: z.literal("generic-recipe-driven-2d"),
  implementationContentHash: hashSchema,
  implementationReceiptContentHash: hashSchema,
  evaluatorSourceContentHash: hashSchema,
  canonicalBehaviorContentHash: hashSchema,
  exerciseDefinitionContentHash: hashSchema,
  inputAuthority: z.literal("actor-local-only"),
  viewPolicy: z.literal("native-no-mirror"),
  identitySpecializationIds: z.array(identifierSchema).length(0),
  productionBindable: z.literal(false),
};

export const candidateRigReviewRendererContractSchema = z
  .object({
    ...candidateRigReviewRendererContractFields,
    contentHash: hashSchema,
  })
  .strict()
  .superRefine((contract, context) => {
    const { contentHash, ...draft } = contract;
    if (hashCanonical(draft) !== contentHash)
      context.addIssue({
        code: "custom",
        path: ["contentHash"],
        message: "Candidate rig review renderer contract hash is invalid.",
      });
    if (
      contract.implementationContentHash !==
        candidateRigReviewImplementationReceipt.contentHash ||
      contract.implementationReceiptContentHash !==
        candidateRigReviewImplementationReceipt.contentHash ||
      contract.evaluatorSourceContentHash !==
        candidateRigReviewImplementationReceipt.evaluatorSourceContentHash ||
      contract.canonicalBehaviorContentHash !==
        candidateRigReviewImplementationReceipt.canonicalBehaviorContentHash ||
      contract.exerciseDefinitionContentHash !==
        candidateRigReviewImplementationReceipt.exerciseDefinitionContentHash
    )
      context.addIssue({
        code: "custom",
        path: ["implementationReceiptContentHash"],
        message:
          "Candidate rig review renderer contract must bind the exact generated implementation receipt.",
      });
  });

export type CandidateRigReviewRendererContract = z.infer<
  typeof candidateRigReviewRendererContractSchema
>;

const genericCandidateRigReviewRendererContractDraft = {
  schemaVersion: "1.0" as const,
  contractKind: "candidate-rig-review-renderer" as const,
  authorityDomain: "source-review-only" as const,
  contractId: "generic-recipe-driven-source-review-v1",
  rendererId: "candidate-rig-review-generic",
  rendererVersion: "1.0.0",
  implementationModel: "generic-recipe-driven-2d" as const,
  implementationContentHash:
    candidateRigReviewImplementationReceipt.contentHash,
  implementationReceiptContentHash:
    candidateRigReviewImplementationReceipt.contentHash,
  evaluatorSourceContentHash:
    candidateRigReviewImplementationReceipt.evaluatorSourceContentHash,
  canonicalBehaviorContentHash:
    candidateRigReviewImplementationReceipt.canonicalBehaviorContentHash,
  exerciseDefinitionContentHash:
    candidateRigReviewImplementationReceipt.exerciseDefinitionContentHash,
  inputAuthority: "actor-local-only" as const,
  viewPolicy: "native-no-mirror" as const,
  identitySpecializationIds: [] as string[],
  productionBindable: false as const,
};

export const genericCandidateRigReviewRendererContract =
  deepFreezeCandidateRigReviewValue(
    candidateRigReviewRendererContractSchema.parse({
      ...genericCandidateRigReviewRendererContractDraft,
      contentHash: hashCanonical(
        genericCandidateRigReviewRendererContractDraft,
      ),
    }),
  );

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
  rendererContract: candidateRigReviewRendererContractSchema,
  rendererImplementationReceiptContentHash: hashSchema,
  rendererEvaluatorSourceContentHash: hashSchema,
  rendererCanonicalBehaviorContentHash: hashSchema,
  exerciseDefinitionContentHash: hashSchema,
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
    if (
      hashCanonical(program.rendererContract) !==
      hashCanonical(genericCandidateRigReviewRendererContract)
    )
      context.addIssue({
        code: "custom",
        path: ["rendererContract"],
        message:
          "Candidate rig review visual program must embed the exact generic renderer contract.",
      });
    if (
      program.rendererImplementationReceiptContentHash !==
        genericCandidateRigReviewRendererContract.implementationReceiptContentHash ||
      program.rendererEvaluatorSourceContentHash !==
        genericCandidateRigReviewRendererContract.evaluatorSourceContentHash ||
      program.rendererCanonicalBehaviorContentHash !==
        genericCandidateRigReviewRendererContract.canonicalBehaviorContentHash ||
      program.exerciseDefinitionContentHash !==
        genericCandidateRigReviewRendererContract.exerciseDefinitionContentHash
    )
      context.addIssue({
        code: "custom",
        path: ["rendererImplementationReceiptContentHash"],
        message:
          "Candidate rig review visual program must bind the exact generated implementation receipt, evaluator source, behavior, and exercise.",
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

const candidateRigReviewMotionProgramFields = {
  schemaVersion: z.literal("1.0"),
  programKind: z.literal("candidate-rig-review-motion"),
  authorityDomain: z.literal("source-review-only"),
  programId: identifierSchema,
  mode: z.literal("motion"),
  candidateRigReviewVisualProgramContentHash: hashSchema,
  preparationRecipeContentHash: hashSchema,
  view: candidateRigReviewViewSchema,
  rendererId: identifierSchema,
  rendererVersion: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9][a-z0-9._-]*$/),
  rendererContractContentHash: hashSchema,
  rendererImplementationContentHash: hashSchema,
  rendererImplementationReceiptContentHash: hashSchema,
  rendererEvaluatorSourceContentHash: hashSchema,
  rendererCanonicalBehaviorContentHash: hashSchema,
  exerciseDefinitionContentHash: hashSchema,
  exerciseProfile: z
    .object({
      id: z.literal("generic-rig-source-review-exercise"),
      version: z.literal("1.0.0"),
      contentHash: hashSchema,
    })
    .strict(),
  partIds: z.array(identifierSchema).min(2),
  socketIds: z.array(identifierSchema),
  exposureIds: z.array(identifierSchema),
  visemeIds: z.array(identifierSchema),
  fps: z.literal(30),
  durationInFrames: z.literal(180),
  productionBindable: z.literal(false),
};

export const candidateRigReviewMotionProgramSchema = z
  .object({ ...candidateRigReviewMotionProgramFields, contentHash: hashSchema })
  .strict()
  .superRefine((program, context) => {
    const { contentHash, ...draft } = program;
    if (hashCanonical(draft) !== contentHash)
      context.addIssue({
        code: "custom",
        path: ["contentHash"],
        message: "Candidate rig review motion program hash is invalid.",
      });
    if (
      program.exerciseProfile.contentHash !==
        candidateRigReviewExerciseDefinitionContentHash ||
      program.rendererId !==
        genericCandidateRigReviewRendererContract.rendererId ||
      program.rendererVersion !==
        genericCandidateRigReviewRendererContract.rendererVersion ||
      program.rendererContractContentHash !==
        genericCandidateRigReviewRendererContract.contentHash ||
      program.rendererImplementationContentHash !==
        genericCandidateRigReviewRendererContract.implementationContentHash ||
      program.rendererImplementationReceiptContentHash !==
        genericCandidateRigReviewRendererContract.implementationReceiptContentHash ||
      program.rendererEvaluatorSourceContentHash !==
        genericCandidateRigReviewRendererContract.evaluatorSourceContentHash ||
      program.rendererCanonicalBehaviorContentHash !==
        genericCandidateRigReviewRendererContract.canonicalBehaviorContentHash ||
      program.exerciseDefinitionContentHash !==
        genericCandidateRigReviewRendererContract.exerciseDefinitionContentHash
    )
      context.addIssue({
        code: "custom",
        message:
          "Candidate rig review motion must bind the module-owned renderer and canonical 180-frame exercise.",
      });
  });

export type CandidateRigReviewMotionProgram = z.infer<
  typeof candidateRigReviewMotionProgramSchema
>;

const candidateRigReviewRenderInputFields = {
  schemaVersion: z.literal("1.0"),
  inputKind: z.literal("candidate-rig-review-render"),
  authorityDomain: z.literal("source-review-only"),
  inputId: identifierSchema,
  mode: candidateRigReviewModeSchema,
  candidateRigReviewVisualProgramContentHash: hashSchema,
  preparationRecipeContentHash: hashSchema,
  candidateRigReviewMotionProgramContentHash: hashSchema.nullable(),
  view: candidateRigReviewViewSchema,
  rendererId: identifierSchema,
  rendererVersion: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9][a-z0-9._-]*$/),
  rendererContractContentHash: hashSchema,
  rendererImplementationContentHash: hashSchema,
  rendererImplementationReceiptContentHash: hashSchema,
  rendererEvaluatorSourceContentHash: hashSchema,
  rendererCanonicalBehaviorContentHash: hashSchema,
  exerciseDefinitionContentHash: hashSchema,
  width: z.literal(1920),
  height: z.literal(1080),
  frameCount: z.union([z.literal(1), z.literal(180)]),
  fps: z.union([z.null(), z.literal(30)]),
  productionBindable: z.literal(false),
};

export const candidateRigReviewRenderInputSchema = z
  .object({ ...candidateRigReviewRenderInputFields, contentHash: hashSchema })
  .strict()
  .superRefine((input, context) => {
    const { contentHash, ...draft } = input;
    if (hashCanonical(draft) !== contentHash)
      context.addIssue({
        code: "custom",
        path: ["contentHash"],
        message: "Candidate rig review render input hash is invalid.",
      });
    if (
      input.mode === "motion"
        ? input.candidateRigReviewMotionProgramContentHash === null ||
          input.frameCount !== 180 ||
          input.fps !== 30
        : input.candidateRigReviewMotionProgramContentHash !== null ||
          input.frameCount !== 1 ||
          input.fps !== null
    )
      context.addIssue({
        code: "custom",
        message:
          "Candidate rig review render timing/motion binding does not match its explicit mode.",
      });
    if (
      input.rendererId !==
        genericCandidateRigReviewRendererContract.rendererId ||
      input.rendererVersion !==
        genericCandidateRigReviewRendererContract.rendererVersion ||
      input.rendererContractContentHash !==
        genericCandidateRigReviewRendererContract.contentHash ||
      input.rendererImplementationContentHash !==
        genericCandidateRigReviewRendererContract.implementationContentHash ||
      input.rendererImplementationReceiptContentHash !==
        genericCandidateRigReviewRendererContract.implementationReceiptContentHash ||
      input.rendererEvaluatorSourceContentHash !==
        genericCandidateRigReviewRendererContract.evaluatorSourceContentHash ||
      input.rendererCanonicalBehaviorContentHash !==
        genericCandidateRigReviewRendererContract.canonicalBehaviorContentHash ||
      input.exerciseDefinitionContentHash !==
        genericCandidateRigReviewRendererContract.exerciseDefinitionContentHash
    )
      context.addIssue({
        code: "custom",
        message:
          "Candidate rig review render input must bind the exact module-owned renderer implementation.",
      });
  });

export type CandidateRigReviewRenderInput = z.infer<
  typeof candidateRigReviewRenderInputSchema
>;

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
    rendererContract: genericCandidateRigReviewRendererContract,
    rendererImplementationReceiptContentHash:
      genericCandidateRigReviewRendererContract.implementationReceiptContentHash,
    rendererEvaluatorSourceContentHash:
      genericCandidateRigReviewRendererContract.evaluatorSourceContentHash,
    rendererCanonicalBehaviorContentHash:
      genericCandidateRigReviewRendererContract.canonicalBehaviorContentHash,
    exerciseDefinitionContentHash:
      genericCandidateRigReviewRendererContract.exerciseDefinitionContentHash,
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

export const compileCandidateRigReviewMotionProgram = (
  rawProgram: unknown,
): CandidateRigReviewMotionProgram => {
  const program = candidateRigReviewVisualProgramSchema.parse(rawProgram);
  const rendererContract = program.rendererContract;
  const draft = {
    schemaVersion: "1.0" as const,
    programKind: "candidate-rig-review-motion" as const,
    authorityDomain: "source-review-only" as const,
    programId: `candidate-review-motion-${program.view}-${program.contentHash.slice(0, 20)}`,
    mode: "motion" as const,
    candidateRigReviewVisualProgramContentHash: program.contentHash,
    preparationRecipeContentHash: program.preparationRecipeContentHash,
    view: program.view,
    rendererId: rendererContract.rendererId,
    rendererVersion: rendererContract.rendererVersion,
    rendererContractContentHash: rendererContract.contentHash,
    rendererImplementationContentHash:
      rendererContract.implementationContentHash,
    rendererImplementationReceiptContentHash:
      rendererContract.implementationReceiptContentHash,
    rendererEvaluatorSourceContentHash:
      rendererContract.evaluatorSourceContentHash,
    rendererCanonicalBehaviorContentHash:
      rendererContract.canonicalBehaviorContentHash,
    exerciseDefinitionContentHash:
      rendererContract.exerciseDefinitionContentHash,
    exerciseProfile: {
      id: "generic-rig-source-review-exercise" as const,
      version: "1.0.0" as const,
      contentHash: candidateRigReviewExerciseDefinitionContentHash,
    },
    partIds: [...program.partIds],
    socketIds: [...program.socketIds],
    exposureIds: [...program.exposureIds],
    visemeIds: [...program.visemeIds],
    fps: 30 as const,
    durationInFrames: 180 as const,
    productionBindable: false as const,
  };
  return candidateRigReviewMotionProgramSchema.parse({
    ...draft,
    contentHash: hashCanonical(draft),
  });
};

export const compileCandidateRigReviewRenderInput = (
  mode: z.infer<typeof candidateRigReviewModeSchema>,
  rawProgram: unknown,
  rawMotionProgram: unknown = null,
): CandidateRigReviewRenderInput => {
  const program = candidateRigReviewVisualProgramSchema.parse(rawProgram);
  const expectedMotion = compileCandidateRigReviewMotionProgram(program);
  const motionProgram =
    mode === "motion"
      ? candidateRigReviewMotionProgramSchema.parse(rawMotionProgram)
      : null;
  if (
    mode === "motion" &&
    hashCanonical(motionProgram) !== hashCanonical(expectedMotion)
  )
    throw new Error(
      "Candidate rig review render input requires the exact compiled motion program.",
    );
  if (mode !== "motion" && rawMotionProgram !== null)
    throw new Error(
      "Candidate rig review still inputs cannot bind a motion program.",
    );
  const rendererContract = program.rendererContract;
  const draft = {
    schemaVersion: "1.0" as const,
    inputKind: "candidate-rig-review-render" as const,
    authorityDomain: "source-review-only" as const,
    inputId: `candidate-review-${mode}-${program.view}-${program.contentHash.slice(0, 16)}`,
    mode,
    candidateRigReviewVisualProgramContentHash: program.contentHash,
    preparationRecipeContentHash: program.preparationRecipeContentHash,
    candidateRigReviewMotionProgramContentHash:
      motionProgram?.contentHash ?? null,
    view: program.view,
    rendererId: rendererContract.rendererId,
    rendererVersion: rendererContract.rendererVersion,
    rendererContractContentHash: rendererContract.contentHash,
    rendererImplementationContentHash:
      rendererContract.implementationContentHash,
    rendererImplementationReceiptContentHash:
      rendererContract.implementationReceiptContentHash,
    rendererEvaluatorSourceContentHash:
      rendererContract.evaluatorSourceContentHash,
    rendererCanonicalBehaviorContentHash:
      rendererContract.canonicalBehaviorContentHash,
    exerciseDefinitionContentHash:
      rendererContract.exerciseDefinitionContentHash,
    width: 1920 as const,
    height: 1080 as const,
    frameCount: mode === "motion" ? (180 as const) : (1 as const),
    fps: mode === "motion" ? (30 as const) : null,
    productionBindable: false as const,
  };
  return candidateRigReviewRenderInputSchema.parse({
    ...draft,
    contentHash: hashCanonical(draft),
  });
};

function deriveCandidateRigReviewExerciseState(
  program: CandidateRigReviewVisualProgram,
  motionProgram: CandidateRigReviewMotionProgram | null,
  mode: z.infer<typeof candidateRigReviewModeSchema>,
  localFrame: number,
) {
  return deriveCanonicalCandidateRigReviewExerciseState({
    mode,
    view: program.view,
    localFrame,
    visualProgramContentHash: program.contentHash,
    motionProgramContentHash: motionProgram?.contentHash ?? null,
    visemeIds: program.visemeIds,
  });
}

export const candidateRigReviewPerformanceInputSchema = z
  .object({
    schemaVersion: z.literal("1.0"),
    authority: z.literal("candidate-source-review"),
    mode: candidateRigReviewModeSchema,
    candidateRigReviewVisualProgramContentHash: hashSchema,
    preparationRecipeContentHash: hashSchema,
    candidateRigReviewMotionProgramContentHash: hashSchema.nullable(),
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
    motionProgram: candidateRigReviewMotionProgramSchema.nullable(),
  })
  .strict()
  .superRefine((input, context) => {
    if (
      input.mode === "motion"
        ? input.motionProgram === null ||
          input.candidateRigReviewMotionProgramContentHash === null ||
          input.motionProgram.contentHash !==
            input.candidateRigReviewMotionProgramContentHash ||
          input.localFrame >= input.motionProgram.durationInFrames ||
          input.fps !== input.motionProgram.fps
        : input.motionProgram !== null ||
          input.candidateRigReviewMotionProgramContentHash !== null ||
          input.localFrame !== 0
    )
      context.addIssue({
        code: "custom",
        path: ["motionProgram"],
        message:
          "Candidate rig review performance motion binding does not match its explicit mode.",
      });
    if (
      input.candidateRigReviewVisualProgramContentHash !==
        input.program.contentHash ||
      input.preparationRecipeContentHash !==
        input.program.preparationRecipeContentHash ||
      input.view !== input.program.view
    )
      context.addIssue({
        code: "custom",
        message:
          "Candidate rig review performance does not bind its exact visual program/view lineage.",
      });
    if (input.mode === "motion" && input.motionProgram) {
      const expectedMotion = compileCandidateRigReviewMotionProgram(
        input.program,
      );
      if (
        hashCanonical(input.motionProgram) !== hashCanonical(expectedMotion) ||
        input.candidateRigReviewMotionProgramContentHash !==
          expectedMotion.contentHash
      )
        context.addIssue({
          code: "custom",
          path: ["motionProgram"],
          message:
            "Candidate rig review performance requires the exact compiled motion program.",
        });
    }
    try {
      const expected = deriveCandidateRigReviewExerciseState(
        input.program,
        input.motionProgram,
        input.mode,
        input.localFrame,
      );
      for (const key of [
        "fps",
        "motionMode",
        "actionPhase",
        "phaseProgress",
        "gaitPhase",
        "facing",
        "gazeVectorLocal",
        "visemeId",
        "microMotionSeed",
      ] as const)
        if (hashCanonical(input[key]) !== hashCanonical(expected[key]))
          context.addIssue({
            code: "custom",
            path: [key],
            message: `Candidate rig review ${key} must be derived from the exact motion program and local frame.`,
          });
    } catch (error) {
      context.addIssue({
        code: "custom",
        message:
          error instanceof Error
            ? error.message
            : "Candidate rig review exercise derivation failed.",
      });
    }
  });

export type CandidateRigReviewPerformanceInput = z.infer<
  typeof candidateRigReviewPerformanceInputSchema
>;
export type CandidateRigReviewPerformanceFrame = z.infer<
  typeof localPerformanceFrameSchema
>;

export const compileCandidateRigReviewPerformanceInput = (
  rawProgram: unknown,
  mode: z.infer<typeof candidateRigReviewModeSchema>,
  localFrame: number,
): CandidateRigReviewPerformanceInput => {
  const program = candidateRigReviewVisualProgramSchema.parse(rawProgram);
  const motionProgram =
    mode === "motion" ? compileCandidateRigReviewMotionProgram(program) : null;
  const effectiveFrame = mode === "motion" ? localFrame : 0;
  const state = deriveCandidateRigReviewExerciseState(
    program,
    motionProgram,
    mode,
    effectiveFrame,
  );
  return candidateRigReviewPerformanceInputSchema.parse({
    schemaVersion: "1.0",
    authority: "candidate-source-review",
    mode,
    candidateRigReviewVisualProgramContentHash: program.contentHash,
    preparationRecipeContentHash: program.preparationRecipeContentHash,
    candidateRigReviewMotionProgramContentHash:
      motionProgram?.contentHash ?? null,
    view: program.view,
    localFrame: effectiveFrame,
    ...state,
    program,
    motionProgram,
  });
};

const genericCandidateRigReviewRenderer = Object.freeze({
  implementationContentHash:
    candidateRigReviewImplementationReceipt.contentHash,
});

/**
 * Review-only entry point backed by the module-owned generic renderer. There
 * is deliberately no renderer parameter: copying the public identity/hash onto
 * another implementation cannot enter this boundary.
 */
export const evaluateCandidateRigReviewPerformance = (
  rawProgram: unknown,
  mode: z.infer<typeof candidateRigReviewModeSchema>,
  localFrame: number,
): CandidateRigReviewPerformanceFrame => {
  const input = compileCandidateRigReviewPerformanceInput(
    rawProgram,
    mode,
    localFrame,
  );
  if (
    genericCandidateRigReviewRenderer.implementationContentHash !==
    input.program.rendererContract.implementationContentHash
  )
    throw new Error(
      "Candidate rig review renderer implementation does not match its exact module-owned contract.",
    );
  return evaluateCandidateRigReviewRuntimeFrame(input);
};

export const candidateRigReviewPacketConstructionStatus = Object.freeze({
  status: "blocked" as const,
  reason:
    "No source-review packet may exist until asset-pipeline verifies actual clean/overlay/motion artifact bytes and media metadata.",
  packetConstructorExported: false as const,
  providerAuthority: false as const,
  approvalAuthority: false as const,
  productionBindable: false as const,
});
