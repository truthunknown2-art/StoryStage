import { createHash } from "node:crypto";
import {
  access,
  mkdtemp,
  mkdir,
  readFile,
  readdir,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";
import { afterEach, describe, expect, it } from "vitest";
import {
  characterRigExposureRoleSchema,
  characterRigImportReceiptSchema,
  characterRigPartRoleSchema,
  createCharacterRigAssetRequest,
  createCharacterRigCandidateBundle,
  createCharacterRigPreparationRecipe,
  createKidsBipedRigRequestItems,
  hashCanonical,
  kidsBipedV1TopologyTemplate,
  type CharacterRigAssetRequestDraft,
  type CharacterRigPreparationRecipe,
} from "@storystage/story-engine";
import {
  createVerifiedCharacterRigImportReceipt,
  stageCharacterRigCandidateBundle,
} from "./character-rig-staging";
import {
  CharacterRigPreparationError,
  prepareCharacterRigView,
} from "./character-rig-preparation";

const roots: string[] = [];
afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});

const sha256 = (bytes: Uint8Array) =>
  createHash("sha256").update(bytes).digest("hex");
const withoutHash = <T extends { contentHash: string }>(value: T) =>
  Object.fromEntries(
    Object.entries(value).filter(([key]) => key !== "contentHash"),
  ) as Omit<T, "contentHash">;

