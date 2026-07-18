import { z } from "zod";
import { hashCanonical } from "../canonical-hash";
import { hashSchema, identifierSchema } from "../model";
import {
  approvedAssetBindingSchema,
  performanceExecutionSchema,
  type ApprovedAssetBinding,
  type PerformanceExecution,
} from "./executable-episode-plan";
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

const capabilityAssetSchema = approvedAssetBindingSchema.extend({
  status: z.literal("approved"),
  relativeFile: z.string().min(1),
});

const performanceCapabilityFields = {
  id: identifierSchema,
  requirementId: identifierSchema,
  entityId: identifierSchema,
  kind: z.enum(["articulated-rig", "atlas-cycle", "living-hold"]),
  rendererId: identifierSchema,
  rendererVersion: z.string().min(1),
  assets: z.array(capabilityAssetSchema).min(1),
  execution: performanceExecutionSchema,
};

export const performanceCapabilityDraftSchema = z
  .object(performanceCapabilityFields)
  .strict()
  .superRefine((capability, context) => {
    if (capability.kind !== capability.execution.kind)
      context.addIssue({
        code: "custom",
        path: ["execution", "kind"],
        message: "Capability kind must match its executable program.",
      });
    if (
      !capability.assets.some(
        (asset) => asset.assetId === capability.execution.assetId,
      )
    )
      context.addIssue({
        code: "custom",
        path: ["execution", "assetId"],
        message:
          "Executable performance must consume an approved capability asset.",
      });
  });

export const performanceCapabilitySchema = z
  .object({ ...performanceCapabilityFields, contentHash: hashSchema })
  .strict()
  .superRefine((capability, context) => {
    const { contentHash, ...draft } = capability;
    const draftResult = performanceCapabilityDraftSchema.safeParse(draft);
    if (!draftResult.success)
      draftResult.error.issues.forEach((issue) =>
        context.addIssue({ ...issue, path: issue.path }),
      );
    if (hashCanonical(draft) !== contentHash)
      context.addIssue({
        code: "custom",
        path: ["contentHash"],
        message: "Performance capability hash is invalid.",
      });
  });

const capabilityRegistryFields = {
  version: z.string().min(1),
  capabilities: z.array(performanceCapabilitySchema),
};

export const capabilityRegistrySchema = z
  .object({ ...capabilityRegistryFields, contentHash: hashSchema })
  .strict()
  .superRefine((registry, context) => {
    const { contentHash, ...draft } = registry;
    if (hashCanonical(draft) !== contentHash)
      context.addIssue({
        code: "custom",
        path: ["contentHash"],
        message: "Capability registry hash is invalid.",
      });
    const requirements = registry.capabilities.map(
      (capability) => capability.requirementId,
    );
    if (new Set(requirements).size !== requirements.length)
      context.addIssue({
        code: "custom",
        path: ["capabilities"],
        message: "A requirement may resolve to only one final capability.",
      });
    const assets = registry.capabilities.flatMap(
      (capability) => capability.assets,
    );
    const bindingById = new Map<string, (typeof assets)[number]>();
    assets.forEach((asset, index) => {
      const existing = bindingById.get(asset.assetId);
      if (
        existing &&
        (existing.contentHash !== asset.contentHash ||
          existing.version !== asset.version ||
          existing.relativeFile !== asset.relativeFile)
      )
        context.addIssue({
          code: "custom",
          path: ["capabilities", index, "assets"],
          message:
            "One capability registry may not bind an asset ID to conflicting immutable files.",
        });
      bindingById.set(asset.assetId, asset);
    });
  });

export type PerformanceCapabilityDraft = z.infer<
  typeof performanceCapabilityDraftSchema
>;
export type PerformanceCapability = z.infer<typeof performanceCapabilitySchema>;
export type CapabilityRegistry = z.infer<typeof capabilityRegistrySchema>;

