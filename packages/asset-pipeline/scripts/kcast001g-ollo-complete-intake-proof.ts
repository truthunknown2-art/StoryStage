import { createHash } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import {
  characterRigAssetRequestSchema,
  createCharacterRigCandidateBundle,
  hashCanonical,
  kidsBipedV1FaceComponents,
  kidsBipedV1PartComponents,
  turnaroundViewCoverageEvidenceSchema,
} from "@storystage/story-engine";
import { removeBorderChromaKey } from "../src/chroma-key";
import {
  composeKidsBipedV1ProfileAtlases,
  type FrontAtlasSourceRect,
  type KidsBipedV1ProfileAtlasInput,
  type ProfileAtlasSourceInput,
} from "../src/fixed-grid-front-atlas";
import {
  createVerifiedCharacterRigImportReceipt,
  stageCharacterRigCandidateBundle,
} from "../src/character-rig-staging";

const workspaceRoot = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../..",
);
const evidenceRoot = resolve(workspaceRoot, "reports/evidence/KCAST-001");
const candidateRoot = resolve(evidenceRoot, "candidates");
const privateProofRoot = resolve(
  workspaceRoot,
  "tmp/kcast001g-ollo-complete-intake-proof",
);
const trustedStagingRoot = resolve(privateProofRoot, "trusted");
const stagingRoot = resolve(trustedStagingRoot, "ollo-complete-source-set-i");
const stagedAt = "2026-07-19T13:15:00.000Z";
const importedAt = "2026-07-19T13:16:00.000Z";
const maximumCanonicalKeyDistance = 32;
const extractionPadding = 8;

const sha256 = (bytes: Uint8Array) =>
  createHash("sha256").update(bytes).digest("hex");

type ProfileView = "profile-left" | "profile-right";
type SheetId = "core" | "limbs" | "eyes" | "mouths" | "lowerFace";
type AtlasSheetId = Exclude<SheetId, "lowerFace">;
type ContentBounds = readonly [
  x: number,
  y: number,
  width: number,
  height: number,
];

const sourceSpecs = {
  "profile-left": {
    core: {
      file: "ollo-parts-profile-left-core-candidate-i-chroma.png",
      contentHash:
        "7a813648051c7b76af20557d61d5595e901a4046f15186718ed55a74026889ee",
      byteLength: 1_833_039,
      width: 1536,
      height: 1024,
    },
    limbs: {
      file: "ollo-parts-profile-left-limbs-candidate-i-chroma.png",
      contentHash:
        "d6f44d516f4813bbdf16b7e41cd4ddec162a12ee8254919fdbb5c031fe1d716a",
      byteLength: 1_366_144,
      width: 1672,
      height: 941,
    },
    eyes: {
      file: "ollo-face-profile-left-eyes-candidate-i-chroma.png",
      contentHash:
        "6dcb91b435d1f45a9e29ee0a7148b2b24ab628bba5f7519386841767483b5e3e",
      byteLength: 1_153_967,
      width: 1774,
      height: 887,
    },
    mouths: {
      file: "ollo-face-profile-left-mouth-overlays-candidate-i-chroma.png",
      contentHash:
        "2cfecd2fb72f0490c6578f19a5b2b68bd934b921cdee16536753ed64800bdda2",
      byteLength: 1_010_358,
      width: 1672,
      height: 941,
    },
    lowerFace: {
      file: "ollo-face-profile-left-lower-base-candidate-i-chroma.png",
      contentHash:
        "5b3a26b527c982cfcdfa0541b1aa870b35dbbd562c37a3dc5e0bc9aae64b949f",
      byteLength: 1_108_027,
      width: 1254,
      height: 1254,
    },
  },
  "profile-right": {
    core: {
      file: "ollo-parts-profile-right-core-candidate-i-chroma.png",
      contentHash:
        "9df006173d380b62874c47cad57a69e3f2a57f05d019de79a3907a2a4271530a",
      byteLength: 1_665_621,
      width: 1536,
      height: 1024,
    },
    limbs: {
      file: "ollo-parts-profile-right-limbs-candidate-i-chroma.png",
      contentHash:
        "d35451eba6c0d0ca918851e07ce80b32374a19007173e87052709a2d7b0049c5",
      byteLength: 1_424_701,
      width: 1672,
      height: 941,
    },
    eyes: {
      file: "ollo-face-profile-right-eyes-candidate-i-chroma.png",
      contentHash:
        "3e15208cacc0af31a587b87cb3ac24d3733f41f01e6e52fa1c982bafa74882f2",
      byteLength: 1_186_347,
      width: 1774,
      height: 887,
    },
    mouths: {
      file: "ollo-face-profile-right-mouth-overlays-candidate-i-chroma.png",
      contentHash:
        "7f125ebdcf5d8096ba9b2e6e001e10dc4c88bbf0d271ec99a76bed11a7f93592",
      byteLength: 1_067_868,
      width: 1672,
      height: 941,
    },
    lowerFace: {
      file: "ollo-face-profile-right-lower-base-candidate-i-chroma.png",
      contentHash:
        "1428225cc23c6ead2424ad07ab158ada58a210c4e5f2fbd152151585da68e286",
      byteLength: 1_028_892,
      width: 1448,
      height: 1086,
    },
  },
} as const;

const connectedContentBounds: Record<
  ProfileView,
  Record<AtlasSheetId, readonly ContentBounds[]>
