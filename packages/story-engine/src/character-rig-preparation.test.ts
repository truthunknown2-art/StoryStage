import { describe, expect, it } from "vitest";
import * as characterRigPreparation from "./character-rig-preparation";
import {
  createCharacterRigAssetRequest,
  createCharacterRigCandidateBundle,
  createKidsBipedRigRequestItems,
  inspectCharacterRigCandidateBundle,
  type CharacterRigAssetRequestDraft,
} from "./character-rig-acquisition";
import {
  characterRigExposureRoleSchema,
  characterRigPartRoleSchema,
  createCharacterRigPreparationRecipe,
  createCharacterRigStagingReport,
  validateCharacterRigPreparationRecipe,
} from "./character-rig-preparation";

const repeatedHash = (digit: string) => digit.repeat(64);
const withoutHash = <T extends { contentHash: string }>(value: T) =>
  Object.fromEntries(
    Object.entries(value).filter(([key]) => key !== "contentHash"),
  ) as Omit<T, "contentHash">;

const requestDraft = (): CharacterRigAssetRequestDraft => ({
  schemaVersion: "1.0",
  requestId: "kcast-001b-ollo-rig-request",
  showPack: {
    id: "ollo-and-friends-kids-v1",
    version: "1.0.0",
    contentHash: repeatedHash("a"),
  },
  character: { id: "ollo", displayName: "Ollo" },
  identityLock: {
    assetId: "ollo-friends-identity-board-v1",
    contentHash:
      "0950d7043347528a302de5d70f36736dcfbec1f9e0177296756e91b96fbc846f",
  },
  rigProfile: {
    id: "kids-biped-v1",
    version: "1.0.0",
    templateContentHash: repeatedHash("b"),
  },
  acquisition: {
    mode: "manual-file-import",
    providerNeutral: true,
    acceptedMediaTypes: ["image/png"],
    credentialsRequired: false,
    accountSessionRequired: false,
  },
  controlledMatte: "#ff00ff",
  items: createKidsBipedRigRequestItems(),
  prohibitions: ["Do not redesign Ollo."],
  approvalRequired: true,
});

const fixture = (complete = false) => {
  const request = createCharacterRigAssetRequest(requestDraft());
  const selectedItemIds = complete
    ? request.items.map((item) => item.id)
    : ["turnaround-sheet", "parts-front", "face-front"];
  const bundle = createCharacterRigCandidateBundle({
    schemaVersion: "1.0",
    acquisitionMode: "manual-file-import",
    requestId: request.requestId,
    requestContentHash: request.contentHash,
    provenance: {
      sourceType: "generated",
      providerLabel: "manual-image-tool",
      sourceReference: null,
      createdAt: "2026-07-18T20:00:00.000Z",
      rightsStatement: "Original generated candidate supplied by the user.",
    },
    assets: selectedItemIds.map((requestItemId, index) => ({
      candidateId: `candidate-${requestItemId}`,
      requestItemId,
      relativeFile: `candidates/${requestItemId}.png`,
      contentHash: (index + 1).toString(16).repeat(64),
      byteLength: 4096 + index,
      mediaType: "image/png",
      width: 2048,
      height: 2048,
    })),
  });
  const inspection = inspectCharacterRigCandidateBundle(request, bundle);
  const report = createCharacterRigStagingReport({
    schemaVersion: "1.0",
    reportId: "rig-staging-kcast-001b",
    requestId: request.requestId,
    requestContentHash: request.contentHash,
    bundleContentHash: bundle.contentHash,
    identityLockContentHash: request.identityLock.contentHash,
    templateContentHash: request.rigProfile.templateContentHash,
    status: inspection.status,
    returnedItems: inspection.returnedItems,
    missingItems: inspection.missingItems,
    unknownItems: inspection.unknownItems,
    assets: bundle.assets.map((asset, index) => ({
      candidateId: asset.candidateId,
      requestItemId: asset.requestItemId,
      sourceContentHash: asset.contentHash,
      stagedContentHash: asset.contentHash,
      immutableLocationId: `sha256:${asset.contentHash}`,
      relativeFile: `character-rig/candidates/${asset.contentHash}.png`,
      byteLength: asset.byteLength,
      mediaType: "image/png",
      width: asset.width,
      height: asset.height,
      alphaClass: index === 0 ? ("opaque" as const) : ("mixed-alpha" as const),
      checks: {
        byteLength: true,
        contentHash: true,
        codec: true,
        dimensions: true,
        decodedSinglePage: true,
      },
    })),
    providerAuthority: false,
    approvalRequired: true,
    stagedAt: "2026-07-18T20:05:00.000Z",
  });
  const viewItems = request.items.filter(
    (item) => item.view === "front" && item.kind !== "turnaround-sheet",
  );
  const roleSource = new Map<string, {
    candidateId: string;
    requestItemId: string;
    stagedContentHash: string;
    rect: { x: number; y: number; width: number; height: number };
    matte: { mode: "existing-alpha" };
  }>(
    viewItems.flatMap((item) =>
      item.requiredComponents.map((role, index) => [
        role,
        {
          candidateId: `candidate-${item.id}`,
          requestItemId: item.id,
          stagedContentHash: bundle.assets.find(
            (asset) => asset.requestItemId === item.id,
          )!.contentHash,
          rect: {
            x: (index % 8) * 96,
            y: Math.floor(index / 8) * 96,
            width: 64,
            height: 64,
          },
          matte: { mode: "existing-alpha" as const },
        },
      ]),
    ),
  );
  const partRoles = [...roleSource.keys()].filter((role) =>
    characterRigPartRoleSchema.safeParse(role).success,
  );
  const nonRootPartRoles = partRoles.filter((role) => role !== "torso");
  const parts = ["torso", ...nonRootPartRoles].map((role, index) => ({
    id: `part-${role}`,
    role: characterRigPartRoleSchema.parse(role),
    source: roleSource.get(role)!,
    output: {
      relativeFile: `prepared/front/part-${role}.png`,
      width: 64,
      height: 64,
      padding: 4,
    },
    parentId: role === "torso" ? null : "part-torso",
    parentSocketId: role === "torso" ? null : `socket-${role}`,
    childPivot: { x: 32, y: 32 },
    parentJoint:
      role === "torso"
        ? null
        : {
            x: 2 + ((index - 1) % 10) * 6,
            y: 2 + Math.floor((index - 1) / 10) * 8,
          },
    restTransform: { x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1 },
    sockets:
      role === "torso"
        ? nonRootPartRoles.map((childRole, socketIndex) => ({
            id: `socket-${childRole}`,
            position: {
              x: 2 + (socketIndex % 10) * 6,
              y: 2 + Math.floor(socketIndex / 10) * 8,
            },
          }))
        : [],
    zIndex: index,
  }));
  const targetForExposure = (role: string) =>
    role.startsWith("lid-")
      ? `part-lid-open-${role.endsWith("left") ? "left" : "right"}`
      : role.startsWith("brow-")
        ? `part-brow-neutral-${role.endsWith("left") ? "left" : "right"}`
        : "part-mouth-rest";
  const exposures = [...roleSource.keys()]
    .filter((role) => characterRigExposureRoleSchema.safeParse(role).success)
    .map((role) => ({
      id: `exposure-${role}`,
      role: characterRigExposureRoleSchema.parse(role),
      targetPartId: targetForExposure(role),
      source: roleSource.get(role)!,
      output: {
        relativeFile: `prepared/front/exposure-${role}.png`,
        width: 64,
        height: 64,
        padding: 4,
      },
      childPivot: { x: 32, y: 32 },
    }));
  const recipe = createCharacterRigPreparationRecipe({
    schemaVersion: "1.0",
    recipeId: "recipe-ollo-front-v1",
    requestId: request.requestId,
    requestContentHash: request.contentHash,
    bundleContentHash: bundle.contentHash,
    stagingReportContentHash: report.contentHash,
    identityLockContentHash: request.identityLock.contentHash,
    templateContentHash: request.rigProfile.templateContentHash,
    processor: {
      extractionAlgorithm: { id: "rect-crop-chroma-v1", version: "1.0.0" },
      imageLibrary: { id: "sharp", version: "0.34.5" },
    },
    view: "front",
    state: "proposed",
    parts,
    exposures,
    approvalRequired: true,
  });
  return { request, bundle, report, recipe };
};

