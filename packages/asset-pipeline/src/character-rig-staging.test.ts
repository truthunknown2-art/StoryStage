import { createHash } from "node:crypto";
import { mkdtemp, mkdir, readFile, readdir, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";
import { afterEach, describe, expect, it } from "vitest";
import {
  createCharacterRigAssetRequest,
  createCharacterRigCandidateBundle,
  createCharacterRigStagingReport,
  createKidsBipedRigRequestItems,
  type CharacterRigAssetRequestDraft,
} from "@storystage/story-engine";
import {
  CharacterRigStagingError,
  createVerifiedCharacterRigImportReceipt,
  stageCharacterRigCandidateBundle,
} from "./character-rig-staging";

const roots: string[] = [];
afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

const sha256 = (bytes: Uint8Array) =>
  createHash("sha256").update(bytes).digest("hex");
const withoutHash = <T extends { contentHash: string }>(value: T) =>
  Object.fromEntries(
    Object.entries(value).filter(([key]) => key !== "contentHash"),
  ) as Omit<T, "contentHash">;

const requestDraft = (): CharacterRigAssetRequestDraft => ({
  schemaVersion: "1.0",
  requestId: "kcast-001b-staging-request",
  showPack: {
    id: "ollo-and-friends-kids-v1",
    version: "1.0.0",
    contentHash: "a".repeat(64),
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
    templateContentHash: "b".repeat(64),
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

const setup = async (bytes?: Buffer) => {
  const root = await mkdtemp(join(tmpdir(), "storystage-kcast-staging-"));
  roots.push(root);
  const sourceRoot = join(root, "source");
  const trustedStagingRoot = join(root, "trusted");
  const stagingRoot = join(trustedStagingRoot, "import-one");
  await mkdir(join(sourceRoot, "candidates"), { recursive: true });
  const png = bytes ?? (await sharp({
    create: {
      width: 16,
      height: 12,
      channels: 3,
      background: { r: 248, g: 240, b: 224 },
    },
  }).png().toBuffer());
  await writeFile(join(sourceRoot, "candidates", "turnaround.png"), png);
  const request = createCharacterRigAssetRequest(requestDraft());
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
    assets: [{
      candidateId: "candidate-turnaround",
      requestItemId: "turnaround-sheet",
      relativeFile: "candidates/turnaround.png",
      contentHash: sha256(png),
      byteLength: png.length,
      mediaType: "image/png",
      width: 16,
      height: 12,
    }],
  });
  return { root, sourceRoot, trustedStagingRoot, stagingRoot, png, request, bundle };
};

const setupComplete = async () => {
  const root = await mkdtemp(join(tmpdir(), "storystage-kcast-complete-"));
  roots.push(root);
  const sourceRoot = join(root, "source");
  const trustedStagingRoot = join(root, "trusted");
  const stagingRoot = join(trustedStagingRoot, "import-complete");
  await mkdir(join(sourceRoot, "candidates"), { recursive: true });
  const request = createCharacterRigAssetRequest(requestDraft());
  const assets = [];
  for (const [index, item] of request.items.entries()) {
    const png = await sharp({
      create: {
        width: 16,
        height: 12,
        channels: 4,
        background: {
          r: 20 + index,
          g: 40 + index,
          b: 60 + index,
          alpha: 1,
        },
      },
    }).png().toBuffer();
    const relativeFile = `candidates/${item.id}.png`;
    await writeFile(join(sourceRoot, ...relativeFile.split("/")), png);
    assets.push({
      candidateId: `candidate-${item.id}`,
      requestItemId: item.id,
      relativeFile,
      contentHash: sha256(png),
      byteLength: png.length,
      mediaType: "image/png" as const,
      width: 16,
      height: 12,
    });
  }
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
      rightsStatement: "Original generated candidates supplied by the user.",
    },
    assets,
  });
  return { root, sourceRoot, trustedStagingRoot, stagingRoot, request, bundle };
};