const requestDraft = (): CharacterRigAssetRequestDraft => ({
  schemaVersion: "1.0",
  requestId: "kcast-preparation-request",
  showPack: {
    id: "ollo-and-friends-kids-v1",
    version: "1.0.0",
    contentHash: "a".repeat(64),
  },
  character: { id: "ollo", displayName: "Ollo" },
  identityLock: {
    assetId: "ollo-friends-identity-board-v1",
    contentHash: "b".repeat(64),
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

const CELL = 32;
const PITCH = 40;
const SHEET_SIZE = 256;

const componentRect = (index: number) => ({
  x: (index % 6) * PITCH,
  y: Math.floor(index / 6) * PITCH,
  width: CELL,
  height: CELL,
});

const createComponentSheet = async (
  componentCount: number,
  mode: "alpha" | "chroma",
) => {
  const pixels = Buffer.alloc(SHEET_SIZE * SHEET_SIZE * 4);
  if (mode === "chroma")
    for (let offset = 0; offset < pixels.length; offset += 4) {
      pixels[offset] = 255;
      pixels[offset + 1] = 0;
      pixels[offset + 2] = 255;
      pixels[offset + 3] = 255;
    }
  for (let index = 0; index < componentCount; index += 1) {
    const rect = componentRect(index);
    for (let y = rect.y + 5; y < rect.y + rect.height - 5; y += 1)
      for (let x = rect.x + 5; x < rect.x + rect.width - 5; x += 1) {
        const offset = (y * SHEET_SIZE + x) * 4;
        pixels[offset] = 30 + (index * 7) % 180;
        pixels[offset + 1] = 180 - (index * 3) % 120;
        pixels[offset + 2] = 40 + (index * 5) % 160;
        pixels[offset + 3] = 255;
      }
  }
  return sharp(pixels, {
    raw: { width: SHEET_SIZE, height: SHEET_SIZE, channels: 4 },
  })
    .png({ compressionLevel: 9, adaptiveFiltering: false, palette: false })
    .toBuffer();
};

const buildRecipe = (
  request: ReturnType<typeof createCharacterRigAssetRequest>,
  bundle: ReturnType<typeof createCharacterRigCandidateBundle>,
  reportContentHash: string,
  receiptContentHash: string,
): CharacterRigPreparationRecipe => {
  const viewItems = request.items.filter(
    (item) => item.view === "front" && item.kind !== "turnaround-sheet",
  );
  const roleSources = new Map<
    string,
    {
      candidateId: string;
      requestItemId: string;
      stagedContentHash: string;
      rect: { x: number; y: number; width: number; height: number };
      matte:
        | { mode: "existing-alpha" }
        | {
            mode: "chroma-key";
            color: string;
            tolerance: number;
            softness: number;
            spillSuppression: number;
          };
    }
  >();
  for (const item of viewItems) {
    const asset = bundle.assets.find(
      (candidate) => candidate.requestItemId === item.id,
    )!;
    item.requiredComponents.forEach((role, index) => {
      roleSources.set(role, {
        candidateId: asset.candidateId,
        requestItemId: item.id,
        stagedContentHash: asset.contentHash,
        rect: componentRect(index),
        matte:
          item.kind === "parts-kit"
            ? { mode: "existing-alpha" }
            : {
                mode: "chroma-key",
                color: "#ff00ff",
                tolerance: 4,
                softness: 8,
                spillSuppression: 0.25,
              },
      });
    });
  }
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
  const parts = kidsBipedV1TopologyTemplate.parts.map((rule, index) => {
    return {
      id: `part-${rule.role}`,
      role: characterRigPartRoleSchema.parse(rule.role),
      source: roleSources.get(rule.role)!,
      output: {
        relativeFile: `planned/front/part-${rule.role}.png`,
        width: 40,
        height: 40,
        padding: 4,
      },
      parentId: rule.parentRole ? `part-${rule.parentRole}` : null,
      parentSocketId: rule.parentSocketId,
      childPivot: { x: 20, y: 20 },
      parentJoint: rule.parentSocketId
        ? socketPositions.get(rule.parentSocketId)!
        : null,
      restTransform: {
        x: 0,
        y: 0,
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
      },
      sockets: kidsBipedV1TopologyTemplate.parts
        .filter((child) => child.parentRole === rule.role)
        .map((child) => ({
          id: child.parentSocketId!,
          position: socketPositions.get(child.parentSocketId!)!,
        })),
      zIndex: index,
    };
  });
  const exposures = kidsBipedV1TopologyTemplate.exposures.map((rule) => ({
    id: `exposure-${rule.role}`,
    role: characterRigExposureRoleSchema.parse(rule.role),
    targetPartId: `part-${rule.targetRole}`,
    source: roleSources.get(rule.role)!,
    output: {
      relativeFile: `planned/front/exposure-${rule.role}.png`,
      width: 40,
      height: 40,
      padding: 4,
    },
    childPivot: { x: 20, y: 20 },
  }));
  return createCharacterRigPreparationRecipe({
    schemaVersion: "1.0",
    recipeId: "recipe-ollo-front-v1",
    requestId: request.requestId,
    requestContentHash: request.contentHash,
    bundleContentHash: bundle.contentHash,
    stagingReportContentHash: reportContentHash,
    importReceiptContentHash: receiptContentHash,
    identityLockContentHash: request.identityLock.contentHash,
    templateContentHash: request.rigProfile.templateContentHash,
    processor: {
      extractionAlgorithm: {
        id: "character-rig-component-preparation",
        version: "1.0.0",
      },
      imageLibrary: { id: "sharp", version: "0.34.5" },
    },
    view: "front",
    state: "proposed",
    parts,
    exposures,
    approvalRequired: true,
  });
};

const setup = async () => {
  const root = await mkdtemp(join(tmpdir(), "storystage-rig-preparation-"));
  roots.push(root);
  const sourceRoot = join(root, "source");
  const trustedStagingRoot = join(root, "trusted");
  const stagingRoot = join(trustedStagingRoot, "import-one");
  await mkdir(join(sourceRoot, "candidates"), { recursive: true });
  const request = createCharacterRigAssetRequest(requestDraft());
  const assets = [];
  for (const [index, item] of request.items.entries()) {
    const bytes =
      item.id === "parts-front"
        ? await createComponentSheet(item.requiredComponents.length, "alpha")
        : item.id === "face-front"
          ? await createComponentSheet(item.requiredComponents.length, "chroma")
          : await sharp({
              create: {
                width: SHEET_SIZE,
                height: SHEET_SIZE,
                channels: 4,
                background: {
                  r: 10 + index,
                  g: 20 + index,
                  b: 30 + index,
                  alpha: 1,
                },
              },
            })
              .png()
              .toBuffer();
    const relativeFile = `candidates/${item.id}.png`;
    await writeFile(join(sourceRoot, ...relativeFile.split("/")), bytes);
    assets.push({
      candidateId: `candidate-${item.id}`,
      requestItemId: item.id,
      relativeFile,
      contentHash: sha256(bytes),
      byteLength: bytes.length,
      mediaType: "image/png" as const,
      width: SHEET_SIZE,
      height: SHEET_SIZE,
    });
  }
  const bundle = createCharacterRigCandidateBundle({
    schemaVersion: "1.0",
    acquisitionMode: "manual-file-import",
    requestId: request.requestId,
    requestContentHash: request.contentHash,
    provenance: {
      sourceType: "generated",
      providerLabel: "test-fixture",
      sourceReference: null,
      createdAt: "2026-07-18T20:00:00.000Z",
      rightsStatement: "Synthetic deterministic test fixture.",
    },
    assets,
  });
  const stagedAt = "2026-07-18T20:05:00.000Z";
  const report = await stageCharacterRigCandidateBundle({
    request,
    bundle,
    sourceRoot,
    trustedStagingRoot,
    stagingRoot,
    stagedAt,
  });
  const receipt = await createVerifiedCharacterRigImportReceipt({
    request,
    bundle,
    report,
    trustedStagingRoot,
    stagingRoot,
    importId: "import-ollo-complete-v1",
    importedAt: stagedAt,
  });
  const recipe = buildRecipe(
    request,
    bundle,
    report.contentHash,
    receipt.contentHash,
  );
  return {
    root,
    sourceRoot,
    trustedStagingRoot,
    stagingRoot,
    request,
    bundle,
    report,
    receipt,
    recipe,
    preparedAt: "2026-07-18T20:10:00.000Z",
  };
};

describe("deterministic character rig component preparation", () => {
  it("prepares the canonical articulated alpha/chroma chain and retries byte-identically", async () => {
    const fixture = await setup();
    const input = {
      recipe: fixture.recipe,
      trustedStagingRoot: fixture.trustedStagingRoot,
      stagingRoot: fixture.stagingRoot,
      preparedAt: fixture.preparedAt,
    };
    const first = await prepareCharacterRigView(input);
    const retry = await prepareCharacterRigView(input);
    expect(retry.contentHash).toBe(first.contentHash);
    expect(first.parts).toHaveLength(29);
    expect(first.exposures).toHaveLength(13);
    expect(first.parts.every((part) => part.checks.noBoundaryTouch)).toBe(true);
    expect(first.exposures.every((exposure) => exposure.checks.normalizedRgbaPng)).toBe(true);
    const alphaOutput = await readFile(
      join(fixture.stagingRoot, ...first.parts[0]!.output.relativeFile.split("/")),
    );
    const chromaOutput = await readFile(
      join(
        fixture.stagingRoot,
        ...first.exposures[0]!.output.relativeFile.split("/"),
      ),
    );
    expect((await sharp(alphaOutput).metadata()).channels).toBe(4);
    expect((await sharp(chromaOutput).metadata()).channels).toBe(4);
  });

  it("rejects changed staged source bytes and a stale persisted receipt", async () => {
    const changed = await setup();
    const referenced = changed.report.assets.find(
      (asset) => asset.requestItemId === "parts-front",
    )!;
    await writeFile(
      join(changed.stagingRoot, ...referenced.relativeFile.split("/")),
      Buffer.from("changed staged bytes"),
    );
    await expect(
      prepareCharacterRigView({
        recipe: changed.recipe,
        trustedStagingRoot: changed.trustedStagingRoot,
        stagingRoot: changed.stagingRoot,
        preparedAt: changed.preparedAt,
      }),
    ).rejects.toMatchObject({ code: "byte-length-mismatch" });

    const stale = await setup();
    const forgedDraft = {
      ...withoutHash(stale.receipt),
      importId: "forged-import-id",
    };
    const forged = characterRigImportReceiptSchema.parse({
      ...forgedDraft,
      contentHash: hashCanonical(forgedDraft),
    });
    await writeFile(
      join(
        stale.stagingRoot,
        "character-rig",
        `import-receipt-${stale.receipt.contentHash}.json`,
      ),
      `${JSON.stringify(forged)}\n`,
    );
    await expect(
      prepareCharacterRigView({
        recipe: stale.recipe,
        trustedStagingRoot: stale.trustedStagingRoot,
        stagingRoot: stale.stagingRoot,
        preparedAt: stale.preparedAt,
      }),
    ).rejects.toMatchObject({ code: "lineage-mismatch" });
  });

  it("rejects out-of-bounds and overlapping source rectangles", async () => {
    const fixture = await setup();
    const outside = createCharacterRigPreparationRecipe({
      ...withoutHash(fixture.recipe),
      parts: fixture.recipe.parts.map((part, index) =>
        index === 0
          ? {
              ...part,
              source: {
                ...part.source,
                rect: { x: 240, y: 0, width: 32, height: 32 },
              },
            }
          : part,
      ),
    });
    await expect(
      prepareCharacterRigView({
        recipe: outside,
        trustedStagingRoot: fixture.trustedStagingRoot,
        stagingRoot: fixture.stagingRoot,
        preparedAt: fixture.preparedAt,
      }),
    ).rejects.toMatchObject({ code: "lineage-mismatch" });
    expect(() =>
      createCharacterRigPreparationRecipe({
        ...withoutHash(fixture.recipe),
        parts: fixture.recipe.parts.map((part, index) =>
          index === 1
            ? { ...part, source: fixture.recipe.parts[0]!.source }
            : part,
        ),
      }),
    ).toThrow(/overlap/i);
  });

  it("rejects empty foreground and crop-boundary contact", async () => {
    const emptyFixture = await setup();
    const empty = createCharacterRigPreparationRecipe({
      ...withoutHash(emptyFixture.recipe),
      parts: emptyFixture.recipe.parts.map((part, index) =>
        index === 0
          ? {
              ...part,
              source: {
                ...part.source,
                rect: { x: 200, y: 200, width: 32, height: 32 },
              },
            }
          : part,
      ),
    });
    await expect(
      prepareCharacterRigView({
        recipe: empty,
        trustedStagingRoot: emptyFixture.trustedStagingRoot,
        stagingRoot: emptyFixture.stagingRoot,
        preparedAt: emptyFixture.preparedAt,
      }),
    ).rejects.toMatchObject({ code: "empty-foreground" });

    const boundaryFixture = await setup();
    const boundary = createCharacterRigPreparationRecipe({
      ...withoutHash(boundaryFixture.recipe),
      parts: boundaryFixture.recipe.parts.map((part, index) =>
        index === 0
          ? {
              ...part,
              source: {
                ...part.source,
                rect: { ...part.source.rect, x: part.source.rect.x + 5 },
              },
            }
          : part,
      ),
    });
    await expect(
      prepareCharacterRigView({
        recipe: boundary,
        trustedStagingRoot: boundaryFixture.trustedStagingRoot,
        stagingRoot: boundaryFixture.stagingRoot,
        preparedAt: boundaryFixture.preparedAt,
      }),
    ).rejects.toMatchObject({ code: "boundary-touch" });
  });

  it("rejects conflicting output bytes on retry", async () => {
    const fixture = await setup();
    const input = {
      recipe: fixture.recipe,
      trustedStagingRoot: fixture.trustedStagingRoot,
      stagingRoot: fixture.stagingRoot,
      preparedAt: fixture.preparedAt,
    };
    const manifest = await prepareCharacterRigView(input);
    await writeFile(
      join(
        fixture.stagingRoot,
        ...manifest.parts[0]!.output.relativeFile.split("/"),
      ),
      Buffer.from("conflicting prepared bytes"),
    );
    await expect(prepareCharacterRigView(input)).rejects.toBeInstanceOf(
      CharacterRigPreparationError,
    );
    await expect(prepareCharacterRigView(input)).rejects.toMatchObject({
      code: "output-collision",
    });
  });

  it("does not publish a prepared directory for a recipe without receipt evidence", async () => {
    const fixture = await setup();
    await rm(
      join(
        fixture.stagingRoot,
        "character-rig",
        `import-receipt-${fixture.receipt.contentHash}.json`,
      ),
    );
    await expect(
      prepareCharacterRigView({
        recipe: fixture.recipe,
        trustedStagingRoot: fixture.trustedStagingRoot,
        stagingRoot: fixture.stagingRoot,
        preparedAt: fixture.preparedAt,
      }),
    ).rejects.toBeDefined();
    await expect(
      access(join(fixture.stagingRoot, "character-rig", "prepared")),
    ).rejects.toBeDefined();
  });

  it("preflights manifest metadata before publishing any component output", async () => {
    const fixture = await setup();
    await expect(
      prepareCharacterRigView({
        recipe: fixture.recipe,
        trustedStagingRoot: fixture.trustedStagingRoot,
        stagingRoot: fixture.stagingRoot,
        preparedAt: "not-a-timestamp",
      }),
    ).rejects.toBeDefined();
    await expect(
      access(join(fixture.stagingRoot, "character-rig", "prepared")),
    ).rejects.toBeDefined();
  });

  it("rejects tampered persisted request, bundle, and staging report evidence", async () => {
    for (const evidenceFile of [
      (fixture: Awaited<ReturnType<typeof setup>>) =>
        `request-${fixture.request.contentHash}.json`,
      (fixture: Awaited<ReturnType<typeof setup>>) =>
        `candidate-bundle-${fixture.bundle.contentHash}.json`,
      (fixture: Awaited<ReturnType<typeof setup>>) =>
        `staging-report-${fixture.report.contentHash}.json`,
    ]) {
      const fixture = await setup();
      await writeFile(
        join(fixture.stagingRoot, "character-rig", evidenceFile(fixture)),
        "{}\n",
      );
      await expect(
        prepareCharacterRigView({
          recipe: fixture.recipe,
          trustedStagingRoot: fixture.trustedStagingRoot,
          stagingRoot: fixture.stagingRoot,
          preparedAt: fixture.preparedAt,
        }),
      ).rejects.toBeDefined();
      await expect(
        access(join(fixture.stagingRoot, "character-rig", "prepared")),
      ).rejects.toBeDefined();
    }
  });

  it("rejects a preplanted prepared junction without writing outside staging", async () => {
    const fixture = await setup();
    const outside = join(fixture.root, "outside-prepared");
    await mkdir(outside);
    await symlink(
      outside,
      join(fixture.stagingRoot, "character-rig", "prepared"),
      "junction",
    );
    await expect(
      prepareCharacterRigView({
        recipe: fixture.recipe,
        trustedStagingRoot: fixture.trustedStagingRoot,
        stagingRoot: fixture.stagingRoot,
        preparedAt: fixture.preparedAt,
      }),
    ).rejects.toMatchObject({ code: "symlink-rejected" });
    expect(await readdir(outside)).toEqual([]);
  });
});
