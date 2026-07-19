import { createHash } from "node:crypto";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import {
  kidsBipedV1FaceComponents,
  kidsBipedV1PartComponents,
} from "@storystage/story-engine";
import { composeKidsBipedV1ProfileAtlases } from "./fixed-grid-front-atlas";
import type {
  KidsBipedV1ProfileAtlasInput,
  ProfileAtlasSourceInput,
} from "./fixed-grid-front-atlas";

const sha256 = (bytes: Uint8Array) =>
  createHash("sha256").update(bytes).digest("hex");

const sealedGridRects = (
  width: number,
  height: number,
  columns: number,
  rows: number,
) =>
  Array.from({ length: columns * rows }, (_, index) => {
    const column = index % columns;
    const row = Math.floor(index / columns);
    const x = Math.floor((column * width) / columns);
    const y = Math.floor((row * height) / rows);
    const right = Math.floor(((column + 1) * width) / columns);
    const bottom = Math.floor(((row + 1) * height) / rows);
    return { x, y, width: right - x, height: bottom - y };
  });

const sheet = async (
  columns: number,
  rows: number,
  seed: number,
): Promise<ProfileAtlasSourceInput> => {
  const width = columns * 80;
  const height = rows * 90;
  const sourceRects = sealedGridRects(width, height, columns, rows);
  const bytes = await sharp({
    create: {
      width,
      height,
      channels: 3,
      background: { r: 255, g: 0, b: 255 },
    },
  })
    .composite(
      sourceRects.map((rect, index) => ({
        input: Buffer.from(
          `<svg width="${rect.width}" height="${rect.height}"><rect x="18" y="18" width="${rect.width - 36}" height="${rect.height - 36}" rx="6" fill="rgb(${(seed * 31 + index * 17) % 190},${(seed * 47 + index * 23) % 190},${(seed * 59 + index * 29) % 190})"/></svg>`,
        ),
        left: rect.x,
        top: rect.y,
      })),
    )
    .png()
    .toBuffer();
  return {
    bytes,
    expectedContentHash: sha256(bytes),
    expectedDimensions: { width, height },
    sourceRects,
  };
};

const fixture = async (): Promise<KidsBipedV1ProfileAtlasInput> => {
  const baseBytes = await sharp({
    create: {
      width: 400,
      height: 300,
      channels: 3,
      background: { r: 255, g: 0, b: 255 },
    },
  })
    .composite([
      {
        input: Buffer.from(
          '<svg width="400" height="300"><rect x="60" y="50" width="280" height="200" rx="70" fill="#f2c56f"/></svg>',
        ),
        left: 0,
        top: 0,
      },
    ])
    .png()
    .toBuffer();
  return {
    core: await sheet(4, 2, 11),
    limbs: await sheet(6, 2, 12),
    eyes: await sheet(7, 2, 13),
    mouths: await sheet(4, 2, 14),
    lowerFace: {
      base: {
        bytes: baseBytes,
        expectedContentHash: sha256(baseBytes),
        expectedDimensions: { width: 400, height: 300 },
      },
      baseSourceRect: { x: 40, y: 30, width: 320, height: 240 },
      pivot: { x: 160, y: 80 },
      noseAnchor: { x: 160, y: 80 },
      mouthChangeBounds: { x: 80, y: 100, width: 160, height: 100 },
    },
  };
};

describe("kids-biped-v1 fixed-grid profile atlas composition", () => {
  it.each(["profile-left", "profile-right"] as const)(
    "composes a deterministic %s diagnostic with exact role inventories and no authority",
    async (view) => {
      const input = await fixture();
      const first = await composeKidsBipedV1ProfileAtlases(view, input);
      const retry = await composeKidsBipedV1ProfileAtlases(view, input);

      expect(first.view).toBe(view);
      expect(first.processor).toEqual(
        expect.objectContaining({
          id: "kids-biped-v1-fixed-grid-profile-atlas",
          maximumAllowedMeasuredKeyDistance: 32,
        }),
      );
      expect(first.sources).toHaveLength(4);
      expect(
        first.sources.every(
          ({ extraction }) => extraction.mode === "sealed-source-rects",
        ),
      ).toBe(true);
      expect(first.sources.map(({ atlas }) => atlas)).toEqual([
        `parts-${view}`,
        `parts-${view}`,
        `face-${view}`,
        `face-${view}`,
      ]);
      expect(first.atlases.partsProfile.components.map(({ id }) => id)).toEqual(
        [...kidsBipedV1PartComponents],
      );
      expect(first.atlases.faceProfile.components.map(({ id }) => id)).toEqual([
        ...kidsBipedV1FaceComponents,
      ]);
      expect(first.atlases.partsProfile.components).toHaveLength(20);
      expect(first.atlases.faceProfile.components).toHaveLength(22);
      expect(first.atlases.partsProfile.contentHash).toBe(
        retry.atlases.partsProfile.contentHash,
      );
      expect(first.atlases.faceProfile.contentHash).toBe(
        retry.atlases.faceProfile.contentHash,
      );
      expect(first.lowerFacePatches.contract).toEqual(
        expect.objectContaining({
          replacementMode: "exclusive",
          ownedFeatures: ["nose", "muzzle", "mouth"],
          registrationGroup: `ollo-${view}-lower-face-v1`,
          pairwiseOutsideMouthChangeDelta: 0,
          commonAlphaPlane: true,
        }),
      );
      expect(first.gate).toEqual({
        classification: "untrusted-source-candidate",
        previewClassification: "source-candidate-diagnostic-only",
        declaredCanonicalProfileInventoryComplete: true,
        visualRoleAuditPassed: false,
        registrationReady: false,
        importReceiptCreated: false,
        preparedManifestCreated: false,
        providerAuthority: false,
        preparationAuthority: false,
        productionBindable: false,
        approvalRequired: true,
      });
    },
  );

  it("fails closed when a profile source exceeds the existing 32px canonical-key ceiling", async () => {
    const input = await fixture();
    const width = 320;
    const height = 180;
    const sourceRects = sealedGridRects(width, height, 4, 2);
    const bytes = await sharp({
      create: {
        width,
        height,
        channels: 3,
        background: { r: 232, g: 6, b: 220 },
      },
    })
      .composite(
        sourceRects.map((rect) => ({
          input: Buffer.from(
            '<svg width="80" height="90"><rect x="18" y="18" width="44" height="54" fill="#c06a30"/></svg>',
          ),
          left: rect.x,
          top: rect.y,
        })),
      )
      .png()
      .toBuffer();
    input.core = {
      bytes,
      expectedContentHash: sha256(bytes),
      expectedDimensions: { width, height },
      maximumMeasuredKeyDistance: 32,
      sourceRects,
    };

    await expect(
      composeKidsBipedV1ProfileAtlases("profile-left", input),
    ).rejects.toThrow(/not the declared #ff00ff background/i);
  });

  it("fails closed when an untyped caller omits sealed profile source rectangles", async () => {
    const input = await fixture();
    const untyped = input as unknown as {
      core: { sourceRects?: readonly unknown[] };
    };
    delete untyped.core.sourceRects;

    await expect(
      composeKidsBipedV1ProfileAtlases("profile-left", input),
    ).rejects.toThrow(
      /profile profile-left core requires sealed source rectangles/i,
    );
  });
});
