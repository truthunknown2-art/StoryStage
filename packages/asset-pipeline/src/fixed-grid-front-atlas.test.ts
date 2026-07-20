import { createHash } from "node:crypto";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import {
  kidsBipedV1FaceComponents,
  kidsBipedV1PartComponents,
} from "@storystage/story-engine";
import { composeKidsBipedV1FrontAtlases } from "./fixed-grid-front-atlas";
import type { KidsBipedV1FrontAtlasInput } from "./fixed-grid-front-atlas";

const sha256 = (bytes: Uint8Array) =>
  createHash("sha256").update(bytes).digest("hex");

const sheet = async (columns: number, rows: number, seed: number) => {
  const width = columns * 80 + (seed % 2);
  const height = rows * 90 + (seed % 3);
  const composites = Array.from({ length: columns * rows }, (_, index) => {
    const column = index % columns;
    const row = Math.floor(index / columns);
    const left = Math.floor((column * width) / columns);
    const top = Math.floor((row * height) / rows);
    const right = Math.floor(((column + 1) * width) / columns);
    const bottom = Math.floor(((row + 1) * height) / rows);
    const red = (seed * 31 + index * 17) % 190;
    const green = (seed * 47 + index * 23) % 190;
    const blue = (seed * 59 + index * 29) % 190;
    return {
      input: Buffer.from(
        `<svg width="${right - left}" height="${bottom - top}"><rect x="18" y="18" width="${right - left - 36}" height="${bottom - top - 36}" rx="6" fill="rgb(${red},${green},${blue})"/></svg>`,
      ),
      left,
      top,
    };
  });
  const bytes = await sharp({
    create: {
      width,
      height,
      channels: 3,
      background: { r: 255, g: 0, b: 255 },
    },
  })
    .composite(composites)
    .png()
    .toBuffer();
  return {
    bytes,
    expectedContentHash: sha256(bytes),
    expectedDimensions: { width, height },
  };
};