> = {
  "profile-left": {
    core: [
      [144, 103, 221, 365],
      [513, 230, 183, 238],
      [845, 115, 321, 309],
      [1278, 263, 145, 159],
      [152, 561, 143, 335],
      [493, 560, 144, 336],
      [812, 576, 235, 316],
      [1164, 583, 284, 288],
    ],
    limbs: [
      [143, 114, 116, 289],
      [402, 131, 102, 264],
      [626, 223, 155, 169],
      [926, 115, 117, 289],
      [1187, 133, 102, 263],
      [1419, 224, 155, 170],
      [112, 519, 146, 296],
      [409, 535, 99, 278],
      [605, 651, 181, 150],
      [906, 517, 149, 298],
      [1197, 536, 97, 277],
      [1393, 657, 187, 143],
    ],
    eyes: [
      [99, 159, 120, 227],
      [327, 159, 121, 226],
      [531, 210, 210, 150],
      [822, 305, 198, 49],
      [1097, 310, 170, 31],
      [1351, 260, 151, 75],
      [1585, 211, 130, 142],
      [123, 565, 81, 163],
      [335, 567, 81, 161],
      [539, 589, 183, 121],
      [840, 672, 156, 36],
      [1110, 672, 145, 24],
      [1346, 627, 132, 63],
      [1561, 582, 107, 126],
    ],
    mouths: [
      [185, 271, 80, 30],
      [542, 274, 141, 44],
      [935, 242, 113, 115],
      [1302, 196, 162, 170],
      [181, 646, 92, 36],
      [549, 597, 132, 113],
      [953, 588, 78, 129],
      [1337, 588, 96, 128],
    ],
  },
  "profile-right": {
    core: [
      [106, 111, 294, 357],
      [495, 250, 228, 214],
      [825, 126, 324, 319],
      [1262, 319, 140, 126],
      [178, 545, 151, 344],
      [472, 548, 165, 336],
      [798, 583, 189, 304],
      [1123, 584, 264, 299],
    ],
    limbs: [
      [126, 86, 118, 335],
      [391, 108, 98, 300],
      [603, 176, 167, 209],
      [947, 87, 119, 334],
      [1209, 105, 97, 302],
      [1416, 181, 168, 204],
      [119, 496, 138, 327],
      [381, 514, 103, 300],
      [609, 634, 193, 163],
      [936, 495, 140, 327],
      [1200, 515, 102, 299],
      [1412, 642, 194, 164],
    ],
    eyes: [
      [86, 176, 142, 218],
      [318, 179, 136, 214],
      [522, 207, 255, 168],
      [848, 268, 199, 93],
      [1111, 333, 181, 38],
      [1371, 277, 149, 74],
      [1583, 213, 139, 138],
      [117, 569, 83, 158],
      [318, 567, 85, 161],
      [538, 582, 201, 126],
      [842, 606, 174, 80],
      [1113, 673, 165, 31],
      [1372, 611, 141, 75],
      [1569, 562, 126, 142],
    ],
    mouths: [
      [195, 294, 124, 36],
      [558, 196, 99, 189],
      [878, 234, 254, 127],
      [1336, 285, 141, 36],
      [201, 588, 89, 126],
      [516, 597, 190, 111],
      [925, 585, 184, 124],
      [1341, 600, 95, 101],
    ],
  },
};

const lowerFaceContentBounds = {
  "profile-left": [324, 453, 567, 361],
  "profile-right": [492, 409, 512, 256],
} as const satisfies Record<ProfileView, ContentBounds>;

const expandBounds = ([x, y, width, height]: ContentBounds) => ({
  x: x - extractionPadding,
  y: y - extractionPadding,
  width: width + extractionPadding * 2,
  height: height + extractionPadding * 2,
});

const exactConnectedBounds = async (bytes: Buffer) => {
  const keyed = await removeBorderChromaKey(bytes);
  const decoded = await sharp(keyed.bytes)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width, height, channels } = decoded.info;
  if (channels !== 4) throw new Error("Connected-content audit requires RGBA.");
  const foreground = new Uint8Array(width * height);
  for (let index = 0; index < foreground.length; index += 1)
    foreground[index] = decoded.data[index * 4 + 3]! > 0 ? 1 : 0;
  const visited = new Uint8Array(foreground.length);
  const stack: number[] = [];
  const bounds: ContentBounds[] = [];
  for (let index = 0; index < foreground.length; index += 1) {
    if (!foreground[index] || visited[index]) continue;
    let minimumX = width;
    let minimumY = height;
    let maximumX = -1;
    let maximumY = -1;
    visited[index] = 1;
    stack.push(index);
    while (stack.length > 0) {
      const pixel = stack.pop()!;
      const y = Math.floor(pixel / width);
      const x = pixel - y * width;
      minimumX = Math.min(minimumX, x);
      minimumY = Math.min(minimumY, y);
      maximumX = Math.max(maximumX, x);
      maximumY = Math.max(maximumY, y);
      for (let offsetY = -1; offsetY <= 1; offsetY += 1)
        for (let offsetX = -1; offsetX <= 1; offsetX += 1) {
          if (offsetX === 0 && offsetY === 0) continue;
          const nextX = x + offsetX;
          const nextY = y + offsetY;
          if (nextX < 0 || nextY < 0 || nextX >= width || nextY >= height)
            continue;
          const next = nextY * width + nextX;
          if (foreground[next] && !visited[next]) {
            visited[next] = 1;
            stack.push(next);
          }
        }
    }
    bounds.push([
      minimumX,
      minimumY,
      maximumX - minimumX + 1,
      maximumY - minimumY + 1,
    ]);
  }
  return { keyed, bounds };
};

const rectKey = (rect: ContentBounds) => rect.join(",");
const assertExactConnectedBounds = (
  actual: readonly ContentBounds[],
  expected: readonly ContentBounds[],
  label: string,
) => {
  if (
    actual.length !== expected.length ||
    expected.some(
      (expectedRect) =>
        !actual.some(
          (actualRect) => rectKey(actualRect) === rectKey(expectedRect),
        ),
    )
  )
    throw new Error(
      `${label} connected-content bounds changed: ${JSON.stringify(actual)}.`,
    );
};

const opaqueRectangleAudit = async (
  keyedBytes: Buffer,
  required: { width: number; height: number },
  declared?: FrontAtlasSourceRect,
) => {
  const decoded = await sharp(keyedBytes)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width, height } = decoded.info;
  const stride = width + 1;
  const nonOpaquePrefix = new Uint32Array(stride * (height + 1));
  for (let y = 0; y < height; y += 1) {
    let rowNonOpaque = 0;
    for (let x = 0; x < width; x += 1) {
      if (decoded.data[(y * width + x) * 4 + 3] !== 255) rowNonOpaque += 1;
      nonOpaquePrefix[(y + 1) * stride + x + 1] =
        nonOpaquePrefix[y * stride + x + 1]! + rowNonOpaque;
    }
  }
  const nonOpaquePixels = (rect: FrontAtlasSourceRect) =>
    nonOpaquePrefix[(rect.y + rect.height) * stride + rect.x + rect.width]! -
    nonOpaquePrefix[rect.y * stride + rect.x + rect.width]! -
    nonOpaquePrefix[(rect.y + rect.height) * stride + rect.x]! +
    nonOpaquePrefix[rect.y * stride + rect.x]!;
  let firstMatch: FrontAtlasSourceRect | null = null;
  for (let y = 0; y + required.height <= height && !firstMatch; y += 1)
    for (let x = 0; x + required.width <= width; x += 1) {
      const rect = { x, y, ...required };
      if (nonOpaquePixels(rect) === 0) {
        firstMatch = rect;
        break;
      }
    }
  return {
    required,
    firstMatch,
    declared,
    declaredFullyOpaque: declared ? nonOpaquePixels(declared) === 0 : null,
  };
};

