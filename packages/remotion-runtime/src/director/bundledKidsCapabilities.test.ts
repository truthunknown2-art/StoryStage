import { describe, expect, it } from "vitest";
import {
  createBundledKidsCapabilityRegistry,
  createBundledKidsPilotCapabilityRegistry,
  type BundledKidsCapabilityKind,
} from "./bundledKidsCapabilities";

describe("bundled Kids performance capabilities", () => {
  it.each([
    "living-hold",
    "atlas-cycle",
    "articulated-rig",
  ] satisfies BundledKidsCapabilityKind[])(
    "builds one exact approved %s capability for an arbitrary first beat",
    (kind) => {
      const first = createBundledKidsPilotCapabilityRegistry(kind);
      const repeated = createBundledKidsPilotCapabilityRegistry(kind);

      expect(first).toEqual(repeated);
      expect(first.capabilities).toHaveLength(1);
      expect(first.capabilities[0]).toMatchObject({
        requirementId: "performance-1-primary",
        entityId: "lead",
        kind,
        execution: { kind },
      });
      if (kind === "articulated-rig") {
        expect(first.capabilities[0]!.execution).toMatchObject({
          kind: "articulated-rig",
          mode: "local-parts-v1",
          assetId: "mara-payoff-puppet-v1",
          rigManifest: {
            animationMode: "articulated-2d",
            entityId: "lead",
            requirementId: "performance-1-primary",
            renderer: { id: "director-local-parts", version: "1.0.0" },
          },
        });
      }
      expect(first.capabilities[0]!.assets).toEqual([
        expect.objectContaining({
          status: "approved",
          relativeFile: expect.stringMatching(/\.png$/),
          byteLength: expect.any(Number),
        }),
      ]);
      const binding = first.capabilities[0]!.assets[0]!;
      expect(binding.immutableLocationId).toBe(`sha256:${binding.contentHash}`);
      expect(binding.relativeFile).toContain(binding.contentHash);
      expect(first.version).toMatch(
        /^bundled-kids-performance-v1@[a-f0-9]{12}$/,
      );
    },
  );

  it("keeps capability matching scoped to the exact requirement and entity", () => {
    const registry = createBundledKidsCapabilityRegistry([
      {
        kind: "atlas-cycle",
        requirementId: "performance-4-primary",
        entityId: "support",
      },
    ]);

    expect(registry.capabilities[0]).toMatchObject({
      requirementId: "performance-4-primary",
      entityId: "support",
      kind: "atlas-cycle",
    });
  });

  it("reseals the reusable Mara rig to the exact capability target", () => {
    const registry = createBundledKidsCapabilityRegistry([
      {
        kind: "articulated-rig",
        requirementId: "performance-4-primary",
        entityId: "support",
      },
    ]);
    const capability = registry.capabilities[0]!;

    expect(capability).toMatchObject({
      requirementId: "performance-4-primary",
      entityId: "support",
      rendererId: "director-local-parts",
      execution: {
        mode: "local-parts-v1",
        rigManifest: {
          requirementId: "performance-4-primary",
          entityId: "support",
        },
      },
    });
    expect(capability.assets).toHaveLength(1);
  });
});
