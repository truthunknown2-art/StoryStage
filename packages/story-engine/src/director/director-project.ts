import { z } from "zod";
import { hashCanonical } from "../canonical-hash";
import { hashSchema, identifierSchema } from "../model";
import { capabilityReportSchema } from "./capability-report";
import { directorPlanSchema } from "./director-plan";
import { executableEpisodePlanSchema } from "./executable-episode-plan";
import { directorProposalSchema } from "./director-proposal";
import { directorQualityReportSchema } from "./quality-report";
import { sceneWorldPlanSchema } from "./scene-world";
import { timingSolutionSchema } from "./timing-solution";

const directorProjectFields = {
  schemaVersion: z.literal("1.0"),
  id: identifierSchema,
  storyProjectContentHash: hashSchema,
  planningArtifact: directorProposalSchema,
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
      project.planningArtifact.storyGraphContentHash !==
        project.directorPlan.storyGraphContentHash ||
      project.planningArtifact.plannerId !==
        project.directorPlan.planningAuthority.plannerId ||
      project.planningArtifact.plannerVersion !==
        project.directorPlan.planningAuthority.plannerVersion ||
      project.planningArtifact.contentHash !==
        project.directorPlan.planningArtifactContentHash
    )
      context.addIssue({
        code: "custom",
        path: ["planningArtifact"],
        message:
          "Director project planning artifact does not match the exact compiled plan authority and content.",
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
        project.directorPlan.contentHash ||
      project.capabilityReport.registryVersion !==
        project.executableEpisodePlan.registryVersions.performance
    )
      context.addIssue({
        code: "custom",
        path: ["capabilityReport"],
        message: "Director project capability report is stale.",
      });
    const performancePrograms = new Map(
      project.executableEpisodePlan.performancePrograms.map((program) => [
        program.id,
        program,
      ]),
    );
    project.capabilityReport.items.forEach((item, index) => {
      const program = performancePrograms.get(item.requirementId);
      const executableFinal = Boolean(
        program?.execution &&
        item.capabilityContentHash === program.manifestContentHash,
      );
      if (
        (item.resolution === "supported" && !executableFinal) ||
        (item.resolution !== "supported" && Boolean(program?.execution))
      )
        context.addIssue({
          code: "custom",
          path: ["capabilityReport", "items", index],
          message:
            "Capability status must match a hash-bound executable performance program.",
        });
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
