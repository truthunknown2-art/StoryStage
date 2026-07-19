import { z } from "zod";
import { hashCanonical } from "../canonical-hash";
import { hashSchema, identifierSchema } from "../model";
import { directorWorldStateSchema } from "./world-state";

const pointSchema = z
  .object({ x: z.number(), y: z.number(), z: z.number() })
  .strict();

const polygonSchema = z.array(pointSchema).min(3);

const sceneWorldFields = {
  schemaVersion: z.literal("1.0"),
  id: identifierSchema,
  sceneId: identifierSchema,
  sourceSceneContentHash: hashSchema,
  coordinateSystem: z
    .object({
      width: z.number().positive(),
      height: z.number().positive(),
      depthMinimum: z.number(),
      depthMaximum: z.number(),
    })
    .strict()
    .refine((system) => system.depthMinimum < system.depthMaximum, {
      message: "Scene depth minimum must be less than its maximum.",
    }),
  stages: z.array(
    z
      .object({
        id: identifierSchema,
        stageKitRequirementId: identifierSchema,
        walkableSurfaces: z.array(
          z
            .object({
              id: identifierSchema,
              boundary: polygonSchema,
              elevation: z.number(),
            })
            .strict(),
        ),
        depthPlanes: z.array(
          z
            .object({
              id: identifierSchema,
              role: z.enum([
                "far-background",
                "background",
                "midground",
                "performance",
                "foreground",
              ]),
              depth: z.number(),
              layerRequirementId: identifierSchema,
            })
            .strict(),
        ),
        landmarks: z.array(
          z
            .object({
              id: identifierSchema,
              kind: z.enum([
                "entrance",
                "exit",
                "perch",
                "resting-place",
                "action-mark",
                "geography-anchor",
              ]),
              position: pointSchema,
              facing: z.enum(["left", "right", "front", "away"]),
            })
            .strict(),
        ),
        occluders: z.array(
          z
            .object({
              id: identifierSchema,
              layerRequirementId: identifierSchema,
              boundary: polygonSchema,
              depth: z.number(),
            })
            .strict(),
        ),
        cameraZones: z.array(
          z
            .object({
              id: identifierSchema,
              boundary: polygonSchema,
              permittedShotSizes: z.array(
                z.enum([
                  "extreme-wide",
                  "wide",
                  "medium",
                  "close-up",
                  "insert",
                ]),
              ),
            })
            .strict(),
        ),
      })
      .strict(),
  ),
  portals: z.array(
    z
      .object({
        id: identifierSchema,
        fromStageId: identifierSchema,
        toStageId: identifierSchema,
        entryRegion: polygonSchema,
        exitRegion: polygonSchema,
        preservesScreenDirection: z.boolean(),
        permittedTransitions: z.array(
          z.enum([
            "continuous-crossing",
            "foreground-occlusion",
            "hard-cut",
            "dissolve",
          ]),
        ),
      })
      .strict(),
  ),
  initialWorldState: directorWorldStateSchema,
};

export const sceneWorldPlanDraftSchema = z
  .object(sceneWorldFields)
  .strict()
  .superRefine((world, context) => {
    const stageIds = world.stages.map((stage) => stage.id);
    if (new Set(stageIds).size !== stageIds.length)
      context.addIssue({
        code: "custom",
        path: ["stages"],
        message: "Scene world stage IDs must be unique.",
      });
    const knownStages = new Set(stageIds);
    world.portals.forEach((portal, index) => {
      if (
        !knownStages.has(portal.fromStageId) ||
        !knownStages.has(portal.toStageId)
      )
        context.addIssue({
          code: "custom",
          path: ["portals", index],
          message: `${portal.id} must connect two known stages.`,
        });
      if (portal.fromStageId === portal.toStageId)
        context.addIssue({
          code: "custom",
          path: ["portals", index],
          message: `${portal.id} must connect different stages.`,
        });
    });
    world.stages.forEach((stage, stageIndex) => {
      const identifiers = [
        ...stage.walkableSurfaces.map((item) => item.id),
        ...stage.depthPlanes.map((item) => item.id),
        ...stage.landmarks.map((item) => item.id),
        ...stage.occluders.map((item) => item.id),
        ...stage.cameraZones.map((item) => item.id),
      ];
      if (new Set(identifiers).size !== identifiers.length)
        context.addIssue({
          code: "custom",
          path: ["stages", stageIndex],
          message: `${stage.id} contains duplicate geography IDs.`,
        });
    });
  });

export const sceneWorldPlanSchema = z
  .object({ ...sceneWorldFields, contentHash: hashSchema })
  .strict()
  .superRefine((world, context) => {
    const { contentHash, ...draft } = world;
    const result = sceneWorldPlanDraftSchema.safeParse(draft);
    if (!result.success)
      result.error.issues.forEach((issue) =>
        context.addIssue({
          code: "custom",
          path: issue.path,
          message: issue.message,
        }),
      );
    if (hashCanonical(draft) !== contentHash)
      context.addIssue({
        code: "custom",
        path: ["contentHash"],
        message: "Scene world plan hash is invalid.",
      });
  });

export type SceneWorldPlanDraft = z.infer<typeof sceneWorldPlanDraftSchema>;
export type SceneWorldPlan = z.infer<typeof sceneWorldPlanSchema>;

export function sealSceneWorldPlan(
  rawDraft: SceneWorldPlanDraft,
): SceneWorldPlan {
  const draft = sceneWorldPlanDraftSchema.parse(rawDraft);
  return sceneWorldPlanSchema.parse({
    ...draft,
    contentHash: hashCanonical(draft),
  });
}
