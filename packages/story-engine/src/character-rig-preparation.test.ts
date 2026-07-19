import { describe, expect, it } from "vitest";
import * as characterRigPreparation from "./character-rig-preparation";
import { hashCanonical } from "./canonical-hash";
import {
  createCharacterRigAssetRequest,
  createCharacterRigCandidateBundle,
  createKidsBipedRigRequestItems,
  inspectCharacterRigCandidateBundle,
  kidsBipedV1RequiredTurnaroundViews,
  kidsBipedV1TopologyTemplate,
  type CharacterRigAssetRequestDraft,
} from "./character-rig-acquisition";
import {
  characterRigExposureRoleSchema,
  characterRigImportReceiptSchema,
  characterRigPartRoleSchema,
  createCharacterRigPreparationRecipe,
  createCharacterRigPreparationRecipeDraft,
  createCharacterRigStagingReport,
  stagedTurnaroundViewCoverageEvidenceSchema,
  validateCharacterRigPreparationRecipe,
  validateCharacterRigPreparationRecipeDraft,
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
    templateContentHash: kidsBipedV1TopologyTemplate.contentHash,
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
      ...(complete && requestItemId === "turnaround-sheet"
        ? {
            turnaroundViewCoverageEvidence: {
              schemaVersion: "1.0" as const,
              relativeFile: "evidence/turnaround-coverage.json",
              contentHash: repeatedHash("e"),
              fileContentHash: repeatedHash("f"),
              byteLength: 1024,
            },
          }
        : {}),
    })),
  });
  const inspection = inspectCharacterRigCandidateBundle(request, bundle);
  const coverage = complete
    ? [
        {
          schemaVersion: "1.0" as const,
          requestItemId: "turnaround-sheet",
          candidateId: "candidate-turnaround-sheet",
          candidateContentHash: bundle.assets[0]!.contentHash,
          evidenceContentHash: repeatedHash("e"),
          evidenceFileContentHash: repeatedHash("f"),
          sourceRelativeFile: "evidence/turnaround-coverage.json",
          stagedRelativeFile: `character-rig/coverage-evidence/${repeatedHash("f")}.json`,
          requiredViews: [...kidsBipedV1RequiredTurnaroundViews] as [
            "front",
            "three-quarter",
            "profile-left",
            "profile-right",
            "rear",
          ],
          views: kidsBipedV1RequiredTurnaroundViews.map((view, index) => ({
            view,
            derivedContentHash: (index + 8).toString(16).repeat(64),
            byteLength: 100 + index,
            width: 10,
            height: 10,
            stagedRelativeFile: `character-rig/coverage-views/${(index + 8).toString(16).repeat(64)}.png`,
          })),
          status: "complete" as const,
        },
      ]
    : [];
  const report = createCharacterRigStagingReport({
    schemaVersion: "1.0",
    reportId: "rig-staging-kcast-001b",
    requestId: request.requestId,
    requestContentHash: request.contentHash,
    bundleContentHash: bundle.contentHash,
    identityLockContentHash: request.identityLock.contentHash,
    templateContentHash: request.rigProfile.templateContentHash,
    status: complete ? "complete" : inspection.status,
    returnedItems: complete
      ? [...inspection.returnedItems, "turnaround-sheet"].sort()
      : inspection.returnedItems,
    partialItems: complete ? [] : inspection.partialItems,
    missingItems: inspection.missingItems,
    missingSubitems: complete ? [] : inspection.missingSubitems,
    unknownItems: inspection.unknownItems,
    turnaroundViewCoverageEvidence: coverage,
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
  const roleSource = new Map<
    string,
    {
      candidateId: string;
      requestItemId: string;
      stagedContentHash: string;
      rect: { x: number; y: number; width: number; height: number };
      matte: { mode: "existing-alpha" };
    }
  >(
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
  const socketPositions = new Map(
    kidsBipedV1TopologyTemplate.parts
      .filter((rule) => rule.parentSocketId)
      .map((rule, index) => [
        rule.parentSocketId!,
        {
          x: 5 + (index % 6) * 5,
          y: 5 + Math.floor(index / 6) * 5,
        },
      ]),
  );
  const parts = kidsBipedV1TopologyTemplate.parts.map((rule, index) => ({
    id: `part-${rule.role}`,
    role: characterRigPartRoleSchema.parse(rule.role),
    source: roleSource.get(rule.role)!,
    output: {
      relativeFile: `prepared/front/part-${rule.role}.png`,
      width: 64,
      height: 64,
      padding: 4,
    },
    parentId: rule.parentRole ? `part-${rule.parentRole}` : null,
    parentSocketId: rule.parentSocketId,
    childPivot: { x: 32, y: 32 },
    parentJoint: rule.parentSocketId
      ? socketPositions.get(rule.parentSocketId)!
      : null,
    restTransform: { x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1 },
    sockets: kidsBipedV1TopologyTemplate.parts
      .filter((child) => child.parentRole === rule.role)
      .map((child) => ({
        id: child.parentSocketId!,
        position: socketPositions.get(child.parentSocketId!)!,
      })),
    zIndex: index,
  }));
  const exposures = kidsBipedV1TopologyTemplate.exposures.map((rule) => ({
    id: `exposure-${rule.role}`,
    role: characterRigExposureRoleSchema.parse(rule.role),
    targetPartId: `part-${rule.targetRole}`,
    source: roleSource.get(rule.role)!,
    output: {
      relativeFile: `prepared/front/exposure-${rule.role}.png`,
      width: 64,
      height: 64,
      padding: 4,
    },
    childPivot: { x: 32, y: 32 },
  }));
  const receiptDraft = complete
    ? {
        schemaVersion: "1.0" as const,
        importId: "import-ollo-complete-v1",
        requestContentHash: request.contentHash,
        candidateBundleContentHash: bundle.contentHash,
        stagingReportContentHash: report.contentHash,
        files: report.assets.map((asset) => ({
          requestItemId: asset.requestItemId,
          candidateId: asset.candidateId,
          sourceContentHash: asset.sourceContentHash,
          byteLength: asset.byteLength,
          mediaType: "image/png" as const,
          width: asset.width,
          height: asset.height,
          immutableLocationId: asset.immutableLocationId,
          stagedRelativeFile: asset.relativeFile,
        })),
        turnaroundViewCoverageEvidence: coverage,
        providerAuthority: false as const,
        approvalRequired: true as const,
        importedAt: "2026-07-18T20:06:00.000Z",
      }
    : null;
  const receipt = receiptDraft
    ? characterRigImportReceiptSchema.parse({
        ...receiptDraft,
        contentHash: hashCanonical(receiptDraft),
      })
    : null;
  const recipeDraft = {
    schemaVersion: "1.0" as const,
    recipeId: "recipe-ollo-front-v1",
    requestId: request.requestId,
    requestContentHash: request.contentHash,
    bundleContentHash: bundle.contentHash,
    stagingReportContentHash: report.contentHash,
    importReceiptContentHash: receipt?.contentHash ?? null,
    identityLockContentHash: request.identityLock.contentHash,
    templateContentHash: request.rigProfile.templateContentHash,
    processor: {
      extractionAlgorithm: {
        id: "character-rig-component-preparation" as const,
        version: "1.0.0" as const,
      },
      imageLibrary: { id: "sharp" as const, version: "0.34.5" as const },
    },
    view: "front" as const,
    state: "proposed" as const,
    parts,
    exposures,
    approvalRequired: true as const,
  };
  const recipe = receipt
    ? createCharacterRigPreparationRecipe(recipeDraft)
    : createCharacterRigPreparationRecipeDraft(recipeDraft);
  return { request, bundle, report, receipt, recipe };
};

describe("character rig preparation ledger", () => {
  it("rejects staged turnaround records that reuse derived bytes or paths", () => {
    const { report } = fixture(true);
    const coverage = report.turnaroundViewCoverageEvidence[0]!;
    const first = coverage.views[0]!;
    const forged = {
      ...coverage,
      views: coverage.views.map((view, index) =>
        index === 1
          ? {
              ...view,
              derivedContentHash: first.derivedContentHash,
              stagedRelativeFile: first.stagedRelativeFile,
            }
          : view,
      ),
    };
    expect(() =>
      stagedTurnaroundViewCoverageEvidenceSchema.parse(forged),
    ).toThrow(/unique/i);
  });

  it("does not export a report-only import receipt constructor", () => {
    expect(characterRigPreparation).not.toHaveProperty(
      "createCharacterRigImportReceipt",
    );
    expect(characterRigPreparation).not.toHaveProperty(
      "createPreparedCharacterRigViewManifest",
    );
  });

  it("allows a non-executable front-view recipe draft against incomplete staging", () => {
    const { request, bundle, report, recipe } = fixture();
    expect(report.status).toBe("incomplete");
    expect(recipe).not.toHaveProperty("contentHash");
    expect(
      validateCharacterRigPreparationRecipeDraft(
        request,
        bundle,
        report,
        recipe,
      ),
    ).toEqual({
      componentCount: recipe.parts.length + recipe.exposures.length,
      providerAuthority: false,
      approvalRequired: true,
      state: "proposed",
    });
    expect(() => createCharacterRigPreparationRecipe(recipe)).toThrow(
      /verified import receipt/i,
    );
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
    const rebound = createCharacterRigPreparationRecipeDraft({
      ...recipe,
      stagingReportContentHash: opaqueReport.contentHash,
    });
    expect(() =>
      validateCharacterRigPreparationRecipeDraft(
        request,
        bundle,
        opaqueReport,
        rebound,
      ),
    ).toThrow(/cannot claim existing-alpha/i);
  });

  it("rejects duplicate z-order and exposure registration drift", () => {
    const { recipe } = fixture();
    expect(() =>
      createCharacterRigPreparationRecipeDraft({
        ...recipe,
        parts: recipe.parts.map((part, index) =>
          index === 1 ? { ...part, zIndex: recipe.parts[0]!.zIndex } : part,
        ),
      }),
    ).toThrow(/z-order values must be unique/i);
    expect(() =>
      createCharacterRigPreparationRecipeDraft({
        ...recipe,
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
    const outside = createCharacterRigPreparationRecipeDraft({
      ...recipe,
      parts: recipe.parts.map((part, index) =>
        index === 0
          ? {
              ...part,
              source: {
                ...part.source,
                rect: { x: 2040, y: 0, width: 64, height: 64 },
              },
            }
          : part,
      ),
    });
    expect(() =>
      validateCharacterRigPreparationRecipeDraft(
        request,
        bundle,
        report,
        outside,
      ),
    ).toThrow(/crop leaves its staged source/i);
    expect(() =>
      validateCharacterRigPreparationRecipeDraft(request, bundle, report, {
        ...recipe,
        stagingReportContentHash: repeatedHash("f"),
      }),
    ).toThrow(/hash is invalid|exact staged lineage/i);
  });

  it("seals execution only to the exact complete verified import receipt", () => {
    const { request, bundle, report, receipt, recipe } = fixture(true);
    expect(receipt).not.toBeNull();
    expect(recipe).toHaveProperty("contentHash");
    expect(
      validateCharacterRigPreparationRecipe(
        request,
        bundle,
        report,
        receipt!,
        recipe as ReturnType<typeof createCharacterRigPreparationRecipe>,
      ),
    ).toEqual(
      expect.objectContaining({
        recipeContentHash: expect.any(String),
        componentCount: recipe.parts.length + recipe.exposures.length,
      }),
    );
    expect(() =>
      validateCharacterRigPreparationRecipe(
        request,
        bundle,
        report,
        { ...receipt!, contentHash: repeatedHash("f") },
        recipe as ReturnType<typeof createCharacterRigPreparationRecipe>,
      ),
    ).toThrow(/hash is invalid|receipt/i);
  });

  it("rejects missing exact role coverage", () => {
    const { recipe } = fixture();
    expect(() =>
      createCharacterRigPreparationRecipeDraft({
        ...recipe,
        exposures: recipe.exposures.slice(1),
      }),
    ).toThrow(/every kids-biped-v1 exposure/i);
  });

  it("rejects an all-children-under-torso star topology", () => {
    const { recipe } = fixture();
    expect(() =>
      createCharacterRigPreparationRecipeDraft({
        ...recipe,
        parts: recipe.parts.map((part) =>
          part.role === "torso"
            ? part
            : {
                ...part,
                parentId: "part-torso",
                parentSocketId: null,
                parentJoint: null,
              },
        ),
      }),
    ).toThrow(/kids-biped-v1 topology|canonical/i);
  });

  it("rejects hand-left cross-wired under the right arm chain", () => {
    const { recipe } = fixture();
    const rightElbow = recipe.parts
      .find((part) => part.role === "upper-arm-right")!
      .sockets.find((socket) => socket.id === "elbow-right")!;
    expect(() =>
      createCharacterRigPreparationRecipeDraft({
        ...recipe,
        parts: recipe.parts.map((part) =>
          part.role === "hand-left"
            ? {
                ...part,
                parentId: "part-upper-arm-right",
                parentSocketId: rightElbow.id,
                parentJoint: rightElbow.position,
              }
            : part,
        ),
      }),
    ).toThrow(/hand-left.*topology|canonical/i);
  });

  it("rejects viseme-ai targeting an eye or lid part", () => {
    const { recipe } = fixture();
    expect(() =>
      createCharacterRigPreparationRecipeDraft({
        ...recipe,
        exposures: recipe.exposures.map((exposure) =>
          exposure.role === "viseme-ai"
            ? { ...exposure, targetPartId: "part-lid-open-left" }
            : exposure,
        ),
      }),
    ).toThrow(/viseme-ai must target mouth-rest/i);
  });
});
