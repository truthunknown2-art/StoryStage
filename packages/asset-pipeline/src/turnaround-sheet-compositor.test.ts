import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import {
  composeKidsBipedV1TurnaroundSheet,
  type TurnaroundSheetSource,
} from "./turnaround-sheet-compositor";

const sha256 = (bytes: Uint8Array) =>
  createHash("sha256").update(bytes).digest("hex");

const evidenceRoot = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../../reports/evidence/KCAST-001",
);
const candidateRoot = resolve(evidenceRoot, "candidates");

const expectedDerivedHashes = {
  front: "9179be1665aa88e86ddede71cce064c37714f00962317681f221291349f5fccd",
  "three-quarter":
    "ccfaea3bc3d64f8d600ee0b0758a6149a604c9a520b34949d81ce07b8bea97b6",
  "profile-left":
    "02a728955134f6664487343974a90bb225b21903665d44fcc68d61ea7b57b139",
  "profile-right":
    "1e09db7a87799bc419935ee3d76bc5c58600acfb513065c182dc9dcfba4f61ce",
  rear: "21f766af57ca2648f760a6e0a11efa9d10566e53addffb489994329211f2c5a8",
} as const;

const expectedNormalization = {
  front: { sourceHeight: 749, translateX: 60 },
  "three-quarter": { sourceHeight: 789, translateX: 652 },
  "profile-left": { sourceHeight: 776, translateX: 1258 },
  "profile-right": { sourceHeight: 794, translateX: 1842 },
  rear: { sourceHeight: 775, translateX: 2344 },
} as const;

const sealedJsonArtifacts = [
  {
    relativeFile: "ollo-turnaround-normalization-receipt-h-v1.json",
    fileHash:
      "4826f000f4e3b4494e49ec2fe575a0cf6df8cfa83403212ff47582116d104118",
    contentHash:
      "08ff2f61b6b1c4a65dea29f42935aee9050cfd743445b424affd70ef63c041fa",
  },
  {
    relativeFile: "ollo-turnaround-coverage-evidence-h-v1.json",
    fileHash:
      "598cd00e26aecce5002554134ca66903ebe11e17670a809360f858cb6650b4d6",
    contentHash:
      "c9e70319de980a0045d04ef8a2897b88d55a974c89d9aa098bb7dc982449946c",
  },
  {
    relativeFile: "ollo-turnaround-candidate-bundle-h.json",
    fileHash:
      "06278221f36237d1d623c7ffecaf05edc15cf4e0d54d16f7014d2961f77557de",
    contentHash:
      "40e91d0f5dce0cdefc964cd55e3b56110b0d13082e5ffd7f5605ce2e9ed4c55a",
  },
  {
    relativeFile: "ollo-turnaround-staging-report-h.json",
    fileHash:
      "655b2f53fa18e071881e1617d8fd6578c417304452374c20d22a4813d90b5b55",
    contentHash:
      "099f0e606a8bb2b173865449f2617e3bece819d6d05cb8cdf2de7088c76c32aa",
  },
  {
    relativeFile: "ollo-turnaround-composition-evidence-h.json",
    fileHash:
      "50b421bbf21daf8bd88897fb62eb6bf332355089bf90513d9e3644f1829ff310",
    contentHash:
      "d974ae1e1d5189d3688ef8147e4f41def6157f9fbb7df44f740a216e729cc8ff",
  },
] as const;

const sourceSpecs = [
  {
    view: "front" as const,
    file: "ollo-turnaround-front-candidate-h-chroma.png",
    hash: "43aa02a2951e46020269390c5ec8494d12719dff5eedd9d46ce10ffdaf26fc12",
  },
  {
    view: "three-quarter" as const,
    file: "ollo-turnaround-three-quarter-candidate-h-chroma.png",
    hash: "cc5c35b8251e0b9308a5868849a33bcbb9196e0fa606f7189b4d6e6778acb480",
  },
  {
    view: "profile-left" as const,
    file: "ollo-turnaround-profile-left-candidate-h-chroma.png",
    hash: "9b1064bccf5c223b1e7d0b10085c565d24c085fc12ed5722eedd4966c854f214",
  },
  {
    view: "profile-right" as const,
    file: "ollo-turnaround-profile-right-candidate-h-chroma.png",
    hash: "a4103e0118c2099913e549f953414e674f798d099ed9c9f99b1555c9c2150905",
  },
  {
    view: "rear" as const,
    file: "ollo-turnaround-rear-candidate-h-chroma.png",
    hash: "97e9137ce09215f5a52b2df9ef755d70eda0ddfe024fcf2f7dcea42e60ed3455",
  },
] as const;