const sourceBytes = new Map<string, Buffer>();
const sourceAudits: Array<Record<string, unknown>> = [];
for (const view of ["profile-left", "profile-right"] as const)
  for (const sheetId of [
    "core",
    "limbs",
    "eyes",
    "mouths",
    "lowerFace",
  ] as const) {
    const spec = sourceSpecs[view][sheetId];
    const bytes = await readFile(resolve(candidateRoot, spec.file));
    if (bytes.length !== spec.byteLength || sha256(bytes) !== spec.contentHash)
      throw new Error(`Candidate I source bytes changed: ${spec.file}.`);
    const metadata = await sharp(bytes).metadata();
    if (
      metadata.format !== "png" ||
      metadata.width !== spec.width ||
      metadata.height !== spec.height
    )
      throw new Error(`Candidate I source dimensions changed: ${spec.file}.`);
    const connected = await exactConnectedBounds(bytes);
    const expectedBounds =
      sheetId === "lowerFace"
        ? [lowerFaceContentBounds[view]]
        : connectedContentBounds[view][sheetId];
    assertExactConnectedBounds(
      connected.bounds,
      expectedBounds,
      `${view} ${sheetId}`,
    );
    const measuredKeyDistance = Math.sqrt(
      (255 - connected.keyed.measuredKey.red) ** 2 +
        connected.keyed.measuredKey.green ** 2 +
        (255 - connected.keyed.measuredKey.blue) ** 2,
    );
    if (measuredKeyDistance > maximumCanonicalKeyDistance)
      throw new Error(`${view} ${sheetId} exceeds the 32px chroma ceiling.`);
    sourceBytes.set(`${view}:${sheetId}`, bytes);
    sourceAudits.push({
      view,
      sheetId,
      relativeFile: `candidates/${spec.file}`,
      contentHash: spec.contentHash,
      byteLength: spec.byteLength,
      dimensions: { width: spec.width, height: spec.height },
      measuredKey: connected.keyed.measuredKey,
      measuredKeyDistance,
      maximumCanonicalKeyDistance,
      connectedContentBounds: expectedBounds.map(([x, y, width, height]) => ({
        x,
        y,
        width,
        height,
      })),
      connectedComponentCount: expectedBounds.length,
      chromaGatePassed: true,
    });
  }

const rightLowerFaceRaw = sourceBytes.get("profile-right:lowerFace")!;
const rightLowerFaceRawKeyed = await removeBorderChromaKey(rightLowerFaceRaw);
const minimumSharedMouthPlane = { width: 262, height: 197 } as const;
const unnormalizedRightOpaqueAudit = await opaqueRectangleAudit(
  rightLowerFaceRawKeyed.bytes,
  minimumSharedMouthPlane,
);
if (unnormalizedRightOpaqueAudit.firstMatch !== null)
  throw new Error(
    "Raw right lower-face unexpectedly contains a sufficient common opaque plane.",
  );
const normalizeRightLowerFace = () =>
  sharp(rightLowerFaceRaw)
    .resize({ width: 2172, height: 1629, kernel: "lanczos3" })
    .png({
      compressionLevel: 9,
      adaptiveFiltering: false,
      palette: false,
      effort: 10,
    })
    .toBuffer();
const rightLowerFaceNormalized = await normalizeRightLowerFace();
const rightLowerFaceNormalizedRetry = await normalizeRightLowerFace();
if (
  !rightLowerFaceNormalized.equals(rightLowerFaceNormalizedRetry) ||
  rightLowerFaceNormalized.length !== 1_939_197 ||
  sha256(rightLowerFaceNormalized) !==
    "a3717dc5f87ff911124fcc46481dc0fb588c6e061035b6e44a5364b06010a124"
)
  throw new Error("Candidate I right lower-face normalization changed.");
const normalizedRightConnected = await exactConnectedBounds(
  rightLowerFaceNormalized,
);
const normalizedRightMeasuredKeyDistance = Math.sqrt(
  (255 - normalizedRightConnected.keyed.measuredKey.red) ** 2 +
    normalizedRightConnected.keyed.measuredKey.green ** 2 +
    (255 - normalizedRightConnected.keyed.measuredKey.blue) ** 2,
);
if (normalizedRightMeasuredKeyDistance > maximumCanonicalKeyDistance)
  throw new Error(
    "Normalized right lower-face exceeds the 32px chroma ceiling.",
  );
const normalizedRightOpaqueAudit = await opaqueRectangleAudit(
  normalizedRightConnected.keyed.bytes,
  minimumSharedMouthPlane,
  { x: 804, y: 720, width: 380, height: 210 },
);
if (!normalizedRightOpaqueAudit.declaredFullyOpaque)
  throw new Error("Normalized right lower-face opaque patch plane changed.");
assertExactConnectedBounds(
  normalizedRightConnected.bounds,
  [[738, 614, 768, 384]],
  "profile-right normalized lowerFace",
);
const lowerFaceCompositionSources = {
  "profile-left": {
    bytes: sourceBytes.get("profile-left:lowerFace")!,
    contentHash: sourceSpecs["profile-left"].lowerFace.contentHash,
    byteLength: sourceSpecs["profile-left"].lowerFace.byteLength,
    width: sourceSpecs["profile-left"].lowerFace.width,
    height: sourceSpecs["profile-left"].lowerFace.height,
    relativeFile:
      "candidates/ollo-face-profile-left-lower-base-candidate-i-chroma.png",
    transform: "none" as const,
    sourceContentHash: sourceSpecs["profile-left"].lowerFace.contentHash,
    connectedContentBounds: lowerFaceContentBounds["profile-left"],
  },
  "profile-right": {
    bytes: rightLowerFaceNormalized,
    contentHash:
      "a3717dc5f87ff911124fcc46481dc0fb588c6e061035b6e44a5364b06010a124",
    byteLength: 1_939_197,
    width: 2172,
    height: 1629,
    relativeFile:
      "derived/ollo-face-profile-right-lower-base-candidate-i-normalized-chroma.png",
    transform: "uniform-scale-1.5-lanczos3" as const,
    sourceContentHash: sourceSpecs["profile-right"].lowerFace.contentHash,
    connectedContentBounds: [738, 614, 768, 384] as const,
  },
};

