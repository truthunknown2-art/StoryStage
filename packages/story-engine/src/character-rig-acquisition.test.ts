import { describe, expect, it } from "vitest";
import {
  characterRigCandidateBundleDraftSchema,
  createCharacterRigAssetRequest,
  createCharacterRigCandidateBundle,
  createKidsBipedRigRequestItems,
  inspectCharacterRigCandidateBundle,
  kidsBipedV1TopologyTemplate,
  validateCharacterRigCandidateBundle,
  type CharacterRigAssetRequestDraft,
  type CharacterRigCandidateBundleDraft,
} from "./character-rig-acquisition";

const hash = (value: string) => value.repeat(64);

const requestDraft = (): CharacterRigAssetRequestDraft => ({
  schemaVersion: "1.0",
  requestId: "kcast-001-ollo-rig-request",
  showPack: {
    id: "ollo-and-friends-kids-v1",
    version: "1.0.0",
    contentHash: hash("a"),
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
  controlledMatte: "#00ff00",
  items: createKidsBipedRigRequestItems(),
  prohibitions: [
    "Do not redesign Ollo or substitute a generic woodland character.",
    "Do not combine upper and lower limbs into a whole-limb piece.",
  ],
  approvalRequired: true,
});

const bundleDraft = (
  request = createCharacterRigAssetRequest(requestDraft()),
): CharacterRigCandidateBundleDraft => ({
  schemaVersion: "1.0",
  acquisitionMode: "manual-file-import",
  requestId: request.requestId,
  requestContentHash: request.contentHash,
  provenance: {
    sourceType: "generated",
    providerLabel: "user-chosen-image-tool",
    sourceReference: null,
    createdAt: "2026-07-18T20:00:00.000Z",
    rightsStatement: "Original generated candidate supplied by the user.",
  },
  assets: request.items.map((item, index) => ({
    candidateId: `candidate-${item.id}`,
    requestItemId: item.id,
    relativeFile: `candidates/${item.id}.png`,
    contentHash: index.toString(16).padStart(64, "0"),
    byteLength: 1024 + index,
    mediaType: "image/png",
    width: 2048,
    height: 2048,
  })),
});

describe("provider-neutral character rig acquisition", () => {
  it("seals the Ollo identity lock and a true upper/lower-limb request", () => {
    const request = createCharacterRigAssetRequest(requestDraft());
    expect(request.identityLock.contentHash).toBe(
      "0950d7043347528a302de5d70f36736dcfbec1f9e0177296756e91b96fbc846f",
    );
    expect(request.acquisition).toEqual({
      mode: "manual-file-import",
      providerNeutral: true,
      acceptedMediaTypes: ["image/png"],
      credentialsRequired: false,
      accountSessionRequired: false,
    });
    for (const view of ["front", "profile-left", "profile-right"] as const) {
      const parts = request.items.find(
        (item) => item.kind === "parts-kit" && item.view === view,
      );
      expect(parts?.requiredComponents).toEqual(
        expect.arrayContaining([
          "upper-arm-left",
          "lower-arm-left",
          "upper-leg-left",
          "lower-leg-left",
          "ear-left",
          "ear-right",
          "tail",
          "secondary-front",
          "secondary-back",
        ]),
      );
      const face = request.items.find(
        (item) => item.kind === "face-kit" && item.view === view,
      );
      expect(face?.requiredComponents).toEqual(
        expect.arrayContaining([
          "eye-white-left",
          "eye-white-right",
          "pupil-left",
          "pupil-right",
          "lid-closed-left",
          "lid-closed-right",
          "brow-raised-left",
          "brow-raised-right",
        ]),
      );
    }
  });

  it("inspects a partial manual intake without granting completeness", () => {
    const request = createCharacterRigAssetRequest(requestDraft());
    const draft = bundleDraft(request);
    const partial = createCharacterRigCandidateBundle({
      ...draft,
      assets: [draft.assets[0]!],
    });
    const inspection = inspectCharacterRigCandidateBundle(request, partial);
    expect(inspection.status).toBe("incomplete");
    expect(inspection.returnedItems).toEqual(["turnaround-sheet"]);
    expect(inspection.missingItems).toHaveLength(request.items.length - 1);
    expect(inspection.providerAuthority).toBe(false);
    expect(() => validateCharacterRigCandidateBundle(request, partial)).toThrow(
      /missing request items/i,
    );
  });

  it("binds every returned file to the exact request without provider authority", () => {
    const request = createCharacterRigAssetRequest(requestDraft());
    const bundle = createCharacterRigCandidateBundle(bundleDraft(request));
    expect(validateCharacterRigCandidateBundle(request, bundle)).toEqual({
      requestContentHash: request.contentHash,
      bundleContentHash: bundle.contentHash,
      returnedItems: request.items.length,
      providerAuthority: false,
      approvalRequired: true,
    });
  });

  it("fails closed for a missing rig-ready sheet", () => {
    const request = createCharacterRigAssetRequest(requestDraft());
    const draft = bundleDraft(request);
    const bundle = createCharacterRigCandidateBundle({
      ...draft,
      assets: draft.assets.slice(1),
    });
    expect(() => validateCharacterRigCandidateBundle(request, bundle)).toThrow(
      /missing request items/i,
    );
  });

  it("rejects whole-limb substitutions at the request boundary", () => {
    const draft = requestDraft();
    const target = draft.items.find(
      (item) => item.kind === "parts-kit" && item.view === "profile-right",
    )!;
    target.requiredComponents = target.requiredComponents.filter(
      (role) => role !== "lower-arm-left",
    );
    expect(() => createCharacterRigAssetRequest(draft)).toThrow(
      /missing lower-arm-left/i,
    );
  });

  it("uses one exact role authority and rejects cross-kit roles", () => {
    const draft = requestDraft();
    const parts = draft.items.find(
      (item) => item.kind === "parts-kit" && item.view === "front",
    )!;
    parts.requiredComponents.push("viseme-ai");
    expect(() => createCharacterRigAssetRequest(draft)).toThrow(
      /parts-kit front contains forbidden role viseme-ai/i,
    );
  });

  it("rejects traversal and credential-shaped extra fields", () => {
    const request = createCharacterRigAssetRequest(requestDraft());
    const draft = bundleDraft(request);
    expect(() =>
      createCharacterRigCandidateBundle({
        ...draft,
        assets: [
          { ...draft.assets[0]!, relativeFile: "../outside.png" },
          ...draft.assets.slice(1),
        ],
      }),
    ).toThrow();
    expect(() =>
      characterRigCandidateBundleDraftSchema.parse({
        ...draft,
        apiKey: "must-never-enter-the-contract",
      }),
    ).toThrow();
  });

  it("detects request and bundle hash tampering", () => {
    const request = createCharacterRigAssetRequest(requestDraft());
    const bundle = createCharacterRigCandidateBundle(bundleDraft(request));
    expect(() =>
      validateCharacterRigCandidateBundle(
        { ...request, contentHash: hash("f") },
        bundle,
      ),
    ).toThrow(/hash is invalid/i);
    expect(() =>
      validateCharacterRigCandidateBundle(request, {
        ...bundle,
        assets: [
          { ...bundle.assets[0]!, byteLength: 9999 },
          ...bundle.assets.slice(1),
        ],
      }),
    ).toThrow(/hash is invalid/i);
  });

  it("binds kids-biped-v1 requests to the exact canonical topology hash", () => {
    const draft = requestDraft();
    expect(() =>
      createCharacterRigAssetRequest({
        ...draft,
        rigProfile: {
          ...draft.rigProfile,
          templateContentHash: hash("d"),
        },
      } as unknown as CharacterRigAssetRequestDraft),
    ).toThrow(/invalid literal|templateContentHash/i);
  });

  it("deep-freezes the canonical topology authority", () => {
    const contentHash = kidsBipedV1TopologyTemplate.contentHash;
    expect(Object.isFrozen(kidsBipedV1TopologyTemplate)).toBe(true);
    expect(Object.isFrozen(kidsBipedV1TopologyTemplate.parts)).toBe(true);
    expect(Object.isFrozen(kidsBipedV1TopologyTemplate.parts[1])).toBe(true);
    expect(() => {
      (
        kidsBipedV1TopologyTemplate.parts[1] as {
          parentRole: string | null;
        }
      ).parentRole = "upper-arm-right";
    }).toThrow();
    expect(kidsBipedV1TopologyTemplate.contentHash).toBe(contentHash);
  });
});
