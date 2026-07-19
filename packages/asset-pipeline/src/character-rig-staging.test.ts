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
  createTurnaroundViewCoverageEvidence,
  kidsBipedV1RequiredTurnaroundViews,
  kidsBipedV1TopologyTemplate,
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

const turnaroundRects = {
  front: { x: 0, y: 0, width: 3, height: 12 },
  "three-quarter": { x: 3, y: 0, width: 3, height: 12 },
  "profile-left": { x: 6, y: 0, width: 3, height: 12 },
  "profile-right": { x: 9, y: 0, width: 3, height: 12 },
  rear: { x: 12, y: 0, width: 4, height: 12 },
} as const;
const semanticDirection = {
  front: "neutral-front",
  "three-quarter": "three-quarter",
  "profile-left": "faces-screen-left",
  "profile-right": "faces-screen-right",
  rear: "neutral-rear",
} as const;

const createTurnaroundSheet = async () => {
  const pixels = Buffer.alloc(16 * 12 * 4, 255);
  for (let x = 0; x < 16; x += 1)
    for (let y = 0; y < 12; y += 1) {
      const band = x < 3 ? 0 : x < 6 ? 1 : x < 9 ? 2 : x < 12 ? 3 : 4;
      const offset = (y * 16 + x) * 4;
      pixels[offset] = 30 + band * 40;
      pixels[offset + 1] = 180 - band * 20;
      pixels[offset + 2] = 60 + band * 25;
    }
  return sharp(pixels, { raw: { width: 16, height: 12, channels: 4 } })
    .png()
    .toBuffer();
};

const writeCoverageEvidence = async (
  sourceRoot: string,
  request: ReturnType<typeof createCharacterRigAssetRequest>,
  candidateId: string,
  sourceBytes: Buffer,
  selectedViews: Array<(typeof kidsBipedV1RequiredTurnaroundViews)[number]>,
) => {
  const sourceContentHash = sha256(sourceBytes);
  const views = [];
  for (const view of selectedViews) {
    const rect = turnaroundRects[view];
    const derived = await sharp(sourceBytes)
      .extract({ left: rect.x, top: rect.y, width: rect.width, height: rect.height })
      .ensureAlpha()
      .png({ compressionLevel: 9, adaptiveFiltering: false, palette: false, effort: 10 })
      .toBuffer();
    views.push({
      view,
      sourceContentHash,
      sourceRect: rect,
      derivedContentHash: sha256(derived),
      byteLength: derived.length,
      width: rect.width,
      height: rect.height,
      semanticDirection: semanticDirection[view],
      transform: "none" as const,
    });
  }
  const evidence = createTurnaroundViewCoverageEvidence({
    schemaVersion: "1.0",
    requestId: request.requestId,
    requestContentHash: request.contentHash,
    requestItemId: "turnaround-sheet",
    candidateId,
    candidateContentHash: sourceContentHash,
    requiredViews: [...kidsBipedV1RequiredTurnaroundViews],
    views,
  });
  const bytes = Buffer.from(`${JSON.stringify(evidence, null, 2)}\n`, "utf8");
  const relativeFile = `evidence/${evidence.contentHash}.json`;
  await mkdir(join(sourceRoot, "evidence"), { recursive: true });
  await writeFile(join(sourceRoot, ...relativeFile.split("/")), bytes);
  return {
    schemaVersion: "1.0" as const,
    relativeFile,
    contentHash: evidence.contentHash,
    fileContentHash: sha256(bytes),
    byteLength: bytes.length,
  };
};

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

const setup = async (bytes?: Buffer) => {
  const root = await mkdtemp(join(tmpdir(), "storystage-kcast-staging-"));
  roots.push(root);
  const sourceRoot = join(root, "source");
  const trustedStagingRoot = join(root, "trusted");
  const stagingRoot = join(trustedStagingRoot, "import-one");
  await mkdir(join(sourceRoot, "candidates"), { recursive: true });
  const png = bytes ?? (await createTurnaroundSheet());
  await writeFile(join(sourceRoot, "candidates", "turnaround.png"), png);
  const request = createCharacterRigAssetRequest(requestDraft());
  const coverage = bytes
    ? null
    : await writeCoverageEvidence(
        sourceRoot,
        request,
        "candidate-turnaround",
        png,
        ["front", "profile-left", "profile-right"],
      );
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
      ...(coverage ? { turnaroundViewCoverageEvidence: coverage } : {}),
    }],
  });
  return { root, sourceRoot, trustedStagingRoot, stagingRoot, png, request, bundle };
};