const profileSource = (
  view: ProfileView,
  sheetId: AtlasSheetId,
): ProfileAtlasSourceInput => {
  const spec = sourceSpecs[view][sheetId];
  return {
    bytes: sourceBytes.get(`${view}:${sheetId}`)!,
    expectedContentHash: spec.contentHash,
    expectedDimensions: { width: spec.width, height: spec.height },
    maximumMeasuredKeyDistance: 32,
    sourceRects: connectedContentBounds[view][sheetId].map(expandBounds),
  };
};

const lowerFaceRegistration = {
  "profile-left": {
    baseSourceRect: { x: 300, y: 430, width: 620, height: 410 },
    pivot: { x: 310, y: 205 },
    noseAnchor: { x: 80, y: 90 },
    mouthChangeBounds: { x: 180, y: 160, width: 300, height: 180 },
  },
  "profile-right": {
    baseSourceRect: { x: 702, y: 578, width: 840, height: 465 },
    pivot: { x: 420, y: 232 },
    noseAnchor: { x: 750, y: 130 },
    mouthChangeBounds: { x: 102, y: 142, width: 380, height: 210 },
  },
} as const;

const profileInput = (view: ProfileView): KidsBipedV1ProfileAtlasInput => {
  const lowerFace = lowerFaceCompositionSources[view];
  return {
    core: profileSource(view, "core"),
    limbs: profileSource(view, "limbs"),
    eyes: profileSource(view, "eyes"),
    mouths: profileSource(view, "mouths"),
    lowerFace: {
      base: {
        bytes: lowerFace.bytes,
        expectedContentHash: lowerFace.contentHash,
        expectedDimensions: {
          width: lowerFace.width,
          height: lowerFace.height,
        },
        maximumMeasuredKeyDistance: 32,
      },
      ...lowerFaceRegistration[view],
    },
  };
};

const unnormalizedRightInput = profileInput("profile-right");
unnormalizedRightInput.lowerFace = {
  base: {
    bytes: rightLowerFaceRaw,
    expectedContentHash: sourceSpecs["profile-right"].lowerFace.contentHash,
    expectedDimensions: {
      width: sourceSpecs["profile-right"].lowerFace.width,
      height: sourceSpecs["profile-right"].lowerFace.height,
    },
    maximumMeasuredKeyDistance: 32,
  },
  baseSourceRect: { x: 468, y: 385, width: 560, height: 310 },
  pivot: { x: 280, y: 155 },
  noseAnchor: { x: 510, y: 80 },
  mouthChangeBounds: { x: 100, y: 90, width: 262, height: 197 },
};
let unnormalizedRightRejection = "";
try {
  await composeKidsBipedV1ProfileAtlases(
    "profile-right",
    unnormalizedRightInput,
  );
} catch (error) {
  unnormalizedRightRejection =
    error instanceof Error ? error.message : String(error);
}
if (!/opaque base alpha plane/i.test(unnormalizedRightRejection))
  throw new Error(
    `Raw right lower-face did not fail the unchanged exclusive-patch alpha contract: ${unnormalizedRightRejection}`,
  );

const compositions = {} as Record<
  ProfileView,
  Awaited<ReturnType<typeof composeKidsBipedV1ProfileAtlases>>
>;
for (const view of ["profile-left", "profile-right"] as const) {
  const first = await composeKidsBipedV1ProfileAtlases(
    view,
    profileInput(view),
  );
  const retry = await composeKidsBipedV1ProfileAtlases(
    view,
    profileInput(view),
  );
  if (
    !first.atlases.partsProfile.bytes.equals(
      retry.atlases.partsProfile.bytes,
    ) ||
    !first.atlases.faceProfile.bytes.equals(retry.atlases.faceProfile.bytes) ||
    !first.lowerFacePatches.diagnostic.bytes.equals(
      retry.lowerFacePatches.diagnostic.bytes,
    )
  )
    throw new Error(`${view} Candidate I composition is not deterministic.`);
  if (
    first.atlases.partsProfile.components.length !== 20 ||
    first.atlases.faceProfile.components.length !== 22 ||
    first.atlases.partsProfile.components.map(({ id }) => id).join(",") !==
      kidsBipedV1PartComponents.join(",") ||
    first.atlases.faceProfile.components.map(({ id }) => id).join(",") !==
      kidsBipedV1FaceComponents.join(",")
  )
    throw new Error(`${view} Candidate I inventory is not canonical.`);
  if (
    first.lowerFacePatches.contract.replacementMode !== "exclusive" ||
    first.lowerFacePatches.contract.pairwiseOutsideMouthChangeDelta !== 0 ||
    !first.lowerFacePatches.contract.commonAlphaPlane ||
    first.lowerFacePatches.patches.length !== 8 ||
    first.lowerFacePatches.patches.some(
      ({ outsideMouthChangeDeltaFromBase, alphaPlaneHash }) =>
        outsideMouthChangeDeltaFromBase !== 0 ||
        alphaPlaneHash !== first.lowerFacePatches.base.alphaPlaneHash,
    )
  )
    throw new Error(`${view} Candidate I lower-face contract changed.`);
  if (
    first.gate.visualRoleAuditPassed ||
    first.gate.registrationReady ||
    first.gate.importReceiptCreated ||
    first.gate.preparedManifestCreated ||
    first.gate.providerAuthority ||
    first.gate.preparationAuthority ||
    first.gate.productionBindable
  )
    throw new Error(`${view} Candidate I unexpectedly gained authority.`);
  compositions[view] = first;
}

const transparentRoleCrop = async (
  keyedBytes: Buffer,
  bounds: ContentBounds,
) => {
  const [x, y, width, height] = bounds;
  const decoded = await sharp(keyedBytes)
    .extract({ left: x, top: y, width, height })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  if (
    decoded.info.width !== width ||
    decoded.info.height !== height ||
    decoded.info.channels !== 4
  )
    throw new Error("Candidate I role crop decoded unexpectedly.");
  for (let pixel = 0; pixel < width * height; pixel += 1)
    if (decoded.data[pixel * 4 + 3] === 0) {
      decoded.data[pixel * 4] = 0;
      decoded.data[pixel * 4 + 1] = 0;
      decoded.data[pixel * 4 + 2] = 0;
    }
  return { pixels: decoded.data, width, height };
};

