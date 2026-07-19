import { describe, expect, it } from "vitest";
import { hashCanonical } from "./canonical-hash";
import { compileRigVisualProgram } from "./director/visual-performance-contract";
import {
  articulatedCharacterRigManifestDraftSchema,
  articulatedCharacterRigManifestSchema,
  characterRigManifestDraftSchema,
} from "./rig-manifests";

const hash = (value: string) => hashCanonical(value);

const asset = (id: string, overrides: Record<string, unknown> = {}) => ({
  candidateId: id,
  fileRole: `${id}.png`,
  contentHash: hash(id),
  relativeFile: `rig/${id}.png`,
  width: 256,
  height: 256,
  registration: {
    anchorX: 0.5,
    anchorY: 0.5,
    pivotX: 128,
    pivotY: 128,
    groundY: 240,
  },
  ...overrides,
});

const identity = {
  schemaVersion: "1.0" as const,
  manifestId: "manifest-lead-rig",
  candidateSetId: "lead-rig-set",
  briefId: "lead-rig-brief",
  requirementId: "lead-rig-requirement",
  entityId: "lead",
  entityName: "Lead",
  createdAt: "2026-07-18T18:00:00.000Z",
  type: "character-rig" as const,
};

const articulatedDraft = () => ({
  ...identity,
  animationMode: "articulated-2d" as const,
  identityReference: asset("identity"),
  renderer: { id: "parts-2d", version: "1.0.0" },
  template: { id: "kids-biped", version: "1.0.0" },
  parts: [
    {
      id: "torso",
      parentId: null,
      asset: asset("torso"),
      bounds: { x: 32, y: 24, width: 192, height: 216 },
      pivot: { x: 128, y: 144 },
      sockets: [
        { id: "neck", position: { x: 128, y: 48 } },
        { id: "right-shoulder", position: { x: 192, y: 80 } },
      ],
    },
    {
      id: "head",
      parentId: "torso",
      asset: asset("head"),
      bounds: { x: 40, y: 24, width: 176, height: 176 },
      pivot: { x: 128, y: 160 },
      sockets: [{ id: "mouth", position: { x: 128, y: 132 } }],
    },
    {
      id: "right-upper-arm",
      parentId: "torso",
      asset: asset("right-upper-arm"),
      bounds: { x: 64, y: 32, width: 128, height: 192 },
      pivot: { x: 128, y: 48 },
      sockets: [{ id: "right-elbow", position: { x: 128, y: 208 } }],
    },
  ],
  exposures: [
    { id: "mouth-rest", partId: "head", asset: asset("mouth-rest") },
    { id: "mouth-open", partId: "head", asset: asset("mouth-open") },
  ],
  visemeIds: ["rest", "open"],
  visemeMappings: [
    { visemeId: "rest", exposureId: "mouth-rest" },
    { visemeId: "open", exposureId: "mouth-open" },
  ],
});

const seal = (draft: ReturnType<typeof articulatedDraft>) => ({
  ...draft,
  contentHash: hashCanonical(draft),
});

