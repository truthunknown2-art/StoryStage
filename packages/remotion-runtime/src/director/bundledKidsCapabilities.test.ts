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
      expect(first.capabilities[0]!.assets).toEqual([
        expect.objectContaining({
          status: "approved",
          relativeFile: expect.stringMatching(/\.png$/),
        }),
      ]);
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
});