describe("character rig safe staging", () => {
  it("stages a partial opaque turnaround as incomplete, immutable evidence", async () => {
    const fixture = await setup();
    const report = await stageCharacterRigCandidateBundle({
      ...fixture,
      stagedAt: "2026-07-18T20:05:00.000Z",
    });
    expect(report.status).toBe("incomplete");
    expect(report.returnedItems).toEqual(["turnaround-sheet"]);
    expect(report.assets).toEqual([
      expect.objectContaining({
        candidateId: "candidate-turnaround",
        alphaClass: "opaque",
        byteLength: fixture.png.length,
        checks: {
          byteLength: true,
          contentHash: true,
          codec: true,
          dimensions: true,
          decodedSinglePage: true,
        },
      }),
    ]);
    expect(report.providerAuthority).toBe(false);
    expect(report.approvalRequired).toBe(true);
    const staged = await readFile(
      join(fixture.stagingRoot, ...report.assets[0]!.relativeFile.split("/")),
    );
    expect(sha256(staged)).toBe(sha256(fixture.png));
  });

  it("classifies actual decoded alpha pixels instead of trusting the PNG color type", async () => {
    const pixels = Buffer.alloc(16 * 12 * 4, 255);
    pixels[3] = 0;
    const mixed = await sharp(pixels, {
      raw: { width: 16, height: 12, channels: 4 },
    }).png().toBuffer();
    const fixture = await setup(mixed);
    const report = await stageCharacterRigCandidateBundle({
      ...fixture,
      stagedAt: "2026-07-18T20:05:00.000Z",
    });
    expect(report.assets[0]!.alphaClass).toBe("mixed-alpha");
  });

  it("fails closed for hash, byte-length, dimension, and request lineage drift", async () => {
    const fixture = await setup();
    const draft = {
      schemaVersion: "1.0" as const,
      acquisitionMode: "manual-file-import" as const,
      requestId: fixture.request.requestId,
      requestContentHash: fixture.request.contentHash,
      provenance: fixture.bundle.provenance,
      assets: fixture.bundle.assets,
    };
    const cases = [
      createCharacterRigCandidateBundle({
        ...draft,
        assets: [{ ...draft.assets[0]!, contentHash: "f".repeat(64) }],
      }),
      createCharacterRigCandidateBundle({
        ...draft,
        assets: [{ ...draft.assets[0]!, byteLength: draft.assets[0]!.byteLength + 1 }],
      }),
      createCharacterRigCandidateBundle({
        ...draft,
        assets: [{ ...draft.assets[0]!, width: 17 }],
      }),
      createCharacterRigCandidateBundle({
        ...draft,
        requestContentHash: "e".repeat(64),
      }),
    ];
    for (const bundle of cases) {
      const attemptRoot = join(fixture.trustedStagingRoot, `attempt-${bundle.contentHash.slice(0, 8)}`);
      await expect(stageCharacterRigCandidateBundle({
        request: fixture.request,
        bundle,
        sourceRoot: fixture.sourceRoot,
        trustedStagingRoot: fixture.trustedStagingRoot,
        stagingRoot: attemptRoot,
      })).rejects.toBeInstanceOf(CharacterRigStagingError);
    }
  });

  it("rejects animated and truncated PNG containers before staging", async () => {
    const valid = await sharp({
      create: { width: 16, height: 12, channels: 4, background: { r: 1, g: 2, b: 3, alpha: 1 } },
    }).png().toBuffer();
    const afterIhdr = 8 + 12 + valid.readUInt32BE(8);
    const animated = Buffer.concat([
      valid.subarray(0, afterIhdr),
      Buffer.from([0, 0, 0, 0, 0x61, 0x63, 0x54, 0x4c, 0, 0, 0, 0]),
      valid.subarray(afterIhdr),
    ]);
    const animatedFixture = await setup(animated);
    await expect(stageCharacterRigCandidateBundle({
      ...animatedFixture,
    })).rejects.toMatchObject({ code: "animated-png-rejected" });

    const truncatedFixture = await setup(valid.subarray(0, 32));
    await expect(stageCharacterRigCandidateBundle({
      ...truncatedFixture,
    })).rejects.toMatchObject({ code: "invalid-png" });
  });

  it("rejects traversal paths, accepts identical retries, and blocks conflicting output", async () => {
    const fixture = await setup();
    await expect(stageCharacterRigCandidateBundle({
      request: fixture.request,
      bundle: {
        ...fixture.bundle,
        assets: [{ ...fixture.bundle.assets[0]!, relativeFile: "../outside.png" }],
      },
      sourceRoot: fixture.sourceRoot,
      trustedStagingRoot: fixture.trustedStagingRoot,
      stagingRoot: fixture.stagingRoot,
    })).rejects.toMatchObject({ code: "invalid-bundle" });

    const input = { ...fixture, stagedAt: "2026-07-18T20:05:00.000Z" };
    const first = await stageCharacterRigCandidateBundle(input);
    const retry = await stageCharacterRigCandidateBundle(input);
    expect(retry.contentHash).toBe(first.contentHash);
    await writeFile(
      join(fixture.stagingRoot, ...first.assets[0]!.relativeFile.split("/")),
      Buffer.from("conflicting bytes"),
    );
    await expect(stageCharacterRigCandidateBundle(input)).rejects.toMatchObject({
      code: "output-collision",
    });
  });

  it("rejects preplanted character-rig and candidates junctions without outside writes", async () => {
    for (const derivedSegments of [
      ["character-rig"],
      ["character-rig", "candidates"],
    ]) {
      const fixture = await setup();
      await mkdir(fixture.stagingRoot, { recursive: true });
      if (derivedSegments.length > 1)
        await mkdir(join(fixture.stagingRoot, "character-rig"));
      const outside = join(
        fixture.root,
        `outside-${derivedSegments.join("-")}`,
      );
      await mkdir(outside);
      await symlink(
        outside,
        join(fixture.stagingRoot, ...derivedSegments),
        "junction",
      );
      await expect(
        stageCharacterRigCandidateBundle({
          ...fixture,
          stagedAt: "2026-07-18T20:05:00.000Z",
        }),
      ).rejects.toMatchObject({ code: "symlink-rejected" });
      expect(await readdir(outside)).toEqual([]);
    }
  });

  it("creates a receipt only after reopening and verifying complete staged evidence", async () => {
    const fixture = await setupComplete();
    const stagedAt = "2026-07-18T20:05:00.000Z";
    const report = await stageCharacterRigCandidateBundle({
      ...fixture,
      stagedAt,
    });
    const receipt = await createVerifiedCharacterRigImportReceipt({
      ...fixture,
      report,
      importId: "import-ollo-family-source-v1",
      importedAt: stagedAt,
    });
    expect(receipt.files).toHaveLength(7);
    expect(receipt.stagingReportContentHash).toBe(report.contentHash);
    expect(receipt.providerAuthority).toBe(false);
    expect(receipt.approvalRequired).toBe(true);
  });

  it("refuses a receipt after staged candidate bytes are changed", async () => {
    const fixture = await setupComplete();
    const stagedAt = "2026-07-18T20:05:00.000Z";
    const report = await stageCharacterRigCandidateBundle({
      ...fixture,
      stagedAt,
    });
    await writeFile(
      join(fixture.stagingRoot, ...report.assets[0]!.relativeFile.split("/")),
      Buffer.from("tampered"),
    );
    await expect(
      createVerifiedCharacterRigImportReceipt({
        ...fixture,
        report,
        importId: "import-tampered",
        importedAt: stagedAt,
      }),
    ).rejects.toMatchObject({ code: "byte-length-mismatch" });
  });

  it("refuses a forged self-hashed complete report for an incomplete bundle", async () => {
    const fixture = await setup();
    const stagedAt = "2026-07-18T20:05:00.000Z";
    const partial = await stageCharacterRigCandidateBundle({
      ...fixture,
      stagedAt,
    });
    const forged = createCharacterRigStagingReport({
      ...withoutHash(partial),
      status: "complete",
      returnedItems: fixture.request.items.map((item) => item.id),
      missingItems: [],
      unknownItems: [],
      assets: fixture.request.items.map((item, index) => {
        const contentHash = `${index + 1}`.repeat(64);
        return {
          candidateId: `forged-candidate-${index + 1}`,
          requestItemId: item.id,
          sourceContentHash: contentHash,
          stagedContentHash: contentHash,
          immutableLocationId: `sha256:${contentHash}`,
          relativeFile: `character-rig/candidates/${contentHash}.png`,
          byteLength: 1,
          mediaType: "image/png" as const,
          width: 1,
          height: 1,
          alphaClass: "opaque" as const,
          checks: {
            byteLength: true,
            contentHash: true,
            codec: true,
            dimensions: true,
            decodedSinglePage: true,
          },
        };
      }),
    });
    await expect(
      createVerifiedCharacterRigImportReceipt({
        ...fixture,
        report: forged,
        importId: "import-forged",
        importedAt: stagedAt,
      }),
    ).rejects.toThrow(/missing request items/i);
  });
});