const canonicalRoleCanvas = (
  role: { pixels: Buffer; width: number; height: number },
  width: number,
  height: number,
) => {
  const canvas = Buffer.alloc(width * height * 4);
  const translateX = Math.floor((width - role.width) / 2);
  const translateY = Math.floor((height - role.height) / 2);
  for (let y = 0; y < role.height; y += 1)
    role.pixels.copy(
      canvas,
      ((translateY + y) * width + translateX) * 4,
      y * role.width * 4,
      (y + 1) * role.width * 4,
    );
  return { pixels: canvas, translateX, translateY };
};

const mirrorRgbaCanvas = (pixels: Buffer, width: number, height: number) => {
  const mirrored = Buffer.alloc(pixels.length);
  for (let y = 0; y < height; y += 1)
    for (let x = 0; x < width; x += 1) {
      const source = (y * width + x) * 4;
      const target = (y * width + (width - x - 1)) * 4;
      pixels.copy(mirrored, target, source, source + 4);
    }
  return mirrored;
};

const handednessEvidence = [];
for (const sheetId of ["core", "limbs", "eyes", "mouths"] as const) {
  const leftKeyed = await removeBorderChromaKey(
    sourceBytes.get(`profile-left:${sheetId}`)!,
  );
  const rightKeyed = await removeBorderChromaKey(
    sourceBytes.get(`profile-right:${sheetId}`)!,
  );
  const leftRoles = compositions["profile-left"].sources.find(
    ({ id }) => id === sheetId,
  )!.components;
  const rightRoles = compositions["profile-right"].sources.find(
    ({ id }) => id === sheetId,
  )!.components;
  if (leftRoles.join(",") !== rightRoles.join(","))
    throw new Error(`${sheetId} Candidate I role order changed between views.`);
  for (let index = 0; index < leftRoles.length; index += 1) {
    const role = leftRoles[index]!;
    const leftBounds = connectedContentBounds["profile-left"][sheetId][index]!;
    const rightBounds =
      connectedContentBounds["profile-right"][sheetId][index]!;
    const leftCrop = await transparentRoleCrop(leftKeyed.bytes, leftBounds);
    const rightCrop = await transparentRoleCrop(rightKeyed.bytes, rightBounds);
    const canvasWidth = Math.max(leftCrop.width, rightCrop.width);
    const canvasHeight = Math.max(leftCrop.height, rightCrop.height);
    const leftCanvas = canonicalRoleCanvas(leftCrop, canvasWidth, canvasHeight);
    const rightCanvas = canonicalRoleCanvas(
      rightCrop,
      canvasWidth,
      canvasHeight,
    );
    const mirroredLeftPixels = mirrorRgbaCanvas(
      leftCanvas.pixels,
      canvasWidth,
      canvasHeight,
    );
    const directDistinct =
      sha256(leftCanvas.pixels) !== sha256(rightCanvas.pixels);
    const notHorizontalFlip =
      sha256(mirroredLeftPixels) !== sha256(rightCanvas.pixels);
    if (!directDistinct || !notHorizontalFlip)
      throw new Error(
        `${sheetId}/${role} Candidate I foreground roles are duplicated or exact horizontal flips.`,
      );
    handednessEvidence.push({
      sheetId,
      role,
      normalization: {
        source: "border-median-soft-distance keyed role crop",
        canvas: "pairwise-max-dimensions",
        registration: "center-x-center-y",
        transparentPixelRgb: "zeroed",
        transform: "left-horizontal-flip-only-for-comparison",
      },
      left: {
        sourceBounds: expandBounds(leftBounds),
        connectedContentBounds: {
          x: leftBounds[0],
          y: leftBounds[1],
          width: leftBounds[2],
          height: leftBounds[3],
        },
        cropPixelHash: sha256(leftCrop.pixels),
        canonicalPixelHash: sha256(leftCanvas.pixels),
        translateX: leftCanvas.translateX,
        translateY: leftCanvas.translateY,
      },
      right: {
        sourceBounds: expandBounds(rightBounds),
        connectedContentBounds: {
          x: rightBounds[0],
          y: rightBounds[1],
          width: rightBounds[2],
          height: rightBounds[3],
        },
        cropPixelHash: sha256(rightCrop.pixels),
        canonicalPixelHash: sha256(rightCanvas.pixels),
        translateX: rightCanvas.translateX,
        translateY: rightCanvas.translateY,
      },
      canonicalCanvas: { width: canvasWidth, height: canvasHeight },
      mirroredLeftCanonicalPixelHash: sha256(mirroredLeftPixels),
      directDistinct,
      notHorizontalFlip,
      semanticViewAuditPassed: false,
    });
  }
}
if (handednessEvidence.length !== 42)
  throw new Error("Candidate I foreground handedness role inventory changed.");
if (
  compositions["profile-left"].atlases.partsProfile.contentHash ===
    compositions["profile-right"].atlases.partsProfile.contentHash ||
  compositions["profile-left"].atlases.faceProfile.contentHash ===
    compositions["profile-right"].atlases.faceProfile.contentHash
)
  throw new Error("Candidate I left/right derived atlases are identical.");

const writeExact = async (target: string, bytes: Buffer) => {
  try {
    const existing = await readFile(target);
    if (!existing.equals(bytes))
      throw new Error(
        `Evidence output collides with different bytes: ${target}`,
      );
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, bytes, { flag: "wx" });
  }
};

const derivedFiles = {
  "profile-left": {
    parts: "derived/ollo-parts-profile-left-source-set-i-alpha.png",
    face: "derived/ollo-face-profile-left-source-set-i-alpha.png",
    diagnostic:
      "derived/ollo-lower-face-profile-left-source-candidate-diagnostic-i.png",
  },
  "profile-right": {
    parts: "derived/ollo-parts-profile-right-source-set-i-alpha.png",
    face: "derived/ollo-face-profile-right-source-set-i-alpha.png",
    diagnostic:
      "derived/ollo-lower-face-profile-right-source-candidate-diagnostic-i.png",
  },
} as const;
await writeExact(
  resolve(
    evidenceRoot,
    lowerFaceCompositionSources["profile-right"].relativeFile,
  ),
  rightLowerFaceNormalized,
);
for (const view of ["profile-left", "profile-right"] as const) {
  const composition = compositions[view];
  await Promise.all([
    writeExact(
      resolve(evidenceRoot, derivedFiles[view].parts),
      composition.atlases.partsProfile.bytes,
    ),
    writeExact(
      resolve(evidenceRoot, derivedFiles[view].face),
      composition.atlases.faceProfile.bytes,
    ),
    writeExact(
      resolve(evidenceRoot, derivedFiles[view].diagnostic),
      composition.lowerFacePatches.diagnostic.bytes,
    ),
  ]);
}