export function createCapabilityRegistry(input: {
  version: string;
  capabilities: PerformanceCapabilityDraft[];
}): CapabilityRegistry {
  const capabilities = input.capabilities.map((raw) => {
    const draft = performanceCapabilityDraftSchema.parse(raw);
    return performanceCapabilitySchema.parse({
      ...draft,
      contentHash: hashCanonical(draft),
    });
  });
  const draft = { version: input.version, capabilities };
  return capabilityRegistrySchema.parse({
    ...draft,
    contentHash: hashCanonical(draft),
  });
}

export const alphaCapabilityRegistry = createCapabilityRegistry({
  version: "director-alpha-1",
  capabilities: [],
});

type CapabilityRequirement = {
  id: string;
  entityId: string;
  source: DirectorPerformanceKind | "proxy";
};

export function findDirectorCapability(
  rawRegistry: CapabilityRegistry,
  requirement: CapabilityRequirement,
): PerformanceCapability | null {
  const registry = capabilityRegistrySchema.parse(rawRegistry);
  return (
    registry.capabilities.find(
      (capability) =>
        capability.requirementId === requirement.id &&
        capability.entityId === requirement.entityId &&
        capability.kind === requirement.source,
    ) ?? null
  );
}

const capabilityItemSchema = z
  .object({
    id: identifierSchema,
    beatId: identifierSchema,
    requirementId: identifierSchema,
    requestedKind: directorPerformanceKindSchema,
    resolution: z.enum(["supported", "proxy-only", "blocked"]),
    capabilityId: identifierSchema.nullable(),
    capabilityContentHash: hashSchema.nullable(),
    creatorMessage: z.string().min(1),
  })
  .strict();

const capabilityReportFields = {
  schemaVersion: z.literal("1.0"),
  directorPlanContentHash: hashSchema,
  registryVersion: z.string().min(1),
  registryContentHash: hashSchema,
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
    if (
      report.items.some(
        (item) =>
          (item.resolution === "supported") !==
          (item.capabilityId !== null && item.capabilityContentHash !== null),
      )
    )
      context.addIssue({
        code: "custom",
        path: ["items"],
        message:
          "Only a concrete final capability may be reported as supported.",
      });
  });

export type CapabilityReport = z.infer<typeof capabilityReportSchema>;

export function resolveDirectorCapabilities(
  plan: DirectorPlan,
  rawRegistry: CapabilityRegistry = alphaCapabilityRegistry,
): CapabilityReport {
  const registry = capabilityRegistrySchema.parse(rawRegistry);
  const items = plan.beats.flatMap((beat) =>
    beat.performanceRequirements.map((requirement) => {
      if (requirement.source === "proxy")
        throw new Error(
          "Director plans may not request proxy as a creative performance source.",
        );
      const capability = findDirectorCapability(registry, requirement);
      const resolution = capability
        ? ("supported" as const)
        : ("proxy-only" as const);
      return {
        id: `capability-${hashCanonical({ beatId: beat.beatId, requirementId: requirement.id }).slice(0, 12)}`,
        beatId: beat.beatId,
        requirementId: requirement.id,
        requestedKind: requirement.source,
        resolution,
        capabilityId: capability?.id ?? null,
        capabilityContentHash: capability?.contentHash ?? null,
        creatorMessage: capability
          ? `Final ${requirement.source.replaceAll("-", " ")} capability ${capability.id} is assigned.`
          : `Directed animatic ready. Final ${requirement.source.replaceAll("-", " ")} capability is still needed.`,
      };
    }),
  );
  const draft = {
    schemaVersion: "1.0" as const,
    directorPlanContentHash: plan.contentHash,
    registryVersion: registry.version,
    registryContentHash: registry.contentHash,
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

export type ConcreteCapabilityAsset = ApprovedAssetBinding & {
  status: "approved";
  relativeFile: string;
};
export type ConcretePerformanceExecution = PerformanceExecution;
