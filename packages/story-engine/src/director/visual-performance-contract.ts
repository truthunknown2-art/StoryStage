import { z } from "zod";
import { hashCanonical } from "../canonical-hash";
import { hashSchema, identifierSchema } from "../model";
import { articulatedCharacterRigManifestSchema } from "../rig-manifests";
import { propWorldStateSchema } from "./world-state";
import {
  continuityActionPhaseSchema,
  continuityMotionModeSchema,
} from "./continuity-sequence-plan";

const resolvedTransformSchema = z
  .object({
    x: z.number(),
    y: z.number(),
    z: z.number(),
    scale: z.number().positive(),
    rotation: z.number(),
  })
  .strict();

const resolvedVelocitySchema = z
  .object({ x: z.number(), y: z.number(), z: z.number() })
  .strict();

export const resolvedEntityFrameSchema = z
  .object({
    entityId: identifierSchema,
    visible: z.boolean(),
    lifecycle: z.enum([
      "offstage",
      "entering",
      "onstage",
      "occluded",
      "exiting",
    ]),
    rootTransform: resolvedTransformSchema,
    velocity: resolvedVelocitySchema,
    facing: z.enum(["left", "right", "front", "three-quarter", "away"]),
    gazeVectorLocal: z
      .object({ x: z.number(), y: z.number() })
      .strict()
      .nullable(),
    motionMode: continuityMotionModeSchema,
    actionPhase: continuityActionPhaseSchema,
    phaseProgress: z.number().min(0).max(1),
    gaitPhase: z.number().min(0).max(1).nullable(),
    visemeId: identifierSchema.nullable(),
    performanceProgramId: identifierSchema.nullable(),
    performanceProgramContentHash: hashSchema.nullable(),
  })
  .strict();

export const resolvedCameraFrameSchema = z
  .object({
    programId: identifierSchema,
    programContentHash: hashSchema,
    x: z.number(),
    y: z.number(),
    scale: z.number().positive(),
    rotation: z.number(),
    shotSize: z.enum(["extreme-wide", "wide", "medium", "close-up", "insert"]),
  })
  .strict();

export const resolvedTransitionFrameSchema = z
  .object({
    programId: identifierSchema,
    programContentHash: hashSchema,
    kind: z.enum([
      "hard-cut",
      "match-cut",
      "camera-carry",
      "foreground-wipe",
      "dissolve",
    ]),
    progress: z.number().min(0).max(1),
    fromShotId: identifierSchema.nullable(),
    toShotId: identifierSchema,
    occluderId: identifierSchema.nullable(),
  })
  .strict();

export const resolvedPropFrameSchema = z
  .object({
    propId: identifierSchema,
    state: propWorldStateSchema,
  })
  .strict();

export const resolvedContinuityFrameSchema = z
  .object({
    schemaVersion: z.literal("1.0"),
    episodePlanContentHash: hashSchema,
    continuitySequencePlanContentHash: hashSchema,
    absoluteFrame: z.number().int().nonnegative(),
    shotFrame: z.number().int().nonnegative(),
    fps: z.number().int().positive(),
    shotId: identifierSchema,
    sceneId: identifierSchema,
    camera: resolvedCameraFrameSchema,
    transition: resolvedTransitionFrameSchema,
    entities: z.record(identifierSchema, resolvedEntityFrameSchema),
    props: z.record(identifierSchema, resolvedPropFrameSchema),
  })
  .strict();

const rigVisualProgramFields = {
  schemaVersion: z.literal("1.0"),
  id: identifierSchema,
  rigManifestContentHash: hashSchema,
  partIds: z.array(identifierSchema).min(2),
  socketIds: z.array(identifierSchema),
  exposureIds: z.array(identifierSchema),
  visemeIds: z.array(identifierSchema),
};

const reservedLocalAuthorityPartIds = new Set([
  "actor",
  "camera",
  "container",
  "entity",
  "global",
  "rig",
  "root",
  "scene",
  "stage",
  "top-level",
  "whole-actor",
  "whole-body",
]);
const reservedLocalAuthorityPartIdPattern =
  /(^|-)(root|global|whole-actor|whole-body|top-level)(-|$)/;

const isReservedLocalAuthorityPartId = (partId: string): boolean =>
  reservedLocalAuthorityPartIds.has(partId) ||
  reservedLocalAuthorityPartIdPattern.test(partId);