const request = characterRigAssetRequestSchema.parse(
  JSON.parse(
    await readFile(resolve(evidenceRoot, "ollo-rig-request-v1.json"), "utf8"),
  ) as unknown,
);
if (
  request.contentHash !==
  "82844eac0b85b33c7fd1e6cf8654755fc27a17aedeb0e0f2acd5779407cc6310"
)
  throw new Error(
    "Candidate I proof is not bound to the accepted Ollo request.",
  );

const exactExistingAsset = async (
  relativeFile: string,
  contentHash: string,
  width: number,
  height: number,
) => {
  const bytes = await readFile(resolve(evidenceRoot, relativeFile));
  if (sha256(bytes) !== contentHash)
    throw new Error(`Existing rig asset bytes changed: ${relativeFile}.`);
  const metadata = await sharp(bytes).metadata();
  if (metadata.width !== width || metadata.height !== height)
    throw new Error(`Existing rig asset dimensions changed: ${relativeFile}.`);
  return { bytes, byteLength: bytes.length };
};
const turnaroundRelativeFile =
  "candidates/ollo-turnaround-candidate-h-five-view-alpha.png";
const turnaround = await exactExistingAsset(
  turnaroundRelativeFile,
  "732b3a7c41b33a9f8941714066ce60c86a7ff72aea6dd288db80176be263cfec",
  2880,
  832,
);
const coverageRelativeFile = "ollo-turnaround-coverage-evidence-h-v1.json";
const coverageBytes = await readFile(
  resolve(evidenceRoot, coverageRelativeFile),
);
if (
  sha256(coverageBytes) !==
  "598cd00e26aecce5002554134ca66903ebe11e17670a809360f858cb6650b4d6"
)
  throw new Error("Candidate H coverage evidence bytes changed.");
const coverage = turnaroundViewCoverageEvidenceSchema.parse(
  JSON.parse(coverageBytes.toString("utf8")) as unknown,
);
const normalizationBytes = await readFile(
  resolve(evidenceRoot, "ollo-turnaround-normalization-receipt-h-v1.json"),
);
if (
  sha256(normalizationBytes) !==
  "4826f000f4e3b4494e49ec2fe575a0cf6df8cfa83403212ff47582116d104118"
)
  throw new Error("Candidate H normalization receipt bytes changed.");
const normalization = JSON.parse(normalizationBytes.toString("utf8")) as {
  contentHash: string;
  review: Record<string, boolean>;
};
if (
  normalization.contentHash !==
  "08ff2f61b6b1c4a65dea29f42935aee9050cfd743445b424affd70ef63c041fa"
)
  throw new Error("Candidate H normalization receipt content changed.");
const frontEvidenceBytes = await readFile(
  resolve(evidenceRoot, "ollo-front-atlas-evidence-f.json"),
);
if (
  sha256(frontEvidenceBytes) !==
  "c69565dda5dd93f485cd1e2f4c89a58caae83ebc2c6ce3707d5bbd5267667c32"
)
  throw new Error("Front Candidate F evidence bytes changed.");
const frontEvidence = JSON.parse(frontEvidenceBytes.toString("utf8")) as {
  contentHash: string;
  gate: { visualRoleAuditPassed: boolean; registrationReady: boolean };
};
if (
  frontEvidence.contentHash !==
  "35113c30ad22d1ea007015eb9119753f50cd6ffc2db662c1fb4f37d196b29162"
)
  throw new Error("Front Candidate F evidence changed.");
const frontParts = await exactExistingAsset(
  "derived/ollo-parts-front-source-set-f-alpha.png",
  "a8c74ff89094a4169be9b19f7d9c0e251f0059aa6d13a9075994d74ba11efe30",
  1600,
  1248,
);
const frontFace = await exactExistingAsset(
  "derived/ollo-face-front-source-set-f-alpha.png",
  "b9564f7fd1a30e470ea62e9d85d430dcb2d437f4b9e9a5ef01cc1507cb6925c7",
  4896,
  2112,
);

const bundle = createCharacterRigCandidateBundle({
  schemaVersion: "1.0",
  acquisitionMode: "manual-file-import",
  requestId: request.requestId,
  requestContentHash: request.contentHash,
  provenance: {
    sourceType: "generated",
    providerLabel:
      "OpenAI built-in image generation plus deterministic repository composition",
    sourceReference:
      "Codex task 019f6dc3-6859-79d1-960a-fc69c9e275d9 / KCAST-001G",
    createdAt: "2026-07-19T13:00:00.000Z",
    rightsStatement:
      "Original generated Ollo candidates created for this project and composed by deterministic repository code; unapproved source art.",
  },
  assets: [
    {
      candidateId: "ollo-turnaround-candidate-h-five-view-alpha",
      requestItemId: "turnaround-sheet",
      relativeFile: turnaroundRelativeFile,
      contentHash: sha256(turnaround.bytes),
      byteLength: turnaround.byteLength,
      mediaType: "image/png",
      width: 2880,
      height: 832,
      turnaroundViewCoverageEvidence: {
        schemaVersion: "1.0",
        relativeFile: coverageRelativeFile,
        contentHash: coverage.contentHash,
        fileContentHash: sha256(coverageBytes),
        byteLength: coverageBytes.length,
      },
    },
    {
      candidateId: "ollo-parts-front-source-set-f-alpha",
      requestItemId: "parts-front",
      relativeFile: "derived/ollo-parts-front-source-set-f-alpha.png",
      contentHash: sha256(frontParts.bytes),
      byteLength: frontParts.byteLength,
      mediaType: "image/png",
      width: 1600,
      height: 1248,
    },
    {
      candidateId: "ollo-face-front-source-set-f-alpha",
      requestItemId: "face-front",
      relativeFile: "derived/ollo-face-front-source-set-f-alpha.png",
      contentHash: sha256(frontFace.bytes),
      byteLength: frontFace.byteLength,
      mediaType: "image/png",
      width: 4896,
      height: 2112,
    },
    ...(["profile-left", "profile-right"] as const).flatMap((view) => {
      const composition = compositions[view];
      return [
        {
          candidateId: `ollo-parts-${view}-source-set-i-alpha`,
          requestItemId: `parts-${view}`,
          relativeFile: derivedFiles[view].parts,
          contentHash: composition.atlases.partsProfile.contentHash,
          byteLength: composition.atlases.partsProfile.byteLength,
          mediaType: "image/png" as const,
          width: composition.atlases.partsProfile.width,
          height: composition.atlases.partsProfile.height,
        },
        {
          candidateId: `ollo-face-${view}-source-set-i-alpha`,
          requestItemId: `face-${view}`,
          relativeFile: derivedFiles[view].face,
          contentHash: composition.atlases.faceProfile.contentHash,
          byteLength: composition.atlases.faceProfile.byteLength,
          mediaType: "image/png" as const,
          width: composition.atlases.faceProfile.width,
          height: composition.atlases.faceProfile.height,
        },
      ];
    }),
  ],
});

