import { z } from "zod";
import { hashCanonical } from "../canonical-hash";
import { hashSchema, identifierSchema } from "../model";
import type { DirectorPlan } from "./director-plan";

export const directorPerformanceKindSchema = z.enum([
  "articulated-rig",
  "drawing-sequence",
  "atlas-cycle",
  "living-hold",
]);

export type DirectorPerformanceKind = z.infer<
  typeof directorPerformanceKindSchema
>;

export type CapabilityRegistry = {
  version: string;
  supportedPerformanceKinds: DirectorPerformanceKind[];
};

export const alphaCapabilityRegistry: CapabilityRegistry = {
  version: "director-alpha-1",
  // Alpha deliberately has no final-performance assets. The proxy renderer is
  // available, but it is not allowed to pretend that final animation exists.
  supportedPerformanceKinds: [],
};

const capabilityItemSchema = z
  .object({
    id: identifierSchema,
    beatId: identifierSchema,
    requirementId: identifierSchema,
    requestedKind: directorPerformanceKindSchema,
    resolution: z.enum(["supported", "proxy-only", "blocked"]),
    creatorMessage: z.string().min(1),
  })
  .strict();

const capabilityReportFields = {
  schemaVersion: z.literal("1.0"),
  directorPlanContentHash: hashSchema,
  registryVersion: z.string().min(1),
  items: z.array(capabilityItemSchema),
  summary: z
    .object({
      supported: z.number().int().nonnegative(),
      proxyOnly: z.number().int().nonnegative(),
      blocked: z.number().int().nonnegative(),
    })
    .strict(),
};

export const capabilityReportSchema = z
  .object({
    ...capabilityReportFields,
    contentHash: hashSchema,
  })
  .strict()
  .superRefine((report, context) => {
    const { contentHash, ...draft } = report;
    if (hashCanonical(draft) !== contentHash)
      context.addIssue({
        code: "custom",
        path: ["contentHash"],
        message: "Capability report hash is invalid.",
      });
    const supported = report.items.filter(
      (item) => item.resolution === "supported",
    ).length;
    const proxyOnly = report.items.filter(
      (item) => item.resolution === "proxy-only",
    ).length;
    const blocked = report.items.filter(
      (item) => item.resolution === "blocked",
    ).length;
    if (
      supported !== report.summary.supported ||
      proxyOnly !== report.summary.proxyOnly ||
      blocked !== report.summary.blocked
    )
      context.addIssue({
        code: "custom",
        path: ["summary"],
        message: "Capability summary does not match its items.",
      });
  });

export type CapabilityReport = z.infer<typeof capabilityReportSchema>;

export function resolveDirectorCapabilities(
  plan: DirectorPlan,
  registry: CapabilityRegistry = alphaCapabilityRegistry,
): CapabilityReport {
  const supported = new Set(registry.supportedPerformanceKinds);
  const items = plan.beats.flatMap((beat) =>
    beat.performanceRequirements.map((requirement) => {
      if (requirement.source === "proxy")
        throw new Error(
          "Director plans may not request proxy as a creative performance source.",
        );
      const resolution = supported.has(requirement.source)
        ? ("supported" as const)
        : ("proxy-only" as const);
      return {
        id: `capability-${hashCanonical({ beatId: beat.beatId, requirementId: requirement.id }).slice(0, 12)}`,
        beatId: beat.beatId,
        requirementId: requirement.id,
        requestedKind: requirement.source,
        resolution,
        creatorMessage:
          resolution === "supported"
            ? `Final ${requirement.source.replaceAll("-", " ")} capability is assigned.`
            : `Directed animatic ready. Final ${requirement.source.replaceAll("-", " ")} capability is still needed.`,
      };
    }),
  );
  const draft = {
    schemaVersion: "1.0" as const,
    directorPlanContentHash: plan.contentHash,
    registryVersion: registry.version,
    items,
    summary: {
      supported: items.filter((item) => item.resolution === "supported").length,
      proxyOnly: items.filter((item) => item.resolution === "proxy-only")
        .length,
      blocked: 0,
    },
  };
  return capabilityReportSchema.parse({
    ...draft,
    contentHash: hashCanonical(draft),
  });
}