const candidateHFixture = async (): Promise<TurnaroundSheetSource[]> =>
  Promise.all(
    sourceSpecs.map(async (spec) => ({
      view: spec.view,
      bytes: Buffer.from(await readFile(resolve(candidateRoot, spec.file))),
      expectedContentHash: spec.hash,
      expectedDimensions: { width: 1774, height: 887 },
    })),
  );

const synthetic = async (
  color: string,
  background = { r: 255, g: 0, b: 255 },
  x = 100,
) => {
  const width = 320;
  const height = 180;
  const bytes = await sharp({
    create: { width, height, channels: 3, background },
  })
    .composite([
      {
        input: Buffer.from(
          `<svg width="320" height="180"><rect x="${x}" y="25" width="80" height="130" rx="12" fill="${color}"/></svg>`,
        ),
        left: 0,
        top: 0,
      },
    ])
    .png()
    .toBuffer();
  return { bytes, width, height };
};

describe("five-view turnaround sheet compositor", () => {
  it("pins every committed Candidate H artifact to the deterministic compositor", async () => {
    const composition = await composeKidsBipedV1TurnaroundSheet(
      await candidateHFixture(),
    );
    expect(composition.sheet.contentHash).toBe(
      "732b3a7c41b33a9f8941714066ce60c86a7ff72aea6dd288db80176be263cfec",
    );
    const committedSheet = await readFile(
      resolve(candidateRoot, "ollo-turnaround-candidate-h-five-view-alpha.png"),
    );
    expect(committedSheet.equals(composition.sheet.bytes)).toBe(true);

    for (const view of composition.sheet.views) {
      expect(view.derivedContentHash).toBe(expectedDerivedHashes[view.view]);
      const committedView = await readFile(
        resolve(
          evidenceRoot,
          `derived/ollo-turnaround-candidate-h-${view.view}.png`,
        ),
      );
      expect(committedView.equals(view.derivedBytes)).toBe(true);
    }

    for (const artifact of sealedJsonArtifacts) {
      const bytes = await readFile(
        resolve(evidenceRoot, artifact.relativeFile),
      );
      expect(sha256(bytes)).toBe(artifact.fileHash);
      expect(
        (JSON.parse(bytes.toString("utf8")) as { contentHash: string })
          .contentHash,
      ).toBe(artifact.contentHash);
    }
  }, 20_000);

  it("composes Candidate H deterministically in canonical registered cells", async () => {
    const fixture = await candidateHFixture();
    const first = await composeKidsBipedV1TurnaroundSheet(fixture);
    const retry = await composeKidsBipedV1TurnaroundSheet(fixture);

    expect(retry.sheet.bytes.equals(first.sheet.bytes)).toBe(true);
    expect(retry.sheet.contentHash).toBe(first.sheet.contentHash);
    expect(first.sheet).toEqual(
      expect.objectContaining({
        width: 2880,
        height: 832,
        alphaClass: "mixed-alpha",
      }),
    );
    expect(first.sheet.views.map((view) => view.view)).toEqual([
      "front",
      "three-quarter",
      "profile-left",
      "profile-right",
      "rear",
    ]);
    expect(
      new Set(first.sheet.views.map((view) => view.derivedContentHash)).size,
    ).toBe(5);
    for (const [index, view] of first.sheet.views.entries()) {
      const normalization = expectedNormalization[view.view];
      expect(view.transform).toBe("scale-and-translate");
      expect(view.normalizedHeight).toBe(768);
      expect(view.targetCharacterHeight).toBe(768);
      expect(view.scale).toBe(768 / normalization.sourceHeight);
      expect(view.translateX).toBe(normalization.translateX);
      expect(view.translateY).toBe(32);
      expect(view.baselineY).toBe(800);
      expect(view.resampler).toBe("lanczos3");
      expect(view.processorVersion).toBe("1.0.0");
      expect(view.sheetSourceRect).toEqual({
        x: index * 576,
        y: 0,
        width: 576,
        height: 832,
      });
      expect(
        view.sheetContentBounds.y + view.sheetContentBounds.height - 1,
      ).toBe(799);
      expect(
        Math.abs(
          (view.sheetContentBounds.x - view.sheetSourceRect.x) * 2 +
            view.sheetContentBounds.width -
            view.sheetSourceRect.width,
        ),
      ).toBeLessThanOrEqual(1);
    }
    expect(first.gate).toEqual(
      expect.objectContaining({
        exactFiveViewInventoryComplete: true,
        deterministicRegistrationComplete: true,
        identityConsistencyPassed: false,
        semanticViewAuditPassed: false,
        registrationReady: false,
        importReceiptCreated: false,
        preparedManifestCreated: false,
        providerAuthority: false,
        preparationAuthority: false,
        productionBindable: false,
        approvalRequired: true,
      }),
    );
  }, 20_000);

  it("rejects changed source bytes and dimensions", async () => {
    const changedBytes = await candidateHFixture();
    changedBytes[0]!.expectedContentHash = "0".repeat(64);
    await expect(
      composeKidsBipedV1TurnaroundSheet(changedBytes),
    ).rejects.toThrow(/source bytes changed/i);

    const changedDimensions = await candidateHFixture();
    changedDimensions[0]!.expectedDimensions.width += 1;
    await expect(
      composeKidsBipedV1TurnaroundSheet(changedDimensions),
    ).rejects.toThrow(/dimensions or codec changed/i);
  });

  it("rejects reordered or incomplete view inventories", async () => {
    const reordered = await candidateHFixture();
    [reordered[0], reordered[1]] = [reordered[1]!, reordered[0]!];
    await expect(composeKidsBipedV1TurnaroundSheet(reordered)).rejects.toThrow(
      /exact canonical/i,
    );
    await expect(
      composeKidsBipedV1TurnaroundSheet(reordered.slice(0, 4)),
    ).rejects.toThrow(/exactly five/i);
  });

  it("rejects a background outside the fixed 32px chroma gate", async () => {
    const fixture = await candidateHFixture();
    const green = await synthetic("#cc7722", { r: 0, g: 255, b: 0 });
    fixture[0] = {
      view: "front",
      bytes: green.bytes,
      expectedContentHash: sha256(green.bytes),
      expectedDimensions: { width: green.width, height: green.height },
    };
    await expect(composeKidsBipedV1TurnaroundSheet(fixture)).rejects.toThrow(
      /outside the 32px #ff00ff key gate/i,
    );
  });

  it("rejects foreground touching a source boundary", async () => {
    const fixture = await candidateHFixture();
    const touching = await synthetic("#cc7722", undefined, 0);
    fixture[0] = {
      view: "front",
      bytes: touching.bytes,
      expectedContentHash: sha256(touching.bytes),
      expectedDimensions: { width: touching.width, height: touching.height },
    };
    await expect(composeKidsBipedV1TurnaroundSheet(fixture)).rejects.toThrow(
      /touches its source boundary/i,
    );
  });

  it("rejects reused view pixels after deterministic normalization", async () => {
    const colors = ["#cc4422", "#cc4422", "#4477cc", "#44aa77", "#ccaa22"];
    const views = [
      "front",
      "three-quarter",
      "profile-left",
      "profile-right",
      "rear",
    ] as const;
    const sources = await Promise.all(
      views.map(async (view, index) => {
        const source = await synthetic(colors[index]!);
        return {
          view,
          bytes: source.bytes,
          expectedContentHash: sha256(source.bytes),
          expectedDimensions: { width: source.width, height: source.height },
        };
      }),
    );
    await expect(composeKidsBipedV1TurnaroundSheet(sources)).rejects.toThrow(
      /independently derived bytes/i,
    );
  });
});