const setupComplete = async (
  turnaroundViewCoverage: Array<
    (typeof kidsBipedV1RequiredTurnaroundViews)[number]
  > = [...kidsBipedV1RequiredTurnaroundViews],
) => {
  const root = await mkdtemp(join(tmpdir(), "storystage-kcast-complete-"));
  roots.push(root);
  const sourceRoot = join(root, "source");
  const trustedStagingRoot = join(root, "trusted");
  const stagingRoot = join(trustedStagingRoot, "import-complete");
  await mkdir(join(sourceRoot, "candidates"), { recursive: true });
  const request = createCharacterRigAssetRequest(requestDraft());
  const assets = [];
  for (const [index, item] of request.items.entries()) {
    const png = item.kind === "turnaround-sheet" ? await createTurnaroundSheet() : await sharp({
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
    const coverage =
      item.kind === "turnaround-sheet"
        ? await writeCoverageEvidence(
            sourceRoot,
            request,
            `candidate-${item.id}`,
            png,
            turnaroundViewCoverage,
          )
        : null;
    assets.push({
      candidateId: `candidate-${item.id}`,
      requestItemId: item.id,
      relativeFile,
      contentHash: sha256(png),
      byteLength: png.length,
      mediaType: "image/png" as const,
      width: 16,
      height: 12,
      ...(coverage ? { turnaroundViewCoverageEvidence: coverage } : {}),
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
    expect(report.returnedItems).toEqual([]);
    expect(report.partialItems).toEqual(["turnaround-sheet"]);
    expect(report.missingItems).toHaveLength(6);
    expect(report.missingSubitems).toEqual([
      { requestItemId: "turnaround-sheet", view: "three-quarter" },
      { requestItemId: "turnaround-sheet", view: "rear" },
    ]);
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
    expect(report.turnaroundViewCoverageEvidence[0]?.views).toHaveLength(3);
    for (const view of report.turnaroundViewCoverageEvidence[0]!.views) {
      const persistedView = await readFile(
        join(fixture.stagingRoot, ...view.stagedRelativeFile.split("/")),
      );
      expect(sha256(persistedView)).toBe(view.derivedContentHash);
      expect(persistedView.length).toBe(view.byteLength);
    }
  });

  it("rejects a self-rehashed forged crop assertion and out-of-bounds evidence", async () => {
    const fixture = await setup();
    const reference = fixture.bundle.assets[0]!.turnaroundViewCoverageEvidence!;
    const original = JSON.parse(
      await readFile(join(fixture.sourceRoot, ...reference.relativeFile.split("/")), "utf8"),
    ) as ReturnType<typeof createTurnaroundViewCoverageEvidence>;
    const cases = [
      original.views.map((view, index) =>
        index === 0 ? { ...view, derivedContentHash: "f".repeat(64) } : view,
      ),
      original.views.map((view, index) =>
        index === 0
          ? {
              ...view,
              sourceRect: { ...view.sourceRect, x: 15 },
            }
          : view,
      ),
    ];
    for (const [index, views] of cases.entries()) {
      const forgedEvidence = createTurnaroundViewCoverageEvidence({
        ...withoutHash(original),
        views,
      });
      const forgedBytes = Buffer.from(
        `${JSON.stringify(forgedEvidence, null, 2)}\n`,
        "utf8",
      );
      const relativeFile = `evidence/forged-${index}.json`;
      await writeFile(
        join(fixture.sourceRoot, ...relativeFile.split("/")),
        forgedBytes,
      );
      const forgedBundle = createCharacterRigCandidateBundle({
        ...withoutHash(fixture.bundle),
        assets: [
          {
            ...fixture.bundle.assets[0]!,
            turnaroundViewCoverageEvidence: {
              schemaVersion: "1.0",
              relativeFile,
              contentHash: forgedEvidence.contentHash,
              fileContentHash: sha256(forgedBytes),
              byteLength: forgedBytes.length,
            },
          },
        ],
      });
      await expect(
        stageCharacterRigCandidateBundle({
          ...fixture,
          bundle: forgedBundle,
          stagingRoot: join(fixture.trustedStagingRoot, `forged-${index}`),
        }),
      ).rejects.toMatchObject({ code: "coverage-evidence-invalid" });
    }
    const reboundEvidence = createTurnaroundViewCoverageEvidence({
      ...withoutHash(original),
      candidateId: "another-candidate",
    });
    const reboundBytes = Buffer.from(
      `${JSON.stringify(reboundEvidence, null, 2)}\n`,
      "utf8",
    );
    const reboundRelativeFile = "evidence/rebound.json";
    await writeFile(
      join(fixture.sourceRoot, ...reboundRelativeFile.split("/")),
      reboundBytes,
    );
    const reboundBundle = createCharacterRigCandidateBundle({
      ...withoutHash(fixture.bundle),
      assets: [
        {
          ...fixture.bundle.assets[0]!,
          turnaroundViewCoverageEvidence: {
            schemaVersion: "1.0",
            relativeFile: reboundRelativeFile,
            contentHash: reboundEvidence.contentHash,
            fileContentHash: sha256(reboundBytes),
            byteLength: reboundBytes.length,
          },
        },
      ],
    });
    await expect(
      stageCharacterRigCandidateBundle({
        ...fixture,
        bundle: reboundBundle,
        stagingRoot: join(fixture.trustedStagingRoot, "rebound"),
      }),
    ).rejects.toMatchObject({ code: "coverage-evidence-invalid" });
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
    expect(
      receipt.turnaroundViewCoverageEvidence[0]?.views.map(
        (view) => view.view,
      ),
    ).toEqual(kidsBipedV1RequiredTurnaroundViews);
    expect(receipt.stagingReportContentHash).toBe(report.contentHash);
    expect(receipt.providerAuthority).toBe(false);
    expect(receipt.approvalRequired).toBe(true);
  });

  it("rejects an import receipt for all kits plus the exact current three-view turnaround", async () => {
    const fixture = await setupComplete([
      "front",
      "profile-left",
      "profile-right",
    ]);
    const stagedAt = "2026-07-18T20:05:00.000Z";
    const report = await stageCharacterRigCandidateBundle({
      ...fixture,
      stagedAt,
    });
    expect(report.status).toBe("incomplete");
    expect(report.missingItems).toEqual([]);
    expect(report.partialItems).toEqual(["turnaround-sheet"]);
    expect(report.missingSubitems).toEqual([
      { requestItemId: "turnaround-sheet", view: "three-quarter" },
      { requestItemId: "turnaround-sheet", view: "rear" },
    ]);
    expect(report.returnedItems).toHaveLength(fixture.request.items.length - 1);
    await expect(
      createVerifiedCharacterRigImportReceipt({
        ...fixture,
        report,
        importId: "import-three-view-must-fail",
        importedAt: stagedAt,
      }),
    ).rejects.toThrow(/exact request-item coverage/i);
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
        partialItems: [],
        missingItems: [],
        missingSubitems: [],
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
    ).rejects.toThrow(/missing request items|does not match|coverage/i);
  });

  it("refuses receipt creation after persisted coverage JSON bytes change", async () => {
    const fixture = await setupComplete();
    const stagedAt = "2026-07-18T20:05:00.000Z";
    const report = await stageCharacterRigCandidateBundle({ ...fixture, stagedAt });
    const coverage = report.turnaroundViewCoverageEvidence[0]!;
    await writeFile(
      join(fixture.stagingRoot, ...coverage.stagedRelativeFile.split("/")),
      Buffer.from("tampered coverage evidence"),
    );
    await expect(
      createVerifiedCharacterRigImportReceipt({
        ...fixture,
        report,
        importId: "import-tampered-coverage",
        importedAt: stagedAt,
      }),
    ).rejects.toThrow();
  });

  it("refuses receipt creation when any persisted derived view changes", async () => {
    for (const view of kidsBipedV1RequiredTurnaroundViews) {
      const fixture = await setupComplete();
      const stagedAt = "2026-07-18T20:05:00.000Z";
      const report = await stageCharacterRigCandidateBundle({ ...fixture, stagedAt });
      const stagedView = report.turnaroundViewCoverageEvidence[0]!.views.find(
        (candidate) => candidate.view === view,
      )!;
      await writeFile(
        join(fixture.stagingRoot, ...stagedView.stagedRelativeFile.split("/")),
        Buffer.from(`tampered ${view}`),
      );
      await expect(
        createVerifiedCharacterRigImportReceipt({
          ...fixture,
          report,
          importId: `import-tampered-${view}`,
          importedAt: stagedAt,
        }),
      ).rejects.toThrow();
    }
  });

  it("refuses a self-hashed staging report that relinks coverage evidence", async () => {
    const fixture = await setupComplete();
    const stagedAt = "2026-07-18T20:05:00.000Z";
    const report = await stageCharacterRigCandidateBundle({ ...fixture, stagedAt });
    const forged = createCharacterRigStagingReport({
      ...withoutHash(report),
      turnaroundViewCoverageEvidence:
        report.turnaroundViewCoverageEvidence.map((coverage) => ({
          ...coverage,
          stagedRelativeFile: "character-rig/coverage-evidence/relinked.json",
        })),
    });
    await expect(
      createVerifiedCharacterRigImportReceipt({
        ...fixture,
        report: forged,
        importId: "import-relinked-coverage",
        importedAt: stagedAt,
      }),
    ).rejects.toThrow(/not bound|coverage/i);
  });
});