const fixture = async (): Promise<KidsBipedV1FrontAtlasInput> => {
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
    core: await sheet(4, 2, 1),
    limbs: await sheet(6, 2, 2),
    eyes: await sheet(7, 2, 3),
    mouths: await sheet(4, 2, 4),
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

const equalRects = (
  width: number,
  height: number,
  columns: number,
  rows: number,
) =>
  Array.from({ length: columns * rows }, (_, index) => {
    const column = index % columns;
    const row = Math.floor(index / columns);
    const left = Math.floor((column * width) / columns);
    const top = Math.floor((row * height) / rows);
    const right = Math.floor(((column + 1) * width) / columns);
    const bottom = Math.floor(((row + 1) * height) / rows);
    return { x: left, y: top, width: right - left, height: bottom - top };
  });

describe("kids-biped-v1 fixed-grid front atlas composition", () => {
  it("extracts the exact declared grids and composes canonical transparent atlases byte-identically", async () => {
    const input = await fixture();
    const first = await composeKidsBipedV1FrontAtlases(input);
    const retry = await composeKidsBipedV1FrontAtlases(input);

    expect(
      first.sources.map(({ extraction }) => extraction.declaredGrid),
    ).toEqual([
      { columns: 4, rows: 2 },
      { columns: 6, rows: 2 },
      { columns: 7, rows: 2 },
      { columns: 4, rows: 2 },
    ]);
    expect(first.atlases.partsFront.components.map(({ id }) => id)).toEqual([
      ...kidsBipedV1PartComponents,
    ]);
    expect(first.atlases.faceFront.components.map(({ id }) => id)).toEqual([
      ...kidsBipedV1FaceComponents,
    ]);
    expect(first.atlases.partsFront.components).toHaveLength(20);
    expect(first.atlases.faceFront.components).toHaveLength(22);
    expect(first.atlases.partsFront.contentHash).toBe(
      retry.atlases.partsFront.contentHash,
    );
    expect(first.atlases.faceFront.contentHash).toBe(
      retry.atlases.faceFront.contentHash,
    );
    expect(first.gate).toEqual(
      expect.objectContaining({
        classification: "untrusted-source-candidate",
        declaredCanonicalFrontInventoryComplete: true,
        visualRoleAuditPassed: false,
        registrationReady: false,
        importReceiptCreated: false,
        preparedManifestCreated: false,
        productionBindable: false,
      }),
    );
    expect(first.lowerFacePatches.contract).toEqual(
      expect.objectContaining({
        replacementMode: "exclusive",
        ownedFeatures: ["nose", "muzzle", "mouth"],
        registrationGroup: "ollo-front-lower-face-v1",
        pairwiseOutsideMouthChangeDelta: 0,
        commonAlphaPlane: true,
      }),
    );
    expect(first.lowerFacePatches.patches).toHaveLength(8);
    expect(first.lowerFacePatches.diagnostic.contentHash).toBe(
      retry.lowerFacePatches.diagnostic.contentHash,
    );
    expect(first.lowerFacePatches.diagnostic.frames).toHaveLength(6);
    expect(
      new Set(
        first.lowerFacePatches.patches.map(
          ({ alphaPlaneHash }) => alphaPlaneHash,
        ),
      ).size,
    ).toBe(1);
    for (const atlas of [first.atlases.partsFront, first.atlases.faceFront]) {
      const metadata = await sharp(atlas.bytes).metadata();
      expect(metadata.channels).toBe(4);
      for (const component of atlas.components) {
        expect(component.contentBoundsWithinCell.x).toBeGreaterThanOrEqual(4);
        expect(component.contentBoundsWithinCell.y).toBeGreaterThanOrEqual(4);
        expect(component.atlasContentBounds.x).toBeGreaterThanOrEqual(
          component.atlasCell.x + atlas.gutter,
        );
        expect(component.atlasContentBounds.y).toBeGreaterThanOrEqual(
          component.atlasCell.y + atlas.gutter,
        );
      }
    }
  });

  it("rejects changed source dimensions before extraction", async () => {
    const input = await fixture();
    input.core.expectedDimensions.width += 1;
    await expect(composeKidsBipedV1FrontAtlases(input)).rejects.toThrow(
      /dimensions or codec changed/i,
    );
  });

  it("binds an explicit non-overlapping source-rectangle manifest to the exact source", async () => {
    const input = await fixture();
    input.eyes.sourceRects = equalRects(
      input.eyes.expectedDimensions.width,
      input.eyes.expectedDimensions.height,
      7,
      2,
    );
    const result = await composeKidsBipedV1FrontAtlases(input);
    expect(result.sources[2]?.extraction).toEqual(
      expect.objectContaining({
        mode: "sealed-source-rects",
        manifestContentHash: expect.stringMatching(/^[a-f0-9]{64}$/),
      }),
    );
  });

  it("rejects overlapping source-rectangle role ownership", async () => {
    const input = await fixture();
    const rects = equalRects(
      input.eyes.expectedDimensions.width,
      input.eyes.expectedDimensions.height,
      7,
      2,
    );
    rects[1] = { ...rects[1]!, x: rects[1]!.x - 8 };
    input.eyes.sourceRects = rects;
    await expect(composeKidsBipedV1FrontAtlases(input)).rejects.toThrow(
      /source-rectangle manifest overlaps roles/i,
    );
  });

  it("rejects a source whose measured background is not the declared magenta key", async () => {
    const input = await fixture();
    const width = 320;
    const height = 180;
    const composites = Array.from({ length: 8 }, (_, index) => ({
      input: Buffer.from(
        '<svg width="80" height="90"><rect x="18" y="18" width="44" height="54" fill="#c06a30"/></svg>',
      ),
      left: (index % 4) * 80,
      top: Math.floor(index / 4) * 90,
    }));
    const bytes = await sharp({
      create: {
        width,
        height,
        channels: 3,
        background: { r: 0, g: 255, b: 0 },
      },
    })
      .composite(composites)
      .png()
      .toBuffer();
    input.core = {
      bytes,
      expectedContentHash: sha256(bytes),
      expectedDimensions: { width, height },
    };
    await expect(composeKidsBipedV1FrontAtlases(input)).rejects.toThrow(
      /not the declared #ff00ff background/i,
    );
  });

  it("rejects foreground that crosses a declared cell boundary", async () => {
    const input = await fixture();
    const width = 320;
    const height = 180;
    const bytes = await sharp({
      create: {
        width,
        height,
        channels: 3,
        background: { r: 255, g: 0, b: 255 },
      },
    })
      .composite([
        {
          input: Buffer.from(
            '<svg width="320" height="180"><rect x="0" y="20" width="30" height="30" fill="#123456"/></svg>',
          ),
          left: 0,
          top: 0,
        },
      ])
      .png()
      .toBuffer();
    input.core = {
      bytes,
      expectedContentHash: sha256(bytes),
      expectedDimensions: { width, height },
    };
    await expect(composeKidsBipedV1FrontAtlases(input)).rejects.toThrow(
      /background is not transparent|safety inset/i,
    );
  });
});