describe("character rig preparation ledger", () => {
  it("does not export a report-only import receipt constructor", () => {
    expect(characterRigPreparation).not.toHaveProperty(
      "createCharacterRigImportReceipt",
    );
  });

  it("binds a complete front-view component recipe to partial staged lineage", () => {
    const { request, bundle, report, recipe } = fixture();
    expect(report.status).toBe("incomplete");
    expect(validateCharacterRigPreparationRecipe(request, bundle, report, recipe)).toEqual({
      recipeContentHash: recipe.contentHash,
      componentCount: recipe.parts.length + recipe.exposures.length,
      providerAuthority: false,
      approvalRequired: true,
      state: "proposed",
    });
  });

  it("rejects existing-alpha claims for an opaque parts source", () => {
    const { request, bundle, report, recipe } = fixture();
    const opaqueReport = createCharacterRigStagingReport({
      ...withoutHash(report),
      assets: report.assets.map((asset) =>
        asset.requestItemId === "parts-front"
          ? { ...asset, alphaClass: "opaque" as const }
          : asset,
      ),
    });
    const rebound = createCharacterRigPreparationRecipe({
      ...withoutHash(recipe),
      stagingReportContentHash: opaqueReport.contentHash,
    });
    expect(() =>
      validateCharacterRigPreparationRecipe(request, bundle, opaqueReport, rebound),
    ).toThrow(/cannot claim existing-alpha/i);
  });

  it("rejects duplicate z-order and exposure registration drift", () => {
    const { recipe } = fixture();
    expect(() =>
      createCharacterRigPreparationRecipe({
        ...withoutHash(recipe),
        parts: recipe.parts.map((part, index) =>
          index === 1 ? { ...part, zIndex: recipe.parts[0]!.zIndex } : part,
        ),
      }),
    ).toThrow(/z-order values must be unique/i);
    expect(() =>
      createCharacterRigPreparationRecipe({
        ...withoutHash(recipe),
        exposures: recipe.exposures.map((exposure, index) =>
          index === 0
            ? { ...exposure, output: { ...exposure.output, width: 65 } }
            : exposure,
        ),
      }),
    ).toThrow(/registration must exactly match/i);
  });

  it("rejects a crop outside the staged image and stale staging lineage", () => {
    const { request, bundle, report, recipe } = fixture();
    const outside = createCharacterRigPreparationRecipe({
      ...withoutHash(recipe),
      parts: recipe.parts.map((part, index) =>
        index === 0
          ? { ...part, source: { ...part.source, rect: { x: 2040, y: 0, width: 64, height: 64 } } }
          : part,
      ),
    });
    expect(() =>
      validateCharacterRigPreparationRecipe(request, bundle, report, outside),
    ).toThrow(/crop leaves its staged source/i);
    expect(() =>
      validateCharacterRigPreparationRecipe(request, bundle, report, {
        ...recipe,
        stagingReportContentHash: repeatedHash("f"),
      }),
    ).toThrow(/hash is invalid|exact staged lineage/i);
  });
});