export const rigVisualProgramSchema = z
  .object({ ...rigVisualProgramFields, contentHash: hashSchema })
  .strict()
  .superRefine((program, context) => {
    const { contentHash, ...draft } = program;
    if (hashCanonical(draft) !== contentHash)
      context.addIssue({
        code: "custom",
        path: ["contentHash"],
        message: "Rig visual program hash is invalid.",
      });
    for (const [key, values] of Object.entries({
      partIds: program.partIds,
      socketIds: program.socketIds,
      exposureIds: program.exposureIds,
      visemeIds: program.visemeIds,
    }))
      if (new Set(values).size !== values.length)
        context.addIssue({
          code: "custom",
          path: [key],
          message: `Rig visual program ${key} must be unique.`,
        });
    for (const [index, partId] of program.partIds.entries())
      if (isReservedLocalAuthorityPartId(partId))
        context.addIssue({
          code: "custom",
          path: ["partIds", index],
          message: `Rig visual program part ${partId} is reserved for continuity/root authority.`,
        });
  });

export const verifiedVisualAssetHandleSchema = z
  .object({
    assetId: identifierSchema,
    contentHash: hashSchema,
    byteLength: z.number().int().positive(),
    width: z.number().int().positive(),
    height: z.number().int().positive(),
    verifiedUrl: z.string().min(1),
  })
  .strict();

export const localPerformanceInputSchema = z
  .object({
    schemaVersion: z.literal("1.0"),
    episodePlanContentHash: hashSchema,
    continuitySequencePlanContentHash: hashSchema,
    performanceProgramContentHash: hashSchema,
    rigManifestContentHash: hashSchema,
    entityId: identifierSchema,
    shotId: identifierSchema,
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
    program: rigVisualProgramSchema,
    assets: z.array(verifiedVisualAssetHandleSchema),
  })
  .strict();

const localPartFrameSchema = z
  .object({
    x: z.number(),
    y: z.number(),
    rotation: z.number(),
    scaleX: z.number().positive(),
    scaleY: z.number().positive(),
    opacity: z.number().min(0).max(1),
    exposureId: identifierSchema.nullable(),
  })
  .strict();

const localSocketFrameSchema = z
  .object({
    x: z.number(),
    y: z.number(),
    rotation: z.number(),
    scale: z.number().positive(),
  })
  .strict();

export const localPerformanceFrameSchema = z
  .object({
    parts: z.record(identifierSchema, localPartFrameSchema),
    face: z
      .object({
        eyeOpen: z.number().min(0).max(1),
        pupilX: z.number().min(-1).max(1),
        pupilY: z.number().min(-1).max(1),
        brow: z.number().min(-1).max(1),
        mouthExposureId: identifierSchema.nullable(),
      })
      .strict(),
    sockets: z.record(identifierSchema, localSocketFrameSchema),
    localEffects: z.array(
      z
        .object({
          effectId: identifierSchema,
          progress: z.number().min(0).max(1),
        })
        .strict(),
    ),
  })
  .strict();

export type ResolvedEntityFrame = z.infer<typeof resolvedEntityFrameSchema>;
export type ResolvedCameraFrame = z.infer<typeof resolvedCameraFrameSchema>;
export type ResolvedTransitionFrame = z.infer<
  typeof resolvedTransitionFrameSchema
>;
export type ResolvedPropFrame = z.infer<typeof resolvedPropFrameSchema>;
export type ResolvedContinuityFrame = z.infer<
  typeof resolvedContinuityFrameSchema
>;
export type RigVisualProgram = z.infer<typeof rigVisualProgramSchema>;
export type VerifiedVisualAssetHandle = z.infer<
  typeof verifiedVisualAssetHandleSchema
>;
export type LocalPerformanceInput = z.infer<typeof localPerformanceInputSchema>;
export type LocalPerformanceFrame = z.infer<typeof localPerformanceFrameSchema>;

export interface VisualPerformanceRenderer {
  readonly rendererId: string;
  readonly rendererVersion: string;
  evaluate(input: LocalPerformanceInput): unknown;
}

/**
 * Compiles the renderer-facing id allowlists from a sealed articulated rig.
 * There are deliberately no override arguments: local visual authority can
 * only come from identifiers already bound by the manifest content hash.
 */
