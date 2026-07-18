import { z } from "zod";
import { hashCanonical } from "../canonical-hash";
import { hashSchema, identifierSchema } from "../model";
import { capabilityReportSchema } from "./capability-report";
import { directorPlanSchema } from "./director-plan";
import { executableEpisodePlanSchema } from "./executable-episode-plan";
import { directorQualityReportSchema } from "./quality-report";
import { sceneWorldPlanSchema } from "./scene-world";
import { timingSolutionSchema } from "./timing-solution";

const directorProjectFields = {
  schemaVersion: z.literal("1.0"),
  id: identifierSchema,
  storyProjectContentHash: hashSchema,
  sceneWorlds: z.array(sceneWorldPlanSchema).min(1),
  directorPlan: directorPlanSchema,
  timingSolution: timingSolutionSchema,
  executableEpisodePlan: executableEpisodePlanSchema,
  capabilityReport: capabilityReportSchema,
  qualityReport: directorQualityReportSchema,
  revision: z
    .object({
      baseDirectorProjectContentHash: hashSchema,
      directorPatchContentHash: hashSchema,
    })
    .strict()
    .nullable(),
  status: z.enum(["animatic-ready", "director-blocked"]),
};

export const directorProjectSchema = z
  .object({
    ...directorProjectFields,
    contentHash: hashSchema,
  })
  .strict()
  .superRefine((project, context) => {
    const { contentHash, ...draft } = project;
    if (hashCanonical(draft) !== contentHash)
      context.addIssue({
        code: "custom",
        path: ["contentHash"],
        message: "Director project hash is invalid.",
      });
    if (project.directorPlan.storyGraphContentHash.length !== 64)
      context.addIssue({
        code: "custom",
        path: ["directorPlan"],
        message: "Director plan is not bound to a story graph.",
      });
    if (
      project.timingSolution.directorPlanContentHash !==
      project.directorPlan.contentHash
    )
      context.addIssue({
        code: "custom",
        path: ["timingSolution"],
        message: "Director project timing is stale.",
      });
    if (
      project.executableEpisodePlan.directorPlanContentHash !==
        project.directorPlan.contentHash ||
      project.executableEpisodePlan.timingSolutionContentHash !==
        project.timingSolution.contentHash
    )
      context.addIssue({
        code: "custom",
        path: ["executableEpisodePlan"],
        message: "Director project executable plan is stale.",
      });
    if (
      project.capabilityReport.directorPlanContentHash !==
      project.directorPlan.contentHash
    )
      context.addIssue({
        code: "custom",
        path: ["capabilityReport"],
        message: "Director project capability report is stale.",
      });
    if (
      project.qualityReport.directorPlanContentHash !==
      project.directorPlan.contentHash
    )
      context.addIssue({
        code: "custom",
        path: ["qualityReport"],
        message: "Director project quality report is stale.",
      });
    const sceneWorldHashes = project.sceneWorlds.map(
      (world) => world.contentHash,
    );
    if (
      JSON.stringify(sceneWorldHashes) !==
      JSON.stringify(project.directorPlan.sceneWorldContentHashes)
    )
      context.addIssue({
        code: "custom",
        path: ["sceneWorlds"],
        message:
          "Director project scene worlds do not match the Director plan.",
      });
  });

export type DirectorProject = z.infer<typeof directorProjectSchema>;
export type DirectorRevisionLineage = NonNullable<DirectorProject["revision"]>;

export function sealDirectorProject(
  raw: Omit<DirectorProject, "contentHash">,
): DirectorProject {
  return directorProjectSchema.parse({
    ...raw,
    contentHash: hashCanonical(raw),
  });
}