await rm(privateProofRoot, { recursive: true, force: true });
await mkdir(trustedStagingRoot, { recursive: true });
const report = await stageCharacterRigCandidateBundle({
  request,
  bundle,
  sourceRoot: evidenceRoot,
  trustedStagingRoot,
  stagingRoot,
  stagedAt,
});
const reportRetry = await stageCharacterRigCandidateBundle({
  request,
  bundle,
  sourceRoot: evidenceRoot,
  trustedStagingRoot,
  stagingRoot,
  stagedAt,
});
if (
  reportRetry.contentHash !== report.contentHash ||
  JSON.stringify(reportRetry) !== JSON.stringify(report)
)
  throw new Error("Candidate I seven-item staging is not deterministic.");
if (
  report.status !== "complete" ||
  report.returnedItems.join(",") !==
    request.items
      .map(({ id }) => id)
      .sort((left, right) => left.localeCompare(right))
      .join(",") ||
  report.partialItems.length !== 0 ||
  report.missingItems.length !== 0 ||
  report.missingSubitems.length !== 0 ||
  report.unknownItems.length !== 0 ||
  report.turnaroundViewCoverageEvidence[0]?.status !== "complete"
)
  throw new Error(
    `Candidate I seven-item staging is not exact: ${JSON.stringify(report)}.`,
  );

const importId = "import-kcast-001g-ollo-complete-source-set-i";
const receipt = await createVerifiedCharacterRigImportReceipt({
  request,
  bundle,
  report,
  trustedStagingRoot,
  stagingRoot,
  importId,
  importedAt,
});
const receiptRetry = await createVerifiedCharacterRigImportReceipt({
  request,
  bundle,
  report,
  trustedStagingRoot,
  stagingRoot,
  importId,
  importedAt,
});
if (
  receiptRetry.contentHash !== receipt.contentHash ||
  JSON.stringify(receiptRetry) !== JSON.stringify(receipt) ||
  receipt.providerAuthority ||
  !receipt.approvalRequired
)
  throw new Error(
    "Candidate I mechanical import receipt is not deterministic.",
  );
const receiptBytes = Buffer.from(
  `${JSON.stringify(receipt, null, 2)}\n`,
  "utf8",
);
const persistedReceiptBytes = await readFile(
  resolve(
    stagingRoot,
    "character-rig",
    `import-receipt-${receipt.contentHash}.json`,
  ),
);
if (!persistedReceiptBytes.equals(receiptBytes))
  throw new Error("Candidate I persisted mechanical receipt bytes changed.");
const receiptRelativeFile = "ollo-complete-import-receipt-i.json";
await writeExact(resolve(evidenceRoot, receiptRelativeFile), receiptBytes);

const postImportReviewBlockers = [
  !normalization.review.identityConsistencyPassed
    ? "turnaround-identity-consistency-unreviewed"
    : null,
  !normalization.review.semanticViewAuditPassed
    ? "turnaround-semantic-view-audit-unreviewed"
    : null,
  !normalization.review.registrationReady
    ? "turnaround-registration-not-ready"
    : null,
  !frontEvidence.gate.visualRoleAuditPassed
    ? "front-visual-role-audit-unreviewed"
    : null,
  !frontEvidence.gate.registrationReady ? "front-registration-not-ready" : null,
  ...(["profile-left", "profile-right"] as const).flatMap((view) => [
    !compositions[view].gate.visualRoleAuditPassed
      ? `${view}-visual-role-audit-unreviewed`
      : null,
    !compositions[view].gate.registrationReady
      ? `${view}-registration-not-ready`
      : null,
  ]),
].filter((value): value is string => value !== null);
if (postImportReviewBlockers.length === 0)
  throw new Error(
    "All review gates unexpectedly passed; this proof intentionally cannot mint authority.",
  );

const withoutBytes = <T extends { bytes: Buffer }>(value: T) => {
  const { bytes, ...rest } = value;
  void bytes;
  return rest;
};
const candidateGRejectionBytes = await readFile(
  resolve(
    evidenceRoot,
    "ollo-profile-source-candidate-g-rejection-evidence.json",
  ),
);
if (
  sha256(candidateGRejectionBytes) !==
  "1f57e64075fb6d97f33464a148e29b0e739ad7a25b8b942f0712a585f54a5aa1"
)
  throw new Error("Candidate G rejection evidence changed.");