describe("articulated character rig manifests", () => {
  it("retains the legacy pose-swap manifest parser", () => {
    expect(
      characterRigManifestDraftSchema.parse({
        ...identity,
        animationMode: "pose-swap-2d",
        identityReference: asset("identity"),
        poses: {
          neutral: asset("neutral"),
          talk: asset("talk"),
          reaction: asset("reaction"),
        },
      }).animationMode,
    ).toBe("pose-swap-2d");
  });

  it("seals hierarchy, geometry, exposure, viseme, renderer, and template data", () => {
    const manifest = articulatedCharacterRigManifestSchema.parse(
      seal(articulatedDraft()),
    );
    expect(manifest.animationMode).toBe("articulated-2d");

    const staleRenderer = structuredClone(manifest);
    staleRenderer.renderer.version = "2.0.0";
    expect(() =>
      articulatedCharacterRigManifestSchema.parse(staleRenderer),
    ).toThrow(/hash is invalid/);
  });

  it("compiles every visual id solely from the sealed manifest", () => {
    const manifest = articulatedCharacterRigManifestSchema.parse(
      seal(articulatedDraft()),
    );
    const performanceProgramContentHash = hashCanonical(
      "performance-program",
    );
    const program = compileRigVisualProgram(
      manifest,
      performanceProgramContentHash,
    );

    expect(program).toMatchObject({
      id: "manifest-lead-rig-visual",
      sourcePerformanceProgramContentHash: performanceProgramContentHash,
      rigManifestContentHash: manifest.contentHash,
      partIds: ["torso", "head", "right-upper-arm"],
      socketIds: ["neck", "right-shoulder", "mouth", "right-elbow"],
      exposureIds: ["mouth-rest", "mouth-open"],
      visemeIds: ["rest", "open"],
    });
    expect(program.contentHash).toHaveLength(64);

    const staleManifest = structuredClone(manifest);
    staleManifest.parts[1]!.id = "forged-head";
    expect(() =>
      compileRigVisualProgram(
        staleManifest,
        performanceProgramContentHash,
      ),
    ).toThrow(
      /hash is invalid/,
    );
  });

  it.each(["root", "actor-root", "whole-body", "global-control"])(
    "rejects reserved whole-actor part id %s",
    (partId) => {
      const draft = articulatedDraft();
      draft.parts[1]!.id = partId;
      expect(() =>
        articulatedCharacterRigManifestDraftSchema.parse(draft),
      ).toThrow(/reserved for whole-actor authority/);
    },
  );

  it("requires exactly one internal torso root", () => {
    const draft = articulatedDraft();
    draft.parts[0]!.id = "body";
    expect(() =>
      articulatedCharacterRigManifestDraftSchema.parse(draft),
    ).toThrow(/one internal root part named torso/);

    const secondRoot = articulatedDraft();
    secondRoot.parts[1]!.parentId = null;
    expect(() =>
      articulatedCharacterRigManifestDraftSchema.parse(secondRoot),
    ).toThrow(/one internal root part named torso/);
  });

  it("rejects missing parents and cyclic hierarchies", () => {
    const missingParent = articulatedDraft();
    missingParent.parts[1]!.parentId = "missing-neck";
    expect(() =>
      articulatedCharacterRigManifestDraftSchema.parse(missingParent),
    ).toThrow(/missing parent/);

    const cycle = articulatedDraft();
    cycle.parts.push({
      id: "forearm",
      parentId: "hand",
      asset: asset("forearm"),
      bounds: { x: 32, y: 32, width: 192, height: 192 },
      pivot: { x: 128, y: 48 },
      sockets: [],
    });
    cycle.parts.push({
      id: "hand",
      parentId: "forearm",
      asset: asset("hand"),
      bounds: { x: 32, y: 32, width: 192, height: 192 },
      pivot: { x: 128, y: 48 },
      sockets: [],
    });
    expect(() =>
      articulatedCharacterRigManifestDraftSchema.parse(cycle),
    ).toThrow(/contains a cycle/);
  });

  it("keeps bounds, pivots, and sockets inside the local asset canvas", () => {
    const badBounds = articulatedDraft();
    badBounds.parts[0]!.bounds = { x: 200, y: 24, width: 192, height: 216 };
    expect(() =>
      articulatedCharacterRigManifestDraftSchema.parse(badBounds),
    ).toThrow(/bounds leave its asset canvas/);

    const badPivot = articulatedDraft();
    badPivot.parts[0]!.pivot = { x: 12, y: 12 };
    expect(() =>
      articulatedCharacterRigManifestDraftSchema.parse(badPivot),
    ).toThrow(/pivot must stay inside/);

    const badSocket = articulatedDraft();
    badSocket.parts[0]!.sockets[0]!.position = { x: 8, y: 8 };
    expect(() =>
      articulatedCharacterRigManifestDraftSchema.parse(badSocket),
    ).toThrow(/socket neck must stay inside/);
  });

  it("rejects mismatched local exposure registration", () => {
    const draft = articulatedDraft();
    draft.exposures[0]!.asset.registration.pivotX = 96;
    expect(() =>
      articulatedCharacterRigManifestDraftSchema.parse(draft),
    ).toThrow(/registration must match part head/);
  });

  it("rejects undeclared visemes and exposure mappings", () => {
    const undeclaredViseme = articulatedDraft();
    undeclaredViseme.visemeMappings[1]!.visemeId = "surprise";
    expect(() =>
      articulatedCharacterRigManifestDraftSchema.parse(undeclaredViseme),
    ).toThrow(/undeclared viseme surprise/);

    const undeclaredExposure = articulatedDraft();
    undeclaredExposure.visemeMappings[1]!.exposureId = "mouth-wide";
    expect(() =>
      articulatedCharacterRigManifestDraftSchema.parse(undeclaredExposure),
    ).toThrow(/undeclared exposure mouth-wide/);
  });
});