export const compileRigVisualProgram = (
  rawManifest: unknown,
): RigVisualProgram => {
  const manifest = articulatedCharacterRigManifestSchema.parse(rawManifest);
  const draft = {
    schemaVersion: "1.0" as const,
    id: `${manifest.manifestId}-visual`,
    rigManifestContentHash: manifest.contentHash,
    partIds: manifest.parts.map((part) => part.id),
    socketIds: manifest.parts.flatMap((part) =>
      part.sockets.map((socket) => socket.id),
    ),
    exposureIds: manifest.exposures.map((exposure) => exposure.id),
    visemeIds: [...manifest.visemeIds],
  };
  return rigVisualProgramSchema.parse({
    ...draft,
    contentHash: hashCanonical(draft),
  });
};

const assertLocalPerformanceInputBindings = (
  input: LocalPerformanceInput,
): void => {
  if (input.rigManifestContentHash !== input.program.rigManifestContentHash)
    throw new Error(
      "Local performance input rig manifest hash does not match its rig visual program.",
    );
  if (input.performanceProgramContentHash !== input.program.contentHash)
    throw new Error(
      "Local performance input program hash does not match its rig visual program.",
    );
  if (
    input.visemeId !== null &&
    !input.program.visemeIds.includes(input.visemeId)
  )
    throw new Error(
      `Local performance input viseme ${input.visemeId} is not declared by its rig visual program.`,
    );
  if (input.program.partIds.includes(input.entityId))
    throw new Error(
      `Local performance rig part ${input.entityId} cannot reuse the entity id as whole-actor authority.`,
    );
  if (
    new Set(input.assets.map((asset) => asset.assetId)).size !==
    input.assets.length
  )
    throw new Error("Local performance input asset ids must be unique.");
};

const assertExactManifestKeys = (
  label: string,
  actualIds: string[],
  declaredIds: string[],
): void => {
  const declared = new Set(declaredIds);
  const undeclared = actualIds.filter((id) => !declared.has(id));
  const actual = new Set(actualIds);
  const missing = declaredIds.filter((id) => !actual.has(id));
  if (undeclared.length > 0 || missing.length > 0)
    throw new Error(
      `Local performance ${label} must exactly match the rig visual program (undeclared: ${undeclared.join(", ") || "none"}; missing: ${missing.join(", ") || "none"}).`,
    );
};

const assertLocalPerformanceOutputBindings = (
  input: LocalPerformanceInput,
  output: LocalPerformanceFrame,
): void => {
  assertExactManifestKeys(
    "part ids",
    Object.keys(output.parts),
    input.program.partIds,
  );
  assertExactManifestKeys(
    "socket ids",
    Object.keys(output.sockets),
    input.program.socketIds,
  );

  const declaredExposures = new Set(input.program.exposureIds);
  for (const [partId, part] of Object.entries(output.parts))
    if (part.exposureId !== null && !declaredExposures.has(part.exposureId))
      throw new Error(
        `Local performance part ${partId} uses undeclared exposure ${part.exposureId}.`,
      );
  if (
    output.face.mouthExposureId !== null &&
    !declaredExposures.has(output.face.mouthExposureId)
  )
    throw new Error(
      `Local performance face uses undeclared exposure ${output.face.mouthExposureId}.`,
    );

  const parts = Object.values(output.parts);
  if (parts.length > 0 && parts.every((part) => part.opacity < 1))
    throw new Error(
      "Local performance output cannot apply whole-actor opacity; visibility belongs to continuity authority.",
    );
};

/**
 * The only supported runtime boundary for an untrusted/local visual renderer.
 * Continuity owns actor roots, visibility, timing, camera, and transitions; this
 * function admits only manifest-bound, actor-local visual performance data.
 */
export const evaluateLocalPerformance = (
  renderer: VisualPerformanceRenderer,
  rawInput: unknown,
): LocalPerformanceFrame => {
  const input = localPerformanceInputSchema.parse(rawInput);
  assertLocalPerformanceInputBindings(input);
  const rendererInput = structuredClone(input);
  const output = localPerformanceFrameSchema.parse(
    renderer.evaluate(rendererInput),
  );
  assertLocalPerformanceOutputBindings(input, output);
  return output;
};