const evidenceDraft = {
  schemaVersion: "1.0" as const,
  evidenceId: "kcast-001g-ollo-complete-intake-candidate-i",
  requestId: request.requestId,
  requestContentHash: request.contentHash,
  candidateGRejectionEvidence: {
    relativeFile: "ollo-profile-source-candidate-g-rejection-evidence.json",
    fileContentHash:
      "1f57e64075fb6d97f33464a148e29b0e739ad7a25b8b942f0712a585f54a5aa1",
    preserved: true as const,
  },
  sourceAudit: {
    extractionMethod:
      "8-connected nonzero-alpha bounds after border-median soft-distance matte",
    extractionPadding,
    observations: sourceAudits,
    lowerFaceCompositionSources: (
      ["profile-left", "profile-right"] as const
    ).map((view) => {
      const source = lowerFaceCompositionSources[view];
      return {
        view,
        relativeFile: source.relativeFile,
        contentHash: source.contentHash,
        byteLength: source.byteLength,
        dimensions: { width: source.width, height: source.height },
        transform: source.transform,
        sourceContentHash: source.sourceContentHash,
        connectedContentBounds: source.connectedContentBounds,
        baseSourceRect: lowerFaceRegistration[view].baseSourceRect,
        mouthChangeBounds: lowerFaceRegistration[view].mouthChangeBounds,
        opaqueMouthChangeBounds: {
          x:
            lowerFaceRegistration[view].baseSourceRect.x +
            lowerFaceRegistration[view].mouthChangeBounds.x,
          y:
            lowerFaceRegistration[view].baseSourceRect.y +
            lowerFaceRegistration[view].mouthChangeBounds.y,
          width: lowerFaceRegistration[view].mouthChangeBounds.width,
          height: lowerFaceRegistration[view].mouthChangeBounds.height,
        },
        processor:
          view === "profile-right"
            ? {
                id: "sharp-resize",
                imageLibraryVersion: sharp.versions.sharp,
                kernel: "lanczos3",
                scale: 1.5,
                png: {
                  compressionLevel: 9,
                  adaptiveFiltering: false,
                  palette: false,
                  effort: 10,
                },
                measuredKey: normalizedRightConnected.keyed.measuredKey,
                measuredKeyDistance: normalizedRightMeasuredKeyDistance,
                maximumCanonicalKeyDistance,
              }
            : null,
      };
    }),
    unnormalizedRightNegativeAssertion: {
      rawSourceContentHash: sourceSpecs["profile-right"].lowerFace.contentHash,
      attemptedMinimumCommonOpaqueBounds: {
        width: 262,
        height: 197,
      },
      exhaustiveOpaqueRectangleSearch: unnormalizedRightOpaqueAudit,
      normalizedOpaqueRectangleSearch: normalizedRightOpaqueAudit,
      rejected: true as const,
      message: unnormalizedRightRejection,
    },
  },
  handednessEvidence,
  profileCompositions: (["profile-left", "profile-right"] as const).map(
    (view) => {
      const composition = compositions[view];
      return {
        view,
        processor: composition.processor,
        sources: composition.sources,
        atlases: {
          parts: {
            relativeFile: derivedFiles[view].parts,
            ...withoutBytes(composition.atlases.partsProfile),
          },
          face: {
            relativeFile: derivedFiles[view].face,
            ...withoutBytes(composition.atlases.faceProfile),
          },
        },
        lowerFacePatches: {
          contract: composition.lowerFacePatches.contract,
          base: composition.lowerFacePatches.base,
          patches: composition.lowerFacePatches.patches,
          diagnostic: {
            relativeFile: derivedFiles[view].diagnostic,
            ...withoutBytes(composition.lowerFacePatches.diagnostic),
          },
        },
        gate: composition.gate,
      };
    },
  ),
  sevenItemBundle: {
    candidateBundleContentHash: bundle.contentHash,
    stagingReportContentHash: report.contentHash,
    status: report.status,
    returnedItems: report.returnedItems,
    turnaroundCoverageEvidenceContentHash: coverage.contentHash,
    turnaroundNormalizationReceiptContentHash: normalization.contentHash,
    frontAtlasEvidenceContentHash: frontEvidence.contentHash,
    mechanicalImportReceipt: {
      relativeFile: receiptRelativeFile,
      contentHash: receipt.contentHash,
      fileContentHash: sha256(receiptBytes),
      byteLength: receiptBytes.length,
      providerAuthority: receipt.providerAuthority,
      approvalRequired: receipt.approvalRequired,
    },
  },
  gate: {
    exactTenSourceInputs: true as const,
    chromaGatePassed: true as const,
    exactConnectedContentRectangles: true as const,
    nonOverlappingSourceRectangles: true as const,
    canonicalTwentyPartRolesPerProfile: true as const,
    canonicalTwentyTwoFaceRolesPerProfile: true as const,
    deterministicRerunPassed: true as const,
    foregroundHandednessRolesCompared: 42 as const,
    leftRightDirectlyDistinct: true as const,
    leftRightNotHorizontalFlips: true as const,
    exclusiveLowerFaceContractPassed: true as const,
    sevenRequestItemsStaged: true as const,
    identityConsistencyPassed: false as const,
    semanticViewAuditPassed: false as const,
    visualRoleAuditPassed: false as const,
    registrationReady: false as const,
    mechanicalImportReceiptEligible: true as const,
    importReceiptAttempted: true as const,
    importReceiptCreated: true as const,
    mechanicalImportVerified: true as const,
    postImportReviewBlockers,
    preparedManifestCreated: false as const,
    providerAuthority: false as const,
    preparationAuthority: false as const,
    approvalAuthority: false as const,
    productionBindable: false as const,
    approvalRequired: true as const,
  },
  stagedAt,
};
const evidence = {
  ...evidenceDraft,
  contentHash: hashCanonical(evidenceDraft),
};
await Promise.all([
  writeExact(
    resolve(evidenceRoot, "ollo-complete-candidate-bundle-i.json"),
    Buffer.from(`${JSON.stringify(bundle, null, 2)}\n`, "utf8"),
  ),
  writeExact(
    resolve(evidenceRoot, "ollo-complete-staging-report-i.json"),
    Buffer.from(`${JSON.stringify(report, null, 2)}\n`, "utf8"),
  ),
  writeExact(
    resolve(evidenceRoot, "ollo-profile-atlas-evidence-i.json"),
    Buffer.from(`${JSON.stringify(evidence, null, 2)}\n`, "utf8"),
  ),
]);
await rm(privateProofRoot, { recursive: true, force: true });

process.stdout.write(
  `${JSON.stringify(
    {
      verdict:
        "PASS: Candidate I deterministically composes both genuine profile kits, reconciles all seven request items, and creates a byte-verified mechanical import receipt without granting review, preparation, approval, or production authority.",
      candidateBundleContentHash: bundle.contentHash,
      stagingReportContentHash: report.contentHash,
      evidenceContentHash: evidence.contentHash,
      profileAtlases: (["profile-left", "profile-right"] as const).map(
        (view) => ({
          view,
          partsContentHash: compositions[view].atlases.partsProfile.contentHash,
          faceContentHash: compositions[view].atlases.faceProfile.contentHash,
          lowerFaceDiagnosticContentHash:
            compositions[view].lowerFacePatches.diagnostic.contentHash,
        }),
      ),
      status: report.status,
      returnedItems: report.returnedItems,
      mechanicalImportReceiptContentHash: receipt.contentHash,
      mechanicalImportReceiptFileContentHash: sha256(receiptBytes),
      postImportReviewBlockers,
      importReceiptAttempted: true,
      importReceiptCreated: true,
      preparedManifestCreated: false,
      providerAuthority: false,
      approvalAuthority: false,
      productionBindable: false,
    },
    null,
    2,
  )}\n`,
);
